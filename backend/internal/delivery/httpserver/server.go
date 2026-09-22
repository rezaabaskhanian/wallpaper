package httpserver

import (
	"fmt"
	"net/http"

	"wallpaperstore/internal/config"
	"wallpaperstore/internal/delivery/middlware"
	"wallpaperstore/internal/pkg/objectstorage"

	aigeneratehandler "wallpaperstore/internal/delivery/httpserver/aigenerate"
	aiproxyhandler "wallpaperstore/internal/delivery/httpserver/aiproxy"
	aisettingshandler "wallpaperstore/internal/delivery/httpserver/aisettings"
	dailyquotehandler "wallpaperstore/internal/delivery/httpserver/dailyquote"
	herohandler "wallpaperstore/internal/delivery/httpserver/hero"
	martyrhandler "wallpaperstore/internal/delivery/httpserver/martyr"
	orbithandler "wallpaperstore/internal/delivery/httpserver/orbit"
	promocodehandler "wallpaperstore/internal/delivery/httpserver/promocode"
	quotehandler "wallpaperstore/internal/delivery/httpserver/quote"
	uploadhandler "wallpaperstore/internal/delivery/httpserver/upload"
	wallpaperhandler "wallpaperstore/internal/delivery/httpserver/wallpaper"

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

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"
)

type Service struct {
	cfg               config.Config
	wallpaperHandler  wallpaperhandler.Handler
	martyrHandler     martyrhandler.Handler
	orbitHandler      orbithandler.Handler
	quoteHandler      quotehandler.Handler
	dailyQuoteHandler dailyquotehandler.Handler
	heroHandler       herohandler.Handler
	uploadHandler     uploadhandler.Handler
	promoCodeHandler  promocodehandler.Handler
	aiSettingsHandler aisettingshandler.Handler
	aiProxyHandler    aiproxyhandler.Handler
	aiGenerateHandler aigeneratehandler.Handler
}

func New(
	cfg config.Config,
	wallpaperSvc wallpaperservice.Service,
	martyrSvc martyrservice.Service,
	orbitSvc orbitservice.Service,
	quoteSvc quoteservice.Service,
	dailyQuoteSvc *dailyquoteservice.Service,
	heroSvc heroservice.Service,
	promoCodeSvc promocodeservice.Service,
	storage *objectstorage.Client,
	aiSettingsSvc aisettingsservice.Service,
	aiProxySvc aiproxyservice.Service,
	aiGenerateSvc aigenerateservice.Service,
) Service {
	return Service{
		cfg:               cfg,
		wallpaperHandler:  wallpaperhandler.New(wallpaperSvc),
		martyrHandler:     martyrhandler.New(martyrSvc),
		orbitHandler:      orbithandler.New(orbitSvc),
		quoteHandler:      quotehandler.New(quoteSvc),
		dailyQuoteHandler: dailyquotehandler.New(dailyQuoteSvc),
		heroHandler:       herohandler.New(heroSvc),
		uploadHandler:     uploadhandler.New(storage),
		promoCodeHandler:  promocodehandler.New(promoCodeSvc),
		aiSettingsHandler: aisettingshandler.New(aiSettingsSvc),
		aiProxyHandler:    aiproxyhandler.New(aiProxySvc),
		aiGenerateHandler: aigeneratehandler.New(aiGenerateSvc),
	}
}

func (s Service) Server() {
	e := echo.New()

	allowedOrigins := s.cfg.HttpServer.AllowedOrigins
	if len(allowedOrigins) == 0 {
		allowedOrigins = []string{"http://localhost:3000", "http://localhost:5173"}
	}

	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: allowedOrigins,
		AllowMethods: []string{
			echo.GET,
			echo.POST,
			echo.PUT,
			echo.DELETE,
			echo.OPTIONS,
		},
		AllowHeaders: []string{
			echo.HeaderOrigin,
			echo.HeaderContentType,
			echo.HeaderAccept,
			echo.HeaderAuthorization,
			config.AdminKeyHeader,
		},
		AllowCredentials: true,
	}))

	// شناسه‌ی یکتای درخواست برای رهگیری در لاگ‌ها
	e.Use(middleware.RequestID())

	// لاگ ساخت‌یافته (structured) با slog
	e.Use(structuredLogger())

	e.Use(middleware.Recover())

	// محدودیت نرخ درخواست‌ها (۲۰ درخواست بر ثانیه به‌ازای هر IP)
	e.Use(middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(rate.Limit(20))))

	// سلامت سرویس برای مانیتورینگ/Load Balancer
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	// فایل‌های آپلودشده (عکس والپیپر/شهید/رهبر) به‌صورت استاتیک سرو می‌شوند.
	e.Static("/uploads", s.cfg.UploadDir)

	api := e.Group("/api/v1")
	admin := api.Group("/admin", middlware.AdminKey(s.cfg.AdminAPIKey))

	s.wallpaperHandler.SetWallpaperRoutes(api, admin)
	s.martyrHandler.SetRoutes(api, admin)
	s.orbitHandler.SetRoutes(api, admin)
	s.quoteHandler.SetRoutes(api, admin)
	s.dailyQuoteHandler.SetRoutes(api)
	s.heroHandler.SetRoutes(api, admin)
	s.uploadHandler.SetRoutes(admin)
	s.promoCodeHandler.SetRoutes(api, admin)
	s.aiSettingsHandler.SetRoutes(admin)
	s.aiProxyHandler.SetRoutes(admin)
	s.aiGenerateHandler.SetRoutes(api)

	e.Logger.Fatal(e.Start(fmt.Sprintf(":%d", s.cfg.HttpServer.Port)))
}
