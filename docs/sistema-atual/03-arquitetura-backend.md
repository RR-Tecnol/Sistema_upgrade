# Arquitetura do backend

## Stack

- **Runtime:** Node.js  
- **Framework:** NestJS 10 (`backend/src`)  
- **ORM:** Prisma 5 (`backend/prisma/schema.prisma`)  
- **Validação:** `class-validator` / pipes globais onde aplicável  
- **Documentação HTTP:** Swagger em `/api/docs` (configurado em `main.ts`)

## Entrada da aplicação

- `backend/src/main.ts` — bootstrap: body parser (limite elevado para payloads com documentos), Helmet/CSP, CORS a partir de `getFrontendCorsOrigins`, validação de `JWT_SECRET`, middleware de **modo manutenção** (consulta `SettingsService`), porta e Swagger.
- `backend/src/app.module.ts` — registo de **todos** os módulos de domínio e guards globais.

## Módulos NestJS (fonte: `app.module.ts`)

Cada pasta em `backend/src/<nome>/` corresponde, em regra, a um módulo homónimo importado no `AppModule`:

| Módulo | Responsabilidade resumida |
|--------|---------------------------|
| `PrismaModule` | Acesso à base de dados |
| `AuthModule` | Autenticação JWT, login, refresh, MFA |
| `UsersModule` | Utilizadores, professores (sub-recursos conforme controllers) |
| `StudentsModule` | Alunos |
| `CoursesModule` | Cursos |
| `ClassesModule` | Turmas |
| `EnrollmentsModule` | Inscrições |
| `GroupsModule` | Grupos |
| `CitiesModule` | Cidades |
| `TrucksModule` | Carretas / veículos |
| `TripsModule` | Viagens |
| `TruckMaintenanceModule` | Manutenção |
| `EmployeesModule` | Funcionários e fluxos associados (ex.: registo, frequência) |
| `AcoesModule` | Períodos de curso / acções |
| `HolidayModule` | Feriados e políticas de calendário |
| `AbsencesModule` | Ausências / imprevistos multi-perfil |
| `ReimbursementModule` | Reembolsos |
| `ContasPagarModule` | Contas a pagar |
| `ReportsModule` | Relatórios (PDF, métricas, cache, etc.) |
| `CertificateModule` | Certificados (templates, emissão, verificação) |
| `DashboardModule` | KPIs / agregações para painel |
| `SettingsModule` | Configurações globais (ex.: manutenção) — injectável noutros pontos |
| `NotificationsModule` | Tempo real (Socket.IO) |
| `AuditLogModule` | Auditoria de acções |
| `DriverLocationModule` | Rastreamento GPS motoristas |
| `FeedbacksModule` | Feedback pós-curso, anexos, aprovações |
| `InstitutionsModule` | Multi-institutição / white-label |
| `UploadsModule` | Upload de ficheiros |
| `MailModule` | Envio de e-mail |
| `HealthModule` | `GET /api/health`, `GET /api/ready` |

Comentários inline no `app.module.ts` (REQ-xx, SF-xx) são **rótulos históricos de especificação**; a lista acima reflete o **estado atual** dos imports.

## Segurança transversal no HTTP

- **`ThrottlerModule` + `ThrottlerGuard` (global):** limite por defeito (ex.: 60 req/min por IP); endpoints sensíveis podem declarar `@Throttle()` mais restritivo (ex.: geocodificação).
- **Helmet:** cabeçalhos HTTP endurecidos; CSP descrita em comentários em `main.ts`.
- **Modo manutenção:** bloqueia a API excepto rotas allowlist (login, settings, health) e bypass opcional por header com `MAINTENANCE_KEY`.

## Prefixo global da API

Em `main.ts`: `app.setGlobalPrefix('api')`.  
Exemplo: controller `@Controller('auth')` → URLs **`/api/auth/*`**. Swagger: **`/api/docs`**.
