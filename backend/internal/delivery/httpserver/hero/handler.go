package herohandler

import (
	"context"
	"net/http"

	"wallpaperstore/internal/pkg/richerror"
	heroservice "wallpaperstore/internal/service/hero"
	"wallpaperstore/internal/service/hero/dto"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc heroservice.Service
}

func New(svc heroservice.Service) Handler {
	return Handler{svc: svc}
}

// SetRoutes مسیر عمومی GET /api/v1/hero و مسیر ادمین PUT /api/v1/admin/hero را ثبت می‌کند.
func (h Handler) SetRoutes(api *echo.Group, admin *echo.Group) {
	api.GET("/hero", h.Get)
	admin.PUT("/hero", h.Update)
}

func (h Handler) Get(c echo.Context) error {
	const op = "herohandler.Get"
	res, err := h.svc.GetHero(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) Update(c echo.Context) error {
	const op = "herohandler.Update"
	var req dto.UpsertHeroRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.UpdateHero(context.Background(), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}
