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
	// UploadDir پوشه‌ی روی دیسک که فایل‌های آپلودی (عکس والپیپر/شهید/رهبر) در آن ذخیره می‌شوند.
	UploadDir string `koanf:"upload_dir"`
	// PublicBaseURL برای ساختن آدرس کامل و قابل‌دسترس فایل‌های آپلودشده.
	PublicBaseURL string `koanf:"public_base_url"`
}
