package wallpaperservice

import (
	"context"

	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/wallpaper/dto"
)

// GetCatalog کل کاتالوگ (دسته‌ها + والپیپرهای فعال + نسخه) را برای اپ می‌سازد.
func (s Service) GetCatalog(ctx context.Context) (dto.CatalogResponse, error) {
	const op = "wallpaperservice.GetCatalog"

	cats, err := s.repo.GetCategories(ctx)
	if err != nil {
		return dto.CatalogResponse{}, richerror.New(op).WithErr(err)
	}

	wps, err := s.repo.GetActiveWallpapers(ctx)
	if err != nil {
		return dto.CatalogResponse{}, richerror.New(op).WithErr(err)
	}

	version, err := s.repo.GetCatalogVersion(ctx)
	if err != nil {
		return dto.CatalogResponse{}, richerror.New(op).WithErr(err)
	}

	catDTOs := make([]dto.CategoryDTO, 0, len(cats))
	for _, c := range cats {
		catDTOs = append(catDTOs, dto.CategoryDTO{ID: c.ID, Title: c.Title})
	}

	wpDTOs := make([]dto.WallpaperDTO, 0, len(wps))
	for _, w := range wps {
		wpDTOs = append(wpDTOs, dto.WallpaperDTO{
			ID:       string(w.ID),
			Title:    w.Title,
			Category: w.Category,
			Premium:  w.Premium,
			Thumb:    w.Thumb,
			Full:     w.Full,
			Width:    w.Width,
			Height:   w.Height,
			Bytes:    w.Bytes,
		})
	}

	return dto.CatalogResponse{
		Version:    version,
		Categories: catDTOs,
		Wallpapers: wpDTOs,
	}, nil
}
