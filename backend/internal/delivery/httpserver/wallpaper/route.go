package wallpaperhandler

import (
	"wallpaperstore/internal/delivery/middlware"

	"github.com/labstack/echo/v4"
)

func (h Handler) SetWallpaperRoutes(e *echo.Echo) {
	api := e.Group("/api/v1")

	// عمومی: کاتالوگ برای اپ
	api.GET("/catalog", h.GetCatalog)

	// ادمین: افزودن والپیپر/دسته (پشت کلید ادمین)
	admin := api.Group("", middlware.AdminKey(h.adminKey))
	admin.POST("/wallpapers", h.CreateWallpaper)
	admin.POST("/categories", h.CreateCategory)
}
