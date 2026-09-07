-- +migrate Up
-- cdn.wallpaperapp.ir حالا به‌عنوان دامنه‌ی اختصاصی روی باکت وصل شده (به‌جای
-- آدرس مستقیم Object Storage). آدرس‌های قدیمی که موقع آپلود ذخیره شده بودند
-- (قبل از این تغییر) را به دامنه‌ی جدید مهاجرت می‌دهیم؛ در غیر این صورت اپ
-- موبایل آن‌ها را رد می‌کند چون فقط wallpaperapp.ir را مجاز می‌داند (رجوع کنید
-- به isAllowedWallpaperUrl در LockWallpaperModule.kt).
UPDATE wallpapers
SET thumb    = replace(thumb, 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir', 'https://cdn.wallpaperapp.ir'),
    full_url = replace(full_url, 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir', 'https://cdn.wallpaperapp.ir')
WHERE thumb LIKE 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir/%'
   OR full_url LIKE 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir/%';

UPDATE hero_config
SET image = replace(image, 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir', 'https://cdn.wallpaperapp.ir')
WHERE image LIKE 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir/%';

UPDATE martyrs
SET photo = replace(photo, 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir', 'https://cdn.wallpaperapp.ir')
WHERE photo LIKE 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir/%';

UPDATE orbit_categories
SET center_image = replace(center_image, 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir', 'https://cdn.wallpaperapp.ir')
WHERE center_image LIKE 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir/%';

UPDATE orbit_items
SET image = replace(image, 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir', 'https://cdn.wallpaperapp.ir')
WHERE image LIKE 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir/%';

-- +migrate Down
UPDATE wallpapers
SET thumb    = replace(thumb, 'https://cdn.wallpaperapp.ir', 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir'),
    full_url = replace(full_url, 'https://cdn.wallpaperapp.ir', 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir')
WHERE thumb LIKE 'https://cdn.wallpaperapp.ir/%'
   OR full_url LIKE 'https://cdn.wallpaperapp.ir/%';

UPDATE hero_config
SET image = replace(image, 'https://cdn.wallpaperapp.ir', 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir')
WHERE image LIKE 'https://cdn.wallpaperapp.ir/%';

UPDATE martyrs
SET photo = replace(photo, 'https://cdn.wallpaperapp.ir', 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir')
WHERE photo LIKE 'https://cdn.wallpaperapp.ir/%';

UPDATE orbit_categories
SET center_image = replace(center_image, 'https://cdn.wallpaperapp.ir', 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir')
WHERE center_image LIKE 'https://cdn.wallpaperapp.ir/%';

UPDATE orbit_items
SET image = replace(image, 'https://cdn.wallpaperapp.ir', 'https://wallpaper-app.s3.ir-thr-at1.arvanstorage.ir')
WHERE image LIKE 'https://cdn.wallpaperapp.ir/%';
