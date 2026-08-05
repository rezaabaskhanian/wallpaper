# syntax=docker/dockerfile:1

# -----------------------------
# Stage 1: Build
# -----------------------------
FROM golang:1.25-alpine AS builder

ENV GO111MODULE=on \
    CGO_ENABLED=0

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download

COPY . .

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    GOOS=linux GOARCH=amd64 \
    go build -o main ./cmd/main.go

# -----------------------------
# Stage 2: Runtime
# -----------------------------
FROM alpine:latest

WORKDIR /root

# libwebp-tools فرمان cwebp را می‌دهد؛ اندپوینت آپلود برای ساخت نسخه‌های thumb/full
# با WebP از آن استفاده می‌کند (به‌جای cgo، از CLI صدا زده می‌شود تا build همچنان
# CGO_ENABLED=0 و استاتیک بماند).
RUN apk add --no-cache ca-certificates tzdata libwebp-tools

COPY --from=builder /app/main .
COPY --from=builder /app/internal/repository/postgres/migrations ./migrations

ENV MIGRATIONS_DIR=/root/migrations

EXPOSE 8090

CMD ["./main"]
