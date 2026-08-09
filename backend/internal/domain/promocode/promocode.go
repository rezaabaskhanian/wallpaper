package promocode

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

// PromoCode یک کد تخفیف است که با وارد کردن آن، والپیپرهای پرمیوم برای کاربر باز می‌شود.
type PromoCode struct {
	ID        string
	Code      string
	IsActive  bool
	UsedCount int
	CreatedAt time.Time
	UpdatedAt time.Time
}

var ErrEmptyCode = errors.New("کد تخفیف نمی‌تواند خالی باشد")

// New ساخت یک کد تخفیف جدید. کد به‌صورت یکدست (trim + uppercase) نرمال می‌شود.
// اگر id خالی باشد، یک UUID ساخته می‌شود.
func New(id, code string, isActive bool) (PromoCode, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	if code == "" {
		return PromoCode{}, ErrEmptyCode
	}

	if id == "" {
		id = uuid.NewString()
	}

	now := time.Now()
	return PromoCode{
		ID:        id,
		Code:      code,
		IsActive:  isActive,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}
