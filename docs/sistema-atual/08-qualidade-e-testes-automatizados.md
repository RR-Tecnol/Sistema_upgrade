# Qualidade e testes automatizados

## Testes unitários (Jest)

No `backend/package.json`:

- `npm run test` — Jest padrão
- `npm run test:watch` — modo observação
- `npm run test:cov` — cobertura
- `npm run test:e2e` — configuração em `test/jest-e2e.json`

Ficheiros de teste habituais: `backend/test/**/*.ts` e `*.spec.ts` junto ao código (conforme convenção do projecto).

## O que não está neste documento

- **Plano de testes manuais** por perfil (checklists E2E humanos) devem viver em processo de equipa ou em `docs/AFAZERES/` quando forem tarefas pendentes — não duplicar aqui listas que envelhecem sem CI.

## Recomendação mínima antes de merge

1. `npm run lint` (backend e frontend, conforme scripts de cada pacote)
2. `npm run test` no backend para alterações em serviços críticos
3. Smoke manual: login + um fluxo do portal afectado
