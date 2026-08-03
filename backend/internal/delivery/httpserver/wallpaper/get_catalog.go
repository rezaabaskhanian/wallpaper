package wallpaperhandler

import (
	"context"
	"net/http"

	"wallpaperstore/internal/pkg/richerror"

	"github.com/labstack/echo/v4"
)

func (h Handler) GetCatalog(c echo.Context) error {
	const op = "wallpaperhandler.GetCatalog"

	res, err := h.wallpaperSvc.GetCatalog(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}

	return c.JSON(http.StatusOK, res)
}
