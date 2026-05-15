# 🚀 Sistema UPGRADE — Gestão de Cursos Itinerantes

Sistema completo de gestão WEB para os programas **Qualifica Maranhão** e **Qualifica Piauí** — projetos de capacitação profissional itinerantes operados pela empresa Upgrade através de unidades móveis (carretas/caminhões).

---

## 🎯 Visão Geral

Sistema **multi-portal** com 4 perfis de acesso:

| Portal | Perfil | Descrição |
|--------|--------|-----------|
| `/admin/*` | ADMIN | Gestão completa do sistema |
| `/teacher/*` | PROFESSOR | Frequência, reembolsos, certificados |
| `/driver/*` | MOTORISTA | Viagens, manutenção, imprevistos |
| `/student/*` | ALUNO | Turmas, frequência, certificados |

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Backend** | NestJS (TypeScript) + Prisma ORM |
| **Banco de Dados** | PostgreSQL 15 (via Docker) |
| **Cache** | Redis 7 (via Docker) |
| **Auth** | JWT + Passport (access + refresh token) |
| **Frontend** | Next.js 14 App Router + React 18 + TypeScript |
| **Estilo** | Vanilla CSS + Orbitron + Inter |
| **Container** | Docker + Docker Compose |

---

## 🚀 Quick Start — Instalação Completa

### 1. Pré-requisitos

- [Node.js 18+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/)
- [Git](https://git-scm.com/)

### 2. Clone o repositório

```powershell
git clone https://github.com/RR-Tecnol/Sistema_upgrade.git
cd Sistema_upgrade
```

### 3. Suba o banco de dados (Docker)

```powershell
docker-compose up -d
```

Inicia: **PostgreSQL** (porta 5432) · **Redis** (porta 6379)

### 4. Configure o Backend

```powershell
cd backend

# Instalar dependências
npm install

# Gerar o Prisma Client
npx prisma generate

# Aplicar migrations (cria todas as tabelas)
npx prisma migrate deploy

# Seed principal — cria admin, cursos, turmas, grupos, cidades
npm run prisma:seed
```

### 5. Seed de Dados de Teste (OBRIGATÓRIO para ver dados no sistema)

```powershell
# Ainda dentro de backend/
# Seed extra — viagens, manutenções, reembolsos, ausências, notificações
npm run seed:extra
```

> 📖 Veja [`docs/SEEDS_GUIDE.md`](docs/SEEDS_GUIDE.md) para entender os seeds e criar novos.

### 6. Inicie o Backend

```powershell
# Windows PowerShell
$env:PORT=3002; npm run start:dev

# Linux/Mac
PORT=3002 npm run start:dev
```

Saída esperada:
```
✅ Database connected successfully
🚀 Server running on http://localhost:3002
📚 API Docs: http://localhost:3002/api/docs
```

> ⚠️ Erro de MinIO é **esperado** e não afeta o funcionamento do sistema.

### 7. Inicie o Frontend

```powershell
cd ../frontend
npm install
npm run dev
```

### 8. Acesse o sistema

| URL | Descrição |
|-----|-----------|
| [http://localhost:3000](http://localhost:3000) | **Sistema (Frontend)** |
| [http://localhost:3002/api/docs](http://localhost:3002/api/docs) | Swagger / API Docs |
| [http://localhost:5555](http://localhost:5555) | Prisma Studio (`npx prisma studio`) |

---

## 🔑 Credenciais de Acesso (Criadas pelo Seed)

| Perfil | Email | Senha | Rota de entrada |
|--------|-------|-------|-----------------|
| **Administrador** | `admin@qualifica.com` | `RR@@Upgrade` | `/admin/dashboard` |
| **Professor** | `maria.professora.visual@qualifica.com` | `RR@@Upgrade` | `/teacher/dashboard` |
| **Motorista** | `joao.driver.test99@qualifica.com` | `RR@@Upgrade` | `/driver/dashboard` |
| **Aluno** | `aluno@qualifica.com` | `RR@@Upgrade` | `/student/dashboard` |

> 🔐 Todas as contas usam a **mesma senha**: `RR@@Upgrade`

---

## 📁 Estrutura do Projeto

```
Sistema_upgrade/
├── backend/                    # API NestJS
│   ├── prisma/
│   │   ├── schema.prisma       # Schema do banco
│   │   ├── migrations/         # Histórico de migrations
│   │   ├── seed-desenvolvimento/
│   │   │   └── seed-full.ts    # Seed principal de desenvolvimento (npm run prisma:seed)
│   │   ├── seed-prod.ts
│   │   └── reset-db.ts         # Uso controlado — pode apagar dados
│   └── src/
│       ├── auth/               # JWT Auth + 2FA
│       ├── students/           # Gestão de alunos
│       ├── courses/            # Cursos
│       ├── classes/            # Turmas
│       ├── enrollments/        # Inscrições
│       ├── attendance/         # Frequência
│       ├── certificates/       # Certificados digitais (QR Code)
│       ├── reimbursement/      # Reembolsos
│       ├── trips/              # Viagens do motorista
│       ├── trucks/             # Carretas
│       ├── truck-maintenance/  # Manutenção de veículos
│       ├── employees/          # Funcionários
│       ├── holiday/            # Feriados & Imprevistos
│       ├── acoes/              # Períodos de Curso
│       ├── contas-pagar/       # Contas a Pagar
│       ├── notifications/      # Notificações em tempo real
│       ├── audit-logs/         # Histórico de auditoria
│       ├── reports/            # Relatórios PDF
│       ├── dashboard/          # KPIs e Analytics
│       └── settings/           # Configurações do sistema
├── frontend/                   # Next.js 14 App Router
│   └── app/
│       ├── admin/              # Portal Administrador
│       ├── teacher/            # Portal Professor
│       ├── driver/             # Portal Motorista
│       └── student/            # Portal Aluno
├── docs/
│   ├── INDEX.md                # Índice: AFAZERES + research + sistema-atual + seeds
│   ├── sistema-atual/          # Documentação canónica (alinhada ao código)
│   ├── mapeamentos/            # Roadmaps temáticos
│   ├── SEEDS_GUIDE.md
│   ├── AFAZERES/               # Backlog e planos de execução
│   └── research/               # Pesquisas (05_reports, etc.)
├── docker-compose.yml
└── README.md
```

---

## 🔐 Perfis de Usuário

| Perfil | Acesso |
|--------|--------|
| **ADMIN** | Acesso total — alunos, turmas, cursos, financeiro, relatórios, configurações |
| **TEACHER** | Frequência, reembolsos, histórico, certificados da turma |
| **DRIVER** | Viagens, manutenção de veículos, reembolsos, imprevistos de rota |
| **STUDENT** | Portal pessoal — turmas, frequência, inscrições, certificados |

---

## ✅ Módulos Implementados

| Portal | Módulo | Status |
|--------|--------|--------|
| Admin | Cursos, Turmas, Inscrições (Kanban) | ✅ |
| Admin | Alunos, Frequência, Certificados | ✅ |
| Admin | Funcionários, Carretas, Grupos | ✅ |
| Admin | Períodos de Curso, Feriados & Imprevistos | ✅ |
| Admin | Viagens (logística, modal auditoria, fotos hodómetro presignadas) | ✅ |
| Admin | Reembolsos, Contas a Pagar, Relatórios | ✅ |
| Admin | **Estoque & Verbas (Insumos, Solicitações, Carretas, Devoluções, Dashboard Financeiro, Catalogação Dinâmica)** | ✅ |
| Admin | Dashboard (KPIs), Histórico (Auditoria), Configurações | ✅ |
| Teacher | Dashboard, Frequência, Histórico | ✅ |
| Teacher | Reembolsos, Certificados | ✅ |
| Driver | Dashboard, Viagens, Minha Rota | ✅ |
| Driver | Manutenção (cards + modal detalhes), Reembolsos, Imprevistos | ✅ |
| Student | Dashboard, Minhas Turmas, Frequência (calendário) | ✅ |
| Student | Inscrições, Certificados, Meu Perfil | ✅ |
| Sistema | Autenticação JWT + 2FA, Notificações em tempo real | ✅ |

---

## 📦 Sprint Estoque — Finalizada

Sprint dedicada ao módulo de **Controle de Estoque, Verbas e Carretas**. Todas as funcionalidades abaixo estão integradas, testadas e em produção.

### Verbas Mensais por Categoria
- **Teto acumulado**: criar uma nova verba para uma categoria/mês existente **soma** ao teto atual em vez de bloquear. Histórico de aportes preservado via PRs adicionais.
- **Gastos pré-verba absorvidos**: PRs aprovadas/recebidas sem `stockBudgetId` (criadas antes da verba existir) são somadas ao teto exibido na barra de consumo (`listStockBudgets.valorPreVerba`). Coerente com o `Valor Total Gasto` do insumo.
- **Devolução credita verba**: movimentações `DEVOLUCAO` (carreta → central) revertem o consumo nos três pontos sensíveis — `listStockBudgets`, `financialDashboard` e validação de "verba esgotada" em `createMovement`. Sem isso, devoluções bloqueavam distribuições legítimas.
- **Botões de ação coloridos** (Ver solicitações azul / Editar dourado / Remover vermelho) maiores e com hover elevado.

### Modal "Aprovar Solicitação" (fluxo Verba)
- **Reaproveitamento de dados do insumo**: ao selecionar um item da lista, preço unitário e fornecedor são auto-preenchidos vindo do cadastro. Fornecedor aparece como badge informativo (não input manual).
- **Quantidade ↔ Total bidirecional**: o banner "Total da Conta a Pagar" virou input editável. Editar Qtd recalcula Total; editar Total recalcula Qtd (mantendo Preço como multiplicador). Resolve casos onde calcular a quantidade exata para um teto era trabalhoso.
- **Dropdown de itens filtrado por categoria**: admin só vê insumos relevantes àquela verba, pré-carregados ao abrir o modal.

### Fluxo Insumo Independente da Verba
- Removido o **auto-link** de `StockBudget` em `createPurchaseRequest`. PRs criadas pelo cadastro de insumo ficam independentes — só linkam à verba quando o frontend manda `stockBudgetId` explícito. Antes, o modal de aprovação mostrava "Verba: X" para PRs que o admin nunca quis associar.
- **Justificativa < 10 chars**: `NovoInsumoWizard` concatena observações curtas com fallback padrão em vez de rejeitar o cadastro.

### Lista de Insumos & Dashboard Financeiro
- Card **"Valor Atual em Estoque"** no expandido de cada item (`quantidadeAtual × precoUnitario`, somente estoque central — não duplica com carretas).
- **Movimentações Recentes**: nova coluna **Valor (R$)** por linha (backend retorna `precoUnitario` em `listMovements`).
- **Dashboard Financeiro** subtrai devoluções de `verbaMensal.consumido` e do ranking `topConsumoMes`.

### Catalogação Dinâmica & Categorias Personalizadas
- **Categorias Customizáveis**: Admin pode criar novas categorias de insumos (ex: "Água", "Peças", "Marketing") definindo nome, ícone e cor específica.
- **Renderização Unificada (`resolveCategoria`)**: Implementado helper centralizado que garante que as categorias personalizadas sejam exibidas corretamente em todos os módulos (Central de Insumos, Verbas Mensais, Solicitações, Estoque do Caminhão e Sidebar de KPIs).
- **Consistência Visual**: Migração completa das constantes fixas (`CATEGORIA_COLOR`, etc.) para um sistema dinâmico baseado em banco de dados, permitindo expansão sem necessidade de novos deploys de código.

### Carreta — Modal de Detalhes & Vínculo com Estoque
- Novo componente **`CarretaDetailModal`** (estilo Inscrições, header escuro com accent color por status).
- Botão **"📦 Detalhes & Estoque"** (o "Ver mais" do estoque) em cada card da página `/admin/carretas`, vinculando diretamente a unidade móvel ao seu inventário físico.
- 2 tabs internas:
  - **Estoque da carreta**: solicitações pendentes, insumos (com valor R$ por item + total da carreta no rodapé do `EstoqueCaminhaoModal`), movimentações recentes — **modo read-only**: apenas os botões Movimentação e Histórico ficam ativos por insumo. Aprovar/rejeitar/editar/desativar ocultos.
  - **Descrição completa**: campos read-only do form de cadastro (identificador, placa, status, tipo, grupo, estado, capacidade, salas, ano, manutenções, equipamentos, observações, foto).
- **Nova movimentação** sempre disponível no footer do modal.

---

## 📚 Documentação

| Arquivo | Conteúdo |
|---------|---------|
| [`docs/INDEX.md`](docs/INDEX.md) | **Índice** — por onde começar (AFAZERES, research, sistema-atual) |
| [`docs/sistema-atual/README.md`](docs/sistema-atual/README.md) | **Fonte de verdade técnica** — arquitetura, fluxos, dados, integrações, bypasses |
| [`docs/sistema-atual/11-modulo-viagens-logistica.md`](docs/sistema-atual/11-modulo-viagens-logistica.md) | **Viagens** — API, auditoria admin, fotos MinIO |
| [`docs/SEEDS_GUIDE.md`](docs/SEEDS_GUIDE.md) | Seeds, comandos e credenciais de desenvolvimento |
| [`docs/AFAZERES/`](docs/AFAZERES/) | Backlog, correcções e planos imediatos |

---

## ⚠️ Pendências Conhecidas (Sprint Atual)

| Item | Descrição |
|------|-----------|
| **KPI Cards** | Ícones quebrados — em correção |
| **Dark Theme** | Resíduo em teacher/reembolsos e teacher/frequencia |
| **Seed Massivo** | Criar seed-master.ts com dados realistas para todos os módulos |
| **Upload Foto** | Falta endpoint backend para persistir foto de perfil |

---

## 📄 Licença

Propriedade da Upgrade — Todos os direitos reservados.

Desenvolvido para os programas **Qualifica Maranhão** e **Qualifica Piauí**.
