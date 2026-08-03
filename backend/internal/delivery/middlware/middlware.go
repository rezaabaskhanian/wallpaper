package middlware

import (
	"net/http"

	"wallpaperstore/internal/config"

	"github.com/labstack/echo/v4"
)

// AdminKey یک میدلور سادهٔ محافظت برای اندپوینت‌های نوشتن (ادمین).
// کلید در هدر X-Admin-Key فرستاده می‌شود و با ADMIN_API_KEY مقایسه می‌شود.
// اگر کلید در کانفیگ خالی باشد (توسعهٔ محلی)، محافظت غیرفعال است.
func AdminKey(adminKey string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if adminKey == "" {
				return next(c)
			}
			if c.Request().Header.Get(config.AdminKeyHeader) != adminKey {
				return echo.NewHTTPError(http.StatusUnauthorized, "دسترسی ادمین نامعتبر است")
			}
			return next(c)
		}
	}
}
