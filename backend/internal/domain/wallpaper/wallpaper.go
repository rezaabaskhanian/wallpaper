package wallpaper

import (
	"errors"
	"time"

	wallpapervalueobject "wallpaperstore/internal/domain/wallpaper/valueobject"
)

// Wallpaper یک والپیپر قابل دانلود در کاتالوگ.
type Wallpaper struct {
	ID        wallpapervalueobject.WallpaperID
	Title     string
	Category  string // شناسه‌ی دسته (slug)
	Premium   bool   // false = رایگان، true = پشت خرید «باز کردن همه»
	Thumb     string // آدرس تصویر کوچک (grid)
	Full      string // آدرس تصویر باکیفیت (اعمال والپیپر)
	Width     int
	Height    int
	Bytes     int64
	IsActive  bool
	CreatedAt time.Time
	UpdatedAt time.Time
}

// Category دسته‌بندی والپیپرها (برای فیلتر در گالری).
type Category struct {
	ID    string // slug مثل "shohada"
	Title string
	Sort  int
}

// خطاهای دامنه‌ی والپیپر
var (
	ErrEmptyTitle    = errors.New("عنوان والپیپر نمی‌تواند خالی باشد")
	ErrEmptyCategory = errors.New("دسته‌بندی والپیپر الزامی است")
	ErrEmptyImage    = errors.New("آدرس تصویر (thumb/full) الزامی است")
)

// NewWallpaper ساخت والپیپر جدید (برای ادمین). اگر id خالی باشد، یک UUID ساخته می‌شود.
func NewWallpaper(
	id string,
	title string,
	category string,
	thumb string,
	full string,
	premium bool,
	width int,
	height int,
	bytes int64,
) (Wallpaper, error) {
	if len(title) == 0 {
		return Wallpaper{}, ErrEmptyTitle
	}
	if len(category) == 0 {
		return Wallpaper{}, ErrEmptyCategory
	}
	if len(thumb) == 0 || len(full) == 0 {
		return Wallpaper{}, ErrEmptyImage
	}

	wid := wallpapervalueobject.WallpaperID(id)
	if id == "" {
		wid = wallpapervalueobject.NewWallpaperID()
	}

	now := time.Now()
	return Wallpaper{
		ID:        wid,
		Title:     title,
		Category:  category,
		Premium:   premium,
		Thumb:     thumb,
		Full:      full,
		Width:     width,
		Height:    height,
		Bytes:     bytes,
		IsActive:  true,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// NewCategory ساخت دسته‌بندی جدید.
func NewCategory(id string, title string, sort int) (Category, error) {
	if id == "" {
		return Category{}, ErrEmptyCategory
	}
	if title == "" {
		return Category{}, ErrEmptyTitle
	}
	return Category{ID: id, Title: title, Sort: sort}, nil
}
