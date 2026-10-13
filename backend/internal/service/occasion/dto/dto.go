package dto

// OccasionDTO خروجی یک مناسبت برای اپ و ادمین. date به شکل YYYY-MM-DD است.
type OccasionDTO struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Date        string `json:"date"`
	CategoryID  string `json:"categoryId"`
	NotifyTitle string `json:"notifyTitle"`
	NotifyBody  string `json:"notifyBody"`
	DaysBefore  int    `json:"daysBefore"`
	IsActive    bool   `json:"isActive"`
}

type ListOccasionsResponse struct {
	Occasions []OccasionDTO `json:"occasions"`
}

// UpsertOccasionRequest ورودی ساخت/ویرایش (ادمین). در ویرایش، id از مسیر می‌آید.
type UpsertOccasionRequest struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Date        string `json:"date"`
	CategoryID  string `json:"categoryId"`
	NotifyTitle string `json:"notifyTitle"`
	NotifyBody  string `json:"notifyBody"`
	DaysBefore  *int   `json:"daysBefore"`
	IsActive    bool   `json:"isActive"`
}

type OccasionResponse struct {
	Occasion OccasionDTO `json:"occasion"`
}
