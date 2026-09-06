package quoteservice

import (
	"context"

	domain "wallpaperstore/internal/domain/quote"
	"wallpaperstore/internal/service/quote/dto"
)

type Repository interface {
	GetActiveQuotes(ctx context.Context) ([]domain.Quote, error)
	GetAllQuotes(ctx context.Context) ([]domain.Quote, error)
	SaveQuote(ctx context.Context, q domain.Quote) (domain.Quote, error)
	UpdateQuote(ctx context.Context, q domain.Quote) (domain.Quote, error)
	DeleteQuote(ctx context.Context, id string) error

	GetCategories(ctx context.Context) ([]domain.Category, error)
	SaveCategory(ctx context.Context, c domain.Category) (domain.Category, error)
	DeleteCategory(ctx context.Context, id string) error
}

type Service struct {
	repo Repository
}

func New(repo Repository) Service {
	return Service{repo: repo}
}

func toDTO(q domain.Quote) dto.QuoteDTO {
	return dto.QuoteDTO{
		ID:         q.ID,
		CategoryID: q.CategoryID,
		Line1:      q.Line1,
		Line2:      q.Line2,
		Source:     q.Source,
		SortOrder:  q.SortOrder,
		IsActive:   q.IsActive,
	}
}

func toCategoryDTO(c domain.Category) dto.CategoryDTO {
	return dto.CategoryDTO{ID: c.ID, Title: c.Title, Sort: c.Sort}
}
