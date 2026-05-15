# Ambiente e execução local

## Pré-requisitos

- Node.js 18+
- Docker e Docker Compose (PostgreSQL e Redis definidos no compose da raiz)
- Git

## Infraestrutura (Docker)

Na raiz do repositório:

```bash
docker-compose up -d
```

Serviços definidos em `docker-compose.yml` na raiz (valores atuais do ficheiro):

| Serviço | Portas no host | Notas |
|---------|------------------|--------|
| PostgreSQL 15 | `5432` | Utilizador `cursos_user`, base `cursos_db` |
| Redis 7 | `6379` | `redis-server --requirepass` conforme compose |
| MinIO | API `9010` → 9000 no contentor; consola `9011` → 9001 | Credenciais de exemplo no compose: `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` |

## Backend (NestJS)

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

**Porta:** em `backend/src/main.ts`, o servidor usa `process.env.PORT` ou, por omissão, **3001**. Se a documentação de equipa ou o `.env` local usarem `3002`, isso é apenas configuração local — a verdade no código é `PORT || 3001`.

**Swagger:** `http://localhost:<PORT>/api/docs` (prefixo global da API conforme `main.ts`).

## Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Por omissão do Next.js: **http://localhost:3000**.

## Variáveis de ambiente

- **Nunca** commitar `.env` com segredos reais.
- Usar `backend/.env.example` e `.env.example` na raiz como referência de chaves necessárias.
- **JWT:** em produção, `JWT_SECRET` com comprimento mínimo exigido pelo bootstrap em `main.ts` (falha de arranque se fraco em `NODE_ENV=production`).

## Ordem típica “do zero”

1. `docker-compose up -d`
2. `cd backend && npm install && npx prisma generate && npx prisma migrate deploy && npm run prisma:seed`
3. `npm run start:dev` (backend)
4. Noutro terminal: `cd frontend && npm install && npm run dev`

Credenciais de utilizadores de desenvolvimento: ver [../SEEDS_GUIDE.md](../SEEDS_GUIDE.md) (alinhado ao seed atual).
