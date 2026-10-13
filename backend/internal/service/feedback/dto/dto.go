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
