-- +migrate Up
-- تک‌ردیفه: نسخه‌ی کاتالوگ برای کش سمت کلاینت (با هر تغییر یک واحد زیاد می‌شود).
CREATE TABLE IF NOT EXISTS catalog_meta (
    id      BOOLEAN PRIMARY KEY DEFAULT true,
    version INT NOT NULL DEFAULT 1,
    CONSTRAINT catalog_meta_single_row CHECK (id)
);

INSERT INTO catalog_meta (id, version) VALUES (true, 1)
ON CONFLICT (id) DO NOTHING;

-- +migrate Down
DROP TABLE IF EXISTS catalog_meta;
