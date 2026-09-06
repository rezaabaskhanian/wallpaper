package quote

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// Quote یک نقل‌قول نمایش داده‌شده در پایین صفحه.
type Quote struct {
	ID         string
	CategoryID string // دسته‌ی نقل‌قول، مثل «حدیث» یا «بیانات رهبر»
	Line1      string // خط کوچک بالا (اختیاری)
	Line2      string // خط اصلی طلایی (اجباری)
	Source     string // مناسبت/تاریخ، فقط مرجع داخلی
	SortOrder  int
	IsActive   bool
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

// Category یک دسته‌ی نقل‌قول (مثل «احادیث»، «بیانات رهبر»، «جملات انگیزشی»).
type Category struct {
	ID    string // slug مثل "hadith"
	Title string
	Sort  int
}

var (
	ErrEmptyLine2         = errors.New("خط اصلی نقل‌قول نمی‌تواند خالی باشد")
	ErrEmptyCategoryID    = errors.New("شناسه‌ی دسته الزامی است")
	ErrEmptyCategoryTitle = errors.New("عنوان دسته نمی‌تواند خالی باشد")
	ErrEmptyQuoteCategory = errors.New("دسته‌ی نقل‌قول الزامی است")
)

// New ساخت یک نقل‌قول جدید. اگر id خالی باشد، یک UUID ساخته می‌شود.
func New(id, categoryID, line1, line2, source string, sortOrder int, isActive bool) (Quote, error) {
	if categoryID == "" {
		return Quote{}, ErrEmptyQuoteCategory
	}
	if line2 == "" {
		return Quote{}, ErrEmptyLine2
	}

	if id == "" {
		id = uuid.NewString()
	}

	now := time.Now()
	return Quote{
		ID:         id,
		CategoryID: categoryID,
		Line1:      line1,
		Line2:      line2,
		Source:     source,
		SortOrder:  sortOrder,
		IsActive:   isActive,
		CreatedAt:  now,
		UpdatedAt:  now,
	}, nil
}

// NewCategory ساخت/ویرایش یک دسته‌ی نقل‌قول.
func NewCategory(id, title string, sort int) (Category, error) {
	if id == "" {
		return Category{}, ErrEmptyCategoryID
	}
	if title == "" {
		return Category{}, ErrEmptyCategoryTitle
	}
	return Category{ID: id, Title: title, Sort: sort}, nil
}
