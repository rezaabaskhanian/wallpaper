// Package appevent رویدادهای آنالیتیکس اپ را تعریف می‌کند: «باز شدن اپ» و
// «تنظیم موفق والپیپر» برای سنجیدن اثر هر نسخه روی ماندگاری، و سه رویداد قیف
// لانچر (پیشنهاد نشان داده شد → «امتحان می‌کنم» → واقعاً لانچر پیش‌فرض شد).
package appevent

import (
	"errors"
	"strings"
)

const (
	EventAppOpen      = "app_open"
	EventWallpaperSet = "wallpaper_set"

	EventLauncherIntroShown    = "launcher_intro_shown"
	EventLauncherIntroAccepted = "launcher_intro_accepted"
	EventLauncherEnabled       = "launcher_enabled"
)

// maxFieldLen سقف طول هر فیلد متنی؛ اندپوینت عمومی است و نباید بشود با آن
// رشته‌های بزرگ در دیتابیس نوشت.
const maxFieldLen = 64

var (
	validMethods = map[string]bool{"live": true, "home": true, "lock": true, "both": true}
	validSources = map[string]bool{"onetap": true, "settings": true, "gallery": true, "mood": true}
)

type Event struct {
	DeviceID   string
	Event      string
	AppVersion string
	// Method و Source فقط برای wallpaper_set پر می‌شوند: والپیپر چطور (لایو/اصلی/
	// قفل/هر دو) و از کجا (دکمه‌ی یک‌مرحله‌ای، تنظیمات، گالری) تنظیم شد.
	Method string
	Source string
}

func New(deviceID, event, appVersion, method, source string) (Event, error) {
	e := Event{
		DeviceID:   strings.TrimSpace(deviceID),
		Event:      event,
		AppVersion: strings.TrimSpace(appVersion),
	}
	if e.DeviceID == "" || len(e.DeviceID) > maxFieldLen || len(e.AppVersion) > maxFieldLen {
		return Event{}, errors.New("invalid device id or app version")
	}
	switch event {
	case EventAppOpen, EventLauncherIntroShown, EventLauncherIntroAccepted, EventLauncherEnabled:
		return e, nil
	case EventWallpaperSet:
		if !validMethods[method] || !validSources[source] {
			return Event{}, errors.New("invalid wallpaper method or source")
		}
		e.Method, e.Source = method, source
		return e, nil
	default:
		return Event{}, errors.New("unknown event")
	}
}
