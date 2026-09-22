# Xray outbound proxy

This sidecar exposes a no-auth SOCKS5 proxy on port 1080, reachable only from
other containers on the `wallpaper_net` docker network (never published to
the host) — the backend uses it via `AI_PROXY_URL=socks5://xray:1080` to reach
Claude/Gemini/DeepSeek from Iran-hosted servers.

Unlike a hand-edited config file, this one is generated dynamically:

1. Paste a `vless://...` link into the admin panel's AI Settings page
   (proxy section) and click "اتصال".
2. The backend (`internal/service/aiproxy`) parses the link, writes an Xray
   config to the shared `xray_config` docker volume, and saves the link in
   the DB (`ai_settings.vless_link`) so the form is pre-filled next time.
3. `watch.sh` (this container's entrypoint) polls that config file every 3s
   and restarts the `xray` process when it changes — no container restart
   needed on Xray's side either.
4. The backend then makes a real request through the tunnel (`ipinfo.io/json`)
   and reports whether it connected, with the exit IP/country — shown directly
   in the admin panel.

Supports `vless://` links with `reality`, `tls`, or plain `tcp`/`ws`/`xhttp`
transports (see `internal/service/aiproxy/vless.go`) — the same parser
already proven in production on a sibling project.
