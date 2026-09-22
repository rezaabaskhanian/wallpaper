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
	       price_per_image_toman, gemini_input_price_usd_per_mtok, gemini_output_price_usd_per_mtok,
	       usd_to_toman_rate, updated_at
	FROM ai_settings
	LIMIT 1
`
	err := d.conn.QueryRow(ctx, query).Scan(
		&s.ClaudeAPIKey, &s.GeminiAPIKey, &s.DeepSeekAPIKey, &s.EnrichmentProvider,
		&s.PricePerImageToman, &s.GeminiInputPriceUsdPerMTok, &s.GeminiOutputPriceUsdPerMTok,
		&s.UsdToTomanRate, &s.UpdatedAt,
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
		gemini_input_price_usd_per_mtok = $6,
		gemini_output_price_usd_per_mtok = $7,
		usd_to_toman_rate = $8,
		updated_at = NOW()
	WHERE id = true
	RETURNING updated_at
`
	err := d.conn.QueryRow(ctx, query,
		s.ClaudeAPIKey, s.GeminiAPIKey, s.DeepSeekAPIKey, s.EnrichmentProvider, s.PricePerImageToman,
		s.GeminiInputPriceUsdPerMTok, s.GeminiOutputPriceUsdPerMTok, s.UsdToTomanRate,
	).Scan(&s.UpdatedAt)
	if err != nil {
		return domain.AISettings{}, richerror.New(op).WithErr(err).WithMessage("failed to update ai settings")
	}
	return s, nil
}

// GetProxyLink/SetProxyLink جدا از GetAISettings/SaveAISettings‌اند چون لینک
// پراکسی یک کلید API نیست و نباید در پاسخ ماسک‌شده‌ی aisettingsservice ظاهر شود —
// فقط aiproxyservice مستقیم از این‌ها استفاده می‌کند. لینک می‌تواند vless://,
// vmess://, trojan://, ss:// یا یک JSON کامل outbound باشد (ببینید
// aiproxyservice.parseProxyLink) — این لایه فقط رشته را ذخیره/بازیابی می‌کند.
func (d DB) GetProxyLink(ctx context.Context) (string, error) {
	const op = "postgresaisettings.GetProxyLink"

	var link string
	err := d.conn.QueryRow(ctx, `SELECT proxy_link FROM ai_settings LIMIT 1`).Scan(&link)
	if err != nil {
		return "", richerror.New(op).WithErr(err).WithMessage("failed to read proxy link")
	}
	return link, nil
}

func (d DB) SetProxyLink(ctx context.Context, link string) error {
	const op = "postgresaisettings.SetProxyLink"

	_, err := d.conn.Exec(ctx, `UPDATE ai_settings SET proxy_link = $1 WHERE id = true`, link)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to save proxy link")
	}
	return nil
}
