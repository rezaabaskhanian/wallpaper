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

	admin.GET("/quotes", h.AdminList)
	admin.POST("/quotes", h.Create)
	admin.PUT("/quotes/:id", h.Update)
	admin.DELETE("/quotes/:id", h.Delete)
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
