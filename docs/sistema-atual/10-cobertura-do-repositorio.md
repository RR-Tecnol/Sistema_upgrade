# Cobertura do repositório (mapa doc ↔ código)

Este ficheiro confirma que **cada área principal** do monorepo tem entrada na documentação canónica. Não lista cada ficheiro fonte (isso seria o próprio Git); lista **âncoras** verificáveis.

**Raiz do repositório:** ficheiros `README.md`, `docker-compose.yml`, `.gitignore`, workflows em `.github/workflows/` (quando existirem).

| Área | Local no repo | Onde está documentado |
|------|-----------------|------------------------|
| Infra local | `docker-compose.yml` (PostgreSQL, Redis, MinIO) | [02-ambiente-e-execucao-local.md](./02-ambiente-e-execucao-local.md) |
| API | `backend/src/` (NestJS) | [03-arquitetura-backend.md](./03-arquitetura-backend.md) |
| Entrada HTTP | `backend/src/main.ts` | [02](./02-ambiente-e-execucao-local.md), [03](./03-arquitetura-backend.md) |
| Registo de módulos | `backend/src/app.module.ts` | [03](./03-arquitetura-backend.md) |
| Dados | `backend/prisma/schema.prisma`, `migrations/` | [05-dados-prisma-migracoes-seeds.md](./05-dados-prisma-migracoes-seeds.md) |
| Seeds dev | `backend/prisma/seed-desenvolvimento/` | [05](./05-dados-prisma-migracoes-seeds.md), [../SEEDS_GUIDE.md](../SEEDS_GUIDE.md) |
| UI | `frontend/app/`, `frontend/components/` | [04-frontend-portais-e-rotas.md](./04-frontend-portais-e-rotas.md) |
| Auth / MFA / bypass | `backend/src/auth/`, `frontend/app/login/` | [06](./06-autenticacao-sessao-2fa-lgpd.md), [09](./09-regras-de-negocio-e-bypasses.md) |
| Notificações, ficheiros, mapas | `notifications`, `uploads`, `reports`, `driver-location`, MinIO nos serviços | [07](./07-integracoes-notificacoes-arquivos-mapa.md) |
| Testes automáticos | `backend/test/`, `jest` em `package.json` | [08](./08-qualidade-e-testes-automatizados.md) |
| Backlog e planos | `docs/AFAZERES/` | [../INDEX.md](../INDEX.md), README `sistema-atual` |
| Pesquisa exploratória | `docs/research/05_reports/` | [../research/README.md](../research/README.md) |
| Roadmap contas a pagar | `docs/mapeamentos/` | [../INDEX.md](../INDEX.md) |

### Módulos NestJS (`app.module.ts`) — checklist

Todos os imports de `AppModule` estão refletidos na tabela de [03-arquitetura-backend.md](./03-arquitetura-backend.md). Se for adicionado um módulo novo ao `app.module.ts`, atualizar **essa tabela** e, se necessário, [04](./04-frontend-portais-e-rotas.md) ou [07](./07-integracoes-notificacoes-arquivos-mapa.md).

### Rotas Next.js

A listagem de `page.tsx` em [04-frontend-portais-e-rotas.md](./04-frontend-portais-e-rotas.md) deve ser atualizada quando forem criadas rotas novas relevantes para utilizadores (admin/teacher/driver/student ou fluxos públicos).

### Limitações honestas

- **Não** há especificação OpenAPI para o namespace WebSocket (comportamento descrito em [07](./07-integracoes-notificacoes-arquivos-mapa.md) + ficheiro de contrato TypeScript).
- Relatórios em `docs/research/05_reports/` podem descrever funcionalidades **planeadas** ou alternativas; a implementação efectiva está no código e em `sistema-atual/`.
