package wallpaperservice

import (
	"context"

	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/wallpaper/dto"
)

// ApplyFreeLimit در هر دسته FreePerCategory والپیپر فعالِ جدیدتر را رایگان و
// بقیه را پولی می‌کند و در صورت تغییر، نسخه‌ی کاتالوگ را بالا می‌برد.
func (s Service) ApplyFreeLimit(ctx context.Context, req dto.ApplyFreeLimitRequest) (dto.ApplyFreeLimitResponse, error) {
	const op = "wallpaperservice.ApplyFreeLimit"

	if req.FreePerCategory < 0 {
		return dto.ApplyFreeLimitResponse{}, richerror.New(op).WithMessage("تعداد رایگان نمی‌تواند منفی باشد")
	}

	updated, err := s.repo.ApplyFreeLimit(ctx, req.FreePerCategory)
	if err != nil {
		return dto.ApplyFreeLimitResponse{}, richerror.New(op).WithErr(err)
	}

	if updated > 0 {
		if err := s.repo.BumpCatalogVersion(ctx); err != nil {
			return dto.ApplyFreeLimitResponse{}, richerror.New(op).WithErr(err)
		}
	}

	return dto.ApplyFreeLimitResponse{Updated: updated}, nil
}
