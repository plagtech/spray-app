const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SprayContract", function () {
  let sprayContract;
  let owner;
  let feeRecipient;
  let user1;
  let user2;
  let user3;
  let testToken;

  const FEE_BPS = 30; // 0.3%
  const INITIAL_BALANCE = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, feeRecipient, user1, user2, user3] = await ethers.getSigners();

    // Deploy test ERC20 token
    const TestToken = await ethers.getContractFactory("TestERC20");
    testToken = await TestToken.deploy("Test Token", "TEST");
    await testToken.waitForDeployment();

    // Mint tokens to user1
    await testToken.mint(user1.address, INITIAL_BALANCE);

    // Deploy SprayContract
    const SprayContract = await ethers.getContractFactory("SprayContract");
    sprayContract = await SprayContract.deploy(feeRecipient.address, FEE_BPS);
    await sprayContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct fee recipient", async function () {
      expect(await sprayContract.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should set the correct fee", async function () {
      expect(await sprayContract.feeBps()).to.equal(FEE_BPS);
    });

    it("Should set the correct owner", async function () {
      expect(await sprayContract.owner()).to.equal(owner.address);
    });
  });

  describe("ETH Spray", function () {
    it("Should spray ETH to multiple recipients", async function () {
      const amount1 = ethers.parseEther("0.1");
      const amount2 = ethers.parseEther("0.2");
      const recipients = [
        { recipient: user2.address, amount: amount1 },
        { recipient: user3.address, amount: amount2 }
      ];

      const totalAmount = amount1 + amount2;
      const feeAmount = (totalAmount * BigInt(FEE_BPS)) / 10000n;
      const requiredAmount = totalAmount + feeAmount;

      const user2BalanceBefore = await ethers.provider.getBalance(user2.address);
      const user3BalanceBefore = await ethers.provider.getBalance(user3.address);
      const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);

      await sprayContract.connect(user1).sprayETH(recipients, { value: requiredAmount });

      const user2BalanceAfter = await ethers.provider.getBalance(user2.address);
      const user3BalanceAfter = await ethers.provider.getBalance(user3.address);
      const feeRecipientBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);

      expect(user2BalanceAfter - user2BalanceBefore).to.equal(amount1);
      expect(user3BalanceAfter - user3BalanceBefore).to.equal(amount2);
      expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(feeAmount);
    });

    it("Should refund excess ETH", async function () {
      const amount = ethers.parseEther("0.1");
      const recipients = [{ recipient: user2.address, amount }];
      
      const feeAmount = (amount * BigInt(FEE_BPS)) / 10000n;
      const requiredAmount = amount + feeAmount;
      const sentAmount = requiredAmount + ethers.parseEther("0.5"); // Send extra

      const user1BalanceBefore = await ethers.provider.getBalance(user1.address);

      const tx = await sprayContract.connect(user1).sprayETH(recipients, { value: sentAmount });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const user1BalanceAfter = await ethers.provider.getBalance(user1.address);
      const actualSpent = user1BalanceBefore - user1BalanceAfter;

      // Should only spend required amount + gas
      expect(actualSpent).to.equal(requiredAmount + gasUsed);
    });

    it("Should revert if insufficient ETH sent", async function () {
      const amount = ethers.parseEther("0.1");
      const recipients = [{ recipient: user2.address, amount }];
      const insufficientAmount = amount / 2n;

      await expect(
        sprayContract.connect(user1).sprayETH(recipients, { value: insufficientAmount })
      ).to.be.revertedWith("Insufficient ETH");
    });

    it("Should revert with too many recipients", async function () {
      const recipients = [];
      for (let i = 0; i < 201; i++) {
        recipients.push({ recipient: user2.address, amount: ethers.parseEther("0.001") });
      }

      await expect(
        sprayContract.connect(user1).sprayETH(recipients, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Too many recipients");
    });
  });

  describe("ERC20 Spray", function () {
    it("Should spray ERC20 tokens to multiple recipients", async function () {
      const amount1 = ethers.parseEther("10");
      const amount2 = ethers.parseEther("20");
      const recipients = [
        { recipient: user2.address, amount: amount1 },
        { recipient: user3.address, amount: amount2 }
      ];

      const totalAmount = amount1 + amount2;
      const feeAmount = (totalAmount * BigInt(FEE_BPS)) / 10000n;
      const requiredAmount = totalAmount + feeAmount;

      // Approve contract
      await testToken.connect(user1).approve(await sprayContract.getAddress(), requiredAmount);

      await sprayContract.connect(user1).sprayERC20(await testToken.getAddress(), recipients);

      expect(await testToken.balanceOf(user2.address)).to.equal(amount1);
      expect(await testToken.balanceOf(user3.address)).to.equal(amount2);
      expect(await testToken.balanceOf(feeRecipient.address)).to.equal(feeAmount);
    });

    it("Should revert if insufficient token allowance", async function () {
      const amount = ethers.parseEther("10");
      const recipients = [{ recipient: user2.address, amount }];

      await expect(
        sprayContract.connect(user1).sprayERC20(await testToken.getAddress(), recipients)
      ).to.be.reverted;
    });
  });

  describe("Equal Spray", function () {
    it("Should spray equal ETH amounts to all recipients", async function () {
      const recipients = [user2.address, user3.address];
      const amountPerRecipient = ethers.parseEther("0.1");
      
      const totalAmount = amountPerRecipient * BigInt(recipients.length);
      const feeAmount = (totalAmount * BigInt(FEE_BPS)) / 10000n;
      const requiredAmount = totalAmount + feeAmount;

      const user2BalanceBefore = await ethers.provider.getBalance(user2.address);
      const user3BalanceBefore = await ethers.provider.getBalance(user3.address);

      await sprayContract.connect(user1).sprayEqual(
        ethers.ZeroAddress,
        recipients,
        amountPerRecipient,
        { value: requiredAmount }
      );

      const user2BalanceAfter = await ethers.provider.getBalance(user2.address);
      const user3BalanceAfter = await ethers.provider.getBalance(user3.address);

      expect(user2BalanceAfter - user2BalanceBefore).to.equal(amountPerRecipient);
      expect(user3BalanceAfter - user3BalanceBefore).to.equal(amountPerRecipient);
    });

    it("Should spray equal ERC20 amounts to all recipients", async function () {
      const recipients = [user2.address, user3.address];
      const amountPerRecipient = ethers.parseEther("10");
      
      const totalAmount = amountPerRecipient * BigInt(recipients.length);
      const feeAmount = (totalAmount * BigInt(FEE_BPS)) / 10000n;
      const requiredAmount = totalAmount + feeAmount;

      await testToken.connect(user1).approve(await sprayContract.getAddress(), requiredAmount);

      await sprayContract.connect(user1).sprayEqual(
        await testToken.getAddress(),
        recipients,
        amountPerRecipient
      );

      expect(await testToken.balanceOf(user2.address)).to.equal(amountPerRecipient);
      expect(await testToken.balanceOf(user3.address)).to.equal(amountPerRecipient);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update fee", async function () {
      const newFee = 50;
      await sprayContract.connect(owner).updateFee(newFee);
      expect(await sprayContract.feeBps()).to.equal(newFee);
    });

    it("Should not allow non-owner to update fee", async function () {
      await expect(
        sprayContract.connect(user1).updateFee(50)
      ).to.be.reverted;
    });

    it("Should not allow fee above max", async function () {
      await expect(
        sprayContract.connect(owner).updateFee(600)
      ).to.be.revertedWith("Fee too high");
    });

    it("Should allow owner to pause and unpause", async function () {
      await sprayContract.connect(owner).pause();
      
      const recipients = [{ recipient: user2.address, amount: ethers.parseEther("0.1") }];
      await expect(
        sprayContract.connect(user1).sprayETH(recipients, { value: ethers.parseEther("0.2") })
      ).to.be.reverted;

      await sprayContract.connect(owner).unpause();
      
      // Should work after unpause
      await sprayContract.connect(user1).sprayETH(recipients, { value: ethers.parseEther("0.2") });
    });
  });

  describe("View Functions", function () {
    it("Should calculate total cost correctly", async function () {
      const amount = ethers.parseEther("1");
      const totalCost = await sprayContract.calculateTotalCost(amount);
      const expectedFee = (amount * BigInt(FEE_BPS)) / 10000n;
      expect(totalCost).to.equal(amount + expectedFee);
    });

    it("Should calculate fee correctly", async function () {
      const amount = ethers.parseEther("1");
      const fee = await sprayContract.calculateFee(amount);
      const expectedFee = (amount * BigInt(FEE_BPS)) / 10000n;
      expect(fee).to.equal(expectedFee);
    });
  });
});

// Helper contract for testing ERC20
const TestERC20Source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
`;
