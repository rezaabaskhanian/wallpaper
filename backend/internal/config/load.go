package config

import (
	"os"
	"strconv"
	"strings"

	"wallpaperstore/internal/repository/postgres"
)

// Load کانفیگ را با رویکرد 12-Factor می‌سازد:
// ابتدا مقادیر پیش‌فرض، سپس override با متغیرهای محیطی (ENV).
func Load() Config {
	return Config{
		MyPostgres: postgres.Config{
			UserName: getEnv("DB_USER", "reza_abasi"),
			Password: getEnv("DB_PASSWORD", "r1367R1367"),
			Port:     getEnvInt("DB_PORT", 5432),
			Host:     getEnv("DB_HOST", "localhost"),
			DBName:   getEnv("DB_NAME", "wallpaper_db"),
		},
		HttpServer: HttpServer{
			Port:           getEnvInt("HTTP_PORT", 8090),
			AllowedOrigins: getEnvList("ALLOWED_ORIGINS", []string{"http://localhost:3000"}),
		},
		AdminAPIKey: getEnv("ADMIN_API_KEY", ""),
	}
}

// IsProduction بررسی می‌کند محیط production است یا نه.
func IsProduction() bool {
	return getEnv("ENV", "development") == "production"
}

// RunMigrations در production تعیین می‌کند مهاجرت‌ها اجرا شوند یا نه (RUN_MIGRATIONS=true).
func RunMigrations() bool {
	return getEnv("RUN_MIGRATIONS", "false") == "true"
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v, ok := os.LookupEnv(key); ok {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

// getEnvList لیستی از مقادیر جداشده با کاما را می‌خواند (مثل دامنه‌های مجاز CORS).
func getEnvList(key string, fallback []string) []string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		parts := strings.Split(v, ",")
		out := make([]string, 0, len(parts))
		for _, p := range parts {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				out = append(out, trimmed)
			}
		}
		if len(out) > 0 {
			return out
		}
	}
	return fallback
}
