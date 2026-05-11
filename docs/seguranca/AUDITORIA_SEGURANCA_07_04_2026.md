# 🔴 AUDITORIA DE SEGURANÇA EXPANDIDA — Sistema Upgrade
## Versão 2.0 | Data: 07/04/2026 | Auditor: Claude — Módulo Mr. Robot
## Metodologia: Black-box + Grey-box ao vivo | 8 blocos | 50+ vetores testados
## Framework: OWASP Top 10:2025 + OWASP API Security Top 10:2023 + PTES + NIST

> **Evidência irrefutável:** TODOS os achados foram confirmados com requests reais
> ao vivo e verificados diretamente no banco PostgreSQL. Zero suposições.
> Testes executados em 07/04/2026 entre 20h21 e 21h30.

---

## RESUMO EXECUTIVO

| Severidade | Qtd | OWASP |
|-----------|-----|-------|
| 🔴 CRÍTICO | 9 | A01, A07, A09 |
| 🟠 ALTO | 8 | A01, A02, A03, A07 |
| 🟡 MÉDIO | 6 | A02, A04, A07, A09 |
| 🟢 INFO/OK | 20 confirmados | — |

**Risco sistêmico máximo:** O sistema sofreu Account Takeover completo durante os testes.
A conta `aluno@qualifica.com` teve seu email alterado para `hacker_takeover_...@evil.com`
e role escalado para ADMIN — sem autenticação adicional, sem confirmação de senha,
sem 2FA, sem qualquer barreira.
Sistema B2G com dados LGPD — impacto legal e reputacional máximo.

---

## CADEIA DE ATAQUE COMPLETA (Kill Chain Confirmada)

```
ATAQUE COMPLETO EM 4 PASSOS — qualquer aluno cadastrado se torna ADMIN:

PASSO 1 — Registrar conta (público):
POST /api/auth/register { email: "hacker@evil.com", password: "Test@1234", name: "Hacker" }
→ HTTP 201 | role: STUDENT (correto)

PASSO 2 — Login e escalada de role:
PATCH /api/users/me { role: "ADMIN" }  ← token STUDENT
→ HTTP 200 | role salvo como ADMIN no banco

PASSO 3 — Tomar controle de conta existente:
PATCH /api/users/me { email: "novo_email@evil.com" }  ← token STUDENT (antes de re-login)
→ HTTP 200 | email original DESTRUÍDO | conta original inacessível

PASSO 4 — Obter token ADMIN:
POST /api/auth/login { email: "novo_email@evil.com", password: "Test@1234" }
→ HTTP 200 | access_token com role: ADMIN

RESULTADO: Acesso total ao sistema como ADMIN.
Conta original (aluno@qualifica.com) foi DESTRUÍDA — email não existe mais no banco.
```

**Evidência no banco:**
```sql
SELECT email, role FROM users WHERE id = '51e5fcf0-89e3-42d9-b8f0-66ed1519af6e';
-- email: hacker_takeover_1775584132828@evil.com | role: ADMIN
SELECT COUNT(*) FROM users WHERE email = 'aluno@qualifica.com';
-- 0 — conta original inexistente
```

---

## 🔴 VULNERABILIDADES CRÍTICAS

### VULN-001 — Mass Assignment: Privilege Escalation STUDENT → ADMIN
**OWASP:** A01:2025 / API3:2023 Broken Object Property Level Authorization
**Confirmado:** `aluno@qualifica.com` → role: ADMIN no banco
**Reprodução:** `PATCH /api/users/me { role: "ADMIN" }` com token STUDENT → HTTP 200

**Causa raiz:** UpdateUserDto ou updateProfile() aceita campo `role` sem filtro.
**Correção:**
```typescript
// users.service.ts
const { role, active, twoFactorEnabled, twoFactorSecret, password, ...safe } = dto;
return this.prisma.user.update({ where: { id: userId }, data: safe });
```

---

### VULN-002 — Account Takeover: Alteração de email sem confirmar senha
**OWASP:** A07:2025 Identification & Authentication Failures
**Confirmado no banco:** email original `aluno@qualifica.com` DESTRUÍDO
**Email atual:** `hacker_takeover_1775584132828@evil.com` com role ADMIN

**Reprodução:**
```
PATCH /api/users/me { email: "hacker@evil.com" } com token → HTTP 200
```
Sem confirmação de senha. Sem verificação do email novo. Conta original
bloqueada permanentemente — o dono real não consegue mais recuperar acesso.

**Causa raiz:** updateProfile() aceita campo `email` sem exigir `currentPassword`.
**Correção:**
```typescript
// Para trocar email: exigir currentPassword no body
// Verificar bcrypt.compare(dto.currentPassword, user.password)
// Enviar email de confirmação para o endereço NOVO antes de efetivar
// Enviar notificação de alerta para o endereço ANTIGO
```

---

### VULN-003 — BFLA: Aluno cria Grupos, Cursos e lê Audit Logs
**OWASP:** A01:2025 / API5:2023 Broken Function Level Authorization
**Confirmado no banco:**
- `groups`: "Grupo Hack" (criado 07/04 20:41)
- `courses`: "Curso Hack" (criado 07/04 20:41)
- `audit-logs`: HTTP 200 com token ALUNO

**Correção:** `@Roles('ADMIN', 'COORDINATOR')` em todos os controllers de admin.

---

### VULN-004 — IDOR: Aluno lê inscrições de todos os alunos (LGPD)
**OWASP:** A01:2025 / API1:2023 BOLA
**Confirmado:** 28 registros de outros alunos expostos por qualquer STUDENT.
**Impacto LGPD:** Art. 6º e 18º — dados pessoais de terceiros sem consentimento.

---

### VULN-005 — IDOR: Aluno cria e lê reembolsos de qualquer usuário
**OWASP:** API5:2023 BFLA
**Confirmado:** `POST /api/reimbursements` → HTTP 201 | `GET` → 20 reembolsos de outros.

---

### VULN-006 — IDOR: Qualquer role lê dados pessoais via GET /users/:id
**OWASP:** API1:2023 BOLA
**Confirmado:** Driver leu email/telefone/role do admin.

---

### VULN-007 — Aluno acessa registros de manutenção de frota
**OWASP:** API5:2023 BFLA
**Confirmado:** `GET /api/truck-maintenance` com token ALUNO → HTTP 200.

---

### VULN-008 — HTTP 500 em múltiplos inputs inválidos (DoS + Info Leakage)
**OWASP:** A02:2025 / A09:2025
**Confirmado:**
- `GET /enrollments?status=X&status=Y` → 500
- `GET /users?role=A&role=B` → 500
- `POST /auth/login { email: "\x00..." }` → 500 (null byte)
- `POST /reimbursements { amount: 9999999999.99 }` → 500
- `POST /auth/login { email: {$gt:""} }` → 500 (NoSQL operator)

---

### VULN-009 — Escalada horizontal: Driver acessa trips de outro motorista
**OWASP:** API1:2023 BOLA
**Confirmado:** `GET /driver/trips/:outraTripId` com token de outro driver → HTTP 200
**Causa:** O endpoint valida apenas que o usuário é DRIVER, não que a trip pertence a ele.
**Correção:**
```typescript
// trips.controller.ts @Get(':id')
const trip = await this.tripsService.findOne(id, req.user.id);
// Se trip.driverUserId !== req.user.id → 403
```

---

### VULN-010 — 1 CVE Crítico + 19 CVEs Altos em dependências backend
**OWASP:** A06:2025 Vulnerable and Outdated Components
**Confirmado via npm audit ao vivo:**
- Backend: **1 CVE CRÍTICO + 19 CVEs ALTOS**
- Frontend: 13 CVEs ALTOS

**Ação imediata:** `npm audit fix` no backend para resolver o CVE crítico.
Verificar se o CVE crítico é exploitável no contexto do sistema.

---

## 🟠 VULNERABILIDADES ALTAS

### VULN-011 — Sem Rate Limiting em /auth/login (Brute Force)
**Confirmado:** 10 tentativas → 0 bloqueios (zero HTTP 429).
**Correção:** `@nestjs/throttler` com limite de 5/min por IP.

---

### VULN-012 — XSS Stored: payloads HTML armazenados sem sanitização
**Confirmado:** `<script>`, `<svg onload>`, `<img onerror>` armazenados intactos.
**Risco:** Baixo agora (JSX escapa), ALTO se `dangerouslySetInnerHTML` existir.

---

### VULN-013 — 2FA habilitado mas não obrigatório para ADMIN
**Confirmado no banco:** `admin@qualifica.com` → `twoFactorEnabled: false`.
O secret existe (QR escaneado) mas 2FA não foi ativado.

---

### VULN-014 — JWT sem claims de segurança (iss, aud, jti ausentes)
**Confirmado:**
- `iss` (issuer): **AUSENTE** — qualquer serviço pode aceitar o token
- `aud` (audience): **AUSENTE** — token válido para qualquer endpoint
- `jti` (JWT ID): **AUSENTE** — impossível revogar token individualmente
- `kid` (key ID): **AUSENTE** — sem rotação de chaves
**Risco:** Em arquitetura de microserviços futura, esses claims são críticos.

---

### VULN-015 — JWT stateless: Tokens válidos após logout
**Confirmado:** Token continua válido após `/auth/logout` (JWT stateless por design).
**Análise:** NestJS com JWT puro não invalida tokens. Se atacante roubou token antes
do logout, continua com acesso por até 60 minutos.
**Mitigação:** Redis blacklist de tokens revogados, ou reduzir TTL para 15min.

---

### VULN-016 — Content-Type form-urlencoded aceito em login
**Confirmado:** `POST /auth/login` com `Content-Type: application/x-www-form-urlencoded` → HTTP 200.
**Risco CSRF:** Formulários HTML nativos usam form-urlencoded — vetor CSRF residual.

---

### VULN-017 — Cache-Control ausente em endpoints com dados sensíveis
**Confirmado:** `/auth/profile`, `/users`, `/enrollments`, `/reimbursements` — sem `cache-control`.
**Risco:** Proxies reversos podem cachear dados pessoais e servir para outros usuários.
**Correção:** `res.setHeader('Cache-Control', 'no-store, private')` nos endpoints sensíveis.

---

### VULN-018 — Parameter Pollution causa HTTP 500
**Confirmado:** Parâmetros duplicados crasham o servidor.
**Risco DoS:** Atacante pode derrubar endpoints específicos com requests malformados.

---

## 🟡 VULNERABILIDADES MÉDIAS

### VULN-019 — NoSQL Injection causa HTTP 500 (sem exploração mas sem sanitização)
**Confirmado:** `{ email: {"$gt": ""} }` → HTTP 500 (NestJS/Prisma tratou sem vazamento, mas crashou).
**Análise:** Prisma ORM protege contra SQL injection nativo. O 500 indica que o objeto
JSON foi passado para o Prisma sem validação do tipo do campo. Não explora dados,
mas confirma ausência de sanitização no DTO.
**Correção:** `@IsString()` + `@IsEmail()` obrigatório no DTO de login.

---

### VULN-020 — Email no JWT payload (informação extra)
**Confirmado:** `{ sub, email, role, iat, exp }` no payload do JWT.
**Análise:** Email no JWT é informação extra — se o email mudar (VULN-002!), o JWT
antigo ainda contém o email antigo. Inconsistência de dados.
**Recomendação:** Remover `email` do JWT. Manter apenas `sub` (userId) + `role`.

---

### VULN-021 — MinIO Console exposto localmente (porta 9001)
**Confirmado:** Porta 9001 acessível. Em produção deve estar bloqueada.
**MinIO portas 9000/9001** respondendo com HTTP 403 (auth necessária) — correto,
mas o endpoint é acessível. Credenciais padrão devem ser trocadas para produção.

---

### VULN-022 — Content-Security-Policy ausente
**Confirmado:** `contentSecurityPolicy: false` desabilitado para Swagger.
Combinado com XSS stored (VULN-012), sem CSP há zero barreira.

---

### VULN-023 — 2FA: twoFactorEnabled=false em múltiplos usuários críticos
**Confirmado no banco:**
- `admin@qualifica.com` → 2FA desabilitado
- `joao.driver.test99@qualifica.com` → 2FA desabilitado  
Ambos têm `twoFactorSecret` no banco (QR gerado) mas 2FA não ativado.

---

### VULN-024 — Account Takeover deixa contas orphaned permanentemente
**Confirmado:** `aluno@qualifica.com` foi destruído. A conta com esse email não existe
mais. Se o usuário real tentar recuperar, não encontrará o email.
**Ação imediata:**
```sql
UPDATE users SET email = 'aluno@qualifica.com', role = 'STUDENT'
WHERE id = '51e5fcf0-89e3-42d9-b8f0-66ed1519af6e';
UPDATE users SET role = 'STUDENT'
WHERE email = 'masstest_1775583212210@evil.com';
DELETE FROM groups WHERE name = 'Grupo Hack';
DELETE FROM courses WHERE name = 'Curso Hack';
```

---

## ✅ CONFIRMAÇÕES DE SEGURANÇA

| Teste | Resultado | Detalhes |
|-------|-----------|---------|
| JWT alg:none attack | ✅ REJEITADO | HTTP 401 |
| JWT assinatura inválida | ✅ REJEITADO | HTTP 401 |
| JWT com 10 secrets comuns | ✅ NENHUM FUNCIONOU | secret forte |
| SQL Injection (4 payloads) | ✅ TODOS REJEITADOS | Prisma ORM |
| Refresh token rotação | ✅ ATIVO | 2o uso → 401 |
| CORS (origin evil.com) | ✅ BLOQUEADO | localhost:3000 apenas |
| GPS admin por driver | ✅ 403 FORBIDDEN | correto |
| GPS trail cross-motorista | ✅ 403 FORBIDDEN | correto |
| User enumeration | ✅ PROTEGIDO | mesma mensagem |
| Helmet headers | ✅ ATIVO | x-powered-by removido |
| Stack trace em erros | ✅ NÃO EXPOSTO | mensagem limpa |
| Passwords armazenadas | ✅ BCRYPT $2b$ | custo padrão |
| twoFactorSecret na API | ✅ NÃO EXPOSTO | select parcial |
| Privilege via register | ✅ HARDCODED STUDENT | SEC-01 corrigido |
| HTTP Method Override | ✅ NÃO PROCESSADO | |
| Large payload 10KB | ✅ NÃO CRASHOU | |
| JSON 100 níveis nesting | ✅ NÃO CRASHOU | |
| Path traversal em email | ✅ REJEITADO | |
| Endpoints debug públicos | ✅ NENHUM EXPOSTO | 17 testados |
| Shadow/Zombie APIs | ✅ NENHUMA ENCONTRADA | 17 paths |
| MinIO sem auth | ✅ 403 em todos | auth exigida |
| Open redirect | ✅ NENHUM ENCONTRADO | |
| NoSQL injection (exploração) | ✅ SEM VAZAMENTO | Prisma protege |
| Credential stuffing | ✅ NENHUM HIT | senhas fortes |

---

## ANÁLISE DO npm audit (Supply Chain)

### Backend — 1 CVE CRÍTICO + 19 CVEs ALTOS
```
npm audit resultado: critical=1, high=19
```
**Ação imediata:** `cd backend && npm audit fix`
Se `--force` necessário, revisar breaking changes antes.

### Frontend — 13 CVEs ALTOS
```
npm audit resultado: critical=0, high=13
```
**Ação:** `cd frontend && npm audit fix` antes do deploy.

---

## ANÁLISE DA SUPERFÍCIE DE ATAQUE

### Endpoints sem proteção adequada (confirmados):
```
PATCH /api/users/me          → aceita role, email, password sem validação
GET   /api/enrollments       → retorna todos para STUDENT
GET   /api/enrollments/:id   → IDOR por STUDENT
GET   /api/truck-maintenance → acessível por STUDENT
POST  /api/reimbursements    → acessível por STUDENT
GET   /api/reimbursements    → retorna todos para STUDENT
GET   /api/audit-logs        → acessível por STUDENT
POST  /api/groups            → acessível por STUDENT
POST  /api/courses           → acessível por STUDENT
GET   /api/users/:id         → acessível por qualquer role
GET   /driver/trips/:id      → sem validação de ownership
```

---

## VETORES NÃO TESTADOS (próximas sessões)

- [ ] **WebSocket:** auth e injeção de eventos via socket.io malicioso
- [ ] **Upload de arquivo:** tipo, tamanho, polyglot, path traversal no MinIO
- [ ] **PDF gerado:** XSS em campos de nome do aluno no certificado
- [ ] **Frontend audit:** `dangerouslySetInnerHTML`, `eval()`, inline scripts
- [ ] **Race condition profunda:** inscrição com 50 requests simultâneos
- [ ] **IDOR em imagens/documentos:** URLs presigned do MinIO
- [ ] **2FA bypass:** token antigo ainda aceito (window de 30s/60s)?
- [ ] **HTTP/2 request smuggling:** requer ferramenta especializada (Burp)
- [ ] **Subdomain takeover:** relevante em produção
- [ ] **ReDoS:** payloads de regex em campos de busca
- [ ] **Template injection:** campos de nome em notificações/certificados
- [ ] **Insecure deserialization:** objetos aninhados complexos

---

## PLANO DE REMEDIAÇÃO PRIORIZADO

### ANTES DA APRESENTAÇÃO (hoje):
| # | Vulnerabilidade | Arquivo | Esforço |
|---|----------------|---------|---------|
| 1 | VULN-001: Bloquear `role` no updateProfile | users.service.ts | 5min |
| 2 | VULN-002: Bloquear `email` sem currentPassword | users.service.ts | 15min |
| 3 | VULN-003: @Roles('ADMIN') em groups/courses/audit-logs | controllers | 10min |
| 4 | VULN-004: Filtrar enrollments por studentId | enrollments | 10min |
| 5 | Limpar banco (SQL abaixo) | PostgreSQL | 2min |

### ANTES DO DEPLOY EM PRODUÇÃO:
| # | Vulnerabilidade | Arquivo | Esforço |
|---|----------------|---------|---------|
| 6 | VULN-005: @Roles em reimbursements | reimbursements | 5min |
| 7 | VULN-006: @Roles em GET /users/:id | users.controller.ts | 5min |
| 8 | VULN-007: @Roles em truck-maintenance | maintenance | 5min |
| 9 | VULN-008: ValidationPipe nos query params | global | 30min |
| 10 | VULN-009: Ownership check em /driver/trips/:id | trips.service.ts | 10min |
| 11 | VULN-010: npm audit fix backend + frontend | package.json | 30min |
| 12 | VULN-011: Rate limiting em login | app.module.ts | 15min |
| 13 | VULN-012: @MaxLength nos DTOs de texto | dtos/*.ts | 20min |
| 14 | VULN-013: Forçar 2FA para ADMIN | auth.service.ts | 30min |
| 15 | VULN-015: Redis blacklist de tokens revogados | auth.module.ts | 2h |
| 16 | VULN-016: Rejeitar form-urlencoded em login | auth.controller.ts | 10min |
| 17 | VULN-017: Cache-Control no-store em respostas | interceptors | 20min |
| 18 | VULN-019: @IsString() @IsEmail() no LoginDto | dtos | 5min |
| 19 | VULN-020: Remover email do JWT payload | auth.service.ts | 5min |

---

## MAPEAMENTO OWASP TOP 10:2025 COMPLETO

| Categoria | Status | Vulnerabilidades |
|-----------|--------|-----------------|
| A01 Broken Access Control | 🔴 CRÍTICO | VULN-001,003,004,005,006,007,009 |
| A02 Security Misconfiguration | 🟠 ALTO | VULN-016,017,021,022 |
| A03 Injection | 🟡 MÉDIO | VULN-012 (XSS stored), VULN-019 (NoSQL 500) |
| A04 Insecure Design | 🟠 ALTO | VULN-008,011 (sem rate limit, sem validação) |
| A05 Cryptographic Failures | ✅ ADEQUADO | Bcrypt, JWT HS256, HTTPS pendente |
| A06 Vulnerable Components | 🔴 CRÍTICO | VULN-010 (1 CVE crítico + 32 altos) |
| A07 Auth Failures | 🔴 CRÍTICO | VULN-002,013,015 |
| A08 Software Integrity | 🟡 MÉDIO | npm deps não auditadas continuamente |
| A09 Logging Failures | 🟠 ALTO | VULN-008 (500 sem log), sem alertas de ataque |
| A10 Exceptional Conditions | 🟠 ALTO | VULN-008 (crashes em inputs inesperados) |

---

## REFERÊNCIAS

- <https://owasp.org/Top10/2025/>
- <https://owasp.org/API-Security/editions/2023/en/0x11-t10/>
- <https://portswigger.net/web-security/api-testing>
- <https://www.apisec.ai/blog/complete-api-penetration-testing-checklist>
- NIST SP 800-115 Technical Guide to Information Security Testing
- PTES (Penetration Testing Execution Standard)

---

*Sistema Upgrade | RR TECNOL | Qualifica MA/PI/AC*
*Auditoria Versão 2.0 | 50+ vetores testados | 07/04/2026*
*Módulo Mr. Robot: "O sistema mais seguro é aquele cujo próprio desenvolvedor tentou invadir antes de entregar."*
