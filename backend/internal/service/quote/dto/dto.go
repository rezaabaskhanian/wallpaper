package dto

type QuoteDTO struct {
	ID         string `json:"id"`
	CategoryID string `json:"categoryId"`
	Line1      string `json:"line1"`
	Line2      string `json:"line2"`
	Source     string `json:"source"`
	SortOrder  int    `json:"sortOrder"`
	IsActive   bool   `json:"isActive"`
}

type ListQuotesResponse struct {
	Quotes []QuoteDTO `json:"quotes"`
}

type UpsertQuoteRequest struct {
	ID         string `json:"id"`
	CategoryID string `json:"categoryId"`
	Line1      string `json:"line1"`
	Line2      string `json:"line2"`
	Source     string `json:"source"`
	SortOrder  int    `json:"sortOrder"`
	IsActive   bool   `json:"isActive"`
}

type QuoteResponse struct {
	Quote QuoteDTO `json:"quote"`
}

// CategoryDTO خروجی یک دسته‌ی نقل‌قول.
type CategoryDTO struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Sort  int    `json:"sort"`
}

// UpsertCategoryRequest ورودی افزودن/ویرایش دسته (ادمین).
type UpsertCategoryRequest struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Sort  int    `json:"sort"`
}

type CategoryResponse struct {
	Category CategoryDTO `json:"category"`
}

// ListCategoriesResponse خروجی لیست دسته‌های نقل‌قول (عمومی و ادمین).
type ListCategoriesResponse struct {
	Categories []CategoryDTO `json:"categories"`
}
