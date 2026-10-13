package postgresoccasion

import (
	"context"
	"time"

	domain "wallpaperstore/internal/domain/occasion"
	"wallpaperstore/internal/pkg/richerror"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

const columns = `id, title, date, category_id, notify_title, notify_body, days_before,
	is_active, created_at, updated_at`

func (d DB) GetAll(ctx context.Context, activeFrom time.Time) ([]domain.Occasion, error) {
	const op = "postgresoccasion.GetAll"
	query := `SELECT ` + columns + ` FROM occasions`
	args := []any{}
	if !activeFrom.IsZero() {
		query += ` WHERE is_active AND date >= $1`
		args = append(args, activeFrom.Format(domain.DateLayout))
	}
	query += ` ORDER BY date`

	rows, err := d.conn.Query(ctx, query, args...)
	if err != nil {
		return nil, richerror.New(op).WithErr(err).WithMessage("failed to query occasions")
	}
	defer rows.Close()

	out := make([]domain.Occasion, 0)
	for rows.Next() {
		var o domain.Occasion
		if err := rows.Scan(&o.ID, &o.Title, &o.Date, &o.CategoryID, &o.NotifyTitle, &o.NotifyBody,
			&o.DaysBefore, &o.IsActive, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, richerror.New(op).WithErr(err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (d DB) Save(ctx context.Context, o domain.Occasion) (domain.Occasion, error) {
	const op = "postgresoccasion.Save"
	_, err := d.conn.Exec(ctx, `
	INSERT INTO occasions (id, title, date, category_id, notify_title, notify_body, days_before, is_active)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		o.ID, o.Title, o.Date, o.CategoryID, o.NotifyTitle, o.NotifyBody, o.DaysBefore, o.IsActive)
	if err != nil {
		return domain.Occasion{}, richerror.New(op).WithErr(err).WithMessage("مناسبتی با این شناسه قبلاً ثبت شده است")
	}
	return o, nil
}

func (d DB) Update(ctx context.Context, o domain.Occasion) (domain.Occasion, error) {
	const op = "postgresoccasion.Update"
	tag, err := d.conn.Exec(ctx, `
	UPDATE occasions SET title = $2, date = $3, category_id = $4, notify_title = $5,
		notify_body = $6, days_before = $7, is_active = $8, updated_at = NOW()
	WHERE id = $1`,
		o.ID, o.Title, o.Date, o.CategoryID, o.NotifyTitle, o.NotifyBody, o.DaysBefore, o.IsActive)
	if err != nil {
		return domain.Occasion{}, richerror.New(op).WithErr(err).WithMessage("failed to update occasion")
	}
	if tag.RowsAffected() == 0 {
		return domain.Occasion{}, richerror.New(op).WithMessage("مناسبت مورد نظر پیدا نشد")
	}
	return o, nil
}

func (d DB) Delete(ctx context.Context, id string) error {
	const op = "postgresoccasion.Delete"
	tag, err := d.conn.Exec(ctx, `DELETE FROM occasions WHERE id = $1`, id)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to delete occasion")
	}
	if tag.RowsAffected() == 0 {
		return richerror.New(op).WithMessage("مناسبت مورد نظر پیدا نشد")
	}
	return nil
}
