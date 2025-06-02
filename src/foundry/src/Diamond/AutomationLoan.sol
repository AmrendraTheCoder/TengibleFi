//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DiamondStorage} from "./DiamondStorage.sol";
import {viewFacet} from "./ViewFacet.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

contract AutomationLoan is AutomationCompatibleInterface {
    // Import errors from DiamondStorage
    error InvalidLoanDuration();
    error InsufficientCollateral();
    error LoanAlreadyExists();
    error LoanNotActive();
    error InsufficientRepayment();
    error InvalidUserAccount();
    error Unauthorized();

    // Events stay in this contract as they're specific to automation
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 indexed tokenId,
        uint256 accountTokenId,
        uint256 amount
    );
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event LoanLiquidated(uint256 indexed loanId, address indexed borrower);

    viewFacet private vf;
    IERC721 public immutable nftContract;
    IERC20 public immutable usdcToken;
    IERC721 public immutable userAccountNFT;

    constructor(
        address _nftContract,
        address _usdcToken,
        address _userAccountNFT,
        address _viewFacet
    ) {
        nftContract = IERC721(_nftContract);
        usdcToken = IERC20(_usdcToken);
        userAccountNFT = IERC721(_userAccountNFT);
        vf = viewFacet(_viewFacet);
    }

    function createLoan(
        uint256 tokenId,
        uint256 accountTokenId,
        uint256 duration,
        uint256 amount
    ) external {
        DiamondStorage.VaultState storage ds = DiamondStorage.getStorage();

        // Use ViewFacet to validate user account
        (, , , , address accountOwner) = vf.getUserNFTDetail(msg.sender, accountTokenId);
        if (accountOwner != msg.sender) {
            revert InvalidUserAccount();
        }

        // Use constants from DiamondStorage
        if (duration < DiamondStorage.MIN_LOAN_DURATION || 
            duration > DiamondStorage.MAX_LOAN_DURATION) {
            revert InvalidLoanDuration();
        }

        // Check loan existence using ViewFacet
        (bool isActive, , , , ) = vf.getUserNFTDetail(msg.sender, tokenId);
        if (isActive) {
            revert LoanAlreadyExists();
        }

        // Transfer assets
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");

        nftContract.transferFrom(msg.sender, address(this), tokenId);

        require(usdcToken.allowance(msg.sender, address(this)) >= amount, "Insufficient USDC allowance");

        usdcToken.transferFrom(msg.sender, address(this), amount);
        // Generate unique loan ID
        uint256 loanId = ++ds.currentLoanId;

        // Use ViewFacet for calculations
        uint256 interestRate = vf.calculateInterestRate(duration);
        uint256 totalDebt = vf.calculateTotalDebt(amount, interestRate, duration);

        // Store loan data
        ds.loans[tokenId] = DiamondStorage.LoanData({
            loanId: loanId,
            loanAmount: amount,
            startTime: block.timestamp,
            duration: duration,
            interestRate: interestRate,
            totalDebt: totalDebt,
            isActive: true,
            borrower: msg.sender,
            userAccountTokenId: accountTokenId
        });

        // Update tracking
        ds.userLoans[msg.sender].push(loanId);
        ds.accountToLoans[accountTokenId] = loanId;
        ds.totalActiveLoans++;
        ds.totalUSDCLocked += amount;

        emit LoanCreated(loanId, msg.sender, tokenId, accountTokenId, amount);
    }

    function checkUpkeep(bytes calldata) 
        external 
        view 
        override 
        returns (bool upkeepNeeded, bytes memory performData) 
    {
        DiamondStorage.VaultState storage ds = DiamondStorage.getStorage();
        uint256[] memory overdueLoans = new uint256[](ds.totalActiveLoans);
        uint256 count = 0;

        // Use ViewFacet to check loan status
        for (uint256 i = 1; i <= ds.currentLoanId; i++) {
            DiamondStorage.LoanData memory loan = vf.getLoanByAccountId(i);
            if (loan.isActive && 
                block.timestamp > loan.startTime + loan.duration) {
                overdueLoans[count] = i;
                count++;
            }
        }

        upkeepNeeded = count > 0;
        performData = abi.encode(overdueLoans, count);
    }

    function performUpkeep(bytes calldata performData) external override {
        (uint256[] memory overdueLoans, uint256 count) = abi.decode(
            performData,
            (uint256[], uint256)
        );

        for (uint256 i = 0; i < count; i++) {
            liquidateLoan(overdueLoans[i]);
        }
    }

    function liquidateLoan(uint256 loanId) internal {
        DiamondStorage.VaultState storage ds = DiamondStorage.getStorage();
        DiamondStorage.LoanData memory loan = vf.getLoanByAccountId(loanId);

        if (!loan.isActive) return;

        // Update state
        ds.loans[loanId].isActive = false;
        ds.totalActiveLoans--;
        ds.totalUSDCLocked -= loan.loanAmount;

        emit LoanLiquidated(loanId, loan.borrower);
    }
}