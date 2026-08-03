package wallpaperservice

import (
	"context"

	domain "wallpaperstore/internal/domain/wallpaper"
	wallpapervalueobject "wallpaperstore/internal/domain/wallpaper/valueobject"
	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/wallpaper/dto"
)

// UpdateWallpaper ویرایش یک والپیپر موجود و بالا بردن نسخه‌ی کاتالوگ.
func (s Service) UpdateWallpaper(ctx context.Context, id string, req dto.UpdateWallpaperRequest) (dto.UpdateWallpaperResponse, error) {
	const op = "wallpaperservice.UpdateWallpaper"

	wid, err := wallpapervalueobject.ParseWallpaperID(id)
	if err != nil {
		return dto.UpdateWallpaperResponse{}, richerror.New(op).WithErr(err).WithMessage("شناسه‌ی والپیپر نامعتبر است")
	}

	if req.Title == "" {
		return dto.UpdateWallpaperResponse{}, richerror.New(op).WithErr(domain.ErrEmptyTitle).WithMessage("مشکل در ویرایش والپیپر")
	}
	if req.Category == "" {
		return dto.UpdateWallpaperResponse{}, richerror.New(op).WithErr(domain.ErrEmptyCategory).WithMessage("مشکل در ویرایش والپیپر")
	}
	if req.Thumb == "" || req.Full == "" {
		return dto.UpdateWallpaperResponse{}, richerror.New(op).WithErr(domain.ErrEmptyImage).WithMessage("مشکل در ویرایش والپیپر")
	}

	w := domain.Wallpaper{
		ID:       wid,
		Title:    req.Title,
		Category: req.Category,
		Premium:  req.Premium,
		Thumb:    req.Thumb,
		Full:     req.Full,
		Width:    req.Width,
		Height:   req.Height,
		Bytes:    req.Bytes,
		IsActive: req.IsActive,
	}

	updated, err := s.repo.UpdateWallpaper(ctx, w)
	if err != nil {
		return dto.UpdateWallpaperResponse{}, richerror.New(op).WithErr(err)
	}

	if err := s.repo.BumpCatalogVersion(ctx); err != nil {
		return dto.UpdateWallpaperResponse{}, richerror.New(op).WithErr(err)
	}

	return dto.UpdateWallpaperResponse{Wallpaper: toWallpaperDTO(updated)}, nil
}

// DeleteWallpaper حذف کامل یک والپیپر و بالا بردن نسخه‌ی کاتالوگ.
func (s Service) DeleteWallpaper(ctx context.Context, id string) error {
	const op = "wallpaperservice.DeleteWallpaper"

	if err := s.repo.DeleteWallpaper(ctx, id); err != nil {
		return richerror.New(op).WithErr(err)
	}

	if err := s.repo.BumpCatalogVersion(ctx); err != nil {
		return richerror.New(op).WithErr(err)
	}

	return nil
}

// AdminListWallpapers لیست کامل والپیپرها (شامل غیرفعال‌ها) برای پنل ادمین.
func (s Service) AdminListWallpapers(ctx context.Context) (dto.AdminListWallpapersResponse, error) {
	const op = "wallpaperservice.AdminListWallpapers"

	wps, err := s.repo.GetAllWallpapers(ctx)
	if err != nil {
		return dto.AdminListWallpapersResponse{}, richerror.New(op).WithErr(err)
	}

	wpDTOs := make([]dto.WallpaperDTO, 0, len(wps))
	for _, w := range wps {
		wpDTOs = append(wpDTOs, toWallpaperDTO(w))
	}

	return dto.AdminListWallpapersResponse{Wallpapers: wpDTOs}, nil
}
