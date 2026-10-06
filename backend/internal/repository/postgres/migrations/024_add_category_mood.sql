-- +migrate Up
-- ایموجی «مود» دسته؛ دستهٔ دارای مود در صفحهٔ اصلیِ اپ به‌صورت کارت نمایش داده می‌شود.
ALTER TABLE categories
    ADD COLUMN mood VARCHAR(16) NOT NULL DEFAULT '';

-- +migrate Down
ALTER TABLE categories DROP COLUMN IF EXISTS mood;
