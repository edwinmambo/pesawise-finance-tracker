# Single-service production image: the NestJS API also serves the built Angular
# app (one container, one URL, no CORS). Used by Render (see render.yaml).
# Local dev/one-command still uses docker-compose.yml + the per-service Dockerfiles.

# ---------- Stage 1: build the Angular app ----------
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: build the NestJS API ----------
FROM node:22-alpine AS api
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --no-audit --no-fund
COPY backend/ ./
RUN npm run build
RUN npm prune --omit=dev

# ---------- Stage 3: runtime ----------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=api /app/node_modules ./node_modules
COPY --from=api /app/dist ./dist
COPY --from=api /app/package.json ./package.json
COPY --from=api /app/docker-entrypoint.sh ./docker-entrypoint.sh
# The API serves these static files from ../client (see app.module.ts).
COPY --from=web /web/dist/frontend/browser ./client
RUN chmod +x docker-entrypoint.sh
# Render provides $PORT; the app reads it (defaults to 3000 locally).
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
