package heroservice

import (
	"context"

	domain "wallpaperstore/internal/domain/hero"
	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/hero/dto"
)

type Repository interface {
	GetHero(ctx context.Context) (domain.Hero, error)
	SaveHero(ctx context.Context, h domain.Hero) (domain.Hero, error)
}

type Service struct {
	repo Repository
}

func New(repo Repository) Service {
	return Service{repo: repo}
}

func toDTO(h domain.Hero) dto.HeroDTO {
	return dto.HeroDTO{Title: h.Title, Slogan: h.Slogan, Image: h.Image}
}

func (s Service) GetHero(ctx context.Context) (dto.HeroResponse, error) {
	const op = "heroservice.GetHero"
	h, err := s.repo.GetHero(ctx)
	if err != nil {
		return dto.HeroResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.HeroResponse{Hero: toDTO(h)}, nil
}

func (s Service) UpdateHero(ctx context.Context, req dto.UpsertHeroRequest) (dto.HeroResponse, error) {
	const op = "heroservice.UpdateHero"
	h := domain.Hero{Title: req.Title, Slogan: req.Slogan, Image: req.Image}
	updated, err := s.repo.SaveHero(ctx, h)
	if err != nil {
		return dto.HeroResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.HeroResponse{Hero: toDTO(updated)}, nil
}
