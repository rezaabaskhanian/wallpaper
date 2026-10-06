package wallpaperservice

import (
	"context"
	"time"

	domain "wallpaperstore/internal/domain/wallpaper"
	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/wallpaper/dto"
)

// GetCatalog کل کاتالوگ (دسته‌ها + والپیپرهای فعال + نسخه) را برای اپ می‌سازد.
func (s Service) GetCatalog(ctx context.Context) (dto.CatalogResponse, error) {
	const op = "wallpaperservice.GetCatalog"

	cats, err := s.repo.GetCategories(ctx)
	if err != nil {
		return dto.CatalogResponse{}, richerror.New(op).WithErr(err)
	}

	wps, err := s.repo.GetActiveWallpapers(ctx)
	if err != nil {
		return dto.CatalogResponse{}, richerror.New(op).WithErr(err)
	}

	version, err := s.repo.GetCatalogVersion(ctx)
	if err != nil {
		return dto.CatalogResponse{}, richerror.New(op).WithErr(err)
	}

	covers := categoryCovers(cats, wps)
	catDTOs := make([]dto.CategoryDTO, 0, len(cats))
	for _, c := range nonEmptyCategories(cats, wps) {
		d := toCategoryDTO(c)
		d.Cover = covers[c.ID]
		catDTOs = append(catDTOs, d)
	}

	wpDTOs := make([]dto.WallpaperDTO, 0, len(wps))
	for _, w := range rankWallpapers(wps, time.Now()) {
		wpDTOs = append(wpDTOs, toWallpaperDTO(w))
	}

	return dto.CatalogResponse{
		Version:    version,
		Categories: catDTOs,
		Wallpapers: wpDTOs,
	}, nil
}

// nonEmptyCategories دسته‌هایی را که هیچ والپیپر فعالی ندارند حذف می‌کند تا
// کاربر روی تب خالی نزند. دستهٔ اصلی‌ای که خودش خالی است ولی زیردستهٔ پر
// دارد می‌ماند. پنل ادمین از /admin/categories می‌خواند و همه را می‌بیند.
func nonEmptyCategories(cats []domain.Category, wps []domain.Wallpaper) []domain.Category {
	hasItems := make(map[string]bool, len(cats))
	for _, w := range wps {
		hasItems[w.Category] = true
	}
	// دستهٔ والد هر زیردستهٔ پر هم «پر» حساب می‌شود.
	for _, c := range cats {
		if c.ParentID != nil && hasItems[c.ID] {
			hasItems[*c.ParentID] = true
		}
	}

	out := make([]domain.Category, 0, len(cats))
	for _, c := range cats {
		if hasItems[c.ID] {
			out = append(out, c)
		}
	}
	return out
}

// categoryCovers برای هر دسته thumb والپیپر کاورش را برمی‌گرداند: پرانلودترین
// والپیپر فعال خود دسته و زیردسته‌هایش. رایگان‌ها بر پریمیوم‌ها مقدم‌اند تا کارت
// در اپ قفل‌دار به نظر نرسد؛ در تساوی، جدیدتر برنده است.
func categoryCovers(cats []domain.Category, wps []domain.Wallpaper) map[string]string {
	parent := make(map[string]string, len(cats))
	for _, c := range cats {
		if c.ParentID != nil {
			parent[c.ID] = *c.ParentID
		}
	}

	better := func(a, b domain.Wallpaper) bool {
		if a.Premium != b.Premium {
			return !a.Premium
		}
		if a.DownloadCount != b.DownloadCount {
			return a.DownloadCount > b.DownloadCount
		}
		return a.CreatedAt.After(b.CreatedAt)
	}

	best := make(map[string]domain.Wallpaper, len(cats))
	consider := func(catID string, w domain.Wallpaper) {
		if cur, ok := best[catID]; !ok || better(w, cur) {
			best[catID] = w
		}
	}
	for _, w := range wps {
		consider(w.Category, w)
		if p, ok := parent[w.Category]; ok {
			consider(p, w)
		}
	}

	out := make(map[string]string, len(best))
	for id, w := range best {
		out[id] = w.Thumb
	}
	return out
}
