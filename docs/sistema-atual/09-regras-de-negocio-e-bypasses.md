# Regras de negócio, flags de ambiente e bypasses (verdade no código)

**Âmbito:** comportamentos que **não** são óbvios só pela navegação na UI — dependem de variáveis de ambiente, comentários de bypass ou seeds. Tudo o que se segue foi verificado por leitura direta dos ficheiros indicados (revisão 2026-05-11).

---

## 1. Autenticação — bypasses de desenvolvimento (backend)

### 1.1 `AUTH_BYPASS_MFA` — bypass completo

| Item | Detalhe |
|------|---------|
| **Variável** | `AUTH_BYPASS_MFA` no **backend** (`'true'` / ausente / `false`, via `ConfigService`). |
| **Comportamento** | Se `true`, após validar identificador e palavra-passe, o `AuthService.login` **não** envia OTP por e-mail nem exige TOTP: gera JWT de imediato (`access_token`, `user`, etc.). **Tem precedência** sobre `AUTH_BYPASS_EMAIL_OTP`. |
| **Código** | `backend/src/auth/auth.service.ts` (bloco `[DEV BYPASS — completo]`). |
| **Produção** | **Proibido** `true` em produção. |

### 1.2 `AUTH_BYPASS_EMAIL_OTP` — só saltar OTP por e-mail (2FA mantido)

| Item | Detalhe |
|------|---------|
| **Variável** | `AUTH_BYPASS_EMAIL_OTP` no **backend**. Só é avaliada se `AUTH_BYPASS_MFA` **não** for `true`. |
| **Comportamento** | Após password válida: **não** envia e-mail nem exige código de OTP; executa o mesmo ramo que após OTP válido (`afterEmailOtpVerified`): primeiro login IT_ADMIN, `requiresTwoFactorSetup`, `requiresTwoFactor` (TOTP), ou JWT final. Útil para testar authenticator sem caixa de e-mail. |
| **Código** | `backend/src/auth/auth.service.ts` — `afterEmailOtpVerified`, ramo `[DEV BYPASS — só e-mail OTP]`. |
| **Produção** | **Proibido** `true` em produção (continua a ser bypass de posse de e-mail). |

### 1.3 Frontend — `login/page.tsx`

- Se `access_token` + `user` → sessão e redirect por `role` (inclui `FINANCIAL` → `/admin/dashboard` com os demais staff admin).
- Caso contrário, mesma ordem que `verify-email-otp`: `requiresPasswordChange` → `/primeiro-login`; `requiresTwoFactorSetup` → `/setup-2fa`; `requiresTwoFactor` → `/verify-2fa`; `requiresEmailOtp` → `/verify-email-otp`.

**`.env.example`:** `AUTH_BYPASS_MFA`, `AUTH_BYPASS_EMAIL_OTP` e `IS_DEMO_MODE`.

### Primeiro login IT_ADMIN (regra de negócio, não env)

Utilizadores `IT_ADMIN` com `requiresPasswordChange` recebem `requiresPasswordChange` + `preAuthToken` **antes** de OTP por e-mail e **antes** do ramo `AUTH_BYPASS_EMAIL_OTP` — fluxo no mesmo `auth.service.ts` e redirect em `login/page.tsx` para `/primeiro-login`.

---

## 2. Rastreamento — modo demo e status sintético (BYPASS-DEMO-STATUS)

| Item | Detalhe |
|------|---------|
| **Variável** | `IS_DEMO_MODE` no **backend** e referência no `frontend/.env.example` (valor não precisa de ser lido no cliente para o bypass do status; o cálculo é no servidor). |
| **Comportamento** | Em `driver-location.service.ts`, ao calcular o estado `online` / `stopped` / `offline` a partir do último `DriverLocation`, se `process.env.IS_DEMO_MODE === 'true'` **e** `trip.notes` contiver um token `[DEMO:online|stopped|offline]` (case-insensitive), o **status devolvido é sobrescrito** por esse token. |
| **Código** | `backend/src/driver-location/driver-location.service.ts` (marcadores `BYPASS-DEMO-STATUS` / `FIM BYPASS-DEMO-STATUS`). |
| **Origem dos tokens nas viagens** | O seed de rastreamento associa emails de motoristas demo a marcadores; ver `backend/prisma/seed-desenvolvimento/s4-rastreamento.ts` (`DEMO_STATUS` e gravação em notas da viagem). |
| **Produção** | Comentário no código: desativar em produção (`IS_DEMO_MODE` não `true`) ou remover o bloco quando não for necessário. |

---

## 3. Itens referidos no plano F5 / pós-apresentação — estado no repositório

Os documentos `docs/AFAZERES/PLANO-DE-IMPLEMENTACAO.md` e `PROX-PASSOS.md` ainda mencionam **BYPASS-DEMO-OSRM** (`buildSeedRoute` no seed) e **BYPASS-DEMO-ALERTAS** no dashboard admin.

| Marcador | Última verificação no código (2026-05-11) |
|----------|-------------------------------------------|
| **BYPASS-DEMO-OSRM** / `buildSeedRoute` | **Não encontrados** em `backend/prisma/seed-desenvolvimento/` nem noutros `.ts` do repositório (pesquisa por `buildSeedRoute`, `BYPASS-DEMO-OSRM`). Podem ter sido removidos ou integrados de outra forma; o plano histórico pode estar desatualizado em relação ao Git atual. |
| **BYPASS-DEMO-ALERTAS** | **Não encontrado** em `frontend/app/admin/dashboard/` (nem `BYPASS` nem `DEMO-ALERT`). |

**Conclusão:** tratar F5.16 / alertas demo como **especificação ou backlog** no `PLANO-DE-IMPLEMENTACAO.md`, não como verdade do código actual, até alguém reconciliar o plano com uma nova leitura do Git.

---

## 4. Modo manutenção e JWT (regra transversal)

- **Manutenção:** `main.ts` + `SettingsService` — respostas 503 para a maior parte da API quando ativo, com allowlist de rotas (ver código).
- **JWT:** comprimento mínimo de `JWT_SECRET` em produção validado no bootstrap de `main.ts`.

Detalhe em [03-arquitetura-backend.md](./03-arquitetura-backend.md) e [06-autenticacao-sessao-2fa-lgpd.md](./06-autenticacao-sessao-2fa-lgpd.md).

---

## 5. Onde aprofundar sem duplicar

- Fluxo completo login / OTP / TOTP: [06-autenticacao-sessao-2fa-lgpd.md](./06-autenticacao-sessao-2fa-lgpd.md).
- WebSocket e integrações: [07-integracoes-notificacoes-arquivos-mapa.md](./07-integracoes-notificacoes-arquivos-mapa.md).
- Seeds e credenciais: [../SEEDS_GUIDE.md](../SEEDS_GUIDE.md).
- Lista completa de módulos e pastas vs documentação: [10-cobertura-do-repositorio.md](./10-cobertura-do-repositorio.md).
