package dto

// ApplyFreeLimitRequest ورودی «N تای اول هر دسته رایگان، بقیه پولی» (ادمین).
type ApplyFreeLimitRequest struct {
	FreePerCategory int `json:"freePerCategory"`
}

type ApplyFreeLimitResponse struct {
	// تعداد والپیپرهایی که وضعیت رایگان/پولی‌شان عوض شد.
	Updated int64 `json:"updated"`
}
