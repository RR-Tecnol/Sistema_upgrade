# 📘 SOBRE O SISTEMA — Dossiê Técnico Completo
## Sistema Upgrade | RR TECNOL / Qualifica MA/PI/AC
## v2.1 | 07/04/2026 | Atualizado: Dashboard Professor, Certificados PDF, Proxy Next.js

> **Propósito:** Registro técnico exaustivo de toda a base de código real lido.
> Cada módulo, cada lógica, cada conexão entre arquivos documentada aqui.
> Referência única para qualquer desenvolvedor entrar no projeto do zero.
>
> **⚠️ REGRA DE USO:** LEIA ESTE ARQUIVO ANTES DE QUALQUER ALTERAÇÃO NO CÓDIGO.
> Ele é a "fonte única de verdade" do projeto. Consulte as seções relacionadas abaixo.

---

## 🔗 NAVEGAÇÃO INTERNA E REFERÊNCIAS EXTERNAS

### Mapa de Seções deste documento

| Seção | Conteúdo | Doc externa relacionada |
|--------|----------|--------------------------|
| §1 Identidade | Nome, cliente, repo | — |
| §2 Stack | Tecnologias, versões | `SETUP.md` |
| §3 Schema Prisma | Modelos, relacionamentos | `SEEDS_GUIDE.md` |
| §4 Estrutura de Pastas | Arquivos e módulos | — |
| §5 Segurança e Auth | JWT, 2FA, Guards | `LIVRO_DE_REGRAS.md §5` · `ERROS_E_SOLUCOES.md#auth` |
| §6 Mapa de Docs | Protocolo de leitura | `INDEX.md` |
| §7 Fluxo por Perfil | Admin/Professor/Motorista/Aluno | `ESTADO_SISTEMA.md` (status atual) |
| §8 Comunicação entre Perfis | WebSocket, eventos | `LIVRO_DE_REGRAS.md §6` |
| §9 Fluxo de Dados | Clique → banco | `ERROS_E_SOLUCOES.md` |
| §10 Segurança Decisões | LGPD, sessão, manutenção | `seguranca/README.md` |
| §11 Módulos Backend | Acoes, Reembolso, GPS, Dashboard... | `LIVRO_DE_REGRAS.md` (regras de cada módulo) |
| §11.1 Acoes | Lógica de custo, ContaPagar | — |
| §11.2 Reembolso | MinIO presigned, fluxo | `LIVRO_DE_REGRAS.md §4` |
| §11.3 Imprevistos | Ausências multi-perfil | — |
| §11.4 Feriados | ClassHoliday, recalc endDate | — |
| §11.5 Relatórios PDF | pdf.service.ts | `research/05_reports/` |
| §11.6 Configurações | settings.json, parâmetros | — |
| §11.7 Dashboard | KPIs, BI, analytics | `ERROS_E_SOLUCOES.md#analytics` |
| §11.8 GPS / DriverLocation | Tracking, ETA, alertas | `RASTREAMENTO_PRODUCAO_APRESENTACAO.md` |
| §12 Glossário | UI vs banco | `LIVRO_DE_REGRAS.md §9` |
| §13 Enums | Todos os enums do sistema | `LIVRO_DE_REGRAS.md §7` |
| §14 Regras de Negócio | Valores numéricos e limiares | `LIVRO_DE_REGRAS.md §10` |
| §15 Padrões de API | Formatos de resposta por endpoint | `ERROS_E_SOLUCOES.md#frontend` |
| §16 Hooks e Stores | Frontend state, hooks GPS | `REGRAS_RESPONSIVIDADE_PORTAL_MOTORISTA.md` |

### O que ler ANTES de alterar cada parte do sistema

| Parte a alterar | Docs obrigatórias | Docs situacionais |
|-----------------|-------------------|-------------------|
| Qualquer código | `sobre-sistema.md` (este) + `ESTADO_SISTEMA.md` + `LIVRO_DE_REGRAS.md` | `ERROS_E_SOLUCOES.md` |
| Backend NestJS | + `ERROS_E_SOLUCOES.md#nestjs` | Swagger em `:3001/api/docs` |
| Prisma/Schema | + `SEEDS_GUIDE.md` | `LIVRO_DE_REGRAS.md §3` |
| Portal /driver | + `REGRAS_RESPONSIVIDADE_PORTAL_MOTORISTA.md` | `§11.8` deste doc |
| GPS / Mapa | + `RASTREAMENTO_PRODUCAO_APRESENTACAO.md` | `LIVRO_DE_REGRAS.md §8G` |
| Segurança/Auth | + `seguranca/README.md` | `ERROS_E_SOLUCOES.md#auth` |
| Dashboard KPIs | + `ERROS_E_SOLUCOES.md#analytics` | `§11.7` deste doc |
| Upload de arquivo | `LIVRO_DE_REGRAS.md §4` | `§11.2` deste doc |
| Enums/Status | `§13` deste doc | `LIVRO_DE_REGRAS.md §7` |

---

## 1. IDENTIDADE DO SISTEMA

| Campo | Valor |
|-------|-------|
| Nome do produto | Sistema Upgrade (Sistema de Gestão Qualifica) |
| Cliente | Upgrade Tecnologia Educacional / Robert S. Pimentel |
| Desenvolvedor | RR TECNOL — Tech Lead: Davi / Ronaldo Ribeiro |
| Repositório | github.com/RR-Tecnol/Sistema_upgrade.git |
| Diretório local | `C:\Users\Desktop\Downloads\Sistema_upgrade-main_atual` |
| Versão atual | Fase 5 em andamento (rastreamento GPS) |
| Credenciais padrão | `RR@@Upgrade` (todos os perfis de teste) |

**Propósito de negócio:** Plataforma de gestão acadêmica e operacional para o
programa Qualifica MA/PI/AC — cursos itinerantes em carretas-escola levando
educação profissional para cidades do Maranhão, Piauí e Acre.

---

## 2. STACK TECNOLÓGICA COMPLETA

```
BACKEND
  Runtime:        Node.js 18+
  Framework:      NestJS 10.x (@nestjs/common, @nestjs/core ^10.3.0)
  Linguagem:      TypeScript 5.x
  ORM:            Prisma 5.22.0
  Banco:          PostgreSQL 15-alpine (Docker)
  Cache/Sessão:   Redis 7-alpine (Docker, senha: RR@@Upgrade)
  Storage:        MinIO latest (Docker, S3-compatible, porta 9000/9001)
  WebSocket:      Socket.io 4.8.3 via @nestjs/platform-socket.io ^11.1.17
  Auth:           JWT + Passport (@nestjs/jwt ^10.2.0, @nestjs/passport ^10.0.3)
  2FA:            speakeasy (TOTP/RFC 6238) + qrcode
  Validação:      class-validator ^0.14.0 + class-transformer ^0.5.1
  Tarefas Cron:   @nestjs/schedule ^6.1.1
  Hash:           bcrypt ^5.1.1
  Upload:         Multer 2.x + MinIO presigned URLs
  Segurança HTTP: helmet ^8.1.0
  PDF:            puppeteer ^24.39.1
  Docs API:       @nestjs/swagger ^11.2.6

FRONTEND
  Framework:      Next.js ^14.2.0 (App Router)
  Linguagem:      TypeScript 5.x
  UI Base:        CSS customizado em globals.css + Tailwind 3.4 (utilitário)
  Estado global:  Zustand ^4.5.7 com sessionStorage persist
  HTTP Client:    Axios ^1.13.5
  Mapa GPS:       Leaflet ^1.9.4 (vanilla, carregamento dinâmico — sem react-leaflet)
  Ícones:         @heroicons/react ^2.2.0
  Gráficos:       recharts ^3.7.0
  QR Code:        qrcode.react ^4.2.0
  Formulários:    react-hook-form ^7.71.1 + zod ^3.25.76
  WebSocket:      socket.io-client ^4.8.3
  Compressão img: browser-image-compression ^2.0.2
  Fontes:         Orbitron, JetBrains Mono, Inter (Google Fonts via globals.css)

INFRAESTRUTURA
  Containerização: Docker + Docker Compose
  Rede:            cursos-network (bridge)
  Porta backend:   3001
  Porta frontend:  3000
  PostgreSQL:      5432 — cursos_user / cursos_password / cursos_db
  Redis:           6379 — senha: RR@@Upgrade
  MinIO API:       9000 — minioadmin / minioadmin123
  MinIO Console:   9001
```

---

## 3. ESTRUTURA COMPLETA DE DIRETÓRIOS

```
Sistema_upgrade-main_atual/
├── docker-compose.yml          ← PostgreSQL 15 + Redis 7 + MinIO
├── package.json                ← raiz (monorepo leve)
├── fix-bom.ps1                 ← remove BOM de arquivos .ts/.tsx
├── fetch-osrm.js               ← script utilitário OSRM (não é prod)
│
├── backend/                    ← NestJS 10 API
│   ├── src/
│   │   ├── main.ts             ← Bootstrap: porta 3001, CORS, ValidationPipe, helmet, maintenance middleware
│   │   ├── app.module.ts       ← Módulo raiz com todos os imports
│   │   ├── prisma/
│   │   │   └── prisma.service.ts ← PrismaClient singleton (@Global, OnModuleInit)
│   │   ├── auth/               ← JWT + Passport + 2FA
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts   ← POST /auth/login|register|refresh|logout|2fa/*
│   │   │   ├── auth.service.ts      ← validateUser, login (CPF ou email), generateTokens, 2FA
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts  ← ExtractJwt.fromAuthHeaderAsBearerToken, validate(payload.sub)
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts  ← AuthGuard('jwt') + suporte a @Public()
│   │   │   │   └── roles.guard.ts     ← verifica ROLES_KEY na metadata via Reflector
│   │   │   └── decorators/
│   │   │       ├── roles.decorator.ts  ← @Roles(...roles)
│   │   │       └── public.decorator.ts ← @Public() para rotas sem auth
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts     ← GET /users/me, PATCH /users/me, UserPreferences
│   │   │   ├── users.service.ts        ← findById, updateProfile, registerCheckin, getCheckins
│   │   │   └── teachers.controller.ts  ← POST /teachers/me/checkin, GET /teachers/me/checkins
│   │   ├── dashboard/
│   │   │   ├── dashboard.module.ts
│   │   │   ├── dashboard.controller.ts ← GET /dashboard/stats|analytics|upcoming|rotas-bi
│   │   │   └── dashboard.service.ts    ← getOverallStats, getAnalytics(BUG-DASH-01/02 fixes), getRotasBi
│   │   ├── courses/            ← CRUD completo de cursos
│   │   ├── classes/            ← CRUD de turmas + filtros por status/teacherUserId
│   │   ├── enrollments/        ← Inscrições + fluxo de estados Kanban
│   │   ├── students/           ← Portal do aluno, endereço, dados socioeconômicos
│   │   ├── attendance/         ← Frequência de alunos com data UTC
│   │   ├── employees/          ← CRUD funcionários + EmployeeAttendance
│   │   ├── reimbursement/      ← Reembolsos com MinIO presigned URL
│   │   ├── absences/           ← Imprevistos multi-perfil
│   │   ├── certificates/       ← Certificados digitais com QR Code + MinIO
│   │   ├── trucks/             ← CRUD carretas
│   │   ├── trips/              ← Viagens: PATCH /:id/start, /:id/complete
│   │   ├── driver-location/    ← F2.1–F2.9: Rastreamento GPS completo
│   │   │   ├── driver-location.module.ts
│   │   │   ├── driver-location.controller.ts
│   │   │   ├── driver-location.service.ts
│   │   │   └── dto/
│   │   │       └── create-driver-location.dto.ts
│   │   ├── cities/             ← CRUD cidades + geocodificação Nominatim
│   │   ├── notifications/      ← WebSocket gateway + CRUD notificações
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.gateway.ts  ← namespace /notifications, rooms por userId e 'admins'
│   │   │   ├── notifications.controller.ts
│   │   │   └── notifications.service.ts
│   │   ├── settings/           ← @Global — configurações em data/settings.json
│   │   ├── audit-log/          ← @Global — auditoria de ações críticas
│   │   ├── contas-pagar/       ← CRUD contas + soft delete
│   │   ├── acoes/              ← Operações de campo (Período de Curso)
│   │   ├── groups/             ← Grupos MA/PI/AC
│   │   ├── holiday/            ← Feriados e recálculo de datas de turmas
│   │   ├── reports/            ← Geração de PDFs via Puppeteer
│   │   └── truck-maintenance/  ← Manutenções de carreta
│   ├── prisma/
│   │   ├── schema.prisma       ← Schema completo: 35+ models, 20+ enums
│   │   ├── seed-full.ts        ← Seed único: grupos, cidades, cursos, usuários, motoristas demo
│   │   └── fix-utf8-notifications.ts ← Corrige double-encoding UTF-8 legado
│   └── package.json            ← Scripts: prisma:seed, seed:refresh-drivers
│
├── frontend/                   ← Next.js 14 App Router
│   ├── .env / .env.local       ← NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL
│   ├── middleware.ts            ← Passa tudo; manutenção tratada client-side via 503
│   ├── next.config.js              ← rewrites() /api/* → localhost:3001/api/* (proxy Next.js)
│   ├── tailwind.config.ts
│   ├── app/
│   │   ├── layout.tsx          ← Root: fontes Google (Orbitron, JetBrains Mono, Inter)
│   │   ├── globals.css         ← Design system completo: vars, grid, animações, portal classes
│   │   ├── page.tsx            ← Redirect para /login
│   │   ├── login/page.tsx      ← Login unificado por email ou CPF
│   │   ├── admin/
│   │   │   ├── layout.tsx      ← Auth guard sessionStorage + Sidebar + Header + Tutorial
│   │   │   ├── dashboard/page.tsx  ← KPIs + Mapa Leaflet + Alertas (589 linhas)
│   │   │   ├── alunos/         ├── cursos/ ├── turmas/ ├── inscricoes/ (Kanban)
│   │   │   ├── frequencia/     ├── certificados/ ├── funcionarios/frequencia/
│   │   │   ├── reembolsos/     ├── contas-a-pagar/ ├── configuracoes/ └── relatorios/
│   │   │   ├── teacher/            ← layout + dashboard (KPIs de turmas, histórico de check-in, gestão de frequência)
│   │   │   ├── student/            ← layout + dashboard + inscricoes + frequencia + certificados
│   │   │   └── driver/
│   │       ├── layout.tsx      ← Auth guard + Sidebar + Header driver
│   │       └── dashboard/page.tsx  ← GPS tracking + KPIs + Viagem ativa + Desempenho (611 linhas)
│   ├── components/
│   │   ├── MapaMotoristas.tsx  ← Leaflet vanilla + OSRM + pins GPS + trilhas (343 linhas)
│   │   ├── DriverDrawer.tsx    ← Drawer lateral com detalhes do motorista
│   │   ├── admin/Sidebar.tsx   ← Sidebar admin com navegação e badges
│   │   ├── admin/Header.tsx    ← Header com notificações WS e perfil
│   │   ├── driver/Sidebar.tsx  ├── driver/Header.tsx
│   │   └── ui/                 ← Toast, Tutorial, Modal genérico
│   ├── hooks/
│   │   ├── useNotifications.ts ← Socket.io client + histórico banco (112 linhas)
│   │   ├── useDriverTracking.ts← Polling GPS 3min + fila offline sessionStorage (140 linhas)
│   │   └── useAnimacoes.ts     ← Aplica body.no-animations conforme UserPreferences
│   ├── stores/
│   │   └── useAuthStore.ts     ← Zustand + sessionStorage persist (89 linhas)
│   ├── lib/api/
│   │   ├── client.ts           ← Axios: baseURL :3001/api, interceptor JWT, 401/503 handling
│   │   └── dashboard.ts        ← getStats(), getRecentActivity(), getUpcomingClasses()
│   └── types/                  ← tipos TypeScript compartilhados
│
└── docs/
    ├── arquitetura/
    │   ├── ESTADO_SISTEMA.md           ← v7.3 snapshot atual
    │   ├── PROX-PASSOS.md              ← v11.0 plano de execução
    │   ├── LIVRO_DE_REGRAS.md          ← v7.0 regras imutáveis
    │   ├── RASTREAMENTO_PRODUCAO_APRESENTACAO.md ← transição demo → produção
    │   ├── DIARIO_DE_BORDO.md          ← histórico de sessões
    │   └── sobre-sistema.md            ← ESTE ARQUIVO
    └── seguranca/
        └── ERROS_E_SOLUCOES.md         ← v9.2 catálogo de bugs
```


---

## 4. BANCO DE DADOS — SCHEMA PRISMA COMPLETO (35 models reais)

### 4.1 Enums

| Enum | Valores |
|------|---------|
| `UserRole` | ADMIN, COORDINATOR, FINANCIAL, TEACHER, STUDENT, DRIVER |
| `ClassStatus` | PLANNED, ENROLLMENT_OPEN, ENROLLMENT_CLOSED, IN_PROGRESS, COMPLETED, CANCELLED |
| `EnrollmentStatus` | PENDING, APPROVED, REJECTED, DOCUMENT_PENDING, WAITLIST, ENROLLED, DROPOUT |
| `TripStatus` | PLANNED, IN_TRANSIT, COMPLETED |
| `TruckType` | STANDARD, MULTICOURSE |
| `TruckStatus` | AVAILABLE, IN_USE, MAINTENANCE, INACTIVE |
| `ReimbursementType` | CLASSROOM_MATERIAL, CLEANING_MATERIAL, EMERGENCY_REPAIR, FOOD, OTHER |
| `ExpenseStatus` | PENDING, APPROVED, REJECTED |
| `CertificateStatus` | ACTIVE, CANCELLED |
| `AcaoStatus` | PLANEJADA, EM_ANDAMENTO, CONCLUIDA, CANCELADA |
| `ContaPagarStatus` | pendente, paga, vencida, cancelada |
| `EmployeeRole` | INSTRUCTOR, DRIVER, COORDINATOR, NURSE, TECHNICIAN, ADMINISTRATIVE, OTHER |
| `AbsenceType` | ILLNESS, PERSONAL, EMERGENCY, TRIP, ACCIDENT, OTHER |
| `AbsenceStatus` | PENDING, VALIDATED, REJECTED, PENALIZED |
| `Gender` | MALE, FEMALE, NON_BINARY, PREFER_NOT_TO_SAY |
| `ContractType` | CLT, PJ, FREELANCE |
| `SocialProgram` | NONE, BOLSA_FAMILIA, BPC, AUXILIO_BRASIL, PE_DE_MEIA, OTHER |

### 4.2 Models principais — campos e relações

**User** — tabela `users`
- `id` UUID, `email` unique, `cpf` unique?, `password` bcrypt
- `role` UserRole, `active` boolean, `twoFactorEnabled` boolean, `twoFactorSecret` string?
- Relações: Student?, Teacher?, Employee?, UserPreferences?, RefreshToken[], Notification[], AuditLog[]
- Índices: email, role

**Student** — tabela `students`
- `userId` unique FK User, `cpf` unique, dados pessoais completos (rg, birthDate, gender, etc.)
- Relações: User, StudentContact?, StudentAddress?, StudentSocioeconomic?, StudentProfessional?
- Relações de uso: Enrollment[], Attendance[], Certificate[]

**Teacher** — tabela `teachers`
- `userId` unique FK User, `cpf` unique, education, specialties, contractType, hireDate
- Relações: User, TeacherCourse[], ClassTeacher[], Material[]

**Employee** — tabela `employees`
- `userId?` unique FK User (opcional — pode não ter acesso ao sistema)
- `role` EmployeeRole, `department` EmployeeDepartment
- `monthlySalaryCLT Decimal(12,2)`, `travelRuleKm` Int (default 200)
- Relações: User?, AcaoFuncionario[], Reimbursement[], EmployeeAttendance[]

**Course** — tabela `courses`
- `name`, `durationDaysMA`, `durationDaysPI`, `workloadHours`, `isMulticourse`
- Relações: CourseModule[], TeacherCourse[], Class[], Material[]

**Class** (Turma) — tabela `classes`
- `courseId`, `groupId`, `cityId`, `truckId?`
- `status` ClassStatus, `vacancies`, `reserveSlots` (default 4)
- Relações: Course, Group, City, Truck?, ClassTeacher[], ClassSchedule[], Enrollment[], Attendance[], Certificate[], AcaoTurma[], ClassHoliday[]

**Enrollment** — tabela `enrollments`
- `studentId`, `classId`, `protocol` unique, `status` EnrollmentStatus
- `reviewedBy?` FK User, `rejectionReason?`
- Relações: Student, Class, User?(reviewer), EnrollmentDocument[], EnrollmentConsent?

**Attendance** — tabela `attendances`
- `classId`, `studentId`, `date` DateTime (UTC midnight), `present` boolean
- `registeredBy` FK User
- Unique: (classId, studentId, date)
- Relações: Class, Student, User(registrar), AttendanceJustification[]

**Certificate** — tabela `certificates`
- `studentId`, `classId`, `verificationCode` unique, `qrCodeUrl?`, `fileUrl`
- `issuedBy` FK User, `status` CertificateStatus
- Relações: Student, Class, User(issuer), User?(canceller)

**Trip** — tabela `trips`
- `truckId`, `originCityId`, `destinationCityId`
- `driverUserId?` FK User (DRIVER), `driverName`, `driverPhone?`
- `status` TripStatus, `notes?` (campo usado por BYPASS-DEMO-STATUS)
- Relações: Truck, City(origin), City(destination), User?(driver), Expense[], **DriverLocation[]**
- Índices: truckId, status, driverUserId

**DriverLocation** — tabela `driver_locations` (F1.3)
- `driverUserId` FK User, `tripId?` FK Trip
- `latitude Float`, `longitude Float`, `accuracy?`, `speed?` km/h, `heading?` graus
- `source` ('checkin'|'polling'|'batch'), `capturedAt` DateTime (tempo real do device)
- Índices: (driverUserId, capturedAt), tripId, capturedAt
- **Job LGPD**: deleta registros com capturedAt > 7 dias (cron 03:00 diário)

**City** — tabela `cities`
- `name`, `state`, `ibgeCode?`
- `latitude Float?`, `longitude Float?` (F1.1 — geocodificado via Nominatim)
- Unique: (name, state)
- Relações: Class[], Trip(origin)[], Trip(destination)[], Acao[]

**Acao** (Período de Curso/Rota) — tabela `acoes`
- `nome`, `cidadeNome` (livre), `cidadeId?` FK City
- `grupoId` FK Group, `carretaId?` FK Truck
- `status` AcaoStatus, `dataInicio`, `dataFim`
- `distanciaKm Decimal?`, `precoCombustivelL Decimal?`, `autonomiaKmL Decimal?`
- Relações: City?, Group, Truck?, AcaoTurma[], AcaoCusto[], AcaoEquipe[], ContaPagar[], AcaoFuncionario[], Reimbursement[]

**ContaPagar** — tabela `contas_pagar`
- `tipo_conta`, `valor Decimal(10,2)`, `data_vencimento`, `status` ContaPagarStatus
- `active boolean` (soft delete — F5 PASSO 3.9)
- `acaoId?` FK Acao

**Reimbursement** — tabela `reimbursements`
- `requestedBy` FK User, `employeeId?` FK Employee, `acaoId?` FK Acao
- `type` ReimbursementType, `amount Decimal(10,2)`, `receiptUrl?`
- `status` ExpenseStatus, `active boolean` (soft delete)

**Absence** — tabela `absences`
- `userId` FK User, `type` AbsenceType, `date`, `documentUrl?`
- `status` AbsenceStatus, `penalty Decimal(10,2)?`
- `reviewedBy?` FK User, `active boolean` (soft delete)

**UserPreferences** — tabela `user_preferences`
- `userId` unique FK User
- `notifEmail`, `notifCertificado`, `notifInscricao`, `notifFrequencia` boolean
- `animacoes` boolean (default true), `fonteGrande` boolean

**TeacherCheckin** — tabela `teacher_checkins`
- `userId` FK User, `checkedAt` DateTime, `date` String ('YYYY-MM-DD'), `note?`
- Índice: (userId, date)

**EmployeeAttendance** — tabela `employee_attendances`
- `employeeId` FK Employee, `date` DateTime, `present`, `justified`
- `registeredBy` FK User
- Unique: (employeeId, date)

**Notification** — tabela `notifications`
- `userId`, `type` NotificationType, `title`, `message`
- `channel` NotificationChannel, `deliveryStatus` DeliveryStatus
- `data Json?` — contém link de navegação

**AuditLog** — tabela `audit_logs`
- `userId?`, `action`, `tableName`, `recordId?`
- `oldData Json?`, `newData Json?`, `ipAddress?`

### 4.3 Migrations aplicadas (por db push)
| Migration | Quando |
|-----------|--------|
| Estrutura base completa | Sprints 0-5 |
| add_two_factor | Sprint Segurança |
| add_driver_role_and_employee_user_relation | EXEC-02 |
| add_driver_user_id_to_trip | EXEC-02 |
| add_user_preferences | Sprint 3 |
| add_absence_active | EXEC-IMPREVISTOS |
| add_employee_attendance | Passo 3.2 |
| add_conta_pagar_active | Passo 3.9 |
| add_teacher_checkins | Passo 3.7 |
| add_city_coordinates_and_driver_location | Fase 1 GPS |


---

## 5. BACKEND — LÓGICA DETALHADA POR MÓDULO

### 5.1 main.ts — Bootstrap
```
- Porta: process.env.PORT || 3001
- helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false })
- app.setGlobalPrefix('api')
- CORS: origin = FRONTEND_URL || 'http://localhost:3000', credentials: true
- ValidationPipe global: whitelist, forbidNonWhitelisted, transform
- Swagger em /api/docs com Bearer auth
- Middleware de manutenção: se settings.isMaintenanceMode() → retorna 503
  Exceções: /api/auth/login, /api/settings, /api/health, header x-admin-bypass
```

### 5.2 auth/auth.service.ts — Autenticação completa
```typescript
// login(identifier, password):
// Aceita email OU CPF (sem formatação)
// Se CPF: busca na tabela students.cpf primeiro → pega userId → busca User
//         se não achar: busca User com role ADMIN/COORDINATOR por cpf
// Se email: findUnique({ email })
// Verifica active: true, bcrypt.compare
// Se twoFactorEnabled: retorna { requiresTwoFactor: true, userId } — NÃO emite JWT ainda
// generateTokens(): JWT access_token (exp padrão) + refresh_token (7d)
//   payload: { sub: userId, email, role }
//   RefreshToken salvo no banco com expiresAt +7 dias

// register(): SEMPRE cria role: 'STUDENT' — nunca aceita role do body
// validateUser(userId): usado pelo JwtStrategy no validate()

// 2FA (speakeasy TOTP/RFC 6238):
// generate2FA() → speakeasy.generateSecret + QRCode.toDataURL
// enable2FA() → speakeasy.totp.verify + atualiza twoFactorEnabled: true
// verify2FAAndLogin() → verifica TOTP + emite JWT
// disable2FA() → verifica TOTP + limpa twoFactorEnabled e twoFactorSecret
```

### 5.3 auth/jwt.strategy.ts — JWT Strategy
```typescript
// jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
// secretOrKey: process.env.JWT_SECRET
// validate(payload): chama authService.validateUser(payload.sub)
// RETORNA: { id, email, name, phone, role, active }
// ATENÇÃO: retorna campo `id` (não `sub`) — todos os controllers usam req.user.id
```

### 5.4 auth/guards/roles.guard.ts — Roles Guard
```typescript
// Lê metadados ROLES_KEY via Reflector
// Se nenhuma role requerida: deixa passar
// Verifica: requiredRoles.some(role => user.role === role)
// REGRA CRÍTICA: sempre usar @UseGuards(JwtAuthGuard, RolesGuard) + @Roles() juntos
```

### 5.5 settings/settings.service.ts — Configurações globais (@Global)
```typescript
// Persiste em data/settings.json (no diretório do backend)
// Carrega em cache na inicialização (OnModuleInit)
// isMaintenanceMode() → usado no middleware do main.ts
// Parâmetros financeiros: valorPassagemViagem(270), valorDiariaPadrao(120),
//   kmLimitePassagemSemanal(200), diasUteisReferenciaMes(22), percentualAlertaCusto(110)
// Validação de senha: baixa(≥6), media(≥8+número), alta(≥10+especial)
```

### 5.6 notifications/notifications.gateway.ts — WebSocket
```typescript
// @WebSocketGateway({ namespace: '/notifications', cors: { origin: FRONTEND_URL } })
// Autenticação: JWT via client.handshake.auth.token (ou Authorization header)
// Ao conectar: verifica JWT → pega userId = payload.sub
//   - Entra em room user:{userId}
//   - Se ADMIN ou COORDINATOR: também entra em room 'admins'
// connectedUsers: Map<userId, socketId> — controle de presença
// notifyAdmins(event, data) → this.server.to('admins').emit(event, data)
// notifyUser(userId, event, data) → this.server.to(`user:${userId}`).emit(event, data)
// notifyAll(event, data) → this.server.emit(event, data)
// @SubscribeMessage('ping') → responde 'pong' com timestamp
// REGRA: WS sempre em try/catch separado do fluxo principal
```

### 5.7 driver-location/driver-location.service.ts — GPS Tracking
```typescript
// @Cron(EVERY_DAY_AT_3AM) cleanupOldLocations():
//   DELETE WHERE capturedAt < now - 7 dias (LGPD)

// haversineKm(lat1, lng1, lat2, lng2): R=6371km, fórmula haversine completa
//   Usado para ETA e cálculo de progresso

// getVelocidadeMediaHoje(driverUserId):
//   Busca DriverLocations do dia com speed != null, filtra speed > 5
//   Fallback: 70 km/h se menos de 3 pontos disponíveis

// calcularETA(driverUserId, origemLat, origemLng, destinoLat, destinoLng):
//   1. haversineKm para distância
//   2. Se GOOGLE_MAPS_KEY → tenta Google Maps Directions API
//   3. Fallback: haversine + getVelocidadeMediaHoje()
//   Retorna: { distanciaKm, minutos, fonte: 'google' | 'haversine' }

// getMotoristaAtivos():
//   1. findMany trips WHERE status='IN_TRANSIT' AND driverUserId != null
//   2. DEDUP: se motorista tem múltiplas trips IN_TRANSIT → usa só a mais recente
//   3. Para cada trip:
//      - busca última DriverLocation (orderBy capturedAt DESC)
//      - diffMin = (now - capturedAt) / 60000
//      - status: diffMin ≤5 → 'online' | ≤15 → 'stopped' | >15 → 'offline'
//      - calcularETA() para ETA e progresso
//      - progresso = (totalKm - restanteKm) / totalKm * 100 (0-100)
//   Retorna: { userId, name, trip{id,origin,dest,coords}, lastLocation, eta, progress, status }

// getTrilha(tripId):
//   findMany DriverLocations WHERE tripId, orderBy capturedAt ASC
//   Retorna: { latitude, longitude, speed, heading, capturedAt, source }

// getPerformance(driverUserId):
//   - Trip ativa (IN_TRANSIT) com ETA
//   - Pontualidade semanal: trips COMPLETED desta semana
//   - Ranking: posição entre todos os motoristas por pontualidade
//   - Km rodados no mês: soma haversine entre pontos consecutivos
//   - Velocidade média do mês
//   Retorna: { currentTrip, ranking: { semana, mes } }

// verificarAlertas(driverUserId, driverName, tripId):
//   🔴 SEM SINAL: diffMin > 15 → notifyAdmins('driver_alert', { type:'no_signal', ... })
//   🟡 PARADA LONGA: speed ≤ 2 por mais de 30min → notifyAdmins driver_alert long_stop
//   🟢 CHEGADA PRÓXIMA: ETA.minutos < 30 → notifyAdmins driver_alert arriving_soon
//   WS em try/catch separado — nunca propaga erro

// processarBatch(driverUserId, tripId, locations[]):
//   Dedup por driverUserId + capturedAt (findFirst antes de criar)
//   Retorna: { saved, skipped }
```

### 5.8 driver-location/driver-location.controller.ts — Endpoints GPS
```
// Regra: literais ANTES de :id (LIVRO §2)
// POST /driver/location (DRIVER)
//   → busca trip IN_TRANSIT do motorista → saveLocation() → notifyAdmins WS → verificarAlertas()
// POST /driver/location/batch (DRIVER)
//   → processarBatch() com dedup
// GET /driver/location/active (ADMIN)
//   → getMotoristaAtivos() → retorna { drivers: [] }
// GET /driver/me/performance (DRIVER) — LITERAL antes de :tripId
//   → getPerformance(req.user.id)
// GET /driver/location/:tripId/trail (ADMIN)
//   → getTrilha(tripId) → retorna { tripId, trail: [] }
```

### 5.9 dashboard/dashboard.service.ts — Analytics
```typescript
// getOverallStats():
//   students total/MA(state='MA')/PI(state='PI') via StudentAddress.state
//   courses total/active, classes total/active(startDate≤now≤endDate)
//   enrollments total/pending(status IN ['ENROLLED','DOCUMENT_PENDING'])

// getAnalytics():
//   BUG-DASH-01 FIX: aprovados = status 'APPROVED' OR 'ENROLLED' (ambos = aprovação)
//   BUG-DASH-02 FIX: certificadosEmitidos = certificate.count({ status:'ACTIVE' })
//   inscricoesPorMes: últimos 12 meses, agrupa por YYYY-MM
//   alunosPorCurso: top 10 cursos por inscrições
//   distribuicaoEstado: MA/PI/Outros
//   statusInscricoes: contagem por enum

// getRotasBi(estado?, ano?):
//   Filtra Acao por grupo.state e dataInicio
//   Retorna: totalRotas, cidadesBeneficiadas, totalInscritos, rotas[]
```

---

## 6. MAPA DE DOCUMENTAÇÃO — LEITURA OBRIGATÓRIA

> **REGRA PARA IA E DESENVOLVEDOR:** Antes de qualquer alteração, modificação ou adição de código,
> leia os documentos abaixo na ordem indicada. Isso evita bugs conhecidos, violações de regras
> arquiteturais e retrabalho.

### 📌 Documentos Fixos (SEMPRE ler antes de codar)

| # | Documento | Caminho | Conteúdo-chave |
|---|-----------|---------|----------------|
| 1 | **Este arquivo** | `docs/arquitetura/sobre-sistema.md` | Arquitetura completa, módulos, fluxos reais |
| 2 | **Estado do Sistema** | `docs/arquitetura/ESTADO_SISTEMA.md` | Status atual, bugs ativos, bypasses de demo |
| 3 | **Livro de Regras** | `docs/arquitetura/LIVRO_DE_REGRAS.md` | Regras imutáveis (§1 nomes, §2 literais antes de :id, §6 seed único) |
| 4 | **Erros e Soluções** | `docs/seguranca/ERROS_E_SOLUCOES.md` | Catálogo de bugs conhecidos + soluções comprovadas |

### 📎 Documentos Situacionais (ler quando o tema for relevante)

| Quando usar | Documento | Caminho |
|------------|-----------|--------|
| GPS / rastreamento / mapa | Rastreamento Produção | `docs/arquitetura/RASTREAMENTO_PRODUCAO_APRESENTACAO.md` |
| Novas features / sprint | Próximos Passos | `docs/arquitetura/PROX-PASSOS.md` |
| Portal do Motorista / responsividade | Regras Driver | `docs/arquitetura/REGRAS_RESPONSIVIDADE_PORTAL_MOTORISTA.md` |
| Histórico de sessões / decisões | Diário de Bordo | `docs/arquitetura/DIARIO_DE_BORDO.md` |

### 🔗 Referências Rápidas por Tema

| Tema | Onde buscar |
|------|------------|
| Schema banco de dados | Seção 4 deste doc + `backend/prisma/schema.prisma` |
| Bugs ativos e bypasses | `ESTADO_SISTEMA.md` |
| Seed de dados | `backend/prisma/seed-full.ts` (único seed — Regra §6) |
| Design system CSS | `frontend/app/globals.css` (37kb) |
| Configurações globais | `backend/src/settings/settings.service.ts` |
| Endpoints da API | `http://localhost:3001/api/docs` (Swagger) |
| WebSocket namespace | `/notifications` — JWT via handshake.auth.token |
| Autenticação frontend | `frontend/stores/useAuthStore.ts` (Zustand + sessionStorage) |

---

## 7. FLUXO REAL POR PERFIL

> **Como ler esta seção:** Para cada perfil, descrevemos QUEM É a pessoa, O QUE ela faz no sistema
> passo a passo, QUAIS rotas de API ela consome, e COMO o sistema processa cada ação.
> Isso mapeia a jornada real de uso do sistema por um operador humano real.

---

### 7.1 ADMINISTRADOR — O Gestor Central

**Quem é:** Coordenador(a) do programa Qualifica. Tem visão de tudo e pode alterar qualquer dado.
**Rota de acesso:** `/admin/dashboard` | **Credencial de teste:** `admin@qualifica.com / RR@@Upgrade`

**Padrão de auth:** O `AdminLayout` verifica `sessionStorage` (isolado por aba) ao montar. Se não há token → redireciona para `/login`. Usa `useAnimacoes()` para aplicar preferências visuais.

**Jornada típica:**
```
1. LOGIN
   POST /api/auth/login → recebe access_token + refresh_token
   AuthStore (Zustand+sessionStorage) guarda token isolado por aba
   Frontend redireciona para /admin/dashboard baseado em user.role

2. DASHBOARD
   GET /api/dashboard/stats    → KPIs gerais (alunos, turmas, inscrições)
   GET /api/dashboard/analytics → gráficos (aprovação, certificados, distribuição)
   GET /api/driver/location/active → motoristas IN_TRANSIT no mapa Leaflet
   WS /notifications join 'admins' room → recebe eventos em tempo real

3. GESTÃO DE INSCRIÇÕES (Kanban)
   GET /api/enrollments → lista com filtros (status, classId, search)
   PATCH /api/enrollments/:id/approve   → status PENDING→APPROVED + WS notifyAdmins
   PATCH /api/enrollments/:id/reject    → status PENDING→REJECTED + motivo
   PATCH /api/enrollments/:id/waitlist  → status→WAITLIST
   PATCH /api/enrollments/:id/request-correction → status→DOCUMENT_PENDING
   PATCH /api/enrollments/:id/confirm   → status APPROVED→ENROLLED

4. FREQUÊNCIA DE ALUNOS
   GET /api/classes → seleciona turma
   GET /api/attendance/class/:classId → carrega registros de frequência
   POST/PUT /api/attendance → marca P/F por aluno por data (UTC midnight)

5. CERTIFICADOS
   POST /api/certificates/issue → emite certificado com verificationCode único
   GET /api/certificates → lista com QR Code pré-gerado
   MinIO: fileUrl salvo no banco, pré-assinado ao acessar

6. REEMBOLSOS
   GET /api/reimbursements → lista
   PATCH /api/reimbursements/:id/approve → status→APPROVED
   PATCH /api/reimbursements/:id/reject  → status→REJECTED + motivo

7. MOTORISTAS EM ROTA (Mapa)
   GET /api/driver/location/active → lista com lastLocation, ETA, progresso, status
   GET /api/driver/location/:tripId/trail → trilha GPS do mapa Leaflet (OSRM ou linha reta)
   WS evento 'driver_alert' → SEM SINAL / PARADA LONGA / CHEGANDO
   [BYPASS-DEMO-ALERTAS ativo: alertas sintéticos gerados no loadDrivers()]

8. CONFIGURAÇÕES
   GET/PATCH /api/settings → parâmetros financeiros, modo manutenção
   PATCH /api/users/me → nome, telefone, preferências
   POST /api/auth/2fa/generate → QR Code Google Authenticator
```

**Páginas completas do portal admin:**
`/admin/dashboard` `/admin/alunos` `/admin/cursos` `/admin/turmas` `/admin/inscricoes`
`/admin/frequencia` `/admin/funcionarios` `/admin/certificados` `/admin/reembolsos`
`/admin/contas-a-pagar` `/admin/acoes` `/admin/carretas` `/admin/grupos`
`/admin/feriados` `/admin/historico` `/admin/imprevistos` `/admin/relatorios` `/admin/configuracoes`

---

### 7.2 PROFESSOR — O Facilitador de Frequência

**Quem é:** Professora/professor que ministra as aulas nas carretas-escola.
**Rota de acesso:** `/teacher/dashboard` | **Credencial:** `maria.professora.visual@qualifica.com / RR@@Upgrade`

**Padrão de auth:** Idêntico ao admin — `TeacherLayout` verifica sessionStorage ao montar.

**Jornada típica:**
```
1. DASHBOARD ANALÍTICO (reescrito 07/04/2026 — 4 zonas em uma única chamada)
   GET /api/classes/teacher/dashboard   ← NOVO: endpoint agregado, substitui 5+ requests paralelos

   Retorna em uma só chamada:
   - turmasAtivas, totalAlunosEmRisco, certElegiveis, reembolsosPendentes, valorPendente, checkinHoje
   - turmas[]: curso, cidade, freqMedia, alunosEmRisco, freqHojeRegistrada, progressoPct, diasRestantes
   - alertas[]: freq_pendente / aluno_risco / encerrando / checkin

   ZONA 1 — 5 KPIs: Turmas Ativas | Alunos em Risco | Cert. Pendentes | Reembolsos | Ponto Hoje
   ZONA 2 — Ações Pendentes: alertas automáticos com botões diretos ("Lançar agora")
   ZONA 3 — Cards de turma: semáforo frequência + barras de progresso + badge status
   ZONA 4 — CTA Frequência: amarelo (pendente) ou verde (em dia)

   Semáforo de frequência:
   - Verde (≥80%)  | Amarelo (≥75%) | Vermelho (<75% — aluno em risco)

2. REGISTRAR FREQUÊNCIA (ação principal)
   GET /api/classes?teacherUserId=:id  ← turmas vinculadas via ClassTeacher
   Seleciona data no calendário touch-friendly
   Para cada aluno: clica P (Presente) ou F (Falta)
   POST /api/attendance               ← salva com registeredBy = teacher.userId
   Frequência ≥75%: aluno elegível para certificado

3. VER HISTÓRICO
   GET /api/attendance/class/:classId  ← calendário com P/F por dia
   GET /api/classes/teacher/history    ← histórico de todos os lançamentos do professor

4. PONTO (Check-in presente)
   POST /api/teachers/me/checkin       ← cria TeacherCheckin com data atual
   GET  /api/teachers/me/checkins      ← histórico de check-ins
   **Atalho no dashboard:** KPI "Ponto Hoje" é clicavel e registra sem navegar

5. REEMBOLSOS
   POST /api/reimbursements            ← tipo + valor + recibo MinIO
   GET  /api/reimbursements/me         ← lista com status (PENDING/APPROVED/REJECTED)

6. IMPREVISTOS
   POST /api/absences                  ← tipo (ILLNESS, OTHER, ACCIDENT) + data + descrição
   O admin recebe notificação via WS: evento no gateway

7. CERTIFICADOS
   GET  /api/certificates?classId=:id  ← certificados das turmas do professor
   GET  /api/certificates/download/:code ← pública, gera e serve PDF (Puppeteer)
   Tab "Elegíveis": alunos com frequência ≥75% sem certificado
   Tab "Emitidos": certificados já gerados com QR Code e botão PDF
```

**Vínculo Professor-Turma:** Tabela `ClassTeacher` (M:N). Um professor pode ter múltiplas turmas.
Só vê frequência de turmas onde `classTeacher.teacherId = teacher.id`.

**Endpoint crítico — regra do LIVRO §2:**
`GET /classes/teacher/dashboard` e `GET /classes/teacher/history` são literais e estão ANTES de `:id`
no `ClassesController`. Deve ser mantido assim ou o NestJS capturará "teacher" como UUID e dará 404.

**Páginas do portal teacher:**
`/teacher/dashboard` `/teacher/frequencia` `/teacher/historico`
`/teacher/reembolsos` `/teacher/imprevistos` `/teacher/certificados` `/teacher/configuracoes`

---

### 7.3 MOTORISTA — O Operador de Campo

**Quem é:** Motorista da carreta-escola. Faz as rotas entre cidades.
**Rota de acesso:** `/driver/dashboard` | **Credencial:** `joao.driver.test99@qualifica.com / RR@@Upgrade`

**Padrão de auth:** `DriverLayout` verifica sessionStorage ao montar — mesmo padrão dos demais.

**Jornada típica:**
```
1. DASHBOARD — 4 KPIs + 3 cards principais
   GET /api/trips?driverUserId=:id → viagens atribuídas
   GET /api/driver/me/performance  → ranking semanal, km no mês, velocidade média
   Card "Minha Viagem Ativa": mostra destino, ETA, progresso % da rota
   Card "Meu Desempenho": ranking entre motoristas, pontualidade

2. INICIAR VIAGEM
   PATCH /api/trips/:id/start → status PLANNED→IN_TRANSIT
   useDriverTracking() hook ativa polling GPS a cada 3 min
   Offline queue: sessionStorage guarda coords se sem internet
   Flush automático quando volta online

3. RASTREAMENTO GPS (automático em background)
   hook useDriverTracking.ts:
     - Chama navigator.geolocation.getCurrentPosition()
     - POST /api/driver/location → { lat, lng, accuracy, speed, heading, capturedAt, tripId }
     - Se falha: armazena em fila sessionStorage e reenvia quando retorna online
     - GET /api/driver/me/performance → atualiza card de desempenho

4. CHEGAR AO DESTINO
   PATCH /api/trips/:id/complete → status IN_TRANSIT→COMPLETED
   Para o polling GPS
   Admin vê viagem como concluída no mapa

5. MANUTENÇÃO DA CARRETA
   GET /api/truck-maintenance?truckId=:id → lista manutenções
   POST /api/truck-maintenance → registra problema (tipo, descrição, prioridade)
   Status: agendada → em_andamento → concluida

6. REEMBOLSOS
   POST /api/reimbursements → pedágio, alimentação, reparos emergenciais
   Comprovante: MinIO presigned URL para upload de foto

7. IMPREVISTOS
   POST /api/absences → acidente, doença, outro
   Admin recebe alerta via WS
```

**Vínculo Motorista-Sistema:**
- `User.role = 'DRIVER'` + `Employee` (LOGISTICS, CLT, travelRuleKm=200)
- `Trip.driverUserId` → vincula viagem ao motorista
- `DriverLocation` → tabela com GPS, retida por 7 dias (LGPD)
- Em produção: GPS chega via `POST /driver/location`; em demo: seed grava pontos direto no banco

**Páginas do portal driver:**
`/driver/dashboard` `/driver/viagens` `/driver/veiculo` `/driver/rota`
`/driver/manutencao` `/driver/reembolsos` `/driver/imprevistos` `/driver/configuracoes`

---

### 7.4 ALUNO — O Beneficiário do Programa

**Quem é:** Pessoa do município que acessa cursos profissionalizantes gratuitos da carreta-escola.
**Rota de acesso:** `/student/dashboard` | **Credencial:** `aluno@qualifica.com / RR@@Upgrade`

**Padrão de auth:** `StudentLayout` — mesma lógica sessionStorage das demais.

**Como um aluno entra no sistema — 2 caminhos:**
```
CAMINHO A — Inscrição pública (sem conta prévia):
  Acessa /inscricao → formulário 5 etapas
  POST /api/enrollments → transação atômica:
    1. Cria User (role: STUDENT, senha temporária aleatória)
    2. Cria Student (dados pessoais)
    3. Cria StudentContact, StudentAddress, StudentSocioeconomic, StudentProfessional
    4. Cria Enrollment (status: PENDING)
    5. Cria EnrollmentConsent (LGPD)
  Recebe protocolo gerado: timestamp36+randomHex (ex: M8KX2G-4AF1B2)
  Admin recebe WS 'nova_inscricao'

CAMINHO B — Matrícula direta pelo admin:
  Admin → inscricoes → adminEnroll(studentId, classId)
  POST /api/enrollments/admin-enroll → cria direto com status APPROVED
  Não passa pelo kanban de aprovação
```

**Jornada após aprovação:**
```
1. DASHBOARD
   GET /api/students/me → dados do aluno
   GET /api/enrollments/my → matrículas com turma, curso, cidade
   Vê: turma ativa, % de frequência, próxima aula

2. FREQUÊNCIA
   GET /api/attendance/student/:id → calendário interativo (dias P/F/Sem aula)
   % de presença calculado: presenças / total_aulas × 100
   Mínimo 75% para aprovação e certificado

3. CERTIFICADOS
   GET /api/certificates/mine → lista certificados emitidos
   QR Code gerado via qrcode.react: aponta para /api/certificates/verify/:code
   Download do PDF (MinIO presigned URL)

4. INSCREVER-SE EM NOVO CURSO
   GET /api/classes?status=ENROLLMENT_OPEN → turmas disponíveis
   POST /api/enrollments → inscrição (status PENDING → aguarda admin)

5. IMPREVISTOS
   POST /api/absences → registra falta justificada
   Admin valida e pode penalizar ou não
```

**Constraint importante:** O aluno só vê dados SEUS. Todos os endpoints de aluno filtram por
`userId = req.user.id` → `student.userId`. Não há acesso cruzado entre alunos.

**Páginas do portal student:**
`/student/dashboard` `/student/enrollments` `/student/attendance`
`/student/certificates` `/student/classes` `/student/classes/:id` `/student/profile`
`/student/imprevistos` `/student/configuracoes`

**Sistema de Gamificação — Fase 7 Completa — Plano Gravity v1.0 (09/04/2026):**
```
ARQUITETURA CENTRAL:
  Util compartilhado: frontend/lib/gamification.ts
  - Exporta: RANKS[], getRankConfig(), calcXP(), calcAchievements()
  - Cache helpers: RANK_CACHE_KEY, RANK_PREV_KEY, loadRankCache(), saveRankCache()
  - Único arquivo novo: SpotlightStatCard.tsx (componente de card clicável)

RANKS E→S (baseados em frequência real) + LEVEL TITLES:
  E INICIANTE     0–59%   → "Recém Chegado"
  D APRENDIZ      60–74%  → "Aluno Rank-D"
  C COMPROMETIDO  75–84%  → "Comprometido"           ← mínimo p/ aprovação
  B DEDICADO      85–89%  → "Aluno Dedicado"
  A EXCELENTE     90–94%  → "Aluno de Excelência"
  S LENDÁRIO      95–100% → "Shadow Scholar"         ← topo Solo Leveling

CÁLCULO DE XP (100% frontend — sem endpoint dedicado):
  XP = calcXP(presentCount, rankIdx) = (presentCount × 10) + (rankIdx × 20)
  Certificados: +100 XP cada | Streak bônus: exibido no calendário

═══ FEATURES FASE 6 (mantidas) ═══════════════════════════════════

FEATURE 1 — Header Mini-HUD (Header.tsx)
FEATURE 2 — Missões de Hoje (dashboard/page.tsx)
FEATURE 3 — Level-Up Overlay via createPortal (dashboard/page.tsx)
FEATURE 4 — Streak Flames 🔥🔥🔥 (attendance/page.tsx)
FEATURE 5 — Troféu Animado (certificates/page.tsx)
FEATURE 6 — Missão Ativa Inscrições (enrollments/page.tsx)
FEATURE 7 — Perfil de Caçador (configuracoes/page.tsx)
FEATURE 8 — Badges XP nas Notificações (NotificationBell.tsx)

═══ FEATURES FASE 7 — Plano Gravity v1.0 ════════════════════════

FEATURE 9 — SpotlightStatCard (components/student/SpotlightStatCard.tsx):
  - Cursor-tracking radial gradient dourado rgba(255,214,0,0.18)
  - hover: translateY(-2px) scale(1.02) + shadow-xl + border ilumina
  - rankGlow: ícone com rank-glow animation (usando currentColor)
  - touch: glow fixo no centro para mobile
  - rAF (requestAnimationFrame) para performance — nunca setState direto no evento

FEATURE 10 — Quick Action Drawers (dashboard/page.tsx):
  - 3 drawers via createPortal(drawer, document.body) — jamais aninhado em transform
  - Animação: .slide-right (translateX 100%→0) + backdrop .fade-backdrop
  - Fecha com Escape + clique no backdrop + botão ✕
  - Drawer Matrículas: lista turmas ativas + "Ver Turma →"
  - Drawer Frequência: % em destaque + stats + dica de rank contextual
  - Drawer Certificados: lista + Download PDF + Ver QR Code
  - Dados: reutiliza fetchData() — ZERO novos endpoints

FEATURE 11 — ProgressOrb SVG (dashboard/page.tsx):
  - Anel de fundo (cinza) + anel de progresso (cor do rank, stroke animated)
  - Anel externo pulsante (rank-glow animation)
  - Centro: letra do rank + percentual
  - 3 partículas flutuantes (float-particle keyframe, opacity 0.4)
  - Usado em: Painel do Caçador + card Frequência Geral

FEATURE 12 — Rank Trail (dashboard/page.tsx):
  - Trilha visual E→D→C→B→A→S no Painel do Caçador
  - Rank atual: maior (32px), colorido, rank-badge-pulse + box-shadow
  - Ranks passados: menores (24px), semi-transparentes na cor do rank
  - Ranks futuros: cinza #E5E7EB

FEATURE 13 — Dica Contextual de Progresso (dashboard/page.tsx):
  - "⚡ Mais X% de frequência = Rank Y · ≈ N aula(s) a mais. Você consegue!"
  - Aparece no Painel do Caçador + drawer Frequência + card Freq Geral
  - Cálculo: faltaParaProximo = nextRank.minFreq - attendance.rate
  - aulasParaProximo = Math.ceil(falta * totalClasses / 100)

FEATURE 14 — Sidebar Aprimorada (components/student/Sidebar.tsx):
  - Badge rank 32px (era 28px) com rank-badge-pulse animation
  - Level title temático em vez de label puro (ex: "Aluno Dedicado" para B)
  - Barra XP com shimmer: xp-shimmer 1.8s infinite
  - gradient background na caixinha do rank

ANIMAÇÕES CSS (globals.css — 6 novos keyframes):
  @keyframes rank-glow         (box-shadow pulsante com currentColor)
  @keyframes xp-shimmer        (translateX GPU-accelerated)
  @keyframes float-particle    (movimento suave das partículas)
  @keyframes slide-right       (drawer da direita)
  @keyframes fade-backdrop     (backdrop)
  @keyframes rank-badge-pulse  (scale 1 → 1.06 suave)
  Classes: .rank-glow .rank-badge-pulse .slide-right .fade-backdrop
  Desativadas por body.no-animations (já existente no sistema)

REGRAS DE PERFORMANCE:
  - will-change: aplicado temporariamente via JS apenas durante hover
  - Partículas: máx 3 elementos, opacity 0.4 — invisíveis em no-animations
  - Shimmer: transform: translateX (não left/width) — GPU-accelerated
  - Drawers: montados só quando open=true via conditional render

CALENDÁRIO COMPACTO (corrigido 07/04/2026):
  BUG: gridTemplateColumns:'repeat(7, 1fr)' → células expandiam para ~160px em telas 1440px
  FIX: gridTemplateColumns:'repeat(7, 38px)' + justifyContent:'center' + width/height:38px fixos
  Container: maxWidth:320 + margin:'0 auto' + overflowX:'auto' para mobile
  Aplicado em: student/classes/[id]/page.tsx (AttendanceCalendar)
  Nota: attendance/page.tsx usa 1fr pois tem layout de coluna full que normaliza o tamanho
```

---


## 8. COMUNICAÇÃO ENTRE PERFIS

> O sistema não tem comunicação direta entre usuários (sem chat, sem mensagens P2P).
> A comunicação acontece via **ações no banco** que geram **notificações WebSocket** para outros perfis.

### Fluxo de eventos entre perfis

```
ALUNO faz inscrição
  → Enrollment criado (status: PENDING)
  → WS: gateway.notifyAdmins('nova_inscricao') → admin vê badge no sino
  → Admin abre Kanban → vê card na coluna PENDENTE

ADMIN aprova inscrição
  → Enrollment atualizado (status: APPROVED)
  → WS: gateway.notifyAdmins('inscricao_aprovada')
  → [futuro] notificar aluno por email

PROFESSOR registra frequência
  → Attendance creado com registeredBy = teacher.userId
  → Aluno pode ver no portal imediatamente ( GET /attendance/student/:id )
  → Admin vê estatísticas no dashboard

MOTORISTA envia GPS (prod) ou seed grava diretamente (demo)
  → DriverLocation salva no banco com capturedAt
  → Admin vê ponto no mapa Leaflet (polling GET /driver/location/active)
  → Service verifica alertas:
      diffMin > 15 → WS: notifyAdmins('driver_alert', {type:'no_signal'})
      speed ≤ 2 por 30min → WS: notifyAdmins('driver_alert', {type:'long_stop'})
      ETA < 30min → WS: notifyAdmins('driver_alert', {type:'arriving_soon'})

MOTORISTA registra imprevisto
  → Absence criada (status: PENDING)
  → Admin: vê em /admin/imprevistos
  → PATCH /api/absences/:id → valida ou rejeita

PROFESSOR solicita reembolso
  → Reimbursement criado (status: PENDING)
  → Admin: vê em /admin/reembolsos
  → PATCH /api/reimbursements/:id/approve|reject
```

### Tabela de eventos WebSocket

| Evento (emit) | De quem | Para quem | Quando |
|--------------|---------|-----------|--------|
| `nova_inscricao` | Enrollments.create | admins room | Inscrição pública criada |
| `inscricao_aprovada` | Enrollments.approve | admins room | Admin aprova inscrição |
| `inscricao_rejeitada` | Enrollments.reject | admins room | Admin rejeita inscrição |
| `driver_alert` | DriverLocation.verificarAlertas | admins room | GPS eventos críticos |
| `driver_location_update` | DriverLocation.POST | admins room | Nova posição GPS |
| `ping` → `pong` | Client | mesmo client | Keep-alive / health check |

### Como o frontend se conecta ao WebSocket

```typescript
// hook: frontend/hooks/useNotifications.ts
const socket = io(`${WS_URL}/notifications`, {
  auth: { token: sessionStorage.getItem('token') },
  transports: ['websocket', 'polling'],
});
// Gateway valida JWT no handshake → pega userId = payload.sub
// Entra em rooms: user:{userId} + 'admins' (se ADMIN/COORDINATOR)
socket.on('nova_inscricao', (data) => { /* toast + badge */ });
socket.on('driver_alert',   (data) => { /* alerta mapa */ });
```

---

## 9. FLUXO DE DADOS — DO CLIQUE AO BANCO

### Exemplo: Professor registra frequência de aluno

```
[Tela Teacher/Frequencia]
  1. Usuário seleciona turma (GET /api/classes → filtra por ClassTeacher.teacherId)
  2. Seleciona data no calendário
  3. Para cada aluno: clica botão P ou F
  4. Clica "Salvar"

[Frontend → Backend]
  5. Axios POST /api/attendance
     Header: Authorization: Bearer <token> (sessionStorage)
     Body: { classId, studentId, date: '2026-04-06T00:00:00.000Z', present: true }

[Backend: attendance.controller.ts]
  6. @UseGuards(JwtAuthGuard) → JwtStrategy.validate(payload.sub) → retorna user
  7. @Roles('TEACHER', 'ADMIN') → RolesGuard verifica user.role
  8. DTO: ValidationPipe (whitelist: true, forbidNonWhitelisted: true)

[Backend: attendance.service.ts]
  9. Verifica se attendance já existe (classId+studentId+date unique)
  10. prisma.attendance.upsert() → salva com registeredBy = req.user.id

[Banco PostgreSQL]
  11. INSERT/UPDATE em tabela 'attendances'
  12. Índice único: (classId, studentId, date) previne duplicatas

[Resposta]
  13. HTTP 200 → frontend atualiza UI (P/F visual no calendário)
  14. Aluno vê % de frequência atualizado no próximo GET /attendance/student/:id
```

### Exemplo: Inscrição pública com transação atômica

```
[Tela /inscricao — 5 etapas]
  Etapa 1: Dados pessoais (nome, CPF, RG, data de nasc., gênero...)
  Etapa 2: Endereço (CEP, rua, bairro, cidade, estado, zona)
  Etapa 3: Dados socioeconômicos (renda, prog. social, escolaridade...)
  Etapa 4: Dados profissionais (objetivo, como soube do programa...)
  Etapa 5: Consentimentos LGPD + submit

  POST /api/enrollments

[Transação Prisma $transaction]
  1. Verifica turma existe e status = ENROLLMENT_OPEN
  2. Verifica CPF não duplicado nessa turma
  3. Dentro da transação (com re-verificação de vagas):
     a. Cria/busca User (role: STUDENT, senha temporária aleatória)
     b. Cria Student + Contact + Address + Socioeconomic + Professional
     c. Cria Enrollment (status: PENDING, protocol: randTimestamp+randHex)
     d. Cria EnrollmentConsent (dataProcessing, imageUse, termsAccepted)
  4. Se QUALQUER etapa falhar → rollback total (sem dados parciais)
  5. FORA da transação: WS notifyAdmins('nova_inscricao')

[Admin vê no Kanban]
  Card aparece na coluna PENDENTE
  Admin: Aprovar → status=APPROVED → Confirmar → status=ENROLLED
```

---

## 10. SEGURANÇA — DECISÕES DE DESIGN

| Decisão | Implementação | Motivo |
|---------|--------------|--------|
| Token isolado por aba | `sessionStorage` (Zustand persist) | Evita vazamento de dados entre perfis em abas diferentes |
| Refresh token no banco | Tabela `RefreshToken`, exp 7d | Permite revogação server-side no logout |
| 2FA TOTP | speakeasy + QRCode (Google Authenticator) | Segundo fator para contas críticas |
| Senha SEMPRE hash | `bcrypt.hash(pwd, 10)` | Nunca texto puro no banco |
| Registro público = STUDENT | `role: 'STUDENT'` hardcoded | Nunca aceitar role do body na criação pública |
| Modo manutenção | middleware no main.ts → HTTP 503 | Permite manutenção sem derrubar o servidor |
| LGPD GPS | cron 03:00 deleta DriverLocation > 7 dias | Dados de localização são sensíveis |
| ValidationPipe global | `whitelist: true, forbidNonWhitelisted` | Bloqueia campos não declarados nos DTOs |
| Helmet | `helmet({crossOriginEmbedderPolicy:false})` | Headers HTTP de proteção |
| Auditoria | `AuditLog` (@Global) — ações críticas gravadas | Rastreabilidade de alterações |

---

*Sistema Upgrade | RR TECNOL | v2.0 | 06/04/2026 | Atualizado com análise completa do código real*


---

## 6. FRONTEND — LÓGICA DETALHADA

### 6.1 stores/useAuthStore.ts — Estado global de autenticação
```typescript
// Zustand + persist em sessionStorage (NUNCA localStorage — BUG-SESSION-01)
// sessionStorage é isolado por aba: Tab1(Admin) ≠ Tab2(Teacher) — sem vazamento

interface AuthState {
  user: { id, email, name, role } | null
  token: string | null
  isAuthenticated: boolean
  login(email, password): Promise<void>   // chama /auth/login diretamente via fetch
  logout(): void   // limpa sessionStorage + localStorage legado + Zustand state
  setUser(user, token): void
}

// persist config:
//   name: 'auth-storage'
//   storage: createJSONStorage(() => sessionStorage)
//   typeof window !== 'undefined' ? sessionStorage : localStorage  (SSR safe)

// logout() limpa: sessionStorage.removeItem(token|user|student|auth-storage)
//               + localStorage.removeItem(...) para limpeza de legado
```

### 6.2 lib/api/client.ts — Axios HTTP Client
```typescript
// baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
// Request interceptor: lê token de sessionStorage (fallback: localStorage)
//   → adiciona Authorization: Bearer <token>
// Response interceptor:
//   503 + { maintenance: true } → redireciona para /manutencao
//   401 com response.data → limpa session + redireciona /login
//     (apenas se não estiver já em /login)
```

### 6.3 middleware.ts — Next.js Middleware
```typescript
// Passa TODAS as rotas com NextResponse.next()
// Verificação de autenticação é feita client-side nos layouts
// Modo manutenção tratado pelo interceptor Axios (503) — não pelo middleware
// matcher: não intercepta _next/static, _next/image, favicon.ico
```

### 6.4 app/admin/layout.tsx — Layout Admin
```typescript
// useEffect: verifica sessionStorage.token → se ausente → router.replace('/login')
// Fecha sidebar ao mudar de rota (pathname dependency)
// useAnimacoes(): aplica body.no-animations se preferences.animacoes === false
// Renderiza: <Sidebar> + <Header> + <main className="admin-content custom-scrollbar">
// Tutorial: steps específicos do admin, storageKey 'tutorial-admin-v1'
// LOADING STATE: spinner amarelo com "VERIFICANDO ACESSO..." (Orbitron font)
```

### 6.5 app/admin/dashboard/page.tsx — Dashboard Principal (589 linhas)
```typescript
// Estado: stats, activities, upcoming, analytics (dados acadêmicos)
//         drivers, drawerDriver, selectedDriver (rastreamento)
//         alerts, driverFilter, estadoFilter (filtros)

// load(): a cada 30s — getStats() + getRecentActivity() + getUpcomingClasses() + /dashboard/analytics
// loadDrivers(): a cada 30s — GET /driver/location/active → busca trails por trip
//   BYPASS-DEMO-ALERTAS: gera alertas sintéticos baseados em capturedAt
//     (remove para produção — alertas chegam via WS em produção)

// WS handlers via window.addEventListener:
//   'ws:driver_location_update' → atualiza posição + trail do motorista no state
//   'ws:driver_alert' → adiciona alerta ao painel

// Componentes internos:
//   useCountUp(target, 1000) → animação de contagem de números
//   Sparkline({ data, color }) → gráfico SVG minimalista (polyline + dot final)
//   KPI({ label, value, sub, color, bg, border, spark, suffix }) → card KPI

// Layout de seções:
//   ROW 1: 4 KPIs primários (grid-4-cols)
//   ROW 2: 3 métricas secundárias (grid-3-cols)
//   ROW 3: Barra de distribuição MA/PI
//   ROW 4: Atividades Recentes + Próximas Turmas (grid-2-cols)
//   ROW 5: Acesso Rápido (links)
//   ROW 6: Motoristas em Rota (Mapa + Lista + Alertas)

// Filtros de motoristas:
//   extractUF(driver): extrai UFs do trip.origin + trip.destination
//   estadoFilter: 'TODOS'|'MA'|'PI'|'AC'
//   driverFilter: 'TODOS'|userId
//   driversFiltered: intersection dos dois filtros

// DriverDrawer: abre ao clicar no pin/card, bloqueia scroll em .admin-content
//   onClose: restaura overflowY: 'auto' em .admin-content
```

### 6.6 components/MapaMotoristas.tsx — Leaflet Map (343 linhas)
```typescript
// Leaflet vanilla (sem react-leaflet) — import dinâmico em useEffect
// Fix StrictMode: verifica _leaflet_id antes de inicializar (evita dupla init)
// Centro padrão: [-5.0, -44.5], zoom: 6 (cobre MA+PI+AC)
// Tiles: OpenStreetMap

// REFS (keyed por tripKey = driver.trip.id, NUNCA por userId):
//   markersRef, trailsRef, routesRef (Map<tripKey, LeafletLayer>)
//   fullRouteCacheRef, trailCacheRef (cache OSRM por tripKey)

// routeOSRM(from, to): chama router.project-osrm.org
//   AbortSignal.timeout(8000), fallback [from, to] em caso de erro
//   GeoJSON [lon, lat] → invertido para [lat, lon] (Leaflet)

// buildRoadTrail(pts[]): OSRM entre cada par consecutivo de pontos GPS
// sliceByProgress(route, pct): fatia X% da rota completa

// updateMap():
//   1. Remove layers de trips que saíram (diff com activeKeys)
//   2. Para cada motorista com lastLocation:
//      - Cria divIcon colorido com inicial do nome (verde/amarelo/vermelho)
//      - Popup com nome, rota, ETA, velocidade, timestamp
//      - Cria/atualiza marker (setLatLng se existente)
//      - Busca/cacheia rota completa OSRM origem→destino
//      - Trilha percorrida: GPS reais → OSRM snap-to-road OU sliceByProgress
//      - Rota restante: polyline pontilhada (dashArray: '8 10')
//      - Pin de destino com tooltip
//   3. Centraliza no motorista selecionado (setView zoom:10)

// BUG ATIVO (BUG-OSRM-RATE-LIMIT):
//   ~80 chamadas OSRM simultâneas → rate limit → catch silencioso → linha reta
//   Fix: F5.16 (seed grava pontos de estrada, remover OSRM do frontend)
```

### 6.7 components/DriverDrawer.tsx — Drawer lateral
```typescript
// BUG ATIVO (BUG-DRAWER-TRANSFORM):
//   position: fixed não âncora no viewport — animate-fade-in no pai
//   cria containing block via transform: translateY(0)
//   Fix: F5.13 (createPortal para document.body)

// Renderiza: overlay semitransparente + drawer 380px à direita
// Animação: slideInRight .25s cubic-bezier(.22,1,.36,1)
// Conteúdo: header (avatar+status), rota+progresso, ETA+distância, posição atual
// STATUS_LABEL: online=verde, stopped=amarelo, offline=vermelho
```

### 6.8 hooks/useNotifications.ts — WebSocket Client (112 linhas)
```typescript
// Lê token de sessionStorage (fallback localStorage legado)
// PASSO A: carrega histórico de notificações do banco ao montar
//   GET /notifications?limit=50 → armazena no state local
// PASSO B: conecta Socket.io ao /notifications namespace
//   auth: { token }, reconnectionAttempts: 5, reconnectionDelay: 2000
// addNotification(type, data): cria objeto Notification com buildMessage()
// Eventos ouvidos: nova_inscricao, inscricao_aprovada/rejeitada,
//   frequencia_registrada, imprevisto_cadastrado, reembolso_solicitado/revisado,
//   custo_excessivo
// Retorna: { notifications[], unreadCount, connected, markAllRead }
// IMPORTANTE: eventos driver_location_update e driver_alert NÃO são ouvidos aqui
//   Eles são ouvidos via window.addEventListener no dashboard/page.tsx
```

### 6.9 hooks/useDriverTracking.ts — GPS Polling (140 linhas)
```typescript
// POLL_INTERVAL_MS = 3 * 60 * 1000 (3 minutos)
// OFFLINE_QUEUE_KEY = 'driver_location_queue' (sessionStorage)

// start(): sendLocation('checkin') imediato + setInterval('polling', 3min)
// stop(): clearInterval
// enabled prop: controla start/stop via useEffect

// sendLocation(source):
//   navigator.geolocation.getCurrentPosition(
//     { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 })
//   → POST /driver/location com { lat, lng, accuracy, speed(km/h), heading, capturedAt }
//   Em erro de rede: enfileira em sessionStorage para batch posterior

// flushQueue(): POST /driver/location/batch → clearQueue()
// window.addEventListener('online', flushQueue) → flush ao reconectar
// Flush imediato ao montar (caso tenha fila de sessão anterior)
```

### 6.10 app/driver/dashboard/page.tsx — Portal do Motorista (611 linhas)
```typescript
// DASHBOARD_CSS: const fora do componente (LIVRO §7) — CSS animations e classes
// useDriverTracking({ enabled: gpsActive && !!activeTrip })

// load(): busca trips, reembolsos, imprevistos, performance em paralelo
//   setActiveTrip: trip com status='IN_TRANSIT'
//   setNextTrip: trip com status='PLANNED'
//   setStats: { tripsMonth, kmMonth, pendingValue, absencesPending }

// handleStart():
//   1. Verifica suporte geolocalização
//   2. Solicita permissão GPS (getCurrentPosition timeout:8000)
//   3. PATCH /driver/trips/:id/start { kmStart }
//   4. setGpsActive(true) — ativa polling useDriverTracking
// handleComplete():
//   1. sendCheckin() — posição final
//   2. PATCH /driver/trips/:id/complete { kmEnd }
//   3. setGpsActive(false) — para polling
// handleNote(): PATCH /driver/trips/:id/notes { note }

// Cards renderizados:
//   HERO: avatar + nome + data + badge GPS ON + 4 KPIs (tripsMonth, kmMonth, pendingValue, absences)
//   VIAGEM ATIVA: rota, barra progresso, ETA backend, velocidade, Cheguei/Ocorrência
//   PRÓXIMA VIAGEM: dados + botão Iniciar (apenas se não tem ativa)
//   SEM VIAGEM: mensagem "nenhuma viagem atribuída"
//   MEU DESEMPENHO: pontualidade semanal + km+velocidade mensal + ranking
//   AÇÕES RÁPIDAS: 5 botões (Reembolso, Ver Viagens, Meu Veículo, Imprevisto, Minha Rota)

// Modais (state-driven, overlay com click-fora para fechar):
//   kmModal ('start'|'end'|null): input km + info GPS
//   noteModal: textarea para ocorrência
```

### 6.11 globals.css — Design System
```
// Variáveis CSS: --bg-primary, --bg-card, --text-primary, --text-muted, --accent-yellow
// Cores institucionais: #FFD600 (amarelo), #0F172A (dark), branco

// Classes de grid responsivas:
//   .grid-4-cols → 4 colunas desktop, 2 em ≤1024px, 1 em ≤768px
//   .grid-3-cols → 3 desktop, 1 em ≤768px
//   .grid-2-cols → 2 desktop, 1 em ≤768px

// Admin layout:
//   .admin-layout: display flex, height 100vh, overflow hidden
//   .admin-main: flex 1, overflow hidden
//   .admin-content: flex 1, overflow-y auto, padding 2rem
//   .admin-topbar: z-index 40
//   sidebar mobile: position fixed, z-index 100, transform translateX(-240px)
//   sidebar.open: transform translateX(0)
//   sidebar-overlay: z-index 99

// Animações:
//   .animate-fade-in → fadeInUp (.5s, fill-mode: both)
//   ⚠️ CAUSA BUG-DRAWER-TRANSFORM: fill-mode:both mantém transform:translateY(0) ativo
//   fadeInRight, scaleIn, slideDown, countUp, spinnerRotate
//   drv-slide-up, drv-pulse-dot, drv-shimmer (portal motorista)

// Custom scrollbar: .custom-scrollbar (webkit, firefox)
// Glass cards: .glass-card com hover translateY(-2px)
// Stat cards: .stat-card com border-bottom animado
// Badges: .badge-yellow, .badge-green, .badge-blue, .badge-red
// Spinner: .spinner com spinnerRotate
// Responsividade: .admin-content padding 1rem em ≤768px
```


---

## 7. FLUXOS CRÍTICOS DE NEGÓCIO

### 7.1 Fluxo de Login
```
Browser → POST /api/auth/login { email|CPF, password }
  ↓
AuthService.login():
  Se CPF: Student.cpf → User | User(ADMIN/COORD) por cpf
  Se email: User.email
  bcrypt.compare(password, user.password)
  Se twoFactorEnabled: return { requiresTwoFactor: true, userId }
  Senão: generateTokens() → RefreshToken salvo no banco
  return { user, access_token, refresh_token, student? }
  ↓
Frontend:
  sessionStorage.setItem('token', access_token)
  sessionStorage.setItem('user', JSON.stringify(user))
  if (student) sessionStorage.setItem('student', JSON.stringify(student))
  Redireciona por role:
    ADMIN/COORDINATOR → /admin/dashboard
    TEACHER           → /teacher/dashboard
    STUDENT           → /student/dashboard
    DRIVER            → /driver/dashboard
```

### 7.2 Fluxo de Inscrição (Kanban)
```
PENDING → (admin aprova) → DOCUMENT_PENDING ou APPROVED ou WAITLIST ou REJECTED
DOCUMENT_PENDING → (documentos enviados) → APPROVED ou REJECTED
APPROVED → (admin confirma matrícula) → ENROLLED (estado final)
APPROVED → (admin rejeita) → REJECTED
WAITLIST → (vaga abriu) → APPROVED ou REJECTED

// Estados finais: ENROLLED, REJECTED — não podem ser arrastados
// Validação dupla: VALID_TRANSITIONS no frontend + switch no controller
// Notificações WS em cada transição via NotificationsGateway

// Backend: PATCH /enrollments/:id/status { status }
// Controller switch cobre TODOS os cases (default → BadRequestException)
// BUG-DASH-01: contagem de aprovados = APPROVED + ENROLLED (não só APPROVED)
```

### 7.3 Fluxo de Rastreamento GPS
```
Motorista (celular):
  Clica "Iniciar Viagem" → solicita GPS → PATCH /driver/trips/:id/start { kmStart }
  useDriverTracking({ enabled: true })
    → sendLocation('checkin') imediato
    → setInterval 3min: sendLocation('polling')
    → Se offline: addToQueue(sessionStorage) → flush automático ao reconectar

  POST /driver/location { latitude, longitude, accuracy, speed, heading, capturedAt, source }
    ↓ backend:
    saveLocation(dto) → driverLocation criado no banco
    notifyAdmins('driver_location_update', { driverUserId, lat, lng, speed, capturedAt })
    verificarAlertas() → emite driver_alert se condições atingidas

Admin (browser):
  Polling 30s: GET /driver/location/active
    ↓ backend:
    getMotoristaAtivos(): trips IN_TRANSIT → última localização → status → ETA → progresso
  WS 'driver_location_update' → atualiza posição no state sem reload
  WS 'driver_alert' → adiciona ao painel de alertas
  MapaMotoristas: renderiza pins + trilha + rota estimada (Leaflet)
  DriverDrawer: clique no pin → detalhes completos

Motorista (chegada):
  Clica "Cheguei" → sendCheckin() → PATCH /driver/trips/:id/complete { kmEnd }
  setGpsActive(false) → para polling
  Trip → status: COMPLETED
```

### 7.4 Fluxo de Frequência de Alunos
```
Professor seleciona turma → GET /classes?teacherUserId=X
  ↓ escolhe data (calendário)
  ↓ busca alunos: GET /classes/:id/enrollments?status=ENROLLED
  ↓ para cada aluno: toggle P (presente) / F (falta)
  ↓ POST /attendance { classId, studentId, date: UTC_midnight, present }
  ↓ success → notifyAll('frequencia_registrada', { totalRegistros, date })

// Data UTC: new Date(Date.UTC(y, m-1, d)) — evita timezone shift
// Unique constraint: (classId, studentId, date)
// Taxa de aprovação: ≥75% presença → apto a certificado
```

### 7.5 Fluxo de Reembolso
```
Usuário (professor/motorista):
  POST /reimbursements { type, amount, description, receiptUrl? }
  Foto do recibo: upload para MinIO via presigned URL
    → PUT https://minio:9000/bucket/path?token
    → receiptUrl salvo no banco

Admin:
  GET /reimbursements → { data: [], meta: {} }
  PATCH /reimbursements/:id/status { status: 'APPROVED'|'REJECTED', rejectionReason? }
  Notificação WS: 'reembolso_revisado' para o solicitante

// ExpenseStatus: PENDING → APPROVED ou REJECTED
// Soft delete: active: true/false
// NUNCA Float para amount — sempre Decimal(10,2)
```

### 7.6 Fluxo de Certificados
```
Admin emite certificado:
  POST /certificates { studentId, classId }
    ↓ backend:
    gera verificationCode (UUID único)
    gera QR Code (dados do certificado) via qrcode lib
    renderiza PDF via Puppeteer
    salva PDF no MinIO
    cria Certificate { studentId, classId, verificationCode, qrCodeUrl, fileUrl, status: 'ACTIVE' }
    notifica aluno via WS

Aluno visualiza:
  GET /certificates?studentId=X
  Abre PDF via fileUrl (MinIO presigned URL)
  QR Code → URL de verificação pública /certificado?code=XYZ

// BUG-DASH-02: contagem real = certificate.count({ status: 'ACTIVE' })
//   Não inferir de enrollment.status — são entidades independentes
```

---

## 8. SEED COMPLETO — DADOS DE DEMO

### 8.1 Estrutura do seed-full.ts
```
main() → se --refresh-drivers: refreshDriverTimestamps() e encerra
         senão: executa em sequência:

runSeed1_base():       Grupos MA/PI/AC, 30 cidades com lat/lng, 8 cursos, admin
runSeed2_usuariosVisuais(): Maria(TEACHER), João(DRIVER), Aluno, turmas, matrículas
runSeed3_test():       Reembolsos de teste (PENDING/APPROVED/REJECTED), frequências
runSeed_rastreamento(): 11 motoristas demo com DriverLocations, trips e status

// Todos idempotentes: findFirst antes de create, upsert onde disponível
// Função helper min(m) e hrs(h): timestamps relativos a Date.now()
```

### 8.2 Credenciais criadas pelo seed
```
admin@qualifica.com                    → RR@@Upgrade → ADMIN
maria.professora.visual@qualifica.com  → RR@@Upgrade → TEACHER
joao.driver.test99@qualifica.com       → RR@@Upgrade → DRIVER
aluno@qualifica.com                    → RR@@Upgrade → STUDENT

# Motoristas demo rastreamento:
carlos.souza.demo@qualifica.com        → ONLINE  45% SLZ/MA→Teresina/PI
ana.lima.demo@qualifica.com            → STOPPED 30% Teresina/PI→Floriano/PI (long_stop)
roberto.freitas.demo@qualifica.com     → OFFLINE 60% SenGuiom/AC→RioBranco/AC (no_signal)
marina.costa.demo@qualifica.com        → ONLINE  88% Caxias/MA→SLZ/MA (arriving_soon)
paulo.ramos.demo@qualifica.com         → ONLINE   8% Barras/PI→Teresina/PI (iniciando)
fabio.nunes.demo@qualifica.com         → STOPPED 50% RioBranco/AC→SenGuiom/AC
lea.santos.demo@qualifica.com          → OFFLINE 75% SLZ/MA→Bacabal/MA
diego.alves.demo@qualifica.com         → ONLINE  35% RioBranco/AC→SLZ/MA (rota longa)
tania.melo.demo@qualifica.com          → COMPLETED Teresina/PI→Parnaíba/PI
jonas.pires.demo@qualifica.com         → COMPLETED Floriano/PI→Picos/PI
rosa.cunha.demo@qualifica.com          → COMPLETED RioBranco/AC→Xapuri/AC
```

### 8.3 refreshDriverTimestamps() — Para apresentação
```
Execução: npx tsx prisma/seed-full.ts --refresh-drivers
Rodar: 5 minutos antes da apresentação

Atualiza capturedAt da última DriverLocation de cada motorista demo:
  ONLINE:  now - 3min  (carlos, marina, paulo, diego)
  STOPPED: now - 10min (ana, fabio)
  OFFLINE: now - 120min (roberto, lea)

Sem efeito em: código de produção, lógica de cálculo, outros motoristas
```

---

## 9. REGRAS DE NEGÓCIO CRÍTICAS

| Regra | Valor | Origem |
|-------|-------|--------|
| Threshold de aprovação | ≥75% frequência | Governo |
| Vagas de reserva padrão | 4 vagas | Reunião cliente |
| Diária de custo CLT | R$120/dia | Planilha Robert |
| Limite passagem por distância | 200km | Contrato |
| 2FA obrigatório para | ADMIN, COORDINATOR | REQ-14 |
| Senha padrão dev/seed | RR@@Upgrade | Internal |
| Retenção GPS (LGPD) | 7 dias | LGPD art. 18 |
| Polling GPS motorista | 3 minutos | Definido na Fase 3 |
| Timeout sem sinal → alerta | >15 minutos | Regra de negócio |
| Parada longa → alerta | >30 minutos velocidade ≤2 km/h | Regra de negócio |
| Arriving soon → alerta | ETA < 30 minutos | Regra de negócio |
| Velocidade fallback ETA | 70 km/h | Fallback haversine |
| Salário padrão motorista seed | R$2.800,00 CLT | Seed demo |


---

## 10. ANTI-PADRÕES CATALOGADOS (do código real)

### 10.1 CSS / Frontend
| Anti-Padrão | Consequência | Código afetado |
|-------------|-------------|----------------|
| `animate-fade-in` com `fill-mode: both` em ancestral de modal | `transform:translateY(0)` permanece → `position:fixed` não é relativo ao viewport | `admin/dashboard/page.tsx` div raiz |
| OSRM chamado no browser em paralelo (~80 req) | Rate limit silencioso → `catch{}` → linha reta no mapa | `MapaMotoristas.tsx` |
| `AbortSignal.timeout()` sem verificar `TimeoutError` vs `AbortError` | Erro descartado silenciosamente | `MapaMotoristas.tsx` routeOSRM |
| localStorage para auth state | Dados vazam entre abas (BUG-SESSION-01) | **CORRIGIDO** → sessionStorage |
| `body.style.overflow = 'hidden'` para bloquear scroll do drawer | Não funciona — scroll está em `.admin-content`, não no body | `DriverDrawer.tsx` — **CORRIGIDO** parcialmente |

### 10.2 Backend / NestJS
| Anti-Padrão | Consequência | Status |
|-------------|-------------|--------|
| `@Roles()` sem `@UseGuards(RolesGuard)` | Zero proteção real | **CORRIGIDO** em todos os controllers |
| Rota `:id` antes de rota literal `active` | NestJS captura 'active' como UUID | **CORRIGIDO** — literais antes de :id |
| `req.user.sub` em controllers | JwtStrategy retorna `id`, não `sub` | **CORRIGIDO** → `req.user.id` |
| `enrollment.status === 'APPROVED'` para contar aprovados | APPROVED é transitório → sempre 0 | **CORRIGIDO** (BUG-DASH-01) |
| `certificate count` via enrollment | Entidades diferentes — sempre errado | **CORRIGIDO** (BUG-DASH-02) |
| Switch sem `default` explícito | Status não mapeado age silenciosamente | **CORRIGIDO** → throw BadRequestException |

### 10.3 Banco de Dados
| Anti-Padrão | Consequência | Status |
|-------------|-------------|--------|
| `new Date(dateString)` sem UTC | Dia errado por timezone (BUG-UTC-DATE) | **CORRIGIDO** → Date.UTC(y, m-1, d) |
| `Float` para valores monetários | Arredondamento binário | **CORRIGIDO** → Decimal(10,2) em todos os models |
| Hard delete `.delete()` em entidades de negócio | Perde histórico, viola LGPD | **CORRIGIDO** → soft delete `active: false` |
| Seed em arquivo separado (seed-rastreamento.ts) | Viola Regra 6 — fragmentação | **CORRIGIDO** → integrado ao seed-full.ts |

---

## 11. BUGS ATIVOS — STATUS ATUAL

### BUG-DRAWER-TRANSFORM (F5.13) — ❌ PENDENTE
**Arquivo:** `frontend/app/admin/dashboard/page.tsx`
**Causa:** `<div className="animate-fade-in">` → `fill-mode: both` → `transform:translateY(0)` permanente → containing block para `position:fixed`
**Fix:** `React.createPortal(drawerElement, document.body)` com mounted check:
```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
{mounted && drawerDriver && createPortal(<DriverDrawer .../>, document.body)}
```

### BUG-STATUS-STALE (F5.14) — ❌ PENDENTE
**Arquivo:** `backend/src/driver-location/driver-location.service.ts`
**Causa:** Seed grava timestamps fixos → após 5min todos STOPPED, 15min todos OFFLINE
**Fix (bypass demo):** Token `[DEMO:online/stopped/offline]` no campo `notes` da Trip
```typescript
// BYPASS-DEMO-STATUS (remover para produção):
const demoMatch = trip.notes?.match(/\[DEMO:(online|stopped|offline)\]/);
if (demoMatch) status = demoMatch[1] as typeof status;
```
**Seed:** adicionar `notes: '[DEMO:online]'` etc. em cada Trip dos motoristas demo

### BUG-COMPLETED-MAPA (F5.15) — ❌ PENDENTE
**Arquivo:** `backend/src/driver-location/driver-location.service.ts`
**Causa:** `getMotoristaAtivos()` filtra só `status: 'IN_TRANSIT'` → COMPLETED some imediatamente
**Fix (regra de negócio real):** Incluir também drivers com DriverLocation < 24h sem trip ativa
→ aparecem como `status: 'offline'` com última posição conhecida

### BUG-OSRM-RATE-LIMIT (F5.16) — ❌ PENDENTE
**Arquivo:** `frontend/components/MapaMotoristas.tsx` + `backend/prisma/seed-full.ts`
**Causa:** Browser faz ~80 chamadas OSRM simultâneas → rate limit → `catch{}` silencioso → linha reta
**Fix (bypass demo):** Seed chama OSRM do Node.js (sem CORS/rate limit) e grava pontos das estradas
→ Frontend apenas desenha polylines, zero OSRM no browser
**Fix (produção):** Backend calcula OSRM + cache Redis 7 dias, retorna `routePoints` no endpoint

---

## 12. ENDPOINTS DA API — MAPEAMENTO COMPLETO

### Auth
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| POST | /auth/register | PUBLIC | Cria usuário (sempre STUDENT) |
| POST | /auth/login | PUBLIC | Login por email ou CPF |
| POST | /auth/refresh | PUBLIC | Renova access_token via refresh_token |
| POST | /auth/logout | JWT | Limpa refresh tokens do banco |
| GET | /auth/profile | JWT | Retorna req.user |
| POST | /auth/2fa/generate | JWT | Gera QR Code para Google Authenticator |
| POST | /auth/2fa/enable | JWT | Ativa 2FA após confirmar código |
| POST | /auth/2fa/verify | PUBLIC | Verifica TOTP + emite JWT |
| POST | /auth/2fa/disable | JWT | Desativa 2FA |

### Dashboard
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | /dashboard/stats | ADMIN | KPIs: alunos, cursos, turmas, inscrições |
| GET | /dashboard/analytics | ADMIN | Analytics: meses, cursos, estados, status |
| GET | /dashboard/upcoming | ADMIN | Próximas turmas (30 dias) |
| GET | /dashboard/activity | ADMIN | Atividades recentes |
| GET | /dashboard/rotas-bi | ADMIN | BI operacional de rotas |

### Rastreamento GPS
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| POST | /driver/location | DRIVER | Salva posição atual (checkin ou polling) |
| POST | /driver/location/batch | DRIVER | Lote offline com dedup por timestamp |
| GET | /driver/location/active | ADMIN | Todos motoristas IN_TRANSIT |
| GET | /driver/me/performance | DRIVER | KPIs e ranking do motorista |
| GET | /driver/location/:tripId/trail | ADMIN | Trilha completa da viagem |

### Viagens
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | /driver/trips | DRIVER | Viagens do motorista autenticado |
| PATCH | /driver/trips/:id/start | DRIVER | Inicia viagem { kmStart } |
| PATCH | /driver/trips/:id/complete | DRIVER | Finaliza viagem { kmEnd } |
| PATCH | /driver/trips/:id/notes | DRIVER | Registra ocorrência |

### Inscrições (Kanban)
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | /enrollments | ADMIN | Lista inscrições com filtros |
| POST | /enrollments | STUDENT | Nova inscrição |
| PATCH | /enrollments/:id/status | ADMIN | Transição de status |
| GET | /enrollments/my | STUDENT | Inscrições do aluno autenticado |

### Reembolsos
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | /reimbursements | ADMIN | Lista com paginação { data, meta } |
| POST | /reimbursements | TEACHER,DRIVER | Nova solicitação |
| PATCH | /reimbursements/:id/status | ADMIN | Aprova/rejeita |

### Professores
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| POST | /teachers/me/checkin | TEACHER | Registra ponto diário |
| GET | /teachers/me/checkins | TEACHER | Histórico de checkins |

---

## 13. VARIÁVEIS DE AMBIENTE

### Backend (.env)
```env
DATABASE_URL=postgresql://cursos_user:cursos_password@localhost:5432/cursos_db
JWT_SECRET=<secret>
JWT_REFRESH_SECRET=<refresh_secret>
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
GOOGLE_MAPS_KEY=<opcional — fallback haversine se ausente>
MAINTENANCE_KEY=<opcional — bypass manutenção via header>
PORT=3001
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
REDIS_URL=redis://:RR@@Upgrade@localhost:6379
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

---

## 14. PADRÕES DE CÓDIGO OBRIGATÓRIOS

### Backend
- `req.user.id` SEMPRE — nunca `req.user.sub`
- `@Roles()` + `@UseGuards(JwtAuthGuard, RolesGuard)` sempre juntos
- Rotas literais ANTES de `:id` no NestJS
- WS em try/catch separado, fora de `$transaction`
- Soft delete sempre — nunca `.delete()` em entidades de negócio
- `new Logger(NomeDaClasse.name)` — nunca `console.log`
- `Decimal @db.Decimal(12,2)` para dinheiro — nunca Float
- `new Date(Date.UTC(y, m-1, d))` para datas de frequência

### Frontend
- sessionStorage para auth — nunca localStorage
- `catch (err: any) { toast.error(err?.response?.data?.message) }` — nunca `catch {}`
- `className="animate-fade-in"` no wrapper raiz de todo componente novo
- `Array.isArray(res.data) ? res.data : (res.data?.data ?? [])` para listagens
- `VALID_TRANSITIONS` matrix antes de chamar API de kanban
- `console.log/error` proibido — usar `toast.error()`

### Commits
```
fix: descrição do bug
feat: nova funcionalidade
refactor: sem mudança comportamento
docs: documentação
chore: infra, configs

Checklist: npx tsc --noEmit → zero erros + npm run build + testar ao vivo + aval Tech Lead
```

---

## 15. ESTADO ATUAL DO PROJETO — RESUMO EXECUTIVO

### ✅ 100% Concluído (Fases 1-4)

| Portal | Funcionalidades |
|--------|----------------|
| **Admin** | Dashboard analytics, CRUD completo, Kanban inscrições, frequência, certificados, reembolsos, contas a pagar, configurações, tutorial, mapa GPS tempo real |
| **Professor** | Dashboard, frequência turmas, histórico, ponto (checkin), reembolsos, imprevistos |
| **Aluno** | Dashboard, inscrições, frequência calendário, certificados QR, imprevistos |
| **Motorista** | Dashboard GPS, iniciar/finalizar viagem, rastreamento polling, desempenho, reembolsos, manutenção, imprevistos |

### 🚧 Fase 5 — 4 bugs bloqueando apresentação executiva

| # | Bug | Fix | Arquivo |
|---|-----|-----|---------|
| F5.13 | Drawer não fixa no viewport | `createPortal(drawer, document.body)` | `admin/dashboard/page.tsx` |
| F5.14 | Status sempre "sem sinal" | Token `[DEMO:status]` no `notes` da Trip | `service.ts` + `seed-full.ts` |
| F5.15 | Motorista some após COMPLETED | Incluir DriverLocation < 24h | `driver-location.service.ts` |
| F5.16 | Linhas retas no mapa | Seed calcula OSRM Node.js, grava pontos | `seed-full.ts` |

**Ordem de implementação:** F5.16 → F5.14 → F5.15 → F5.13

### 🔮 Fase 6 — Pós-apresentação (produção real)
1. Remover 3 bypasses demo (BYPASS-DEMO-STATUS, BYPASS-DEMO-OSRM, BYPASS-DEMO-ALERTAS)
2. `routePoints Json?` na Trip → migration
3. `getOrCalculateRoute()` no service (OSRM backend + cache Redis 7 dias)
4. Frontend recebe `routePoints` do endpoint — zero OSRM no browser

---

---

## 11. MÓDULOS BACKEND — ANÁLISE COMPLETA DE LÓGICA

> Esta seção documenta os módulos mais complexos que não aparecem nas seções anteriores.
> Leia antes de qualquer alteração nos módulos correspondentes.

### 11.1 MÓDULO: Acoes (Períodos de Curso / Rotas)

**O que é:** A "Ação" é a unidade operacional central do sistema. Representa uma expedição da carreta-escola a uma cidade — com datas, equipe, custos, turmas e feriados vinculados.

**Glossário real:**
- `Acao` no banco = "Período de Curso" ou "Rota" na interface
- `Carreta` = veículo-escola (`Truck` no código)
- `AcaoFuncionario` = vinculação de funcionário à ação (com diária e dias trabalhados)
- `AcaoCusto` = lançamento real de custo (abastecimento, diária, despesa geral)
- `AcaoEquipe` = membro da equipe base por userId (não necessariamente employee)
- `AcaoTurma` = relacionamento M:N entre Acao e Class

**Lógica de custos (AcoesService.calcularResumoFinanceiro):**
```
ESTIMADO:
  combustível = (distanciaKm × 2) / autonomiaKmL × precoCombustivelL
  diárias = Σ funcionários:
    valorDiaria × diasTrabalhados
    + SE CLT: (salárioMensal / diasUteisRefMes) × diasTrabalhados
    + passagens: SE km ≤ 200 → por semana; SE km > 200 → quinzenal

REAL:
  abastecimentos + despesas_gerais + diarias_pagas (via AcaoCusto)

ALERTA: SE real > estimado × (percentualAlertaCusto/100)
  → Logger.warn() + cria Notification no banco
  → Configurável em SettingsService
```

**Auto-geração de ContaPagar:**
- Ao adicionar `AcaoFuncionario` → cria `AcaoCusto` + `ContaPagar` automaticamente
- Ao mudar status para `EM_ANDAMENTO` → recria `ContaPagar` para todos os funcionários
- Ao remover funcionário → deleta `AcaoCusto` + `ContaPagar` relacionados

**Status da Ação:** `PLANEJADA` → `EM_ANDAMENTO` → `CONCLUIDA` | `CANCELADA`
- Cancelamento = soft delete via status (nunca DELETE físico)

---

### 11.2 MÓDULO: Reembolso (REQ-10)

**O que é:** Professores e motoristas registram despesas de campo (alimentação, material, reparos) e o admin aprova/rejeita.

**Fluxo completo:**
```
1. Usuário (teacher/driver) solicita presigned URL:
   POST /api/reimbursements/upload-url?filename=recibo.jpg
   → MinioService.presignedPutUrl(bucket='reimbursements', key=userId/timestamp_file, 900s)
   → retorna { uploadUrl, fileKey }

2. Frontend faz PUT direto para MinIO (não passa pelo NestJS)

3. Após upload, cria o reembolso:
   POST /api/reimbursements
   body: { type, amount, description, receiptUrl: fileKey }
   → salva com status: 'PENDING'
   → WS: notifyAdmins('reembolso_solicitado')

4. Admin vê em /admin/reembolsos (paginado: { data, meta })
   PATCH /api/reimbursements/:id/approve → status APPROVED + notifyUser ao solicitante
   PATCH /api/reimbursements/:id/reject  → status REJECTED + motivo + notifyUser

5. Cancelamento pelo próprio solicitante (apenas PENDING):
   DELETE /api/reimbursements/:id → soft delete (active: false)
```

**Tipos de reembolso (enum):**
`CLASSROOM_MATERIAL | CLEANING_MATERIAL | EMERGENCY_REPAIR | FOOD | OTHER`

**Atenção frontend:** `GET /reimbursements` retorna `{ data: [], meta: {} }` — NUNCA `Array.isArray(res.data)` direto. Usar `res.data?.data ?? []`.

---

### 11.3 MÓDULO: Imprevistos — Ausências Multi-Perfil (EXEC-IMPREVISTOS)

**O que é:** Módulo unificado para professores, motoristas e alunos registrarem ausências/imprevistos. O admin revisa e pode validar, rejeitar ou aplicar penalidade.

**Tabela `Absence`:** `userId, type, date, description, documentUrl?, status, adminNote?, penalty?, reviewedBy?, reviewedAt?, active`

**Status:** `PENDING` → `VALIDATED` | `REJECTED` | `PENALIZED`

**Tipos (enum AbsenceType):** `ILLNESS | OTHER | ACCIDENT` (e outros conforme schema)

**Fluxo:**
```
Qualquer perfil (driver/teacher/student):
  POST /api/absences
  body: { type, date, description, documentUrl? }
  → WS: notifyAdmins('imprevisto_cadastrado')

Admin:
  GET /api/absences?status=PENDING          → lista filtrada
  PATCH /api/absences/:id                   → edita dados (admin)
  PATCH /api/absences/:id/review            → { status: 'VALIDATED'|'REJECTED'|'PENALIZED', adminNote?, penalty? }
  DELETE /api/absences/:id                  → soft delete (active: false)

Admin pode também criar imprevisto em nome de outro usuário:
  POST /api/absences/admin?targetUserId=:id
```

---

### 11.4 MÓDULO: Feriados / ClassHoliday (REQ-08)

**O que é:** Gerencia dias sem aula para uma turma específica, recalculando automaticamente a data de término.

**Regra de negócio:** "Era para terminar dia 12, vai terminar dia 13 agora" — ao registrar dia sem aula, a `endDate` da turma é empurrada 1 dia útil para frente.

**Dia útil:** Segunda a sexta, sem ser feriado nacional fixo brasileiro.
- Feriados nacionais hardcoded: Ano Novo, Tiradentes, Dia do Trabalho, Independência, N.Sra.Aparecida, Finados, Proclamação da República, Natal.
- Feriados municipais: configuráveis via `/admin/feriados`

**API:**
```
POST /api/holidays/class/:classId     → registra dia sem aula + empurra endDate
GET  /api/holidays/class/:classId     → lista dias sem aula da turma
DELETE /api/holidays/:id              → remove + reverte endDate 1 dia útil
GET  /api/holidays/national/:year     → lista feriados nacionais (para calendário frontend)
```

---

### 11.5 MÓDULO: Relatórios PDF (REQ-11/12)

**O que é:** Geração de PDFs via `pdf.service.ts` (usa `pdf-lib` ou equivalente). **Modelo provisório** — não finalizado para produção.

**Arquivos:** `backend/src/reports/pdf.service.ts` (20kb), `reports.controller.ts`, `reports.module.ts`

**Tipos de relatório disponíveis:**
- Lista de frequência por turma (PDF para impressão)
- Lista de concludentes (alunos com ≥75% de frequência)

**Endpoint:** `GET /api/reports/attendance/:classId` e `GET /api/reports/concludentes/:classId`

**Importante:** O `fileUrl` do Certificate é preenchido aqui quando o PDF do certificado é gerado.

---

### 11.6 MÓDULO: Configurações (REQ-14)

**Estratégia:** Não usa tabela de banco. Persiste em `backend/data/settings.json` (arquivo local). Cache em memória (`this.cache`) evita leitura de disco a cada request.

**Parâmetros configuráveis pelo admin:**
| Campo | Default | Uso |
|-------|---------|-----|
| `valorPassagemViagem` | R$270 | Cálculo de passagens em AcoesService |
| `valorDiariaPadrao` | R$120 | Suggere diária ao vincular funcionário |
| `kmLimitePassagemSemanal` | 200km | Define frequência de passagem |
| `diasUteisReferenciaMes` | 22 | Base de cálculo CLT |
| `percentualAlertaCusto` | 110% | Disparo de alerta de custo excessivo |
| `limiteFrequencia` | 75% | Threshold de aprovação (documentado, não usado em validate) |
| `sessaoTimeout` | 480min | Informativo — JWT não usa (validade no token) |
| `doisFatores` | false | Flag informativa — 2FA ativado por usuário individualmente |
| `manutencao` | false | Bloqueia todas as rotas não-admin via middleware main.ts |
| `senhaComplexidade` | 'media' | Validado em `validatePasswordStrength()` |

---

### 11.7 MÓDULO: Dashboard Service

**Endpoints e o que cada um faz:**

| Endpoint | Método | O que retorna |
|----------|--------|--------------|
| `/api/dashboard/stats` | GET | KPIs gerais: cursos, alunos (total/MA/PI), turmas (total/ativas), inscrições (total/pendentes) |
| `/api/dashboard/analytics` | GET | Gráficos: inscrições por mês (12m), alunos por curso (top 10), distribuição por estado, status inscrições, resumo e **certificadosEmitidos** |
| `/api/dashboard/activities` | GET | Feed: 10 atividades recentes (inscrições + turmas) |
| `/api/dashboard/upcoming-classes` | GET | Turmas com início nos próximos 30 dias |
| `/api/dashboard/bi` | GET | BI de rotas: by estado (MA/PI/AC) + by ano |

**Bug corrigido (BUG-DASH-01/02):**
- Taxa de aprovação usava `APPROVED` que desaparece ao virar `ENROLLED` → corrigido para `status IN ('APPROVED', 'ENROLLED')`
- Certificados usavam contagem de enrollment → corrigido para `certificate.count({ where: { status: 'ACTIVE' } })`

---

### 11.8 MÓDULO: Rastreamento GPS — DriverLocation

**Tabela:** `DriverLocation { id, driverUserId, tripId?, latitude, longitude, accuracy?, speed?, heading?, source, capturedAt }`

**Ciclo de vida:**
```
PRODUÇÃO:
  Motorista inicia viagem → useDriverTracking hook ativo
  Polling: a cada 3min → POST /api/driver/location
  Se offline → enfileira em sessionStorage[driver_location_queue]
  Ao ficar online → flush via POST /api/driver/location/batch

  Admin vê no mapa: GET /api/driver/location/active (polling admin a cada 30s)
  Trilha completa: GET /api/driver/location/:tripId/trail

DEMO (seed):
  seed-full.ts grava pontos históricos diretamente no banco
  BYPASS-DEMO-STATUS: token [DEMO:status] no Trip.notes → força status online

LGPD Cleanup:
  @Cron(EVERY_DAY_AT_3AM) → deleta DriverLocation com capturedAt < (agora - 7 dias)
```

**Status calculado por diff de tempo:**
```
diffMin ≤ 5  → 'online'
diffMin ≤ 15 → 'stopped'
diffMin > 15 → 'offline'
```

**ETA:** Haversine (padrão) ou Google Maps se `GOOGLE_MAPS_KEY` no `.env`. Usa velocidade média real do dia (speeds > 5 km/h). Fallback: 70 km/h.

**Performance do motorista (GET /api/driver/me/performance):**
- `kmRodados` no mês: acumulado de pontos GPS consecutivos via Haversine
- `velocidadeMedia`: média de speeds > 5km/h no mês
- `ranking: posição entre motoristas por viagens completas na semana`
- `viagensNoPrazo`: `actualArrivalDate <= expectedArrivalDate`

---

## 12. GLOSSÁRIO DE TERMOS — UI vs BANCO

> Esta tabela é a fonte única de verdade para tradução entre o que o usuário vê e o que o código usa.
> Retirada do LIVRO_DE_REGRAS.md §9.

| Termo na UI | Banco/Código | Descrição |
|-------------|-------------|-----------|
| Período de Curso / Rota | `Acao / acoes` | Operação de campo itinerante da carreta |
| Carreta | `Truck / trucks` | Veículo-escola itinerante |
| Aluno | `Student / students` | Beneficiário do programa |
| Turma | `Class / classes` | Instância de curso em data/local específico |
| Inscrição | `Enrollment / enrollments` | Solicitação do aluno para participar |
| Funcionário | `Employee / employees` | Colaborador externo (instrutor, logístico etc.) |
| Imprevisto | `Absence / absences` | Ausência/imprevisto multi-perfil |
| Preferências | `UserPreferences` | Configurações de UI por usuário |
| Frequência Funcionário | `EmployeeAttendance` | Presença diária de employees |
| Ponto Professor | `TeacherCheckin` | Check-in diário do professor |
| Ação/Período | `Acao` | Rota da carreta com datas, equipe e custos |
| Contas a Pagar | `ContaPagar` | Lançamentos financeiros a vencer |
| Feriado da Turma | `ClassHoliday` | Dia sem aula com recálculo de endDate |
| Localização GPS | `DriverLocation` | Coordenadas do motorista, retidas 7 dias |

---

## 13. MAPA COMPLETO DE ENUMS

```typescript
// UserRole
'ADMIN' | 'COORDINATOR' | 'FINANCIAL' | 'TEACHER' | 'STUDENT' | 'DRIVER'
// NUNCA: 'SUPER_ADMIN' — não existe no enum

// EnrollmentStatus (fluxo Kanban)
'PENDING' → 'APPROVED' → 'ENROLLED'
'PENDING' → 'REJECTED'
'PENDING' → 'WAITLIST' → 'APPROVED'
'PENDING' → 'DOCUMENT_PENDING' → (corrige) → 'PENDING'
'ENROLLED' → 'DROPOUT'

// TripStatus
'PLANNED' → 'IN_TRANSIT' → 'COMPLETED'
'PLANNED'/'IN_TRANSIT' → 'CANCELLED'

// AcaoStatus
'PLANEJADA' → 'EM_ANDAMENTO' → 'CONCLUIDA'
'PLANEJADA'/'EM_ANDAMENTO' → 'CANCELADA'

// AbsenceStatus
'PENDING' → 'VALIDATED' | 'REJECTED' | 'PENALIZED'

// ExpenseStatus (Reembolso)
'PENDING' → 'APPROVED' | 'REJECTED'
// Cancelamento pelo solicitante: active: false (soft delete)

// CertificateStatus
'ACTIVE' | 'CANCELLED'

// ClassStatus
'DRAFT' | 'ENROLLMENT_OPEN' | 'ENROLLMENT_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

// ReimbursementType
'CLASSROOM_MATERIAL' | 'CLEANING_MATERIAL' | 'EMERGENCY_REPAIR' | 'FOOD' | 'OTHER'

// TruckType
'STANDARD' | 'MULTICOURSE'

// NotificationType
'GENERAL_ANNOUNCEMENT' + eventos WS: 'nova_inscricao' | 'inscricao_aprovada' |
'inscricao_rejeitada' | 'frequencia_registrada' | 'imprevisto_cadastrado' |
'reembolso_solicitado' | 'reembolso_revisado' | 'custo_excessivo' |
'driver_location_update' | 'driver_trip_started' | 'driver_arrived' | 'driver_alert'
```

---

## 14. REGRAS DE NEGÓCIO CONSOLIDADAS

| Regra | Valor | Fonte |
|-------|-------|-------|
| Threshold de frequência para aprovação/certificado | **≥ 75%** | LIVRO_DE_REGRAS §10 |
| Vagas de reserva padrão em turma | **4 vagas** | LIVRO_DE_REGRAS §10 |
| Diária padrão CLT | **R$ 120/dia** | settings.valorDiariaPadrao |
| Limite de distância para passagem semanal | **200 km** | settings.kmLimitePassagemSemanal |
| Passagem por trajeto | **R$ 270** | settings.valorPassagemViagem |
| Dias úteis referência CLT/mês | **22 dias** | settings.diasUteisReferenciaMes |
| Alerta de custo excessivo | **> 110% do estimado** | settings.percentualAlertaCusto |
| Retenção de dados GPS | **7 dias** | LGPD — cron cleanupOldLocations |
| Timeout de status GPS online | **≤ 5 min** | DriverLocationService |
| Timeout de status GPS stopped | **≤ 15 min** | DriverLocationService |
| Timeout de status GPS offline | **> 15 min** | DriverLocationService |
| Intervalo de polling GPS (motorista) | **3 min** | useDriverTracking |
| 2FA obrigatório para: | **ADMIN, COORDINATOR** | auth.service + LIVRO §5 |
| Registro público sempre cria: | **STUDENT** | auth.service hardcoded |
| Senha padrão (dev/seed) | **RR@@Upgrade** | seed-full.ts |
| Protocolo de inscrição | `timestamp36-randomHex` | enrollments.service.generateProtocol |
| Código de verificação de certificado | `UPG-timestamp36-rand5` | certificate.service.issueCertificate |
| Velocidade mínima para "em movimento" | **> 5 km/h** | driver-location.service |
| Velocidade de fallback ETA | **70 km/h** | driver-location.service |
| Parada longa alerta | **> 30 min** parado | verificarAlertas |
| ETA "chegando" alerta | **< 30 min** | verificarAlertas |
| Tamanho máximo foto upload | **0.5 MB / 1200px** | LIVRO_DE_REGRAS §1 |
| Paginação reembolsos | **20 por página** | reimbursement.service.findAll |
| Seed único autorizado | `prisma/seed-full.ts` | LIVRO_DE_REGRAS §12 (Aviso 6) |

---

## 15. PADRÕES DE RESPOSTA DA API

> Padrões diferentes por módulo — errar isso causa bugs silenciosos no frontend.

| Endpoint | Formato de resposta | Como usar no frontend |
|----------|--------------------|-----------------------|
| `GET /enrollments` | `[]` (array direto) | `Array.isArray(res.data) ? res.data : []` |
| `GET /reimbursements` | `{ data: [], meta: {} }` | `res.data?.data ?? []` |
| `GET /employees` | `{ employees: [], total, byRole, byDept }` | `res.data?.employees ?? []` |
| `GET /dashboard/analytics` | objeto com múltiplos campos | desestruturar cuidadosamente |
| `GET /driver/location/active` | `[]` de motoristas com ETA | `Array.isArray(…)` direto |
| `GET /trips` | `[]` (array direto) | `Array.isArray(res.data) ? res.data : []` |
| `GET /absences` | `[]` (array direto) | `Array.isArray(res.data) ? res.data : []` |
| `POST /reimbursements/upload-url` | `{ uploadUrl, fileKey }` | usar `uploadUrl` para PUT direto no MinIO |

---

## 16. ESTRUTURA DO FRONTEND — HOOKS E STORES

| Arquivo | O que faz |
|---------|-----------|
| `stores/useAuthStore.ts` | Estado global de auth (Zustand + sessionStorage por aba) |
| `hooks/useDriverTracking.ts` | GPS polling 3min + fila offline + flush ao reconectar |
| `hooks/useNotifications.ts` | Conexão WebSocket `/notifications` + histórico do banco |
| `hooks/useAnimacoes.ts` | Aplica `body.no-animations` conforme UserPreferences |
| `lib/api/client.ts` | Axios com baseURL (`NEXT_PUBLIC_API_URL`) + auth header injetado |
| `components/ui/Toast.tsx` | Sistema de toast (sucesso/erro/info) |
| `components/ui/Tutorial.tsx` | Modal de tutorial com steps, storageKey para "já mostrado" |
| `components/admin/Sidebar.tsx` | Sidebar do admin com navegação e detecção de rota ativa |
| `components/MapaMotoristas.tsx` | Mapa Leaflet com marcadores, trilha, drawer, alertas GPS |

**Padrão de proteção de rotas nos layouts:**
```typescript
// Todos os 4 layouts (admin/teacher/driver/student) usam o mesmo padrão:
const token = sessionStorage.getItem('token')
           || sessionStorage.getItem('access_token')
           || localStorage.getItem('token')     // fallback legacy
           || localStorage.getItem('access_token');
if (!token) router.replace('/login');
```
- Proteção é client-side apenas — o backend valida JWT em cada request via `JwtAuthGuard`
- A verificação dupla (sessionStorage + localStorage) existe para compatibilidade com sessões legadas

---

*Sistema Upgrade | RR TECNOL | Dossiê v2.0 | 06/04/2026*
*Análise completa: todos os serviços do backend, todos os hooks do frontend,*
*LIVRO_DE_REGRAS.md, ESTADO_SISTEMA.md, acoes.service.ts (634 linhas),*
*reimbursement.service.ts (221 linhas), absences.service.ts (135 linhas),*
*holiday.service.ts (183 linhas), certificate.service.ts (156 linhas),*
*students.service.ts (188 linhas), trips.service.ts (229 linhas),*
*driver-location.service.ts (457 linhas), notifications.gateway.ts (88 linhas),*
*settings.service.ts (171 linhas), dashboard.service.ts (329 linhas)*

