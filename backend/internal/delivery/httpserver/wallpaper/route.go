package wallpaperhandler

import (
	"github.com/labstack/echo/v4"
)

// SetWallpaperRoutes مسیرهای عمومی (کاتالوگ) و ادمین (CRUD والپیپر/دسته) را ثبت می‌کند.
// api = گروه /api/v1 (عمومی)، admin = گروه /api/v1/admin (پشت کلید ادمین).
func (h Handler) SetWallpaperRoutes(api *echo.Group, admin *echo.Group) {
	api.GET("/catalog", h.GetCatalog)

	admin.GET("/wallpapers", h.AdminListWallpapers)
	admin.POST("/wallpapers", h.CreateWallpaper)
	admin.PUT("/wallpapers/:id", h.UpdateWallpaper)
	admin.DELETE("/wallpapers/:id", h.DeleteWallpaper)

	admin.GET("/categories", h.AdminListCategories)
	admin.POST("/categories", h.CreateCategory)
	admin.PUT("/categories/:id", h.UpdateCategory)
	admin.DELETE("/categories/:id", h.DeleteCategory)
}
