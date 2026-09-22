// Package aigenerateservice فیچر «ساخت والپیپر با توضیح متنی» را پیاده می‌کند:
// اولین تولید هر دستگاه رایگان است (ردیابی با device id، نه AsyncStorage سمت
// کلاینت)؛ بعد از آن باید بسته‌ی اعتبار مصرفی «ai_credits» را از بازار بخرد
// (هر بسته ۳۰ عکس — ببینید skuCredits) و هر تولید یک واحد از موجودی کم می‌کند.
package aigenerateservice

import (
	"context"
	"errors"
	"fmt"

	logdomain "wallpaperstore/internal/domain/aigenerationlog"
	domain "wallpaperstore/internal/domain/aisettings"
	"wallpaperstore/internal/pkg/logger"
	"wallpaperstore/internal/pkg/richerror"

	"github.com/google/uuid"
)

// ErrNoCredits یعنی این دستگاه هم سهمیه‌ی رایگانش را مصرف کرده و هم موجودی
// اعتباری ندارد — باید یکی از SKUهای skuCredits را بخرد.
var ErrNoCredits = errors.New("سهمیه‌ی رایگان و موجودی اعتبار این دستگاه به پایان رسیده است")

// skuCredits تعداد عکسی که هر SKU مصرفی بازار می‌دهد. فقط یک بسته فعلاً
// تعریف شده؛ بسته‌های بیشتر (مثلاً قیمت‌های مختلف) فقط یک ردیف دیگر لازم دارند.
var skuCredits = map[string]int{
	"ai_credits": 30,
}

type AISettingsRepository interface {
	GetAISettings(ctx context.Context) (domain.AISettings, error)
}

type UsageRepository interface {
	HasUsedFree(ctx context.Context, deviceID string) (bool, error)
	MarkFreeUsed(ctx context.Context, deviceID string) error
	GetCredits(ctx context.Context, deviceID string) (int, error)
	DeductCredit(ctx context.Context, deviceID string) (bool, error)
	HasRedeemedPurchase(ctx context.Context, purchaseToken string) (bool, error)
	AddCredits(ctx context.Context, deviceID, purchaseToken, sku string, amount int) error
	// SaveGenerationLog تاریخچه‌ی هزینه/توکن این تولید را ثبت می‌کند — best-effort
	// از GenerateImage صدا زده می‌شود، شکستش نباید کل درخواست را fail کند.
	SaveGenerationLog(ctx context.Context, log logdomain.GenerationLog) error
	ListGenerationLogs(ctx context.Context, limit, offset int) (logdomain.Page, error)
}

// BazaarValidator را internal/pkg/cafebazaar.Client برآورده می‌کند.
type BazaarValidator interface {
	Enabled() bool
	ValidatePurchase(ctx context.Context, productID, purchaseToken string) error
}

// ImageGenerationResult تصویر تولیدشده و تعداد توکن مصرف‌شده (طبق usageMetadata
// پاسخ Gemini) را برمی‌گرداند — برای محاسبه‌ی هزینه‌ی واقعی هر تولید.
type ImageGenerationResult struct {
	ImageBytes   []byte
	PromptTokens int
	OutputTokens int
	TotalTokens  int
}

// ImageGenerator با یک adapter نازک در main.go روی gemini.Client پیاده می‌شود —
// تنها ارائه‌دهنده‌ای که واقعاً عکس می‌سازد.
type ImageGenerator interface {
	Enabled() bool
	GenerateImage(ctx context.Context, prompt string) (ImageGenerationResult, error)
}

// EnrichmentProvider را claude.Client و deepseek.Client هر دو برآورده می‌کنند —
// فقط برای بهتر/دقیق‌کردن prompt پیش از تولید عکس، نه تولید خودِ عکس.
type EnrichmentProvider interface {
	Enabled() bool
	EnrichPrompt(ctx context.Context, prompt string) (string, error)
}

// Uploader را internal/pkg/objectstorage.Client برآورده می‌کند.
type Uploader interface {
	UploadBytes(ctx context.Context, key string, data []byte, contentType string) (string, error)
}

// EnrichmentProviders سازنده‌های claude/deepseek را نگه می‌دارد تا سرویس بتواند
// بر اساس تنظیمات ادمین (EnrichmentProvider) یکی را انتخاب کند — کلید API هر دو
// از دیتابیس (ai_settings) می‌آید، نه از کانفیگ استاتیک، پس نمی‌شود در main.go
// یک‌بار برای همیشه ساختشان؛ به‌جایش یک تابع سازنده تزریق می‌شود.
type EnrichmentProviders struct {
	NewClaude   func(apiKey string) EnrichmentProvider
	NewDeepSeek func(apiKey string) EnrichmentProvider
}

// ImageGeneratorFactory جمینای را با کلید فعلی از دیتابیس می‌سازد — به همان دلیل بالا.
type ImageGeneratorFactory func(apiKey string) ImageGenerator

type Service struct {
	aiSettingsRepo AISettingsRepository
	usageRepo      UsageRepository
	bazaar         BazaarValidator
	storage        Uploader
	newImageGen    ImageGeneratorFactory
	enrichment     EnrichmentProviders
}

func New(
	aiSettingsRepo AISettingsRepository,
	usageRepo UsageRepository,
	bazaar BazaarValidator,
	storage Uploader,
	newImageGen ImageGeneratorFactory,
	enrichment EnrichmentProviders,
) Service {
	return Service{
		aiSettingsRepo: aiSettingsRepo,
		usageRepo:      usageRepo,
		bazaar:         bazaar,
		storage:        storage,
		newImageGen:    newImageGen,
		enrichment:     enrichment,
	}
}

// GenerateImage عکس را از روی prompt متنی کاربر می‌سازد و URL عمومی‌اش را برمی‌گرداند.
func (s Service) GenerateImage(ctx context.Context, deviceID, prompt string) (string, error) {
	const op = "aigenerateservice.GenerateImage"

	if deviceID == "" {
		return "", richerror.New(op).WithMessage("شناسه‌ی دستگاه ارسال نشده است")
	}
	if prompt == "" {
		return "", richerror.New(op).WithMessage("توضیح والپیپر خالی است")
	}

	usedFree, err := s.usageRepo.HasUsedFree(ctx, deviceID)
	if err != nil {
		return "", richerror.New(op).WithErr(err)
	}

	// اگر سهمیه‌ی رایگان مصرف شده، باید از موجودی اعتبار خریداری‌شده کم شود —
	// پیش از تولید چک می‌کنیم تا هزینه‌ی واقعی (تماس به Gemini) برای درخواستی
	// که قطعاً رد می‌شود پرداخت نشود.
	usingCredit := false
	if usedFree {
		credits, err := s.usageRepo.GetCredits(ctx, deviceID)
		if err != nil {
			return "", richerror.New(op).WithErr(err)
		}
		if credits <= 0 {
			return "", ErrNoCredits
		}
		usingCredit = true
	}

	settings, err := s.aiSettingsRepo.GetAISettings(ctx)
	if err != nil {
		return "", richerror.New(op).WithErr(err)
	}

	imageGen := s.newImageGen(settings.GeminiAPIKey)
	if !imageGen.Enabled() {
		return "", richerror.New(op).WithMessage("فیچر ساخت والپیپر با AI هنوز فعال نشده است")
	}

	finalPrompt := s.enrichPrompt(ctx, settings, prompt)

	genResult, err := imageGen.GenerateImage(ctx, finalPrompt)
	if err != nil {
		return "", richerror.New(op).WithErr(err)
	}

	key := fmt.Sprintf("ai/%s.png", uuid.NewString())
	imageURL, err := s.storage.UploadBytes(ctx, key, genResult.ImageBytes, "image/png")
	if err != nil {
		return "", richerror.New(op).WithErr(err).WithMessage("آپلود عکس تولیدشده ممکن نشد")
	}

	s.logGeneration(ctx, deviceID, prompt, imageURL, settings, genResult)

	if usingCredit {
		deducted, err := s.usageRepo.DeductCredit(ctx, deviceID)
		if err != nil {
			return "", richerror.New(op).WithErr(err)
		}
		if !deducted {
			// race: موجودی بین چک اولیه و همین لحظه توسط یک درخواست موازی صفر شده.
			return "", ErrNoCredits
		}
	} else if err := s.usageRepo.MarkFreeUsed(ctx, deviceID); err != nil {
		return "", richerror.New(op).WithErr(err)
	}

	return imageURL, nil
}

// logGeneration هزینه‌ی واقعی این تولید را از روی توکن مصرف‌شده و نرخ ذخیره‌شده
// در ai_settings حساب و در ai_generation_logs ثبت می‌کند. best-effort است: عکس
// از قبل آپلود و تحویل کاربر شده، پس شکست ثبت لاگ نباید کل درخواست را fail کند.
func (s Service) logGeneration(
	ctx context.Context, deviceID, prompt, imageURL string, settings domain.AISettings, gen ImageGenerationResult,
) {
	costUSD := (float64(gen.PromptTokens)/1_000_000)*settings.GeminiInputPriceUsdPerMTok +
		(float64(gen.OutputTokens)/1_000_000)*settings.GeminiOutputPriceUsdPerMTok
	costToman := int64(costUSD * settings.UsdToTomanRate)

	err := s.usageRepo.SaveGenerationLog(ctx, logdomain.GenerationLog{
		DeviceID:     deviceID,
		Prompt:       prompt,
		ImageURL:     imageURL,
		PromptTokens: gen.PromptTokens,
		OutputTokens: gen.OutputTokens,
		TotalTokens:  gen.TotalTokens,
		CostUSD:      costUSD,
		CostToman:    costToman,
	})
	if err != nil {
		logger.L().Error("failed to save ai generation log", "err", err, "deviceId", deviceID)
	}
}

// ListGenerationLogs تاریخچه‌ی هزینه/توکن تولیدها را برای نمایش در پنل ادمین
// برمی‌گرداند (صفحه‌بندی‌شده، همراه با جمع کل هزینه/توکن مستقل از صفحه‌بندی).
func (s Service) ListGenerationLogs(ctx context.Context, limit, offset int) (logdomain.Page, error) {
	const op = "aigenerateservice.ListGenerationLogs"
	page, err := s.usageRepo.ListGenerationLogs(ctx, limit, offset)
	if err != nil {
		return logdomain.Page{}, richerror.New(op).WithErr(err)
	}
	return page, nil
}

// RedeemCredits بعد از خریدِ SKU مصرفی «ai_credits» در اپ صدا زده می‌شود:
// خرید را سمت سرور بازار تایید می‌کند و در صورت تایید، اعتبار را به موجودی
// دستگاه اضافه می‌کند. idempotent است — اگر همین purchaseToken قبلاً شارژ
// شده باشد (مثلاً به‌خاطر قطعی شبکه دوباره ارسال شده)، بدون خطا همان مقدار را برمی‌گرداند.
func (s Service) RedeemCredits(ctx context.Context, deviceID, sku, purchaseToken string) (int, error) {
	const op = "aigenerateservice.RedeemCredits"

	if deviceID == "" || purchaseToken == "" {
		return 0, richerror.New(op).WithMessage("درخواست نامعتبر است")
	}
	amount, ok := skuCredits[sku]
	if !ok {
		return 0, richerror.New(op).WithMessage("SKU نامعتبر است")
	}
	if !s.bazaar.Enabled() {
		return 0, richerror.New(op).WithMessage("تایید خرید هنوز سمت سرور تنظیم نشده است")
	}

	already, err := s.usageRepo.HasRedeemedPurchase(ctx, purchaseToken)
	if err != nil {
		return 0, richerror.New(op).WithErr(err)
	}
	if already {
		return amount, nil
	}

	if err := s.bazaar.ValidatePurchase(ctx, sku, purchaseToken); err != nil {
		return 0, richerror.New(op).WithErr(err).WithMessage("تایید خرید ناموفق بود")
	}

	if err := s.usageRepo.AddCredits(ctx, deviceID, purchaseToken, sku, amount); err != nil {
		return 0, richerror.New(op).WithErr(err)
	}

	return amount, nil
}

// enrichPrompt تلاش می‌کند prompt را با کلود یا دیپ‌سیک (طبق انتخاب ادمین) بهتر
// کند — best-effort: اگر غنی‌سازی شکست بخورد یا غیرفعال باشد، همان prompt خام
// کاربر استفاده می‌شود تا کل درخواست fail نشود.
func (s Service) enrichPrompt(ctx context.Context, settings domain.AISettings, prompt string) string {
	var provider EnrichmentProvider
	switch settings.EnrichmentProvider {
	case "claude":
		if settings.ClaudeAPIKey != "" && s.enrichment.NewClaude != nil {
			provider = s.enrichment.NewClaude(settings.ClaudeAPIKey)
		}
	case "deepseek":
		if settings.DeepSeekAPIKey != "" && s.enrichment.NewDeepSeek != nil {
			provider = s.enrichment.NewDeepSeek(settings.DeepSeekAPIKey)
		}
	}
	if provider == nil || !provider.Enabled() {
		return prompt
	}

	enriched, err := provider.EnrichPrompt(ctx, prompt)
	if err != nil || enriched == "" {
		return prompt
	}
	return enriched
}
