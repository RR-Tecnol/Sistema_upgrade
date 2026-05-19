# Auditoria VPS — Sistema UPGRADE

Documentação derivada dos relatórios Word (`Auditoria_VPS_Upgrade_v2` … `v4`) **cruzada com o código atual** do repositório. Use isto para entender o que está quebrado, porquê, e como corrigir.

**Data de referência:** 2026-05-18
**Fontes Word (evidências visuais):** esta pasta (`*.docx`)
**Fonte técnica canónica:** [`../sistema-atual/README.md`](../sistema-atual/README.md)

---

## Por onde começar

| Ordem | Documento | Conteúdo |
|-------|-----------|----------|
| 1 | **[SPRINTS-CORRECAO-VPS.md](./SPRINTS-CORRECAO-VPS.md)** | **Plano de sprints** — relato humano ↔ bugs, checklists de teste manual por entrega |
| 2 | **[MAPA-COMPLETO-VPS.md](./MAPA-COMPLETO-VPS.md)** | Todos os bugs (01–21), clusters, APIs, estado no código vs VPS, passos de correção |
| 3 | **[ARQUITETURA-API-E-FLUXOS.md](./ARQUITETURA-API-E-FLUXOS.md)** | Como FE ↔ BE ↔ MinIO ↔ Postgres se ligam; diagramas; variáveis de ambiente |
| 3b | **[REVISAO-VPS-SPRINT1.md](./REVISAO-VPS-SPRINT1.md)** | Revisão “vai funcionar na VPS?” — Sprint 1 (imagens/anexos) |
| 3c | **[SINCRONIA-CURSO-PERIODO-TURMA.md](./SINCRONIA-CURSO-PERIODO-TURMA.md)** | Curso ↔ período ↔ turma — vínculo de professores |
| 4 | [`../sistema-atual/`](../sistema-atual/) | Tutoriais oficiais do sistema (ambiente, auth, viagens, etc.) |
| 5 | [`../AFAZERES/Correções.md`](../AFAZERES/Correções.md) | Histórico de correcções anteriores (C1–C52, UX-, OAI-) |

---

## Resumo executivo (21 itens)

| Cluster | IDs | Impacto |
|---------|-----|---------|
| **Armazenamento / MinIO** | BUG-01, BUG-20, BUG-21 | Imagens 502, NXDOMAIN `minio:9000`, anexos não gravados |
| **Professor / Teacher** | BUG-19, BUG-16 | Dashboard vazio, vínculo turma 404, frequência 500 |
| **Motorista** | BUG-09, BUG-11, MEL-07 | Layout reembolsos, manutenção sem carreta, ponto entrada/saída |
| **Admin pedagógico** | BUG-13, BUG-15, MEL-03, MEL-04, MEL-06, MEL-12 | Módulos turma, feriados, períodos, turmas |
| **Financeiro** | BUG-05, BUG-14 | Diárias com fins de semana, tipo de conta genérico |
| **Auth / infra** | — | Rate limit 2FA (comportamento esperado; não é sprint de bug) |
| **Produto / UX** | MEL-08, MEL-10, MEL-17, MEL-18 | Certificados, viagens manuais, avatar, relatórios PT |

---

## Relatórios Word originais

| Ficheiro | Itens |
|----------|-------|
| `Auditoria_VPS_Upgrade_v2.docx` | BUG-01 … MEL-08 (8 itens) |
| `Auditoria_VPS_Upgrade_v3.docx` | BUG-09 … BUG-15, MEL-10, MEL-12 (7 itens) |
| `Auditoria_VPS_Upgrade_v4.docx` | BUG-16 … BUG-21, MEL-17, MEL-18 (6 itens) |

---

## Legenda de estado (nas tabelas do mapa completo)

| Estado | Significado |
|--------|-------------|
| **Corrigido no repo** | Alteração presente no código local; falta validar/deploy na VPS |
| **Parcial** | Mitigação ou workaround no código; causa raiz ou VPS ainda pendente |
| **Pendente** | Ainda não implementado conforme auditoria |
| **Config VPS** | Código OK; exige `.env`, nginx, rebuild ou migration na VPS |
| **Produto** | Decisão de negócio antes de implementar (ex.: MEL-10) |

---

## Prioridade sugerida para produção

1. **BUG-20 + BUG-01** — MinIO / URLs públicas (desbloqueia quase todos os anexos)
2. **BUG-19** — Professor (bloqueia operação diária)
3. **BUG-05** — Diárias (impacto financeiro)
4. **BUG-21** — Upload na criação (imprevisto/reembolso)
5. **BUG-09, BUG-11, BUG-13, BUG-15, BUG-16** — Motorista + admin operacional
6. Demais MEL-* e BUG-14 conforme sprint

---

## Scripts de deploy no repositório (raiz)

Scripts TypeScript usados para enviar patches pontuais à VPS (não substituem documentação):

- `apply-bug01.ts`, `deploy-bug05.ts`, `deploy-mel03.ts`, `deploy-mel04.ts`, `deploy-mel06-mel07.ts`, `deploy-mel08.ts`, `sync-vps.ts`, `deploy-vps.ts`

Sempre conferir o diff local antes de executar em produção.
