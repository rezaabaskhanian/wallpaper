package uploadhandler

import (
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	_ "golang.org/x/image/webp"

	"wallpaperstore/internal/pkg/objectstorage"
	"wallpaperstore/internal/pkg/richerror"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

const maxUploadBytes = 8 << 20 // 8MB

// بزرگ‌ترین بعد مجاز برای هر نسخه؛ اگر تصویر اصلی بزرگ‌تر باشد با حفظ نسبت کوچک می‌شود.
const (
	fullMaxLongEdge  = 2400
	thumbMaxLongEdge = 480

	fullQuality  = 82
	thumbQuality = 75
)

var allowedExt = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
}

type Handler struct {
	storage *objectstorage.Client
}

func New(storage *objectstorage.Client) Handler {
	return Handler{storage: storage}
}

// SetRoutes آپلود عکس (ادمین) را روی گروه /api/v1/admin ثبت می‌کند.
func (h Handler) SetRoutes(admin *echo.Group) {
	admin.POST("/upload", h.Upload)
}

type uploadResponse struct {
	Thumb  string `json:"thumb"`
	Full   string `json:"full"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
	Bytes  int64  `json:"bytes"`
}

// Upload یک فایل تصویر می‌گیرد، دو نسخه‌ی WebP (thumb + full) می‌سازد، روی Object
// Storage آپلود می‌کند و آدرس‌های عمومی را برمی‌گرداند. خروجی این اندپوینت برای پر
// کردن فیلدهای thumb/full/photo/image در بقیه‌ی فرم‌های ادمین استفاده می‌شود.
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

	tmpDir, err := os.MkdirTemp("", "wp-upload-*")
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("ساخت پوشه‌ی موقت ممکن نشد")
	}
	defer os.RemoveAll(tmpDir)

	srcPath := filepath.Join(tmpDir, "src"+ext)
	if err := writeToFile(srcPath, src); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("ذخیره‌ی فایل موقت ممکن نشد")
	}

	width, height, err := imageDimensions(srcPath)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("خواندن ابعاد تصویر ممکن نشد")
	}

	id := uuid.NewString()
	fullPath := filepath.Join(tmpDir, "full.webp")
	thumbPath := filepath.Join(tmpDir, "thumb.webp")

	if err := encodeWebp(srcPath, fullPath, fullQuality, fullMaxLongEdge, width, height); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("تبدیل تصویر اصلی به WebP ممکن نشد")
	}
	if err := encodeWebp(srcPath, thumbPath, thumbQuality, thumbMaxLongEdge, width, height); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("ساخت پیش‌نمایش (thumb) ممکن نشد")
	}

	fullBytes, err := os.ReadFile(fullPath)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("خواندن خروجی نهایی ممکن نشد")
	}
	thumbBytes, err := os.ReadFile(thumbPath)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("خواندن خروجی پیش‌نمایش ممکن نشد")
	}

	ctx := c.Request().Context()
	fullURL, err := h.storage.UploadBytes(ctx, fmt.Sprintf("wp/%s.webp", id), fullBytes, "image/webp")
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("آپلود روی فضای ابری ممکن نشد")
	}
	thumbURL, err := h.storage.UploadBytes(ctx, fmt.Sprintf("wp/%s_thumb.webp", id), thumbBytes, "image/webp")
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("آپلود پیش‌نمایش روی فضای ابری ممکن نشد")
	}

	return c.JSON(http.StatusCreated, uploadResponse{
		Thumb:  thumbURL,
		Full:   fullURL,
		Width:  width,
		Height: height,
		Bytes:  int64(len(fullBytes)),
	})
}

func writeToFile(path string, r io.Reader) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, r)
	return err
}

func imageDimensions(path string) (int, int, error) {
	f, err := os.Open(path)
	if err != nil {
		return 0, 0, err
	}
	defer f.Close()
	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		return 0, 0, err
	}
	return cfg.Width, cfg.Height, nil
}

// encodeWebp نسخه‌ی WebP فایل مبدا را با ابزار خط‌فرمان cwebp (پکیج libwebp-tools)
// می‌سازد. اگر بزرگ‌ترین بعد تصویر از maxLongEdge بیشتر باشد، با حفظ نسبت کوچک می‌شود.
func encodeWebp(srcPath, dstPath string, quality, maxLongEdge, srcW, srcH int) error {
	args := []string{"-quiet", "-q", fmt.Sprintf("%d", quality)}

	longest := srcW
	if srcH > longest {
		longest = srcH
	}
	if longest > maxLongEdge {
		if srcW >= srcH {
			args = append(args, "-resize", fmt.Sprintf("%d", maxLongEdge), "0")
		} else {
			args = append(args, "-resize", "0", fmt.Sprintf("%d", maxLongEdge))
		}
	}
	args = append(args, srcPath, "-o", dstPath)

	out, err := exec.Command("cwebp", args...).CombinedOutput()
	if err != nil {
		return fmt.Errorf("cwebp: %w: %s", err, string(out))
	}
	return nil
}
