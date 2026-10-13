package feedback

import (
	"strings"
	"testing"
)

func TestNormalizeText(t *testing.T) {
	got, err := NormalizeText("  ماشین   اسپورت ")
	if err != nil || got != "ماشین اسپورت" {
		t.Fatalf("got %q %v", got, err)
	}
	for _, bad := range []string{"", " ا ", strings.Repeat("ب", 101)} {
		if _, err := NormalizeText(bad); err == nil {
			t.Fatalf("expected error for %q", bad)
		}
	}
}

func TestNewPoll(t *testing.T) {
	p, err := NewPoll(" کدوم؟ ", []PollOption{{Title: "ماشین"}, {Title: " "}, {Title: "فضا"}})
	if err != nil || len(p.Options) != 2 || p.Options[1].Sort != 1 || p.Question != "کدوم؟" {
		t.Fatalf("got %+v %v", p, err)
	}
	if _, err := NewPoll("q", []PollOption{{Title: "تنها"}}); err == nil {
		t.Fatal("one option must fail")
	}
	if _, err := NewPoll("", []PollOption{{Title: "a"}, {Title: "b"}}); err == nil {
		t.Fatal("empty question must fail")
	}
}
