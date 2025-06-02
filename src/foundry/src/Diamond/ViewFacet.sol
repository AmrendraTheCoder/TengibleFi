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
