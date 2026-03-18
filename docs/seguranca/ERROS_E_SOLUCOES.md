# 🚨 ERROS E SOLUÇÕES — Catálogo de Bugs
## "As Vacinas Técnicas" | Método RR Technology | v3.0 | 18/03/2026

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

## BUGS RESOLVIDOS — Fase 1 (Sprints 0 → Final)

### BUG-ENV-01 — Duplo `/api` na URL → 404 Not Found [12/03/2026] ✅
**Módulo:** `frontend/.env` + `lib/api/client.ts`
**Sintoma:** `GET /api/api/auth/login 404 Not Found`
**Causa:** `NEXT_PUBLIC_API_URL=http://localhost:3001/api` + Axios também concatenava `/api`
**Solução:** `NEXT_PUBLIC_API_URL=http://localhost:3001/api` sem concatenar `/api` novamente no código Axios
**Prevenção:** `NEXT_PUBLIC_API_URL` sempre inclui o prefixo `/api`. Nunca hard-code `/api` na baseURL do Axios.

---

### BUG-DOCKER-01 — Pull de imagem Docker bloqueado [12/03/2026] ✅
**Módulo:** `docker-compose.yml`
**Sintoma:** `Error: unable to get image 'postgres:15-alpine'`
**Causa:** Proxy/firewall corporativo bloqueando Docker Hub
**Solução:** `docker pull postgres:15-alpine` manual. Desativar proxy temporariamente.
**Prevenção:** Em ambiente corporativo, configurar mirror registry no Docker Desktop.

---

### BUG-PORT-01 — EADDRINUSE na porta 3002 [12/03/2026] ✅
**Módulo:** Backend — porta
**Sintoma:** `Error: listen EADDRINUSE: address already in use :::3002`
**Causa:** Processo Node.js zumbi ocupando a porta após reinicialização
**Solução:**
```powershell
netstat -ano | findstr :3002  # pegar PID
taskkill /F /PID <PID>
# OU matar tudo:
Get-Process -Name node | Stop-Process -Force
```
**Prevenção:** Sempre `Ctrl+C` nos terminais antes de reiniciar. Backend ANTES do frontend.

---

### BUG-SCRIPT-01 — `npm run dev` não existe no backend [12/03/2026] ✅
**Módulo:** `backend/package.json`
**Sintoma:** `npm error Missing script: dev`
**Causa:** NestJS usa `start:dev`, não `dev`
**Solução:** `npm run start:dev` (porta 3001 definida em `backend/.env PORT=3001`)
**Prevenção:** Scripts backend: `start` (sem watch), `start:dev` (hot-reload), `start:prod` (produção).

---

### BUG-NEXT-01 — `npm start` no frontend sem build [12/03/2026] ✅
**Módulo:** `frontend/package.json`
**Sintoma:** Exit code 1 ao rodar `npm start` no frontend
**Causa:** `npm start` = `next start` (produção) requer build prévio
**Solução:** `npm run dev` para desenvolvimento. `npm run build && npm start` para produção.

---

### BUG-DB-01 — Encoding de cidades com acentos corrompidos [13/03/2026] ✅
**Módulo:** PostgreSQL / `docker-compose.yml`
**Sintoma:** `SÃ£o LuÃ­s` em vez de `São Luís` nos dropdowns
**Causa:** Container criado com collation diferente de `pt_BR.UTF-8`
**Solução:**
```powershell
docker-compose down -v  # REMOVE dados!
# Adicionar em docker-compose.yml → postgres → environment:
# POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"
docker-compose up -d
cd backend && npx prisma migrate deploy && npm run prisma:seed
```
**Prevenção:** `POSTGRES_INITDB_ARGS` configurado desde a criação do container.

---

### BUG-DB-02 — `ERROR: type "serial" does not exist` [12/03/2026] ✅
**Módulo:** `schema.prisma`
**Sintoma:** Erro ao rodar migrations
**Causa:** IDs com SERIAL misturado com UUID ou alter table incompatível
**Solução:** Usar APENAS Prisma Migrate. IDs UUID (`@default(uuid())`).
**Prevenção:** Nunca misturar Sequelize ou sync automático com Prisma Migrate.

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

### BUG-CERT-01 — Alert genérico ao emitir certificado [13/03/2026] ✅
**Módulo:** `frontend/app/admin/certificados/page.tsx`
**Sintoma:** `alert("Erro ao emitir certificado")` sem detalhes
**Causa:** Função `issueCertificate` capturava erro mas não exibia a mensagem da API
**Solução:** Banner inline `issueError` com `err?.response?.data?.message`
**Prevenção:** Sempre capturar e exibir `err?.response?.data?.message` nos handlers de erro.

---

### BUG-SEED-01 — Seed de teste sem turma [13/03/2026] ✅
**Módulo:** `backend/prisma/seed-test.ts`
**Sintoma:** `⚠️ Nenhuma turma encontrada para criar matrícula`
**Causa:** `seed:test` tenta criar matrícula mas não há turmas no banco
**Solução:** Ordem correta: `prisma:seed` → criar turma → `seed:test`

---

### BUG-HEADER-01 — Nome do admin não atualiza no header [13/03/2026] ✅
**Módulo:** `frontend/components/admin/Header.tsx`
**Sintoma:** Nome antigo permanece no header após salvar em Configurações
**Causa:** `Header.tsx` lê `localStorage.user` só no mount, sem re-render
**Solução:** `configuracoes/page.tsx` dispara `window.dispatchEvent(new Event('userUpdated'))`. `Header.tsx` escuta via `window.addEventListener('userUpdated', ...)`
**Prevenção:** Comunicação entre componentes sem estado compartilhado → Custom Events ou Zustand.

---

### BUG-WS-01 — NestJS DI error: EnrollmentsModule sem NotificationsModule [16/03/2026] ✅
**Módulo:** `enrollments.module.ts`
**Sintoma:** `Nest can't resolve dependencies of the EnrollmentsService (?). Please make sure that the argument NotificationsGateway at index [1] is available in the EnrollmentsModule context.`
**Causa:** `EnrollmentsService` injetava `NotificationsGateway` mas `EnrollmentsModule` não declarava `NotificationsModule` em `imports[]`
**Solução:** Adicionado `NotificationsModule` ao `imports[]` de `enrollments.module.ts`
**Prevenção:** Ver Regra 2 em `arquitetura/LIVRO_DE_REGRAS.md` — todo módulo externo injetado deve ser declarado.

---

### BUG-WS-02 — NestJS DI error: ClassesModule sem NotificationsModule [16/03/2026] ✅
**Módulo:** `classes.module.ts`
**Sintoma:** Mesmo erro que BUG-WS-01 para ClassesService
**Causa/Solução:** Idêntico ao BUG-WS-01

---

### BUG-AUTH-01 — `login()` retorna undefined [16/03/2026] ✅
**Módulo:** `backend/src/auth/auth.service.ts`
**Sintoma:** Login retorna {} vazio. Nenhum erro no console. TypeScript compila normalmente.
**Causa:** `login()` montava `response` mas não tinha `return response` no path sem 2FA
**Solução:** Adicionado `return response;` após o bloco `if (studentData)`
**Prevenção:** SEMPRE `return` explícito em métodos que montam objetos de resposta. TypeScript não detecta retorno implícito de undefined em `async Promise<any>`.

---

### BUG-REIMB-01 — Reembolso retorna 400 (category vs type) [16/03/2026] ✅
**Módulo:** `frontend/app/teacher/reembolsos/page.tsx`
**Sintoma:** `POST /api/reimbursements` retorna 400. Nenhum erro visível.
**Causa:** Frontend enviava `category: 'ALIMENTACAO'` mas backend esperava `type: 'FOOD'`
**Solução:** Array de tipos reescrito com enum do backend. Campo `category` → `type`.
**Prevenção:** Sempre consultar DTO do backend antes de criar formulários. Ver Regra 7 em LIVRO_DE_REGRAS.

---

### BUG-REDIRECT-01 — Professor redireciona para 404 [16/03/2026] ✅
**Módulo:** `frontend/app/login/page.tsx`
**Sintoma:** Professor faz login → tela branca 404
**Causa:** Redirect aponta para `/professor/dashboard` que nunca existiu (portal criado em `/teacher/`)
**Solução:** `router.push('/professor/dashboard')` → `router.push('/teacher/dashboard')`
**Prevenção:** Ao criar novo portal, verificar todos os redirects por role.

---

### BUG-SUB-01 — `req.user.sub` em 3 controllers [16/03/2026] ✅
**Módulo:** `enrollments.controller.ts` + `certificate.controller.ts`
**Sintoma:** Aluno não vê inscrições; `issuedBy` em certificados fica null
**Causa:** JwtStrategy.validate() retorna `id`, não `sub`. Os campos existem em lugares diferentes.
**Solução:** 3 ocorrências de `req.user.sub` → `req.user.id`
**Prevenção:** Nos controllers NestJS SEMPRE `req.user.id`. Ver Regra 5 em LIVRO_DE_REGRAS.

---

### BUG-SEC-01 — Privilege Escalation via POST /auth/register [16/03/2026] ✅
**Módulo:** `auth.service.ts` + `auth.controller.ts`
**Sintoma (vulnerabilidade):** `POST /api/auth/register` com `{ "role": "ADMIN" }` criava conta admin
**Causa:** Campo `role` aceito no body e passado diretamente ao Prisma
**Solução:** `role` removido da assinatura. `role: 'STUDENT'` hardcoded no create.
**Prevenção:** Registro público NUNCA aceita role do body. Ver seguranca/README.md SEC-01.

---

### BUG-SEC-02 — Maintenance Bypass (undefined === undefined) [16/03/2026] ✅
**Módulo:** `backend/src/main.ts`
**Sintoma (vulnerabilidade):** Sem `MAINTENANCE_KEY` no .env, bypass sempre ativo
**Causa:** `req.headers['x-admin-bypass'] === undefined === process.env.MAINTENANCE_KEY === undefined` = `true`
**Solução:**
```typescript
const bypassValid = !!maintenanceKey && maintenanceKey.length > 0 && header === maintenanceKey;
```
**Prevenção:** MAINTENANCE_KEY sempre definida no .env. Ver seguranca/README.md SEC-05.

---

### BUG-MINIO-01 — Nova conexão MinIO por request [16/03/2026] ✅
**Módulo:** `reimbursement.service.ts`
**Sintoma:** Com múltiplos uploads simultâneos: ECONNREFUSED no MinIO
**Causa:** `new Client()` a cada chamada = nova conexão TCP por request
**Solução:** `MinioService` injetável singleton via `@Injectable()` + `OnModuleInit`
**Prevenção:** Nunca instanciar clients de conexão dentro de métodos. Usar DI do NestJS.

---

### BUG-CONCURRENT-01 — Race condition no enrollment [16/03/2026] ✅
**Módulo:** `enrollments.service.ts`
**Sintoma:** Turma excede capacidade com requests simultâneos
**Causa:** Check de vagas + create eram operações separadas (TOCTOU)
**Solução:** `this.prisma.$transaction(async (tx) => { /* check + create */ })`
**Prevenção:** Operações de check-then-create SEMPRE dentro de `$transaction`.

---

## BUGS ATIVOS / ALERTAS

| # | Data | Módulo | Descrição | Status |
|---|------|--------|-----------|--------|
| ALERTA-01 | 16/03/2026 | login/page.tsx | Credenciais admin visíveis em tela | ⚠️ Monitorando — remover antes do deploy |
| ALERTA-02 | 16/03/2026 | certificate.controller.ts | SUPER_ADMIN no RolesGuard (não existe no enum) | ⚠️ Monitorando — inofensivo mas confuso |
| GAP-01 | 18/03/2026 | student/dashboard | Frequência hardcoded 87% (mock) | 🔴 Para F2-02 |
| GAP-02 | 18/03/2026 | admin/relatorios | Gráficos com dados estáticos | 🟠 Para F2-03 |

---

*Sistema Upgrade | RR TECNOL | 18/03/2026 | Consolidado de: 04_ERROS_E_SOLUCOES.md + SPRINT_BUG_SEC_A.md + RELATORIO_PRE_FASE2.md*
