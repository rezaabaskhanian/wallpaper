package wallpaperhandler

import (
	wallpaperservice "wallpaperstore/internal/service/wallpaper"
)

type Handler struct {
	wallpaperSvc wallpaperservice.Service
}

func New(wallpaperSvc wallpaperservice.Service) Handler {
	return Handler{wallpaperSvc: wallpaperSvc}
}
