// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PredictionMarket.sol";

contract MarketFactory {
    // State variables
    address public owner;
    address public oracle;
    address public immutable token; // USDT or other ERC20

    // Treasury
    uint256 public treasuryBalance;

    // Market tracking
    address[] public markets;
    mapping(address => bool) public isMarket;

    // Events
    event MarketCreated(
        address indexed marketAddress,
        string question,
        uint256 endTime,
        uint256 initialLiquidity
    );
    event MarketResolved(address indexed marketAddress, bool outcome);
    event MarketCancelled(address indexed marketAddress);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OracleUpdated(address indexed previousOracle, address indexed newOracle);
    event TreasuryWithdrawn(address indexed recipient, uint256 amount);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle || msg.sender == owner, "Only oracle can call");
        _;
    }

    modifier onlyValidMarket(address market) {
        require(isMarket[market], "Invalid market address");
        _;
    }

    constructor(address _token) {
        require(_token != address(0), "Invalid token address");

        owner = msg.sender;
        oracle = msg.sender; // Initially, owner is also oracle
        token = _token;
    }

    /**
     * @dev Create a new prediction market
     * @param question The market question
     * @param endTime When the market ends (unix timestamp)
     * @param initialLiquidity Amount of tokens for initial liquidity (per side)
     */
    function createMarket(
        string memory question,
        uint256 endTime,
        uint256 initialLiquidity
    ) external onlyOwner returns (address) {
        require(endTime > block.timestamp, "End time must be in future");
        require(initialLiquidity > 0, "Initial liquidity must be > 0");
        require(bytes(question).length > 0, "Question cannot be empty");

        // Calculate total initial liquidity needed (both YES and NO pools)
        uint256 totalLiquidity = initialLiquidity * 2;

        // Transfer initial liquidity from creator
        require(
            IERC20(token).transferFrom(msg.sender, address(this), totalLiquidity),
            "Transfer failed"
        );

        // Deploy new market contract
        PredictionMarket market = new PredictionMarket(
            token,
            question,
            endTime,
            initialLiquidity
        );

        address marketAddress = address(market);

        // Transfer liquidity to market
        require(
            IERC20(token).transfer(marketAddress, totalLiquidity),
            "Liquidity transfer failed"
        );

        // Track market
        markets.push(marketAddress);
        isMarket[marketAddress] = true;

        emit MarketCreated(marketAddress, question, endTime, initialLiquidity);

        return marketAddress;
    }

    /**
     * @dev Resolve a market (oracle function)
     * @param market The market address
     * @param outcome The outcome (true = YES wins, false = NO wins)
     */
    function resolveMarket(address market, bool outcome) external onlyOracle onlyValidMarket(market) {
        PredictionMarket(market).resolve(outcome);
        emit MarketResolved(market, outcome);
    }

    /**
     * @dev Cancel a market
     * @param market The market address
     */
    function cancelMarket(address market) external onlyOwner onlyValidMarket(market) {
        PredictionMarket(market).cancel();
        emit MarketCancelled(market);
    }

    /**
     * @dev Receive fees from markets (called when markets transfer fees)
     */
    receive() external payable {
        // This contract receives ERC20 fees, not native tokens
        revert("Use ERC20 tokens only");
    }

    /**
     * @dev Update treasury balance (call this to sync with actual balance)
     */
    function updateTreasuryBalance() external {
        treasuryBalance = IERC20(token).balanceOf(address(this));
    }

    /**
     * @dev Withdraw treasury funds
     * @param recipient Address to receive funds
     * @param amount Amount to withdraw
     */
    function withdrawTreasury(address recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");

        // Update treasury balance first
        treasuryBalance = IERC20(token).balanceOf(address(this));
        require(treasuryBalance >= amount, "Insufficient treasury balance");

        treasuryBalance -= amount;
        require(IERC20(token).transfer(recipient, amount), "Transfer failed");

        emit TreasuryWithdrawn(recipient, amount);
    }

    /**
     * @dev Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /**
     * @dev Update oracle address
     * @param newOracle New oracle address
     */
    function updateOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Invalid new oracle");

        address previousOracle = oracle;
        oracle = newOracle;

        emit OracleUpdated(previousOracle, newOracle);
    }

    /**
     * @dev Get all markets
     */
    function getAllMarkets() external view returns (address[] memory) {
        return markets;
    }

    /**
     * @dev Get number of markets
     */
    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }

    /**
     * @dev Get market by index
     */
    function getMarket(uint256 index) external view returns (address) {
        require(index < markets.length, "Index out of bounds");
        return markets[index];
    }

    /**
     * @dev Get active markets (markets that are still active)
     */
    function getActiveMarkets() external view returns (address[] memory) {
        uint256 activeCount = 0;

        // Count active markets
        for (uint256 i = 0; i < markets.length; i++) {
            PredictionMarket market = PredictionMarket(markets[i]);
            if (market.state() == PredictionMarket.MarketState.Active &&
                block.timestamp < market.endTime()) {
                activeCount++;
            }
        }

        // Collect active markets
        address[] memory activeMarkets = new address[](activeCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < markets.length; i++) {
            PredictionMarket market = PredictionMarket(markets[i]);
            if (market.state() == PredictionMarket.MarketState.Active &&
                block.timestamp < market.endTime()) {
                activeMarkets[currentIndex] = markets[i];
                currentIndex++;
            }
        }

        return activeMarkets;
    }

    /**
     * @dev Get markets awaiting resolution (ended but not resolved)
     */
    function getMarketsAwaitingResolution() external view returns (address[] memory) {
        uint256 awaitingCount = 0;

        // Count markets awaiting resolution
        for (uint256 i = 0; i < markets.length; i++) {
            PredictionMarket market = PredictionMarket(markets[i]);
            if (market.state() == PredictionMarket.MarketState.Active &&
                block.timestamp >= market.endTime()) {
                awaitingCount++;
            }
        }

        // Collect markets awaiting resolution
        address[] memory awaitingMarkets = new address[](awaitingCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < markets.length; i++) {
            PredictionMarket market = PredictionMarket(markets[i]);
            if (market.state() == PredictionMarket.MarketState.Active &&
                block.timestamp >= market.endTime()) {
                awaitingMarkets[currentIndex] = markets[i];
                currentIndex++;
            }
        }

        return awaitingMarkets;
    }
}
