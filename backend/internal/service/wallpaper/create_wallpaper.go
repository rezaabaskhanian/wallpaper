package wallpaperservice

import (
	"context"

	domain "wallpaperstore/internal/domain/wallpaper"
	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/wallpaper/dto"
)

// CreateWallpaper افزودن والپیپر جدید و بالا بردن نسخه‌ی کاتالوگ.
func (s Service) CreateWallpaper(ctx context.Context, req dto.CreateWallpaperRequest) (dto.CreateWallpaperResponse, error) {
	const op = "wallpaperservice.CreateWallpaper"

	w, err := domain.NewWallpaper(
		req.ID, req.Title, req.Category, req.Thumb, req.Full,
		req.Premium, req.Width, req.Height, req.Bytes,
	)
	if err != nil {
		return dto.CreateWallpaperResponse{}, richerror.New(op).WithErr(err).WithMessage("مشکل در ساخت والپیپر")
	}

	created, err := s.repo.SaveWallpaper(ctx, w)
	if err != nil {
		return dto.CreateWallpaperResponse{}, richerror.New(op).WithErr(err)
	}

	if err := s.repo.BumpCatalogVersion(ctx); err != nil {
		return dto.CreateWallpaperResponse{}, richerror.New(op).WithErr(err)
	}

	return dto.CreateWallpaperResponse{
		Wallpaper: dto.WallpaperDTO{
			ID:       string(created.ID),
			Title:    created.Title,
			Category: created.Category,
			Premium:  created.Premium,
			Thumb:    created.Thumb,
			Full:     created.Full,
			Width:    created.Width,
			Height:   created.Height,
			Bytes:    created.Bytes,
		},
	}, nil
}
