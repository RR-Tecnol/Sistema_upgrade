# Sistema UPGRADE — Gestão de Cursos Itinerantes

Sistema completo de gestão WEB para os programas **Qualifica Maranhão** e **Qualifica Piauí** — capacitação profissional itinerante em unidades móveis (carretas).

**Branch de trabalho atual:** `nuevo` · último commit relevante: **`6576564`** (2026-05-20) — ver [`docs/ATUALIZACOES-COMMIT-6576564.md`](docs/ATUALIZACOES-COMMIT-6576564.md) (documentação completa).

---

## Visão geral

Sistema **multi-portal** com 4 perfis de acesso:

| Portal | Perfil | Descrição |
|--------|--------|-----------|
| `/admin/*` | ADMIN | Gestão completa do sistema |
| `/teacher/*` | PROFESSOR | Frequência, reembolsos, certificados |
| `/driver/*` | MOTORISTA | Viagens, ponto, manutenção, imprevistos |
| `/student/*` | ALUNO | Turmas, frequência, inscrições, certificados |

---

## Stack tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Backend** | NestJS (TypeScript) + Prisma ORM |
| **Banco de dados** | PostgreSQL 15 (Docker) |
| **Cache** | Redis 7 (Docker) |
| **Auth** | JWT + Passport (access + refresh) + 2FA |
| **Frontend** | Next.js 14 App Router + React 18 + TypeScript |
| **Estilo** | CSS + Orbitron + Inter (tema Upgrade amarelo `#FFD600`) |
| **Armazenamento** | MinIO (fotos, anexos, hodômetro) |
| **Deploy** | Docker Compose + Nginx (`docker-compose.prod.yml`) |

---

## Quick start — instalação local

### 1. Pré-requisitos

- [Node.js 18+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (PostgreSQL + Redis)
- [Git](https://git-scm.com/)

### 2. Clone e branch

```bash
git clone https://github.com/RR-Tecnol/Sistema_upgrade.git
cd Sistema_upgrade
git checkout nuevo
```

### 3. Banco (Docker)

```bash
docker compose up -d
```

PostgreSQL `5432` · Redis `6379` · MinIO `9010` / consola `9011` (se configurado no compose).

### 4. Backend

```bash
cd backend
cp .env.example .env   # ajustar DATABASE_URL, JWT, MinIO, etc.
npm install
npx prisma generate
# Se o banco já existir sem histórico Prisma: npx nest start --watch
# Banco novo: npx prisma migrate deploy && npm run prisma:seed
npm run start:dev      # ou: npx nest start --watch (pula migrate automático)
```

Porta padrão no código: **3001** (use `PORT=3002` no `.env` se preferir alinhar ao frontend example).

### 5. Frontend

```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001/api  (ou 3002, conforme PORT do backend)
npm install
npm run dev    # http://localhost:3010
```

### 6. URLs locais

| Serviço | URL |
|---------|-----|
| **Frontend** | http://localhost:3010 |
| **API** | http://localhost:3001/api (ou porta do `PORT` no backend) |
| **Swagger** | http://localhost:3001/api/docs |
| **Prisma Studio** | `cd backend && npx prisma studio` |

### 7. Validação antes de commit/deploy

```bash
cd backend && npm run validate:vps
```

Executa: `prisma validate` + `generate` + build backend + scripts de verificação + build frontend + `migrate status`.

Scripts individuais (`cd backend`):

| Comando | O que valida |
|---------|----------------|
| `npm run motor:verify` | Motor letivo (carga horária → dias letivos → fim de turma) |
| `npm run penalty:verify` | Imprevisto colaborador → diária / próxima viagem motorista |
| `npm run acao-custo:verify` | Custos do período (abastecimento/despesa) → Contas a pagar |
| `npm run maintenance:verify` | Manutenção de carreta → Contas a pagar (incl. campo **cidade**) |
| `npm run acoes:verify` | API de períodos de curso (`GET /acoes`) + estatísticas |
| `npm run tracking:verify` | Rastreamento motorista + km/progresso alinhados ao período |
| `npm run employee-contract:verify` | CLT vs diária (aprovação RH + custo no período) |
| `npm run db:baseline:local` | Baseline Prisma em DB legado (P3005) |
| `npm run db:hotfix:acao-departure` | Hotfix coluna `driverDepartureDate` |

Guia de deploy: [`docs/AUDITORIA/DEPLOY-BRANCH-NUEVO.md`](docs/AUDITORIA/DEPLOY-BRANCH-NUEVO.md)

---

## Credenciais de teste (seed)

| Perfil | Email | Senha | Entrada |
|--------|-------|-------|---------|
| **Admin** | `admin@qualifica.com` | `RR@@Upgrade` | `/admin/dashboard` |
| **Professor** | `maria.professora.visual@qualifica.com` | `RR@@Upgrade` | `/teacher/dashboard` |
| **Motorista** | `joao.driver.test99@qualifica.com` | `RR@@Upgrade` | `/driver/dashboard` |
| **Aluno** | `aluno@qualifica.com` | `RR@@Upgrade` | `/student/dashboard` |

Detalhes e outros utilizadores: [`docs/SEEDS_GUIDE.md`](docs/SEEDS_GUIDE.md)

---

## Changelog — branch `nuevo`

### Commit `ae9eef6` — *Correcoes-para-vps* (19/05/2026)

Pacote principal de correções mapeadas na auditoria VPS (BUG/MEL). Destaques:

#### Infraestrutura, auth e anexos

- URLs públicas MinIO via nginx (`/storage/`) — `minio-browser-url.util`, políticas de bucket, upload público (`public-upload`)
- Reembolsos, imprevistos, estoque e alunos: presigned URLs e pré-visualização no browser
- Bypass MFA só em localhost (`auth-localhost-bypass.util`); examples de produção com bypass desligado
- Paginação admin padronizada (`pagination.util`) — doc em `docs/AUDITORIA/PAGINACAO-ADMIN.md`

#### Período de curso (Ação), turma e motor letivo

- Wizard de período (`AcaoPeriodWizard`, passos básico/localização/logística/turma)
- Motor letivo: carga horária → N encontros → data fim (`teaching-calendar`, `course-workload-audit`, `class-teaching-end-date`)
- Sincronia curso ↔ período ↔ turma ↔ professores (`academic-ecosystem-sync`, `teacher-academic-link`, `resolve-teacher`)
- Feriados: catálogo nacional/estadual, vínculo à ação (`holiday-catalog`, `brazil-national-holidays`)
- Painel calendário letivo no admin (`TeachingCalendarMotorPanel`)
- Migrations: checkout motorista (MEL-07), `trip.classId`, feriados globais, feriado por ação, motor de ensino na ação, estoque mínimo por carreta

#### Viagens e motorista

- Geração ida/volta por turma com datas canónicas (`class-trip-origin`, `generateTripsForClass`)
- Fotos de hodômetro (presign driver/admin), auditoria de viagem no admin
- Portal motorista: reembolsos, imprevistos, manutenção, rota — layout e uploads alinhados ao admin

#### Estoque

- Hub de estoque (GSR), movimentações, solicitações, auditoria de item
- **Kit de insumos** e **baixa de estoque** por ação (`KitInsumosEditor`, `BaixaEstoqueEditor`)
- Página `/admin/estoque/baixa-acao` (lista de períodos para fechamento)

#### Financeiro e RH

- Contas a pagar: perfis, tipos de conta, comprovantes, notificações de listagem
- Diárias de funcionários no período, vínculo equipe (`AcaoEquipeVinculoPanel`)
- Certificados: templates, coordenadas, fluxo de emissão

#### Documentação de auditoria

- `docs/AUDITORIA/` — mapa BUG-01…21, sprints, arquitetura API, sincronia curso/período/turma, deploy branch nuevo

---

### Commit `6576564` — *feat: CLT/diária, fotos MinIO, manutenção com cidade e rastreamento* (20/05/2026)

**Documentação completa:** [`docs/ATUALIZACOES-COMMIT-6576564.md`](docs/ATUALIZACOES-COMMIT-6576564.md)

Resumo (72 ficheiros):

| Área | Implementação |
|------|----------------|
| **Custos do período → Contas a pagar** | `acao-custo-conta-pagar.util` + `acoes.service` |
| **Imprevisto colaborador → diária** | `absence-employee-penalty.util` + preview admin |
| **Manutenção carreta → Contas a pagar** | `truck-maintenance-conta-pagar.util` + **cidade** obrigatória |
| **Motorista — próxima viagem** | `driver-trips.ts`, aceite/início no dia certo |
| **Data de partida ida** | `driverDepartureDate` + migration `20260519130000` |
| **Layout motorista/professor** | Largura total em frequência/viagens |
| **Baixa de estoque — UI** | `BaixaEstoqueEditor` tema Upgrade |
| **Validação** | `validate:vps` + scripts `*:verify` |
| **CLT vs diária** | Aprovação RH + custo no período |
| **Fotos MinIO** | `resolve-stored-media-url` + reembolsos |
| **Rastreamento/OSRM** | `routing/`, `DriverLocationSync`, mapa admin |

**Migrations:** `20260519130000_acao_driver_departure_date`, `20260520160000_truck_maintenance_cidade`

---

### Maio/2026 — RH, fotos, manutenção, mapa e rastreamento (detalhe)

| Área | Implementação |
|------|----------------|
| **Funcionários — CLT vs diária** | Na aprovação do cadastro (`/admin/funcionarios` → pendentes): escolher **CLT** (salário mensal) ou **Diária** (PJ/Freelance). Backend: `approve-registration.dto`, `employee-period-payment.util`. No período de curso, vínculo usa salário proporcional + passagens (CLT) ou dias × diária. Painel `AcaoEquipeVinculoPanel` adaptado. |
| **Fotos de perfil (MinIO)** | URLs normalizadas para browser/VPS: `resolve-stored-media-url.util` (backend), `resolve-media-url.ts` (frontend). Lista de funcionários, aprovação (selfie → `Employee` + `Teacher.photoUrl`) e **detalhe de reembolso** (`requester-photo.util` + `photoUrl` no modal). |
| **Manutenção — cidade** | Campo **Cidade** obrigatório no formulário (admin e motorista). Migration `20260520160000_truck_maintenance_cidade`; preenche `ContaPagar.cidade` (evita `--` na tabela). |
| **Rastreamento e mapa** | Progresso/km do motorista alinhados ao período (`trip-planned-distance.util`, `driver-location`). Proxy OSRM `GET /api/routing/driving` — rotas no mapa admin seguem ruas (não linha reta). GPS ao abrir portal motorista (`DriverLocationSync`). |
| **Data partida ida** | `Acao.driverDepartureDate` — ver migration `20260519130000` e troubleshooting abaixo. |

**Migrations novas (aplicar na VPS após deploy):**

- `20260519130000_acao_driver_departure_date`
- `20260520160000_truck_maintenance_cidade`

**Variáveis VPS importantes para fotos/anexos:**

- `MINIO_PUBLIC_BROWSER_URL` — ex.: `https://seudominio.com.br/storage` (nginx → MinIO)
- Frontend: `NEXT_PUBLIC_STORAGE_URL` (opcional, mesmo prefixo `/storage`)

---

## Módulos implementados (resumo)

| Portal | Módulo | Status |
|--------|--------|--------|
| Admin | Cursos, turmas, inscrições (Kanban), alunos | ✅ |
| Admin | Período de curso (wizard), equipe/diárias, custos do período | ✅ |
| Admin | Feriados (catálogo + ação), motor letivo / calendário | ✅ |
| Admin | Estoque (hub, kit, **baixa por ação**, movimentações) | ✅ |
| Admin | Viagens (ida/volta, hodômetro, auditoria) | ✅ |
| Admin | Contas a pagar (tipos, vínculos custo/manutenção/penalidade) | ✅ |
| Admin | Carretas, manutenção (**cidade** → contas), funcionários (**CLT/diária**) | ✅ |
| Admin | Imprevistos (penalidade → diária), reembolsos (**foto solicitante**), relatórios | ✅ |
| Admin | Mapa ao vivo / rotas OSRM, rastreamento motoristas | ✅ |
| Teacher | Dashboard, frequência por turma, histórico, reembolsos | ✅ |
| Driver | Dashboard, viagens (aceite + ida/volta), ponto entrada/saída | ✅ |
| Driver | Reembolsos, imprevistos, manutenção, rota, veículo | ✅ |
| Student | Turmas, frequência, inscrições, certificados, perfil | ✅ |
| Sistema | JWT + 2FA, notificações, auditoria, MinIO/nginx | ✅ |

---

## Estrutura do projeto

```
Sistema_upgrade/
├── backend/
│   ├── prisma/                 # schema + migrations
│   ├── scripts/
│   │   ├── validate-vps-deploy.sh
│   │   ├── baseline-and-migrate-local.sh
│   │   ├── verify-teaching-motor.ts
│   │   ├── verify-absence-employee-penalty.ts
│   │   ├── verify-acao-custo-conta-pagar.ts
│   │   ├── verify-truck-maintenance-conta-pagar.ts
│   │   ├── verify-acoes-api.ts
│   │   ├── verify-live-tracking.ts
│   │   └── verify-employee-contract-approval.ts
│   └── src/
│       ├── acoes/              # Períodos de curso
│       ├── classes/            # Turmas + motor letivo
│       ├── trips/              # Viagens motorista
│       ├── driver-location/    # GPS + progresso mapa admin
│       ├── routing/            # Proxy OSRM (rotas no mapa)
│       ├── stock/              # Estoque + reservas + baixa
│       ├── truck-maintenance/
│       ├── employees/          # RH + aprovação CLT/diária
│       ├── reimbursement/
│       ├── absences/           # Imprevistos
│       ├── contas-pagar/
│       ├── holiday/
│       ├── public-upload/
│       └── common/             # calendário, MinIO, employee-period-payment, …
├── frontend/
│   ├── app/                    # admin | teacher | driver | student
│   ├── components/estoque/     # BaixaEstoqueEditor, KitInsumosEditor, …
│   ├── components/driver/      # DriverLocationSync
│   └── lib/
│       ├── driver-trips.ts     # Ordenação ida/volta motorista
│       ├── resolve-media-url.ts
│       └── api/
├── docs/
│   ├── INDEX.md
│   ├── AUDITORIA/              # Bugs VPS, deploy, sincronia
│   ├── sistema-atual/          # Documentação técnica canónica
│   └── SEEDS_GUIDE.md
├── docker-compose.yml
├── docker-compose.prod.yml
├── nginx/sistemaupgrade.conf
└── README.md
```

---

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [`docs/INDEX.md`](docs/INDEX.md) | Índice geral da documentação |
| [`docs/sistema-atual/README.md`](docs/sistema-atual/README.md) | Arquitetura e fluxos (fonte técnica) |
| [`docs/AUDITORIA/README.md`](docs/AUDITORIA/README.md) | Auditoria VPS (BUG-01…21) |
| [`docs/ATUALIZACOES-COMMIT-6576564.md`](docs/ATUALIZACOES-COMMIT-6576564.md) | **Todas as atualizações** commit `6576564` (completo) |
| [`docs/AUDITORIA/DEPLOY-BRANCH-NUEVO.md`](docs/AUDITORIA/DEPLOY-BRANCH-NUEVO.md) | Validar, commit, deploy VPS |
| [`docs/AUDITORIA/SINCRONIA-CURSO-PERIODO-TURMA.md`](docs/AUDITORIA/SINCRONIA-CURSO-PERIODO-TURMA.md) | Curso, período, turma, viagens |
| [`docs/SEEDS_GUIDE.md`](docs/SEEDS_GUIDE.md) | Seeds e credenciais de desenvolvimento |

---

## Deploy VPS (resumo)

1. `git pull origin nuevo`
2. `backend/.env` produção — `AUTH_BYPASS_MFA=false`, `NODE_ENV=production`, URLs corretas
3. `frontend/.env.local` a partir de `frontend/.env.production.example` **antes** do build
4. Nginx: `nginx/sistemaupgrade.conf`
5. `docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy`  
   (inclui `driverDepartureDate`, `truck_maintenance.cidade`, etc.)
6. Rebuild backend + frontend
7. Conferir `MINIO_PUBLIC_BROWSER_URL` e testar foto (funcionário + reembolso) e cidade em manutenção → Contas a pagar

Checklist completo: [`docs/AUDITORIA/DEPLOY-BRANCH-NUEVO.md`](docs/AUDITORIA/DEPLOY-BRANCH-NUEVO.md)

---

## Troubleshooting

### «Falha ao carregar períodos de curso» (admin `/admin/acoes`)

O backend devolve **500** em `GET /api/acoes` quando o Postgres não tem a coluna `acoes.driverDepartureDate` (schema Prisma mais novo que o banco).

**Sintoma nos logs:** `The column acoes.driverDepartureDate does not exist in the current database`

**Correção rápida (só coluna em falta):**

```bash
cd backend && npm run db:hotfix:acao-departure
```

**Banco legado sem `_prisma_migrations` (P3005 no `migrate deploy`):**

```bash
cd backend && npm run db:baseline:local
```

Isso cria o histórico Prisma, aplica SQL incremental pendente e marca as 35 migrations como aplicadas. Depois:

```bash
npm run acoes:verify   # Prisma + GET /acoes + estatísticas
```

Em VPS com histórico Prisma OK: `npx prisma migrate deploy`. Recarregue a página após aplicar.

### Erro Next.js `Cannot find module './1682.js'` (dev)

Cache de build corrompido em `frontend/.next` (comum após muitas alterações).

```bash
cd frontend
rm -rf .next
npm run dev
```

### Fotos de perfil quebradas (funcionários / reembolsos)

- Sintoma: iniciais no lugar da foto, ou imagem 404.
- Causa típica na VPS: URL MinIO com host interno (`minio:9000`) ou falta de `MINIO_PUBLIC_BROWSER_URL` / proxy `/storage`.
- Verificar upload em cadastro público (`POST /api/public/upload`) e variáveis no `backend/.env` e `docker-compose.prod.yml`.
- Após deploy, testar um cadastro novo e abrir a selfie na aprovação em **Funcionários**.

### Manutenção sem cidade em Contas a pagar (`--`)

Registros antigos não têm `cidade` — editar a manutenção e preencher **Cidade**, ou criar novas com o campo obrigatório (migration `20260520160000`).

---

## Pendências conhecidas

| Item | Notas |
|------|--------|
| **Migrations em DB legado** | Use `npm run db:baseline:local` uma vez; depois `npm run start:dev` e `migrate deploy` funcionam normalmente |
| **Regenerar viagens** | Após `driverDepartureDate`, períodos antigos podem precisar regenerar PLANNED |
| **Fotos legadas** | Funcionários aprovados antes do fix podem precisar reenviar selfie ou corrigir URL no banco |
| **ESLint** | Sem config no repo; validar com `npm run build` |
| **Dark theme** | Resíduos em algumas telas teacher (cosmético) |

---

## Licença

Propriedade da **Upgrade** — Todos os direitos reservados.

Desenvolvido para **Qualifica Maranhão** e **Qualifica Piauí**.
