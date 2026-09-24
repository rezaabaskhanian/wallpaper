package wallpaperservice

import (
	"fmt"
	"testing"
	"time"

	domain "wallpaperstore/internal/domain/wallpaper"
	wallpapervalueobject "wallpaperstore/internal/domain/wallpaper/valueobject"
)

var rankNow = time.Date(2026, 9, 24, 12, 0, 0, 0, time.UTC)

func wp(id string, premium bool, downloads int, ageDays float64) domain.Wallpaper {
	return domain.Wallpaper{
		ID:            wallpapervalueobject.WallpaperID(id),
		Premium:       premium,
		DownloadCount: downloads,
		CreatedAt:     rankNow.Add(-time.Duration(ageDays * 24 * float64(time.Hour))),
	}
}

func ids(wps []domain.Wallpaper) []string {
	out := make([]string, len(wps))
	for i, w := range wps {
		out[i] = string(w.ID)
	}
	return out
}

func TestRank_OldUnpopularNotFirst(t *testing.T) {
	got := ids(rankWallpapers([]domain.Wallpaper{
		wp("oldest", false, 0, 120),
		wp("old-popular", false, 200, 60),
		wp("past-fresh", false, 0, 10), // دورهٔ «تازه» تمام شده و دانلودی نگرفته
	}, rankNow))
	if got[len(got)-1] != "oldest" {
		t.Fatalf("oldest unpopular wallpaper should be last, got %v", got)
	}
	if got[0] != "old-popular" {
		t.Fatalf("clearly popular wallpaper should lead, got %v", got)
	}
}

func TestRank_FreshBeatsAverageOld(t *testing.T) {
	got := ids(rankWallpapers([]domain.Wallpaper{
		wp("old-avg", false, 10, 30),
		wp("old-avg2", false, 10, 30),
		wp("fresh", false, 0, 0.5),
	}, rankNow))
	if got[0] != "fresh" {
		t.Fatalf("a brand-new wallpaper should outrank average old ones, got %v", got)
	}
}

func TestRank_PremiumInterleaved(t *testing.T) {
	var in []domain.Wallpaper
	for i := 0; i < 12; i++ {
		// پریمیوم‌ها عمداً محبوب‌ترند تا مطمئن شویم باز هم اول لیست نمی‌آیند.
		in = append(in, wp(fmt.Sprintf("p%d", i), true, 1000, 10))
		in = append(in, wp(fmt.Sprintf("f%d", i), false, 1, 10))
	}
	got := rankWallpapers(in, rankNow)
	if len(got) != len(in) {
		t.Fatalf("lost items: got %d want %d", len(got), len(in))
	}
	for i, w := range got {
		wantPremium := i >= rankFreeHead && (i-rankFreeHead)%rankPremiumEvery == 0
		if i < 14 && w.Premium != wantPremium { // تا وقتی هر دو صف پرند الگو باید دقیق باشد
			t.Fatalf("position %d: premium=%v want %v (%v)", i, w.Premium, wantPremium, ids(got))
		}
	}
}

func TestRank_OnlyPremiumOrEmpty(t *testing.T) {
	if got := rankWallpapers(nil, rankNow); len(got) != 0 {
		t.Fatalf("expected empty, got %v", ids(got))
	}
	got := rankWallpapers([]domain.Wallpaper{wp("a", true, 0, 1), wp("b", true, 5, 1)}, rankNow)
	if len(got) != 2 || got[0].ID != "b" {
		t.Fatalf("premium-only catalog should still be ranked, got %v", ids(got))
	}
}
