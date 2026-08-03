package postgreswallpaper

import (
	"context"

	domain "wallpaperstore/internal/domain/wallpaper"
	wallpapervalueobject "wallpaperstore/internal/domain/wallpaper/valueobject"
	"wallpaperstore/internal/pkg/richerror"
)

func (d DB) GetCategories(ctx context.Context) ([]domain.Category, error) {
	const op = "postgreswallpaper.GetCategories"

	query := `SELECT id, title, sort_order FROM categories ORDER BY sort_order, id`

	rows, err := d.conn.Query(ctx, query)
	if err != nil {
		return nil, richerror.New(op).WithErr(err).WithMessage("failed to query categories")
	}
	defer rows.Close()

	categories := make([]domain.Category, 0)
	for rows.Next() {
		var c domain.Category
		if err := rows.Scan(&c.ID, &c.Title, &c.Sort); err != nil {
			return nil, richerror.New(op).WithErr(err)
		}
		categories = append(categories, c)
	}
	return categories, rows.Err()
}

func (d DB) GetActiveWallpapers(ctx context.Context) ([]domain.Wallpaper, error) {
	const op = "postgreswallpaper.GetActiveWallpapers"

	query := `
	SELECT id, title, category, premium, thumb, full_url, width, height, bytes,
	       is_active, created_at, updated_at
	FROM wallpapers
	WHERE is_active = true
	ORDER BY premium ASC, created_at ASC
`

	rows, err := d.conn.Query(ctx, query)
	if err != nil {
		return nil, richerror.New(op).WithErr(err).WithMessage("failed to query wallpapers")
	}
	defer rows.Close()

	wallpapers := make([]domain.Wallpaper, 0)
	for rows.Next() {
		var (
			w  domain.Wallpaper
			id string
		)
		if err := rows.Scan(
			&id, &w.Title, &w.Category, &w.Premium, &w.Thumb, &w.Full,
			&w.Width, &w.Height, &w.Bytes, &w.IsActive, &w.CreatedAt, &w.UpdatedAt,
		); err != nil {
			return nil, richerror.New(op).WithErr(err)
		}
		w.ID = wallpapervalueobject.WallpaperID(id)
		wallpapers = append(wallpapers, w)
	}
	return wallpapers, rows.Err()
}

func (d DB) GetCatalogVersion(ctx context.Context) (int, error) {
	const op = "postgreswallpaper.GetCatalogVersion"

	var version int
	err := d.conn.QueryRow(ctx, `SELECT version FROM catalog_meta LIMIT 1`).Scan(&version)
	if err != nil {
		return 0, richerror.New(op).WithErr(err).WithMessage("failed to read catalog version")
	}
	return version, nil
}

func (d DB) SaveWallpaper(ctx context.Context, w domain.Wallpaper) (domain.Wallpaper, error) {
	const op = "postgreswallpaper.SaveWallpaper"

	query := `
	INSERT INTO wallpapers (
		id, title, category, premium, thumb, full_url, width, height, bytes, is_active
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	RETURNING id
`

	var id string
	err := d.conn.QueryRow(ctx, query,
		string(w.ID), w.Title, w.Category, w.Premium, w.Thumb, w.Full,
		w.Width, w.Height, w.Bytes, w.IsActive,
	).Scan(&id)
	if err != nil {
		return domain.Wallpaper{}, richerror.New(op).WithErr(err).WithMessage("failed to insert wallpaper")
	}

	w.ID = wallpapervalueobject.WallpaperID(id)
	return w, nil
}

func (d DB) SaveCategory(ctx context.Context, c domain.Category) (domain.Category, error) {
	const op = "postgreswallpaper.SaveCategory"

	query := `
	INSERT INTO categories (id, title, sort_order)
	VALUES ($1, $2, $3)
	ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, sort_order = EXCLUDED.sort_order
`

	_, err := d.conn.Exec(ctx, query, c.ID, c.Title, c.Sort)
	if err != nil {
		return domain.Category{}, richerror.New(op).WithErr(err).WithMessage("failed to upsert category")
	}
	return c, nil
}

func (d DB) BumpCatalogVersion(ctx context.Context) error {
	const op = "postgreswallpaper.BumpCatalogVersion"

	_, err := d.conn.Exec(ctx, `UPDATE catalog_meta SET version = version + 1`)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to bump catalog version")
	}
	return nil
}
