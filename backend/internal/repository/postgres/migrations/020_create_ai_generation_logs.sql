-- +migrate Up
-- تاریخچه‌ی append-only هر تولید عکس با AI: چند توکن مصرف شد و بر اساس نرخ
-- ai_settings چقدر هزینه (واقعی، نه قیمت فروش) داشت — برای نمایش در پنل ادمین.
-- جدا از ai_generation_usage که فقط سهمیه/اعتبار هر دستگاه را نگه می‌دارد.
CREATE TABLE IF NOT EXISTS ai_generation_logs (
    id             BIGSERIAL PRIMARY KEY,
    device_id      TEXT NOT NULL,
    prompt         TEXT NOT NULL,
    image_url      TEXT NOT NULL,
    prompt_tokens  INT NOT NULL DEFAULT 0,
    output_tokens  INT NOT NULL DEFAULT 0,
    total_tokens   INT NOT NULL DEFAULT 0,
    cost_usd       NUMERIC(12,6) NOT NULL DEFAULT 0,
    cost_toman     BIGINT NOT NULL DEFAULT 0,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created_at ON ai_generation_logs (created_at DESC);

-- +migrate Down
DROP TABLE IF EXISTS ai_generation_logs;
