// Package analyticsservice رویدادهای اپ را ثبت و برای پنل ادمین خلاصه می‌کند.
package analyticsservice

import (
	"context"
	"sort"

	domain "wallpaperstore/internal/domain/appevent"
	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/analytics/dto"
)

type DailyRow struct {
	Date             string
	Opens            int64
	ActiveDevices    int64
	NewDevices       int64
	WallpaperSets    int64
	WallpaperSetters int64
}

type CohortRow struct {
	AppVersion       string
	SetWallpaperDay0 bool
	Devices          int64
	D1Eligible       int64
	D1Retained       int64
	D7Eligible       int64
	D7Retained       int64
}

type SourceRow struct {
	Source  string
	Method  string
	Sets    int64
	Devices int64
}

// LauncherFunnel تعداد دستگاه‌های یکتا در هر مرحله‌ی قیف لانچر.
type LauncherFunnel struct {
	Shown    int64
	Accepted int64
	Enabled  int64
}

type Repository interface {
	Insert(ctx context.Context, e domain.Event) error
	Daily(ctx context.Context, days int) ([]DailyRow, error)
	Cohorts(ctx context.Context, days int) ([]CohortRow, error)
	SetsBySource(ctx context.Context, days int) ([]SourceRow, error)
	LauncherFunnel(ctx context.Context, days int) (LauncherFunnel, error)
}

type Service struct {
	repo Repository
}

func New(repo Repository) Service {
	return Service{repo: repo}
}

// ErrInvalidEvent برای رویدادِ ناقص/ناشناخته؛ هندلر آن را 400 برمی‌گرداند.
var ErrInvalidEvent = richerror.New("analyticsservice.Track").WithMessage("رویداد نامعتبر است")

func (s Service) Track(ctx context.Context, req dto.TrackRequest) error {
	const op = "analyticsservice.Track"
	e, err := domain.New(req.DeviceID, req.Event, req.AppVersion, req.Method, req.Source)
	if err != nil {
		return ErrInvalidEvent.WithErr(err)
	}
	if err := s.repo.Insert(ctx, e); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return nil
}

const (
	defaultDays = 30
	maxDays     = 180
)

func (s Service) Summary(ctx context.Context, days int) (dto.SummaryResponse, error) {
	const op = "analyticsservice.Summary"
	if days <= 0 {
		days = defaultDays
	}
	if days > maxDays {
		days = maxDays
	}

	daily, err := s.repo.Daily(ctx, days)
	if err != nil {
		return dto.SummaryResponse{}, richerror.New(op).WithErr(err)
	}
	cohorts, err := s.repo.Cohorts(ctx, days)
	if err != nil {
		return dto.SummaryResponse{}, richerror.New(op).WithErr(err)
	}
	sources, err := s.repo.SetsBySource(ctx, days)
	if err != nil {
		return dto.SummaryResponse{}, richerror.New(op).WithErr(err)
	}

	funnel, err := s.repo.LauncherFunnel(ctx, days)
	if err != nil {
		return dto.SummaryResponse{}, richerror.New(op).WithErr(err)
	}

	res := dto.SummaryResponse{
		Launcher: dto.LauncherFunnel{Shown: funnel.Shown, Accepted: funnel.Accepted, Enabled: funnel.Enabled},
		Days:     days,
		Daily:    make([]dto.DailyStats, 0, len(daily)),
		Versions: make([]dto.CohortStats, 0),
		Sources:  make([]dto.SourceStats, 0, len(sources)),
	}
	for _, r := range daily {
		res.Daily = append(res.Daily, dto.DailyStats{
			Date: r.Date, Opens: r.Opens, ActiveDevices: r.ActiveDevices, NewDevices: r.NewDevices,
			WallpaperSets: r.WallpaperSets, WallpaperSetters: r.WallpaperSetters,
		})
	}

	// یک ردیف به ازای هر نسخه، به‌علاوه‌ی دو ردیف «والپیپر گذاشتند / نگذاشتند»
	// (روی همه‌ی نسخه‌ها) — دومی جواب مستقیم این سؤال است که آیا تنظیم والپیپر
	// در روز اول با ماندگاری بیشتر همراه است یا نه.
	byVersion := map[string]*dto.CohortStats{}
	res.Setters = dto.CohortStats{Label: "روز اول والپیپر گذاشتند"}
	res.NonSetters = dto.CohortStats{Label: "روز اول والپیپر نگذاشتند"}
	for _, c := range cohorts {
		v, ok := byVersion[c.AppVersion]
		if !ok {
			v = &dto.CohortStats{Label: c.AppVersion}
			byVersion[c.AppVersion] = v
		}
		addCohort(v, c)
		if c.SetWallpaperDay0 {
			addCohort(&res.Setters, c)
		} else {
			addCohort(&res.NonSetters, c)
		}
	}
	for _, v := range byVersion {
		res.Versions = append(res.Versions, *v)
	}
	sort.Slice(res.Versions, func(i, j int) bool { return res.Versions[i].Label > res.Versions[j].Label })

	for _, r := range sources {
		res.Sources = append(res.Sources, dto.SourceStats{Source: r.Source, Method: r.Method, Sets: r.Sets, Devices: r.Devices})
	}
	return res, nil
}

func addCohort(dst *dto.CohortStats, c CohortRow) {
	dst.NewDevices += c.Devices
	if c.SetWallpaperDay0 {
		dst.SetWallpaperDay0 += c.Devices
	}
	dst.D1Eligible += c.D1Eligible
	dst.D1Retained += c.D1Retained
	dst.D7Eligible += c.D7Eligible
	dst.D7Retained += c.D7Retained
}
