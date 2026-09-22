-- +migrate Up
-- موجودی اعتبار عکس AI هر دستگاه (بعد از اتمام سهمیه‌ی رایگان، با خریدن SKU
-- مصرفی «ai_credits» از بازار شارژ می‌شود) — ببینید aigenerateservice.RedeemCredits.
ALTER TABLE ai_generation_usage ADD COLUMN IF NOT EXISTS credits INT NOT NULL DEFAULT 0;

-- هر purchaseToken فقط یک‌بار قابل اعتبارسنجی/شارژ است — این جدول idempotency
-- را تضمین می‌کند (مثلاً اگر اپ به‌خاطر قطعی شبکه درخواست redeem را دوباره بفرستد).
CREATE TABLE IF NOT EXISTS ai_credit_purchases (
    purchase_token  TEXT PRIMARY KEY,
    device_id       TEXT NOT NULL,
    sku             TEXT NOT NULL,
    credits_granted INT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- +migrate Down
DROP TABLE IF EXISTS ai_credit_purchases;
ALTER TABLE ai_generation_usage DROP COLUMN IF EXISTS credits;
