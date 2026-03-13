# 🔍 Pesquisas Pendentes — Prompts para Deep Research

**Data de criação:** 2026-03-12
**Origem:** Análise dos requisitos pendentes no `06_PLANEJAMENTO.md` que ainda não têm pesquisa arquitetural documentada.

> **Como usar:** Copie o prompt da seção desejada e envie diretamente ao **Deep Research** (Gemini Advanced / Perplexity / ChatGPT Research Mode). Após receber a resposta, salve o resultado aqui no `/05_reports/` seguindo a convenção `AAAA-MM-DD_tema.md` e substitua o prompt pelo conteúdo da pesquisa.

---

## 📌 STATUS DAS PESQUISAS

| Requisito | Tema | Pesquisa | Arquivo |
|-----------|------|----------|---------|
| REQ-08 | Recálculo de cronograma com feriados | ✅ Concluída | `2026-03-12_recalculo_cronograma_feriados.md` |
| REQ-11 + REQ-12 | Geração de PDFs governamentais | ✅ Concluída | `2026-03-12_geracao_relatorios_pdf_governamental.md` |
| REQ-01 a REQ-14 (geral) | Plano arquitetural ERP/B2G | ✅ Concluída | `2026-03-12_plano_arquitetural_erp_b2g.md` |
| REQ-10 | Portal de reembolso mobile com upload de foto | ✅ Concluída | `2026-03-12_portal_reembolso_mobile_upload.md` |
| REQ-09 | Modelo financeiro CLT — cálculo de passagens por distância | ✅ Concluída | `2026-03-12_modelo_financeiro_clt_passagens.md` |
| REQ-06 | Portal do aluno — autenticação sem senha + certificado digital | ✅ Concluída | `2026-03-12_portal_aluno_autenticacao_certificados.md` |
| REQ-13 | Exportação multi-formato (Excel/CSV/PDF) com filtros avançados | ✅ Concluída | `2026-03-12_exportacao_multi_formato_filtros.md` |
| REQ-14 | 2FA, gestão de sessão, backup automático no NestJS | ✅ Concluída | `2026-03-12_seguranca_2fa_sessao_backup.md` |
| TRANSVERSAL | Integração CADUNICO para validação socioeconômica | ✅ Concluída | `2026-03-12_cadunico_validacao_socioeconomica.md` |
| TRANSVERSAL | Notificações multi-canal (In-App + WhatsApp + E-mail) | ✅ Concluída | `2026-03-12_notificacoes_multicanal_bullmq.md` |

> 🎉 **TODAS AS 10 PESQUISAS CONCLUÍDAS.** O `06_PLANEJAMENTO.md` foi expandido com fundamentações, justificativas e passo a passo baseados nestas pesquisas.

---

## ✅ PESQUISA 1 — Portal de Reembolso Mobile com Upload de Foto (REQ-10)

**Pesquisa concluída.** Ver arquivo: [`2026-03-12_portal_reembolso_mobile_upload.md`](./2026-03-12_portal_reembolso_mobile_upload.md)

**Principais decisões documentadas:** `capture="environment"` (nativo) para câmera, `URL.createObjectURL()` para preview, `browser-image-compression` (Web Worker) para compressão, Presigned URLs (upload direto MinIO sem proxy NestJS), Axios `onUploadProgress` para barra de progresso, bucket privado (Default Deny), validação anti-spoofing via magic bytes com BullMQ, exponential backoff para 3G instável.

---

## ✅ PESQUISA 2 — Modelo Financeiro CLT: Cálculo de Passagens por Distância (REQ-09)

**Pesquisa concluída.** Ver arquivo: [`2026-03-12_modelo_financeiro_clt_passagens.md`](./2026-03-12_modelo_financeiro_clt_passagens.md)

**Principais decisões documentadas:** `Decimal @db.Decimal(12,2)` (nunca Float) para precisão B2G, regra ≤200km (semanal) vs >200km (quinzenal), tabela `MunicipalDistance` pré-calculada (MVP), OSRM self-hosted para produção, `TravelExpenseConfig` versionado por data de vigência, Raw SQL via `$queryRaw` para relatórios de custo, ExcelJS Streaming para exportação sem OOM.

---

## ✅ PESQUISA 3 — Portal do Aluno: Autenticação Simplificada + Certificado Digital (REQ-06)

**Pesquisa concluída.** Ver arquivo: [`2026-03-12_portal_aluno_autenticacao_certificados.md`](./2026-03-12_portal_aluno_autenticacao_certificados.md)

**Principais decisões documentadas:** CPF + OTP SMS (MVP) via Zenvia → Gov.br OAuth2 (produção), rate limiting por CPF no Redis, JWT 24h access + 30d refresh para acesso esporádico, Puppeteer Singleton para geração de certificado, PDF gerado uma vez na aprovação → MinIO, QR Code via lib `qrcode` apontando para URL de validação pública LGPD-compliant, RSC Next.js 14 para performance em Android 8/3G.

---

## 🔴 PESQUISA 4 — Exportação Multi-Formato com Filtros Avançados (REQ-13)

### Contexto
O sistema precisa exportar dados em Excel (XLSX), CSV, PDF e JSON com filtros combinados: por estado, ano, cidade, curso, status de certificado e rota.

### Prompt para Deep Research

```
Preciso de uma pesquisa sobre como implementar exportação de dados em múltiplos formatos
(Excel/XLSX, CSV, PDF, JSON) com filtros avançados em NestJS 10 + Prisma + PostgreSQL +
Next.js 14, para um sistema de gestão governamental com potencialmente 50.000+ alunos.

Pesquise e responda sobre:

1. GERAÇÃO DE EXCEL (XLSX) NO NESTJS:
   - Comparação entre: ExcelJS, xlsx (SheetJS), node-xlsx, @fast-csv/format
   - Para dados de 50k+ linhas, qual biblioteca não estoura memória? (streaming vs. buffer)
   - Como implementar: cabeçalhos em português com formatação, células coloridas para
     status (verde=aprovado, vermelho=reprovado), logo da empresa no cabeçalho
   - Como exportar dados relacionais do Prisma (aluno + turma + frequência + certificado)
     em múltiplas abas (sheets) no mesmo arquivo Excel?

2. FILTROS AVANÇADOS COM PERFORMANCE NO PRISMA:
   - Como construir queries dinâmicas no Prisma com filtros opcionais/combinados sem
     gerar SQL ineficiente? (Pattern para WHERE dinâmico)
   - Para relatório "todos os alunos do estado X, ano Y, com certificado emitido":
     query Prisma otimizada ou Raw SQL?
   - Como paginar resultados grandes (cursor-based vs. offset) para evitar timeout
     ao exportar 10.000+ registros?
   - Índices recomendados no PostgreSQL para as queries mais comuns de relatório

3. STREAMING DE ARQUIVOS GRANDES NO NESTJS:
   - Como usar Node.js Streams para exportar arquivos grandes sem carregar tudo na memória?
   - Como implementar download progessivo (o arquivo começa a baixar enquanto ainda é gerado)?
   - Como dar feedback de progresso para o usuário no frontend durante exportação longa?
   - BullMQ para exportações pesadas: gerar em background e notificar quando pronto?

4. CSV COM ENCODING CORRETO PARA EXCEL BRASIL:
   - Por que CSV gerado no Node.js abre corrompido no Excel BR? (encoding UTF-8 BOM)
   - Como adicionar BOM (Byte Order Mark) corretamente para UTF-8 no Node.js?
   - Delimitadores: vírgula vs. ponto-e-vírgula (Excel BR usa ponto-e-vírgula por padrão)

5. API ENDPOINT DESIGN:
   - Como estruturar os endpoints de exportação no NestJS?
     Ex: GET /reports/students?format=xlsx&state=MA&year=2025&hasCertificate=true
   - Como retornar o arquivo diretamente como download vs. gerar URL temporária?
   - Rate limiting para endpoints de exportação pesada

Inclua exemplos de código NestJS TypeScript e queries Prisma onde aplicável. Foco em 2025-2026.
O sistema usa: NestJS 10, Next.js 14, Prisma, PostgreSQL, Redis, MinIO.
```

---

## 🔴 PESQUISA 5 — Segurança: 2FA, Gestão de Sessão e Backup Automático (REQ-14)

### Contexto
O sistema precisa de configurações de segurança avançadas: logout automático por inatividade, 2FA opcional, complexidade de senhas, modo manutenção, backup automático do PostgreSQL.

### Prompt para Deep Research

```
Preciso de uma pesquisa sobre como implementar um módulo de configurações de segurança
e operações em um sistema NestJS 10 + Next.js 14 + PostgreSQL + Redis + MinIO em
produção (VPS com Docker). O sistema é um ERP governamental B2G para administração pública.

Pesquise e responda sobre:

1. AUTENTICAÇÃO EM 2 FATORES (2FA) NO NESTJS:
   - Implementação de TOTP (Time-based One-Time Password) com Google Authenticator / Authy
     usando a biblioteca @otplib/preset-default ou speakeasy no NestJS
   - Fluxo completo: ativar 2FA (gerar QR Code com speakeasy + qrcode), verificar código
     no login, criar backup codes de emergência
   - Como armazenar o secret TOTP de forma segura no PostgreSQL (criptografado com AES?)
   - 2FA como opcional por usuário vs. obrigatório para admins apenas

2. LOGOUT AUTOMÁTICO POR INATIVIDADE:
   - Como implementar "auto-logout após X minutos de inatividade" com JWT stateless?
     (sliding expiration vs. fixed expiration)
   - Abordagem com Redis: armazenar última atividade, middleware que verifica no Redis?
   - Como resetar o timer de inatividade a cada requisição autenticada?
   - Frontend: como detectar inatividade do usuário (sem mouse, sem teclado, sem scroll)
     e fazer logout preventivo antes da sessão expirar no servidor?

3. POLÍTICAS DE SENHA:
   - Como implementar validação de complexidade de senha configurável no NestJS?
     (mínimo de caracteres, letras maiúsculas, números, especiais — definido no SystemConfig)
   - Como usar bcrypt com custo (cost factor) configurável?
   - Como implementar histórico de senhas (não reutilizar últimas N senhas)?
   - Política de expiração de senha (forçar troca a cada X dias)?

4. MODO MANUTENÇÃO:
   - Como implementar um middleware no NestJS que bloqueia todos os endpoints exceto
     /auth/login e /admin/* quando modo manutenção está ativo no SystemConfig?
   - No Next.js 14: como mostrar página de manutenção para usuários comuns enquanto
     admins continuam acessando normalmente?
   - Como usar Redis para armazenar a flag de manutenção (para que múltiplas instâncias
     do NestJS peguem a mudança imediatamente, sem restart)?

5. BACKUP AUTOMÁTICO POSTGRESQL NO DOCKER:
   - Como fazer backup automático do PostgreSQL rodando em Docker, em produção numa VPS?
   - pg_dump via cron job no host ou contêiner separado dedicado para backups?
   - Como enviar o backup automaticamente para MinIO (bucket privado) usando a MinIO SDK?
   - Retenção: manter backups dos últimos 30 dias, apagar automaticamente os mais antigos
   - Como testar se o backup é restaurável? (restore automático de validação em ambiente isolado)
   - Alertar por e-mail se o backup falhar

6. AUDIT LOG DE ACTIONS CRÍTICAS:
   - Como registrar no log quando: admin ativa/desativa 2FA de outro usuário, muda
     configuração de segurança, ativa modo manutenção, baixa um backup?
   - Modelo de AuditLog unificado vs. tabelas separadas por entidade

Inclua exemplos de código NestJS TypeScript, Docker Compose e configurações específicas
para VPS Linux onde aplicável. O sistema usa NestJS 10, Next.js 14, Prisma, PostgreSQL 15
via Docker, Redis 7, MinIO — tudo em Docker Compose na VPS.
```

---

## 🔴 PESQUISA 6 — Integração CADUNICO para Validação Socioeconômica (TRANSVERSAL)

### Contexto
O Sistema Upgrade cadastra alunos com dados socioeconômicos (programa social Bolsa Família, BPC, Pé de Meia, etc.). A validação cruzada com o CadÚnico pode ser exigida pelo governo para comprovar elegibilidade.

### Prompt para Deep Research

```
Preciso de uma pesquisa sobre como integrar um sistema NestJS com o CadÚnico (Cadastro
Único para Programas Sociais do Governo Federal Brasileiro) para validação socioeconômica
de beneficiários, no contexto de um sistema de gestão de programas de qualificação
profissional (Qualifica Maranhão / Qualifica Piauí) financiado pelo governo estadual.

Pesquise e responda sobre:

1. APIs DISPONÍVEIS DO CADUNICO EM 2025-2026:
   - O governo federal disponibiliza alguma API REST pública ou restrita para consulta
     do CadÚnico por CPF? Qual é o status atual (2025-2026)?
   - API do Dataprev? API do Ministério do Desenvolvimento Social? CNIS?
   - Existe algum endpoint do Gov.br que permite verificar se um CPF está no CadÚnico?
   - Quais são os requisitos legais/burocráticos para um sistema estadual acessar esses dados?
     (Convênio? Termo de Sigilo? LGPD?)

2. SE NÃO HOUVER API DIRETA — ALTERNATIVAS:
   - Como implementar importação em lote de dados CadÚnico via arquivo CSV/XML fornecido
     pela secretaria estadual? (Maranhão e Piauí geralmente têm convênios de dados)
   - Modelagem do banco para armazenar extrato do CadÚnico vinculado ao CPF do aluno
   - Como manter os dados atualizados? (frequência de atualização dos arquivos CadÚnico)

3. LGPD E DADOS SENSÍVEIS:
   - CadÚnico contém dados sensíveis (renda, composição familiar, vulnerabilidade social)
   - Como armazenar de forma compliance com a LGPD no PostgreSQL?
   - Criptografia em repouso para campos sensíveis? Qual técnica no Prisma/PostgreSQL?
   - Por quanto tempo esses dados podem ser retidos?
   - Como implementar o direito de exclusão do titular (LGPD Art. 18)?

4. VALIDAÇÃO PRÁTICA NO SISTEMA:
   - O sistema tem campo "Beneficiário de programa social" com opções: Bolsa Família, BPC,
     Pé de Meia, etc. Como cruzar a declaração do aluno com dados reais do CadÚnico?
   - Processamento síncrono (validar no momento do cadastro) vs. assíncrono em batch?

Foco em Brasil 2025-2026, incluindo situação atual das APIs governamentais.
O sistema usa NestJS 10, MySQL/PostgreSQL, Prisma.
```

---

## 🔴 PESQUISA 7 — Notificações Multi-Canal: In-App + WhatsApp + E-mail (TRANSVERSAL)

### Contexto
O sistema precisa enviar notificações em múltiplos canais: nova inscrição, alerta de frequência baixa, certificado emitido, alerta de manutenção de carreta.

### Prompt para Deep Research

```
Preciso de uma pesquisa arquitetural sobre como implementar um sistema de notificações
multi-canal (In-App / WhatsApp / E-mail) em NestJS 10 + Next.js 14 + Redis + BullMQ,
para um sistema de gestão governamental B2G com múltiplos perfis de usuário (Admin,
Professor/Instrutor, Motorista, Aluno/Cidadão).

Pesquise e responda sobre:

1. NOTIFICAÇÕES IN-APP (real-time no browser):
   - WebSockets (Socket.io) vs. Server-Sent Events (SSE) para notificações push em Next.js:
     qual é mais leve para o servidor? Qual funciona melhor em conexões instáveis (3G rural)?
   - O sistema já usa Socket.io para o Copilot Panel — como reutilizar a mesma instância
     para notificações gerais sem conflito de eventos?
   - Persistência de notificações: tabela `Notification` no PostgreSQL via Prisma ou
     usar Redis para notificações efêmeras?
   - Como marcar notificação como "lida" com UX otimista (marcar no frontend imediatamente,
     confirmar no backend depois)?
   - Badges de contagem não-lidas no ícone do sino

2. WHATSAPP BUSINESS API:
   - Quais são as opções em 2025-2026 para enviar mensagens WhatsApp via API em escala
     no Brasil? (Meta Business API oficial, Evolution API open-source, Twilio for WhatsApp,
     Zenvia, Vonage)
   - A Evolution API (open-source, self-hosted) é viável para uso governamental? Riscos legais?
   - Meta Cloud API: custo, limites de mensagens gratuitas (1000/mês em 2024), processo
     de aprovação de templates de mensagem
   - Para um sistema governamental, qual provedor tem melhor custo-benefício em BR?
   - Como implementar fila de mensagens WhatsApp no BullMQ para não ser bloqueado por
     rate limiting?

3. E-MAIL TRANSACIONAL:
   - Comparação: Resend, SendGrid, Mailgun, Amazon SES, Brevo (ex-Sendinblue) para
     e-mails transacionais no NestJS em 2025-2026. Qual tem melhor entregabilidade
     para domínios .gov.br (ou similares)?
   - Como usar @nestjs/mailer com Handlebars para templates de e-mail responsivos?
   - E-mail de frequência baixa (alerta automático quando presença cai abaixo de 80%):
     como implementar com @nestjs/schedule?
   - SPF, DKIM, DMARC: como configurar no DNS para não cair em spam?

4. ARQUITETURA DE FILAS (BullMQ):
   - Como estruturar filas separadas por canal (email-queue, whatsapp-queue, push-queue)?
   - Prioridade de mensagens: alerta crítico de manutenção de carreta > notificação de
     nova inscrição
   - Dead Letter Queue: o que fazer com notificações que falharam 3x?
   - Como evitar spam: se o aluno está com frequência baixa há 5 dias, enviar só 1 alerta,
     não 5 (deduplicação de notificações)

5. PREFERÊNCIAS DO USUÁRIO:
   - Como implementar configurações de notificação por usuário (admin configura quais
     eventos geram qual tipo de notificação)?
   - No SystemConfig do admin: ligar/desligar canais de notificação globalmente
   - Usuário individual: ligar/desligar tipos específicos (ex: "não quero WhatsApp, só e-mail")

Inclua exemplos de código NestJS TypeScript, configurações de BullMQ e arquitetura de
filas onde aplicável. O sistema usa: NestJS 10, Next.js 14 App Router, Socket.io via
@nestjs/platform-socket-io, BullMQ, Redis, Prisma, PostgreSQL.
```

---

> **Nota para o Tech Lead:** Após cada pesquisa ser concluída, crie um arquivo individual no `/05_reports/` com o nome seguindo a convenção `AAAA-MM-DD_tema_resumido.md`, atualize a tabela de status acima e atualize o `README.md` desta pasta.
