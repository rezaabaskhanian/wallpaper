package wallpaperhandler

import (
	"context"
	"net/http"

	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/wallpaper/dto"

	"github.com/labstack/echo/v4"
)

// ApplyFreeLimit در هر دسته N والپیپر جدیدتر را رایگان و بقیه را پولی می‌کند.
func (h Handler) ApplyFreeLimit(c echo.Context) error {
	const op = "wallpaperhandler.ApplyFreeLimit"

	var req dto.ApplyFreeLimitRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}

	res, err := h.wallpaperSvc.ApplyFreeLimit(context.Background(), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}
