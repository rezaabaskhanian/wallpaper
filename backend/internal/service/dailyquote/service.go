// Package dailyquote generates one AI "quote of the day" (via DeepSeek) and
// stores it through the existing quote service/repository — no new table.
// The quote lives under a dedicated category (categoryID) so the app's
// existing quote-category picker can surface it like any other category.
package dailyquote

import (
	"context"
	"fmt"
	"sync"
	"time"

	"wallpaperstore/internal/pkg/richerror"
	quoteservice "wallpaperstore/internal/service/quote"
	"wallpaperstore/internal/service/quote/dto"
)

const (
	categoryID    = "ai-daily"
	categoryTitle = "جملهٔ روزانه ✨"
)

// Generator abstracts the LLM call so this package doesn't depend directly
// on the deepseek client type (only on internal/pkg/deepseek.Client's shape).
type Generator interface {
	Enabled() bool
	GenerateQuote(ctx context.Context, userPrompt string) (line1, line2 string, err error)
}

// Service wraps the existing quote service: it reuses quotes/quote_categories
// (via CreateQuote/UpdateQuote/AdminListQuotes/CreateCategory) instead of a
// dedicated table.
type Service struct {
	quotes    quoteservice.Service
	generator Generator

	// Single-process cache-aside lock: collapses concurrent requests on the
	// first hit of a new day into one DeepSeek call + one DB write. Good
	// enough for this backend's current single-instance deployment (see
	// docker-compose.yml) — a horizontally-scaled deployment would need a DB
	// unique constraint or advisory lock instead.
	mu sync.Mutex
}

func New(quotes quoteservice.Service, generator Generator) *Service {
	return &Service{quotes: quotes, generator: generator}
}

// GetToday returns today's AI quote, generating (and caching) it on the
// first call of the day.
func (s *Service) GetToday(ctx context.Context) (dto.QuoteDTO, error) {
	const op = "dailyquote.GetToday"

	if !s.generator.Enabled() {
		return dto.QuoteDTO{}, richerror.New(op).WithMessage("جملهٔ روزانه فعال نیست")
	}

	today := time.Now().Format("2006-01-02")

	if cached, ok, err := s.findCached(ctx, today); err != nil {
		return dto.QuoteDTO{}, richerror.New(op).WithErr(err)
	} else if ok {
		return cached, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Re-check now that we hold the lock — another request may have
	// generated today's quote while we were waiting for it.
	if cached, ok, err := s.findCached(ctx, today); err != nil {
		return dto.QuoteDTO{}, richerror.New(op).WithErr(err)
	} else if ok {
		return cached, nil
	}

	return s.generate(ctx, today)
}

func (s *Service) findCached(ctx context.Context, today string) (dto.QuoteDTO, bool, error) {
	all, err := s.quotes.AdminListQuotes(ctx)
	if err != nil {
		return dto.QuoteDTO{}, false, err
	}
	for _, q := range all.Quotes {
		if q.CategoryID == categoryID && q.IsActive && q.Source == today {
			return q, true, nil
		}
	}
	return dto.QuoteDTO{}, false, nil
}

func (s *Service) generate(ctx context.Context, today string) (dto.QuoteDTO, error) {
	const op = "dailyquote.generate"

	// Idempotent upsert — cheap, and guarantees the category exists before
	// the app ever asks for /quote-categories.
	if _, err := s.quotes.CreateCategory(ctx, dto.UpsertCategoryRequest{
		ID: categoryID, Title: categoryTitle, Sort: -1,
	}); err != nil {
		return dto.QuoteDTO{}, richerror.New(op).WithErr(err)
	}

	line1, line2, err := s.generator.GenerateQuote(ctx, buildPrompt(today))
	if err != nil {
		return dto.QuoteDTO{}, richerror.New(op).WithErr(err)
	}

	// Deactivate any previous day's AI quote(s) so only today's shows up.
	all, err := s.quotes.AdminListQuotes(ctx)
	if err != nil {
		return dto.QuoteDTO{}, richerror.New(op).WithErr(err)
	}
	for _, q := range all.Quotes {
		if q.CategoryID == categoryID && q.IsActive {
			if _, err := s.quotes.UpdateQuote(ctx, q.ID, dto.UpsertQuoteRequest{
				CategoryID: q.CategoryID, Line1: q.Line1, Line2: q.Line2,
				Source: q.Source, SortOrder: q.SortOrder, IsActive: false,
			}); err != nil {
				return dto.QuoteDTO{}, richerror.New(op).WithErr(err)
			}
		}
	}

	created, err := s.quotes.CreateQuote(ctx, dto.UpsertQuoteRequest{
		CategoryID: categoryID,
		Line1:      line1,
		Line2:      line2,
		Source:     today,
		SortOrder:  0,
	})
	if err != nil {
		return dto.QuoteDTO{}, richerror.New(op).WithErr(err)
	}
	return created.Quote, nil
}

func buildPrompt(today string) string {
	t, _ := time.Parse("2006-01-02", today)
	month := t.Month().String()
	return fmt.Sprintf(
		"Today's date is %s (month: %s). Write today's quote — something fitting a quiet, reflective moment of the day/season, not tied to any specific news event.",
		today, month,
	)
}
