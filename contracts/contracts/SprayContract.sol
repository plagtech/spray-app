// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SprayContract
 * @notice Enables batch token transfers to multiple recipients in a single transaction
 * @dev Supports both native ETH and ERC20 tokens with optional fees
 */
contract SprayContract is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // Events
    event Spray(
        address indexed sender,
        address indexed token,
        uint256 totalAmount,
        uint256 recipientCount,
        uint256 feeAmount,
        uint256 timestamp
    );

    event FeeUpdated(uint256 newFeeBps);
    event FeeRecipientUpdated(address newFeeRecipient);
    event EmergencyWithdraw(address indexed token, uint256 amount);

    // State variables
    uint256 public feeBps; // Fee in basis points (100 = 1%)
    address public feeRecipient;
    uint256 public constant MAX_FEE_BPS = 500; // 5% max fee
    uint256 public constant MAX_RECIPIENTS = 200; // Safety limit

    // Structs
    struct Recipient {
        address payable recipient;
        uint256 amount;
    }

    constructor(address _feeRecipient, uint256 _feeBps) Ownable(msg.sender) {
    require(_feeRecipient != address(0), "Invalid fee recipient");
    require(_feeBps <= MAX_FEE_BPS, "Fee too high");
    
    feeRecipient = _feeRecipient;
    feeBps = _feeBps;
}

    /**
     * @notice Spray native ETH to multiple recipients
     * @param recipients Array of recipients and amounts
     */
    function sprayETH(Recipient[] calldata recipients) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        require(recipients.length > 0, "No recipients");
        require(recipients.length <= MAX_RECIPIENTS, "Too many recipients");

        uint256 totalAmount = 0;
        
        // Calculate total and validate
        for (uint i = 0; i < recipients.length; i++) {
            require(recipients[i].recipient != address(0), "Invalid recipient");
            require(recipients[i].amount > 0, "Invalid amount");
            totalAmount += recipients[i].amount;
        }

        // Calculate fee
        uint256 feeAmount = (totalAmount * feeBps) / 10000;
        uint256 requiredAmount = totalAmount + feeAmount;
        
        require(msg.value >= requiredAmount, "Insufficient ETH");

        // Transfer to recipients
        for (uint i = 0; i < recipients.length; i++) {
            (bool success, ) = recipients[i].recipient.call{value: recipients[i].amount}("");
            require(success, "ETH transfer failed");
        }

        // Transfer fee
        if (feeAmount > 0) {
            (bool feeSuccess, ) = payable(feeRecipient).call{value: feeAmount}("");
            require(feeSuccess, "Fee transfer failed");
        }

        // Refund excess
        uint256 excess = msg.value - requiredAmount;
        if (excess > 0) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: excess}("");
            require(refundSuccess, "Refund failed");
        }

        emit Spray(msg.sender, address(0), totalAmount, recipients.length, feeAmount, block.timestamp);
    }

    /**
     * @notice Spray ERC20 tokens to multiple recipients
     * @param token Address of the ERC20 token
     * @param recipients Array of recipients and amounts
     */
    function sprayERC20(
        address token,
        Recipient[] calldata recipients
    ) external nonReentrant whenNotPaused {
        require(token != address(0), "Invalid token");
        require(recipients.length > 0, "No recipients");
        require(recipients.length <= MAX_RECIPIENTS, "Too many recipients");

        IERC20 tokenContract = IERC20(token);
        uint256 totalAmount = 0;

        // Calculate total and validate
        for (uint i = 0; i < recipients.length; i++) {
            require(recipients[i].recipient != address(0), "Invalid recipient");
            require(recipients[i].amount > 0, "Invalid amount");
            totalAmount += recipients[i].amount;
        }

        // Calculate fee
        uint256 feeAmount = (totalAmount * feeBps) / 10000;
        uint256 requiredAmount = totalAmount + feeAmount;

        // Transfer tokens from sender to this contract
        tokenContract.safeTransferFrom(msg.sender, address(this), requiredAmount);

        // Distribute to recipients
        for (uint i = 0; i < recipients.length; i++) {
            tokenContract.safeTransfer(recipients[i].recipient, recipients[i].amount);
        }

        // Transfer fee
        if (feeAmount > 0) {
            tokenContract.safeTransfer(feeRecipient, feeAmount);
        }

        emit Spray(msg.sender, token, totalAmount, recipients.length, feeAmount, block.timestamp);
    }

    /**
     * @notice Batch spray to same amount for all recipients (more gas efficient)
     * @param token Address of token (address(0) for ETH)
     * @param recipients Array of recipient addresses
     * @param amountPerRecipient Amount to send to each recipient
     */
    function sprayEqual(
        address token,
        address payable[] calldata recipients,
        uint256 amountPerRecipient
    ) external payable nonReentrant whenNotPaused {
        require(recipients.length > 0, "No recipients");
        require(recipients.length <= MAX_RECIPIENTS, "Too many recipients");
        require(amountPerRecipient > 0, "Invalid amount");

        uint256 totalAmount = amountPerRecipient * recipients.length;
        uint256 feeAmount = (totalAmount * feeBps) / 10000;
        uint256 requiredAmount = totalAmount + feeAmount;

        if (token == address(0)) {
            // ETH spray
            require(msg.value >= requiredAmount, "Insufficient ETH");

            for (uint i = 0; i < recipients.length; i++) {
                require(recipients[i] != address(0), "Invalid recipient");
                (bool success, ) = recipients[i].call{value: amountPerRecipient}("");
                require(success, "ETH transfer failed");
            }

            // Transfer fee
            if (feeAmount > 0) {
                (bool feeSuccess, ) = payable(feeRecipient).call{value: feeAmount}("");
                require(feeSuccess, "Fee transfer failed");
            }

            // Refund excess
            uint256 excess = msg.value - requiredAmount;
            if (excess > 0) {
                (bool refundSuccess, ) = payable(msg.sender).call{value: excess}("");
                require(refundSuccess, "Refund failed");
            }
        } else {
            // ERC20 spray
            IERC20 tokenContract = IERC20(token);
            tokenContract.safeTransferFrom(msg.sender, address(this), requiredAmount);

            for (uint i = 0; i < recipients.length; i++) {
                require(recipients[i] != address(0), "Invalid recipient");
                tokenContract.safeTransfer(recipients[i], amountPerRecipient);
            }

            // Transfer fee
            if (feeAmount > 0) {
                tokenContract.safeTransfer(feeRecipient, feeAmount);
            }
        }

        emit Spray(msg.sender, token, totalAmount, recipients.length, feeAmount, block.timestamp);
    }

    // Admin functions

    /**
     * @notice Update the fee in basis points
     * @param newFeeBps New fee amount (100 = 1%)
     */
    function updateFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Fee too high");
        feeBps = newFeeBps;
        emit FeeUpdated(newFeeBps);
    }

    /**
     * @notice Update the fee recipient address
     * @param newFeeRecipient New fee recipient address
     */
    function updateFeeRecipient(address newFeeRecipient) external onlyOwner {
        require(newFeeRecipient != address(0), "Invalid address");
        feeRecipient = newFeeRecipient;
        emit FeeRecipientUpdated(newFeeRecipient);
    }

    /**
     * @notice Pause the contract in case of emergency
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw function for stuck tokens
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = payable(owner()).call{value: amount}("");
            require(success, "ETH withdrawal failed");
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
        emit EmergencyWithdraw(token, amount);
    }

    // View functions

    /**
     * @notice Calculate the total cost including fees
     * @param totalAmount Total amount to distribute
     * @return Total cost including fees
     */
    function calculateTotalCost(uint256 totalAmount) external view returns (uint256) {
        uint256 feeAmount = (totalAmount * feeBps) / 10000;
        return totalAmount + feeAmount;
    }

    /**
     * @notice Calculate the fee for a given amount
     * @param amount Amount to calculate fee for
     * @return Fee amount
     */
    function calculateFee(uint256 amount) external view returns (uint256) {
        return (amount * feeBps) / 10000;
    }

    // Receive function to accept ETH
    receive() external payable {}
}
