// Package claude is a minimal client for Anthropic's Messages API, used only
// to enrich/translate a user's short wallpaper description into a detailed
// English prompt before it's handed to Gemini's image generator — see
// internal/service/aigenerate. Claude itself never generates images.
package claude

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"wallpaperstore/internal/pkg/richerror"
)

const (
	defaultBaseURL = "https://api.anthropic.com"
	// defaultModel یک مدل ارزان و سریع کافی برای بازنویسی/غنی‌سازی یک prompt
	// کوتاه است — این فیچر متن ساده تولید می‌کند، نیازی به مدل قوی‌تر ندارد.
	defaultModel     = "claude-haiku-4-5-20251001"
	anthropicVersion = "2023-06-01"
)

type Client struct {
	apiKey     string
	baseURL    string
	model      string
	httpClient *http.Client
}

func New(apiKey string) Client {
	return NewWithClient(apiKey, &http.Client{Timeout: 20 * time.Second})
}

// NewWithClient مثل New است اما httpClient از بیرون تزریق می‌شود (برای عبور
// از پراکسی httpproxy.NewClient).
func NewWithClient(apiKey string, httpClient *http.Client) Client {
	return Client{
		apiKey:     apiKey,
		baseURL:    defaultBaseURL,
		model:      defaultModel,
		httpClient: httpClient,
	}
}

// Enabled reports whether an API key was configured.
func (c Client) Enabled() bool {
	return c.apiKey != ""
}

type messagesRequest struct {
	Model     string    `json:"model"`
	MaxTokens int       `json:"max_tokens"`
	System    string    `json:"system"`
	Messages  []message `json:"messages"`
}

type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type messagesResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
}

// EnrichPrompt توضیح کاربر را به یک prompt انگلیسی دقیق برای تولید عکس تبدیل می‌کند.
func (c Client) EnrichPrompt(ctx context.Context, userPrompt string) (string, error) {
	const op = "claude.EnrichPrompt"
	if !c.Enabled() {
		return "", richerror.New(op).WithMessage("Claude API key تنظیم نشده است")
	}

	reqBody := messagesRequest{
		Model:     c.model,
		MaxTokens: 300,
		System: "You rewrite a short wallpaper description (possibly in Persian/Farsi) into a single, detailed, " +
			"vivid English prompt suitable for an AI image generator. Reply with ONLY the rewritten prompt text, " +
			"no quotes, no explanation, no markdown.",
		Messages: []message{{Role: "user", Content: userPrompt}},
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return "", richerror.New(op).WithErr(err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v1/messages", bytes.NewReader(payload))
	if err != nil {
		return "", richerror.New(op).WithErr(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", anthropicVersion)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", richerror.New(op).WithErr(err).WithMessage("درخواست به Claude ناموفق بود")
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", richerror.New(op).WithErr(err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", richerror.New(op).WithMessage(fmt.Sprintf("Claude HTTP %d: %s", resp.StatusCode, string(body)))
	}

	var parsed messagesResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", richerror.New(op).WithErr(err).WithMessage("پاسخ Claude قابل خوانش نبود")
	}
	if len(parsed.Content) == 0 || parsed.Content[0].Text == "" {
		return "", richerror.New(op).WithMessage("Claude پاسخی برنگرداند")
	}
	return parsed.Content[0].Text, nil
}
