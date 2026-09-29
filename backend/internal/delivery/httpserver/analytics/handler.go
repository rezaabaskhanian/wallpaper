package analyticshandler

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"wallpaperstore/internal/pkg/richerror"
	analyticsservice "wallpaperstore/internal/service/analytics"
	"wallpaperstore/internal/service/analytics/dto"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc analyticsservice.Service
}

func New(svc analyticsservice.Service) Handler {
	return Handler{svc: svc}
}

// SetRoutes مسیر عمومی POST /api/v1/events (ثبت رویداد از اپ) و گزارش ادمین را ثبت می‌کند.
func (h Handler) SetRoutes(api *echo.Group, admin *echo.Group) {
	api.POST("/events", h.Track)
	admin.GET("/analytics", h.Summary)
}

func (h Handler) Track(c echo.Context) error {
	const op = "analyticshandler.Track"
	var req dto.TrackRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"message": "درخواست نامعتبر است"})
	}
	if err := h.svc.Track(context.Background(), req); err != nil {
		var re richerror.RichError
		if errors.As(err, &re) && re.Message() == analyticsservice.ErrInvalidEvent.Message() {
			return c.JSON(http.StatusBadRequest, echo.Map{"message": re.Message()})
		}
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h Handler) Summary(c echo.Context) error {
	const op = "analyticshandler.Summary"
	days, _ := strconv.Atoi(c.QueryParam("days"))
	res, err := h.svc.Summary(context.Background(), days)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}
