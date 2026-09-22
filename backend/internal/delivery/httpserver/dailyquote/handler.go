package dailyquotehandler

import (
	"context"
	"net/http"

	"wallpaperstore/internal/pkg/richerror"
	dailyquoteservice "wallpaperstore/internal/service/dailyquote"
	"wallpaperstore/internal/service/quote/dto"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc *dailyquoteservice.Service
}

func New(svc *dailyquoteservice.Service) Handler {
	return Handler{svc: svc}
}

// SetRoutes مسیر عمومی GET /api/v1/daily-quote را ثبت می‌کند.
func (h Handler) SetRoutes(api *echo.Group) {
	api.GET("/daily-quote", h.Get)
}

func (h Handler) Get(c echo.Context) error {
	const op = "dailyquotehandler.Get"
	quote, err := h.svc.GetToday(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, dto.QuoteResponse{Quote: quote})
}
