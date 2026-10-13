package occasionservice

import (
	"context"
	"time"

	domain "wallpaperstore/internal/domain/occasion"
	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/occasion/dto"
)

type Repository interface {
	// GetAll همه‌ی مناسبت‌ها؛ اگر from صفر نباشد فقط فعال‌های از آن روز به بعد.
	GetAll(ctx context.Context, activeFrom time.Time) ([]domain.Occasion, error)
	Save(ctx context.Context, o domain.Occasion) (domain.Occasion, error)
	Update(ctx context.Context, o domain.Occasion) (domain.Occasion, error)
	Delete(ctx context.Context, id string) error
}

type Service struct {
	repo Repository
	now  func() time.Time
}

func New(repo Repository) Service {
	return Service{repo: repo, now: time.Now}
}

// recentDays مناسبت‌هایی که تا این چند روز پیش بوده‌اند هنوز به اپ داده می‌شوند
// تا کارت ویترینی گالری روز مناسبت و کمی بعدش هم بماند.
const recentDays = 3

func toDTO(o domain.Occasion) dto.OccasionDTO {
	return dto.OccasionDTO{
		ID:          o.ID,
		Title:       o.Title,
		Date:        o.Date.Format(domain.DateLayout),
		CategoryID:  o.CategoryID,
		NotifyTitle: o.NotifyTitle,
		NotifyBody:  o.NotifyBody,
		DaysBefore:  o.DaysBefore,
		IsActive:    o.IsActive,
	}
}

func fromRequest(id string, req dto.UpsertOccasionRequest) domain.Occasion {
	days := domain.DefaultDaysBefore()
	if req.DaysBefore != nil {
		days = *req.DaysBefore
	}
	return domain.Occasion{
		ID:          id,
		Title:       req.Title,
		CategoryID:  req.CategoryID,
		NotifyTitle: req.NotifyTitle,
		NotifyBody:  req.NotifyBody,
		DaysBefore:  days,
		IsActive:    req.IsActive,
	}
}

func (s Service) list(ctx context.Context, op richerror.Op, from time.Time) (dto.ListOccasionsResponse, error) {
	os, err := s.repo.GetAll(ctx, from)
	if err != nil {
		return dto.ListOccasionsResponse{}, richerror.New(op).WithErr(err)
	}
	out := make([]dto.OccasionDTO, 0, len(os))
	for _, o := range os {
		out = append(out, toDTO(o))
	}
	return dto.ListOccasionsResponse{Occasions: out}, nil
}

// ListOccasions مناسبت‌های فعالِ پیش‌رو (و چند روز اخیر) برای اپ.
func (s Service) ListOccasions(ctx context.Context) (dto.ListOccasionsResponse, error) {
	from := s.now().AddDate(0, 0, -recentDays)
	return s.list(ctx, "occasionservice.ListOccasions", from)
}

// AdminListOccasions همه‌ی مناسبت‌ها برای پنل ادمین.
func (s Service) AdminListOccasions(ctx context.Context) (dto.ListOccasionsResponse, error) {
	return s.list(ctx, "occasionservice.AdminListOccasions", time.Time{})
}

func (s Service) CreateOccasion(ctx context.Context, req dto.UpsertOccasionRequest) (dto.OccasionResponse, error) {
	const op = "occasionservice.CreateOccasion"
	o, err := domain.New(fromRequest(req.ID, req), req.Date)
	if err != nil {
		return dto.OccasionResponse{}, richerror.New(op).WithErr(err).WithMessage(err.Error())
	}
	created, err := s.repo.Save(ctx, o)
	if err != nil {
		return dto.OccasionResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.OccasionResponse{Occasion: toDTO(created)}, nil
}

func (s Service) UpdateOccasion(ctx context.Context, id string, req dto.UpsertOccasionRequest) (dto.OccasionResponse, error) {
	const op = "occasionservice.UpdateOccasion"
	o, err := domain.New(fromRequest(id, req), req.Date)
	if err != nil {
		return dto.OccasionResponse{}, richerror.New(op).WithErr(err).WithMessage(err.Error())
	}
	updated, err := s.repo.Update(ctx, o)
	if err != nil {
		return dto.OccasionResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.OccasionResponse{Occasion: toDTO(updated)}, nil
}

func (s Service) DeleteOccasion(ctx context.Context, id string) error {
	const op = "occasionservice.DeleteOccasion"
	if err := s.repo.Delete(ctx, id); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return nil
}
