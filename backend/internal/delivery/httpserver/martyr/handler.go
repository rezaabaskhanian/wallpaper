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

	admin.GET("/martyr-categories", h.AdminListCategories)
	admin.POST("/martyr-categories", h.CreateCategory)
	admin.PUT("/martyr-categories/:id", h.UpdateCategory)
	admin.DELETE("/martyr-categories/:id", h.DeleteCategory)
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

func (h Handler) AdminListCategories(c echo.Context) error {
	const op = "martyrhandler.AdminListCategories"
	res, err := h.svc.AdminListCategories(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) CreateCategory(c echo.Context) error {
	const op = "martyrhandler.CreateCategory"
	var req dto.UpsertMartyrCategoryRequest
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
	const op = "martyrhandler.UpdateCategory"
	var req dto.UpsertMartyrCategoryRequest
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
	const op = "martyrhandler.DeleteCategory"
	if err := h.svc.DeleteCategory(context.Background(), c.Param("id")); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}
