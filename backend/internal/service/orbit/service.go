package orbitservice

import (
	"context"

	domain "wallpaperstore/internal/domain/orbit"
	"wallpaperstore/internal/service/orbit/dto"
)

type Repository interface {
	// خواندن عمومی (کاتالوگ اوربیت)
	GetCategories(ctx context.Context) ([]domain.Category, error)
	GetActiveItems(ctx context.Context) ([]domain.Item, error)

	// خواندن همه (ادمین، شامل آیتم‌های غیرفعال)
	GetAllItems(ctx context.Context) ([]domain.Item, error)

	// نوشتن (ادمین)
	SaveCategory(ctx context.Context, c domain.Category) (domain.Category, error)
	DeleteCategory(ctx context.Context, id string) error
	SaveItem(ctx context.Context, it domain.Item) (domain.Item, error)
	UpdateItem(ctx context.Context, it domain.Item) (domain.Item, error)
	DeleteItem(ctx context.Context, id string) error
}

type Service struct {
	repo Repository
}

func New(repo Repository) Service {
	return Service{repo: repo}
}

func toCategoryDTO(c domain.Category) dto.CategoryDTO {
	return dto.CategoryDTO{
		ID:           c.ID,
		Title:        c.Title,
		Sort:         c.Sort,
		CenterImage:  c.CenterImage,
		CenterTitle:  c.CenterTitle,
		CenterSlogan: c.CenterSlogan,
	}
}

func toItemDTO(it domain.Item) dto.ItemDTO {
	return dto.ItemDTO{
		ID:         it.ID,
		CategoryID: it.CategoryID,
		Label:      it.Label,
		Image:      it.Image,
		Sort:       it.Sort,
		IsActive:   it.IsActive,
	}
}
