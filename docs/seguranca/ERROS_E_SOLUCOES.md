# 🚨 ERROS E SOLUÇÕES — Catálogo de Bugs
## "As Vacinas Técnicas" | Método RR Technology | v3.1 | 19/03/2026

> **Regra:** ANTES de debugar qualquer erro, consulte este arquivo.
> Se não estiver aqui, resolva, documente e avise o Tech Lead.
> Formato: Data | Módulo | Erro | Contexto | Causa Raiz | Solução | Prevenção

---

## MODELO PARA NOVOS ERROS

```
### BUG-XX — Título Curto [DATA] [STATUS]
**Módulo/Arquivo:** `caminho/do/arquivo.ts`
**Sintoma:** O que o usuário/dev vê
**Causa Raiz:** Por que acontece
**Solução:** O que corrige
**Prevenção:** Como evitar
```

---

## BUGS RESOLVIDOS — Ambiente e Infraestrutura

### BUG-PUPPETEER-01 — npm install falha no Windows por download do Chrome [19/03/2026] ✅
**Módulo:** `backend/package.json` — dependência `puppeteer ^24.x`
**Sintoma:** `npm install` falha com erro de extração/download do Chrome Headless (~200MB) durante o pós-install do Puppeteer. Ocorre em qualquer novo clone do repositório no Windows.
**Causa Raiz:** Puppeteer v24+ mudou o comportamento — não faz mais o download automático do Chrome silenciosamente. O script de pós-instalação tenta baixar o Chrome e falha na extração no Windows.
**Solução:**
```powershell
cd backend

# Pula o download do Chrome durante o install
$env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "true"
$env:PUPPETEER_SKIP_DOWNLOAD = "true"
npm install --legacy-peer-deps

# Se não tem Chrome instalado no Windows:
npx puppeteer browsers install chrome

# Se já tem Chrome, o .puppeteerrc.cjs detecta automaticamente.
# Se não detectar, adicionar ao .env:
# PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```
**Prevenção:** Arquivo `backend/.puppeteerrc.cjs` já está no repositório com `skipDownload: true` e detecção automática do Chrome. Nunca remover este arquivo.

---

### BUG-ENV-01 — Duplo `/api` na URL → 404 Not Found [12/03/2026] ✅
**Módulo:** `frontend/.env` + `lib/api/client.ts`
**Sintoma:** `GET /api/api/auth/login 404 Not Found`
**Causa:** `NEXT_PUBLIC_API_URL=http://localhost:3001/api` + Axios também concatenava `/api`
**Solução:** `NEXT_PUBLIC_API_URL` sempre inclui o prefixo `/api`. Nunca hard-code `/api` na baseURL do Axios.
**Prevenção:** Verificar `.env` e `client.ts` antes de qualquer mudança de URL base.

---

### BUG-DOCKER-01 — Pull de imagem Docker bloqueado [12/03/2026] ✅
**Módulo:** `docker-compose.yml`
**Sintoma:** `Error: unable to get image 'postgres:15-alpine'`
**Causa:** Proxy/firewall corporativo bloqueando Docker Hub
**Solução:** `docker pull postgres:15-alpine` manual. Desativar proxy temporariamente.
**Prevenção:** Em ambiente corporativo, configurar mirror registry no Docker Desktop.

---

### BUG-PORT-01 — EADDRINUSE na porta [12/03/2026] ✅
**Módulo:** Backend — porta
**Sintoma:** `Error: listen EADDRINUSE: address already in use :::3001`
**Causa:** Processo Node.js zumbi ocupando a porta após reinicialização
**Solução:**
```powershell
netstat -ano | findstr :3001
taskkill /F /PID <PID>
# OU matar tudo:
Get-Process -Name node | Stop-Process -Force
```
**Prevenção:** Sempre `Ctrl+C` nos terminais antes de reiniciar. Nunca usar `$env:PORT=X` inline.

---

### BUG-SCRIPT-01 — `npm run dev` não existe no backend [12/03/2026] ✅
**Módulo:** `backend/package.json`
**Sintoma:** `npm error Missing script: dev`
**Causa:** NestJS usa `start:dev`, não `dev`
**Solução:** `npm run start:dev` (porta 3001 definida em `backend/.env PORT=3001`)
**Prevenção:** Scripts backend: `start` (sem watch), `start:dev` (hot-reload), `start:prod` (produção).

---

### BUG-DB-01 — Encoding de cidades com acentos corrompidos [13/03/2026] ✅
**Módulo:** PostgreSQL / `docker-compose.yml`
**Sintoma:** `SÃ£o LuÃ­s` em vez de `São Luís` nos dropdowns
**Causa:** Container criado sem collation `pt_BR.UTF-8`
**Solução:**
```powershell
docker-compose down -v  # REMOVE dados!
# docker-compose.yml → postgres → environment:
# POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"
docker-compose up -d
cd backend && npx prisma migrate deploy && npm run prisma:seed
```
**Prevenção:** `POSTGRES_INITDB_ARGS` configurado desde a criação do container.

---

### BUG-TS-01 — Cannot find module (cache TypeScript LS) [13/03/2026] ✅
**Módulo:** VS Code + TypeScript Language Server
**Sintoma:** `Cannot find module './holiday.service'` (arquivo existe e compila)
**Causa:** Cache antigo do TS Language Server
**Solução:**
```powershell
cd backend && npx prisma generate
# VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"
```
**Prevenção:** SEMPRE `npx prisma generate` após alterar schema ou clonar o repo.

---

## BUGS RESOLVIDOS — Aplicação

### BUG-WS-01 — NestJS DI error: módulo sem NotificationsModule [16/03/2026] ✅
**Módulo:** `enrollments.module.ts` / `classes.module.ts`
**Sintoma:** `Nest can't resolve dependencies of the EnrollmentsService (?)`
**Causa:** Service injetava `NotificationsGateway` mas o Module não declarava `NotificationsModule` em `imports[]`
**Solução:** Adicionar `NotificationsModule` ao `imports[]` do módulo afetado.
**Prevenção:** Todo módulo externo injetado deve ser declarado em `imports[]`. Ver Regra 2 em LIVRO_DE_REGRAS.

---

### BUG-AUTH-01 — `login()` retorna undefined [16/03/2026] ✅
**Módulo:** `backend/src/auth/auth.service.ts`
**Sintoma:** Login retorna `{}` vazio. Sem erro no console. TypeScript compila normalmente.
**Causa:** `login()` montava `response` mas não tinha `return response` no path sem 2FA
**Solução:** Adicionado `return response;` explícito.
**Prevenção:** SEMPRE `return` explícito em métodos que montam objetos de resposta.

---

### BUG-REIMB-01 — Reembolso retorna 400 (category vs type) [16/03/2026] ✅
**Módulo:** `frontend/app/teacher/reembolsos/page.tsx`
**Sintoma:** `POST /api/reimbursements` retorna 400.
**Causa:** Frontend enviava `category: 'ALIMENTACAO'` mas backend esperava `type: 'FOOD'`
**Solução:** Reescrever array de tipos com enum do backend. Campo `category` → `type`.
**Prevenção:** Sempre consultar DTO do backend antes de criar formulários.

---

### BUG-REDIRECT-01 — Professor redireciona para 404 [16/03/2026] ✅
**Módulo:** `frontend/app/login/page.tsx`
**Sintoma:** Professor faz login → tela branca 404
**Causa:** Redirect apontava para `/professor/dashboard` (portal criado em `/teacher/`)
**Solução:** `router.push('/professor/dashboard')` → `router.push('/teacher/dashboard')`
**Prevenção:** Ao criar novo portal, verificar todos os redirects por role.

---

### BUG-SUB-01 — `req.user.sub` em controllers [16/03/2026] ✅
**Módulo:** `enrollments.controller.ts` + `certificate.controller.ts`
**Sintoma:** Aluno não vê inscrições; `issuedBy` em certificados fica null
**Causa:** JwtStrategy.validate() retorna `id`, não `sub`.
**Solução:** 3 ocorrências de `req.user.sub` → `req.user.id`
**Prevenção:** SEMPRE `req.user.id` em todos os controllers. Ver Regra 5 em LIVRO_DE_REGRAS.

---

### BUG-MINIO-01 — Nova conexão MinIO por request [16/03/2026] ✅
**Módulo:** `reimbursement.service.ts`
**Sintoma:** ECONNREFUSED no MinIO com múltiplos uploads simultâneos
**Causa:** `new Client()` a cada chamada = nova conexão TCP por request
**Solução:** `MinioService` singleton via `@Injectable()` + `OnModuleInit`
**Prevenção:** Nunca instanciar clients de conexão dentro de métodos. Usar DI do NestJS.

---

### BUG-CONCURRENT-01 — Race condition no enrollment [16/03/2026] ✅
**Módulo:** `enrollments.service.ts`
**Sintoma:** Turma excede capacidade com requests simultâneos
**Causa:** Check de vagas + create eram operações separadas (TOCTOU)
**Solução:** `this.prisma.$transaction(async (tx) => { /* check + create */ })`
**Prevenção:** Operações de check-then-create SEMPRE dentro de `$transaction`.

---

## VULNERABILIDADES DE SEGURANÇA CORRIGIDAS

### SEC-01 — Privilege Escalation via POST /auth/register [16/03/2026] ✅
**Módulo:** `auth.service.ts`
**Sintoma:** `POST /api/auth/register` com `{ "role": "ADMIN" }` criava conta admin
**Causa:** Campo `role` aceito no body e passado diretamente ao Prisma
**Solução:** `role: 'STUDENT'` hardcoded no create. Campo `role` removido da assinatura pública.
**Prevenção:** Registro público NUNCA aceita role do body.

---

### SEC-02 — Maintenance Bypass (undefined === undefined) [16/03/2026] ✅
**Módulo:** `backend/src/main.ts`
**Sintoma:** Sem `MAINTENANCE_KEY` no .env, bypass sempre ativo
**Causa:** `undefined === undefined = true`
**Solução:**
```typescript
const bypassValid = !!maintenanceKey && maintenanceKey.length > 0 && header === maintenanceKey;
```
**Prevenção:** MAINTENANCE_KEY sempre definida no .env.

---

## ALERTAS ATIVOS

| # | Data | Módulo | Descrição | Status |
|---|------|--------|-----------|--------|
| ALERTA-01 | 16/03/2026 | login/page.tsx | Credenciais admin visíveis em tela | ⚠️ Remover antes do deploy |
| ALERTA-02 | 16/03/2026 | certificate.controller.ts | SUPER_ADMIN no RolesGuard (não existe no enum) | ⚠️ Inofensivo — limpar em refatoração |
| GAP-01 | 18/03/2026 | student/dashboard | Frequência hardcoded 87% (mock) | 🔴 EXEC-04 |
| GAP-02 | 18/03/2026 | reimbursement.controller | GET /reimbursements/my retorna 404 para DRIVER | 🔴 Pendência P-01 |

---

*Sistema Upgrade | RR Tecnol | v3.1 | 19/03/2026*
