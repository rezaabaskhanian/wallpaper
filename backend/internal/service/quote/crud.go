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
	q, err := domain.New(req.ID, req.Line1, req.Line2, req.Source, req.SortOrder, true)
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
	q, err := domain.New(id, req.Line1, req.Line2, req.Source, req.SortOrder, req.IsActive)
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
