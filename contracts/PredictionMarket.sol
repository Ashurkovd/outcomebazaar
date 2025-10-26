// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract PredictionMarket {
    // State variables
    IERC20 public immutable token;
    address public immutable factory;

    string public question;
    uint256 public endTime;

    // Market state
    enum MarketState { Active, Resolved, Cancelled }
    MarketState public state;
    bool public outcome; // true = YES wins, false = NO wins

    // AMM liquidity pools
    uint256 public yesPool;
    uint256 public noPool;

    // User balances
    mapping(address => uint256) public yesShares;
    mapping(address => uint256) public noShares;

    // Fee configuration (1.5% = 150 basis points)
    uint256 public constant FEE_BASIS_POINTS = 150;
    uint256 public constant BASIS_POINTS = 10000;

    // Events
    event SharesPurchased(address indexed buyer, bool isYes, uint256 amount, uint256 shares, uint256 fee);
    event SharesSold(address indexed seller, bool isYes, uint256 shares, uint256 amount, uint256 fee);
    event MarketResolved(bool outcome);
    event MarketCancelled();
    event WinningsClaimed(address indexed user, uint256 amount);
    event RefundClaimed(address indexed user, uint256 yesAmount, uint256 noAmount);

    // Modifiers
    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory can call");
        _;
    }

    modifier onlyActive() {
        require(state == MarketState.Active, "Market not active");
        require(block.timestamp < endTime, "Market ended");
        _;
    }

    modifier onlyResolved() {
        require(state == MarketState.Resolved, "Market not resolved");
        _;
    }

    modifier onlyCancelled() {
        require(state == MarketState.Cancelled, "Market not cancelled");
        _;
    }

    constructor(
        address _token,
        string memory _question,
        uint256 _endTime,
        uint256 _initialLiquidity
    ) {
        require(_token != address(0), "Invalid token address");
        require(_endTime > block.timestamp, "End time must be in future");
        require(_initialLiquidity > 0, "Initial liquidity must be > 0");

        token = IERC20(_token);
        factory = msg.sender;
        question = _question;
        endTime = _endTime;

        // Initialize pools with equal liquidity (50/50 odds)
        yesPool = _initialLiquidity;
        noPool = _initialLiquidity;
        state = MarketState.Active;
    }

    /**
     * @dev Calculate shares received for a given token amount using constant product AMM
     * Formula: shares = pool - (k / (pool + amount))
     * where k = yesPool * noPool (constant product)
     */
    function calculateShares(bool isYes, uint256 tokenAmount) public view returns (uint256) {
        require(tokenAmount > 0, "Amount must be > 0");

        uint256 pool = isYes ? yesPool : noPool;
        uint256 otherPool = isYes ? noPool : yesPool;

        uint256 k = pool * otherPool;
        uint256 newOtherPool = otherPool + tokenAmount;
        uint256 newPool = k / newOtherPool;

        return pool - newPool;
    }

    /**
     * @dev Calculate tokens received for selling shares
     * Formula: tokens = otherPool - (k / (pool + shares))
     */
    function calculateTokensForShares(bool isYes, uint256 shareAmount) public view returns (uint256) {
        require(shareAmount > 0, "Shares must be > 0");

        uint256 pool = isYes ? yesPool : noPool;
        uint256 otherPool = isYes ? noPool : yesPool;

        require(shareAmount < pool, "Not enough liquidity");

        uint256 k = pool * otherPool;
        uint256 newPool = pool + shareAmount;
        uint256 newOtherPool = k / newPool;

        return otherPool - newOtherPool;
    }

    /**
     * @dev Buy shares (YES or NO)
     */
    function buyShares(bool isYes, uint256 tokenAmount) external onlyActive {
        require(tokenAmount > 0, "Amount must be > 0");

        // Calculate fee
        uint256 fee = (tokenAmount * FEE_BASIS_POINTS) / BASIS_POINTS;
        uint256 amountAfterFee = tokenAmount - fee;

        // Calculate shares to receive
        uint256 shares = calculateShares(isYes, amountAfterFee);
        require(shares > 0, "No shares received");

        // Transfer tokens from user (including fee)
        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Transfer failed");

        // Transfer fee to factory (treasury)
        if (fee > 0) {
            require(token.transfer(factory, fee), "Fee transfer failed");
        }

        // Update pools and user shares
        if (isYes) {
            noPool += amountAfterFee;
            yesPool -= shares;
            yesShares[msg.sender] += shares;
        } else {
            yesPool += amountAfterFee;
            noPool -= shares;
            noShares[msg.sender] += shares;
        }

        emit SharesPurchased(msg.sender, isYes, tokenAmount, shares, fee);
    }

    /**
     * @dev Sell shares (YES or NO)
     */
    function sellShares(bool isYes, uint256 shareAmount) external onlyActive {
        require(shareAmount > 0, "Shares must be > 0");

        // Check user has enough shares
        uint256 userShares = isYes ? yesShares[msg.sender] : noShares[msg.sender];
        require(userShares >= shareAmount, "Insufficient shares");

        // Calculate tokens to receive
        uint256 tokensBeforeFee = calculateTokensForShares(isYes, shareAmount);
        require(tokensBeforeFee > 0, "No tokens received");

        // Calculate fee
        uint256 fee = (tokensBeforeFee * FEE_BASIS_POINTS) / BASIS_POINTS;
        uint256 tokensAfterFee = tokensBeforeFee - fee;

        // Update pools and user shares
        if (isYes) {
            yesPool += shareAmount;
            noPool -= tokensBeforeFee;
            yesShares[msg.sender] -= shareAmount;
        } else {
            noPool += shareAmount;
            yesPool -= tokensBeforeFee;
            noShares[msg.sender] -= shareAmount;
        }

        // Transfer fee to factory (treasury)
        if (fee > 0) {
            require(token.transfer(factory, fee), "Fee transfer failed");
        }

        // Transfer tokens to user
        require(token.transfer(msg.sender, tokensAfterFee), "Transfer failed");

        emit SharesSold(msg.sender, isYes, shareAmount, tokensAfterFee, fee);
    }

    /**
     * @dev Get current price for YES shares (in basis points, 5000 = 50%)
     */
    function getYesPrice() external view returns (uint256) {
        uint256 total = yesPool + noPool;
        if (total == 0) return 5000; // 50% if no liquidity
        return (noPool * BASIS_POINTS) / total;
    }

    /**
     * @dev Get current price for NO shares (in basis points)
     */
    function getNoPrice() external view returns (uint256) {
        uint256 total = yesPool + noPool;
        if (total == 0) return 5000; // 50% if no liquidity
        return (yesPool * BASIS_POINTS) / total;
    }

    /**
     * @dev Resolve the market (only factory/oracle can call)
     */
    function resolve(bool _outcome) external onlyFactory {
        require(state == MarketState.Active, "Market not active");
        require(block.timestamp >= endTime, "Market not ended yet");

        state = MarketState.Resolved;
        outcome = _outcome;

        emit MarketResolved(_outcome);
    }

    /**
     * @dev Cancel the market (only factory can call)
     */
    function cancel() external onlyFactory {
        require(state == MarketState.Active, "Market not active");

        state = MarketState.Cancelled;

        emit MarketCancelled();
    }

    /**
     * @dev Claim winnings after market is resolved
     */
    function claimWinnings() external onlyResolved {
        uint256 winningShares = outcome ? yesShares[msg.sender] : noShares[msg.sender];
        require(winningShares > 0, "No winnings to claim");

        // Calculate payout (1 share = 1 token)
        uint256 payout = winningShares;

        // Clear user's shares
        if (outcome) {
            yesShares[msg.sender] = 0;
        } else {
            noShares[msg.sender] = 0;
        }

        // Transfer payout
        require(token.transfer(msg.sender, payout), "Transfer failed");

        emit WinningsClaimed(msg.sender, payout);
    }

    /**
     * @dev Claim refund if market is cancelled
     */
    function claimRefund() external onlyCancelled {
        uint256 userYesShares = yesShares[msg.sender];
        uint256 userNoShares = noShares[msg.sender];

        require(userYesShares > 0 || userNoShares > 0, "No shares to refund");

        // Calculate total refund
        uint256 totalRefund = userYesShares + userNoShares;

        // Clear user's shares
        yesShares[msg.sender] = 0;
        noShares[msg.sender] = 0;

        // Transfer refund
        require(token.transfer(msg.sender, totalRefund), "Transfer failed");

        emit RefundClaimed(msg.sender, userYesShares, userNoShares);
    }

    /**
     * @dev Get market info
     */
    function getMarketInfo() external view returns (
        string memory _question,
        uint256 _endTime,
        MarketState _state,
        bool _outcome,
        uint256 _yesPool,
        uint256 _noPool,
        uint256 _yesPrice,
        uint256 _noPrice
    ) {
        uint256 total = yesPool + noPool;
        uint256 yesPrice = total == 0 ? 5000 : (noPool * BASIS_POINTS) / total;
        uint256 noPrice = total == 0 ? 5000 : (yesPool * BASIS_POINTS) / total;

        return (
            question,
            endTime,
            state,
            outcome,
            yesPool,
            noPool,
            yesPrice,
            noPrice
        );
    }

    /**
     * @dev Get user's shares
     */
    function getUserShares(address user) external view returns (uint256 yes, uint256 no) {
        return (yesShares[user], noShares[user]);
    }
}
