-- +migrate Up
CREATE TABLE IF NOT EXISTS quote_categories (
    id         VARCHAR(50) PRIMARY KEY,
    title      VARCHAR(120) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO quote_categories (id, title, sort_order)
VALUES ('rahbar', 'بیانات رهبر', 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS category_id VARCHAR(50) NOT NULL DEFAULT 'rahbar';

UPDATE quotes SET category_id = 'rahbar' WHERE category_id = '';

ALTER TABLE quotes
    ADD CONSTRAINT fk_quotes_category
    FOREIGN KEY (category_id) REFERENCES quote_categories(id);

CREATE INDEX IF NOT EXISTS idx_quotes_category ON quotes(category_id);

-- +migrate Down
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS fk_quotes_category;
ALTER TABLE quotes DROP COLUMN IF EXISTS category_id;
DROP TABLE IF EXISTS quote_categories;
