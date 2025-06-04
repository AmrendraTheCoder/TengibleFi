// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Diamond/AutomationLoan.sol";
import "../src/Diamond/ViewFacet.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock NFT contract for testing
contract MockNFT is ERC721 {
    constructor() ERC721("MockNFT", "MNFT") {}

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }
}

// Mock USDC contract for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("USDC", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // Mint 1M USDC
    }
}

contract AutomationLoanTest is Test {
    AutomationLoan public loanContract;
    ViewFacet public viewFacet;
    MockNFT public nftContract;
    MockUSDC public usdcToken;
    MockNFT public userAccountNFT;

    address public borrower;
    uint256 public constant NFT_ID = 1;
    uint256 public constant ACCOUNT_ID = 1;
    uint256 public constant LOAN_AMOUNT = 1000 * 10**6; // 1000 USDC
    uint256 public constant LOAN_DURATION = 180 days; // 6 months

    function setUp() public {
        // Deploy mock contracts
        nftContract = new MockNFT();
        usdcToken = new MockUSDC();
        userAccountNFT = new MockNFT();
        viewFacet = new ViewFacet();

        // Deploy loan contract
        loanContract = new AutomationLoan(
            address(nftContract),
            address(usdcToken),
            address(userAccountNFT),
            address(viewFacet)
        );

        // Setup borrower
        borrower = address(0x1);
        vm.startPrank(borrower);
        
        // Mint NFT to borrower
        nftContract.mint(borrower, NFT_ID);
        userAccountNFT.mint(borrower, ACCOUNT_ID);
        
        // Give USDC to borrower
        deal(address(usdcToken), borrower, LOAN_AMOUNT * 2);
        
        // Approve contracts
        nftContract.approve(address(loanContract), NFT_ID);
        usdcToken.approve(address(loanContract), LOAN_AMOUNT * 2);
        
        vm.stopPrank();
    }

    function testCreateLoan() public {
        vm.startPrank(borrower);

        // Create loan
        loanContract.createLoan(NFT_ID, ACCOUNT_ID, LOAN_DURATION, LOAN_AMOUNT);

        // Verify loan creation
        (bool isActive,,,,) = viewFacet.getUserNFTDetail(borrower, NFT_ID);
        assertTrue(isActive, "Loan should be active");
        assertEq(nftContract.ownerOf(NFT_ID), address(loanContract), "Contract should own NFT");

        vm.stopPrank();
    }

    function testMonthlyPayment() public {
        vm.startPrank(borrower);
        
        // Create loan
        loanContract.createLoan(NFT_ID, ACCOUNT_ID, LOAN_DURATION, LOAN_AMOUNT);
        
        // Advance time by 30 days
        vm.warp(block.timestamp + 30 days);
        
        // Make monthly payment
        uint256 monthlyAmount = LOAN_AMOUNT / 6; // 6 months duration
        usdcToken.approve(address(loanContract), monthlyAmount);
        loanContract.makeMonthlyPayment(NFT_ID);
        
        vm.stopPrank();
    }

    function testLoanLiquidation() public {
        vm.startPrank(borrower);
        
        // Create loan
        loanContract.createLoan(NFT_ID, ACCOUNT_ID, LOAN_DURATION, LOAN_AMOUNT);
        
        // Advance time past due date
        vm.warp(block.timestamp + 35 days);
        
        vm.stopPrank();
        
        // Check and perform upkeep
        (bool upkeepNeeded, bytes memory performData) = loanContract.checkUpkeep("");
        assertTrue(upkeepNeeded, "Upkeep should be needed");
        
        loanContract.performUpkeep(performData);
    }

    function testFullRepayment() public {
        vm.startPrank(borrower);
        
        // Create loan
        loanContract.createLoan(NFT_ID, ACCOUNT_ID, LOAN_DURATION, LOAN_AMOUNT);
        
        // Advance time
        vm.warp(block.timestamp + 60 days);
        
        // Repay full loan
        loanContract.repayLoanFull(NFT_ID);
        
        // Verify loan closure
        (bool isActive,,,,) = viewFacet.getUserNFTDetail(borrower, NFT_ID);
        assertFalse(isActive, "Loan should be inactive");
        assertEq(nftContract.ownerOf(NFT_ID), borrower, "NFT should be returned");
        
        vm.stopPrank();
    }
}