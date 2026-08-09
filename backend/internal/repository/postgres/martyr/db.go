package postgresmartyr

import (
	"context"
	"database/sql"

	domain "wallpaperstore/internal/domain/martyr"
	"wallpaperstore/internal/pkg/richerror"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

func scanMartyr(row interface {
	Scan(dest ...any) error
}) (domain.Martyr, error) {
	var m domain.Martyr
	var categoryID sql.NullString
	err := row.Scan(
		&m.ID, &m.Name, &m.Martyrdom, &m.Born, &m.MartyredOn, &m.Place, &m.Will,
		&m.Photo, &m.SortOrder, &m.IsActive, &categoryID, &m.CreatedAt, &m.UpdatedAt,
	)
	m.CategoryID = categoryID.String
	return m, err
}

func (d DB) GetActiveMartyrs(ctx context.Context) ([]domain.Martyr, error) {
	const op = "postgresmartyr.GetActiveMartyrs"
	return d.query(ctx, op, `
		SELECT id, name, martyrdom, born, martyred_on, place, will, photo, sort_order, is_active, category_id, created_at, updated_at
		FROM martyrs WHERE is_active = true ORDER BY sort_order, id`)
}

func (d DB) GetAllMartyrs(ctx context.Context) ([]domain.Martyr, error) {
	const op = "postgresmartyr.GetAllMartyrs"
	return d.query(ctx, op, `
		SELECT id, name, martyrdom, born, martyred_on, place, will, photo, sort_order, is_active, category_id, created_at, updated_at
		FROM martyrs ORDER BY sort_order, id`)
}

func (d DB) query(ctx context.Context, op string, query string) ([]domain.Martyr, error) {
	rows, err := d.conn.Query(ctx, query)
	if err != nil {
		return nil, richerror.New(richerror.Op(op)).WithErr(err).WithMessage("failed to query martyrs")
	}
	defer rows.Close()

	martyrs := make([]domain.Martyr, 0)
	for rows.Next() {
		m, err := scanMartyr(rows)
		if err != nil {
			return nil, richerror.New(richerror.Op(op)).WithErr(err)
		}
		martyrs = append(martyrs, m)
	}
	return martyrs, rows.Err()
}

func (d DB) SaveMartyr(ctx context.Context, m domain.Martyr) (domain.Martyr, error) {
	const op = "postgresmartyr.SaveMartyr"

	query := `
	INSERT INTO martyrs (id, name, martyrdom, born, martyred_on, place, will, photo, sort_order, is_active, category_id)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULLIF($11, ''))
	RETURNING id
`
	var id string
	err := d.conn.QueryRow(ctx, query,
		m.ID, m.Name, m.Martyrdom, m.Born, m.MartyredOn, m.Place, m.Will, m.Photo, m.SortOrder, m.IsActive, m.CategoryID,
	).Scan(&id)
	if err != nil {
		return domain.Martyr{}, richerror.New(op).WithErr(err).WithMessage("failed to insert martyr")
	}
	m.ID = id
	return m, nil
}

func (d DB) UpdateMartyr(ctx context.Context, m domain.Martyr) (domain.Martyr, error) {
	const op = "postgresmartyr.UpdateMartyr"

	query := `
	UPDATE martyrs
	SET name = $2, martyrdom = $3, born = $4, martyred_on = $5, place = $6, will = $7,
	    photo = $8, sort_order = $9, is_active = $10, category_id = NULLIF($11, ''), updated_at = NOW()
	WHERE id = $1
	RETURNING id
`
	var id string
	err := d.conn.QueryRow(ctx, query,
		m.ID, m.Name, m.Martyrdom, m.Born, m.MartyredOn, m.Place, m.Will, m.Photo, m.SortOrder, m.IsActive, m.CategoryID,
	).Scan(&id)
	if err != nil {
		return domain.Martyr{}, richerror.New(op).WithErr(err).WithMessage("شهید مورد نظر پیدا نشد")
	}
	m.ID = id
	return m, nil
}

func (d DB) DeleteMartyr(ctx context.Context, id string) error {
	const op = "postgresmartyr.DeleteMartyr"

	tag, err := d.conn.Exec(ctx, `DELETE FROM martyrs WHERE id = $1`, id)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to delete martyr")
	}
	if tag.RowsAffected() == 0 {
		return richerror.New(op).WithMessage("شهید مورد نظر پیدا نشد")
	}
	return nil
}

func scanCategory(row interface {
	Scan(dest ...any) error
}) (domain.MartyrCategory, error) {
	var c domain.MartyrCategory
	err := row.Scan(&c.ID, &c.Title, &c.SortOrder)
	return c, err
}

func (d DB) GetCategories(ctx context.Context) ([]domain.MartyrCategory, error) {
	const op = "postgresmartyr.GetCategories"
	rows, err := d.conn.Query(ctx, `
		SELECT id, title, sort_order FROM martyr_categories ORDER BY sort_order, id`)
	if err != nil {
		return nil, richerror.New(op).WithErr(err).WithMessage("failed to query martyr categories")
	}
	defer rows.Close()

	cats := make([]domain.MartyrCategory, 0)
	for rows.Next() {
		c, err := scanCategory(rows)
		if err != nil {
			return nil, richerror.New(op).WithErr(err)
		}
		cats = append(cats, c)
	}
	return cats, rows.Err()
}

func (d DB) SaveCategory(ctx context.Context, c domain.MartyrCategory) (domain.MartyrCategory, error) {
	const op = "postgresmartyr.SaveCategory"
	query := `
	INSERT INTO martyr_categories (id, title, sort_order)
	VALUES ($1, $2, $3)
	ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, sort_order = EXCLUDED.sort_order
	RETURNING id
`
	var id string
	err := d.conn.QueryRow(ctx, query, c.ID, c.Title, c.SortOrder).Scan(&id)
	if err != nil {
		return domain.MartyrCategory{}, richerror.New(op).WithErr(err).WithMessage("failed to upsert martyr category")
	}
	c.ID = id
	return c, nil
}

func (d DB) DeleteCategory(ctx context.Context, id string) error {
	const op = "postgresmartyr.DeleteCategory"
	tag, err := d.conn.Exec(ctx, `DELETE FROM martyr_categories WHERE id = $1`, id)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to delete martyr category")
	}
	if tag.RowsAffected() == 0 {
		return richerror.New(op).WithMessage("دسته مورد نظر پیدا نشد")
	}
	return nil
}
