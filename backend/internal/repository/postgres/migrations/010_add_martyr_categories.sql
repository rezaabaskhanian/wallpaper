-- +migrate Up
CREATE TABLE IF NOT EXISTS martyr_categories (
    id         VARCHAR(64) PRIMARY KEY,
    title      VARCHAR(120) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE martyrs ADD COLUMN IF NOT EXISTS category_id VARCHAR(64)
    REFERENCES martyr_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_martyrs_category ON martyrs (category_id);

INSERT INTO martyr_categories (id, title, sort_order) VALUES
    ('hastei', 'شهدای هسته‌ای', 1),
    ('jang-12-rooze', 'شهدای جنگ دوازده روزه', 2),
    ('shakhes', 'شهدای شاخص', 3),
    ('jang-ramazan', 'شهدای جنگ رمضان', 4),
    ('madrese-minab', 'شهدای مدرسه میناب', 5)
ON CONFLICT (id) DO NOTHING;

-- +migrate Down
ALTER TABLE martyrs DROP COLUMN IF EXISTS category_id;
DROP TABLE IF EXISTS martyr_categories;
