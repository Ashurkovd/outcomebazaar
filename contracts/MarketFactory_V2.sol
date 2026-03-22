// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PredictionMarket_V2.sol";

/**
 * @title MarketFactory V2
 * @notice Same as V1 but does NOT provide initial liquidity.
 *
 * ONLY CHANGE FROM V1:
 * - createMarket() no longer requires or transfers initialLiquidity
 * - Market deploys with zero pools
 * - Users provide liquidity directly on the market contract
 * - Platform has ZERO financial exposure
 */
contract MarketFactory {
    address public owner;
    address public oracle;
    address public immutable token;

    uint256 public treasuryBalance;

    address[] public markets;
    mapping(address => bool) public isMarket;

    event MarketCreated(
        address indexed marketAddress,
        string question,
        uint256 endTime
        // REMOVED: initialLiquidity (platform no longer provides it)
    );
    event MarketResolved(address indexed marketAddress, bool outcome);
    event MarketCancelled(address indexed marketAddress);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OracleUpdated(address indexed previousOracle, address indexed newOracle);
    event TreasuryWithdrawn(address indexed recipient, uint256 amount);

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
        oracle = msg.sender;
        token = _token;
    }

    /**
     * CHANGE: Removed initialLiquidity parameter and USDT transfer.
     * Market starts with zero pools. Users provide liquidity separately.
     */
    function createMarket(
        string memory question,
        uint256 endTime
    ) external onlyOwner returns (address) {
        require(endTime > block.timestamp, "End time must be in future");
        require(bytes(question).length > 0, "Question cannot be empty");

        // Deploy market - no liquidity transferred
        PredictionMarket market = new PredictionMarket(
            token,
            question,
            endTime
        );

        address marketAddress = address(market);

        markets.push(marketAddress);
        isMarket[marketAddress] = true;

        emit MarketCreated(marketAddress, question, endTime);

        return marketAddress;
    }

    function resolveMarket(address market, bool outcome) external onlyOracle onlyValidMarket(market) {
        PredictionMarket(market).resolve(outcome);
        emit MarketResolved(market, outcome);
    }

    function cancelMarket(address market) external onlyOwner onlyValidMarket(market) {
        PredictionMarket(market).cancel();
        emit MarketCancelled(market);
    }

    receive() external payable {
        revert("Use ERC20 tokens only");
    }

    function updateTreasuryBalance() external {
        treasuryBalance = IERC20(token).balanceOf(address(this));
    }

    function withdrawTreasury(address recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");

        treasuryBalance = IERC20(token).balanceOf(address(this));
        require(treasuryBalance >= amount, "Insufficient treasury balance");

        treasuryBalance -= amount;
        require(IERC20(token).transfer(recipient, amount), "Transfer failed");

        emit TreasuryWithdrawn(recipient, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function updateOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Invalid new oracle");

        address previousOracle = oracle;
        oracle = newOracle;

        emit OracleUpdated(previousOracle, newOracle);
    }

    function getAllMarkets() external view returns (address[] memory) {
        return markets;
    }

    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }

    function getMarket(uint256 index) external view returns (address) {
        require(index < markets.length, "Index out of bounds");
        return markets[index];
    }

    function getActiveMarkets() external view returns (address[] memory) {
        uint256 activeCount = 0;

        for (uint256 i = 0; i < markets.length; i++) {
            PredictionMarket market = PredictionMarket(markets[i]);
            if (market.state() == PredictionMarket.MarketState.Active &&
                block.timestamp < market.endTime()) {
                activeCount++;
            }
        }

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

    function getMarketsAwaitingResolution() external view returns (address[] memory) {
        uint256 awaitingCount = 0;

        for (uint256 i = 0; i < markets.length; i++) {
            PredictionMarket market = PredictionMarket(markets[i]);
            if (market.state() == PredictionMarket.MarketState.Active &&
                block.timestamp >= market.endTime()) {
                awaitingCount++;
            }
        }

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
