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
	err := row.Scan(&q.ID, &q.CategoryID, &q.Line1, &q.Line2, &q.Source, &q.SortOrder, &q.IsActive, &q.CreatedAt, &q.UpdatedAt)
	return q, err
}

func (d DB) GetActiveQuotes(ctx context.Context) ([]domain.Quote, error) {
	const op = "postgresquote.GetActiveQuotes"
	return d.query(ctx, op, `
		SELECT id, category_id, line1, line2, source, sort_order, is_active, created_at, updated_at
		FROM quotes WHERE is_active = true ORDER BY sort_order, id`)
}

func (d DB) GetAllQuotes(ctx context.Context) ([]domain.Quote, error) {
	const op = "postgresquote.GetAllQuotes"
	return d.query(ctx, op, `
		SELECT id, category_id, line1, line2, source, sort_order, is_active, created_at, updated_at
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
	INSERT INTO quotes (id, category_id, line1, line2, source, sort_order, is_active)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	RETURNING id
`
	var id string
	err := d.conn.QueryRow(ctx, query, q.ID, q.CategoryID, q.Line1, q.Line2, q.Source, q.SortOrder, q.IsActive).Scan(&id)
	if err != nil {
		return domain.Quote{}, richerror.New(op).WithErr(err).WithMessage("failed to insert quote")
	}
	q.ID = id
	return q, nil
}

func (d DB) UpdateQuote(ctx context.Context, q domain.Quote) (domain.Quote, error) {
	const op = "postgresquote.UpdateQuote"
	query := `
	UPDATE quotes SET category_id = $2, line1 = $3, line2 = $4, source = $5, sort_order = $6, is_active = $7, updated_at = NOW()
	WHERE id = $1
	RETURNING id
`
	var id string
	err := d.conn.QueryRow(ctx, query, q.ID, q.CategoryID, q.Line1, q.Line2, q.Source, q.SortOrder, q.IsActive).Scan(&id)
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

func (d DB) GetCategories(ctx context.Context) ([]domain.Category, error) {
	const op = "postgresquote.GetCategories"

	query := `SELECT id, title, sort_order FROM quote_categories ORDER BY sort_order, id`

	rows, err := d.conn.Query(ctx, query)
	if err != nil {
		return nil, richerror.New(op).WithErr(err).WithMessage("failed to query quote categories")
	}
	defer rows.Close()

	cats := make([]domain.Category, 0)
	for rows.Next() {
		var c domain.Category
		if err := rows.Scan(&c.ID, &c.Title, &c.Sort); err != nil {
			return nil, richerror.New(op).WithErr(err)
		}
		cats = append(cats, c)
	}
	return cats, rows.Err()
}

func (d DB) SaveCategory(ctx context.Context, c domain.Category) (domain.Category, error) {
	const op = "postgresquote.SaveCategory"

	query := `
	INSERT INTO quote_categories (id, title, sort_order)
	VALUES ($1, $2, $3)
	ON CONFLICT (id) DO UPDATE SET
		title = EXCLUDED.title,
		sort_order = EXCLUDED.sort_order
`
	_, err := d.conn.Exec(ctx, query, c.ID, c.Title, c.Sort)
	if err != nil {
		return domain.Category{}, richerror.New(op).WithErr(err).WithMessage("failed to upsert quote category")
	}
	return c, nil
}

func (d DB) DeleteCategory(ctx context.Context, id string) error {
	const op = "postgresquote.DeleteCategory"

	tag, err := d.conn.Exec(ctx, `DELETE FROM quote_categories WHERE id = $1`, id)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("این دسته نقل‌قول دارد؛ ابتدا نقل‌قول‌های آن را حذف یا جابه‌جا کنید")
	}
	if tag.RowsAffected() == 0 {
		return richerror.New(op).WithMessage("دسته مورد نظر پیدا نشد")
	}
	return nil
}
