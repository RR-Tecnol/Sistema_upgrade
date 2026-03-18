# 📚 INDEX — Sistema Upgrade | Qualifica MA/PI/AC
## Versão 3.0 | Reestruturado em 18/03/2026 | Método RR Technology

> **Protocolo de Re-sincronização** — Leia nesta ordem no início de cada sessão:
> 1. [arquitetura/ESTADO_SISTEMA.md](./arquitetura/ESTADO_SISTEMA.md) → o que funciona HOJE e o que está pendente
> 2. [arquitetura/ROADMAP_EPICOS.md](./arquitetura/ROADMAP_EPICOS.md) → qual EXEC executar agora
> 3. [arquitetura/DIARIO_DE_BORDO.md](./arquitetura/DIARIO_DE_BORDO.md) → contexto narrativo da última sessão
> 4. [seguranca/ERROS_E_SOLUCOES.md](./seguranca/ERROS_E_SOLUCOES.md) → não repetir bugs já catalogados
> 5. [arquitetura/LIVRO_DE_REGRAS.md](./arquitetura/LIVRO_DE_REGRAS.md) → padrões imutáveis do projeto
> 6. [arquitetura/PROMPTS_EXECUCAO_FASE2.md](./arquitetura/PROMPTS_EXECUCAO_FASE2.md) → prompt do EXEC atual

---

## 🗺️ MAPA DO PROJETO

| Documento | Conteúdo | Prioridade |
|-----------|---------|------------|
| [arquitetura/ESTADO_SISTEMA.md](./arquitetura/ESTADO_SISTEMA.md) | Snapshot do que funciona hoje, o que está quebrado, próximos EXECs | **Leia primeiro** |
| [arquitetura/ROADMAP_EPICOS.md](./arquitetura/ROADMAP_EPICOS.md) | Trilha completa Fase 1 ✅ + Fase 2 com status de cada EXEC | **2ª leitura** |
| [arquitetura/PLANO_IMPLEMENTACAO_FASES.md](./arquitetura/PLANO_IMPLEMENTACAO_FASES.md) | Histórico de sessões + decisões técnicas tomadas | **3ª leitura** |
| [arquitetura/DIARIO_DE_BORDO.md](./arquitetura/DIARIO_DE_BORDO.md) | Log narrativo de cada sessão — o que aconteceu e por quê | Contexto histórico |
| [arquitetura/PROMPTS_EXECUCAO_FASE2.md](./arquitetura/PROMPTS_EXECUCAO_FASE2.md) | 8 prompts EXEC-01→08 prontos para o Antygravity executar | **Para execução** |
| [arquitetura/LIVRO_DE_REGRAS.md](./arquitetura/LIVRO_DE_REGRAS.md) | Regras imutáveis de código, UI, banco e segurança | Referência obrigatória |
| [arquitetura/BASE_CONHECIMENTO_ESTRATEGICO.md](./arquitetura/BASE_CONHECIMENTO_ESTRATEGICO.md) | 12 decisões arquiteturais com fonte e impacto se reverter | Referência técnica |
| [arquitetura/SETUP.md](./arquitetura/SETUP.md) | Instalação, comandos, credenciais, troubleshooting | Setup inicial |
| [arquitetura/GRAVITY_2_BRAIN.md](./arquitetura/GRAVITY_2_BRAIN.md) | Consciência completa do agente Gravity 2.0 (Partes 1-13) | Identidade do agente |
| [arquitetura/ANALISE_REUNIAO_GRAVITY2.md](./arquitetura/ANALISE_REUNIAO_GRAVITY2.md) | ⚠️ HISTÓRICO — análise da reunião B2G com timestamps (gaps já implementados) | Referência histórica |
| [arquitetura/METODOLOGIA_TRABALHO.md](./arquitetura/METODOLOGIA_TRABALHO.md) | Bypass Protocol da equipe + papéis de cada agente | Protocolo da equipe |
| [seguranca/README.md](./seguranca/README.md) | VULs corrigidas + postura de segurança + checklist produção | Referência de segurança |
| [seguranca/ERROS_E_SOLUCOES.md](./seguranca/ERROS_E_SOLUCOES.md) | 18+ bugs catalogados com causa raiz, solução e prevenção | Antes de debugar |
| [research/05_reports/PESQUISAS_PENDENTES.md](./research/05_reports/PESQUISAS_PENDENTES.md) | F1 concluídas + F2 pendentes com prompts para Deep Research | Antes de nova feature |
| [research/05_reports/SPECS_PDF_GOVERNAMENTAL.md](./research/05_reports/SPECS_PDF_GOVERNAMENTAL.md) | Specs visuais reais dos PDFs aprovadas por Robert S. Pimentel | **Obrigatório antes de EXEC-05** |

---

## 🔑 CREDENCIAIS E PORTAS (desenvolvimento local)

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| **Frontend Next.js** | http://localhost:3000 | — |
| **Backend NestJS** | http://localhost:3001 | — |
| **Swagger (API Docs)** | http://localhost:3001/api/docs | — |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin123 |
| **PostgreSQL** | localhost:5432 | cursos_user / cursos_password / cursos_db |
| **Redis** | localhost:6379 | — |

**Credenciais de teste:**
- Admin: `admin@qualifica.com` / `admin123`
- Aluno: `aluno@qualifica.com` / `aluno123`

> ⚠️ **REMOVER credenciais visíveis da tela de login antes do deploy em produção.**

---

## 🚀 COMANDOS DE INICIALIZAÇÃO

```powershell
# 1. Infraestrutura Docker (postgres + redis + minio)
docker-compose up -d

# 2. Backend NestJS (porta 3001 — valor em backend/.env PORT=3001)
cd backend
npm run start:dev

# 3. Frontend Next.js (porta 3000)  
cd frontend
npm run dev

# 4. Seed do banco (só na primeira vez ou após reset)
cd backend
npx prisma migrate deploy
npm run prisma:seed
```

---

## 👥 PAPÉIS DA EQUIPE

| Papel | Quem | Função |
|-------|------|--------|
| **Comandante / Tech Lead** | Ronaldo Ribeiro (RR Tecnol) | Define visão, autoriza decisões arquiteturais, aprova |
| **Estrategista** | Deep Research (Gemini/Perplexity) | Pesquisa antes de qualquer código |
| **Monitor/Auditor** | Gravity 2.0 (Claude) | Lê arquivos, audita, planeja, valida checklist em tempo real |
| **Motor de Execução** | Antygravity (Claude Sonnet/Windsurf) | Escreve código, roda builds, executa migrations, faz commits |
| **Stakeholder** | Robert S. Pimentel (Upgrade) | Define regras de negócio, fornece modelos de PDF, valida no browser |

**Regra de Ouro (Método RR Technology):** Nenhum papel age sem o anterior ter se manifestado.
`Demanda → Pesquisa → Planejamento (Gravity) → Aprovação (Ronaldo) → Execução (Antygravity) → Validação`

---

## 📦 REPOSITÓRIO

- **GitHub:** https://github.com/RR-Tecnol/Sistema_upgrade.git
- **Diretório local:** `C:\Users\Desktop\Downloads\Sistema_upgrade-main_atual`
- **Último commit:** `b4fc6f0` — Sprint BUG + SEC-A (8/8 fixes) | 16/03/2026
- **Branch ativa:** `master`

---

## 🏗️ STACK TÉCNICA

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | Next.js App Router + Tailwind CSS | 14.x |
| Backend | NestJS + Prisma ORM | 10.x |
| Banco | PostgreSQL | 15 (Docker) |
| Cache/Filas | Redis + BullMQ | 7.x |
| Storage | MinIO (S3-compatible) | latest |
| Auth | JWT duplo (access 15min + refresh 7d) + 2FA TOTP | — |
| WebSocket | Socket.io | /notifications namespace |
| CI/CD | GitHub Actions | `.github/workflows/ci.yml` |
| Infra | Docker Compose | — |

---

## 📊 ESTADO ATUAL DO SISTEMA (18/03/2026 — pós EXEC-01)

| Portal | Telas | Estado |
|--------|-------|--------|
| **Admin** `/admin/*` | 16 telas completas | ✅ Funcional — analytics reais (EXEC-07 ✅) |
| **Professor** `/teacher/*` | 4 telas mobile-first | ⚠️ Login funciona (EXEC-01 ✅), turmas sem filtro por professor (EXEC-03 pendente) |
| **Aluno** `/student/*` | 6 áreas | ⚠️ Frequência hardcoded 87% (EXEC-04 pendente), inscrições corrigidas (EXEC-08 ✅) |
| **Motorista** `/driver/*` | — | 🔴 EXEC-01 ✅ cria User com role DRIVER — portal ainda não existe (EXEC-02 pendente) |
| **Público** | `/cursos`, `/inscricao/[id]`, `/certificado/[codigo]` | ✅ Funcional |

**Banco:** DRIVER no UserRole ✅ | Employee↔User vinculados ✅ | **Commit base Fase 1:** `b4fc6f0`
**Próximo EXEC:** EXEC-02 — Portal do Motorista | Ver [ESTADO_SISTEMA.md](./arquitetura/ESTADO_SISTEMA.md)

---

*Método RR Technology | Sistema Upgrade | RR TECNOL | 18/03/2026*
