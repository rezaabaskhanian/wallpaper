package wallpapervalueobject

import (
	"errors"

	"github.com/google/uuid"
)

type WallpaperID string

func NewWallpaperID() WallpaperID {
	return WallpaperID(uuid.NewString())
}

func ParseWallpaperID(id string) (WallpaperID, error) {
	if id == "" {
		return "", errors.New("wallpaper id cannot be empty")
	}
	return WallpaperID(id), nil
}
