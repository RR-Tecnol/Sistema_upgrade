# 🔬 PESQUISAS PENDENTES — Fila de Deep Research
## Sistema Upgrade | Método RR Technology | v3.0 | 18/03/2026

> **Regra:** Antes de implementar qualquer feature nova que envolva decisão arquitetural,
> consulte este arquivo. Se não houver pesquisa — gere o prompt e coloque nesta fila.
> Pesquisa ANTES de código. Sempre.

---

## COMO USAR

1. **Antes de implementar:** Verificar se há pesquisa aqui sobre o tema
2. **Se não tiver:** Copiar o prompt da fila, rodar no Deep Research (Gemini/Perplexity)
3. **Após rodar:** Salvar o resultado em `05_reports/YYYY-MM-DD_nome.md`
4. **Atualizar a fila:** Marcar como `✅ CONCLUÍDA` e adicionar link para o relatório

---

## ⚠️ SPECS APROVADAS PELO CLIENTE — NÃO SÃO PESQUISAS

Estas são definições confirmadas por Robert S. Pimentel, não precisam
de pesquisa — precisam de implementação.

| Documento | Conteúdo | Status |
|-----------|---------|--------|
| [SPECS_PDF_GOVERNAMENTAL.md](./SPECS_PDF_GOVERNAMENTAL.md) | Layout real dos PDFs de frequência (4 logos + tabela P/F por dia) e concludentes (NOME+ASSINATURA) aprovados pelo Robert | ✅ Specs confirmadas — aguarda EXEC-05 |

---

## PESQUISAS CONCLUÍDAS (Fase 1)

| Tema | Relatório |
|------|-----------|
| Arquitetura ERP B2G (NestJS + Prisma + Next.js) | `05_reports/2026-03-12_plano_arquitetural_erp_b2g.md` |
| Portal do Aluno — Auth + Certificados + 3G | `05_reports/2026-03-12_portal_aluno_autenticacao_certificados.md` |
| Modelo Financeiro CLT — Passagens e Diárias | `05_reports/2026-03-12_modelo_financeiro_clt_passagens.md` |
| Portal Reembolso Mobile — Upload MinIO | `05_reports/2026-03-12_portal_reembolso_mobile_upload.md` |
| Notificações Multicanal BullMQ + WhatsApp | `05_reports/2026-03-12_notificacoes_multicanal_bullmq.md` |
| Geração Relatórios PDF Governamental (Puppeteer) | `05_reports/2026-03-12_geracao_relatorios_pdf_governamental.md` |
| Exportação Multi-formato XLSX (Streaming) | `05_reports/2026-03-12_exportacao_multi_formato_filtros.md` |
| Recálculo de Cronograma com Feriados | `05_reports/2026-03-12_recalculo_cronograma_feriados.md` |
| Segurança 2FA + Sessão + Backup | `05_reports/2026-03-12_seguranca_2fa_sessao_backup.md` |

---

## PESQUISAS PENDENTES — Fase 2

### PESQ-F2-01 — Portal do Motorista: UX e Funcionalidades

**Prioridade:** 🔴 Alta (bloqueia F2-01)
**Status:** ✅ CONCLUÍDA — [2026-03-18_portal_motorista_ux_funcionalidades.md](./2026-03-18_portal_motorista_ux_funcionalidades.md)

**Contexto:** O motorista é um funcionário que dirige a carreta nas rotas. Na apresentação ao Robert (próxima reunião), ele espera ver o acesso do motorista. Precisamos definir exatamente o que o motorista vê no portal.

**Prompt para Deep Research:**
```
Sistema B2G de gestão de carretas-escola para programa governamental de qualificação profissional.
O motorista (função: DRIVER) dirige a carreta entre cidades do Maranhão e Piauí.

Quais funcionalidades um portal mobile-first para motorista deve ter?
Considere:
- Motorista não precisa de acesso administrativo
- Motorista precisa ver o roteiro de viagens
- Motorista registra despesas de campo (combustível, pedágio, alimentação)
- Motorista solicita reembolsos com foto do comprovante
- Motorista recebe notificações de novas rotas atribuídas

Stack: Next.js 14 App Router. Backend NestJS. MinIO para uploads.

Entregue:
1. Lista priorizada de funcionalidades para o portal do motorista
2. Estrutura de rotas recomendada (/driver/*)
3. Endpoints de API necessários
4. Considerações de UX mobile para motorista em campo (3G, celular Android)
```

---

### PESQ-F2-02 — Frequência Real via API REST (sem mock)

**Prioridade:** 🟠 Média
**Status:** ✅ CONCLUÍDA — [2026-03-18_frequencia_real_aluno_api.md](./2026-03-18_frequencia_real_aluno_api.md)

**Contexto:** O portal do aluno mostra frequência hardcoded (87%). O endpoint correto precisa ser identificado e conectado.

**Prompt para Deep Research:**
```
NestJS backend com Prisma. Frontend Next.js 14.
Tabela Attendance: {classId, studentId, date, present: boolean}
Tabela Student: {id, userId}

Como calcular e expor via REST API:
1. Taxa de frequência do aluno autenticado (present/total * 100)
2. Histórico de presença por turma
3. Quantas faltas são permitidas até reprovar (threshold: 75%)

Endpoint sugerido: GET /students/me/attendance-summary
Retorno necessário: { totalClasses, presentCount, absentCount, rate, remainingAllowedAbsences }

Considerar: o aluno pode estar em múltiplas turmas simultâneas.
```

---

### PESQ-F2-03 — Exportação XLSX em Streaming para 50k+ Alunos

**Prioridade:** 🟠 Média
**Status:** ✅ CONCLUÍDA — [2026-03-18_exportacao_xlsx_streaming_50k.md](./2026-03-18_exportacao_xlsx_streaming_50k.md)

**Contexto:** `admin/relatorios/page.tsx` tem dados mock. O endpoint de exportação existe mas precisa de streaming para volumes grandes.

**Prompt para Deep Research:**
```
NestJS + ExcelJS + Prisma com cursor-based pagination.
Gerar XLSX de 50.000+ alunos sem OOM (Out of Memory).

Como implementar:
1. Streaming de XLSX com ExcelJS (não carregar tudo em memória)
2. Cursor-based pagination no Prisma (evitar OFFSET lento)
3. Background job com BullMQ (para exportações > 5k linhas)
4. Notificação via Socket.io quando o arquivo estiver pronto
5. Upload do arquivo gerado para MinIO → Presigned URL para download

Resultado esperado em <30 segundos para 50k linhas.
UTF-8 BOM + ponto-e-vírgula (Excel Brasil).
```

---

### PESQ-F2-04 — WhatsApp Business API Rate Limiting

**Prioridade:** 🟡 Baixa (Fase 3)
**Status:** 🔴 Pendente

**Contexto:** Robert pediu alertas por WhatsApp (nova inscrição, aprovação, frequência baixa). A Meta bloqueia envios em massa sem rate limiting.

**Prompt para Deep Research:**
```
Sistema NestJS com BullMQ para envio de notificações WhatsApp.
Meta/WhatsApp Business API.

Como implementar:
1. Rate limiting seguro (max 40 msg/segundo conforme limite Meta)
2. Templates de mensagem aprovados pela Meta para sistema governamental
3. Retry com exponential backoff em caso de falha
4. Dead Letter Queue para mensagens que falham 3x
5. Monitoramento de saúde do canal WhatsApp

Custo estimado para 1000 notificações/mês.
Alternativa gratuita: WhatsApp Web/Baileys (riscos e limitações).
```

---

### PESQ-F2-05 — Template PDF com Logo Governamental ✅ CONCLUÍDA

**Status:** ✅ Specs recebidas do Robert — ver [SPECS_PDF_GOVERNAMENTAL.md](./SPECS_PDF_GOVERNAMENTAL.md)

Os modelos reais foram enviados pelo Robert pelo WhatsApp (3 arquivos):
- PDF FREQUENCIA_CORTE_E_COSTURA.pdf → especificado in SPECS_PDF_GOVERNAMENTAL.md#S3-01
- PDF CONCLUDENTES_MORRO_CABECA.pdf → especificado in SPECS_PDF_GOVERNAMENTAL.md#S3-02
- Planilha CLT Diego Rafael → especificado in SPECS_PDF_GOVERNAMENTAL.md#S3-03

Implementação pendente: EXEC-05.

---

## PESQUISAS FUTURAS (Fase 3)

| Tema | Contexto | Prioridade |
|------|----------|------------|
| CadÚnico validação batch import | Validar elegibilidade do aluno via CadÚnico | 🟡 Baixa |
| Puppeteer Singleton Browser Pool | Geração de múltiplos PDFs sem abrir browser por PDF | 🟡 Baixa |
| CI/CD deploy VPS (Docker + Nginx) | Deploy do sistema em produção governamental | 🔴 Alta (pré-entrega) |
| Backup automatizado MinIO + Postgres | pg_dump streaming para MinIO | 🔴 Alta (pré-entrega) |

---

*Sistema Upgrade | RR TECNOL | 18/03/2026 | Consolidado de: 05_reports/PESQUISAS_PENDENTES.md + ANALISE_REUNIAO_GRAVITY2.md*

---

## 📦 PESQUISAS DE FASE 1 — Arquivo Original 05_reports/ (absorvido em 18/03/2026)

> Conteúdo original do arquivo `docs/research/05_reports/PESQUISAS_PENDENTES.md` absorvido aqui para centralizar tudo em um único arquivo.
> O arquivo original em `05_reports/` permanece como referência histórica com os prompts brutos completos.

### STATUS FASE 1 — Todas 10 Pesquisas Concluídas

| Requisito | Tema | Pesquisa | Arquivo |
|-----------|------|----------|---------|
| REQ-08 | Recálculo de cronograma com feriados | ✅ Concluída | `05_reports/2026-03-12_recalculo_cronograma_feriados.md` |
| REQ-11 + REQ-12 | Geração de PDFs governamentais | ✅ Concluída | `05_reports/2026-03-12_geracao_relatorios_pdf_governamental.md` |
| REQ-01 a REQ-14 (geral) | Plano arquitetural ERP/B2G | ✅ Concluída | `05_reports/2026-03-12_plano_arquitetural_erp_b2g.md` |
| REQ-10 | Portal de reembolso mobile com upload de foto | ✅ Concluída | `05_reports/2026-03-12_portal_reembolso_mobile_upload.md` |
| REQ-09 | Modelo financeiro CLT — cálculo de passagens por distância | ✅ Concluída | `05_reports/2026-03-12_modelo_financeiro_clt_passagens.md` |
| REQ-06 | Portal do aluno — autenticação sem senha + certificado digital | ✅ Concluída | `05_reports/2026-03-12_portal_aluno_autenticacao_certificados.md` |
| REQ-13 | Exportação multi-formato (Excel/CSV/PDF) com filtros avançados | ✅ Concluída | `05_reports/2026-03-12_exportacao_multi_formato_filtros.md` |
| REQ-14 | 2FA, gestão de sessão, backup automático no NestJS | ✅ Concluída | `05_reports/2026-03-12_seguranca_2fa_sessao_backup.md` |
| TRANSVERSAL | Integração CADUNICO para validação socioeconômica | ✅ Concluída | `05_reports/2026-03-12_cadunico_validacao_socioeconomica.md` |
| TRANSVERSAL | Notificações multi-canal (In-App + WhatsApp + E-mail) | ✅ Concluída | `05_reports/2026-03-12_notificacoes_multicanal_bullmq.md` |

> 🎉 **TODAS AS 10 PESQUISAS DE FASE 1 CONCLUÍDAS.**

### Principais Decisões Documentadas por Pesquisa

**PESQ-01 — Reembolso Mobile:**
`capture="environment"` (nativo) para câmera, `URL.createObjectURL()` para preview, `browser-image-compression` (Web Worker), Presigned URLs (upload direto MinIO sem proxy NestJS), Axios `onUploadProgress`, bucket privado (Default Deny), validação anti-spoofing via magic bytes com BullMQ, exponential backoff para 3G instável.

**PESQ-02 — Modelo Financeiro CLT:**
`Decimal @db.Decimal(12,2)` (nunca Float), regra ≤200km (semanal) vs >200km (quinzenal), tabela `MunicipalDistance` pré-calculada (MVP), OSRM self-hosted para produção, `TravelExpenseConfig` versionado por data de vigência, Raw SQL via `$queryRaw` para relatórios de custo, ExcelJS Streaming para exportação sem OOM.

**PESQ-03 — Portal do Aluno:**
CPF + OTP SMS (MVP) via Zenvia → Gov.br OAuth2 (produção), rate limiting por CPF no Redis, JWT 24h access + 30d refresh, Puppeteer Singleton para geração de certificado, PDF gerado uma vez na aprovação → MinIO, QR Code via `qrcode` apontando para URL de validação pública, RSC Next.js 14 para performance em Android 8/3G.

**Prompts brutos completos (REQ-13, REQ-14, CADUNICO, Notificações):** ver `docs/research/05_reports/PESQUISAS_PENDENTES.md`
