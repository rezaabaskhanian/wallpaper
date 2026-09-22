package aiproxyhandler

import (
	"context"
	"net/http"
	"strings"

	aiproxyservice "wallpaperstore/internal/service/aiproxy"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc aiproxyservice.Service
}

func New(svc aiproxyservice.Service) Handler {
	return Handler{svc: svc}
}

// SetRoutes هر دو مسیر پشت کلید ادمین‌اند — این پراکسی تنظیمات زیرساخت است، نه
// چیزی که کاربر عادی اپ باید ببیند.
func (h Handler) SetRoutes(admin *echo.Group) {
	admin.GET("/ai-proxy/status", h.Status)
	admin.POST("/ai-proxy/connect", h.Connect)
}

// Status وضعیت اتصال پراکسی خروجی (برای Claude/Gemini/DeepSeek) را برمی‌گرداند
// و آخرین لینکی که ادمین ثبت کرده را هم (برای پرکردن فرم) ضمیمه می‌کند.
func (h Handler) Status(c echo.Context) error {
	ctx := context.Background()
	status := h.svc.Status(ctx)
	link, _ := h.svc.CurrentLink(ctx)
	return c.JSON(http.StatusOK, echo.Map{
		"connected": status.Connected,
		"ip":        status.IP,
		"country":   status.Country,
		"org":       status.Org,
		"message":   status.Message,
		"link":      link,
	})
}

type connectProxyRequest struct {
	Link string `json:"link"`
}

// Connect یک لینک vless:// جدید را می‌گیرد، کانفیگ Xray را به‌روز می‌کند و
// بعد از مکث کوتاه (تا سایدکار xray ری‌لود کند) نتیجه‌ی اتصال را برمی‌گرداند.
func (h Handler) Connect(c echo.Context) error {
	var req connectProxyRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"message": "درخواست نامعتبر است"})
	}
	if strings.TrimSpace(req.Link) == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"message": "لینک خالی است"})
	}

	status, err := h.svc.Connect(c.Request().Context(), req.Link)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"message": err.Error()})
	}

	// همیشه ۲۰۰: «وصل نشد» یک نتیجه‌ی معتبر است (link درست پارس و ذخیره شد، فقط
	// تست اتصال واقعی fail شد) نه یک خطای HTTP — فرانت از روی فیلد connected
	// تشخیص می‌دهد، بدون نیاز به catch کردن یک خطای غیرِ۲xx.
	return c.JSON(http.StatusOK, echo.Map{
		"connected": status.Connected,
		"ip":        status.IP,
		"country":   status.Country,
		"org":       status.Org,
		"message":   status.Message,
	})
}
