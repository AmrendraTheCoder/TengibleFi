//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {DiamondStorage} from "./DiamondStorage.sol";

contract viewFacet {
    function getUserNFTDetail(
        address _user,
        uint256 _tokenId
    ) public view returns (bool, uint256, uint256, uint256, address) {
        DiamondStorage.VaultState storage ds = DiamondStorage.getStorage();
        return (
            ds.User[_user][_tokenId].isAuth,
            ds.User[_user][_tokenId].amount,
            ds.User[_user][_tokenId].duration,
            ds.User[_user][_tokenId].rate,
            ds.User[_user][_tokenId].tokenAddress
        );
    }

    function getUserNFTs(address _user) public view returns (uint256[] memory) {
        DiamondStorage.VaultState storage ds = DiamondStorage.getStorage();
        return ds.userNftIds[_user];
    }
    /////
    function getLoanByAccountId(
    uint256 accountTokenId
    ) external view returns (DiamondStorage.LoanData memory) {
    DiamondStorage.VaultState storage ds = DiamondStorage.getStorage();
    uint256 loanId = ds.accountToLoans[accountTokenId];
    return ds.loans[loanId];
}

    function getUserLoans(
    address user
    ) external view returns (uint256[] memory) {
    DiamondStorage.VaultState storage ds = DiamondStorage.getStorage();
    return ds.userLoans[user];
}

    function calculateInterestRate(
    uint256 duration
) public pure returns (uint256) {
    // Base interest rate is 5% (500 basis points)
    uint256 baseRate = DiamondStorage.BASE_INTEREST_RATE;
    
    // Additional rate based on duration (longer duration = higher rate)
    // For each month over 30 days, add 0.5% (50 basis points)
    uint256 additionalRate = ((duration - DiamondStorage.MIN_LOAN_DURATION) * 50) / 30 days;
    
    // Cap the maximum additional rate at 5% (500 basis points)
    if (additionalRate > 500) {
        additionalRate = 500;
    }
    
    return baseRate + additionalRate;
}

// Also add the calculateTotalDebt function since it's used in AutomationLoan
function calculateTotalDebt(
    uint256 amount,
    uint256 rate,
    uint256 duration
) public pure returns (uint256) {
    // Calculate interest: (amount * rate * duration) / (10000 * 365 days)
    // rate is in basis points (100 = 1%)
    uint256 interest = (amount * rate * duration) / (10000 * 365 days);
    return amount + interest;
}
function calculateTotalCurrentDebt(
    uint256 loanId
) public view returns (uint256) {
    DiamondStorage.VaultState storage ds = DiamondStorage.getStorage();
    DiamondStorage.LoanData memory loan = ds.loans[loanId];
    
    if (!loan.isActive) {
        return 0;
    }

    // Calculate time elapsed since loan start
    uint256 timeElapsed = block.timestamp - loan.startTime;
    
    // If loan is past duration, return total debt
    if (timeElapsed >= loan.duration) {
        return loan.totalDebt;
    }
    
    // Calculate current debt based on elapsed time
    uint256 currentInterest = (loan.loanAmount * loan.interestRate * timeElapsed) / 
                            (10000 * 365 days);
    
    return loan.loanAmount + currentInterest;
}
/////
    function getUserInvestments(
        address _user
    )
        public
        view
        returns (
            uint256[] memory tokenIds,
            uint256[] memory amounts,
            bool[] memory authStatuses
        )
    {
        DiamondStorage.VaultState storage ds = DiamondStorage.getStorage();
        uint256[] memory nftIds = ds.userNftIds[_user];
        uint256 length = nftIds.length;

        tokenIds = nftIds;
        amounts = new uint256[](length);
        authStatuses = new bool[](length);

        for (uint256 i = 0; i < length; i++) {
            // Make sure this NFT exists for this user
            uint256 tokenId = nftIds[i];
            if (ds.User[_user][tokenId].isAuth) {
                amounts[i] = ds.User[_user][tokenId].amount;
                authStatuses[i] = true;
            } else {
                amounts[i] = 0;
                authStatuses[i] = false;
            }
        }

        return (tokenIds, amounts, authStatuses);
    }
}
