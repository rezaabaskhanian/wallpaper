// Package gemini is a minimal client for Google's Gemini image-generation
// model (gemini-2.5-flash-image, a.k.a. "nano-banana") via the generateContent
// endpoint — see internal/service/aigenerate. Gemini is the only one of the
// three configured AI providers that can actually generate an image;
// Claude/DeepSeek are text-only and only enrich the prompt.
//
// Unlike the older Imagen :predict endpoint (billed per image), this model is
// billed per token (see usageMetadata in the response) — that's what lets
// aigenerateservice compute a real cost per generation instead of a flat
// admin-guessed price.
package gemini

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"wallpaperstore/internal/pkg/richerror"
)

const (
	defaultBaseURL = "https://generativelanguage.googleapis.com/v1beta"
	// defaultModel قابل override با env GEMINI_IMAGE_MODEL است — گوگل گاهی نام
	// مدل‌های preview را عوض می‌کند، نمی‌خواهیم برای آن نیاز به دیپلوی کد باشد.
	defaultModel = "gemini-2.5-flash-image"
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
	model := os.Getenv("GEMINI_IMAGE_MODEL")
	if model == "" {
		model = defaultModel
	}
	return Client{
		apiKey:     apiKey,
		baseURL:    defaultBaseURL,
		model:      model,
		httpClient: httpClient,
	}
}

// Enabled reports whether an API key was configured.
func (c Client) Enabled() bool {
	return c.apiKey != ""
}

// Result تصویر تولیدشده و تعداد توکن مصرف‌شده (برای محاسبه‌ی هزینه‌ی واقعی در
// aigenerateservice) را برمی‌گرداند.
type Result struct {
	ImageBytes   []byte
	PromptTokens int
	OutputTokens int
	TotalTokens  int
}

type generateRequest struct {
	Contents         []content        `json:"contents"`
	GenerationConfig generationConfig `json:"generationConfig"`
}

type content struct {
	Parts []part `json:"parts"`
}

type part struct {
	Text       string      `json:"text,omitempty"`
	InlineData *inlineData `json:"inlineData,omitempty"`
}

type inlineData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type generationConfig struct {
	ResponseModalities []string `json:"responseModalities"`
}

type generateResponse struct {
	Candidates []struct {
		Content content `json:"content"`
	} `json:"candidates"`
	UsageMetadata struct {
		PromptTokenCount     int `json:"promptTokenCount"`
		CandidatesTokenCount int `json:"candidatesTokenCount"`
		TotalTokenCount      int `json:"totalTokenCount"`
	} `json:"usageMetadata"`
}

// GenerateImage یک عکس از روی prompt (باید انگلیسی و دقیق باشد — ببینید
// claude/deepseek EnrichPrompt) می‌سازد و بایت‌های عکس به‌همراه usage توکن را
// برمی‌گرداند.
func (c Client) GenerateImage(ctx context.Context, prompt string) (Result, error) {
	const op = "gemini.GenerateImage"
	if !c.Enabled() {
		return Result{}, richerror.New(op).WithMessage("Gemini API key تنظیم نشده است")
	}

	reqBody := generateRequest{
		Contents: []content{{Parts: []part{{Text: prompt}}}},
		GenerationConfig: generationConfig{
			ResponseModalities: []string{"TEXT", "IMAGE"},
		},
	}
	payload, err := json.Marshal(reqBody)
	if err != nil {
		return Result{}, richerror.New(op).WithErr(err)
	}

	url := fmt.Sprintf("%s/models/%s:generateContent?key=%s", c.baseURL, c.model, c.apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return Result{}, richerror.New(op).WithErr(err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return Result{}, richerror.New(op).WithErr(err).WithMessage("درخواست به Gemini ناموفق بود")
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return Result{}, richerror.New(op).WithErr(err)
	}
	if resp.StatusCode != http.StatusOK {
		return Result{}, richerror.New(op).WithMessage(fmt.Sprintf("Gemini HTTP %d: %s", resp.StatusCode, string(body)))
	}

	var parsed generateResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return Result{}, richerror.New(op).WithErr(err).WithMessage("پاسخ Gemini قابل خوانش نبود")
	}

	var imgBase64, mimeType string
	for _, cand := range parsed.Candidates {
		for _, p := range cand.Content.Parts {
			if p.InlineData != nil && p.InlineData.Data != "" {
				imgBase64 = p.InlineData.Data
				mimeType = p.InlineData.MimeType
				break
			}
		}
		if imgBase64 != "" {
			break
		}
	}
	if imgBase64 == "" {
		return Result{}, richerror.New(op).WithMessage("Gemini عکسی برنگرداند")
	}
	_ = mimeType

	imgBytes, err := base64.StdEncoding.DecodeString(imgBase64)
	if err != nil {
		return Result{}, richerror.New(op).WithErr(err).WithMessage("خروجی Gemini قابل خوانش نبود")
	}

	return Result{
		ImageBytes:   imgBytes,
		PromptTokens: parsed.UsageMetadata.PromptTokenCount,
		OutputTokens: parsed.UsageMetadata.CandidatesTokenCount,
		TotalTokens:  parsed.UsageMetadata.TotalTokenCount,
	}, nil
}
