# ---- Стадия сборки ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---- Стадия запуска ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Непривилегированный пользователь (безопасность, Req §20).
RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

USER app
EXPOSE 3000

# Проверка здоровья контейнера.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/api/v1/health/live',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]
