// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title PredictionMarket V2
 * @notice Same as V1 but liquidity is provided by users, not the platform.
 *
 * ONLY CHANGE FROM V1:
 * - Constructor no longer accepts or initializes liquidity
 * - Users call provideLiquidity() to bootstrap the market
 * - LP can call withdrawLiquidity() after market resolves/cancels
 * - buyShares() requires liquidity to exist before trading
 */
contract PredictionMarket {
    // State variables (unchanged from V1)
    IERC20 public immutable token;
    address public immutable factory;

    string public question;
    uint256 public endTime;

    enum MarketState { Active, Resolved, Cancelled }
    MarketState public state;
    bool public outcome;

    uint256 public yesPool;
    uint256 public noPool;

    mapping(address => uint256) public yesShares;
    mapping(address => uint256) public noShares;

    uint256 public constant FEE_BASIS_POINTS = 150;
    uint256 public constant BASIS_POINTS = 10000;

    // ── NEW: Liquidity provider tracking ──────────────────────────
    address public liquidityProvider;
    bool public liquidityWithdrawn;
    // ──────────────────────────────────────────────────────────────

    // Events (unchanged from V1)
    event SharesPurchased(address indexed buyer, bool isYes, uint256 amount, uint256 shares, uint256 fee);
    event SharesSold(address indexed seller, bool isYes, uint256 shares, uint256 amount, uint256 fee);
    event MarketResolved(bool outcome);
    event MarketCancelled();
    event WinningsClaimed(address indexed user, uint256 amount);
    event RefundClaimed(address indexed user, uint256 yesAmount, uint256 noAmount);
    // NEW events
    event LiquidityProvided(address indexed provider, uint256 amount);
    event LiquidityWithdrawn(address indexed provider, uint256 amount);

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

    /**
     * CHANGE: Removed _initialLiquidity parameter.
     * Pools start at zero. User calls provideLiquidity() to bootstrap.
     */
    constructor(
        address _token,
        string memory _question,
        uint256 _endTime
    ) {
        require(_token != address(0), "Invalid token address");
        require(_endTime > block.timestamp, "End time must be in future");

        token = IERC20(_token);
        factory = msg.sender;
        question = _question;
        endTime = _endTime;
        state = MarketState.Active;

        // yesPool and noPool remain 0 until provideLiquidity() is called
    }

    // ── NEW: User-provided liquidity ──────────────────────────────

    /**
     * @dev Provide initial liquidity. Can only be called once.
     * @param amount Total USDT to split 50/50 into YES/NO pools (min 20 USDT)
     */
    function provideLiquidity(uint256 amount) external {
        require(state == MarketState.Active, "Market not active");
        require(yesPool == 0 && noPool == 0, "Liquidity already provided");
        require(amount >= 20e6, "Minimum 20 USDT");
        require(amount % 2 == 0, "Amount must be even");

        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        yesPool = amount / 2;
        noPool = amount / 2;
        liquidityProvider = msg.sender;

        emit LiquidityProvided(msg.sender, amount);
    }

    /**
     * @dev LP withdraws remaining pool after resolution or cancellation.
     * Gets back the losing side pool (winning side was paid to traders).
     */
    function withdrawLiquidity() external {
        require(msg.sender == liquidityProvider, "Not liquidity provider");
        require(state == MarketState.Resolved || state == MarketState.Cancelled, "Market not settled");
        require(!liquidityWithdrawn, "Already withdrawn");

        liquidityWithdrawn = true;

        uint256 withdrawAmount = state == MarketState.Cancelled
            ? yesPool + noPool
            : (outcome ? noPool : yesPool);

        require(withdrawAmount > 0, "Nothing to withdraw");
        require(token.transfer(liquidityProvider, withdrawAmount), "Transfer failed");

        emit LiquidityWithdrawn(liquidityProvider, withdrawAmount);
    }

    // ─────────────────────────────────────────────────────────────

    function calculateShares(bool isYes, uint256 tokenAmount) public view returns (uint256) {
        require(tokenAmount > 0, "Amount must be > 0");

        uint256 pool = isYes ? yesPool : noPool;
        uint256 otherPool = isYes ? noPool : yesPool;

        uint256 k = pool * otherPool;
        uint256 newOtherPool = otherPool + tokenAmount;
        uint256 newPool = k / newOtherPool;

        return pool - newPool;
    }

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
     * CHANGE: Added require(yesPool > 0 && noPool > 0) check.
     * Everything else is identical to V1.
     */
    function buyShares(bool isYes, uint256 tokenAmount) external onlyActive {
        require(tokenAmount > 0, "Amount must be > 0");
        require(yesPool > 0 && noPool > 0, "No liquidity yet"); // NEW

        uint256 fee = (tokenAmount * FEE_BASIS_POINTS) / BASIS_POINTS;
        uint256 amountAfterFee = tokenAmount - fee;

        uint256 shares = calculateShares(isYes, amountAfterFee);
        require(shares > 0, "No shares received");

        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Transfer failed");

        if (fee > 0) {
            require(token.transfer(factory, fee), "Fee transfer failed");
        }

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

    function sellShares(bool isYes, uint256 shareAmount) external onlyActive {
        require(shareAmount > 0, "Shares must be > 0");

        uint256 userShares = isYes ? yesShares[msg.sender] : noShares[msg.sender];
        require(userShares >= shareAmount, "Insufficient shares");

        uint256 tokensBeforeFee = calculateTokensForShares(isYes, shareAmount);
        require(tokensBeforeFee > 0, "No tokens received");

        uint256 fee = (tokensBeforeFee * FEE_BASIS_POINTS) / BASIS_POINTS;
        uint256 tokensAfterFee = tokensBeforeFee - fee;

        if (isYes) {
            yesPool += shareAmount;
            noPool -= tokensBeforeFee;
            yesShares[msg.sender] -= shareAmount;
        } else {
            noPool += shareAmount;
            yesPool -= tokensBeforeFee;
            noShares[msg.sender] -= shareAmount;
        }

        if (fee > 0) {
            require(token.transfer(factory, fee), "Fee transfer failed");
        }

        require(token.transfer(msg.sender, tokensAfterFee), "Transfer failed");

        emit SharesSold(msg.sender, isYes, shareAmount, tokensAfterFee, fee);
    }

    function resolve(bool _outcome) external onlyFactory {
        require(state == MarketState.Active, "Market not active");
        require(block.timestamp >= endTime, "Market not ended yet");

        state = MarketState.Resolved;
        outcome = _outcome;

        emit MarketResolved(_outcome);
    }

    function cancel() external onlyFactory {
        require(state == MarketState.Active, "Market not active");

        state = MarketState.Cancelled;

        emit MarketCancelled();
    }

    function claimWinnings() external onlyResolved {
        uint256 winningShares = outcome ? yesShares[msg.sender] : noShares[msg.sender];
        require(winningShares > 0, "No winnings to claim");

        uint256 payout = winningShares;

        if (outcome) {
            yesShares[msg.sender] = 0;
        } else {
            noShares[msg.sender] = 0;
        }

        require(token.transfer(msg.sender, payout), "Transfer failed");

        emit WinningsClaimed(msg.sender, payout);
    }

    function claimRefund() external onlyCancelled {
        uint256 userYesShares = yesShares[msg.sender];
        uint256 userNoShares = noShares[msg.sender];

        require(userYesShares > 0 || userNoShares > 0, "No shares to refund");

        uint256 totalRefund = userYesShares + userNoShares;

        yesShares[msg.sender] = 0;
        noShares[msg.sender] = 0;

        require(token.transfer(msg.sender, totalRefund), "Transfer failed");

        emit RefundClaimed(msg.sender, userYesShares, userNoShares);
    }

    function getYesPrice() external view returns (uint256) {
        uint256 total = yesPool + noPool;
        if (total == 0) return 5000;
        return (noPool * BASIS_POINTS) / total;
    }

    function getNoPrice() external view returns (uint256) {
        uint256 total = yesPool + noPool;
        if (total == 0) return 5000;
        return (yesPool * BASIS_POINTS) / total;
    }

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

        return (question, endTime, state, outcome, yesPool, noPool, yesPrice, noPrice);
    }

    function getUserShares(address user) external view returns (uint256 yes, uint256 no) {
        return (yesShares[user], noShares[user]);
    }

    // NEW: Check LP withdrawal info
    function getLiquidityInfo() external view returns (
        address provider,
        bool withdrawn,
        uint256 withdrawableAmount
    ) {
        uint256 withdrawable = 0;
        if (!liquidityWithdrawn && (state == MarketState.Resolved || state == MarketState.Cancelled)) {
            withdrawable = state == MarketState.Cancelled
                ? yesPool + noPool
                : (outcome ? noPool : yesPool);
        }
        return (liquidityProvider, liquidityWithdrawn, withdrawable);
    }
}
