// ID Relationship Chart for TengibleFi Diamond DeFi System

+-------------------+-------------------+-------------------+-------------------+
|      Entity       |      ID Name      |      Source       |      Usage        |
+-------------------+-------------------+-------------------+-------------------+
| Collateral NFT    | tokenId           | AuthUser/ERC721   | - Key for loans   |
|                   |                   |                   | - NFT transfer    |
|                   |                   |                   | - loan existence  |
+-------------------+-------------------+-------------------+-------------------+
| User Account NFT  | accountTokenId    | AuthUser/ERC721   | - User validation |
|                   |                   |                   | - Key for         |
|                   |                   |                   |   accountToLoans  |
+-------------------+-------------------+-------------------+-------------------+
| Loan              | loanId            | AutomationLoan    | - Unique loan     |
|                   |                   | (auto-incremented)|   identifier      |
|                   |                   |                   | - Key for         |
|                   |                   |                   |   loanIdToCollateralTokenId |
+-------------------+-------------------+-------------------+-------------------+
| User              | address           | EOA/Wallet        | - Key for         |
|                   |                   |                   |   userLoans,      |
|                   |                   |                   |   User mapping    |
+-------------------+-------------------+-------------------+-------------------+

Relationships:
- loanIdToCollateralTokenId[loanId] => tokenId
- loans[tokenId] => LoanData (loan info for that NFT)
- accountToLoans[accountTokenId] => loanId
- userLoans[address] => loanId[]
- User[address][tokenId] => UserAccount (Auth info for user/NFT)

Key Flows:
- User mints account NFT (accountTokenId) and collateral NFT (tokenId)
- User creates loan: links accountTokenId, tokenId, generates loanId
- Loan data is stored in loans[tokenId], indexed by loanId and accountTokenId
- All mappings allow lookup from any ID to related data


🎯 Without accountTokenId
Alice's wallet = 0x123

She takes loans → userLoans[0x123] = [loan1, loan2]

She loses the wallet? 🔥 All loan access gone forever.

🎯 With accountTokenId
Alice mints NFT → accountTokenId = 101

Loan stored as → accountToLoans[101] = loan1

She transfers NFT to new wallet → ✅ All loan access moves with it.

Can even give it to someone else → like selling/transferring an account.