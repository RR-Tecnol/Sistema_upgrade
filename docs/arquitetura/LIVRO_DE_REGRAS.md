# 🛡️ LIVRO DE REGRAS — Sistema Upgrade
## Regras Imutáveis | Não violar sem autorização do Tech Lead | v3.0 | 18/03/2026

> Estas regras foram consolidadas dos sprints 0→Final. Não modifique sem aprovação explícita de Ronaldo (Tech Lead).

---

## 1. UI/UX e Frontend

- **Design System:** O projeto usa Tailwind CSS + classes customizadas em `globals.css`. Cores amarelo (#FFD600), preto, branco são as cores institucionais.
- **Sem redesign sem autorização:** Nunca alterar identidade visual de componentes existentes.
- **Novas páginas:** Herdam layout base (Sidebar, Header, Cards) já implementados.
- **Responsividade obrigatória:** Usar classes de grid do `globals.css`:
  - `grid-4-cols` → 4 cols desktop, 2 em ≤1024px, 1 em ≤768px
  - `grid-3-cols` → 3 cols desktop, 1 em ≤768px
  - `grid-2-cols` → 2 cols desktop, 1 em ≤768px
- **Touch-friendly:** Todo botão/input = `min-height: 44px, min-width: 44px`
- **Anti-zoom iOS:** Inputs devem ter `font-size: 16px` no mobile.
- **Sidebar mobile:** Em `< 768px`, sidebar some → botão hamburger aparece.
- **Upload de foto:** `capture="environment"` no `<input type="file">` + `browser-image-compression` (max 0.5MB, 1200px).

---

## 2. Padrões de Código Backend (NestJS)

- **Arquitetura modular:** Todo novo recurso = seu próprio Module, Controller, Service e DTOs.
- **Validação estrita:** Todos os payloads de entrada devem usar `class-validator`. Nenhuma requisição passa sem tipagem.
- **Rotas protegidas:** Toda rota usa `@UseGuards(JwtAuthGuard)` + `@Roles()` quando aplicável.
- **Dependências entre módulos:** Se `ServiceA` injeta `ServiceB` de outro módulo → o `ModuleA` DEVE declarar `ModuleB` em `imports[]`.
- **Módulos @Global():** `SettingsModule` e `NotificationsModule` são globais — NÃO precisam ser declarados em `imports[]` de outros módulos.
- **Imports mortos proibidos:** Nunca deixar `import` em `.module.ts` sem usar no array `imports[]`.

---

## 3. Banco de Dados (Prisma / PostgreSQL)

- **Nunca hard delete:** Usar `active: boolean = false` (soft delete). Nunca `DELETE FROM` na aplicação.
- **Nunca Float para dinheiro:** SEMPRE `Decimal` no Prisma / `NUMERIC(12,2)` no PostgreSQL.
- **Migrations apenas:** Nunca usar `sync({ alter: true })`. Apenas `npx prisma migrate dev`.
- **Após alterar schema:** SEMPRE rodar `npx prisma generate` antes de usar o Prisma Client.
- **IDs:** UUID (`@default(uuid())`). Nunca SERIAL ou auto-increment.
- **Soft delete obrigatório:** Todo model deve ter `active Boolean @default(true)`.

---

## 4. Uploads e Storage

- **Tudo vai para o MinIO:** Nunca salvar no disco local do container.
- **Presigned URLs:** Upload direto do browser/celular para o MinIO — o backend não toca no arquivo.
- **Nunca delete físico:** Arquivos no MinIO apenas desativados, nunca deletados.
- **Compressão antes do upload:** `browser-image-compression` (max 0.5MB, 1200px) no celular do professor.

---

## 5. Autenticação e Segurança

- **`req.user.id` SEMPRE:** Nunca usar `req.user.sub` nos controllers. `JwtStrategy.validate()` retorna `id`.
- **`return response` obrigatório:** Métodos de serviço que montam objetos de resposta DEVEM ter `return` explícito.
- **Fluxo de login:**
  1. Usuário com 2FA → retorna `{ requiresTwoFactor: true, userId }`
  2. Usuário sem 2FA → retorna `{ user, access_token, refresh_token }`
  3. Aluno → inclui `student: { id, cpf }` no retorno
- **2FA obrigatório para:** ADMIN e COORDINATOR.
- **Modo manutenção:** `MAINTENANCE_KEY` no `.env`. Sem chave definida = bypass NUNCA funciona.
- **Helmet:** Ativo no `main.ts` com `crossOriginEmbedderPolicy: false, contentSecurityPolicy: false`.

---

## 6. WebSocket e Notificações

- **Gateway único:** Apenas `NotificationsGateway` em `backend/src/notifications/`. Zero outros gateways.
- **Namespace:** Sempre `/notifications`. Nunca namespace raiz `/`.
- **Auth obrigatória:** Handshake WS exige JWT válido. Sem token → `client.disconnect()` imediato.
- **Emissão isolada:** Services emitem via `this.notifications.notifyAdmins()`. Nunca injetam `Server` diretamente.
- **Hook único:** Frontend usa exclusivamente `useNotifications` em `hooks/useNotifications.ts`.
- **Fallback gracioso:** WS em `try/catch`. Falha no WS NUNCA bloqueia operação principal.
- **userId mascarado nos logs:** `logger.debug(…${userId.slice(-8)})` para LGPD.
- **Eventos registrados:**
  - `nova_inscricao` — inscrição criada no portal do aluno
  - `inscricao_aprovada` — admin aprovou inscrição
  - `frequencia_registrada` — professor salvou frequência
  - `custo_excessivo` — custo da rota excedeu limite configurado

---

## 7. Enums e Contratos de API

- **Frontend usa valores do enum do backend:** Nunca criar valores locais diferentes.
- **`ReimbursementType`:** `CLASSROOM_MATERIAL | CLEANING_MATERIAL | EMERGENCY_REPAIR | FOOD | OTHER`
- **Campo correto:** `type` (não `category`) no DTO de reembolso.
- **`UserRole`:** `ADMIN | COORDINATOR | FINANCIAL | TEACHER | STUDENT` (+ `DRIVER` a adicionar na Fase 2).
- **Antes de criar formulário:** Verificar o DTO do backend para nomes e values de enums.

---

## 8. Glossário Oficial (UI × Banco)

| Termo na UI | Termo no Banco/Código | Descrição |
|-------------|----------------------|-----------|
| Período de Curso / Rota | `Acao / acoes` | Operação de campo itinerante da carreta |
| Carreta | `Truck / trucks` | Veículo-escola itinerante |
| Aluno | `Student / students` | Beneficiário do programa |
| Turma | `Class / classes` | Instância de curso em data/local específico |
| Inscrição | `Enrollment / enrollments` | Solicitação para participar de turma |
| Grupo | `Group / groups` | Unidade operacional por estado |
| Funcionário | `Employee / employees` | Colaborador externo (motorista, técnico) |

---

## 9. Regras de Negócio Definitivas

| Regra | Valor | Origem |
|-------|-------|--------|
| Threshold de aprovação | **75% de frequência** | Decisão Tech Lead (doc 08_ESTADO_SISTEMA) |
| Vagas de reserva padrão | **4 vagas** | Reunião Robert 12/03/2026 |
| Diária de custo CLT | **R$120/dia** | Reunião Robert 12/03/2026 |
| Limite de distância passagem | **200km** (≤200 = semanal, >200 = quinzenal) | Reunião Robert 12/03/2026 |
| Parâmetros financeiros | **Configuráveis via painel** | Nunca hardcodar |

---

## 10. Regras Avançadas de Código (Identificadas em Auditoria 18/03/2026)

| Regra | Detalhe |
|-------|---------|
| **Decimal como string** | Prisma retorna Decimal como string — no frontend usar `Number(v).toFixed(2)` |
| **Soft delete seletivo** | Student, Employee, Reimbursement, ClassHoliday usam `active: false`. Modelos operacionais sem histórico obrigatório podem usar hard delete com verificação de dependências. |
| **Timestamps obrigatórios** | Todo model tem `createdAt @default(now())` e `updatedAt @updatedAt` |
| **WS fora de transaction** | `NotificationsGateway` sempre em try/catch **separado**, nunca dentro de `prisma.$transaction()`. Falha no WS não causa rollback de banco. |
| **Rotas literais antes de :param** | `@Get('my')` deve vir ANTES de `@Get(':id')` no mesmo controller. NestJS processa na ordem de declaração. |
| **Logger NestJS** | `new Logger(NomeClasse.name)` — nunca `console.log`. Mascarar dados: `userId.slice(-8)` (LGPD). |
| **Lógica defensiva no frontend** | `Array.isArray(res.data) ? res.data : (res.data?.data ?? [])` — nunca assumir formato da resposta. |
| **Token no localStorage** | JWT em `localStorage.getItem('token')`. No logout: remover `token`, `user` e `student`. |
| **Puppeteer no Windows** | Instalar `puppeteer` com `--legacy-peer-deps`. Pode precisar de `PUPPETEER_EXECUTABLE_PATH` configurado. |

---

## 11. Padrões de Commits

```
fix: descrição do bug corrigido
feat: nova funcionalidade adicionada
refactor: refatoração sem mudança de comportamento
docs: atualização de documentação
chore: infraestrutura, configs, scripts
```

---

*Sistema Upgrade | RR TECNOL | Consolidado em 18/03/2026 | v3.0*
*Fontes: 01_METODOLOGIA_TRABALHO.md + 02_LIVRO_DE_REGRAS.md (original) + sprints 0→Final*
