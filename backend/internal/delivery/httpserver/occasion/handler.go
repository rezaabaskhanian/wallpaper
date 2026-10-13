package occasionhandler

import (
	"context"
	"net/http"

	"wallpaperstore/internal/pkg/richerror"
	occasionservice "wallpaperstore/internal/service/occasion"
	"wallpaperstore/internal/service/occasion/dto"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc occasionservice.Service
}

func New(svc occasionservice.Service) Handler {
	return Handler{svc: svc}
}

// SetRoutes مسیر عمومی GET /api/v1/occasions و مسیرهای CRUD ادمین را ثبت می‌کند.
func (h Handler) SetRoutes(api *echo.Group, admin *echo.Group) {
	api.GET("/occasions", h.List)

	admin.GET("/occasions", h.AdminList)
	admin.POST("/occasions", h.Create)
	admin.PUT("/occasions/:id", h.Update)
	admin.DELETE("/occasions/:id", h.Delete)
}

func (h Handler) List(c echo.Context) error {
	const op = "occasionhandler.List"
	res, err := h.svc.ListOccasions(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) AdminList(c echo.Context) error {
	const op = "occasionhandler.AdminList"
	res, err := h.svc.AdminListOccasions(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) Create(c echo.Context) error {
	const op = "occasionhandler.Create"
	var req dto.UpsertOccasionRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.CreateOccasion(context.Background(), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusCreated, res)
}

func (h Handler) Update(c echo.Context) error {
	const op = "occasionhandler.Update"
	var req dto.UpsertOccasionRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.UpdateOccasion(context.Background(), c.Param("id"), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) Delete(c echo.Context) error {
	const op = "occasionhandler.Delete"
	if err := h.svc.DeleteOccasion(context.Background(), c.Param("id")); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}
