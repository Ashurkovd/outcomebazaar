-- 003_orders_userid.sql — Switch orders from wallet-address identity to
-- authenticated user_id. Drop the EIP-712 signature column (no on-chain
-- settlement in the custodial v1 flow).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE orders ALTER COLUMN maker DROP NOT NULL;
ALTER TABLE orders DROP COLUMN IF EXISTS signature;

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
