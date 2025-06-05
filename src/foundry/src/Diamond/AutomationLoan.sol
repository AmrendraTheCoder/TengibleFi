//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DiamondStorage} from "./DiamondStorage.sol";
import {viewFacet} from "./ViewFacet.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

contract AutomationLoan is AutomationCompatibleInterface {
    // Events stay in this contract as they're specific to automation
    event LoanCreated(uint256 indexed loanId,address indexed borrower,uint256 indexed tokenId,uint256 accountTokenId,uint256 amount);
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

        // CHECKS - Moved validation to internal function to reduce stack variables
        _validateLoanCreation(tokenId, accountTokenId, duration, ds);

        // Calculate interest and buffer - moved to internal function to reduce stack variables
        (uint256 totalDebt, uint256 bufferAmount) = _calculateLoanTerms(amount, duration);

        // Check ownership and allowance
        if (nftContract.ownerOf(tokenId) != msg.sender) {
            revert DiamondStorage.Unauthorized();
        }
        if (usdcToken.allowance(msg.sender, address(this)) < (amount + bufferAmount)) {
            revert DiamondStorage.InsufficientCollateral();
        }

        // EFFECTS - moved loan creation to internal function to reduce stack variables
        uint256 loanId = _createLoanStorage(tokenId, accountTokenId, duration, amount, totalDebt, bufferAmount, ds);

        // INTERACTIONS - simplified transfer logic to reduce stack variables
        _handleTransfers(tokenId, amount, bufferAmount, loanId, accountTokenId, ds);

        emit LoanCreated(loanId, msg.sender, tokenId, accountTokenId, amount);
    }

    // Internal function to validate loan creation - reduces stack depth in main function
    function _validateLoanCreation(
        uint256 tokenId,
        uint256 accountTokenId,
        uint256 duration,
        DiamondStorage.VaultState storage ds
    ) internal view {
        // Validate user account
        (, , , , address accountOwner) = vf.getUserNFTDetail(msg.sender, accountTokenId);
        if (accountOwner != msg.sender) {
            revert DiamondStorage.InvalidUserAccount(); // Using error from DiamondStorage
        }

        // Validate duration
        if (duration < DiamondStorage.MIN_LOAN_DURATION || 
            duration > DiamondStorage.MAX_LOAN_DURATION) {
            revert DiamondStorage.InvalidLoanDuration(); // Using error from DiamondStorage
        }
        uint256 numberOfPaymentPeriods = duration / 30 days;
        if (numberOfPaymentPeriods == 0) {
            revert DiamondStorage.InvalidLoanDuration(); // Using error from DiamondStorage
        }

        // Check loan existence
        if (ds.loans[tokenId].isActive) {
            revert DiamondStorage.LoanAlreadyExists(); 
        }
    }

    // Internal function to calculate loan terms - reduces stack depth in main function
    function _calculateLoanTerms(uint256 amount, uint256 duration) internal view returns (uint256 totalDebt, uint256 bufferAmount) {
        uint256 interestRate = vf.calculateInterestRate(duration);
        totalDebt = vf.calculateTotalDebt(amount, interestRate, duration);
        bufferAmount = totalDebt - amount; // Total interest amount as buffer
    }

    // Internal function to create loan storage - reduces stack depth in main function
    function _createLoanStorage(
        uint256 tokenId,
        uint256 accountTokenId,
        uint256 duration,
        uint256 amount,
        uint256 totalDebt,
        uint256 bufferAmount,
        DiamondStorage.VaultState storage ds
    ) internal returns (uint256 loanId) {
        // Initialize monthly payments array
        bool[] memory monthlyPayments = new bool[](duration / 30 days);
        
        // Generate loan ID and calculate terms
        loanId = ++ds.currentLoanId;
        uint256 interestRate = vf.calculateInterestRate(duration);

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

        // Link the generatedLoanId to the primary key (tokenId)
        ds.loanIdToCollateralTokenId[loanId] = tokenId;
        ds.userLoans[msg.sender].push(loanId);
        ds.accountToLoans[accountTokenId] = loanId;
        ds.totalActiveLoans++;
        ds.totalUSDCLocked += amount;
        ds.totalBufferLocked += bufferAmount;
    }

    // Internal function to handle transfers - reduces stack depth in main function
    function _handleTransfers(
        uint256 tokenId,
        uint256 amount,
        uint256 bufferAmount,
        uint256 loanId,
        uint256 accountTokenId,
        DiamondStorage.VaultState storage ds
    ) internal {
        bool success = false;
        try nftContract.transferFrom(msg.sender, address(this), tokenId) {
                try usdcToken.transferFrom(msg.sender, address(this), amount + bufferAmount) {
                    success = true;
                } catch {
                    nftContract.transferFrom(address(this), msg.sender, tokenId);
                }
            } catch {
                // NFT transfer failed
            }

        if (!success) {
            // Revert all state changes - pass accountTokenId to avoid accessing deleted loan data
            _revertLoanCreationWithAccount(tokenId, loanId, accountTokenId, amount, bufferAmount, ds);
            revert DiamondStorage.TransferFailed();
        }
    }

    // Internal function to revert loan creation - reduces stack depth in main function
    function _revertLoanCreationWithAccount(
        uint256 tokenId,
        uint256 loanId,
        uint256 accountTokenId,
        uint256 amount,
        uint256 bufferAmount,
        DiamondStorage.VaultState storage ds
    ) internal {
        delete ds.loans[tokenId];
        delete ds.loanIdToCollateralTokenId[loanId];
        
        // Clean user loans array - simplified to reduce stack variables
        uint256[] storage userLoanIds = ds.userLoans[msg.sender];
        for (uint j = userLoanIds.length; j > 0; j--) {  //delete the loan ID from that user's loan array
         if (userLoanIds[j-1] == loanId) {
            userLoanIds[j-1] = userLoanIds[userLoanIds.length - 1];
            userLoanIds.pop();
            break;
        }
       }
        
        if (ds.accountToLoans[accountTokenId] == loanId) {
            delete ds.accountToLoans[accountTokenId];
        }
        if (ds.totalActiveLoans > 0) ds.totalActiveLoans--;
        ds.totalUSDCLocked -= amount;
        ds.totalBufferLocked -= bufferAmount; 
        // Not decrementing ds.currentLoanId (the counter for LoanId)
    }

    // Internal function to revert loan creation - reduces stack depth in main function
    function _revertLoanCreation(
        uint256 tokenId,
        uint256 loanId,
        uint256 amount,
        uint256 bufferAmount,
        DiamondStorage.VaultState storage ds
    ) internal {
        // Get accountTokenId before deleting loan data - fixed stack depth issue
        uint256 accountTokenId = ds.loans[tokenId].userAccountTokenId;
        
        delete ds.loans[tokenId];
        delete ds.loanIdToCollateralTokenId[loanId];
        
        // Clean user loans array - simplified to reduce stack variables
        uint256[] storage userLoanIds = ds.userLoans[msg.sender];
        for (uint j = userLoanIds.length; j > 0; j--) {  //delete the loan ID from that user's loan array
         if (userLoanIds[j-1] == loanId) {
            userLoanIds[j-1] = userLoanIds[userLoanIds.length - 1];
            userLoanIds.pop();
            break;
        }
       }
        
        if (ds.accountToLoans[accountTokenId] == loanId) {
            delete ds.accountToLoans[accountTokenId];
        }
        if (ds.totalActiveLoans > 0) ds.totalActiveLoans--;
        ds.totalUSDCLocked -= amount;
        ds.totalBufferLocked -= bufferAmount; 
        // Not decrementing ds.currentLoanId (the counter for LoanId)
    }

 // Internal helper to get loan data using the generated loanId
    // This function resolves loanId to the collateral tokenId and then fetches the loan.
    function _getLoanDataByLoanId(uint256 loanId_param) internal view returns (DiamondStorage.LoanData storage) {
        DiamondStorage.VaultState storage ds = DiamondStorage.getStorage();
        uint256 collateralTokenId = ds.loanIdToCollateralTokenId[loanId_param];
        
        if (collateralTokenId == 0) { 
            revert DiamondStorage.LoanDataNotFoundForLoanId(); 
        }
        
        DiamondStorage.LoanData storage loan = ds.loans[collateralTokenId]; // Access ds.loans using the resolved collateralTokenId

        // Integrity check: ensure the loanId stored in the LoanData matches the loanId_param
        if (loan.loanId != loanId_param || loan.borrower == address(0)) { 
             revert DiamondStorage.LoanIdMismatch(); // Or LoanDataNotFoundForLoanId if data seems corrupt/cleared
        }
        return loan;
    }

    // Automation functions
    function makeMonthlyPayment(uint256 loanId) external {
        //DiamondStorage.VaultState storage ds = DiamondStorage.getStorage();  //as we are using _getLoanDataByLoanId helper function, we don't need to access ds here
        DiamondStorage.LoanData storage loan = _getLoanDataByLoanId(loanId);  //ds.loans is keyed by collateralTokenId, not loanId. The helper correctly finds collateralTokenId first.
        
         if (!loan.isActive) {
            revert DiamondStorage.LoanNotActive(); 
        }
        if (loan.borrower != msg.sender) {
            revert DiamondStorage.Unauthorized(); //for get proper error from DiamondStorage
        }

        uint256 monthIndex = (block.timestamp - loan.startTime) / 30 days;
        if (monthIndex >= loan.monthlyPayments.length) {
            revert DiamondStorage.LoanNotActive(); 
        }
        if (loan.monthlyPayments[monthIndex]) {
            revert DiamondStorage.PaymentNotDue(); 
        }
        
        uint256 monthlyAmount = loan.totalDebt / (loan.duration / 30 days);
        // may be here uint256 monthlyAmount = loan.totalDebt / loan.monthlyPayments.length; 
        
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
        uint256 maxLoansToProcess = 50; // Limit to prevent excessive gas usage
        uint256[] memory overdueLoanIds_perform = new uint256[](maxLoansToProcess); // Stores generated loanIds
        uint256 count = 0;

        for (uint256 i = 1; i <= ds.currentLoanId && count < maxLoansToProcess; i++) {
            uint256 collateralTokenId = ds.loanIdToCollateralTokenId[i];
            if (collateralTokenId == 0) {
                continue; // No loan associated with this i or it was deleted
            }

            DiamondStorage.LoanData memory loan = ds.loans[collateralTokenId];
            if (loan.isActive && loan.loanId == i) {
                uint256 monthIndex = (block.timestamp - loan.startTime) / 30 days;
                if (monthIndex < loan.monthlyPayments.length && 
                    !loan.monthlyPayments[monthIndex] && 
                    block.timestamp > loan.lastPaymentTime + 30 days) {
                    overdueLoanIds_perform[count] = i;
                    count++;
                }
            }
        }
         
        
        upkeepNeeded = count > 0; 
        // Check if there are any overdue loans hence Prepare performData only if there are overdue loans
        if (upkeepNeeded) {
            uint256[] memory finalOverdueLoanIds = new uint256[](count);
            for (uint j = 0; j < count; j++) {
                finalOverdueLoanIds[j] = overdueLoanIds_perform[j];
            }
            performData = abi.encode(finalOverdueLoanIds);
        } else {
        performData = bytes("");
        }
    }

    function performUpkeep(bytes calldata performData) external override {
    (uint256[] memory overdueLoanIds_param) = abi.decode( // These are generated loanIds
        performData,
        (uint256[])
    );
    for (uint256 i = 0; i < overdueLoanIds_param.length; i++) {
        if (gasleft() < 60000) {
            break;
        }
        liquidateLoan(overdueLoanIds_param[i]); // Pass the generated loanId
    }
}

    function liquidateLoan(uint256 loanId) internal {
        DiamondStorage.VaultState storage ds = DiamondStorage.getStorage();
        uint256 collateralTokenId = ds.loanIdToCollateralTokenId[loanId];
        if (collateralTokenId == 0) {
         // This might happen if the loan was already liquidated/repaid and mapping cleared
        return;
        }
        DiamondStorage.LoanData storage loan = ds.loans[collateralTokenId]; // Access by collateralTokenId

        if (!loan.isActive|| loan.loanId != loanId) return;

        uint256 monthIndex = (block.timestamp - loan.startTime) / 30 days;
        if (monthIndex >= loan.monthlyPayments.length) {
            return;
        }
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
            delete ds.loanIdToCollateralTokenId[loanId]; // Clean up the link
            if (ds.totalActiveLoans > 0) ds.totalActiveLoans--;
            ds.totalUSDCLocked -= loan.loanAmount;
            ds.totalBufferLocked -= loan.remainingBuffer;
            
            emit LoanLiquidated(loanId, loan.borrower);
        }
    }

    function repayLoanFull(uint256 loanId) external {
        DiamondStorage.VaultState storage ds = DiamondStorage.getStorage();
        uint256 collateralTokenId = ds.loanIdToCollateralTokenId[loanId];
        if (collateralTokenId == 0) {
           revert DiamondStorage.LoanDataNotFoundForLoanId();
       }
        DiamondStorage.LoanData storage loan = ds.loans[collateralTokenId]; // Access by collateralTokenId
        
        if (!loan.isActive || loan.loanId != loanId) { // Integrity check
           revert DiamondStorage.LoanNotActive();
        }
        if (loan.borrower != msg.sender) {
           revert DiamondStorage.Unauthorized();
        }
        
        uint256 paidAmountSoFar = 0;
    uint256 monthlyInstallment = loan.totalDebt / loan.monthlyPayments.length;
    uint256 paidInstallmentsCount = 0;

    for(uint i=0; i < loan.monthlyPayments.length; ++i) {
        if (loan.monthlyPayments[i]) {
            paidInstallmentsCount++;
        }
    }
    paidAmountSoFar = paidInstallmentsCount * monthlyInstallment;

    uint256 remainingDebtToPay = loan.totalDebt > paidAmountSoFar ? loan.totalDebt - paidAmountSoFar : 0;

    if (remainingDebtToPay > 0) {
        if(usdcToken.allowance(msg.sender, address(this)) < remainingDebtToPay) {
            revert DiamondStorage.InsufficientCollateral();
        }
        usdcToken.transferFrom(msg.sender, address(this), remainingDebtToPay);
    }
        
        // Return remaining buffer
        if (loan.remainingBuffer > 0) {
            usdcToken.transfer(msg.sender, loan.remainingBuffer);
            emit BufferReturned(loanId, loan.remainingBuffer);
        }
        
        // Update state
        loan.isActive = false;
        if (ds.totalActiveLoans > 0) ds.totalActiveLoans--;
        ds.totalUSDCLocked -= loan.loanAmount;
        ds.totalBufferLocked -= loan.remainingBuffer;
        
        // Return NFT
        nftContract.transferFrom(address(this), msg.sender, loan.userAccountTokenId);
        
        emit LoanRepaid(loanId, msg.sender, remainingDebtToPay);
    }
}