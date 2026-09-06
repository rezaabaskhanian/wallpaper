package quotehandler

import (
	"context"
	"net/http"

	"wallpaperstore/internal/pkg/richerror"
	quoteservice "wallpaperstore/internal/service/quote"
	"wallpaperstore/internal/service/quote/dto"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc quoteservice.Service
}

func New(svc quoteservice.Service) Handler {
	return Handler{svc: svc}
}

// SetRoutes مسیر عمومی GET /api/v1/quotes و مسیرهای ادمین را ثبت می‌کند.
func (h Handler) SetRoutes(api *echo.Group, admin *echo.Group) {
	api.GET("/quotes", h.List)
	api.GET("/quote-categories", h.ListCategories)

	admin.GET("/quotes", h.AdminList)
	admin.POST("/quotes", h.Create)
	admin.PUT("/quotes/:id", h.Update)
	admin.DELETE("/quotes/:id", h.Delete)

	admin.GET("/quote-categories", h.ListCategories)
	admin.POST("/quote-categories", h.CreateCategory)
	admin.PUT("/quote-categories/:id", h.UpdateCategory)
	admin.DELETE("/quote-categories/:id", h.DeleteCategory)
}

func (h Handler) List(c echo.Context) error {
	const op = "quotehandler.List"
	res, err := h.svc.ListQuotes(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) AdminList(c echo.Context) error {
	const op = "quotehandler.AdminList"
	res, err := h.svc.AdminListQuotes(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) Create(c echo.Context) error {
	const op = "quotehandler.Create"
	var req dto.UpsertQuoteRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.CreateQuote(context.Background(), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusCreated, res)
}

func (h Handler) Update(c echo.Context) error {
	const op = "quotehandler.Update"
	var req dto.UpsertQuoteRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.UpdateQuote(context.Background(), c.Param("id"), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) Delete(c echo.Context) error {
	const op = "quotehandler.Delete"
	if err := h.svc.DeleteQuote(context.Background(), c.Param("id")); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h Handler) ListCategories(c echo.Context) error {
	const op = "quotehandler.ListCategories"
	res, err := h.svc.ListCategories(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) CreateCategory(c echo.Context) error {
	const op = "quotehandler.CreateCategory"
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
	const op = "quotehandler.UpdateCategory"
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
	const op = "quotehandler.DeleteCategory"
	if err := h.svc.DeleteCategory(context.Background(), c.Param("id")); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}
