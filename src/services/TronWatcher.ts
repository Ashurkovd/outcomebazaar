import { DatabaseService } from '../database/DatabaseService';

const USDT_CONTRACTS = {
  mainnet: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  shasta: 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs',
} as const;

const TRONGRID_BASES = {
  mainnet: 'https://api.trongrid.io',
  shasta: 'https://api.shasta.trongrid.io',
} as const;

type TronNetwork = keyof typeof USDT_CONTRACTS;

interface Trc20Tx {
  transaction_id: string;
  from: string;
  to: string;
  value: string;
  type: string;
  token_info?: { address: string; decimals?: number };
}

interface WatcherOpts {
  network?: TronNetwork;
  /** Poll interval in ms. Default 30s. */
  intervalMs?: number;
  /** TronGrid API key (optional — unauthenticated has lower rate limits). */
  apiKey?: string;
  /** Max transactions fetched per address per poll. */
  limit?: number;
}

/**
 * TronWatcher — polls TronGrid for incoming USDT transfers to each user's
 * deposit address and credits their balance.
 *
 * Designed for small user counts (v1). Scales linearly with address count.
 */
export class TronWatcher {
  private db: DatabaseService;
  private network: TronNetwork;
  private intervalMs: number;
  private apiKey: string | undefined;
  private limit: number;
  private timer: NodeJS.Timeout | null = null;
  private stopping = false;

  constructor(db: DatabaseService, opts: WatcherOpts = {}) {
    this.db = db;
    this.network = opts.network ?? 'mainnet';
    this.intervalMs = opts.intervalMs ?? 30_000;
    this.apiKey = opts.apiKey;
    this.limit = opts.limit ?? 50;
  }

  start(): void {
    if (this.timer) return;
    console.log(`[TronWatcher] starting (${this.network}, poll ${this.intervalMs}ms)`);
    this.stopping = false;
    const tick = async () => {
      if (this.stopping) return;
      try {
        await this.pollOnce();
      } catch (err) {
        console.error('[TronWatcher] poll error:', (err as Error).message);
      } finally {
        if (!this.stopping) {
          this.timer = setTimeout(tick, this.intervalMs);
        }
      }
    };
    this.timer = setTimeout(tick, 0);
  }

  stop(): void {
    this.stopping = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async pollOnce(): Promise<void> {
    const targets = await this.db.getAllTronDepositTargets();
    for (const { userId, address } of targets) {
      if (this.stopping) return;
      await this.pollAddress(userId, address);
    }
  }

  private async pollAddress(userId: string, address: string): Promise<void> {
    const usdtContract = USDT_CONTRACTS[this.network];
    const url = `${TRONGRID_BASES[this.network]}/v1/accounts/${address}/transactions/trc20`
      + `?only_to=true&only_confirmed=true&limit=${this.limit}&contract_address=${usdtContract}`;

    const headers: Record<string, string> = { 'accept': 'application/json' };
    if (this.apiKey) headers['TRON-PRO-API-KEY'] = this.apiKey;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`TronGrid ${res.status} ${res.statusText} for ${address}`);
    }

    const body = (await res.json()) as { data?: Trc20Tx[] };
    const txs = body.data ?? [];

    for (const tx of txs) {
      if (tx.type !== 'Transfer') continue;
      if (tx.to !== address) continue;
      if (tx.token_info?.address !== usdtContract) continue;

      const decimals = tx.token_info?.decimals ?? 6;
      const amount = Number(tx.value) / 10 ** decimals;
      if (!Number.isFinite(amount) || amount <= 0) continue;

      try {
        const credited = await this.db.creditDeposit(userId, tx.transaction_id, amount);
        if (credited) {
          console.log(`[TronWatcher] credited ${amount} USDT to ${userId} (tx ${tx.transaction_id})`);
        }
      } catch (err) {
        console.error(`[TronWatcher] credit failed for tx ${tx.transaction_id}:`, (err as Error).message);
      }
    }
  }
}
