-- +migrate Up
CREATE TABLE IF NOT EXISTS orbit_categories (
    id            VARCHAR(50) PRIMARY KEY,
    title         VARCHAR(120) NOT NULL,
    sort_order    INT NOT NULL DEFAULT 0,
    center_image  TEXT NOT NULL DEFAULT '',
    center_title  VARCHAR(120) NOT NULL DEFAULT '',
    center_slogan VARCHAR(255) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS orbit_items (
    id          VARCHAR(64) PRIMARY KEY,
    category_id VARCHAR(50) NOT NULL REFERENCES orbit_categories(id) ON DELETE CASCADE,
    label       VARCHAR(120) NOT NULL,
    image       TEXT NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_orbit_items_category ON orbit_items(category_id);

-- دسته‌ی پیش‌فرض «شهدا» را می‌سازیم و آواتارهای فعلی صفحه‌ی اصلی را از جدول
-- martyrs کپی می‌کنیم تا بعد از این مهاجرت، محتوای اپ همانی بماند که بود.
INSERT INTO orbit_categories (id, title, sort_order)
VALUES ('shohada', 'شهدا', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO orbit_items (id, category_id, label, image, sort_order, is_active)
SELECT id, 'shohada', name, photo, sort_order, is_active
FROM martyrs
WHERE photo <> ''
ON CONFLICT (id) DO NOTHING;

-- +migrate Down
DROP TABLE IF EXISTS orbit_items;
DROP TABLE IF EXISTS orbit_categories;
