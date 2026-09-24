package wallpaperservice

import (
	"math"
	"sort"
	"time"

	domain "wallpaperstore/internal/domain/wallpaper"
)

// تنظیمات ترتیب گالری — برای تغییر رفتار فقط همین‌ها را عوض کنید.
const (
	// شدت افت امتیاز با گذشت زمان (بر حسب روز). بزرگ‌تر = عکس‌های قدیمی سریع‌تر پایین می‌روند.
	rankGravity = 1.2
	// والپیپرهای جوان‌تر از این مدت امتیاز «تازه» می‌گیرند تا فرصت دیده‌شدن داشته باشند.
	rankFreshWindow = 7 * 24 * time.Hour
	// چند والپیپر اول گالری همیشه رایگان‌اند تا کاربر اول کار به قفل نخورد.
	rankFreeHead = 4
	// بعد از rankFreeHead، از هر چند خانه یکی پریمیوم است.
	rankPremiumEvery = 6
)

// rankWallpapers والپیپرها را برای نمایش در گالری مرتب می‌کند: محبوب‌ترها و
// تازه‌ها بالا، و پریمیوم‌ها لابه‌لای رایگان‌ها پخش می‌شوند (نه ته لیست).
func rankWallpapers(wps []domain.Wallpaper, now time.Time) []domain.Wallpaper {
	// امتیاز «تازه» = میانگین دانلود کل کاتالوگ؛ یعنی یک والپیپر نو با یک
	// والپیپر معمولی رقابت می‌کند و این مزیت در طول rankFreshWindow کم‌کم صفر می‌شود.
	var total int
	for _, w := range wps {
		total += w.DownloadCount
	}
	freshBonus := 1.0
	if len(wps) > 0 {
		freshBonus = math.Max(1, float64(total)/float64(len(wps)))
	}

	score := func(w domain.Wallpaper) float64 {
		age := now.Sub(w.CreatedAt)
		if age < 0 {
			age = 0
		}
		bonus := 0.0
		if age < rankFreshWindow {
			bonus = freshBonus * (1 - float64(age)/float64(rankFreshWindow))
		}
		ageDays := age.Hours() / 24
		return (float64(w.DownloadCount) + 1 + bonus) / math.Pow(ageDays+2, rankGravity)
	}

	var free, premium []domain.Wallpaper
	scores := make(map[string]float64, len(wps))
	for _, w := range wps {
		scores[string(w.ID)] = score(w)
		if w.Premium {
			premium = append(premium, w)
		} else {
			free = append(free, w)
		}
	}
	byScore := func(list []domain.Wallpaper) {
		sort.SliceStable(list, func(i, j int) bool {
			si, sj := scores[string(list[i].ID)], scores[string(list[j].ID)]
			if si != sj {
				return si > sj
			}
			return list[i].CreatedAt.After(list[j].CreatedAt)
		})
	}
	byScore(free)
	byScore(premium)

	out := make([]domain.Wallpaper, 0, len(wps))
	for len(free) > 0 || len(premium) > 0 {
		pos := len(out)
		wantPremium := pos >= rankFreeHead && (pos-rankFreeHead)%rankPremiumEvery == 0
		if (wantPremium && len(premium) > 0) || len(free) == 0 {
			out = append(out, premium[0])
			premium = premium[1:]
		} else {
			out = append(out, free[0])
			free = free[1:]
		}
	}
	return out
}
