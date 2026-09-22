package aiproxyservice

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
)

// xrayConfig ساختار حداقلیِ کانفیگ Xray-core است: یک اینباند SOCKS5 محلی برای
// استفاده‌ی بک‌اند (از طریق AI_PROXY_URL) و یک آوت‌باند به سرور پراکسی.
type xrayConfig struct {
	Log       xrayLog        `json:"log"`
	Inbounds  []xrayInbound  `json:"inbounds"`
	Outbounds []xrayOutbound `json:"outbounds"`
}

type xrayLog struct {
	Loglevel string `json:"loglevel"`
}

type xrayInbound struct {
	Listen   string             `json:"listen"`
	Port     int                `json:"port"`
	Protocol string             `json:"protocol"`
	Settings xraySocksInSetting `json:"settings"`
}

type xraySocksInSetting struct {
	Auth string `json:"auth"`
	UDP  bool   `json:"udp"`
}

type xrayOutbound struct {
	Tag            string         `json:"tag"`
	Protocol       string         `json:"protocol"`
	Settings       map[string]any `json:"settings"`
	StreamSettings map[string]any `json:"streamSettings,omitempty"`
}

// baseXrayConfig اینباند SOCKS5 و آوت‌باندهای direct/block مشترک بین همه‌ی
// پروتکل‌ها را می‌سازد — هر پارسر فقط آوت‌باند "proxy" مخصوص خودش را جلوی
// Outbounds اضافه می‌کند.
func baseXrayConfig(socksPort int) xrayConfig {
	return xrayConfig{
		Log: xrayLog{Loglevel: "warning"},
		Inbounds: []xrayInbound{
			{
				Listen:   "0.0.0.0",
				Port:     socksPort,
				Protocol: "socks",
				Settings: xraySocksInSetting{Auth: "noauth", UDP: true},
			},
		},
		Outbounds: []xrayOutbound{
			{Tag: "direct", Protocol: "freedom", Settings: map[string]any{}},
			{Tag: "block", Protocol: "blackhole", Settings: map[string]any{}},
		},
	}
}

func withProxyOutbound(cfg xrayConfig, ob xrayOutbound) xrayConfig {
	ob.Tag = "proxy"
	cfg.Outbounds = append([]xrayOutbound{ob}, cfg.Outbounds...)
	return cfg
}

// parseProxyLink لینک اکانت فیلترشکنی که ادمین از پنل پیست می‌کند را به
// کانفیگ Xray-core تبدیل می‌کند. پروتکل از روی پیشوند لینک تشخیص داده می‌شود؛
// اگر لینک با "{" شروع شود، یک JSON کامل outbound در نظر گرفته می‌شود (برای
// کانفیگ‌های خاص که در قالب هیچ‌کدام از لینک‌های استاندارد نیستند).
func parseProxyLink(link string, socksPort int) (xrayConfig, error) {
	link = strings.TrimSpace(link)
	switch {
	case strings.HasPrefix(link, "vless://"):
		return parseVlessLink(link, socksPort)
	case strings.HasPrefix(link, "vmess://"):
		return parseVmessLink(link, socksPort)
	case strings.HasPrefix(link, "trojan://"):
		return parseTrojanLink(link, socksPort)
	case strings.HasPrefix(link, "ss://"):
		return parseShadowsocksLink(link, socksPort)
	case strings.HasPrefix(link, "{"):
		return parseRawOutboundJSON(link, socksPort)
	default:
		return xrayConfig{}, fmt.Errorf(
			"پروتکل پشتیبانی‌نشده — لینک باید با vless://, vmess://, trojan://, ss:// شروع شود یا یک JSON کامل outbound باشد",
		)
	}
}

// parseVlessLink یک لینک vless:// (فرمت رایج در سابسکریپشن‌های عمومی V2Ray) را
// به کانفیگ Xray-core تبدیل می‌کند. با ترکیب‌های امنیتی/ترنسپورت رایج: reality،
// tls، و tcp/ws/xhttp (شامل هدر HTTP obfuscation).
func parseVlessLink(link string, socksPort int) (xrayConfig, error) {
	u, err := url.Parse(link)
	if err != nil {
		return xrayConfig{}, fmt.Errorf("لینک vless قابل‌خواندن نیست: %w", err)
	}

	uuid := u.User.Username()
	host := u.Hostname()
	portStr := u.Port()
	if uuid == "" || host == "" || portStr == "" {
		return xrayConfig{}, fmt.Errorf("لینک vless ناقص است (uuid/host/port پیدا نشد)")
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return xrayConfig{}, fmt.Errorf("پورت نامعتبر است: %w", err)
	}

	q := u.Query()
	get := func(key, def string) string {
		if v := q.Get(key); v != "" {
			return v
		}
		return def
	}

	user := map[string]any{
		"id":         uuid,
		"encryption": get("encryption", "none"),
	}
	if flow := q.Get("flow"); flow != "" {
		user["flow"] = flow
	}

	network := get("type", "tcp")
	security := get("security", "none")
	stream := map[string]any{
		"network":  network,
		"security": security,
	}

	switch security {
	case "reality":
		stream["realitySettings"] = map[string]any{
			"serverName":  get("sni", host),
			"fingerprint": get("fp", "chrome"),
			"publicKey":   q.Get("pbk"),
			"shortId":     q.Get("sid"),
		}
	case "tls":
		stream["tlsSettings"] = map[string]any{
			"serverName":    get("sni", host),
			"allowInsecure": q.Get("allowInsecure") == "1" || q.Get("insecure") == "1",
		}
	}

	switch network {
	case "ws":
		path := get("path", "/")
		stream["wsSettings"] = map[string]any{
			"path":    path,
			"headers": map[string]any{"Host": get("host", host)},
		}
	case "tcp":
		if get("headerType", "") == "http" {
			path := get("path", "/")
			stream["tcpSettings"] = map[string]any{
				"header": map[string]any{
					"type": "http",
					"request": map[string]any{
						"path":    []string{path},
						"headers": map[string]any{"Host": []string{get("host", host)}},
					},
				},
			}
		}
	case "xhttp":
		stream["xhttpSettings"] = map[string]any{
			"path": get("path", "/"),
			"host": get("host", host),
			"mode": get("mode", "auto"),
		}
	}

	cfg := withProxyOutbound(baseXrayConfig(socksPort), xrayOutbound{
		Protocol: "vless",
		Settings: map[string]any{
			"vnext": []map[string]any{
				{"address": host, "port": port, "users": []map[string]any{user}},
			},
		},
		StreamSettings: stream,
	})
	return cfg, nil
}

// flexString مقداری در JSON را که گاهی به‌صورت رشته و گاهی به‌صورت عدد سریالایز
// شده می‌پذیرد — سابسکریپشن‌های عمومی vmess در این مورد ناهماهنگ‌اند (مثلاً
// فیلد "aid" یا "port" بسته به ژنراتور، رشته یا عدد است).
type flexString string

func (f *flexString) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err == nil {
		*f = flexString(s)
		return nil
	}
	var n json.Number
	if err := json.Unmarshal(b, &n); err == nil {
		*f = flexString(n.String())
		return nil
	}
	return fmt.Errorf("مقدار نامعتبر است")
}

type vmessJSON struct {
	Add  string     `json:"add"`
	Port flexString `json:"port"`
	ID   string     `json:"id"`
	Aid  flexString `json:"aid"`
	Scy  string     `json:"scy"`
	Net  string     `json:"net"`
	Type string     `json:"type"`
	Host string     `json:"host"`
	Path string     `json:"path"`
	TLS  string     `json:"tls"`
	SNI  string     `json:"sni"`
}

func orDefault(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func decodeBase64Flexible(s string) ([]byte, error) {
	s = strings.TrimSpace(s)
	decoders := []*base64.Encoding{base64.StdEncoding, base64.RawStdEncoding, base64.URLEncoding, base64.RawURLEncoding}
	for _, enc := range decoders {
		if b, err := enc.DecodeString(s); err == nil {
			return b, nil
		}
	}
	return nil, fmt.Errorf("decode base64 ناموفق بود")
}

// parseVmessLink یک لینک vmess://<base64 JSON> (فرمت رایج v2rayN) را به کانفیگ
// Xray-core تبدیل می‌کند.
func parseVmessLink(link string, socksPort int) (xrayConfig, error) {
	raw := strings.TrimPrefix(link, "vmess://")
	decoded, err := decodeBase64Flexible(raw)
	if err != nil {
		return xrayConfig{}, fmt.Errorf("لینک vmess قابل decode نیست: %w", err)
	}

	var v vmessJSON
	if err := json.Unmarshal(decoded, &v); err != nil {
		return xrayConfig{}, fmt.Errorf("JSON داخل لینک vmess نامعتبر است: %w", err)
	}
	if v.Add == "" || string(v.Port) == "" || v.ID == "" {
		return xrayConfig{}, fmt.Errorf("لینک vmess ناقص است (add/port/id پیدا نشد)")
	}
	port, err := strconv.Atoi(string(v.Port))
	if err != nil {
		return xrayConfig{}, fmt.Errorf("پورت نامعتبر است: %w", err)
	}
	aid := 0
	if string(v.Aid) != "" {
		aid, _ = strconv.Atoi(string(v.Aid))
	}

	user := map[string]any{
		"id":       v.ID,
		"alterId":  aid,
		"security": orDefault(v.Scy, "auto"),
	}

	network := orDefault(v.Net, "tcp")
	security := orDefault(v.TLS, "none")
	stream := map[string]any{"network": network, "security": security}

	if security == "tls" {
		stream["tlsSettings"] = map[string]any{
			"serverName":    orDefault(v.SNI, v.Host, v.Add),
			"allowInsecure": false,
		}
	}

	switch network {
	case "ws":
		stream["wsSettings"] = map[string]any{
			"path":    orDefault(v.Path, "/"),
			"headers": map[string]any{"Host": orDefault(v.Host, v.Add)},
		}
	case "tcp":
		if v.Type == "http" {
			path := orDefault(v.Path, "/")
			stream["tcpSettings"] = map[string]any{
				"header": map[string]any{
					"type": "http",
					"request": map[string]any{
						"path":    []string{path},
						"headers": map[string]any{"Host": []string{orDefault(v.Host, v.Add)}},
					},
				},
			}
		}
	}

	cfg := withProxyOutbound(baseXrayConfig(socksPort), xrayOutbound{
		Protocol: "vmess",
		Settings: map[string]any{
			"vnext": []map[string]any{
				{"address": v.Add, "port": port, "users": []map[string]any{user}},
			},
		},
		StreamSettings: stream,
	})
	return cfg, nil
}

// parseTrojanLink یک لینک trojan://password@host:port?... را به کانفیگ
// Xray-core تبدیل می‌کند.
func parseTrojanLink(link string, socksPort int) (xrayConfig, error) {
	u, err := url.Parse(link)
	if err != nil {
		return xrayConfig{}, fmt.Errorf("لینک trojan قابل‌خواندن نیست: %w", err)
	}

	password := u.User.Username()
	host := u.Hostname()
	portStr := u.Port()
	if password == "" || host == "" || portStr == "" {
		return xrayConfig{}, fmt.Errorf("لینک trojan ناقص است (password/host/port پیدا نشد)")
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return xrayConfig{}, fmt.Errorf("پورت نامعتبر است: %w", err)
	}

	q := u.Query()
	get := func(key, def string) string {
		if v := q.Get(key); v != "" {
			return v
		}
		return def
	}

	network := get("type", "tcp")
	// trojan تقریباً همیشه روی tls اجرا می‌شود؛ برخلاف vless پیش‌فرض none نیست.
	security := get("security", "tls")
	stream := map[string]any{"network": network, "security": security}
	if security == "tls" {
		stream["tlsSettings"] = map[string]any{
			"serverName":    get("sni", host),
			"allowInsecure": q.Get("allowInsecure") == "1",
		}
	}
	if network == "ws" {
		stream["wsSettings"] = map[string]any{
			"path":    get("path", "/"),
			"headers": map[string]any{"Host": get("host", host)},
		}
	}

	cfg := withProxyOutbound(baseXrayConfig(socksPort), xrayOutbound{
		Protocol: "trojan",
		Settings: map[string]any{
			"servers": []map[string]any{{"address": host, "port": port, "password": password}},
		},
		StreamSettings: stream,
	})
	return cfg, nil
}

// parseShadowsocksLink هر دو فرمت رایج ss:// را می‌پذیرد: SIP002
// (ss://base64(method:password)@host:port) و legacy
// (ss://base64(method:password@host:port)).
func parseShadowsocksLink(link string, socksPort int) (xrayConfig, error) {
	body := strings.TrimPrefix(link, "ss://")
	if idx := strings.IndexByte(body, '#'); idx >= 0 {
		body = body[:idx]
	}

	var method, password, host, port string

	if atIdx := strings.LastIndex(body, "@"); atIdx >= 0 {
		userinfo := body[:atIdx]
		hostport := body[atIdx+1:]
		if qIdx := strings.IndexByte(hostport, '?'); qIdx >= 0 {
			hostport = hostport[:qIdx]
		}

		decodedUser, err := decodeBase64Flexible(userinfo)
		if err != nil {
			return xrayConfig{}, fmt.Errorf("بخش کاربر لینک ss قابل decode نیست: %w", err)
		}
		parts := strings.SplitN(string(decodedUser), ":", 2)
		if len(parts) != 2 {
			return xrayConfig{}, fmt.Errorf("method/password در لینک ss پیدا نشد")
		}
		method, password = parts[0], parts[1]

		h, p, err := net.SplitHostPort(hostport)
		if err != nil {
			return xrayConfig{}, fmt.Errorf("host/port لینک ss نامعتبر است: %w", err)
		}
		host, port = h, p
	} else {
		decoded, err := decodeBase64Flexible(body)
		if err != nil {
			return xrayConfig{}, fmt.Errorf("لینک ss قابل decode نیست: %w", err)
		}
		s := string(decoded)
		atIdx := strings.LastIndex(s, "@")
		if atIdx < 0 {
			return xrayConfig{}, fmt.Errorf("فرمت لینک ss شناخته‌نشده است")
		}
		parts := strings.SplitN(s[:atIdx], ":", 2)
		if len(parts) != 2 {
			return xrayConfig{}, fmt.Errorf("method/password در لینک ss پیدا نشد")
		}
		method, password = parts[0], parts[1]

		h, p, err := net.SplitHostPort(s[atIdx+1:])
		if err != nil {
			return xrayConfig{}, fmt.Errorf("host/port لینک ss نامعتبر است: %w", err)
		}
		host, port = h, p
	}

	portNum, err := strconv.Atoi(port)
	if err != nil {
		return xrayConfig{}, fmt.Errorf("پورت نامعتبر است: %w", err)
	}

	cfg := withProxyOutbound(baseXrayConfig(socksPort), xrayOutbound{
		Protocol: "shadowsocks",
		Settings: map[string]any{
			"servers": []map[string]any{
				{"address": host, "port": portNum, "method": method, "password": password},
			},
		},
	})
	return cfg, nil
}

// parseRawOutboundJSON برای کانفیگ‌های خاص (مثلاً پروتکل‌های کمتر رایج Xray)
// که در قالب هیچ‌کدام از لینک‌های بالا نیستند: ادمین کل outbound object را (به
// همان شکلی که خود Xray می‌فهمد — protocol/settings/streamSettings) پیست می‌کند.
func parseRawOutboundJSON(raw string, socksPort int) (xrayConfig, error) {
	var ob struct {
		Protocol       string         `json:"protocol"`
		Settings       map[string]any `json:"settings"`
		StreamSettings map[string]any `json:"streamSettings"`
	}
	if err := json.Unmarshal([]byte(raw), &ob); err != nil {
		return xrayConfig{}, fmt.Errorf("JSON نامعتبر است: %w", err)
	}
	if ob.Protocol == "" {
		return xrayConfig{}, fmt.Errorf("فیلد protocol در JSON پیدا نشد")
	}
	if ob.Settings == nil {
		return xrayConfig{}, fmt.Errorf("فیلد settings در JSON پیدا نشد")
	}

	cfg := withProxyOutbound(baseXrayConfig(socksPort), xrayOutbound{
		Protocol:       ob.Protocol,
		Settings:       ob.Settings,
		StreamSettings: ob.StreamSettings,
	})
	return cfg, nil
}

func (c xrayConfig) toJSON() ([]byte, error) {
	return json.MarshalIndent(c, "", "  ")
}
