package wallpaperhandler

import (
	"context"
	"net/http"

	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/wallpaper/dto"

	"github.com/labstack/echo/v4"
)

func (h Handler) CreateWallpaper(c echo.Context) error {
	const op = "wallpaperhandler.CreateWallpaper"

	var req dto.CreateWallpaperRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}

	res, err := h.wallpaperSvc.CreateWallpaper(context.Background(), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}

	return c.JSON(http.StatusCreated, res)
}

func (h Handler) CreateCategory(c echo.Context) error {
	const op = "wallpaperhandler.CreateCategory"

	var req dto.CreateCategoryRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}

	res, err := h.wallpaperSvc.CreateCategory(context.Background(), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}

	return c.JSON(http.StatusCreated, res)
}
