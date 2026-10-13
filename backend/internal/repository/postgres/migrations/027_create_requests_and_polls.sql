-- +migrate Up
-- «درخواست و رأی»: کاربر والپیپر/دسته‌ای درخواست می‌دهد یا در رأی‌گیری فعال
-- رأی می‌دهد؛ وقتی ادمین درخواست را انجام‌شده بزند یا رأی‌گیری را با برنده
-- ببندد، همان دستگاه‌ها از «صندوق خبر» (GET /inbox) باخبر می‌شوند.
CREATE TABLE IF NOT EXISTS wallpaper_requests (
    id          VARCHAR(64) PRIMARY KEY,
    device_id   VARCHAR(64) NOT NULL,
    text        TEXT        NOT NULL,
    status      VARCHAR(16) NOT NULL DEFAULT 'pending', -- pending | done | rejected
    category_id VARCHAR(50) NOT NULL DEFAULT '',        -- دسته‌ای که برایش ساخته شد
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallpaper_requests_device ON wallpaper_requests(device_id);

CREATE TABLE IF NOT EXISTS polls (
    id               VARCHAR(64) PRIMARY KEY,
    question         TEXT        NOT NULL,
    is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
    winner_option_id VARCHAR(64) NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at        TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS poll_options (
    id          VARCHAR(64) PRIMARY KEY,
    poll_id     VARCHAR(64) NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    category_id VARCHAR(50) NOT NULL DEFAULT '',
    sort_order  INT         NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS poll_votes (
    poll_id    VARCHAR(64) NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    device_id  VARCHAR(64) NOT NULL,
    option_id  VARCHAR(64) NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (poll_id, device_id)
);

-- +migrate Down
DROP TABLE IF EXISTS poll_votes;
DROP TABLE IF EXISTS poll_options;
DROP TABLE IF EXISTS polls;
DROP TABLE IF EXISTS wallpaper_requests;
