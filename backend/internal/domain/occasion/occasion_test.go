package occasion

import "testing"

func TestNew(t *testing.T) {
	o, err := New(Occasion{Title: " یلدا ", DaysBefore: 3}, "2026-12-21")
	if err != nil {
		t.Fatal(err)
	}
	if o.Title != "یلدا" || o.ID == "" || o.NotifyTitle == "" || o.NotifyBody == "" {
		t.Fatalf("unexpected: %+v", o)
	}
	if o.Date.Format(DateLayout) != "2026-12-21" {
		t.Fatalf("date: %v", o.Date)
	}

	bad := []struct {
		o    Occasion
		date string
	}{
		{Occasion{DaysBefore: 1}, "2026-12-21"},              // نام خالی
		{Occasion{Title: "a"}, "21/12/2026"},                 // تاریخ بد
		{Occasion{Title: "a", DaysBefore: 31}, "2026-12-21"}, // یادآوری خارج از بازه
	}
	for _, c := range bad {
		if _, err := New(c.o, c.date); err == nil {
			t.Fatalf("expected error for %+v %s", c.o, c.date)
		}
	}
}
