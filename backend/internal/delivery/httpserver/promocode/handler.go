package promocodehandler

import (
	"context"
	"net/http"

	"wallpaperstore/internal/pkg/richerror"
	promocodeservice "wallpaperstore/internal/service/promocode"
	"wallpaperstore/internal/service/promocode/dto"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc promocodeservice.Service
}

func New(svc promocodeservice.Service) Handler {
	return Handler{svc: svc}
}

// SetRoutes مسیر عمومی POST /api/v1/promo-codes/redeem و مسیرهای ادمین را ثبت می‌کند.
func (h Handler) SetRoutes(api *echo.Group, admin *echo.Group) {
	api.POST("/promo-codes/redeem", h.Redeem)

	admin.GET("/promo-codes", h.AdminList)
	admin.POST("/promo-codes", h.Create)
	admin.PUT("/promo-codes/:id", h.Update)
	admin.DELETE("/promo-codes/:id", h.Delete)
}

func (h Handler) Redeem(c echo.Context) error {
	const op = "promocodehandler.Redeem"
	var req dto.RedeemRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.RedeemCode(context.Background(), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) AdminList(c echo.Context) error {
	const op = "promocodehandler.AdminList"
	res, err := h.svc.AdminListPromoCodes(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) Create(c echo.Context) error {
	const op = "promocodehandler.Create"
	var req dto.UpsertPromoCodeRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.CreatePromoCode(context.Background(), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusCreated, res)
}

func (h Handler) Update(c echo.Context) error {
	const op = "promocodehandler.Update"
	var req dto.UpsertPromoCodeRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage("درخواست نامعتبر است")
	}
	res, err := h.svc.UpdatePromoCode(context.Background(), c.Param("id"), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) Delete(c echo.Context) error {
	const op = "promocodehandler.Delete"
	if err := h.svc.DeletePromoCode(context.Background(), c.Param("id")); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}
