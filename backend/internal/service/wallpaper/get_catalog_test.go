package wallpaperservice

import (
	"reflect"
	"testing"

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
