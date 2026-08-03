package wallpaperservice

import (
	"context"

	domain "wallpaperstore/internal/domain/wallpaper"
)

type Repository interface {
	// خواندن کاتالوگ
	GetCategories(ctx context.Context) ([]domain.Category, error)
	GetActiveWallpapers(ctx context.Context) ([]domain.Wallpaper, error)
	GetCatalogVersion(ctx context.Context) (int, error)

	// نوشتن (ادمین)
	SaveWallpaper(ctx context.Context, w domain.Wallpaper) (domain.Wallpaper, error)
	SaveCategory(ctx context.Context, c domain.Category) (domain.Category, error)
	BumpCatalogVersion(ctx context.Context) error
}

type Service struct {
	repo Repository
}

func New(repo Repository) Service {
	return Service{repo: repo}
}
