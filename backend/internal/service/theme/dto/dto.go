package dto

// ThemeDTO خروجی یک تم برای اپ و ادمین.
type ThemeDTO struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	WallpaperURL  string `json:"wallpaperUrl"`
	WidgetBgSmall string `json:"widgetBgSmall"`
	WidgetBgWide  string `json:"widgetBgWide"`
	TextColor     string `json:"textColor"`
	AccentColor   string `json:"accentColor"`
	IsPremium     bool   `json:"isPremium"`
	Sort          int    `json:"sort"`
	IsActive      bool   `json:"isActive"`
}

type ListThemesResponse struct {
	Themes []ThemeDTO `json:"themes"`
}

// UpsertThemeRequest ورودی ساخت/ویرایش تم (ادمین). در ویرایش، id از مسیر می‌آید.
type UpsertThemeRequest struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	WallpaperURL  string `json:"wallpaperUrl"`
	WidgetBgSmall string `json:"widgetBgSmall"`
	WidgetBgWide  string `json:"widgetBgWide"`
	TextColor     string `json:"textColor"`
	AccentColor   string `json:"accentColor"`
	IsPremium     bool   `json:"isPremium"`
	Sort          int    `json:"sort"`
	IsActive      bool   `json:"isActive"`
}

type ThemeResponse struct {
	Theme ThemeDTO `json:"theme"`
}
