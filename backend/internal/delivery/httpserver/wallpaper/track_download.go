package wallpaperhandler

import (
	"context"
	"net/http"

	"wallpaperstore/internal/pkg/richerror"

	"github.com/labstack/echo/v4"
)

// TrackDownload یک واحد به شمارندهٔ دانلود والپیپر اضافه می‌کند — عمومی،
// اپ هر بار که کاربر یک والپیپر را واقعاً روی گوشی اعمال می‌کند صدا می‌زند.
func (h Handler) TrackDownload(c echo.Context) error {
	const op = "wallpaperhandler.TrackDownload"
	if err := h.wallpaperSvc.TrackDownload(context.Background(), c.Param("id")); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}
