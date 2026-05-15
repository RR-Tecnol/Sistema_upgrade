# ── Backend Dockerfile (NestJS) ──────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Gera o Prisma Client e compila
COPY . .
RUN npx prisma@5.22.0 generate
RUN npm run build

# ── Imagem de produção (só o necessário) ─────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

# Apenas dependências de produção
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copia artefatos do builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

ENV NODE_ENV=production
EXPOSE 3001

CMD ["sh", "-c", "npx prisma@5.22.0 migrate deploy && node dist/main"]
