package aisettingsservice

import (
	"context"

	domain "wallpaperstore/internal/domain/aisettings"
	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/aisettings/dto"
)

type Repository interface {
	GetAISettings(ctx context.Context) (domain.AISettings, error)
	SaveAISettings(ctx context.Context, s domain.AISettings) (domain.AISettings, error)
}

type Service struct {
	repo Repository
}

func New(repo Repository) Service {
	return Service{repo: repo}
}

// mask آخرین ۴ کاراکتر کلید را برمی‌گرداند تا ادمین بدون افشای کلید کامل
// بفهمد کدوم کلید ذخیره شده — کلید خالی یعنی اصلاً ست نشده.
func mask(key string) (set bool, masked string) {
	if key == "" {
		return false, ""
	}
	if len(key) <= 4 {
		return true, "••••"
	}
	return true, "••••" + key[len(key)-4:]
}

func toDTO(s domain.AISettings) dto.AISettingsDTO {
	claudeSet, claudeMasked := mask(s.ClaudeAPIKey)
	geminiSet, geminiMasked := mask(s.GeminiAPIKey)
	deepseekSet, deepseekMasked := mask(s.DeepSeekAPIKey)
	return dto.AISettingsDTO{
		ClaudeKeySet:                claudeSet,
		ClaudeKeyMasked:             claudeMasked,
		GeminiKeySet:                geminiSet,
		GeminiKeyMasked:             geminiMasked,
		DeepSeekKeySet:              deepseekSet,
		DeepSeekKeyMasked:           deepseekMasked,
		EnrichmentProvider:          s.EnrichmentProvider,
		PricePerImageToman:          s.PricePerImageToman,
		GeminiInputPriceUsdPerMTok:  s.GeminiInputPriceUsdPerMTok,
		GeminiOutputPriceUsdPerMTok: s.GeminiOutputPriceUsdPerMTok,
		UsdToTomanRate:              s.UsdToTomanRate,
	}
}

func (s Service) GetSettings(ctx context.Context) (dto.AISettingsResponse, error) {
	const op = "aisettingsservice.GetSettings"
	settings, err := s.repo.GetAISettings(ctx)
	if err != nil {
		return dto.AISettingsResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.AISettingsResponse{Settings: toDTO(settings)}, nil
}

// UpdateSettings هر فیلد کلید خالی را با مقدار فعلی در دیتابیس جای‌گزین می‌کند
// (یعنی «بدون تغییر») — فقط فیلدهای غیرخالی واقعاً به‌روزرسانی می‌شوند.
func (s Service) UpdateSettings(ctx context.Context, req dto.UpdateAISettingsRequest) (dto.AISettingsResponse, error) {
	const op = "aisettingsservice.UpdateSettings"

	current, err := s.repo.GetAISettings(ctx)
	if err != nil {
		return dto.AISettingsResponse{}, richerror.New(op).WithErr(err)
	}

	updated := domain.AISettings{
		ClaudeAPIKey:                current.ClaudeAPIKey,
		GeminiAPIKey:                current.GeminiAPIKey,
		DeepSeekAPIKey:              current.DeepSeekAPIKey,
		EnrichmentProvider:          req.EnrichmentProvider,
		PricePerImageToman:          req.PricePerImageToman,
		GeminiInputPriceUsdPerMTok:  req.GeminiInputPriceUsdPerMTok,
		GeminiOutputPriceUsdPerMTok: req.GeminiOutputPriceUsdPerMTok,
		UsdToTomanRate:              req.UsdToTomanRate,
	}
	if req.ClaudeAPIKey != "" {
		updated.ClaudeAPIKey = req.ClaudeAPIKey
	}
	if req.GeminiAPIKey != "" {
		updated.GeminiAPIKey = req.GeminiAPIKey
	}
	if req.DeepSeekAPIKey != "" {
		updated.DeepSeekAPIKey = req.DeepSeekAPIKey
	}

	saved, err := s.repo.SaveAISettings(ctx, updated)
	if err != nil {
		return dto.AISettingsResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.AISettingsResponse{Settings: toDTO(saved)}, nil
}
