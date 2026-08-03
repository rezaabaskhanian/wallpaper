package logger

import (
	"log/slog"
	"os"
	"sync"
)

var (
	once   sync.Once
	logger *slog.Logger
)

// Init لاگر ساخت‌یافته (structured) را با slog راه‌اندازی می‌کند.
// در production خروجی JSON و در development خروجی متنی خواناست.
func Init() {
	once.Do(func() {
		level := slog.LevelInfo
		if os.Getenv("LOG_LEVEL") == "debug" {
			level = slog.LevelDebug
		}

		var handler slog.Handler
		if os.Getenv("ENV") == "production" {
			handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})
		} else {
			handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: level})
		}

		logger = slog.New(handler)
		slog.SetDefault(logger)
	})
}

// L لاگر سراسری را برمی‌گرداند (در صورت نبود، یک لاگر پیش‌فرض می‌سازد).
func L() *slog.Logger {
	if logger == nil {
		Init()
	}
	return logger
}
