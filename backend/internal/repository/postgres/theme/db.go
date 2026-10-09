package postgrestheme

import (
	"context"

	domain "wallpaperstore/internal/domain/theme"
	"wallpaperstore/internal/pkg/richerror"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

const columns = `id, title, wallpaper_url, widget_bg_small, widget_bg_wide, text_color,
	accent_color, is_premium, sort_order, is_active, created_at, updated_at`

func (d DB) GetAll(ctx context.Context, onlyActive bool) ([]domain.Theme, error) {
	const op = "postgrestheme.GetAll"
	query := `SELECT ` + columns + ` FROM themes`
	if onlyActive {
		query += ` WHERE is_active`
	}
	query += ` ORDER BY sort_order, created_at`

	rows, err := d.conn.Query(ctx, query)
	if err != nil {
		return nil, richerror.New(op).WithErr(err).WithMessage("failed to query themes")
	}
	defer rows.Close()

	themes := make([]domain.Theme, 0)
	for rows.Next() {
		var t domain.Theme
		if err := rows.Scan(&t.ID, &t.Title, &t.WallpaperURL, &t.WidgetBgSmall, &t.WidgetBgWide,
			&t.TextColor, &t.AccentColor, &t.IsPremium, &t.Sort, &t.IsActive,
			&t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, richerror.New(op).WithErr(err)
		}
		themes = append(themes, t)
	}
	return themes, rows.Err()
}

func (d DB) Save(ctx context.Context, t domain.Theme) (domain.Theme, error) {
	const op = "postgrestheme.Save"
	_, err := d.conn.Exec(ctx, `
	INSERT INTO themes (id, title, wallpaper_url, widget_bg_small, widget_bg_wide, text_color,
		accent_color, is_premium, sort_order, is_active)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		t.ID, t.Title, t.WallpaperURL, t.WidgetBgSmall, t.WidgetBgWide, t.TextColor,
		t.AccentColor, t.IsPremium, t.Sort, t.IsActive)
	if err != nil {
		return domain.Theme{}, richerror.New(op).WithErr(err).WithMessage("تمی با این شناسه قبلاً ثبت شده است")
	}
	return t, nil
}

func (d DB) Update(ctx context.Context, t domain.Theme) (domain.Theme, error) {
	const op = "postgrestheme.Update"
	tag, err := d.conn.Exec(ctx, `
	UPDATE themes SET title = $2, wallpaper_url = $3, widget_bg_small = $4, widget_bg_wide = $5,
		text_color = $6, accent_color = $7, is_premium = $8, sort_order = $9, is_active = $10,
		updated_at = NOW()
	WHERE id = $1`,
		t.ID, t.Title, t.WallpaperURL, t.WidgetBgSmall, t.WidgetBgWide, t.TextColor,
		t.AccentColor, t.IsPremium, t.Sort, t.IsActive)
	if err != nil {
		return domain.Theme{}, richerror.New(op).WithErr(err).WithMessage("failed to update theme")
	}
	if tag.RowsAffected() == 0 {
		return domain.Theme{}, richerror.New(op).WithMessage("تم مورد نظر پیدا نشد")
	}
	return t, nil
}

func (d DB) Delete(ctx context.Context, id string) error {
	const op = "postgrestheme.Delete"
	tag, err := d.conn.Exec(ctx, `DELETE FROM themes WHERE id = $1`, id)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to delete theme")
	}
	if tag.RowsAffected() == 0 {
		return richerror.New(op).WithMessage("تم مورد نظر پیدا نشد")
	}
	return nil
}
