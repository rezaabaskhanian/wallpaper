package aigeneratehandler

import (
	"errors"
	"net/http"

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
