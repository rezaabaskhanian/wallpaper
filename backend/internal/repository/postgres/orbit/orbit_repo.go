package postgresorbit

import (
	"context"

	domain "wallpaperstore/internal/domain/orbit"
	"wallpaperstore/internal/pkg/richerror"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

func (d DB) GetCategories(ctx context.Context) ([]domain.Category, error) {
	const op = "postgresorbit.GetCategories"

	query := `SELECT id, title, sort_order, center_image, center_title, center_slogan FROM orbit_categories ORDER BY sort_order, id`

	rows, err := d.conn.Query(ctx, query)
	if err != nil {
		return nil, richerror.New(op).WithErr(err).WithMessage("failed to query orbit categories")
	}
	defer rows.Close()

	cats := make([]domain.Category, 0)
	for rows.Next() {
		var c domain.Category
		if err := rows.Scan(&c.ID, &c.Title, &c.Sort, &c.CenterImage, &c.CenterTitle, &c.CenterSlogan); err != nil {
			return nil, richerror.New(op).WithErr(err)
		}
		cats = append(cats, c)
	}
	return cats, rows.Err()
}

func (d DB) SaveCategory(ctx context.Context, c domain.Category) (domain.Category, error) {
	const op = "postgresorbit.SaveCategory"

	query := `
	INSERT INTO orbit_categories (id, title, sort_order, center_image, center_title, center_slogan)
	VALUES ($1, $2, $3, $4, $5, $6)
	ON CONFLICT (id) DO UPDATE SET
		title = EXCLUDED.title,
		sort_order = EXCLUDED.sort_order,
		center_image = EXCLUDED.center_image,
		center_title = EXCLUDED.center_title,
		center_slogan = EXCLUDED.center_slogan
`

	_, err := d.conn.Exec(ctx, query, c.ID, c.Title, c.Sort, c.CenterImage, c.CenterTitle, c.CenterSlogan)
	if err != nil {
		return domain.Category{}, richerror.New(op).WithErr(err).WithMessage("failed to upsert orbit category")
	}
	return c, nil
}

func (d DB) DeleteCategory(ctx context.Context, id string) error {
	const op = "postgresorbit.DeleteCategory"

	tag, err := d.conn.Exec(ctx, `DELETE FROM orbit_categories WHERE id = $1`, id)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to delete orbit category")
	}
	if tag.RowsAffected() == 0 {
		return richerror.New(op).WithMessage("دسته مورد نظر پیدا نشد")
	}
	return nil
}

func scanItem(row interface{ Scan(dest ...any) error }) (domain.Item, error) {
	var it domain.Item
	err := row.Scan(&it.ID, &it.CategoryID, &it.Label, &it.Image, &it.Description, &it.Sort, &it.IsActive)
	return it, err
}

func (d DB) GetActiveItems(ctx context.Context) ([]domain.Item, error) {
	const op = "postgresorbit.GetActiveItems"
	return d.queryItems(ctx, op, `
		SELECT id, category_id, label, image, description, sort_order, is_active
		FROM orbit_items WHERE is_active = true ORDER BY sort_order, id`)
}

func (d DB) GetAllItems(ctx context.Context) ([]domain.Item, error) {
	const op = "postgresorbit.GetAllItems"
	return d.queryItems(ctx, op, `
		SELECT id, category_id, label, image, description, sort_order, is_active
		FROM orbit_items ORDER BY sort_order, id`)
}

func (d DB) queryItems(ctx context.Context, op string, query string) ([]domain.Item, error) {
	rows, err := d.conn.Query(ctx, query)
	if err != nil {
		return nil, richerror.New(richerror.Op(op)).WithErr(err).WithMessage("failed to query orbit items")
	}
	defer rows.Close()

	items := make([]domain.Item, 0)
	for rows.Next() {
		it, err := scanItem(rows)
		if err != nil {
			return nil, richerror.New(richerror.Op(op)).WithErr(err)
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func (d DB) SaveItem(ctx context.Context, it domain.Item) (domain.Item, error) {
	const op = "postgresorbit.SaveItem"

	query := `
	INSERT INTO orbit_items (id, category_id, label, image, description, sort_order, is_active)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	RETURNING id
`
	var id string
	err := d.conn.QueryRow(ctx, query, it.ID, it.CategoryID, it.Label, it.Image, it.Description, it.Sort, it.IsActive).Scan(&id)
	if err != nil {
		return domain.Item{}, richerror.New(op).WithErr(err).WithMessage("failed to insert orbit item")
	}
	it.ID = id
	return it, nil
}

func (d DB) UpdateItem(ctx context.Context, it domain.Item) (domain.Item, error) {
	const op = "postgresorbit.UpdateItem"

	query := `
	UPDATE orbit_items
	SET category_id = $2, label = $3, image = $4, description = $5, sort_order = $6, is_active = $7
	WHERE id = $1
	RETURNING id
`
	var id string
	err := d.conn.QueryRow(ctx, query, it.ID, it.CategoryID, it.Label, it.Image, it.Description, it.Sort, it.IsActive).Scan(&id)
	if err != nil {
		return domain.Item{}, richerror.New(op).WithErr(err).WithMessage("آیتم مورد نظر پیدا نشد")
	}
	it.ID = id
	return it, nil
}

func (d DB) DeleteItem(ctx context.Context, id string) error {
	const op = "postgresorbit.DeleteItem"

	tag, err := d.conn.Exec(ctx, `DELETE FROM orbit_items WHERE id = $1`, id)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to delete orbit item")
	}
	if tag.RowsAffected() == 0 {
		return richerror.New(op).WithMessage("آیتم مورد نظر پیدا نشد")
	}
	return nil
}
