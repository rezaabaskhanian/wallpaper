package themeservice

import (
	"context"

	domain "wallpaperstore/internal/domain/theme"
	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/theme/dto"
)

type Repository interface {
	GetAll(ctx context.Context, onlyActive bool) ([]domain.Theme, error)
	Save(ctx context.Context, t domain.Theme) (domain.Theme, error)
	Update(ctx context.Context, t domain.Theme) (domain.Theme, error)
	Delete(ctx context.Context, id string) error
}

type Service struct {
	repo Repository
}

func New(repo Repository) Service {
	return Service{repo: repo}
}

func toDTO(t domain.Theme) dto.ThemeDTO {
	return dto.ThemeDTO{
		ID:            t.ID,
		Title:         t.Title,
		WallpaperURL:  t.WallpaperURL,
		WidgetBgSmall: t.WidgetBgSmall,
		WidgetBgWide:  t.WidgetBgWide,
		TextColor:     t.TextColor,
		AccentColor:   t.AccentColor,
		IsPremium:     t.IsPremium,
		Sort:          t.Sort,
		IsActive:      t.IsActive,
	}
}

func fromRequest(id string, req dto.UpsertThemeRequest) domain.Theme {
	return domain.Theme{
		ID:            id,
		Title:         req.Title,
		WallpaperURL:  req.WallpaperURL,
		WidgetBgSmall: req.WidgetBgSmall,
		WidgetBgWide:  req.WidgetBgWide,
		TextColor:     req.TextColor,
		AccentColor:   req.AccentColor,
		IsPremium:     req.IsPremium,
		Sort:          req.Sort,
		IsActive:      req.IsActive,
	}
}

func (s Service) list(ctx context.Context, op richerror.Op, onlyActive bool) (dto.ListThemesResponse, error) {
	ts, err := s.repo.GetAll(ctx, onlyActive)
	if err != nil {
		return dto.ListThemesResponse{}, richerror.New(op).WithErr(err)
	}
	out := make([]dto.ThemeDTO, 0, len(ts))
	for _, t := range ts {
		out = append(out, toDTO(t))
	}
	return dto.ListThemesResponse{Themes: out}, nil
}

// ListThemes تم‌های فعال برای اپ، به ترتیب sort.
func (s Service) ListThemes(ctx context.Context) (dto.ListThemesResponse, error) {
	return s.list(ctx, "themeservice.ListThemes", true)
}

// AdminListThemes همه‌ی تم‌ها (شامل غیرفعال‌ها) برای پنل ادمین.
func (s Service) AdminListThemes(ctx context.Context) (dto.ListThemesResponse, error) {
	return s.list(ctx, "themeservice.AdminListThemes", false)
}

func (s Service) CreateTheme(ctx context.Context, req dto.UpsertThemeRequest) (dto.ThemeResponse, error) {
	const op = "themeservice.CreateTheme"
	t, err := domain.New(fromRequest(req.ID, req))
	if err != nil {
		return dto.ThemeResponse{}, richerror.New(op).WithErr(err).WithMessage(err.Error())
	}
	created, err := s.repo.Save(ctx, t)
	if err != nil {
		return dto.ThemeResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.ThemeResponse{Theme: toDTO(created)}, nil
}

func (s Service) UpdateTheme(ctx context.Context, id string, req dto.UpsertThemeRequest) (dto.ThemeResponse, error) {
	const op = "themeservice.UpdateTheme"
	t, err := domain.New(fromRequest(id, req))
	if err != nil {
		return dto.ThemeResponse{}, richerror.New(op).WithErr(err).WithMessage(err.Error())
	}
	updated, err := s.repo.Update(ctx, t)
	if err != nil {
		return dto.ThemeResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.ThemeResponse{Theme: toDTO(updated)}, nil
}

func (s Service) DeleteTheme(ctx context.Context, id string) error {
	const op = "themeservice.DeleteTheme"
	if err := s.repo.Delete(ctx, id); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return nil
}
