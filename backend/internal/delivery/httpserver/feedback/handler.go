package feedbackhandler

import (
	"context"
	"net/http"

	"wallpaperstore/internal/pkg/richerror"
	feedbackservice "wallpaperstore/internal/service/feedback"
	"wallpaperstore/internal/service/feedback/dto"

	"github.com/labstack/echo/v4"
)

type Handler struct {
	svc feedbackservice.Service
}

func New(svc feedbackservice.Service) Handler {
	return Handler{svc: svc}
}

// SetRoutes «درخواست و رأی»: مسیرهای عمومی اپ و مسیرهای ادمین.
func (h Handler) SetRoutes(api *echo.Group, admin *echo.Group) {
	api.POST("/requests", h.SubmitRequest)
	api.GET("/polls/active", h.ActivePoll)
	api.POST("/polls/:id/vote", h.Vote)
	api.GET("/inbox", h.Inbox)

	admin.GET("/requests", h.AdminListRequests)
	admin.PUT("/requests", h.AdminUpdateRequests)
	admin.DELETE("/requests/:id", h.AdminDeleteRequest)
	admin.GET("/devices/:deviceId", h.AdminDevice)
	admin.GET("/polls", h.AdminListPolls)
	admin.POST("/polls", h.AdminCreatePoll)
	admin.PUT("/polls/:id/close", h.AdminClosePoll)
	admin.DELETE("/polls/:id", h.AdminDeletePoll)
}

const badRequest = "درخواست نامعتبر است"

func (h Handler) SubmitRequest(c echo.Context) error {
	const op = "feedbackhandler.SubmitRequest"
	var req dto.SubmitRequestRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage(badRequest)
	}
	if err := h.svc.SubmitRequest(context.Background(), req); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusCreated)
}

func (h Handler) ActivePoll(c echo.Context) error {
	const op = "feedbackhandler.ActivePoll"
	res, err := h.svc.GetActivePoll(context.Background(), c.QueryParam("deviceId"))
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) Vote(c echo.Context) error {
	const op = "feedbackhandler.Vote"
	var req dto.VoteRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage(badRequest)
	}
	res, err := h.svc.Vote(context.Background(), c.Param("id"), req)
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) Inbox(c echo.Context) error {
	const op = "feedbackhandler.Inbox"
	res, err := h.svc.Inbox(context.Background(), c.QueryParam("deviceId"))
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) AdminListRequests(c echo.Context) error {
	const op = "feedbackhandler.AdminListRequests"
	res, err := h.svc.AdminListRequests(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) AdminUpdateRequests(c echo.Context) error {
	const op = "feedbackhandler.AdminUpdateRequests"
	var req dto.UpdateRequestsRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage(badRequest)
	}
	if err := h.svc.AdminUpdateRequests(context.Background(), req); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h Handler) AdminDevice(c echo.Context) error {
	const op = "feedbackhandler.AdminDevice"
	res, err := h.svc.AdminDevice(context.Background(), c.Param("deviceId"))
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) AdminDeleteRequest(c echo.Context) error {
	const op = "feedbackhandler.AdminDeleteRequest"
	if err := h.svc.AdminDeleteRequest(context.Background(), c.Param("id")); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h Handler) AdminListPolls(c echo.Context) error {
	const op = "feedbackhandler.AdminListPolls"
	res, err := h.svc.AdminListPolls(context.Background())
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.JSON(http.StatusOK, res)
}

func (h Handler) AdminCreatePoll(c echo.Context) error {
	const op = "feedbackhandler.AdminCreatePoll"
	var req dto.CreatePollRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage(badRequest)
	}
	if err := h.svc.AdminCreatePoll(context.Background(), req); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusCreated)
}

func (h Handler) AdminClosePoll(c echo.Context) error {
	const op = "feedbackhandler.AdminClosePoll"
	var req dto.ClosePollRequest
	if err := c.Bind(&req); err != nil {
		return richerror.New(op).WithErr(err).WithMessage(badRequest)
	}
	if err := h.svc.AdminClosePoll(context.Background(), c.Param("id"), req); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}

func (h Handler) AdminDeletePoll(c echo.Context) error {
	const op = "feedbackhandler.AdminDeletePoll"
	if err := h.svc.AdminDeletePoll(context.Background(), c.Param("id")); err != nil {
		return richerror.New(op).WithErr(err)
	}
	return c.NoContent(http.StatusNoContent)
}
