# ==============================================================================
# LAKSHYA AI - MULTI-STAGE FRONTEND DOCKERFILE
# Stage 1: Build production assets
# Stage 2: Serve via Nginx Alpine
# ==============================================================================

FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build arguments for API configuration
ARG VITE_API_URL
ARG VITE_API_BASE_URL
ENV VITE_API_URL=$VITE_API_URL \
    VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Production Web Server
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Copy compiled assets from builder
COPY --from=builder /app/dist .

# Production Nginx configuration with reverse proxy and client routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
