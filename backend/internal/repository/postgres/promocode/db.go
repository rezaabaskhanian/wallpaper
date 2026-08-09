package postgrespromocode

import (
	"context"
	"errors"

	domain "wallpaperstore/internal/domain/promocode"
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

func scanPromoCode(row interface {
	Scan(dest ...any) error
}) (domain.PromoCode, error) {
	var p domain.PromoCode
	err := row.Scan(&p.ID, &p.Code, &p.IsActive, &p.UsedCount, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

func (d DB) GetAll(ctx context.Context) ([]domain.PromoCode, error) {
	const op = "postgrespromocode.GetAll"
	rows, err := d.conn.Query(ctx, `
		SELECT id, code, is_active, used_count, created_at, updated_at
		FROM promo_codes ORDER BY created_at DESC`)
	if err != nil {
		return nil, richerror.New(op).WithErr(err).WithMessage("failed to query promo codes")
	}
	defer rows.Close()

	codes := make([]domain.PromoCode, 0)
	for rows.Next() {
		p, err := scanPromoCode(rows)
		if err != nil {
			return nil, richerror.New(op).WithErr(err)
		}
		codes = append(codes, p)
	}
	return codes, rows.Err()
}

// GetByCode کد را به‌صورت case-insensitive جست‌وجو می‌کند.
func (d DB) GetByCode(ctx context.Context, code string) (domain.PromoCode, error) {
	const op = "postgrespromocode.GetByCode"
	row := d.conn.QueryRow(ctx, `
		SELECT id, code, is_active, used_count, created_at, updated_at
		FROM promo_codes WHERE UPPER(code) = UPPER($1)`, code)
	p, err := scanPromoCode(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.PromoCode{}, pgx.ErrNoRows
		}
		return domain.PromoCode{}, richerror.New(op).WithErr(err).WithMessage("failed to query promo code")
	}
	return p, nil
}

func (d DB) Save(ctx context.Context, p domain.PromoCode) (domain.PromoCode, error) {
	const op = "postgrespromocode.Save"
	query := `
	INSERT INTO promo_codes (id, code, is_active, used_count)
	VALUES ($1, $2, $3, $4)
	RETURNING id
`
	var id string
	err := d.conn.QueryRow(ctx, query, p.ID, p.Code, p.IsActive, p.UsedCount).Scan(&id)
	if err != nil {
		return domain.PromoCode{}, richerror.New(op).WithErr(err).WithMessage("این کد تخفیف قبلاً ثبت شده است")
	}
	p.ID = id
	return p, nil
}

func (d DB) Update(ctx context.Context, p domain.PromoCode) (domain.PromoCode, error) {
	const op = "postgrespromocode.Update"
	query := `
	UPDATE promo_codes SET code = $2, is_active = $3, updated_at = NOW()
	WHERE id = $1
	RETURNING id
`
	var id string
	err := d.conn.QueryRow(ctx, query, p.ID, p.Code, p.IsActive).Scan(&id)
	if err != nil {
		return domain.PromoCode{}, richerror.New(op).WithErr(err).WithMessage("کد تخفیف مورد نظر پیدا نشد")
	}
	p.ID = id
	return p, nil
}

func (d DB) Delete(ctx context.Context, id string) error {
	const op = "postgrespromocode.Delete"
	tag, err := d.conn.Exec(ctx, `DELETE FROM promo_codes WHERE id = $1`, id)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to delete promo code")
	}
	if tag.RowsAffected() == 0 {
		return richerror.New(op).WithMessage("کد تخفیف مورد نظر پیدا نشد")
	}
	return nil
}

func (d DB) IncrementUsedCount(ctx context.Context, id string) error {
	const op = "postgrespromocode.IncrementUsedCount"
	tag, err := d.conn.Exec(ctx, `
		UPDATE promo_codes SET used_count = used_count + 1, updated_at = NOW() WHERE id = $1`, id)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to update promo code usage")
	}
	if tag.RowsAffected() == 0 {
		return richerror.New(op).WithMessage("کد تخفیف مورد نظر پیدا نشد")
	}
	return nil
}
