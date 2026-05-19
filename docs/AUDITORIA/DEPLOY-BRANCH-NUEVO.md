# Deploy — branch `nuevo` (commit local → GitHub → VPS)

Guia para **commit** no repositório; o deploy na VPS fica com quem opera o servidor.

## O que vai no commit

- Código backend/frontend, migrations Prisma, `nginx/sistemaupgrade.conf`, `docker-compose.prod.yml`
- `.env.example`, `frontend/.env.production.example` (sem segredos)
- **Não** commitar: `backend/.env`, `frontend/.env.local`, chaves JWT, `.p12`, dumps SQL

## Validação local (antes do commit)

```bash
cd backend && npx prisma validate && npx prisma generate && npm run build
cd ../frontend && npm run build
```

> `npm run lint` em backend/frontend pede config ESLint inexistente no repo; use **`npm run build`** como validação TypeScript (obrigatório antes do commit).

## Git (você)

```bash
git checkout nuevo
git add -A
git status   # conferir que não há .env com segredos
git commit -m "Prepara branch nuevo para VPS: imagens MinIO, migrations, bypass dev desligado nos examples"
git push -u origin nuevo
```

## VPS (chefe / ops)

1. `git pull origin nuevo` no diretório do projeto
2. `backend/.env` — produção: `AUTH_BYPASS_MFA=false`, `NODE_ENV=production`, `FRONTEND_URLS=https://sistemaupgrade.com.br`
3. **Não** definir `MINIO_PUBLIC_BROWSER_URL` no `backend/.env` se o `docker-compose.prod.yml` já define (Compose sobrepõe)
4. `frontend/.env.local` — copiar de `frontend/.env.production.example` **antes** do build do frontend
5. Nginx: copiar `nginx/sistemaupgrade.conf` → `/etc/nginx/sites-available/` → `nginx -t && systemctl reload nginx`
6. Migrações: `docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy`
7. Rebuild: `docker compose -f docker-compose.prod.yml build --no-cache backend frontend && docker compose -f docker-compose.prod.yml up -d`

## Imagens / anexos (checklist rápido)

| Item | VPS |
|------|-----|
| `MINIO_PUBLIC_BROWSER_URL` | `https://sistemaupgrade.com.br/storage` (no Compose do backend) |
| Nginx `/storage/` | Proxy para `127.0.0.1:9000` |
| Novo upload estoque/aluno | URL `https://.../storage/stock-photos/...` ou `student-photos/...` |
| Reembolso/imprevisto | `POST /api/public/upload` → `public-uploads` |

Detalhe: [AUDITORIA/REVISAO-VPS-SPRINT1.md](./AUDITORIA/REVISAO-VPS-SPRINT1.md)

## Dev local vs VPS (sem conflito)

| Variável | Local (sua máquina) | VPS |
|----------|---------------------|-----|
| `MINIO_PUBLIC_BROWSER_URL` | vazio / comentado | `https://sistemaupgrade.com.br/storage` |
| `AUTH_BYPASS_MFA` | `true` só em dev + localhost em `FRONTEND_URLS` | `false` |
| `NEXT_PUBLIC_DEV_AUTH_BYPASS` | `true` no seu `.env.local` | `false` no build de produção |
