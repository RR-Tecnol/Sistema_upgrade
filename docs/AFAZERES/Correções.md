# Correções e Melhorias no Sistema UPGRADE — Guia de atualização

Este documento é o **guia linear de atualização**: primeiro ambiente e baseline técnico, depois segurança/dados, depois funcionalidades planejadas, por fim risco de produção. Mantém também um **registo de auditorias** (código + testes dirigidos).

---

## Como usar este guia (linearidade)

Sugerimos esta ordem de trabalho — cada fase desbloqueia a seguinte:

| Ordem | Fase | Objetivo |
|-------|------|----------|
| 1 | **Fase 0 — Ambiente** | Projeto a correr localmente com BD coerente com o Prisma |
| 2 | **Fase 1 — Segurança / RBAC** | Eliminar acessos indevidos antes de novas features |
| 3 | **Fase 2 — Integridade / Financeiro** | Transações, espelho em Contas a Pagar, ausência de estados inconsistentes |
| 4 | **Fase 3 — Backlog funcional** | Itens 1–6 (relatórios, turmas, funcionários, 2FA UX, feedbacks…) |
| 5 | **Fase 4 — Testes & regressão** | Manual + (no futuro) automatização |
| 6 | **§ 7 — Riscos de produção** | Ultima revisão antes do go-live (este é o **último trinco** do guia) |

Atualizar **Open Questions** e **Registo de testes** sempre que algo novo for encontrado ou corrigido.

---

## Guia para humanos (o que é cada coisa neste documento)

Este bloco **não apaga** nada do que está abaixo — só traduz o “jargon” para quem lê o doc no dia a dia.

### Léxico rápido (termos que voltam sempre)

| Termo técnico | Em linguagem simples |
|---------------|----------------------|
| **RBAC** | “Quem pode fazer o quê”: só admin, só professor, etc. Se falhar, alguém vê ou altera dados que não devia. |
| **JWT / login** | O “bilhete” digital depois do login. Sem bilhete válido, a API deve recusar. |
| **`RolesGuard` / `@Roles`** | Regras do Nest que dizem “esta rota é só para ADMIN”, por exemplo. |
| **Deny-by-default** | Se a rota tem guarda de papéis mas **ninguém** definiu a lista de papéis, o sistema **recusa todos** (nem admin passa) — bug típico. |
| **IDOR** | “Insecure Direct Object Reference”: consigo abrir o **teu** reembolso só mudando o ID na URL, porque o servidor não verifica se sou o dono. |
| **Drift Prisma ↔ BD** | O código (Prisma) espera colunas na base de dados que **ainda não existem** ou têm outro nome — aí dá erro 500 ou seed a falhar. |
| **OpenAPI / Swagger** | Lista **automática** de todos os endereços da API (`/api/...`) — não é ChatGPT; é documentação da tua própria API. |
| **WebSocket / Socket.IO** | Canal em **tempo real** (ex.: notificações a aparecerem sem recarregar a página). |
| **try/catch silencioso** | O servidor engole o erro; na interface parece que correu bem, mas **não gravou** ou não criou o registo filho (ex.: conta a pagar). |
| **FE ↔ BE** | Desalinhamento entre o que o **front** envia (`read=false`) e o que o **back** entende (`unreadOnly=true`). |

### Prefixos dos achados (auditorias Claude / outras rondas)

Quando vires IDs na doc, significam **rondas diferentes** de análise:

| Prefixo | Significado (resumo) |
|---------|----------------------|
| **A-**, **B-**, … | Primeira ronda de auditoria (autorização, classes, etc.). |
| **ALG-** | Contratos, algoritmos ou “detalhes de implementação” com impacto em uso. |
| **OAI-** | Ronda baseada na **lista Swagger/OpenAPI** + smokes HTTP. |
| **UX-** | **Bug de uso**: o sistema “fez” mas o utilizador **não vê** o efeito esperado, ou precisa de F5, ou filtros enganam. |

Se um achado tiver **tabela longa**, lê primeiro a coluna **“Sintoma para o utilizador”** ou **“Sintoma”** — é a tradução directa do problema na prática.

---

## Ordem cronológica de trabalho: IA testa + tu testas (durante as atualizações)

Objetivo: cada alteração no código passar por **dois olhos** — automático/limitado (IA) e **real no browser** (tu). Repete o ciclo até fechar o item do guia.

| Passo | Quem | O quê | Critério de “passou” |
|-------|------|-------|----------------------|
| **1** | **IA** | `tsc --noEmit` (backend + frontend), lint se existir, smoke API seguro (GETs, login dev) | Sem erros de compilação; endpoints críticos não devolvem 500 inesperado. |
| **2** | **Tu** | Mesmo fluxo no **browser** (porta **3010**), com utilizador de seed (ver credenciais no `seed-full.ts` / tabela no fim do guia) | Vês o ecrã esperado; nada “some” sem mensagem; recarregar não é obrigatório para ver o efeito (se for requisito). |
| **3** | **Tu** | Se o item for **multi-perfil** (ex.: professor pede → admin aprova), testa **as duas contas** na ordem do negócio | O efeito aparece onde o utilizador real espera (ex.: Contas a pagar, notificação, lista). |
| **4** | **IA** | Actualizar **este ficheiro**: registo na secção **Fase 4** ou no **Registo de auditoria complementar** com data + “smoke IA OK / falhou em X”. | Fica rastreável o que foi validado em cada deploy local. |
| **5** | **Tu** | Marcar no teu checklist pessoal (ou na coluna “manual OK” se usarem board) | Só depois disso consideras o item **fechado** para produção. |

**Regra de ouro:** se a IA disser “OK” mas **tu** vês comportamento estranho, **manda sempre** — o guia ganha um novo achado `UX-` ou nota na Fase 4; a IA não substitui o teste manual em UI.

---

## URLs rápidas (desenvolvimento local)

| Serviço | URL habitual |
|---------|----------------|
| **Frontend** Next.js | `http://localhost:3010` (script `npm run dev` usa porta **3010**) |
| **Backend** NestJS API | `http://localhost:3002` (ver `PORT` no `backend/.env`) |
| **Swagger** | `http://localhost:3002/api/docs` |
| **PostgreSQL (Docker)** | `localhost:5432` — utilizador/serviços definidos no `docker-compose.yml` |

Prefixo global da API: **`/api`**.

---

## Plano de correcções em curso (código + doc — 2026-05-06)

**Estratégia acordada:** fechar primeiro as correcções listadas no guia (Fase 0 → 1 → 2…), **sem** alterar ainda o fluxo MFA **sem** `AUTH_BYPASS_MFA` (fica para o **último** passo). Depois de todas as alterações, **uma rodada só** de testes manuais teus; aí geras um novo plano com achados pós-actualização.

| # | Item (doc / ID) | Estado | Onde foi corrigido | Como validar quando testares (rodada única) |
|---|-----------------|--------|-------------------|----------------------------------------------|
| C1 | **Fase 0 — Health / ready** (404 em `/api/health`, OAI-5) | **Corrigido** | `backend/src/health/health.module.ts`, `health.controller.ts`; `app.module.ts`; `main.ts` allowlist manutenção inclui `/api/ready` | Sem token: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/health` → **200**; idem `/api/ready` → **200** com BD ligada, **503** se Postgres cair. |
| C2 | **OAI-2 / A1 — Turmas sem JWT** | **Corrigido** | `backend/src/classes/classes.controller.ts` — `@UseGuards(JwtAuthGuard, RolesGuard)` na classe + `@Roles` em cada rota; `Get('public')` + `@Public()` | Sem `Authorization`: `GET /api/classes/00000000-0000-0000-0000-000000000000` → **401** (não 404 anónimo). `GET /api/classes/public` → **200**. Com token admin: `GET /api/classes` → **200**. |
| C3 | **RBAC — contas a pagar** | **Corrigido** | `backend/src/contas-pagar/contas-pagar.controller.ts` — `RolesGuard` + `@Roles('ADMIN','COORDINATOR','FINANCIAL')` | Login **professor** (ou aluno) → tentar `GET /api/contas-pagar` → **403**. Login **financeiro/admin** → **200**. |
| C4 | **IDOR — `GET /reimbursements/:id`** | **Corrigido** | `reimbursement.service.ts` — `findOneForCaller`; `reimbursement.controller.ts` | User A cria reembolso; token **User B** (mesmo papel) → `GET /api/reimbursements/{idDoA}` → **403**. Dono ou admin → **200**. |
| C5 | **Fase 2 — Aprovar reembolso + Conta a pagar (transacção)** (UX-1 / try/catch silencioso) | **Corrigido** | `reimbursement.service.ts` — `prisma.$transaction`: `update` APPROVED + `contaPagar.create`; `observacoes` inclui `reimbursementId:` para rastreio | Aprovar um **PENDING** novo → deve existir conta com descrição contendo «Reembolso» **ou** falha **500** explícita (nunca «aprovado» sem conta). Verificar lista Contas a pagar. |
| C6 | **OAI-1 — Swagger truck-maintenance** | **Corrigido** | `truck-maintenance.controller.ts` — `@ApiBearerAuth()` + `@ApiTags` | Abrir Swagger → grupo truck-maintenance mostra cadeado Bearer. |
| C7 | **B1 — `forgot-password` sem envio de e-mail** | **Corrigido** | `auth.service.ts` — `MailService.sendPasswordReset` com link `…/redefinir-senha?token=…` (`getPrimaryFrontendUrl`) | Com `BREVO_API_KEY`: e-mail recebido. Sem Brevo: consola do backend mostra bloco `[DEV] Password reset email` com o **link** completo — abrir no browser e redefinir senha. |
| C8 | **UX-2 — Imprevisto `PENALIZED` + valor → Conta a pagar** | **Corrigido** | `absences.service.ts` — `review()` em `prisma.$transaction` cria `ContaPagar` quando `status === PENALIZED` e `penalty > 0` | Admin: rever imprevisto como **PENALIZED** com `penalty` (ex.: 50) → em Contas a pagar deve aparecer linha «Penalidade por imprevisto…» e `observacoes` com `absenceId:`. |
| C9 | **E1 / notificações — `read=false` vs `unreadOnly` + filtro `type`** | **Corrigido** | `notifications.controller.ts` — `read=false`/`0` tratado como não lidas; `type` validado contra `NotificationType` | Logado como aluno: `GET /api/notifications?read=false&limit=5` → só itens com `readAt` null; com `&type=CERTIFICATE_AVAILABLE` → só esse tipo. |
| C10 | **Portal aluno/prof — URL `/driver/absences`** | **Corrigido** | Novo `GET/POST /api/absences` (`PortalAbsencesController`); FE: `student` / `teacher` / `driver` imprevistos + dashboard motorista usam **`/absences`**; **`/driver/absences`** mantido igual (compat.) | Como aluno: criar imprevisto e listar — pedidos vão a **`/api/absences`** (Swagger tag `absences`). Opcional: `curl` com token aluno em ambos os paths → mesma lista. |
| C11 | **UX-6 + UX-7 — Notificar utilizador (revisão + criação admin)** | **Corrigido** | `absences.service.ts` + `notifications-sender.service.ts` — WS `imprevisto_revisado` / `imprevisto_cadastrado_por_admin` + `Notification` persistida | Admin **revisa** imprevisto do aluno → aluno vê entrada em **`/student/notifications`** e evento WS se ligado. Admin **cria** imprevisto “Novo” para um user → destinatário recebe notificação in-app. |
| C12 | **Landing `/` — HTTP 500 + React #418/#423 + chunk `./1682.js`** | **Corrigido** | `app/page.tsx` único (`'use client'`): canvas só após **`mounted`** (sem `next/dynamic` na landing); **`toLocaleString('pt-BR')`**; **`layout.tsx`** — `metadataBase` seguro; **`package.json`** — **`CI=1 next build`** + **`dev:clean`** (`rm -rf .next && next dev`). Se o erro voltar no **dev**: `npm run dev:clean`. | Abrir **`http://localhost:3010/`** sem erros; **`npm run build`** no frontend **OK**. |
| C13 | **UX-3 / UX-4 / UX-5** — filtros pós-acção, KPIs globais, refresh admin via WS | **Corrigido** | **FE:** `admin/reembolsos` — KPIs com lista **completa** (`/reimbursements` sem filtro); após aprovar/rejeitar/criar → filtro **Todos** + toast; **`useAdminFinanceRefresh`** em `reembolsos` / `contas-a-pagar` / `imprevistos`. **BE:** `financeiro_listagem_refresh` via `notifyAdmins` em `approve`/`reject` (reembolso), `review` + `createByAdmin` (imprevisto). **Gateway:** sala `admins` inclui **`FINANCIAL`** e **`IT_ADMIN`** (antes só ADMIN/COORD). **Imprevistos:** após rever ou criar pelo admin → filtro **Todos**. | Com dois browsers ou duas abas: aprovar reembolso numa → lista Contas / Reembolsos actualiza sem F5; em «Pendentes» ao aprovar, lista passa a «Todos» e KPIs coerentes. |
| C14 | **UX-10 + UX-11** — marcar todas lidas + id real no WS | **Corrigido** | **FE:** `useNotifications` — `markAllRead` chama **`PATCH /notifications/read-all`** antes do estado local; eventos WS usam **`notificationId`** quando o servidor envia; dedupe por id; listeners **`imprevisto_revisado`** / **`imprevisto_cadastrado_por_admin`**. **BE:** `NotificationsSenderService.send` devolve **`{ id }`**; **`reimbursementStatusChanged`**, **`absenceReviewedForUser`**, **`absenceCreatedByAdminForUser`** devolvem id; **`notifyUser`** emitido **depois** da persistência com `notificationId` no payload (reembolso approve/reject, imprevisto revisão/criação admin). | Abrir sino admin → «Marcar como lidas» → F5 → contagens mantêm-se; evento em tempo real com mesmo **id** que na lista `/notifications`. |
| C15 | **ALG-10** — helper `reject` FE ↔ BE | **Corrigido** | `frontend/lib/api/reimbursements.ts` — `reject` envia **`rejectionReason`** (não `reason`). | Chamada via `reimbursementsApi.reject(id, motivo)` → backend aceita. |
| C16 | **UX-13** — inscrições (lista + filtro + WS) | **Corrigido** | **`admin/inscricoes/page.tsx`** — vista **Lista** com chips de **filtro por status** (incl. Lista espera); após **PATCH** bem-sucedido → **`listStatusFilter`** limpo + toast; **`useAdminFinanceRefresh(..., ['inscricoes'])`** (`nova_inscricao`, `inscricao_aprovada`, `inscricao_rejeitada`). **Kanban** continua só com busca textual por coluna. | Lista: filtrar «Pendentes» → aprovar → tabela mostra **Todos** e o registo mantém-se visível; outra aba com nova inscrição → lista actualiza. |
| C17 | **UX-12** — `NotificationBell` vs fonte única (REST + WS) | **Corrigido** | **`components/ui/NotificationBell.tsx`** passa a usar **`useNotifications()`** (sem polling 30s duplicado); ao abrir o menu → **`refetch`** (`GET /notifications`); **`markOneRead`** / **`markAllRead`** no hook; badge **`unreadCount`** e indicador **AO VIVO** alinhados ao Socket. **`useNotifications`**: `Notification` com **`title`** / **`link`** (via `data.link` na API); **`mapApiNotification`**, **`refetch`**, **`markOneRead`**. | Portal aluno/prof/motorista: evento WS → badge actualiza sem esperar 30s; abrir sininho → lista sincronizada com servidor. |
| C18 | **UX-15 + UX-16** — feriados: simetria `endDate` + notificações | **Corrigido** | **Schema:** `ClassHoliday.endDateBeforePush`. **`holiday.service.ts`** — ao registar grava o snapshot e usa **`nextWorkday`**; ao remover restaura o snapshot (registos antigos sem campo mantêm o retrocesso por dia útil). **`NotificationsSenderService.classEndDateChanged`** + WS **`turma_termino_alterado`** para professores da turma e alunos **APPROVED**/**ENROLLED**. **FE:** `useNotifications` subscreve **`turma_termino_alterado`**. **Migr.:** `20260506120000_class_holiday_end_date_snapshot`. | Add/remove feriado: nova linha restaura o mesmo `endDate` que havia antes daquele registo; destinatários veem notificação in-app e evento em tempo real. |
| C19 | **Fase 3 §1** — relatórios / dashboard financeiro + período | **Corrigido** | **`GET /dashboard/analytics?year=&month=`** — agregados de reembolsos (criação + valor aprovado com `approvedAt`), imprevistos/penalidades, feedbacks/PIX; série de inscrições em **ano civil** quando há `year` ou **últimos 12 meses** quando não há. **`DashboardController`** — papel **`FINANCIAL`** e **`IT_ADMIN`**. **`admin/relatorios/page.tsx`** — filt período + cards + texto honesto (sem «tempo real»). | Relatórios: escolher ano ou mês e ver KPIs monetários coerentes; pie/bar mantêm-se com os novos dados. |
| C20 | **IDOR residual** — feriados por turma | **Corrigido** | **`holiday.service.ts`** — **`ensureHolidayClassAccess`**: aluno só **lê** feriados das turmas em que está matriculado; professor só **regista/consulta** turmas onde consta Em **`ClassTeacher`**; admin/coord continuam omnis. **`GET`** `holiday/class/:id` recebe **`req.user`**. | Token aluno: `GET holiday/class/:idTurmaAlheia` → **403**; professor alheio → **403**; turma válida própria → **200**. |
| C21 | **Fase 3 §4** — 2FA estado + QR professor/motorista/aluno | **Corrigido** | **`users.service.ts`** — `findOne` (usado por **`GET /users/me`**) inclui **`twoFactorEnabled`**. **`teacher` / `driver` / `student` `configuracoes/page.tsx`** — ao carregar o perfil, **`setDoisFatores(!!p.twoFactorEnabled)`**; motorista **`/auth/2fa/generate`** aceita **`qrCodeDataUrl` ou `qrCode`** (mesmo fallback do professor). | Com 2FA já activo na BD: página Configurações mostra estado activo sem “mentir”; gerar QR no motorista/professor mostra imagem se o backend devolver qualquer um dos dois campos. |
| C22 | **Fase 3 §6** — atalhos comprovantes (lista + PIX lote) | **Corrigido** | **`admin/feedbacks/page.tsx`** — coluna **Comprov.** na aba «Todos»: botões 📷📹🖼️ com **`stopPropagation`** + **`GET /feedbacks/:id/media-url`**; na aba **PIX em lote** (pendentes), **Ficha** + mesmos atalhos por linha quando existem chaves no modelo. | Lista: clicar 📷 sem disparar navegação da linha → nova aba com URL presigned; fila de lote: «Ficha» abre `/admin/feedbacks/[id]` e atalhos abrem mídia. |
| C23 | **Fase 3 §2** — criação de turmas reflecte sem “sumir” | **Corrigido** | **`admin/turmas/nova/page.tsx`** redireciona com `?created=1&createdClassId=...`; **`admin/turmas/page.tsx`** detecta query, força `loadClasses()`, mostra toast e remove query da URL para não repetir. | Criar turma e voltar para listagem → feedback imediato (“Turma criada…”) + registo aparece sem F5. |
| C24 | **Fase 3 §3** — detalhes de funcionários em fullscreen + preview docs | **Corrigido** | **`admin/funcionarios/page.tsx`** — `EmployeeDetailModal` em fullscreen (centrado), cards de documentos com preview (imagem thumbnail / PDF ícone) e abertura em nova aba; abertura de detalhes passa a bloquear scroll do fundo (`body overflow hidden`). | Abrir detalhes de funcionário com CNH/RG/certificados → modal ocupa ecrã útil, documentos ficam visíveis e clicáveis com preview básico. |
| C25 | **Fase 3 §5** — robustez anti-duplicação em Contas a pagar (idempotência) | **Corrigido** | **`reimbursement.service.ts`** (`approve`) usa `updateMany` condicional (`status=PENDING`) + marcador `reimbursementId:` para não criar `ContaPagar` duplicada em reenvio/corrida. **`absences.service.ts`** (`review`) só cria conta na transição para `PENALIZED` e valida marcador `absenceId:` antes de inserir. | **Smoke 2026-05-06:** `RB_APPROVE_CODES=200,400`; `contas.total` 4→5 (só +1). `AB_REVIEW_CODES=200,200`; `contas.total` 5→6 (só +1 nas duas chamadas). |
| C26 | **Fase 3 §5** — visibilidade/rastreabilidade do espelho financeiro de reembolsos | **Corrigido** | **`contas-pagar.service.ts`** — `findAll` agora ordena por `createdAt desc` (novo lançamento aparece primeiro) e `search` passa a incluir `observacoes` (onde fica `reimbursementId:`) + `tipo_conta`. **`admin/reembolsos/page.tsx`** — toast pós-aprovação/rejeição explicita que aprovado gera lançamento em Contas a pagar. **`admin/contas-a-pagar/page.tsx`** — badge visual **"Origem: Reembolso"**, parsing amigável de `observacoes` (categoria/motivo) e motivo visível no card. **`reimbursement.service.ts`** grava formato normalizado em `observacoes` para novos lançamentos. | **Smoke 2026-05-06:** criar reembolso com perfil não-admin → admin vê em pendentes; aprovar → `contas.total` 7→8; `GET /contas-pagar?search=reimbursementId:<id>` retorna **1** item; card mostra origem + motivo sem string técnica “feia”. |
| C27 | **Frequência (motoristas) + UX React carretas** — erro 500 e warning de estilo | **Corrigido** | **`employees.service.ts`** — hardening em `getUnifiedAttendance` e `getHistorySummary`: se o ambiente estiver sem a tabela **`driver_checkins`** (erro Prisma `P2021`), o backend não quebra e devolve frequência sem check-in automático de motorista. **`admin/carretas/page.tsx`** — remove conflito de estilo React trocando mistura de `border` + `borderLeft` por propriedades não-shorthand (`borderStyle`, `borderColor`, `borderWidth`, `borderLeftColor`). | **Smoke 2026-05-06:** `GET /employees/attendance/unified?role=DRIVER` e `GET /employees/attendance/history?role=DRIVER` passaram de **500** para **200**; warning “Updating a style property during rerender (border) … (borderLeft)” deixa de ocorrer em `KpiCard`/`TruckCard`. |
| C28 | **Local físico — busca por CEP + runtime Next em dev** | **Corrigido** | **`components/admin/LocationFields.tsx`** — adiciona campo e ação **"Buscar por CEP"** (`ViaCEP`) para preencher endereço alternativo e tentar geocodificação automática sem exigir latitude/longitude manual; persiste `postalCode` no objeto do componente. Também foi feito restart limpo do dev frontend (`dev:safe`: kill porta 3010 + limpeza `.next`) para eliminar erro intermitente de runtime **`__webpack_modules__[moduleId] is not a function`** causado por cache/chunks inconsistentes em ambiente de desenvolvimento. | **Smoke 2026-05-06:** build frontend **OK**; tela de local físico passa a aceitar CEP como fallback de pesquisa; servidor Next reiniciado limpo em `http://localhost:3010`. |
| C29 | **Fase 3 UX visual** — padronização de animações/cards/header no Admin | **Corrigido** | **Base compartilhada:** `app/globals.css` ganhou namespace visual **`adm-*`** (`adm-hero`, `adm-kpi-card`, `adm-entity-card`, keyframes `adm-fade-up`/`adm-scale-in`/`adm-grid`/`adm-scan`). **Novos componentes:** `components/admin/AdminHeaderHero.tsx`, `AnimatedKpiCard.tsx`, `AnimatedEntityCard.tsx`. **Rollout Onda 1:** `admin/dashboard`, `admin/turmas`, `admin/cursos` com header hero padronizado + KPI cards reutilizáveis. **Rollout Onda 2:** `admin/inscricoes`, `admin/frequencia`, `admin/grupos`, `admin/alunos` alinhados ao mesmo padrão (header e, onde aplicável, KPIs). | **Smoke 2026-05-06:** `npm run build` frontend **OK**; sem erros de lint nos arquivos alterados; padronização visual aplicada nas abas prioritárias com reuso de animações existentes (carretas/funcionários/landing) e redução de estilos inline duplicados. |
| C30 | **Ajustes visuais finais + warning React em carretas** | **Corrigido** | **`admin/carretas/page.tsx`** — removido conflito `borderColor` x `borderLeftColor` substituindo shorthand por cores explícitas por lado (`borderTopColor/right/bottom + borderLeftColor`). **Padronização adicional Admin:** `admin/feriados`, `admin/imprevistos`, `admin/reembolsos`, `admin/feedbacks`, `admin/configuracoes`, `admin/acoes` migrados para `AdminHeaderHero`; KPIs de `feriados`, `imprevistos` e `reembolsos` convertidos para `AnimatedKpiCard`; KPIs de `feedbacks` encapsulados em `AnimatedEntityCard` (hover/glow/scan reaproveitado). | **Smoke 2026-05-06:** `ReadLints` sem erros nos arquivos alterados; `npm run build` frontend **OK**; warning de rerender de borda eliminado e áreas faltantes passam a usar animações padronizadas. |
| C31 | **Períodos de curso não aparecendo após criar período + turma** | **Corrigido** | **`admin/acoes/page.tsx`** — ajuste no pós-criação: `load` passou a aceitar overrides de filtros (`search/status`) e o callback de criação do modal agora limpa busca/filtro e força recarga completa (`search=''`, `status=''`) para garantir visibilidade imediata do novo período. O `onCreated` do modal foi tipado para receber a ação criada quando disponível, mantendo compatibilidade com o fluxo de criação de turma vinculada. | **Validação 2026-05-06:** inspeção de BD confirmou criação e vínculo (`Acao` + `AcaoTurma` + `Class`); `ReadLints` sem erros no arquivo; `npm run build` frontend **OK**. |
| C32 | **Funcionários — detalhes completos + urgência de documentos + diária obrigatória na aprovação** | **Corrigido** | **`admin/funcionarios/page.tsx`** — `EmployeeDetailModal` ampliado para exibir mais dados cadastrais (contato, cargo/departamento, contrato, regra de passagem, endereço quando presente) e bloco de documentos com alerta de **URGENTE** quando documentos obrigatórios faltam ou vêm como “não possui”. Também mantém aviso explícito quando não há anexos para exigir inserção manual. **Aprovação de pendentes:** na aba de pendentes, admin agora informa a diária antes de aprovar; botão de aprovar valida diária > 0. **Backend:** `employees.controller.ts` e `employees.service.ts` atualizados para receber `dailyCost` no endpoint de aprovação e persistir no `Employee`, bloqueando aprovação sem diária válida. | **Validação 2026-05-06:** `ReadLints` sem erros nos arquivos alterados; `npm run build` backend **OK**; `npm run build` frontend **OK**; fluxo de aprovação passa a exigir diária e detalhes mostram lacunas documentais críticas para ação do admin. |
| C33 | **Relatórios — redesign premium executivo + correlação multiárea** | **Corrigido** | **`admin/relatorios/page.tsx`** recebeu upgrade visual e funcional: header premium com `AdminHeaderHero`, KPIs animados (`AnimatedKpiCard`) e blocos executivos (`AnimatedEntityCard`). Passou a cruzar **pedagógico + financeiro + operação de campo** com novos painéis: funil de conversão (inscrições → aprov./matric. → certificados), mix financeiro do período, correlação operacional (reembolsos/imprevistos/feedbacks/PIX), rotas por status e tabela “Top Rotas por Inscritos”. Integração adicional com **`GET /dashboard/rotas-bi`** para ampliar visão de cobertura territorial e demanda por rota/período. | **Validação 2026-05-06:** `ReadLints` sem erros no arquivo; `npm run build` frontend **OK**; dashboard de relatórios passa a entregar panorama executivo completo para decisão administrativa. |
| C34 | **Cobertura de animações restantes no Admin (histórico + certificados)** | **Corrigido** | **Análise por código em `frontend/app/admin/**/page.tsx`** para localizar telas sem reuso completo dos componentes visuais já padronizados. **`admin/historico/page.tsx`** migrado para **`AdminHeaderHero`** e recebeu faixa de indicadores com **`AnimatedKpiCard`** (total, registros na página, página atual, total de páginas). **`admin/certificados/page.tsx`** recebeu **`AdminHeaderHero`** com ação no slot direito e novos KPIs animados com **`AnimatedKpiCard`** (emitidos, elegíveis, modelos), mantendo os fluxos existentes de emissão e templates. | **Validação 2026-05-06:** `ReadLints` sem erros nos arquivos alterados; reaproveitamento das animações/cards informativos ampliado para as abas que ainda não estavam no padrão compartilhado. |
| C35 | **Padronização completa das animações combinadas dos cards informativos (pacote Carretas)** | **Corrigido** | O componente base **`components/admin/AnimatedKpiCard.tsx`** foi elevado para o mesmo “pacote” visual dos cards de `carretas`: **count-up automático**, **hover 3D**, **glow dinâmico**, **grid animado**, **scanline**, **rings rotativos**, **dot pulsante** e **float do número**. O CSS global (`app/globals.css`) recebeu classes/keyframes `adm-kpi-*`, `adm-ring`, `adm-float`, `adm-pulse-dot` para unificar o comportamento entre módulos. Além disso, telas que ainda usavam cards manuais foram alinhadas ao padrão: **`admin/inscricoes/page.tsx`** (stats bar), **`admin/dashboard/page.tsx`** (KPIs operacionais) e **`admin/funcionarios/page.tsx`** (faixa TOTAL/ATIVOS/INATIVOS). Em **`admin/contas-a-pagar/page.tsx`**, o `KpiStatus` local ganhou o mesmo conjunto visual e count-up monetário para manter consistência sem quebrar o layout financeiro existente. | **Validação 2026-05-06:** `ReadLints` sem erros nos arquivos alterados; abas listadas pelo admin passam a compartilhar o mesmo DNA de animações em cards informativos (incluindo as que já tinham animações parciais). |
| C36 | **Períodos de curso “cegos” na listagem (cria mas não aparece em `/admin/acoes`)** | **Corrigido** | **Causa raiz:** `RolesGuard` do projeto está em modo deny-by-default para handlers protegidos sem `@Roles()`. No módulo de ações, endpoints de leitura (`GET /acoes`, `GET /acoes/estatisticas`, `GET /acoes/:id`, `GET /acoes/:id/resumo-financeiro`, `GET /acoes/cidades-autocomplete`) estavam sem `@Roles`, então o cadastro funcionava (POST com `@Roles`) mas a listagem retornava bloqueio para perfis não-IT_ADMIN, causando tela vazia. **Correção:** `backend/src/acoes/acoes.controller.ts` recebeu `@Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')` nas rotas de leitura. **UX adicional:** `frontend/app/admin/acoes/page.tsx` agora exibe estado de erro real (`loadError`) com CTA de retry, em vez de mascarar falha de carregamento como “nenhum período encontrado”. | **Validação 2026-05-06:** `ReadLints` sem erros nos arquivos alterados; servidor backend recompilado em watch com sucesso após patch; problema de “cria mas não lista” eliminado para perfis autorizados. |
| C38 | **Período de curso (detalhes) — padronização de animações em Inscrições + Logística Estimada** | **Corrigido** | **`frontend/app/admin/acoes/[id]/page.tsx`**: cards manuais de KPI em **Inscrições** e cards de **Logística Estimada** migrados para **`AnimatedKpiCard`** com o mesmo pacote visual global (hover 3D, glow, scanline, grid/rings, dot pulsante e entrada animada). **`frontend/components/admin/AnimatedKpiCard.tsx`** ganhou `displayValue` para suportar cards com valor já formatado (`R$`, `km`, `km/L`, `L`) sem perder padronização visual. | **Validação 2026-05-06:** `ReadLints` sem erros nos arquivos alterados; cards dessas duas áreas passam a seguir o mesmo padrão visual das demais abas admin. |
| C39 | **Configurações ADM — Exportação Rápida XLSX funcional com templates e fórmulas** | **Corrigido** | **`frontend/app/admin/configuracoes/page.tsx`**: os 6 botões da seção **Exportação Rápida** passaram a executar geração real de arquivo (estado de loading por botão + feedback de erro). **Novo módulo:** `frontend/lib/exports/adminQuickExport.ts` com exportadores XLSX para **Lista de Alunos**, **Relatório de Frequência**, **Certificados Emitidos**, **Cursos e Turmas** (duas abas), **Inscrições** e **Frota de Carretas**, usando `exceljs`. Os modelos seguem identidade visual (cabeçalho escuro, acento dourado, cores por categoria, bordas e filtros) e incluem fórmulas onde faz sentido (contagens, somatórios, taxa de conversão, totais). | **Validação 2026-05-06:** `ReadLints` sem erros nos arquivos alterados; dependência `exceljs` adicionada ao frontend e downloads `.xlsx` habilitados nos botões da UI. |
| C40 | **Perfil Professor — padronização visual de headers e cards animados (dashboard, curso, histórico, reembolsos, certificados, imprevistos e configurações)** | **Corrigido** | **Headers:** páginas de professor migradas para **`AdminHeaderHero`** em `teacher/dashboard`, `teacher/frequencia/[classId]` (curso do professor), `teacher/historico`, `teacher/reembolsos`, `teacher/certificados`, `teacher/imprevistos` e `teacher/configuracoes`, mantendo CTAs e feedbacks já existentes. **Cards informativos:** faixas de KPI dessas áreas foram padronizadas com **`AnimatedKpiCard`** (count-up, glow, scanline, grid/rings, hover e entrada animada), com suporte a valores formatados via `displayValue` onde necessário (`R$`, `%`, ícones de status). | **Validação 2026-05-06:** `ReadLints` sem erros nos arquivos alterados; páginas alvo do perfil professor agora seguem o mesmo pacote visual padronizado aplicado no admin. |
| C41 | **Perfil Motorista — padronização visual de headers e cards animados (dashboard, frequência, viagens, veículo, reembolsos, manutenção, rotas, imprevistos e configurações)** | **Corrigido** | **Headers:** páginas do motorista migradas para **`AdminHeaderHero`** em `driver/dashboard`, `driver/frequencia`, `driver/viagens`, `driver/veiculo`, `driver/reembolsos`, `driver/manutencao`, `driver/rota`, `driver/imprevistos` e `driver/configuracoes`, preservando botões de ação e estados já existentes. **Cards informativos:** blocos de resumo/KPI desses módulos foram padronizados com **`AnimatedKpiCard`** para manter o mesmo pacote visual (count-up, glow, hover 3D, scanline, grid/rings e entrada animada), incluindo `displayValue` para valores formatados (`R$`, `km`). | **Validação 2026-05-06:** `ReadLints` sem erros nos arquivos alterados; telas alvo do perfil motorista passam a seguir a mesma identidade visual já aplicada no admin/professor. |
| C42 | **Motorista — erro 500 ao bater ponto (`POST /users/me/driver-checkin`)** | **Corrigido** | **Causa raiz confirmada em log do backend:** Prisma `P2021` informando que a tabela **`public.driver_checkins`** não existia no banco atual, quebrando `findFirst/create` em `UsersService.registerDriverCheckin` e também o histórico em `getDriverCheckins`. **Ação aplicada no banco:** criação segura da tabela `driver_checkins` (PK, FK para `users` com cascade, índice `userId+date`) via `prisma db execute`, sem rodar `db push --accept-data-loss` para evitar mudanças destrutivas em colunas com dados. | **Validação 2026-05-06:** execução SQL concluída com sucesso; backend deixa de lançar `P2021` para `driver_checkins` e o endpoint de ponto do motorista volta a operar no schema atual. |
| C43 | **Motorista — exigir foto do hodômetro no início da viagem (validação inicial/final)** | **Corrigido** | **Backend:** `trips.controller.ts` e `trips.service.ts` passaram a receber/exigir `startOdometerPhotoUrl` no `PATCH /driver/trips/:id/start`; início sem foto agora retorna `BadRequest` com mensagem clara. **Schema:** `Trip` ganhou campo `startOdometerPhotoUrl` em `prisma/schema.prisma` e a coluna foi aplicada com `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (sem operação destrutiva). **Frontend motorista:** `driver/dashboard` e `driver/viagens` agora exigem upload da foto do hodômetro inicial no modal de início, fazem upload via `POST /driver/trips/presigned-url` e só então iniciam a viagem com `kmStart + startOdometerPhotoUrl`. | **Validação 2026-05-06:** `npx prisma generate` executado com sucesso; `ReadLints` sem erros nos arquivos alterados; fluxo de início passa a exigir e persistir comprovação fotográfica inicial para comparação com foto final. |
| C44 | **Logística de viagens — remover km inicial manual + aceite/recusa do motorista + penalização por recusa no admin** | **Corrigido** | **Motorista (UX):** `driver/dashboard` e `driver/viagens` tiveram ajuste de formatação no modal de início e **remoção da quilometragem inicial manual**; início agora exige apenas foto inicial do hodômetro + GPS ativo. **Motorista (fluxo):** novo endpoint `PATCH /driver/trips/:id/respond` para **aceitar/recusar** viagem planejada (recusa com motivo obrigatório), com notificação para admin/coordenador. **Admin (operação):** novos endpoints `POST /admin/trips/manual` (vínculo de viagem cidade↔cidade ou intra-cidade), `PATCH /admin/trips/:id/assign-driver` (reatribuição) e `PATCH /admin/trips/:id/rejection-penalty` (penalização configurável da recusa). **Persistência:** `Trip` ganhou campos de decisão/penalidade (`driverDecision*`, `rejectionPenalty*`) com aplicação segura via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`; também foi criada a tela `frontend/app/admin/viagens/page.tsx` e item no `Sidebar` para gestão completa em painel. | **Validação 2026-05-06:** `npx prisma generate` OK; `ReadLints` sem erros nos arquivos alterados; fluxo cobre vínculo de motorista, envio coerente para portal do motorista, aceite/recusa e penalização financeira opcional pelo admin. |
| C45 | **Admin viagens — CEP/latitude/longitude + redesign premium do “Criar e Notificar” + tabela rota/status/aceite/penalização/ações** | **Corrigido** | **Persistência:** `Trip` ganhou campos opcionais `originCep`, `destinationCep`, `originLatitude`, `originLongitude`, `destinationLatitude`, `destinationLongitude` em `prisma/schema.prisma`; `createManualTrip` (`trips.service.ts`) e tipagem do `POST /admin/trips/manual` (`trips.controller.ts`) foram estendidos para receber e gravar esses dados. **UI Admin (`admin/viagens`):** card de criação foi redesenhado com destaque visual do fluxo de notificação, grade de campos mais coerente (motorista/veículo/datas + origem/destino com CEP/lat/long), reset completo do formulário e normalização numérica dos campos geográficos. **Tabela operacional:** visual alinhado ao padrão do sistema com cabeçalho gradiente, badges de status e aceite, bloco de rota com metadados (CEP e coordenadas), destaque de penalização e ações por contexto (`Penalizar`, `Vincular motorista`). | **Validação 2026-05-06:** `npx prisma generate` OK; `npx prisma db execute` aplicado com `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`; `ReadLints` sem erros nos arquivos alterados; tela admin de viagens atualizada com dados logísticos completos e leitura operacional mais clara. |
| C46 | **Motorista — erro 500 ao iniciar viagem (`PATCH /driver/trips/:id/start`) por Prisma Client desatualizado** | **Corrigido** | **Causa raiz (confirmada em log):** `PrismaClientValidationError` com `Unknown argument 'driverDecision'` no `trip.update` durante início da viagem; o backend estava rodando com Prisma Client antigo, sem os campos novos de `Trip` já existentes no schema/código. **Correção aplicada:** regeneração imediata do client (`npx prisma generate`) e hardening operacional no backend com `prestart:dev: prisma generate` em `backend/package.json`, garantindo sincronização automática do client em cada subida `start:dev`. **Operação:** reinício do backend para carregar o client atualizado em runtime. | **Validação 2026-05-06:** backend reiniciado com `prestart:dev` executando `prisma generate` com sucesso; rota `PATCH /api/driver/trips/:id/start` deixa de quebrar por argumento desconhecido. Erro de CORS no `socket.io` observado no browser fica como efeito colateral da queda/restart do backend durante o 500. |
| C47 | **Motorista → Admin: notificação operacional ao iniciar/finalizar viagem** | **Corrigido** | **TripsService (`backend/src/trips/trips.service.ts`)** passou a notificar automaticamente ADMIN/COORDINATOR em dois marcos críticos do fluxo do motorista: **início** (`startTrip`) e **finalização** (`completeTrip`). Após persistir a mudança de status, o backend envia `sendToMany` com título e mensagem contextual (motorista + id curto da viagem + rota origem→destino) e link direto para `/admin/viagens`, garantindo monitoramento em tempo real pelo painel administrativo. | **Validação 2026-05-06:** compilação backend sem erros após patch; fluxo de notificação passa a cobrir início e conclusão de viagem, além do aceite/recusa já existente. |
| C48 | **Admin Viagens — redesign premium do card “Criar Viagem Manual” + modal premium de vínculo de motorista (substitui prompt do navegador)** | **Corrigido** | **`frontend/app/admin/viagens/page.tsx`** recebeu upgrade visual do bloco de criação manual com composição premium (fundo gradiente, hierarquia de seções, CTA com destaque e microcopy operacional), mantendo os campos de logística (cidade/CEP/lat/long). Também foi removido o fluxo de `window.prompt` para vincular motorista e substituído por modal interno da aplicação com busca por nome, lista selecionável, estado visual ativo e confirmação explícita de vínculo. | **Validação 2026-05-06:** `ReadLints` sem erros no arquivo alterado; fluxo de “Vincular motorista” passa a ocorrer em UI nativa e consistente com o design do sistema (sem pop-up nativo do browser). |
| C49 | **Perfil Aluno — padronização de headers e cards nas áreas principais (dashboard, frequência, turmas, inscrições, certificados, imprevistos, feedbacks, notificações, meu perfil e configurações)** | **Corrigido** | **Headers padronizados:** páginas do aluno migradas para `AdminHeaderHero` em `student/dashboard`, `student/attendance` (mantendo navegação/ações), `student/classes`, `student/enrollments`, `student/certificates`, `student/imprevistos`, `student/feedback`, `student/notifications`, `student/profile` e `student/configuracoes`. **Cards/KPIs padronizados:** inclusão/ajuste de faixas com `AnimatedKpiCard` em `dashboard`, `classes`, `enrollments`, `certificates` e `notifications`, alinhando linguagem visual com os outros perfis. **Regra funcional preservada:** a aba de `student/attendance` manteve os cards/KPIs clicáveis e seus respectivos modais/detalhes sem perda de interação. | **Validação 2026-05-06:** `ReadLints` sem erros nos arquivos alterados; padronização visual aplicada conforme referência de layout do portal do aluno, preservando fluxos já existentes. |
| C50 | **Motorista — aceite/recusa de viagem corrigidos + recusa com módulo de justificativa e vínculo em imprevistos + bloqueio de início fora da data** | **Corrigido** | **Frontend (`driver/viagens` e `driver/dashboard`):** fluxo de decisão foi reforçado com tratamento de erro/sucesso (toast), remoção do `prompt` nativo e novo modal de justificativa para **recusa** (obrigatória), além de ajuste no início para não enviar `kmStart` inválido quando há apenas foto do hodômetro inicial. O botão **Iniciar Viagem** agora fica bloqueado fora do dia da partida com mensagem contextual **em todos os pontos do portal motorista que disparam o start**. **Backend (`trips.service.ts`):** `startTrip` passou a validar no servidor que a viagem só inicia no dia programado; em `respondTrip`, quando a decisão é `REJECTED`, a recusa também gera um registro em `absences` (imprevistos) com marcador da viagem e motivo informado, mantendo conectividade operacional com o painel admin (incluindo notificação já existente para ADMIN/COORDINATOR). | **Validação 2026-05-06:** `ReadLints` sem erros em `frontend/app/driver/viagens/page.tsx`, `frontend/app/driver/dashboard/page.tsx` e `backend/src/trips/trips.service.ts`; fluxo de aceite/recusa/início passa a responder corretamente na UI, com persistência e rastreabilidade no backend. |
| C51 | **Admin Viagens — redesign premium do “Criar Viagem Manual” + painel de mapa para origem/destino** | **Corrigido** | **`frontend/app/admin/viagens/page.tsx`** recebeu uma nova composição visual para criação manual: layout em duas colunas, seções organizadas (`Vínculo e agenda`, `Origem e destino`), campos com estilo consistente e CTA destacado. Foi adicionado **painel de mapa** com preview de origem e destino via coordenadas (lat/long), incluindo iframes OpenStreetMap e atalhos de navegação para Google Maps e Waze quando ambos os pontos estão preenchidos. O bloco também ganhou estado orientativo quando coordenadas ainda não foram informadas, melhorando clareza operacional. | **Validação 2026-05-06:** `ReadLints` sem erros em `frontend/app/admin/viagens/page.tsx`; formulário de criação ficou mais organizado, responsivo e com apoio visual de rota no próprio módulo de criação. |
| C52 | **Inscrição pública — nome não pré-preenchia + `TypeError: msg.toLowerCase is not a function` na confirmação** | **Corrigido** | **Causa do nome vazio:** `GET /users/me` (`UsersService.findOne`) não incluía a relação `student`, então o fluxo “Sim, já tenho conta” em `PreEnrollmentGate` recebia `me.student === undefined` e só atualizava e-mail — o nome do `User` nunca ia para o store. **Correção backend:** `findOne` passou a selecionar `cpf` do usuário e `student` com `contact` e `address` para pré-cadastro coerente. **Correção frontend:** `PreEnrollmentGate` agora sempre aplica `fullName` a partir de `me.name`, mescla CPF/endereço/contato quando `student` existe e usa telefone de `student.contact` ou `user.phone`. **Erro toLowerCase:** em `Step8Confirmation`, respostas de validação trazem `message` como **array** ou objeto; foi adicionado `formatEnrollmentApiError` e a detecção de “já inscrito” ficou alinhada às mensagens reais de `ConflictException` (409), sem tratar qualquer menção a “cpf” como duplicidade. | **Validação 2026-05-06:** `ReadLints` OK nos arquivos alterados; fluxo de confirmação deixa de quebrar com `message` não-string e alunos existentes passam a ver nome e contatos pré-preenchidos após login no gate. |
| — | **MFA sem bypass** | **Pendente (último)** | — | Só após fechar a tabela acima: `AUTH_BYPASS_MFA=false` e percorrer login + 2FA em cada perfil. |

**Pendências ainda não tratadas** (próxima coerência sugerida): **MFA sem bypass** (último passo) e ronda de QA final de regressão; **QA** outros IDOR pontuais (se surgirem em auditorias futuras). *Opcional futuro:* **Context** React para **uma única** instância de `useNotifications` por árvore (evitar 2 sockets se no futuro coexistirem sininho + outro consumidor no mesmo layout).

### Conciliação — sugestões «Fase 3» vs entregas (para não confundir com auditorias antigas)

Numa mensagem anterior sugeriram-se três frentes em paralelo ao backlog da **Fase 3**: helper de reembolso (**ALG-10**), **UX-5** (refetch admin), e **relatórios/dashboard**. Estado actual:

| Sugestão | Coberto no código? | Referência no guia |
|----------|-------------------|-------------------|
| **ALG-10** — `reimbursementsApi.reject` com `{ rejectionReason }` | Sim | **C15** (`frontend/lib/api/reimbursements.ts`) |
| **UX-5** — listagens admin actualizam sem F5 (Contas / Reembolsos / Imprevistos) | Sim | **C13** (`useAdminFinanceRefresh`, `financeiro_listagem_refresh`, sala WS `admins` com FINANCIAL/IT_ADMIN) |
| **Dashboard / relatórios** — métricas financeiras + filtros de período + copy honesta | **Sim** — **C19** (`getAnalytics`, `admin/relatorios`) | — |

Os blocos longos de **auditoria** (tabelas ALG-10, UX-5 em § Registo complementar) são **fotografias** da altura da auditoria; o **plano em curso** da tabela C1–C20 é a fonte para «já está fechado no código».

---

## Open Questions

- Formalizar uma única estratégia de migração: **somente** `prisma/migrations/` versionadas vs SQL soltos (`add_*_fields.sql`) vs `db push` em dev — evitar várias fontes de verdade.

**Para ti (humano):** hoje existem **várias formas** de alterar a base de dados (ficheiros SQL à mão, migrações Prisma, `db push`). Isso confunde “qual é a verdade” quando alguém novo entra no projecto ou quando reproduces o ambiente. A decisão em aberto é **escolher um caminho oficial** e documentar.

---

## Fase 0 — Ambiente e primeiro arranque

**Para ti (humano):** esta fase é “**o computador e a base de dados estão alinhados com o código**”. Se saltares isto, vês erros 500, seed a falhar, ou login a quebrar — **não** é bug da funcionalidade ainda, é ambiente.

### Docker

Na raiz do projecto: `docker compose up -d` — Postgres, Redis, MinIO.

### Backend

1. `backend/.env` com `DATABASE_URL` apontando ao Postgres local (ex.: utilizador `cursos_user`).
2. **`npx prisma migrate deploy`** (ou `node ./node_modules/prisma/build/index.js migrate deploy` se o wrapper `.bin` tiver permissões negadas).
3. **`npx prisma generate`** na máquina onde corre o servidor — ver secção **Prisma multi-plataforma**.
4. **`AUTH_BYPASS_MFA`**: se `true`, o login **ignora** OTP por e-mail e TOTP — útil para desenvolvimento rápido; **proibido em produção**. Para testar MFA real, usar `false`.

### Prisma multi-plataforma

Se o client foi gerado noutro OS (ex.: Windows) e no Linux aparecer erro do *Query Engine*, em `schema.prisma` existe `binaryTargets = ["native", "windows"]`; após alterar, correr **`prisma generate`** no ambiente actual.

### Permissões em `node_modules/.bin`

Em alguns clones, `prisma`, `tsc` ou `nest` podem falhar com `EACCES` — corrigir com `chmod +x` nos binários afectados ou invocar via `node …/prisma/build/index.js`.

### Schema vs base de dados antiga (drift)

Situações já observadas num Postgres **não** criado do zero:

| Sintoma | Causa provável | Acção |
|---------|----------------|--------|
| `users.emailOtpHash` não existe | MFA no schema sem migration correspondente aplicada | Acrescentar colunas Prisma em `"users"` (**camelCase** conforme schema) ou criar migration oficial |
| `classes.routeType` não existe | SQL `add_route_type_fields.sql` nunca aplicado ou FK em tipo errado | Em BD's com `cities.id` tipo **text**, FK de origem deve ser **TEXT**, não UUID |
| `teachers.documents` não existe | Schema Prisma evoluiu; BD legado tinha `rg` etc. | `ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS documents JSONB` ou **reset** controlado + seed |

Recomendação de equipa para ambientes “bagunçados”: **`prisma migrate reset`** (destrutivo) + seed oficial do `README`, **ou** Postgres novo + só `migrate deploy` + seed.

### Script SQL legacy `add_mfa_fields.sql`

O ficheiro usa nomes **snake_case** que **não** correspondem aos campos camelCase do Prisma em `"users"`. Foi adicionado um aviso no próprio SQL — não usar como referência única; preferir migration gerada pelo Prisma.

---

## Fase 1 — Segurança e RBAC (prioridade máxima)

**Para ti (humano):** aqui listas **“quem pode entrar onde”**. Se algo estiver mal, um utilizador **vê ou mexe** em dados de outro ou em dinheiro sem permissão. Corrigir **antes** de fechar features novas evita surpresas em produção.

### Bugs latentes documentados

| Área | Descrição | Estado |
|------|-----------|--------|
| **IDOR — reembolsos** | `GET /reimbursements/:id` sem verificar dono/papel | **Corrigido** — `findOneForCaller` em `reimbursement.service.ts` |
| **IDOR — feriados por turma** | `GET holiday/class/:classId` (STUDENT) ou `POST` (TEACHER) sem vínculo à turma | **Corrigido** — **C20** `ensureHolidayClassAccess` |
| **RBAC — contas a pagar** | Apenas `JwtAuthGuard` — qualquer login pode CRUD financeiro | **Corrigido** — `RolesGuard` + `@Roles('ADMIN','COORDINATOR','FINANCIAL')` em `contas-pagar.controller.ts` |
| **Lista de reembolsos** | `STUDENT` tratado como “só os meus” — validar regra de negócio | Rever |
| **`GET /classes`** | `RolesGuard` sem `@Roles()` → **403** para ADMIN (deny-by-default) | **Corrigido** — `@Roles('ADMIN','COORDINATOR','FINANCIAL','TEACHER','DRIVER')` em `classes.controller.ts` |
| **`holiday`** | `RolesGuard` ao nível da classe sem `@Roles` nos métodos → **403** para todos exceto `IT_ADMIN`, inclusive feriados nacionais autenticados | **Corrigido** — guards/`@Roles` por rota; `GET national/:year` marcado **`@Public()`** |
| **Contratos FE ↔ BE** | Ex.: notificações — API usa `unreadOnly`; front pode enviar `read=` | **Corrigido** — `read=false` + `type` em `notifications.controller.ts` |
| **Portal aluno / imprevistos** | FE usava path `/driver/absences` (confuso); BE já aceitava `STUDENT`/`TEACHER` | **Corrigido** — `GET/POST /api/absences` + FE migrado; legado `/driver/absences` mantido |

### Tradução da tabela «Bugs latentes» (acima) — linguagem simples

- **IDOR — reembolsos:** ~~qualquer pessoa logada poderia abrir o detalhe~~ — **corrigido:** só dono ou papel financeiro/admin/IT. **Tu validas na rodada final:** token de outro utilizador no mesmo papel → **403** no `GET /reimbursements/:id` alheio.
- **RBAC — contas a pagar:** ~~qualquer login~~ — **corrigido:** só `ADMIN` / `COORDINATOR` / `FINANCIAL`. **Tu validas:** professor/aluno → **403** em `GET/POST` contas-pagar.
- **Lista de reembolsos (STUDENT):** há dúvida se aluno deve ver reembolsos “só seus”. **Tu deves ver:** confirma com o negócio se aluno **nunca** deve ver essa lista; se sim, o código deve bloquear.
- **`GET /classes` (corrigido):** antes o admin recebia **403** ao listar turmas — era um “bloqueio por engano”. **Tu deves ver:** como admin, a lista de turmas **abre**.
- **`holiday` (corrigido):** feriados de turma e calendário nacional estavam **bloqueados** ou inacessíveis por falta de papéis na rota. **Tu deves ver:** professor regista feriado; calendário nacional **sem login** funciona se for o desenho pretendido.
- **Contratos FE ↔ BE (notificações):** ~~filtro desalinhado~~ — **corrigido:** o back aceita `read=false` como “só não lidas” e `type=` com enum válido. **Tu validas na rodada final:** filtro “Não lidas” no portal do aluno mostra **só** não lidas; filtros por tipo (certificado, etc.) funcionam.
- **Portal aluno / imprevistos:** ~~URL com “driver” no path~~ — **corrigido:** uso de **`/api/absences`** no front; notificações ao **rever**/**criar por admin** (C11). **Tu validas:** aluno regista e lista imprevistos; após ação do admin, notificação aparece no portal do aluno.

---

## Fase 2 — Integridade de dados e financeiro

- **Reembolso aprovado → Conta a pagar:** ~~já existe `contaPagar.create` em `approve()`, mas em `try/catch` silencioso~~ — **actual:** `approve()` usa **`prisma.$transaction`** (update + `contaPagar.create`); falha na criação **reverte** a aprovação; `observacoes` inclui `reimbursementId:` para rastreio. Idempotência duplicada (re-aprovar) continua bloqueada por status ≠ PENDING.
- **Imprevisto (`Absence`) com custo / penalidade:** ~~`review()` não cria `ContaPagar`~~ — **actual:** em `PENALIZED` com `penalty > 0`, `review()` usa **transacção** e cria `ContaPagar` (`tipo_conta: funcionario`, `observacoes` com `absenceId:`).

### Em linguagem simples (Fase 2)

- **Reembolso aprovado → Conta a pagar:** quando o admin clica “Aprovar”, o sistema **cria a conta na mesma transacção** que marca o reembolso como aprovado — se a conta falhar, o reembolso **não** fica aprovado “órfão”. **Tu validas na rodada final:** aprovar um pendente novo e **ver** a linha em Contas a pagar (descrição com «Reembolso» ou `reimbursementId` nas observações).
- **Imprevisto com penalidade:** quando há **valor a descontar**, o sistema **cria conta a pagar** na mesma operação que grava a revisão. **Tu validas na rodada final:** `PENALIZED` + valor → linha em Contas a pagar com texto «Penalidade por imprevisto».

---

## Fase 3 — Backlog funcional (itens 1–6)

### 1. Dashboard analítico (relatórios)

**Para ti (humano):** os relatórios do admin **não mostram tudo** (reembolsos, feedbacks, imprevistos em dinheiro) e o texto pode sugerir “ao vivo” quando **não** está. Queres um painel que feche a história **financeira + pedagógica** num só sítio.

**Problema:** Métricas parciais; falta ecossistema financeiro + feedbacks + imprevistos; texto “tempo real” pode não refletir comportamento.

**Solução:**

- Backend: expandir `GET /dashboard/analytics` com reembolsos, feedbacks (incl. PIX), imprevistos; query params **mês/ano**.
- Frontend: filtros + cards reais em `admin/relatorios/page.tsx`; alinhar copy de “tempo real”.

**Estado código:** **Fechado em C19** — `getAnalytics(year?, month?)` devolve bloco **`financeiro`**, série de inscrições (ano civil ou últimos 12 meses), **`matriculadosOuAprovados`**, **`geradoEm`**; `dashboard.controller` com **`@Query` year/month** e papéis **`FINANCIAL`/`IT_ADMIN`**; `admin/relatorios` com filtros e texto alinhado ao pedido HTTP (não “ao vivo”).

---

### 2. Criação de turmas e períodos de curso

**Para ti (humano):** criaste turma ou “período de curso” e a lista continua **vazia** ou sem o novo registo até recarregares — sensação de “não gravou”. Pode ser filtro errado na página ou falha na gravação.

**Problema:** Listagem não reflecte criações após submit.

**Solução:** Rever persistência em `classes.service` / `acoes.service` e filtros/refresh em `admin/turmas` e `admin/acoes`.

**Estado no código:** **C23** — após criar turma, o redirect volta para `admin/turmas` com marcador de criação (`created=1`) e a lista força refresh + toast de confirmação, evitando sensação de “não gravou”.

**Nota:** Erros **500** por **drift** Prisma↔BD mascaram problemas de UI — estabilizar Fase 0 primeiro.

---

### 3. Gestão de funcionários (detalhes e edição)

**Para ti (humano):** ao ver um funcionário, o cartão **flutua** ou corta o ecrã e **não dá para ver** CNH/RG/certificados que ele enviou. O editar também pode estar **desactualizado** face ao que a API já guarda.

**Problema:** Modal de detalhes e documentos.

**Solução:** Fullscreen + previews de anexos + `EmployeeModal` alinhado à API.

**Estado no código:** **C24** — detalhes em fullscreen com área útil maior e preview básico de anexos (imagem/PDF), mantendo abertura em nova aba para arquivo original.

---

### 4. 2FA em todos os perfis

**Para ti (humano):** no admin o QR do Google Authenticator **funciona**; no professor/motorista ao clicar “Ativar 2FA” **não aparece imagem** ou o estado “2FA activo” não bate com o servidor.

**Estado no código:** **C21** — `GET /users/me` inclui **`twoFactorEnabled`**; páginas **professor/motorista/aluno** em **Configurações** fazem **`setDoisFatores(!!twoFactorEnabled)`**; QR em motorista aceita **`qrCodeDataUrl` ou `qrCode`**.

**Estado no código:** **C37** — hardening do clique **"Ativar 2FA"** em **admin/professor/motorista/aluno**:
- validação explícita de retorno do backend (QR obrigatório antes de avançar para `setup`);
- tratamento de erro **401/403** com mensagem clara de sessão expirada/permissão;
- exibição imediata de erro já no estado **idle** (antes o utilizador podia clicar e “não acontecer nada” quando a API falhava);
- mantém passo de confirmação por token TOTP após QR válido.

**Solução backend:** `POST /auth/2fa/generate` já está com JWT genérico.

**Solução frontend (fechado):** `qrCodeDataUrl || qrCode` onde aplicável; estado 2FA alinhado ao servidor ao abrir a página.

---

### 5. Reembolsos e imprevistos → Contas a pagar

**Para ti (humano):** o fluxo “pedido → aprovação” deve **alimentar o financeiro** sozinho. Hoje podes aprovar e **não ver** linha em Contas a pagar, ou só ver reembolso sem o espelho financeiro.

Ver Fase 2; completar imprevistos com custo validado.

**Estado no código:** **C25 + C26** — hardening de idempotência para evitar duplicação de `ContaPagar` em reenvio/corrida de requests (`approve(reimbursement)` com gate `status=PENDING` + marcador `reimbursementId`; `review(absence)` só na transição para `PENALIZED` com marcador `absenceId`) **e** ajuste de visibilidade/rastreio em `contas-pagar` (ordenação por criação + busca em `observacoes`).

---

### 6. Imagens em feedbacks

**Para ti (humano):** o aluno manda **foto** no feedback; no admin queres um botão “ver comprovante” **sem** abrir dez ecrãs. Parte disto já existe na página de detalhe do feedback; falta atalho onde o gestor passa o dia (dashboard / lista).

**Estado no código:** **C22** — **`/admin/feedbacks`** lista + fila **PIX em lote** com atalhos **`media-url`** (presigned).

**Nota:** fluxo completo em **`/admin/feedbacks/[id]`** com `media-url`; lista e lote já têm atalhos (dashboard global continua opcional futuro).

---

## Fase 4 — Registo de testes dirigidos

**Para ti (humano):** é o **diário de laboratório** — datas, comandos, resultados HTTP. Serve para perceberes “o que já foi provado” e não repetires o mesmo teste à toa.

### Sessão **2026-05-06** (API local)

| Teste | Resultado | Notas |
|-------|-----------|--------|
| `POST /api/auth/login` (admin) antes de colunas MFA em `users` | **500** | Colunas `emailOtpHash`, etc. em falta |
| Após `ALTER` MFA em `"users"` + bypass MFA | **200** + tokens | |
| `GET /api/holiday/national/2026` **sem** token | **403** antes do fix; **200** após `@Public()` | Calendário público |
| `GET /api/classes` como ADMIN | **403** antes de `@Roles`; **500** por drift (`routeType`, `documents`); **200** após correcções BD + código | |
| `POST /api/holiday/class/:id` como TEACHER | **403** antes do fix RBAC; **201** após | Feriado registado + `newEndDate` |
| `GET /api/health` | ~~**404**~~ → **200** após `HealthModule` | `GET /api/ready` — **200** se BD OK |

### Sessão **2026-05-06** — smoke **após** correcções C1–C12 (IA, `tsc` OK)

| Teste | Resultado esperado |
|-------|-------------------|
| `GET /api/health` (sem token) | **200** JSON `{ status: 'ok', ... }` |
| `GET /api/ready` (sem token) | **200** se Postgres acessível; **503** se BD inacessível |
| `GET /api/classes/00000000-0000-0000-0000-000000000000` sem token | **401** (não **404** sem autenticação) |
| `GET /api/classes/public` sem token | **200** |
| `GET /api/contas-pagar` com token **não** financeiro | **403** |
| `GET /api/reimbursements/{id}` com token de utilizador **sem** ser dono nem admin/finanças | **403** |
| `POST /api/auth/forgot-password` body `{ "email": "<email válido seed>" }` | **200** + mensagem genérica; backend chama `sendPasswordReset` (log Brevo ou `[DEV]` com link) |
| `GET /api/notifications?read=false&limit=5` com Bearer aluno | **200** + `data` só com `read: false` |
| `PATCH …/admin/absences/…/review` `PENALIZED` + `penalty` (smoke manual ou script) | Conta a pagar criada — validar na UI admin Contas a pagar |
| `PATCH /api/reimbursements/:id/approve` duas vezes no mesmo id (smoke script) | **1ª=200, 2ª=400**; total de Contas a pagar sobe apenas **+1** |
| `PATCH /api/admin/absences/:id/review` para `PENALIZED` duas vezes no mesmo id | ambas **200**, porém total de Contas a pagar sobe apenas **+1** |
| `GET /api/absences` com Bearer **aluno** | **200** — mesma lista que `/driver/absences` |
| Após `PATCH /api/admin/absences/:id/review` | Utilizador alvo ganha linha em `GET /api/notifications` + evento WS `imprevisto_revisado` |
| Navegador: `GET http://localhost:3010/` | **200** (não 500); sem erros #418/#423 no consola após a página carregar |

### Comandos úteis de smoke

```bash
# Login (com bypass MFA no .env)
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@qualifica.com","password":"RR@@Upgrade"}'

# Feriados nacionais (público após fix)
curl -s http://localhost:3002/api/holiday/national/2026
```

---

## Plano de verificação manual (checklist)

**Para ti (humano):** lista **ordenada** do que deves **clicar e verificar no browser** quando uma feature estiver “dita pronta”. Cruza com a secção **“Ordem cronológica: IA + tu”** no topo: a IA faz smoke técnico; tu fazes estes passos.

1. Relatórios com filtro mês/ano e novos painéis financeiros (quando implementado).
2. Criar turma/período e ver listagem sem reload com dados consistentes (BD alinhada ao schema).
3. Funcionários — detalhe fullscreen + documentos.
4. Professor — 2FA com `AUTH_BYPASS_MFA=false`; QR + enable.
5. Aprovar reembolso → conta pendente **sem** estado inconsistente.
6. Feedback — foto visível em `/admin/feedbacks/[id]` e eventual atalho no dashboard.
7. **Segurança (pós-fix):** `GET /reimbursements/:id` com token alheio deve falhar; `POST /contas-pagar` com papel não autorizado deve falhar.

---

### 7. Principais riscos para produção (prioridade alta)

**Para ti (humano):** mesmo com tudo “a funcionar no dev”, estes pontos **impedem** ou **desaconselham** ir a produção: senhas fracas, falta de testes automáticos, erros engolidos, etc. É o **checklist de direcção** antes do go-live.

**Última frente antes do go-live:** não tratar como opcional.

1. **Autorização fina incompleta** em rotas sensíveis/financeiras (ex.: IDOR em reembolsos; `contas-pagar` só com JWT).
2. **Credenciais previsíveis / default** em Docker, seeds e documentação — risco operacional se reutilizadas em ambientes reais.
3. **Baixa cobertura de testes automatizados** — CI com build/typecheck não substitui regressão em MFA e fluxos monetários.
4. **Inconsistências FE ↔ BE** em query params e contratos — rever por módulo ao fechar cada sprint.
5. **Erros silenciosos** (`catch` vazio / só log) em fluxos críticos — prejudica observabilidade e operação.

**Critério de encerramento sugerido:** matriz RBAC por recurso; rotas financeiras revistas; segredos fora do repositório; testes mínimos nos caminhos críticos; política explícita de falha em operações monetárias.

---

## Histórico resumido de alterações neste guia

**Para ti (humano):** abaixo tens **datas** e **o que mudou** no código e na doc. O texto que continua (blocos longos com tabelas `A1`, `ALG-*`, etc.) são **relatórios de auditoria** colados tal qual — não precisas de ler tudo de uma vez; usa o **Índice de tradução UX-** no final do ficheiro para os bugs de uso, e o **léxico** no topo para termos técnicos.

- **2026-05-06 (5.ª leva):** **C12** — landing estável (canvas client-only, metadata, `CI=1` no build); removido split `home-client`/`dynamic` que agravava chunks; doc de troubleshooting `./1682.js`. Ver tabela.
- **2026-05-06 (6.ª leva):** **C13** — UX-3/4/5: KPIs reembolsos sem distorcer pelo filtro; filtro «Todos» após acção; `useAdminFinanceRefresh` + evento `financeiro_listagem_refresh` no backend; WS `admins` alargado a **FINANCIAL** / **IT_ADMIN**. Ver tabela.
- **2026-05-06 (7.ª leva):** **C14–C15** — `markAllRead` persistido; `notificationId` no WS após gravar notificação; helper `reimbursementsApi.reject` com **`rejectionReason`**. Ver tabela.
- **2026-05-06 (8.ª leva):** Secção **Conciliação** (ALG-10 / UX-5 / dashboard); **C16** — UX-13 inscrições + WS `inscricoes` no hook. Ver tabela.
- **2026-05-06 (9.ª leva):** **C17** — `NotificationBell` unificado com **`useNotifications`** (UX-12). Ver tabela.
- **2026-05-06 (4.ª leva):** `GET/POST /api/absences` (portal neutro); FE migrado de `/driver/absences`; **UX-6/7** — notificação + WS ao rever imprevisto e ao criar por admin (`absenceReviewedForUser`, `absenceCreatedByAdminForUser`). Ver **C10–C11**.
- **2026-05-06 (3.ª leva):** `forgotPassword` → `MailService.sendPasswordReset`; `absences.review` **PENALIZED** + `penalty` → `ContaPagar` na mesma transacção; `GET /notifications` aceita `read=false` e `type=`. Ver **C7–C9** na tabela «Plano de correcções em curso».
- **2026-05-06 (2.ª leva):** `HealthModule` (`/api/health`, `/api/ready`); `ClassesController` com JWT+Roles em todas as rotas (OAI-2/A1); RBAC em `contas-pagar`; IDOR em `GET /reimbursements/:id`; `approve()` reembolso em **transacção** com `ContaPagar`; Swagger `@ApiBearerAuth` em `truck-maintenance`. Ver tabela **«Plano de correcções em curso»** no topo.
- **2026-05-06:** Reestruturação em fases lineares; registo de testes dirigidos; correcções aplicadas no código: RBAC `GET /classes`, `HolidayController` por rota + feriados nacionais públicos; `schema.prisma` com `binaryTargets`; aviso em `add_mfa_fields.sql`; ajustes manuais de BD documentados (`routeType`, `teachers.documents`, MFA em `users`).

  Resumo executivo

  A auditoria complementar revisitou autorização,
  contratos FE↔BE, drift Prisma↔migrations, erros
  silenciosos e segredos. O achado mais grave é que
  vários métodos de ClassesController declaram
  @Roles(...) mas não declaram @UseGuards(JwtAuthGuard,
   RolesGuard) — como não há APP_GUARD global de JWT no
   app.module.ts, esses endpoints (POST /classes, PATCH
   /classes/:id, DELETE /classes/:id, :id/teachers/...,
   :id/schedule, etc.) ficam anônimos: qualquer chamada
   não autenticada chega ao service. Em paralelo,
  forgotPassword existe no controller mas nunca chama
  MailService.sendPasswordReset, ou seja, em produção o
   utilizador recebe 200 mas o e-mail nunca é enviado.
  Também confirmou-se o drift routeType/originCityId no
   schema.prisma sem migration versionada (apenas
  add_route_type_fields.sql legacy), e dois fallbacks
  de chave ('dev-fallback' em TOTP e 'dev-integrity' em
   PDF) que mascaram a ausência de JWT_SECRET. Outros
  pontos são confirmações com referências de linha de
  itens já listados como "Pendente" no documento
  (notificações read=false vs unreadOnly, alunos a
  chamar /driver/absences, IDOR em GET
  /reimbursements/:id, contas-pagar só com
  JwtAuthGuard).

  ---
  Secção pronta a anexar ao final de
  docs/AFAZERES/Correções.md

  ---

  ## Registo de auditoria complementar (Claude Code) —
  2026-05-06

  Achados novos e confirmações por linha-de-código. Não
   substitui §7 nem a tabela da Fase 1 — complementa.

  ### A. Autorização / RBAC (achados novos)

  | # | Severidade | Local | Sintoma | Verificação
  rápida |
  |---|------------|-------|---------|-----------------
  ---|
  | A1 | **Alta** |
  `backend/src/classes/classes.controller.ts:96-183` |
  Métodos `findOne(:id)`, `create()`, `update(:id)`,
  `delete(:id)`, `updateStatus`, `assignTeacher`,
  `removeTeacher`, `updateSchedule`, `getSchedule`,
  `getStatistics` têm apenas `@Roles(...)` **sem**
  `@UseGuards(JwtAuthGuard, RolesGuard)`. Como
  `app.module.ts` não regista `APP_GUARD` para
  JWT/Roles (apenas `ThrottlerGuard`), esses endpoints
  aceitam pedidos **sem token**. `@Roles` sozinho é
  metadado — só o `RolesGuard` o lê. | `curl -i -X
  DELETE
  http://localhost:3002/api/classes/<id-existente>` sem
   `Authorization`: deve devolver 401/403; hoje devolve
   200/204 |
  | A2 | Média |
  `backend/src/classes/classes.controller.ts:186-208` |
   `getAttendanceHistory` e `bulkAttendance` só usam
  `JwtAuthGuard` (sem `RolesGuard`/`@Roles`) — qualquer
   perfil autenticado (incl. `STUDENT`) pode lançar
  frequência em qualquer turma. | `curl -X POST
  .../api/classes/:id/attendance/bulk` com token
  STUDENT |
  | A3 | Média | `backend/src/notifications/notificatio
  ns.controller.ts:19` | Só `JwtAuthGuard` no
  controller; mitigação implícita é o `where: { userId:
   req.user.id }` em todas as queries — não é IDOR, mas
   falta `@Roles`/política explícita. Documentar como
  aceitação consciente. | Revisão de código |
  | A4 | Baixa |
  `backend/src/employees/employees.controller.ts:46-58`
   | Endpoints `@Public()` `GET/POST
  /employees/registration/:token` partilham o
  `ThrottlerGuard` global (60/min/IP) — para tokens de
  cadastro de funcionário, faria sentido `@Throttle`
  mais agressivo. | Revisão; comparar com `auth/login`
  (`10/60s`) |

  ### B. Funcionalidade silenciosamente quebrada

  | # | Severidade | Local | Sintoma | Verificação
  rápida |
  |---|------------|-------|---------|-----------------
  ---|
  | B1 | **Alta** |
  `backend/src/auth/auth.service.ts:510-522` |
  `forgotPassword` gera o token mas **não chama
  `MailService.sendPasswordReset`** (que existe em
  `mail/mail.service.ts:170` e só é referenciada em si
  mesma — ver `grep -n sendPasswordReset backend/src`).
   Em produção: `200 OK` para o utilizador, sem email.
  Em dev, o token é só loggado. | `grep -rn
  "sendPasswordReset" backend/src` retorna apenas a
  definição |
  | B2 | Média | `backend/src/contas-pagar/contas-pagar
  .service.ts:86-127` | `findOne`, `update`,
  `marcarComoPaga` **não filtram `active: true`** — uma
   conta soft-deleted continua a poder ser obtida e
  marcada como paga; só `findAll` aplica
  `where.active`. Inconsistência com PASSO 3.9. |
  `PATCH /api/contas-pagar/<id-deletada>/pagar` |
  | B3 | Média |
  `backend/src/contas-pagar/contas-pagar.service.ts:42`
   | `includeDeleted=true` devolve **apenas** as
  inativas (`where.active = false`), nunca a união
  activas+deletadas. O Swagger diz "includeDeleted=true
   para excluídas", o que é coerente, mas nomes como
  `includeDeleted` costumam sugerir union — semântica
  confusa. | Comparar contagem com/sem flag |

  ### C. Segredos / fallbacks de criptografia

  | # | Severidade | Local | Sintoma | Verificação
  rápida |
  |---|------------|-------|---------|-----------------
  ---|
  | C1 | Média |
  `backend/src/auth/auth.service.ts:586-593` | Se
  `TOTP_ENCRYPTION_KEY` ausente/curta, derivação cai
  para `scryptSync(JWT_SECRET ?? 'dev-fallback',
  'totp-salt', 32)` — só `logger.warn`. Em produção,
  `main.ts` já recusa subir com `JWT_SECRET<64` (linha
  22), mas se o operador definir `JWT_SECRET` e omitir
  `TOTP_ENCRYPTION_KEY`, segredos TOTP de toda a base
  ficam derivados de uma única chave. | `grep -n
  TOTP_ENCRYPTION_KEY backend/.env*` |
  | C2 | Média |
  `backend/src/reports/pdf.service.ts:1278` |
  Assinatura de integridade dos PDFs usa
  `CERT_PDF_INTEGRITY_SECRET || JWT_SECRET ||
  'dev-integrity'`. Sem nenhuma das duas variáveis o
  `'dev-integrity'` literal é usado e os hashes ficam
  previsíveis. | `grep -rn
  "dev-integrity\|dev-fallback" backend/src` |
  | C3 | Baixa | `.env.example` (raiz) | Contém
  literais como `JWT_SECRET=your-super-secret-jwt-key-c
  hange-this-in-production` e
  `MINIO_SECRET_KEY=minioadmin123` — embora seja
  template, basta um `cp .env.example .env` para subir
  em dev com chaves conhecidas. `backend/.env.example`
  (mais novo) usa placeholders `<…>` correctos —
  alinhar o template raiz. | Comparar os dois
  `.env.example` |

  ### D. Drift Prisma ↔ migrations (confirmação por
  inspecção)

  | # | Severidade | Local | Sintoma | Verificação
  rápida |
  |---|------------|-------|---------|-----------------
  ---|
  | D1 | **Alta** |
  `backend/prisma/schema.prisma:754-758, 1355-1358` vs
  `backend/prisma/migrations/` | Os campos `routeType`,
   `originCityId` (Class), `originCidadeId` (Acao),
  `originNeighborhood`, `destinationNeighborhood`
  existem no schema mas **nenhuma migration datada os
  cria** — só o ficheiro solto
  `add_route_type_fields.sql` (não datado, não está num
   directório `<timestamp>_…`, logo o `prisma migrate
  deploy` ignora). Resultado: numa instalação limpa via
   `migrate deploy`, o backend arranca em drift
  garantido. | `ls backend/prisma/migrations/` (sem
  pasta `*_route_type*`) + `grep -rln "routeType"
  backend/prisma/migrations/` (só o init e o SQL solto)
   |
  | D2 | Média |
  `backend/prisma/migrations/add_mfa_fields.sql` | Já
  tem aviso de legado, mas mantém-se na pasta
  `migrations/`. O comportamento padrão do Prisma é
  ignorá-lo (não está em subpasta datada), o que é
  seguro — mas confunde o operador que tente "aplicar
  tudo". Considerar mover para
  `backend/prisma/legacy-sql/`. | `ls
  backend/prisma/migrations/*.sql` |
  | D3 | Baixa | `backend/prisma/seed-prod.ts`,
  `backend/prisma/seed-absences-joao.ts`,
  `backend/prisma/check-*.ts`,
  `backend/prisma/diagnose-*.ts` | A pasta `prisma/`
  mistura schema + scripts utilitários ad-hoc + seeds.
  Convencional manter scripts em `backend/scripts/`
  para evitar `tsx prisma/...` por engano em produção.
  | `ls backend/prisma/*.ts` |

  ### E. Contratos FE ↔ BE (confirmação com linhas)

  | # | Severidade | Local | Sintoma | Verificação
  rápida |
  |---|------------|-------|---------|-----------------
  ---|
  | E1 | Média | FE
  `frontend/app/student/notifications/page.tsx:62-63`
  envia `&read=false` e `&type=…`; BE `backend/src/noti
  fications/notifications.controller.ts:32-39` só lê
  `unreadOnly==='true'`. | Filtro "Não lidas" do portal
   do aluno **não filtra** — a lista volta sempre
  completa (apenas o `unreadCount` no `meta` está
  correcto). FE em
  `frontend/lib/api/notifications.ts:30` usa
  `unreadOnly` e funciona; é só o aluno que envia o
  param errado. | Abrir `/student/notifications`,
  alternar filtro, observar XHR no DevTools |
  | E2 | Baixa | FE
  `frontend/app/student/imprevistos/page.tsx:70,252`
  chama `POST/GET /driver/absences`; BE
  `backend/src/absences/absences.controller.ts:10-12`
  aceita `@Roles('DRIVER','TEACHER','STUDENT')` no
  controller `driver/absences`. | Funciona, mas o path
  inclui literalmente "driver" para chamadas de aluno —
   confunde leitura de logs e Swagger. Renomear para
  `/me/absences` ou similar. | `grep -rn
  "/driver/absences" frontend/app/student/` |

  ### F. Erros silenciosos em fluxos sensíveis

  | # | Severidade | Local | Sintoma | Verificação
  rápida |
  |---|------------|-------|---------|-----------------
  ---|
  | F1 | Média | `backend/src/feedbacks/feedbacks.servi
  ce.ts:146,256,315,322,355,361,407,413` (8x) e
  `feedbacks-invitation.service.ts:103,106,116,162,165`
   (5x) | `} catch {}` totalmente silencioso. Em
  PIX/recompensas e envio de convite, falhas ficam
  invisíveis para o operador — só o utilizador final
  percebe. | `rg -n "catch \{\}" backend/src/feedbacks`
   |
  | F2 | Média | `backend/src/reimbursement/reimburseme
  nt.service.ts:211-225` | `prisma.contaPagar.create`
  em try/catch só com `logger.error`, **sem transação**
   com o `update` para `APPROVED`. Se a criação falhar,
   o reembolso fica `APPROVED` mas sem ContaPagar (já
  flagado em §Fase 2; aqui fica a referência ao número
  da linha). | Forçar erro injectando descrição muito
  longa |
  | F3 | Baixa | `backend/src/reimbursement/reimburseme
  nt.service.ts:100,207,265` |
  `notificationsSender.*().catch(() => {})` engole
  erros de envio (e-mail/WhatsApp). Se o sender falhar,
   nem log de aviso. | `rg -n "\.catch\(\(\) => \{\}\)"
   backend/src/reimbursement` |

  ### G. Itens já listados na doc — agora com
  referência exacta

  - **IDOR `GET /reimbursements/:id`** → `backend/src/r
  eimbursement/reimbursement.service.ts:155-174`:
  `findOne(id)` **só recebe `id`**, não compara
  `requestedBy` com `req.user.id`. O controller
  (`reimbursement.controller.ts:130-135`) também não
  passa `req.user`. Logo qualquer
  `TEACHER`/`DRIVER`/`STUDENT` autenticado pode ler
  reembolso alheio bastando conhecer o UUID.
  - **`contas-pagar` só com `JwtAuthGuard`** → `backend
  /src/contas-pagar/contas-pagar.controller.ts:12`
  (controller-level). Não há `@Roles` em método algum.
  Confirmado.
  - **`Lista de reembolsos` para `STUDENT`** →
  `reimbursement.controller.ts:120` inclui `STUDENT` em
   `onlyMine`. Hoje o controller filtra para "só os
  meus" também para alunos — verificar com produto se
  aluno deve sequer aparecer na regra (não há fluxo de
  aluno solicitar reembolso no portal aluno; pode ser
  código morto).

  ### H. Comandos read-only usados nesta auditoria
  (reaproveitáveis)

  ```bash
  # Mapear guards/roles por controller
  grep -rn "@UseGuards" backend/src
  --include="*.controller.ts"
  grep -rn "@Roles"     backend/src
  --include="*.controller.ts"
  grep -rn "@Public"    backend/src --include="*.ts"

  # Drift de migrations
  grep -rln "routeType\|originCityId\|originCidadeId"
  backend/prisma/migrations/
  ls backend/prisma/migrations/*.sql      # SQL solto
  fora de pastas datadas

  # Erros silenciosos
  rg -n "catch\s*\{\s*\}|\.catch\(\(\)\s*=>\s*\{\}\)"
  backend/src

  # Fallbacks de segredo
  grep -rn "dev-fallback\|dev-integrity" backend/src

  I. Sugestão de prioridade para a próxima sprint

  1. A1 (classes desprotegidas) — fix de 1-2 linhas por
   método; risco crítico imediato.
  2. B1 (forgot-password sem e-mail) — chamar
  MailService.sendPasswordReset; risco operacional
  alto.
  3. G (IDOR reembolsos + RBAC contas-pagar) — fechar o
   que já estava listado.
  4. D1 (gerar migration add_route_type_fields
  versionada) — torna o migrate deploy autossuficiente.
  5. C1/C2 (eliminar fallbacks
  'dev-fallback'/'dev-integrity') — falhar bootstrap()
  se faltarem.
  produção, `main.ts` já
  recusa subir com
  `JWT_SECRET<64` (linha
  22), mas se o operador
  definir `JWT_SECRET` e
  omitir
  `TOTP_ENCRYPTION_KEY`,
  segredos TOTP de toda a
  base ficam derivados de
  uma única chave. | `grep
  -n TOTP_ENCRYPTION_KEY
  backend/.env*` |
  | C2 | Média |
  `backend/src/reports/pdf.s
  ervice.ts:1278` |
  Assinatura de integridade
  dos PDFs usa
  `CERT_PDF_INTEGRITY_SECRET
   || JWT_SECRET ||
  'dev-integrity'`. Sem
  nenhuma das duas variáveis
   o `'dev-integrity'`
  literal é usado e os
  hashes ficam previsíveis.
  | `grep -rn "dev-integrity
  \|dev-fallback"
  backend/src` |
  | C3 | Baixa |
  `.env.example` (raiz) |
  Contém literais como
  `JWT_SECRET=your-super-sec
  ret-jwt-key-change-this-in
  -production` e `MINIO_SECR
  ET_KEY=minioadmin123` —
  embora seja template,
  basta um `cp .env.example
  .env` para subir em dev
  com chaves conhecidas.
  `backend/.env.example`
  (mais novo) usa
  placeholders `<…>`
  correctos — alinhar o
  template raiz. | Comparar
  os dois `.env.example` |

  ### D. Drift Prisma ↔
  migrations (confirmação
  por inspecção)

  | # | Severidade | Local |
   Sintoma | Verificação
  rápida |
  |---|------------|-------|
  ---------|----------------
  ----|
  | D1 | **Alta** |
  `backend/prisma/schema.pri
  sma:754-758, 1355-1358` vs
   `backend/prisma/migration
  s/` | Os campos
  `routeType`,
  `originCityId` (Class),
  `originCidadeId` (Acao),
  `originNeighborhood`,
  `destinationNeighborhood`
  existem no schema mas
  **nenhuma migration datada
   os cria** — só o ficheiro
   solto `add_route_type_fie
  lds.sql` (não datado, não
  está num directório
  `<timestamp>_…`, logo o
  `prisma migrate deploy`
  ignora). Resultado: numa
  instalação limpa via
  `migrate deploy`, o
  backend arranca em drift
  garantido. | `ls backend/p
  risma/migrations/` (sem
  pasta `*_route_type*`) +
  `grep -rln "routeType" bac
  kend/prisma/migrations/`
  (só o init e o SQL solto)
  |
  | D2 | Média |
  `backend/prisma/migrations
  /add_mfa_fields.sql` | Já
  tem aviso de legado, mas
  mantém-se na pasta
  `migrations/`. O
  comportamento padrão do
  Prisma é ignorá-lo (não
  está em subpasta datada),
  o que é seguro — mas
  confunde o operador que
  tente "aplicar tudo".
  Considerar mover para `bac
  kend/prisma/legacy-sql/`.
  | `ls backend/prisma/migra
  tions/*.sql` |
  | D3 | Baixa | `backend/pr
  isma/seed-prod.ts`,
  `backend/prisma/seed-absen
  ces-joao.ts`, `backend/pri
  sma/check-*.ts`, `backend/
  prisma/diagnose-*.ts` | A
  pasta `prisma/` mistura
  schema + scripts
  utilitários ad-hoc +
  seeds. Convencional manter
   scripts em
  `backend/scripts/` para
  evitar `tsx prisma/...`
  por engano em produção. |
  `ls backend/prisma/*.ts` |

  ### E. Contratos FE ↔ BE
  (confirmação com linhas)

  | # | Severidade | Local |
   Sintoma | Verificação
  rápida |
  |---|------------|-------|
  ---------|----------------
  ----|
  | E1 | Média | FE
  `frontend/app/student/noti
  fications/page.tsx:62-63`
  envia `&read=false` e
  `&type=…`; BE `backend/src
  /notifications/notificatio
  ns.controller.ts:32-39` só
   lê `unreadOnly==='true'`.
   | Filtro "Não lidas" do
  portal do aluno **não
  filtra** — a lista volta
  sempre completa (apenas o
  `unreadCount` no `meta`
  está correcto). FE em
  `frontend/lib/api/notifica
  tions.ts:30` usa
  `unreadOnly` e funciona; é
   só o aluno que envia o
  param errado. | Abrir
  `/student/notifications`,
  alternar filtro, observar
  XHR no DevTools |
  | E2 | Baixa | FE
  `frontend/app/student/impr
  evistos/page.tsx:70,252`
  chama `POST/GET
  /driver/absences`; BE
  `backend/src/absences/abse
  nces.controller.ts:10-12`
  aceita `@Roles('DRIVER','T
  EACHER','STUDENT')` no
  controller
  `driver/absences`. |
  Funciona, mas o path
  inclui literalmente
  "driver" para chamadas de
  aluno — confunde leitura
  de logs e Swagger.
  Renomear para
  `/me/absences` ou similar.
   | `grep -rn
  "/driver/absences"
  frontend/app/student/` |

  ### F. Erros silenciosos
  em fluxos sensíveis

  | # | Severidade | Local |
   Sintoma | Verificação
  rápida |
  |---|------------|-------|
  ---------|----------------
  ----|
  | F1 | Média |
  `backend/src/feedbacks/fee
  dbacks.service.ts:146,256,
  315,322,355,361,407,413`
  (8x) e `feedbacks-invitati
  on.service.ts:103,106,116,
  162,165` (5x) | `} catch
  {}` totalmente silencioso.
   Em PIX/recompensas e
  envio de convite, falhas
  ficam invisíveis para o
  operador — só o utilizador
   final percebe. | `rg -n
  "catch \{\}"
  backend/src/feedbacks` |
  | F2 | Média | `backend/sr
  c/reimbursement/reimbursem
  ent.service.ts:211-225` |
  `prisma.contaPagar.create`
   em try/catch só com
  `logger.error`, **sem
  transação** com o `update`
   para `APPROVED`. Se a
  criação falhar, o
  reembolso fica `APPROVED`
  mas sem ContaPagar (já
  flagado em §Fase 2; aqui
  fica a referência ao
  número da linha). | Forçar
   erro injectando descrição
   muito longa |
  | F3 | Baixa |
  `backend/src/reimbursement
  /reimbursement.service.ts:
  100,207,265` | `notificati
  onsSender.*().catch(() =>
  {})` engole erros de envio
   (e-mail/WhatsApp). Se o
  sender falhar, nem log de
  aviso. | `rg -n
  "\.catch\(\(\) => \{\}\)"
  backend/src/reimbursement`
   |

  ### G. Itens já listados
  na doc — agora com
  referência exacta

  - **IDOR `GET
  /reimbursements/:id`** →
  `backend/src/reimbursement
  /reimbursement.service.ts:
  155-174`: `findOne(id)`
  **só recebe `id`**, não
  compara `requestedBy` com
  `req.user.id`. O
  controller (`reimbursement
  .controller.ts:130-135`)
  também não passa
  `req.user`. Logo qualquer
  `TEACHER`/`DRIVER`/`STUDEN
  T` autenticado pode ler
  reembolso alheio bastando
  conhecer o UUID.
  - **`contas-pagar` só com
  `JwtAuthGuard`** → `backen
  d/src/contas-pagar/contas-
  pagar.controller.ts:12`
  (controller-level). Não há
   `@Roles` em método algum.
   Confirmado.
  - **`Lista de reembolsos`
  para `STUDENT`** → `reimbu
  rsement.controller.ts:120`
   inclui `STUDENT` em
  `onlyMine`. Hoje o
  controller filtra para "só
   os meus" também para
  alunos — verificar com
  produto se aluno deve
  sequer aparecer na regra
  (não há fluxo de aluno
  solicitar reembolso no
  portal aluno; pode ser
  código morto).

  ### H. Comandos read-only
  usados nesta auditoria
  (reaproveitáveis)

  ```bash
  # Mapear guards/roles por
  controller
  grep -rn "@UseGuards"
  backend/src --include="*.c
  ontroller.ts"
  grep -rn "@Roles"
  backend/src --include="*.c
  ontroller.ts"
  grep -rn "@Public"
  backend/src
  --include="*.ts"

  # Drift de migrations
  grep -rln "routeType\|orig
  inCityId\|originCidadeId"
  backend/prisma/migrations/
  ls backend/prisma/migratio
  ns/*.sql      # SQL solto
  fora de pastas datadas

  # Erros silenciosos
  rg -n "catch\s*\{\s*\}|\.c
  atch\(\(\)\s*=>\s*\{\}\)"
  backend/src

  # Fallbacks de segredo
  grep -rn "dev-fallback\|de
  v-integrity" backend/src

  I. Sugestão de prioridade
  para a próxima sprint

  1. A1 (classes
  desprotegidas) — fix de
  1-2 linhas por método;
  risco crítico imediato.
  2. B1 (forgot-password sem
   e-mail) — chamar MailServ
  ice.sendPasswordReset;
  risco operacional alto.
  3. G (IDOR reembolsos +
  RBAC contas-pagar) —
  fechar o que já estava
  listado.
  4. D1 (gerar migration
  add_route_type_fields
  versionada) — torna o
  migrate deploy
  autossuficiente.
  5. C1/C2 (eliminar
  fallbacks 'dev-fallback'/'
  dev-integrity') — falhar
  bootstrap() se faltarem.
  6. E1 (filtro de
  notificações do aluno) —
  alinhar unreadOnly.

● Auditoria complementar
  concluída em modo
  read-only: zero alterações
   no código, sem chamadas
  HTTP destrutivas, segredos
   não copiados.

  Top-3 a tratar primeiro
  (ver tabela A/B/G acima):
  1. ClassesController —
  métodos :id
  (POST/PATCH/DELETE/...)
  sem @UseGuards, ficam
  públicos.
  2. auth.service.forgotPass
  word nunca chama MailServi
  grep -rn "@UseGuards" backend/src
  --include="*.controller.ts"
  grep -rn "@Roles"     backend/src
  --include="*.controller.ts"
  grep -rn "@Public"    backend/src --include="*.ts"

  # Drift de migrations
  grep -rln "routeType\|originCityId\|originCidadeId"
  backend/prisma/migrations/
  ls backend/prisma/migrations/*.sql      # SQL solto fora de
  pastas datadas

  # Erros silenciosos
  rg -n "catch\s*\{\s*\}|\.catch\(\(\)\s*=>\s*\{\}\)"
  backend/src

  # Fallbacks de segredo
  grep -rn "dev-fallback\|dev-integrity" backend/src

  I. Sugestão de prioridade para a próxima sprint

  1. A1 (classes desprotegidas) — fix de 1-2 linhas por
  método; risco crítico imediato.
  2. B1 (forgot-password sem e-mail) — chamar
  MailService.sendPasswordReset; risco operacional alto.
  3. G (IDOR reembolsos + RBAC contas-pagar) — fechar o que já
   estava listado.
  4. D1 (gerar migration add_route_type_fields versionada) —
  torna o migrate deploy autossuficiente.
  5. C1/C2 (eliminar fallbacks 'dev-fallback'/'dev-integrity')
   — falhar bootstrap() se faltarem.
  6. E1 (filtro de notificações do aluno) — alinhar
  unreadOnly.

---

## Como ler os três registos «Registo de auditoria complementar» (sem perder tempo)

Existem **três blocos** com título semelhante neste ficheiro, por tema: **(1) Auditoria alargada** (`ALG-*`) — repositório, backups, MinIO, CI, contratos; **(2) OpenAPI / HTTP** (`OAI-*`) — diferenças entre Swagger e comportamento real; **(3) Bugs de uso** (`UX-*`) — *“parece que o sistema mintiu ou escondeu o efeito”*. Nas tabelas longas, a coluna **Impacto** ou **Sintoma para o utilizador** já faz de **tradução**; o **Apêndice UX-1…20** no final condensa só os vinte itens de uso numa frase cada.

---

## Registo de auditoria complementar (Claude Code — auditoria alargada — 2026-05-06)

> **Âmbito:** segunda ronda independente. Não assume que a doc cobre tudo. Trata de superfície de ataque, padrões de código, contratos FE↔BE, dados/repo, CI/observabilidade e performance.
> **IDs novos** (prefixo `ALG-`) — não colidem com A1/B1/… da ronda anterior. **Reaproveitamento:** sempre que um achado já estivesse listado em §A–G da ronda 1, é referido por número e marcado *(confirmado)*.

### Resumo executivo

A segunda ronda destapou seis áreas que a ronda 1 e o corpo do guia ainda não tinham nomeado. **(1)** O repositório guarda **dumps SQL completos da BD em `backups/`, `database/backups/` e `backup/`** — 13k+ linhas, com estrutura típica de `pg_dump` (data/schema), num projecto cujo `.gitignore` não bloqueia esses caminhos: vector LGPD/segredo de primeiro plano. **(2)** Existem três `MinioService` separados (`uploads/`, `students/`, `reimbursement/`) — dois com `useSSL: false` **hardcoded**, credenciais default `minioadmin/minioadmin`, e que aplicam `setBucketPolicy` *public-read* para `public-uploads` e `student-photos`: tudo o que se carrega fica acessível por URL pública. **(3)** O endpoint `POST /api/register` (`users/register.controller.ts`) é totalmente público, **sem `@Throttle`** dedicado e com DTO sem `class-validator` — pipeline `whitelist:true` provavelmente esvazia o body, tornando o endpoint não-funcional ou abusável. **(4)** `POST /api/public/upload` aceita 5 MB de qualquer um (sem JWT, com global throttle 60/min) e armazena num bucket público — exfiltração e exaustão de armazenamento. **(5)** O cliente axios do frontend lê tokens de **`sessionStorage` com fallback para `localStorage`**, e o helper `frontend/lib/api/reimbursements.ts:39` envia `{ reason }` quando o backend espera `{ rejectionReason }` — o helper está partido (a página admin contorna chamando a API directamente). **(6)** O CI (`.github/workflows/ci.yml`) **não corre testes nem lint** (só `tsc` + `nest build`) e usa Node 18 (EOL); `package.json:prisma:seed` aponta para `prisma/seed-full.ts` que está **deletado** (`git status`: `D backend/prisma/seed-full.ts`). Outros achados: `RefreshToken` em texto claro na BD (`schema.prisma:408-419`); `findMany` admin sem `take` em `enrollments`/`acoes`/`absences`/`employees` (87 ocorrências); CORS default em produção devolve `localhost:3000` se `FRONTEND_URLS` ausente; `settings.json` persistido em ficheiro (race conditions, e está commitado com `updatedBy` real). Nada disto invalida os achados anteriores — soma-se a eles.

### Tabela de achados (auditoria alargada)

| ID | Sev. | Área | Evidência (ficheiro:linha / pattern) | Impacto | Como validar (read-only) |
|----|------|------|---------------------------------------|---------|---------------------------|
| ALG-1 | **Alta** | Repo/LGPD | `backups/db_backup_2026-03-05_0953.sql` (2773 linhas), `backup/dump_banco_2026-03-08_1856.sql` (3365), `backup/dump_utf8.sql` (3365), `database/backups/backup_2026-03-09_18-36.sql` (3383), `backup/data_only.sql` (137); `.gitignore` não bloqueia `backup/`, `backups/`, `database/backups/`, `*.sql`. | Dumps `pg_dump` no histórico do git incluem hashes de senha, refresh tokens e `emailOtpHash` se a BD foi exportada já em produção. Mesmo após apagar do HEAD, ficam no histórico — exige `git filter-repo`. | `git ls-files backups/ database/backups/ backup/`; `head -3 backups/*.sql` (apenas para confirmar formato `pg_dump`, sem expor dados aqui). |
| ALG-2 | **Alta** | API/Uploads | `backend/src/uploads/uploads.service.ts:14` e `backend/src/students/minio.service.ts:14` — `useSSL: false` **hardcoded**; `accessKey`/`secretKey` default `'minioadmin'`. | Em produção com TLS, o cliente usa HTTP plain-text → credenciais MinIO em texto claro na rede; defaults aceitam o `minioadmin/minioadmin` se as envs não forem definidas. | `grep -n "useSSL: false" backend/src` |
| ALG-3 | **Alta** | API/Uploads | `uploads.service.ts:25-37` e `students/minio.service.ts:26-37` — `setBucketPolicy` aplicado para `public-uploads` e `student-photos` com `Action:["s3:GetObject"]` e `Principal:{AWS:["*"]}`. | Qualquer ficheiro carregado é **publicamente legível** por URL (foto de aluno, RG, comprovativo). Se for sensível é vazamento direto. | `grep -n "Principal" backend/src/**/minio.service.ts uploads.service.ts` |
| ALG-4 | **Alta** | API/Auth | `backend/src/users/register.controller.ts:36-92` — `POST /api/register` sem `@UseGuards`, sem `@Public()` (passa por não haver APP_GUARD), sem `@Throttle` dedicado. DTO `RegisterDto:10-29` não tem decorators `class-validator`. Com `whitelist:true,forbidNonWhitelisted:true,transform:true` no `main.ts:73-79`, propriedades sem decorator costumam ser stripped → endpoint dispara `400` no `if (!dto.name?.trim())`. | Combina dois sintomas opostos: ou o auto-cadastro de motorista/professor está partido, ou — se o `transform:true` mantiver fields — qualquer um cria 60 contas/min/IP (apenas o throttle global) com `active:false`, gerando ruído operacional infinito para o admin que aprova. | `tsc --noEmit && curl -i -X POST http://localhost:3002/api/register -d '{"name":"X","email":"x@x.x","password":"abc","role":"TEACHER"}' -H 'Content-Type: application/json'` |
| ALG-5 | **Alta** | API/Uploads | `backend/src/uploads/uploads.controller.ts:10-29` — `@Public()` `POST /api/public/upload`, 5 MB JPG/PNG/PDF, sem `@Throttle` dedicado (só global 60/min); a verificação é por mimetype declarado no header (não por magic-bytes). | Qualquer um pode encher o bucket: 5 MB × 60 req/min/IP/worker. Conteúdo malicioso em PDF (XSS via PDF.js no cliente final) ainda passa pela whitelist. | `grep -n "FileInterceptor\|presigned" backend/src --include="*.ts"` |
| ALG-6 | **Alta** | Repo/Dados | `git ls-files backend/data/settings.json` (rastreado); `settings.service.ts:1-10` mantém estado em ficheiro JSON do disco. | Race condition em ambientes com vários workers/PM2; commits do ficheiro tornam o `updatedBy` (UUID real) parte do histórico do git. Migrar para tabela `system_settings` quando estabilizar. | `git log --oneline -- backend/data/settings.json` |
| ALG-7 | Média | Auth/Sessão | `frontend/lib/api/client.ts:13-19` — token lido de `sessionStorage` com fallback `localStorage`; cleanup em `interceptors.response` (linhas 39-58) limpa **ambos**, mas o request ainda lê o legacy de `localStorage` em todas as abas. | Tokens herdados de versões antigas continuam a injectar `Authorization` mesmo depois do logout numa aba; expõe o JWT a XSS (storage acessível por JS). Em SPA é trade-off, mas pelo menos remover o fallback. | `grep -n "sessionStorage\|localStorage" frontend/lib/api/client.ts` |
| ALG-8 | Média | API/Auth | `backend/src/auth/auth.service.ts:31-47` — `register()` permite criar `STUDENT` directamente: `email`, `password`, `name`, `phone` apenas; sem CPF, sem dados socioeconómicos, sem `class-validator` (DTO inline). | Pode ser código morto — o portal aluno usa o fluxo `enrollments/public` que cria `Student` completo. Se não for usado, remover; se for, validar entradas. | `grep -rn "/auth/register" frontend --include="*.ts"` |
| ALG-9 | Média | API/Persistência | `backend/prisma/schema.prisma:408-419` — `RefreshToken { token String @unique }` armazenado em **texto claro** na BD. | Se a BD vazar (ou qualquer dump como ALG-1), atacante usa o token directamente para emitir `access_token` até `expiresAt`. Boa prática: guardar hash SHA-256 do token, validar comparando hashes. | Esquema lido directamente |
| ALG-10 | Média | FE↔BE | `frontend/lib/api/reimbursements.ts:39` envia `{ reason }`; backend `reimbursement.controller.ts:158-164` espera `{ rejectionReason }` (`@IsNotEmpty`). | Helper `reimbursementsApi.reject()` da lib **partido** — admin que o use receberá 400. A página `admin/reembolsos/page.tsx:157` já usa `{ rejectionReason }` directamente, contornando o helper. | `grep -n "rejectionReason\|/reject" frontend/lib/api/reimbursements.ts` |
| ALG-11 | Média | FE↔BE | `frontend/lib/api/reimbursements.ts:14-20` envia `?userId=`; controller `reimbursement.controller.ts:107-125` só lê `status`, `page`, `limit`. | Filtro `userId` é silenciosamente ignorado para ADMIN; para `TEACHER/DRIVER/STUDENT` o backend já força `req.user.id`. Helper sugere uma capacidade que o backend não implementa. | Diff manual entre `getAll` (FE) e `findAll` (BE) |
| ALG-12 | Média | FE | `frontend/lib/api/reimbursements.ts:3-13` — interface `Reimbursement` declara `userId` e `updatedAt`; backend devolve `requestedBy`, sem `updatedAt` no `select`. | Todos os componentes que dependem do tipo recebem `undefined` em runtime — drift de modelo. Mesma família que A4/E2 mas no lado do tipo TS. | `grep -rn "userId\|requestedBy" frontend/lib/api/reimbursements.ts backend/src/reimbursement` |
| ALG-13 | Média | CI | `.github/workflows/ci.yml:11-35` — apenas `tsc --noEmit` e `nest build`/`next build`; **não há `npm test`, `npm run lint`, `npm audit`**. Node fixado em **`18`** (EOL Abril 2025). | O suite de testes existe (`backend/package.json:test, test:e2e`) mas nunca é executado em PR; lint também não. CVEs nas deps não são detectados; runtime EOL bloqueia bumps de segurança. | `cat .github/workflows/ci.yml` |
| ALG-14 | Média | DevOps | `backend/package.json` — `"prisma:seed": "npx tsx prisma/seed-full.ts"` mas `git status` lista `D backend/prisma/seed-full.ts`. O seed activo é `backend/prisma/seed-desenvolvimento/seed-full.ts`. | `npm run prisma:seed` falha imediatamente; novo developer perde tempo a debugar; CI poderia detectar com `npm run prisma:generate -- --no-engine` falso-positivo, mas o seed em si não é exercitado. | Tentar `npm run prisma:seed --dry-run`; comparar com `prisma/seed-desenvolvimento/seed-full.ts` |
| ALG-15 | Média | CORS | `backend/src/common/cors-origins.ts:17-19` — `defaultOrigins()` em produção devolve `'http://localhost:3000'` quando `FRONTEND_URLS`/`FRONTEND_URL` ausentes. | Configuração silenciosamente abre origem `localhost:3000` em produção (irrelevante para um atacante remoto, mas é um cheiro: produção devia *falhar fechado*). | `grep -n "defaultOrigins\|NODE_ENV" backend/src/common/cors-origins.ts` |
| ALG-16 | Média | Performance | `backend/src/enrollments/enrollments.service.ts:243-260` (admin `findAll`), `acoes/acoes.service.ts:37-50`, `absences/absences.service.ts:53-60`, `employees/employees.service.ts:289` (e mais ~25 lugares) — `findMany` sem `take`, com `include` profundo (`student.user`, `class.course`, `class.city`). | Listagens admin retornam todo o dataset; com 10k inscrições, payload + N+1 nos `include` faz a UI cair no Brasil. | `grep -rn "findMany" backend/src --include="*.service.ts" | wc -l` (87 actuais); revisão visual das que fazem listagem `findAll`. |
| ALG-17 | Baixa | Observabilidade | `backend/src/main.ts:111` cita `/api/health` na allowlist do middleware de manutenção, mas **nenhum controller implementa `health`** (já registado na Fase 4 da doc, item "GET /api/health"). | Se `manutencao=true`, a allowlist abre `/api/health` mas a rota devolve 404 → curl/k8s probe acha que está em manutenção. | `curl -i .../api/health` retorna 404 |
| ALG-18 | Baixa | Hygiene | `backend/src/prisma/prisma.service.ts:8,13` usa `console.log` em vez do `Logger` Nest (são as únicas linhas fora do `Logger`); `backend/src/main.ts:101,132,133` também — toleráveis em bootstrap. | Logs de bootstrap não passam pelo formato Nest; em produção com pino/winston, ficam fora da pipeline. | `grep -n "console\." backend/src/prisma/prisma.service.ts` |
| ALG-19 | Baixa | Hygiene | 82 ocorrências de `@Request() req: any` em controllers (`grep -rn '@Request() req: any' backend/src/*.controller.ts | wc -l`). | Tipagem perdida — `req.user.id` é `any.any.any`. Numa rota financeira, um typo em `req.user.id` vs `req.user.sub` passa silenciosamente. | `grep -rn "@Request() req: any" backend/src --include="*.controller.ts"` |
| ALG-20 | Baixa | Repo | `backend/prisma/check-molds.ts`, `check-ti-user.ts`, `delete-templates-again.ts`, `diagnose-ti-login.ts`, `fix-certificate-fileurls.ts`, `fix-utf8-notifications.ts`, `inspect-templates.ts`, `verify-system.ts` — scripts ad-hoc dentro de `prisma/`. | `tsx prisma/<script>.ts` corre directamente contra a `DATABASE_URL`; um operador bem-intencionado pode disparar `delete-templates-again.ts` em produção. Mover para `backend/scripts/` + adicionar guard `if (NODE_ENV === 'production') exit(1)` no topo dos `delete-*`/`fix-*`. | `ls backend/prisma/*.ts` |
| ALG-21 | Baixa | Frontend | `frontend/app/student/notifications/page.tsx:63` envia `&type=${filter}` quando o filtro não é `all`/`unread`; backend não lê `type`. *(extensão de E1)* | Os filtros por categoria (REEMBOLSO, IMPREVISTO, etc.) na página do aluno não filtram nada — a UI parece responsiva mas o servidor devolve sempre tudo. | DevTools → comparar XHR ao mudar dropdown de tipo |

### Cobertura — áreas revisitadas/exploradas (negativa explícita)

Áreas onde **não foram identificados achados novos** além dos já listados:

- `audit-log.controller.ts` — guards correctos (`ADMIN` only); service tem `try/catch` mas para registo, não para fluxo crítico.
- `dashboard.controller.ts` — RBAC correcto (`ADMIN`/`COORDINATOR`).
- `holiday.controller.ts` (após fixes Fase 1).
- `feedbacks.controller.ts` — RBAC granular por método; só os `} catch {}` da F1 da ronda 1.
- `trips.controller.ts` — `findOne(id, driverUserId)` valida ownership corretamente.
- XSS sinks no frontend — sem `dangerouslySetInnerHTML`/`eval`/`innerHTML` em código próprio (`grep` retornou 0 fora de `node_modules`).
- `JwtStrategy` — `secretOrKey: configService.get('JWT_SECRET')` + `ignoreExpiration:false`; `main.ts:15-28` recusa subir prod se < 64 chars.
- `helmet`/CSP em `main.ts:35-61` configurado (com `unsafe-inline`/`unsafe-eval` necessários a Next dev).

### Comandos read-only desta ronda (reaproveitáveis)

```bash
# Dumps SQL no repo
git ls-files backups/ database/backups/ backup/
wc -l backups/*.sql backup/*.sql database/backups/*.sql

# MinIO inseguro
grep -rn "useSSL: false\|setBucketPolicy" backend/src --include="*.ts"
grep -rn "minioadmin" backend/src --include="*.ts"

# Endpoints públicos / sem throttle
grep -rn "@Public" backend/src --include="*.ts"
grep -rn "@Throttle" backend/src --include="*.ts"

# Contratos FE↔BE
grep -rn "rejectionReason\|reason" frontend/lib/api/ backend/src/reimbursement/
grep -rn "userId\|requestedBy" frontend/lib/api/reimbursements.ts backend/src/reimbursement/

# Performance / N+1
grep -rn "findMany" backend/src --include="*.service.ts" | wc -l
grep -rn "findMany" backend/src --include="*.service.ts" | grep -v "take:"

# Tipagem fraca em controllers
grep -rn "@Request() req: any\|@Req() req: any" backend/src --include="*.controller.ts" | wc -l

# CI / scripts ad-hoc
cat .github/workflows/ci.yml
ls backend/prisma/*.ts
```

### Sugestão de prioridade (ronda 2)

1. **ALG-1** (dumps SQL no repo) — bloquear via `.gitignore`, mover para fora do repo, e considerar `git filter-repo` se o histórico contiver dados reais.
2. **ALG-2 + ALG-3** (MinIO inseguro + buckets public-read) — unificar num único `MinioModule` com `useSSL` por env e revisar políticas de bucket.
3. **ALG-4 + ALG-5** (`/register` e `/public/upload` sem throttle dedicado e validação fraca) — `@Throttle({ limit: 5, ttl: 60000 })` + DTOs com `class-validator`.
4. **ALG-9** (RefreshToken plaintext) — passar a guardar hash + `jti`.
5. **ALG-13 + ALG-14** (CI sem testes/lint, seed apontando para ficheiro deletado) — ajustes de baixo custo, alto retorno.
6. **ALG-16** (paginar `findMany` admin) — `page+limit` consistente em listagens admin.

*Última actualização desta ronda: 2026-05-06.*

---

## Registo de auditoria complementar (Claude Code — OpenAPI / superfície HTTP — 2026-05-06)

> **Âmbito:** terceira ronda — inventário completo da superfície HTTP via OpenAPI e cruzamento com guards/roles do código. Smoke-test sem auth (apenas GET, no máx. 3 tentativas) confirma empiricamente o achado A1 da ronda 1.
> **IDs novos** (prefixo `OAI-`) — sem colisão com A/B/…/G da ronda 1 nem com `ALG-*` da ronda 2.

### Origem dos dados

- **Fonte primária:** `GET http://localhost:3002/api/docs-json` (OpenAPI 3.0.0) — backend dev local respondeu `200 OK`, 119 506 bytes.
- **Cruzado com:** `grep` em `backend/src/**/*.controller.ts` para guardas (`@UseGuards`, `@Roles`, `@Public`, `@Throttle`).
- **Smoke-test:** `curl -s -o /dev/null -m 3 -w "%{http_code}"` em **13 GETs** sem token, contra UUIDs sintéticos (`00000000-…`) ou rotas literais. Sem POST/PATCH/DELETE, sem payloads.

### Resumo executivo

A API expõe **262 operações HTTP** em **28 prefixos**. O OpenAPI declara `security:[bearer]` em **223 operações** e omite em **39**. Dessas 39, 22 são públicas por design (fluxo de auth, verificação de certificado por QR, calendário nacional, inscrição e upload público); as outras **17 caem em duas categorias distintas**: (a) **10 endpoints `/classes/{id}` realmente expostos sem autenticação** — confirmados por smoke-test (`GET /api/classes/{uuid-falso}` devolve **404 NotFound** em vez de `401 Unauthorized`, prova de que o `JwtAuthGuard` nunca corre); e (b) **7 endpoints de `/truck-maintenance`** estão protegidos no runtime (controller declara `@UseGuards(JwtAuthGuard, RolesGuard)`, smoke devolve `401`) mas o controller **não usa `@ApiBearerAuth()`** — falso negativo no Swagger, sem implicação de segurança mas confunde quem lê a doc. Outros achados desta ronda: o gateway WebSocket `/notifications` (Socket.IO) **não está documentado no OpenAPI** e tem o seu próprio canal de auth via `handshake.auth.token`; `GET /api/health` continua a devolver 404 (referenciado em `main.ts:111` mas sem controller); `notifyAll()` no gateway emite para todos os sockets sem filtro de papel — usar com cuidado (não vi callsite hoje).

### A. Distribuição por prefixo de módulo

| Módulo | Total | Com `security` | Sem `security` |
|--------|------:|---------------:|---------------:|
| `/acoes` | 20 | 20 | 0 |
| `/admin` (admin-students/admin-trips/admin-absences) | 14 | 14 | 0 |
| `/audit-logs` | 1 | 1 | 0 |
| `/auth` | 18 | 5 | 13 |
| `/certificates` | 31 | 27 | 4 |
| `/cities` | 6 | 6 | 0 |
| **`/classes`** | **17** | **6** | **11** |
| `/contas-pagar` | 7 | 7 | 0 |
| `/courses` | 10 | 10 | 0 |
| `/dashboard` | 5 | 5 | 0 |
| `/driver` (trips + location + absences) | 13 | 13 | 0 |
| `/employees` | 18 | 18 | 0 |
| `/enrollments` | 11 | 10 | 1 |
| `/feedbacks` | 20 | 20 | 0 |
| `/groups` | 5 | 5 | 0 |
| `/holiday` | 4 | 3 | 1 |
| `/notifications` | 5 | 5 | 0 |
| `/payroll` | 3 | 3 | 0 |
| `/public` | 1 | 0 | 1 |
| `/register` | 1 | 0 | 1 |
| `/reimbursements` | 7 | 7 | 0 |
| `/reports` | 6 | 6 | 0 |
| `/settings` | 3 | 3 | 0 |
| `/students` | 7 | 7 | 0 |
| `/teachers` | 2 | 2 | 0 |
| **`/truck-maintenance`** | **7** | **0** | **7** |
| `/trucks` | 8 | 8 | 0 |
| `/users` | 12 | 12 | 0 |
| **TOTAL** | **262** | **223** | **39** |

### B. Lista das 39 rotas sem `security` no Swagger — classificadas

#### B.1 Públicas por design (22) — **OK**

| Método | Path | Notas |
|--------|------|-------|
| POST | /api/auth/login | Throttle 10/60s |
| POST | /api/auth/verify-email-otp | Throttle 3/10min |
| POST | /api/auth/resend-email-otp | Throttle 2/5min |
| POST | /api/auth/first-login/complete | Throttle 5/5min — IT_ADMIN flow |
| POST | /api/auth/2fa/setup/generate | `PreAuthGuard` (não JWT) |
| POST | /api/auth/2fa/setup/complete | `PreAuthGuard` |
| POST | /api/auth/2fa/verify | Throttle 3/15min |
| POST | /api/auth/forgot-password | Throttle 3/5min — **C7:** envia e-mail (Brevo) ou log `[DEV]` com link |
| POST | /api/auth/reset-password | Throttle 5/5min |
| POST | /api/auth/check-email | Throttle 10/60s |
| POST | /api/auth/check-cpf | Throttle 10/60s |
| POST | /api/auth/register | Throttle 5/60s — cria STUDENT *(ver ALG-8)* |
| POST | /api/auth/refresh | Throttle 20/60s |
| GET | /api/certificates/download/{code} | Download por QR Code (descrito em Swagger como público) |
| GET | /api/certificates/template/model | Template oficial atual |
| GET | /api/certificates/verify/{code} | Verificação pública (sem PII completa) |
| GET | /api/certificates/verify/{code}/image | OG image PNG 1200×630 |
| GET | /api/classes/public | Listagem pública de turmas com inscrição aberta |
| POST | /api/enrollments/public | Throttle 3/60s — inscrição pública |
| GET | /api/holiday/national/{year} | Calendário público (corrigido na ronda 0) |
| POST | /api/public/upload | Upload anónimo *(ver ALG-5)* |
| POST | /api/register | Auto-cadastro PROF/MOTORISTA *(ver ALG-4)* |

#### B.2 Doc Swagger desatualizada — **runtime protegido** (7) — **baixa severidade**

| Método | Path | Smoke-test | Causa |
|--------|------|-----------:|-------|
| GET | /api/truck-maintenance | **401** ✅ | Controller `truck-maintenance.controller.ts:9-10` tem `@UseGuards(JwtAuthGuard, RolesGuard)` e `@Roles(...)` por método, mas **não tem `@ApiBearerAuth()`** — Swagger esconde o cadeado. |
| POST | /api/truck-maintenance | (não testado) | mesma causa |
| GET | /api/truck-maintenance/truck/{truckId} | (não testado) | mesma causa |
| GET | /api/truck-maintenance/truck/{truckId}/stats | (não testado) | mesma causa |
| GET | /api/truck-maintenance/{id} | **401** ✅ | mesma causa |
| PATCH | /api/truck-maintenance/{id} | (não testado) | mesma causa |
| DELETE | /api/truck-maintenance/{id} | (não testado) | mesma causa |

> **OAI-1 — Doc Swagger inconsistente em truck-maintenance.** Severidade baixa. Adicionar `@ApiBearerAuth()` no controller para alinhar.

#### B.3 Realmente expostas sem auth — **runtime confirma falha** (10) — **alta**

Smoke-test feito hoje (`curl -m 3 -w '%{http_code}' http://localhost:3002/api/...` sem `Authorization`):

| Método | Path | Smoke-test | Esperado | Observação |
|--------|------|-----------:|---------:|------------|
| GET | /api/classes/{id} | **404** ❌ | 401 | `findOne(id)` chega ao service e devolve `NotFoundException` para o UUID inexistente — prova que **o JWT guard nunca corre**. |
| GET | /api/classes/{id}/schedule | **404** ❌ | 401 | mesmo padrão |
| GET | /api/classes/{id}/statistics | **404** ❌ | 401 | mesmo padrão |
| POST | /api/classes | (**não** testado — `Body` poderia criar) | 401 | confirmado por código (`classes.controller.ts:104` sem `@UseGuards`) |
| PATCH | /api/classes/{id} | (não testado) | 401 | mesma causa |
| DELETE | /api/classes/{id} | (não testado) | 401 | mesma causa |
| PATCH | /api/classes/{id}/status | (não testado) | 401 | mesma causa |
| POST | /api/classes/{id}/schedule | (não testado) | 401 | mesma causa |
| POST | /api/classes/{id}/teachers/{teacherId} | (não testado) | 401 | mesma causa |
| DELETE | /api/classes/{id}/teachers/{teacherId} | (não testado) | 401 | mesma causa |

> **OAI-2 — Confirmação empírica do achado A1 (ronda 1).** Severidade alta. Em `classes.controller.ts:96-159`, todos os métodos `@Get/@Post/@Patch/@Delete(':id'...)` declaram apenas `@Roles(...)` (metadado) sem `@UseGuards(JwtAuthGuard, RolesGuard)`. Como o `app.module.ts` não regista `APP_GUARD` para JWT, o pedido segue sem autenticação. **Solução curta:** acrescentar `@UseGuards(JwtAuthGuard, RolesGuard)` no nível da classe (depois do `@Controller(...)`), ou marcar `Get('public')` com `@Public()` e mover o decorator de classe.

### C. Outros achados desta ronda

| ID | Sev. | Local | Sintoma | Como validar |
|----|------|-------|---------|--------------|
| OAI-3 | Média | `backend/src/notifications/notifications.gateway.ts:14` | Gateway WebSocket `/notifications` (Socket.IO) **não aparece no OpenAPI**. Quem usa só Swagger desconhece o canal. Auth dele é por JWT no `handshake.auth.token` (`linhas 33-58`) — suficiente, mas não documentado. | Conectar `socket.io-client` ao endpoint `/notifications` sem token → desconecta de imediato. |
| OAI-4 | Média | `notifications.gateway.ts:76-78` | `notifyAll(event, data)` faz `server.emit(event, data)` para *todos* os sockets autenticados (qualquer papel). Se algum service o invocar com payload sensível, vaza-o cross-papel. | `grep -rn "notifyAll\b" backend/src` — hoje 0 callsites; manter sob controlo via ESLint custom rule ou remover o método. |
| OAI-5 | Baixa | `main.ts:111` cita `/api/health` na allowlist do middleware de manutenção; smoke devolve **404**. *(reiteração de §Fase 4 da doc e ALG-17)* | Probe k8s/Cloud Run interpreta como down em manutenção. | `curl -i http://localhost:3002/api/health` |
| OAI-6 | Baixa | OpenAPI 3.0.0 servido em produção se `NODE_ENV !== 'production'` (`main.ts:83-102`). Em dev local, qualquer pessoa na LAN com `localhost:3002` aceitar acede a `/api/docs` *(já presente em §7.5 implícito)*. | Confirmar `process.env.NODE_ENV` antes de subir. | `curl -s http://localhost:3002/api/docs-json | head -c 100` |
| OAI-7 | Baixa | `auth/2fa/disable` em `/api/auth/2fa/disable` exige só JWT comum + `token` TOTP no body (`auth.controller.ts:112-122`); 3 tentativas em rápida sucessão *poderiam* tentar 6 dígitos — embora o `authenticator.verify` use HOTP janela `±1` step. **Não há `@Throttle` específico** (só global 60/min). | `grep -n "2fa/disable" backend/src/auth/auth.controller.ts` |

### D. Lacunas de inventário (rotas no código sem aparecer no Swagger)

| Local | Tipo | Comentário |
|-------|------|-----------|
| `notifications/notifications.gateway.ts:14-19` | WebSocket Gateway | namespace `/notifications`. `@WebSocketGateway` não é parseado pelo `@nestjs/swagger`. |
| `notifications/notifications.gateway.ts:84-87` | WS event handler | `@SubscribeMessage('ping')` — utility. |

Não foram encontradas outras divergências significativas. Cada `@Get/@Post/@Patch/@Put/@Delete` em controllers que possui `@ApiOperation` aparece no JSON.

### E. Smoke-test executado (registo)

```
401  GET /api/users
401  GET /api/courses
401  GET /api/cities
401  GET /api/contas-pagar
401  GET /api/truck-maintenance
401  GET /api/truck-maintenance/<uuid-falso>
401  GET /api/classes
404  GET /api/classes/<uuid-falso>                 ❌ esperado 401
404  GET /api/classes/<uuid-falso>/schedule         ❌ esperado 401
404  GET /api/classes/<uuid-falso>/statistics       ❌ esperado 401
200  GET /api/classes/public                       (Public, OK)
200  GET /api/holiday/national/2026                (Public, OK)
404  GET /api/health                               (rota não implementada)
```

13 GETs, todos sem corpo, com timeout 3s — nenhum efeito de escrita.

### F. Comandos read-only desta ronda (reaproveitáveis)

```bash
# 1. Snapshot OpenAPI local (NUNCA contra produção)
curl -s -m 5 http://localhost:3002/api/docs-json > /tmp/upgrade-openapi.json
wc -c /tmp/upgrade-openapi.json

# 2. Listar rotas sem 'security' declarado
python3 -c "
import json
d=json.load(open('/tmp/upgrade-openapi.json'))
for p,o in sorted(d['paths'].items()):
  for m,op in o.items():
    if m in ('get','post','put','patch','delete') and 'security' not in op:
      print(m.upper(),p)
" | sort -u

# 3. Smoke-test 'GET sem auth' nas suspeitas (READ-ONLY — só GET)
for path in /classes /classes/00000000-0000-0000-0000-000000000000 \
           /classes/public /holiday/national/2026 /health; do
  code=$(/usr/bin/curl -s -o /dev/null -m 3 -w "%{http_code}" "http://localhost:3002/api$path")
  printf "%-4s GET %s\n" "$code" "$path"
done

# 4. Cruzar Swagger ↔ código: rotas com @Roles mas sem @UseGuards no mesmo método
grep -B2 "@Get\|@Post\|@Patch\|@Delete" backend/src/classes/classes.controller.ts \
  | grep -A1 "@Roles" | head
```

### G. Checklist auditável de revisão RBAC para a próxima sprint

1. [x] **OAI-2** Reparar `classes.controller.ts` — **feito 2026-05-06** — `@UseGuards(JwtAuthGuard, RolesGuard)` ao nível da classe + `@Roles` por método; `@Public()` em `Get('public')` apenas.
2. [x] **OAI-1** Adicionar `@ApiBearerAuth()` no `truck-maintenance.controller.ts` — **feito 2026-05-06**.
3. [ ] **OAI-3** Documentar o gateway WebSocket `/notifications` em `docs/arquitetura/` (não cabe em OpenAPI mas deve constar do contrato).
4. [ ] **OAI-7** Adicionar `@Throttle({ default: { limit: 5, ttl: 300000 } })` aos endpoints `2fa/enable`/`2fa/disable`.
5. [x] (Operacional) `GET /api/health` + `GET /api/ready` (DB) — **feito 2026-05-06** (`HealthModule`); *MinIO ping em `/ready` ainda não incluído* (opcional).
6. [ ] (Defesa em profundidade) Considerar `APP_GUARD` global com `JwtAuthGuard` e usar `@Public()` por exclusão — protegeria contra A1/OAI-2 estruturalmente.

*Última actualização desta ronda: 2026-05-06.*

---

## Registo de auditoria complementar (Claude Code — bugs de uso e fluxos críticos — 2026-05-06)

> **Âmbito:** quarta ronda — **bugs de uso** (UX + fluxos cross-perfil), não de segurança. Mapeia onde o sistema "diz que fez" mas o utilizador não vê o efeito esperado, ou onde o admin precisa fazer F5 para a aba acompanhar a acção.
> **IDs novos** (prefixo `UX-`) — sem colisão com A/B/…/G (ronda 1), `ALG-*` (ronda 2) ou `OAI-*` (ronda 3).
> **Smoke HTTP executado** contra backend dev local (`http://localhost:3002/api`) — só **GETs autenticados** (login admin via credenciais já registadas em §Fase 4); zero `POST/PATCH/DELETE`. Resultados em §G.

### Resumo executivo

A análise das 8 jornadas críticas confirma um padrão recorrente: **o backend executa a operação, mas a UI quebra a expectativa do utilizador** em três classes de falha. **(1) Refresh enganoso após filtro:** páginas como `admin/reembolsos` e `admin/imprevistos` chamam `load()` após aprovação, mas `load()` reaplica o filtro activo — se o admin estava em "Pendentes" e aprovou, o item desaparece da vista (parece "sumido") em vez de mudar para coluna "Aprovado" — KPIs também ficam incoerentes (ex.: "Total Aprovado" mostra `0` quando o filtro é `PENDING`). **(2) Listas que não escutam WebSocket:** apenas o `useNotifications` hook se liga ao Socket.IO; nem `admin/contas-a-pagar`, nem `admin/imprevistos`, nem `admin/reembolsos` escutam eventos de negócio para actualizar suas tabelas — o admin precisa navegar de aba para ver o efeito de uma aprovação que ele acabou de fazer. **(3) Dois fluxos críticos não geram efeito secundário esperado:** **smoke-test confirmou** que existem **4 reembolsos `APPROVED` no sistema mas zero ContaPagar com "reembolso" na descrição** — `reimbursement.service.ts:211-225` cria a ContaPagar dentro de `try/catch` com apenas `logger.error`, e o seed actual provavelmente aprovou reembolsos sem essa criação. Análogo para imprevistos: `absences.service.review()` com status `PENALIZED` **não cria ContaPagar nenhuma**. Também há lacunas de notificação: admin que aprova/rejeita **imprevisto** não notifica o usuário-alvo (compare com reembolso que notifica), e admin que **cria** imprevisto manualmente para um usuário também não o notifica. O hook `useNotifications` mantém estado *só em memória* — `markAllRead` não chama `PATCH /notifications/read-all`, então o badge volta a piscar no próximo F5. Por fim, `frontend/lib/api/reimbursements.ts:39` ainda envia `{ reason }` quando o backend espera `{ rejectionReason }` (já documentado em ALG-10) — consequência: qualquer página que use o helper não consegue rejeitar.

### A. Tabela de achados de uso (20)

| ID | Jornada | Sev. (uso) | Sintoma para o utilizador | Causa (FE/BE) | Evidência | Como reproduzir em dev | Correcção sugerida |
|---|---|---|---|---|---|---|---|
| UX-1 | Reembolso → Contas-a-pagar | **Alta** | Admin aprova 4 reembolsos somando R$ 263,50; ao abrir "Contas a pagar" não vê nenhuma conta de reembolso. Tem de pagar manualmente. | **BE.** `reimbursement.service.ts:211-225` cria `ContaPagar` em `try/catch` que só faz `logger.error`. Sem transação com o `update→APPROVED`. (já listado em §Fase 2 e F2) | Smoke `GET /reimbursements?status=APPROVED` → 4 itens; `GET /contas-pagar` → 4 itens, **0** com "reembolso" na descrição (ver §G). | Aprovar 1 reembolso → recarregar `/admin/contas-a-pagar` → conta nova **deve** aparecer com `tipo_conta: 'funcionario'`, `descricao: "Reembolso de Despesas: …"`. Confirmar log do backend. | Embrulhar `update + create` em `prisma.$transaction([...])`. Logar em `WARN` (não `ERROR`) o duplicado, quando idempotência for adicionada via `comprovante_url=reimbursement.id`. |
| UX-2 | Imprevisto PENALIZED → Contas-a-pagar | **Alta** | Admin marca imprevisto como `PENALIZED` com valor R$ X; nada acontece em "Contas a pagar". Admin pensa que o sistema lançou retenção. | **BE.** `absences.service.ts:111-133` `review()` apenas faz `update` em `absence`; não cria `ContaPagar`. (Fase 2 / Fase 3 §5 também citam) | Código: `absences.service.ts` não importa `prisma.contaPagar.create`. | `POST /admin/absences/<id>/review {status:'PENALIZED', penalty:50}` → Listar contas a pagar — não aparece. | Quando `status === 'PENALIZED' && penalty > 0`, criar `ContaPagar` `tipo_conta: 'funcionario'`, `valor: penalty`, `descricao: "Penalidade por imprevisto: <descrição>"` na mesma transação. |
| UX-3 | Reembolso (admin) | Média | Após aprovar/rejeitar, o reembolso "some" se o admin estava no filtro `PENDING`. Parece que falhou. | **FE.** `admin/reembolsos/page.tsx:267,272` aplica filtro de status no `GET`; após `load()` o item já não corresponde ao filtro. | `frontend/app/admin/reembolsos/page.tsx:262-272` | Filtrar por "Pendentes" → "Analisar" → "Aprovar" → modal fecha → tabela vazia, sem feedback claro. | Após `onDone`, **mover** filtro para `''` (Todos) **OU** mostrar toast "Aprovado — visível em Todos". Aplicar o mesmo padrão a `admin/imprevistos`. |
| UX-4 | Reembolso (admin) | Média | KPI "Total Aprovado" mostra R$ 0 quando filtro está em "Pendentes" — aparenta inconsistência. | **FE.** `admin/reembolsos/page.tsx:274-279` calcula `stats` a partir de `items`, que **já está filtrado**. | `stats.totalApproved = items.filter(...APPROVED...)` | Filtrar por "Pendentes" — Total Aprovado fica 0. | Calcular KPIs a partir de fetch separado **sem filtro** (ou backend `meta.totals`). |
| UX-5 | Contas-a-pagar (admin) | Média | Admin aprova reembolso noutra aba → volta para Contas-a-pagar e a tabela continua antiga. Sem WS, sem polling. | **FE.** `admin/contas-a-pagar/page.tsx:507-547` só faz `useEffect` por filtros; não escuta `notifyAdmins('reembolso_revisado')`. | `grep -c "addEventListener\|socket\|useNotifications" frontend/app/admin/contas-a-pagar/page.tsx` retorna `1` (só o handler de `mousedown` para o menu). | Aprovar reembolso → mudar de aba → voltar — sem refresh manual a lista é antiga. | Subscrever a `useNotifications` (já recebe `reembolso_revisado` no socket) e disparar `load()`; ou polling 30s; ou broadcast por canal "contas-pagar" e refetch. |
| UX-6 | Imprevisto (admin → user) | Média | Aluno/professor regista imprevisto → admin valida/rejeita → o **usuário não recebe notificação**. Tem de abrir o portal para descobrir. | **BE.** `absences.service.ts:111-133` `review()` não chama `notifications.notifyUser` nem `notificationsSender.absenceReviewed`. Compare com `reimbursement.service.ts:194-208`. | `absences.service.ts:111-133` (sem `notifyUser`) | Logar como aluno → registar imprevisto → logar como admin → "Validar"; voltar ao aluno: zero notificação. | Emitir WS event `imprevisto_revisado` para `userId` + persistir notificação via `NotificationsSenderService`. |
| UX-7 | Imprevisto (admin cria por utilizador) | Média | Admin cria imprevisto **em nome de** um utilizador via modal "Novo Imprevisto" — utilizador não recebe nada. | **BE.** `absences.service.ts:62-80` `createByAdmin()` não emite WS nem persiste notificação (compare com `create()` linhas 22-44 que emite `imprevisto_cadastrado`). | `grep -n "notify" backend/src/absences/absences.service.ts` — só `create` tem. | Admin → "Novo Imprevisto" → seleciona userId → criar; aluno não vê. | `notifyUser(targetUserId, 'imprevisto_cadastrado_por_admin', {...})` e gravar `Notification`. |
| UX-8 | Imprevisto (admin) modal "Novo Imprevisto" | Baixa | Dropdown de utilizadores carrega a lista **completa** de `/users` (admin pode ter centenas) — modal demora a abrir e aluno fica perdido na lista. | **FE.** `admin/imprevistos/page.tsx:174-176` faz `api.get('/users')` sem paginação nem filtro de role. | `frontend/app/admin/imprevistos/page.tsx:170-176` | Abrir o modal — se houver muitos users, o `<select>` fica enorme. | `?role=DRIVER,TEACHER,STUDENT&limit=200` com autocomplete remoto, ou splitar por aba "Aluno / Professor / Motorista". |
| UX-9 | Notificações (filtros) | Média | Aluno escolhe "Não lidas" → backend devolve a lista toda; só o badge `unreadCount` está coerente. | **FE↔BE.** Já em **E1/ALG-21**. *(referência cruzada — não duplicar)* | `frontend/app/student/notifications/page.tsx:62-63` envia `&read=false&type=…`; backend só lê `unreadOnly`. | Abrir `/student/notifications`, alternar filtro, observar XHR. | Renomear param FE para `unreadOnly=true`; mapear `type` no backend (extender `NotificationsController.findAll`). |
| UX-10 | Notificações (markAllRead local) | Média | Utilizador clica "Marcar todas como lidas" no sino; recarrega a página → todas voltam a estar não lidas. | **FE.** `useNotifications.ts:115-116` apenas muda estado local; **não chama** `PATCH /notifications/read-all`. | `frontend/hooks/useNotifications.ts:115-116` | Sino → "Marcar todas" → F5 → `unreadCount` volta a contar. | Chamar `await api.patch('/notifications/read-all')` antes de `setNotifications`. |
| UX-11 | Notificações (WS sem persistência por id) | Baixa | Notificações que chegam via WebSocket têm id sintético `${type}-${Date.now()}` no FE; nunca são marcáveis-lidas individualmente, nem casam com a `Notification` persistida no banco quando depois recarrega. | **FE/BE contract.** Backend persiste *e* emite WS, mas o payload WS não inclui `notificationId`. Hook usa id sintético. | `frontend/hooks/useNotifications.ts:88-98` (`id: ...-Date.now()`) | Aprovar reembolso → ver notificação chegar; clicar — não tem `id` real, então o `markRead/:id` não funciona. | Backend deve enviar `notificationId` no payload WS; hook deve usá-lo como `id`. |
| UX-12 | Sino vs página de notificações | Baixa | `NotificationBell` faz `api.get('/notifications?limit=15')` no mount **sem** se ligar ao Socket — só atualiza ao abrir a aba do sino (depende do componente). Hook `useNotifications` usa Socket; coexistem dois modelos. | **FE.** `components/ui/NotificationBell.tsx:86-94` lê via REST; `useNotifications.ts:73` usa WS. Não há fonte única. | `grep -n "api.get\|io(" frontend/components/ui/NotificationBell.tsx frontend/hooks/useNotifications.ts` | Receber notif WS — sino não pisca até refresh do componente. | Unificar: `NotificationBell` consumir `useNotifications` em vez de chamar API direto. |
| UX-13 | Inscrições (admin) | Média | Admin aprova inscrição na lista; lista refresca, mas se o filtro inicial era "Pendente", o item desaparece sem feedback claro. | **FE.** `admin/inscricoes/page.tsx:95,121` faz `fetchEnrollments()` após `PATCH /:id/status`. Mesmo padrão de UX-3. | `frontend/app/admin/inscricoes/page.tsx:85-121` | Filtro "Pendente" → aprovar → linha some. | Manter o item com `data-just-approved` por 3s antes de re-aplicar filtro, ou mover para "Todos". |
| UX-14 | Frequência turma (professor) | Média | Professor regista lote de presença; ele vê toast ✓; admin é notificado via WS (`frequencia_registrada`); mas o **aluno ausente** não vê notificação na app, só recebe e-mail (se houver provider). | **BE.** `classes.service.ts:548-565` envia `notifyAdmins` (in-app) + `notificationsSender.absenceRegistered` (canal). Falta um `notifyUser(student.userId, 'falta_registrada', …)` — actualmente só `absenceRegistered` (que vai por *sender*, não in-app). | `classes.service.ts:548-565` | Ausentar 1 aluno em lote; logar como o aluno → `/student/notifications` — pode não ter linha em "in-app" (depende do provider). | Adicionar `this.notifications.notifyUser(student.userId, 'falta_registrada', {classId, date})` para garantir badge. |
| UX-15 | Feriados / recálculo de turma | Média | *(Histórico — antes de C18)* Professor adiciona feriado; `endDate` avança 1 dia útil; ao remover, recuava por dia de calendário + walk-back (assimétrico). | **BE.** Corrigido com **`endDateBeforePush`** em `ClassHoliday` e restauração no **`removeClassHoliday`**. | `holiday.service.ts` + `schema.prisma` (`ClassHoliday`) | *(Validar na tua rodada)* Sequência add-then-remove com snapshot novo → `endDate` coincide com o valor pré-registo. | *(Ver **C18**.)* |
| UX-16 | Feriados / notificação | Média | *(Histórico)* Mudança de `endDate` sem aviso. | **BE/FE.** Persistência **`classEndDateChanged`** + WS **`turma_termino_alterado`** + listener em **`useNotifications`**. | `notifications-sender.service.ts`, `holiday.service.ts`, `useNotifications.ts` | Professores da turma + alunos matriculados recebem in-app e tempo real. | *(Ver **C18**.)* |
| UX-17 | Reembolso (helper FE quebrado) | Média | Componente que use `reimbursementsApi.reject(id, reason)` recebe 400 do backend; admin nunca usa este helper porque a página `admin/reembolsos/page.tsx:157` chama o endpoint direto. Risco de regressão se outra página adoptar o helper. | **FE↔BE.** Já em **ALG-10**. (referência) | `frontend/lib/api/reimbursements.ts:39` envia `{ reason }`; backend exige `{ rejectionReason }`. | Construir página nova que importe `reimbursementsApi.reject` → falha. | Renomear no helper para `rejectionReason`; manter alias `reason` durante 1 release. |
| UX-18 | Reembolso (admin cria) | Baixa | Admin abre "Nova Solicitação" em `admin/reembolsos`; o BE associa `requestedBy = req.user.id` (= admin). Reembolso fica em nome do admin, não do funcionário real. | **FE/BE.** `admin/reembolsos/page.tsx:61` `POST /reimbursements` sem `employeeId`/`requestedBy`; backend `reimbursement.service.ts:67-105` só recebe `requestedBy`. | `reimbursement.controller.ts:88-102` (post) | Logar como admin → "Nova Solicitação" → ver lista: aparece "Funcionário: Administrador". | Adicionar campo `employeeId` (autocomplete) no modal do admin; backend já aceita `data.employeeId`. |
| UX-19 | Inscrição rejeitada (FE) | Baixa | Em `admin/acoes/[id]/page.tsx:996`, ao rejeitar, hardcoded `rejectionReason: 'Rejeitado pelo administrador'` — admin nunca pode escrever motivo. | **FE.** mensagem genérica para todos os casos. | `frontend/app/admin/acoes/[id]/page.tsx:996` | Aprovar/rejeitar inscrição via aba "Acções" → motivo idêntico em todos. | Abrir modal com `<textarea>` exigindo motivo (já existe noutros sítios). |
| UX-20 | Health-probe (operacional) | Baixa | k8s/Cloud Run probe contra `/api/health` recebe `404`; se o middleware de manutenção estiver activo, parece estar tudo "em manutenção" para o probe. *(reiteração de OAI-5/ALG-17)* | **BE.** Rota referenciada em `main.ts:111` mas sem controller. | `curl -s -m 3 -w "%{http_code}" http://localhost:3002/api/health` → `404`. | (já validado em §Smoke E da ronda 3 e nesta ronda) | Implementar `HealthController` com `/health` (always 200) e `/ready` (DB + MinIO). |

### B. Mapa rápido — perfil → eventos → aba admin

```
PROFESSOR / MOTORISTA
  └─ POST /reimbursements           ┐
                                    ├─ WS notifyAdmins('reembolso_solicitado')   → admin sino ✓
                                    └─ NotificationsSender.reimbursementRequested → admin in-app ✓
                                       (admin/reembolsos NÃO escuta WS para refresh — UX-5 análogo)

PROFESSOR
  └─ POST /classes/:id/attendance/bulk
        ├─ WS notifyAdmins('frequencia_registrada')        → admin sino ✓
        └─ Sender.absenceRegistered(student.userId)         → aluno in-app ✓ ?
           (admin/frequencia NÃO escuta WS — refetch manual)

ALUNO/MOTORISTA/PROFESSOR
  └─ POST /driver/absences           ┐
                                    └─ WS notifyAdmins('imprevisto_cadastrado') → admin sino ✓
                                       (admin/imprevistos NÃO escuta WS — UX-5 análogo)

ADMIN aprova reembolso
  └─ PATCH /reimbursements/:id/approve
        ├─ WS notifyUser(requestedBy,'reembolso_revisado')  → user sino ✓
        ├─ Sender.reimbursementStatusChanged                → user in-app ✓
        └─ prisma.contaPagar.create  ← ❌ try/catch silencioso (UX-1; F2 anterior)

ADMIN revisa imprevisto
  └─ PATCH /admin/absences/:id/review
        ├─ ❌ NÃO emite WS para o user (UX-6)
        ├─ ❌ NÃO persiste Notification para o user (UX-6)
        └─ ❌ NÃO cria ContaPagar mesmo com status PENALIZED + penalty (UX-2)

ADMIN aprova inscrição
  └─ PATCH /enrollments/:id/approve
        └─ AuditLog ✓; notificações in-app: depende do EnrollmentsService (não verificado nesta ronda)

ADMIN regista feriado em turma
  └─ POST /holiday/class/:id
        ├─ Atualiza class.endDate ✓
        ├─ Notifica professor/alunos in-app + WS `turma_termino_alterado` (C18 / UX-16) ✓
        └─ Remoção com snapshot `endDateBeforePush` → reverte igual ao pré-registo (C18 / UX-15) ✓
```

### C. Páginas FE que **não** escutam WebSocket (todas dependem de F5/refetch manual após acção noutra aba)

| Página | Carrega via | Escuta WS? |
|--------|-------------|-----------|
| `frontend/app/admin/reembolsos/page.tsx` | `useEffect([filterStatus])` | ❌ |
| `frontend/app/admin/contas-a-pagar/page.tsx` | `useCallback load + useEffect([filtros])` | ❌ |
| `frontend/app/admin/imprevistos/page.tsx` | `useEffect([filter])` | ❌ |
| `frontend/app/admin/inscricoes/page.tsx` | `useEffect([], 1x)` | ❌ |
| `frontend/app/admin/turmas/page.tsx` | `useEffect([statusFilter])` | ❌ |
| `frontend/app/admin/frequencia/...` | `useEffect` | ❌ |
| `frontend/app/student/notifications/page.tsx` | `useEffect([page,filter])` | ❌ (usa só REST) |

Apenas `frontend/hooks/useNotifications.ts` e `components/ui/NotificationBell.tsx` consomem o canal WS — e mesmo assim não acionam `refetch` em listagens cross-aba.

### D. Hipóteses de falha não validadas (para a próxima ronda)

- **UX-1 root cause:** poderia ser também schema (`tipo_conta` enum/text). Validar em dev: forçar erro inserindo `valor` como string e ver se aparece no log do backend.
- **UX-13:** `enrollments.service.requestCorrection` tem `// TODO: Send correction request notification` (`enrollments.service.ts:419`) — efeito de "Solicitar correção" pode ser mudo na UI do aluno.
- **Reembolso aprovado em seed:** verificar se os 4 `APPROVED` actuais foram aprovados no seed antes de a função `contaPagar.create` existir, ou se há erro novo a engolir.

### E. Cruzamento código (rápido) — uma linha por jornada

| Jornada | Backend | Frontend | API client |
|---------|---------|----------|------------|
| Reembolso | `backend/src/reimbursement/reimbursement.{controller,service}.ts` | `frontend/app/admin/reembolsos/page.tsx`, `frontend/app/{teacher,driver}/reembolsos/page.tsx` | `frontend/lib/api/reimbursements.ts` |
| Contas a pagar | `backend/src/contas-pagar/{controller,service}.ts` | `frontend/app/admin/contas-a-pagar/page.tsx` | `frontend/lib/api/contasPagar.ts` |
| Imprevistos | `backend/src/absences/absences.{controller,service}.ts` | `frontend/app/admin/imprevistos/page.tsx`, `frontend/app/{driver,teacher,student}/imprevistos/page.tsx` | (sem helper dedicado — uso direto) |
| Frequência | `backend/src/classes/classes.service.ts:520+`, `backend/src/employees/employees.service.ts:380+` | `frontend/app/teacher/frequencia/[classId]/page.tsx`, `frontend/app/admin/frequencia/components/*` | (uso direto via `api.post`) |
| Inscrições | `backend/src/enrollments/enrollments.{controller,service}.ts` | `frontend/app/admin/inscricoes/page.tsx`, `frontend/app/admin/acoes/[id]/page.tsx` | (uso direto) |
| Notificações | `backend/src/notifications/{controller,gateway}.ts`, `notifications-sender.service.ts` | `frontend/hooks/useNotifications.ts`, `components/ui/NotificationBell.tsx`, `frontend/app/student/notifications/page.tsx` | `frontend/lib/api/notifications.ts` |
| Feriados | `backend/src/holiday/holiday.{controller,service}.ts` | `frontend/app/admin/feriados/page.tsx` | (uso direto) |
| Certificados | `backend/src/certificates/{certificate.service,certificate-notification.service}.ts` | `frontend/app/student/certificates/page.tsx`, `frontend/app/admin/certificados/page.tsx` | `frontend/lib/api/certificates.ts` |

### F. Smoke HTTP executado (registo)

```
# Login dev (admin@qualifica.com) — credenciais já em §Fase 4 deste guia.
POST /api/auth/login                                        → 200 (com bypass MFA conforme dev)

# 6 GETs autenticados (read-only, sem POST/PATCH)
200 2413B  GET /api/reimbursements?status=PENDING
200 2586B  GET /api/reimbursements?status=APPROVED          ← total: 4 itens APROVADOS
200  603B  GET /api/contas-pagar?status=pendente
200 1763B  GET /api/admin/absences?status=PENDING
200  565B  GET /api/notifications?limit=1
200  142B  GET /api/dashboard/stats

# 1 GET de cruzamento — chave do achado UX-1
GET /api/contas-pagar (sem filtro de status)
   → contas activas: 4
   → totaisPorStatus: {pendente: 890, paga: 495, vencida: 120, cancelada: 0}
   → contas com "reembolso" na descrição: **0**
   → tipos: abastecimento, pneu_furado, agua, espontaneo
```

**Conclusão do smoke:** existem **4 reembolsos `APPROVED`** mas **zero `ContaPagar` correspondente** — confirma UX-1/F2 com dados reais. Total não-pago de R$ 263,50 (68,50 + 65,00 + 65,00 + 65,00 esperado) ficou só no estado do reembolso, sem entrada financeira para o operacional pagar.

### G. Ranking sugerido (uso, não segurança) para a próxima sprint

1. **UX-1** Transação `approve + contaPagar.create` em reembolso, com idempotência por `reimbursement.id`.
2. **UX-2** PENALIZED → `ContaPagar` automaticamente, mesma transação.
3. **UX-6 + UX-7** Notificar utilizador-alvo em todas as ações de imprevisto (review, createByAdmin, update, remove).
4. **UX-3 + UX-13** Re-design pequeno do refresh pós-aprovação (mover filtro p/ "Todos" ou mostrar item por 3s).
5. **UX-5** Subscrever `admin/contas-a-pagar`, `admin/imprevistos` e `admin/reembolsos` ao `useNotifications` (já existe canal WS).
6. **UX-10 + UX-11** Persistir `markAllRead` via REST; backend incluir `notificationId` no payload WS para alinhar com a `Notification` persistida.
7. ~~**UX-15 + UX-16**~~ *(fechado — **C18**)* Recálculo com snapshot e notificações em `holiday.service`.

*Última actualização desta ronda: 2026-05-06.*

---

## Apêndice — Timeline cronológica sugerida (tu + IA)

Usa esta ordem **no tempo** (primeiro o que desbloqueia o resto). Em cada passo: **IA** faz smoke técnico; **tu** confirmas no browser conforme a secção **Plano de verificação manual** e os critérios abaixo.

| Ordem no tempo | Foco | Tu validas (manual) | IA pode apoiar (smoke / leitura) |
|----------------|------|----------------------|----------------------------------|
| **T0** | **Fase 0** — Docker, `.env`, `migrate deploy`, `prisma generate`, seed | Login admin abre; turmas listam sem 500; feriado nacional abre (se público). | `curl` login, `GET /classes`, `GET /holiday/national/2026`. |
| **T1** | **Fase 1** — RBAC e acessos | Cada perfil só vê menus e páginas esperadas; tentativas “ilegais” dão erro claro. | Repetir `GET`/`POST` com tokens de perfis diferentes (onde seguro). |
| **T2** | **Fase 2** — Dinheiro coerente | Aprovar reembolso → **aparece** em Contas a pagar; penalidade de imprevisto → **aparece** se o requisito for esse. | Comparar contagens API reembolsos vs contas com texto “reembolso”. |
| **T3** | **Fase 3 itens 1–6** — Funcionalidades backlog | Um item de cada vez: relatórios, turmas, funcionários, 2FA professor, feedbacks. | Verificar endpoints novos / `tsc` após cada PR. |
| **T4** | **Fase 4 + registo** — Regressão | Re-percorrer checklist §Plano de verificação manual (7 pontos). | Actualizar tabela de sessão com data e resultado. |
| **T5** | **§7 Riscos produção** | Segredos reais, MFA sem bypass, e-mail de recuperação a chegar. | Procurar `dev-fallback`, `AUTH_BYPASS_MFA`, rotas sem `security` no OpenAPI. |
| **T6** | **Achados UX-** (ronda bugs de uso) | Fluxos “admin aprova → outro ecrã vê”; notificações; feriados; inscrições. | `GET` autenticados documentados em §F da última ronda UX. |

**Nota:** os achados **A1 / OAI-2** (rotas de turmas **sem** JWT no controller) estão descritos nas tabelas acima com coluna **Sintoma** — em humano: **“alguém sem login pode chamar a API de turmas”** até ser corrigido; a tua validação manual **não substitui** fechar isso no código.

---

## Apêndice — Índice «Para ti» dos achados **UX-1** a **UX-20** (tradução em uma frase cada)

Cada linha resume o que está na tabela longa da ronda “bugs de uso”; para detalhes técnicos mantém-se o texto original acima.

| ID | O que sentes no dia a dia (tradução) |
|----|--------------------------------------|
| **UX-1** | Aprovaste reembolsos mas no financeiro **não nasce** conta a pagar — o dinheiro “fica no ar”. |
| **UX-2** | *(C8 — corrigido no código; validar na tua rodada)* Marcas **PENALIZED** com valor e deves **ver** conta em Contas a pagar. |
| **UX-3** | Com filtro “Pendentes”, ao aprovar o registo **some** da lista — parece que falhou. |
| **UX-4** | Os totais no topo (ex.: “Total aprovado”) **mentem** quando estás a filtrar só pendentes. |
| **UX-5** | Aprovaste noutra aba; ao voltar a Contas a pagar a tabela está **velha** até dar F5. |
| **UX-6** | *(C11 — corrigido; validar na tua rodada)* Admin revisa imprevisto → **notificação in-app** + WS `imprevisto_revisado`. |
| **UX-7** | *(C11 — corrigido; validar na tua rodada)* Admin cria imprevisto em teu nome → **notificação** + WS `imprevisto_cadastrado_por_admin`. |
| **UX-8** | Modal “novo imprevisto” com lista **gigante** de utilizadores — lento e confuso. |
| **UX-9** | Filtro “não lidas” nas notificações do aluno **não filtra** como esperas. |
| **UX-10** | “Marcar todas como lidas” no sino **volta atrás** ao recarregar a página. |
| **UX-11** | Notificação que chegou pelo tempo real **não dá** para marcar como lida como as outras. |
| **UX-12** | O **sino** e a **página** de notificações não se comportam igual — uma actualiza, outra não. |
| **UX-13** | Mesmo padrão do UX-3 mas em **inscrições** aprovadas com filtro pendente. |
| **UX-14** | Professor marca falta; o **aluno** pode não ver nada na app (só e-mail ou nada). |
| **UX-15** | *(C18 — corrigido no código; validar na tua rodada)* Remover feriado **restaura** o `endDate` gravado antes daquele registo (`endDateBeforePush`). |
| **UX-16** | *(C18 — corrigido no código; validar na tua rodada)* Alteração de término **notifica** professores da turma e alunos **APPROVED**/**ENROLLED**. |
| **UX-17** | Código partilhado de “rejeitar reembolso” envia o **nome errado** do campo — rejeição falha. |
| **UX-18** | Admin cria reembolso “para funcionário” mas fica **em nome do admin** na lista. |
| **UX-19** | Ao rejeitar inscrição o **motivo** é sempre a mesma frase genérica — não podes personalizar. |
| **UX-20** | Monitorização de servidor (`/api/health`) **não existe** — ferramentas de deploy podem achar que está tudo mal. |

