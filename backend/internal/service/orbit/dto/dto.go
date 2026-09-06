package dto

// CategoryDTO خروجی یک دسته‌ی اوربیت.
type CategoryDTO struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Sort         int    `json:"sort"`
	CenterImage  string `json:"centerImage,omitempty"`
	CenterTitle  string `json:"centerTitle,omitempty"`
	CenterSlogan string `json:"centerSlogan,omitempty"`
}

// ItemDTO خروجی یک آیتم در حال چرخش.
type ItemDTO struct {
	ID         string `json:"id"`
	CategoryID string `json:"categoryId"`
	Label      string `json:"label"`
	Image      string `json:"image"`
	Sort       int    `json:"sort"`
	IsActive   bool   `json:"isActive"`
}

// OrbitCatalogResponse پاسخ اندپوینت عمومی GET /api/v1/orbit-catalog.
type OrbitCatalogResponse struct {
	Categories []CategoryDTO `json:"categories"`
	Items      []ItemDTO     `json:"items"`
}

// UpsertCategoryRequest ورودی افزودن/ویرایش دسته (ادمین).
type UpsertCategoryRequest struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Sort         int    `json:"sort"`
	CenterImage  string `json:"centerImage"`
	CenterTitle  string `json:"centerTitle"`
	CenterSlogan string `json:"centerSlogan"`
}

type CategoryResponse struct {
	Category CategoryDTO `json:"category"`
}

// AdminListCategoriesResponse خروجی لیست کامل دسته‌های اوربیت برای ادمین.
type AdminListCategoriesResponse struct {
	Categories []CategoryDTO `json:"categories"`
}

// UpsertItemRequest ورودی افزودن/ویرایش آیتم اوربیت (ادمین).
type UpsertItemRequest struct {
	ID         string `json:"id"`
	CategoryID string `json:"categoryId"`
	Label      string `json:"label"`
	Image      string `json:"image"`
	Sort       int    `json:"sort"`
	IsActive   bool   `json:"isActive"`
}

type ItemResponse struct {
	Item ItemDTO `json:"item"`
}

// AdminListItemsResponse خروجی لیست کامل آیتم‌های اوربیت (شامل غیرفعال‌ها) برای ادمین.
type AdminListItemsResponse struct {
	Items []ItemDTO `json:"items"`
}
