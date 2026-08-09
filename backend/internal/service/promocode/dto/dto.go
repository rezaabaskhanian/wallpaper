package dto

type PromoCodeDTO struct {
	ID        string `json:"id"`
	Code      string `json:"code"`
	IsActive  bool   `json:"isActive"`
	UsedCount int    `json:"usedCount"`
}

type ListPromoCodesResponse struct {
	PromoCodes []PromoCodeDTO `json:"promoCodes"`
}

type UpsertPromoCodeRequest struct {
	ID       string `json:"id"`
	Code     string `json:"code"`
	IsActive bool   `json:"isActive"`
}

type PromoCodeResponse struct {
	PromoCode PromoCodeDTO `json:"promoCode"`
}

type RedeemRequest struct {
	Code string `json:"code"`
}

type RedeemResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}
