package martyrhandler

import (
	"context"
	"net/http"

	"wallpaperstore/internal/pkg/richerror"
	martyrservice "wallpaperstore/internal/service/martyr"
	"wallpaperstore/internal/service/martyr/dto"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc martyrservice.Service
}

func New(svc martyrservice.Service) Handler {
	return Handler{svc: svc}
}

// SetRoutes مسیر عمومی GET /api/v1/martyrs و مسیرهای ادمین را ثبت می‌کند.
func (h Handler) SetRoutes(api *echo.Group, admin *echo.Group) {
	api.GET("/martyrs", h.List)

	admin.GET("/martyrs", h.AdminList)
	admin.POST("/martyrs", h.Create)
	admin.PUT("/martyrs/:id", h.Update)
	admin.DELETE("/martyrs/:id", h.Delete)
}

func (h Handler) List(c echo.Context) error {
	const op = "martyrhandler.List"
	res, err := h.svc.ListMartyrs(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) AdminList(c echo.Context) error {
	const op = "martyrhandler.AdminList"
	res, err := h.svc.AdminListMartyrs(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) Create(c echo.Context) error {
	const op = "martyrhandler.Create"
	var req dto.UpsertMartyrRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.CreateMartyr(context.Background(), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusCreated, res)
}

func (h Handler) Update(c echo.Context) error {
	const op = "martyrhandler.Update"
	var req dto.UpsertMartyrRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.UpdateMartyr(context.Background(), c.Param("id"), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) Delete(c echo.Context) error {
	const op = "martyrhandler.Delete"
	if err := h.svc.DeleteMartyr(context.Background(), c.Param("id")); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}
