# Deploy — branch `nuevo` (commit local → GitHub → VPS)

Guia para **commit** no repositório; o deploy na VPS fica com quem opera o servidor.

> **Registo completo das funcionalidades do commit `6576564`:** [`../ATUALIZACOES-COMMIT-6576564.md`](../ATUALIZACOES-COMMIT-6576564.md)

## O que vai no commit

- Código backend/frontend, migrations Prisma, `nginx/sistemaupgrade.conf`, `docker-compose.prod.yml`
- `.env.example`, `frontend/.env.production.example` (sem segredos)
- **Não** commitar: `backend/.env`, `frontend/.env.local`, chaves JWT, `.p12`, dumps SQL

## Validação local (antes do commit)

```bash
cd backend && npm run validate:vps
```

Equivale a: `prisma validate` + `generate` + `build` backend + `motor:verify` + `penalty:verify` (imprevisto/diária/motorista) + `build` frontend + `migrate status`.

Atalhos individuais:

```bash
cd backend && npx prisma validate && npx prisma generate && npm run build
cd backend && npm run motor:verify && npm run penalty:verify && npm run acao-custo:verify
cd ../frontend && npm run build
```

**Abastecimento / despesa no período:** ao cadastrar em *Custos* da ação, o backend cria `ContaPagar` (`abastecimento` ou `outros`) com `acaoCustoId:` nas observações. Custos antigos sem conta são sincronizados ao abrir o período (`findOne`). Remover o custo desativa a conta vinculada.

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

## Motorista / mapa (após deploy com fix de partida)

| Verificação | Esperado |
|-------------|----------|
| App motorista — próxima viagem | Ida (`PLANNED` com menor `departureDate`), não a volta no fim do período |
| Botão «Iniciar viagem» | Ativo só no dia da `departureDate` da viagem mostrada |
| Admin — Motoristas em rota | Vazio até existir trip `IN_TRANSIT` (não basta período `EM_ANDAMENTO`) |
| Migration | `20260519130000_acao_driver_departure_date` (`Acao.driverDepartureDate` opcional) |

**Reparo em períodos já existentes (ex. QUALIFICA-MA-3):** após `migrate deploy` + rebuild, regenerar viagens PLANNED do motorista (`POST /acoes/:id/funcionarios/:employeeId/regenerate-trips` ou re-vincular motorista no dashboard do período). Sem isso, datas antigas no banco podem persistir mesmo com o front corrigido.

Documentação: [SINCRONIA-CURSO-PERIODO-TURMA.md](./SINCRONIA-CURSO-PERIODO-TURMA.md) — secção «Motorista: próxima viagem, desbloqueio e mapa admin».

## Dev local vs VPS (sem conflito)

| Variável | Local (sua máquina) | VPS |
|----------|---------------------|-----|
| `MINIO_PUBLIC_BROWSER_URL` | vazio / comentado | `https://sistemaupgrade.com.br/storage` |
| `AUTH_BYPASS_MFA` | `true` só em dev + localhost em `FRONTEND_URLS` | `false` |
| `NEXT_PUBLIC_DEV_AUTH_BYPASS` | `true` no seu `.env.local` | `false` no build de produção |
