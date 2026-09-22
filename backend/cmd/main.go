package main

import (
	"time"

	"wallpaperstore/internal/config"
	"wallpaperstore/internal/delivery/httpserver"
	"wallpaperstore/internal/pkg/cafebazaar"
	"wallpaperstore/internal/pkg/claude"
	"wallpaperstore/internal/pkg/deepseek"
	"wallpaperstore/internal/pkg/gemini"
	"wallpaperstore/internal/pkg/httpproxy"
	"wallpaperstore/internal/pkg/logger"
	"wallpaperstore/internal/pkg/objectstorage"
	"wallpaperstore/internal/repository/migrator"
	"wallpaperstore/internal/repository/postgres"
	postgresaigeneration "wallpaperstore/internal/repository/postgres/aigeneration"
	postgresaisettings "wallpaperstore/internal/repository/postgres/aisettings"
	postgreshero "wallpaperstore/internal/repository/postgres/hero"
	postgresmartyr "wallpaperstore/internal/repository/postgres/martyr"
	postgresorbit "wallpaperstore/internal/repository/postgres/orbit"
	postgrespromocode "wallpaperstore/internal/repository/postgres/promocode"
	postgresquote "wallpaperstore/internal/repository/postgres/quote"
	postgreswallpaper "wallpaperstore/internal/repository/postgres/wallpaper"
	aigenerateservice "wallpaperstore/internal/service/aigenerate"
	aiproxyservice "wallpaperstore/internal/service/aiproxy"
	aisettingsservice "wallpaperstore/internal/service/aisettings"
	dailyquoteservice "wallpaperstore/internal/service/dailyquote"
	heroservice "wallpaperstore/internal/service/hero"
	martyrservice "wallpaperstore/internal/service/martyr"
	orbitservice "wallpaperstore/internal/service/orbit"
	promocodeservice "wallpaperstore/internal/service/promocode"
	quoteservice "wallpaperstore/internal/service/quote"
	wallpaperservice "wallpaperstore/internal/service/wallpaper"
)

func main() {
	// کانفیگ از متغیرهای محیطی (12-Factor) با مقادیر پیش‌فرض
	cfg := config.Load()

	logger.Init()

	// مهاجرت‌ها: در development خودکار، و در production فقط با فلگ RUN_MIGRATIONS=true
	m := migrator.New(cfg.MyPostgres)
	if !config.IsProduction() || config.RunMigrations() {
		m.Up()
	}

	logger.L().Info("server is starting", "port", cfg.HttpServer.Port, "production", config.IsProduction())

	db := postgres.New(cfg.MyPostgres)

	wallpaperSvc := wallpaperservice.New(postgreswallpaper.New(db.DB))
	martyrSvc := martyrservice.New(postgresmartyr.New(db.DB))
	orbitSvc := orbitservice.New(postgresorbit.New(db.DB))
	quoteSvc := quoteservice.New(postgresquote.New(db.DB))
	heroSvc := heroservice.New(postgreshero.New(db.DB))
	promoCodeSvc := promocodeservice.New(postgrespromocode.New(db.DB))

	deepseekClient := deepseek.New(cfg.DeepSeek.APIKey, cfg.DeepSeek.BaseURL, cfg.DeepSeek.Model)
	dailyQuoteSvc := dailyquoteservice.New(quoteSvc, deepseekClient)

	storage := objectstorage.New(objectstorage.Config{
		Endpoint:      cfg.ObjectStorage.Endpoint,
		Region:        cfg.ObjectStorage.Region,
		Bucket:        cfg.ObjectStorage.Bucket,
		AccessKey:     cfg.ObjectStorage.AccessKey,
		SecretKey:     cfg.ObjectStorage.SecretKey,
		UseSSL:        cfg.ObjectStorage.UseSSL,
		PublicBaseURL: cfg.ObjectStorage.PublicBaseURL,
	})

	// فیچر «ساخت والپیپر با AI»: کلیدها از دیتابیس می‌آیند (ai_settings)، نه از
	// کانفیگ استاتیک، چون ادمین بدون ری‌دیپلوی عوضشون می‌کنه. تماس‌های خروجی به
	// این ۳ سرویس از همون پراکسی AI_PROXY_URL (سایدکار xray) رد می‌شن.
	aiSettingsRepo := postgresaisettings.New(db.DB)
	aiSettingsSvc := aisettingsservice.New(aiSettingsRepo)

	aiProxySvc := aiproxyservice.New(aiSettingsRepo, cfg.AIProxyURL)

	aiHTTPClient, err := httpproxy.NewClient(60*time.Second, cfg.AIProxyURL)
	if err != nil {
		logger.L().Error("invalid AI_PROXY_URL, falling back to direct connection", "err", err)
		aiHTTPClient, _ = httpproxy.NewClient(60*time.Second, "")
	}

	aiGenUsageRepo := postgresaigeneration.New(db.DB)
	bazaarClient := cafebazaar.New(
		cfg.CafeBazaar.PackageName, cfg.CafeBazaar.ClientID, cfg.CafeBazaar.ClientSecret, cfg.CafeBazaar.RefreshToken,
	)
	aiGenerateSvc := aigenerateservice.New(
		aiSettingsRepo,
		aiGenUsageRepo,
		bazaarClient,
		storage,
		func(apiKey string) aigenerateservice.ImageGenerator {
			return gemini.NewWithClient(apiKey, aiHTTPClient)
		},
		aigenerateservice.EnrichmentProviders{
			NewClaude: func(apiKey string) aigenerateservice.EnrichmentProvider {
				return claude.NewWithClient(apiKey, aiHTTPClient)
			},
			NewDeepSeek: func(apiKey string) aigenerateservice.EnrichmentProvider {
				return deepseek.NewWithClient(apiKey, "https://api.deepseek.com", "deepseek-chat", aiHTTPClient)
			},
		},
	)

	server := httpserver.New(
		cfg, wallpaperSvc, martyrSvc, orbitSvc, quoteSvc, dailyQuoteSvc, heroSvc, promoCodeSvc, storage,
		aiSettingsSvc, aiProxySvc, aiGenerateSvc,
	)
	server.Server()
}
