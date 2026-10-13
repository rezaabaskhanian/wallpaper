package occasion

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Occasion یک مناسبت (محرم، نوروز، یلدا…). اپ DaysBefore روز قبل از Date یک
// یادآور محلی نشان می‌دهد که دسته‌ی CategoryID را در گالری باز می‌کند.
type Occasion struct {
	ID          string
	Title       string
	Date        time.Time // فقط روز مهم است (میلادی، به وقت تهران)
	CategoryID  string
	NotifyTitle string
	NotifyBody  string
	DaysBefore  int
	IsActive    bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// DateLayout قالب تاریخ در API (YYYY-MM-DD).
const DateLayout = "2006-01-02"

var (
	ErrEmptyTitle     = errors.New("نام مناسبت نمی‌تواند خالی باشد")
	ErrBadDate        = errors.New("تاریخ باید به شکل YYYY-MM-DD باشد")
	ErrBadDaysBefore  = errors.New("یادآوری باید بین ۰ تا ۳۰ روز قبل باشد")
	maxDaysBefore     = 30
	defaultDaysBefore = 3
)

// New ساخت/اعتبارسنجی یک مناسبت. date به شکل YYYY-MM-DD است؛ اگر عنوان یا متن
// یادآور خالی باشد، از نام مناسبت ساخته می‌شود.
func New(o Occasion, date string) (Occasion, error) {
	o.Title = strings.TrimSpace(o.Title)
	if o.Title == "" {
		return Occasion{}, ErrEmptyTitle
	}
	d, err := time.Parse(DateLayout, strings.TrimSpace(date))
	if err != nil {
		return Occasion{}, ErrBadDate
	}
	o.Date = d
	if o.DaysBefore < 0 || o.DaysBefore > maxDaysBefore {
		return Occasion{}, ErrBadDaysBefore
	}
	o.CategoryID = strings.TrimSpace(o.CategoryID)
	o.NotifyTitle = strings.TrimSpace(o.NotifyTitle)
	o.NotifyBody = strings.TrimSpace(o.NotifyBody)
	if o.NotifyTitle == "" {
		o.NotifyTitle = "والپیپرهای " + o.Title + " اضافه شد"
	}
	if o.NotifyBody == "" {
		o.NotifyBody = "بزن و والپیپر " + o.Title + " رو روی گوشیت بذار."
	}
	if o.ID == "" {
		o.ID = uuid.NewString()
	}
	return o, nil
}

// DefaultDaysBefore وقتی ادمین چیزی نفرستد.
func DefaultDaysBefore() int { return defaultDaysBefore }
