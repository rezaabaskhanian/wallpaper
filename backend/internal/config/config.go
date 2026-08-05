package config

import (
	"wallpaperstore/internal/repository/postgres"
)

type HttpServer struct {
	Port           int      `koanf:"port"`
	AllowedOrigins []string `koanf:"allowed_origins"`
}

type Config struct {
	MyPostgres postgres.Config `koanf:"mypostgres"`
	HttpServer HttpServer      `koanf:"http_server"`
	// AdminAPIKey کلید سادهٔ محافظت از اندپوینت‌های ادمین (افزودن والپیپر/دسته).
	// خالی یعنی اندپوینت‌های نوشتن باز هستند (فقط برای توسعهٔ محلی).
	AdminAPIKey string `koanf:"admin_api_key"`
	// UploadDir پوشه‌ی روی دیسک که فایل‌های قدیمی/seed (عکس شهدا/رهبر) از آن سرو می‌شوند.
	UploadDir string `koanf:"upload_dir"`
	// ObjectStorage تنظیمات باکت S3-سازگار (آروان کلاود) که آپلودهای جدید ادمین در آن ذخیره می‌شوند.
	ObjectStorage ObjectStorage `koanf:"object_storage"`
}

// ObjectStorage کانفیگ اتصال به Object Storage سازگار با S3 (مثل آروان کلاود) برای
// میزبانی تصاویر والپیپر (thumb/full به فرمت WebP).
type ObjectStorage struct {
	// Endpoint هاست S3 بدون نام باکت، مثل s3.ir-thr-at1.arvanstorage.ir
	Endpoint string `koanf:"endpoint"`
	Region   string `koanf:"region"`
	Bucket   string `koanf:"bucket"`
	// AccessKey/SecretKey از پنل Object Storage آروان.
	AccessKey string `koanf:"access_key"`
	SecretKey string `koanf:"secret_key"`
	UseSSL    bool   `koanf:"use_ssl"`
	// PublicBaseURL دامنه‌ی عمومی برای ساخت URL نهایی فایل‌ها (دامنه‌ی CDN یا آدرس مستقیم باکت).
	PublicBaseURL string `koanf:"public_base_url"`
}
