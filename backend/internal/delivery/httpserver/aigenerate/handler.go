package aigeneratehandler

import (
	"errors"
	"net/http"
	"strconv"

	aigenerateservice "wallpaperstore/internal/service/aigenerate"

	"github.com/labstack/echo/v4"
)

// aiCreditsSKU همان SKU مصرفی‌ای که در پنل بازار تعریف شده — اپ با همین مقدار
// bazaar.purchaseProduct را صدا می‌زند، سرور هم برای نشان‌دادن «چی بخر» همین
// را در پاسخ ۴۰۲ برمی‌گرداند.
const aiCreditsSKU = "ai_credits"

type Handler struct {
	svc aigenerateservice.Service
}

func New(svc aigenerateservice.Service) Handler {
	return Handler{svc: svc}
}

// SetRoutes عمومی است (بدون کلید ادمین) — این‌ها را خود اپ صدا می‌زند، نه ادمین.
func (h Handler) SetRoutes(api *echo.Group) {
	api.POST("/ai/generate", h.Generate)
	api.POST("/ai/credits/redeem", h.RedeemCredits)
}

// SetAdminRoutes پشت کلید ادمین است — تاریخچه‌ی هزینه/توکن هر تولید برای پنل.
func (h Handler) SetAdminRoutes(admin *echo.Group) {
	admin.GET("/ai-generation-logs", h.ListLogs)
}

type generateRequest struct {
	DeviceID string `json:"deviceId"`
	Prompt   string `json:"prompt"`
}

type generateResponse struct {
	ImageURL string `json:"imageUrl"`
}

func (h Handler) Generate(c echo.Context) error {
	var req generateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"message": "درخواست نامعتبر است"})
	}

	imageURL, err := h.svc.GenerateImage(c.Request().Context(), req.DeviceID, req.Prompt)
	if err != nil {
		if errors.Is(err, aigenerateservice.ErrNoCredits) {
			return c.JSON(http.StatusPaymentRequired, echo.Map{"error": "no_credits", "sku": aiCreditsSKU})
		}
		return c.JSON(http.StatusInternalServerError, echo.Map{"message": err.Error()})
	}

	return c.JSON(http.StatusOK, generateResponse{ImageURL: imageURL})
}

type redeemCreditsRequest struct {
	DeviceID      string `json:"deviceId"`
	PurchaseToken string `json:"purchaseToken"`
}

type redeemCreditsResponse struct {
	CreditsGranted int `json:"creditsGranted"`
}

// RedeemCredits بعد از خرید SKU مصرفی ai_credits در اپ صدا زده می‌شود — خرید
// را سمت سرور بازار تایید و اعتبار را به موجودی دستگاه اضافه می‌کند. اپ باید
// فقط بعد از پاسخ موفق این اندپوینت، consumePurchase را صدا بزند تا SKU دوباره
// قابل خریدن شود.
func (h Handler) RedeemCredits(c echo.Context) error {
	var req redeemCreditsRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"message": "درخواست نامعتبر است"})
	}

	granted, err := h.svc.RedeemCredits(c.Request().Context(), req.DeviceID, aiCreditsSKU, req.PurchaseToken)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"message": err.Error()})
	}

	return c.JSON(http.StatusOK, redeemCreditsResponse{CreditsGranted: granted})
}

const defaultLogsLimit = 20

type generationLogDTO struct {
	ID           int64   `json:"id"`
	DeviceID     string  `json:"deviceId"`
	Prompt       string  `json:"prompt"`
	ImageURL     string  `json:"imageUrl"`
	PromptTokens int     `json:"promptTokens"`
	OutputTokens int     `json:"outputTokens"`
	TotalTokens  int     `json:"totalTokens"`
	CostUSD      float64 `json:"costUsd"`
	CostToman    int64   `json:"costToman"`
	CreatedAt    string  `json:"createdAt"`
}

type listGenerationLogsResponse struct {
	Logs           []generationLogDTO `json:"logs"`
	TotalCount     int64              `json:"totalCount"`
	TotalCostUSD   float64            `json:"totalCostUsd"`
	TotalCostToman int64              `json:"totalCostToman"`
	TotalTokens    int64              `json:"totalTokens"`
}

// ListLogs تاریخچه‌ی صفحه‌بندی‌شده‌ی هزینه/توکن هر تولید را برمی‌گرداند —
// ?limit=&offset= (پیش‌فرض ۲۰/۰).
func (h Handler) ListLogs(c echo.Context) error {
	limit, err := strconv.Atoi(c.QueryParam("limit"))
	if err != nil || limit <= 0 || limit > 100 {
		limit = defaultLogsLimit
	}
	offset, err := strconv.Atoi(c.QueryParam("offset"))
	if err != nil || offset < 0 {
		offset = 0
	}

	page, err := h.svc.ListGenerationLogs(c.Request().Context(), limit, offset)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"message": err.Error()})
	}

	logs := make([]generationLogDTO, 0, len(page.Logs))
	for _, l := range page.Logs {
		logs = append(logs, generationLogDTO{
			ID:           l.ID,
			DeviceID:     l.DeviceID,
			Prompt:       l.Prompt,
			ImageURL:     l.ImageURL,
			PromptTokens: l.PromptTokens,
			OutputTokens: l.OutputTokens,
			TotalTokens:  l.TotalTokens,
			CostUSD:      l.CostUSD,
			CostToman:    l.CostToman,
			CreatedAt:    l.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	return c.JSON(http.StatusOK, listGenerationLogsResponse{
		Logs:           logs,
		TotalCount:     page.TotalCount,
		TotalCostUSD:   page.TotalCostUSD,
		TotalCostToman: page.TotalCostToman,
		TotalTokens:    page.TotalTokens,
	})
}
