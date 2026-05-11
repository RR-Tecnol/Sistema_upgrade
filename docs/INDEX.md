# 📚 INDEX — Sistema Upgrade | Qualifica MA/PI/AC
## Versão 5.0 | Atualizado em 06/04/2026 | Método RR Technology

> **Protocolo de Re-sincronização** — Leia nesta ordem no início de cada sessão:
> 1. [`arquitetura/sobre-sistema.md`](./arquitetura/sobre-sistema.md) → fonte única de verdade: arquitetura, módulos, fluxos por perfil
> 2. [`arquitetura/ESTADO_SISTEMA.md`](./arquitetura/ESTADO_SISTEMA.md) → o que funciona HOJE, bypasses ativos, bugs pendentes
> 3. [`arquitetura/LIVRO_DE_REGRAS.md`](./arquitetura/LIVRO_DE_REGRAS.md) → regras imutáveis antes de qualquer código
> 4. [`seguranca/ERROS_E_SOLUCOES.md`](./seguranca/ERROS_E_SOLUCOES.md) → não repetir bugs já catalogados
> 5. [`AFAZERES/PROX-PASSOS.md`](./AFAZERES/PROX-PASSOS.md) → o que fazer agora e próximas fases
> 6. **⭐ [`AFAZERES/PLANO-DE-IMPLEMENTACAO.md`](./AFAZERES/PLANO-DE-IMPLEMENTACAO.md) → código real para F5.13–F5.16 (4 bugs pendentes)**
> 7. Doc situacional conforme a tarefa → ver tabela abaixo

---

## 🗺️ MAPA COMPLETO DOS DOCUMENTOS

### 📐 Arquitetura e Planejamento

| Documento | Conteúdo | Quando ler |
|-----------|---------|------------|
| [arquitetura/**sobre-sistema.md**](./arquitetura/sobre-sistema.md) | ⭐ **FONTE Única de verdade**: arquitetura, módulos, enums, regras de negócio, fluxos por perfil, API, hooks | **Sempre — 1ª leitura** (doc master) |
| [arquitetura/ESTADO_SISTEMA.md](./arquitetura/ESTADO_SISTEMA.md) | Snapshot do que funciona hoje, bypasses ativos (BYPASS-DEMO-*), bugs pendentes (BUG-DRAWER-TRANSFORM etc.) | **Sempre — 2ª leitura** |
| [arquitetura/LIVRO_DE_REGRAS.md](./arquitetura/LIVRO_DE_REGRAS.md) | Regras imutáveis: UI, backend, banco, segurança, anti-padrões completos (v7.0) | **Sempre — 3ª leitura** |
| [AFAZERES/PROX-PASSOS.md](./AFAZERES/PROX-PASSOS.md) | Roadmap de execução: Fases 1–6, F5.13–F5.16 pendentes, checklist de produção | **Antes de executar qualquer passo** |
| [**AFAZERES/PLANO-DE-IMPLEMENTACAO.md**](./AFAZERES/PLANO-DE-IMPLEMENTACAO.md) | ⭐ **NOVO** — Código TypeScript/TSX real com insights do Deep Research para os 4 bugs bloqueantes | **Implementação imediata dos 4 bugs** |
| [arquitetura/DIARIO_DE_BORDO.md](./arquitetura/DIARIO_DE_BORDO.md) | Log narrativo de cada sessão — o que aconteceu e por quê | Referência histórica |
| [arquitetura/REGRAS_RESPONSIVIDADE_PORTAL_MOTORISTA.md](./arquitetura/REGRAS_RESPONSIVIDADE_PORTAL_MOTORISTA.md) | 8 regras arquiteturais do portal /driver/* | **Antes de alterar o portal do motorista** |
| [arquitetura/RASTREAMENTO_PRODUCAO_APRESENTACAO.md](./arquitetura/RASTREAMENTO_PRODUCAO_APRESENTACAO.md) | Bypasses GPS: demo x produção, script de apresentação, remoção de bypasses | **Antes de alterar rastreamento GPS** |
| [arquitetura/BASE_CONHECIMENTO_ESTRATEGICO.md](./arquitetura/BASE_CONHECIMENTO_ESTRATEGICO.md) | 12 decisões arquiteturais com fonte e impacto | Referência técnica |
| [arquitetura/SETUP.md](./arquitetura/SETUP.md) | Instalação, comandos, credenciais, troubleshooting | Setup inicial |
| [SEEDS_GUIDE.md](./SEEDS_GUIDE.md) | Guia completo do seed-full.ts: o que cria, como resetar | **Antes de rodar seed ou alterar dados** |

### ⚙️ Processo e Método

| Documento | Conteúdo | Quando ler |
|-----------|---------|------------|
| [AFAZERES/PROX-PASSOS.md](./AFAZERES/PROX-PASSOS.md) | Roadmap de execução: Fases 1–6, F5.13–F5.16 pendentes, checklist de produção | **Antes de executar qualquer passo** |
| [**AFAZERES/PLANO-DE-IMPLEMENTACAO.md**](./AFAZERES/PLANO-DE-IMPLEMENTACAO.md) | ⭐ **NOVO** — Código real + critério de aceite para F5.13–F5.16. Baseado no Deep Research Report 07/04/2026 | **Ao implementar os 4 bugs pendentes** |
| [arquitetura/METODOLOGIA_TRABALHO.md](./arquitetura/METODOLOGIA_TRABALHO.md) | Fluxo de trabalho, papéis, bypass protocol, como validar e documentar | **Início de cada sessão** |
| [arquitetura/PLANO_IMPLEMENTACAO_FASES.md](./arquitetura/PLANO_IMPLEMENTACAO_FASES.md) | Histórico de sessões + decisões técnicas | Referência histórica |
| [arquitetura/ANALISE_REUNIAO_GRAVITY2.md](./arquitetura/ANALISE_REUNIAO_GRAVITY2.md) | ⚠️ HISTÓRICO — análise da reunião B2G (gaps já implementados) | Referência histórica |

### 🛡️ Segurança

| Documento | Conteúdo | Quando ler |
|-----------|---------|------------|
| [seguranca/MR_ROBOT_MENTALIDADE.md](./seguranca/MR_ROBOT_MENTALIDADE.md) | Mentalidade de hacker ético + 4 camadas de escaneamento + checklist | **Antes da 1ª sessão e antes de cada EXEC** |
| [seguranca/ERROS_E_SOLUCOES.md](./seguranca/ERROS_E_SOLUCOES.md) | 18+ bugs catalogados com causa raiz, solução e prevenção | **Antes de debugar qualquer erro** |
| [seguranca/README.md](./seguranca/README.md) | VULs corrigidas + postura de segurança + checklist produção | Referência de segurança |

### 🔬 Pesquisa e Specs

| Documento | Conteúdo | Quando ler |
|-----------|---------|------------|
| [research/05_reports/PESQUISAS_PENDENTES.md](./research/05_reports/PESQUISAS_PENDENTES.md) | F1 concluídas + F2 pendentes com prompts para Deep Research | Antes de nova feature |
| [research/05_reports/SPECS_PDF_GOVERNAMENTAL.md](./research/05_reports/SPECS_PDF_GOVERNAMENTAL.md) | Specs visuais reais dos PDFs aprovados por Robert | **Obrigatório antes do EXEC-05** |

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

**Usuários de teste:**
- Admin: `admin@qualifica.com` / `admin123`
- Motorista: `joao.driver.test99@qualifica.com` / `senha123` (role DRIVER)
- Professora: `maria.professora.visual@qualifica.com` / `prof123` (role TEACHER)
- Aluno: `aluno@qualifica.com` / `aluno123`

> ⚠️ **REMOVER credenciais visíveis da tela de login antes do deploy em produção.**

---

## 🚀 COMANDOS DE INICIALIZAÇÃO

```powershell
# 1. Infraestrutura Docker (postgres + redis + minio)
docker-compose up -d

# 2. Backend NestJS — SEMPRE assim, nunca com $env:PORT inline
cd backend
Remove-Item Env:PORT -ErrorAction SilentlyContinue
npm run start:dev

# 3. Frontend Next.js
cd frontend
npm run dev

# 4. Migrations e seed (primeira vez ou após reset)
cd backend
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed
```

---

## 👥 PAPÉIS DA EQUIPE

| Papel | Quem | Função |
|-------|------|--------|
| **Comandante / Tech Lead** | Davi (RR Tecnol) | Autoridade final — aprova, valida, decide |
| **Monitor / Auditor** | Gravity 2.0 (Claude) | Analisa, planeja, valida, documenta, segurança |
| **Motor de Execução** | Antygravity (Windsurf/Sonnet) | Implementa código mediante prompt aprovado |
| **Estrategista** | Deep Research (Gemini/Perplexity) | Pesquisa antes de features complexas |
| **Stakeholder** | Robert S. Pimentel (Upgrade) | Define negócio, valida entregáveis |

**Fluxo obrigatório:**
`Demanda → Pesquisa → Planejamento → Aprovação → Execução → Validação → Docs → Commit`

---

## 📊 ESTADO ATUAL (19/03/2026)

| Portal | Estado |
|--------|--------|
| **Admin** `/admin/*` | ✅ Completo — analytics reais (EXEC-07 ✅) |
| **Professor** `/teacher/*` | ⚠️ Funciona, turmas sem filtro por professor (EXEC-03 pendente) |
| **Motorista** `/driver/*` | ✅ Portal completo + responsividade 5 resoluções (EXEC-02 ✅) |
| **Aluno** `/student/*` | ⚠️ Frequência hardcoded 87% (EXEC-04 pendente) |
| **Público** | ✅ Funcional |

**Próximo EXEC:** EXEC-03 — Professor filtra suas turmas
**Pendência imediata:** `GET /reimbursements/my` retorna 404 para role DRIVER

---

## 📦 REPOSITÓRIO

- **GitHub:** https://github.com/RR-Tecnol/Sistema_upgrade.git
- **Branch ativa:** `master`
- **Último commit Fase 2:** `feat: fase 2 completa — EXEC-01/02/07/08 + portal motorista responsivo`

---

## 🏗️ STACK TÉCNICA

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | Next.js App Router + Tailwind CSS | 14.x |
| Backend | NestJS + Prisma ORM | 10.x |
| Banco | PostgreSQL | 15 (Docker) |
| Cache | Redis | 7.x |
| Storage | MinIO (S3-compatible) | latest |
| Auth | JWT duplo (access 15min + refresh 7d) + 2FA TOTP | — |
| WebSocket | Socket.io | /notifications namespace |
| CI/CD | GitHub Actions | `.github/workflows/ci.yml` |

---

*Método RR Technology | Sistema Upgrade | RR Tecnol | 19/03/2026*
