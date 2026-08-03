package dto

// CategoryDTO خروجی یک دسته در کاتالوگ.
type CategoryDTO struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

// WallpaperDTO خروجی یک والپیپر در کاتالوگ (دقیقاً مطابق چیزی که کلاینت انتظار دارد).
type WallpaperDTO struct {
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

// CatalogResponse پاسخ اندپوینت GET /api/v1/catalog.
type CatalogResponse struct {
	Version    int            `json:"version"`
	Categories []CategoryDTO  `json:"categories"`
	Wallpapers []WallpaperDTO `json:"wallpapers"`
}
