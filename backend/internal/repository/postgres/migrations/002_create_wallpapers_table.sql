-- +migrate Up
CREATE TABLE IF NOT EXISTS wallpapers (
    id         VARCHAR(64) PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    category   VARCHAR(50) NOT NULL,
    premium    BOOLEAN NOT NULL DEFAULT false,
    thumb      TEXT NOT NULL,
    full_url   TEXT NOT NULL,
    width      INT NOT NULL DEFAULT 0,
    height     INT NOT NULL DEFAULT 0,
    bytes      BIGINT NOT NULL DEFAULT 0,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallpapers_active_category ON wallpapers (is_active, category);

-- +migrate Down
DROP TABLE IF EXISTS wallpapers;
