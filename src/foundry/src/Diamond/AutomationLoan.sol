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
    error TransferFailed();
    error InsufficientBuffer();
    error PaymentNotDue();
    // Events stay in this contract as they're specific to automation
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 indexed tokenId,
        uint256 accountTokenId,
        uint256 amount
    );
    event BufferDeducted(uint256 indexed loanId, uint256 amount);
    event BufferReturned(uint256 indexed loanId, uint256 amount);
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

        // CHECKS
    // Validate user account
    (, , , , address accountOwner) = vf.getUserNFTDetail(msg.sender, accountTokenId);
    if (accountOwner != msg.sender) {
        revert InvalidUserAccount();
    }

    // Validate duration
    if (duration < DiamondStorage.MIN_LOAN_DURATION || 
        duration > DiamondStorage.MAX_LOAN_DURATION) {
        revert InvalidLoanDuration();
    }

    // Check loan existence
    (bool isActive, , , , ) = vf.getUserNFTDetail(msg.sender, tokenId);
    if (isActive) {
        revert LoanAlreadyExists();
    }

    // Calculate total interest as buffer
        uint256 interestRate = vf.calculateInterestRate(duration);
        uint256 totalDebt = vf.calculateTotalDebt(amount, interestRate, duration);
        uint256 bufferAmount = totalDebt - amount; // Total interest amount as buffer

    // Check ownership and allowance
    if (nftContract.ownerOf(tokenId) != msg.sender) {
        revert Unauthorized();
    }
    if (usdcToken.allowance(msg.sender, address(this)) < (amount + bufferAmount)) {
        revert InsufficientCollateral();
    }

    // Initialize monthly payments array
        bool[] memory monthlyPayments = new bool[](duration / 30 days);
        

    // EFFECTS
    // Generate loan ID and calculate terms
    uint256 loanId = ++ds.currentLoanId;
    uint256 interestRate = vf.calculateInterestRate(duration);
    uint256 totalDebt = vf.calculateTotalDebt(amount, interestRate, duration);

    // Update storage state
    ds.loans[tokenId] = DiamondStorage.LoanData({
            loanId: loanId,
            loanAmount: amount,
            startTime: block.timestamp,
            duration: duration,
            interestRate: interestRate,
            totalDebt: totalDebt,
            isActive: true,
            borrower: msg.sender,
            userAccountTokenId: accountTokenId,
            bufferAmount: bufferAmount,
            remainingBuffer: bufferAmount,
            lastPaymentTime: block.timestamp,
            monthlyPayments: monthlyPayments
    });

    ds.userLoans[msg.sender].push(loanId);
    ds.accountToLoans[accountTokenId] = loanId;
    ds.totalActiveLoans++;
    ds.totalUSDCLocked += amount;
    ds.totalBufferLocked += bufferAmount;

    // INTERACTIONS
    bool success;
    try nftContract.transferFrom(msg.sender, address(this), tokenId) {
            try usdcToken.transferFrom(msg.sender, address(this), amount + bufferAmount) {
                success = true;
            } catch {
                nftContract.transferFrom(address(this), msg.sender, tokenId);
                success = false;
            }
        } catch {
            success = false;
        }

    if (!success) {
        // Revert all state changes
        delete ds.loans[tokenId];
        if (ds.userLoans[msg.sender].length > 0) {
            ds.userLoans[msg.sender].pop();
        }
        delete ds.accountToLoans[accountTokenId];
        ds.totalActiveLoans--;
        ds.totalUSDCLocked -= amount;
        ds.currentLoanId--;
        revert TransferFailed();
    }

    emit LoanCreated(loanId, msg.sender, tokenId, accountTokenId, amount);
}

// Automation functions
function makeMonthlyPayment(uint256 loanId) external {
        DiamondStorage.VaultState storage ds = DiamondStorage.getStorage();
        DiamondStorage.LoanData storage loan = ds.loans[loanId];
        
        require(loan.isActive, "Loan not active");
        require(loan.borrower == msg.sender, "Not loan borrower");
        
        uint256 monthIndex = (block.timestamp - loan.startTime) / 30 days;
        require(monthIndex < loan.monthlyPayments.length, "Loan period ended");
        require(!loan.monthlyPayments[monthIndex], "Already paid for this month");
        
        uint256 monthlyAmount = loan.totalDebt / (loan.duration / 30 days);
        
        // Transfer monthly payment
         usdcToken.transferFrom(msg.sender, address(this), monthlyAmount);
        
        loan.monthlyPayments[monthIndex] = true;
        loan.lastPaymentTime = block.timestamp;
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

        for (uint256 i = 1; i <= ds.currentLoanId; i++) {
            DiamondStorage.LoanData memory loan = vf.getLoanByAccountId(i);
            if (loan.isActive) {
                uint256 monthIndex = (block.timestamp - loan.startTime) / 30 days;
                if (monthIndex < loan.monthlyPayments.length && 
                    !loan.monthlyPayments[monthIndex] && 
                    block.timestamp > loan.lastPaymentTime + 30 days) {
                    overdueLoans[count] = i;
                    count++;
                }
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
        DiamondStorage.LoanData storage loan = ds.loans[loanId];

        if (!loan.isActive) return;

        uint256 monthIndex = (block.timestamp - loan.startTime) / 30 days;
        uint256 monthlyAmount = loan.totalDebt / (loan.duration / 30 days);

        if (loan.remainingBuffer >= monthlyAmount) {
            // Deduct from buffer
            loan.remainingBuffer -= monthlyAmount;
            loan.monthlyPayments[monthIndex] = true;
            loan.lastPaymentTime = block.timestamp;
            ds.totalBufferLocked -= monthlyAmount;
            
            emit BufferDeducted(loanId, monthlyAmount);
        } else {
            // Complete liquidation
            loan.isActive = false;
            ds.totalActiveLoans--;
            ds.totalUSDCLocked -= loan.loanAmount;
            ds.totalBufferLocked -= loan.remainingBuffer;
            
            emit LoanLiquidated(loanId, loan.borrower);
        }
    }

     function repayLoanFull(uint256 loanId) external {
        DiamondStorage.VaultState storage ds = DiamondStorage.getStorage();
        DiamondStorage.LoanData storage loan = ds.loans[loanId];
        
        require(loan.isActive, "Loan not active");
        require(loan.borrower == msg.sender, "Not loan borrower");
        
        // Calculate remaining debt excluding buffer
        uint256 remainingMonths = (loan.duration - (block.timestamp - loan.startTime)) / 30 days;
        uint256 monthlyAmount = loan.totalDebt / (loan.duration / 30 days);
        uint256 remainingDebt = remainingMonths * monthlyAmount;
        
        // Transfer remaining debt
        usdcToken.transferFrom(msg.sender, address(this), remainingDebt);
        
        // Return remaining buffer
        if (loan.remainingBuffer > 0) {
            usdcToken.transfer(msg.sender, loan.remainingBuffer);
            emit BufferReturned(loanId, loan.remainingBuffer);
        }
        
        // Update state
        loan.isActive = false;
        ds.totalActiveLoans--;
        ds.totalUSDCLocked -= loan.loanAmount;
        ds.totalBufferLocked -= loan.remainingBuffer;
        
        // Return NFT
        nftContract.transferFrom(address(this), msg.sender, loan.userAccountTokenId);
        
        emit LoanRepaid(loanId, msg.sender, remainingDebt);
    }
}