-- Phase 4: Custodial positions + atomic settlement
--
-- Replaces the CTF ERC1155 token concept with DB-backed positions. Every fill
-- now debits/credits USDT and shares in a single Postgres transaction via
-- DatabaseService.settleTrade, so trades land as SETTLED rather than PENDING.

CREATE TABLE IF NOT EXISTS positions (
  user_id       UUID          NOT NULL REFERENCES users(id),
  market_id     VARCHAR(66)   NOT NULL REFERENCES markets(id),
  outcome_index SMALLINT      NOT NULL,
  shares        NUMERIC(20,6) NOT NULL DEFAULT 0,
  locked_shares NUMERIC(20,6) NOT NULL DEFAULT 0,
  avg_price     NUMERIC(5,2),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, market_id, outcome_index),
  CHECK (shares >= 0 AND locked_shares >= 0 AND locked_shares <= shares),
  CHECK (outcome_index IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_positions_user   ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market_id);

DROP TRIGGER IF EXISTS trigger_positions_updated_at ON positions;
CREATE TRIGGER trigger_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- New trades now settle atomically in DB — default to SETTLED, tx_hash stays nullable.
ALTER TABLE trades ALTER COLUMN status SET DEFAULT 'SETTLED';
