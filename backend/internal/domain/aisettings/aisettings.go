package aisettings

import "time"

// AISettings تنظیمات تک‌ردیفه‌ی سه‌کلید هوش‌مصنوعی برای فیچر ساخت والپیپر با AI.
type AISettings struct {
	ClaudeAPIKey       string
	GeminiAPIKey       string
	DeepSeekAPIKey     string
	EnrichmentProvider string // "none" | "claude" | "deepseek"
	PricePerImageToman int
	UpdatedAt          time.Time
}
