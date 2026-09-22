// Package httpproxy یک http.Client می‌سازد که در صورت تنظیم‌بودن proxyURL،
// درخواست‌ها را از یک پراکسی SOCKS5 یا HTTP(S) رد می‌کند — برای عبور از فیلترینگ
// وقتی سرور در ایران میزبانی می‌شود و API‌های AI مستقیم قابل‌دسترس نیستند.
package httpproxy

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"time"

	"golang.org/x/net/proxy"
)

// NewClient با proxyURL خالی همان http.Client ساده‌ی همیشگی را برمی‌گرداند
// (رفتار فعلی، بدون تغییر). proxyURL می‌تواند socks5:// یا http(s):// باشد.
func NewClient(timeout time.Duration, proxyURL string) (*http.Client, error) {
	if proxyURL == "" {
		return &http.Client{Timeout: timeout}, nil
	}

	u, err := url.Parse(proxyURL)
	if err != nil {
		return nil, fmt.Errorf("httpproxy: invalid proxy url %q: %w", proxyURL, err)
	}

	switch u.Scheme {
	case "socks5", "socks5h":
		dialer, err := proxy.SOCKS5("tcp", u.Host, nil, proxy.Direct)
		if err != nil {
			return nil, fmt.Errorf("httpproxy: socks5 dialer: %w", err)
		}
		transport := &http.Transport{
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				return dialer.Dial(network, addr)
			},
		}
		return &http.Client{Timeout: timeout, Transport: transport}, nil
	case "http", "https":
		transport := &http.Transport{Proxy: http.ProxyURL(u)}
		return &http.Client{Timeout: timeout, Transport: transport}, nil
	default:
		return nil, fmt.Errorf("httpproxy: unsupported proxy scheme %q", u.Scheme)
	}
}
