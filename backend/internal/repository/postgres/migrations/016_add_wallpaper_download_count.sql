-- +migrate Up
ALTER TABLE wallpapers ADD COLUMN IF NOT EXISTS download_count INT NOT NULL DEFAULT 0;

-- +migrate Down
ALTER TABLE wallpapers DROP COLUMN IF EXISTS download_count;
