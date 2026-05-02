export type WithdrawalStatus = 'REQUESTED' | 'SENT' | 'REJECTED';

export interface Withdrawal {
  id: string;
  userId: string;
  toAddress: string;
  amount: number;
  fee: number;
  tronTxHash: string | null;
  status: WithdrawalStatus;
  rejectReason: string | null;
  requestedAt: Date;
  sentAt: Date | null;
}
