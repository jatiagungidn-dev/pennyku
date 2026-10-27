CREATE TYPE wallet_type AS ENUM (
    'cash', 'bank', 'e-wallet', 'other'
);

CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type wallet_type NOT NULL,
    initial_balance NUMERIC(16, 2) NOT NULL DEFAULT 0 CHECK (initial_balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);