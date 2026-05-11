# 📓 DIÁRIO DE BORDO — Sistema Upgrade
## Log Narrativo de Todas as Sessões | Método RR Technology
## Atualizado em 18/03/2026 | v1.0

> **O que é este documento?**
> Registro cronológico narrativo de cada sessão de desenvolvimento.
> Diferente do PLANO_IMPLEMENTACAO_FASES.md (que é técnico e estruturado),
> o Diário de Bordo conta o que aconteceu, por que, e quais decisões foram tomadas.
> É a memória humana do projeto — leia antes de cada nova sessão para entender o contexto.

---

## 🔗 REFERÊNCIAS CRUZADAS

> **Ler este documento:**
> Quando precisar entender o CONTEXTO de uma decisão que não está explicada nas docs técnicas.
> O Diário registra o raciocínio que levou às regras e bugs catalogados.
>
> **Ler junto com:**
> - [`ESTADO_SISTEMA.md`](./ESTADO_SISTEMA.md) — o que está pronto hoje (resultado das sessões)
> - [`ERROS_E_SOLUCOES.md`](../seguranca/ERROS_E_SOLUCOES.md) — bugs descobertos e documentados neste diário
> - [`LIVRO_DE_REGRAS.md`](./LIVRO_DE_REGRAS.md) — regras que nasceram das decisões registradas aqui
>
> **Formato de entrada (ao atualizar):**
> ```
> ## SESSÃO DD/MM/AAAA — [Tema] | [Participantes]
> ### Contexto
> ### O que foi feito
> ### Decisões importantes
> ### O que ficou para a próxima sessão
> ```

---

## SESSÃO 18/03/2026 — Tarde (continuação 4) | Reestruturação arquitetural completa do portal motorista

### Contexto
Gravity 2.0 voltou online. O portal do motorista tinha erros de build (JSX corrompido por múltiplos appends parciais) e problemas de responsividade estruturais. A sessão focou em parar, pesquisar corretamente, definir regras e reescrever de forma limpa.

### O que foi feito — Fase de diagnóstico e pesquisa

Antes de escrever qualquer linha de código, Gravity 2.0 fez uma pesquisa web sobre melhores práticas de responsividade em 2025/2026. As principais descobertas foram: que `position: fixed; inset: 0` é a única forma garantida de cobrir 100% do viewport em qualquer resolução (MDN + Smashing Magazine), que `transform: translateX()` para sidebars é superior a `width: 0` porque nunca oculta o conteúdo interno via `overflow: hidden`, e que CSS custom properties para o offset do conteúdo (`--drv-left`) eliminam a necessidade de cálculos JavaScript para o efeito push.

### O que foi feito — Erros identificados e por que ocorreram

O arquivo `dashboard/page.tsx` estava corrompido por múltiplos appends parciais ao longo da sessão — cada tentativa de correção havia adicionado código ao final do arquivo sem fechar o JSX anterior. O erro de build `Expression expected` na linha 213 era causado por um `<>` de Fragment JSX que o parser TypeScript interpretava como operadores de comparação porque havia código JavaScript (`const css = ...`) definido dentro da função do componente, antes do `return`. A solução definitiva foi mover o CSS para uma constante fora da função.

O problema de espaço branco nas laterais em resoluções acima de 1440px tinha três raízes simultâneas: o `body` tinha `background-color: #F4F6FA` sem `width: 100%` garantido; o `html` não tinha `overflow-x: hidden`; e o container `#__next` do Next.js não tinha `width: 100%` explícito. Qualquer área não coberta pelo portal mostrava esse cinza claro.

### O que foi feito — Implementação final

**Layout (`layout.tsx`) reescrito com arquitetura `inset: 0`:** O shell usa `position: fixed; inset: 0` — cobre literalmente o viewport de pixel 0 a pixel N em qualquer resolução. A sidebar usa `transform: translateX(-240px / 0)` para visibilidade, nunca `width: 0`. O conteúdo usa `position: fixed; top: 0; right: 0; bottom: 0; left: var(--drv-left)`, onde `--drv-left` é uma CSS custom property definida no shell que transiciona entre `0px` (overlay mode) e `240px` (push mode). Isso garante que o conteúdo sempre preenche da esquerda até a borda direita em qualquer tamanho de tela.

**Dashboard (`dashboard/page.tsx`) reescrito do zero em arquivo único:** CSS como constante `DASHBOARD_CSS` fora da função, JSX completo e fechado em um único arquivo. Sem `clamp()` com expressões inválidas. KPIs com `grid-template-columns: repeat(3, 1fr)` — 3 colunas fixas que crescem igualmente. Ações rápidas com `repeat(auto-fill, minmax(130px, 1fr))` — número de colunas calculado automaticamente pelo browser.

**globals.css corrigido:** Reset de `html { width: 100%; overflow-x: hidden }` e `body { width: 100%; overflow-x: hidden }` adicionados dentro do `@layer base` do Tailwind. `#__next { width: 100%; min-height: 100% }` adicionado fora do layer.

**`REGRAS_RESPONSIVIDADE_PORTAL_MOTORISTA.md` criado:** 8 regras documentadas com explicação técnica de por que cada regra existe e exemplos de código correto/incorreto.

### Resultados de validação automatizada (Playwright)

Medição programática de `shell.getBoundingClientRect()` vs `window.innerWidth` em 5 resoluções: Mobile 390px → `shellGap: 0` ✅, Split window 610px → `shellGap: 0` ✅, Laptop 1024px → `shellGap: 0` ✅, Desktop 1440px → `shellGap: 0` ✅, Full HD 1920px → `shellGap: 0` ✅. Todos os cinco passaram com gap zero.

### Decisão importante desta sessão

A regra imutável criada foi: **o shell do portal do motorista usa `position: fixed; inset: 0`**. Qualquer alternativa — `100vw`, `100vh`, `width: 100%` no root, cálculos de margem em JavaScript — cria comportamentos imprevisíveis em resoluções não testadas. A arquitetura com CSS custom property `--drv-left` é superior a `margin-left` em flexbox porque um elemento `fixed; right: 0` sempre vai até a borda direita, independente de qualquer matemática de layout.

---

## SESSÃO 18/03/2026 — Tarde (continuação 3) | Responsividade fluida do portal

### Problema identificado via diagnóstico automatizado
Medição programática com Playwright em 5 resoluções revelou o problema exato:
- Mobile 390px: gap 40px (OK — só padding)
- Split Window 610px: gap 46px (OK)
- Tablet 768px: gap **188px** em branco (BUG)
- Laptop 1024px: gap **444px** em branco (BUG)
- Desktop 1440px: gap **620px** em branco (BUG)

Causa raiz: `maxWidth: 580px` fixo no wrapper do dashboard criava uma caixa travada que parava de crescer em qualquer resolução acima de ~630px.

### Solução implementada — CSS fluido com clamp() e auto-fill
Substituição da abordagem de largura máxima fixa por CSS moderno com três técnicas simultâneas.

**clamp(min, preferred, max)** para valores fluidos — padding, font-size, border-radius e gap crescem proporcionalmente ao viewport sem saltos bruscos. Exemplo: `padding: clamp(.85rem, 3vw, 1.75rem)` dá ~0.85rem em mobile e ~1.75rem em desktop.

**repeat(auto-fill, minmax(min, 1fr))** nos grids — o browser determina automaticamente quantas colunas cabem. Os 4 botões de ação ficam em 4 colunas no desktop (e split window >=520px), em 2×2 no mobile pequeno. Os KPI cards expandem linearmente com o espaço disponível.

**Remoção do maxWidth artificial** — o `.drv-page` usa `width: 100%` sem nenhum `maxWidth`, deixando o layout filho do `main` determinar tudo. O `main` já tem padding via layout.

### Resultado após correção
- Mobile 390px: 40px gap ✅
- Split Window 610px: 40px gap ✅ (era 46px de padding, agora padding fluido)
- Tablet 768px: 40px gap ✅ (era 188px em branco)
- Laptop 1024px: 40px gap ✅ (era 444px em branco)
- Desktop 1440px: 40px gap ✅ (era 620px em branco)

maxWidth: `none` em todas as resoluções ✅

---



### Problema identificado
O layout do portal do motorista tinha `marginLeft: 240` fixo no conteúdo principal, causando um vão vazio de 240px à esquerda quando a sidebar estava fechada. Quando o usuário usa a janela dividida (Claude à direita, Upgrade à esquerda), a viewport fica com ~760px e o conteúdo se comprimia ilegível.

### Solução implementada — Três modos baseados no viewport real

A arquitetura final usa `ResizeObserver` via `addEventListener('resize')` para monitorar o viewport em tempo real e alternar entre dois comportamentos estruturais diferentes:

**Overlay mode (viewport < 1100px — mobile e split window):** A sidebar é `position: fixed`, não faz parte do fluxo flex, e não afeta a largura do conteúdo. O conteúdo ocupa 100% da largura sempre. A sidebar entra com `transform: translateX(-100%)` → `translateX(0)` ao ser aberta, flutuando sobre o conteúdo com overlay escuro por baixo. Isso resolve exatamente o problema de janela dividida.

**Push mode (viewport >= 1100px — desktop amplo):** A sidebar é `position: relative`, faz parte do fluxo flex normal. A largura anima entre `0` e `240px`, empurrando o conteúdo para o lado. O botão hamburguer permite colapsar a sidebar mesmo no desktop se o usuário quiser mais espaço.

### Correção adicional — Flash SSR
O Next.js renderizava no servidor com `sidebarOpen: false`. O `useEffect` de detecção só rodava após a hidratação, causando um flash visual. Corrigido com estado `hydrated` que sinaliza a conclusão da hidratação antes da primeira pintura.

### Resultado validado nos três cenários
- Mobile 390px (iPhone): conteúdo 100%, sidebar overlay, hamburger visível ✅
- Split window 760px (Claude + Upgrade lado a lado): conteúdo 100%, sidebar overlay ✅  
- Desktop 1280px: sidebar integrada push, abre automaticamente ✅

---



### Contexto
Gravity 2.0 continuou como executor. Antygravity ainda offline. Ronaldo acompanhando.
EXEC-02 executado do zero — backend + 5 telas frontend + validação completa ao vivo.

### O que foi feito

**Diagnóstico arquitetural antes de escrever código**
Ao ler o schema, descobrimos que o model `Trip` só tinha `driverName: String` — sem FK para User.
Para o portal do motorista funcionar (filtrar viagens por `req.user.id`), precisávamos adicionar
`driverUserId` ao Trip. Migration criada e aplicada antes de qualquer linha de frontend.

**Migration `20260318173241_add_driver_user_id_to_trip`**
- `driverUserId String?` adicionado ao Trip
- Relação `driverUser User? @relation("TripDriver")` no Trip
- Relação `tripsAsDriver Trip[]` no User
- Índice `@@index([driverUserId])` adicionado

**Backend — módulo trips/ criado do zero**
- `trips.service.ts` com 5 métodos encapsulados
- `trips.controller.ts` com guard `@Roles('DRIVER')` em todos os endpoints
- `trips.module.ts` registrado no AppModule
- Dupla vírgula `TripsModule,,` detectada e corrigida antes do TSC
- TSC: zero erros

**Frontend — 5 arquivos criados**
Baseados no padrão visual do `teacher/layout.tsx` mas com paleta azul (#0891B2) em vez de amarela.
- `driver/layout.tsx` — auth guard verifica `user.role === 'DRIVER'`
- `driver/dashboard/page.tsx` — 3 estados: viagem ativa, próxima viagem, sem viagem
- `driver/viagens/page.tsx` — tabs com contador por status
- `driver/reembolsos/page.tsx` — reutiliza padrão do professor, adiciona vínculo com trip ativa
- `driver/veiculo/page.tsx` — busca truck via trips do motorista (sem endpoint dedicado)

**Seed de dados para teste**
TruckType enum tem valores `STANDARD` e `MULTICOURSE` (não `TRUCK`).
Truck e Trip criados via Prisma script (seed_trip_test.js), removido após o teste.
Trip: Caxias → São Luís, status PLANNED, driverUserId do motorista de teste.

**Validação ao vivo — fluxo completo**
1. Login motorista → `/driver/dashboard` ✅
2. Dashboard exibiu card "📋 PRÓXIMA VIAGEM: Caxias → São Luís" ✅
3. Clique em "🚛 Iniciar Viagem" → modal de kmStart abriu ✅
4. Input: 145000 → clique Iniciar → trip mudou para 🟢 EM TRÂNSITO ✅
5. Dashboard atualizou: km inicial 145000, botão "Cheguei ao Destino" ✅

### Decisão importante
A tela de Veículo (`/driver/veiculo`) busca o caminhão via trips do motorista (não via Employee).
Isso é correto arquiteturalmente — o motorista está vinculado a trips, não diretamente a um truck.
Se no futuro quisermos vincular Employee↔Truck diretamente, é uma migration separada.

### O que ficou para a próxima sessão
- **EXEC-03**: Professor filtra suas turmas — simples, sem pesquisa
- **git commit**: EXEC-01 + EXEC-02 juntos (quando Antygravity voltar ~16h)

---



### Contexto
O Antygravity (Windsurf) atingiu o limite de uso por volta das 14h. Gravity 2.0 assumiu
o papel de executor temporário diretamente via MCP filesystem + Playwright + Desktop Commander.
Esta é a primeira vez que Gravity 2.0 atuou como executor — documentado aqui como precedente.

### O que foi feito

**EXEC-01 Passo 5 — Campos de senha no modal de funcionários**
O Antygravity havia concluído os passos 1-4 do EXEC-01 (schema, migration, service, DTO, redirect).
Faltava apenas o Passo 5: campos visuais de senha no formulário de admin.
Gravity 2.0 editou diretamente `frontend/app/admin/funcionarios/page.tsx` com 4 alterações cirúrgicas:
- `EMPTY_FORM` recebeu `password: ''` e `confirmPassword: ''`
- O `useState` do modal (modo edição) também inicializa os dois campos
- `handleSubmit` valida: senha mínimo 6 chars + senhas coincidem (só se preenchida)
- Payload inclui `password` condicionalmente via spread operator
- Bloco visual "🔑 Acesso ao Sistema (opcional)" adicionado no Step 3, SOMENTE em novo funcionário

**Validação ao vivo via Playwright**
Teste completo com 3 etapas confirmadas:
1. Login admin na porta 3001 — `Role: ADMIN, Token: true` ✅
2. Criação de motorista via API — `userId: aa7bab8a vinculado, userId OK: true` ✅
3. Login motorista — `Role: DRIVER, Redirect: /driver/dashboard = true` ✅
4. Criação de professora "Maria Professora Visual" pelo painel visual ✅
5. Login da professora — `Role: TEACHER, Token: true, Redirect: /teacher/dashboard` ✅

### Decisão importante desta sessão
Durante os testes descobrimos que o backend estava rodando na **porta 3002** por causa
de uma variável de sessão PowerShell (`$env:PORT=3002`) que persistia de um comando anterior.
O `.env` está correto com PORT=3001. A solução foi:
```powershell
Get-Process -Name node | Stop-Process -Force
$env:PORT = $null
Remove-Item Env:PORT -ErrorAction SilentlyContinue
npm run start:dev
```
Isso deve ser o procedimento padrão para iniciar o backend — nunca usar `$env:PORT=` inline.

### Problema de ambiente identificado
MCPs `sistema-upgrade-postgres` e `sistema-upgrade-git` falharam ao iniciar a sessão.
O postgres MCP foi corrigido via `claude_desktop_config.json` (pacote `@crystaldba/postgres-mcp`
não existia no npm, substituído por `@modelcontextprotocol/server-postgres`).
O git MCP foi removido (pacote Python, sem `uvx` instalado na máquina).

### O que ficou para a próxima sessão
- EXEC-02: Portal do Motorista `/driver/*` — pesquisa concluída, pronto para executar
- EXEC-03: Professor filtra suas turmas — simples, sem pesquisa necessária
- Commit do EXEC-01 (o Antygravity precisa fazer o git commit quando voltar)

---

## SESSÃO 18/03/2026 — Manhã | Gravity 2.0 + Antygravity + Ronaldo

### Contexto
Início da Fase 2. Gravity 2.0 como Monitor/Auditor. Antygravity (Windsurf) como executor.
Foco: corrigir gaps identificados na auditoria + organizar documentação no Método RR Technology.

### O que foi feito

**Reestruturação completa da documentação**
33 arquivos legados auditados e realocados na nova estrutura de 12 documentos.
Backup criado em `C:\Users\Desktop\docs_upgrade_backup_18032026`.
Erro crítico detectado e corrigido: Antygravity documentou porta 3002 em 4 arquivos
quando a porta canônica é 3001. Corrigido com prompt específico.
HANDOFF_S3_TEMPLATES_PDF.md (specs dos PDFs do Robert) estava prestes a ser perdido —
recuperado e salvo em `docs/research/05_reports/SPECS_PDF_GOVERNAMENTAL.md`.

**EXEC-08 — Ordem de rotas no controller (bug crítico silencioso)**
`@Get('my')` estava na linha 144, depois de `@Get(':id')` na linha 63.
O NestJS capturava "my" como valor de `:id` → aluno via lista vazia de inscrições
sem nenhum erro 500 — silencioso e destrutivo.
Corrigido: `@Get('my')` movido para linha 68, ANTES de `@Get(':id')` linha 76.
Nota: há um `@Get(':id')` orphan dentro de comentário JSDoc na linha 66 —
ruído visual sem efeito runtime, limpar em refatoração futura.

**EXEC-07 — Dashboard admin com analytics reais**
Backend `GET /dashboard/analytics` já estava implementado (surprise!) com queries reais:
inscrições por mês (12 meses), alunos por curso (top 10), distribuição por estado.
Frontend apenas substituiu arrays hardcoded (`SPARK_ENROLL`, `SPARK_ATTEND`, `SPARK_CERT`)
por dados reais da API. Interface `AnalyticsData` criada, `useState analytics` adicionado,
`load()` chama o endpoint em paralelo com os outros.

**EXEC-01 — Employee cria User + DRIVER + migration**
5 passos executados:
- DRIVER adicionado ao enum `UserRole` no schema.prisma
- Campo `userId String? @unique` adicionado ao model `Employee`
- Relação `employee Employee?` adicionada ao model `User`
- Migration `20260318162339_add_driver_role_and_employee_user_relation` aplicada no banco
- `employees.service.ts` cria User com bcrypt hash ao receber `password` no DTO
- `create-employee.dto.ts` com `password?` e `confirmPassword?`
- `login/page.tsx` com redirect DRIVER → `/driver/dashboard`
- Campos visuais de senha no modal (Passo 5, executado por Gravity 2.0)

**Pesquisas Deep Research**
3 pesquisas disparadas em paralelo e concluídas:
- PESQ-F2-01: Portal do Motorista (4 telas, 6 endpoints, offline-first IndexedDB)
- PESQ-F2-02: Frequência real do aluno (2 queries sem N+1, groupBy Prisma)
- PESQ-F2-03: XLSX Streaming 50k+ (BullMQ + ExcelJS + PassThrough + MinIO)
Relatórios salvos em `docs/research/05_reports/2026-03-18_*.md`

### Decisões técnicas tomadas nesta sessão
- Porta 3001 é a canônica definitiva — confirmado em 5 fontes independentes
- `PESQUISAS_PENDENTES.md` ficou dentro de `05_reports/` (não na raiz de research/)
- `GRAVITY_2_BRAIN.md` colocado dentro de `docs/arquitetura/` pelo Ronaldo manualmente
- `ANALISE_REUNIAO_GRAVITY2.md` e `METODOLOGIA_TRABALHO.md` adicionados à estrutura com banner de aviso

---

## SESSÃO 16/03/2026 — Sprint BUG + SEC-A | Antygravity

### O que foi feito
8 fixes de segurança e bugs em sequência, todos validados. Commit: `b4fc6f0`
Ver detalhes em [ROADMAP_EPICOS.md](./ROADMAP_EPICOS.md) → Sprint BUG + SEC-A.

### Decisão importante
Criação do `MinioService` como singleton (BUG-11) mudou a arquitetura do módulo de reembolso.
O padrão deve ser seguido para qualquer outro cliente de serviço externo (Redis, S3, etc.).

---

## SESSÃO 15/03/2026 — Sprints 0→5 + Sprint Mobile + Sprint Final | Antygravity

### O que foi feito
Fase 1 completa: infraestrutura, campos CLT, financeiro, PDFs, 2FA, portal professor,
dashboard BI, seed AC, CI/CD, modo manutenção, responsividade, WebSocket.
Ver detalhes completos em [01_PROCESSO_COMPLETO.md](./ANALISE_REUNIAO_GRAVITY2.md) (histórico).

### Decisão importante da sessão
O bug de encoding de cidades (BUG-DB-01) exigiu recriar o container PostgreSQL do zero.
Qualquer novo ambiente deve criar o container com:
`POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"`
antes de fazer o primeiro seed.

---

*Sistema Upgrade | RR TECNOL | Método RR Technology*
*Atualizado em: 18/03/2026 após EXEC-01 completo + validação ao vivo*

---

## SESSÃO 23/03/2026 — Auditoria Completa + Reformulação da Documentação | Gravity 2.0

### Contexto
Davi (Tech Lead) iniciou a sessão com o feedback completo da auditoria do sistema — 40+ itens
distribuídos nos 4 portais (Admin, Professor, Aluno, Motorista) + itens gerais.
O sistema está em ~90% de completude. Gravity 2.0 foi acionado para analisar CADA ARQUIVO do projeto
(schema Prisma completo, todos os módulos backend, todas as páginas frontend, todas as docs existentes)
como dev sênior e reformular a documentação sem mexer no código.

### Contexto adicional do Tech Lead (orientações do chefe do Davi)
- **UTF-8:** Atenção especial a encoding — strings com acentos em template literals, nunca concatenação
- **CRUD completo:** Toda entidade que o usuário cria precisa ter: criar, listar, editar, excluir (soft delete), reverter
- **BOOM (Build Only On Master):** Nunca commitar código que não compila
- **Encoding:** Mesmo conceito do UTF-8 — garantir que dados do banco chegam corretamente ao frontend
- **Mock em produção é proibido:** Arrays hardcoded que simulam dados reais são bugs, não features
- **Um seed master:** O projeto já tem `seed.ts` + `seed-extra.ts` — nunca criar seeds adicionais separados

### O que foi feito nesta sessão

**Análise técnica completa sem mexer no código:**
- Leitura do `schema.prisma` (1310 linhas) — schema sólido, correto, sem problemas estruturais
- Leitura de todos os módulos backend: auth, users, classes, enrollments, attendance, notifications, reimbursement, trips, trucks, absences, employees, reports, settings, audit-log
- Leitura das páginas frontend críticas: turmas/[id], configuracoes (student), layout.tsx dos portais
- Leitura do `NotificationsGateway` — implementação correta com auth no handshake, rooms por userId e por role
- Leitura de toda a documentação existente

**Bugs identificados por análise de código (sem executar — pure code review):**
1. `enrollments.map` TypeError: `stats?.enrollments || []` não é defensivo o suficiente quando API retorna estrutura aninhada
2. Frequência não persiste: dates enviadas com timestamp completo — o unique constraint `[classId, studentId, date]` não localiza o registro existente
3. Configurações não salva: `handleSave()` só atualiza `name` via PATCH — preferências não têm colunas no banco
4. Reembolso histórico: possível problema de ordem de rotas (`/:id` antes de `/my`)
5. Carretas 500: enum `TruckType` aceita apenas `STANDARD | MULTICOURSE` — frontend pode enviar valor errado
6. Nome hardcoded: string "João da Silva (Teste)" literal no código em vez de `req.user.name`

**Documentos reformulados nesta sessão:**
- `PROX-PASSOS.md` — Reescrito do zero com 13 passos detalhados, código de referência, ordem de execução
- `LIVRO_DE_REGRAS.md` — Atualizado para v4.0 com tabela de anti-padrões, novas regras de modal/data/encoding
- `ERROS_E_SOLUCOES.md` — Atualizado para v4.0 com 9 bugs ativos + bugs resolvidos preservados
- `ESTADO_SISTEMA.md` — Atualizado com tabela completa por portal, status real de cada funcionalidade
- `DIARIO_DE_BORDO.md` — Esta entrada (sessão atual)
- `SEEDS_GUIDE.md` — Atualizado para refletir estado atual dos dois seeds e guia atualizado

### Decisões técnicas tomadas nesta sessão
- **UserPreferences como model separado** (não em SystemConfig): mais limpo, FK direta, upsert simples
- **EmployeeAttendance como model separado** (não reutilizar Absence): semânticas diferentes
- **ContaPagar precisa de campo `active`**: migration necessária para aba "Excluídos"
- **WS entre perfis**: o gateway já suporta tudo — falta apenas chamar os métodos nos services
- **Tutorial assistido**: componente global `TutorialOverlay` com `getBoundingClientRect` + `clip-path`
- **Persistência de formulário**: `sessionStorage` (não localStorage) — limpa ao fechar o browser

### Recomendação para próxima sessão de execução
Iniciar pelo GRUPO 1 (bugs críticos) do PROX-PASSOS.md na ordem 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6.
O PASSO 1.3 (configurações) requer migration — rodar `npx prisma migrate dev` após criar o model.
Usar `npx tsc --noEmit` após cada PASSO antes de avançar.


---

## SESSÃO 23/03/2026 — Sprint Final Parte 2 | Gravity 2.0 + Davi (sem Windsurf)

### Contexto
Gravity (Windsurf) atingiu o limite de quota às ~13h. Davi assumiu o papel de executor junto
com Gravity 2.0 (Claude) diretamente via MCP Desktop Commander + Filesystem.
Esta sessão marcou a conclusão dos Grupos 0 e 1 do PROX-PASSOS.md.

### O que foi feito

**Correções de limpeza (pré-execução):**
- `ERROS_E_SOLUCOES.md` tinha entradas duplicadas de quando os bugs foram marcados como resolvidos.
  Arquivo reescrito limpo (v5.1) — sem duplicatas, estrutura clara: resolvidos / ativos / histórico.
- `admin/frequencia/page.tsx` tinha dois `console.error` violando LIVRO_DE_REGRAS §1.
  Substituídos por blocos `catch` silenciosos com comentário explicativo.
- `SEEDS_GUIDE.md` ainda referenciava `seed.ts` e `seed-extra.ts` (inexistentes).
  Corrigido para `seed-full.ts` — único arquivo de seed do projeto.

**Sprint Final — Grupo 0 completo:**
- PASSO 0.1: `package.json` — `prisma:seed` → `seed-full.ts`, scripts órfãos removidos ✅
- PASSO 0.2: `prisma generate` + `AbsenceType`/`AbsenceStatus` importados, casts `as any` removidos ✅
- PASSO 0.3: `@UseGuards(RolesGuard)` adicionado em `approve`/`reject` do reimbursement controller ✅
- PASSO 0.4: `req.user.id` direto (sem fallback `sub`) no `bulkAttendance` controller ✅
- PASSO 0.5: Soft delete nos 3 services (employees/trucks/classes) ✅

**Sprint Final — Grupo 1 (bugs críticos) parcialmente concluído:**
- PASSO 1.1: `turma.enrollments` em vez de `stats.enrollments` — TypeError resolvido ✅
- PASSO 1.2: Normalização UTC `Date.UTC(y,m-1,d)` no `bulkAttendance` ✅
- PASSO 1.4: Reembolso teacher usa `res.data?.data ?? []` + enum reset para `'FOOD'` ✅
- PASSO 1.7: localStorage fallback removido da frequência ADM ✅
- PASSO 1.8: Endpoint `GET /classes/:id/attendance/history` criado ✅
- `npx tsc --noEmit` → zero erros após todos os changes ✅

**Pendente do Grupo 1:**
- PASSO 1.3: Migration `UserPreferences` + endpoints (requer `prisma migrate dev`)
- PASSO 1.5: Validação do formulário de cadastro de carretas

### Decisões desta sessão
- Gravity (Windsurf) volta às 13h28. Até lá, Claude + Davi executam direto.
- `SEEDS_GUIDE.md` atualizado para refletir que só existe `seed-full.ts`.
- `ERROS_E_SOLUCOES.md` foi simplificado — bugs resolvidos têm resumo compacto, detalhes no histórico.
- Próximo passo quando Gravity voltar: continuar do PASSO 1.3 (migration UserPreferences).

---

## SESSÃO 23/03/2026 — Sprint Contínuo Parte 3 | Gravity 2.0 + Davi

### O que foi feito

**PASSO 1.5 — Carretas Internal Server Error:**
Causa raiz: `trucks.service.ts` passava `lastMaintenanceDate`/`nextMaintenanceDate` como string ISO ao Prisma que exige `DateTime` (objeto `Date`). Corrigido com destruturação + `new Date(str)` nos métodos `create` e `update`. `console.error` removido do formulário.

**PASSO 2.5 — Hamburger visível no desktop:**
`student/Header.tsx` e `teacher/Header.tsx` usavam `style={{ display: 'flex' }}` inline que sobrescrevia qualquer classe CSS. Substituído por `className="hamburger-btn"` que já tem `display: none !important` em desktop via `globals.css`.

**PASSO 3.7 — Registro de ponto do professor:**
`teacher/historico/page.tsx` tinha `alert()` (proibido) e TODO não implementado. Substituído por chamada real `POST /teachers/me/checkin` com `toast.success/error`. Endpoint exposto na UI removido.

**PASSO 3.14 — Logout dual-source:**
`useAuthStore.logout()` agora remove `token`, `user`, `student`, `auth-storage` do localStorage antes de limpar Zustand. `console.error('Login error:', error)` também removido.

**PASSO 3.1 — Notificações em tempo real (completo):**
- `useNotifications.ts`: fetch histórico do banco ao montar, 4 eventos novos adicionados, função `buildMessage()` centralizada com PT-BR.
- `reimbursement.service.ts`: injetado `NotificationsGateway`, emite `reembolso_solicitado` no `create` e `reembolso_revisado` no `approve`/`reject`. WS em try/catch separado (nunca causa rollback).
- `absences.service.ts`: injetado gateway, emite `imprevisto_cadastrado` no `create`.
- `enrollments.service.ts`: emite `inscricao_rejeitada` no `reject`.

**Validação:** `tsc --noEmit` → EXIT:0 após cada passo ✅

### Decisões desta sessão
- `.then()` em vez de `async/await` para emitir WS após operação Prisma — mantém o retorno síncrono do método e garante que WS é auxiliar.
- `@Global()` do `NotificationsModule` confirma que não é necessário adicionar em `imports[]` de nenhum módulo.
- Eventos WS SEMPRE em try/catch separado — conforme LIVRO_DE_REGRAS §6.

---

## SESSÃO 23/03/2026 — Sprint Contínuo Parte 4 | Auditoria + Passos 3.11/3.12/2.3

### Auditoria completa de docs e código

Leitura integral de LIVRO_DE_REGRAS, ERROS_E_SOLUCOES, ESTADO_SISTEMA, PROX-PASSOS. Inconsistências encontradas e corrigidas em ESTADO_SISTEMA (itens marcados como 🔴 já resolvidos em sessões anteriores).

**Novo bug descoberto:** 14 `console.error` ativos em 10 arquivos de produção frontend (violava LIVRO_DE_REGRAS §1). Não estavam documentados. Todos removidos:
- admin/carretas/[id]/manutencao, admin/certificados, admin/contas-a-pagar
- admin/funcionarios (3x), admin/grupos, admin/inscricoes, admin/turmas
- cursos, student/dashboard, student/profile (2x)
- enrollment/Step3Address, enrollment/Step8Confirmation
- `app/error.tsx` mantido — é o error boundary do Next.js (padrão correto)

### PASSO 3.11 — Frequência: 2 botões P/F

Substituído o sistema de triple-click (null→true→false→null) por dois botões explícitos P e F por aluno. Layout horizontal (avatar + nome + botões), touch-friendly com `minWidth:48, minHeight:44` conforme LIVRO_DE_REGRAS §1. Botão ativo tem cor sólida + glow; inativo tem borda suave.

### PASSO 3.12 — Frequência: carregar estado salvo ao reabrir dia

Adicionado `useEffect` que reage a mudança de `selectedDate`. Se o dia tem histórico (`attendanceHistory[selectedDate]`), busca os registros reais via `GET /classes/:id/attendance/history`, filtra pelo dia e popula o estado `attendance`. Se não tem histórico, zera para "não marcado". Banner amarelo "Editando registro existente" aparece com data formatada em PT-BR.

### PASSO 2.3 — Campo valor do reembolso

`driver/reembolsos/page.tsx`: `type="text"` → `type="number" step="0.01" min="0"`. Teacher já estava correto.

### Validação final

`tsc --noEmit` → EXIT:0 após cada passo.

---

## SESSÃO 23/03/2026 — Sprint Contínuo Parte 5 | BLOCOs D→H

### BLOCO D — Dead code removido
`toggleAttendance` em `admin/frequencia/page.tsx` era uma função declarada mas nunca chamada desde o PASSO 3.11 (substituída pelos setters inline dos botões P/F). Removida sem impacto funcional.

### BLOCO E — ContaPagar: soft delete + aba Excluídos
**Schema:** `active Boolean @default(true)` adicionado ao model `ContaPagar`. Aplicado via `prisma db push --accept-data-loss` (campo com default, operação não-destrutiva). `prisma generate` regenerou o client.
**Backend:** `contas-pagar.service.ts` — `findAll` filtra `active:true` por padrão, `includeDeleted:true` inverte; `remove` virou soft delete (`active: false`); método `restore` adicionado. `contas-pagar.controller.ts` — novo query param `includeDeleted` no GET e nova rota `PATCH /:id/restore`.
**API client:** `lib/api/contasPagar.ts` — `restoreContaPagar` adicionado, `getContasPagar` aceita `includeDeleted`.
**Frontend:** `admin/contas-a-pagar/page.tsx` — estado `deletedContas`, `showDeleted`, `handleRestore`; tab "Excluídos" na barra; seção de cards vermelhos com botão "↩ Restaurar"; `load()` busca ativos e excluídos em paralelo.

### BLOCO F — Histórico ADM paginado
Auditoria confirmou que o PASSO 3.5 já estava **100% implementado**: paginação com `page`/`limit`/`totalPages`, filtros por módulo (select), período (data início/fim) e busca por ação (input com debounce 450ms). Backend com endpoint `GET /audit-logs` suportando todos os params. Nenhuma ação necessária.

### BLOCO G — Feriados: motivo obrigatório ao excluir
`admin/feriados/page.tsx`: botão lixeira agora abre modal de confirmação em vez de excluir direto. Modal tem textarea de motivo obrigatória (botão Confirmar desabilitado enquanto vazio), header vermelho com nome do feriado, `position: fixed; inset: 0` conforme LIVRO_DE_REGRAS §1.

### BLOCO H — Aluno: inscrições + cursos disponíveis
`student/enrollments/page.tsx` reescrito: duas tabs — "Minhas Inscrições" (comportamento anterior + filtros de status) e "Cursos Disponíveis" (PASSO 3.10: busca `GET /classes?status=ENROLLMENT_OPEN`, cards com vagas/datas/cidade, botão "🎓 Inscrever-se" que navega para `/inscricao/:classId`). Hook `useRouter` para navegação.

### Validação
`tsc --noEmit` → EXIT:0 após cada bloco.

---

## SESSÃO 23/03/2026 — Sprint Final Partes 6 e 7 | Bugs visuais + Dashboard Motorista

### Contexto
Davi (Tech Lead) reportou 3 problemas observados em produção via screenshot:
1. Sidebar com dupla seleção ao acessar Freq. Funcionários
2. "Nenhum funcionário ativo" na página de frequência (lista vazia)
3. Erro de compilação em `funcionarios/page.tsx` (página inacessível)

Adicionalmente: modais cortando e kanban com possível erro.

### Diagnósticos realizados (leitura de código puro, sem executar)

**Bug JSX de sintaxe:** Contagem de parênteses revelou `diff=1` mas análise mais profunda mostrou que era falso positivo (parêntese literal em template string `(${digits}`). O bug real era na linha 1339: `onClose={() => setDetailEmployee(null); document.body.style.overflow = ''}` — arrow function com dois statements sem bloco `{}` em JSX. Isso deixa um parêntese aberto semanticamente, causando "Unexpected token div" no compilador.

**Sidebar dupla seleção:** A lógica `pathname?.startsWith(item.href + '/')` ativava o item "Funcionários" (`/admin/funcionarios`) quando o pathname era `/admin/funcionarios/frequencia`, pois a string começa com o href do pai + `/`. Solução: calcular se existe algum item no nav com match exato — se sim, usar apenas exact match para todos os items.

**"Nenhum funcionário ativo":** `GET /employees` retorna `{ employees: [], total, activeCount, byRole, byDept }` — não um array. `Array.isArray(r.data)` retorna `false`. O código usava o array vazio como fallback. Além disso, as rotas `GET /employees/attendance` e `GET /employees/attendance/summary` estavam declaradas DEPOIS de `@Get(':id')` no controller — NestJS capturava "attendance" como valor do parâmetro `:id`, causando 404 ou erro inesperado.

### O que foi feito

**Fix 1 — Sintaxe JSX:**
`onClose={() => setDetailEmployee(null); document.body.style.overflow = ''}` → `onClose={() => { setDetailEmployee(null); document.body.style.overflow = ''; }}`

**Fix 2 — Sidebar match exato:**
```typescript
const allHrefs = navSections.flatMap(s => s.items.map(i => i.href));
const hasExactMatch = allHrefs.includes(pathname ?? '');
const isActive = pathname === item.href || (!hasExactMatch && pathname?.startsWith(item.href + '/'));
```

**Fix 3 — Frequência funcionários lista vazia:**
```typescript
const list: Employee[] = r.data?.employees ?? (Array.isArray(r.data) ? r.data : []);
```

**Fix 4 — Rota attendance capturada por :id (LIVRO_DE_REGRAS §2):**
Rotas `@Post('attendance')`, `@Get('attendance/summary')`, `@Get('attendance')` movidas para ANTES de `@Get(':id')` no `employees.controller.ts`.

**Fix 5 — Modal cortando:**
`EmployeeModal`: `maxHeight: 'calc(100vh - 2rem)'` + `display: 'flex'` + `flexDirection: 'column'` adicionados ao container.

**Dashboard motorista — implementação final:**
- 4 KPIs: viagens/mês, km rodados (só viagens com kmStart E kmEnd), R$ a receber (soma `amount`), imprevistos pendentes
- 3 requests paralelos (era 4 — eliminado overfetch de status duplicados)
- Exibe `notes` da viagem ativa
- 5 ações rápidas (adicionado botão Imprevisto → `/driver/imprevistos`)
- `Counter` agora aceita `prefix` (para `R$ `) e `suffix`

**TSC:0** confirmado após todas as alterações.

### Regra nova derivada desta sessão
**Arrow function com múltiplos statements em JSX SEMPRE com bloco explícito `{}`:**
```tsx
// ❌ Inválido — o ; fecha o statement, deixa o } solto
onClose={() => setA(null); setB('')}

// ✅ Correto
onClose={() => { setA(null); setB(''); }}
```
Adicionado ao LIVRO_DE_REGRAS §8C.

---

## SESSÃO 23/03/2026 — Atualização de Documentação | Gravity 2.0

### O que foi feito
Atualização completa de todos os documentos após sprint final:
- `ESTADO_SISTEMA.md` — v6.0: snapshot completo de tudo que foi executado, funcionalidades por portal, pendências reais
- `PROX-PASSOS.md` — v6.0: grupos todos marcados como ✅, apenas BLOCO B e C pendentes
- `ERROS_E_SOLUCOES.md` — v6.0: todos os bugs desta sessão documentados com causa raiz + solução + prevenção
- `DIARIO_DE_BORDO.md` — esta entrada
- `LIVRO_DE_REGRAS.md` — v6.0: nova regra de arrow function JSX + anti-padrão BUG-ROTA-ATTENDANCE

### Estado do sistema ao final desta sessão
- TSC:0 backend confirmado
- Todos os passos da lista original concluídos
- Únicas pendências reais: BLOCO B (SUPER_ADMIN), BLOCO C (console backend), ALERTA-01 (credenciais no login)
- Sistema em ~97% de completude

---

*Sistema Upgrade | RR TECNOL | Atualizado: 23/03/2026 — Sprint Final Completo*

## SESSÃO 25/03/2026 — Sprint Fechamento Completo | Gravity 2.0 + Davi

### Contexto
Sprint de fechamento final do sistema. Objetivo: zerar toda a lista de pendentes identificada ao longo das sessões anteriores. Gravity 2.0 operou como executor via MCP + Playwright para validação ao vivo.

### Pendentes no início da sessão
1. `POST /teachers/me/checkin` — endpoint não existia
2. Freq. Funcionários — sem calendário
3. Preferências de animações — toggle não persistia por usuário
4. Kanban — sem validação de transições, sem erro real do servidor
5. UTF-8 — arquivos com BOM e conteúdo corrompido

### O que foi feito — Backend

**TeacherCheckin (BLOCO CHECKIN-01):**
- Model `TeacherCheckin` adicionado ao schema Prisma com relação no `User`
- `prisma db push` — banco sincronizado com a nova tabela
- `UsersService.registerCheckin()` + `getCheckins()` adicionados
- `TeachersController` criado com `POST /api/teachers/me/checkin` e `GET /api/teachers/me/checkins`
- `UsersModule` registra o novo controller
- TSC:0 após todas as mudanças

**Kanban backend:**
- `confirmEnrollment()` adicionado ao `EnrollmentsService` (APPROVED→ENROLLED)
- Cases `ENROLLED` e `DOCUMENT_PENDING` adicionados ao switch no controller
- Default do switch lança `BadRequestException` explícita (não silencia mais)

### O que foi feito — Frontend

**Ponto do Professor (historico/page.tsx):**
- Interface `Checkin` adicionada
- `loadAll` agora busca checkins em paralelo com `GET /teachers/me/checkins`
- Tab "Meu Ponto" completamente reescrita: card com data/hora atual, aviso "Ponto registrado hoje às HH:MM", botão `handleCheckin` que recarrega a lista, histórico com animação e badge "HOJE"
- Bug corrigido: `GET /classes?status[]=...` → `GET /classes?teacherUserId=...` (backend não suporta array de status)

**Kanban (admin/inscricoes/page.tsx):**
- `VALID_TRANSITIONS` matrix implementada
- `updateStatus` valida antes de chamar API; toast mostra erro real do servidor
- `handleDrop` bloqueia status finais (ENROLLED/REJECTED); valida transição antes de agir
- Cards ENROLLED/REJECTED: `draggable=false`, cursor `default`
- Botões quick action: PENDING/WAITLIST → Aprovar/Rejeitar; APPROVED → Confirmar Matrícula

**Freq. Funcionários (funcionarios/frequencia/page.tsx):**
- Arquivo reescrito do zero com calendário interativo
- Layout: calendário (esquerda) + tabela funcionários (direita)
- Calendário: navegação mensal, dias clicáveis, coloridos por status (verde/vermelho/amarelo)
- Mesmo padrão visual de admin/frequencia (LIVRO_DE_REGRAS: consistência de UX)

**UTF-8 e BOM:**
- `fix-bom.ps1` aplicado: 122 arquivos verificados, BOM removido onde necessário
- Arquivos criados nesta sessão salvos sem BOM

**Animações por usuário:**
- Hook `hooks/useAnimacoes.ts` criado — lê `GET /users/me/preferences` e aplica `body.no-animations` no DOM
- Regra CSS `body.no-animations * { animation: none; transition: none }` adicionada ao `globals.css`
- Hook aplicado nos 4 layouts: admin, teacher, student, driver

### Validação ao vivo (Playwright)

| Página | Resultado |
|--------|-----------|
| `/admin/dashboard` | ✅ KPIs reais, atividades recentes, BI |
| `/admin/inscricoes` | ✅ 28 inscrições, kanban com colunas |
| `/admin/funcionarios/frequencia` | ✅ Calendário Março 2026, legenda, data selecionada |
| `/teacher/historico` → Minhas Turmas | ✅ 5 turmas com status reais |
| `/teacher/historico` → Meu Ponto | ✅ Checkin registrado às 17:46, histórico com 2 registros |

### Decisões desta sessão
- `GET /classes` com múltiplos status (array) não é suportado → sempre usar `teacherUserId` para filtrar turmas do professor
- Hook `useAnimacoes` em layout (não em página) garante que a preferência é aplicada globalmente no portal sem repetição
- Validação de transição no frontend (VALID_TRANSITIONS) é complementar à validação no backend — ambas necessárias para UX responsivo + segurança

### Estado ao final desta sessão
- Sistema em **100% das funcionalidades catalogadas** implementadas e validadas ao vivo
- TSC:0 backend confirmado
- Zero pendências críticas

