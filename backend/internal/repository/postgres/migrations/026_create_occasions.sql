-- +migrate Up
-- مناسبت‌ها (محرم، اربعین، نوروز، یلدا و…): چند روز قبل از هر مناسبت، اپ یک
-- یادآور محلی نشان می‌دهد و دسته‌ی والپیپرهایش را بالای گالری می‌آورد.
-- تاریخ (به‌خصوص قمری‌ها) هر سال دستی وارد می‌شود.
CREATE TABLE IF NOT EXISTS occasions (
    id           VARCHAR(64) PRIMARY KEY,
    title        TEXT        NOT NULL,
    date         DATE        NOT NULL,
    category_id  VARCHAR(50) NOT NULL DEFAULT '', -- دسته‌ی والپیپرهای مناسبت (اختیاری)
    notify_title TEXT        NOT NULL DEFAULT '',
    notify_body  TEXT        NOT NULL DEFAULT '',
    days_before  INT         NOT NULL DEFAULT 3,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_occasions_date ON occasions(date);

-- +migrate Down
DROP TABLE IF EXISTS occasions;
