package wallpaperservice

import (
	"context"

	domain "wallpaperstore/internal/domain/wallpaper"
	"wallpaperstore/internal/service/wallpaper/dto"
)

type Repository interface {
	// خواندن کاتالوگ
	GetCategories(ctx context.Context) ([]domain.Category, error)
	GetActiveWallpapers(ctx context.Context) ([]domain.Wallpaper, error)
	GetCatalogVersion(ctx context.Context) (int, error)

	// خواندن همه (ادمین، شامل غیرفعال‌ها)
	GetAllWallpapers(ctx context.Context) ([]domain.Wallpaper, error)

	// نوشتن (ادمین)
	SaveWallpaper(ctx context.Context, w domain.Wallpaper) (domain.Wallpaper, error)
	UpdateWallpaper(ctx context.Context, w domain.Wallpaper) (domain.Wallpaper, error)
	DeleteWallpaper(ctx context.Context, id string) error
	SaveCategory(ctx context.Context, c domain.Category) (domain.Category, error)
	DeleteCategory(ctx context.Context, id string) error
	BumpCatalogVersion(ctx context.Context) error
}

type Service struct {
	repo Repository
}

func New(repo Repository) Service {
	return Service{repo: repo}
}

func toWallpaperDTO(w domain.Wallpaper) dto.WallpaperDTO {
	return dto.WallpaperDTO{
		ID:       string(w.ID),
		Title:    w.Title,
		Category: w.Category,
		Premium:  w.Premium,
		Thumb:    w.Thumb,
		Full:     w.Full,
		Width:    w.Width,
		Height:   w.Height,
		Bytes:    w.Bytes,
		IsActive: w.IsActive,
	}
}

func toCategoryDTO(c domain.Category) dto.CategoryDTO {
	return dto.CategoryDTO{ID: c.ID, Title: c.Title, Sort: c.Sort}
}
