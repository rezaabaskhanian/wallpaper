package martyr

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// Martyr یک شهید در گالری اوربیت اپ.
type Martyr struct {
	ID         string
	Name       string
	Martyrdom  string // شرح نحوه‌ی شهادت
	Born       string
	MartyredOn string
	Place      string
	Will       string // بخشی از وصیت‌نامه (اختیاری)
	Photo      string // آدرس عکس
	SortOrder  int
	IsActive   bool
	CategoryID string // اختیاری؛ خالی یعنی بدون دسته (شناسه MartyrCategory)
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

// MartyrCategory یک دسته‌بندی برای گروه‌بندی شهدا در پنل ادمین (مثل «شهدای هسته‌ای»).
type MartyrCategory struct {
	ID        string
	Title     string
	SortOrder int
}

var (
	ErrEmptyName          = errors.New("نام شهید نمی‌تواند خالی باشد")
	ErrEmptyMartyrdom     = errors.New("شرح نحوه‌ی شهادت الزامی است")
	ErrEmptyCategoryTitle = errors.New("عنوان دسته نمی‌تواند خالی باشد")
)

// New ساخت یک شهید جدید. اگر id خالی باشد، یک UUID ساخته می‌شود.
func New(
	id, name, martyrdom, born, martyredOn, place, will, photo, categoryID string,
	sortOrder int,
	isActive bool,
) (Martyr, error) {
	if name == "" {
		return Martyr{}, ErrEmptyName
	}
	if martyrdom == "" {
		return Martyr{}, ErrEmptyMartyrdom
	}

	if id == "" {
		id = uuid.NewString()
	}

	now := time.Now()
	return Martyr{
		ID:         id,
		Name:       name,
		Martyrdom:  martyrdom,
		Born:       born,
		MartyredOn: martyredOn,
		Place:      place,
		Will:       will,
		Photo:      photo,
		SortOrder:  sortOrder,
		IsActive:   isActive,
		CategoryID: categoryID,
		CreatedAt:  now,
		UpdatedAt:  now,
	}, nil
}

// NewCategory ساخت یک دسته‌بندی شهدا. اگر id خالی باشد، یک UUID ساخته می‌شود.
func NewCategory(id, title string, sortOrder int) (MartyrCategory, error) {
	if title == "" {
		return MartyrCategory{}, ErrEmptyCategoryTitle
	}
	if id == "" {
		id = uuid.NewString()
	}
	return MartyrCategory{ID: id, Title: title, SortOrder: sortOrder}, nil
}
