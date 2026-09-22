// Package gemini is a minimal client for Google's Imagen (Generative Language
// API) text-to-image endpoint — see internal/service/aigenerate. Gemini/Imagen
// is the only one of the three configured AI providers that can actually
// generate an image; Claude/DeepSeek are text-only and only enrich the prompt.
package gemini

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"wallpaperstore/internal/pkg/richerror"
)

const (
	defaultBaseURL = "https://generativelanguage.googleapis.com/v1beta"
	defaultModel   = "imagen-3.0-generate-002"
)

type Client struct {
	apiKey     string
	baseURL    string
	model      string
	httpClient *http.Client
}

func New(apiKey string) Client {
	return NewWithClient(apiKey, &http.Client{Timeout: 60 * time.Second})
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

type predictRequest struct {
	Instances  []predictInstance `json:"instances"`
	Parameters predictParameters `json:"parameters"`
}

type predictInstance struct {
	Prompt string `json:"prompt"`
}

type predictParameters struct {
	SampleCount int `json:"sampleCount"`
}

type predictResponse struct {
	Predictions []struct {
		BytesBase64Encoded string `json:"bytesBase64Encoded"`
	} `json:"predictions"`
}

// GenerateImage یک عکس از روی prompt (باید انگلیسی و دقیق باشد — ببینید
// claude/deepseek EnrichPrompt) می‌سازد و بایت‌های PNG را برمی‌گرداند.
func (c Client) GenerateImage(ctx context.Context, prompt string) ([]byte, error) {
	const op = "gemini.GenerateImage"
	if !c.Enabled() {
		return nil, richerror.New(op).WithMessage("Gemini API key تنظیم نشده است")
	}

	reqBody := predictRequest{
		Instances:  []predictInstance{{Prompt: prompt}},
		Parameters: predictParameters{SampleCount: 1},
	}
	payload, err := json.Marshal(reqBody)
	if err != nil {
		return nil, richerror.New(op).WithErr(err)
	}

	url := fmt.Sprintf("%s/models/%s:predict?key=%s", c.baseURL, c.model, c.apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return nil, richerror.New(op).WithErr(err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, richerror.New(op).WithErr(err).WithMessage("درخواست به Gemini ناموفق بود")
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, richerror.New(op).WithErr(err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, richerror.New(op).WithMessage(fmt.Sprintf("Gemini HTTP %d: %s", resp.StatusCode, string(body)))
	}

	var parsed predictResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, richerror.New(op).WithErr(err).WithMessage("پاسخ Gemini قابل خوانش نبود")
	}
	if len(parsed.Predictions) == 0 || parsed.Predictions[0].BytesBase64Encoded == "" {
		return nil, richerror.New(op).WithMessage("Gemini عکسی برنگرداند")
	}

	imgBytes, err := base64.StdEncoding.DecodeString(parsed.Predictions[0].BytesBase64Encoded)
	if err != nil {
		return nil, richerror.New(op).WithErr(err).WithMessage("خروجی Gemini قابل خوانش نبود")
	}
	return imgBytes, nil
}
