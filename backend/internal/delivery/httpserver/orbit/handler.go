package orbithandler

import (
	"context"
	"net/http"

	"wallpaperstore/internal/pkg/richerror"
	orbitservice "wallpaperstore/internal/service/orbit"
	"wallpaperstore/internal/service/orbit/dto"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc orbitservice.Service
}

func New(svc orbitservice.Service) Handler {
	return Handler{svc: svc}
}

// SetRoutes مسیر عمومی کاتالوگ اوربیت و مسیرهای ادمین (دسته/آیتم) را ثبت می‌کند.
func (h Handler) SetRoutes(api *echo.Group, admin *echo.Group) {
	api.GET("/orbit-catalog", h.GetCatalog)

	admin.GET("/orbit-categories", h.AdminListCategories)
	admin.POST("/orbit-categories", h.CreateCategory)
	admin.PUT("/orbit-categories/:id", h.UpdateCategory)
	admin.DELETE("/orbit-categories/:id", h.DeleteCategory)

	admin.GET("/orbit-items", h.AdminListItems)
	admin.POST("/orbit-items", h.CreateItem)
	admin.PUT("/orbit-items/:id", h.UpdateItem)
	admin.DELETE("/orbit-items/:id", h.DeleteItem)
}

func (h Handler) GetCatalog(c echo.Context) error {
	const op = "orbithandler.GetCatalog"
	res, err := h.svc.GetOrbitCatalog(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) AdminListCategories(c echo.Context) error {
	const op = "orbithandler.AdminListCategories"
	res, err := h.svc.AdminListCategories(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) CreateCategory(c echo.Context) error {
	const op = "orbithandler.CreateCategory"
	var req dto.UpsertCategoryRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.CreateCategory(context.Background(), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusCreated, res)
}

func (h Handler) UpdateCategory(c echo.Context) error {
	const op = "orbithandler.UpdateCategory"
	var req dto.UpsertCategoryRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.UpdateCategory(context.Background(), c.Param("id"), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) DeleteCategory(c echo.Context) error {
	const op = "orbithandler.DeleteCategory"
	if err := h.svc.DeleteCategory(context.Background(), c.Param("id")); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h Handler) AdminListItems(c echo.Context) error {
	const op = "orbithandler.AdminListItems"
	res, err := h.svc.AdminListItems(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) CreateItem(c echo.Context) error {
	const op = "orbithandler.CreateItem"
	var req dto.UpsertItemRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.CreateItem(context.Background(), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusCreated, res)
}

func (h Handler) UpdateItem(c echo.Context) error {
	const op = "orbithandler.UpdateItem"
	var req dto.UpsertItemRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.UpdateItem(context.Background(), c.Param("id"), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) DeleteItem(c echo.Context) error {
	const op = "orbithandler.DeleteItem"
	if err := h.svc.DeleteItem(context.Background(), c.Param("id")); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}
