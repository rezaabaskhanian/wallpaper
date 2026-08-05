# syntax=docker/dockerfile:1

# -----------------------------
# Stage 1: Build (Vite production bundle)
# -----------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

# vite build از .env.production می‌خواند (VITE_API_BASE_URL روی api.wallpaperapp.ir)
RUN npx tsc -b && npx vite build

# -----------------------------
# Stage 2: Serve با nginx
# -----------------------------
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
