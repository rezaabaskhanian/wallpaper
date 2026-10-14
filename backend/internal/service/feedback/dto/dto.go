package dto

// ---- عمومی (اپ) ----

type SubmitRequestRequest struct {
	DeviceID string `json:"deviceId"`
	Text     string `json:"text"`
}

type PollOptionDTO struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	CategoryID string `json:"categoryId"`
	Votes      int    `json:"votes"`
}

type PollDTO struct {
	ID             string          `json:"id"`
	Question       string          `json:"question"`
	IsActive       bool            `json:"isActive"`
	WinnerOptionID *string         `json:"winnerOptionId,omitempty"`
	Options        []PollOptionDTO `json:"options"`
	TotalVotes     int             `json:"totalVotes"`
	// MyOptionID گزینه‌ای که همین دستگاه انتخاب کرده؛ خالی یعنی هنوز رأی نداده.
	MyOptionID string `json:"myOptionId,omitempty"`
	CreatedAt  string `json:"createdAt,omitempty"`
}

type ActivePollResponse struct {
	Poll *PollDTO `json:"poll"`
}

type VoteRequest struct {
	DeviceID string `json:"deviceId"`
	OptionID string `json:"optionId"`
}

type InboxMessageDTO struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Body       string `json:"body"`
	CategoryID string `json:"categoryId"`
}

type InboxResponse struct {
	Messages []InboxMessageDTO `json:"messages"`
}

// ---- ادمین ----

type RequestDTO struct {
	ID         string `json:"id"`
	DeviceID   string `json:"deviceId"`
	Text       string `json:"text"`
	Status     string `json:"status"`
	CategoryID string `json:"categoryId"`
	Reply      string `json:"reply"`
	CreatedAt  string `json:"createdAt"`
}

type ListRequestsResponse struct {
	Requests []RequestDTO `json:"requests"`
}

// UpdateRequestsRequest وضعیت چند درخواست را یکجا عوض می‌کند (درخواست‌های
// هم‌متن معمولاً با هم انجام می‌شوند).
type UpdateRequestsRequest struct {
	IDs        []string `json:"ids"`
	Status     string   `json:"status"`
	CategoryID string   `json:"categoryId"`
	// Reply اختیاری؛ در نوتیفیکیشن درخواست‌دهنده‌ها نشان داده می‌شود.
	Reply string `json:"reply"`
}

// DeviceResponse همه‌ی درخواست‌ها و خلاصه‌ی آمار یک دستگاه (فقط شناسه‌ی ناشناس؛
// هیچ اطلاعات شخصی‌ای نداریم).
type DeviceResponse struct {
	DeviceID      string       `json:"deviceId"`
	Requests      []RequestDTO `json:"requests"`
	FirstSeen     string       `json:"firstSeen,omitempty"`
	LastSeen      string       `json:"lastSeen,omitempty"`
	AppVersion    string       `json:"appVersion"`
	Opens         int          `json:"opens"`
	WallpaperSets int          `json:"wallpaperSets"`
	PollVotes     int          `json:"pollVotes"`
}

type ListPollsResponse struct {
	Polls []PollDTO `json:"polls"`
}

type CreatePollRequest struct {
	Question string `json:"question"`
	Options  []struct {
		Title      string `json:"title"`
		CategoryID string `json:"categoryId"`
	} `json:"options"`
}

type ClosePollRequest struct {
	// WinnerOptionID خالی یعنی بستن بدون اعلام برنده (خبری به کسی نمی‌رود).
	WinnerOptionID string `json:"winnerOptionId"`
}
