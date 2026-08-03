package httpserver

import (
	"fmt"
	"net/http"

	"wallpaperstore/internal/config"
	wallpaperhandler "wallpaperstore/internal/delivery/httpserver/wallpaper"
	wallpaperservice "wallpaperstore/internal/service/wallpaper"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"
)

type Service struct {
	cfg              config.Config
	wallpaperHandler wallpaperhandler.Handler
}

func New(cfg config.Config, wallpaperSvc wallpaperservice.Service) Service {
	return Service{
		cfg:              cfg,
		wallpaperHandler: wallpaperhandler.New(wallpaperSvc, cfg),
	}
}

func (s Service) Server() {
	e := echo.New()

	allowedOrigins := s.cfg.HttpServer.AllowedOrigins
	if len(allowedOrigins) == 0 {
		allowedOrigins = []string{"http://localhost:3000"}
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

	s.wallpaperHandler.SetWallpaperRoutes(e)

	e.Logger.Fatal(e.Start(fmt.Sprintf(":%d", s.cfg.HttpServer.Port)))
}
