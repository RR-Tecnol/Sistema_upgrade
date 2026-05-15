# Documentação canónica — Sistema UPGRADE

**Função:** árvore de documentação técnica alinhada ao **código e ao repositório atuais**. Tudo o que aqui consta deve ser verificável em `backend/`, `frontend/` ou `docker-compose.yml`. Se o código mudar, esta pasta deve ser atualizada na mesma entrega.

**Data de referência:** 2026-05-08 (capítulo 11: viagens admin/motorista; capítulos 09–10 mantidos).

---

## Como navegar

| Ordem | Ficheiro | Conteúdo |
|-------|----------|----------|
| 1 | [01-visao-produto.md](./01-visao-produto.md) | Domínio, portais, perfis, objetivos do sistema |
| 2 | [02-ambiente-e-execucao-local.md](./02-ambiente-e-execucao-local.md) | Pré-requisitos, Docker, portas, variáveis de ambiente |
| 3 | [03-arquitetura-backend.md](./03-arquitetura-backend.md) | NestJS, módulos, API global (throttle, CORS, health) |
| 4 | [04-frontend-portais-e-rotas.md](./04-frontend-portais-e-rotas.md) | Next.js App Router, rotas por perfil |
| 5 | [05-dados-prisma-migracoes-seeds.md](./05-dados-prisma-migracoes-seeds.md) | Schema, migrations, comandos de seed |
| 6 | [06-autenticacao-sessao-2fa-lgpd.md](./06-autenticacao-sessao-2fa-lgpd.md) | JWT, MFA, fluxos de login e protecções |
| 7 | [07-integracoes-notificacoes-arquivos-mapa.md](./07-integracoes-notificacoes-arquivos-mapa.md) | WebSocket, uploads, MinIO, e-mail, mapas/OSRM |
| 8 | [08-qualidade-e-testes-automatizados.md](./08-qualidade-e-testes-automatizados.md) | Jest, e2e, como validar alterações |
| 9 | [09-regras-de-negocio-e-bypasses.md](./09-regras-de-negocio-e-bypasses.md) | Flags `.env`, bypasses MFA/demo, estado vs plano F5 |
| 10 | [10-cobertura-do-repositorio.md](./10-cobertura-do-repositorio.md) | Mapa completo doc ↔ pastas do projeto |
| 11 | [11-modulo-viagens-logistica.md](./11-modulo-viagens-logistica.md) | Viagens: API motorista/admin, modal auditoria, fotos presignadas, validação |

---

## O que ficou fora desta árvore (de propósito)

| Local | Uso |
|-------|-----|
| [`../AFAZERES/`](../AFAZERES/) | Backlog, correcções pontuais, planos de implementação imediata |
| [`../research/05_reports/`](../research/05_reports/) | Pesquisas, specs exploratórias, histórico de decisões |
| [`../SEEDS_GUIDE.md`](../SEEDS_GUIDE.md) | Detalhe operacional de seeds e credenciais de desenvolvimento |
| [`../mapeamentos/`](../mapeamentos/) | Roadmaps temáticos (ex.: contas a pagar) |

---

## Princípios

1. **Verdade no código:** em caso de divergência entre este texto e o repositório, prevalece o repositório até a doc ser corrigida.
2. **Sem segredos:** não documentar valores reais de produção; usar `.env.example` como referência.
3. **Uma mudança, um sítio:** feature nova → atualizar o capítulo correspondente (ou criar subsecção explícita).
