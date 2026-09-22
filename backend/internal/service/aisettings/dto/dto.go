package dto

// AISettingsDTO هیچ‌وقت کلید کامل را برنمی‌گرداند — فقط اینکه ست شده یا نه و
// ۴ کاراکتر آخرش (برای تشخیص «همینه که فکر می‌کردم» توسط ادمین).
type AISettingsDTO struct {
	ClaudeKeySet       bool   `json:"claudeKeySet"`
	ClaudeKeyMasked    string `json:"claudeKeyMasked"`
	GeminiKeySet       bool   `json:"geminiKeySet"`
	GeminiKeyMasked    string `json:"geminiKeyMasked"`
	DeepSeekKeySet     bool   `json:"deepSeekKeySet"`
	DeepSeekKeyMasked  string `json:"deepSeekKeyMasked"`
	EnrichmentProvider string `json:"enrichmentProvider"`
	PricePerImageToman int    `json:"pricePerImageToman"`
	// نرخ‌های زیر برای محاسبه‌ی هزینه‌ی واقعی (نه قیمت فروش) هر تولید، از روی
	// توکن مصرف‌شده‌ی مدل gemini-2.5-flash-image استفاده می‌شوند — ببینید
	// aigenerateservice.logGeneration و صفحه‌ی تاریخچه در پنل ادمین.
	GeminiInputPriceUsdPerMTok  float64 `json:"geminiInputPriceUsdPerMTok"`
	GeminiOutputPriceUsdPerMTok float64 `json:"geminiOutputPriceUsdPerMTok"`
	UsdToTomanRate              float64 `json:"usdToTomanRate"`
}

type AISettingsResponse struct {
	Settings AISettingsDTO `json:"settings"`
}

// UpdateAISettingsRequest — هر فیلد کلید که خالی باشد یعنی «بدون تغییر»،
// چون در GET هیچ‌وقت کلید کامل به فرانت برنمی‌گردد که دوباره ارسالش کند.
type UpdateAISettingsRequest struct {
	ClaudeAPIKey                string  `json:"claudeApiKey"`
	GeminiAPIKey                string  `json:"geminiApiKey"`
	DeepSeekAPIKey              string  `json:"deepSeekApiKey"`
	EnrichmentProvider          string  `json:"enrichmentProvider"`
	PricePerImageToman          int     `json:"pricePerImageToman"`
	GeminiInputPriceUsdPerMTok  float64 `json:"geminiInputPriceUsdPerMTok"`
	GeminiOutputPriceUsdPerMTok float64 `json:"geminiOutputPriceUsdPerMTok"`
	UsdToTomanRate              float64 `json:"usdToTomanRate"`
}
