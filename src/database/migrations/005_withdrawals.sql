-- Phase 5: USDT withdrawals back to user-owned Tron addresses.
--
-- v1 flow is manual:
--   1. User POST /api/withdrawals → balance is debited immediately, row
--      inserted as REQUESTED.
--   2. Admin sees the queue via GET /api/admin/withdrawals, broadcasts the
--      TRC-20 transfer from their hot wallet, then POSTs the tx hash to
--      /api/admin/withdrawals/:id/approve → row flips to SENT.
--   3. If the withdrawal is rejected, balance is refunded atomically and the
--      row flips to REJECTED.

CREATE TABLE IF NOT EXISTS withdrawals (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES users(id),
  to_address    VARCHAR(34)   NOT NULL,
  amount        NUMERIC(20,6) NOT NULL,
  fee           NUMERIC(20,6) NOT NULL DEFAULT 1,
  tron_tx_hash  VARCHAR(64),
  status        VARCHAR(20)   NOT NULL DEFAULT 'REQUESTED',
  reject_reason TEXT,
  requested_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  sent_at       TIMESTAMPTZ,
  CHECK (amount > 0 AND fee >= 0),
  CHECK (status IN ('REQUESTED', 'SENT', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user   ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
