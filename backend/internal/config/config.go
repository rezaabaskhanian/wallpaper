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
	// DeepSeek تنظیمات اتصال به API دیپ‌سیک برای ساخت جملهٔ روزانه (dailyquote).
	DeepSeek DeepSeek `koanf:"deepseek"`
	// AIProxyURL آدرس پراکسی (socks5:// یا http(s)://) برای تونل‌کردن درخواست‌های
	// خروجی به API‌های هوش‌مصنوعی (کلود/جمینای/دیپ‌سیک) — چون این سرویس‌ها از IP
	// سرورهای ایران معمولاً فیلترند. خالی یعنی بدون پراکسی، مستقیم وصل شو.
	AIProxyURL string `koanf:"ai_proxy_url"`
	// CafeBazaar اعتبارنامه‌ی Developer API بازار برای تایید سمت سرور خریدهای
	// اعتبار AI (SKU مصرفی ai_credits) — بدون این‌ها redeem با خطای قابل‌فهم رد
	// می‌شود، نه با اعتماد بی‌قیدوشرط به ادعای کلاینت.
	CafeBazaar CafeBazaar `koanf:"cafebazaar"`
}

// CafeBazaar کانفیگ اتصال به Developer API بازار (OAuth refresh-token flow) —
// از پنل توسعه‌دهندگان بازار، بخش API توسعه‌دهندگان گرفته می‌شود.
type CafeBazaar struct {
	PackageName  string `koanf:"package_name"`
	ClientID     string `koanf:"client_id"`
	ClientSecret string `koanf:"client_secret"`
	RefreshToken string `koanf:"refresh_token"`
}

// DeepSeek کانفیگ اتصال به API دیپ‌سیک (سرویس چت/تکمیل متن، سازگار با OpenAI).
// خالی‌بودن APIKey یعنی فیچر «جملهٔ روزانه» غیرفعال است (به‌جای کرش، خطای
// قابل‌فهم برمی‌گرداند — نیازی به فلگ جدا نیست).
type DeepSeek struct {
	APIKey  string `koanf:"api_key"`
	BaseURL string `koanf:"base_url"`
	Model   string `koanf:"model"`
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
