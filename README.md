# 🚀 Sistema UPGRADE — Gestão de Cursos Itinerantes

Sistema completo de gestão WEB para os programas **Qualifica Maranhão** e **Qualifica Piauí** — projetos de capacitação profissional itinerantes operados pela empresa Upgrade através de unidades móveis (carretas/caminhões).

## 🎯 Visão Geral

Sistema 100% **WEB RESPONSIVO** para gestão completa de:

- 📚 **Cursos e Turmas** — 8 tipos de cursos, multicurso, vagas reserva
- 🚛 **Frota de Carretas** — controle de disponibilidade e manutenção
- 📝 **Inscrições Online** — formulário completo com perfil socioeconômico
- ✅ **Frequência Digital** — registro por aula, touch-friendly
- 👨‍🎓 **Portal do Aluno** — turmas, frequência, certificados
- 🎓 **Certificação Digital** — geração automática com QR Code verificável
- 📊 **Relatórios Governamentais** — PDF de frequência e concludentes
- 💰 **Módulo Financeiro** — contas a pagar, reembolsos, payroll CLT
- 📅 **Feriados & Imprevistos** — recálculo automático de datas de aula
- ⚙️ **Configurações** — perfil admin, notificações, segurança

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Backend** | NestJS (TypeScript) + Prisma ORM |
| **Banco de Dados** | PostgreSQL 15 (via Docker) |
| **Cache** | Redis 7 (via Docker) |
| **Storage** | MinIO S3-compatible (comprovantes) |
| **Auth** | JWT + Passport (access + refresh token) |
| **Frontend** | Next.js 14 App Router + React 18 + TypeScript |
| **Estilo** | Vanilla CSS + Orbitron + Inter |
| **Container** | Docker + Docker Compose |

---

## 🚀 Quick Start (Instalação Completa)

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

Isso inicia: **PostgreSQL** (5432) · **Redis** (6379) · **MinIO** (9000/9001)

### 4. Configure o Backend

```powershell
cd backend

# Instalar dependências
npm install

# Gerar o Prisma Client
npx prisma generate

# Aplicar as migrations (cria as tabelas)
npx prisma migrate deploy

# Populate o banco com dados iniciais
npm run prisma:seed
```

### 5. Dados de teste (opcional — reembolsos + aluno para certificado)

```powershell
# Ainda dentro de backend/
npm run seed:test
```

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
📚 API Docs available at http://localhost:3002/api/docs
```

> ⚠️ O erro de MinIO (`S3Error: signature mismatch`) ao iniciar é **esperado** se MinIO não estiver configurado — ele **não afeta** o funcionamento do sistema.

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
| [http://localhost:3002/api/docs](http://localhost:3002/api/docs) | Swagger / Documentação da API |
| [http://localhost:5555](http://localhost:5555) | Prisma Studio (rode `npx prisma studio`) |
| [http://localhost:9001](http://localhost:9001) | MinIO Console |

---

## 🔑 Credenciais Padrão

| Perfil | Email | Senha |
|--------|-------|-------|
| **Administrador** | `admin@qualifica.com` | `admin123` |
| **Aluno (teste)** | `aluno@qualifica.com` | `aluno123` |

> Credenciais criadas automaticamente pelo `npm run prisma:seed` + `npm run seed:test`

---

## 📁 Estrutura do Projeto

```
Sistema_upgrade/
├── backend/                  # API NestJS
│   ├── prisma/
│   │   ├── schema.prisma     # Schema do banco (30+ tabelas)
│   │   ├── migrations/       # Histórico de migrations
│   │   ├── seed.ts           # Dados iniciais (admin, grupos, cidades, cursos)
│   │   └── seed-test.ts      # Dados de teste (aluno, reembolsos)
│   ├── src/
│   │   ├── auth/             # JWT Auth
│   │   ├── students/         # Gestão de alunos
│   │   ├── courses/          # Cursos
│   │   ├── classes/          # Turmas
│   │   ├── enrollments/      # Inscrições
│   │   ├── holiday/          # Feriados & Imprevistos
│   │   ├── reimbursement/    # Reembolsos
│   │   ├── reports/          # Relatórios PDF
│   │   ├── certificates/     # Certificados digitais
│   │   ├── acoes/            # Períodos de Curso (Ações)
│   │   ├── contas-pagar/     # Contas a Pagar
│   │   ├── employees/        # Funcionários
│   │   ├── trucks/           # Carretas
│   │   ├── dashboard/        # KPIs e Analytics
│   │   └── settings/         # Configurações do sistema
│   └── package.json
├── frontend/                 # Next.js 14 App Router
│   ├── app/
│   │   ├── admin/            # Área administrativa
│   │   │   ├── alunos/       # Gestão de alunos
│   │   │   ├── cursos/       # Gestão de cursos
│   │   │   ├── turmas/       # Gestão de turmas
│   │   │   ├── certificados/ # Emissão de certificados
│   │   │   ├── reembolsos/   # Gestão de reembolsos
│   │   │   ├── contas-a-pagar/ # Financeiro
│   │   │   ├── feriados/     # Feriados & Imprevistos
│   │   │   ├── relatorios/   # Relatórios governamentais
│   │   │   ├── grupos/       # Grupos/Categorias
│   │   │   ├── acoes/        # Períodos de Curso
│   │   │   ├── funcionarios/ # Funcionários
│   │   │   └── configuracoes/ # Configurações
│   │   └── student/          # Portal do Aluno
│   ├── components/
│   │   ├── admin/            # Header, Sidebar
│   │   └── student/          # Sidebar do aluno
│   └── lib/api/              # Clientes API
├── docs/                     # Documentação completa
├── docker-compose.yml        # Infraestrutura Docker
└── README.md
```

---

## 🔐 Perfis de Usuário

| Perfil | Acesso |
|--------|--------|
| **ADMIN** | Acesso total ao sistema |
| **STUDENT** | Portal do aluno (turmas, frequência, certificados) |

---

## ✅ Módulos Implementados

| Módulo | Status | Observações |
|--------|--------|-------------|
| Autenticação (JWT) | ✅ | Login admin + aluno, refresh token |
| Alunos | ✅ | Cadastro completo, filtro 26 estados |
| Cursos | ✅ | CRUD, multicurso, módulos |
| Turmas | ✅ | Criação com carreta, vagas reserva |
| Inscrições | ✅ | Aprovação/rejeição admin |
| Frequência | ✅ | Por aula, percentual em tempo real |
| Portal do Aluno | ✅ | Turmas com identif., certificados |
| Certificados | ✅ | Geração automática, QR Code verificável |
| Relatórios PDF | ✅ | Frequência + Concludentes (Puppeteer) |
| Feriados | ✅ | Pré-carga 26 feriados nacionais 2025/2026 |
| Reembolsos | ✅ | CRUD, aprovar/rejeitar, sem MinIO |
| Contas a Pagar | ✅ | CRUD, filtros por status, exportar PDF |
| Funcionários | ✅ | Cadastro, payroll CLT |
| Carretas | ✅ | Disponibilidade, manutenção |
| Grupos | ✅ | CRUD, edição e exclusão com modal padrão |
| Dashboard | ✅ | KPIs, gráficos, atividade recente |
| Configurações | ✅ | Perfil admin, nome atualiza header/sidebar |
| Períodos de Curso | ✅ | Gestão completa de ações de campo |

---

## ⚠️ Pendências Conhecidas

| Item | Descrição | Solução |
|------|-----------|---------|
| **BUG-C1** | Encoding de cidades (acentos) | Recriar banco com `LC_COLLATE='pt_BR.UTF-8'` |
| **MinIO** | Upload de comprovantes bloqueado | Configurar variáveis `MINIO_*` no `.env` do backend |
| **Templates PDF** | Visual provisório | Aguardando modelo do Robert para `buildFrequencyHtml()` |

---

## 📚 Documentação

| Arquivo | Conteúdo |
|---------|---------|
| [`docs/SETUP.md`](docs/SETUP.md) | Guia detalhado de instalação |
| [`docs/03_DIARIO_DE_BORDO.md`](docs/03_DIARIO_DE_BORDO.md) | Log narrativo de decisões |
| [`docs/04_ERROS_E_SOLUCOES.md`](docs/04_ERROS_E_SOLUCOES.md) | Troubleshooting |
| [`docs/06_PLANEJAMENTO.md`](docs/06_PLANEJAMENTO.md) | Requisitos e planejamento |
| [`docs/DOCUMENTACAO_COMPLETA.md`](docs/DOCUMENTACAO_COMPLETA.md) | Arquitetura completa |

---

## 📄 Licença

Propriedade da Upgrade — Todos os direitos reservados.

Desenvolvido para os programas **Qualifica Maranhão** e **Qualifica Piauí**.
