-- +migrate Up
-- «تم»: یک والپیپر به‌اضافه‌ی پس‌زمینه‌ی ویجت‌های صفحه‌ی اصلی با همان طرح.
-- ظاهر ویجت از تصویر پس‌زمینه می‌آید و اپ فقط متن/عکس را رویش می‌گذارد.
CREATE TABLE IF NOT EXISTS themes (
    id              VARCHAR(64) PRIMARY KEY,
    title           TEXT        NOT NULL,
    wallpaper_url   TEXT        NOT NULL,
    widget_bg_small TEXT        NOT NULL DEFAULT '', -- ویجت ۲×۲
    widget_bg_wide  TEXT        NOT NULL DEFAULT '', -- ویجت ۴×۲
    text_color      VARCHAR(9)  NOT NULL DEFAULT '#FFFFFF',
    accent_color    VARCHAR(9)  NOT NULL DEFAULT '#F5E6B3',
    is_premium      BOOLEAN     NOT NULL DEFAULT FALSE, -- فعلاً فقط فیلد؛ پرداخت ندارد
    sort_order      INT         NOT NULL DEFAULT 0,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +migrate Down
DROP TABLE IF EXISTS themes;
