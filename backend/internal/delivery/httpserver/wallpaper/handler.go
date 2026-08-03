package wallpaperhandler

import (
	"wallpaperstore/internal/config"
	wallpaperservice "wallpaperstore/internal/service/wallpaper"
)

type Handler struct {
	wallpaperSvc wallpaperservice.Service
	adminKey     string
}

func New(wallpaperSvc wallpaperservice.Service, cfg config.Config) Handler {
	return Handler{wallpaperSvc: wallpaperSvc, adminKey: cfg.AdminAPIKey}
}
