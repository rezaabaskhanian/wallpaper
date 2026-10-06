package wallpaperservice

import (
	"reflect"
	"testing"
	"time"

	domain "wallpaperstore/internal/domain/wallpaper"
)

func TestNonEmptyCategories(t *testing.T) {
	religious := "religious"
	nature := "nature"
	cats := []domain.Category{
		{ID: "religious"},                     // خودش خالی، زیردستهٔ پر دارد → بماند
		{ID: "shrines", ParentID: &religious}, // پر → بماند
		{ID: "martyrs", ParentID: &religious}, // خالی → حذف
		{ID: "nature"},                        // خالی، زیردسته‌ها هم خالی → حذف
		{ID: "sea", ParentID: &nature},        // خالی → حذف
		{ID: "space"},                         // پر → بماند
		{ID: "car"},                           // خالی → حذف
	}
	wps := []domain.Wallpaper{
		{Category: "shrines"},
		{Category: "space"},
		{Category: "space"},
	}

	var got []string
	for _, c := range nonEmptyCategories(cats, wps) {
		got = append(got, c.ID)
	}
	want := []string{"religious", "shrines", "space"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %v want %v", got, want)
	}
}

func TestCategoryCovers(t *testing.T) {
	happy := "happy"
	now := time.Now()
	cats := []domain.Category{
		{ID: "happy"},
		{ID: "smile", ParentID: &happy},
		{ID: "dark"},
	}
	wps := []domain.Wallpaper{
		{Category: "happy", Thumb: "h-low", DownloadCount: 1},
		{Category: "smile", Thumb: "s-top", DownloadCount: 9},                     // زیردسته، کاور والد هم می‌شود
		{Category: "happy", Thumb: "h-premium", DownloadCount: 50, Premium: true}, // پریمیوم با وجود رایگان انتخاب نمی‌شود
		{Category: "dark", Thumb: "d-old", DownloadCount: 3, CreatedAt: now.Add(-time.Hour)},
		{Category: "dark", Thumb: "d-new", DownloadCount: 3, CreatedAt: now}, // تساوی → جدیدتر
	}

	got := categoryCovers(cats, wps)
	want := map[string]string{"happy": "s-top", "smile": "s-top", "dark": "d-new"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %v want %v", got, want)
	}
}
