package quote

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// Quote یک نقل‌قول نمایش داده‌شده در پایین صفحه.
type Quote struct {
	ID        string
	Line1     string // خط کوچک بالا (اختیاری)
	Line2     string // خط اصلی طلایی (اجباری)
	Source    string // مناسبت/تاریخ، فقط مرجع داخلی
	SortOrder int
	IsActive  bool
	CreatedAt time.Time
	UpdatedAt time.Time
}

var ErrEmptyLine2 = errors.New("خط اصلی نقل‌قول نمی‌تواند خالی باشد")

// New ساخت یک نقل‌قول جدید. اگر id خالی باشد، یک UUID ساخته می‌شود.
func New(id, line1, line2, source string, sortOrder int, isActive bool) (Quote, error) {
	if line2 == "" {
		return Quote{}, ErrEmptyLine2
	}

	if id == "" {
		id = uuid.NewString()
	}

	now := time.Now()
	return Quote{
		ID:        id,
		Line1:     line1,
		Line2:     line2,
		Source:    source,
		SortOrder: sortOrder,
		IsActive:  isActive,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}
