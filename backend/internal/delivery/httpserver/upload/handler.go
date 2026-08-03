package uploadhandler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"wallpaperstore/internal/pkg/richerror"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

const maxUploadBytes = 8 << 20 // 8MB

var allowedExt = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
}

type Handler struct {
	uploadDir string
	baseURL   string
}

func New(uploadDir, baseURL string) Handler {
	return Handler{uploadDir: uploadDir, baseURL: baseURL}
}

// SetRoutes آپلود عکس (ادمین) را روی گروه /api/v1/admin ثبت می‌کند.
func (h Handler) SetRoutes(admin *echo.Group) {
	admin.POST("/upload", h.Upload)
}

// Upload یک فایل تصویر می‌گیرد، روی دیسک ذخیره می‌کند و آدرس کامل آن را برمی‌گرداند.
// خروجی این اندپوینت برای پر کردن فیلدهای thumb/full/photo/image در بقیه‌ی فرم‌های ادمین استفاده می‌شود.
func (h Handler) Upload(c echo.Context) error {
	const op = "uploadhandler.Upload"

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("فایلی ارسال نشده است")
	}
	if fileHeader.Size > maxUploadBytes {
		return richerror.New(op).WithMessage("حجم فایل بیش از حد مجاز است (حداکثر ۸ مگابایت)")
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowedExt[ext] {
		return richerror.New(op).WithMessage("فرمت فایل مجاز نیست (فقط jpg/jpeg/png/webp)")
	}

	src, err := fileHeader.Open()
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("خواندن فایل ممکن نشد")
	}
	defer src.Close()

	if err := os.MkdirAll(h.uploadDir, 0o755); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("ساخت پوشه‌ی آپلود ممکن نشد")
	}

	name := uuid.NewString() + ext
	dst, err := os.Create(filepath.Join(h.uploadDir, name))
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("ذخیره‌ی فایل ممکن نشد")
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("ذخیره‌ی فایل ممکن نشد")
	}

	url := fmt.Sprintf("%s/uploads/%s", strings.TrimRight(h.baseURL, "/"), name)
	return c.JSON(http.StatusCreated, map[string]string{"url": url})
}
