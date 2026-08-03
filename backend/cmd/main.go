package main

import (
	"wallpaperstore/internal/config"
	"wallpaperstore/internal/delivery/httpserver"
	"wallpaperstore/internal/pkg/logger"
	"wallpaperstore/internal/repository/migrator"
	"wallpaperstore/internal/repository/postgres"
	postgreswallpaper "wallpaperstore/internal/repository/postgres/wallpaper"
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

	wallpaperSvc := setupService(cfg)

	server := httpserver.New(cfg, wallpaperSvc)
	server.Server()
}

func setupService(cfg config.Config) wallpaperservice.Service {
	db := postgres.New(cfg.MyPostgres)

	wallpaperRepo := postgreswallpaper.New(db.DB)

	return wallpaperservice.New(wallpaperRepo)
}
