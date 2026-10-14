-- +migrate Up
-- جواب کوتاه ادمین به یک درخواست؛ در نوتیفیکیشن «صندوق خبر» همان دستگاه نشان
-- داده می‌شود (برای «انجام شد» و همچنین «رد» وقتی جوابی نوشته شده باشد).
ALTER TABLE wallpaper_requests ADD COLUMN IF NOT EXISTS reply TEXT NOT NULL DEFAULT '';

-- +migrate Down
ALTER TABLE wallpaper_requests DROP COLUMN IF EXISTS reply;
