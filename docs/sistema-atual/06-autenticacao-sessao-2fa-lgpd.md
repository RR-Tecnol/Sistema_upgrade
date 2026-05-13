# Autenticação, sessão, MFA e dados pessoais

## Visão geral

O módulo `auth` implementa um fluxo **em etapas** (ver `backend/src/auth/auth.controller.ts` e `auth.service.ts`):

1. **Login** (`POST /api/auth/login`) — valida email + palavra-passe; em cenários configurados, devolve `requiresEmailOtp`, `preAuthToken`, etc.
2. **OTP por e-mail** — verificação e reenvio com limites de throttle dedicados.
3. **Primeiro login IT_ADMIN** — endpoint para concluir email e senha definitivos após provisionamento.
4. **2FA TOTP** — geração de segredo/QR (`2fa/setup/*`), conclusão de setup, e verificação diária (`2fa/verify`).
5. **Tokens JWT** — emissão após conclusão das etapas aplicáveis; uso de `JwtAuthGuard` e `PreAuthGuard` conforme endpoint.

Throttle explícito (`@Throttle`) está aplicado em vários endpoints de auth para reduzir brute force.

## Modelo de utilizador (campos de segurança relevantes)

Em `User` (Prisma), entre outros:

- `twoFactorEnabled`, `twoFactorSecret` — TOTP (Google Authenticator / compatível).
- `emailOtpHash`, `emailOtpExpiresAt`, `emailOtpAttempts` — OTP por e-mail com expiração e limite de tentativas.

## Autorização nas rotas

- **`JwtAuthGuard`** — exige JWT válido em rotas protegidas.
- **`RolesGuard` + `@Roles()`** — restringe por `UserRole`.
- **`@Public()`** — marca rotas públicas (ex.: login) quando aplicável no guard JWT global (confirmar configuração em `AuthModule` / `APP_GUARD`).

## LGPD / consentimento

O schema Prisma inclui evoluções para consentimento legal de alunos e fluxos de revisão (ex.: campos e tabelas ligados a feedback e inscrição — ver migrations recentes com nomes `student_legal_consent`, `feedback_content_review`, etc.). O comportamento exato (textos, obrigatoriedade, UI) está nos serviços e páginas correspondentes; este documento apenas assinala que **existem** regras de conformidade no modelo e na API.

## Boas práticas operacionais

- **Produção:** `JWT_SECRET` forte (validação na subida do servidor).
- **Nunca** logar tokens ou OTP em claro.
- Testar sempre o fluxo completo: login → OTP (se activo) → 2FA (se staff) → chamada autenticada a um endpoint de perfil.
