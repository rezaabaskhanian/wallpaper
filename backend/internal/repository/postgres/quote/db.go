package postgresquote

import (
	"context"

	domain "wallpaperstore/internal/domain/quote"
	"wallpaperstore/internal/pkg/richerror"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

func scanQuote(row interface {
	Scan(dest ...any) error
}) (domain.Quote, error) {
	var q domain.Quote
	err := row.Scan(&q.ID, &q.Line1, &q.Line2, &q.Source, &q.SortOrder, &q.IsActive, &q.CreatedAt, &q.UpdatedAt)
	return q, err
}

func (d DB) GetActiveQuotes(ctx context.Context) ([]domain.Quote, error) {
	const op = "postgresquote.GetActiveQuotes"
	return d.query(ctx, op, `
		SELECT id, line1, line2, source, sort_order, is_active, created_at, updated_at
		FROM quotes WHERE is_active = true ORDER BY sort_order, id`)
}

func (d DB) GetAllQuotes(ctx context.Context) ([]domain.Quote, error) {
	const op = "postgresquote.GetAllQuotes"
	return d.query(ctx, op, `
		SELECT id, line1, line2, source, sort_order, is_active, created_at, updated_at
		FROM quotes ORDER BY sort_order, id`)
}

func (d DB) query(ctx context.Context, op string, query string) ([]domain.Quote, error) {
	rows, err := d.conn.Query(ctx, query)
	if err != nil {
		return nil, richerror.New(richerror.Op(op)).WithErr(err).WithMessage("failed to query quotes")
	}
	defer rows.Close()

	quotes := make([]domain.Quote, 0)
	for rows.Next() {
		q, err := scanQuote(rows)
		if err != nil {
			return nil, richerror.New(richerror.Op(op)).WithErr(err)
		}
		quotes = append(quotes, q)
	}
	return quotes, rows.Err()
}

func (d DB) SaveQuote(ctx context.Context, q domain.Quote) (domain.Quote, error) {
	const op = "postgresquote.SaveQuote"
	query := `
	INSERT INTO quotes (id, line1, line2, source, sort_order, is_active)
	VALUES ($1, $2, $3, $4, $5, $6)
	RETURNING id
`
	var id string
	err := d.conn.QueryRow(ctx, query, q.ID, q.Line1, q.Line2, q.Source, q.SortOrder, q.IsActive).Scan(&id)
	if err != nil {
		return domain.Quote{}, richerror.New(op).WithErr(err).WithMessage("failed to insert quote")
	}
	q.ID = id
	return q, nil
}

func (d DB) UpdateQuote(ctx context.Context, q domain.Quote) (domain.Quote, error) {
	const op = "postgresquote.UpdateQuote"
	query := `
	UPDATE quotes SET line1 = $2, line2 = $3, source = $4, sort_order = $5, is_active = $6, updated_at = NOW()
	WHERE id = $1
	RETURNING id
`
	var id string
	err := d.conn.QueryRow(ctx, query, q.ID, q.Line1, q.Line2, q.Source, q.SortOrder, q.IsActive).Scan(&id)
	if err != nil {
		return domain.Quote{}, richerror.New(op).WithErr(err).WithMessage("نقل‌قول مورد نظر پیدا نشد")
	}
	q.ID = id
	return q, nil
}

func (d DB) DeleteQuote(ctx context.Context, id string) error {
	const op = "postgresquote.DeleteQuote"
	tag, err := d.conn.Exec(ctx, `DELETE FROM quotes WHERE id = $1`, id)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to delete quote")
	}
	if tag.RowsAffected() == 0 {
		return richerror.New(op).WithMessage("نقل‌قول مورد نظر پیدا نشد")
	}
	return nil
}
