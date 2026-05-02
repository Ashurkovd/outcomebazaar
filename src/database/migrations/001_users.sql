-- 001_users.sql — Auth foundation: user accounts + email OTP codes.

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  usdt_balance  NUMERIC(20,6) NOT NULL DEFAULT 0,
  usdt_locked   NUMERIC(20,6) NOT NULL DEFAULT 0,
  country_code  VARCHAR(2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (usdt_balance >= 0 AND usdt_locked >= 0 AND usdt_locked <= usdt_balance)
);

CREATE TABLE IF NOT EXISTS otp_codes (
  email       VARCHAR(255) NOT NULL,
  code_hash   TEXT         NOT NULL,
  expires_at  TIMESTAMPTZ  NOT NULL,
  attempts    SMALLINT     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (email, expires_at)
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);
