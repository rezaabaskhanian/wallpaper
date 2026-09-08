-- +migrate Up
ALTER TABLE orbit_items ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

-- +migrate Down
ALTER TABLE orbit_items DROP COLUMN IF EXISTS description;
