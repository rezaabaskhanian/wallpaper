package martyrservice

import (
	"context"

	domain "wallpaperstore/internal/domain/martyr"
	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/martyr/dto"
)

// ListMartyrs لیست شهدای فعال برای اپ (مرتب‌شده بر اساس sortOrder).
func (s Service) ListMartyrs(ctx context.Context) (dto.ListMartyrsResponse, error) {
	const op = "martyrservice.ListMartyrs"

	ms, err := s.repo.GetActiveMartyrs(ctx)
	if err != nil {
		return dto.ListMartyrsResponse{}, richerror.New(op).WithErr(err)
	}

	out := make([]dto.MartyrDTO, 0, len(ms))
	for _, m := range ms {
		out = append(out, toDTO(m))
	}
	return dto.ListMartyrsResponse{Martyrs: out}, nil
}

// AdminListMartyrs لیست کامل شهدا (شامل غیرفعال‌ها) برای پنل ادمین.
func (s Service) AdminListMartyrs(ctx context.Context) (dto.ListMartyrsResponse, error) {
	const op = "martyrservice.AdminListMartyrs"

	ms, err := s.repo.GetAllMartyrs(ctx)
	if err != nil {
		return dto.ListMartyrsResponse{}, richerror.New(op).WithErr(err)
	}

	out := make([]dto.MartyrDTO, 0, len(ms))
	for _, m := range ms {
		out = append(out, toDTO(m))
	}
	return dto.ListMartyrsResponse{Martyrs: out}, nil
}

// CreateMartyr افزودن شهید جدید (همیشه فعال ساخته می‌شود).
func (s Service) CreateMartyr(ctx context.Context, req dto.UpsertMartyrRequest) (dto.MartyrResponse, error) {
	const op = "martyrservice.CreateMartyr"

	m, err := domain.New(req.ID, req.Name, req.Martyrdom, req.Born, req.MartyredOn, req.Place, req.Will, req.Photo, req.SortOrder, true)
	if err != nil {
		return dto.MartyrResponse{}, richerror.New(op).WithErr(err).WithMessage("مشکل در ساخت شهید")
	}

	created, err := s.repo.SaveMartyr(ctx, m)
	if err != nil {
		return dto.MartyrResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.MartyrResponse{Martyr: toDTO(created)}, nil
}

// UpdateMartyr ویرایش یک شهید موجود.
func (s Service) UpdateMartyr(ctx context.Context, id string, req dto.UpsertMartyrRequest) (dto.MartyrResponse, error) {
	const op = "martyrservice.UpdateMartyr"

	m, err := domain.New(id, req.Name, req.Martyrdom, req.Born, req.MartyredOn, req.Place, req.Will, req.Photo, req.SortOrder, req.IsActive)
	if err != nil {
		return dto.MartyrResponse{}, richerror.New(op).WithErr(err).WithMessage("مشکل در ویرایش شهید")
	}

	updated, err := s.repo.UpdateMartyr(ctx, m)
	if err != nil {
		return dto.MartyrResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.MartyrResponse{Martyr: toDTO(updated)}, nil
}

// DeleteMartyr حذف کامل یک شهید.
func (s Service) DeleteMartyr(ctx context.Context, id string) error {
	const op = "martyrservice.DeleteMartyr"

	if err := s.repo.DeleteMartyr(ctx, id); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return nil
}
