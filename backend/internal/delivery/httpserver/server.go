package httpserver

import (
	"fmt"
	"net/http"

	"wallpaperstore/internal/config"
	"wallpaperstore/internal/delivery/middlware"

	herohandler "wallpaperstore/internal/delivery/httpserver/hero"
	martyrhandler "wallpaperstore/internal/delivery/httpserver/martyr"
	quotehandler "wallpaperstore/internal/delivery/httpserver/quote"
	uploadhandler "wallpaperstore/internal/delivery/httpserver/upload"
	wallpaperhandler "wallpaperstore/internal/delivery/httpserver/wallpaper"

	heroservice "wallpaperstore/internal/service/hero"
	martyrservice "wallpaperstore/internal/service/martyr"
	quoteservice "wallpaperstore/internal/service/quote"
	wallpaperservice "wallpaperstore/internal/service/wallpaper"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"
)

type Service struct {
	cfg              config.Config
	wallpaperHandler wallpaperhandler.Handler
	martyrHandler    martyrhandler.Handler
	quoteHandler     quotehandler.Handler
	heroHandler      herohandler.Handler
	uploadHandler    uploadhandler.Handler
}

func New(
	cfg config.Config,
	wallpaperSvc wallpaperservice.Service,
	martyrSvc martyrservice.Service,
	quoteSvc quoteservice.Service,
	heroSvc heroservice.Service,
) Service {
	return Service{
		cfg:              cfg,
		wallpaperHandler: wallpaperhandler.New(wallpaperSvc),
		martyrHandler:    martyrhandler.New(martyrSvc),
		quoteHandler:     quotehandler.New(quoteSvc),
		heroHandler:      herohandler.New(heroSvc),
		uploadHandler:    uploadhandler.New(cfg.UploadDir, cfg.PublicBaseURL),
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
	s.quoteHandler.SetRoutes(api, admin)
	s.heroHandler.SetRoutes(api, admin)
	s.uploadHandler.SetRoutes(admin)

	e.Logger.Fatal(e.Start(fmt.Sprintf(":%d", s.cfg.HttpServer.Port)))
}
