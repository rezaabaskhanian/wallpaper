package theme

import "testing"

func TestNew(t *testing.T) {
	got, err := New(Theme{Title: " شب ", WallpaperURL: "https://cdn.wallpaperapp.ir/a.jpg"})
	if err != nil {
		t.Fatal(err)
	}
	if got.Title != "شب" || got.ID == "" || got.TextColor != "#FFFFFF" || got.AccentColor != "#F5E6B3" {
		t.Fatalf("unexpected defaults: %+v", got)
	}

	cases := []Theme{
		{WallpaperURL: "x"}, // نام خالی
		{Title: "a"},        // والپیپر خالی
		{Title: "a", WallpaperURL: "x", TextColor: "red"}, // رنگ نامعتبر
	}
	for _, c := range cases {
		if _, err := New(c); err == nil {
			t.Fatalf("expected error for %+v", c)
		}
	}
}
