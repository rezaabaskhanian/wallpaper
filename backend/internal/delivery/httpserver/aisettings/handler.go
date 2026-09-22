package aisettingshandler

import (
	"context"
	"net/http"

	"wallpaperstore/internal/pkg/richerror"
	aisettingsservice "wallpaperstore/internal/service/aisettings"
	"wallpaperstore/internal/service/aisettings/dto"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc aisettingsservice.Service
}

func New(svc aisettingsservice.Service) Handler {
	return Handler{svc: svc}
}

// SetRoutes هر دو مسیر پشت کلید ادمین‌اند — برخلاف Hero، این تنظیمات حساس است
// (کلید API) و نباید عمومی حتی برای GET باشد.
func (h Handler) SetRoutes(admin *echo.Group) {
	admin.GET("/ai-settings", h.Get)
	admin.PUT("/ai-settings", h.Update)
}

func (h Handler) Get(c echo.Context) error {
	const op = "aisettingshandler.Get"
	res, err := h.svc.GetSettings(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) Update(c echo.Context) error {
	const op = "aisettingshandler.Update"
	var req dto.UpdateAISettingsRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.UpdateSettings(context.Background(), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}
