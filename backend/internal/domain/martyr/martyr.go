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
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

var (
	ErrEmptyName      = errors.New("نام شهید نمی‌تواند خالی باشد")
	ErrEmptyMartyrdom = errors.New("شرح نحوه‌ی شهادت الزامی است")
)

// New ساخت یک شهید جدید. اگر id خالی باشد، یک UUID ساخته می‌شود.
func New(
	id, name, martyrdom, born, martyredOn, place, will, photo string,
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
		CreatedAt:  now,
		UpdatedAt:  now,
	}, nil
}
