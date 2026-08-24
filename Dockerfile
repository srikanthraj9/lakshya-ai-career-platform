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

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Production Web Server
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Copy compiled assets from builder
COPY --from=builder /app/dist .

# Custom Nginx configuration for client-side routing & caching
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, no-transform"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
