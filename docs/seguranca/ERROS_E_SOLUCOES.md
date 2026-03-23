# 🚨 ERROS E SOLUÇÕES — Catálogo de Bugs
## "As Vacinas Técnicas" | v5.1 | 23/03/2026 — Limpo após Sprint Final

> **Regra:** ANTES de debugar qualquer erro, consulte este arquivo.
> Se não estiver aqui, resolva, documente e avise o Tech Lead.
> Formato: Bug # | Arquivo | Sintoma | Causa Raiz | Solução | Prevenção

---

## ✅ BUGS RESOLVIDOS NO SPRINT FINAL (23/03/2026)

### BUG-01 — `enrollments.map is not a function` em Turmas ✅
**Arquivo:** `frontend/app/admin/turmas/[id]/page.tsx` linha 96
**Causa raiz:** `getStatistics` retorna `{ enrollments: { total, approved, pending } }` — objeto, não array.
`stats?.enrollments || []` retornava o objeto; `.map()` explodia.
**Solução:** `Array.isArray(turma?.enrollments) ? turma.enrollments : []`
Métricas: `stats.attendance.present`, `stats.attendance.total`, `stats.attendance.rate`.
**Prevenção:** Dados reais de `findOne`, métricas de `getStatistics` — nunca misturar.

---

### BUG-02 — Frequência não persiste por dia ✅
**Arquivo:** `backend/src/classes/classes.service.ts` — `bulkAttendance()`
**Causa raiz:** `new Date(date)` sem normalização UTC. Timestamps levemente diferentes
para a mesma data quebravam o `@@unique([classId, studentId, date])`.
**Solução:** `const [y,m,d] = date.split('-').map(Number); new Date(Date.UTC(y, m-1, d))`
Adicionado `registeredBy` e `registeredAt: new Date()` no `update` do upsert.
**Prevenção:** Datas de frequência SEMPRE normalizadas para meia-noite UTC.

---

### BUG-04 — Reembolso histórico vazio (professor) ✅
**Arquivo:** `frontend/app/teacher/reembolsos/page.tsx`
**Causa raiz:** `reimbursement.service` retorna `{ data: [...], meta: {} }` paginado.
`Array.isArray(res.data)` é `false` para objeto → retornava `[]`.
O `driver/reembolsos` já usava o padrão correto.
**Solução:** `Array.isArray(res.data) ? res.data : (res.data?.data ?? [])`
**Prevenção:** Endpoints de reembolso retornam `{ data, meta }` — NUNCA assumir array direto.

---

### BUG-06 — `npm run prisma:seed` apontava para arquivo inexistente ✅
**Arquivo:** `backend/package.json`
**Causa raiz:** Script `"prisma:seed": "ts-node prisma/seed.ts"` mas arquivo real é `seed-full.ts`.
Scripts `seed:test` e `seed:demo` também apontavam para arquivos que não existem.
**Solução:** `"prisma:seed": "npx tsx prisma/seed-full.ts"`. Scripts órfãos removidos.
**Prevenção:** Sempre verificar que o arquivo referenciado no script existe no repo.

---

### BUG-07 — TEACHER podia aprovar/rejeitar reembolsos (seg. crítica) ✅
**Arquivo:** `backend/src/reimbursement/reimbursement.controller.ts`
**Causa raiz:** `@Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')` sem `@UseGuards(RolesGuard)`.
O decorator só define metadata — sem o Guard ninguém lê. Zero proteção real.
**Solução:** `@UseGuards(JwtAuthGuard, RolesGuard)` adicionado nos métodos `approve` e `reject`.
**Prevenção:** `@Roles()` sem `@UseGuards(RolesGuard)` = sem efeito. Sempre usar os dois juntos.

---

### BUG-08 — Hard delete em 3 services ✅
**Arquivos:** `employees.service.ts`, `trucks.service.ts`, `classes.service.ts`
**Causa raiz:** `.delete()` direto — hard delete violando LIVRO_DE_REGRAS §3.
**Solução:** employees → `active: false` | trucks → `status: 'INACTIVE'` | classes → `status: 'CANCELLED'`
**Prevenção:** Nunca `.delete()` em entidades de negócio. Soft delete sempre.

---

### BUG-09 — `(this.prisma as any).absence` — Prisma client desatualizado ✅
**Arquivo:** `backend/src/absences/absences.service.ts`
**Causa raiz:** Model `Absence` adicionado ao schema sem rodar `npx prisma generate`.
Cast `as any` suprimia o erro TypeScript mas não garantia compatibilidade em runtime.
**Solução:** `prisma generate` rodado. `AbsenceType` e `AbsenceStatus` importados de `@prisma/client`.
**Prevenção:** SEMPRE `npx prisma generate` após qualquer alteração no schema.

---

### BUG-11 — Admin frequência: localStorage como fallback silencioso ✅
**Arquivo:** `frontend/app/admin/frequencia/page.tsx`
**Causa raiz:** `catch` salvava em `localStorage` e exibia "sucesso" — dado nunca ia ao banco.
**Solução:** Removido o fallback. `catch` agora exibe `toast.error()` com mensagem real.
**Prevenção:** Nunca fingir sucesso quando operação crítica falha.

---

### BUG-12 — Endpoint `GET /classes/:id/attendance/history` não existia ✅
**Arquivos:** `classes.controller.ts` + `classes.service.ts`
**Causa raiz:** Frontend chamava endpoint que não existia. Falha silenciosa — calendário sempre vazio.
**Solução:** Endpoint criado no controller + método `getAttendanceHistory` no service.
**Prevenção:** Verificar Swagger `/api/docs` antes de chamar qualquer endpoint no frontend.

---

### BUG-13 — `bulkAttendance` usava `req.user?.sub` como fallback ✅
**Arquivo:** `backend/src/classes/classes.controller.ts`
**Causa raiz:** `const registeredBy = req.user?.id || req.user?.sub` — `sub` nunca existe após JwtStrategy.
**Solução:** `const registeredBy = req.user.id`
**Prevenção:** `req.user.id` SEMPRE. Nunca `req.user.sub`.

---

### BUG-14 — Teacher reembolsos: reset para enum inválido após submit ✅
**Arquivo:** `frontend/app/teacher/reembolsos/page.tsx`
**Causa raiz:** `setTipo('ALIMENTACAO')` — `ALIMENTACAO` não existe no enum `ReimbursementType`.
**Solução:** `setTipo('FOOD')` — valor correto do enum do backend.
**Prevenção:** Labels de UI são tradução; values de enum são os do backend. Nunca misturar.

---

### BUG-console-01 — `console.error` em admin/frequencia ✅
**Arquivo:** `frontend/app/admin/frequencia/page.tsx`
**Causa raiz:** `loadActiveClasses` e `loadStudents` usavam `console.error(e)` violando LIVRO_DE_REGRAS §1.
**Solução:** Substituído por blocos `catch` silenciosos com comentário explicativo.
**Prevenção:** `console.log/error` proibido no frontend. Usar `toast.error()` para erros ao usuário.

---

## 🔴 BUGS ATIVOS — Pendentes de execução

### BUG-03 — Configurações não salva dados (todos os portais) ✅ RESOLVIDO
**Solução aplicada:** Model `UserPreferences` criado no schema + `db push` + `prisma generate`. Endpoints `GET/PATCH /users/me/preferences` criados em `users.service.ts` e `users.controller.ts`. Os 4 portais (admin, teacher, driver, student) agora carregam preferências no `useEffect` e salvam via `Promise.all` com nome + preferências juntos.
**Arquivos:** `schema.prisma`, `users.service.ts`, `users.controller.ts`, `*/configuracoes/page.tsx` (4 portais).

---

### BUG-05 — Cadastro de carretas: Internal Server Error ✅ RESOLVIDO
**Causa raiz:** `trucks.service.ts` passava `lastMaintenanceDate`/`nextMaintenanceDate` como string ISO diretamente ao Prisma. O schema tem `DateTime?` — Prisma exige objeto `Date`, não string.
**Solução:** Destruturação + conversão `new Date(str)` antes do `prisma.truck.create/update`. `console.error` removido do formulário frontend.
**Arquivos:** `backend/src/trucks/trucks.service.ts` (create + update), `frontend/app/admin/carretas/nova/page.tsx`.

---

### BUG-10 — NestJS versão mista: core v10 + socket/swagger v11 🟡
**Arquivo:** `backend/package.json`
**Causa raiz:** `@nestjs/common@^10` + `@nestjs/platform-socket.io@^11` + `@nestjs/swagger@^11`.
Sistema funciona mas pode causar incompatibilidades em runtime.
**Solução:** Alinhar todos para mesma versão major. **Decisão do Tech Lead.**
Ver PROX-PASSOS.md **PASSO 0.2** (pulado no sprint por segurança).

---

### BUG-15 — Notificações: hook sem eventos + sem persistência ✅ RESOLVIDO
**Solução aplicada:**
- `useNotifications.ts` — fetch `GET /notifications` ao montar (histórico persistido), 4 eventos faltantes adicionados (`inscricao_rejeitada`, `imprevisto_cadastrado`, `reembolso_solicitado`, `reembolso_revisado`), mapa `buildMessage()` para mensagens PT-BR.
- `reimbursement.service.ts` — emite `reembolso_solicitado` no `create`, `reembolso_revisado` no `approve` e `reject` (WS em try/catch separado).
- `absences.service.ts` — emite `imprevisto_cadastrado` no `create` (WS em try/catch separado).
- `enrollments.service.ts` — emite `inscricao_rejeitada` no `reject`.

---

### BUG-16 — Logout Zustand não limpa localStorage ✅ RESOLVIDO
**Solução aplicada:** `logout()` agora remove `token`, `user`, `student`, `auth-storage` do localStorage antes de limpar o Zustand store. `console.error('Login error:', error)` também removido do mesmo arquivo.
**Arquivo:** `frontend/stores/useAuthStore.ts`.

### BUG-NOVO-01 — `SUPER_ADMIN` em 4 controllers — role inexistente 🔴
**Arquivos:** `certificates/certificate.controller.ts` (3x), `employees/employees.controller.ts` (1x), `employees/payroll.controller.ts` (1x), `settings/settings.controller.ts` (3x)
**Causa raiz:** `SUPER_ADMIN` não existe no enum `UserRole`. `RolesGuard` nunca encontra match → rota se comporta como se ninguém tivesse acesso (lança 403 para todos) ou, dependendo da implementação do guard, trata como sem restrição.
**Solução:** Substituir por roles válidas: `ADMIN | COORDINATOR | FINANCIAL | TEACHER | STUDENT | DRIVER`.
**Ver BLOCO B.**

### BUG-NOVO-02 — `console.warn` em `acoes.service.ts` 🟡
**Arquivo:** `backend/src/acoes/acoes.service.ts` linha 409
**Causa raiz:** `console.warn(...)` viola LIVRO_DE_REGRAS §2 (usar `Logger` no backend).
**Ver BLOCO C.**

### BUG-NOVO-03 — `console.error` em `audit-log.service.ts` 🟡
**Arquivo:** `backend/src/audit-log/audit-log.service.ts` linha 41
**Causa raiz:** `console.error(...)` viola LIVRO_DE_REGRAS §2.
**Ver BLOCO C.**

### BUG-NOVO-04 — `req.user?.sub` em `settings.controller.ts` 🟡
**Arquivo:** `backend/src/settings/settings.controller.ts` linha 40
**Causa raiz:** `req.user?.sub ?? 'admin'` — `sub` não existe após JwtStrategy. Retorna `'admin'` string literal como fallback.
**Solução:** `req.user.id`. **Ver BLOCO B.**

| Bug | Data | Solução |
|-----|------|---------|
| BUG-PUPPETEER-01 | 19/03/2026 | `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` + `npx puppeteer browsers install chrome` |
| BUG-ENV-01 | 12/03/2026 | `NEXT_PUBLIC_API_URL` já inclui `/api` — Axios não concatena novamente |
| BUG-DOCKER-01 | 12/03/2026 | `docker pull` manual. Desativar proxy temporariamente |
| BUG-PORT-01 | 12/03/2026 | `Remove-Item Env:PORT` antes de `npm run start:dev` |
| BUG-DB-01 | 13/03/2026 | `POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"` no docker-compose |
| BUG-TS-01 | 13/03/2026 | `npx prisma generate` + "TypeScript: Restart TS Server" no VS Code |
| BUG-WS-01 | 16/03/2026 | NotificationsModule é `@Global` — não precisa declarar em `imports[]` |
| BUG-AUTH-01 | 16/03/2026 | `return response` explícito no path sem 2FA no `auth.service.ts` |
| BUG-REIMB-01 | 16/03/2026 | `type: 'FOOD'` em vez de `category: 'ALIMENTACAO'` no DTO |
| BUG-SUB-01 | 16/03/2026 | `req.user.id` em vez de `req.user.sub` em todos os controllers |
| BUG-MINIO-01 | 16/03/2026 | `MinioService` singleton com `@Injectable()` + `OnModuleInit` |
| BUG-CONCURRENT-01 | 16/03/2026 | Check de vagas + create dentro de `$transaction` |
| EXEC-08 | 18/03/2026 | `@Get('my')` movido para antes de `@Get(':id')` no enrollments controller |
| SEC-01 | 16/03/2026 | `role: 'STUDENT'` hardcoded no `auth.service.ts` — registro público nunca aceita role do body |
| SEC-02 | 16/03/2026 | `!!maintenanceKey && maintenanceKey.length > 0` — bypass não ativa sem chave |

---

## ⚠️ ALERTAS ATIVOS

| # | Módulo | Descrição | Ação |
|---|--------|-----------|------|
| ALERTA-01 | `login/page.tsx` | Credenciais admin visíveis em tela | ⚠️ Remover antes do deploy |
| ALERTA-02 | 4 controllers | `SUPER_ADMIN` em `@Roles()` em 4 lugares — role inexistente, guard sempre falha | 🔴 BLOCO B |
| ALERTA-03 | `admin/frequencia` | Triple-click — ✅ RESOLVIDO PASSO 3.11 | ✅ |
| ALERTA-04 | `student/layout.tsx` | Hamburger no desktop — ✅ RESOLVIDO PASSO 2.5 | ✅ |
| ALERTA-05 | Vários modais | Confirmar se `modal-overlay` do globals.css usa `position:fixed` | Verificar antes de corrigir |
| ALERTA-06 | `ContaPagar` | ✅ RESOLVIDO PASSO 3.9 — campo `active` adicionado + soft delete + aba Excluídos | ✅ |
| ALERTA-07 | `docker-compose.yml` | Redis sem senha → inseguro em produção | PASSO 3.15 |

---

*Sistema Upgrade | RR Tecnol | v5.1 | 23/03/2026 — Limpo e sem duplicatas*
