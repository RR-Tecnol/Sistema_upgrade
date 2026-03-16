# PLANO DE IMPLEMENTAÇÃO — GRAVITY 2.0
## Sistema Upgrade · RR TECNOL · Março 2026

> **Para o Agente:** Este é o documento de execução. Leia antes de cada sprint. Cada tarefa tem
> contexto, arquivos afetados, comandos e critério de aceite. Nunca implemente sem autorização
> explícita do Tech Lead.

---

## ESTADO ATUAL (15/03/2026)

| Item | Status |
|---|---|
| REQs implementados | 13/14 ✅ |
| BUG-C1 encoding cidades | ⚠️ Aberto — banco precisa ser recriado |
| MinIO credenciais | ⚠️ Não configurado no .env |
| PDF templates | ⏳ Aguardando modelo do Robert |
| REQ-14 (2FA) | ⏳ UI pronta, lógica não implementada |
| Notificações email/WhatsApp | ⏳ Pendente |
| CI/CD | ⏳ Pendente |

---

## SPRINT 0 — INFRA & DÉBITO CRÍTICO
**Duração estimada:** 1–2 dias
**Objetivo:** Ambiente funcionando sem bugs bloqueantes antes de qualquer nova feature.

---

### TASK S0-01: BUG-C1 — Encoding UTF-8 cidades

**Problema:** Cidades com acentos aparecem corrompidas (`SÃ£o LuÃ­s` em vez de `São Luís`).
**Causa raiz:** Container PostgreSQL criado sem collation `pt_BR.UTF-8`.
**Arquivo afetado:** `docker-compose.yml`

**Solução:**
```yaml
# Em docker-compose.yml, no serviço postgres, adicionar:
environment:
  POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"
```

**Sequência de execução (Windows PowerShell):**
```powershell
cd C:\Users\Desktop\Downloads\Sistema_upgrade-main_atual
docker-compose down -v
docker-compose up -d
# Aguardar PostgreSQL inicializar (~10s)
cd backend
npx prisma migrate deploy
npm run prisma:seed
npm run seed:test
```

**DoD:**
- [ ] Cidades exibidas com acentos corretos no dropdown
- [ ] `npm run prisma:seed` sem erros
- [ ] Backend inicia sem erros reais (MinIO error é esperado)

---

### TASK S0-02: MinIO — Configurar credenciais

**Problema:** `ReimbursementModule` não consegue fazer upload — credenciais incorretas no `.env`.
**Arquivo afetado:** `backend/.env`

**Variáveis a adicionar/corrigir:**
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

**Verificar:** Acessar http://localhost:9001 e confirmar que os buckets existem. Criar manualmente se necessário.

**DoD:**
- [ ] Upload de comprovante de reembolso funciona
- [ ] Erro `S3Error` não aparece mais no startup do backend

---

## SPRINT 1 — SCHEMA + REQs DE ALUNO
**Duração estimada:** 2–3 dias
**Objetivo:** Completar os 4 REQs de schema e formulário de aluno.
**Pré-requisito:** Sprint 0 concluído.

---

### TASK S1-01: REQ-03 — Campo `publicSchoolOnly`

**Verificação:**
```powershell
grep -n "publicSchoolOnly" backend/prisma/schema.prisma
```

**Arquivos a verificar:**
- `backend/prisma/schema.prisma` — `publicSchoolOnly Boolean? @default(false)` em `StudentSocioeconomic`
- `frontend/app/admin/alunos/novo/page.tsx` — toggle "Sempre estudou em escola pública?"
- `backend/src/students/dto/create-student.dto.ts` — campo no DTO

**DoD:**
- [ ] Campo visível e funcional no formulário de cadastro
- [ ] Valor salvo no banco e recuperado na edição do aluno

---

### TASK S1-02: REQ-04 — `PE_DE_MEIA` no enum `SocialProgram`

**Verificação:**
```powershell
grep -n "PE_DE_MEIA" backend/prisma/schema.prisma
```

**DoD:**
- [ ] Opção "Pé de Meia" aparece no dropdown de programas sociais
- [ ] Valor salvo e exibido corretamente

---

### TASK S1-03: REQ-05 — Campo `motivation` opcional

**Arquivos a verificar:**
- `backend/prisma/schema.prisma` — `motivation String?` (nullable)
- `backend/src/students/dto/create-student.dto.ts` — remover `@IsNotEmpty()`
- `frontend/app/admin/alunos/novo/page.tsx` — remover asterisco de obrigatoriedade

**DoD:**
- [ ] Cadastro de aluno funciona sem preencher motivação
- [ ] Campo não retorna erro de validação quando vazio

---

### TASK S1-04: REQ-01 — `reserveSlots` + fluxo de criação de turma

**Arquivos a verificar:**
- `frontend/app/admin/turmas/nova/page.tsx` — campo `reserveSlots` visível (default: 4)
- `backend/src/classes/classes.service.ts` — lógica de vagas de reserva
- Turma deve bloquear inscrições normais quando `vagas_ocupadas >= (vacancies - reserveSlots)`

**DoD:**
- [ ] Campo `reserveSlots` no formulário de nova turma
- [ ] Sistema distingue vagas normais vs. vagas de reserva
- [ ] API retorna contagem correta de vagas disponíveis

---

### TASK S1-05: Migration Sprint 1

```powershell
cd backend
npx prisma migrate dev --name sprint1_aluno_schema
npx prisma generate
npx tsc --noEmit
```

---

## SPRINT 2 — FINANCEIRO + CALENDÁRIO DINÂMICO
**Duração estimada:** 4–5 dias
**Objetivo:** Modelo CLT completo (REQ-09), HolidayService com recálculo real (REQ-08), Reembolso mobile (REQ-10).
**Pré-requisito:** Sprint 1 concluído. Planilha de despesas do Robert recebida.

---

### TASK S2-01: REQ-09 — Modelo Financeiro CLT

**Regra de passagem:**
- Cidade ≤ 200km da base: passagem semanal (ida + volta)
- Cidade > 200km da base: passagem quinzenal

**Alterações no schema:**
```prisma
model Employee {
  // campos existentes...
  monthlySalaryCLT  Decimal?  @db.Decimal(10, 2)  // NOVO
  travelDistanceKm  Int?                            // NOVO
}
```

**Arquivos afetados:**
- `backend/prisma/schema.prisma`
- `backend/src/employees/employees.service.ts`
- `backend/src/employees/dto/create-employee.dto.ts`
- `backend/src/payroll/payroll.service.ts`

**Lógica do PayrollService:**
```typescript
calculateMonthlyCost(employee, daysWorked) {
  baseSalary    = monthlySalaryCLT / diasUteisDoMes * daysWorked
  dailyCosts    = dailyCost * daysWorked  // R$120/dia
  travelExpenses = calcPassagens(travelDistanceKm, daysWorked)
  total         = baseSalary + dailyCosts + travelExpenses
}
```

**DoD:**
- [ ] Campos CLT visíveis no cadastro de funcionário
- [ ] `PayrollService.calculateMonthlyCost()` retorna breakdown correto
- [ ] Endpoint `/payroll/employee/:id/cost?days=22` funciona
- [ ] Valores em `Decimal`, nunca `Float`

---

### TASK S2-02: REQ-08 — HolidayService com recálculo real

**Verificar em `backend/src/holiday/holiday.service.ts`:**
1. `getWorkingDays(startDate, endDate)` — conta apenas dias úteis
2. `calculateEndDate(startDate, workingDaysCount)` — retorna data final em dias úteis
3. `recalculateClassSchedule(classId, holidayDate)` — empurra endDate +1 dia útil

**Algoritmo de recálculo:**
```typescript
// Se holiday.date >= class.startDate E <= class.endDate:
//   → Adicionar 1 dia útil ao class.endDate
//   → Registrar no ClassHoliday
//   → Salvar no banco
// Se holiday.date < class.startDate: ignorar
```

**DoD:**
- [ ] `POST /holidays` recalcula endDate da turma afetada
- [ ] Turmas com `status = COMPLETED` não são recalculadas
- [ ] Teste manual: turma 5 dias úteis + feriado no dia 3 → endDate avança 1 dia

---

### TASK S2-03: REQ-10 — Reembolso mobile (verificar completude)

**Verificar com MinIO configurado (pós S0-02):**
1. `POST /reimbursements` — upload de comprovante funciona
2. `PATCH /reimbursements/:id/approve` — aprova com notas
3. `PATCH /reimbursements/:id/reject` — rejeita com motivo
4. Frontend `/admin/reembolsos` — lista, filtra, modal de análise

**DoD:**
- [ ] Upload real de foto funciona com MinIO ativo
- [ ] Admin aprova/rejeita com notas
- [ ] KPIs financeiros corretos na tela de reembolsos

---

### TASK S2-04: Migration Sprint 2

```powershell
cd backend
npx prisma migrate dev --name sprint2_financeiro_clt
npx prisma generate
npm run build
```

---

## SPRINT 3 — RELATÓRIOS + SEGURANÇA
**Duração estimada:** 4–5 dias
**Objetivo:** PDFs governamentais (REQ-11/12), filtros avançados (REQ-13), 2FA real (REQ-14).
**Pré-requisito:** Sprint 2 concluído. Template PDF recebido do Robert.

---

### TASK S3-01: REQ-11 — PDF de frequência com template real

**Arquivo afetado:** `backend/src/reports/pdf.service.ts` — função `buildFrequencyHtml()`

**Estrutura mínima do PDF:**
- Logo da empresa (SystemConfig.logoUrl via MinIO)
- Cabeçalho: Turma, Curso, Período, Local
- Tabela: Nome | CPF | Datas de aula | P/F por dia | % total
- Rodapé: Assinatura do professor, Data de emissão

**Endpoint:** `GET /reports/frequency/:classId?format=pdf`

**Cron automático dia 20:**
```typescript
@Cron('0 8 20 * *')  // 08:00 todo dia 20 do mês
async sendMonthlyFrequencyReports() { ... }
```

**DoD:**
- [ ] PDF gerado com logo, tabela completa e dados corretos
- [ ] Template visual corresponde ao modelo do Robert
- [ ] Botão "Gerar PDF" na tela `/admin/relatorios` funciona
- [ ] Cron job configurado para disparo automático dia 20

---

### TASK S3-02: REQ-12 — PDF de concludentes (3ª semana)

**Lógica:**
- Turma `status = IN_PROGRESS` na 3ª semana: `diasDecorridos >= (totalDiasUteis * 0.60)`
- Aprovado: `presencas / aulasRealizadas >= 0.80`
- Reprovado/desistente: abaixo de 80%

**Arquivos afetados:**
- `backend/src/reports/pdf.service.ts` — `buildConcludentsHtml()`
- `backend/src/reports/reports.service.ts` — identificação da 3ª semana

**DoD:**
- [ ] PDF com duas seções: Aprovados e Reprovados/Desistentes
- [ ] Critério 80% aplicado sobre aulas já realizadas (não total do curso)
- [ ] Botão disponível apenas para turmas na 3ª semana ou mais

---

### TASK S3-03: REQ-13 — Filtros avançados + exportação multi-formato

**Filtros necessários em `/admin/relatorios`:**
- Estado (MA / PI) · Ano · Cidade · Curso · Status certificado · Período de Curso

**Endpoints:**
- `GET /reports/export?estado=MA&ano=2025&formato=xlsx`
- `GET /reports/export?estado=PI&cidade=Teresina&formato=csv`

**Regras técnicas:**
- ExcelJS com streaming (NUNCA carregar 50k registros na RAM)
- UTF-8 BOM + separador `;` para Excel Brasil
- Cursor-based pagination no Prisma (não offset `skip/take`)
- Para > 5k registros: background job BullMQ + notificação

**DoD:**
- [ ] Todos os filtros funcionando combinados
- [ ] Excel abre corretamente no Excel Brasil (acentos OK)
- [ ] Exportação Excel, CSV e PDF funcionando
- [ ] Grandes exportações via background job sem travar a API

---

### TASK S3-04: REQ-14 — 2FA completo

**Instalar dependências:**
```powershell
cd backend
npm install speakeasy qrcode @types/speakeasy
```

**Fluxo:**
1. Admin ativa 2FA nas configurações → sistema gera secret + QR Code
2. Admin escaneia com Google Authenticator
3. Próximo login: email/senha → tela de código TOTP → acesso

**Arquivos afetados:**
- `backend/src/auth/auth.service.ts` — `enable2FA()`, `verify2FA()`, `disable2FA()`
- `backend/src/users/users.service.ts` — campos `twoFactorSecret`, `twoFactorEnabled`
- `frontend/app/admin/configuracoes/page.tsx` — remover "Em breve", mostrar QR Code
- `frontend/app/admin/login/page.tsx` — step de código TOTP

**DoD:**
- [ ] Admin ativa 2FA escaneando QR no Google Authenticator
- [ ] Login com 2FA ativo exige código TOTP válido
- [ ] Admin desativa 2FA mediante confirmação de senha

---

## SPRINT 4 — PORTAL ALUNO + NOTIFICAÇÕES + CI/CD
**Duração estimada:** 5–7 dias
**Objetivo:** Portal do aluno completo (REQ-06), notificações multicanal, pipeline de deploy.
**Pré-requisito:** Sprints 0–3 concluídos.

---

### TASK S4-01: REQ-06 — Portal do aluno completo

**Telas a verificar/completar:**
- `/student/dashboard` — localização da carreta (cidade + escola), próxima aula
- `/student/classes` — turmas matriculadas com datas e status
- `/student/attendance` — frequência atual com % e projeção de aprovação
- `/student/certificates` — certificados emitidos, botão de download (PDF do MinIO)
- `/student/enrollments` — inscrições com status (em espera / aprovado / rejeitado)

**Adicionar se não existir:**
- Localização da carreta: `Acao.addressDescription` da turma atual
- Timeline de status da inscrição (stepper horizontal)
- QR Code do certificado na tela de certificados

**DoD:**
- [ ] Aluno consegue ver onde está a carreta
- [ ] Aluno consegue baixar certificado (se aprovado)
- [ ] Aluno consegue ver % de frequência em tempo real

---

### TASK S4-02: Notificações multicanal

**Eventos a notificar:**
- Nova inscrição aprovada → email + WhatsApp para aluno
- Frequência abaixo de 50% → email + WhatsApp para professor e aluno
- Certificado disponível → email + WhatsApp para aluno
- Reembolso aprovado/rejeitado → WhatsApp para professor
- Feriado registrado → email para admin

**Arquivos a criar:**
- `backend/src/notifications/notifications.module.ts`
- `backend/src/notifications/notifications.service.ts`
- `backend/src/notifications/workers/notifications.worker.ts`

**Regras técnicas:**
- BullMQ queue: `notifications-queue`
- Rate limiting WhatsApp: máx 40 msgs/segundo

**DoD:**
- [ ] Email de aprovação de inscrição disparado e recebido
- [ ] WhatsApp de certificado disponível disparado
- [ ] Fila BullMQ processando sem erros

---

### TASK S4-03: CI/CD — GitHub Actions

```yaml
# .github/workflows/ci.yml
# Triggers: push main, pull_request
# Jobs:
#   1. backend-check: tsc --noEmit + lint
#   2. frontend-check: tsc --noEmit + lint
```

**DoD:**
- [ ] Push para `main` dispara pipeline
- [ ] Pipeline falha se `tsc --noEmit` retornar erros
- [ ] Badge de status no README

---

## REGRAS PARA O AGENTE DURANTE EXECUÇÃO

**Antes de cada task:**
1. Ler os arquivos afetados listados acima
2. Verificar se o estado atual corresponde ao descrito
3. Propor ao Tech Lead: "Vou fazer X. Abordagem: Y. Arquivos afetados: Z. Posso prosseguir?"
4. Aguardar `sim` ou `confirmo` antes de qualquer escrita de arquivo

**Durante implementação:**
- Nunca presuma regra de negócio — se não estiver documentada, PARE e pergunte
- Valores monetários: sempre `Decimal(10,2)`, nunca `Float`
- Soft delete: nunca deletar fisicamente, sempre `active = false`
- Toda rota nova: `@UseGuards(JwtAuthGuard)` obrigatório

**Após cada task:**
1. Rodar `npm run build` e `npx tsc --noEmit`
2. Atualizar `docs/03_DIARIO_DE_BORDO.md`
3. Salvar contexto na memória MCP
4. Reportar ao Tech Lead o que foi feito e o próximo passo

**Ao encontrar bug não listado:**
1. Consultar `docs/04_ERROS_E_SOLUCOES.md`
2. Descrever ao Tech Lead, propor solução, aguardar autorização
3. Após resolver: documentar em `docs/04_ERROS_E_SOLUCOES.md`

---

## CRONOGRAMA RESUMIDO

| Sprint | Foco | Esforço | Status |
|--------|------|---------|--------|
| Sprint 0 | BUG-C1 + MinIO + docker-compose | 1–2 dias | ⬜ Pendente |
| Sprint 1 | REQ-01/03/04/05 (schema aluno) | 2–3 dias | ⬜ Pendente |
| Sprint 2 | REQ-08/09/10 (financeiro + calendário) | 4–5 dias | ⬜ Pendente |
| Sprint 3 | REQ-11/12/13/14 (relatórios + 2FA) | 4–5 dias | ⬜ Pendente |
| Sprint 4 | REQ-06 + notificações + CI/CD | 5–7 dias | ⬜ Pendente |

**Total estimado:** 16–22 dias de desenvolvimento

**Bloqueadores externos:**
- Template PDF do Robert → necessário para Sprint 3 (REQ-11)
- Planilha de despesas CLT do Robert → necessário para Sprint 2 (REQ-09)

---

*Gravity 2.0 · Sistema Upgrade · RR TECNOL · Gerado em 15/03/2026*
*"Move fast, break nothing, ship quality."*
