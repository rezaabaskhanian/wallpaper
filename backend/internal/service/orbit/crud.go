package orbitservice

import (
	"context"

	domain "wallpaperstore/internal/domain/orbit"
	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/orbit/dto"
)

// GetOrbitCatalog کاتالوگ عمومی اوربیت (همه‌ی دسته‌ها + آیتم‌های فعال) برای اپ.
func (s Service) GetOrbitCatalog(ctx context.Context) (dto.OrbitCatalogResponse, error) {
	const op = "orbitservice.GetOrbitCatalog"

	cats, err := s.repo.GetCategories(ctx)
	if err != nil {
		return dto.OrbitCatalogResponse{}, richerror.New(op).WithErr(err)
	}
	items, err := s.repo.GetActiveItems(ctx)
	if err != nil {
		return dto.OrbitCatalogResponse{}, richerror.New(op).WithErr(err)
	}

	catDTOs := make([]dto.CategoryDTO, 0, len(cats))
	for _, c := range cats {
		catDTOs = append(catDTOs, toCategoryDTO(c))
	}
	itemDTOs := make([]dto.ItemDTO, 0, len(items))
	for _, it := range items {
		itemDTOs = append(itemDTOs, toItemDTO(it))
	}

	return dto.OrbitCatalogResponse{Categories: catDTOs, Items: itemDTOs}, nil
}

// AdminListCategories لیست کامل دسته‌های اوربیت برای پنل ادمین.
func (s Service) AdminListCategories(ctx context.Context) (dto.AdminListCategoriesResponse, error) {
	const op = "orbitservice.AdminListCategories"

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

// CreateCategory افزودن/به‌روزرسانی یک دسته‌ی اوربیت.
func (s Service) CreateCategory(ctx context.Context, req dto.UpsertCategoryRequest) (dto.CategoryResponse, error) {
	const op = "orbitservice.CreateCategory"

	c, err := domain.NewCategory(req.ID, req.Title, req.Sort, req.CenterImage, req.CenterTitle, req.CenterSlogan)
	if err != nil {
		return dto.CategoryResponse{}, richerror.New(op).WithErr(err).WithMessage("مشکل در ساخت دسته")
	}

	created, err := s.repo.SaveCategory(ctx, c)
	if err != nil {
		return dto.CategoryResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.CategoryResponse{Category: toCategoryDTO(created)}, nil
}

// UpdateCategory ویرایش یک دسته‌ی اوربیت موجود.
func (s Service) UpdateCategory(ctx context.Context, id string, req dto.UpsertCategoryRequest) (dto.CategoryResponse, error) {
	const op = "orbitservice.UpdateCategory"

	c, err := domain.NewCategory(id, req.Title, req.Sort, req.CenterImage, req.CenterTitle, req.CenterSlogan)
	if err != nil {
		return dto.CategoryResponse{}, richerror.New(op).WithErr(err).WithMessage("مشکل در ویرایش دسته")
	}

	updated, err := s.repo.SaveCategory(ctx, c)
	if err != nil {
		return dto.CategoryResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.CategoryResponse{Category: toCategoryDTO(updated)}, nil
}

// DeleteCategory حذف یک دسته‌ی اوربیت (آیتم‌های آن هم به‌خاطر ON DELETE CASCADE حذف می‌شوند).
func (s Service) DeleteCategory(ctx context.Context, id string) error {
	const op = "orbitservice.DeleteCategory"

	if err := s.repo.DeleteCategory(ctx, id); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return nil
}

// AdminListItems لیست کامل آیتم‌های اوربیت (شامل غیرفعال‌ها) برای پنل ادمین.
func (s Service) AdminListItems(ctx context.Context) (dto.AdminListItemsResponse, error) {
	const op = "orbitservice.AdminListItems"

	items, err := s.repo.GetAllItems(ctx)
	if err != nil {
		return dto.AdminListItemsResponse{}, richerror.New(op).WithErr(err)
	}

	itemDTOs := make([]dto.ItemDTO, 0, len(items))
	for _, it := range items {
		itemDTOs = append(itemDTOs, toItemDTO(it))
	}
	return dto.AdminListItemsResponse{Items: itemDTOs}, nil
}

// CreateItem افزودن آیتم اوربیت جدید.
func (s Service) CreateItem(ctx context.Context, req dto.UpsertItemRequest) (dto.ItemResponse, error) {
	const op = "orbitservice.CreateItem"

	it, err := domain.NewItem(req.ID, req.CategoryID, req.Label, req.Image, req.Description, req.Sort, true)
	if err != nil {
		return dto.ItemResponse{}, richerror.New(op).WithErr(err).WithMessage("مشکل در ساخت آیتم")
	}

	created, err := s.repo.SaveItem(ctx, it)
	if err != nil {
		return dto.ItemResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.ItemResponse{Item: toItemDTO(created)}, nil
}

// UpdateItem ویرایش یک آیتم اوربیت موجود.
func (s Service) UpdateItem(ctx context.Context, id string, req dto.UpsertItemRequest) (dto.ItemResponse, error) {
	const op = "orbitservice.UpdateItem"

	it, err := domain.NewItem(id, req.CategoryID, req.Label, req.Image, req.Description, req.Sort, req.IsActive)
	if err != nil {
		return dto.ItemResponse{}, richerror.New(op).WithErr(err).WithMessage("مشکل در ویرایش آیتم")
	}

	updated, err := s.repo.UpdateItem(ctx, it)
	if err != nil {
		return dto.ItemResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.ItemResponse{Item: toItemDTO(updated)}, nil
}

// DeleteItem حذف یک آیتم اوربیت.
func (s Service) DeleteItem(ctx context.Context, id string) error {
	const op = "orbitservice.DeleteItem"

	if err := s.repo.DeleteItem(ctx, id); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return nil
}
