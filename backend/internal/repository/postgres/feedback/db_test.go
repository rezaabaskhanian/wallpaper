package postgresfeedback

import "testing"

func TestRequestMessage(t *testing.T) {
	done := requestMessage("1", "پرچم ایران", "done", "national", "")
	if done.Title == "" || done.Body != "«پرچم ایران» اضافه شد. بزن و ببین." || done.CategoryID != "national" {
		t.Fatalf("done: %+v", done)
	}
	replied := requestMessage("2", "x", "done", "national", "توی دسته‌ی ملی گذاشتیم")
	if replied.Body != "توی دسته‌ی ملی گذاشتیم" || replied.ID != "request-2" {
		t.Fatalf("reply: %+v", replied)
	}
	rejected := requestMessage("3", "x", "rejected", "ignored", "ممنون از نظرت")
	if rejected.Title != "جواب درخواستت" || rejected.CategoryID != "" || rejected.Body != "ممنون از نظرت" {
		t.Fatalf("rejected: %+v", rejected)
	}
}
