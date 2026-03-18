# 🗺️ ROADMAP DE ÉPICOS — Sistema Upgrade
## Trilha Completa de Progresso | Método RR Technology | v3.0 | 18/03/2026

> **Legenda:** ✅ Concluído | 🟡 Parcial | 🔴 Pendente | ⏳ Bloqueado (aguarda externo)

---

## FASE 1 — Completa (Sprints 0 → Final + BUG+SEC-A) ✅

### Sprint 0 — Infraestrutura Base
| Item | Arquivo | Status |
|------|---------|--------|
| Docker Compose UTF-8 (pt_BR.UTF-8) | docker-compose.yml | ✅ |
| MinIO configurado (9 variáveis) | backend/.env | ✅ |
| MAINTENANCE_KEY no .env | backend/.env | ✅ |
| Seed MA + PI + AC (grupos + cidades) | backend/src/prisma/seed.ts | ✅ |

### Sprint 1 — Campos CLT Funcionários (REQ-09)
| Item | Arquivo | Status |
|------|---------|--------|
| contractType/monthlySalaryCLT/travelRuleKm no schema | schema.prisma Employee | ✅ |
| Campos salvos no service | employees.service.ts | ✅ |
| DTO com campos CLT | create-employee.dto.ts | ✅ |
| UI modal com campos CLT | admin/funcionarios/page.tsx | ✅ |

### Sprint 2 — Financeiro Cirúrgico (REQ-09 continuação)
| Item | Arquivo | Status |
|------|---------|--------|
| PayrollService completo | employees/payroll.service.ts | ✅ |
| calcularResumoFinanceiro (CLT + passagens + diárias) | acoes.service.ts | ✅ |
| Alerta custo excessivo (WebSocket) | acoes.service.ts | ✅ |
| Parâmetros financeiros configuráveis (5 params) | settings.service.ts | ✅ |

### Sprint 3 — PDFs + 2FA + Relatórios (REQ-11/12/14)
| Item | Arquivo | Status |
|------|---------|--------|
| PDF frequência P/F por dia | pdf.service.ts | ✅ |
| PDF concludentes NOME+ASSINATURA + desistentes | pdf.service.ts | ✅ |
| 2FA speakeasy TOTP — 4 métodos | auth.service.ts | ✅ |
| 4 endpoints 2FA | auth.controller.ts | ✅ |
| UI ativação 2FA (QR Code + código 6 dígitos) | admin/configuracoes/page.tsx | ✅ |
| Migration add_two_factor | schema.prisma | ✅ |

### Sprint 4 — Portal Professor + BI (REQ-10 + extras)
| Item | Arquivo | Status |
|------|---------|--------|
| 7 telas portal professor | teacher/ | ✅ |
| Bulk attendance upsert | classes.service.ts | ✅ |
| Dashboard BI rotas + filtros estado/ano | dashboard.service.ts | ✅ |
| Mapa interativo MA/PI (react-simple-maps) | components/MapaRotas.tsx | ✅ |

### Sprint 5 — Infra Complementar
| Item | Arquivo | Status |
|------|---------|--------|
| Seed Acre (10 cidades) | seed.ts | ✅ |
| CI/CD GitHub Actions | .github/workflows/ci.yml | ✅ |
| Modo manutenção (middleware 503) | main.ts + manutencao/page.tsx | ✅ |

### Sprint Mobile — Responsividade
| Item | Arquivo | Status |
|------|---------|--------|
| Sidebar drawer + hamburger | Sidebar.tsx + Header.tsx | ✅ |
| Breakpoints globals.css | globals.css | ✅ |
| Grids adaptativos dashboard | dashboard/page.tsx | ✅ |
| Compressão de imagem no reembolso | teacher/reembolsos/page.tsx | ✅ |

### Sprint Final — WebSocket Real-Time
| Item | Arquivo | Status |
|------|---------|--------|
| NotificationsGateway com auth JWT | notifications.gateway.ts | ✅ |
| useNotifications hook | hooks/useNotifications.ts | ✅ |
| Header com badge real-time | Header.tsx | ✅ |

### Sprint BUG + SEC-A — Commit b4fc6f0 (16/03/2026)
| Fix | Arquivo | Status |
|-----|---------|--------|
| SEC-01 Privilege Escalation (register sem role) | auth.service.ts | ✅ |
| SEC-05 Maintenance bypass (undefined==undefined) | main.ts + .env | ✅ |
| SEC-04 Helmet HTTP Security Headers | main.ts + package.json | ✅ |
| BUG-09 bcrypt import estático | enrollments.service.ts | ✅ |
| BUG-08 Race condition enrollment ($transaction) | enrollments.service.ts | ✅ |
| BUG-11 MinIO singleton DI | reimbursement/minio.service.ts | ✅ |
| BUG-12 res.data?.data 6 telas admin | 6 arquivos frontend | ✅ |
| SEC-07+BUG-13 WS userId mascarado + Logger | notifications.gateway.ts | ✅ |

---

## FASE 2 — Em andamento (18/03/2026 →)

### Sprint EXEC — Correções e Gaps (18/03/2026)

| EXEC | Task | Arquivos | Status |
|------|------|---------|--------|
| EXEC-08 | Corrigir ordem rotas `/enrollments/my` antes de `/:id` | enrollments.controller.ts | ✅ **CONCLUÍDO** |
| EXEC-07 | Dashboard admin com analytics reais (endpoint já existia!) | admin/dashboard/page.tsx | ✅ **CONCLUÍDO** |
| EXEC-01 | Employee cria User + DRIVER + migration + modal senha | schema, service, DTO, login, funcionarios | ✅ **CONCLUÍDO** |
| EXEC-02 | Portal do Motorista `/driver/*` (4 telas + 5 endpoints + responsividade validada em 5 resoluções) | driver/layout, dashboard, viagens, reembolsos, veiculo + trips/* backend | ✅ **CONCLUÍDO** |
| EXEC-03 | Professor filtra suas turmas por teacherId | teacher/dashboard, frequencia, classes.service | 🔴 PRÓXIMO |
| EXEC-04 | Frequência real do aluno (groupBy Prisma, sem N+1) | student/dashboard, students.service, students.controller | 🔴 Pendente |
| EXEC-05 | PDFs governamentais: Puppeteer fix + endpoint /all + template real | pdf.service, reports.controller, relatorios/page | 🔴 Pendente |
| EXEC-06 | Histórico do professor (placeholder → dados reais) | teacher/historico/page.tsx | 🔴 Pendente |

> Estado detalhado de cada EXEC: ver [ESTADO_SISTEMA.md](./ESTADO_SISTEMA.md)
> Prompts completos para execução: ver [PROMPTS_EXECUCAO_FASE2.md](./PROMPTS_EXECUCAO_FASE2.md)
> Pesquisas que embasam os EXECs: ver [docs/research/05_reports/PESQUISAS_PENDENTES.md](../research/05_reports/PESQUISAS_PENDENTES.md)

---

## ÉPICOS FUTUROS (Fase 3+)

| Épico | Descrição | Prioridade |
|-------|-----------|------------|
| F3-01 | Exportação XLSX em streaming com filtros avançados (50k+ alunos) | Alta |
| F3-02 | Notificações WhatsApp (BullMQ + Meta API) | Média |
| F3-03 | 3 turmas automáticas por curso no MA (Multicurso) | Média |
| F3-04 | Upload foto de perfil do aluno (MinIO presigned) | Baixa |
| F3-05 | CadÚnico validação socioeconômica (batch import) | Baixa |

---

## MÓDULO FINAL — Épico Sentinela (após Upgrade + Prontuário prontos)

> **Gatilho de início:** Ambos os sistemas (Sistema Upgrade e Sistema Prontuário) em produção e validados pelo Robert.
> **Base de pesquisa:** docs já existentes nos documentos de referência Sentinela (Red Team + Blue Team SIEM).

### Visão Geral
Uma IA de segurança que vive dentro de cada projeto da RR Technology, simulando ataques reais (como um hacker real com Kali Linux) e defendendo em tempo real (SIEM). Com 10 projetos temos um sistema sólido; com 100, um sistema robusto e autodidático.

### Arquitetura em 3 camadas

**Camada 1 — Sentinela por Projeto (IA local por sistema)**
- Agente LangGraph com Groq Llama 3.3-70B ou equivalente gratuito
- Red Team: fuzzing de rotas (ffuf), testes JWT, IDOR batch, SQLMap, Dalfox
- Blue Team SIEM: análise de logs winston, rate limit, SARIF do CI/CD
- Roda 24/7 em ambiente de teste isolado (nunca produção)
- Gera findings estruturados (JSON) com CVSS + AIVSS score

**Camada 2 — Repositório Central RR Technology**
- Recebe findings anonimizados de todas as Sentinelas via API REST (mTLS)
- PII/PHI removida antes de qualquer envio (LGPD compliance)
- Banco PostgreSQL + pgvector para busca semântica de vulnerabilidades similares
- Detecta regressões: "já vimos este IDOR neste endpoint antes"

**Camada 3 — IA Mestre da RR Technology**
- Analisa todos os dados de todas as Sentinelas
- Gera planos de ação priorizados por severidade
- Fine-tuning incremental: a cada 10 projetos, retreina o modelo com dados reais
- Dataset cresce com: findings reais, CVEs públicos, patches validados por devs
- Hardware: 2x RTX 4090 self-hosted com QLoRA (viável, confirmado nos docs de pesquisa)

### Próximos passos quando chegar a hora
1. Deep Research específico para o Sistema Upgrade (análogo ao que foi feito para o Prontuário)
2. Criar módulo `backend/src/sentinela/` com os 5 nós do LangGraph
3. Criar aba "Sentinela" no sistema RR Technology
4. Implementar schema `RedTeamFinding` + pgvector no banco central

**Status:** ⏳ AGUARDANDO — Sistema Upgrade + Prontuário em produção

---

*Sistema Upgrade | RR TECNOL | 18/03/2026 | Consolidado de: 06_PLANEJAMENTO.md + ANALISE_REUNIAO_GRAVITY2.md + RELATORIO_PRE_FASE2.md*
