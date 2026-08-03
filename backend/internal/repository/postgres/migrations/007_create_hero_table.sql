-- +migrate Up
-- تک‌ردیفه: تنظیمات رهبر/شخصیت مرکزی (نام، شعار، عکس). قبلاً در src/holographic/data.ts
-- (ثابت HERO) باندل می‌شد؛ عکس رهبر هم از src/holographic/assets/leader.png به
-- backend/storage/uploads/ کپی شده است.
CREATE TABLE IF NOT EXISTS hero_config (
    id         BOOLEAN PRIMARY KEY DEFAULT true,
    title      VARCHAR(200) NOT NULL DEFAULT '',
    slogan     VARCHAR(300) NOT NULL DEFAULT '',
    image      TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT hero_config_single_row CHECK (id)
);

INSERT INTO hero_config (id, title, slogan, image) VALUES
    (true, '', '', 'http://localhost:8090/uploads/leader.png')
ON CONFLICT (id) DO NOTHING;

-- +migrate Down
DROP TABLE IF EXISTS hero_config;
