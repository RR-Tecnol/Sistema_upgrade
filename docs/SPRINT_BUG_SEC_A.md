# SPRINT BUG + SEC-A — Correções Funcionais + Segurança Transparente
## Sistema Upgrade | Gravity 2.0 → Antygravity | 16/03/2026
## ✅ AUTORIZADO por Ronaldo (Tech Lead) — Execução iniciada 16/03/2026

> **Estratégia:** Este sprint combina TODOS os bugs funcionais com as correções
> de segurança da Categoria A (transparentes — não mudam fluxo de uso nem
> dificultam testes). São 8 prompts sequenciais ordenados por dependência técnica.
>
> **Executor:** Antygravity (Windsurf/Claude)
> **Monitor:** Gravity 2.0 (esta sessão)
> **Regra:** Executar UM prompt por vez. Reportar resultado antes do próximo.

---

## ORDEM DE EXECUÇÃO

| # | Prompt | Arquivos | Severidade |
|---|--------|----------|-----------|
| P1 | SEC-01 — Privilege Escalation no register | auth.service.ts + auth.controller.ts | 🔴 CRÍTICO |
| P2 | SEC-05 — Maintenance bypass undefined==undefined | main.ts + .env | 🟠 ALTO |
| P3 | SEC-04 — Helmet (HTTP Security Headers) | main.ts + package.json | 🟠 ALTO |
| P4 | BUG-09 — require('bcrypt') → import estático | enrollments.service.ts | 🟠 ALTO |
| P5 | BUG-08 — Race condition enrollment ($transaction) | enrollments.service.ts | 🟠 ALTO |
| P6 | BUG-11 — MinIO Singleton (sem pool por request) | reimbursement.service.ts + novo minio.service.ts | 🟡 MÉDIO |
| P7 | BUG-12 — res.data?.data inconsistência 6 telas | 6 arquivos frontend admin | 🟡 MÉDIO |
| P8 | SEC-07 + BUG-13 — WS userId + console.log | notifications.gateway.ts | 🟡 MÉDIO |

---

## ━━━ PROMPT P1 — SEC-01: Privilege Escalation via POST /auth/register ━━━

**Severidade:** 🔴 CRÍTICO
**Por que agora:** Qualquer pessoa na internet pode criar uma conta ADMIN.
Não interfere em nenhum teste — o registro público nunca deveria aceitar role.

### ARQUIVOS A EDITAR

**ARQUIVO 1:** `backend/src/auth/auth.service.ts`

Leia o arquivo. Localizar o método `register()`.

**MUDANÇA 1 — Assinatura do método (linha ~19):**
```
// ANTES:
async register(data: { email: string; password: string; name: string; phone?: string; role?: string }) {

// DEPOIS:
async register(data: { email: string; password: string; name: string; phone?: string }) {
```

**MUDANÇA 2 — Criação do usuário (linha ~39), remover o campo role dinâmico:**
```
// ANTES:
role: (data.role as any) || 'STUDENT',

// DEPOIS:
role: 'STUDENT',  // Registro público SEMPRE cria STUDENT — nunca aceitar role do body
```

---

**ARQUIVO 2:** `backend/src/auth/auth.controller.ts`

Leia o arquivo. Localizar o método `register()`.

**MUDANÇA — Assinatura do body (linha ~18):**
```
// ANTES:
@Body() body: { email: string; password: string; name: string; phone?: string; role?: string },

// DEPOIS:
@Body() body: { email: string; password: string; name: string; phone?: string },
```

---

### VALIDAÇÃO OBRIGATÓRIA
```powershell
cd backend
npx tsc --noEmit
```
Resultado esperado: zero erros TypeScript.

### DOD
- [ ] Método `register()` não aceita campo `role` em nenhum ponto
- [ ] Role sempre forçada para `'STUDENT'` no service
- [ ] `npx tsc --noEmit` sem erros

### REPORTE
```
P1 — SEC-01
STATUS: ✅ / ❌
TSC: OK / FALHOU
OBSERVAÇÕES: [se houver]
```

---

## ━━━ PROMPT P2 — SEC-05: Maintenance Bypass undefined === undefined ━━━

**Severidade:** 🟠 ALTO
**Por que agora:** O modo manutenção está completamente inoperante.
`undefined === undefined` é sempre `true`, ou seja, o bypass funciona para
QUALQUER request sem o header — incluindo alunos normais.
Não interfere nos testes — corrige comportamento incorreto para o correto.

### ARQUIVO 1: `backend/src/main.ts`

Leia o arquivo. Localizar o bloco do middleware de manutenção.

**MUDANÇA — Lógica do bypass (trecho atual):**
```typescript
// ANTES (BUGADO — undefined === undefined → true SEMPRE):
req.headers['x-admin-bypass'] === process.env.MAINTENANCE_KEY;

// DEPOIS (correto — só permite se chave existe E bate):
const maintenanceKey = process.env.MAINTENANCE_KEY;
const bypassValid =
    !!maintenanceKey &&
    maintenanceKey.length > 0 &&
    req.headers['x-admin-bypass'] === maintenanceKey;
```

Substituir o bloco `const isAllowed = ...` completo por:
```typescript
const maintenanceKey = process.env.MAINTENANCE_KEY;
const bypassValid =
    !!maintenanceKey &&
    maintenanceKey.length > 0 &&
    req.headers['x-admin-bypass'] === maintenanceKey;
const isAllowed =
    allowed.some((p: string) => req.path.startsWith(p)) || bypassValid;
```

---

### ARQUIVO 2: `backend/.env`

Adicionar ao final do arquivo (nova linha):
```
MAINTENANCE_KEY=upgrade_manutencao_2024_chave_local
```

> ATENÇÃO: Em produção substituir por: `openssl rand -hex 16`
> Este valor é apenas para desenvolvimento local.

---

### VALIDAÇÃO
```powershell
cd backend
npx tsc --noEmit
```

### DOD
- [ ] `bypassValid` só é `true` se `MAINTENANCE_KEY` existe no `.env` E o header bate
- [ ] `.env` tem `MAINTENANCE_KEY` definido
- [ ] `npx tsc --noEmit` sem erros

### REPORTE
```
P2 — SEC-05
STATUS: ✅ / ❌
TSC: OK / FALHOU
```

---

## ━━━ PROMPT P3 — SEC-04: Helmet (HTTP Security Headers) ━━━

**Severidade:** 🟠 ALTO
**Por que agora:** Middleware transparente — adicionar helmet não quebra nenhum
fluxo, nenhuma tela, nenhum teste. É literalmente 2 linhas. Fecha XSS, clickjacking,
MIME sniffing e outros vetores de ataque de browser.

### PASSO 1 — Instalar helmet
```powershell
cd backend
npm install helmet
npm install --save-dev @types/helmet
```

### PASSO 2 — `backend/src/main.ts`

Leia o arquivo. Adicionar import e uso do helmet.

**MUDANÇA 1 — Import no topo do arquivo, após os imports existentes:**
```typescript
import helmet from 'helmet';
```

**MUDANÇA 2 — Adicionar uso logo após `NestFactory.create(AppModule)`:**
```typescript
// Após: const app = await NestFactory.create(AppModule);
// Adicionar ANTES de app.setGlobalPrefix('api'):

// Segurança HTTP — headers de proteção (SEC-04)
app.use(helmet({
    crossOriginEmbedderPolicy: false, // necessário para Swagger UI funcionar
    contentSecurityPolicy: false,     // desabilitado em dev — habilitar em produção com política específica
}));
```

> NOTA: `crossOriginEmbedderPolicy: false` e `contentSecurityPolicy: false` são
> necessários para o Swagger (`/api/docs`) funcionar em desenvolvimento.
> Em produção, configurar CSP com a lista de domínios permitidos.

---

### VALIDAÇÃO
```powershell
cd backend
npx tsc --noEmit
npm run start:dev
# Verificar no terminal: servidor sobe sem erros
# Verificar no browser: http://localhost:3001/api/docs ainda abre normalmente
```

### DOD
- [ ] `helmet` instalado no `package.json`
- [ ] `app.use(helmet(...))` no `main.ts` antes do `setGlobalPrefix`
- [ ] Swagger continua acessível em `/api/docs`
- [ ] `npx tsc --noEmit` sem erros

### REPORTE
```
P3 — SEC-04
STATUS: ✅ / ❌
TSC: OK / FALHOU
SWAGGER OK: SIM / NÃO
```

---

## ━━━ PROMPT P4 — BUG-09: require('bcrypt') dinâmico → import estático ━━━

**Severidade:** 🟠 ALTO
**Problema técnico:** `require('bcrypt')` dentro de método async é síncrono,
bloqueia o event loop do Node.js no momento do carregamento, viola o DI do NestJS,
e é inconsistente — o resto do projeto usa `import * as bcrypt from 'bcrypt'`.

### ARQUIVO: `backend/src/enrollments/enrollments.service.ts`

Leia o arquivo.

**MUDANÇA 1 — Adicionar import estático no topo do arquivo,
após a linha `import * as crypto from 'crypto';`:**
```typescript
import * as bcrypt from 'bcrypt';
```

**MUDANÇA 2 — Substituir o método `hashPassword` no final do arquivo:**
```typescript
// ANTES:
private async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt');
    return bcrypt.hash(password, 10);
}

// DEPOIS:
private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}
```

---

### VALIDAÇÃO
```powershell
cd backend
npx tsc --noEmit
```

### DOD
- [ ] `import * as bcrypt from 'bcrypt'` no topo do arquivo
- [ ] Método `hashPassword` não usa mais `require()`
- [ ] `npx tsc --noEmit` sem erros

### REPORTE
```
P4 — BUG-09
STATUS: ✅ / ❌
TSC: OK / FALHOU
```

---

## ━━━ PROMPT P5 — BUG-08: Race Condition no create() de Inscrição ━━━

**Severidade:** 🟠 ALTO
**Problema técnico:** O método `create()` faz check de vagas (linha ~67) e depois
cria o enrollment (linha ~115). Entre esses dois pontos existem 7+ operações
assíncronas (user.create, student.create, address.create, etc.). Dois requests
simultâneos passam ambos no check e ambos criam enrollment → turma com vagas
excedidas. Isso é um TOCTOU clássico (Time-of-Check to Time-of-Use).

### ARQUIVO: `backend/src/enrollments/enrollments.service.ts`

Leia o arquivo. O método `create()` começa na linha ~52 e vai até ~200.

**ESTRATÉGIA:** Envolver todo o método `create()` em `this.prisma.$transaction()`.
Dentro da transação, re-verificar vagas com o client transacional (`tx`) logo antes
de criar o enrollment — isso garante que a contagem é atômica.

**MUDANÇA — Refatorar o método `create()` completo:**

Substituir o corpo inteiro do método `create()` pelo código abaixo.
A lógica de negócio é IDÊNTICA — apenas:
1. Adicionado `this.prisma.$transaction(async (tx) => { ... })`
2. A verificação de vagas é duplicada DENTRO da transação com `tx`
3. O `enrollment.create` final usa `tx` em vez de `this.prisma`

```typescript
async create(createEnrollmentDto: CreateEnrollmentDto) {
    // Validações FORA da transação (leituras que não precisam de lock)
    const classData = await this.prisma.class.findUnique({
        where: { id: createEnrollmentDto.classId },
        include: { course: true },
    });
    if (!classData) throw new NotFoundException('Turma não encontrada');
    if (classData.status !== 'ENROLLMENT_OPEN') {
        throw new BadRequestException('Inscrições não estão abertas para esta turma');
    }

    // Verificar CPF duplicado fora da transação (otimização — conflito detectável antes)
    const existingEnrollment = await this.prisma.enrollment.findFirst({
        where: { classId: createEnrollmentDto.classId, student: { cpf: createEnrollmentDto.cpf } },
    });
    if (existingEnrollment) throw new ConflictException('CPF já cadastrado nesta turma');

    // Gerar protocolo antes da transação
    const protocol = this.generateProtocol();

    // ── TRANSAÇÃO ATÔMICA ────────────────────────────────────────────
    // Garante que check de vagas e criação do enrollment são operações
    // indivisíveis — elimina race condition TOCTOU.
    const enrollment = await this.prisma.$transaction(async (tx) => {

        // Re-verificar vagas DENTRO da transação com lock implícito do Prisma
        const freshClass = await tx.class.findUnique({
            where: { id: createEnrollmentDto.classId },
            include: { _count: { select: { enrollments: true } } },
        });
        if (!freshClass) throw new NotFoundException('Turma não encontrada');
        if (freshClass._count.enrollments >= freshClass.vacancies) {
            throw new BadRequestException('Turma sem vagas disponíveis');
        }

        // Criar ou buscar aluno (DENTRO da transação)
        let student = await tx.student.findUnique({
            where: { cpf: createEnrollmentDto.cpf },
        });

        if (!student) {
            const user = await tx.user.create({
                data: {
                    email: createEnrollmentDto.email,
                    name: createEnrollmentDto.fullName,
                    phone: createEnrollmentDto.phone,
                    role: 'STUDENT',
                    active: true,
                    password: await this.hashPassword(this.generateTemporaryPassword()),
                },
            });
            student = await tx.student.create({
                data: {
                    userId: user.id,
                    cpf: createEnrollmentDto.cpf,
                    rg: createEnrollmentDto.rg,
                    rgIssuer: createEnrollmentDto.rgIssuer,
                    birthDate: new Date(createEnrollmentDto.birthDate),
                    gender: createEnrollmentDto.gender,
                    raceColor: createEnrollmentDto.raceColor,
                    maritalStatus: createEnrollmentDto.maritalStatus,
                    motherName: createEnrollmentDto.motherName,
                    fatherName: createEnrollmentDto.fatherName,
                    nationality: createEnrollmentDto.nationality,
                    birthCity: createEnrollmentDto.birthCity,
                    birthState: createEnrollmentDto.birthState,
                    socialName: createEnrollmentDto.socialName,
                },
            });
            await tx.studentContact.create({
                data: {
                    studentId: student.id,
                    email: createEnrollmentDto.email,
                    phone: createEnrollmentDto.phone,
                    hasWhatsapp: createEnrollmentDto.hasWhatsApp,
                    phoneAlt: createEnrollmentDto.phoneAlt,
                    allowWhatsappContact: createEnrollmentDto.allowWhatsAppContact,
                    allowEmailContact: createEnrollmentDto.allowEmailContact,
                },
            });
            await tx.studentAddress.create({
                data: {
                    studentId: student.id,
                    cep: createEnrollmentDto.cep,
                    street: createEnrollmentDto.street,
                    number: createEnrollmentDto.number,
                    complement: createEnrollmentDto.complement,
                    neighborhood: createEnrollmentDto.neighborhood,
                    city: createEnrollmentDto.city,
                    state: createEnrollmentDto.state,
                    zone: createEnrollmentDto.zone,
                },
            });
            await tx.studentSocioeconomic.create({
                data: {
                    studentId: student.id,
                    educationLevel: createEnrollmentDto.educationLevel,
                    employmentStatus: createEnrollmentDto.employmentStatus,
                    familyIncome: createEnrollmentDto.familyIncome,
                    familyMembersCount: createEnrollmentDto.familyMembersCount,
                    socialProgram: createEnrollmentDto.socialProgram,
                    hasDisability: createEnrollmentDto.hasDisability,
                    disabilityType: createEnrollmentDto.disabilityType,
                    disabilityAdaptation: createEnrollmentDto.disabilityAdaptation,
                },
            });
            await tx.studentProfessional.create({
                data: {
                    studentId: student.id,
                    previousQualification: createEnrollmentDto.previousQualification,
                    professionalInterest: createEnrollmentDto.professionalInterest,
                    careerGoal: createEnrollmentDto.careerGoal,
                    howHeardAbout: createEnrollmentDto.howHeardAbout,
                    ...(createEnrollmentDto.motivation ? { motivation: createEnrollmentDto.motivation } : {}),
                },
            });
        }

        // Criar enrollment DENTRO da transação
        const newEnrollment = await tx.enrollment.create({
            data: { studentId: student.id, classId: createEnrollmentDto.classId, protocol, status: 'PENDING' },
            include: {
                student: { include: { user: true } },
                class: { include: { course: true, city: true } },
            },
        });

        // Criar consent DENTRO da transação
        await tx.enrollmentConsent.create({
            data: {
                enrollmentId: newEnrollment.id,
                dataProcessing: createEnrollmentDto.dataProcessingConsent,
                imageUse: createEnrollmentDto.imageUseAuthorization,
                termsAccepted: createEnrollmentDto.termsAccepted,
                privacyPolicyAccepted: createEnrollmentDto.dataProcessingConsent,
                consentDate: new Date(),
            },
        });

        return newEnrollment;
    }); // ── FIM DA TRANSAÇÃO ──────────────────────────────────────────

    // Notificação WS FORA da transação (operação externa, não deve bloquear rollback)
    try {
        this.notifications.notifyAdmins('nova_inscricao', {
            studentName: enrollment.student?.user?.name,
            courseName: (enrollment.class as any)?.course?.name,
            cidade: (enrollment.class as any)?.city?.name,
            timestamp: new Date().toISOString(),
        });
    } catch { /* WS opcional — nunca bloqueia a inscrição */ }

    return enrollment;
}
```

---

### VALIDAÇÃO
```powershell
cd backend
npx tsc --noEmit
npm run build
```

### DOD
- [ ] `create()` usa `this.prisma.$transaction(async (tx) => { ... })`
- [ ] Re-verificação de vagas com `tx` está DENTRO da transação
- [ ] Todas as operações de criação (student, address, enrollment) usam `tx`
- [ ] Notificação WS está FORA da transação (após o `await this.prisma.$transaction(...)`)
- [ ] `npx tsc --noEmit` sem erros
- [ ] `npm run build` sem erros

### REPORTE
```
P5 — BUG-08
STATUS: ✅ / ❌
TSC: OK / FALHOU
BUILD: OK / FALHOU
```

---

## ━━━ PROMPT P6 — BUG-11: MinIO Singleton (sem pool por request) ━━━

**Severidade:** 🟡 MÉDIO
**Problema técnico:** `reimbursement.service.ts` instancia um novo `Client` MinIO
a cada chamada de `getPresignedUploadUrl()`. Cada instância abre uma nova conexão
TCP. Com 50 professores enviando foto simultâneo: 50 conexões, 50x overhead de
handshake. O MinIO tem limite de conexões e pode rejeitar com `ECONNREFUSED`.

### PASSO 1 — Criar `backend/src/reimbursement/minio.service.ts` (NOVO ARQUIVO)

```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client } from 'minio';

/**
 * MinioService — Singleton do client MinIO
 *
 * Instanciado uma única vez pelo NestJS DI ao iniciar o módulo.
 * Reutiliza a mesma conexão TCP em todas as operações — elimina
 * overhead de handshake por request (BUG-11).
 */
@Injectable()
export class MinioService implements OnModuleInit {
    private readonly logger = new Logger(MinioService.name);
    private client!: Client;

    onModuleInit() {
        this.client = new Client({
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT || '9000', 10),
            useSSL: process.env.MINIO_USE_SSL === 'true',
            accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
            secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        });
        this.logger.log('MinIO client inicializado (singleton)');
    }

    getClient(): Client {
        return this.client;
    }

    /** Garante que um bucket existe, criando-o se necessário */
    async ensureBucket(bucket: string): Promise<void> {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
            await this.client.makeBucket(bucket, 'us-east-1');
            this.logger.log(`Bucket '${bucket}' criado`);
        }
    }

    /** Gera Presigned PUT URL válida por `expirySeconds` */
    async presignedPutUrl(bucket: string, key: string, expirySeconds = 900): Promise<string> {
        await this.ensureBucket(bucket);
        return this.client.presignedPutObject(bucket, key, expirySeconds);
    }
}
```

---

### PASSO 2 — Editar `backend/src/reimbursement/reimbursement.module.ts`

Leia o arquivo. Adicionar `MinioService` ao array `providers` e exportá-lo:

```typescript
// Adicionar import:
import { MinioService } from './minio.service';

// Adicionar ao @Module:
providers: [ReimbursementService, MinioService],
exports: [ReimbursementService, MinioService],
```

---

### PASSO 3 — Editar `backend/src/reimbursement/reimbursement.service.ts`

Leia o arquivo.

**MUDANÇA 1 — Adicionar import do MinioService no topo:**
```typescript
import { MinioService } from './minio.service';
```

**MUDANÇA 2 — Injetar MinioService no constructor:**
```typescript
// ANTES:
constructor(private prisma: PrismaService) {}

// DEPOIS:
constructor(
    private prisma: PrismaService,
    private minio: MinioService,
) {}
```

**MUDANÇA 3 — Simplificar `getPresignedUploadUrl()` usando o singleton:**
```typescript
// ANTES: instanciava Client + fazia ensureBucket manualmente (20+ linhas)
// DEPOIS: delega ao MinioService singleton:
async getPresignedUploadUrl(
    userId: string,
    filename: string,
    contentType: string,
): Promise<{ uploadUrl: string; fileKey: string }> {
    const bucket = process.env.MINIO_BUCKET_REIMBURSEMENT || 'reimbursements';
    const fileKey = `${userId}/${Date.now()}_${filename}`;
    const uploadUrl = await this.minio.presignedPutUrl(bucket, fileKey, 900);
    return { uploadUrl, fileKey };
}
```

---

### VALIDAÇÃO
```powershell
cd backend
npx tsc --noEmit
npm run build
```

### DOD
- [ ] `minio.service.ts` criado com `OnModuleInit` e `getClient()`
- [ ] `MinioService` adicionado ao `reimbursement.module.ts`
- [ ] `ReimbursementService` injeta `MinioService` via DI (não instancia `Client` diretamente)
- [ ] `getPresignedUploadUrl()` usa `this.minio.presignedPutUrl()`
- [ ] `npx tsc --noEmit` sem erros

### REPORTE
```
P6 — BUG-11
STATUS: ✅ / ❌
TSC: OK / FALHOU
BUILD: OK / FALHOU
```

---

## ━━━ PROMPT P7 — BUG-12: res.data?.data inconsistência em 6 telas admin ━━━

**Severidade:** 🟡 MÉDIO
**Problema técnico:** 6 telas do admin esperam `res.data.data` (wrapper paginado
`{data:[], meta:{}}`) mas os endpoints correspondentes retornam arrays diretos.
Resultado: telas ficam vazias em produção sem nenhum erro no console.

**Causa raiz verificada:**
- `ReimbursementService.findAll()` → retorna `{ data: [], meta: {} }` ✅
- `EnrollmentsService.findAll()` → retorna array direto `[]` ❌
- `ClassesService.findAll()` → retorna array direto `[]` ❌
- `HolidayService` → retorna array direto `[]` ❌

**Decisão de correção:** Normalizar o FRONTEND para cada tela usar o formato
correto do seu endpoint — sem mexer nos services (que estão corretos para seus casos).

---

### ARQUIVO 1: `frontend/app/admin/inscricoes/page.tsx`

Leia o arquivo. Localizar `fetchEnrollments`. Encontrar a linha:
```typescript
res.data?.data
```
Substituir por:
```typescript
// EnrollmentsService.findAll() retorna array direto (sem wrapper)
Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
```

---

### ARQUIVO 2: `frontend/app/admin/frequencia/page.tsx`

Leia o arquivo. Localizar onde usa `Res.data?.data` para carregar histórico.
A variável `histData` é definida com:
```typescript
const histData = histRes.data?.data ?? histRes.data ?? [];
```
Substituir por:
```typescript
// ClassesService retorna array direto
const histData: any[] = Array.isArray(histRes.data) ? histRes.data : (histRes.data?.data ?? []);
```

---

### ARQUIVO 3: `frontend/app/admin/feriados/page.tsx`

Leia o arquivo. Localizar onde define `cls` a partir de `classRes`:
```typescript
const cls = classRes.data?.data ?? classRes.data ?? [];
```
Substituir por:
```typescript
// ClassesService retorna array direto
const cls: any[] = Array.isArray(classRes.data) ? classRes.data : (classRes.data?.data ?? []);
```

---

### ARQUIVO 4: `frontend/app/admin/reembolsos/page.tsx`

Leia o arquivo. Localizar onde define os itens de reembolso:
```typescript
.data.data
```
Substituir por:
```typescript
// ReimbursementService retorna { data: [], meta: {} } — acessar .data.data é correto aqui
res.data?.data ?? []
```
> Esta tela está CORRETA — `reimbursements` usa paginação. Apenas adicionar `?? []` como fallback defensivo.

---

### ARQUIVO 5: `frontend/app/admin/relatorios/page.tsx`

Leia o arquivo. Localizar a linha com `res.data?.data` para `setStats`.
Após `const d = res.data` adicionar fallback:
```typescript
// DashboardService retorna objeto direto — não tem wrapper .data
const d = res.data ?? {};
```
Remover qualquer `res.data?.data` que não seja de reembolsos nesta página.

---

### ARQUIVO 6: `frontend/app/admin/turmas/[id]/estatisticas/page.tsx`

Leia o arquivo. Localizar onde processa `enrollRes`:
```typescript
const list = enrollRes.data?.data ?? enrollRes.data ?? [];
```
Substituir por:
```typescript
// EnrollmentsService retorna array direto
const list: any[] = Array.isArray(enrollRes.data) ? enrollRes.data : (enrollRes.data?.data ?? []);
```

---

### VALIDAÇÃO
```powershell
cd frontend
npm run build
```
Zero erros de TypeScript no build.

### DOD
- [ ] Cada tela usa o formato correto para o seu endpoint
- [ ] Todas as 6 telas têm `?? []` como fallback defensivo
- [ ] `npm run build` frontend sem erros de TypeScript

### REPORTE
```
P7 — BUG-12
STATUS: ✅ / ❌
BUILD FRONTEND: OK / FALHOU
ARQUIVOS EDITADOS: [lista]
```

---

## ━━━ PROMPT P8 — SEC-07 + BUG-13: WS userId consistente + console.log ━━━

**Severidade:** 🟡 MÉDIO
**SEC-07:** `payload.sub || payload.id` — fallback desnecessário que pode resultar
em `undefined` se ambos faltarem, sobrescrevendo o Map com chave `undefined`.
O JWT sempre usa `sub` — ser explícito e falhar rápido.
**BUG-13:** `console.log` com userId completo em produção vaza IDs de usuário nos
logs do servidor (LGPD Art. 46 — dados pessoais em logs sem necessidade).

### ARQUIVO: `backend/src/notifications/notifications.gateway.ts`

Leia o arquivo.

**MUDANÇA 1 — Adicionar Logger do NestJS (import no topo):**
```typescript
// Adicionar junto aos imports existentes:
import { Logger } from '@nestjs/common';
```

**MUDANÇA 2 — Adicionar logger na classe:**
```typescript
// Dentro da classe NotificationsGateway, após @WebSocketServer():
private readonly logger = new Logger(NotificationsGateway.name);
```

**MUDANÇA 3 — Corrigir `handleConnection` — userId explícito + falha rápida:**
```typescript
// ANTES:
client.data.userId = payload.sub || payload.id;
this.connectedUsers.set(client.data.userId, client.id);
// Entrar em sala pessoal e sala de admins
client.join(`user:${client.data.userId}`);
if (payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN') {
    client.join('admins');
}
console.log(`WS connected: ${client.data.userId}`);

// DEPOIS:
// SEC-07: usar payload.sub explicitamente — JWT sempre gera com sub
// Falhar rápido se sub ausente em vez de propagar undefined
const userId = payload.sub as string | undefined;
if (!userId) {
    this.logger.warn('WS rejeitado: token sem campo sub');
    client.disconnect();
    return;
}
client.data.userId = userId;
this.connectedUsers.set(userId, client.id);
client.join(`user:${userId}`);
if (payload.role === 'ADMIN' || payload.role === 'COORDINATOR') {
    client.join('admins');
}
// BUG-13: log de nível debug com userId parcialmente mascarado (LGPD)
this.logger.debug(`WS conectado: ...${userId.slice(-8)}`);
```

**MUDANÇA 4 — Corrigir `handleDisconnect` — trocar console.log:**
```typescript
// ANTES:
console.log(`WS disconnected: ${client.id}`);

// DEPOIS:
this.logger.debug(`WS desconectado: ${client.id}`);
```

---

### VALIDAÇÃO
```powershell
cd backend
npx tsc --noEmit
npm run build
```

### DOD
- [ ] `Logger` do NestJS importado e instanciado na classe
- [ ] `payload.sub` acessado diretamente (sem `|| payload.id`)
- [ ] Desconexão imediata se `userId` for `undefined`
- [ ] `console.log` substituídos por `this.logger.debug()`
- [ ] userId nos logs exibe apenas os últimos 8 chars (`...${userId.slice(-8)}`)
- [ ] `npx tsc --noEmit` sem erros

### REPORTE
```
P8 — SEC-07 + BUG-13
STATUS: ✅ / ❌
TSC: OK / FALHOU
BUILD: OK / FALHOU
```

---

## ━━━ COMMIT FINAL DO SPRINT ━━━

Após todos os 8 prompts reportados com ✅:

```powershell
cd C:\Users\Desktop\Downloads\Sistema_upgrade-main_atual

# Build final de validação
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..

# Commit
git add -A
git commit -m "fix: sprint bug+sec-a — privilege escalation + maintenance bypass + helmet + bcrypt import + enrollment $transaction + minio singleton + res.data.data + ws userId + logger"
git push origin master
```

---

## CHECKLIST FINAL DO SPRINT

### Segurança (Categoria A — transparente)
- [ ] P1 ✅ — SEC-01: register não aceita role do body
- [ ] P2 ✅ — SEC-05: maintenance bypass corrigido + MAINTENANCE_KEY no .env
- [ ] P3 ✅ — SEC-04: helmet instalado e configurado
- [ ] P8 ✅ — SEC-07: WS userId explícito, falha rápida se ausente

### Bugs Funcionais
- [ ] P4 ✅ — BUG-09: bcrypt import estático
- [ ] P5 ✅ — BUG-08: enrollment create com $transaction
- [ ] P6 ✅ — BUG-11: MinIO singleton via DI
- [ ] P7 ✅ — BUG-12: res.data.data 6 telas admin
- [ ] P8 ✅ — BUG-13: console.log → Logger NestJS

### Validações
- [ ] `npx tsc --noEmit` backend — zero erros
- [ ] `npm run build` backend — zero erros
- [ ] `npm run build` frontend — zero erros
- [ ] Commit e push realizados

---

## O QUE NÃO ESTÁ NESTE SPRINT (Sprint SEC-B — após testes)

Estes itens ficaram de fora intencionalmente — requerem calibração
durante/após os testes para não criar atrito:

| Item | Por que esperar |
|------|----------------|
| SEC-03 — Rate Limiting | Limites precisam ser calibrados com uso real — muito restritivo bloqueia os próprios testes |
| SEC-02 — JWT Secret forte | Em dev está ok; em produção trocar os valores do .env — não requer mudança de código |
| SEC-06 — Encrypt twoFactorSecret | Requer migration de dados + nova variável de ambiente `TOTP_ENCRYPTION_KEY` — fazer após testes |
| BUG-10 — SettingsService → banco | Requer refactor do SettingsService para usar tabela `system_configs` + migration |

---

*Sprint BUG + SEC-A | Sistema Upgrade | Gravity 2.0 + Antygravity | 16/03/2026*
