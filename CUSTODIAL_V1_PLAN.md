# OutcomeBazaar — Custodial v1 Implementation Plan

## Goal
Rebuild OutcomeBazaar as a **custodial, off-chain prediction market** that works globally. Drop MetaMask, Polygon, and EIP-712 signatures. Users log in with email + OTP, deposit USDT on Tron, and trade against DB balances. No blockchain in the hot path.

## Architecture decisions (locked in)
- **Login:** email + 6-digit OTP → JWT. Provider: Resend.
- **Deposit chain:** USDT-TRC20 (Tron) only. One hot wallet; per-user deposit tracked by unique address OR shared address + memo.
- **Settlement:** Postgres transactions. No smart contracts in v1.
- **Geo-block:** Cloudflare `CF-IPCountry` header → Express middleware. Block US, UK, FR, SG, AE, Ontario.
- **Repos:**
  - Backend: `~/outcomebazaar-orderbook` (this repo, deploys from `orderbook-backend` branch to Railway)
  - Frontend: `~/Desktop/outcomebazaar-app` (deploys from `main` to Vercel)

## Phased plan

Each phase is independently shippable. Do them in order — each phase leaves the system working.

---

### Phase 1 — Auth foundation (backend only, additive)
**Doesn't break any existing flow.** Adds user accounts on top of the current wallet-based orders.

1. Add migration file `src/database/migrations/001_users.sql`:
   ```sql
   CREATE TABLE users (
     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email         VARCHAR(255) UNIQUE NOT NULL,
     usdt_balance  NUMERIC(20,6) NOT NULL DEFAULT 0,
     usdt_locked   NUMERIC(20,6) NOT NULL DEFAULT 0,
     country_code  VARCHAR(2),
     created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     CHECK (usdt_balance >= 0 AND usdt_locked >= 0 AND usdt_locked <= usdt_balance)
   );

   CREATE TABLE otp_codes (
     email       VARCHAR(255) NOT NULL,
     code_hash   TEXT         NOT NULL,
     expires_at  TIMESTAMPTZ  NOT NULL,
     attempts    SMALLINT     NOT NULL DEFAULT 0,
     PRIMARY KEY (email, expires_at)
   );
   CREATE INDEX idx_otp_email ON otp_codes(email);
   ```

2. Update `src/database/migrate.ts` to apply migrations in order.
3. Add `src/api/authRoutes.ts`:
   - `POST /api/auth/request-otp` — body `{ email }` → generate 6-digit code, bcrypt-hash, store with 10min expiry, send via Resend. Rate-limit to 1/minute/email.
   - `POST /api/auth/verify-otp` — body `{ email, code }` → check hash + expiry + attempts < 5. On success: upsert user, return JWT (7-day expiry).
4. Add `src/middleware/auth.ts`:
   - `requireAuth` — reads `Authorization: Bearer <jwt>`, verifies, attaches `req.user = { id, email }`.
5. Add `src/services/EmailService.ts` — wraps Resend SDK.
6. Add env vars to Railway: `JWT_SECRET`, `RESEND_API_KEY`, `OTP_FROM_EMAIL`.
7. Wire routes in `src/index.ts`.

**Acceptance:** can `POST /api/auth/request-otp` → receive email → `POST /api/auth/verify-otp` → get JWT → call a protected test endpoint (`GET /api/me`) that returns `{ id, email, usdt_balance }`.

---

### Phase 2 — Tron deposits (additive)
Users can fund their balance by sending USDT on Tron.

1. Pick deposit address strategy:
   - **Option A (simplest):** one shared hot wallet; users include a memo/tag (NOT supported natively on Tron — skip).
   - **Option B (recommended):** generate a fresh TRC20 address per user from an HD seed. Store derivation index on user row.
   - Add column: `ALTER TABLE users ADD COLUMN tron_deposit_address VARCHAR(34) UNIQUE;`
2. Add migration `002_deposits.sql`:
   ```sql
   CREATE TABLE deposits (
     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id       UUID NOT NULL REFERENCES users(id),
     tron_tx_hash  VARCHAR(64) UNIQUE NOT NULL,
     amount        NUMERIC(20,6) NOT NULL,
     status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
     credited_at   TIMESTAMPTZ,
     created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   CREATE INDEX idx_deposits_user ON deposits(user_id);
   ```
3. Add `src/services/TronWatcher.ts`:
   - Poll TronGrid API (`https://api.trongrid.io/v1/accounts/{addr}/transactions/trc20`) every 30s per user address, OR use the hot wallet's aggregate endpoint if using one address.
   - Filter for USDT contract `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` (mainnet).
   - On new confirmed tx: insert into `deposits`, update `users.usdt_balance` in one transaction, mark `CREDITED`.
   - Use `tron_tx_hash UNIQUE` to prevent double-credit on retry.
4. Add endpoint `GET /api/me/deposit-address` — returns user's Tron address (generate lazily on first request).
5. Run the watcher as a separate process (or use `setInterval` inside the main server for v1).

**Acceptance:** send test USDT on Tron → see balance increase in `GET /api/me` within a minute.

---

### Phase 3 — Migrate orders to user_id (breaking change, do both repos in same batch)
This phase changes `orders.maker` (wallet address) → `orders.user_id`. Coordinate with frontend.

1. Migration `003_orders_userid.sql`:
   ```sql
   ALTER TABLE orders ADD COLUMN user_id UUID REFERENCES users(id);
   -- For existing orders, leave user_id NULL (or delete test data first)
   ALTER TABLE orders ALTER COLUMN maker DROP NOT NULL;
   ALTER TABLE orders DROP COLUMN signature;
   CREATE INDEX idx_orders_user ON orders(user_id);
   ```
2. Update [src/api/orderRoutes.ts](src/api/orderRoutes.ts):
   - Apply `requireAuth` middleware.
   - `POST /api/orders` reads `user_id` from JWT, not body.
   - `GET /api/orders` filters by `user_id` from JWT, not `maker` query param.
3. Update [src/database/DatabaseService.ts](src/database/DatabaseService.ts) — swap all `maker` references to `user_id`.
4. **Balance locking** — in `POST /api/orders`, inside the same transaction:
   - For BUY: require `usdt_balance - usdt_locked >= price * size / 100`; `UPDATE users SET usdt_locked = usdt_locked + cost`.
   - For SELL: require positions.shares >= size; lock the shares (add `locked_shares` column on `positions`).
5. Frontend (`~/Desktop/outcomebazaar-app`):
   - Remove MetaMask / wagmi / EIP-712 code.
   - Add login screen (email → OTP → JWT stored in `localStorage`).
   - Send `Authorization: Bearer` header in `src/services/api.js`.
   - Delete wallet-connect UI.

**Acceptance:** logged-in user places order → balance locks → order appears in their order list → cancel releases the lock.

---

### Phase 4 — Positions + matching + resolution
Replace the CTF ERC1155 token concept with DB positions.

1. Migration `004_positions.sql`:
   ```sql
   CREATE TABLE positions (
     user_id       UUID NOT NULL REFERENCES users(id),
     market_id     VARCHAR(66) NOT NULL REFERENCES markets(id),
     outcome_index SMALLINT NOT NULL,
     shares        NUMERIC(20,6) NOT NULL DEFAULT 0,
     locked_shares NUMERIC(20,6) NOT NULL DEFAULT 0,
     avg_price     NUMERIC(5,2),
     PRIMARY KEY (user_id, market_id, outcome_index),
     CHECK (shares >= 0 AND locked_shares >= 0 AND locked_shares <= shares)
   );
   ```
2. Update [src/matching/OrderBook.ts](src/matching/OrderBook.ts) — on every fill, in one DB transaction:
   - Debit buyer: `usdt_balance -= price*size/100`, `usdt_locked -= price*size/100`.
   - Credit seller: `usdt_balance += price*size/100`, decrement `positions.shares` and `locked_shares`.
   - Upsert buyer's position (`shares += size`, update weighted `avg_price`).
   - Insert `trades` row with `status='SETTLED'`, `tx_hash=NULL`.
3. Make `trades.tx_hash` nullable, default status `'SETTLED'`.
4. Add `POST /api/admin/markets/:id/resolve` (admin-auth only — simple shared secret for v1):
   - Marks market `RESOLVED`, sets `outcome`.
   - For each position on winning side: `UPDATE users SET usdt_balance += shares * 1.00`.
   - For losing side: positions zero out naturally (no payout).
   - Cancel all open orders on the market; release all locks.
5. Delete / archive [src/services/CTFService.ts](src/services/CTFService.ts) and [src/contracts/addresses.ts](src/contracts/addresses.ts).

**Acceptance:** two users trade with each other → positions update → admin resolves market → winner's USDT balance increases by `shares * $1`.

---

### Phase 5 — Withdrawals
Let users pull USDT back out to their own Tron address.

1. Migration `005_withdrawals.sql`:
   ```sql
   CREATE TABLE withdrawals (
     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id       UUID NOT NULL REFERENCES users(id),
     to_address    VARCHAR(34) NOT NULL,
     amount        NUMERIC(20,6) NOT NULL,
     fee           NUMERIC(20,6) NOT NULL DEFAULT 1,  -- flat 1 USDT fee (covers Tron energy)
     tron_tx_hash  VARCHAR(64),
     status        VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
     requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     sent_at       TIMESTAMPTZ
   );
   ```
2. `POST /api/withdrawals` — body `{ to_address, amount }`:
   - Require auth; validate `amount + fee <= usdt_balance - usdt_locked`.
   - Debit balance immediately; insert row with status `REQUESTED`.
3. **v1 approach: manual approval.** Add a `GET /api/admin/withdrawals?status=REQUESTED` + `POST /api/admin/withdrawals/:id/approve` admin endpoint. Admin runs a script to broadcast the Tron tx, pastes the hash in, and the endpoint marks it `SENT`.
4. (Later) automate with a signer service holding the hot wallet key.

**Acceptance:** user requests withdrawal → balance drops → admin approves → Tron tx lands in user's wallet.

---

### Phase 6 — Geo-block + production hardening
1. Put **Cloudflare** in front of Railway (add CNAME, enable proxy).
2. Add `src/middleware/geoBlock.ts`:
   - Read `req.header('cf-ipcountry')`.
   - If in `['US', 'GB', 'FR', 'SG', 'AE', 'CA-ON']` → return 451 with a message.
   - Apply globally in `src/index.ts` before all routes.
3. Store `country_code` on user at signup (from header).
4. Frontend: add ToS checkbox at signup: "I confirm I am not a resident of [list]."
5. Rate-limit auth endpoints with `express-rate-limit` (5 OTP requests per 15min per IP).
6. Add basic admin dashboard page (or just a CLI script) for: listing users, viewing balances, approving withdrawals, resolving markets.

**Acceptance:** requests from US IPs get 451; non-blocked users can complete the full flow end-to-end on production.

---

## Out of scope for v1 (do later)
- KYC (add when per-user lifetime deposits exceed a threshold you pick)
- UPI / fiat on-ramp (integrate Onramp.money or Transak once you have users)
- Multi-chain deposits (BSC, Ethereum) — one chain keeps support load low
- Putting positions back on-chain via CTF — the existing code is there if/when you want it
- Chainalysis/TRM sanctions screening — needed only at scale or for banking partners

## Rough time estimate
- Phase 1: 1 day
- Phase 2: 1–2 days (TronWatcher is the hard part)
- Phase 3: 1–2 days (frontend rewrite is the bulk)
- Phase 4: 1 day
- Phase 5: 0.5 day (manual) + 1 day (automated)
- Phase 6: 0.5 day

**Total: ~1 week of focused work for a shippable v1.**

## Next-session kickoff prompt
Paste this at the start of your next session:

> Continue the CUSTODIAL_V1_PLAN.md implementation. Start with Phase 1: the users + otp_codes migration, email OTP routes, and JWT auth middleware. This is the backend repo (`~/outcomebazaar-orderbook`). Use Resend for email.
