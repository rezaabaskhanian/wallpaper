package hero

import "time"

// Hero تنظیمات تک‌ردیفه‌ی رهبر/شخصیت مرکزی (نام، شعار، عکس).
type Hero struct {
	Title     string
	Slogan    string
	Image     string
	UpdatedAt time.Time
}
