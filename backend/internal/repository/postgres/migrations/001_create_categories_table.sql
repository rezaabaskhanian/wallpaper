-- +migrate Up
CREATE TABLE IF NOT EXISTS categories (
    id         VARCHAR(50) PRIMARY KEY,
    title      VARCHAR(120) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

-- +migrate Down
DROP TABLE IF EXISTS categories;
