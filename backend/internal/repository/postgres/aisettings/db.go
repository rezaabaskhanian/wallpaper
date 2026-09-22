package postgresaisettings

import (
	"context"

	domain "wallpaperstore/internal/domain/aisettings"
	"wallpaperstore/internal/pkg/richerror"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

func (d DB) GetAISettings(ctx context.Context) (domain.AISettings, error) {
	const op = "postgresaisettings.GetAISettings"

	var s domain.AISettings
	query := `
	SELECT claude_api_key, gemini_api_key, deepseek_api_key, enrichment_provider,
	       price_per_image_toman, updated_at
	FROM ai_settings
	LIMIT 1
`
	err := d.conn.QueryRow(ctx, query).Scan(
		&s.ClaudeAPIKey, &s.GeminiAPIKey, &s.DeepSeekAPIKey, &s.EnrichmentProvider,
		&s.PricePerImageToman, &s.UpdatedAt,
	)
	if err != nil {
		return domain.AISettings{}, richerror.New(op).WithErr(err).WithMessage("failed to read ai settings")
	}
	return s, nil
}

// SaveAISettings هر سه کلید را جای‌گزین می‌کند — منطق «خالی یعنی بدون تغییر»
// در لایه‌ی سرویس اعمال می‌شود (مقدار فعلی از دیتابیس خوانده و در صورت خالی‌بودن
// فیلد ورودی جای‌گزین می‌شود)، نه اینجا.
func (d DB) SaveAISettings(ctx context.Context, s domain.AISettings) (domain.AISettings, error) {
	const op = "postgresaisettings.SaveAISettings"

	query := `
	UPDATE ai_settings SET
		claude_api_key = $1,
		gemini_api_key = $2,
		deepseek_api_key = $3,
		enrichment_provider = $4,
		price_per_image_toman = $5,
		updated_at = NOW()
	WHERE id = true
	RETURNING updated_at
`
	err := d.conn.QueryRow(ctx, query,
		s.ClaudeAPIKey, s.GeminiAPIKey, s.DeepSeekAPIKey, s.EnrichmentProvider, s.PricePerImageToman,
	).Scan(&s.UpdatedAt)
	if err != nil {
		return domain.AISettings{}, richerror.New(op).WithErr(err).WithMessage("failed to update ai settings")
	}
	return s, nil
}

// GetVlessLink/SetVlessLink جدا از GetAISettings/SaveAISettings‌اند چون لینک
// پراکسی یک کلید API نیست و نباید در پاسخ ماسک‌شده‌ی aisettingsservice ظاهر شود —
// فقط aiproxyservice مستقیم از این‌ها استفاده می‌کند.
func (d DB) GetVlessLink(ctx context.Context) (string, error) {
	const op = "postgresaisettings.GetVlessLink"

	var link string
	err := d.conn.QueryRow(ctx, `SELECT vless_link FROM ai_settings LIMIT 1`).Scan(&link)
	if err != nil {
		return "", richerror.New(op).WithErr(err).WithMessage("failed to read vless link")
	}
	return link, nil
}

func (d DB) SetVlessLink(ctx context.Context, link string) error {
	const op = "postgresaisettings.SetVlessLink"

	_, err := d.conn.Exec(ctx, `UPDATE ai_settings SET vless_link = $1 WHERE id = true`, link)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to save vless link")
	}
	return nil
}
