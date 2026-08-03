package wallpaperhandler

import (
	"context"
	"net/http"

	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/wallpaper/dto"

	"github.com/labstack/echo/v4"
)

func (h Handler) AdminListWallpapers(c echo.Context) error {
	const op = "wallpaperhandler.AdminListWallpapers"

	res, err := h.wallpaperSvc.AdminListWallpapers(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) UpdateWallpaper(c echo.Context) error {
	const op = "wallpaperhandler.UpdateWallpaper"

	var req dto.UpdateWallpaperRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}

	res, err := h.wallpaperSvc.UpdateWallpaper(context.Background(), c.Param("id"), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) DeleteWallpaper(c echo.Context) error {
	const op = "wallpaperhandler.DeleteWallpaper"

	if err := h.wallpaperSvc.DeleteWallpaper(context.Background(), c.Param("id")); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h Handler) AdminListCategories(c echo.Context) error {
	const op = "wallpaperhandler.AdminListCategories"

	res, err := h.wallpaperSvc.AdminListCategories(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) UpdateCategory(c echo.Context) error {
	const op = "wallpaperhandler.UpdateCategory"

	var req dto.UpdateCategoryRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}

	res, err := h.wallpaperSvc.UpdateCategory(context.Background(), c.Param("id"), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) DeleteCategory(c echo.Context) error {
	const op = "wallpaperhandler.DeleteCategory"

	if err := h.wallpaperSvc.DeleteCategory(context.Background(), c.Param("id")); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}
