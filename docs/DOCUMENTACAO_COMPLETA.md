# 📋 DOCUMENTAÇÃO COMPLETA DO SISTEMA — UPGRADE
> **Plataforma de Qualificação Profissional**
> Versão: 1.0 | Data: Março/2026 | Documento gerado para alinhamento estratégico e auditoria técnica

---

## 1. PROPOSTA E OBJETIVO DO SISTEMA

O **Sistema Upgrade** é uma plataforma digital de gestão de qualificação profissional desenvolvida para administrar os programas **Qualifica Maranhão** e **Qualifica Piauí**. O sistema opera como uma solução completa B2G (Business to Government) que conecta:

- **Cidadãos** que buscam qualificação profissional gratuita
- **Instrutores/Professores** que ministram os cursos
- **Coordenadores e Administradores** que gerenciam as operações
- **Equipes de campo** que operam as carretas itinerantes nos municípios

### Proposta de Valor
- Democratizar o acesso à qualificação profissional no Nordeste brasileiro
- Levar cursos presenciais a municípios via **carretas-escola itinerantes**
- Controle centralizado de inscrições, frequência, certificados e operações logísticas
- Geração de relatórios e analytics para prestação de contas governamental

---

## 2. ARQUITETURA GERAL DO SISTEMA

```
┌────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 14)                       │
│                      localhost:3000                             │
│   ┌──────────────┐   ┌──────────────┐   ┌───────────────────┐  │
│   │  Portal      │   │  Painel      │   │  Área do          │  │
│   │  Público     │   │  Admin       │   │  Aluno            │  │
│   └──────────────┘   └──────────────┘   └───────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              │ HTTP/REST (axios)
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                    BACKEND (NestJS + Prisma)                    │
│                      localhost:3001/api                        │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  JWT Auth  │  REST API  │  Swagger Docs /api/docs        │  │
│   └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  PostgreSQL  │   │  Redis (Cache)   │   │  MinIO (Storage) │
│  porta 5432  │   │  porta 6379      │   │  porta 9000/9001 │
└──────────────┘   └──────────────────┘   └──────────────────┘
```

### Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | Next.js | 14.x |
| Framework de UI | React | 18.x |
| Estilização | TailwindCSS | 3.x |
| HTTP Client | Axios | 1.x |
| Formulários | React Hook Form + Zod | 7.x + 3.x |
| Gráficos | Recharts | 3.x |
| Estado Global | Zustand | 4.x |
| Backend | NestJS | 10.x |
| ORM | Prisma | 5.22.0 |
| Banco de Dados | PostgreSQL | 15 (Alpine) |
| Cache | Redis | 7 (Alpine) |
| Object Storage | MinIO | latest |
| Autenticação | JWT (access + refresh) | — |
| Hash de Senhas | bcrypt | 5.x |
| Documentação API | Swagger/OpenAPI | 11.x |
| Infraestrutura | Docker / Docker Compose | — |
| Linguagem | TypeScript | 5.3 |

---

## 3. ESTRUTURA DE DIRETÓRIOS

```
Sistema_upgrade-main_atual/
├── backend/                   # API NestJS
│   ├── src/
│   │   ├── main.ts            # Ponto de entrada, Swagger, CORS, ValidationPipe
│   │   ├── app.module.ts      # Módulo raiz com todos os imports
│   │   ├── auth/              # Autenticação JWT
│   │   ├── users/             # Gestão de usuários do sistema
│   │   ├── students/          # Alunos + upload de fotos (MinIO)
│   │   ├── courses/           # Catálogo de cursos e módulos
│   │   ├── classes/           # Turmas (instâncias de curso)
│   │   ├── enrollments/       # Inscrições de alunos
│   │   ├── employees/         # Funcionários (motoristas, instrutores, etc.)
│   │   ├── acoes/             # Ações de campo (operações itinerantes)
│   │   ├── trucks/            # Carretas/veículos
│   │   ├── truck-maintenance/ # Manutenção de carretas
│   │   ├── contas-pagar/      # Contas a pagar
│   │   ├── dashboard/         # Analytics e KPIs
│   │   ├── cities/            # Municípios atendidos
│   │   ├── groups/            # Grupos operacionais (MA/PI)
│   │   └── prisma/            # Serviço Prisma singleton
│   ├── prisma/
│   │   └── schema.prisma      # Schema completo (30+ modelos)
│   ├── scripts/               # Scripts utilitários (check-admin, etc.)
│   └── .env                   # Variáveis de ambiente
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx           # Landing page pública (~35k bytes)
│   │   ├── layout.tsx         # Layout raiz com metadados
│   │   ├── globals.css        # Estilos globais (TailwindCSS)
│   │   ├── login/             # Página de login unificada
│   │   ├── cursos/            # Catálogo público de cursos
│   │   ├── inscricao/         # Formulário público de inscrição
│   │   ├── certificado/       # Validação pública de certificados
│   │   ├── admin/             # Painel administrativo (protegido)
│   │   │   ├── dashboard/     # KPIs e gráficos
│   │   │   ├── alunos/        # CRUD de alunos
│   │   │   ├── cursos/        # CRUD de cursos
│   │   │   ├── turmas/        # CRUD de turmas
│   │   │   ├── inscricoes/    # Gestão de inscrições
│   │   │   ├── frequencia/    # Registro de frequência
│   │   │   ├── certificados/  # Emissão de certificados
│   │   │   ├── funcionarios/  # Gestão de funcionários
│   │   │   ├── grupos/        # Grupos operacionais
│   │   │   ├── carretas/      # Gestão de carretas
│   │   │   ├── acoes/         # Ações de campo
│   │   │   ├── relatorios/    # Relatórios gerenciais
│   │   │   ├── contas-a-pagar/# Financeiro
│   │   │   └── configuracoes/ # Configurações do sistema
│   │   └── student/           # Área do aluno (protegida)
│   │       ├── dashboard/     # Painel do aluno
│   │       ├── enrollments/   # Minhas inscrições
│   │       ├── classes/       # Minhas turmas
│   │       ├── attendance/    # Minha frequência
│   │       ├── certificates/  # Meus certificados
│   │       └── profile/       # Meu perfil
│   └── .env                   # Variáveis de ambiente
│
├── docs/                      # Documentação do projeto
├── docker-compose.yml         # Orquestração Docker
└── package.json               # Scripts de orquestração raiz
```

---

## 4. MÓDULOS DO BACKEND (NestJS)

### 4.1 Módulo de Autenticação (`/auth`)

**Responsabilidade:** Controle de acesso, emissão e renovação de tokens JWT.

#### Endpoints

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| POST | `/api/auth/register` | Público | Cadastro de novo usuário |
| POST | `/api/auth/login` | Público | Login por e-mail ou CPF |
| POST | `/api/auth/refresh` | Público | Renovação do access token |
| POST | `/api/auth/logout` | JWT | Invalidar sessão atual |
| GET | `/api/auth/profile` | JWT | Retornar perfil do usuário logado |

#### Fluxo de Autenticação
1. Login aceita **e-mail** ou **CPF** (com ou sem formatação)
2. Verifica na tabela `students` (CPF) ou `users` (e-mail/CPF para ADMIN/COORDINATOR)
3. Gera **access token** (validade: 1h) e **refresh token** (validade: 7d)
4. Refresh token é persistido no banco (`refresh_tokens` table)
5. Logout invalida todos os refresh tokens do usuário

#### Papéis de Usuário (UserRole)
- `ADMIN` — Acesso total ao sistema
- `COORDINATOR` — Gerencia turmas, inscrições e relatórios
- `FINANCIAL` — Acesso ao módulo financeiro
- `TEACHER` — Acessa materiais e frequência das próprias turmas
- `STUDENT` — Acessa portal do aluno

---

### 4.2 Módulo de Cursos (`/courses`)

**Responsabilidade:** Catálogo de cursos, módulos e vinculação de professores.

#### Endpoints

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/api/courses` | JWT | Listar cursos (filtros: state, active, isMulticourse) |
| GET | `/api/courses/:id` | JWT | Detalhes de um curso |
| POST | `/api/courses` | ADMIN/COORD | Criar novo curso |
| PATCH | `/api/courses/:id` | ADMIN/COORD | Atualizar curso |
| DELETE | `/api/courses/:id` | ADMIN | Soft delete (ativa=false) |
| POST | `/api/courses/:id/modules` | ADMIN/COORD | Adicionar módulo ao curso |
| PATCH | `/api/courses/modules/:id` | ADMIN/COORD | Atualizar módulo |
| DELETE | `/api/courses/modules/:id` | ADMIN/COORD | Remover módulo |
| POST | `/api/courses/:id/teachers/:tid` | ADMIN/COORD | Vincular professor |
| DELETE | `/api/courses/:id/teachers/:tid` | ADMIN/COORD | Desvincular professor |

#### Campos do Curso
- `name`, `description`, `syllabus`
- `durationDaysMA`, `durationDaysPI` — duração diferente por estado
- `workloadHours` — carga horária total
- `availableInMA`, `availableInPI` — disponibilidade por estado
- `isMulticourse` — flag para carretas multicurso

---

### 4.3 Módulo de Alunos (`/students`)

**Responsabilidade:** CRUD completo de alunos com perfil socioeconômico e upload de documentos.

#### Controllers
- `StudentsController` — operações do próprio aluno (portal do aluno)
- `AdminStudentsController` — operações administrativas sobre alunos

#### Dados Coletados do Aluno
- **Identificação:** CPF, RG, nome, nome social, data de nascimento, gênero, raça/cor
- **Contato:** e-mail, telefone principal, telefone alternativo, WhatsApp
- **Endereço:** CEP, logradouro, bairro, cidade, estado, zona (urbana/rural)
- **Socioeconômico:** escolaridade, situação de emprego, renda familiar, programa social, deficiência
- **Profissional:** qualificação anterior, objetivo de carreira, motivação, como soube do programa
- **Foto:** upload via MinIO (bucket `student-photos`, leitura pública)

---

### 4.4 Módulo de Turmas (`/classes`)

**Responsabilidade:** Instâncias de cursos com local, datas, vagas e status de ciclo de vida.

#### Status do Ciclo de Vida de uma Turma
`PLANNED` → `ENROLLMENT_OPEN` → `ENROLLMENT_CLOSED` → `IN_PROGRESS` → `COMPLETED` / `CANCELLED`

#### Campos Principais
- `courseId`, `groupId`, `cityId`, `truckId` (carreta alocada)
- `startDate`, `endDate`, `period` (MORNING/AFTERNOON/EVENING)
- `vacancies` — vagas disponíveis
- `classIdentifier` — identificador único da turma
- `enrollmentOpenDate`, `enrollmentCloseDate`

---

### 4.5 Módulo de Inscrições (`/enrollments`)

**Responsabilidade:** Toda a jornada de inscrição do aluno, desde a solicitação até a matrícula efetiva.

#### Status de Inscrição
`PENDING` → `DOCUMENT_PENDING` → `APPROVED` / `REJECTED` / `WAITLIST` / `DROPOUT` / `ENROLLED`

#### Funcionalidades
- Geração automática de **protocolo único** por inscrição
- Upload de documentos (RG frente/verso, CPF, foto, comprovante de endereço, comprovante de escolaridade)
- Coleta de **consentimentos LGPD** (processamento de dados, uso de imagem, termos de uso, política de privacidade) com IP e User-Agent
- Revisão e aprovação/rejeição por coordenadores com justificativa

---

### 4.6 Módulo de Dashboard (`/dashboard`)

**Responsabilidade:** KPIs em tempo real e analytics gerenciais.

#### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dashboard/stats` | Contadores gerais |
| GET | `/api/dashboard/activity` | Atividades recentes |
| GET | `/api/dashboard/upcoming-classes` | Turmas nos próximos 30 dias |
| GET | `/api/dashboard/analytics` | Dados para gráficos |

#### Dados do Analytics
- **Inscrições por mês** (últimos 12 meses) — gráfico de linha
- **Top 10 cursos por número de alunos** — gráfico de barras
- **Distribuição por estado** (MA/PI/Outros) — gráfico de pizza
- **Status das inscrições** (aprovadas/pendentes/lista espera/rejeitadas) — gráfico de pizza
- **Resumo geral:** total de alunos, cursos ativos, turmas, inscrições e ações

---

### 4.7 Módulo de Ações (`/acoes`)

**Responsabilidade:** Planejamento e controle de operações de campo itinerantes.

Uma **Ação** representa uma missão de campo — a carreta vai a um município para realizar cursos.

#### Componentes de uma Ação
- **Dados gerais:** nome, cidade, grupo, carreta, status, datas, local de execução
- **Turmas vinculadas** (`AcaoTurma`): quais turmas ocorrem durante a ação
- **Equipe** (`AcaoEquipe`): usuários do sistema vinculados à ação com função e diária
- **Funcionários** (`AcaoFuncionario`): funcionários externos com valor de diária e dias trabalhados
- **Custos** (`AcaoCusto`): abastecimento (com litros), despesas gerais e diárias de funcionários
- **Contas a Pagar** geradas automaticamente

#### Cálculo de Combustível
A ação possui campos `distanciaKm`, `precoCombustivelL` e `autonomiaKmL` para calcular automaticamente o custo estimado de combustível.

---

### 4.8 Módulo de Carretas (`/trucks`)

**Responsabilidade:** Frota de veículos itinerantes.

#### Tipos de Carreta
- `STANDARD` — Carreta de curso único
- `MULTICOURSE` — Carreta com múltiplas salas/cursos simultâneos

#### Status
`AVAILABLE` | `IN_USE` | `MAINTENANCE` | `INACTIVE`

#### Campos
- `identifier`, `licensePlate`, `type`, `groupId`, `state`
- `capacity` (vagas), `roomsCount` (salas), `status`
- `lastMaintenanceDate`, `nextMaintenanceDate`
- `equipmentList`, `photoUrl`

---

### 4.9 Módulo de Manutenção de Carretas (`/truck-maintenance`)

**Responsabilidade:** Agendamento e controle de manutenções da frota.

#### Tipos de Manutenção
`preventiva` | `corretiva` | `revisao` | `pneu` | `eletrica` | `outro`

#### Status de Manutenção
`agendada` → `em_andamento` → `concluida` / `cancelada`

#### Prioridades
`baixa` | `media` | `alta` | `critica`

#### Integração Financeira
Ao concluir uma manutenção, uma **ContaPagar** é gerada automaticamente (campo `contaPagarId` na manutenção).

---

### 4.10 Módulo de Contas a Pagar (`/contas-pagar`)

**Responsabilidade:** Controle financeiro de despesas operacionais.

#### Status
`pendente` | `paga` | `vencida` | `cancelada`

#### Tipos de Conta
- `pneu_furado`, `abastecimento`, `agua`, `espontaneo` (livre)
- Vinculada opcionalmente a uma **Ação**

---

### 4.11 Módulo de Funcionários (`/employees`)

**Responsabilidade:** Cadastro de colaboradores externos (não usuários do sistema).

#### Cargos (`EmployeeRole`)
`INSTRUCTOR` | `DRIVER` | `COORDINATOR` | `NURSE` | `TECHNICIAN` | `ADMINISTRATIVE` | `OTHER`

#### Departamentos
`ACADEMIC` | `OPERATIONS` | `HEALTH` | `FINANCIAL` | `ADMINISTRATION` | `LOGISTICS`

---

### 4.12 Object Storage — MinIO (`minio.service.ts`)

**Responsabilidade:** Armazenamento de arquivos binários (fotos, documentos, comprovantes).

- **Bucket:** `student-photos`
- **Política:** Leitura pública (`s3:GetObject` para todos)
- **Endpoint:** `http://localhost:9000` (configurável via variáveis de ambiente)
- **Variáveis:** `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
- **Método:** `uploadFile(objectName, buffer, mimeType)` → retorna URL pública
- **Método:** `deleteFile(objectName)` → remoção silenciosa (sem erro se não encontrar)

---

## 5. SCHEMA DO BANCO DE DADOS (Prisma/PostgreSQL)

### 5.1 Diagrama de Entidades Principais

```
User ──────────────────── Student ─── StudentContact
  │                          │─────── StudentAddress
  │                          │─────── StudentSocioeconomic
  │                          │─────── StudentProfessional
  │                          └──────── Enrollment ─── EnrollmentDocument
  │                                         │───────── EnrollmentConsent
  │
  User ─────────────────── Teacher ─── TeacherCourse ─── Course ─── CourseModule
                                │
                                └───── ClassTeacher ─── Class ─── ClassSchedule
                                                          │─────── Enrollment
                                                          │─────── Attendance ─── AttendanceJustification
                                                          └─────── Certificate

Group ─── Truck ─── TruckMaintenance
   │         └───── Trip ─── Expense
   │
   └────── Acao ─── AcaoTurma (→ Class)
               │─── AcaoCusto
               │─── AcaoEquipe (→ User)
               │─── AcaoFuncionario (→ Employee)
               └─── ContaPagar
```

### 5.2 Tabelas e Campos Principais

| Tabela | Descrição | Campos Chave |
|--------|-----------|-------------|
| `users` | Usuários do sistema | id (UUID), email (único), cpf, password (bcrypt), role, active |
| `refresh_tokens` | Tokens de sessão | token (único), userId, expiresAt |
| `students` | Alunos cadastrados | id, userId (1:1), cpf (único), rg, birthDate, gender, raceColor |
| `student_contacts` | Contato do aluno | studentId (1:1), email, phone, hasWhatsapp |
| `student_addresses` | Endereço do aluno | studentId (1:1), cep, street, city, state, zone |
| `student_socioeconomic` | Perfil socioeconômico | educationLevel, employmentStatus, familyIncome, socialProgram |
| `student_professional` | Perfil profissional | careerGoal, motivation, howHeardAbout |
| `teachers` | Professores | userId (1:1), cpf, education, specialties, contractType |
| `courses` | Catálogo de cursos | name, durationDaysMA/PI, workloadHours, availableInMA/PI |
| `course_modules` | Módulos de curso | courseId, moduleName, room, startTime, endTime, order |
| `teacher_courses` | Prof ↔ Curso (N:M) | teacherId, courseId |
| `groups` | Grupos op. (MA/PI) | name (único), state |
| `trucks` | Carretas | identifier, licensePlate, type, groupId, capacity, roomsCount |
| `truck_maintenances` | Manutenções | truckId, tipo, status, prioridade, custoEstimado, custoReal |
| `cities` | Municípios | name, state, ibgeCode |
| `classes` | Turmas | courseId, groupId, cityId, truckId, startDate, endDate, vacancies |
| `class_teachers` | Prof ↔ Turma (N:M) | classId, teacherId, isSubstitute |
| `class_schedules` | Dias de aula | classId, weekday, active |
| `enrollments` | Inscrições | studentId, classId, protocol (único), status |
| `enrollment_documents` | Documentos enviados | enrollmentId, documentType, fileUrl |
| `enrollment_consents` | Consentimentos LGPD | enrollmentId, dataProcessing, imageUse, termsAccepted, ipAddress |
| `attendances` | Frequência diária | classId, studentId, date, present, justified |
| `attendance_justifications` | Justificativas de falta | attendanceId, reason, proofUrl, status |
| `materials` | Material didático | courseId/classId, title, fileUrl, visibility, downloadCount |
| `certificates` | Certificados emitidos | studentId, classId, verificationCode (único), qrCodeUrl, fileUrl |
| `trips` | Viagens das carretas | truckId, originCityId, destinationCityId, status, kmStart/End |
| `expenses` | Despesas de viagem | tripId, truckId, category, amount, status |
| `notifications` | Notificações | userId, type, channel, deliveryStatus |
| `audit_logs` | Log de auditoria | userId, action, tableName, recordId, oldData, newData |
| `system_configs` | Configurações | configKey (único), configValue, dataType |
| `api_keys` | Chaves de API | key (único), permissions (JSON), active, expiresAt |
| `data_deletion_requests` | Requisições LGPD | userId, status (PENDING/PROCESSED) |
| `employees` | Funcionários externos | name, role, department, cpf, dailyCost |
| `acoes` | Ações de campo | nome, cidadeNome, grupoId, carretaId, status, datas |
| `acao_turmas` | Ação ↔ Turma (N:M) | acaoId, turmaId |
| `acao_custos` | Custos da ação | acaoId, tipo, valor, litros (combustível) |
| `acao_equipe` | Equipe da ação | acaoId, userId, funcao, diaria, diasTrabalhados |
| `acao_funcionarios` | Func. externos na ação | acaoId, employeeId, valorDiaria, diasTrabalhados |
| `contas_pagar` | Contas a pagar | tipo_conta, descricao, valor, data_vencimento, status, acaoId |

### 5.3 Enumerações Principais

**Usuário e Aluno:** `UserRole`, `Gender`, `RaceColor`, `MaritalStatus`, `EducationLevel`, `EmploymentStatus`, `SocialProgram`, `DisabilityType`, `Zone`, `FamilyIncome`, `CareerGoal`

**Operacional:** `ClassStatus`, `Period`, `EnrollmentStatus`, `DocumentType`, `TruckType`, `TruckStatus`, `TripStatus`, `ExpenseCategory`, `ExpenseStatus`

**Notificações:** `NotificationType` (13 tipos), `NotificationChannel` (IN_APP, EMAIL, SMS, WHATSAPP), `DeliveryStatus`

**Ações/Financeiro:** `AcaoStatus`, `AcaoCustoTipo`, `ContaPagarStatus`, `CertificateStatus`, `MaterialVisibility`

**Funcionários:** `EmployeeRole`, `EmployeeDepartment`, `ContractType`

---

## 6. APIS E INTEGRAÇÕES

### 6.1 API REST Interna

A comunicação frontend → backend ocorre via **HTTP REST** com autenticação JWT Bearer Token.

- **Base URL:** `http://localhost:3001/api` (desenvolvimento)
- **Documentação Interativa:** `http://localhost:3001/api/docs` (Swagger/OpenAPI)
- **Headers:** `Authorization: Bearer <access_token>`
- **Variável no frontend:** `NEXT_PUBLIC_API_URL=http://localhost:3001/api`

#### Prefixos de Rota
```
/api/auth/*           — Autenticação
/api/users/*          — Usuários
/api/students/*       — Alunos (portal do aluno)
/api/admin/students/* — Alunos (gestão admin)
/api/courses/*        — Cursos
/api/classes/*        — Turmas
/api/enrollments/*    — Inscrições
/api/employees/*      — Funcionários
/api/acoes/*          — Ações de campo
/api/trucks/*         — Carretas
/api/truck-maintenance/* — Manutenções
/api/contas-pagar/*   — Financeiro
/api/dashboard/*      — Analytics
/api/cities/*         — Municípios
/api/groups/*         — Grupos
```

### 6.2 MinIO — Object Storage (S3-Compatible)

Utilizado para armazenamento de arquivos binários. Não é um serviço externo — roda em Docker localmente.

- **API Port:** 9000
- **Console Port:** 9001
- **Protocolo:** S3-Compatible API
- **Buckets:** `student-photos` (leitura pública)
- **Autenticação:** `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` (padrão: `minioadmin`)

### 6.3 Redis — Cache e Sessão

Redis está configurado na infraestrutura Docker, disponível na porta 6379. Utilizado como cache e potencial backend de sessão (biblioteca `minio` npm).

### 6.4 API de CEP (Via Frontend)

O formulário de cadastro de aluno realiza **consulta automática de endereço por CEP** para preencher logradouro, bairro, cidade e estado automaticamente. A integração é feita diretamente no frontend via API pública de CEP (ViaCEP ou similar).

### 6.5 Conexão com IA (Status Atual)

O sistema **não possui integração nativa com IA** na versão atual documentada. No entanto, a arquitetura possui os seguintes preparativos:

- **`api_keys` table:** Modelo de banco com campo `permissions` (JSON) e `expiresAt`, preparado para gerenciar chaves de serviços externos incluindo APIs de IA
- **`audit_logs` table:** Rastreabilidade completa de ações no sistema, podendo alimentar modelos de ML futuramente
- **`system_configs` table:** Configurações dinâmicas do sistema, permitindo ativar/desativar features sem redeploy
- O campo `motivation` (texto livre) e `professionalInterest` nos dados dos alunos são candidatos naturais para análise de NLP

---

## 7. SEGURANÇA E CONFORMIDADE

### 7.1 Autenticação e Autorização
- Senhas hasheadas com **bcrypt** (salt rounds: 10)
- **JWT duplo**: access token (1h) + refresh token (7d) armazenado em banco
- **RBAC** (Role-Based Access Control) via `RolesGuard` e decorador `@Roles()`
- CORS restrito ao domínio do frontend (`FRONTEND_URL` env var)
- `ValidationPipe` global com `whitelist: true` e `forbidNonWhitelisted: true` para prevenir injeção de campos

### 7.2 LGPD — Lei Geral de Proteção de Dados
O sistema possui suporte completo à LGPD:
- **Coleta de consentimentos** explícitos (processamento de dados, uso de imagem, termos)
- **Registro de IP e User-Agent** no momento do consentimento
- **Modelo `DataDeletionRequest`**: gerenciamento de requisições de exclusão de dados
- **Coleta mínima**: apenas dados necessários para o programa são solicitados

### 7.3 Auditoria
- **`AuditLog`**: registra `userId`, `action`, `tableName`, `recordId`, `oldData` (JSON), `newData` (JSON), `ipAddress`, `userAgent`
- Permite rastreabilidade completa de alterações CRUD em qualquer entidade

---

## 8. INFRAESTRUTURA E DEPLOYMENT

### 8.1 Serviços Docker

```yaml
# docker-compose.yml
services:
  postgres:     # PostgreSQL 15-alpine | porta 5432
  redis:        # Redis 7-alpine      | porta 6379
  minio:        # MinIO latest        | porta 9000 (API) e 9001 (Console)
```

### 8.2 Variáveis de Ambiente

**Backend (`backend/.env`)**
```env
DATABASE_URL="postgresql://cursos_user:cursos_password@localhost:5432/cursos_db"
JWT_SECRET=<secret-64-bytes>
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=<refresh-secret>
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
```

**Frontend (`frontend/.env`)**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 8.3 Scripts de Inicialização

```bash
# 1. Subir infraestrutura
docker-compose up -d

# 2. Backend (NestJS)
cd backend && npm run start:dev     # Hot-reload
# ou
cd backend && npm run start:prod    # Produção (requer build)

# 3. Frontend (Next.js)
cd frontend && npm run dev          # Desenvolvimento (hot-reload)
# ou
cd frontend && npm run build && npm start  # Produção

# 4. Criar admin inicial
cd backend && npx ts-node scripts/check-admin.ts
```

### 8.4 Acesso ao Sistema
- **Portal público:** http://localhost:3000
- **Painel admin:** http://localhost:3000/admin
- **Documentação da API:** http://localhost:3001/api/docs
- **MinIO Console:** http://localhost:9001

---

## 9. FUNCIONALIDADES POR PERFIL DE USUÁRIO

### 9.1 Cidadão (Visitante Público)
- Visualizar catálogo de cursos disponíveis
- Filtrar cursos por estado (MA/PI)
- Submeter inscrição online com documentos
- Aceitar termos LGPD durante inscrição
- Validar certificado por código de verificação ou QR Code

### 9.2 Aluno (STUDENT) — Portal do Aluno
- Acompanhar status das inscrições com protocolo
- Ver turmas em andamento e calendário de aulas
- Consultar histórico de frequência
- Baixar/visualizar materiais didáticos das turmas
- Emitir e baixar certificados de conclusão
- Submeter justificativas de faltas
- Editar perfil pessoal

### 9.3 Professor (TEACHER)
- Registrar frequência das turmas atribuídas
- Fazer upload de materiais didáticos
- Visualizar lista de alunos matriculados

### 9.4 Coordenador (COORDINATOR)
- Criar e gerenciar turmas e inscrições
- Aprovar/rejeitar inscrições (com análise documental)
- Visualizar relatórios e analytics
- Gerenciar materiais didáticos
- Emitir certificados

### 9.5 Administrador (ADMIN)
- **Acesso total ao sistema**
- CRUD completo de cursos, turmas, usuários, alunos
- Gerenciar frota de carretas e manutenções
- Planejar e controlar ações de campo (operações itinerantes)
- Gestão financeira (contas a pagar)
- Configurações do sistema
- Gestão de chaves de API
- Processar requisições de exclusão de dados (LGPD)
- Acesso a audit logs

---

## 10. FLUXOS OPERACIONAIS PRINCIPAIS

### Fluxo 1 — Inscrição de Aluno
```
Cidadão acessa /inscricao
    → Preenche dados pessoais + documentos
    → Aceita termos LGPD (IP registrado)
    → Sistema gera protocolo único
    → Status: PENDING
    → Coordenador analisa documentação
    → Aprovação → Status: APPROVED → Student profile criado
    → Rejeição → Status: REJECTED + motivo enviado
```

### Fluxo 2 — Operação de Campo (Ação)
```
Admin cria Ação (nome, município, grupo, carreta)
    → Vincula turmas à ação (AcaoTurma)
    → Adiciona equipe (usuários + funções + diárias)
    → Adiciona funcionários externos (motorista, enfermeiro)
    → Registra custos durante a operação:
        - Abastecimento (litros × preço)
        - Despesas gerais
        - Diárias
    → Ao concluir: mantença/conta a pagar gerada automaticamente
```

### Fluxo 3 — Emissão de Certificado
```
Admin/Coordenador acessa turma concluída
    → Seleciona aluno com frequência mínima aprovada
    → Sistema gera código de verificação único + QR Code
    → Certificate.fileUrl aponta para PDF no MinIO
    → Aluno acessa /certificado?codigo=XXXX para validar publicamente
```

### Fluxo 4 — Manutenção de Carreta
```
Admin registra manutenção (tipo, prioridade, custo estimado)
    → Status: agendada → em_andamento → concluida
    → Ao concluir: ContaPagar gerada com custo real
    → EstadoDeCarreta atualizado (MAINTENANCE → AVAILABLE)
```

---

## 11. PADRÕES DE CÓDIGO

### Backend (NestJS)
- **Arquitetura:** Module → Controller → Service → Prisma
- **DTO:** Todas as entradas validadas com `class-validator` e `class-transformer`
- **Guards:** `JwtAuthGuard` (autenticação) + `RolesGuard` (autorização)
- **Decorators:** `@Roles('ADMIN', 'COORDINATOR')` nos controllers
- **Errors:** `NotFoundException`, `ConflictException`, `BadRequestException` do NestJS
- **Soft Delete:** `active: false` em vez de `DELETE` físico (cursos, usuários)
- **IDs:** UUID v4 gerado pelo Prisma (`@default(uuid())`)

### Frontend (Next.js App Router)
- **Roteamento:** File-based routing via `app/` directory
- **Proteção de rotas:** Verificação de token JWT no layout de admin e student
- **Formulários:** React Hook Form + Zod para validação tipada
- **Estado global:** Zustand para autenticação e estado compartilhado
- **HTTP:** Axios com interceptors para injeção de Bearer token e refresh automático

---

## 12. CONSIDERAÇÕES PARA APRESENTAÇÃO

### Pontos Fortes do Sistema
1. **Cobertura funcional completa** — do cadastro do aluno ao certificado final
2. **Diferencial logístico** — módulo de carretas itinerantes único no segmento
3. **Conformidade LGPD** — sistema pronto para auditoria desde o design
4. **Analytics em tempo real** — dashboard com 5 dimensões de análise
5. **Escalabilidade** — arquitetura Docker-ready, pronta para produção em nuvem
6. **API documentada** — Swagger disponível para integração com outros sistemas governamentais

### Limitadores Atuais / Próximos Passos
1. Integração com e-mail/SMS/WhatsApp para notificações (modelos no banco, envio pendente)
2. Integração com IA para análise de perfil de alunos e predição de evasão
3. App mobile para registro de frequência offline nas carretas (sem internet)
4. Integração com APIs governamentais (IBGE para municípios, CADUNICO para validação socioeconômica)
5. Módulo de relatórios em PDF/Excel para prestação de contas

---

*Documento gerado em: Março/2026 | Sistema Upgrade v1.0*
*Para dúvidas técnicas, consultar este documento em conjunto com a documentação interativa da API em `/api/docs`*
