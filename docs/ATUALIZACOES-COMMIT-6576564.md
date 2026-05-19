# Atualizações branch `nuevo` — commit `6576564`

**Documento:** registo completo das alterações entregues em maio/2026 para commit, deploy na VPS e testes de aceitação.

| Campo | Valor |
|-------|--------|
| **Branch** | `nuevo` |
| **Commit** | `6576564` |
| **Mensagem** | `feat: CLT/diária, fotos MinIO, manutenção com cidade e rastreamento` |
| **Anterior** | `ae9eef6` (*Correcoes-para-vps*) |
| **Ficheiros** | 72 alterados (+4476 / −919 linhas) |
| **Data de referência** | 2026-05-20 |

---

## Índice

1. [Resumo executivo](#1-resumo-executivo)
2. [Funcionários — CLT vs diária](#2-funcionários--clt-vs-diária)
3. [Fotos de perfil e mídia MinIO](#3-fotos-de-perfil-e-mídia-minio)
4. [Manutenção de carreta — cidade](#4-manutenção-de-carreta--cidade)
5. [Período de curso — custos e integração financeira](#5-período-de-curso--custos-e-integração-financeira)
6. [Imprevisto colaborador — penalidade e diária](#6-imprevisto-colaborador--penalidade-e-diária)
7. [Motorista — viagens, partida e portal](#7-motorista--viagens-partida-e-portal)
8. [Rastreamento ao vivo e mapa OSRM](#8-rastreamento-ao-vivo-e-mapa-osrm)
9. [Migrations de base de dados](#9-migrations-de-base-de-dados)
10. [Scripts de validação automatizada](#10-scripts-de-validação-automatizada)
11. [Variáveis de ambiente](#11-variáveis-de-ambiente)
12. [Checklist de testes manuais](#12-checklist-de-testes-manuais)
13. [Deploy na VPS](#13-deploy-na-vps)
14. [Reparos pós-deploy (dados legados)](#14-reparos-pós-deploy-dados-legados)
15. [Inventário de ficheiros novos](#15-inventário-de-ficheiros-novos)
16. [Como commitar esta documentação](#16-como-commitar-esta-documentação)

---

## 1. Resumo executivo

Este pacote consolida correções e melhorias operacionais identificadas na auditoria VPS e em testes locais, com foco em:

| Área | Problema resolvido | Solução |
|------|-------------------|---------|
| **RH / funcionários** | Aprovação sem distinção CLT/diária; custo errado no período | Fluxo de aprovação com tipo de contrato; cálculo proporcional CLT ou dias × diária |
| **Fotos** | Selfie/avatar 404 ou host `minio:9000` na VPS | Normalização de URLs (`resolve-stored-media-url`, `resolve-media-url`) |
| **Manutenção** | Contas a pagar com cidade `--` | Campo `cidade` obrigatório + migration |
| **Motorista** | Próxima viagem mostrava volta; progresso desalinhado | `driver-trips.ts`, `driverDepartureDate`, GPS e OSRM |
| **Financeiro período** | Custos/manutenção/imprevisto sem conta ou com erro 500 | Utils dedicados + sincronização com `ContaPagar` |
| **Qualidade** | Deploy sem validação repetível | `validate:vps` + 7 scripts `*:verify` |

---

## 2. Funcionários — CLT vs diária

### 2.1 Regra de negócio

- **CLT:** remuneração no período = salário mensal proporcional aos dias trabalhados + passagens (regra por km).
- **Diária (PJ / FREELANCE):** remuneração = `valorDiaria × diasTrabalhados`.
- Na tabela **Contas a pagar**, a descrição distingue: `CLT - Nome` vs `Diária - Nome`.

### 2.2 Fluxo admin — aprovação de cadastro

**Tela:** `/admin/funcionarios` → aba **Pendentes**

1. Administrador abre o pedido de cadastro.
2. Banner **«DEFINIR CONTRATO PARA APROVAÇÃO»**:
   - **CLT:** informar salário mensal (`monthlySalaryCLT`); opcional `travelRuleKm`.
   - **Diária:** escolher PJ ou FREELANCE e informar `dailyCost`.
3. Ao aprovar, o backend persiste `contractType`, `dailyCost` ou `monthlySalaryCLT` no `Employee`.
4. Selfie do cadastro público é copiada para `Employee.photoUrl` e, se existir vínculo, `Teacher.photoUrl`.

**API:** `PATCH /api/employees/registration-requests/:id/approve`  
**Body (DTO):** `ApproveRegistrationDto`

```json
{
  "contractType": "CLT",
  "monthlySalaryCLT": 3500,
  "travelRuleKm": 80
}
```

ou

```json
{
  "contractType": "PJ",
  "dailyCost": 120
}
```

### 2.3 Fluxo admin — vínculo no período de curso

**Tela:** período de curso → equipe → `AcaoEquipeVinculoPanel`

- Ao adicionar funcionário, o sistema usa o contrato já definido na aprovação.
- CLT: painel mostra salário e calcula total do período (não pede diária manual).
- Diária: informa dias e valor diário (ou usa o cadastrado no funcionário).
- `AcoesService.addFuncionario` / `updateFuncionarioDias` chamam `computeFuncionarioPeriodPayment`.

### 2.4 Backend — ficheiros principais

| Ficheiro | Função |
|----------|--------|
| `backend/src/common/employee-period-payment.util.ts` | Cálculo CLT/diária, descrições |
| `backend/src/employees/dto/approve-registration.dto.ts` | Validação do body de aprovação |
| `backend/src/employees/employees.service.ts` | `approveRegistrationRequest`, URLs de foto |
| `backend/src/employees/employees.controller.ts` | Endpoint de aprovação |
| `backend/src/acoes/acoes.service.ts` | Vínculo equipe + `ContaPagar` |
| `backend/src/acoes/dto/create-acao-funcionario.dto.ts` | `valorDiaria` opcional para CLT |

### 2.5 Frontend

| Ficheiro | Função |
|----------|--------|
| `frontend/app/admin/funcionarios/page.tsx` | UI aprovação CLT/diária, cards `/mês` ou `/dia` |
| `frontend/components/admin/acoes/AcaoEquipeVinculoPanel.tsx` | Vínculo no período com fluxo CLT |

### 2.6 Validação

```bash
cd backend && npm run employee-contract:verify
```

---

## 3. Fotos de perfil e mídia MinIO

### 3.1 Problema

Em produção, URLs gravadas com host interno (`http://minio:9000/...`) não abrem no browser. Listagens mostravam iniciais em vez da foto.

### 3.2 Solução

| Camada | Utilitário |
|--------|------------|
| Backend | `resolve-stored-media-url.util.ts` — reescreve host com `MINIO_PUBLIC_BROWSER_URL` |
| Backend | `requester-photo.util.ts` — foto do solicitante em reembolsos |
| Frontend | `resolve-media-url.ts` — mesma lógica no cliente |

**Pontos integrados:**

- `employees.service` — `findAll`, `findOne`, aprovação
- `reimbursement.service` — enriquece `employee.photoUrl` via Employee/Teacher
- `frontend/app/admin/funcionarios/page.tsx` — cards
- `frontend/app/admin/reembolsos/page.tsx` + `employee-style-admin-detail.tsx` — modal com `photoUrl`

### 3.3 Configuração VPS

```env
# backend (docker-compose.prod.yml ou .env)
MINIO_PUBLIC_BROWSER_URL=https://sistemaupgrade.com.br/storage
```

Nginx deve expor `/storage/` → MinIO `9000`. Ver `nginx/sistemaupgrade.conf`.

### 3.4 Validação

Incluída em `employee-contract:verify` (testes de URL). Teste manual: aprovar cadastro com selfie e abrir reembolso do mesmo funcionário.

---

## 4. Manutenção de carreta — cidade

### 4.1 Regra

- Campo **Cidade** obrigatório quando há custo (`custo > 0`).
- Valor gravado em `TruckMaintenance.cidade` e replicado em `ContaPagar.cidade`.
- Evita exibição `--` na listagem de Contas a pagar.

### 4.2 Telas

| Portal | Rota |
|--------|------|
| Admin | `/admin/carretas/[id]/manutencao` |
| Motorista | `/driver/manutencao` |

### 4.3 Backend

| Ficheiro | Função |
|----------|--------|
| `truck-maintenance.service.ts` | Validação + criação/atualização de conta |
| `truck-maintenance-conta-pagar.util.ts` | Montagem da `ContaPagar` |
| `create-truck-maintenance.dto.ts` | Campo `cidade` |

### 4.4 Migration

`20260520160000_truck_maintenance_cidade` — `ALTER TABLE truck_maintenances ADD COLUMN cidade TEXT`.

### 4.5 Validação

```bash
cd backend && npm run maintenance:verify
```

**Nota:** registos antigos sem cidade continuam com `--` até edição manual.

---

## 5. Período de curso — custos e integração financeira

### 5.1 Custos do período → Contas a pagar

Ao cadastrar **abastecimento** ou **despesa** nos custos da ação:

- Cria `ContaPagar` com tipo adequado (`abastecimento` / `outros`).
- Observações incluem referência `acaoCustoId:` para vínculo.
- Remover custo **desativa** a conta vinculada.
- Abrir período existente faz **backfill** de custos sem conta.

**Ficheiros:** `acao-custo-conta-pagar.util.ts`, `acoes.service.ts`

```bash
cd backend && npm run acao-custo:verify
```

### 5.2 API períodos

```bash
cd backend && npm run acoes:verify
```

Valida Prisma + `GET /api/acoes` + `GET /api/acoes/estatisticas` (requer API no ar).

---

## 6. Imprevisto colaborador — penalidade e diária

### 6.1 Comportamento

Quando um imprevisto de colaborador gera penalidade financeira:

- Reduz valor em conta tipo `diaria_funcionario`, ou
- Regista reembolso devido se a diária já foi paga.
- Admin vê preview antes de confirmar.

**Ficheiros:** `absence-employee-penalty.util.ts`, `absences.service.ts`, `frontend/app/admin/imprevistos/page.tsx`

```bash
cd backend && npm run penalty:verify
```

---

## 7. Motorista — viagens, partida e portal

### 7.1 Data de partida da ida (`driverDepartureDate`)

- Campo opcional em `Acao` — data em que o motorista **sai** para a ida (pode diferir do início da turma).
- Wizard de período e edição de logística expõem o campo.
- `generateTripsForClass` usa `driverDepartureDate ?? class.startDate` para viagem de ida.

**Migration:** `20260519130000_acao_driver_departure_date`

**Hotfix DB legado sem migration:**

```bash
cd backend && npm run db:hotfix:acao-departure
```

### 7.2 Próxima viagem (ida antes da volta)

**Problema:** app mostrava viagem de volta no fim do período.

**Solução:** `frontend/lib/driver-trips.ts` — `pickNextPlannedTrip` escolhe ida (`PLANNED` com menor `departureDate` coerente).

**Telas:** `/driver/dashboard`, `/driver/viagens`

### 7.3 Aceite e início de viagem

- Botões Aceitar/Recusar ocultos após `driverDecision=ACCEPTED`.
- **Iniciar viagem** só após aceite e no **dia** da `departureDate` da viagem exibida.

### 7.4 Layout portal motorista/professor

Frequência, viagens e chamada de turma em **largura total** (removido `max-width` centralizado).

**Ficheiros:** `driver/layout.tsx`, `driver/frequencia/page.tsx`, `teacher/frequencia/[classId]/page.tsx`

### 7.5 Mapa admin — motoristas em rota

- Lista só viagens com status `IN_TRANSIT` (período `EM_ANDAMENTO` sozinho não basta).
- Documentação: `docs/AUDITORIA/SINCRONIA-CURSO-PERIODO-TURMA.md`

---

## 8. Rastreamento ao vivo e mapa OSRM

### 8.1 Progresso e km

- Distância total do período alinhada à rota planeada (`trip-planned-distance.util.ts`).
- `driver-location.service` — performance e localização ativa coerentes com km restante.

### 8.2 Proxy OSRM

**Módulo novo:** `backend/src/routing/`

- `GET /api/routing/driving` — proxy para OSRM (rotas seguem ruas no mapa admin).
- `osrm-route.util.ts`, `routing.controller.ts`, `routing.module.ts`

**Frontend:** `MapaMotoristas.tsx`, `TripRoutePreviewMap.tsx`, `useDriverTracking.ts`

### 8.3 GPS no portal motorista

`DriverLocationSync.tsx` — envia posição ao abrir layout motorista (`driver/layout.tsx`).

### 8.4 Validação

```bash
cd backend && npm run tracking:verify
```

(Requer API + viagem de teste com motorista seed.)

---

## 9. Migrations de base de dados

| Migration | Tabela / coluna | Descrição |
|-----------|-----------------|-----------|
| `20260519130000_acao_driver_departure_date` | `acoes.driverDepartureDate` | Data de saída do motorista (ida) |
| `20260520160000_truck_maintenance_cidade` | `truck_maintenances.cidade` | Cidade da manutenção |

**Aplicar na VPS:**

```bash
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

**Banco legado sem `_prisma_migrations` (erro P3005):**

```bash
cd backend && npm run db:baseline:local
```

---

## 10. Scripts de validação automatizada

### 10.1 Pacote completo (recomendado antes de deploy)

```bash
cd backend && npm run validate:vps
```

| Passo | Ação |
|-------|------|
| 1/8 | `prisma validate` + `generate` |
| 2/8 | `npm run build` (backend) |
| 3/8 | `motor:verify` |
| 4/8 | `penalty:verify` |
| 5/8 | `acao-custo:verify` |
| 6/8 | `maintenance:verify` |
| 7/8 | `npm run build` (frontend) — **parar `next dev` antes** |
| 8/8 | `prisma migrate status` |

### 10.2 Scripts individuais

| Comando | Valida |
|---------|--------|
| `npm run motor:verify` | Motor letivo (carga → dias → fim turma) |
| `npm run penalty:verify` | Imprevisto → diária / próxima viagem |
| `npm run acao-custo:verify` | Custos período → ContaPagar |
| `npm run maintenance:verify` | Manutenção + cidade → ContaPagar |
| `npm run acoes:verify` | API `/acoes` (API no ar) |
| `npm run tracking:verify` | GPS + km + admin (API no ar) |
| `npm run employee-contract:verify` | CLT/diária + URLs mídia (offline) |
| `npm run db:baseline:local` | Baseline Prisma DB legado |
| `npm run db:hotfix:acao-departure` | Coluna `driverDepartureDate` em falta |

**Script shell:** `backend/scripts/validate-vps-deploy.sh`

---

## 11. Variáveis de ambiente

### 11.1 Backend — produção (VPS)

| Variável | Exemplo | Uso |
|----------|---------|-----|
| `MINIO_PUBLIC_BROWSER_URL` | `https://sistemaupgrade.com.br/storage` | Fotos/anexos no browser |
| `AUTH_BYPASS_MFA` | `false` | Segurança produção |
| `NODE_ENV` | `production` | |
| `FRONTEND_URLS` | `https://sistemaupgrade.com.br` | CORS / links |
| `OSRM_BASE_URL` | (se configurado) | Rotas no mapa |

### 11.2 Frontend — produção

| Variável | Uso |
|----------|-----|
| `NEXT_PUBLIC_API_URL` | Base da API |
| `NEXT_PUBLIC_STORAGE_URL` | Opcional; prefixo `/storage` |
| `NEXT_PUBLIC_DEV_AUTH_BYPASS` | **`false`** em build VPS |

### 11.3 Desenvolvimento local

| Variável | Local |
|----------|-------|
| `MINIO_PUBLIC_BROWSER_URL` | Vazio ou comentado |
| `AUTH_BYPASS_MFA` | `true` + localhost em `FRONTEND_URLS` |
| `NEXT_PUBLIC_DEV_AUTH_BYPASS` | `true` no `.env.local` |

---

## 12. Checklist de testes manuais

### RH — funcionários

- [ ] Cadastro público com selfie
- [ ] Aprovar como **CLT** com salário → card mostra `/mês`
- [ ] Aprovar outro como **PJ** com diária → card mostra `/dia`
- [ ] Foto visível na lista (não só iniciais)
- [ ] Vincular CLT em período → descrição `CLT - Nome` em Contas a pagar
- [ ] Vincular diária → `Diária - Nome` e valor = dias × diária

### Manutenção

- [ ] Admin: salvar manutenção **sem cidade** com custo → erro de validação
- [ ] Admin: com cidade → Contas a pagar mostra cidade correta
- [ ] Motorista: mesmo fluxo em `/driver/manutencao`

### Reembolsos

- [ ] Detalhe do reembolso mostra foto do solicitante (se cadastrada)

### Motorista

- [ ] Dashboard: próxima viagem é **ida**, não volta
- [ ] Aceitar → Iniciar só no dia da partida
- [ ] Admin mapa: progresso % coerente após POST localização

### Período de curso

- [ ] Wizard: `driverDepartureDate` salva e reflete na viagem ida
- [ ] Custo abastecimento → aparece em Contas a pagar
- [ ] Imprevisto colaborador → preview penalidade diária

---

## 13. Deploy na VPS

Ordem recomendada (detalhe em [`docs/AUDITORIA/DEPLOY-BRANCH-NUEVO.md`](./AUDITORIA/DEPLOY-BRANCH-NUEVO.md)):

```bash
git pull origin nuevo
# Conferir backend/.env e frontend/.env.local (produção)
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
docker compose -f docker-compose.prod.yml build --no-cache backend frontend
docker compose -f docker-compose.prod.yml up -d
# nginx -t && systemctl reload nginx  (se alterou sistemaupgrade.conf)
```

**Pós-deploy:**

1. Testar foto em Funcionários e Reembolsos.
2. Criar manutenção com cidade → Contas a pagar.
3. Períodos antigos: regenerar viagens PLANNED se datas de ida incorretas (`POST .../regenerate-trips` ou re-vincular motorista).

---

## 14. Reparos pós-deploy (dados legados)

| Situação | Ação |
|----------|------|
| `GET /acoes` retorna 500 — coluna `driverDepartureDate` em falta | `npm run db:hotfix:acao-departure` ou `migrate deploy` |
| Próxima viagem ainda errada após deploy | Regenerar viagens PLANNED do motorista no período |
| Fotos antigas 404 | Reenviar selfie ou corrigir URL; conferir `MINIO_PUBLIC_BROWSER_URL` |
| Manutenção com `--` na cidade | Editar registo e preencher cidade |
| P3005 migrate deploy | `npm run db:baseline:local` (uma vez) |

---

## 15. Inventário de ficheiros novos

### Migrations

- `backend/prisma/migrations/20260519130000_acao_driver_departure_date/migration.sql`
- `backend/prisma/migrations/20260520160000_truck_maintenance_cidade/migration.sql`

### Scripts

- `backend/scripts/validate-vps-deploy.sh`
- `backend/scripts/baseline-and-migrate-local.sh`
- `backend/scripts/ensure-prisma-migrations-table.ts`
- `backend/scripts/verify-absence-employee-penalty.ts`
- `backend/scripts/verify-acao-custo-conta-pagar.ts`
- `backend/scripts/verify-acoes-api.ts`
- `backend/scripts/verify-employee-contract-approval.ts`
- `backend/scripts/verify-live-tracking.ts`
- `backend/scripts/verify-truck-maintenance-conta-pagar.ts`

### Backend — utils e módulos

- `backend/src/common/absence-employee-penalty.util.ts`
- `backend/src/common/acao-custo-conta-pagar.util.ts`
- `backend/src/common/employee-period-payment.util.ts`
- `backend/src/common/requester-photo.util.ts`
- `backend/src/common/resolve-stored-media-url.util.ts`
- `backend/src/common/trip-planned-distance.util.ts`
- `backend/src/common/truck-maintenance-conta-pagar.util.ts`
- `backend/src/employees/dto/approve-registration.dto.ts`
- `backend/src/routing/` (osrm-route, controller, module)

### Frontend

- `frontend/components/driver/DriverLocationSync.tsx`
- `frontend/lib/driver-trips.ts`
- `frontend/lib/resolve-media-url.ts`

---

## 16. Como commitar esta documentação

```bash
cd "/home/DK/Developer/upgrade-vps/Sistema_upgrade-main-atual (3)/Sistema_upgrade-main-atual/Sistema_upgrade-main"

git checkout nuevo

git pull origin nuevo

git add docs/ATUALIZACOES-COMMIT-6576564.md docs/INDEX.md README.md docs/AUDITORIA/README.md docs/AUDITORIA/DEPLOY-BRANCH-NUEVO.md

git status

git commit -m "$(cat <<'EOF'
docs: registo completo das atualizações commit 6576564

Documentação de CLT/diária, MinIO, manutenção+cidade, rastreamento,
migrations, scripts de validação, checklist manual e deploy VPS.
EOF
)"

git push origin nuevo
```

---

## Documentos relacionados

| Documento | Conteúdo |
|-----------|----------|
| [`README.md`](../README.md) | Quick start, changelog resumido, troubleshooting |
| [`docs/INDEX.md`](./INDEX.md) | Índice geral |
| [`docs/AUDITORIA/DEPLOY-BRANCH-NUEVO.md`](./AUDITORIA/DEPLOY-BRANCH-NUEVO.md) | Deploy operacional |
| [`docs/AUDITORIA/SINCRONIA-CURSO-PERIODO-TURMA.md`](./AUDITORIA/SINCRONIA-CURSO-PERIODO-TURMA.md) | Curso, período, viagens |
| [`docs/AUDITORIA/SPRINTS-CORRECAO-VPS.md`](./AUDITORIA/SPRINTS-CORRECAO-VPS.md) | Bugs BUG-01…21 |
| [`docs/SEEDS_GUIDE.md`](./SEEDS_GUIDE.md) | Credenciais de teste |

---

*Última atualização deste ficheiro: 2026-05-20 · branch `nuevo` · commit de referência `6576564`.*
