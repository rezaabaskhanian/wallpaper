package postgresappevent

import (
	"context"
	"time"

	domain "wallpaperstore/internal/domain/appevent"
	"wallpaperstore/internal/pkg/richerror"
	analyticsservice "wallpaperstore/internal/service/analytics"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

// روزبندی همه‌ی آمار به وقت تهران است، نه UTC — «امروز» برای ادمین باید همان
// روزی باشد که کاربرها تجربه می‌کنند.
const tz = `'Asia/Tehran'`

func (d DB) Insert(ctx context.Context, e domain.Event) error {
	const op = "postgresappevent.Insert"
	_, err := d.conn.Exec(ctx, `
		INSERT INTO app_events (device_id, event, app_version, method, source)
		VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''))`,
		e.DeviceID, e.Event, e.AppVersion, e.Method, e.Source)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage("failed to insert app event")
	}
	return nil
}

// Daily برای هر روز از `days` روز اخیر (شامل امروز) شمارش‌ها را برمی‌گرداند؛
// روزهای بی‌رویداد هم با صفر می‌آیند تا نمودار/جدول سوراخ نداشته باشد.
func (d DB) Daily(ctx context.Context, days int) ([]analyticsservice.DailyRow, error) {
	const op = "postgresappevent.Daily"
	rows, err := d.conn.Query(ctx, `
		WITH today AS (SELECT (NOW() AT TIME ZONE `+tz+`)::date AS d),
		ev AS (
			SELECT device_id, event, (created_at AT TIME ZONE `+tz+`)::date AS d
			FROM app_events
			WHERE created_at >= ((SELECT d FROM today) - ($1::int - 1))::timestamp AT TIME ZONE `+tz+`
		),
		first_seen AS (
			SELECT device_id, MIN((created_at AT TIME ZONE `+tz+`)::date) AS d
			FROM app_events GROUP BY device_id
		)
		SELECT s.d,
			(SELECT COUNT(*) FROM ev WHERE ev.d = s.d AND ev.event = 'app_open'),
			(SELECT COUNT(DISTINCT device_id) FROM ev WHERE ev.d = s.d),
			(SELECT COUNT(*) FROM first_seen f WHERE f.d = s.d),
			(SELECT COUNT(*) FROM ev WHERE ev.d = s.d AND ev.event = 'wallpaper_set'),
			(SELECT COUNT(DISTINCT device_id) FROM ev WHERE ev.d = s.d AND ev.event = 'wallpaper_set')
		FROM (
			SELECT generate_series((SELECT d FROM today) - ($1::int - 1), (SELECT d FROM today), '1 day')::date AS d
		) AS s
		ORDER BY s.d DESC`, days)
	if err != nil {
		return nil, richerror.New(op).WithErr(err).WithMessage("failed to query daily analytics")
	}
	defer rows.Close()

	out := make([]analyticsservice.DailyRow, 0, days)
	for rows.Next() {
		var r analyticsservice.DailyRow
		var day time.Time
		if err := rows.Scan(&day, &r.Opens, &r.ActiveDevices, &r.NewDevices, &r.WallpaperSets, &r.WallpaperSetters); err != nil {
			return nil, richerror.New(op).WithErr(err)
		}
		r.Date = day.Format("2006-01-02")
		out = append(out, r)
	}
	return out, rows.Err()
}

// Cohorts دستگاه‌هایی را که اولین بار در `days` روز اخیر دیده شده‌اند، به تفکیک
// نسخه‌ی اپِ اولین رویداد و اینکه روز اول والپیپر تنظیم کردند یا نه، گروه
// می‌کند و ماندگاری روز ۱ و ۷ را می‌شمارد. هر کوهورت فقط وقتی در مخرج D1/D7
// حساب می‌شود که آن روزش واقعاً رسیده باشد.
func (d DB) Cohorts(ctx context.Context, days int) ([]analyticsservice.CohortRow, error) {
	const op = "postgresappevent.Cohorts"
	rows, err := d.conn.Query(ctx, `
		WITH today AS (SELECT (NOW() AT TIME ZONE `+tz+`)::date AS d),
		first_seen AS (
			SELECT DISTINCT ON (device_id)
				device_id, (created_at AT TIME ZONE `+tz+`)::date AS d, app_version
			FROM app_events
			ORDER BY device_id, created_at
		),
		cohort AS (
			SELECT f.device_id, f.d, f.app_version,
				EXISTS (
					SELECT 1 FROM app_events e
					WHERE e.device_id = f.device_id AND e.event = 'wallpaper_set'
						AND e.created_at >= f.d::timestamp AT TIME ZONE `+tz+`
						AND e.created_at < (f.d + 1)::timestamp AT TIME ZONE `+tz+`
				) AS set_day0,
				EXISTS (
					SELECT 1 FROM app_events e
					WHERE e.device_id = f.device_id AND e.event = 'app_open'
						AND e.created_at >= (f.d + 1)::timestamp AT TIME ZONE `+tz+`
						AND e.created_at < (f.d + 2)::timestamp AT TIME ZONE `+tz+`
				) AS ret1,
				EXISTS (
					SELECT 1 FROM app_events e
					WHERE e.device_id = f.device_id AND e.event = 'app_open'
						AND e.created_at >= (f.d + 7)::timestamp AT TIME ZONE `+tz+`
						AND e.created_at < (f.d + 8)::timestamp AT TIME ZONE `+tz+`
				) AS ret7
			FROM first_seen f
			WHERE f.d > (SELECT d FROM today) - $1::int
		)
		SELECT app_version, set_day0,
			COUNT(*),
			COUNT(*) FILTER (WHERE d <= (SELECT d FROM today) - 1),
			COUNT(*) FILTER (WHERE d <= (SELECT d FROM today) - 1 AND ret1),
			COUNT(*) FILTER (WHERE d <= (SELECT d FROM today) - 7),
			COUNT(*) FILTER (WHERE d <= (SELECT d FROM today) - 7 AND ret7)
		FROM cohort
		GROUP BY app_version, set_day0`, days)
	if err != nil {
		return nil, richerror.New(op).WithErr(err).WithMessage("failed to query cohorts")
	}
	defer rows.Close()

	out := make([]analyticsservice.CohortRow, 0)
	for rows.Next() {
		var r analyticsservice.CohortRow
		if err := rows.Scan(&r.AppVersion, &r.SetWallpaperDay0, &r.Devices,
			&r.D1Eligible, &r.D1Retained, &r.D7Eligible, &r.D7Retained); err != nil {
			return nil, richerror.New(op).WithErr(err)
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// SetsBySource تعداد تنظیم‌های موفق والپیپر در `days` روز اخیر را به تفکیک
// منبع و روش برمی‌گرداند — مثلاً برای دیدن اینکه دکمه‌ی یک‌مرحله‌ای چقدر کار می‌کند.
func (d DB) SetsBySource(ctx context.Context, days int) ([]analyticsservice.SourceRow, error) {
	const op = "postgresappevent.SetsBySource"
	rows, err := d.conn.Query(ctx, `
		SELECT COALESCE(source, ''), COALESCE(method, ''), COUNT(*), COUNT(DISTINCT device_id)
		FROM app_events
		WHERE event = 'wallpaper_set'
			AND created_at >= (((NOW() AT TIME ZONE `+tz+`)::date) - ($1::int - 1))::timestamp AT TIME ZONE `+tz+`
		GROUP BY 1, 2
		ORDER BY 3 DESC`, days)
	if err != nil {
		return nil, richerror.New(op).WithErr(err).WithMessage("failed to query sets by source")
	}
	defer rows.Close()

	out := make([]analyticsservice.SourceRow, 0)
	for rows.Next() {
		var r analyticsservice.SourceRow
		if err := rows.Scan(&r.Source, &r.Method, &r.Sets, &r.Devices); err != nil {
			return nil, richerror.New(op).WithErr(err)
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// LauncherFunnel دستگاه‌های یکتا در هر مرحله‌ی قیف لانچر، در `days` روز اخیر.
func (d DB) LauncherFunnel(ctx context.Context, days int) (analyticsservice.LauncherFunnel, error) {
	const op = "postgresappevent.LauncherFunnel"
	var f analyticsservice.LauncherFunnel
	err := d.conn.QueryRow(ctx, `
		SELECT
			COUNT(DISTINCT device_id) FILTER (WHERE event = 'launcher_intro_shown'),
			COUNT(DISTINCT device_id) FILTER (WHERE event = 'launcher_intro_accepted'),
			COUNT(DISTINCT device_id) FILTER (WHERE event = 'launcher_enabled')
		FROM app_events
		WHERE event IN ('launcher_intro_shown', 'launcher_intro_accepted', 'launcher_enabled')
			AND created_at >= (((NOW() AT TIME ZONE `+tz+`)::date) - ($1::int - 1))::timestamp AT TIME ZONE `+tz+``,
		days).Scan(&f.Shown, &f.Accepted, &f.Enabled)
	if err != nil {
		return f, richerror.New(op).WithErr(err).WithMessage("failed to query launcher funnel")
	}
	return f, nil
}
