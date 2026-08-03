package postgreshero

import (
	"context"

	domain "wallpaperstore/internal/domain/hero"
	"wallpaperstore/internal/pkg/richerror"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

func (d DB) GetHero(ctx context.Context) (domain.Hero, error) {
	const op = "postgreshero.GetHero"

	var h domain.Hero
	err := d.conn.QueryRow(ctx, `SELECT title, slogan, image, updated_at FROM hero_config LIMIT 1`).
		Scan(&h.Title, &h.Slogan, &h.Image, &h.UpdatedAt)
	if err != nil {
		return domain.Hero{}, richerror.New(op).WithErr(err).WithMessage("failed to read hero config")
	}
	return h, nil
}

func (d DB) SaveHero(ctx context.Context, h domain.Hero) (domain.Hero, error) {
	const op = "postgreshero.SaveHero"

	query := `
	UPDATE hero_config SET title = $1, slogan = $2, image = $3, updated_at = NOW()
	WHERE id = true
	RETURNING updated_at
`
	err := d.conn.QueryRow(ctx, query, h.Title, h.Slogan, h.Image).Scan(&h.UpdatedAt)
	if err != nil {
		return domain.Hero{}, richerror.New(op).WithErr(err).WithMessage("failed to update hero config")
	}
	return h, nil
}
