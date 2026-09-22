// Package deepseek is a minimal client for DeepSeek's chat-completions API
// (OpenAI-compatible), used only to generate the short two-line "quote of the
// day" text — see internal/service/dailyquote.
package deepseek

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

type Client struct {
	apiKey     string
	baseURL    string
	model      string
	httpClient *http.Client
}

func New(apiKey, baseURL, model string) Client {
	return NewWithClient(apiKey, baseURL, model, &http.Client{Timeout: 20 * time.Second})
}

// NewWithClient لت هم‌ه‌ی سازوکار مثل New است اما httpClient از بیرون تزریق
// می‌شود — برای مسیرهایی (مثل غنی‌سازی prompt در aigenerate) که باید از یک
// پراکسی (httpproxy.NewClient) عبور کنند، بدون اینکه روی مسیر فعلی dailyquote
// اثر بگذارد.
func NewWithClient(apiKey, baseURL, model string, httpClient *http.Client) Client {
	return Client{
		apiKey:     apiKey,
		baseURL:    baseURL,
		model:      model,
		httpClient: httpClient,
	}
}

// Enabled reports whether an API key was configured — callers should treat a
// disabled client as "feature off", not an error.
func (c Client) Enabled() bool {
	return c.apiKey != ""
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model          string          `json:"model"`
	Messages       []chatMessage   `json:"messages"`
	Temperature    float64         `json:"temperature"`
	MaxTokens      int             `json:"max_tokens"`
	ResponseFormat *responseFormat `json:"response_format,omitempty"`
}

type responseFormat struct {
	Type string `json:"type"`
}

type chatResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
}

// quoteJSON is the strict shape the system prompt asks the model to reply
// with, so parsing never depends on guessing a text delimiter.
type quoteJSON struct {
	Line1 string `json:"line1"`
	Line2 string `json:"line2"`
}

// GenerateQuote asks the model for one short Persian two-line quote and
// returns (line1, line2). userPrompt should describe today's date/season —
// see dailyquote.buildPrompt.
func (c Client) GenerateQuote(ctx context.Context, userPrompt string) (line1, line2 string, err error) {
	const op = "deepseek.GenerateQuote"
	if !c.Enabled() {
		return "", "", richerror.New(op).WithMessage("DeepSeek API key تنظیم نشده است")
	}

	reqBody := chatRequest{
		Model: c.model,
		Messages: []chatMessage{
			{
				Role: "system",
				Content: "You write one short, warm, uplifting Persian (Farsi) sentence pair for a wallpaper app's daily quote widget. " +
					"Reply with ONLY a JSON object: {\"line1\":\"...\",\"line2\":\"...\"}. " +
					"line1 is a short lead-in (max ~6 words). line2 is the main sentence (max ~14 words), written in Persian, no quotation marks, no emoji, no hashtags, no English.",
			},
			{Role: "user", Content: userPrompt},
		},
		Temperature:    0.9,
		MaxTokens:      150,
		ResponseFormat: &responseFormat{Type: "json_object"},
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return "", "", richerror.New(op).WithErr(err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return "", "", richerror.New(op).WithErr(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", "", richerror.New(op).WithErr(err).WithMessage("درخواست به DeepSeek ناموفق بود")
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", richerror.New(op).WithErr(err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", "", richerror.New(op).WithMessage(fmt.Sprintf("DeepSeek HTTP %d: %s", resp.StatusCode, string(body)))
	}

	var parsed chatResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", "", richerror.New(op).WithErr(err).WithMessage("پاسخ DeepSeek قابل خوانش نبود")
	}
	if len(parsed.Choices) == 0 {
		return "", "", richerror.New(op).WithMessage("DeepSeek پاسخی برنگرداند")
	}

	var q quoteJSON
	if err := json.Unmarshal([]byte(parsed.Choices[0].Message.Content), &q); err != nil {
		return "", "", richerror.New(op).WithErr(err).WithMessage("خروجی DeepSeek به‌فرمت مورد انتظار نبود")
	}
	if q.Line2 == "" {
		return "", "", richerror.New(op).WithMessage("DeepSeek خط اصلی جمله را برنگرداند")
	}
	return q.Line1, q.Line2, nil
}

// EnrichPrompt توضیح متنی کاربر (که ممکن است فارسی و کوتاه باشد) را به یک
// prompt انگلیسی دقیق‌تر برای مدل‌های تولید عکس (Imagen) تبدیل می‌کند —
// همان مکانیک HTTP/چت که GenerateQuote استفاده می‌کند، فقط با system prompt متفاوت.
func (c Client) EnrichPrompt(ctx context.Context, userPrompt string) (string, error) {
	const op = "deepseek.EnrichPrompt"
	if !c.Enabled() {
		return "", richerror.New(op).WithMessage("DeepSeek API key تنظیم نشده است")
	}

	reqBody := chatRequest{
		Model: c.model,
		Messages: []chatMessage{
			{
				Role: "system",
				Content: "You rewrite a short wallpaper description (possibly in Persian/Farsi) into a single, detailed, " +
					"vivid English prompt suitable for an AI image generator. Reply with ONLY the rewritten prompt text, " +
					"no quotes, no explanation, no markdown.",
			},
			{Role: "user", Content: userPrompt},
		},
		Temperature: 0.7,
		MaxTokens:   300,
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return "", richerror.New(op).WithErr(err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return "", richerror.New(op).WithErr(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", richerror.New(op).WithErr(err).WithMessage("درخواست به DeepSeek ناموفق بود")
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", richerror.New(op).WithErr(err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", richerror.New(op).WithMessage(fmt.Sprintf("DeepSeek HTTP %d: %s", resp.StatusCode, string(body)))
	}

	var parsed chatResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", richerror.New(op).WithErr(err).WithMessage("پاسخ DeepSeek قابل خوانش نبود")
	}
	if len(parsed.Choices) == 0 || parsed.Choices[0].Message.Content == "" {
		return "", richerror.New(op).WithMessage("DeepSeek پاسخی برنگرداند")
	}
	return parsed.Choices[0].Message.Content, nil
}
