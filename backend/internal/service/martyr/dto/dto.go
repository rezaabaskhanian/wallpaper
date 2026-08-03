package dto

// MartyrDTO خروجی یک شهید.
type MartyrDTO struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Martyrdom  string `json:"martyrdom"`
	Born       string `json:"born"`
	MartyredOn string `json:"martyredOn"`
	Place      string `json:"place"`
	Will       string `json:"will"`
	Photo      string `json:"photo"`
	SortOrder  int    `json:"sortOrder"`
	IsActive   bool   `json:"isActive"`
}

// ListMartyrsResponse پاسخ اندپوینت عمومی GET /api/v1/martyrs.
type ListMartyrsResponse struct {
	Martyrs []MartyrDTO `json:"martyrs"`
}

// UpsertMartyrRequest ورودی افزودن/ویرایش شهید (ادمین).
type UpsertMartyrRequest struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Martyrdom  string `json:"martyrdom"`
	Born       string `json:"born"`
	MartyredOn string `json:"martyredOn"`
	Place      string `json:"place"`
	Will       string `json:"will"`
	Photo      string `json:"photo"`
	SortOrder  int    `json:"sortOrder"`
	IsActive   bool   `json:"isActive"`
}

type MartyrResponse struct {
	Martyr MartyrDTO `json:"martyr"`
}
