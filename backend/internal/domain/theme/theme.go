package theme

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Theme یک والپیپر به‌اضافه‌ی تصویر پس‌زمینه‌ی ویجت‌های صفحه‌ی اصلی با همان طرح
// و رنگ. ظاهر ویجت‌ها از همین تصویرها می‌آید؛ اپ فقط متن یا عکس را رویش می‌گذارد.
type Theme struct {
	ID            string
	Title         string
	WallpaperURL  string
	WidgetBgSmall string // پس‌زمینه‌ی ویجت ۲×۲
	WidgetBgWide  string // پس‌زمینه‌ی ویجت ۴×۲
	TextColor     string // #RRGGBB یا #AARRGGBB
	AccentColor   string
	IsPremium     bool // فعلاً فقط فیلد است؛ پرداختی پشتش نیست
	Sort          int
	IsActive      bool
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

var (
	ErrEmptyTitle     = errors.New("نام تم نمی‌تواند خالی باشد")
	ErrEmptyWallpaper = errors.New("آدرس والپیپر تم الزامی است")
	ErrBadColor       = errors.New("رنگ باید به شکل #RRGGBB باشد")
)

var colorRe = regexp.MustCompile(`^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$`)

// New ساخت/اعتبارسنجی یک تم. اگر id خالی باشد، UUID ساخته می‌شود؛ رنگ‌های خالی
// پیش‌فرض می‌گیرند.
func New(t Theme) (Theme, error) {
	t.Title = strings.TrimSpace(t.Title)
	t.WallpaperURL = strings.TrimSpace(t.WallpaperURL)
	if t.Title == "" {
		return Theme{}, ErrEmptyTitle
	}
	if t.WallpaperURL == "" {
		return Theme{}, ErrEmptyWallpaper
	}
	if t.TextColor == "" {
		t.TextColor = "#FFFFFF"
	}
	if t.AccentColor == "" {
		t.AccentColor = "#F5E6B3"
	}
	if !colorRe.MatchString(t.TextColor) || !colorRe.MatchString(t.AccentColor) {
		return Theme{}, ErrBadColor
	}
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	return t, nil
}
