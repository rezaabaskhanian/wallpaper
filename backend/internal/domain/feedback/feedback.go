// Package feedback «درخواست و رأی»: درخواست والپیپر از طرف کاربر، رأی‌گیری
// بین چند دسته، و «صندوق خبر» هر دستگاه که می‌گوید چه چیزی برایش آماده شد.
package feedback

import (
	"errors"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	StatusPending  = "pending"
	StatusDone     = "done"
	StatusRejected = "rejected"

	MinTextLen = 2
	MaxTextLen = 100
	// MaxRequestsPerDay سقف درخواست هر دستگاه در ۲۴ ساعت (اندپوینت عمومی است).
	MaxRequestsPerDay = 3
	MaxDeviceIDLen    = 64

	MinPollOptions = 2
	MaxPollOptions = 4
)

var (
	ErrBadDevice     = errors.New("شناسه‌ی دستگاه نامعتبر است")
	ErrBadText       = errors.New("متن درخواست باید بین ۲ تا ۱۰۰ حرف باشد")
	ErrTooMany       = errors.New("امروز به‌اندازه‌ی کافی درخواست دادی؛ فردا دوباره امتحان کن")
	ErrBadStatus     = errors.New("وضعیت نامعتبر است")
	ErrBadQuestion   = errors.New("سؤال رأی‌گیری نمی‌تواند خالی باشد")
	ErrBadOptions    = errors.New("رأی‌گیری باید ۲ تا ۴ گزینه‌ی غیرخالی داشته باشد")
	ErrPollNotActive = errors.New("این رأی‌گیری بسته شده است")
	ErrBadOption     = errors.New("این گزینه در این رأی‌گیری نیست")
)

type Request struct {
	ID         string
	DeviceID   string
	Text       string
	Status     string
	CategoryID string
	// Reply جواب کوتاه ادمین؛ اگر باشد، متن نوتیفیکیشن همین می‌شود.
	Reply     string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// MaxReplyLen سقف طول جواب ادمین (یک نوتیفیکیشن است، نه نامه).
const MaxReplyLen = 200

// DeviceStats خلاصه‌ی فعالیت یک دستگاه از روی رویدادهای آنالیتیکس.
type DeviceStats struct {
	FirstSeen     *time.Time
	LastSeen      *time.Time
	AppVersion    string
	Opens         int
	WallpaperSets int
	PollVotes     int
}

type PollOption struct {
	ID         string
	PollID     string
	Title      string
	CategoryID string
	Sort       int
	Votes      int // فقط در خواندن پر می‌شود
}

type Poll struct {
	ID             string
	Question       string
	IsActive       bool
	WinnerOptionID *string
	Options        []PollOption
	CreatedAt      time.Time
	ClosedAt       *time.Time
}

// InboxMessage خبری برای یک دستگاه: درخواستش انجام شد یا گزینه‌ی برنده‌ی
// رأی‌گیری‌ای که در آن شرکت کرده اضافه شد.
type InboxMessage struct {
	ID         string
	Title      string
	Body       string
	CategoryID string
}

func ValidDevice(id string) bool {
	id = strings.TrimSpace(id)
	return id != "" && len(id) <= MaxDeviceIDLen
}

// NormalizeText متن درخواست را مرتب و اعتبارسنجی می‌کند.
func NormalizeText(text string) (string, error) {
	t := strings.Join(strings.Fields(text), " ")
	n := utf8.RuneCountInString(t)
	if n < MinTextLen || n > MaxTextLen {
		return "", ErrBadText
	}
	return t, nil
}

func ValidStatus(s string) bool {
	return s == StatusPending || s == StatusDone || s == StatusRejected
}

// NewPoll سؤال و گزینه‌ها را اعتبارسنجی می‌کند (گزینه‌های خالی حذف می‌شوند).
func NewPoll(question string, options []PollOption) (Poll, error) {
	q := strings.TrimSpace(question)
	if q == "" {
		return Poll{}, ErrBadQuestion
	}
	opts := make([]PollOption, 0, len(options))
	for _, o := range options {
		o.Title = strings.TrimSpace(o.Title)
		if o.Title == "" {
			continue
		}
		o.CategoryID = strings.TrimSpace(o.CategoryID)
		o.Sort = len(opts)
		opts = append(opts, o)
	}
	if len(opts) < MinPollOptions || len(opts) > MaxPollOptions {
		return Poll{}, ErrBadOptions
	}
	return Poll{Question: q, IsActive: true, Options: opts}, nil
}
