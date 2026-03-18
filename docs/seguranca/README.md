# 🔐 SEGURANÇA — Vulnerabilidades e Postura de Segurança
## Sistema Upgrade | Fase de Produção | v2.0 | 18/03/2026

> Leia antes de qualquer implementação que toque em auth, roles, uploads ou dados de usuário.

---

## POSTURA DE SEGURANÇA ATUAL

| Camada | Mecanismo | Status |
|--------|-----------|--------|
| HTTP Headers | Helmet (SEC-04) | ✅ Ativo |
| Autenticação | JWT duplo (access 15min + refresh 7d) | ✅ Ativo |
| 2FA | TOTP speakeasy (obrigatório ADMIN/COORDINATOR) | ✅ Ativo |
| Registro | role hardcoded STUDENT — nunca aceita role do body (SEC-01) | ✅ Corrigido |
| Modo Manutenção | MAINTENANCE_KEY validado corretamente (SEC-05) | ✅ Corrigido |
| WebSocket | Auth JWT no handshake + userId mascarado nos logs (SEC-07) | ✅ Ativo |
| Upload | MinIO Presigned URL — servidor não toca no arquivo | ✅ Ativo |
| Transações | `$transaction` no enrollment (BUG-08) | ✅ Ativo |
| Conexões MinIO | Singleton via DI (BUG-11) | ✅ Ativo |

---

## VULNERABILIDADES CORRIGIDAS (Sprint BUG + SEC-A — commit b4fc6f0)

### SEC-01 — Privilege Escalation via POST /auth/register ✅ CORRIGIDO
- **Risco:** Qualquer pessoa criava conta ADMIN passando `role: "ADMIN"` no body
- **Correção:** `auth.service.ts` — `role` removido da assinatura; `role: 'STUDENT'` hardcoded
- **Arquivo:** `backend/src/auth/auth.service.ts` + `auth.controller.ts`

### SEC-04 — Sem HTTP Security Headers ✅ CORRIGIDO
- **Risco:** Vulnerável a XSS, clickjacking, MIME sniffing
- **Correção:** `helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false })` em `main.ts`
- **Package:** `helmet` + `@types/helmet` instalados

### SEC-05 — Maintenance Bypass (undefined === undefined) ✅ CORRIGIDO
- **Risco:** Sem `MAINTENANCE_KEY` no `.env`, `undefined === undefined = true` → qualquer request passava pelo bypass
- **Correção:** Verificação `!!maintenanceKey && maintenanceKey.length > 0 && header === maintenanceKey`
- **Arquivo:** `backend/src/main.ts`

### SEC-07 — userId undefined no WebSocket ✅ CORRIGIDO
- **Risco:** `payload.sub || payload.id` poderia propagar `undefined` como chave no Map → dados de usuário errado
- **Correção:** `const userId = payload.sub as string | undefined; if (!userId) → disconnect()`
- **Arquivo:** `backend/src/notifications/notifications.gateway.ts`

---

## ALERTAS ATIVOS (não críticos, mas monitorar)

### ALERTA-01 — Credenciais visíveis na tela de login
- **Onde:** `frontend/app/login/page.tsx` exibe em tela `admin@qualifica.com / admin123`
- **Impacto:** Aceitável em dev. **DEVE ser removido antes do deploy em produção.**
- **Ação:** Remover o bloco "Acesso Admin" antes de qualquer ambiente público.

### ALERTA-02 — SUPER_ADMIN no RolesGuard
- **Onde:** `certificate.controller.ts` usa `@Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')`
- **Impacto:** `SUPER_ADMIN` não existe no enum `UserRole` → nunca dará match. Não expande acesso (seguro), mas confunde na leitura.
- **Ação:** Remover `'SUPER_ADMIN'` na próxima refatoração.

### ALERTA-03 — npm audit warnings
- **Onde:** Existem dependências com vulnerabilidades conhecidas (não críticas)
- **Ação:** Revisar com `npm audit` e atualizar dependências antes do deploy.

---

## REGRAS DE SEGURANÇA PERMANENTES

1. **Nunca aceitar `role` no endpoint público de registro** — `register()` sempre cria STUDENT
2. **Nunca logar userId completo** — sempre mascarar: `userId.slice(-8)`
3. **WebSocket sempre autentica** — `client.disconnect()` imediato sem JWT válido
4. **MAINTENANCE_KEY sempre definida** — nunca deixar vazia no `.env` de produção
5. **Helmet sempre ativo** — com `contentSecurityPolicy: false` para Swagger funcionar
6. **Uploads nunca no disco local** — sempre MinIO via Presigned URL
7. **Password sempre hasheado** — `bcrypt.hash(password, 10)` (custo 10 em dev, 12 em prod)

---

## CHECKLIST PRÉ-DEPLOY (produção)

- [ ] Remover credenciais da tela de login
- [ ] `MAINTENANCE_KEY` definida e forte no `.env` de produção
- [ ] `JWT_SECRET` diferente do valor de desenvolvimento
- [ ] 2FA obrigatório para todos os admins
- [ ] MinIO com credenciais de produção (não `minioadmin`)
- [ ] HTTPS configurado (Let's Encrypt ou similar)
- [ ] `npm audit` sem vulnerabilidades críticas
- [ ] Logs de produção sem dados pessoais (CPF, email completo, etc.)

---

*Sistema Upgrade | RR TECNOL | 18/03/2026 | Consolidado de: SPRINT_BUG_SEC_A.md + RELATORIO_PRE_FASE2.md*
