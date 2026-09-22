package aisettings

import "time"

// AISettings تنظیمات تک‌ردیفه‌ی سه‌کلید هوش‌مصنوعی برای فیچر ساخت والپیپر با AI.
type AISettings struct {
	ClaudeAPIKey       string
	GeminiAPIKey       string
	DeepSeekAPIKey     string
	EnrichmentProvider string // "none" | "claude" | "deepseek"
	PricePerImageToman int
	// GeminiInputPriceUsdPerMTok/GeminiOutputPriceUsdPerMTok نرخ رسمی گوگل برای
	// هر ۱ میلیون توکن ورودی/خروجی مدل gemini-2.5-flash-image است — برای
	// محاسبه‌ی هزینه‌ی واقعیِ هر تولید از روی usageMetadata پاسخ Gemini
	// (ببینید aigenerateservice.GenerateImage). چون این نرخ‌ها و نرخ دلار به
	// تومان تغییر می‌کنند، هاردکد نشده‌اند و از پنل ادمین قابل ویرایش‌اند.
	GeminiInputPriceUsdPerMTok  float64
	GeminiOutputPriceUsdPerMTok float64
	UsdToTomanRate              float64
	UpdatedAt                   time.Time
}
