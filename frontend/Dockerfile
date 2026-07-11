# ---- Build stage: produce the optimized Angular bundle ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
# npm install (not ci) so Linux-musl optional deps resolve inside the container
# even when the lockfile was generated on another OS.
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ---- Runtime stage: serve static files via nginx + proxy /api ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
