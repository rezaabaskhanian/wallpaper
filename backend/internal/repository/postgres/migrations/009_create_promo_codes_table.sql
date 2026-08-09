-- +migrate Up
CREATE TABLE IF NOT EXISTS promo_codes (
    id         VARCHAR(64) PRIMARY KEY,
    code       VARCHAR(64) NOT NULL UNIQUE,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    used_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes (code);

-- +migrate Down
DROP TABLE IF EXISTS promo_codes;
