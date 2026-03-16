# ANÁLISE DA TRANSCRIÇÃO — REUNIÃO UPGRADE × RR TECNOL (12/03/2026)
## Gravity 2.0 · Sistema Upgrade · Atualizado em 15/03/2026

> Documento gerado após leitura integral da transcrição (42min59s) e
> cruzamento com o código atual (schema.prisma + services). Este é o
> insumo definitivo para o Antygravity. Nenhuma linha deve ser escrita
> sem este documento como referência.

---

## PARTE 1 — O QUE A REUNIÃO CONFIRMOU (e já está no código)

Estes itens foram citados por Robert/Ronaldo E já existem implementados.
O Antygravity deve VERIFICAR o funcionamento — não reimplementar.

| Item | Onde confirmar | Referência reunião |
|------|---------------|-------------------|
| Fluxo turma: curso → cidade → professor → datas → vagas | `classes.service.ts` + frontend turmas | 00:01:26 |
| reserveSlots = 4 (padrão vagas reserva) | `schema.prisma` Class.reserveSlots | 00:01:26 |
| Aluno: publicSchoolOnly (escola pública) | `schema.prisma` StudentSocioeconomic | 00:05:48 |
| Aluno: PE_DE_MEIA no enum SocialProgram | `schema.prisma` enum SocialProgram | 00:05:48 |
| Aluno: motivation opcional (String?) | `schema.prisma` StudentProfessional | 00:06:57 |
| Aluno: PcD + tipo deficiência + adaptação carreta | `schema.prisma` DisabilityType + disabilityAdaptation | 00:05:48 |
| HolidayService: recálculo dias úteis + ClassHoliday | `holiday.service.ts` — completo e funcional | 00:30:12 |
| ReimbursementService: foto recibo + aprovação admin | `reimbursement.service.ts` — completo, aguarda MinIO | 00:21:02 |
| PDF frequência (modelo provisório) | `pdf.service.ts` buildFrequencyHtml() | 00:26:33 |
| PDF concludentes 3ª semana 80% | `pdf.service.ts` buildConcludentsHtml() | 00:40:59 |
| monthlySalaryCLT + travelRuleKm no schema | `schema.prisma` Employee — campos existem | 00:18:59 |

---

## PARTE 2 — GAPS IDENTIFICADOS (código incompleto vs. reunião)

### GAP-01 🔴 CRÍTICO — EmployeesService não salva campos CLT

**Trecho da reunião (00:18:59):**
Robert confirmou: instrutores são CLT, recebem salário fixo + diária R$120 + passagem.

**Problema encontrado no código:**
`employees.service.ts` → função `create()` NÃO inclui `monthlySalaryCLT`, `contractType`
nem `travelRuleKm` no `prisma.employee.create({ data: {...} })`.
Os campos existem no schema mas são ignorados na criação.

**Correção necessária em `create()` e `update()`:**
```typescript
monthlySalaryCLT: dto.monthlySalaryCLT,
contractType: dto.contractType,
travelRuleKm: dto.travelRuleKm ?? 200,
```
**Também atualizar:** `create-employee.dto.ts` — adicionar os 3 campos com validação.

---

### GAP-02 🔴 CRÍTICO — PayrollService não existe

**Trecho da reunião (00:23:15):**
Robert enviou planilha de cálculo pelo WhatsApp. Regras:
- Diária = R$120/dia permanência na cidade
- Passagem: cidade ≤ 200km → semanal (ida+volta) | cidade > 200km → quinzenal
- Salário base CLT rateado pelos dias trabalhados no mês

**Estado atual:** Nenhum arquivo `payroll.service.ts` encontrado em `backend/src/`.

**Precisa ser criado:**
```
backend/src/payroll/
  payroll.module.ts
  payroll.service.ts
  payroll.controller.ts
  dto/calculate-cost.dto.ts
```

**Lógica central:**
```typescript
calculateEmployeeCost(employeeId, daysWorked, cityDistanceKm) {
  const workingDaysInMonth = 22  // padrão
  const baseSalaryRated = monthlySalaryCLT / workingDaysInMonth * daysWorked
  const dailyCosts = 120.00 * daysWorked  // Decimal, NUNCA Float
  const weeksWorked = Math.ceil(daysWorked / 5)
  const travelExpenses = cityDistanceKm <= 200
    ? weeksWorked * travelCostPerTrip     // passagem semanal
    : Math.ceil(weeksWorked / 2) * travelCostPerTrip  // passagem quinzenal
  return { baseSalaryRated, dailyCosts, travelExpenses, total }
}
```
**Atenção:** TODOS os valores em Decimal. Nunca Float (02_LIVRO_DE_REGRAS.md §3).

---

### GAP-03 🟠 PARCIAL — Lógica de 3 turmas por curso no Maranhão

**Trecho da reunião (00:01:26):**
"No Maranhão cada curso é subdividido em 3 horários: manhã, tarde e tarde/noite.
Então cada curso resulta em 3 turmas. O multicurso tem 5 cursos × 4 horários."

**Estado atual:** O enum `Period` (MORNING/AFTERNOON/EVENING) existe.
O campo `isMulticourse` em Course existe. Mas:
- Não há lógica para criar 3 turmas automaticamente ao criar um curso em MA
- Não há validação de que multicurso deve ter 4 horários (MORNING/AFTERNOON/EVENING + ?)
- O frontend não oferece criação em lote de turmas

**Correção:** Adicionar fluxo no frontend de criação de turmas com toggle
"Criar para todos os horários do MA" que replica a turma em 3 períodos.

---

### GAP-04 🟠 PARCIAL — Upload de foto de perfil do aluno

**Trecho da reunião (00:06:57):**
"Consegue implementar a falta de perfil desse aluno, se vocês quiserem também."
Robert ficou animado com a possibilidade.

**Estado atual:** Campo `photoUrl String?` existe em `Student`. MinIO configurado.
Mas o endpoint de upload de foto para aluno não está implementado nos students endpoints.

**Correção:** Adicionar endpoint `POST /students/:id/photo` que gera Presigned URL
MinIO e salva a URL no campo `Student.photoUrl` (mesmo padrão do Reimbursement).

---

## PARTE 3 — ITENS NOVOS DA TRANSCRIÇÃO (não mapeados antes)

### NOVO-01 🟣 — Tela do professor (acesso TEACHER)

**Trecho da reunião (00:39:57 e 00:06:57):**
Robert pediu explicitamente: "A questão do acesso do motorista, do professor e também
o acesso do aluno."
"Essa tela também tem que colocar no usuário lá do professor para ele poder
realizar a frequência de todos os alunos."
"No login do usuário uma aba só de custos para registrar gasto pelo celular."

**Estado atual:** `UserRole.TEACHER` existe no schema. Mas:
- Não há rota `/teacher/` no frontend
- Não há tela de frequência para o professor
- Não há tela de reembolso para o professor
- O professor não consegue fazer nada após logar

**Novas telas necessárias:**
```
frontend/app/teacher/
  dashboard/           → turmas do dia, próxima aula
  frequencia/[classId] → registrar presença dos alunos
  reembolsos/          → registrar gasto + foto do recibo (REQ-10)
  certificados/        → emitir lista de concludentes (REQ-12)
```

---

### NOVO-02 🟣 — Alerta de custo excessivo por IA na ação

**Trecho da reunião (00:14:47):**
"O sistema utiliza inteligência artificial para alertar sobre custos em excesso,
baseando-se nos custos estimados configurados para a ação."

**Estado atual:** Nenhuma lógica de alerta de custo implementada.
O campo `AcaoCusto` existe, mas não há comparação com custo estimado.

**Implementação:**
- Campo `custoEstimadoTotal Decimal?` em `Acao` (ou via SystemConfig)
- Após cada `AcaoCusto.create()`, comparar com custo estimado
- Se `custoReal > custoEstimado * 1.1`: disparar notificação para admin
- Isso pode ser feito sem IA real — regra simples, mas chamada de "IA" na UI

---

### NOVO-03 🟣 — Relatório BI de rotas por estado/ano

**Trecho da reunião (00:33:43):**
"No Piauí no ano 2025 a gente teve 11 rotas — quais cidades foram beneficiadas?
Quantidade de inscritos no total nesse ano, quantos receberam certificado."

**Estado atual:** Dashboard tem gráficos básicos. Mas não há:
- Filtro de ações (rotas) por estado + ano
- Contagem de cidades beneficiadas por rota/período
- Relatório de certificados emitidos por rota

**Endpoint necessário:**
`GET /dashboard/rotas?estado=PI&ano=2025`
→ Retorna: total_rotas, cidades[], total_inscritos, total_certificados, total_concluintes

---

### NOVO-04 🟣 — Cálculo de combustível por rota (BI)

**Trecho da reunião (00:30:12 e 00:31:13):**
"A distância entre a origem da carreta e o local da ação deve ser registrada para
calcular o custo estimado de combustível para o relatório de BI."
"600km de distância, autonomia do caminhão → custo estimado R$975."

**Estado atual:** Campos `distanciaKm`, `precoCombustivelL`, `autonomiaKmL` existem em `Acao`.
Mas o cálculo não é feito automaticamente e não aparece no dashboard.

**Fórmula:** `custoCombustivel = (distanciaKm / autonomiaKmL) * precoCombustivelL * 2`
(ida + volta)

**Implementação:** No `AcaoService.create()` ou `update()`, calcular e salvar em campo
`custoEstimadoCombustivel Decimal?` sempre que os 3 valores base forem preenchidos.

---

## PARTE 4 — ITENS AGUARDANDO ROBERT (bloqueadores externos)

| Item | O que Robert vai enviar | Impact no sistema | Status |
|------|------------------------|-------------------|--------|
| Template PDF frequência | Modelo visual com logo | Substituir `buildFrequencyHtml()` | ⏳ Pendente |
| Planilha cálculo instrutores | Regras financeiras por município | Calibrar PayrollService | ⏳ Pendente |
| Logo da empresa | Arquivo PNG/SVG | `SystemConfig.logoUrl` + PDFs | ⏳ Pendente (foi mencionada no WhatsApp — 00:40:59) |

---

## PARTE 5 — PLANO ATUALIZADO PARA O ANTYGRAVITY

### Ordem de execução (não modificar sem autorização do Tech Lead)

```
SPRINT 0 (1-2 dias):
  S0-01: BUG-C1 encoding UTF-8 (docker-compose.yml)
  S0-02: MinIO configurar .env

SPRINT 1 (2-3 dias):
  S1-01: Verificar REQ-03/04/05 no frontend (campos já no schema)
  S1-02: GAP-01: corrigir employees.service.ts (salvar campos CLT)
  S1-03: Atualizar create-employee.dto.ts

SPRINT 2 (4-5 dias):
  S2-01: GAP-02: criar PayrollService completo (módulo novo)
  S2-02: GAP-04: endpoint upload foto aluno (Presigned URL MinIO)
  S2-03: Verificar REQ-08 HolidayService (já implementado — testar)
  S2-04: Verificar REQ-10 Reimbursement com MinIO ativo

SPRINT 3 (4-5 dias) — aguarda Robert:
  S3-01: REQ-11 PDF frequência (substituir template quando Robert enviar)
  S3-02: REQ-12 PDF concludentes (testar lógica 80% + 3ª semana)
  S3-03: REQ-13 Filtros avançados de relatórios
  S3-04: REQ-14 2FA completo (speakeasy + QR Code)

SPRINT 4 (5-7 dias):
  S4-01: NOVO-01 Tela do professor (frontend/app/teacher/)
  S4-02: NOVO-03 Dashboard BI de rotas por estado/ano
  S4-03: NOVO-04 Cálculo combustível automático na ação
  S4-04: NOVO-02 Alerta de custo excessivo (regra simples → UI chama de IA)
  S4-05: Notificações email/WhatsApp (BullMQ)

SPRINT 5 (3-4 dias):
  S5-01: CI/CD GitHub Actions
  S5-02: Testes E2E Playwright nos fluxos críticos
  S5-03: GAP-03 Lógica 3 turmas/curso MA (se Robert confirmar necessidade)
```

---

## PARTE 6 — HANDOFF IMEDIATO PARA O ANTYGRAVITY

### Primeira task autorizada: S0-01 + S0-02

**TASK S0-01 — BUG-C1**
Arquivo: `docker-compose.yml`
Mudança exata:
```yaml
# Adicionar no serviço postgres em environment:
POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"
```
Após editar:
```powershell
docker-compose down -v
docker-compose up -d
cd backend && npx prisma migrate deploy && npm run prisma:seed && npm run seed:test
```
DoD: cidades sem acentos corrompidos no dropdown.

**TASK S0-02 — MinIO**
Arquivo: `backend/.env`
Adicionar:
```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET_REIMBURSEMENT=reimbursements
MINIO_BUCKET_CERTIFICATES=certificates
MINIO_BUCKET_REPORTS=reports
```
DoD: upload de comprovante de reembolso funciona via Swagger sem erro S3.

---

*Gravity 2.0 · Análise pós-reunião · Sistema Upgrade · RR TECNOL · 15/03/2026*
*Baseado na transcrição integral da reunião Upgrade × RR Tecnol de 12/03/2026 (42min59s)*
