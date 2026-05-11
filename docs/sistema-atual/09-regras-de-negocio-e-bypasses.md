# Regras de negócio, flags de ambiente e bypasses (verdade no código)

**Âmbito:** comportamentos que **não** são óbvios só pela navegação na UI — dependem de variáveis de ambiente, comentários de bypass ou seeds. Tudo o que se segue foi verificado por leitura direta dos ficheiros indicados (revisão 2026-05-11).

---

## 1. Autenticação — bypass de MFA (desenvolvimento)

| Item | Detalhe |
|------|---------|
| **Variável** | `AUTH_BYPASS_MFA` no ambiente do **backend** (`true` / `false`, lida via `ConfigService`). |
| **Comportamento** | Se `true`, após validar email e palavra-passe, o `AuthService.login` **não** envia OTP por e-mail nem exige TOTP: gera tokens JWT de imediato e devolve `access_token`, `user`, etc. |
| **Código** | `backend/src/auth/auth.service.ts` (bloco marcado `[DEV BYPASS]`). |
| **Frontend** | `frontend/app/login/page.tsx` — se a resposta já trouxer `access_token` e `user`, grava em `sessionStorage`, atualiza a store e redireciona por `role` (IT_ADMIN, ADMIN, COORDINATOR → `/admin/dashboard`; STUDENT → `/student/dashboard`; DRIVER → `/driver/dashboard`; caso contrário → `/teacher/dashboard`). |
| **Produção** | **Proibido** manter `AUTH_BYPASS_MFA=true` em produção (comentário explícito no serviço). |
| **`.env.example`** | `backend/.env.example` documenta `AUTH_BYPASS_MFA` e `IS_DEMO_MODE` (revisão 2026-05-11). |

### Primeiro login IT_ADMIN (não é bypass de MFA)

Utilizadores `IT_ADMIN` com `requiresPasswordChange` recebem `requiresPasswordChange` + `preAuthToken` e **saltam** OTP no primeiro acesso — fluxo distinto, descrito no mesmo `auth.service.ts` e tratado no `login/page.tsx` com redirecionamento para `/primeiro-login`.

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
