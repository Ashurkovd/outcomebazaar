// Contract addresses from deployment on Polygon Mainnet
export const CONTRACTS = {
  FACTORY: '0xe16fea504931A9088208fa86bB84C25708E10A45',
  USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  NETWORK: 'polygon'
};

export const NETWORK_CONFIG = {
  chainId: '0x89', // 137 in hex (Polygon Mainnet)
  chainIdDecimal: 137,
  chainName: 'Polygon Mainnet',
  rpcUrls: ['https://polygon-rpc.com'],
  blockExplorerUrls: ['https://polygonscan.com'],
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18
  }
};

export const FACTORY_ABI = [
  'function markets(uint256) view returns (address)',
  'function getMarketCount() view returns (uint256)',
  'function isMarket(address) view returns (bool)',
  'function oracle() view returns (address)',
  'function createMarket(string question, uint256 endTime, uint256 initialLiquidity) returns (address)',
  'event MarketCreated(address indexed marketAddress, string question, uint256 endTime, uint256 initialLiquidity, address creator)'
];

export const MARKET_ABI = [
  'function getMarketInfo() view returns (string _question, uint256 _endTime, uint8 _state, bool _outcome, uint256 _yesPool, uint256 _noPool, uint256 _yesPrice, uint256 _noPrice)',
  'function yesShares(address) view returns (uint256)',
  'function noShares(address) view returns (uint256)',
  'function buyShares(bool isYes, uint256 tokenAmount)',
  'function sellShares(bool isYes, uint256 shareAmount)',
  'function claimWinnings()',
  'function claimRefund()',
  'event SharesPurchased(address indexed buyer, bool indexed isYes, uint256 tokenAmount, uint256 shareAmount)',
  'event SharesSold(address indexed seller, bool indexed isYes, uint256 shareAmount, uint256 tokenAmount)'
];

export const USDT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// Market states
export const MARKET_STATE = {
  ACTIVE: 0,
  RESOLVED: 1,
  CANCELLED: 2
};

// Helper to get explorer URL
export function getExplorerUrl(address, type = 'address') {
  return `${NETWORK_CONFIG.blockExplorerUrls[0]}/${type}/${address}`;
}
