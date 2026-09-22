package postgresaigeneration

import (
	"context"

	domain "wallpaperstore/internal/domain/aigenerationlog"
	"wallpaperstore/internal/pkg/richerror"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

// HasUsedFree مشخص می‌کند این دستگاه قبلاً از سهمیه‌ی رایگانش استفاده کرده یا نه.
func (d DB) HasUsedFree(ctx context.Context, deviceID string) (bool, error) {
	const op = "postgresaigeneration.HasUsedFree"

	var exists int
	err := d.conn.QueryRow(
		ctx, `SELECT 1 FROM ai_generation_usage WHERE device_id = $1 AND free_used_at IS NOT NULL`, deviceID,
	).Scan(&exists)
	if err == pgx.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, richerror.New(op).WithErr(err).WithMessage("failed to check free quota")
	}
	return true, nil
}

// MarkFreeUsed سهمیه‌ی رایگان این دستگاه را مصرف‌شده علامت می‌زند.
func (d DB) MarkFreeUsed(ctx context.Context, deviceID string) error {
	const op = "postgresaigeneration.MarkFreeUsed"

	_, err := d.conn.Exec(ctx, `
		INSERT INTO ai_generation_usage (device_id, free_used_at) VALUES ($1, NOW())
		ON CONFLICT (device_id) DO UPDATE SET free_used_at = COALESCE(ai_generation_usage.free_used_at, NOW())
	`, deviceID)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to mark free quota used")
	}
	return nil
}

// GetCredits موجودی اعتبار عکس فعلی این دستگاه را برمی‌گرداند (صفر اگر هنوز
// ردیفی برایش ساخته نشده).
func (d DB) GetCredits(ctx context.Context, deviceID string) (int, error) {
	const op = "postgresaigeneration.GetCredits"

	var credits int
	err := d.conn.QueryRow(ctx, `SELECT credits FROM ai_generation_usage WHERE device_id = $1`, deviceID).Scan(&credits)
	if err == pgx.ErrNoRows {
		return 0, nil
	}
	if err != nil {
		return 0, richerror.New(op).WithErr(err).WithMessage("failed to read credits")
	}
	return credits, nil
}

// DeductCredit یک واحد از موجودی دستگاه کم می‌کند (اتمیک — فقط اگر موجودی
// کافی باشد) و گزارش می‌دهد که آیا واقعاً کسر انجام شد یا نه.
func (d DB) DeductCredit(ctx context.Context, deviceID string) (bool, error) {
	const op = "postgresaigeneration.DeductCredit"

	tag, err := d.conn.Exec(ctx, `
		UPDATE ai_generation_usage SET credits = credits - 1 WHERE device_id = $1 AND credits > 0
	`, deviceID)
	if err != nil {
		return false, richerror.New(op).WithErr(err).WithMessage("failed to deduct credit")
	}
	return tag.RowsAffected() > 0, nil
}

// HasRedeemedPurchase یعنی این purchaseToken قبلاً شارژ شده — برای idempotency
// وقتی اپ به‌خاطر قطعی شبکه درخواست redeem را دوباره می‌فرستد.
func (d DB) HasRedeemedPurchase(ctx context.Context, purchaseToken string) (bool, error) {
	const op = "postgresaigeneration.HasRedeemedPurchase"

	var exists int
	err := d.conn.QueryRow(ctx, `SELECT 1 FROM ai_credit_purchases WHERE purchase_token = $1`, purchaseToken).Scan(&exists)
	if err == pgx.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, richerror.New(op).WithErr(err).WithMessage("failed to check redeemed purchase")
	}
	return true, nil
}

// AddCredits موجودی دستگاه را بالا می‌برد و خرید را در ai_credit_purchases
// ثبت می‌کند (هر دو در یک تراکنش، تا با HasRedeemedPurchase هم‌زمان بماند).
func (d DB) AddCredits(ctx context.Context, deviceID, purchaseToken, sku string, amount int) error {
	const op = "postgresaigeneration.AddCredits"

	tx, err := d.conn.Begin(ctx)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		INSERT INTO ai_credit_purchases (purchase_token, device_id, sku, credits_granted) VALUES ($1, $2, $3, $4)
	`, purchaseToken, deviceID, sku, amount); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to record purchase")
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO ai_generation_usage (device_id, credits) VALUES ($1, $2)
		ON CONFLICT (device_id) DO UPDATE SET credits = ai_generation_usage.credits + $2
	`, deviceID, amount); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to add credits")
	}

	if err := tx.Commit(ctx); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return nil
}

// SaveGenerationLog یک ردیف تاریخچه (توکن مصرف‌شده + هزینه‌ی محاسبه‌شده) برای
// یک تولید موفق ثبت می‌کند.
func (d DB) SaveGenerationLog(ctx context.Context, log domain.GenerationLog) error {
	const op = "postgresaigeneration.SaveGenerationLog"

	_, err := d.conn.Exec(ctx, `
		INSERT INTO ai_generation_logs
			(device_id, prompt, image_url, prompt_tokens, output_tokens, total_tokens, cost_usd, cost_toman)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, log.DeviceID, log.Prompt, log.ImageURL, log.PromptTokens, log.OutputTokens, log.TotalTokens, log.CostUSD, log.CostToman)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to save generation log")
	}
	return nil
}

// ListGenerationLogs یک صفحه از تاریخچه (جدیدترین اول) به‌همراه جمع کل هزینه/
// توکن (مستقل از صفحه‌بندی) برمی‌گرداند — برای نمایش در پنل ادمین.
func (d DB) ListGenerationLogs(ctx context.Context, limit, offset int) (domain.Page, error) {
	const op = "postgresaigeneration.ListGenerationLogs"

	rows, err := d.conn.Query(ctx, `
		SELECT id, device_id, prompt, image_url, prompt_tokens, output_tokens, total_tokens,
		       cost_usd, cost_toman, created_at
		FROM ai_generation_logs
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return domain.Page{}, richerror.New(op).WithErr(err).WithMessage("failed to list generation logs")
	}
	defer rows.Close()

	var logs []domain.GenerationLog
	for rows.Next() {
		var l domain.GenerationLog
		if err := rows.Scan(
			&l.ID, &l.DeviceID, &l.Prompt, &l.ImageURL, &l.PromptTokens, &l.OutputTokens, &l.TotalTokens,
			&l.CostUSD, &l.CostToman, &l.CreatedAt,
		); err != nil {
			return domain.Page{}, richerror.New(op).WithErr(err).WithMessage("failed to scan generation log")
		}
		logs = append(logs, l)
	}
	if err := rows.Err(); err != nil {
		return domain.Page{}, richerror.New(op).WithErr(err)
	}

	var page domain.Page
	page.Logs = logs
	err = d.conn.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(cost_usd), 0), COALESCE(SUM(cost_toman), 0), COALESCE(SUM(total_tokens), 0)
		FROM ai_generation_logs
	`).Scan(&page.TotalCount, &page.TotalCostUSD, &page.TotalCostToman, &page.TotalTokens)
	if err != nil {
		return domain.Page{}, richerror.New(op).WithErr(err).WithMessage("failed to sum generation logs")
	}

	return page, nil
}
