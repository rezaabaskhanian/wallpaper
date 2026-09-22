-- +migrate Up
-- پراکسی خروجی دیگر فقط vless نیست (vmess/trojan/shadowsocks/JSON خام هم
-- پشتیبانی می‌شوند — ببینید aiproxyservice.parseProxyLink)، پس اسم ستون را
-- عمومی می‌کنیم.
ALTER TABLE ai_settings RENAME COLUMN vless_link TO proxy_link;

-- +migrate Down
ALTER TABLE ai_settings RENAME COLUMN proxy_link TO vless_link;
