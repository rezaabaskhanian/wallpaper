package objectstorage

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// Config تنظیمات اتصال به یک باکت S3-سازگار (آروان کلاود).
type Config struct {
	Endpoint      string
	Region        string
	Bucket        string
	AccessKey     string
	SecretKey     string
	UseSSL        bool
	PublicBaseURL string
}

// Client اتصال آماده به باکت برای آپلود فایل‌های عمومی (public-read).
type Client struct {
	cfg    Config
	client *minio.Client
}

// New اتصال به باکت را می‌سازد. مثل بقیه‌ی سازنده‌های این پروژه، روی خطای اتصال
// با log.Fatal متوقف می‌شود چون بدون Object Storage سرویس آپلود قابل‌کار نیست.
func New(cfg Config) *Client {
	c, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
		Region: cfg.Region,
	})
	if err != nil {
		log.Fatal("Unable to connect to object storage:", err)
	}
	return &Client{cfg: cfg, client: c}
}

// UploadBytes فایل را در مسیر key آپلود کرده و URL عمومی‌اش را برمی‌گرداند.
func (c *Client) UploadBytes(ctx context.Context, key string, data []byte, contentType string) (string, error) {
	_, err := c.client.PutObject(ctx, c.cfg.Bucket, key, bytes.NewReader(data), int64(len(data)), minio.PutObjectOptions{
		ContentType: contentType,
		// بعضی سرویس‌های S3-سازگار (از جمله آروان) به این هدر برای public-read کردن
		// هر آبجکت نیاز دارن؛ صرف روشن‌بودن «نمایش عمومی» باکت کافی نیست.
		UserMetadata: map[string]string{"x-amz-acl": "public-read"},
	})
	if err != nil {
		return "", fmt.Errorf("objectstorage: put object %q: %w", key, err)
	}
	return fmt.Sprintf("%s/%s", strings.TrimRight(c.cfg.PublicBaseURL, "/"), key), nil
}
