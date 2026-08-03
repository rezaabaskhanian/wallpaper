package dto

// CreateWallpaperRequest ورودی افزودن والپیپر (ادمین). اگر id خالی باشد، سرور UUID می‌سازد.
type CreateWallpaperRequest struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Category string `json:"category"`
	Premium  bool   `json:"premium"`
	Thumb    string `json:"thumb"`
	Full     string `json:"full"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	Bytes    int64  `json:"bytes"`
}

type CreateWallpaperResponse struct {
	Wallpaper WallpaperDTO `json:"wallpaper"`
}

// CreateCategoryRequest ورودی افزودن دسته (ادمین).
type CreateCategoryRequest struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Sort  int    `json:"sort"`
}

type CreateCategoryResponse struct {
	Category CategoryDTO `json:"category"`
}
