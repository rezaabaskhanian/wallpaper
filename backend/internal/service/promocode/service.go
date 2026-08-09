package promocodeservice

import (
	"context"

	domain "wallpaperstore/internal/domain/promocode"
	"wallpaperstore/internal/service/promocode/dto"
)

type Repository interface {
	GetAll(ctx context.Context) ([]domain.PromoCode, error)
	GetByCode(ctx context.Context, code string) (domain.PromoCode, error)
	Save(ctx context.Context, p domain.PromoCode) (domain.PromoCode, error)
	Update(ctx context.Context, p domain.PromoCode) (domain.PromoCode, error)
	Delete(ctx context.Context, id string) error
	IncrementUsedCount(ctx context.Context, id string) error
}

type Service struct {
	repo Repository
}

func New(repo Repository) Service {
	return Service{repo: repo}
}

func toDTO(p domain.PromoCode) dto.PromoCodeDTO {
	return dto.PromoCodeDTO{
		ID:        p.ID,
		Code:      p.Code,
		IsActive:  p.IsActive,
		UsedCount: p.UsedCount,
	}
}
