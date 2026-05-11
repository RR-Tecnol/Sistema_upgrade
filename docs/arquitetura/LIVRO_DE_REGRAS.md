# 🛡️ LIVRO DE REGRAS — Sistema Upgrade
## Regras Imutáveis | v7.0 | 25/03/2026 — Sistema Completo e Fechado
## Não violar sem autorização do Tech Lead (Davi / Ronaldo)

> **GRAVITY:** Leia ESTE arquivo INTEIRO antes de escrever qualquer linha de código.
> As regras aqui existem porque cada uma delas já quebrou algo neste projeto.

---

## 🔗 REFERÊNCIAS CRUZADAS

> **Leia junto com este arquivo:**
> - [`sobre-sistema.md`](./sobre-sistema.md) — arquitetura completa e contexto de cada regra
> - [`ESTADO_SISTEMA.md`](./ESTADO_SISTEMA.md) — o que está ativo, pendente e quais bypasses existem hoje
> - [`ERROS_E_SOLUCOES.md`](../seguranca/ERROS_E_SOLUCOES.md) — catálogo de bugs que originaram estas regras
> - [`PROX-PASSOS.md`](./PROX-PASSOS.md) — roadmap de execução com referências às regras
>
> **Relações por seção:**
> | Seção | Doc relacionada |
> |-------|-----------------|
> | §1 UI/UX | `REGRAS_RESPONSIVIDADE_PORTAL_MOTORISTA.md` (regras específicas do portal /driver) |
> | §3 Banco/Prisma | `sobre-sistema.md §3` (schema.prisma detalhado) · `SEEDS_GUIDE.md` |
> | §4 Uploads/Storage | `sobre-sistema.md §11.2` (fluxo MinIO Reembolso) |
> | §5 Autenticação | `sobre-sistema.md §10` (decisões de segurança) · `ERROS_E_SOLUCOES.md#auth` |
> | §6 WebSocket | `sobre-sistema.md §8` (eventos WS entre perfis) |
> | §7 Enums | `sobre-sistema.md §13` (mapa completo de enums) |
> | §8 Anti-Padrões | `ERROS_E_SOLUCOES.md` (cada anti-padrão tem um bug correspondente) |
> | §8G GPS | `RASTREAMENTO_PRODUCAO_APRESENTACAO.md` |
> | §10 Regras de Negócio | `sobre-sistema.md §14` (tabela consolidada com valores e fontes) |

---

## 1. UI/UX e Frontend

- **Design System:** Tailwind CSS + classes customizadas em `globals.css`. Cores institucionais: amarelo (#FFD600), preto, branco.
- **Sem redesign sem autorização:** Nunca alterar identidade visual de componentes existentes.
- **Novas páginas:** Herdam layout base (Sidebar, Header, Cards) já implementados.
- **Responsividade obrigatória:** Usar classes de grid do `globals.css`:
  - `grid-4-cols` → 4 cols desktop, 2 em ≤1024px, 1 em ≤768px
  - `grid-3-cols` → 3 cols desktop, 1 em ≤768px
  - `grid-2-cols` → 2 cols desktop, 1 em ≤768px
- **Touch-friendly:** Todo botão/input = `min-height: 44px, min-width: 44px`
- **Anti-zoom iOS:** Inputs devem ter `font-size: 16px` no mobile.
- **Sidebar mobile:** Em `< 768px`, sidebar some → botão hamburger aparece. Hamburger usa `className="md:hidden"`.
- **Upload de foto:** `capture="environment"` no `<input type="file">` + `browser-image-compression` (max 0.5MB, 1200px).
- **Modais SEMPRE `position: fixed`:** Nunca `position: absolute` em modais. Usar `inset: 0` + `display:flex; alignItems:center; justifyContent:center`. Ao abrir: `document.body.style.overflow = 'hidden'`. Ao fechar: `document.body.style.overflow = ''`.
- **Animações:** Todo novo componente deve ter `className="animate-fade-in"` no wrapper raiz.
- **Preferência de animações:** `useAnimacoes()` hook nos 4 layouts aplica `body.no-animations` quando `preferences.animacoes === false`.
- **`console.log/error` proibido no frontend:** Usar `toast.error()` para erros ao usuário. Remover qualquer `console.error` antes de commitar.


---

## 2. Padrões de Código Backend (NestJS)

- **Arquitetura modular:** Todo novo recurso = seu próprio Module, Controller, Service e DTOs.
- **Validação estrita:** Todos os payloads de entrada devem usar `class-validator`. Nenhuma requisição passa sem tipagem.
- **Rotas protegidas:** Toda rota usa `@UseGuards(JwtAuthGuard)` + `@Roles()` quando aplicável.
- **RolesGuard obrigatório junto com @Roles():** `@Roles('ADMIN')` sem `@UseGuards(RolesGuard)` = NÃO tem efeito.
- **Ordem de rotas literais:** `@Get('my')`, `@Get('me')`, `@Get('all')` SEMPRE antes de `@Get(':id')`.
- **Dependências entre módulos:** `ModuleA` que injeta `ServiceB` DEVE declarar `ModuleB` em `imports[]`.
- **Módulos @Global():** `SettingsModule` e `NotificationsModule` são globais — NÃO precisam ser declarados em `imports[]`.
- **Imports mortos proibidos:** Nunca deixar `import` em `.module.ts` sem usar no array `imports[]`.
- **`return` explícito obrigatório:** Todo método de service que monta objeto de resposta DEVE ter `return` explícito.
- **BOOM:** Antes de qualquer commit, `npx tsc --noEmit` deve passar com zero erros.
- **`console.log` proibido no backend:** Usar `new Logger(NomeClasse.name)`.
- **NestJS versões:** Todos os pacotes `@nestjs/*` DEVEM ser da mesma versão major. Nunca misturar v10 com v11.
- **Switch no controller:** DEVE cobrir TODOS os status possíveis. `default` lança `BadRequestException` explícita.
- **`GET /classes` por status:** Backend aceita apenas UM status como string. Para múltiplos, usar `teacherUserId` ou requests separados.

---

## 3. Banco de Dados (Prisma / PostgreSQL)

- **Nunca hard delete:** Usar `active: boolean = false` (soft delete).
- **Nunca Float para dinheiro:** SEMPRE `Decimal` no Prisma / `NUMERIC(12,2)` no PostgreSQL.
- **Migrations apenas:** Nunca usar `sync({ alter: true })`. Apenas `npx prisma migrate dev`.
- **Após alterar schema:** SEMPRE rodar `npx prisma generate` antes de usar o Prisma Client.
- **IDs:** UUID (`@default(uuid())`). Nunca SERIAL ou auto-increment.
- **Soft delete obrigatório:** Todo model deve ter `active Boolean @default(true)`.
- **Timestamps obrigatórios:** Todo model tem `createdAt @default(now())` e `updatedAt @updatedAt`.
- **Normalização de datas:** Datas de frequência SEMPRE `new Date(Date.UTC(y, m-1, d))`.
- **Decimal como string:** Prisma retorna Decimal como string. No frontend: `Number(v).toFixed(2)`.
- **Encoding:** Container PostgreSQL DEVE ter `POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"`.
- **Dados legados UTF-8:** Se banco tiver dados double-encoded, usar `prisma/fix-utf8-notifications.ts` como referência.
- **Schema sem BOM:** Usar `fix-bom.ps1` se `prisma db push` der erro P1012.

---

## 4. Uploads e Storage

- **Tudo vai para o MinIO:** Nunca salvar no disco local do container.
- **Presigned URLs:** Upload direto do browser/celular para o MinIO.
- **Nunca delete físico:** Arquivos no MinIO apenas desativados, nunca deletados.
- **`MinioService` singleton:** `@Injectable()` + `OnModuleInit`. Nunca `new Client()` dentro de método.

---

## 5. Autenticação e Segurança

- **`req.user.id` SEMPRE:** Nunca usar `req.user.sub` nos controllers.
- **`@Roles()` + `@UseGuards(RolesGuard)` sempre juntos.**
- **2FA obrigatório para:** ADMIN e COORDINATOR.
- **Registro público:** `role: 'STUDENT'` hardcoded — nunca aceitar role do body.
- **Logout completo:** Remover `token`, `user`, `student`, `auth-storage` do localStorage E atualizar Zustand.
- **Tela de login:** NUNCA exibir credenciais de teste. Campos apenas email + senha.
- **Auth state em sessionStorage:** `useAuthStore` usa sessionStorage via `createJSONStorage(() => sessionStorage)`. **NUNCA mudar para localStorage** — causa mesclagem de dados entre abas do browser (BUG-SESSION-01).

---

## 6. WebSocket e Notificações

- **Gateway único:** `NotificationsGateway` em `backend/src/notifications/`.
- **Namespace:** Sempre `/notifications`.
- **WS fora de `$transaction`:** try/catch SEPARADO. Falha WS NUNCA causa rollback.
- **Notificações persistidas:** Hook carrega histórico do banco ao montar (`GET /notifications`).
- **Eventos registrados:** `nova_inscricao`, `inscricao_aprovada`, `inscricao_rejeitada`, `frequencia_registrada`, `imprevisto_cadastrado`, `reembolso_solicitado`, `reembolso_revisado`, `custo_excessivo`.

---

## 7. Enums e Contratos de API

- **`UserRole`:** `ADMIN | COORDINATOR | FINANCIAL | TEACHER | STUDENT | DRIVER` — NUNCA `SUPER_ADMIN`.
- **`ReimbursementType`:** `CLASSROOM_MATERIAL | CLEANING_MATERIAL | EMERGENCY_REPAIR | FOOD | OTHER`.
- **`TruckType`:** `STANDARD | MULTICOURSE`.
- **API paginada:** Reembolso retorna `{ data: [], meta: {} }`. Inscrições retornam array direto.
- **`GET /employees`:** retorna `{ employees: [], total, byRole, byDept }` — não array direto.
- **Transições de inscrição:** Validar com `VALID_TRANSITIONS` matrix ANTES de chamar API.


---

## 8. Anti-Padrões Proibidos — Catálogo Completo (v7.0)

### 8A. BANCO DE DADOS E PRISMA

| Anti-Padrão | Por que é errado | Como fazer certo |
|-------------|-----------------|-----------------|
| `Float` para dinheiro | arredondamento binário | `Decimal @db.Decimal(12,2)` |
| `DELETE FROM` / `.delete()` sem soft delete | perde histórico, viola LGPD | `UPDATE SET active=false` |
| `$transaction()` com WS dentro | falha WS causa rollback | WS em try/catch SEPARADO |
| `findMany` sem `where` em tabela grande | timeout/OOM | sempre filtros + `take: N` |
| `(this.prisma as any).modelo` | client desatualizado | `npx prisma generate` |
| `new Date(isoString)` sem UTC | duplicatas no unique constraint | `new Date(Date.UTC(y, m-1, d))` |
| Schema sem `active` | sem soft delete | `active Boolean @default(true)` |
| Dados com double-encoding UTF-8 | texto corrompido na UI | `fix-utf8-notifications.ts` como referência |

### 8B. NESTJS E BACKEND

| Anti-Padrão | Por que é errado | Como fazer certo |
|-------------|-----------------|-----------------|
| `@Roles()` sem `@UseGuards(RolesGuard)` | zero proteção real | sempre usar os dois juntos |
| `@Get(':id')` antes de rotas literais | NestJS captura "my"/"me" como `:id` | literais SEMPRE antes de `:id` |
| `req.user.sub` em controllers | JwtStrategy retorna `id`, não `sub` | `req.user.id` sempre |
| Switch sem todos os cases | status não mapeado → comportamento silencioso | cobrir TODOS; default lança `BadRequestException` |
| `GET /classes?status[]=A&status[]=B` | backend aceita string, não array | usar `teacherUserId` ou requests separados |
| Endpoint chamado no frontend sem existir | 404/Cannot POST em produção | verificar Swagger antes de criar client |

### 8C. FRONTEND (Next.js / React)

| Anti-Padrão | Por que é errado | Como fazer certo |
|-------------|-----------------|-----------------|
| Mock hardcoded em produção | dados falsos em demo | criar endpoint real |
| `Array.isArray(res.data)` sem fallback | `{ data, meta }` retorna false → array vazio | `Array.isArray(res.data) ? res.data : (res.data?.data ?? [])` |
| `catch {}` sem inspecionar erro | toast genérico inútil | `catch (err: any) { toast.error(err?.response?.data?.message) }` |
| Kanban sem VALID_TRANSITIONS | drag qualquer→qualquer → 400 | matrix no frontend + validar antes de API |
| `body.overflow` sem reset no fechar | página fica sem scroll | sempre resetar `= ''` no onClose |
| Modal com `position: absolute` | rola com a página | `position: fixed; inset: 0` |
| Arrow function JSX com múltiplos statements sem bloco | "Unexpected token" | `onX={() => { setA(); setB(); }}` |
| `startsWith(href + '/')` no sidebar | ativa item pai quando filho tem match exato | `hasExactMatch` antes de verificar `startsWith` |
| `Array.isArray(res.data)` com endpoint que retorna objeto | `{ employees: [] }` não é array | `res.data?.employees ?? (Array.isArray(res.data) ? res.data : [])` |

### 8D. ENCODING E UTF-8

| Anti-Padrão | Por que é errado | Como fazer certo |
|-------------|-----------------|-----------------|
| PostgreSQL sem `pt_BR.UTF-8` | acentos corrompidos no banco | `POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"` |
| Concatenação de string com acento | pode corromper em edge cases | template literal `` `Manutenção: ${v}` `` |
| `toLocaleDateString()` sem locale | comportamento difere por navegador | sempre `toLocaleDateString('pt-BR')` |
| Salvar dados com double-encoding no banco | texto `â€"` em vez de `—` na UI | usar script `fix-utf8-notifications.ts` para corrigir |
| BOM em arquivos TypeScript/TSX | erro P1012 no Prisma, erro de build | usar `fix-bom.ps1` na raiz do projeto |

### 8E. SEGURANÇA

| Anti-Padrão | Por que é errado | Como fazer certo |
|-------------|-----------------|-----------------|
| Credenciais visíveis na tela de login | qualquer usuário vê as senhas | apenas campos email + senha |
| `@Roles()` sem `RolesGuard` | nenhuma verificação acontece | sempre pair `@Roles()` com `@UseGuards(RolesGuard)` |
| Aceitar `role` no body de registro | qualquer um cria conta ADMIN | `role: 'STUDENT'` hardcoded |
| Redis sem senha em produção | acesso não autenticado | `requirepass RR@@Upgrade` |

### 8F. ANALYTICS E DASHBOARD

| Anti-Padrão | Por que é errado | Como fazer certo |
|-------------|-----------------|-----------------|
| Contar status transitórios como métrica final | `APPROVED` some do banco quando vira `ENROLLED` — KPI sempre 0 | Contar todos os estados que representam "conclusão": `status IN ('APPROVED', 'ENROLLED')` |
| KPI de entidade A calculado via entidade B | Certificados contados via enrollment.status → sempre errado | Cada KPI consultado na sua tabela real: `certificate.count({ where: { status: 'ACTIVE' } })` |
| Inferir uma entidade a partir do estado de outra | `enrollment.status === 'APPROVED'` ≠ certificado emitido | Entidades separadas = contagens separadas |

### 8G. RASTREAMENTO GPS E MAPAS

| Anti-Padrão | Por que é errado | Como fazer certo |
|-------------|-----------------|-----------------|
| Chamar OSRM público do frontend com múltiplas requisições simultâneas | Rate limit ~1 req/s → todas retornam linha reta em silent catch | Backend calcula OSRM uma vez por par origem-destino, cacheia Redis 7 dias, retorna `routePoints` no endpoint |
| `position: fixed` em drawer/modal sem verificar ancestrais com `transform` | Ancestral com `transform` (inclusive `translateY(0)`) cria containing block → `position:fixed` não é mais relativo ao viewport | Usar `React.createPortal(element, document.body)` para sair do stacking context |
| `animate-fade-in` com `fill-mode: both` em ancestral de modal | `both` mantém `transform: translateY(0)` ativo permanentemente → quebra `position:fixed` em todos os descendentes | Portal resolve; ou criar keyframe separado sem `transform` no estado final |
| `catch {}` silencioso em chamadas de API críticas | Rate limit, timeout e erro de rede todos viram linha reta sem nenhum log | Sempre logar via `this.logger.warn()` no backend e `toast.error()` no frontend |
| Calcular status do motorista a partir de dado estático de seed | `capturedAt` gravado no seed envelhece → todos viram OFFLINE em 15min | Token `[DEMO:status]` no `notes` da Trip para demo; status real via `capturedAt` dinâmico em produção |
| Filtrar `getMotoristaAtivos()` apenas por `IN_TRANSIT` | Motorista que concluiu viagem some imediatamente do mapa — comportamento errado | Incluir também `DriverLocation` recente (<24h) sem trip `IN_TRANSIT` → aparecem como `offline` |
| Armazenar coordenadas GPS como `Float, Float` separadas | Dificulta queries geoespaciais, impossível usar PostGIS | `DriverLocation` com `latitude Float` + `longitude Float` está OK para o nível atual; para queries geo usar PostGIS futuramente |
| `AbortSignal.timeout()` e assumir que lança `AbortError` | Desde browsers modernos lança `TimeoutError` DOMException → `catch (e) { if (e.name === 'AbortError') }` não captura | Checar `e.name === 'TimeoutError'` OU usar `catch {}` genérico com log explícito |

---

| Termo na UI | Banco/Código | Descrição |
|-------------|-------------|-----------|
| Período de Curso / Rota | `Acao / acoes` | Operação de campo itinerante |
| Carreta | `Truck / trucks` | Veículo-escola itinerante |
| Aluno | `Student / students` | Beneficiário do programa |
| Turma | `Class / classes` | Instância de curso em data/local |
| Inscrição | `Enrollment / enrollments` | Solicitação para participar de turma |
| Funcionário | `Employee / employees` | Colaborador externo |
| Imprevisto | `Absence / absences` | Ausência/imprevisto multi-perfil |
| Preferências | `UserPreferences` | Configurações de UI por usuário |
| Frequência Funcionário | `EmployeeAttendance` | Presença diária de employees |
| Ponto Professor | `TeacherCheckin` | Check-in diário do professor |

---

## 10. Regras de Negócio

| Regra | Valor |
|-------|-------|
| Threshold de aprovação | 75% de frequência |
| Vagas de reserva padrão | 4 vagas |
| Diária de custo CLT | R$120/dia |
| Limite de distância passagem | 200km |
| 2FA obrigatório para | ADMIN e COORDINATOR |
| Senha padrão (dev/seed) | RR@@Upgrade |
| Redis senha | RR@@Upgrade |

---

## 11. Padrões de Commits

```
fix: descrição do bug corrigido
feat: nova funcionalidade adicionada
refactor: refatoração sem mudança de comportamento
docs: atualização de documentação
chore: infraestrutura, configs, scripts
```

**Checklist antes de qualquer commit:**
1. `npx tsc --noEmit` → zero erros
2. `npm run build` no frontend → zero erros
3. Testar ao vivo o fluxo afetado
4. Aprovação do Tech Lead (Davi / Ronaldo)

---

## 12. Avisos Imutáveis

1. **`npx tsc --noEmit`** → zero erros antes de qualquer commit
2. **Nunca `SUPER_ADMIN`** — role não existe no enum `UserRole`
3. **`req.user.id` SEMPRE** — nunca `req.user.sub`
4. **WS em try/catch separado**, fora de `$transaction`
5. **Soft delete sempre** — nunca `.delete()` em entidades de negócio
6. **Um seed: `seed-full.ts`** — nunca criar seeds adicionais
7. **Rotas literais ANTES de `:id`** no NestJS
8. **`GET /employees`** retorna `{ employees: [], total, byRole, byDept }` — não array direto
9. **`GET /reimbursements`** retorna `{ data: [], meta: {} }` — nunca `Array.isArray(res.data)` direto
10. **Schema sem BOM** — usar `fix-bom.ps1` se necessário
11. **VALID_TRANSITIONS** — sempre validar transição kanban antes de chamar API
12. **`catch (err: any)`** — sempre inspecionar `err?.response?.data?.message` no toast
13. **`GET /classes`** aceita apenas UM status por vez — não enviar array

---

*Sistema Upgrade | RR TECNOL | v7.0 | 25/03/2026 — Sistema Completo*
*Atualizado por: Gravity 2.0 — Sprint Fechamento Final*
