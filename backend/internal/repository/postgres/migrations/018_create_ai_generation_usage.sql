-- +migrate Up
-- سهمیه‌ی رایگان «ساخت والپیپر با AI» را بر اساس device id ردیابی می‌کند (نه
-- AsyncStorage سمت کلاینت که با نصب دوباره‌ی اپ صفر می‌شود). هر دستگاه فقط یک
-- بار می‌تواند رایگان تولید کند — ببینید aigenerateservice.ErrFreeQuotaUsed.
-- free_used_at قابل NULL است چون این ردیف ممکن است زودتر از اولین تولید
-- رایگان، فقط برای ثبت خرید اعتبار (ببینید 019) ساخته شود.
CREATE TABLE IF NOT EXISTS ai_generation_usage (
    device_id    TEXT PRIMARY KEY,
    free_used_at TIMESTAMP NULL
);

-- +migrate Down
DROP TABLE IF EXISTS ai_generation_usage;
