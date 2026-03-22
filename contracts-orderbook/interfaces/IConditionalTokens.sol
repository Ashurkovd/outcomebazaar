// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IConditionalTokens
 * @notice Interface for Gnosis Conditional Token Framework
 * @dev Simplified interface for the core CTF functions we'll use
 */
interface IConditionalTokens {
    /**
     * @notice Prepare a condition for outcome token creation
     * @param oracle The oracle that will resolve the condition
     * @param questionId Identifier for the question
     * @param outcomeSlotCount Number of possible outcomes
     */
    function prepareCondition(
        address oracle,
        bytes32 questionId,
        uint256 outcomeSlotCount
    ) external;

    /**
     * @notice Split collateral into outcome tokens
     * @param collateralToken The ERC20 token to split
     * @param parentCollectionId Parent collection (0x0 for simple conditions)
     * @param conditionId The condition ID
     * @param partition The outcome partition
     * @param amount Amount to split
     */
    function splitPosition(
        address collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256[] calldata partition,
        uint256 amount
    ) external;

    /**
     * @notice Merge outcome tokens back into collateral
     * @param collateralToken The ERC20 token to merge into
     * @param parentCollectionId Parent collection (0x0 for simple conditions)
     * @param conditionId The condition ID
     * @param partition The outcome partition
     * @param amount Amount to merge
     */
    function mergePositions(
        address collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256[] calldata partition,
        uint256 amount
    ) external;

    /**
     * @notice Report the payout for a condition
     * @param questionId The question ID
     * @param payouts The payout vector for each outcome
     */
    function reportPayouts(
        bytes32 questionId,
        uint256[] calldata payouts
    ) external;

    /**
     * @notice Redeem outcome tokens for collateral after resolution
     * @param collateralToken The ERC20 token to receive
     * @param parentCollectionId Parent collection (0x0 for simple conditions)
     * @param conditionId The condition ID
     * @param indexSets The index sets to redeem
     */
    function redeemPositions(
        address collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256[] calldata indexSets
    ) external;

    /**
     * @notice Get the condition ID from oracle and question
     * @param oracle The oracle address
     * @param questionId The question ID
     * @param outcomeSlotCount Number of outcomes
     */
    function getConditionId(
        address oracle,
        bytes32 questionId,
        uint256 outcomeSlotCount
    ) external pure returns (bytes32);

    /**
     * @notice Get collection ID for a condition and index set
     * @param parentCollectionId Parent collection (0x0 for simple)
     * @param conditionId The condition ID
     * @param indexSet The index set (outcome combination)
     */
    function getCollectionId(
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256 indexSet
    ) external view returns (bytes32);

    /**
     * @notice Get position ID (token ID) for outcome tokens
     * @param collateralToken The collateral token
     * @param collectionId The collection ID
     */
    function getPositionId(
        address collateralToken,
        bytes32 collectionId
    ) external pure returns (uint256);

    /**
     * @notice Get payout numerators after resolution
     * @param conditionId The condition ID
     * @param index The outcome index
     */
    function payoutNumerators(
        bytes32 conditionId,
        uint256 index
    ) external view returns (uint256);

    /**
     * @notice Get payout denominator
     * @param conditionId The condition ID
     */
    function payoutDenominator(
        bytes32 conditionId
    ) external view returns (uint256);

    /**
     * @notice ERC1155 balance check
     * @param owner Token owner
     * @param id Token ID
     */
    function balanceOf(
        address owner,
        uint256 id
    ) external view returns (uint256);

    /**
     * @notice ERC1155 safe transfer
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external;

    /**
     * @notice ERC1155 set approval
     */
    function setApprovalForAll(address operator, bool approved) external;

    /**
     * @notice ERC1155 check approval
     */
    function isApprovedForAll(
        address owner,
        address operator
    ) external view returns (bool);
}
