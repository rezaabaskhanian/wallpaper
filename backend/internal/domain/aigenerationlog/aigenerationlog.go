// Package aigenerationlog تاریخچه‌ی هر تولید عکس با AI را نگه می‌دارد — چند
// توکن مصرف شد و بر اساس نرخ تنظیم‌شده در ai_settings چقدر هزینه (واقعی) داشت.
// این جدا از ai_generation_usage است: آن یکی سهمیه/اعتبار هر دستگاه را ردیابی
// می‌کند، این یکی صرفاً یک لاگ append-only برای گزارش هزینه در پنل ادمین است.
package aigenerationlog

import "time"

type GenerationLog struct {
	ID           int64
	DeviceID     string
	Prompt       string
	ImageURL     string
	PromptTokens int
	OutputTokens int
	TotalTokens  int
	CostUSD      float64
	CostToman    int64
	CreatedAt    time.Time
}

// Page یک صفحه از تاریخچه به‌همراه جمع کل (برای نمایش «مجموع هزینه تا الان»
// در پنل ادمین، مستقل از صفحه‌بندی).
type Page struct {
	Logs           []GenerationLog
	TotalCount     int64
	TotalCostUSD   float64
	TotalCostToman int64
	TotalTokens    int64
}
