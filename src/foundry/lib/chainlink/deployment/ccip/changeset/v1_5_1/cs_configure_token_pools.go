package v1_5_1

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"math/big"

	"github.com/Masterminds/semver/v3"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gagliardetto/solana-go"

	"github.com/smartcontractkit/chainlink/deployment"
	"github.com/smartcontractkit/chainlink/deployment/ccip/changeset"
	commoncs "github.com/smartcontractkit/chainlink/deployment/common/changeset"
	"github.com/smartcontractkit/chainlink/deployment/common/proposalutils"

	"github.com/smartcontractkit/chainlink-ccip/chains/evm/gobindings/generated/v1_5_0/token_admin_registry"
	"github.com/smartcontractkit/chainlink-ccip/chains/evm/gobindings/generated/v1_5_1/token_pool"
	solTokenUtil "github.com/smartcontractkit/chainlink-ccip/chains/solana/utils/tokens"
	"github.com/smartcontractkit/chainlink-evm/pkg/utils"
)

// ConfigureTokenPoolContractsChangeset is responsible for the following operations:
// If the chain is already supported -
//  1. it updates the rate limits for the chain
//  2. it adds a new remote pool if the token pool on the remote chain is being updated
//
// If the chain is not supported -
//  1. it adds chain support with the desired rate limits
//  2. it adds the desired remote pool addresses to the token pool on the chain
//  3. if there used to be an existing token pool on tokenadmin_registry, it adds the remote pool addresses of that token pool to ensure 0 downtime
var _ deployment.ChangeSet[ConfigureTokenPoolContractsConfig] = ConfigureTokenPoolContractsChangeset

// RateLimiterConfig defines the inbound and outbound rate limits for a remote chain.
type RateLimiterConfig struct {
	// Inbound is the rate limiter config for inbound transfers from a remote chain.
	Inbound token_pool.RateLimiterConfig
	// Outbound is the rate limiter config for outbound transfers to a remote chain.
	Outbound token_pool.RateLimiterConfig
}

// validateRateLimterConfig validates rate and capacity in accordance with on-chain code.
// see https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/ccip/libraries/RateLimiter.sol.
func validateRateLimiterConfig(rateLimiterConfig token_pool.RateLimiterConfig) error {
	zero := big.NewInt(0)
	if rateLimiterConfig.IsEnabled {
		if rateLimiterConfig.Rate.Cmp(rateLimiterConfig.Capacity) >= 0 || rateLimiterConfig.Rate.Cmp(zero) == 0 {
			return errors.New("rate must be greater than 0 and less than capacity")
		}
	} else {
		if rateLimiterConfig.Rate.Cmp(zero) != 0 || rateLimiterConfig.Capacity.Cmp(zero) != 0 {
			return errors.New("rate and capacity must be 0")
		}
	}
	return nil
}

// RateLimiterPerChain defines rate limits for remote chains.
type RateLimiterPerChain map[uint64]RateLimiterConfig

func (c RateLimiterPerChain) Validate() error {
	for chainSelector, chainConfig := range c {
		if err := validateRateLimiterConfig(chainConfig.Inbound); err != nil {
			return fmt.Errorf("validation of inbound rate limiter config for remote chain with selector %d failed: %w", chainSelector, err)
		}
		if err := validateRateLimiterConfig(chainConfig.Outbound); err != nil {
			return fmt.Errorf("validation of outbound rate limiter config for remote chain with selector %d failed: %w", chainSelector, err)
		}
	}
	return nil
}

// SolChainUpdate defines the rate limits and token address for a Solana chain.
type SolChainUpdate struct {
	// RateLimiterConfig defines the rate limits for the Solana chain.
	RateLimiterConfig RateLimiterConfig
	// TokenAddress is the address of the token on the Solana chain.
	TokenAddress string
	// Type is the type of the token pool.
	Type deployment.ContractType
}

func (c SolChainUpdate) GetSolanaTokenAndTokenPool(state changeset.SolCCIPChainState) (token solana.PublicKey, tokenPool solana.PublicKey, err error) {
	var tokenPoolProgram solana.PublicKey
	switch c.Type {
	case changeset.BurnMintTokenPool:
		tokenPoolProgram = state.BurnMintTokenPool
	case changeset.LockReleaseTokenPool:
		tokenPoolProgram = state.LockReleaseTokenPool
	default:
		err = fmt.Errorf("unknown solana token pool type %s", c.Type)
		return
	}
	if c.TokenAddress == "" {
		err = errors.New("token address must be defined")
		return
	}
	token = solana.MustPublicKeyFromBase58(c.TokenAddress)
	tokenPool, err = solTokenUtil.TokenPoolConfigAddress(token, tokenPoolProgram)
	if err != nil {
		token = solana.PublicKey{}
		tokenPool = solana.PublicKey{}
		err = fmt.Errorf("failed to get token pool address for token %s on solana chain: %w", c.TokenAddress, err)
		return
	}
	return
}

func (c SolChainUpdate) Validate(state changeset.SolCCIPChainState) error {
	if err := validateRateLimiterConfig(c.RateLimiterConfig.Inbound); err != nil {
		return fmt.Errorf("validation of inbound rate limiter config for solana chain failed: %w", err)
	}
	if err := validateRateLimiterConfig(c.RateLimiterConfig.Outbound); err != nil {
		return fmt.Errorf("validation of outbound rate limiter config for solana chain failed: %w", err)
	}
	_, _, err := c.GetSolanaTokenAndTokenPool(state)
	if err != nil {
		return fmt.Errorf("failed to get solana token and token pool: %w", err)
	}

	return nil
}

// TokenPoolConfig defines all the information required of the user to configure a token pool.
type TokenPoolConfig struct {
	// ChainUpdates defines the chains and corresponding rate limits that should be defined on the token pool.
	ChainUpdates RateLimiterPerChain
	// SolChainUpdates defines the Solana chains and corresponding rate limits that should be defined on the token pool.
	SolChainUpdates map[uint64]SolChainUpdate
	// Type is the type of the token pool.
	Type deployment.ContractType
	// Version is the version of the token pool.
	Version semver.Version
	// OverrideTokenSymbol is the token symbol to use to override against main symbol (ex: override to clCCIP-LnM when the main token symbol is CCIP-LnM)
	// WARNING: This should only be used in exceptional cases where the token symbol on a particular chain differs from the main tokenSymbol
	OverrideTokenSymbol changeset.TokenSymbol
}

func (c TokenPoolConfig) Validate(ctx context.Context, chain deployment.Chain, ccipState changeset.CCIPOnChainState, useMcms bool, tokenSymbol changeset.TokenSymbol) error {
	chainState := ccipState.Chains[chain.Selector]
	// Ensure that the inputted type is known
	if _, ok := changeset.TokenPoolTypes[c.Type]; !ok {
		return fmt.Errorf("%s is not a known token pool type", c.Type)
	}

	// Ensure that the inputted version is known
	if _, ok := changeset.TokenPoolVersions[c.Version]; !ok {
		return fmt.Errorf("%s is not a known token pool version", c.Version)
	}

	if c.OverrideTokenSymbol != "" {
		tokenSymbol = c.OverrideTokenSymbol
	}

	// Ensure that a pool with given symbol, type and version is known to the environment
	tokenPoolAddress, ok := changeset.GetTokenPoolAddressFromSymbolTypeAndVersion(chainState, chain, tokenSymbol, c.Type, c.Version)
	if !ok {
		return fmt.Errorf("token pool does not exist on %s with symbol %s, type %s, and version %s", chain.String(), tokenSymbol, c.Type, c.Version)
	}
	tokenPool, err := token_pool.NewTokenPool(tokenPoolAddress, chain.Client)
	if err != nil {
		return fmt.Errorf("failed to connect address %s with token pool bindings: %w", tokenPoolAddress, err)
	}

	// Validate that the token pool is owned by the address that will be actioning the transactions (i.e. Timelock or deployer key)
	if err := commoncs.ValidateOwnership(ctx, useMcms, chain.DeployerKey.From, chainState.Timelock.Address(), tokenPool); err != nil {
		return fmt.Errorf("token pool with address %s on %s failed ownership validation: %w", tokenPoolAddress, chain.String(), err)
	}

	// Validate chain configurations, namely rate limits
	if err := c.ChainUpdates.Validate(); err != nil {
		return fmt.Errorf("failed to validate chain updates: %w", err)
	}

	// Validate Solana chain configurations
	for remoteChainSelector, solChainUpdate := range c.SolChainUpdates {
		solChain, ok := ccipState.SolChains[remoteChainSelector]
		if !ok {
			return fmt.Errorf("solana chain with selector %d does not exist in environment", remoteChainSelector)
		}
		if err := solChainUpdate.Validate(solChain); err != nil {
			return fmt.Errorf("failed to validate solana chain update for chain with selector %d: %w", remoteChainSelector, err)
		}
	}

	return nil
}

// ConfigureTokenPoolContractsConfig is the configuration for the ConfigureTokenPoolContractsConfig changeset.
type ConfigureTokenPoolContractsConfig struct {
	// MCMS defines the delay to use for Timelock (if absent, the changeset will attempt to use the deployer key).
	MCMS *proposalutils.TimelockConfig
	// PoolUpdates defines the changes that we want to make to the token pool on a chain
	PoolUpdates map[uint64]TokenPoolConfig
	// Symbol is the symbol of the token of interest.
	TokenSymbol changeset.TokenSymbol
}

func (c ConfigureTokenPoolContractsConfig) Validate(env deployment.Environment) error {
	if c.TokenSymbol == "" {
		return errors.New("token symbol must be defined")
	}
	state, err := changeset.LoadOnchainState(env)
	if err != nil {
		return fmt.Errorf("failed to load onchain state: %w", err)
	}
	for chainSelector, poolUpdate := range c.PoolUpdates {
		err := deployment.IsValidChainSelector(chainSelector)
		if err != nil {
			return fmt.Errorf("failed to validate chain selector %d: %w", chainSelector, err)
		}
		chain, ok := env.Chains[chainSelector]
		if !ok {
			return fmt.Errorf("chain with selector %d does not exist in environment", chainSelector)
		}
		chainState, ok := state.Chains[chainSelector]
		if !ok {
			return fmt.Errorf("%s does not exist in state", chain.String())
		}
		for remoteChainSelector := range poolUpdate.ChainUpdates {
			remotePoolUpdate, ok := c.PoolUpdates[remoteChainSelector]
			if !ok {
				return fmt.Errorf("%s is expecting a pool update to be defined for chain with selector %d", chain.String(), remoteChainSelector)
			}
			missingErr := fmt.Errorf("%s is expecting pool update on chain with selector %d to define a chain config pointing back to it", chain.String(), remoteChainSelector)
			if remotePoolUpdate.ChainUpdates == nil {
				return missingErr
			}
			if _, ok := remotePoolUpdate.ChainUpdates[chainSelector]; !ok {
				return missingErr
			}
		}
		if tokenAdminRegistry := chainState.TokenAdminRegistry; tokenAdminRegistry == nil {
			return fmt.Errorf("missing tokenAdminRegistry on %s", chain.String())
		}
		if c.MCMS != nil {
			if timelock := chainState.Timelock; timelock == nil {
				return fmt.Errorf("missing timelock on %s", chain.String())
			}
			if proposerMcm := chainState.ProposerMcm; proposerMcm == nil {
				return fmt.Errorf("missing proposerMcm on %s", chain.String())
			}
		}
		if err := poolUpdate.Validate(env.GetContext(), chain, state, c.MCMS != nil, c.TokenSymbol); err != nil {
			return fmt.Errorf("invalid pool update on %s: %w", chain.String(), err)
		}
	}

	return nil
}

// ConfigureTokenPoolContractsChangeset configures pools for a given token across multiple chains.
// The outputted MCMS proposal will update chain configurations on each pool, encompassing new chain additions and rate limit changes.
// Removing chain support is not in scope for this changeset.
func ConfigureTokenPoolContractsChangeset(env deployment.Environment, c ConfigureTokenPoolContractsConfig) (deployment.ChangesetOutput, error) {
	if err := c.Validate(env); err != nil {
		return deployment.ChangesetOutput{}, fmt.Errorf("invalid ConfigureTokenPoolContractsConfig: %w", err)
	}
	state, err := changeset.LoadOnchainState(env)
	if err != nil {
		return deployment.ChangesetOutput{}, fmt.Errorf("failed to load onchain state: %w", err)
	}

	deployerGroup := changeset.NewDeployerGroup(env, state, c.MCMS).WithDeploymentContext(fmt.Sprintf("configure %s token pools", c.TokenSymbol))

	for chainSelector := range c.PoolUpdates {
		chain := env.Chains[chainSelector]

		opts, err := deployerGroup.GetDeployer(chainSelector)
		if err != nil {
			return deployment.ChangesetOutput{}, fmt.Errorf("failed to get deployer for %s", chain)
		}
		err = configureTokenPool(env.GetContext(), opts, env.Chains, state, c, chainSelector)
		if err != nil {
			return deployment.ChangesetOutput{}, fmt.Errorf("failed to make operations to configure %s token pool on %s: %w", c.TokenSymbol, chain.String(), err)
		}
	}

	return deployerGroup.Enact()
}

// configureTokenPool creates all transactions required to configure the desired token pool on a chain,
// either applying the transactions with the deployer key or returning an MCMS proposal.
// configureTokenPool is responsible for the following operations:
// If the chain is already supported -
//  1. it updates the rate limits for the chain
//  2. it adds a new remote pool if the token pool on the remote chain is being updated
//
// If the chain is not supported -
//  1. it adds chain support with the desired rate limits
//  2. it adds the desired remote pool addresses to the token pool on the chain
//  3. if there used to be an existing token pool on tokenadmin_registry, it adds the remote pool addresses of that token pool to ensure 0 downtime
func configureTokenPool(
	ctx context.Context,
	opts *bind.TransactOpts,
	chains map[uint64]deployment.Chain,
	state changeset.CCIPOnChainState,
	config ConfigureTokenPoolContractsConfig,
	chainSelector uint64,
) error {
	poolUpdate := config.PoolUpdates[chainSelector]
	tokenSymbol := config.TokenSymbol
	if poolUpdate.OverrideTokenSymbol != "" {
		tokenSymbol = poolUpdate.OverrideTokenSymbol
	}
	chain := chains[chainSelector]
	tokenPool, _, tokenConfig, err := GetTokenStateFromPoolEVM(ctx, tokenSymbol, poolUpdate.Type, poolUpdate.Version, chain, state.Chains[chainSelector])
	if err != nil {
		return fmt.Errorf("failed to get token state from pool with address %s on %s: %w", tokenPool.Address(), chain.String(), err)
	}

	// For adding chain support
	var chainRemovals []uint64
	var chainAdditions []token_pool.TokenPoolChainUpdate
	// For updating rate limits
	var remoteChainSelectorsToUpdate []uint64
	var updatedOutboundConfigs []token_pool.RateLimiterConfig
	var updatedInboundConfigs []token_pool.RateLimiterConfig
	// For adding remote pools
	remotePoolAddressAdditions := make(map[uint64]common.Address)

	for remoteChainSelector, chainUpdate := range poolUpdate.SolChainUpdates {
		remoteTokenAddress, remotePoolAddress, err := chainUpdate.GetSolanaTokenAndTokenPool(state.SolChains[remoteChainSelector])
		if err != nil {
			return fmt.Errorf("failed to get solana token and token pool for chain with selector %d: %w", remoteChainSelector, err)
		}
		isSupportedChain, err := tokenPool.IsSupportedChain(&bind.CallOpts{Context: ctx}, remoteChainSelector)
		if err != nil {
			return fmt.Errorf("failed to check if %d is supported on pool with address %s on %s: %w", remoteChainSelector, tokenPool.Address(), chain.String(), err)
		}
		addChain := !isSupportedChain

		if isSupportedChain {
			remoteToken, err := tokenPool.GetRemoteToken(&bind.CallOpts{Context: ctx}, remoteChainSelector)
			if err != nil {
				return fmt.Errorf("failed to get remote token for chain with selector %d: %w", remoteChainSelector, err)
			}
			if !bytes.Equal(remoteTokenAddress.Bytes(), remoteToken) {
				// Remove & later re-add the chain if the token has changed
				chainRemovals = append(chainRemovals, remoteChainSelector)
				addChain = true
			} else {
				// Update the rate limits if the chain is already supported
				// We dont need to add a new remote pool because solana only supports one remote pool per token
				remoteChainSelectorsToUpdate = append(remoteChainSelectorsToUpdate, remoteChainSelector)
				updatedOutboundConfigs = append(updatedOutboundConfigs, chainUpdate.RateLimiterConfig.Outbound)
				updatedInboundConfigs = append(updatedInboundConfigs, chainUpdate.RateLimiterConfig.Inbound)
			}
		}

		if addChain {
			chainAdditions = append(chainAdditions, token_pool.TokenPoolChainUpdate{
				RemoteChainSelector:       remoteChainSelector,
				InboundRateLimiterConfig:  chainUpdate.RateLimiterConfig.Inbound,
				OutboundRateLimiterConfig: chainUpdate.RateLimiterConfig.Outbound,
				RemoteTokenAddress:        remoteTokenAddress.Bytes(),
				RemotePoolAddresses:       [][]byte{remotePoolAddress.Bytes()},
			})
		}
	}

	for remoteChainSelector, chainUpdate := range poolUpdate.ChainUpdates {
		isSupportedChain, err := tokenPool.IsSupportedChain(&bind.CallOpts{Context: ctx}, remoteChainSelector)
		if err != nil {
			return fmt.Errorf("failed to check if %d is supported on pool with address %s on %s: %w", remoteChainSelector, tokenPool.Address(), chain.String(), err)
		}
		remoteChain := chains[remoteChainSelector]
		remotePoolUpdate := config.PoolUpdates[remoteChainSelector]
		tokenSymbol = config.TokenSymbol
		if remotePoolUpdate.OverrideTokenSymbol != "" {
			tokenSymbol = remotePoolUpdate.OverrideTokenSymbol
		}
		remoteTokenPool, remoteTokenAddress, remoteTokenConfig, err := GetTokenStateFromPoolEVM(ctx, tokenSymbol, remotePoolUpdate.Type, remotePoolUpdate.Version, remoteChain, state.Chains[remoteChainSelector])
		if err != nil {
			return fmt.Errorf("failed to get token state from pool with address %s on %s: %w", tokenPool.Address(), chain.String(), err)
		}
		if isSupportedChain {
			// Just update the rate limits if the chain is already supported
			remoteChainSelectorsToUpdate = append(remoteChainSelectorsToUpdate, remoteChainSelector)
			updatedOutboundConfigs = append(updatedOutboundConfigs, chainUpdate.Outbound)
			updatedInboundConfigs = append(updatedInboundConfigs, chainUpdate.Inbound)
			// Also, add a new remote pool if the token pool on the remote chain is being updated
			if remoteTokenConfig.TokenPool != utils.ZeroAddress && remoteTokenConfig.TokenPool != remoteTokenPool.Address() {
				remotePoolAddressAdditions[remoteChainSelector] = remoteTokenPool.Address()
			}
		} else {
			// Add chain support if it doesn't yet exist
			// First, we need to assemble a list of valid remote pools
			// The desired token pool on the remote chain is added by default
			var remotePoolAddresses [][]byte
			remoteTokenPoolAddressBytes := common.LeftPadBytes(remoteTokenPool.Address().Bytes(), 32)
			remotePoolAddresses = append(remotePoolAddresses, remoteTokenPoolAddressBytes)
			// If the desired token pool is updating an old one, we still need to support the remote pool addresses that the old pool supported to ensure 0 downtime
			if tokenConfig.TokenPool != utils.ZeroAddress && tokenConfig.TokenPool != tokenPool.Address() {
				activeTokenPool, err := token_pool.NewTokenPool(tokenConfig.TokenPool, chain.Client)
				if err != nil {
					return fmt.Errorf("failed to connect pool with address %s on %s with token pool bindings: %w", tokenConfig.TokenPool, chain.String(), err)
				}
				remotePoolAddressesOnChain, err := activeTokenPool.GetRemotePools(&bind.CallOpts{Context: ctx}, remoteChainSelector)
				if err != nil {
					return fmt.Errorf("failed to fetch remote pools from token pool with address %s on chain %s: %w", tokenConfig.TokenPool, chain.String(), err)
				}
				for _, address := range remotePoolAddressesOnChain {
					if !bytes.Equal(address, remoteTokenPoolAddressBytes) {
						remotePoolAddresses = append(remotePoolAddresses, address)
					}
				}
			}
			chainAdditions = append(chainAdditions, token_pool.TokenPoolChainUpdate{
				RemoteChainSelector:       remoteChainSelector,
				InboundRateLimiterConfig:  chainUpdate.Inbound,
				OutboundRateLimiterConfig: chainUpdate.Outbound,
				RemoteTokenAddress:        common.LeftPadBytes(remoteTokenAddress.Bytes(), 32),
				RemotePoolAddresses:       remotePoolAddresses,
			})
		}
	}

	// Handle new chain support
	if len(chainAdditions) > 0 {
		_, err := tokenPool.ApplyChainUpdates(opts, chainRemovals, chainAdditions)
		if err != nil {
			return fmt.Errorf("failed to create applyChainUpdates transaction for token pool with address %s: %w", tokenPool.Address(), err)
		}
	}

	// Handle updates to existing chain support
	if len(remoteChainSelectorsToUpdate) > 0 {
		_, err := tokenPool.SetChainRateLimiterConfigs(opts, remoteChainSelectorsToUpdate, updatedOutboundConfigs, updatedInboundConfigs)
		if err != nil {
			return fmt.Errorf("failed to create setChainRateLimiterConfigs transaction for token pool with address %s: %w", tokenPool.Address(), err)
		}
	}

	// Handle remote pool additions
	for remoteChainSelector, remotePoolAddress := range remotePoolAddressAdditions {
		_, err := tokenPool.AddRemotePool(opts, remoteChainSelector, common.LeftPadBytes(remotePoolAddress.Bytes(), 32))
		if err != nil {
			return fmt.Errorf("failed to create addRemotePool transaction for token pool with address %s: %w", tokenPool.Address(), err)
		}
	}

	return nil
}

// getTokenStateFromPool fetches the token config from the registry given the pool address
func GetTokenStateFromPoolEVM(
	ctx context.Context,
	symbol changeset.TokenSymbol,
	poolType deployment.ContractType,
	version semver.Version,
	chain deployment.Chain,
	state changeset.CCIPChainState,
) (*token_pool.TokenPool, common.Address, token_admin_registry.TokenAdminRegistryTokenConfig, error) {
	tokenPoolAddress, ok := changeset.GetTokenPoolAddressFromSymbolTypeAndVersion(state, chain, symbol, poolType, version)
	if !ok {
		return nil, utils.ZeroAddress, token_admin_registry.TokenAdminRegistryTokenConfig{}, fmt.Errorf("token pool does not exist on %s with symbol %s, type %s, and version %s", chain.String(), symbol, poolType, version)
	}
	tokenPool, err := token_pool.NewTokenPool(tokenPoolAddress, chain.Client)
	if err != nil {
		return nil, utils.ZeroAddress, token_admin_registry.TokenAdminRegistryTokenConfig{}, fmt.Errorf("failed to connect token pool with address %s on chain %s to token pool bindings: %w", tokenPoolAddress, chain, err)
	}
	tokenAddress, err := tokenPool.GetToken(&bind.CallOpts{Context: ctx})
	if err != nil {
		return nil, utils.ZeroAddress, token_admin_registry.TokenAdminRegistryTokenConfig{}, fmt.Errorf("failed to get token from pool with address %s on %s: %w", tokenPool.Address(), chain.String(), err)
	}
	tokenAdminRegistry := state.TokenAdminRegistry
	tokenConfig, err := tokenAdminRegistry.GetTokenConfig(&bind.CallOpts{Context: ctx}, tokenAddress)
	if err != nil {
		return nil, utils.ZeroAddress, token_admin_registry.TokenAdminRegistryTokenConfig{}, fmt.Errorf("failed to get config of token with address %s from registry on %s: %w", tokenAddress, chain.String(), err)
	}
	return tokenPool, tokenAddress, tokenConfig, nil
}
