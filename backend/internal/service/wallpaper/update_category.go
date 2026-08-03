package wallpaperservice

import (
	"context"

	domain "wallpaperstore/internal/domain/wallpaper"
	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/wallpaper/dto"
)

// UpdateCategory ویرایش یک دسته موجود و بالا بردن نسخه‌ی کاتالوگ.
func (s Service) UpdateCategory(ctx context.Context, id string, req dto.UpdateCategoryRequest) (dto.UpdateCategoryResponse, error) {
	const op = "wallpaperservice.UpdateCategory"

	c, err := domain.NewCategory(id, req.Title, req.Sort)
	if err != nil {
		return dto.UpdateCategoryResponse{}, richerror.New(op).WithErr(err).WithMessage("مشکل در ویرایش دسته")
	}

	updated, err := s.repo.SaveCategory(ctx, c)
	if err != nil {
		return dto.UpdateCategoryResponse{}, richerror.New(op).WithErr(err)
	}

	if err := s.repo.BumpCatalogVersion(ctx); err != nil {
		return dto.UpdateCategoryResponse{}, richerror.New(op).WithErr(err)
	}

	return dto.UpdateCategoryResponse{Category: toCategoryDTO(updated)}, nil
}

// DeleteCategory حذف کامل یک دسته و بالا بردن نسخه‌ی کاتالوگ.
func (s Service) DeleteCategory(ctx context.Context, id string) error {
	const op = "wallpaperservice.DeleteCategory"

	if err := s.repo.DeleteCategory(ctx, id); err != nil {
		return richerror.New(op).WithErr(err)
	}

	if err := s.repo.BumpCatalogVersion(ctx); err != nil {
		return richerror.New(op).WithErr(err)
	}

	return nil
}

// AdminListCategories لیست کامل دسته‌ها برای پنل ادمین.
func (s Service) AdminListCategories(ctx context.Context) (dto.AdminListCategoriesResponse, error) {
	const op = "wallpaperservice.AdminListCategories"

	cats, err := s.repo.GetCategories(ctx)
	if err != nil {
		return dto.AdminListCategoriesResponse{}, richerror.New(op).WithErr(err)
	}

	catDTOs := make([]dto.CategoryDTO, 0, len(cats))
	for _, c := range cats {
		catDTOs = append(catDTOs, toCategoryDTO(c))
	}

	return dto.AdminListCategoriesResponse{Categories: catDTOs}, nil
}
