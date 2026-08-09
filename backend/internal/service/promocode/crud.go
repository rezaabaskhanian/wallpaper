package promocodeservice

import (
	"context"

	domain "wallpaperstore/internal/domain/promocode"
	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/promocode/dto"
)

func (s Service) AdminListPromoCodes(ctx context.Context) (dto.ListPromoCodesResponse, error) {
	const op = "promocodeservice.AdminListPromoCodes"
	ps, err := s.repo.GetAll(ctx)
	if err != nil {
		return dto.ListPromoCodesResponse{}, richerror.New(op).WithErr(err)
	}
	out := make([]dto.PromoCodeDTO, 0, len(ps))
	for _, p := range ps {
		out = append(out, toDTO(p))
	}
	return dto.ListPromoCodesResponse{PromoCodes: out}, nil
}

func (s Service) CreatePromoCode(ctx context.Context, req dto.UpsertPromoCodeRequest) (dto.PromoCodeResponse, error) {
	const op = "promocodeservice.CreatePromoCode"
	p, err := domain.New(req.ID, req.Code, true)
	if err != nil {
		return dto.PromoCodeResponse{}, richerror.New(op).WithErr(err).WithMessage("مشکل در ساخت کد تخفیف")
	}
	created, err := s.repo.Save(ctx, p)
	if err != nil {
		return dto.PromoCodeResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.PromoCodeResponse{PromoCode: toDTO(created)}, nil
}

func (s Service) UpdatePromoCode(ctx context.Context, id string, req dto.UpsertPromoCodeRequest) (dto.PromoCodeResponse, error) {
	const op = "promocodeservice.UpdatePromoCode"
	p, err := domain.New(id, req.Code, req.IsActive)
	if err != nil {
		return dto.PromoCodeResponse{}, richerror.New(op).WithErr(err).WithMessage("مشکل در ویرایش کد تخفیف")
	}
	updated, err := s.repo.Update(ctx, p)
	if err != nil {
		return dto.PromoCodeResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.PromoCodeResponse{PromoCode: toDTO(updated)}, nil
}

func (s Service) DeletePromoCode(ctx context.Context, id string) error {
	const op = "promocodeservice.DeletePromoCode"
	if err := s.repo.Delete(ctx, id); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return nil
}
