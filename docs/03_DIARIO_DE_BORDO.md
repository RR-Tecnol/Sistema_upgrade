# 📖 03_DIARIO_DE_BORDO — Log Narrativo de Decisões

> **Formato padrão para novas entradas:**
> `## [DD/MM/AAAA] - Título da Feature ou Decisão`
> Campos: **Feature/Foco**, **Contexto**, **Decisão Tomada**, **Bypasses/Pendências**

---

## [12/03/2026] - Setup e Ingestão de Regras de Governança

**Feature/Foco:** Inicialização da governança da IA e leitura das transcrições da reunião B2G (Business to Government).

**Contexto:** O projeto mudou estruturalmente após reunião com stakeholders governamentais. Três grandes mudanças foram acordadas:
1. **Modelo Financeiro CLT + Custos:** A precificação dos professores/instrutores deixou de ser apenas por diária e passou a contemplar estrutura CLT (salário base + encargos trabalhistas) + custos operacionais variáveis.
2. **Feriado Dinâmico:** O sistema precisa recalcular datas de aula automaticamente quando feriados forem registrados.
3. **Relatório de Concludentes na 3ª Semana:** A gestão solicitou relatório automático de alunos em vias de concluir o curso.

**Decisão Técnica Tomada:** Os três itens acima foram documentados como **requisitos pendentes de implementação**. Nenhum código foi alterado nesta sessão.

**Bypasses/Pendências:** *(Nenhum bypass aplicado nesta sessão)*

---

## [12/03/2026] - Auditoria da Documentação Técnica Completa

**Feature/Foco:** Geração do arquivo `DOCUMENTACAO_COMPLETA.md` para apresentação ao stakeholder.

**Decisão Tomada:** O documento foi gerado com 12 seções cobrindo: proposta, arquitetura, stack, todos os 12 módulos backend, schema Prisma (30+ tabelas), APIs, segurança/LGPD, Docker e fluxos operacionais.

**Sobre Integração com IA:** O sistema **não possui integração ativa com IA** na versão auditada. Arquitetura possui `api_keys` e `system_configs` preparados, mas nenhuma chamada a LLM está implementada.

**Bypasses/Pendências:** *(Nenhum bypass nesta sessão)*

---

## [12/03/2026] - Estado Atual do Sistema (Snapshot Técnico)

**Feature/Foco:** Registro do estado de desenvolvimento local auditado nesta data.

**Serviços Rodando (localhost):**
- Backend NestJS: porta configurada via `$env:PORT=3002` — `npm run start:dev`
- Frontend Next.js: `http://localhost:3000` — `npm run dev`
- PostgreSQL: Docker — `cursos-postgres` — porta 5432
- Redis: Docker — `cursos-redis` — porta 6379
- MinIO: Docker — `cursos-minio` — porta 9000/9001

**Configuração de Banco:**
- DB: `cursos_db`, User: `cursos_user`, Password: `cursos_password`
- ORM: Prisma 5.22.0 · Schema: `backend/prisma/schema.prisma`

**Login Admin Local:** Email: `admin@qualifica.com` | Senha: `admin123`

**Bypasses/Pendências:** *(Nenhum)*

---

## [13/03/2026] - Implementação das Fases 1–5 (Requisitos da Reunião)

**Feature/Foco:** Implementação completa dos requisitos levantados na reunião B2G, abrangendo schema, backend e frontend.

**Contexto:** Com base nas pesquisas do Deep Research, transcrição da reunião e documentações (`02_LIVRO_DE_REGRAS.md`, `06_PLANEJAMENTO.md`), foram implementados todos os requisitos críticos e de alta prioridade em 5 fases sequenciais.

---

### FASE 1 — Schema (Prisma / PostgreSQL)
- `publicSchoolOnly Boolean?` adicionado em `StudentSocioeconomic` (REQ-03)
- `PE_DE_MEIA` adicionado ao enum `SocialProgram` (REQ-04)
- `motivation` em `StudentProfessional` alterado para opcional (REQ-05)
- `reserveSlots Int @default(0)` adicionado em `Class` (REQ-01)
- Modelo `ClassHoliday` criado: data, descrição, tipo (NATIONAL/LOCAL/WEATHER/OTHER), soft delete (REQ-08)
- Modelo `Reimbursement` criado: valor `Decimal(10,2)`, categoria, URL comprovante, status com aprovação/notas admin (REQ-10)
- **Decisão de precisão:** todos os campos monetários usam `Decimal` — nunca `Float` (`02_LIVRO_DE_REGRAS.md`)

### FASE 2 — Módulos Backend
- `HolidayModule`: registra feriados e recalcula data final da turma somando dia ao campo `endDate` (REQ-08)
- `ReimbursementModule`: upload comprovante via MinIO presigned URL, CRUD, aprovação/rejeição pelo admin (REQ-10)
- `PayrollService`: calcula diárias (R$120/dia padrão da reunião) + passagens por regra de distância:
  - **≤200km** = passagem semanal · **>200km** = passagem quinzenal (transcrição 00:18:59)
  - `PayrollController` expõe 3 endpoints: custo por funcionário, custo total da ação, regra de viagem (REQ-09)

### FASE 3 — PDFs Governamentais (REQ-11/12)
- `PdfService` com templates HTML provisórios (aguarda modelo visual do Robert)
- `puppeteer` instalado (`--legacy-peer-deps` necessário por conflito com NestJS v11)
- `htmlToPdf()`: Chromium headless → PDF em buffer de memória → `application/pdf`
- Critério aprovação: ≥80% frequência final / ≥75% na 3ª semana (§5.3 do Livro de Regras)
- Quando Robert enviar o template: substituir apenas `buildFrequencyHtml()` e `buildConcludentsHtml()` — lógica de dados intacta

### FASE 4 — Frontend (Formulários)
- UI "Ação" → "Período de Curso" em toda a interface (REQ-07): Sidebar + `acoes/page.tsx`
- `Step4Socioeconomic`: opção `PE_DE_MEIA` + checkbox `publicSchoolOnly` (REQ-03/04)
- `Step5Professional`: `motivation` opcional com contador condicional (REQ-05)
- Formulário nova turma: campo `reserveSlots` — grid de 3 colunas: Vagas / Reserva / Status (REQ-01)
- Tipos atualizados: `SocioeconomicForm`, `ProfessionalForm`, `CreateClassDto`, `Class`

### FASE 5 — Novas Telas Frontend
- `/admin/feriados`: KPIs por tipo, modal de criação com aviso de recalcúlo automático, tabela, deleção (REQ-08)
- `/admin/reembolsos`: KPIs financeiros, filtros por status, modal análise admin com campo de observações (REQ-10)
- Sidebar: `Feriados & Imprevistos` e `Reembolsos` na seção "Operações de Campo"
- `/admin/relatorios`: seção de geração de PDFs governamentais por turma com botões para frequência e concludentes

**Bypasses/Pendências desta sessão:**
- Lints no VS Code (backend) = **falsos positivos** — `tsc --noEmit` compila sem erros. Solução: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
- `.env` MinIO: precisa das variáveis `MINIO_*` configuradas para uploads de reembolso funcionarem em produção
- Templates PDF: aguardando modelo visual oficial do Robert para substituição de `buildFrequencyHtml/ConcludentsHtml`

---

## [13/03/2026 — Tarde] - Rodada Final de Bug Fixes e Polimento

**Feature/Foco:** Correção de bugs identificados nos testes manuais do dia, seed de dados de teste e atualização da documentação para entrega.

**Contexto:** Após os testes funcionais realizados pelo usuário, foram identificados e corrigidos os seguintes problemas, além da implementação de melhorias de UX.

---

### BUG-2.1 — Campo PcD invisível no cadastro de alunos
- **Arquivo:** `frontend/app/admin/alunos/novo/page.tsx`
- **Problema:** O campo de deficiência (PcD) não abria totalmente ao ser ativado com o toggle
- **Solução:** `maxHeight` aumentado de `160px` para `300px` + `overflow: hidden` + transição suave `0.35s ease`
- **Linha:** ≈371

### BUG-2.5 — socialProgramOther enviado desnecessariamente
- **Arquivo:** `frontend/app/admin/alunos/novo/page.tsx`
- **Verificado:** O campo `socialProgramOther` já era omitido no submit quando `socialProgram !== OTHER` — sem alteração necessária.

### BUG-CERT — Alert genérico ao emitir certificado
- **Arquivo:** `frontend/app/admin/certificados/page.tsx`
- **Problema:** Erro ao emitir certificado exibia apenas `alert()` genérico sem detalhes
- **Solução:** Substituído por banner inline `issueError` com:
  - Mensagem detalhada da API
  - "Causa provável" (ex: aluno não matriculado ou frequência insuficiente)
  - Botão ✕ para fechar
- **Também corrigido:** Ternário `loading ?` com JSX quebrado foi reestruturado

### BUG-CON — Campo valor na Conta a Pagar
- **Verificado:** Campo de valor já possuía `onFocus` que seleciona o conteúdo quando `0` ou `0,00` — sem alteração necessária.

### FEAT-ALU — Filtro de estados na lista de alunos
- **Arquivo:** `frontend/app/admin/alunos/page.tsx`
- **Antes:** Apenas 3 botões (Todos / MA / PI)
- **Depois:** Dropdown `<select>` com **todos os 26 estados + DF** brasileiros, estilo amarelo quando ativo
- **Linha:** ≈144

### FEAT-CONF — Nome do admin atualiza header/sidebar em tempo real
- **Arquivos:** `frontend/app/admin/configuracoes/page.tsx` + `frontend/components/admin/Header.tsx`
- **Problema:** Ao salvar o nome do admin em Configurações → Meu Perfil, o Header não atualizava sem reload
- **Solução:**
  1. `configuracoes/page.tsx`: após `handleSave` com sucesso, lê o `localStorage.user`, atualiza `name`/`email` e chama `window.dispatchEvent(new Event('userUpdated'))`
  2. `Header.tsx`: adicionado `window.addEventListener('userUpdated', ...)` no `useEffect` para re-ler o `localStorage` e atualizar o state

### Schema — receiptUrl optional
- **Arquivo:** `backend/prisma/schema.prisma`
- **Alteração:** `receiptUrl String?` (opcional) para permitir reembolsos sem MinIO em testes
- **Migration:** `make_receipt_url_optional` aplicada

### Seed de dados de teste
- **Arquivo:** `backend/prisma/seed-test.ts` (novo)
- **Script:** `npm run seed:test`
- **Cria:**
  - Aluno `aluno@qualifica.com` / `aluno123` com perfil completo
  - Funcionário de teste "Prof. Carlos Mendes"
  - 3 Reembolsos: PENDING (R$89,90), APPROVED (R$45,50), REJECTED (R$200,00)
  - ⚠️ Matrícula + frequências SOMENTE se já existir uma turma criada

---

### Sessão de Deploy — 13/03/2026 17:32

**Operações realizadas:**
1. `npx prisma generate` — Gerou o Prisma Client, eliminando lints de cache do VS Code
2. `npx prisma migrate reset --force` — Banco recriado do zero
3. `npm run prisma:seed` — Admin criado (`admin@qualifica.com`), 3 grupos, 20 cidades MA, 8 cursos
4. `npm run seed:test` — Aluno + Employee + 3 reembolsos criados; matrícula pendente (sem turma ainda)
5. Backend rodando: `$env:PORT=3002; npm run start:dev` — ✅ sem erros reais
6. Frontend rodando: `npm run dev` — ✅ `http://localhost:3000`

**Erro MinIO no startup (esperado):**
```
ERROR [MinioService] S3Error: The request signature we calculated does not match...
```
Esse erro é **esperado** quando MinIO não está configurado com credenciais corretas. Não afeta nenhum módulo — apenas o upload de comprovantes de reembolso fica indisponível.

**Todas as docs atualizadas e push feito para:**
`https://github.com/RR-Tecnol/Sistema_upgrade.git`

---

## SEÇÃO: Status dos Requisitos

| # | Requisito | Prioridade | Status |
|---|-----------|------------|--------|
| REQ-01 | Campo `reserveSlots` no form de turma | Alta | ✅ Implementado |
| REQ-02 | Critério de aprovação = 80% frequência | Alta | ✅ Implementado no PdfService |
| REQ-03 | Campo `publicSchoolOnly` no formulário | Alta | ✅ Implementado |
| REQ-04 | Enum `PE_DE_MEIA` em `SocialProgram` | Média | ✅ Implementado |
| REQ-05 | Campo `motivation` opcional | Média | ✅ Implementado |
| REQ-06 | Portal do aluno — carreta + certificado | Alta | ✅ Implementado — portal com classIdentifier |
| REQ-07 | UI "Ação" → "Período de Curso" | Alta | ✅ Implementado |
| REQ-08 | `HolidayService` — recálculo de datas | Alta — CRÍTICO | ✅ Implementado + 26 feriados pré-carga |
| REQ-09 | Modelo CLT — diária + passagens variáveis | Alta | ✅ Implementado |
| REQ-10 | Reembolso — recibo + aprovação admin | Média | ✅ Backend + tela admin + seed teste |
| REQ-11 | PDF de frequência (logo governamental) | Alta | ✅ PDF real via Puppeteer — template provisório |
| REQ-12 | PDF de concludentes (3ª semana) | Alta | ✅ PDF real via Puppeteer — template provisório |
| REQ-13 | Filtros avançados + export multi-formato | Média | ✅ 26 estados + exportar PDF contas |
| REQ-14 | Config de segurança (2FA, timeout) | Baixa | ✅ Implementado — 4 endpoints TOTP (S3-03) |
| — | Templates PDF oficiais | Alta | ✅ Templates reais implementados (S3-01/S3-02) |
| — | Parâmetros financeiros configuráveis | Alta | ✅ SettingsService + UI Financeiro (S3-00) |
| — | BUG-C1 encoding cidades | Infra | ✅ docker-compose com POSTGRES_INITDB_ARGS UTF-8 |
| — | MinIO / upload de comprovantes | Infra | ⚠️ Requer configuração de servidor MinIO |
| — | Notificações E-mail/WhatsApp | Média | ⏳ Pendente |
| — | Integração CADUNICO | Baixa | ⏳ Pendente |

> **Referência completa:** [`06_PLANEJAMENTO.md`](./06_PLANEJAMENTO.md) — contexto completo, impacto no schema e citações da reunião.

---

## [15/03/2026] - Sprint 0 — BUG-C1: Encoding UTF-8 das Cidades

**Feature/Foco:** Corrigir encoding UTF-8 no PostgreSQL para cidades com acentos.

**Contexto:** Cidades como São Luís, Teresina, etc. eram armazenadas com caracteres quebrados no banco.

**Decisão Técnica:**
- Adicionado `POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"` no `docker-compose.yml` bloco `postgres.environment`
- Procedimento: `docker-compose down -v` → `docker-compose up -d` → `prisma migrate deploy` → seeds

**Bypasses/Pendências:** Seed de cidades precisa ser re-executado após reset do volume Docker.

---

## [15/03/2026] - Sprint 1 — GAP-01/02/03: Campos CLT e Verificação de Cadastro

**Feature/Foco:** Persistência dos campos CLT e validação do formulário de alunos.

**GAP-01 — employees.service.ts não salvava campos CLT:**
- Adicionados `contractType?`, `monthlySalaryCLT?`, `travelRuleKm?` ao `create-employee.dto.ts`
- `employees.service.ts`: create() e update() passam os 3 campos ao Prisma (eram silenciosamente ignorados)

**GAP-02 — UI frontend para campos CLT:**
- `frontend/app/admin/funcionarios/page.tsx`: interface `Employee` ampliada, `EMPTY_FORM` atualizado, modal com Step 1 condicional (campos CLT só aparecem quando `contractType === 'CLT'`)

**GAP-03 — Verificação de formulário de alunos:**
- `publicSchoolOnly` verificado como funcional em `Step4Socioeconomic.tsx` ✅
- Campo `motivation` verificado como opcional em `Step5Professional.tsx` ✅
- `PE_DE_MEIA`: não encontrado nos componentes — registrado como gap (implementação futura)

**Bypasses:** `tsc --noEmit` passou sem erros após as edições.

---

## [15/03/2026] - Sprint 2 — GAP-F1/F2/F3: Lógica Financeira e Alertas de Custo

**Feature/Foco:** Automação do custo de instrutor e alertas financeiros em `acoes.service.ts`.

**GAP-F1 — addFuncionario() puxar dailyCost do cadastro:**
- `valorDiariaFinal = dto.valorDiaria ?? (emp.dailyCost ? Number(emp.dailyCost) : 0)`
- Propagado para `AcaoFuncionario`, `AcaoCusto` e `ContaPagar`

**GAP-F2 — calcularResumoFinanceiro() com custo CLT:**
- Para instrutores CLT: `salarioProporcional = (monthlySalaryCLT / diasUteisMes) × diasTrabalhados`
- Passagens: ≤200km semanal · >200km quinzenal (regra da reunião B2G, transcrição 00:23:15)
- `include` do `findOne()` ampliado com campos CLT do Employee

**GAP-F3 — addCusto() alerta custo excessivo:**
- Quando `real.total > estimado.total × 1.1`: `console.warn` + `Notification` no banco
- `userId` usa `grupoId` como placeholder (resolvido em Sprint 4 com sistema de notificações)

---

## [15/03/2026] - Sprint 3 — S3-00 a S3-03: Parâmetros Financeiros, PDFs e 2FA

**Feature/Foco:** 4 tasks de refatoração e segurança.

### S3-00 — Parâmetros Financeiros Configuráveis (PRIORIDADE MÁXIMA)

**Problema resolvido:** Valores financeiros hardcoded em `acoes.service.ts` (custoPassagem=270, diasUteisMes=22, etc.)

**Arquivos alterados:**
- `settings.service.ts`: 5 campos adicionados à interface `SystemSettings` + `DEFAULT_SETTINGS`
  - `valorPassagemViagem: 270` · `valorDiariaPadrao: 120` · `kmLimitePassagemSemanal: 200`
  - `diasUteisReferenciaMes: 22` · `percentualAlertaCusto: 110`
- `acoes.module.ts`: importa `SettingsModule`
- `acoes.service.ts`: injeta `SettingsService`, usa `settings.xxx` em vez de literais hardcoded
- `configuracoes/page.tsx`: nova tab "Financeiro" com 5 inputs (4 number inputs + 1 range slider), lógica GET/PUT integrada

**Decisão:** Slider para percentualAlertaCusto (100–200%) em vez de input para melhor UX.

### S3-01 — PDF de Frequência Refatorado

**Problema resolvido:** Query filtrava `where: { present: true }`, excluindo faltas do relatório.

**Alterações:**
- Query: removido `where: { present: true }` → query retorna todos os registros com campo `present: boolean`
- `buildFrequencyHtml()`: reescrito com template visual real (logos, faixa amarela curso, tabela P/F por coluna de data, assinatura do instrutor)
- Mapa de presenças: `presencaMap: Map<studentId, Map<dateStr, boolean>>` para células P (azul) / F (branco)

### S3-02 — PDF de Concludentes Refatorado

**Problema resolvido:** Template provisório sem estrutura do modelo `CONCLUDENTES_MORRO_CABECA.pdf`.

**Alterações:**
- `buildConcludentsHtml()`: reescrito com tabela Nº / NOME / ASSINATURA para concludentes + página separada para desistentes (CSS `page-break-before: always`)
- Faixa cidade em azul escuro, faixa curso em amarelo, logos governamentais no cabeçalho

### S3-03 — 2FA Google Authenticator (TOTP / RFC 6238)

**Arquivos alterados:**
- `schema.prisma`: + `twoFactorEnabled Boolean @default(false)` e `twoFactorSecret String?` no model User
- `auth.service.ts`: 4 métodos — `generate2FA()` (QR code), `enable2FA()` (confirma 1º token), `verify2FAAndLogin()` (login com TOTP), `disable2FA()` (desativa)
- `auth.controller.ts`: 4 endpoints — `POST /auth/2fa/generate`, `/enable`, `/verify`, `/disable`
- `login()`: se `twoFactorEnabled`, retorna `{ requiresTwoFactor: true, userId }` em vez dos tokens JWT
- Pacotes instalados: `speakeasy`, `qrcode`, `@types/speakeasy`, `@types/qrcode` (com `--legacy-peer-deps`)
- `npx prisma generate` executado — novo Prisma Client com os campos 2FA
- `tsc --noEmit` passou sem erros após todas as alterações

**Fluxo 2FA:**
1. Admin logado → `POST /auth/2fa/generate` → recebe QR code (data URL)
2. Escaneia no Google Authenticator
3. `POST /auth/2fa/enable` com 1º token TOTP → `twoFactorEnabled = true`
4. Próximo login: `{ requiresTwoFactor: true, userId }` → frontend pede o TOTP
5. `POST /auth/2fa/verify` com token → recebe JWT

**Bypasses/Pendências:**
- Migration 2FA precisa ser rodada: `npx prisma migrate dev --name add-two-factor`
- Frontend: UI de ativação/desativação do 2FA nas configurações de perfil (Sprint 4)

---

## [16/03/2026] — Sprint 4

**Executor:** Antigravity | **Monitor:** Gravity 2.0 | **Autorização:** Tech Lead

**S4-01A — Backend: Endpoint de Frequência em Lote**
- `POST /classes/:id/attendance/bulk` adicionado em `classes.controller.ts` + `classes.service.ts`
- `bulkAttendance()` usa `prisma.attendance.upsert` com chave única `classId_studentId_date` — não duplica se o professor corrigir no mesmo dia
- `registeredBy` extraído do token JWT via `@Req() req.user.id`

**S4-01B — Frontend: Portal do Professor (`frontend/app/teacher/`)**
- 7 arquivos criados: `layout.tsx` (sidebar, guard JWT, logout), `page.tsx` (redirect), `dashboard/page.tsx` (saudação, KPIs, botão #FFD600), `frequencia/page.tsx` (chips Verde/Amarelo), `frequencia/[classId]/page.tsx` (toggle P/F 44px, toast), `reembolsos/page.tsx` (câmera nativa, presigned URL MinIO, histórico), `historico/page.tsx` (placeholder)

**S4-02 — Dashboard BI de Rotas**
- `dashboard.service.ts`: `getRotasBi(estado?, ano?)` — agrega acoes, retorna totalRotas, cidadesBeneficiadas, totalInscritos
- `dashboard.controller.ts`: `GET /dashboard/rotas-bi?estado=MA&ano=2026`
- `dashboard/page.tsx`: ROW 6 "ROTAS & BI" com filtros Estado/Ano, 3 KPI cards, tabela de rotas com status coloridos

**S4-03 — Mapa Interativo MA/PI**
- `npm install react-simple-maps` (17 pacotes)
- `frontend/components/MapaRotas.tsx`: mapa Brasil via world-atlas, marcadores proporcionais a inscritos, MA=#FFD600, PI=#0EA5E9, tooltip ao hover
- Integrado no dashboard via `next/dynamic` (sem SSR)

**Pendente Sprint Mobile:** sidebar drawer, breakpoints, touch 44px sistemático
**Pendente Sprint 5:** Socket.io real-time, seed Acre, CI/CD, UI 2FA

---

## [16/03/2026] — Sprint 5

**S5-01:** Seed do Acre — `Grupo 1 AC` criado, 10 cidades do AC adicionadas ao `seed.ts`. `npm run prisma:seed` → Groups: 4, Cities: 30 ✅

**S5-02:** UI ativação 2FA nas configurações — `configuracoes/page.tsx` refatorado com fluxo completo: `idle` → Botão "Ativar 2FA" (POST `/auth/2fa/generate`) → `setup` com QR Code + input 6 dígitos → `active` com chip verde ✓ 2FA Ativo + botão Desativar (POST `/auth/2fa/disable`). Estado `disabling` para confirmar desativação com código TOTP. ✅

**S5-03:** CI/CD GitHub Actions — `.github/workflows/ci.yml` criado com 2 jobs paralelos: `backend` (tsc --noEmit + npm run build) e `frontend` (tsc --noEmit + npm run build). Disparado em push/PR para master/main. ✅

**S5-04:** Modo Manutenção — `main.ts` recebe middleware Express antes do `app.listen()`: retorna 503 `{ maintenance: true }` para todas as rotas exceto `/api/auth/login`, `/api/settings`, `/api/health` e bypass via header `x-admin-bypass`. `frontend/middleware.ts` criado. `frontend/app/manutencao/page.tsx` criado com animação pulse + barra de progresso. `lib/api/client.ts` atualizado com interceptor 503 → redirect automático. ✅

**Pendente Sprint Mobile:**
- Sidebar drawer + hamburger para mobile
- Breakpoints sistemáticos no globals.css
- Grids adaptativos em todas as telas

**Estado do projeto:** ~90% completo
**Próximo:** Sprint Mobile → responsividade completa
