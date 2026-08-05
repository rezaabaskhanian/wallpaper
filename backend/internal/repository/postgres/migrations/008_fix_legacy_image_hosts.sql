-- +migrate Up
-- عکس‌های شهدا/رهبر قبلاً به‌صورت seed با آدرس محلی dev (localhost:8090) درج شده بودند.
-- حالا که این فایل‌ها روی Object Storage آروان آپلود شده‌اند (hero/leader.png و
-- martyrs/shahid-XX.webp)، آدرس‌های قدیمی را به آدرس عمومی جدید اصلاح می‌کنیم.
UPDATE hero_config
SET image = 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir/hero/leader.png'
WHERE image = 'http://localhost:8090/uploads/leader.png';

UPDATE martyrs
SET photo = 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir/martyrs/' || split_part(photo, '/', 6)
WHERE photo LIKE 'http://localhost:8090/uploads/martyrs/%';

-- +migrate Down
UPDATE hero_config
SET image = 'http://localhost:8090/uploads/leader.png'
WHERE image = 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir/hero/leader.png';

UPDATE martyrs
SET photo = 'http://localhost:8090/uploads/martyrs/' || split_part(photo, '/', 6)
WHERE photo LIKE 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir/martyrs/%';
