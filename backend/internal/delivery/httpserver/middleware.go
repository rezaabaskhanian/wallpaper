package httpserver

import (
	"time"

	"wallpaperstore/internal/pkg/logger"

	"github.com/labstack/echo/v4"
)

// structuredLogger میدلور لاگ ساخت‌یافته با slog است.
// برای هر درخواست: متد، مسیر، وضعیت، زمان پاسخ و شناسه‌ی درخواست را لاگ می‌کند.
func structuredLogger() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()
			err := next(c)
			if err != nil {
				c.Error(err)
			}

			req := c.Request()
			res := c.Response()

			attrs := []any{
				"method", req.Method,
				"path", req.URL.Path,
				"status", res.Status,
				"latency_ms", time.Since(start).Milliseconds(),
				"ip", c.RealIP(),
				"request_id", res.Header().Get(echo.HeaderXRequestID),
			}

			if res.Status >= 500 {
				logger.L().Error("request", attrs...)
			} else if res.Status >= 400 {
				logger.L().Warn("request", attrs...)
			} else {
				logger.L().Info("request", attrs...)
			}
			return nil
		}
	}
}
