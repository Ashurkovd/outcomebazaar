import type { OutcomeIndex } from './Order';

export interface Position {
  userId: string;
  marketId: string;
  outcomeIndex: OutcomeIndex;
  shares: number;
  lockedShares: number;
  avgPrice: number | null;
}
