package postgresaigeneration

import (
	"context"

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
