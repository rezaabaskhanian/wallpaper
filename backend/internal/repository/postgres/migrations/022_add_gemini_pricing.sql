-- +migrate Up
-- نرخ رسمی گوگل برای هر ۱ میلیون توکن ورودی/خروجی gemini-2.5-flash-image و نرخ
-- تبدیل دلار به تومان — برای محاسبه‌ی هزینه‌ی واقعی هر تولید (ببینید
-- ai_generation_logs و aigenerateservice.GenerateImage). چون هر دو نوسان
-- دارند، از پنل ادمین قابل ویرایش‌اند، نه هاردکد.
ALTER TABLE ai_settings
    ADD COLUMN IF NOT EXISTS gemini_input_price_usd_per_mtok  NUMERIC(10,4) NOT NULL DEFAULT 0.3,
    ADD COLUMN IF NOT EXISTS gemini_output_price_usd_per_mtok NUMERIC(10,4) NOT NULL DEFAULT 30,
    ADD COLUMN IF NOT EXISTS usd_to_toman_rate                NUMERIC(14,2) NOT NULL DEFAULT 0;

-- +migrate Down
ALTER TABLE ai_settings
    DROP COLUMN IF EXISTS gemini_input_price_usd_per_mtok,
    DROP COLUMN IF EXISTS gemini_output_price_usd_per_mtok,
    DROP COLUMN IF EXISTS usd_to_toman_rate;
