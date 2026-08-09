package martyrservice

import (
	"context"

	domain "wallpaperstore/internal/domain/martyr"
	"wallpaperstore/internal/service/martyr/dto"
)

type Repository interface {
	GetActiveMartyrs(ctx context.Context) ([]domain.Martyr, error)
	GetAllMartyrs(ctx context.Context) ([]domain.Martyr, error)
	SaveMartyr(ctx context.Context, m domain.Martyr) (domain.Martyr, error)
	UpdateMartyr(ctx context.Context, m domain.Martyr) (domain.Martyr, error)
	DeleteMartyr(ctx context.Context, id string) error
	GetCategories(ctx context.Context) ([]domain.MartyrCategory, error)
	SaveCategory(ctx context.Context, c domain.MartyrCategory) (domain.MartyrCategory, error)
	DeleteCategory(ctx context.Context, id string) error
}

type Service struct {
	repo Repository
}

func New(repo Repository) Service {
	return Service{repo: repo}
}

func toDTO(m domain.Martyr) dto.MartyrDTO {
	return dto.MartyrDTO{
		ID:         m.ID,
		Name:       m.Name,
		Martyrdom:  m.Martyrdom,
		Born:       m.Born,
		MartyredOn: m.MartyredOn,
		Place:      m.Place,
		Will:       m.Will,
		Photo:      m.Photo,
		SortOrder:  m.SortOrder,
		IsActive:   m.IsActive,
		CategoryID: m.CategoryID,
	}
}

func toCategoryDTO(c domain.MartyrCategory) dto.MartyrCategoryDTO {
	return dto.MartyrCategoryDTO{ID: c.ID, Title: c.Title, SortOrder: c.SortOrder}
}
