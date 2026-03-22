// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IConditionalTokens.sol";
import "../interfaces/IERC20.sol";
import "../libraries/OrderStructs.sol";

/**
 * @title CTFExchange
 * @notice Simplified Conditional Token Framework Exchange for OutcomeBazaar
 * @dev Hybrid decentralized exchange: off-chain matching, on-chain settlement
 *
 * Inspired by Polymarket's CTF Exchange but simplified for initial launch:
 * - Supports binary outcome markets only
 * - EOA signatures only (no proxy wallets initially)
 * - Simple order matching (no complex strategies)
 * - Focus on security and correctness over optimization
 */
contract CTFExchange {
    using OrderStructs for OrderStructs.Order;

    // ============ State Variables ============

    /// @notice Conditional Tokens Framework contract
    IConditionalTokens public immutable ctf;

    /// @notice Collateral token (USDT)
    IERC20 public immutable collateral;

    /// @notice Platform admin
    address public admin;

    /// @notice Operator authorized to match orders
    address public operator;

    /// @notice Treasury for fee collection
    address public treasury;

    /// @notice Trading paused flag
    bool public paused;

    /// @notice Registered token IDs (for safety)
    mapping(uint256 => bool) public registeredTokens;

    /// @notice Order fill status
    mapping(bytes32 => uint256) public filled;

    /// @notice Cancelled orders
    mapping(bytes32 => bool) public cancelled;

    /// @notice Nonce tracking for cancellation
    mapping(address => uint256) public nonces;

    /// @notice Minimum nonce for maker (for bulk cancellation)
    mapping(address => uint256) public minNonces;

    // ============ Constants ============

    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_FEE_RATE = 500; // 5% max fee

    // EIP-712 Domain
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant ORDER_TYPEHASH = keccak256(
        "Order(uint256 salt,address maker,address signer,address taker,uint256 tokenId,uint256 makerAmount,uint256 takerAmount,uint256 expiration,uint256 nonce,uint256 feeRateBps,uint8 side,uint8 signatureType)"
    );

    // ============ Events ============

    event OrderFilled(
        bytes32 indexed orderHash,
        address indexed maker,
        address indexed taker,
        uint256 makerAssetId,
        uint256 takerAssetId,
        uint256 makerAmountFilled,
        uint256 takerAmountFilled,
        uint256 fee
    );

    event OrderCancelled(bytes32 indexed orderHash);
    event NonceIncremented(address indexed maker, uint256 newNonce);
    event TradingPaused();
    event TradingUnpaused();
    event TokenRegistered(uint256 indexed tokenId, bytes32 indexed conditionId);
    event OperatorUpdated(address indexed newOperator);
    event TreasuryUpdated(address indexed newTreasury);

    // ============ Modifiers ============

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "Only operator");
        _;
    }

    modifier notPaused() {
        require(!paused, "Trading paused");
        _;
    }

    // ============ Constructor ============

    constructor(
        address _ctf,
        address _collateral,
        address _treasury
    ) {
        require(_ctf != address(0), "Invalid CTF");
        require(_collateral != address(0), "Invalid collateral");
        require(_treasury != address(0), "Invalid treasury");

        ctf = IConditionalTokens(_ctf);
        collateral = IERC20(_collateral);
        treasury = _treasury;
        admin = msg.sender;
        operator = msg.sender;

        // EIP-712 domain separator
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("OutcomeBazaar CTF Exchange")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    // ============ Admin Functions ============

    /**
     * @notice Pause trading
     */
    function pauseTrading() external onlyAdmin {
        paused = true;
        emit TradingPaused();
    }

    /**
     * @notice Unpause trading
     */
    function unpauseTrading() external onlyAdmin {
        paused = false;
        emit TradingUnpaused();
    }

    /**
     * @notice Update operator
     */
    function setOperator(address newOperator) external onlyAdmin {
        require(newOperator != address(0), "Invalid operator");
        operator = newOperator;
        emit OperatorUpdated(newOperator);
    }

    /**
     * @notice Update treasury
     */
    function setTreasury(address newTreasury) external onlyAdmin {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /**
     * @notice Register a token ID for trading
     * @param tokenId The CTF token ID
     * @param conditionId The condition ID this token belongs to
     */
    function registerToken(uint256 tokenId, bytes32 conditionId) external onlyAdmin {
        registeredTokens[tokenId] = true;
        emit TokenRegistered(tokenId, conditionId);
    }

    /**
     * @notice Transfer admin rights
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin");
        admin = newAdmin;
    }

    // ============ Trading Functions ============

    /**
     * @notice Fill a single order
     * @param order The order to fill
     * @param signature The maker's signature
     * @param fillAmount Amount to fill
     */
    function fillOrder(
        OrderStructs.Order memory order,
        bytes memory signature,
        uint256 fillAmount
    ) external onlyOperator notPaused returns (bytes32) {
        // Validate order
        bytes32 orderHash = _validateOrder(order, signature, fillAmount);

        // Execute trade
        _executeTrade(order, orderHash, msg.sender, fillAmount);

        return orderHash;
    }

    /**
     * @notice Match two orders (maker and taker)
     * @param makerOrder The maker's order
     * @param makerSignature Maker's signature
     * @param takerOrder The taker's order (or market order)
     * @param takerSignature Taker's signature
     * @param fillAmount Amount to fill
     */
    function matchOrders(
        OrderStructs.Order memory makerOrder,
        bytes memory makerSignature,
        OrderStructs.Order memory takerOrder,
        bytes memory takerSignature,
        uint256 fillAmount
    ) external onlyOperator notPaused {
        // Validate both orders
        bytes32 makerHash = _validateOrder(makerOrder, makerSignature, fillAmount);
        bytes32 takerHash = _validateOrder(takerOrder, takerSignature, fillAmount);

        // Verify orders are compatible
        require(makerOrder.side != takerOrder.side, "Orders same side");

        // Execute matched trade
        _executeMatchedTrade(makerOrder, makerHash, takerOrder, takerHash, fillAmount);
    }

    // ============ Order Management ============

    /**
     * @notice Cancel an order
     * @param order The order to cancel
     */
    function cancelOrder(OrderStructs.Order memory order) external {
        require(msg.sender == order.maker, "Not order maker");

        bytes32 orderHash = hashOrder(order);
        require(!cancelled[orderHash], "Already cancelled");

        cancelled[orderHash] = true;
        emit OrderCancelled(orderHash);
    }

    /**
     * @notice Cancel multiple orders
     */
    function cancelOrders(OrderStructs.Order[] memory orders) external {
        for (uint256 i = 0; i < orders.length; i++) {
            require(msg.sender == orders[i].maker, "Not order maker");
            bytes32 orderHash = hashOrder(orders[i]);
            if (!cancelled[orderHash]) {
                cancelled[orderHash] = true;
                emit OrderCancelled(orderHash);
            }
        }
    }

    /**
     * @notice Increment nonce to invalidate all orders with lower nonce
     */
    function incrementNonce() external {
        nonces[msg.sender]++;
        emit NonceIncremented(msg.sender, nonces[msg.sender]);
    }

    // ============ View Functions ============

    /**
     * @notice Hash an order for EIP-712
     */
    function hashOrder(OrderStructs.Order memory order) public view returns (bytes32) {
        return keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            keccak256(abi.encode(
                ORDER_TYPEHASH,
                order.salt,
                order.maker,
                order.signer,
                order.taker,
                order.tokenId,
                order.makerAmount,
                order.takerAmount,
                order.expiration,
                order.nonce,
                order.feeRateBps,
                order.side,
                order.signatureType
            ))
        ));
    }

    /**
     * @notice Get order status
     */
    function getOrderStatus(OrderStructs.Order memory order)
        external
        view
        returns (OrderStructs.OrderStatus, uint256)
    {
        bytes32 orderHash = hashOrder(order);

        // Check if cancelled
        if (cancelled[orderHash]) {
            return (OrderStructs.OrderStatus.CANCELLED, filled[orderHash]);
        }

        // Check if expired
        if (block.timestamp >= order.expiration) {
            return (OrderStructs.OrderStatus.EXPIRED, filled[orderHash]);
        }

        // Check if fully filled
        if (filled[orderHash] >= order.makerAmount) {
            return (OrderStructs.OrderStatus.FILLED, filled[orderHash]);
        }

        // Check nonce
        if (order.nonce < minNonces[order.maker]) {
            return (OrderStructs.OrderStatus.INVALID, filled[orderHash]);
        }

        return (OrderStructs.OrderStatus.FILLABLE, filled[orderHash]);
    }

    // ============ Internal Functions ============

    /**
     * @notice Validate an order before execution
     */
    function _validateOrder(
        OrderStructs.Order memory order,
        bytes memory signature,
        uint256 fillAmount
    ) internal view returns (bytes32) {
        bytes32 orderHash = hashOrder(order);

        // Check cancellation
        require(!cancelled[orderHash], "Order cancelled");

        // Check expiration
        require(block.timestamp < order.expiration, "Order expired");

        // Check nonce
        require(order.nonce >= minNonces[order.maker], "Invalid nonce");

        // Check fill amount
        require(fillAmount > 0, "Fill amount is 0");
        require(filled[orderHash] + fillAmount <= order.makerAmount, "Exceeds order amount");

        // Check token registration
        require(registeredTokens[order.tokenId], "Token not registered");

        // Check fee rate
        require(order.feeRateBps <= MAX_FEE_RATE, "Fee too high");

        // Verify signature
        _verifySignature(orderHash, order.signer, signature);

        return orderHash;
    }

    /**
     * @notice Verify EIP-712 signature
     */
    function _verifySignature(
        bytes32 orderHash,
        address signer,
        bytes memory signature
    ) internal pure {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Invalid signature v");

        address recovered = ecrecover(orderHash, v, r, s);
        require(recovered == signer, "Invalid signature");
        require(recovered != address(0), "Invalid signer");
    }

    /**
     * @notice Execute a single trade
     */
    function _executeTrade(
        OrderStructs.Order memory order,
        bytes32 orderHash,
        address taker,
        uint256 fillAmount
    ) internal {
        // Update filled amount
        filled[orderHash] += fillAmount;

        // Calculate amounts
        uint256 takerAmount = (fillAmount * order.takerAmount) / order.makerAmount;
        uint256 fee = _calculateFee(order.makerAmount, order.feeRateBps);

        // Transfer assets based on order side
        if (order.side == OrderStructs.Side.BUY) {
            // Maker buying outcome tokens, taker selling
            // Taker sends outcome tokens to maker
            ctf.safeTransferFrom(taker, order.maker, order.tokenId, fillAmount, "");

            // Maker sends collateral to taker (minus fee)
            uint256 payment = takerAmount - fee;
            require(collateral.transferFrom(order.maker, taker, payment), "Payment failed");

            // Fee to treasury
            if (fee > 0) {
                require(collateral.transferFrom(order.maker, treasury, fee), "Fee transfer failed");
            }
        } else {
            // Maker selling outcome tokens, taker buying
            // Maker sends outcome tokens to taker
            ctf.safeTransferFrom(order.maker, taker, order.tokenId, fillAmount, "");

            // Taker sends collateral to maker (minus fee)
            uint256 payment = takerAmount - fee;
            require(collateral.transferFrom(taker, order.maker, payment), "Payment failed");

            // Fee to treasury
            if (fee > 0) {
                require(collateral.transferFrom(taker, treasury, fee), "Fee transfer failed");
            }
        }

        emit OrderFilled(
            orderHash,
            order.maker,
            taker,
            order.tokenId,
            0, // Collateral (token ID 0)
            fillAmount,
            takerAmount,
            fee
        );
    }

    /**
     * @notice Execute matched trade between maker and taker
     */
    function _executeMatchedTrade(
        OrderStructs.Order memory makerOrder,
        bytes32 makerHash,
        OrderStructs.Order memory takerOrder,
        bytes32 takerHash,
        uint256 fillAmount
    ) internal {
        // Update filled amounts
        filled[makerHash] += fillAmount;
        filled[takerHash] += fillAmount;

        // Calculate fees
        uint256 makerFee = _calculateFee(makerOrder.makerAmount, makerOrder.feeRateBps);
        uint256 takerFee = _calculateFee(takerOrder.makerAmount, takerOrder.feeRateBps);

        // Execute transfers (simplified - assumes compatible orders)
        // In production, this would handle the three matching scenarios:
        // 1. NORMAL: Direct swap
        // 2. MINT: Create new token pairs
        // 3. MERGE: Combine complementary tokens

        // For now, implement simple direct swap
        if (makerOrder.side == OrderStructs.Side.BUY) {
            // Maker buying, taker selling
            ctf.safeTransferFrom(takerOrder.maker, makerOrder.maker, makerOrder.tokenId, fillAmount, "");

            uint256 payment = (fillAmount * makerOrder.takerAmount) / makerOrder.makerAmount;
            require(collateral.transferFrom(makerOrder.maker, takerOrder.maker, payment - makerFee), "Payment failed");

            if (makerFee > 0) {
                require(collateral.transferFrom(makerOrder.maker, treasury, makerFee), "Fee failed");
            }
        } else {
            // Maker selling, taker buying
            ctf.safeTransferFrom(makerOrder.maker, takerOrder.maker, makerOrder.tokenId, fillAmount, "");

            uint256 payment = (fillAmount * makerOrder.makerAmount) / makerOrder.takerAmount;
            require(collateral.transferFrom(takerOrder.maker, makerOrder.maker, payment - takerFee), "Payment failed");

            if (takerFee > 0) {
                require(collateral.transferFrom(takerOrder.maker, treasury, takerFee), "Fee failed");
            }
        }

        emit OrderFilled(makerHash, makerOrder.maker, takerOrder.maker,
                        makerOrder.tokenId, takerOrder.tokenId, fillAmount, fillAmount, makerFee);
        emit OrderFilled(takerHash, takerOrder.maker, makerOrder.maker,
                        takerOrder.tokenId, makerOrder.tokenId, fillAmount, fillAmount, takerFee);
    }

    /**
     * @notice Calculate fee
     */
    function _calculateFee(uint256 amount, uint256 feeRateBps) internal pure returns (uint256) {
        return (amount * feeRateBps) / BASIS_POINTS;
    }

    // ============ ERC1155 Receiver ============

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
