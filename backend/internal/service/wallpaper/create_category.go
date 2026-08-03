package wallpaperservice

import (
	"context"

	domain "wallpaperstore/internal/domain/wallpaper"
	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/wallpaper/dto"
)

// CreateCategory افزودن/به‌روزرسانی یک دسته و بالا بردن نسخه‌ی کاتالوگ.
func (s Service) CreateCategory(ctx context.Context, req dto.CreateCategoryRequest) (dto.CreateCategoryResponse, error) {
	const op = "wallpaperservice.CreateCategory"

	c, err := domain.NewCategory(req.ID, req.Title, req.Sort)
	if err != nil {
		return dto.CreateCategoryResponse{}, richerror.New(op).WithErr(err).WithMessage("مشکل در ساخت دسته")
	}

	created, err := s.repo.SaveCategory(ctx, c)
	if err != nil {
		return dto.CreateCategoryResponse{}, richerror.New(op).WithErr(err)
	}

	if err := s.repo.BumpCatalogVersion(ctx); err != nil {
		return dto.CreateCategoryResponse{}, richerror.New(op).WithErr(err)
	}

	return dto.CreateCategoryResponse{
		Category: dto.CategoryDTO{ID: created.ID, Title: created.Title},
	}, nil
}
