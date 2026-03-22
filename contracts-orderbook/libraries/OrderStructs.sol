// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title OrderStructs
 * @notice Data structures for the OutcomeBazaar order book system
 */
library OrderStructs {
    /**
     * @notice Order side (BUY = buying outcome tokens, SELL = selling outcome tokens)
     */
    enum Side {
        BUY,  // Buying outcome tokens with collateral
        SELL  // Selling outcome tokens for collateral
    }

    /**
     * @notice Order status
     */
    enum OrderStatus {
        INVALID,   // Order doesn't exist or is invalid
        FILLABLE,  // Order is valid and can be filled
        FILLED,    // Order is completely filled
        CANCELLED, // Order was cancelled
        EXPIRED    // Order expired
    }

    /**
     * @notice Main order structure
     * @dev Optimized for EIP-712 signing
     */
    struct Order {
        uint256 salt;           // Unique salt for order identification
        address maker;          // Address creating the order
        address signer;         // Address that signed the order (can be maker or delegate)
        address taker;          // Specific taker address (0x0 for public orders)
        uint256 tokenId;        // CTF token ID (outcome token)
        uint256 makerAmount;    // Amount of tokens maker is providing
        uint256 takerAmount;    // Amount of tokens taker must provide
        uint256 expiration;     // Expiration timestamp
        uint256 nonce;          // Maker's nonce for cancellation
        uint256 feeRateBps;     // Fee rate in basis points (e.g., 150 = 1.5%)
        Side side;              // BUY or SELL
        SignatureType signatureType; // Type of signature
    }

    /**
     * @notice Signature types supported
     */
    enum SignatureType {
        EOA,    // Externally Owned Account (standard wallet)
        POLY_PROXY,  // Polymarket proxy wallet (future)
        POLY_GNOSIS_SAFE  // Gnosis Safe wallet (future)
    }

    /**
     * @notice Order info for tracking filled amounts
     */
    struct OrderInfo {
        bytes32 orderHash;      // Hash of the order
        OrderStatus status;     // Current status
        uint256 filledAmount;   // Amount already filled
    }

    /**
     * @notice Match result for tracking trade execution
     */
    struct MatchResult {
        bytes32 makerOrderHash;
        bytes32 takerOrderHash;
        address maker;
        address taker;
        uint256 makerAssetId;   // Token ID maker is selling
        uint256 takerAssetId;   // Token ID taker is selling
        uint256 makerAmountFilled;
        uint256 takerAmountFilled;
        uint256 makerFee;
        uint256 takerFee;
    }

    /**
     * @notice Market info for CTF integration
     */
    struct MarketInfo {
        bytes32 questionId;     // Question identifier
        bytes32 conditionId;    // CTF condition ID
        uint256 outcomeSlotCount; // Number of outcomes (2 for binary)
        uint256 yesTokenId;     // Token ID for YES outcome
        uint256 noTokenId;      // Token ID for NO outcome
        address oracle;         // Oracle address (MarketFactory)
        bool resolved;          // Whether market is resolved
        uint256 payoutNumerator; // Winning outcome (0 or 1)
    }
}
