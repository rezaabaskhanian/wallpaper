package quoteservice

import (
	"context"

	domain "wallpaperstore/internal/domain/quote"
	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/quote/dto"
)

func (s Service) ListQuotes(ctx context.Context) (dto.ListQuotesResponse, error) {
	const op = "quoteservice.ListQuotes"
	qs, err := s.repo.GetActiveQuotes(ctx)
	if err != nil {
		return dto.ListQuotesResponse{}, richerror.New(op).WithErr(err)
	}
	out := make([]dto.QuoteDTO, 0, len(qs))
	for _, q := range qs {
		out = append(out, toDTO(q))
	}
	return dto.ListQuotesResponse{Quotes: out}, nil
}

func (s Service) AdminListQuotes(ctx context.Context) (dto.ListQuotesResponse, error) {
	const op = "quoteservice.AdminListQuotes"
	qs, err := s.repo.GetAllQuotes(ctx)
	if err != nil {
		return dto.ListQuotesResponse{}, richerror.New(op).WithErr(err)
	}
	out := make([]dto.QuoteDTO, 0, len(qs))
	for _, q := range qs {
		out = append(out, toDTO(q))
	}
	return dto.ListQuotesResponse{Quotes: out}, nil
}

func (s Service) CreateQuote(ctx context.Context, req dto.UpsertQuoteRequest) (dto.QuoteResponse, error) {
	const op = "quoteservice.CreateQuote"
	q, err := domain.New(req.ID, req.CategoryID, req.Line1, req.Line2, req.Source, req.SortOrder, true)
	if err != nil {
		return dto.QuoteResponse{}, richerror.New(op).WithErr(err).WithMessage("مشکل در ساخت نقل‌قول")
	}
	created, err := s.repo.SaveQuote(ctx, q)
	if err != nil {
		return dto.QuoteResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.QuoteResponse{Quote: toDTO(created)}, nil
}

func (s Service) UpdateQuote(ctx context.Context, id string, req dto.UpsertQuoteRequest) (dto.QuoteResponse, error) {
	const op = "quoteservice.UpdateQuote"
	q, err := domain.New(id, req.CategoryID, req.Line1, req.Line2, req.Source, req.SortOrder, req.IsActive)
	if err != nil {
		return dto.QuoteResponse{}, richerror.New(op).WithErr(err).WithMessage("مشکل در ویرایش نقل‌قول")
	}
	updated, err := s.repo.UpdateQuote(ctx, q)
	if err != nil {
		return dto.QuoteResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.QuoteResponse{Quote: toDTO(updated)}, nil
}

func (s Service) DeleteQuote(ctx context.Context, id string) error {
	const op = "quoteservice.DeleteQuote"
	if err := s.repo.DeleteQuote(ctx, id); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return nil
}

// ListCategories لیست دسته‌های نقل‌قول (هم برای اپ عمومی و هم پنل ادمین).
func (s Service) ListCategories(ctx context.Context) (dto.ListCategoriesResponse, error) {
	const op = "quoteservice.ListCategories"
	cats, err := s.repo.GetCategories(ctx)
	if err != nil {
		return dto.ListCategoriesResponse{}, richerror.New(op).WithErr(err)
	}
	out := make([]dto.CategoryDTO, 0, len(cats))
	for _, c := range cats {
		out = append(out, toCategoryDTO(c))
	}
	return dto.ListCategoriesResponse{Categories: out}, nil
}

// CreateCategory افزودن یک دسته‌ی نقل‌قول جدید.
func (s Service) CreateCategory(ctx context.Context, req dto.UpsertCategoryRequest) (dto.CategoryResponse, error) {
	const op = "quoteservice.CreateCategory"
	c, err := domain.NewCategory(req.ID, req.Title, req.Sort)
	if err != nil {
		return dto.CategoryResponse{}, richerror.New(op).WithErr(err).WithMessage("مشکل در ساخت دسته")
	}
	created, err := s.repo.SaveCategory(ctx, c)
	if err != nil {
		return dto.CategoryResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.CategoryResponse{Category: toCategoryDTO(created)}, nil
}

// UpdateCategory ویرایش یک دسته‌ی نقل‌قول موجود.
func (s Service) UpdateCategory(ctx context.Context, id string, req dto.UpsertCategoryRequest) (dto.CategoryResponse, error) {
	const op = "quoteservice.UpdateCategory"
	c, err := domain.NewCategory(id, req.Title, req.Sort)
	if err != nil {
		return dto.CategoryResponse{}, richerror.New(op).WithErr(err).WithMessage("مشکل در ویرایش دسته")
	}
	updated, err := s.repo.SaveCategory(ctx, c)
	if err != nil {
		return dto.CategoryResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.CategoryResponse{Category: toCategoryDTO(updated)}, nil
}

// DeleteCategory حذف یک دسته‌ی نقل‌قول.
func (s Service) DeleteCategory(ctx context.Context, id string) error {
	const op = "quoteservice.DeleteCategory"
	if err := s.repo.DeleteCategory(ctx, id); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return nil
}
