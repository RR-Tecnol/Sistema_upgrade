# Índice da documentação — Sistema UPGRADE

**Última reorganização:** 2026-05-08 · **Atualização README/changelog:** 2026-05-20 (CLT/diária, fotos MinIO, manutenção+cidade, rastreamento/OSRM). **Caminhos:** `docs/sistema-atual/`, `docs/mapeamentos/`, `docs/SEEDS_GUIDE.md`, [`../README.md`](../README.md) (changelog operacional).

---

## 1. Fonte de verdade técnica (estado atual do código)

Leitura principal para arquitetura, fluxos, dados, integrações, bypasses e **cobertura do repositório**:

**[`sistema-atual/README.md`](./sistema-atual/README.md)**

Ordem sugerida: ficheiros `01` … `10` dentro dessa pasta.

---

## 2. Backlog e execução imediata

| Documento | Uso |
|-----------|-----|
| [`AFAZERES/PROX-PASSOS.md`](./AFAZERES/PROX-PASSOS.md) | Próximos passos e fases |
| [`AFAZERES/PLANO-DE-IMPLEMENTACAO.md`](./AFAZERES/PLANO-DE-IMPLEMENTACAO.md) | Plano detalhado de implementação |
| [`AFAZERES/Correções.md`](./AFAZERES/Correções.md) / [`Correções-2.md`](./AFAZERES/Correções-2.md) | Registo de correcções e notas |

---

## 3. Pesquisa, seeds e mapeamentos

| Documento | Uso |
|-----------|-----|
| [`research/05_reports/`](./research/05_reports/) | Pesquisas e relatórios temáticos |
| [`research/README.md`](./research/README.md) | Índice da pasta de pesquisa |
| [`SEEDS_GUIDE.md`](./SEEDS_GUIDE.md) | Seeds, comandos e credenciais de desenvolvimento |
| [`mapeamentos/CONTAS_A_PAGAR_MAPEAMENTO_E_ROADMAP.md`](./mapeamentos/CONTAS_A_PAGAR_MAPEAMENTO_E_ROADMAP.md) | Roadmap / mapeamento contas a pagar |

---

## 4. Auditoria VPS (bugs de produção mapeados ao código)

Relatórios Word + documentação técnica com **21 itens** (BUG-01 … BUG-21), APIs e passos de correção:

**[`AUDITORIA/SPRINTS-CORRECAO-VPS.md`](./AUDITORIA/SPRINTS-CORRECAO-VPS.md)** → sprints + checklists de teste manual  
**[`AUDITORIA/README.md`](./AUDITORIA/README.md)** → índice  
**[`AUDITORIA/MAPA-COMPLETO-VPS.md`](./AUDITORIA/MAPA-COMPLETO-VPS.md)** → mapa detalhado  
**[`AUDITORIA/ARQUITETURA-API-E-FLUXOS.md`](./AUDITORIA/ARQUITETURA-API-E-FLUXOS.md)** → FE/BE/MinIO/nginx

---

## 5. Documentação de produto na raiz do repositório

O [`README.md`](../README.md) na raiz contém visão geral, quick start e tabela de módulos orientada a utilizador.

---

## Portas e URLs locais (resumo)

| Serviço | URL típica |
|---------|------------|
| Frontend | http://localhost:3010 |
| Backend | `http://localhost:<PORT>` com `PORT` no ambiente; omissão no código: **3001** |
| Swagger | `http://localhost:<PORT>/api/docs` |
| PostgreSQL | localhost:**5432** (utilizador `cursos_user`, ver `docker-compose.yml`) |
| Redis | localhost:**6379** (palavra-passe no `docker-compose.yml`) |
| MinIO API | localhost:**9010** · Consola MinIO localhost:**9011** |

Credenciais de teste: [`SEEDS_GUIDE.md`](./SEEDS_GUIDE.md).
