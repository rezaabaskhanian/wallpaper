package promocodeservice

import (
	"context"
	"errors"
	"strings"

	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/promocode/dto"

	"github.com/jackc/pgx/v5"
)

// RedeemCode یک کد را بررسی می‌کند: اگر معتبر و فعال باشد، شمارندهٔ استفاده را
// افزایش می‌دهد و موفقیت برمی‌گرداند تا سمت اپ، والپیپرهای پرمیوم را باز کند.
// کد نامعتبر/غیرفعال یک خطای فنی نیست — با Success=false و پیام مناسب برگردانده می‌شود.
func (s Service) RedeemCode(ctx context.Context, req dto.RedeemRequest) (dto.RedeemResponse, error) {
	const op = "promocodeservice.RedeemCode"

	code := strings.ToUpper(strings.TrimSpace(req.Code))
	if code == "" {
		return dto.RedeemResponse{Success: false, Message: "کد تخفیف را وارد کنید"}, nil
	}

	p, err := s.repo.GetByCode(ctx, code)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.RedeemResponse{Success: false, Message: "کد تخفیف نامعتبر است"}, nil
		}
		return dto.RedeemResponse{}, richerror.New(op).WithErr(err)
	}

	if !p.IsActive {
		return dto.RedeemResponse{Success: false, Message: "این کد تخفیف غیرفعال شده است"}, nil
	}

	if err := s.repo.IncrementUsedCount(ctx, p.ID); err != nil {
		return dto.RedeemResponse{}, richerror.New(op).WithErr(err)
	}

	return dto.RedeemResponse{Success: true, Message: "کد با موفقیت فعال شد؛ همهٔ والپیپرهای پرمیوم باز شدند"}, nil
}
