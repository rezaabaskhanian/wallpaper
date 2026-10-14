package feedbackservice

import (
	"context"
	"strings"
	"time"
	"unicode/utf8"

	domain "wallpaperstore/internal/domain/feedback"
	"wallpaperstore/internal/pkg/richerror"
	"wallpaperstore/internal/service/feedback/dto"

	"github.com/google/uuid"
)

type Repository interface {
	CountRequestsSince(ctx context.Context, deviceID string, since time.Time) (int, error)
	InsertRequest(ctx context.Context, r domain.Request) error
	ListRequests(ctx context.Context) ([]domain.Request, error)
	UpdateRequests(ctx context.Context, ids []string, status, categoryID, reply string) error
	DeviceRequests(ctx context.Context, deviceID string) ([]domain.Request, error)
	DeviceStats(ctx context.Context, deviceID string) (domain.DeviceStats, error)
	DeleteRequest(ctx context.Context, id string) error

	ActivePoll(ctx context.Context) (*domain.Poll, error)
	ListPolls(ctx context.Context) ([]domain.Poll, error)
	CreatePoll(ctx context.Context, p domain.Poll) error
	ClosePoll(ctx context.Context, id string, winnerOptionID *string) error
	DeletePoll(ctx context.Context, id string) error
	DeviceVote(ctx context.Context, pollID, deviceID string) (string, error)
	Vote(ctx context.Context, pollID, deviceID, optionID string) error

	Inbox(ctx context.Context, deviceID string) ([]domain.InboxMessage, error)
}

type Service struct {
	repo Repository
	now  func() time.Time
}

func New(repo Repository) Service {
	return Service{repo: repo, now: time.Now}
}

func pollDTO(p domain.Poll) dto.PollDTO {
	out := dto.PollDTO{
		ID:             p.ID,
		Question:       p.Question,
		IsActive:       p.IsActive,
		WinnerOptionID: p.WinnerOptionID,
		Options:        make([]dto.PollOptionDTO, 0, len(p.Options)),
		CreatedAt:      p.CreatedAt.Format(time.RFC3339),
	}
	for _, o := range p.Options {
		out.Options = append(out.Options, dto.PollOptionDTO{
			ID: o.ID, Title: o.Title, CategoryID: o.CategoryID, Votes: o.Votes,
		})
		out.TotalVotes += o.Votes
	}
	return out
}

// ---- عمومی ----

func (s Service) SubmitRequest(ctx context.Context, req dto.SubmitRequestRequest) error {
	const op = "feedbackservice.SubmitRequest"
	if !domain.ValidDevice(req.DeviceID) {
		return richerror.New(op).WithErr(domain.ErrBadDevice).WithMessage(domain.ErrBadDevice.Error())
	}
	text, err := domain.NormalizeText(req.Text)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage(err.Error())
	}
	n, err := s.repo.CountRequestsSince(ctx, req.DeviceID, s.now().Add(-24*time.Hour))
	if err != nil {
		return richerror.New(op).WithErr(err)
	}
	if n >= domain.MaxRequestsPerDay {
		return richerror.New(op).WithErr(domain.ErrTooMany).WithMessage(domain.ErrTooMany.Error())
	}
	return s.repo.InsertRequest(ctx, domain.Request{
		ID: uuid.NewString(), DeviceID: req.DeviceID, Text: text, Status: domain.StatusPending,
	})
}

func (s Service) GetActivePoll(ctx context.Context, deviceID string) (dto.ActivePollResponse, error) {
	const op = "feedbackservice.GetActivePoll"
	p, err := s.repo.ActivePoll(ctx)
	if err != nil {
		return dto.ActivePollResponse{}, richerror.New(op).WithErr(err)
	}
	if p == nil {
		return dto.ActivePollResponse{}, nil
	}
	d := pollDTO(*p)
	if domain.ValidDevice(deviceID) {
		if mine, err := s.repo.DeviceVote(ctx, p.ID, deviceID); err == nil {
			d.MyOptionID = mine
		}
	}
	return dto.ActivePollResponse{Poll: &d}, nil
}

func (s Service) Vote(ctx context.Context, pollID string, req dto.VoteRequest) (dto.ActivePollResponse, error) {
	const op = "feedbackservice.Vote"
	if !domain.ValidDevice(req.DeviceID) {
		return dto.ActivePollResponse{}, richerror.New(op).WithErr(domain.ErrBadDevice).WithMessage(domain.ErrBadDevice.Error())
	}
	p, err := s.repo.ActivePoll(ctx)
	if err != nil {
		return dto.ActivePollResponse{}, richerror.New(op).WithErr(err)
	}
	if p == nil || p.ID != pollID {
		return dto.ActivePollResponse{}, richerror.New(op).WithErr(domain.ErrPollNotActive).WithMessage(domain.ErrPollNotActive.Error())
	}
	found := false
	for _, o := range p.Options {
		if o.ID == req.OptionID {
			found = true
			break
		}
	}
	if !found {
		return dto.ActivePollResponse{}, richerror.New(op).WithErr(domain.ErrBadOption).WithMessage(domain.ErrBadOption.Error())
	}
	if err := s.repo.Vote(ctx, pollID, req.DeviceID, req.OptionID); err != nil {
		return dto.ActivePollResponse{}, richerror.New(op).WithErr(err)
	}
	return s.GetActivePoll(ctx, req.DeviceID)
}

func (s Service) Inbox(ctx context.Context, deviceID string) (dto.InboxResponse, error) {
	const op = "feedbackservice.Inbox"
	if !domain.ValidDevice(deviceID) {
		return dto.InboxResponse{Messages: []dto.InboxMessageDTO{}}, nil
	}
	ms, err := s.repo.Inbox(ctx, deviceID)
	if err != nil {
		return dto.InboxResponse{}, richerror.New(op).WithErr(err)
	}
	out := make([]dto.InboxMessageDTO, 0, len(ms))
	for _, m := range ms {
		out = append(out, dto.InboxMessageDTO{ID: m.ID, Title: m.Title, Body: m.Body, CategoryID: m.CategoryID})
	}
	return dto.InboxResponse{Messages: out}, nil
}

// ---- ادمین ----

func (s Service) AdminListRequests(ctx context.Context) (dto.ListRequestsResponse, error) {
	const op = "feedbackservice.AdminListRequests"
	rs, err := s.repo.ListRequests(ctx)
	if err != nil {
		return dto.ListRequestsResponse{}, richerror.New(op).WithErr(err)
	}
	return dto.ListRequestsResponse{Requests: requestDTOs(rs)}, nil
}

func requestDTOs(rs []domain.Request) []dto.RequestDTO {
	out := make([]dto.RequestDTO, 0, len(rs))
	for _, r := range rs {
		out = append(out, dto.RequestDTO{
			ID: r.ID, DeviceID: r.DeviceID, Text: r.Text, Status: r.Status,
			CategoryID: r.CategoryID, Reply: r.Reply, CreatedAt: r.CreatedAt.Format(time.RFC3339),
		})
	}
	return out
}

// AdminDevice همه‌ی درخواست‌های یک دستگاه به‌اضافه‌ی خلاصه‌ی آمارش.
func (s Service) AdminDevice(ctx context.Context, deviceID string) (dto.DeviceResponse, error) {
	const op = "feedbackservice.AdminDevice"
	if !domain.ValidDevice(deviceID) {
		return dto.DeviceResponse{}, richerror.New(op).WithErr(domain.ErrBadDevice).WithMessage(domain.ErrBadDevice.Error())
	}
	rs, err := s.repo.DeviceRequests(ctx, deviceID)
	if err != nil {
		return dto.DeviceResponse{}, richerror.New(op).WithErr(err)
	}
	st, err := s.repo.DeviceStats(ctx, deviceID)
	if err != nil {
		return dto.DeviceResponse{}, richerror.New(op).WithErr(err)
	}
	res := dto.DeviceResponse{
		DeviceID:      deviceID,
		Requests:      requestDTOs(rs),
		AppVersion:    st.AppVersion,
		Opens:         st.Opens,
		WallpaperSets: st.WallpaperSets,
		PollVotes:     st.PollVotes,
	}
	if st.FirstSeen != nil {
		res.FirstSeen = st.FirstSeen.Format(time.RFC3339)
	}
	if st.LastSeen != nil {
		res.LastSeen = st.LastSeen.Format(time.RFC3339)
	}
	return res, nil
}

func (s Service) AdminUpdateRequests(ctx context.Context, req dto.UpdateRequestsRequest) error {
	const op = "feedbackservice.AdminUpdateRequests"
	if !domain.ValidStatus(req.Status) || len(req.IDs) == 0 {
		return richerror.New(op).WithErr(domain.ErrBadStatus).WithMessage(domain.ErrBadStatus.Error())
	}
	reply := strings.TrimSpace(req.Reply)
	if utf8.RuneCountInString(reply) > domain.MaxReplyLen {
		return richerror.New(op).WithMessage("جواب حداکثر ۲۰۰ حرف باشد")
	}
	return s.repo.UpdateRequests(ctx, req.IDs, req.Status, req.CategoryID, reply)
}

func (s Service) AdminDeleteRequest(ctx context.Context, id string) error {
	return s.repo.DeleteRequest(ctx, id)
}

func (s Service) AdminListPolls(ctx context.Context) (dto.ListPollsResponse, error) {
	const op = "feedbackservice.AdminListPolls"
	ps, err := s.repo.ListPolls(ctx)
	if err != nil {
		return dto.ListPollsResponse{}, richerror.New(op).WithErr(err)
	}
	out := make([]dto.PollDTO, 0, len(ps))
	for _, p := range ps {
		out = append(out, pollDTO(p))
	}
	return dto.ListPollsResponse{Polls: out}, nil
}

// AdminCreatePoll رأی‌گیری تازه می‌سازد؛ رأی‌گیری فعال قبلی (بدون برنده) بسته می‌شود.
func (s Service) AdminCreatePoll(ctx context.Context, req dto.CreatePollRequest) error {
	const op = "feedbackservice.AdminCreatePoll"
	opts := make([]domain.PollOption, 0, len(req.Options))
	for _, o := range req.Options {
		opts = append(opts, domain.PollOption{ID: uuid.NewString(), Title: o.Title, CategoryID: o.CategoryID})
	}
	p, err := domain.NewPoll(req.Question, opts)
	if err != nil {
		return richerror.New(op).WithErr(err).WithMessage(err.Error())
	}
	p.ID = uuid.NewString()
	for i := range p.Options {
		p.Options[i].PollID = p.ID
	}
	return s.repo.CreatePoll(ctx, p)
}

func (s Service) AdminClosePoll(ctx context.Context, id string, req dto.ClosePollRequest) error {
	var winner *string
	if req.WinnerOptionID != "" {
		winner = &req.WinnerOptionID
	}
	return s.repo.ClosePoll(ctx, id, winner)
}

func (s Service) AdminDeletePoll(ctx context.Context, id string) error {
	return s.repo.DeletePoll(ctx, id)
}
