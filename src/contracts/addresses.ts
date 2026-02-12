// Smart contract addresses on Polygon mainnet
export const ADDRESSES = {
  polygon: {
    // Gnosis Conditional Token Framework
    CTF: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
    // Polygon USDT (6 decimals)
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  amoy: {
    // Gnosis CTF on Amoy testnet (same address, deployed by Gnosis)
    CTF: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
    // Amoy test USDT (update if different)
    USDT: '0x360Ad92aD7F0d03Ba5D4F17e81b48Bf1FC08bB1f',
  },
} as const;

// Zero bytes32 - used as parentCollectionId for top-level positions
export const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

// Outcome partition for binary markets
// YES = index 0, indexSet = 0b01 = 1
// NO  = index 1, indexSet = 0b10 = 2
export const YES_INDEX_SET = 1;
export const NO_INDEX_SET = 2;
export const BINARY_PARTITION = [YES_INDEX_SET, NO_INDEX_SET];
