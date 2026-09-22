package wallpaperservice

import (
	"context"

	"wallpaperstore/internal/pkg/richerror"
)

// TrackDownload یک واحد به شمارندهٔ دانلود والپیپر اضافه می‌کند. اپ این را
// هر بار که کاربر واقعاً یک والپیپر را روی گوشی اعمال می‌کند صدا می‌زند —
// نه برای هر بار دیدن پیش‌نمایش. عمومی است (بدون کلید ادمین)، چون کاربران
// عادی این را صدا می‌زنند نه ادمین.
func (s Service) TrackDownload(ctx context.Context, id string) error {
	const op = "wallpaperservice.TrackDownload"
	if err := s.repo.IncrementDownloadCount(ctx, id); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return nil
}
