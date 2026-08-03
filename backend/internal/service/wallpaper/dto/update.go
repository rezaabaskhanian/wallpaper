package dto

// UpdateWallpaperRequest ورودی ویرایش والپیپر (ادمین). id از مسیر URL می‌آید.
type UpdateWallpaperRequest struct {
	Title    string `json:"title"`
	Category string `json:"category"`
	Premium  bool   `json:"premium"`
	Thumb    string `json:"thumb"`
	Full     string `json:"full"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	Bytes    int64  `json:"bytes"`
	IsActive bool   `json:"isActive"`
}

type UpdateWallpaperResponse struct {
	Wallpaper WallpaperDTO `json:"wallpaper"`
}

// UpdateCategoryRequest ورودی ویرایش دسته (ادمین). id از مسیر URL می‌آید.
type UpdateCategoryRequest struct {
	Title string `json:"title"`
	Sort  int    `json:"sort"`
}

type UpdateCategoryResponse struct {
	Category CategoryDTO `json:"category"`
}

// AdminListWallpapersResponse خروجی لیست کامل والپیپرها برای ادمین (شامل غیرفعال‌ها).
type AdminListWallpapersResponse struct {
	Wallpapers []WallpaperDTO `json:"wallpapers"`
}

// AdminListCategoriesResponse خروجی لیست کامل دسته‌ها برای ادمین.
type AdminListCategoriesResponse struct {
	Categories []CategoryDTO `json:"categories"`
}
