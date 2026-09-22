-- +migrate Up
-- تک‌ردیفه: کلیدهای API سه سرویس هوش‌مصنوعی (کلود/جمینای/دیپ‌سیک) برای فیچر
-- «ساخت والپیپر با توضیح متنی» — فقط جمینای (Imagen) واقعاً عکس تولید می‌کند؛
-- کلود و دیپ‌سیک صرفاً برای غنی‌سازی/ترجمه‌ی prompt پیش از تولید استفاده می‌شوند
-- (ببینید enrichment_provider). قیمت هر عکس هم اینجا تنظیم می‌شود چون نرخ دلار
-- در ایران نوسان دارد و نباید در کد هارد-کد شود.
CREATE TABLE IF NOT EXISTS ai_settings (
    id                    BOOLEAN PRIMARY KEY DEFAULT true,
    claude_api_key        TEXT NOT NULL DEFAULT '',
    gemini_api_key        TEXT NOT NULL DEFAULT '',
    deepseek_api_key      TEXT NOT NULL DEFAULT '',
    enrichment_provider   VARCHAR(20) NOT NULL DEFAULT 'none',
    price_per_image_toman INT NOT NULL DEFAULT 0,
    -- لینک vless:// پراکسی خروجی (سایدکار xray) — از پنل ادمین ست می‌شود، جدا از
    -- سه کلید بالا چون کلید نیست و در پاسخ GET هم ماسک نمی‌شود.
    vless_link            TEXT NOT NULL DEFAULT '',
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT ai_settings_single_row CHECK (id)
);

INSERT INTO ai_settings (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

-- +migrate Down
DROP TABLE IF EXISTS ai_settings;
