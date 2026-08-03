package dto

type QuoteDTO struct {
	ID        string `json:"id"`
	Line1     string `json:"line1"`
	Line2     string `json:"line2"`
	Source    string `json:"source"`
	SortOrder int    `json:"sortOrder"`
	IsActive  bool   `json:"isActive"`
}

type ListQuotesResponse struct {
	Quotes []QuoteDTO `json:"quotes"`
}

type UpsertQuoteRequest struct {
	ID        string `json:"id"`
	Line1     string `json:"line1"`
	Line2     string `json:"line2"`
	Source    string `json:"source"`
	SortOrder int    `json:"sortOrder"`
	IsActive  bool   `json:"isActive"`
}

type QuoteResponse struct {
	Quote QuoteDTO `json:"quote"`
}
