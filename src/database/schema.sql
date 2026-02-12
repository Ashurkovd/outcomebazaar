-- OutcomeBazaar Order Book Database Schema
-- Run: psql $DATABASE_URL -f src/database/schema.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- MARKETS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS markets (
  id              VARCHAR(66)  PRIMARY KEY,  -- Gnosis CTF conditionId (bytes32 hex)
  question_id     VARCHAR(66)  NOT NULL,     -- Original questionId used in prepareCondition
  question        TEXT         NOT NULL,
  description     TEXT,
  category        VARCHAR(50)  NOT NULL DEFAULT 'other',  -- cricket, politics, economics, other
  creator         VARCHAR(42)  NOT NULL,     -- Admin wallet address
  resolver        VARCHAR(42)  NOT NULL,     -- Oracle address (same as creator for now)
  end_time        TIMESTAMPTZ  NOT NULL,
  resolution_time TIMESTAMPTZ,
  outcome         SMALLINT,                  -- 0 = YES won, 1 = NO won, NULL = unresolved
  yes_position_id TEXT,                      -- ERC1155 token ID for YES positions
  no_position_id  TEXT,                      -- ERC1155 token ID for NO positions
  resolve_tx_hash VARCHAR(66),               -- Tx hash of resolution
  status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, RESOLVED, CANCELLED
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_markets_status    ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_category  ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_end_time  ON markets(end_time);

-- ─────────────────────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orders (
  id              VARCHAR(100) PRIMARY KEY,
  market_id       VARCHAR(66)  NOT NULL REFERENCES markets(id),
  maker           VARCHAR(42)  NOT NULL,     -- User's wallet address
  side            VARCHAR(4)   NOT NULL,     -- BUY or SELL
  outcome_index   SMALLINT     NOT NULL,     -- 0 = YES, 1 = NO
  price           NUMERIC(5,2) NOT NULL,     -- cents: 1.00 to 99.00
  size            NUMERIC(20,6) NOT NULL,    -- USDT amount (6 decimals)
  filled          NUMERIC(20,6) NOT NULL DEFAULT 0,
  status          VARCHAR(20)  NOT NULL DEFAULT 'OPEN',  -- OPEN, PARTIALLY_FILLED, FILLED, CANCELLED
  expires_at      TIMESTAMPTZ,
  signature       TEXT,                      -- EIP-712 signature for on-chain settlement
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_price       CHECK (price > 0 AND price < 100),
  CONSTRAINT chk_size        CHECK (size > 0),
  CONSTRAINT chk_side        CHECK (side IN ('BUY', 'SELL')),
  CONSTRAINT chk_outcome     CHECK (outcome_index IN (0, 1)),
  CONSTRAINT chk_filled      CHECK (filled >= 0 AND filled <= size)
);

CREATE INDEX IF NOT EXISTS idx_orders_market     ON orders(market_id);
CREATE INDEX IF NOT EXISTS idx_orders_maker      ON orders(maker);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_book       ON orders(market_id, outcome_index, side, price)
  WHERE status IN ('OPEN', 'PARTIALLY_FILLED');

-- ─────────────────────────────────────────────────────────────────────────────
-- TRADES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trades (
  id              VARCHAR(100) PRIMARY KEY,
  market_id       VARCHAR(66)  NOT NULL REFERENCES markets(id),
  buy_order_id    VARCHAR(100) NOT NULL REFERENCES orders(id),
  sell_order_id   VARCHAR(100) NOT NULL REFERENCES orders(id),
  outcome_index   SMALLINT     NOT NULL,     -- Which outcome token was traded
  price           NUMERIC(5,2) NOT NULL,     -- Execution price in cents
  size            NUMERIC(20,6) NOT NULL,    -- USDT amount traded
  tx_hash         VARCHAR(66),               -- On-chain settlement tx
  status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',  -- PENDING, SETTLED, FAILED
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_market     ON trades(market_id);
CREATE INDEX IF NOT EXISTS idx_trades_status     ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_buy_order  ON trades(buy_order_id);
CREATE INDEX IF NOT EXISTS idx_trades_sell_order ON trades(sell_order_id);
CREATE INDEX IF NOT EXISTS idx_trades_time       ON trades(market_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- PRICE HISTORY (for charts)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS price_history (
  id            SERIAL        PRIMARY KEY,
  market_id     VARCHAR(66)   NOT NULL REFERENCES markets(id),
  outcome_index SMALLINT      NOT NULL,
  price         NUMERIC(5,2)  NOT NULL,
  volume        NUMERIC(20,6) NOT NULL DEFAULT 0,
  bucket_time   TIMESTAMPTZ   NOT NULL,  -- Rounded to nearest hour/day
  UNIQUE (market_id, outcome_index, bucket_time)
);

CREATE INDEX IF NOT EXISTS idx_price_history_market ON price_history(market_id, outcome_index, bucket_time DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: auto-update updated_at
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_markets_updated_at
  BEFORE UPDATE ON markets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
