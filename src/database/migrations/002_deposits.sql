-- 002_deposits.sql — Tron TRC20 deposits: per-user addresses + credit ledger.

ALTER TABLE users ADD COLUMN IF NOT EXISTS tron_deposit_address VARCHAR(34) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tron_derivation_index INTEGER UNIQUE;

-- Sequence drives atomic assignment of the next HD derivation index.
CREATE SEQUENCE IF NOT EXISTS tron_derivation_seq START WITH 0 MINVALUE 0;

CREATE TABLE IF NOT EXISTS deposits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  tron_tx_hash  VARCHAR(64) UNIQUE NOT NULL,
  amount        NUMERIC(20,6) NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  credited_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
