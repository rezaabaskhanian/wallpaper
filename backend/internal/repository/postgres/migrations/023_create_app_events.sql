-- +migrate Up
-- رویدادهای آنالیتیکس اپ (append-only): «باز شدن اپ» و «تنظیم موفق والپیپر».
-- از روی همین جدول آمار روزانه و ماندگاری (D1/D7) به تفکیک نسخه‌ی اپ در پنل
-- ادمین حساب می‌شود — ببینید analyticsservice.
-- created_at عمداً TIMESTAMPTZ است تا روزبندی به وقت تهران مستقل از تایم‌زون سرور باشد.
CREATE TABLE IF NOT EXISTS app_events (
    id           BIGSERIAL PRIMARY KEY,
    device_id    TEXT NOT NULL,
    event        TEXT NOT NULL,
    app_version  TEXT NOT NULL DEFAULT '',
    method       TEXT,
    source       TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON app_events (created_at);
CREATE INDEX IF NOT EXISTS idx_app_events_device_created ON app_events (device_id, created_at);

-- +migrate Down
DROP TABLE IF EXISTS app_events;
