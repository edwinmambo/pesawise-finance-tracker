# ---- Build stage: compile TypeScript (incl. the seed) to dist/ ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
# npm install (not ci) so platform-specific optional deps resolve inside the
# container even when the lockfile was generated on another OS.
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build
# Drop dev dependencies so the runtime image only ships production deps.
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
