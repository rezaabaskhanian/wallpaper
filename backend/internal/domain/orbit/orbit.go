package orbit

import (
	"errors"

	"github.com/google/uuid"
)

// Category یک «تم» برای لوگوهای دور عکسِ مرکزیِ صفحه اصلی (مثل «شهدا» یا «طبیعت»).
// اگر CenterImage خالی باشد، اپ از عکس/عنوان رهبر (Hero) استفاده می‌کند.
type Category struct {
	ID           string // slug مثل "shohada"
	Title        string
	Sort         int
	CenterImage  string
	CenterTitle  string
	CenterSlogan string
}

// Item یک آیتمِ در حال چرخش (عکس + برچسب) متعلق به یک Category.
type Item struct {
	ID         string
	CategoryID string
	Label      string
	Image      string
	Sort       int
	IsActive   bool
}

var (
	ErrEmptyCategoryID    = errors.New("شناسه‌ی دسته الزامی است")
	ErrEmptyCategoryTitle = errors.New("عنوان دسته نمی‌تواند خالی باشد")
	ErrEmptyItemCategory  = errors.New("دسته‌ی آیتم الزامی است")
	ErrEmptyItemLabel     = errors.New("برچسب آیتم نمی‌تواند خالی باشد")
	ErrEmptyItemImage     = errors.New("تصویر آیتم الزامی است")
)

// NewCategory ساخت/ویرایش یک دسته‌ی اوربیت.
func NewCategory(id, title string, sort int, centerImage, centerTitle, centerSlogan string) (Category, error) {
	if id == "" {
		return Category{}, ErrEmptyCategoryID
	}
	if title == "" {
		return Category{}, ErrEmptyCategoryTitle
	}
	return Category{
		ID:           id,
		Title:        title,
		Sort:         sort,
		CenterImage:  centerImage,
		CenterTitle:  centerTitle,
		CenterSlogan: centerSlogan,
	}, nil
}

// NewItem ساخت/ویرایش یک آیتم اوربیت. اگر id خالی باشد، یک UUID ساخته می‌شود.
func NewItem(id, categoryID, label, image string, sort int, isActive bool) (Item, error) {
	if categoryID == "" {
		return Item{}, ErrEmptyItemCategory
	}
	if label == "" {
		return Item{}, ErrEmptyItemLabel
	}
	if image == "" {
		return Item{}, ErrEmptyItemImage
	}
	if id == "" {
		id = uuid.NewString()
	}
	return Item{ID: id, CategoryID: categoryID, Label: label, Image: image, Sort: sort, IsActive: isActive}, nil
}
