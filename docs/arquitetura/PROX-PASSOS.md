# 🗺️ PRÓXIMOS PASSOS — Sistema Upgrade
## Plano de Execução Detalhado | v5.0 | 23/03/2026 (Atualizado — BLOCOs I→3.2 concluídos)

> **Status legenda:** ✅ Concluído | 🔴 Pendente crítico | 🟡 Pendente médio | 🟢 Pendente baixo

---

## ✅ GRUPO 0 — INFRAESTRUTURA (todos concluídos)

| Passo | Descrição | Status |
|-------|-----------|--------|
| 0.1 | `package.json` seed scripts corrigidos | ✅ 23/03 |
| 0.2 | `prisma generate` + casts `as any` removidos | ✅ 23/03 |
| 0.3 | `RolesGuard` no reimbursement controller | ✅ 23/03 |
| 0.4 | `req.user.id` direto em `bulkAttendance` | ✅ 23/03 |
| 0.5 | Soft delete nos 3 services | ✅ 23/03 |

---

## ✅ GRUPO 1 — BUGS CRÍTICOS (todos concluídos)

| Passo | Descrição | Status |
|-------|-----------|--------|
| 1.1 | `turma.enrollments` vs `stats.enrollments` | ✅ 23/03 |
| 1.2 | Normalização UTC datas de frequência | ✅ 23/03 |
| 1.3 | `UserPreferences` migration + endpoints + 4 portais | ✅ 23/03 |
| 1.4 | Reembolso teacher: `res.data?.data ?? []` | ✅ 23/03 |
| 1.5 | Carretas: datas ISO→Date no trucks.service | ✅ 23/03 |
| 1.7 | localStorage fallback removido da frequência ADM | ✅ 23/03 |
| 1.8 | Endpoint `GET /classes/:id/attendance/history` | ✅ 23/03 |
| 1.9 | Reset tipo reembolso teacher para `'FOOD'` | ✅ 23/03 |

---

## ✅ GRUPO 2 — UI/UX (maioria concluída)

| Passo | Descrição | Status |
|-------|-----------|--------|
| 2.3 | Campo valor reembolso: `type="number"` | ✅ 23/03 |
| 2.5 | Hamburger `hamburger-btn` oculto no desktop | ✅ 23/03 |
| 2.2 | Auditar modais `position: fixed` | ✅ 23/03 — todos corretos |
| 2.4 | QR Code overlay | 🟡 Pendente |
| 2.6 | Funcionários: modal scroll | 🟡 Pendente |
| 2.7 | Dashboard motorista (Tech Lead) | 🟡 Pendente |
| 2.8 | Imprevistos animações | 🟢 Pendente |

---

## ✅ GRUPO 3 — FEATURES NOVAS (maioria concluída)

| Passo | Descrição | Status |
|-------|-----------|--------|
| 3.1 | WS: 8 eventos + histórico persistido | ✅ 23/03 |
| 3.7 | Ponto professor: toast + endpoint real | ✅ 23/03 |
| 3.11 | Frequência: 2 botões P/F touch-friendly | ✅ 23/03 |
| 3.12 | Frequência: estado salvo ao reabrir dia | ✅ 23/03 |
| 3.14 | Logout limpa localStorage completo | ✅ 23/03 |
| 3.2 | Frequência de funcionários ADM (migration) | ✅ 23/03 |
| 3.3 | Calendário aluno interativo | ✅ 23/03 |
| 3.4 | Tutorial assistido | 🟢 Pendente |
| 3.5 | Histórico ADM paginado com filtros | 🟡 BLOCO F |
| 3.6 | CRUD completo de imprevistos | ✅ 23/03 |
| 3.8 | Feriado: pedir motivo ao excluir | 🟡 BLOCO G |
| 3.9 | ContaPagar: campo `active` + aba Excluídos | 🔴 BLOCO E |
| 3.10 | Aluno: cursos disponíveis + botão inscrição | 🟡 BLOCO H |
| 3.13 | Persistência formulário sessionStorage | 🟢 Pendente |
| 3.15 | Redis senha produção | 🟢 Pendente |

---

## 🆕 NOVOS PASSOS (descobertos em auditoria 23/03)

### BLOCO B — BUG-NOVO-01: SUPER_ADMIN em 4 controllers 🔴
**Arquivos:** `certificates/certificate.controller.ts`, `employees/employees.controller.ts`, `employees/payroll.controller.ts`, `settings/settings.controller.ts`
**Correções:**
- `certificate.controller.ts`: `@Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')` → `@Roles('ADMIN', 'COORDINATOR', 'TEACHER')`
- `employees.controller.ts`: `@Roles('ADMIN', 'SUPER_ADMIN')` → `@Roles('ADMIN', 'COORDINATOR')`
- `payroll.controller.ts`: `@Roles('ADMIN', 'SUPER_ADMIN')` → `@Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')`
- `settings.controller.ts`: `@Roles('ADMIN', 'SUPER_ADMIN')` → `@Roles('ADMIN', 'COORDINATOR')` (2x)
- `settings.controller.ts` linha 40: `req.user?.sub ?? 'admin'` → `req.user.id`

### BLOCO C — console no backend 🟡
- `acoes.service.ts:409`: `console.warn` → `this.logger.warn`
- `audit-log.service.ts:41`: `console.error` → `this.logger.error`

### BLOCO D — Dead code 🟢
- `admin/frequencia/page.tsx`: remover função `toggleAttendance` (nunca chamada desde PASSO 3.11)

---

## ⚠️ AVISOS IMUTÁVEIS

1. `npx tsc --noEmit` → zero erros antes de qualquer commit
2. Nunca `SUPER_ADMIN` — role não existe no enum `UserRole`
3. `req.user.id` SEMPRE — nunca `req.user.sub` ou `req.user?.sub ?? 'string'`
4. WS em try/catch separado, fora de `$transaction`
5. Soft delete sempre — nunca `.delete()` em entidades de negócio

## Baseado em: Varredura completa de cada arquivo do projeto — backend, frontend, schema, configs

> **Como usar este documento:**
> Cada PASSO é atômico e executável de forma independente.
> A ordem dentro de cada GRUPO é a recomendada mas não obrigatória.
> Para cada fix há referência ao código existente que funciona no projeto — use como modelo.
> Nenhum código deve ser escrito sem consultar este documento antes.
> **GRAVITY:** Antes de qualquer mudança, leia o LIVRO_DE_REGRAS.md inteiro.

---

## 🚨 GRUPO 0 — INFRAESTRUTURA/CONFIG (Corrigir antes de qualquer outra coisa)

### PASSO 0.1 — package.json: `npm run prisma:seed` aponta para arquivo que não existe
**Arquivo:** `backend/package.json`
**Diagnóstico:** O script `"prisma:seed": "ts-node prisma/seed.ts"` referencia `seed.ts`,
mas o único arquivo que existe na pasta `backend/prisma/` é `seed-full.ts`.
Além disso, os scripts `"seed:test": "ts-node prisma/seed-test.ts"` e
`"seed:demo": "ts-node prisma/seed-demo.ts"` apontam para arquivos que NÃO EXISTEM.
O campo `"prisma": { "seed": "npx tsx prisma/seed-full.ts" }` está correto.

**Correção necessária em `backend/package.json`:**
```json
"scripts": {
  "prisma:seed": "npx tsx prisma/seed-full.ts",
  "seed:extra": "npx tsx prisma/seed-full.ts"
}
```
Remover completamente: `"seed:test"` e `"seed:demo"` (arquivos não existem).
O único seed válido é `seed-full.ts`.

---

### PASSO 0.2 — NestJS: mismatch de versão entre pacotes core e socket/swagger
**Arquivo:** `backend/package.json`
**Diagnóstico:** O projeto mistura versões incompatíveis de pacotes NestJS:
- `@nestjs/common: "^10.3.0"` — versão 10 (core)
- `@nestjs/platform-socket.io: "^11.1.17"` — versão 11!
- `@nestjs/websockets: "^11.1.17"` — versão 11!
- `@nestjs/swagger: "^11.2.6"` — versão 11!

O sistema funciona hoje porque o npm resolve os tipos de forma permissiva, mas isso pode
causar incompatibilidades TypeScript e comportamento inesperado em runtime.

**Correção:** Alinhar todos os pacotes NestJS para a mesma versão major.
```json
"@nestjs/platform-socket.io": "^10.3.0",
"@nestjs/websockets": "^10.3.0",
"@nestjs/swagger": "^7.4.0"
```
OU manter v11 e atualizar o core:
```json
"@nestjs/common": "^11.0.0",
"@nestjs/core": "^11.0.0",
"@nestjs/jwt": "^11.0.0",
"@nestjs/passport": "^11.0.0"
```
Decidir com o Tech Lead qual versão adotar. **Não misturar.**

---

### PASSO 0.3 — SEGURANÇA CRÍTICA: reembolsos approve/reject sem RolesGuard
**Arquivo:** `backend/src/reimbursement/reimbursement.controller.ts`
**Diagnóstico:** O controller tem `@UseGuards(JwtAuthGuard)` a nível de classe mas NÃO tem
`RolesGuard`. O decorator `@Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')` nos métodos `approve`
e `reject` define metadata mas NUNCA É VERIFICADA porque o `RolesGuard` não está ativo.
Resultado: **qualquer usuário autenticado (TEACHER, DRIVER, STUDENT) pode aprovar e rejeitar
reembolsos**. Vulnerabilidade real.

**Correção — adicionar RolesGuard nos métodos sensíveis:**
```typescript
// Em reimbursement.controller.ts — nos métodos approve e reject
@Patch(':id/approve')
@UseGuards(JwtAuthGuard, RolesGuard)   // ← adicionar RolesGuard aqui
@Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
approve(@Param('id') id: string, @Request() req: any) { ... }

@Patch(':id/reject')
@UseGuards(JwtAuthGuard, RolesGuard)   // ← adicionar RolesGuard aqui
@Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
reject(...) { ... }
```
Ou alternativamente mover o RolesGuard para nível de classe e usar `@Roles()` para liberar
os métodos públicos de forma explícita.

---

### PASSO 0.4 — Hard Delete em 3 services (viola regra fundamental)
**Arquivos:** `employees.service.ts` (método `remove`), `trucks.service.ts` (método `delete`),
`classes.service.ts` (método `delete`)
**Diagnóstico:** Todos usam `this.prisma.ENTIDADE.delete({ where: { id } })` — hard delete.
Viola LIVRO_DE_REGRAS Regra 3: "Nunca hard delete".

**Correção padrão (usar em todos os três):**
```typescript
// ✅ Correto — soft delete
async remove(id: string) {
  await this.findOne(id);
  return this.prisma.employee.update({
    where: { id },
    data: { active: false },
  });
}

// Para classes: verificar dependências antes
async delete(id: string) {
  const count = await this.prisma.enrollment.count({ where: { classId: id } });
  if (count > 0) throw new ConflictException('Turma tem inscrições — não pode ser desativada');
  return this.prisma.class.update({ where: { id }, data: { status: 'CANCELLED' } });
}
```

---

### PASSO 0.5 — absences.service.ts usa TypeScript cast `(this.prisma as any)`
**Arquivo:** `backend/src/absences/absences.service.ts`
**Diagnóstico:** Todas as chamadas Prisma usam `(this.prisma as any).absence` — cast para `any`.
Isso indica que o Prisma Client não foi regenerado após adição do model `Absence`.
O cast suprime erros TypeScript mas não garante compatibilidade em runtime.

**Solução:**
```powershell
cd backend
npx prisma generate   # regenera o client com o model Absence
```
Depois remover os casts:
```typescript
// ❌ Errado
(this.prisma as any).absence.findMany(...)

// ✅ Correto (após prisma generate)
this.prisma.absence.findMany(...)
```

---

### PASSO 0.6 — `bulkAttendance` controller usa `req.user?.sub` como fallback
**Arquivo:** `backend/src/classes/classes.controller.ts` — método `bulkAttendance`
**Diagnóstico:** `const registeredBy = req.user?.id || req.user?.sub;`
A propriedade `req.user.sub` não existe após o JwtStrategy (que retorna `id`).
Este fallback silencioso pode resultar em `registeredBy = undefined`.

**Correção:**
```typescript
// ❌ Errado
const registeredBy = req.user?.id || req.user?.sub;

// ✅ Correto — JwtStrategy sempre retorna id
const registeredBy = req.user.id;
if (!registeredBy) throw new UnauthorizedException();
```

---

---

## 🔴 GRUPO 1 — BUGS CRÍTICOS (Causa raiz identificada por leitura de código)

### PASSO 1.1 — Turmas: `enrollments.map is not a function` — CAUSA RAIZ CONFIRMADA
**Arquivo:** `frontend/app/admin/turmas/[id]/page.tsx` linha 93
**Causa raiz:** `classesApi.getStatistics(id)` retorna:
```json
{ "enrollments": { "total": 5, "approved": 3, "pending": 2 }, "attendance": {...}, "certificates": 1 }
```
`stats?.enrollments` é `{ total: 5, approved: 3, pending: 2 }` — um OBJETO, não um array.
Como é truthy, `stats?.enrollments || []` retorna o objeto. `.map()` explode.
Os dados reais do enrollment array estão em `turma` (do `classesApi.getOne`), não em `stats`.

**Correção:**
```typescript
// ❌ Errado — confunde stats com dados de enrollment
const enrollments: any[] = stats?.enrollments || [];

// ✅ Correto — enrollments vêm de findOne, stats são apenas métricas
const enrollments: any[] = Array.isArray(turma?.enrollments) ? turma.enrollments : [];
// Estatísticas numéricas vêm do stats:
const totalPresent = stats?.attendance?.present ?? 0;
const totalAbsent = (stats?.attendance?.total ?? 0) - totalPresent;
const avgRate = stats?.attendance?.rate ?? 0;
const attendanceHistory: any[] = stats?.attendanceHistory || []; // este ainda pode vir de outro endpoint
```

---

### PASSO 1.2 — Frequência: estado não persiste — CAUSA RAIZ CONFIRMADA
**Arquivo:** `backend/src/classes/classes.service.ts` — `bulkAttendance()`
**Causa raiz:** `const dateObj = new Date(date)` — a data chega do frontend como string
`2026-03-23` que o JS converte para `2026-03-23T00:00:00.000Z` (UTC). O `@@unique([classId, studentId, date])`
usa comparação exata. Se o frontend enviar em dois momentos diferentes, a comparação falha.
Além disso, o frontend usa `selectedDate` (valor do input `type="date"`, format `YYYY-MM-DD`)
que funciona corretamente, mas o backend deve garantir normalização.

**Correção no backend:**
```typescript
// classes.service.ts — bulkAttendance
async bulkAttendance(classId: string, date: string, records: ..., registeredBy: string) {
  // Normalizar para meia-noite UTC — elimina diferenças de timezone
  const [y, m, d] = date.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d)); // ← sempre meia-noite UTC

  await Promise.all(records.map(r =>
    this.prisma.attendance.upsert({
      where: { classId_studentId_date: { classId, studentId: r.studentId, date: dateObj } },
      update: { present: r.present, registeredBy, registeredAt: new Date() },
      create: { classId, studentId: r.studentId, date: dateObj, present: r.present, registeredBy },
    })
  ));
  // ...resto do método
}
```

---

### PASSO 1.3 — Configurações: não salva dados — migration necessária
**Ver doc anterior para solução completa (UserPreferences model + endpoints).**

---

### PASSO 1.4 — Reembolso não aparece no histórico — CAUSA RAIZ CONFIRMADA
**Arquivo:** `frontend/app/teacher/reembolsos/page.tsx` linha 50-53
**Causa raiz:** O `reimbursement.service.ts` `findAll()` retorna:
```json
{ "data": [...items], "meta": { "total": N, "page": 1, "limit": 20, "totalPages": 1 } }
```
O frontend faz `Array.isArray(res.data) ? res.data : []`. `res.data` do Axios é o objeto paginado
`{ data: [], meta: {} }`. `Array.isArray({ data:[], meta:{} })` = `false`. Resultado: `[]`.

**Correção no teacher e driver:**
```typescript
// ❌ Errado — não considera estrutura paginada
const res = await api.get('/reimbursements');
setReembolsos(Array.isArray(res.data) ? res.data : []);

// ✅ Correto — extrai o array do wrapper paginado
const res = await api.get('/reimbursements');
setReembolsos(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
```
O `driver/reembolsos/page.tsx` JÁ TEM esse padrão correto. Aplicar apenas no teacher.

---

### PASSO 1.5 — Cadastro de carretas: Internal Server Error
**Ver doc anterior para diagnóstico — enum TruckType + validação de campos obrigatórios.**

---

### PASSO 1.6 — Inscrições: kanban com comportamento errático — DIAGNÓSTICO ATUALIZADO
**Arquivo:** `frontend/app/admin/inscricoes/page.tsx`
**Diagnóstico revisado:** O código já implementa atualização otimista com rollback (método `updateStatus`).
O bug pode estar no `fetchEnrollments` que usa `api.get('/enrollments?limit=100')` mas o backend
retorna os itens diretamente (sem wrapper paginado). Verificar se `res.data?.data || []` é o fallback
correto — o endpoint `GET /enrollments` retorna array direto (não paginado).
O bug de "duplicação" pode ser o `console.error(e)` que viola regras — não é o bug em si.
**Testar ao vivo para confirmar.**

---

### PASSO 1.7 — NOVO: Admin frequência salva no localStorage como fallback
**Arquivo:** `frontend/app/admin/frequencia/page.tsx` método `saveAttendance`
**Diagnóstico:** O `catch` do `saveAttendance` salva em `localStorage` e exibe mensagem de sucesso.
Isso é **perda de dados silenciosa** — o usuário acha que a frequência foi salva mas só está no browser.
Se o usuário limpar o cache ou trocar de dispositivo, os dados se perdem.

**Correção:** Remover o fallback localStorage e exibir erro real:
```typescript
// ❌ Errado — esconde falha do servidor
catch (e: any) {
  localStorage.setItem(key, JSON.stringify(...));
  setSaved(true);
  toast.success('Frequência salva localmente...');
}

// ✅ Correto — mostra erro claro ao usuário
catch (e: any) {
  toast.error(e?.response?.data?.message || 'Erro ao salvar frequência. Tente novamente.');
  setSaved(false);
}
```

---

### PASSO 1.8 — NOVO: Endpoint `GET /classes/:id/attendance/history` não existe
**Arquivo:** `frontend/app/admin/frequencia/page.tsx` linha ~115
**Diagnóstico:** A frequência tenta buscar `GET /classes/${classId}/attendance/history`
mas esse endpoint NÃO EXISTE em `classes.controller.ts`. A chamada falha silenciosamente
e o histórico do calendário fica sempre vazio.

**Backend a criar:**
```typescript
// classes.controller.ts — ANTES de /:id/statistics
@Get(':id/attendance/history')
@UseGuards(JwtAuthGuard)
async getAttendanceHistory(@Param('id') classId: string) {
  return this.classesService.getAttendanceHistory(classId);
}

// classes.service.ts
async getAttendanceHistory(classId: string) {
  return this.prisma.attendance.findMany({
    where: { classId },
    select: { date: true, present: true, studentId: true },
    orderBy: { date: 'asc' },
  });
}
```

---

### PASSO 1.9 — NOVO: teacher/reembolsos reseta tipo para valor inválido
**Arquivo:** `frontend/app/teacher/reembolsos/page.tsx` linha ~110
**Diagnóstico:** Após submit bem-sucedido, `setTipo('ALIMENTACAO')`. Mas `ALIMENTACAO` não é um
valor válido do enum `ReimbursementType`. Valores válidos: `FOOD | CLASSROOM_MATERIAL | EMERGENCY_REPAIR | CLEANING_MATERIAL | OTHER`.

**Correção:**
```typescript
// ❌ Errado — ALIMENTACAO não existe no enum
setTipo('ALIMENTACAO');

// ✅ Correto — resetar para valor padrão válido
setTipo('FOOD');
```

---

---

## 🟡 GRUPO 2 — BUGS DE UI/UX

### PASSO 2.1 — UTF-8: campos com caracteres corrompidos
**Ver doc anterior — template literals sempre, mapa de labels para enums.**

### PASSO 2.2 — Modais: `position: fixed; inset: 0` em todos os portais
**Ver doc anterior — padrão do driver/layout.tsx.**
**Nota adicional:** `admin/frequencia`, `admin/inscricoes` usam `className="modal-overlay"` e
`className="modal-content"` que SÃO classes de `globals.css` com `position: fixed`. Confirmar
que o CSS está correto antes de assumir que precisam de fix.

### PASSO 2.3 — Campo valor do reembolso aceita letras
**Ver doc anterior — driver já usa `type="text" inputMode="decimal"`. Teacher usa `type="number"`.
Padronizar: ambos com `type="number" step="0.01" min="0"`.**

### PASSO 2.4 — QR Code overlay sem cobertura total
### PASSO 2.5 — Hamburger visível no desktop
### PASSO 2.6 — Funcionários: modal não fixo / scroll problemático
### PASSO 2.7 — Dashboard motorista: decisão Tech Lead sobre padronização
### PASSO 2.8 — Imprevistos sem animações
**Ver doc anterior para cada um desses.**

---

## 🟢 GRUPO 3 — FUNCIONALIDADES NOVAS

### PASSO 3.1 — Notificações em tempo real entre perfis (PRIORIDADE ALTA)
**Ver doc anterior para o mapa de eventos.**

**NOVO — `useNotifications.ts` precisa de 2 adições:**

**A) Carregar notificações históricas do banco ao montar:**
```typescript
// useNotifications.ts — adicionar ao useEffect após conectar o socket
const fetchStoredNotifications = async () => {
  try {
    const res = await api.get('/notifications?limit=50');
    const stored = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    setNotifications(stored.map(n => ({
      id: n.id, type: n.type, message: n.message || n.title,
      timestamp: n.createdAt, read: !!n.readAt,
    })));
  } catch { /* silencioso */ }
};
fetchStoredNotifications();
```

**B) Adicionar eventos faltantes:**
```typescript
// Eventos que faltam no hook
socket.on('imprevisto_cadastrado', d => addNotification('imprevisto_cadastrado', d));
socket.on('reembolso_solicitado', d => addNotification('reembolso_solicitado', d));
socket.on('reembolso_revisado', d => addNotification('reembolso_revisado', d));
socket.on('inscricao_rejeitada', d => addNotification('inscricao_rejeitada', d));
```

---

### PASSO 3.2 — Frequência do ADM para funcionários
### PASSO 3.3 — Calendário do aluno: visual, filtro e interatividade
### PASSO 3.4 — Tutorial assistido (ícone ?)
### PASSO 3.5 — Histórico ADM paginado com filtros
### PASSO 3.6 — CRUD completo de imprevistos
### PASSO 3.7 — Registro de ponto do professor (nome correto)
### PASSO 3.8 — Feriado: pedir motivo ao excluir
### PASSO 3.9 — Contas a pagar: aba excluídos + Excel melhorado
### PASSO 3.10 — Inscrições do aluno: mostrar cursos disponíveis
### PASSO 3.11 — Frequência: 2 botões em vez de triple-click
### PASSO 3.12 — Frequência: ao reabrir dia mostrar estado salvo + botão Editar
### PASSO 3.13 — Persistência de formulário durante sessão (sessionStorage)
**Ver doc anterior para todos esses.**

---

### PASSO 3.14 — NOVO: Autenticação com dual-source (Zustand + localStorage)
**Arquivo:** `frontend/stores/useAuthStore.ts` + `frontend/app/login/page.tsx`
**Diagnóstico:** O sistema mantém dois estados de autenticação paralelos:
1. Zustand store persistido como `auth-storage` no localStorage
2. Itens diretos `token`, `user`, `student` no localStorage

O `client.ts` remove `token`, `user`, `student`, `auth-storage` no 401. Mas `useAuthStore.logout()`
apenas faz `set({ user: null, token: null })` sem limpar o localStorage.
Isso pode causar estado fantasma: Zustand diz "não autenticado" mas `localStorage.getItem('token')`
ainda retorna um token válido.

**Correção — `useAuthStore.logout()` deve limpar tudo:**
```typescript
logout: () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('student');
  localStorage.removeItem('auth-storage');
  set({ user: null, token: null, isAuthenticated: false });
},
```

---

### PASSO 3.15 — NOVO: Redis sem senha no docker-compose (produção)
**Arquivo:** `docker-compose.yml`
**Diagnóstico:** O Redis está sem autenticação. Em desenvolvimento está OK, mas antes do
deploy em produção é necessário adicionar senha.

**Para produção:**
```yaml
redis:
  command: redis-server --requirepass ${REDIS_PASSWORD}
  environment:
    - REDIS_PASSWORD=${REDIS_PASSWORD}
```
E configurar `REDIS_PASSWORD` no `.env` do servidor.
**Não urgente para dev — documentado para não esquecer antes do deploy.**

---

## 📋 GRUPO 4 — ORDEM DE EXECUÇÃO RECOMENDADA

```
SEMANA 1 — Infraestrutura e segurança (Grupo 0 primeiro)
  ├── PASSO 0.1 — package.json seed scripts (15 min)
  ├── PASSO 0.3 — RolesGuard no reimbursement controller (30 min) ← SEGURANÇA
  ├── PASSO 0.5 — prisma generate + remover casts (15 min)
  ├── PASSO 0.6 — req.user.sub → req.user.id (15 min)
  ├── PASSO 1.1 — enrollments.map root cause fix (30 min)
  ├── PASSO 1.2 — frequência normalização de data (1h)
  ├── PASSO 1.4 — reembolso histórico vazio (30 min)
  ├── PASSO 1.7 — remover localStorage fallback (15 min)
  └── PASSO 1.9 — reset tipo inválido no reembolso (10 min)

SEMANA 2 — Bugs críticos restantes
  ├── PASSO 1.3 — UserPreferences migration + endpoints (3h)
  ├── PASSO 1.5 — cadastro carretas (1h)
  ├── PASSO 1.8 — endpoint attendance/history (1h)
  ├── PASSO 0.4 — soft delete nos 3 services (2h)
  ├── PASSO 3.14 — logout dual-source fix (30 min)
  └── PASSO 0.2 — NestJS version alignment (decidir com Tech Lead)

SEMANA 3 — UI/UX (Grupo 2)
  ├── PASSO 2.1 — UTF-8 encoding (1h)
  ├── PASSO 2.2 — modais position fixed (2h)
  ├── PASSO 2.3 a 2.8 — demais fixes visuais (3h total)
  └── PASSO 3.1 — notificações entre perfis (4h) — mais importante

SEMANA 4 — Features novas core
  ├── PASSO 3.11 + 3.12 — frequência 2 estados + modo view (3h)
  ├── PASSO 3.6 — CRUD imprevistos (2h)
  ├── PASSO 3.7 — registro de ponto nome correto (1h)
  └── PASSO 3.2 — frequência funcionários ADM (3h — migration)

SEMANA 5 — Features novas secundárias
  ├── PASSO 3.3 — calendário aluno (3h)
  ├── PASSO 3.5 — histórico ADM paginado (2h)
  ├── PASSO 3.9 — contas a pagar excluídos (2h)
  ├── PASSO 3.10 — inscrições cursos disponíveis (2h)
  ├── PASSO 3.13 — persistência formulário sessão (2h)
  └── PASSO 3.15 — Redis senha para produção (30 min)

SEMANA 6 — Polish e features avançadas
  ├── PASSO 3.4 — tutorial assistido (4h — componente complexo)
  ├── PASSO 3.8 — feriado motivo exclusão (1h)
  ├── PASSO 2.7 — dashboard motorista (decisão Tech Lead)
  └── Testes de regressão em todos os portais
```

---

## ⚠️ AVISOS PARA O GRAVITY (Agente Executor) — OBRIGATÓRIO LER

1. **Nunca mockar dados em produção.** Se um endpoint não existe, criá-lo — nunca retornar array hardcoded.
2. **Um seed, não vários.** O projeto usa APENAS `seed-full.ts`. Nunca criar seeds adicionais.
3. **Consultar LIVRO_DE_REGRAS antes de qualquer alteração.**
4. **BOOM:** `npx tsc --noEmit` deve passar com zero erros antes de qualquer commit.
5. **Antes de criar novo endpoint:** verificar se já existe no controller via Swagger `/api/docs`.
6. **Reembolsos:** endpoint retorna `{ data: [], meta: {} }` — NUNCA `Array.isArray(res.data)` direto.
7. **Turmas/estatísticas:** `getStatistics` retorna métricas numéricas, NÃO o array de enrollments.
8. **Seed:** `npm run prisma:seed` ESTAVA quebrado (apontava para `seed.ts` inexistente). Após PASSO 0.1, usar `npm run seed:full`.

---

*Sistema Upgrade | RR TECNOL | v3.0 | 23/03/2026 — Auditoria completa NASA-level*
*Gerado por: Gravity 2.0 após varredura de TODOS os arquivos do projeto*
