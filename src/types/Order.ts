export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'OPEN' | 'FILLED' | 'CANCELLED' | 'PARTIALLY_FILLED';
export type OutcomeIndex = 0 | 1; // 0 = YES, 1 = NO

export interface Order {
  id: string;
  maker: string;           // User's wallet address
  market: string;          // Market ID (conditionId from Gnosis CTF)
  conditionId: string;     // Gnosis CTF condition ID (same as market)
  side: OrderSide;
  outcomeIndex: OutcomeIndex; // 0 = YES, 1 = NO
  price: number;           // Price in cents (1-99), e.g. 65 = 65 cents = 65% probability
  size: number;            // Amount in USDT (6 decimals, stored as float)
  filled: number;          // Amount filled so far
  status: OrderStatus;
  timestamp: number;       // Unix ms
  expiresAt: number;       // Unix ms
  signature?: string;      // EIP-712 signature (for on-chain settlement)
}

export interface Trade {
  id: string;
  marketId: string;
  buyOrderId: string;
  sellOrderId: string;
  price: number;           // Execution price in cents
  size: number;            // USDT amount traded
  timestamp: number;
  txHash?: string;         // Blockchain settlement tx hash
  status: 'PENDING' | 'SETTLED' | 'FAILED';
}

export type MarketStatus = 'ACTIVE' | 'RESOLVED' | 'CANCELLED';

export interface Market {
  id: string;              // Gnosis CTF condition ID (bytes32)
  question: string;
  description?: string;
  category: string;        // cricket, politics, economics, other
  creator: string;         // Admin wallet address
  resolver: string;        // Oracle address (same as creator for now)
  endTime: Date;
  resolutionTime?: Date;
  outcome?: OutcomeIndex;  // Set after resolution
  yesToken?: string;       // ERC1155 token address for YES
  noToken?: string;        // ERC1155 token address for NO
  status: MarketStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderBookSnapshot {
  bids: [number, number][];  // [price, totalSize][]  sorted high to low
  asks: [number, number][];  // [price, totalSize][]  sorted low to high
  lastTradePrice?: number;
  spread?: number;           // Best ask - best bid
}

export interface PlaceOrderRequest {
  marketId: string;
  maker: string;
  side: OrderSide;
  outcomeIndex: OutcomeIndex;
  price: number;
  size: number;
  signature?: string;
}

export interface PlaceOrderResponse {
  order: Order;
  trades: Trade[];
  message: string;
}
