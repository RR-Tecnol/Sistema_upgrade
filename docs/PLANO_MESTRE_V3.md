# PLANO MESTRE DE IMPLEMENTAÇÃO — SISTEMA UPGRADE v3.0
## Gravity 2.0 + Antygravity · RR TECNOL · 15/03/2026

> Documento definitivo gerado após auditoria completa de:
> - Todo o código-fonte atual (backend + frontend)
> - Transcrição integral da reunião Upgrade × RR Tecnol (42min)
> - Todos os planos anteriores (implementation_plan.md.resolved + PLANO_IMPLEMENTACAO_GRAVITY2.md)
> - 10 pesquisas Deep Research do diretório 05_reports/
> - Modelos reais do Robert (frequência, concludentes, planilha CLT)
>
> NENHUMA LINHA É ESCRITA SEM AUTORIZAÇÃO EXPLÍCITA DO TECH LEAD.
> Este é o plano de análise. A execução começa quando Ronaldo autorizar.

---

## PARTE 1 — AUDITORIA DO ESTADO REAL

### 1.1 O que está 100% implementado e funcionando

| Módulo | Evidência no código |
|--------|-------------------|
| Auth JWT duplo (access + refresh) + RBAC | `auth.service.ts` — login por email ou CPF |
| Cadastro completo de alunos (7 etapas) | `enrollments.service.ts` — cria User + Student + Address + Socio + Professional |
| Portal do aluno (5 telas) | `student/dashboard`, `attendance`, `certificates`, `classes`, `enrollments` |
| Dashboard admin com KPIs + gráficos | `dashboard.service.ts` — 5 queries analíticas |
| Gestão de turmas, cursos, grupos, cidades | Módulos independentes completos |
| Gestão de carretas + manutenção | `trucks/`, `truck-maintenance/` |
| Períodos de Cursos (Ações) com financeiro | `acoes.service.ts` — cascata completa AcaoCusto + ContaPagar |
| Contas a Pagar | `contas-pagar.service.ts` — CRUD + KPIs + comprovante |
| Reembolso de campo (mobile) | `reimbursement.service.ts` — Presigned URL MinIO |
| HolidayService + recálculo de datas | `holiday.service.ts` — dias úteis + ClassHoliday |
| Certificados com QR Code verificável | `certificate.service.ts` — código único + verificação pública |
| Configurações de sistema (JSON) | `settings.service.ts` — timeout, 2FA flag, manutenção, backup |
| LGPD (consentimentos, auditoria, exclusão) | Modelos no schema |
| PDFs via Puppeteer (provisórios) | `pdf.service.ts` — lógica correta, template errado |
| Frequência digital por aluno/turma | Módulo `frequencia/` no admin |
| Inscrições online (portal público) | `inscricao/` + `enrollments.service.ts` |

### 1.2 Gaps reais confirmados por código

| Gap | Arquivo afetado | Impacto | Sprint |
|-----|----------------|---------|--------|
| BUG-C1: encoding UTF-8 cidades | `docker-compose.yml` | Acentos corrompidos no frontend | S0 |
| MinIO sem credenciais | `backend/.env` | Upload de reembolso/foto não funciona | S0 |
| `employees.service.ts` não salva campos CLT | `create-employee.dto.ts` + `service.ts` | Salário CLT e contrato não persistem | S1 |
| `calcularResumoFinanceiro()` sem CLT/passagens | `acoes.service.ts` | Custo da rota subestimado | S2 |
| `addFuncionario()` não usa `dailyCost` do cadastro | `acoes.service.ts` | Admin re-digita manualmente | S2 |
| PDF frequência com estrutura errada | `pdf.service.ts` — `buildFrequencyHtml()` | Documento rejeitado pela secretaria | S3 |
| PDF concludentes com % que não existem no modelo | `pdf.service.ts` — `buildConcludentsHtml()` | Documento fora do padrão | S3 |
| `generateFrequencyReport()` com filtro `present:true` | `pdf.service.ts` | Impossível montar tabela P/F por dia | S3 |
| 2FA — flag existe, lógica não | `auth.service.ts` + `settings.service.ts` | Segurança incompleta | S3 |
| Tela do professor não existe | `frontend/app/teacher/` — diretório inexistente | Professor não consegue trabalhar | S4 |
| Dashboard sem BI de rotas por estado/ano | `dashboard.service.ts` | Relatório exigido por Robert | S4 |
| Alerta de custo excessivo não existe | `acoes.service.ts` | Sem controle de orçamento | S4 |
| Acre sem grupo/cidades/grade | `seed.ts` | 3º estado não opera | S5 |
| Logos institucionais não carregados | MinIO + SystemConfig | PDFs sem logos governamentais | S3 |

---

## PARTE 2 — TECNOLOGIAS AVANÇADAS PARA IMPRESSIONAR

> Baseado nas 10 pesquisas Deep Research + análise do que o sistema já tem.
> Cada item foi escolhido por impacto visual/operacional real, não por modismo.

### 2.1 Já implementadas (manter e expandir)

- **Prisma Extensions para Audit Trail** — schema tem `AuditLog`, implementar middleware
- **Puppeteer Singleton** — `pdf.service.ts` já usa, expandir para certificados em batch
- **Animações 3D (tilt cards, particle field)** — já no frontend de funcionários, expandir
- **Sparklines no dashboard** — já implementados, adicionar em mais KPIs
- **CircularProgress para frequência** — já no portal do aluno, expandir
- **Count-up animado** — já no dashboard admin e funcionários

### 2.2 Implementar — Alto impacto, esforço médio

#### TECH-01: Real-time com Socket.io
```
Onde: dashboard admin + portal do aluno
Impacto: KPIs do dashboard atualizam ao vivo quando admin aprova inscrição
         O aluno vê a frequência atualizar em tempo real quando professor registra
Stack: @nestjs/platform-socket.io (já há WebSocket no projeto?)
Esforço: M (3 dias)
```

#### TECH-02: Mapa interativo MA/PI/AC com municípios
```
Onde: dashboard admin — widget de "Rotas Ativas"
Impacto: admin vê no mapa onde cada carreta está operando
Stack: react-simple-maps + dados GeoJSON dos municípios brasileiros
Esforço: M (2 dias)
```

#### TECH-03: PDF com logos e template real do Robert
```
Onde: pdf.service.ts — buildFrequencyHtml() e buildConcludentsHtml()
Impacto: documento aceito pela secretaria = empresa recebe pagamento
Stack: Puppeteer + Handlebars (substituir template string por template engine)
Esforço: M (3 dias) — CRÍTICO DE NEGÓCIO
```

#### TECH-04: QR Code dinâmico no certificado
```
Onde: certificate.service.ts + portal do aluno
Impacto: certificado verificável online — diferencial vs. concorrentes
Stack: 'qrcode' (já deve estar instalado) + MinIO para armazenar PNG
Esforço: S (1 dia)
```

#### TECH-05: Upload com preview e compressão automática
```
Onde: reembolso mobile + foto de perfil do aluno
Impacto: professor tira foto do recibo, sistema comprime antes de enviar (3G)
Stack: browser-image-compression (Web Worker) + URL.createObjectURL() para preview
Esforço: S (1 dia)
```

#### TECH-06: Exportação Excel com formatação rica
```
Onde: relatórios admin
Impacto: Excel com células coloridas, logo da empresa, múltiplas abas
Stack: ExcelJS Streaming (sem OOM para 50k registros) + UTF-8 BOM para Excel BR
Esforço: M (2 dias)
```

#### TECH-07: Notificações in-app com badge em tempo real
```
Onde: sidebar admin + portal do aluno
Impacto: admin vê sino com N novas inscrições pendentes — sem refresh
Stack: Socket.io events + tabela Notification já existe no schema
Esforço: M (3 dias)
```

#### TECH-08: Skeleton loading em todas as telas
```
Onde: todas as páginas com carregamento assíncrono
Impacto: UX profissional — sem telas em branco enquanto carrega
Stack: CSS animations nativas (já há padrão no globals.css)
Esforço: S (1 dia) por tela — incluir no desenvolvimento de cada tela nova
```

### 2.3 Implementar — Alto impacto, esforço maior (Sprint 4+)

#### TECH-09: Dashboard BI com filtros de rota por estado/ano
```
Onde: nova aba no dashboard admin
Impacto: Robert quer: "PI 2025 → 11 rotas → quais cidades → quantos certificados"
Stack: recharts (já instalado) + endpoint novo no DashboardService
Esforço: L (4 dias)
```

#### TECH-10: 2FA com Google Authenticator (TOTP)
```
Onde: login admin + configurações de segurança
Impacto: conformidade B2G — sistema governamental precisa de 2FA
Stack: speakeasy + qrcode — instalar no backend
Esforço: L (3 dias)
```

#### TECH-11: Tela do professor (acesso TEACHER)
```
Onde: frontend/app/teacher/ — novo diretório
Impacto: professor registra frequência, solicita reembolso, emite concludentes
Stack: reutiliza componentes existentes do admin
Esforço: L (5 dias)
```

#### TECH-12: Alerta de custo excessivo com lógica de IA
```
Onde: AcoesService.addCusto() — uma linha de verificação
Impacto: admin recebe alerta quando custo real > estimado × 1.1
Stack: NotificationsService (criar) + Socket.io event
Esforço: S (1 dia) após TECH-07
```

#### TECH-13: Auto-save de formulários com indicador visual
```
Onde: formulários longos (cadastro de aluno, novo período de curso)
Impacto: aluno do interior não perde dados se 3G cair
Stack: useEffect + debounce 30s + localStorage draft + indicador "Salvo"
Esforço: M (2 dias)
```

#### TECH-14: Modo manutenção com middleware NestJS
```
Onde: settings.service.ts já tem flag `manutencao`
Impacto: admin ativa manutenção → portal aluno mostra página customizada
Stack: NestJS middleware lendo Redis flag + Next.js middleware.ts
Esforço: S (1 dia)
```

---

## PARTE 3 — PLANO DE IMPLEMENTAÇÃO POR SPRINT

### SPRINT 0 — DESBLOQUEADOR DE INFRA
**Duração:** 1-2 dias | **Executor:** Antygravity
**Objetivo:** Sistema funcionando sem bugs críticos de infraestrutura

#### S0-01: BUG-C1 — Encoding UTF-8
```
Arquivo: docker-compose.yml
Mudança: adicionar POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"
Após: docker-compose down -v + up -d + prisma migrate deploy + seeds
DoD: São Luís aparece corretamente no dropdown de cidades
```

#### S0-02: MinIO — Configurar credenciais
```
Arquivo: backend/.env
Adicionar: MINIO_ENDPOINT, PORT, SSL, ACCESS_KEY, SECRET_KEY, BUCKET_*
DoD: upload de comprovante via Swagger retorna URL MinIO sem erro S3
```

---

### SPRINT 1 — SCHEMA COMPLETO + FUNCIONÁRIOS CLT
**Duração:** 2-3 dias | **Executor:** Antygravity
**Objetivo:** Modelo de funcionário CLT completo do cadastro ao cálculo

#### S1-01: Campos CLT no EmployeesService
```
Arquivos: create-employee.dto.ts + employees.service.ts
Mudança:
  - DTO: adicionar monthlySalaryCLT (Decimal), contractType (enum), travelRuleKm (Int)
  - service.create(): incluir os 3 campos
  - service.update(): incluir os 3 campos
DoD: POST /employees com contractType: "CLT" e monthlySalaryCLT persiste no banco
```

#### S1-02: Frontend modal de funcionário — campos CLT
```
Arquivo: frontend/app/admin/funcionarios/page.tsx — Step 1 do modal
Mudança:
  - Select: Tipo de Contrato (CLT | PJ | Freelance)
  - Input: Salário Base Mensal (aparece só quando CLT)
  - Input: Distância limite km (default 200, para regra de passagem)
DoD: admin cadastra instrutor CLT com salário R$3.500 e vê no card
```

#### S1-03: Verificar e ajustar REQ-03/04/05 no frontend
```
Verificar em: formulário de cadastro do aluno
  - Toggle "Sempre estudou em escola pública?" → campo publicSchoolOnly
  - "Pé de Meia" no dropdown de programas sociais
  - Campo Motivação sem asterisco de obrigatório
DoD: cadastro de aluno sem motivação retorna 201
```

---

### SPRINT 2 — FINANCEIRO COMPLETO ✅ CONCLUÍDO (15/03/2026)
- S2-01: addFuncionario() usa dailyCost do cadastro como default
- S2-02: calcularResumoFinanceiro() com CLT + passagens (R$270, regra 200km)
- S2-03: Alerta custo excessivo (console.warn + Notification placeholder)
- ⚠️ PENDÊNCIA IDENTIFICADA PÓS-SPRINT: valores financeiros hardcoded
  → Resolvido como S3-00 (task prévia ao Sprint 3)

### SPRINT 3 — PARÂMETROS FINANCEIROS + PDFs + 2FA
**Duração:** 4-5 dias | **Executor:** Antygravity
**Objetivo:** Valores financeiros configuráveis pelo admin + PDFs corretos + segurança

#### S3-00: Parâmetros financeiros configuráveis pelo admin — PRIORIDADE MÁXIMA
```
PROBLEMA: Valores financeiros estão hardcoded no backend. INACEITÁVEL em produção.
  const custoPassagem = 270;   ← hardcoded em acoes.service.ts
  const diasUteisMes = 22;     ← hardcoded em acoes.service.ts
  real.total > estimado * 1.1  ← percentual hardcoded

SOLUÇÃO — 3 arquivos:

1. backend/src/settings/settings.service.ts
   Adicionar ao SystemSettings:
     valorPassagemViagem: number;      // R$270 default
     valorDiariaPadrao: number;        // R$120 default
     kmLimitePassagemSemanal: number;  // 200 default
     diasUteisReferenciaMes: number;   // 22 default
     percentualAlertaCusto: number;    // 110 default (110%)

   Adicionar ao DEFAULT_SETTINGS:
     valorPassagemViagem: 270,
     valorDiariaPadrao: 120,
     kmLimitePassagemSemanal: 200,
     diasUteisReferenciaMes: 22,
     percentualAlertaCusto: 110,

2. backend/src/acoes/acoes.service.ts
   Injetar SettingsService no construtor do AcoesService.
   Substituir valores hardcoded por chamadas ao settings:
     const custoPassagem = settings.valorPassagemViagem;
     const diasUteisMes = settings.diasUteisReferenciaMes;
     const kmLimite = f.employee.travelRuleKm || settings.kmLimitePassagemSemanal;
     if (real.total > estimado.total * (settings.percentualAlertaCusto / 100))

3. frontend/app/admin/configuracoes/page.tsx
   Adicionar seção "Parâmetros Financeiros" com campos:
     - Valor da passagem por viagem (R$)
     - Diária padrão do instrutor (R$)
     - Distância limite passagem semanal (km)
     - Dias úteis de referência/mês
     - % de alerta de custo excessivo

DOD:
[ ] SystemSettings com 5 campos financeiros
[ ] DEFAULT_SETTINGS com valores padrão corretos
[ ] AcoesService usando SettingsService — zero valores hardcoded
[ ] Tela de configurações com seção financeira
[ ] Admin altera valor da passagem → cálculo atualiza imediatamente
[ ] npm run build + tsc --noEmit sem erros
```

#### S2-01: addFuncionario() — puxar dailyCost como default
```
Arquivo: backend/src/acoes/acoes.service.ts
Mudança: ao criar AcaoFuncionario, buscar employee.dailyCost como default
         para valorDiaria quando não informado no DTO
DoD: vincular funcionário sem informar diária usa o valor do cadastro
```

#### S2-02: calcularResumoFinanceiro() — incluir CLT + passagens
```
Arquivo: backend/src/acoes/acoes.service.ts
Mudança: quando employee.contractType = 'CLT':
  salarioProporcional = monthlySalaryCLT / 22 × diasTrabalhados
  passagens = calcPassagens(travelRuleKm, diasTrabalhados, valorPassagem)
  totalFuncionario = diaria + salarioProporcional + passagens
Regra passagens: ≤200km → semanal · >200km → quinzenal (R$270/viagem do modelo real)
DoD: GET /acoes/:id retorna resumoFinanceiro com CLT breakdown correto
```

#### S2-03: TECH-12 — Alerta custo excessivo
```
Arquivo: backend/src/acoes/acoes.service.ts — método addCusto()
Mudança: após criar AcaoCusto, verificar:
  if real.total > estimado.total × 1.1 → criar Notification no banco
DoD: ao ultrapassar 110% do orçamento, aparece notificação no admin
```

#### S2-04: TECH-05 — Upload com preview e compressão
```
Arquivo: frontend — tela de reembolso + cadastro de aluno (foto)
Stack: browser-image-compression + URL.createObjectURL()
DoD: foto de recibo é comprimida no browser antes do upload; preview visível
```

---

### SPRINT 3 — PDFs GOVERNAMENTAIS CORRETOS + 2FA
**Duração:** 4-5 dias | **Executor:** Antygravity
**Objetivo:** Documentos no formato exato exigido pela secretaria

#### S3-01: buildFrequencyHtml() — template real
```
Arquivo: backend/src/reports/pdf.service.ts
Mudança estrutural:
  - Cabeçalho: 4 logos (SETRE | Gov.PI | Upgrade | brasão) ou placeholders formatados
  - Faixa colorida: "NOME_CURSO (Nª TURMA) HH:MM às HH:MM"
  - Tabela: Nº | NOME | [coluna por dia útil com P ou F]
  - Rodapé: assinatura + nome + cargo do instrutor
  - Corrigir query: remover where:{present:true} — incluir todos os registros
DoD: PDF gerado idêntico ao modelo FREQUENCIA_CORTE_E_COSTURA.pdf
```

#### S3-02: buildConcludentsHtml() — template real
```
Arquivo: backend/src/reports/pdf.service.ts
Mudança:
  - Tabela aprovados: NOME | ASSINATURA (2 colunas — sem %)
  - Lista desistentes: página separada, 1 coluna NOME
  - Data por extenso no rodapé
  - Suporte a múltiplos turnos
DoD: PDF idêntico ao modelo CONCLUDENTES_MORRO_CABECA.pdf
```

#### S3-03: REQ-14 — 2FA completo com Google Authenticator
```
Backend: npm install speakeasy qrcode @types/speakeasy
Arquivos: auth.service.ts + users.service.ts
Endpoints novos:
  POST /auth/2fa/enable    → gera secret + QR Code URL
  POST /auth/2fa/verify    → valida código TOTP e ativa 2FA
  POST /auth/2fa/disable   → desativa com confirmação de senha
  PATCH /auth/login        → se twoFactorEnabled: exige código TOTP
Frontend: configuracoes/page.tsx — remover "Em breve" + mostrar QR Code
DoD: admin ativa 2FA, escaneia QR no Google Authenticator, próximo login pede código
```

#### S3-04: REQ-13 — Exportação multi-formato
```
Arquivo: backend/src/reports/ (novo endpoint no controller)
Stack: ExcelJS Streaming
Endpoint: GET /reports/export?estado=MA&ano=2025&formato=xlsx
Features:
  - Filtros: estado, ano, cidade, curso, status certificado
  - Excel: células coloridas (verde=certificado, vermelho=reprovado)
  - CSV: UTF-8 BOM + separador ; (Excel BR)
  - Para >5k registros: job BullMQ + notificação
DoD: Excel de alunos abre corretamente no Excel BR com acentos
```

#### S3-05: Logos institucionais no MinIO
```
Ação: carregar logos (Upgrade, SETRE, Gov.MA/PI) no MinIO bucket 'assets'
Backend: endpoint GET /settings/logos que retorna URLs das logos
Configurar: SystemConfig.logoUpgradeUrl, SystemConfig.logoGovUrl
DoD: logos aparecem nos PDFs gerados
```

---

### SPRINT 4 — PROFESSOR + BI + REAL-TIME
**Duração:** 5-7 dias | **Executor:** Antygravity
**Objetivo:** Tela do professor operacional + dashboard avançado + real-time

#### S4-01: TECH-11 — Tela do professor (frontend/app/teacher/)
```
Estrutura a criar:
  frontend/app/teacher/
    layout.tsx          → sidebar com: Dashboard | Frequência | Reembolsos | Concludentes
    dashboard/page.tsx  → turmas do dia, próxima aula, localização da carreta
    frequencia/
      page.tsx          → lista de turmas do professor
      [classId]/page.tsx → tabela de alunos + P/F por dia (toque/clique)
    reembolsos/page.tsx → formulário + upload foto recibo (mobile-first)
    concludentes/page.tsx → emitir PDF da 3ª semana

Backend: UserRole.TEACHER já existe — verificar guards
DoD: professor loga → vê suas turmas → registra frequência → solicita reembolso
```

#### S4-02: TECH-09 — Dashboard BI de rotas
```
Arquivo: dashboard.service.ts + frontend/app/admin/dashboard/page.tsx
Backend: novo método getRotasBi(estado, ano) → retorna:
  { totalRotas, cidades[], totalInscritos, totalCertificados, totalConcluintes }
Frontend: nova aba "Rotas & BI" no dashboard com:
  - Filtros: estado + ano
  - Cards: rotas ativas, cidades beneficiadas, certificados emitidos
  - Lista de cidades com alunos por cidade
DoD: filtrar PI + 2025 retorna dados corretos de rotas
```

#### S4-03: TECH-02 — Mapa interativo MA/PI
```
Arquivo: frontend/app/admin/dashboard/page.tsx
Stack: react-simple-maps + TopoJSON BR
Features:
  - Municípios coloridos onde há rotas ativas
  - Tooltip com cidade, nº de alunos, curso
  - Diferentes intensidades de cor por volume
DoD: mapa renderiza com municípios do MA e PI onde há dados
```

#### S4-04: TECH-01 — Notificações real-time com Socket.io
```
Backend: @nestjs/websockets + gateway de notificações
Frontend: hook useNotifications() → badge no sino da sidebar
Eventos:
  nova_inscricao → badge admin +1
  frequencia_baixa → alerta admin + aluno
  certificado_emitido → notificação aluno
  custo_excessivo → alerta admin (integra com S2-03)
DoD: admin aprova inscrição → outro admin vê badge diminuir em tempo real
```

---

### SPRINT 5 — INFRAESTRUTURA + ACRE + QUALIDADE
**Duração:** 3-4 dias | **Executor:** Antygravity
**Objetivo:** Sistema pronto para produção com 3 estados

#### S5-01: Seed do Acre
```
Arquivo: backend/prisma/seed.ts
Adicionar:
  - Grupo 1 AC
  - 10+ cidades principais do Acre
  - Grade de cursos específica do AC (confirmar com Ronaldo quais)
DoD: sistema opera com 3 grupos (MA, PI, AC) sem mudança de arquitetura
```

#### S5-02: TECH-14 — Modo manutenção com middleware
```
Backend: NestJS middleware lendo settings.manutencao
Frontend: Next.js middleware.ts verificando flag
DoD: admin ativa manutenção → portal aluno mostra "Sistema em manutenção"
     admins continuam acessando normalmente
```

#### S5-03: CI/CD com GitHub Actions
```
Arquivo: .github/workflows/ci.yml
Jobs: backend tsc --noEmit + frontend tsc --noEmit
Trigger: push main + pull_request
DoD: push com erro TypeScript faz pipeline falhar
```

#### S5-04: TECH-08 — Skeleton loading sistemático
```
Todas as telas novas do Sprint 4 devem ter skeleton loading
Reutilizar padrão já existente no globals.css
DoD: zero telas em branco durante carregamento
```

#### S5-05: Testes E2E críticos com Playwright
```
Fluxos a cobrir:
  1. Admin cria turma → aluno se inscreve → admin aprova → frequência registrada
  2. Professor registra feriado → data de término avança 1 dia útil
  3. Funcionário vinculado à rota → custo aparece em Contas a Pagar
DoD: 3 testes E2E passando sem erros
```

---

## PARTE 4 — PROTOCOLO DUAL-AGENT (Gravity + Antygravity)

### Como usar este plano

**Para cada sprint, o fluxo é:**

```
1. VOCÊ (Tech Lead) → "Autorizo Sprint X"
   ↓
2. GRAVITY (eu) → lê os arquivos afetados nesta sessão → audita estado atual
   → monta handoff detalhado com diff exato + DoD
   ↓
3. VOCÊ → passa o handoff para o ANTYGRAVITY executar
   ↓
4. ANTYGRAVITY → implementa + roda build + reporta resultado
   ↓
5. VOCÊ → traz resultado para o GRAVITY avaliar
   ↓
6. GRAVITY → valida + atualiza Diário de Bordo + memória MCP
   ↓
7. Próxima task
```

### Contexto para iniciar o Antygravity

Cole este bloco ao abrir o Antygravity em nova sessão:

```
Você é o Antygravity — agente de execução do Sistema Upgrade.
Projeto: C:\Users\Desktop\Downloads\Sistema_upgrade-main_atual
Stack: NestJS 10 + Next.js 14 + PostgreSQL + Prisma + Puppeteer + Docker

Seu papel: executar EXATAMENTE o plano que o Gravity preparou.
Antes de qualquer linha: leia os arquivos afetados listados no handoff.

REGRAS ABSOLUTAS:
- Valores monetários: Decimal(10,2) — NUNCA Float
- Soft delete: active = false — NUNCA DELETE físico
- Toda rota nova: @UseGuards(JwtAuthGuard) obrigatório
- UI: "Período de Cursos" | Banco: acao/acoes (não alterar)
- Após cada task: npm run build + npx tsc --noEmit
- Reportar: STATUS + BUILD + TSC + OBSERVAÇÕES
```

---

## PARTE 5 — CRONOGRAMA CONSOLIDADO

| Sprint | Foco | Dias | Pré-requisito |
|--------|------|------|---------------|
| S0 | BUG-C1 + MinIO | 1-2 | — |
| S1 | CLT no cadastro + REQs aluno | 2-3 | S0 |
| S2 | Financeiro completo + alerta | 3-4 | S1 |
| S3 | PDFs reais + 2FA + exportação | 4-5 | S0 + modelos Robert |
| S4 | Professor + BI + Real-time | 5-7 | S1 + S2 + S3 |
| S5 | Acre + Infra + Qualidade | 3-4 | S4 |

**Total estimado:** 18-25 dias de desenvolvimento

**Bloqueadores externos (aguardando):**
- Logo Upgrade PNG/SVG → MinIO (Robert enviou no WhatsApp — carregar)
- Grade de cursos do Acre → confirmar com Ronaldo
- Servidor de produção → VPS + Docker Compose para deploy

---

## PARTE 6 — IMPACTO DE NEGÓCIO POR SPRINT

| Sprint | Impacto direto para o cliente (Upgrade) |
|--------|----------------------------------------|
| S0 | Cidades sem acentos corrompidos → dados corretos para o governo |
| S1 | Instrutor CLT cadastrado corretamente → financeiro preciso |
| S2 | Custo da rota calculado com salário + passagens → gestão real |
| S3 | PDFs aceitos pela secretaria → EMPRESA RECEBE O PAGAMENTO |
| S4 | Professor trabalha pelo sistema → operação 100% digital |
| S5 | Sistema pronto para 3 estados + produção |

---

*Gravity 2.0 · Plano Mestre v3.0 · Sistema Upgrade · RR TECNOL · 15/03/2026*
*"Move fast, break nothing, ship quality."*
