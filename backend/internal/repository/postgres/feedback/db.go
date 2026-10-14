package postgresfeedback

import (
	"context"
	"errors"
	"time"

	domain "wallpaperstore/internal/domain/feedback"
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

// ---- درخواست‌ها ----

func (d DB) CountRequestsSince(ctx context.Context, deviceID string, since time.Time) (int, error) {
	var n int
	err := d.conn.QueryRow(ctx,
		`SELECT COUNT(*) FROM wallpaper_requests WHERE device_id = $1 AND created_at >= $2`,
		deviceID, since).Scan(&n)
	return n, err
}

func (d DB) InsertRequest(ctx context.Context, r domain.Request) error {
	const op = "postgresfeedback.InsertRequest"
	_, err := d.conn.Exec(ctx,
		`INSERT INTO wallpaper_requests (id, device_id, text, status) VALUES ($1, $2, $3, $4)`,
		r.ID, r.DeviceID, r.Text, r.Status)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("ثبت درخواست ممکن نشد")
	}
	return nil
}

func (d DB) ListRequests(ctx context.Context) ([]domain.Request, error) {
	const op = "postgresfeedback.ListRequests"
	rows, err := d.conn.Query(ctx, `
		SELECT `+requestColumns+`
		FROM wallpaper_requests ORDER BY created_at DESC LIMIT 2000`)
	if err != nil {
		return nil, richerror.New(op).WithErr(err)
	}
	return scanRequests(op, rows)
}

const requestColumns = `id, device_id, text, status, category_id, reply, created_at, updated_at`

func scanRequests(op richerror.Op, rows pgx.Rows) ([]domain.Request, error) {
	defer rows.Close()
	out := make([]domain.Request, 0)
	for rows.Next() {
		var r domain.Request
		if err := rows.Scan(&r.ID, &r.DeviceID, &r.Text, &r.Status, &r.CategoryID, &r.Reply,
			&r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, richerror.New(op).WithErr(err)
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (d DB) DeviceRequests(ctx context.Context, deviceID string) ([]domain.Request, error) {
	const op = "postgresfeedback.DeviceRequests"
	rows, err := d.conn.Query(ctx, `
		SELECT `+requestColumns+`
		FROM wallpaper_requests WHERE device_id = $1 ORDER BY created_at DESC LIMIT 200`, deviceID)
	if err != nil {
		return nil, richerror.New(op).WithErr(err)
	}
	return scanRequests(op, rows)
}

// DeviceStats خلاصه‌ی فعالیت یک دستگاه از app_events (همان شناسه‌ی ناشناسی که
// اپ با رویدادهای آنالیتیکس و درخواست‌ها می‌فرستد) و رأی‌هایش.
func (d DB) DeviceStats(ctx context.Context, deviceID string) (domain.DeviceStats, error) {
	const op = "postgresfeedback.DeviceStats"
	var st domain.DeviceStats
	err := d.conn.QueryRow(ctx, `
		SELECT
			MIN(created_at), MAX(created_at),
			COALESCE((ARRAY_AGG(app_version ORDER BY created_at DESC))[1], ''),
			COUNT(*) FILTER (WHERE event = 'app_open'),
			COUNT(*) FILTER (WHERE event = 'wallpaper_set'),
			(SELECT COUNT(*) FROM poll_votes WHERE device_id = $1)
		FROM app_events WHERE device_id = $1`, deviceID).
		Scan(&st.FirstSeen, &st.LastSeen, &st.AppVersion, &st.Opens, &st.WallpaperSets, &st.PollVotes)
	if err != nil {
		return st, richerror.New(op).WithErr(err)
	}
	return st, nil
}

func (d DB) UpdateRequests(ctx context.Context, ids []string, status, categoryID, reply string) error {
	const op = "postgresfeedback.UpdateRequests"
	_, err := d.conn.Exec(ctx, `
		UPDATE wallpaper_requests SET status = $2, category_id = $3, reply = $4, updated_at = NOW()
		WHERE id = ANY($1)`, ids, status, categoryID, reply)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("به‌روزرسانی درخواست‌ها ممکن نشد")
	}
	return nil
}

func (d DB) DeleteRequest(ctx context.Context, id string) error {
	_, err := d.conn.Exec(ctx, `DELETE FROM wallpaper_requests WHERE id = $1`, id)
	return err
}

// ---- رأی‌گیری ----

func (d DB) loadOptions(ctx context.Context, polls []domain.Poll) error {
	if len(polls) == 0 {
		return nil
	}
	ids := make([]string, len(polls))
	index := make(map[string]int, len(polls))
	for i, p := range polls {
		ids[i] = p.ID
		index[p.ID] = i
	}
	rows, err := d.conn.Query(ctx, `
		SELECT o.id, o.poll_id, o.title, o.category_id, o.sort_order,
		       (SELECT COUNT(*) FROM poll_votes v WHERE v.option_id = o.id)
		FROM poll_options o WHERE o.poll_id = ANY($1) ORDER BY o.sort_order`, ids)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var o domain.PollOption
		if err := rows.Scan(&o.ID, &o.PollID, &o.Title, &o.CategoryID, &o.Sort, &o.Votes); err != nil {
			return err
		}
		i := index[o.PollID]
		polls[i].Options = append(polls[i].Options, o)
	}
	return rows.Err()
}

func (d DB) queryPolls(ctx context.Context, where string) ([]domain.Poll, error) {
	rows, err := d.conn.Query(ctx, `
		SELECT id, question, is_active, winner_option_id, created_at, closed_at
		FROM polls `+where+` ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	polls := make([]domain.Poll, 0)
	for rows.Next() {
		var p domain.Poll
		if err := rows.Scan(&p.ID, &p.Question, &p.IsActive, &p.WinnerOptionID, &p.CreatedAt, &p.ClosedAt); err != nil {
			return nil, err
		}
		polls = append(polls, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()
	return polls, d.loadOptions(ctx, polls)
}

func (d DB) ActivePoll(ctx context.Context) (*domain.Poll, error) {
	polls, err := d.queryPolls(ctx, `WHERE is_active`)
	if err != nil || len(polls) == 0 {
		return nil, err
	}
	return &polls[0], nil
}

func (d DB) ListPolls(ctx context.Context) ([]domain.Poll, error) {
	return d.queryPolls(ctx, ``)
}

func (d DB) CreatePoll(ctx context.Context, p domain.Poll) error {
	const op = "postgresfeedback.CreatePoll"
	tx, err := d.conn.Begin(ctx)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit
	// Only one poll is open at a time.
	if _, err := tx.Exec(ctx, `UPDATE polls SET is_active = FALSE, closed_at = NOW() WHERE is_active`); err != nil {
		return richerror.New(op).WithErr(err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO polls (id, question, is_active) VALUES ($1, $2, TRUE)`,
		p.ID, p.Question); err != nil {
		return richerror.New(op).WithErr(err)
	}
	for _, o := range p.Options {
		if _, err := tx.Exec(ctx, `
			INSERT INTO poll_options (id, poll_id, title, category_id, sort_order) VALUES ($1, $2, $3, $4, $5)`,
			o.ID, p.ID, o.Title, o.CategoryID, o.Sort); err != nil {
			return richerror.New(op).WithErr(err)
		}
	}
	return tx.Commit(ctx)
}

func (d DB) ClosePoll(ctx context.Context, id string, winnerOptionID *string) error {
	const op = "postgresfeedback.ClosePoll"
	tag, err := d.conn.Exec(ctx, `
		UPDATE polls SET is_active = FALSE, winner_option_id = $2, closed_at = COALESCE(closed_at, NOW())
		WHERE id = $1`, id, winnerOptionID)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	if tag.RowsAffected() == 0 {
		return richerror.New(op).WithMessage("رأی‌گیری پیدا نشد")
	}
	return nil
}

func (d DB) DeletePoll(ctx context.Context, id string) error {
	_, err := d.conn.Exec(ctx, `DELETE FROM polls WHERE id = $1`, id)
	return err
}

func (d DB) DeviceVote(ctx context.Context, pollID, deviceID string) (string, error) {
	var opt string
	err := d.conn.QueryRow(ctx,
		`SELECT option_id FROM poll_votes WHERE poll_id = $1 AND device_id = $2`, pollID, deviceID).Scan(&opt)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return opt, err
}

// Vote ثبت یا عوض کردن رأی این دستگاه.
func (d DB) Vote(ctx context.Context, pollID, deviceID, optionID string) error {
	_, err := d.conn.Exec(ctx, `
		INSERT INTO poll_votes (poll_id, device_id, option_id) VALUES ($1, $2, $3)
		ON CONFLICT (poll_id, device_id) DO UPDATE SET option_id = EXCLUDED.option_id, created_at = NOW()`,
		pollID, deviceID, optionID)
	return err
}

// ---- صندوق خبر ----

// Inbox درخواست‌های انجام‌شده‌ی این دستگاه و رأی‌گیری‌های بسته‌شده با برنده‌ای که
// این دستگاه در آن‌ها رأی داده (در ۶۰ روز اخیر). شناسه‌ها پایدارند تا اپ هر
// خبر را فقط یک‌بار نشان دهد.
func (d DB) Inbox(ctx context.Context, deviceID string) ([]domain.InboxMessage, error) {
	const op = "postgresfeedback.Inbox"
	out := make([]domain.InboxMessage, 0)

	rows, err := d.conn.Query(ctx, `
		SELECT id, text, status, category_id, reply FROM wallpaper_requests
		WHERE device_id = $1
			AND (status = 'done' OR (status = 'rejected' AND reply <> ''))
			AND updated_at >= NOW() - INTERVAL '60 days'`, deviceID)
	if err != nil {
		return nil, richerror.New(op).WithErr(err)
	}
	for rows.Next() {
		var id, text, status, cat, reply string
		if err := rows.Scan(&id, &text, &status, &cat, &reply); err != nil {
			rows.Close()
			return nil, richerror.New(op).WithErr(err)
		}
		out = append(out, requestMessage(id, text, status, cat, reply))
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, richerror.New(op).WithErr(err)
	}

	rows, err = d.conn.Query(ctx, `
		SELECT p.id, o.title, o.category_id
		FROM polls p
		JOIN poll_options o ON o.id = p.winner_option_id
		JOIN poll_votes v ON v.poll_id = p.id AND v.device_id = $1
		WHERE NOT p.is_active AND p.closed_at >= NOW() - INTERVAL '60 days'`, deviceID)
	if err != nil {
		return nil, richerror.New(op).WithErr(err)
	}
	defer rows.Close()
	for rows.Next() {
		var id, title, cat string
		if err := rows.Scan(&id, &title, &cat); err != nil {
			return nil, richerror.New(op).WithErr(err)
		}
		out = append(out, domain.InboxMessage{
			ID:         "poll-" + id,
			Title:      "نتیجه‌ی رأی‌گیری: «" + title + "» برنده شد",
			Body:       "والپیپرهای «" + title + "» اضافه شد. بزن و ببین.",
			CategoryID: cat,
		})
	}
	return out, rows.Err()
}

// requestMessage خبر یک درخواست: «انجام شد» (با جواب ادمین یا متن پیش‌فرض) یا
// «رد» با جوابی که ادمین نوشته (بی‌جواب‌ها خبری ندارند).
func requestMessage(id, text, status, categoryID, reply string) domain.InboxMessage {
	m := domain.InboxMessage{ID: "request-" + id, CategoryID: categoryID}
	if status == domain.StatusDone {
		m.Title = "والپیپری که خواسته بودی آماده شد 🎉"
		m.Body = "«" + text + "» اضافه شد. بزن و ببین."
	} else {
		m.Title = "جواب درخواستت"
		m.CategoryID = ""
	}
	if reply != "" {
		m.Body = reply
	}
	return m
}
