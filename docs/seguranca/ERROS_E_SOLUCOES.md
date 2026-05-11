# 🚨 ERROS E SOLUÇÕES — Catálogo de Bugs
## "As Vacinas Técnicas" | v9.3 | 07/04/2026
## Sistema Upgrade — RR TECNOL / Qualifica MA/PI/AC

> **Propósito duplo:** (1) Referência viva para este projeto. (2) Base de conhecimento reutilizável
> para novos projetos NestJS + Next.js + Prisma + PostgreSQL + Zustand.
>
> **Regra:** ANTES de debugar qualquer erro, consulte este arquivo.
> Se resolver algo novo, documente aqui antes de seguir.

---

## 🔗 REFERÊNCIAS CRUZADAS

> **Ler antes de usar este catálogo:**
> - [`sobre-sistema.md`](../arquitetura/sobre-sistema.md) — arquitetura e contexto de cada módulo
> - [`LIVRO_DE_REGRAS.md`](../arquitetura/LIVRO_DE_REGRAS.md) — regras que previnem os bugs abaixo
> - [`ESTADO_SISTEMA.md`](../arquitetura/ESTADO_SISTEMA.md) — bugs ainda ativos hoje
>
> **Cada bug tem uma regra correspondente no LIVRO_DE_REGRAS.md:**
> | Bug | Regra que previne |
> |-----|-------------------|
> | BUG-DASH-01/02 (KPIs errados) | LIVRO §8F Anti-padrões Analytics |
> | BUG-SESSION-01 (vazamento de sessão) | LIVRO §5 — Auth state em sessionStorage |
> | BUG-KANBAN-01 (transições inválidas) | LIVRO §7 — VALID_TRANSITIONS |
> | BUG-ROTA-CAPTURE (`:id` captura literal) | LIVRO §2 — Ordem de rotas literais |
> | BUG-ROLES-GUARD (sem proteção) | LIVRO §2 — RolesGuard obrigatório |
> | BUG-UTC-DATE (dia errado por timezone) | LIVRO §3 — Normalização de datas UTC |
> | BUG-DECIMAL-STRING (somatório NaN) | LIVRO §3 — Decimal como string |
> | BUG-BOM-MASSA (P1012 no Prisma) | LIVRO §3 — Schema sem BOM |
> | BUG-DRAWER-TRANSFORM (GPS) | LIVRO §8G — Anti-padrões GPS/Mapas |
> | BUG-OSRM-RATE-LIMIT (GPS) | LIVRO §8G — Anti-padrões GPS/Mapas |
> | Alertas GPS | `RASTREAMENTO_PRODUCAO_APRESENTACAO.md` |
> | **BUG-PORT-01** (EADDRINUSE porta em uso) | LIVRO §2 — Ambiente local / ports |

---

## 📚 ÍNDICE POR CATEGORIA

| Categoria | Bugs |
|-----------|------|
| [ANALYTICS — Lógica de KPIs](#analytics) | BUG-DASH-01, BUG-DASH-02 |
| [AUTH — Sessão e Identidade](#auth) | BUG-SESSION-01 |
| [BACKEND — NestJS](#nestjs) | BUG-KANBAN-01/02, BUG-CHECKIN-01, rotas, guards |
| [FRONTEND — React/Next.js](#frontend) | Kanban, sidebar, modais, localStorage |
| [BANCO DE DADOS — Prisma](#prisma) | Datas UTC, soft delete, encoding |
| [ENCODING — UTF-8 / BOM](#encoding) | BUG-BOM-MASSA, BUG-UTF8-* |
| [INFRAESTRUTURA](#infra) | **BUG-PORT-01**, Porta, seed, Redis, Docker |
| [SCRIPTS DE MANUTENÇÃO](#scripts) | fix-bom, fix-utf8 |

---


## <a name="analytics"></a> 📊 ANALYTICS — Lógica de KPIs e Dashboard

---

### BUG-DASH-01 — Taxa de Aprovação sempre 0% no Dashboard Admin
**Data:** 27/03/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido e validado ao vivo (75%)

**Sintoma:** Dashboard exibe "Taxa de Aprovação: 0%" mesmo com 21 alunos matriculados.

**Causa raiz — Lógica de negócio mal mapeada no backend:**
O fluxo real de inscrição é um pipeline de estados:
```
PENDING → DOCUMENT_PENDING → APPROVED → ENROLLED (estado final confirmado)
```
O status `APPROVED` é **transitório** — dura segundos até o admin confirmar matrícula.
O `dashboard.service.ts` conta `aprovados` verificando `e.status === 'APPROVED'` no momento atual:
```typescript
// ERRADO — conta apenas os que ESTÃO em APPROVED agora (zero, pois todos viraram ENROLLED)
if (e.status === 'APPROVED') monthMap[key].aprovados++;
```
Resultado no banco real:
```
ENROLLED:  21  (estado final — foram aprovados e confirmados)
APPROVED:   0  (transitório, zero no banco)
```
Taxa calculada: `(0 / 28) * 100 = 0%` — errado. Correto seria `(21 / 28) * 100 = 75%`.

**Arquivos afetados:**
- `backend/src/dashboard/dashboard.service.ts` — método `getAnalytics()`

**Fix necessário:**
```typescript
// CORRETO — conta APPROVED (transitório) + ENROLLED (final confirmado)
if (e.status === 'APPROVED' || e.status === 'ENROLLED') monthMap[key].aprovados++;
```

**Lição para outros projetos:**
> Nunca contar estados transitórios como métrica final. Em fluxos de estado (state machines),
> identifique quais estados representam "conclusão" e inclua todos eles na contagem.
> APPROVED → ENROLLED são dois estados do mesmo evento: aprovação.

---

### BUG-DASH-02 — Certificados Emitidos sempre 0 no Dashboard Admin
**Data:** 27/03/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido e validado ao vivo (6 certificados)

**Sintoma:** Dashboard exibe "Certificados Emitidos: 0" mesmo com 6 certificados no banco.

**Causa raiz — Duplo erro (frontend lê campo errado + backend não expõe o dado):**

**Causa A — Frontend lê campo semanticamente errado:**
```typescript
// admin/dashboard/page.tsx linha ~170 — ERRADO
// Lê count de enrollments com status APPROVED — que é 0 (transitório)
const certCount = analytics?.statusInscricoes?.find(s => s.name === 'Aprovadas')?.value ?? 0;
```
O frontend confunde "Aprovadas" (enrollments) com "Certificados emitidos" (tabela certificates).

**Causa B — Backend não inclui count de certificados no endpoint:**
`GET /dashboard/analytics` nunca faz `prisma.certificate.count()`.
O endpoint retorna `statusInscricoes` com contagem de estados de enrollment, mas nenhum campo de certificados reais.

**Realidade no banco:** 6 certificados existem em `Certificate` — nunca lidos pelo dashboard.

**Fix necessário:**

Backend — adicionar ao `getAnalytics()`:
```typescript
const certificadosEmitidos = await this.prisma.certificate.count({
    where: { status: 'ACTIVE' }
});
// Incluir no return: { ..., certificadosEmitidos }
```

Frontend — corrigir a leitura:
```typescript
// CORRETO — lê o campo real de certificados
const certCount = analytics?.certificadosEmitidos ?? 0;
```

**Lição para outros projetos:**
> KPIs de dashboard devem ser rastreados até a tabela e campo exatos no banco.
> Nunca inferir contagem de uma entidade (Certificate) a partir de status de outra (Enrollment).
> Cada KPI deve ter seu próprio campo dedicado na resposta da API.

---


## <a name="auth"></a> 🔐 AUTH — Sessão e Identidade

---

### BUG-SESSION-01 — Mesclagem de perfis entre abas do browser
**Data:** 27/03/2026 | **Severidade:** 🔴 CRÍTICO | **Status:** ✅ Resolvido

**Sintoma:** Abrir 4 abas com perfis diferentes (Admin, Teacher, Driver, Student) — todos exibiam
os dados do último usuário que fez login. Notificações, nome e role se contaminavam entre abas.

**Causa raiz — localStorage é compartilhado por origem, não por aba:**
```typescript
// ERRADO — useAuthStore.ts com persist padrão (localStorage)
persist((set) => ({ ... }), { name: 'auth-storage' })
// localStorage é GLOBAL por origem — todas as abas leem o mesmo valor
// Zustand persist também escuta o evento 'storage' e re-hidrata automaticamente
// Login na Tab 2 → evento 'storage' dispara → Tab 1 re-hidrata com dados do Tab 2
```

**Prova do problema:**
```
Tab 1 (Admin)  → auth-storage no localStorage = { user: admin@... }
Tab 2 (Teacher) faz login → auth-storage = { user: teacher@... }
Tab 1 (Admin)  → Zustand ouve evento 'storage' → re-hidrata = { user: teacher@... }
Tab 1 agora mostra Teacher em vez de Admin = VAZAMENTO DE DADOS
```

**Solução — sessionStorage (isolado por aba por design do browser):**
```typescript
// CORRETO — useAuthStore.ts
import { persist, createJSONStorage } from 'zustand/middleware';

persist((set) => ({ ... }), {
    name: 'auth-storage',
    storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? sessionStorage : localStorage
    ),
})
```

**Todos os arquivos corrigidos:**
- `stores/useAuthStore.ts` → `createJSONStorage(() => sessionStorage)`
- `app/login/page.tsx` → `sessionStorage.setItem(token/user/student)`
- `lib/api/client.ts` → interceptor lê `sessionStorage.getItem('token')` + fallback legacy
- `hooks/useNotifications.ts` → `sessionStorage.getItem('token')` para handshake WS
- 4 layouts (admin/teacher/student/driver) → verificação de token usa sessionStorage

**Comportamento após fix:**
| Cenário | Antes | Depois |
|---------|-------|--------|
| Login Tab 1 (Admin), Tab 2 (Teacher) | Tab 1 vira Teacher | Tab 1 continua Admin ✅ |
| F5 em qualquer aba | Sessão mantida | Sessão mantida ✅ |
| Fechar aba | Sessão vaza para outras | Sessão encerrada ✅ |
| Ctrl+T nova aba | Carrega última sessão | Nova aba sem sessão ✅ |
| localStorage.getItem('token') | Tinha token | null ✅ |

**Validação ao vivo:** `ISOLATED: true` — Tab1 ADMIN + Tab2 TEACHER simultâneos, zero contaminação.

**Lição para outros projetos:**
> NUNCA usar localStorage para armazenar estado de autenticação em aplicações multi-usuário
> ou que abrem múltiplas abas. localStorage é compartilhado por origem (protocolo+domínio+porta).
> sessionStorage é isolado por aba — use-o para auth state.
> Zustand `persist` default usa localStorage: sempre sobrescrever com `createJSONStorage(() => sessionStorage)`.

---


## <a name="nestjs"></a> ⚙️ BACKEND — NestJS / Prisma Service

---

### BUG-KANBAN-01 — Kanban aceita qualquer transição de status sem validação
**Data:** 25/03/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido

**Sintoma:** Arrastar card ENROLLED → PENDING no kanban chamava a API e retornava 400.
Pior: o `switch` no controller não tinha case `ENROLLED` — caía em `default: requestCorrection()`
transformando ENROLLED silenciosamente em DOCUMENT_PENDING.

**Causa — ausência de matriz de transições válidas:**
```typescript
// ERRADO — switch sem case ENROLLED, default silencioso
switch (status) {
    case 'APPROVED': return enrollmentsService.approveEnrollment(id);
    // ... outros cases
    default: return enrollmentsService.requestCorrection(id); // BUG SILENCIOSO
}
```

**Solução — dois níveis de validação (frontend + backend):**

Frontend (validação antes de chamar API):
```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['APPROVED', 'REJECTED', 'DOCUMENT_PENDING', 'WAITLIST'],
    DOCUMENT_PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: ['ENROLLED', 'REJECTED'],
    WAITLIST: ['APPROVED', 'REJECTED'],
    ENROLLED: [],   // estado final — não pode sair
    REJECTED: [],   // estado final — não pode sair
};
```

Backend — cobrir todos os cases:
```typescript
switch (status) {
    case 'APPROVED': return enrollmentsService.approveEnrollment(id);
    case 'ENROLLED': return enrollmentsService.confirmEnrollment(id);
    case 'DOCUMENT_PENDING': return enrollmentsService.requestCorrection(id);
    // ... todos os cases
    default: throw new BadRequestException(`Transição para ${status} não permitida`);
}
```

**Lição para outros projetos:**
> State machines em Kanban/workflows precisam de validação em DUAS camadas.
> Frontend: para UX responsivo (feedback imediato sem round-trip).
> Backend: para segurança (nunca confiar no cliente).
> O `default` de um switch de estado DEVE lançar exceção explícita — nunca executar ação silenciosa.

---

### BUG-KANBAN-02 — Toast genérico "Erro ao atualizar inscrição"
**Data:** 25/03/2026 | **Severidade:** 🟡 Média | **Status:** ✅ Resolvido

**Causa:** `catch {}` vazio ou apenas `console.error` — mensagem real do servidor descartada.
```typescript
// ERRADO
} catch { toast.error('Erro ao atualizar inscrição'); }

// CORRETO
} catch (err: any) {
    toast.error(err?.response?.data?.message || 'Erro ao atualizar inscrição');
}
```

**Lição:** Todo `catch` de chamada API deve inspecionar `err?.response?.data?.message`.

---

### BUG-CHECKIN-01 — `POST /api/teachers/me/checkin` não existia
**Data:** 25/03/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido

**Sintoma:** Frontend chamava `POST /api/teachers/me/checkin` → 404 Not Found.
Tab "Meu Ponto" no histórico do professor carregava mas não registrava nem exibia dados.

**Causa:** Endpoint foi planejado e referenciado no frontend mas nunca criado no backend.

**Solução completa:**
1. Schema Prisma: model `TeacherCheckin` com `userId`, `checkedAt`, `date`, `note`
2. `UsersService`: métodos `registerCheckin(userId)` e `getCheckins(userId)`
3. `TeachersController`: `POST /teachers/me/checkin` + `GET /teachers/me/checkins`
4. `UsersModule`: registrar `TeachersController` em `controllers[]`

**Lição para outros projetos:**
> Antes de criar qualquer chamada no frontend, verificar se o endpoint existe no backend (Swagger).
> Usar o anti-padrão "endpoint fantasma" gera bugs silenciosos que só aparecem em runtime.

---

### BUG-ROTA-CAPTURE — Rota literal capturada por parâmetro dinâmico `:id`
**Data:** 23/03/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido

**Sintoma:** `GET /employees/attendance` retornava erro "attendance" não é um UUID válido.
`GET /classes/teacher/history` retornava o erro `teacher` como `:id`.

**Causa:** NestJS resolve rotas na ordem de declaração. Se `:id` vem antes de `attendance`:
```typescript
// ERRADO — :id captura "attendance"
@Get(':id')
findOne(@Param('id') id: string) { ... }

@Get('attendance')  // NUNCA ALCANÇADO
findAttendance() { ... }
```

**Solução:** Rotas literais SEMPRE antes de rotas com parâmetros:
```typescript
// CORRETO
@Get('attendance')   // literal primeiro
findAttendance() { ... }

@Get('me')           // literal primeiro
getMe() { ... }

@Get(':id')          // parâmetro por último
findOne(@Param('id') id: string) { ... }
```

**Lição para outros projetos:**
> Em NestJS (e Express), a ordem de declaração de rotas importa.
> Rotas literais (`me`, `my`, `all`, `attendance`, `summary`) devem SEMPRE ser declaradas
> antes de rotas com parâmetros dinâmicos (`:id`, `:code`).

---

### BUG-ROLES-GUARD — `@Roles()` sem `@UseGuards(RolesGuard)` = zero proteção
**Data:** 23/03/2026 | **Severidade:** 🔴 Crítico | **Status:** ✅ Resolvido

**Sintoma:** Rotas marcadas com `@Roles('ADMIN')` eram acessíveis por qualquer usuário autenticado.

**Causa:** `@Roles()` apenas define metadata Reflect — quem lê é o `RolesGuard`.
Sem `@UseGuards(RolesGuard)`, a metadata nunca é lida → proteção inexistente.
```typescript
// ERRADO — parece protegido mas não está
@Roles('ADMIN')
@Get()
findAll() { ... }

// CORRETO — os dois sempre juntos
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Get()
findAll() { ... }
```

**Lição para outros projetos:**
> Decorators de metadata em NestJS não fazem nada sozinhos — precisam de um Guard para executar.
> Sempre pair `@Roles()` com `@UseGuards(RolesGuard)`. Idealmente criar um decorator composto.

---

### BUG-SWITCH-SILENT — Switch sem case para estado novo age silenciosamente
**Data:** 25/03/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido

**Causa:** Estado `ENROLLED` adicionado ao fluxo sem atualizar o switch no controller.
O `default` executava `requestCorrection()` — alterando o estado sem aviso.

**Regra:** Todo switch de estado deve cobrir TODOS os valores e ter default explícito:
```typescript
default: throw new BadRequestException(`Status '${status}' não suportado`);
```

---

### BUG-GET-STATUS-ARRAY — `GET /classes?status[]=A&status[]=B` não suportado
**Data:** 25/03/2026 | **Severidade:** 🟡 Média | **Status:** ✅ Resolvido

**Sintoma:** `teacher/historico` fazia `api.get('/classes', { params: { status: ['IN_PROGRESS', 'COMPLETED'] } })`
→ NestJS recebia `status[0]=IN_PROGRESS&status[1]=COMPLETED` → query não retornava nada (404/vazio).

**Causa:** O controller do backend aceitava `status` como `string`, não `string[]`.
Axios serializa arrays com `[]` por padrão, formato não suportado pelo backend.

**Solução:** Substituir array por parâmetro mais específico:
```typescript
// ERRADO
api.get('/classes', { params: { status: ['IN_PROGRESS', 'COMPLETED', 'PLANNED'] } })

// CORRETO — filtrar por professor, não por array de status
api.get('/classes', { params: { teacherUserId: user?.id } })
```

---


## <a name="frontend"></a> 🖥️ FRONTEND — React / Next.js / Zustand

---

### BUG-KANBAN-UI — Cards ENROLLED/REJECTED ainda arrastáveis
**Data:** 25/03/2026 | **Severidade:** 🟡 Média | **Status:** ✅ Resolvido

**Sintoma:** Usuário conseguia arrastar cards de estados finais (ENROLLED, REJECTED) para outras colunas.
O drop não fazia nada no backend (foi bloqueado), mas a UX era confusa.

**Solução:**
```tsx
// Tornar cards de estados finais não arrastáveis
const isFinalStatus = (s: string) => s === 'ENROLLED' || s === 'REJECTED';
<div draggable={!isFinalStatus(enrollment.status)} style={{ cursor: isFinalStatus ? 'default' : 'grab' }}>
```

---

### BUG-SIDEBAR-DUPLA — Dois itens do sidebar ficam ativos simultaneamente
**Data:** 23/03/2026 | **Severidade:** 🟡 Média | **Status:** ✅ Resolvido

**Sintoma:** Ao navegar para `/admin/funcionarios/frequencia`, tanto "Funcionários" quanto
"Freq. Funcionarios" ficavam com highlight ativo no sidebar.

**Causa:** A lógica de `isActive` usava `pathname.startsWith(href)`, então `/funcionarios`
era `true` ao estar em `/funcionarios/frequencia`.

**Solução — verificar match exato antes de usar startsWith:**
```typescript
const hasExactMatch = navItems.some(item => item.href === pathname);
const isActive = hasExactMatch
    ? item.href === pathname          // se algum item tem match exato, usar só exato
    : pathname.startsWith(item.href); // senão, usar startsWith normalmente
```

---

### BUG-MODAL-OVERFLOW — Página rola por baixo de modal aberto
**Data:** 23/03/2026 | **Severidade:** 🟢 Baixa | **Status:** ✅ Resolvido

**Causa:** Modal não bloqueava scroll do body ao abrir.
**Solução:**
```typescript
// Ao abrir modal
document.body.style.overflow = 'hidden';
// Ao fechar modal (OBRIGATÓRIO)
document.body.style.overflow = '';
```

**Lição:** O `overflow = ''` no fechar é tão importante quanto o `= 'hidden'` no abrir.
Modais que não restauram o overflow deixam a página sem scroll para sempre.

---

### BUG-MODAL-POSITION — Modal cortado na tela
**Data:** 23/03/2026 | **Severidade:** 🟡 Média | **Status:** ✅ Resolvido

**Causa:** Modal com `position: absolute` rola com a página. Em telas pequenas, parte do modal
fica fora da viewport.
**Solução:**
```css
/* Sempre para modais */
position: fixed;
inset: 0;
display: flex;
align-items: center;
justify-content: center;
max-height: calc(100vh - 2rem);
overflow-y: auto;
```

---

### BUG-ARRAY-RESPONSE — `res.data` não é array mas código assume que é
**Data:** 23/03/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido

**Sintoma:** `enrollments.map is not a function` — TypeError em runtime.

**Causa:** API de reembolsos retorna `{ data: [], meta: {} }` mas código usava
`Array.isArray(res.data)` que retornava `false` → fallback para `[]` → dados nunca exibidos.

**Padrão correto para qualquer fetch:**
```typescript
// Lida com ambos os formatos: array direto OU objeto paginado
const arr = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);

// Para endpoint com estrutura conhecida (ex: employees)
const employees = res.data?.employees ?? (Array.isArray(res.data) ? res.data : []);
```

**Lição para outros projetos:**
> Documentar explicitamente o formato de resposta de cada endpoint.
> APIs que retornam `{ data: [], meta: {} }` vs array direto são um ponto de falha comum.
> Usar um helper de normalização centralizado.

---

### BUG-LOGOUT-PARTIAL — Logout não limpava localStorage
**Data:** 23/03/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido

**Sintoma:** Após logout, botão voltar do browser recarregava o dashboard autenticado.

**Causa:** `logout()` no Zustand apenas chamava `set({ user: null })` mas não limpava localStorage/sessionStorage.
O layout verificava `localStorage.getItem('token')` — que ainda tinha o token.

**Solução — logout limpa AMBAS as fontes:**
```typescript
logout: () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('student');
    sessionStorage.removeItem('auth-storage');
    localStorage.removeItem('token');    // legado
    localStorage.removeItem('user');     // legado
    localStorage.removeItem('auth-storage'); // legado
    set({ user: null, token: null, isAuthenticated: false });
},
```

---

### BUG-ARROW-JSX — Arrow function com múltiplos statements sem bloco
**Data:** 23/03/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido

**Sintoma:** Erro de parsing "Unexpected token" em JSX. Build quebrava.

**Causa:**
```tsx
// ERRADO — parser JSX encerra o statement no ';' e encontra '}' solto
onClick={() => setState(true); setLoading(false)}

// CORRETO — bloco explícito
onClick={() => { setState(true); setLoading(false); }}
```

---

### BUG-ENUM-LABEL — Enum do backend exibido diretamente na UI
**Data:** 23/03/2026 | **Severidade:** 🟡 Média | **Status:** ✅ Resolvido

**Sintoma:** UI exibia `CLASSROOM_MATERIAL` em vez de "Material de Aula". Usuário confuso.

**Solução — sempre usar mapa de labels:**
```typescript
const TIPO_LABELS: Record<string, string> = {
    CLASSROOM_MATERIAL: 'Material de Aula',
    CLEANING_MATERIAL:  'Material de Limpeza',
    EMERGENCY_REPAIR:   'Reparo Emergencial',
    FOOD:               'Alimentação',
    OTHER:              'Outro',
};
// Uso: TIPO_LABELS[reimbursement.type] ?? reimbursement.type
```

---

### BUG-NOTIF-SEM-HISTORICO — Notificações sumiam ao recarregar a página
**Data:** 23/03/2026 | **Severidade:** 🟡 Média | **Status:** ✅ Resolvido

**Causa:** `useNotifications` só escutava eventos WS em tempo real.
Ao recarregar, as notificações históricas eram perdidas pois estavam apenas em memória.

**Solução:**
```typescript
// Carregar histórico do banco AO MONTAR o hook
useEffect(() => {
    const fetchStoredNotifications = async () => {
        const res = await api.get('/notifications?limit=50');
        setNotifications(parseNotifications(res.data));
    };
    fetchStoredNotifications();
    // ... depois conectar WS
}, []);
```

---


## <a name="prisma"></a> 🗄️ BANCO DE DADOS — Prisma / PostgreSQL

---

### BUG-UTC-DATE — Frequência duplicada / dia errado por timezone
**Data:** 23/03/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido

**Sintoma:** Registrar frequência no dia 25 salvava como dia 24 no banco.
Tentar registrar duas vezes no mesmo dia dava erro de unique constraint.

**Causa:** `new Date('2026-03-25')` sem UTC é interpretado como meia-noite no timezone local.
Em UTC-3 (Brasil), isso resulta em `2026-03-24T21:00:00Z` no banco.

```typescript
// ERRADO
const date = new Date(dateString); // timezone local pode mudar o dia

// CORRETO — sempre UTC meia-noite para datas de frequência
const [y, m, d] = dateString.split('-').map(Number);
const date = new Date(Date.UTC(y, m - 1, d)); // 2026-03-25T00:00:00Z sempre
```

**Lição para outros projetos:**
> Datas sem hora (frequência, calendário, eventos de dia inteiro) SEMPRE normalizar para UTC midnight.
> Nunca usar `new Date(string)` diretamente para datas de negócio — o resultado varia por timezone.

---

### BUG-DECIMAL-STRING — Prisma retorna Decimal como string, não como number
**Data:** 23/03/2026 | **Severidade:** 🟡 Média | **Status:** ✅ Resolvido

**Sintoma:** Valores monetários exibiam `"45.5"` em vez de `R$ 45,50`. Soma de valores dava NaN.

**Causa:** Prisma serializa campos `@db.Decimal` como string JSON para evitar perda de precisão.
`"45.5" + "10.0" = "45.510.0"` (concatenação de string, não soma).

**Solução:**
```typescript
// No frontend, sempre converter antes de exibir ou somar
Number(reimbursement.amount).toFixed(2)
// Ou formatar como moeda
Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
```

---

### BUG-SOFT-DELETE-AUSENTE — Hard delete em entidades de negócio
**Data:** 23/03/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido

**Sintoma:** Excluir uma conta a pagar removia o registro do banco. Sem histórico.
Ausência quebrava relatórios históricos e violava requisitos de auditoria (LGPD).

**Causa:** `prisma.contaPagar.delete({ where: { id } })` — hard delete direto.

**Solução — sempre soft delete:**
```typescript
// CORRETO — marcar como inativo em vez de deletar
await prisma.contaPagar.update({
    where: { id },
    data: { active: false, status: 'cancelada' }
});
```
Exibir apenas registros ativos nas listagens:
```typescript
prisma.contaPagar.findMany({ where: { active: true } })
```

---

### BUG-PRISMA-CLIENT-STALE — `(this.prisma as any).modelo` causando runtime error
**Data:** 23/03/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido

**Causa:** Schema Prisma foi alterado mas `npx prisma generate` não foi rodado.
O Prisma Client ficou desatualizado → TypeScript aceitava `(prisma as any).novoModel`
mas em runtime o client não tinha o model → erro silencioso em produção.

**Solução:**
```bash
npx prisma generate   # sempre após alterar schema.prisma
# Nunca usar (prisma as any) — sinal de client desatualizado
```

---

## <a name="encoding"></a> 📝 ENCODING — UTF-8 / BOM

---

### BUG-FREQ-RESET — Frequência volta para "todos presentes" ao reabrir dia já salvo
**Data:** 07/04/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido

**Sintoma:** Professor marca Bianca=F, Gustavo=F, salva (API 200 OK). Volta ao calendário,
clída no dia novamente → tela exibe TODOS com P (5P/0F). Dados do banco estavam corretos,
mas o frontend ignorava e sobrescrevia na próxima abertura do dia.

**Causa raiz — 4 bugs encadeados:**

1. **Endpoint errado:** `GET /classes/:id/attendance` (não existe) em vez de
   `GET /classes/:id/attendance/history` (endpoint real no `ClassesController`).
   Sem dados, o histórico ficava vazio.

2. **`AttendanceDay` sem records por aluno:** A interface armazenava apenas contagens
   (`presentCount`, `absentCount`, `total`). Sem `records: Record<string, boolean>`,
   não havia como saber qual aluno estava presente/ausente ao reabrir o dia.

3. **`selectDay()` sempre resetava para todos presentes:** A função ignorava `attendanceHistory[key]`
   e fazia `students.forEach(s => { initial[s.id] = true; })` incondicionalmente.

4. **Sem `editMode`:** Não existia estado de somente-leitura. O professor podia clicar em
   qualquer dia salvo e iniciar nova edição em branco, sobrescrevendo dados.

**Fix — arquivo único `[classId]/page.tsx`:**
```typescript
// FIX 1 — interface com records por aluno
interface AttendanceDay {
    date: string; presentCount: number; absentCount: number; total: number;
    records: Record<string, boolean>; // studentId → present
}

// FIX 2 — estado editMode
const [editMode, setEditMode] = useState(false);

// FIX 3 — endpoint correto + preenche records por aluno
const attRes = await api.get(`/classes/${classId}/attendance/history`);
// att.studentId, att.present → hist[ds].records[att.studentId] = att.present;

// FIX 4 — selectDay() carrega dados salvos ou inicia fresh
const hist = attendanceHistory[key];
if (hist?.records && Object.keys(hist.records).length > 0) {
    setRecords(hist.records);   // carrega dados reais
    setEditMode(false);         // modo leitura
} else {
    setRecords(initial);        // todos presentes
    setEditMode(true);          // edição imediata
}
```

Métodos adicionados: banner `🔒 Frequência já registrada`, botões `✏️ Editar` / `✕ Cancelar`,
botton bar `SALVAR` só visível em `editMode`, `handleSave()` salva `records` no histórico local
e chama `setEditMode(false)` após sucesso.

**Lição para outros projetos:**
> Ao implementar calendários de registro, SEMPRE armazenar dados por item, não só agregações.
> Um contador `presentCount = 3` não diz QUEM são os 3 presentes.
> EditMode explícito evita sobrescritas acidentais em dados já persistidos.

---

### BUG-BOM-MASSA — BOM em 122+ arquivos causava P1012 no Prisma e erros de build
**Data:** 25/03/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido

**Sintoma:** `prisma db push` dava `P1012: This line is invalid`.
Next.js build falhava com erros de parsing em arquivos `.tsx`.

**Causa:** Editor (Visual Studio Code com configuração incorreta) salvou arquivos com BOM
(`EF BB BF` no início do arquivo). O parser do Prisma e TypeScript rejeita BOM.

**Solução — script PowerShell para remover BOM em massa:**
```powershell
# fix-bom.ps1 — rodar na raiz do frontend
Get-ChildItem -Recurse -Include "*.ts","*.tsx" | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        [System.IO.File]::WriteAllBytes($_.FullName, $bytes[3..($bytes.Length-1)])
        Write-Host "BOM removido: $($_.Name)"
    }
}
```

**Prevenção:** Configurar editor para usar UTF-8 sem BOM. No VS Code: `"files.encoding": "utf8"`.

---

### BUG-UTF8-DOUBLE — Textos double-encoded no banco (`â€"` em vez de `—`)
**Data:** 25/03/2026 | **Severidade:** 🟡 Visual | **Status:** ✅ Resolvido

**Sintoma:** Notificações exibiam `Turma ativa â€" lembre-se` em vez de `Turma ativa — lembre-se`.

**Causa técnica:** Texto UTF-8 foi salvo como se fosse Latin-1.
O caractere `—` (U+2014, bytes `E2 80 94` em UTF-8) foi salvo como 3 chars Latin-1 separados: `â`, `€`, `"`.

**Detector seguro — C1 control characters (U+0080–U+009F):**
```typescript
function hasDoubleEncoding(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code >= 0x80 && code <= 0x9F) return true; // Texto português real NUNCA tem esses
    }
    return false;
}

function fixDoubleEncoded(text: string | null): string | null {
    if (!text || !hasDoubleEncoding(text)) return text;
    try {
        const decoded = Buffer.from(text, 'latin1').toString('utf8');
        if (!decoded.includes('\uFFFD')) return decoded; // aceita só se sem replacement chars
    } catch { /* noop */ }
    return text;
}
```

**Script de correção no banco:** `backend/prisma/fix-utf8-notifications.ts`

**Prevenção:** Container PostgreSQL com `POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"`.

---

### BUG-UTF8-ARQUIVO — Arquivo salvo com encoding errado (Latin-1 em vez de UTF-8)
**Data:** 25/03/2026 | **Severidade:** 🟡 Visual | **Status:** ✅ Resolvido

**Sintoma:** `teacher/frequencia/page.tsx` exibia `FrequÃŠNCIA`, `Â·`, `âœ"` na UI.

**Causa:** Arquivo salvo com encoding Windows-1252 (Latin-1) em vez de UTF-8.
Os bytes de caracteres acentuados foram mal interpretados pelo browser.

**Solução:** Reescrever o arquivo completamente com UTF-8 puro. Não basta "salvar como UTF-8" —
os bytes corrompidos já estão no arquivo e precisam ser reescritos.

---


## <a name="infra"></a> 🏗️ INFRAESTRUTURA

---

### BUG-PORTA-3002 — Backend rodando na porta errada
**Data:** 18/03/2026 | **Severidade:** 🟡 Dev | **Status:** ✅ Resolvido

**Sintoma:** Backend subia na porta 3002 em vez de 3001. Frontend não conectava.

**Causa:** Variável de ambiente `PORT=3002` estava definida na sessão PowerShell.
`NestJS` respeita a variável `PORT` do ambiente.

**Solução:**
```powershell
Remove-Item Env:PORT -ErrorAction SilentlyContinue
npm run start:dev
```

---

### BUG-SEED-SCRIPT — `npm run prisma:seed` apontava para arquivo inexistente
**Data:** 23/03/2026 | **Severidade:** 🟡 Dev | **Status:** ✅ Resolvido

**Causa:** `package.json` tinha `"prisma:seed": "npx tsx prisma/seed.ts"` mas o arquivo
real era `seed-full.ts`. Script falhava silenciosamente.

**Solução:** Sempre manter o script alinhado com o arquivo real:
```json
"prisma": { "seed": "npx tsx prisma/seed-full.ts" }
```

---

### BUG-REDIS-NOAUTH — Redis sem senha em produção
**Data:** 23/03/2026 | **Severidade:** 🔴 Segurança | **Status:** ✅ Resolvido

**Causa:** `docker-compose.yml` não configurava `requirepass` no Redis.
Qualquer processo na rede do container conseguia conectar sem autenticação.

**Solução:**
```yaml
redis:
    command: redis-server --requirepass RR@@Upgrade
```

---

### BUG-POSTGRES-ENCODING — PostgreSQL sem locale pt_BR.UTF-8
**Data:** 13/03/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido

**Sintoma:** Acentos salvos corretamente no código chegavam corrompidos no banco.

**Causa:** Container PostgreSQL criado sem locale correto.

**Solução — deve ser configurado na CRIAÇÃO do container (não pode ser alterado depois):**
```yaml
postgres:
    environment:
        POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"
```
Se o container já existe com encoding errado: destruir e recriar. Não tem outro jeito.

---

### BUG-NESTJS-VERSOES-MISTAS — Pacotes `@nestjs/*` v10 e v11 misturados
**Data:** 23/03/2026 | **Severidade:** 🟡 Risco | **Status:** ⚠️ Monitorado

**Sintoma:** TypeScript warnings esporádicos de tipagem. DI (Dependency Injection) com
comportamentos inesperados em edge cases.

**Causa:** Alguns pacotes foram atualizados individualmente para v11 enquanto outros
permaneceram em v10.

**Verificação:**
```bash
npm ls | grep @nestjs
# Todos devem ter a mesma versão major
```

**Solução:** Atualizar todos para a mesma major version de uma só vez.
Nunca atualizar pacotes `@nestjs/*` individualmente.

---

## <a name="scripts"></a> 🛠️ SCRIPTS DE MANUTENÇÃO

| Script | Localização | Quando Usar | O que Faz |
|--------|-------------|-------------|-----------|
| `fix-bom.ps1` | raiz do projeto | BOM em arquivos TSX/TS | Remove BOM de todos os .tsx/.ts do frontend |
| `fix-utf8-notifications.ts` | `backend/prisma/` | Dados double-encoded no banco | Detecta e corrige textos com C1 controls (double-encoding) |
| `analise-dashboard.cjs` | `backend/` | Debug de KPIs | Lê contagens reais do banco para comparar com UI |

---

---

### BUG-DRAWER-SCROLL — DriverDrawer não trava a tela ao abrir
**Data:** 27/03/2026 | **Severidade:** 🟡 Média | **Status:** ✅ Resolvido via F5.13 (createPortal)

**Sintoma:** Ao clicar em um motorista e abrir o DriverDrawer, o usuário ainda consegue
rolar a página por baixo do overlay/drawer. O drawer deveria fixar a tela completamente.

**Causa raiz — scroll está em `.admin-content`, não no `body`:**
O layout do admin usa `position: fixed` com overflow controlado por classes CSS:
```css
.admin-layout  { height: 100vh; overflow: hidden; }  /* body NÃO scrolla */
.admin-main    { flex: 1; overflow: hidden; }
.admin-content { flex: 1; overflow-y: auto; }        /* ← AQUI está o scroll real */
```
O `document.body.style.overflow = 'hidden'` que foi adicionado ao DriverDrawer não tem
efeito porque o `body` já estava `overflow: hidden` pelo layout. Quem scrolla é
`.admin-content`, não o `body`.

**Fix correto:**
No `admin/dashboard/page.tsx`, ao abrir o drawer, bloquear o scroll no container correto:
```typescript
// Ao abrir drawer (onDriverClick)
const contentEl = document.querySelector('.admin-content') as HTMLElement;
if (contentEl) contentEl.style.overflowY = 'hidden';

// Ao fechar drawer (onClose do DriverDrawer)
const contentEl = document.querySelector('.admin-content') as HTMLElement;
if (contentEl) contentEl.style.overflowY = 'auto';
```
O DriverDrawer não deve mais manipular `document.body.style.overflow` — isso é responsabilidade
do pai (`admin/dashboard/page.tsx`) que conhece o container de scroll correto.

**Lição para outros projetos:**
> Antes de bloquear scroll ao abrir um modal/drawer, identificar QUAL elemento faz o scroll real.
> Em layouts com `overflow: hidden` no body e scroll em containers filhos, bloquear o body não tem efeito.
> Usar `querySelector('.container-que-scrolla')` no componente pai, não no filho.

---

### BUG-SEED-STALE — Seed de rastreamento envelhece com o tempo
**Data:** 27/03/2026 | **Severidade:** 🔴 Alta para apresentação | **Status:** 🚧 Em andamento

**Sintoma:** Após rodar o seed de rastreamento, os motoristas aparecem corretamente
(ONLINE/STOPPED/OFFLINE). Após 15 minutos, o "motorista ONLINE" vira STOPPED.
Após 20 minutos, vira OFFLINE. Após 1h, todos são OFFLINE. A apresentação quebra.

**Causa raiz — status é calculado em tempo real, não é campo salvo:**
```typescript
// driver-location.service.ts — getMotoristaAtivos()
const diffMin = (agora.getTime() - new Date(ultima.capturedAt).getTime()) / 60000;
let status: 'online' | 'offline' | 'stopped' = 'offline';
if (diffMin <= 5)  status = 'online';   // capturedAt < 5min atrás
else if (diffMin <= 15) status = 'stopped'; // capturedAt 5-15min atrás
// > 15min → offline
```
O seed grava `capturedAt = new Date(Date.now() - 3 * 60000)` (3min atrás) para o motorista
ONLINE. Em 2 minutos reais, esse valor vira 5min → STOPPED. Em 12 minutos → OFFLINE.

**Solução — script `seed:refresh-drivers`:**
Adicionar ao `seed-full.ts` uma função `refreshDriverTimestamps()` que:
1. Busca todos os motoristas demo com Trip IN_TRANSIT
2. Atualiza o `capturedAt` da última `DriverLocation` de cada um para o offset desejado:
   - ONLINE target: `now - 3min`
   - STOPPED target: `now - 10min`
   - OFFLINE target: `now - 120min`
3. Expor via `"seed:refresh": "npx tsx prisma/seed-full.ts --refresh-drivers"` no `package.json`

Rodar 5 minutos antes da apresentação.

**Lição para outros projetos:**
> Dados de demonstração time-sensitive precisam de um mecanismo de "refresh" separado da criação.
> Nunca assumir que timestamps gravados no seed vão continuar válidos ao longo do tempo.

---

### BUG-SEED-ARQUIVO-SEPARADO — `seed-rastreamento.ts` viola Regra 6 do LIVRO DE REGRAS
**Data:** 27/03/2026 | **Severidade:** 🟡 Arquitetural | **Status:** 🚧 Em andamento

**Sintoma:** Arquivo `backend/prisma/seed-rastreamento.ts` foi criado como seed separado,
violando a Regra 6 do LIVRO DE REGRAS: "Um seed: `seed-full.ts` — nunca criar seeds adicionais".

**Causa:** Pressa na implementação. O arquivo também tem a função `interpolar()` declarada
mas nunca usada, causando warning de lint TypeScript (`declared but its value is never read`).

**Fix correto:**
1. Migrar todo o conteúdo para uma função `runSeed_rastreamento()` dentro de `seed-full.ts`
2. Chamar essa função no `main()` do `seed-full.ts`
3. Deletar `seed-rastreamento.ts`
4. Remover a função `interpolar()` que nunca foi usada

**Lição:**
> Sempre seguir a Regra 6. Seeds separados criam fragmentação, duplicação de lógica e
> inconsistência de dados. O `seed-full.ts` é o único ponto de verdade para dados de demo.

---

---

### BUG-DRAWER-TRANSFORM — DriverDrawer não trava no viewport (causa raiz real)
**Data:** 27/03/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido via F5.13 — React.createPortal em `admin/dashboard/page.tsx` (07/04/2026)

**Sintoma:** Ao clicar em um motorista, o DriverDrawer abre mas o usuário precisa scrollar para cima para vê-lo. O drawer não fica fixo na tela — ele se move com o scroll do conteúdo.

**Causa raiz — `transform` no ancestral cria novo containing block para `position: fixed`:**
O `BUG-DRAWER-SCROLL` anterior diagnosticou errado: o problema não é o scroll em `.admin-content`.
A causa real é que o `AdminDashboard` tem `className="animate-fade-in"`, e o `globals.css` define:
```css
.animate-fade-in {
    animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
}
```
O `fill-mode: both` mantém o estado `transform: translateY(0)` aplicado **permanentemente** após a animação terminar. Pela especificação CSS, qualquer elemento com `transform` (mesmo `translateY(0)`, que é visualmente nulo) cria um novo **containing block** para descendentes com `position: fixed`. O DriverDrawer com `position: fixed` é posicionado em relação a esse div animado, não ao viewport.

**Fix correto — `React.createPortal`:**
Mover o `DriverDrawer` para fora do contexto de `transform` via portal:
```tsx
// admin/dashboard/page.tsx — no return, ao invés de <DriverDrawer ... /> inline:
import { createPortal } from 'react-dom';

// No JSX, fora do div principal:
{typeof window !== 'undefined' && drawerDriver && createPortal(
    <DriverDrawer driver={drawerDriver} onClose={...} />,
    document.body
)}
```
Com `createPortal`, o DriverDrawer é renderizado diretamente no `document.body`, fora de qualquer ancestral com `transform`. O `position: fixed` passa a ser relativo ao viewport real.

**Lição para outros projetos:**
> `position: fixed` NÃO é sempre relativo ao viewport. Qualquer ancestral com `transform`, `filter`, `perspective` ou `will-change: transform` quebra o comportamento esperado.
> Para modais e drawers, sempre usar `createPortal(element, document.body)`.
> O `fill-mode: both` em animações CSS é especialmente traiçoeiro: mantém o estado final aplicado (incluindo `transform: translateY(0)`) para sempre após a animação terminar.

---

### BUG-STATUS-STALE — Status dos motoristas demo sempre "sem sinal"
**Data:** 27/03/2026 | **Severidade:** 🔴 Alta para apresentação | **Status:** ✅ Resolvido via F5.14 — BYPASS-DEMO-STATUS com token `[DEMO:status]` no campo `notes` da Trip (07/04/2026)

**Sintoma:** Todos os motoristas aparecem com ponto vermelho ("sem sinal") no mapa mesmo recém-rodado o seed.

**Causa raiz — dois problemas encadeados:**

**Problema A — O código de produção está correto e não deve ser alterado:**
```typescript
// driver-location.service.ts — getMotoristaAtivos()
const diffMin = (agora.getTime() - new Date(ultima.capturedAt).getTime()) / 60000;
if (diffMin <= 5)  status = 'online';
else if (diffMin <= 15) status = 'stopped';
// else: offline
```
Este cálculo é correto para produção. Motoristas reais enviam `POST /driver/location` a cada 3min — `capturedAt` sempre recente.

**Problema B — Motoristas do seed nunca enviam POST:**
Os `DriverLocation` gravados pelo seed têm `capturedAt = now - offset` no momento da execução. Após ~5min reais, o "ONLINE" vira STOPPED. Após ~15min, vira OFFLINE. O `--refresh-drivers` resolve por alguns minutos mas é impraticável durante apresentação.

**Bypass proposto (mesmo padrão do BYPASS-DEMO-ALERTAS):**
Gravar token `[DEMO:online]`, `[DEMO:stopped]` ou `[DEMO:offline]` no campo `notes` da Trip.
No `getMotoristaAtivos()`, após calcular o status pelo tempo, verificar se `trip.notes` contém o token e sobrepor:
```typescript
// BYPASS-DEMO-STATUS — remover para produção (ver ESTADO_SISTEMA.md)
const demoMatch = trip.notes?.match(/\[DEMO:(online|stopped|offline)\]/);
if (demoMatch) status = demoMatch[1] as typeof status;
// FIM BYPASS-DEMO-STATUS
```
O código real de produção fica comentado acima do bypass com instrução clara de remoção.

**Como remover para produção:** Apagar o bloco marcado com `// BYPASS-DEMO-STATUS`.

---

### BUG-COMPLETED-MAPA — Motorista some do mapa ao concluir trip
**Data:** 27/03/2026 | **Severidade:** 🟡 Comportamento incorreto | **Status:** ✅ Resolvido via F5.15 — query bifurcada: IN_TRANSIT normal + COMPLETED <24h com pin cinza (07/04/2026)

**Sintoma:** João Motorista concluiu a viagem (Trip → COMPLETED) e sumiu completamente do mapa. O comportamento correto seria ele permanecer visível com sua última localização conhecida até iniciar uma nova viagem.

**Causa raiz — `getMotoristaAtivos()` filtra apenas `IN_TRANSIT`:**
```typescript
// driver-location.service.ts
const trips = await this.prisma.trip.findMany({
    where: { status: 'IN_TRANSIT', driverUserId: { not: null } },
    ...
```
Motorista sem trip `IN_TRANSIT` = invisível, mesmo que tenha `DriverLocation` recente.

**Comportamento correto para produção:**
- Trip `IN_TRANSIT` → aparece no mapa com status calculado normalmente
- Trip `COMPLETED` recente (< 24h) + `DriverLocation` recente → aparece como `offline` com última posição conhecida (motorista acabou de chegar, ainda está no destino)
- Sem nenhuma `DriverLocation` nas últimas 24h → não aparece

**Fix correto — não é bypass, é melhoria de regra de negócio:**
```typescript
// Inclui também motoristas com DriverLocation recente (<24h) mesmo sem trip IN_TRANSIT
// Permite ver motorista que acabou de concluir antes de iniciar nova viagem
```

---

### BUG-OSRM-RATE-LIMIT — Rotas seguem linhas retas em vez das estradas reais
**Data:** 27/03/2026 | **Severidade:** 🔴 Alta para apresentação | **Status:** ✅ Resolvido via F5.16 — BYPASS-DEMO-OSRM: seed calcula rotas no Node.js e grava como DriverLocations (07/04/2026)

**Sintoma:** Todas as trilhas e rotas estimadas aparecem como linhas retas no mapa, ignorando estradas, rodovias e BR's. O OSRM está implementado corretamente no código mas não funciona na prática.

**Causa raiz — rate limit do OSRM público + volume de requisições simultâneas:**
`router.project-osrm.org` é uma API pública com rate limit severo (~1 req/s por IP).
O frontend faz chamadas simultâneas:
- 8 motoristas × segmentos da trilha GPS = 40-80+ chamadas OSRM simultâneas
- Todas falham com rate limit → `catch {}` → fallback `[from, to]` → linha reta
- `AbortSignal.timeout(8000)` pode lançar `TypeError` em browsers sem suporte → mesmo fallback

**Por que passou desapercebido:** O `routeOSRM()` tem `catch { return [from, to] }` silencioso. Rate limit = linha reta, sem qualquer log de erro visível.

**Bypass para demo (único que funciona de verdade):**
Calcular as rotas no **seed** (Node.js), sem CORS, sem rate limit de browser:
1. `seed-full.ts` chama OSRM do servidor para cada rota do motorista
2. Grava os pontos da rota pelas estradas como `DriverLocation` records espaçados
3. Frontend desenha polilinhas simples por esses pontos — zero chamada OSRM no browser

Isso é bypass de demo porque em produção a solução correta é outra (abaixo).

**Fix para produção (não é bypass):**
Backend calcula rota OSRM na criação/atualização da trip:
```typescript
// trip.service.ts — ao criar Trip ou ao chamar GET /driver/location/active
// Chama OSRM, cacheia no Redis por par (originCityId, destCityId)
// Retorna `routePoints: [lat, lng][]` na resposta do endpoint
```
Frontend apenas desenha os pontos recebidos — zero chamada OSRM no cliente.

**Lição para outros projetos:**
> NUNCA fazer dezenas de chamadas HTTP simultâneas para APIs públicas com rate limit no browser.
> APIs de roteamento (OSRM, Google Maps, Mapbox) devem ser chamadas no backend com cache.
> Fallbacks silenciosos (`catch { return default }`) escondem erros de rede — sempre logar.

---

---

### BUG-NEXTJS-PROXY-404 — Rotas `/api/*` interceptadas pelo Next.js retornam 404
**Data:** 07/04/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido

**Sintoma:** Ao clicar em "Baixar PDF" do certificado, o browser recebia `404 Not Found` em vez do arquivo.
O certificado existia no banco e o endpoint `/api/certificates/download/:code` estava correto no backend.

**Causa raiz — Next.js intercepta `/api/*` antes de chegar ao backend:**
Sem configuração de proxy, o Next.js 14 App Router trata qualquer rota que comece com `/api/` como uma
API Route interna. Como não existia `app/api/certificates/...` no frontend, retornava 404 — nunca
chegava ao backend NestJS na porta 3001.

**Fix — `rewrites()` em `next.config.js`:**
```javascript
// frontend/next.config.js
async rewrites() {
    return [
        {
            source: '/api/:path*',
            destination: 'http://localhost:3001/api/:path*',
        },
    ];
},
```
Com isso, qualquer chamada `/api/*` do frontend é transparentemente redirecionada para o NestJS em `:3001`.

**Lembra ete:** Reiniciar o servidor Next.js após alterar `next.config.js` (qualquer mudança nesse arquivo requer restart).

**Lição para outros projetos:**
> Em desenvolvimento local com Next.js + backend separado, rotas `/api/*` precisam de proxy explícito.
> Alternativas: `NEXT_PUBLIC_API_URL` aponta direto para `:3001` (sem prefixo `/api`) OU usar `rewrites()` no `next.config.js`.
> Sem proxy, funciona apenas quando frontend e backend estão na mesma origem (produção com Nginx).

---

### BUG-FILEURL-VAZIO — `Certificate.fileUrl` vazio, download retorna erro
**Data:** 07/04/2026 | **Severidade:** 🔴 Alta | **Status:** ✅ Resolvido

**Sintoma:** Certificados emitidos antes de 07/04/2026 tinham `fileUrl = ''` no banco.
Ao tentar baixar o PDF, o link era invlidado. Novos certificados emitidos após a feature
também tinham `fileUrl = ''` porque o `CertificateService.issueCertificate()` não prenchia o campo.

**Causa raiz — campo não preenchido na emissão:**
```typescript
// certificate.service.ts (antes do fix)
await this.prisma.certificate.create({
    data: {
        ...,
        fileUrl: '', // ← sempre vazio — endpoint não existia ainda
    }
});
```

**Fix — preencher fileUrl na emissão e corrigir registros antigos:**
```typescript
// certificate.service.ts — após o fix
fileUrl: `/api/certificates/download/${verificationCode}`,
```

Para corrigir registros antigos, script Node.js foi executado:
```typescript
// Busca todos com fileUrl = '' e preenche com a URL correta
const certs = await prisma.certificate.findMany({ where: { fileUrl: '' } });
for (const cert of certs) {
    await prisma.certificate.update({
        where: { id: cert.id },
        data: { fileUrl: `/api/certificates/download/${cert.verificationCode}` },
    });
}
```

**Licao para outros projetos:**
> Campos computados (URL, código derivado, etc.) devem ser preenchidos no momento da criação do registro,
> nunca deixados vazios para "preencher depois". Se a feature não existe ainda, use `null` em vez de `''`
> para que seja fácil de identificar e filtrar.

---

| ID | Bug | Categoria | Data | Status |
|----|-----|-----------|------|--------|
| BUG-DASH-01 | Taxa de Aprovação 0% — conta APPROVED transitório em vez de ENROLLED final | Analytics | 27/03 | ✅ |
| BUG-DASH-02 | Certificados 0 — frontend lê enrollments, não tabela Certificate | Analytics | 27/03 | ✅ |
| BUG-SESSION-01 | Mesclagem de perfis entre abas — localStorage compartilhado entre tabs | Auth | 27/03 | ✅ |
| BUG-DRAWER-SCROLL | DriverDrawer não fixa tela — `body.overflow` não resolve pois scroll está em `.admin-content` | Frontend | 27/03 | ✅ via F5.13 |
| BUG-DRAWER-TRANSFORM | DriverDrawer não fixa no viewport — `animate-fade-in` cria stacking context via `transform` | Frontend | 27/03 | ✅ via F5.13 |
| BUG-STATUS-STALE | Status sempre "sem sinal" — seed envelhece, código correto mas sem mecanismo de bypass de demo | Backend/Seed | 27/03 | ✅ F5.14 |
| BUG-COMPLETED-MAPA | Motorista some do mapa ao concluir trip — comportamento incorreto para produção | Backend | 27/03 | ✅ F5.15 |
| BUG-OSRM-RATE-LIMIT | Linhas retas no mapa — OSRM público rate-limita dezenas de req simultâneas do browser | Frontend | 27/03 | ✅ F5.16 |
| BUG-SEED-STALE | Seed de rastreamento envelhece — status muda de ONLINE→OFFLINE passados 15min | Seed | 27/03 | ✅ substituído por F5.14 |
| BUG-SEED-ARQUIVO-SEPARADO | `seed-rastreamento.ts` criado violando Regra 6 do LIVRO DE REGRAS | Seed | 27/03 | ✅ RESOLVIDO |
| BUG-NEXTJS-PROXY-404 | /api/* interceptado pelo Next.js — retornava 404 sem chegar no NestJS | Frontend/Infra | 07/04 | ✅ |
| BUG-FILEURL-VAZIO | Certificate.fileUrl = '' — download de PDF retornava link inválido | Backend | 07/04 | ✅ |
| BUG-KANBAN-01 | Kanban sem validação de transições — estados finais arrastáveis | Frontend/Backend | 25/03 | ✅ |
| BUG-KANBAN-02 | Toast genérico — `catch` não inspecionava `err.response.data.message` | Frontend | 25/03 | ✅ |
| BUG-CHECKIN-01 | `POST /teachers/me/checkin` endpoint inexistente | Backend | 25/03 | ✅ |
| BUG-ROTA-CAPTURE | Rotas literais capturadas por `:id` (NestJS order matters) | Backend | 23/03 | ✅ |
| BUG-ROLES-GUARD | `@Roles()` sem `@UseGuards(RolesGuard)` = zero proteção | Backend/Segurança | 23/03 | ✅ |
| BUG-SWITCH-SILENT | Switch sem default explícito altera estado silenciosamente | Backend | 25/03 | ✅ |
| BUG-GET-STATUS-ARRAY | `?status[]=A&status[]=B` não suportado pelo backend | Backend | 25/03 | ✅ |
| BUG-SIDEBAR-DUPLA | Dois itens do sidebar ativos simultâneos | Frontend | 23/03 | ✅ |
| BUG-MODAL-OVERFLOW | Body não bloqueia scroll ao abrir modal | Frontend | 23/03 | ✅ |
| BUG-MODAL-POSITION | Modal cortado com `position: absolute` | Frontend | 23/03 | ✅ |
| BUG-ARRAY-RESPONSE | `res.data` assume array mas API retorna `{ data, meta }` | Frontend | 23/03 | ✅ |
| BUG-LOGOUT-PARTIAL | Logout não limpava storage — botão voltar relogava | Auth | 23/03 | ✅ |
| BUG-ARROW-JSX | Arrow function JSX sem bloco em múltiplos statements | Frontend | 23/03 | ✅ |
| BUG-FREQ-RESET | Frequência resetava para todos presentes ao reabrir dia salvo | Frontend | 07/04 | ✅ |
| BUG-ENUM-LABEL | Enum técnico exibido diretamente na UI sem mapa de labels | Frontend | 23/03 | ✅ |
| BUG-NOTIF-SEM-HIST | Notificações sumiam ao recarregar — sem carga histórica | Frontend | 23/03 | ✅ |
| BUG-UTC-DATE | Frequência no dia errado por timezone — `new Date()` sem UTC | Prisma | 23/03 | ✅ |
| BUG-DECIMAL-STRING | Prisma retorna Decimal como string — soma dava NaN | Prisma | 23/03 | ✅ |
| BUG-SOFT-DELETE | Hard delete em entidades de negócio — sem histórico | Prisma | 23/03 | ✅ |
| BUG-PRISMA-STALE | `(prisma as any).model` — client desatualizado após schema change | Prisma | 23/03 | ✅ |
| BUG-BOM-MASSA | BOM em 122+ arquivos — P1012 Prisma + build quebrado | Encoding | 25/03 | ✅ |
| BUG-UTF8-DOUBLE | Textos `â€"` no banco — double-encoding UTF-8→Latin-1 | Encoding | 25/03 | ✅ |
| BUG-UTF8-ARQUIVO | Arquivo `.tsx` salvo em Windows-1252 — chars corrompidos na UI | Encoding | 25/03 | ✅ |
| BUG-PORTA-3002 | Backend na porta errada — variável `PORT` na sessão | Infra | 18/03 | ✅ |
| BUG-PORT-01 | `EADDRINUSE` porta em uso — duas instâncias do mesmo servidor | Infra | 07/04 | ✅ |
| BUG-SEED-SCRIPT | `prisma:seed` apontava para arquivo inexistente | Infra | 23/03 | ✅ |
| BUG-REDIS-NOAUTH | Redis sem senha — acesso não autenticado | Segurança | 23/03 | ✅ |
| BUG-POSTGRES-ENC | PostgreSQL sem locale `pt_BR.UTF-8` — acentos corrompidos | Infra | 13/03 | ✅ |
| BUG-NESTJS-VERSOES | Pacotes `@nestjs/*` v10 e v11 misturados | Infra | 23/03 | ⚠️ |

---

## 🧠 LIÇÕES UNIVERSAIS (aplicar em qualquer projeto)

1. **State machines**: Nunca contar estados transitórios como métrica final. Identificar quais estados representam "conclusão do evento".
2. **KPIs de dashboard**: Cada métrica deve ser rastreada até tabela/campo exatos. Nunca inferir de outra entidade.
3. **Auth em múltiplas abas**: sessionStorage (por aba) vs localStorage (compartilhado por origem). Auth → sessionStorage sempre.
4. **Zustand persist**: Padrão usa localStorage. Sobrescrever com `createJSONStorage(() => sessionStorage)` para auth.
5. **NestJS route order**: Rotas literais SEMPRE antes de parâmetros dinâmicos (`:id`).
6. **NestJS guards**: `@Roles()` + `@UseGuards(RolesGuard)` sempre juntos. Um sem o outro = zero proteção.
7. **Switch de estado**: O `default` deve SEMPRE lançar exceção explícita — nunca ação silenciosa.
8. **Datas sem hora**: Sempre `new Date(Date.UTC(y, m-1, d))` — nunca `new Date(string)` para datas de negócio.
9. **API formats**: Documentar explicitamente: array direto vs `{ data, meta }`. Criar helper de normalização.
10. **UTF-8 / BOM**: Configurar editor para UTF-8 sem BOM. Ter script de limpeza de BOM no projeto.
11. **Soft delete**: Toda entidade de negócio com `active Boolean @default(true)`. Nunca `.delete()`.
12. **Prisma generate**: Sempre rodar após alterar schema — nunca usar `(prisma as any)`.
13. **Toast de erro**: Sempre `catch (err: any) { toast.error(err?.response?.data?.message || 'Erro') }`.
14. **Modais**: `position: fixed` + `inset: 0` + bloquear/restaurar `body.overflow` no abrir/fechar.
15. **Endpoint fantasma**: Verificar existência no Swagger/backend antes de criar chamada no frontend.
16. **EADDRINUSE (porta em uso)**: Node.js não compartilha portas. Uma porta, um processo. Se der este erro, identifique o PID com `netstat -ano | findstr ":PORTA"` e mate com `Stop-Process -Id <PID> -Force`. Nunca é vírus — quase sempre é você mesmo rodando dois servidores.

---

---

## 🔴 VULNERABILIDADES CRÍTICAS DESCOBERTAS — AUDITORIA 07/04/2026
## Encontradas por: Claude (Auditor) via testes passivos — zero linha de código alterada

---

### SEC-MASS-ASSIGNMENT — Privilege Escalation via PATCH /users/me ⚠️ P0 CRÍTICO
**Data:** 07/04/2026 | **Severidade:** 🔴 CRÍTICO | **Status:** ❌ PENDENTE CORREÇÃO

**Reprodução confirmada (passiva — sem alterar código):**
```http
POST /api/auth/login { email: "qualqueruser@...", password: "..." }
→ access_token: eyJ...  (role: STUDENT no JWT)

PATCH /api/users/me
Authorization: Bearer <token_student>
Content-Type: application/json
{ "name": "Hacker", "role": "ADMIN" }

→ HTTP 200 OK
→ { "id": "...", "email": "...", "role": "ADMIN" }

POST /api/auth/login (novamente)
→ access_token com role: ADMIN no JWT

GET /api/dashboard/stats
Authorization: Bearer <novo_token>
→ HTTP 200 OK — acesso total como ADMIN
```

**Causa raiz — dupla falha:**

1. **`users.service.ts` `update()` não sanitiza o campo `role`:**
```typescript
// VULNERÁVEL — o Prisma recebe o data inteiro do request body
async update(id: string, data: { name?: string; phone?: string; active?: boolean }) {
    return this.prisma.user.update({ where: { id }, data }); // ← data inclui role!
}
```
O tipo TypeScript é só compile-time. Em runtime, o body enviado pelo cliente inclui `role: 'ADMIN'` e o Prisma persiste sem questionar.

2. **`ValidationPipe global` com `whitelist:true` NÃO funciona sem DTO class-validator:**
```typescript
// main.ts — parece proteger, mas NÃO protege rotas sem DTO formal
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
```
O whitelist funciona apenas quando o body é validado contra uma classe com decorators `@IsString()`, `@IsEmail()` etc. Sem um DTO formal, o ValidationPipe passa o body inteiro ao handler.

**Impacto:** QUALQUER usuário registrado pode se tornar ADMIN com uma única chamada HTTP. Sistema B2G com dados de alunos vulneráveis sociais = violação LGPD + risco contratual.

**Fix necessário (sem alterar comportamento normal):**
```typescript
// users.service.ts — filtrar explicitamente campos permitidos
async update(id: string, data: any) {
    const safeData: { name?: string; phone?: string; active?: boolean } = {};
    if (data.name   !== undefined) safeData.name   = data.name;
    if (data.phone  !== undefined) safeData.phone  = data.phone;
    if (data.active !== undefined) safeData.active = data.active;
    // 'role', 'email', 'password', 'twoFactorSecret' NUNCA aceitos aqui
    return this.prisma.user.update({ where: { id }, data: safeData, select: {...} });
}
```
**OU** criar DTO formal com `class-validator` para o endpoint `PATCH /users/me`.

**Lição:** TypeScript types são compile-time only. Runtime = JavaScript puro. Qualquer campo pode chegar no body. Sempre filtrar explicitamente ou usar DTO com `class-validator`.

---

### SEC-IDOR-01 — GET /users/:id sem verificação de identidade ⚠️ P1 ALTO
**Data:** 07/04/2026 | **Severidade:** 🔴 Alta | **Status:** ❌ PENDENTE CORREÇÃO

**Reprodução confirmada:**
```http
GET /api/users/3274c92c-8208-439d-9fe7-37c866d21aef
Authorization: Bearer <token_de_qualquer_usuario>

→ HTTP 200 OK
→ { "id": "...", "email": "admin@qualifica.com", "name": "Administrador", "role": "ADMIN", ... }
```
Qualquer usuário autenticado (STUDENT, DRIVER, TEACHER) consegue buscar dados de QUALQUER outro usuário sabendo o UUID.

**Causa raiz — `GET /users/:id` sem `@Roles()`:**
```typescript
// users.controller.ts — linha 82
@Get(':id')
@ApiOperation({ summary: 'Get user by ID' })
// ← FALTA @Roles('ADMIN', 'COORDINATOR') aqui!
async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
}
```
O controlador usa `@UseGuards(JwtAuthGuard, RolesGuard)` na classe, mas sem `@Roles()` no método, o `RolesGuard` deixa passar (sem roles requeridas = livre para qualquer autenticado).

**Impacto:** Qualquer usuário logado pode listar emails, nomes e roles de todos os usuários do sistema. Em um sistema com CPFs e dados sensíveis, isso é uma violação LGPD direta.

**Fix:**
```typescript
@Get(':id')
@Roles('ADMIN', 'COORDINATOR')  // ← adicionar esta linha
async findOne(@Param('id') id: string) { ... }
```
Ou, para permitir que o usuário veja apenas seus próprios dados:
```typescript
@Get(':id')
async findOne(@Param('id') id: string, @Request() req: any) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'COORDINATOR' && req.user.id !== id) {
        throw new ForbiddenException('Acesso negado');
    }
    return this.usersService.findOne(id);
}
```

---

### SEC-ALUNO-ADMIN — aluno@qualifica.com com role ADMIN no banco ⚠️ P0 CRÍTICO
**Data:** 07/04/2026 | **Severidade:** 🔴 CRÍTICO | **Status:** ❌ PENDENTE CORREÇÃO

**Descoberto via query direta:**
```sql
SELECT email, role FROM users WHERE email = 'aluno@qualifica.com';
-- → role: ADMIN (deveria ser STUDENT)
```
O usuário `aluno@qualifica.com` — que deveria ser um aluno de teste — tem `role: ADMIN` no banco.

**updatedAt:** `2026-04-07T20:31:15.006Z` — foi alterado durante a auditoria de hoje, confirmando que a vulnerabilidade SEC-MASS-ASSIGNMENT foi explorada antes desta auditoria (ou durante testes anteriores).

**Causa:** O seed cria o usuário como STUDENT, mas em algum momento foi feito `PATCH /users/me { role: 'ADMIN' }` com o token desse usuário, explorando a SEC-MASS-ASSIGNMENT.

**Impacto:** Credencial `aluno@qualifica.com / RR@@Upgrade` (documentada publicamente no SEEDS_GUIDE.md) dá acesso de ADMIN ao sistema. Qualquer pessoa com acesso à documentação pode logar como admin.

**Fix imediato (após corrigir o mass assignment):**
```sql
UPDATE users SET role = 'STUDENT' WHERE email = 'aluno@qualifica.com';
```
E adicionar ao `seed-full.ts` uma verificação que força a role correta para cada usuário de teste durante o seed.

---

### SEC-NOAUTH-BRUTE — Sem proteção contra brute force em /auth/login ⚠️ P1 ALTO
**Data:** 07/04/2026 | **Severidade:** 🟠 Alta | **Status:** ❌ PENDENTE CORREÇÃO

**Confirmado:** 15 tentativas de login com senhas erradas, nenhum bloqueio. Tempo médio de resposta: 51ms (sem throttle progressivo, sem captcha, sem lockout).

**Risco:** Em produção com credenciais reais de administradores, permite:
- Dicionário de senhas
- Credential stuffing
- Força bruta em contas sem 2FA

**Fix recomendado:** Biblioteca `@nestjs/throttler` ou middleware de rate limiting por IP + por email:
```typescript
// app.module.ts
ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]) // 5 tentativas/min

// auth.controller.ts
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
async login(...) { ... }
```

---

### SEC-SWAGGER-OPEN — Swagger UI acessível sem autenticação ⚠️ P2 MÉDIO
**Data:** 07/04/2026 | **Severidade:** 🟡 Médio | **Status:** ❌ PENDENTE CORREÇÃO (pré-produção)

**Confirmado:** `GET /api/docs` e `GET /api/docs-json` retornam 200 sem autenticação. O Swagger expõe toda a estrutura da API, DTOs, parâmetros, respostas de exemplo e endpoints internos.

**Risco:** Em produção, dá ao atacante um mapa completo do sistema para planejar ataques.

**Fix:**
```typescript
// main.ts — proteger Swagger com autenticação básica em produção
if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('api/docs', app, document);
}
// Ou proteger com middleware de basic auth
```

---

### SEC-CSP-AUSENTE — Content-Security-Policy não configurada ⚠️ P2 MÉDIO
**Data:** 07/04/2026 | **Severidade:** 🟡 Médio | **Status:** ❌ PENDENTE (pré-produção)

**Confirmado:** Header `Content-Security-Policy` ausente nas respostas do backend. O Helmet foi configurado com `contentSecurityPolicy: false` para o Swagger funcionar, mas isso deixa o frontend sem proteção contra XSS via injeção de scripts externos.

**Outros headers presentes (OK):** `x-content-type-options: nosniff`, `x-frame-options: SAMEORIGIN`, `x-xss-protection: 0` (correto per spec moderna).

**Fix:** Configurar CSP específica para produção, removendo a desativação total:
```typescript
helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "*.openstreetmap.org"],
        }
    }
})
```

---

## 📊 RESUMO AUDITORIA 07/04/2026

| ID | Vulnerabilidade | Severidade | Exploração Confirmada | Status |
|----|----------------|------------|----------------------|--------|
| SEC-MASS-ASSIGNMENT | PATCH /users/me aceita `role` no body | 🔴 P0 CRÍTICO | ✅ SIM — STUDENT→ADMIN em 1 request | ❌ PENDENTE |
| SEC-IDOR-01 | GET /users/:id sem @Roles() | 🔴 P1 ALTO | ✅ SIM — qualquer user vê qualquer outro | ❌ PENDENTE |
| SEC-ALUNO-ADMIN | aluno@qualifica.com tem role ADMIN | 🔴 P0 CRÍTICO | ✅ SIM — banco confirmado | ❌ PENDENTE |
| SEC-NOAUTH-BRUTE | Sem rate limit em /auth/login | 🟠 P1 ALTO | ✅ SIM — 15 req sem bloqueio | ❌ PENDENTE |
| SEC-SWAGGER-OPEN | Swagger exposto sem auth | 🟡 P2 MÉDIO | ✅ SIM — /api/docs público | ❌ PRÉ-PROD |
| SEC-CSP-AUSENTE | Content-Security-Policy ausente | 🟡 P2 MÉDIO | — | ❌ PRÉ-PROD |

**Método de auditoria:** 100% passivo — zero linha de código alterada, zero dado de produção comprometido, zero downtime. Scripts Node.js de teste descartáveis.

**Arquivos de teste usados (descartar após auditoria):**
- `C:\Users\Desktop\Downloads\pentest_run.js`
- `C:\Users\Desktop\Downloads\pentest_deep.js`

---

*Sistema Upgrade | RR TECNOL | v9.3 | 07/04/2026*
*Catálogo enriquecido para reutilização em outros projetos — Obsidian ready*
*Novos bugs 07/04: BUG-NEXTJS-PROXY-404, BUG-FILEURL-VAZIO, BUG-FREQ-RESET (todos resolvidos)*
