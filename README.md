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
| Admin | Reembolsos, Contas a Pagar, Relatórios | ✅ |
| Admin | Dashboard (KPIs), Histórico (Auditoria), Configurações | ✅ |
| Teacher | Dashboard, Frequência, Histórico | ✅ |
| Teacher | Reembolsos, Certificados | ✅ |
| Driver | Dashboard, Viagens, Minha Rota | ✅ |
| Driver | Manutenção (cards + modal detalhes), Reembolsos, Imprevistos | ✅ |
| Student | Dashboard, Minhas Turmas, Frequência (calendário) | ✅ |
| Student | Inscrições, Certificados, Meu Perfil | ✅ |
| Sistema | Autenticação JWT + 2FA, Notificações em tempo real | ✅ |

---

## 📚 Documentação

| Arquivo | Conteúdo |
|---------|---------|
| [`docs/INDEX.md`](docs/INDEX.md) | **Índice** — por onde começar (AFAZERES, research, sistema-atual) |
| [`docs/sistema-atual/README.md`](docs/sistema-atual/README.md) | **Fonte de verdade técnica** — arquitetura, fluxos, dados, integrações, bypasses |
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
