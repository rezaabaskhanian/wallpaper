package main

import (
	"wallpaperstore/internal/config"
	"wallpaperstore/internal/delivery/httpserver"
	"wallpaperstore/internal/pkg/logger"
	"wallpaperstore/internal/repository/migrator"
	"wallpaperstore/internal/repository/postgres"
	postgreshero "wallpaperstore/internal/repository/postgres/hero"
	postgresmartyr "wallpaperstore/internal/repository/postgres/martyr"
	postgresquote "wallpaperstore/internal/repository/postgres/quote"
	postgreswallpaper "wallpaperstore/internal/repository/postgres/wallpaper"
	heroservice "wallpaperstore/internal/service/hero"
	martyrservice "wallpaperstore/internal/service/martyr"
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
	quoteSvc := quoteservice.New(postgresquote.New(db.DB))
	heroSvc := heroservice.New(postgreshero.New(db.DB))

	server := httpserver.New(cfg, wallpaperSvc, martyrSvc, quoteSvc, heroSvc)
	server.Server()
}
