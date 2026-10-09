package themehandler

import (
	"context"
	"net/http"

	"wallpaperstore/internal/pkg/richerror"
	themeservice "wallpaperstore/internal/service/theme"
	"wallpaperstore/internal/service/theme/dto"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc themeservice.Service
}

func New(svc themeservice.Service) Handler {
	return Handler{svc: svc}
}

// SetRoutes مسیر عمومی GET /api/v1/themes و مسیرهای CRUD ادمین را ثبت می‌کند.
func (h Handler) SetRoutes(api *echo.Group, admin *echo.Group) {
	api.GET("/themes", h.List)

	admin.GET("/themes", h.AdminList)
	admin.POST("/themes", h.Create)
	admin.PUT("/themes/:id", h.Update)
	admin.DELETE("/themes/:id", h.Delete)
}

func (h Handler) List(c echo.Context) error {
	const op = "themehandler.List"
	res, err := h.svc.ListThemes(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) AdminList(c echo.Context) error {
	const op = "themehandler.AdminList"
	res, err := h.svc.AdminListThemes(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) Create(c echo.Context) error {
	const op = "themehandler.Create"
	var req dto.UpsertThemeRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.CreateTheme(context.Background(), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusCreated, res)
}

func (h Handler) Update(c echo.Context) error {
	const op = "themehandler.Update"
	var req dto.UpsertThemeRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.UpdateTheme(context.Background(), c.Param("id"), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) Delete(c echo.Context) error {
	const op = "themehandler.Delete"
	if err := h.svc.DeleteTheme(context.Background(), c.Param("id")); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}
