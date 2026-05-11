# 📁 05_reports — Pesquisas Arquiteturais Profundas

> **Documentação canónica do código:** [`../sistema-atual/README.md`](../sistema-atual/README.md) — use-a como fonte de verdade do estado atual; os ficheiros abaixo são **pesquisa** e podem anteceder ou divergir da implementação até serem incorporados.

Este diretório contém relatórios de pesquisa gerados pelo **Deep Research** (Gemini Advanced / Perplexity / ChatGPT Research Mode) sob orquestração do Tech Lead.

---

## Quando Um Relatório é Gerado Aqui?

Um relatório é depositado nesta pasta quando o Tech Lead aciona o Deep Research para investigar:

- **Decisões de biblioteca:** "Qual é a melhor biblioteca para geração de PDF de certificados em Node.js em 2026?"
- **Padrões arquiteturais:** "Como implementar notificações multi-canal com NestJS + BullMQ + Redis?"
- **Integrações externas:** "Como integrar com a API do CADUNICO para validação socioeconômica?"
- **Performance:** "Estratégia de paginação e cache para listagem de 50k+ alunos no Prisma com PostgreSQL"
- **Segurança:** "Análise de vulnerabilidades OWASP Top 10 aplicadas ao stack NestJS + Next.js"

---

## Convenção de Nomenclatura

```
AAAA-MM-DD_TEMA_RESUMIDO.md
```

---

## Relatórios Disponíveis

| Data | Arquivo | Assunto | Requisitos |
|------|---------|---------|------------|
| 2026-03-12 | [`2026-03-12_recalculo_cronograma_feriados.md`](./2026-03-12_recalculo_cronograma_feriados.md) | Recálculo dinâmico de cronogramas com feriados — RCPSP, Range Types, Optimistic Locking, BullMQ, algoritmo O(K) | REQ-08 |
| 2026-03-12 | [`2026-03-12_geracao_relatorios_pdf_governamental.md`](./2026-03-12_geracao_relatorios_pdf_governamental.md) | Geração de PDFs governamentais — Puppeteer Browser Pool, Lista de Frequência, Lista de Concludentes | REQ-11, REQ-12 |
| 2026-03-12 | [`2026-03-12_plano_arquitetural_erp_b2g.md`](./2026-03-12_plano_arquitetural_erp_b2g.md) | Plano arquitetural geral — Precisão financeira NUMERIC, Audit Trails Prisma Extensions, Teoria dos Grafos, BullMQ | REQ-09, transversal |
| 2026-03-12 | [`2026-03-12_portal_reembolso_mobile_upload.md`](./2026-03-12_portal_reembolso_mobile_upload.md) | Portal de reembolso mobile — captura câmera nativa, Presigned URLs MinIO, compressão WebP, retry 3G rural | REQ-10 |
| 2026-03-12 | [`2026-03-12_modelo_financeiro_clt_passagens.md`](./2026-03-12_modelo_financeiro_clt_passagens.md) | Modelo financeiro CLT — salário base + diária R$120 + passagens por distância ≤/> 200km, Decimal preciso | REQ-09 |
| 2026-03-12 | [`2026-03-12_portal_aluno_autenticacao_certificados.md`](./2026-03-12_portal_aluno_autenticacao_certificados.md) | Portal do aluno — OTP SMS → Gov.br OAuth2, Puppeteer Singleton, certificados MinIO, QR Code LGPD | REQ-06 |
| 2026-03-12 | [`2026-03-12_exportacao_multi_formato_filtros.md`](./2026-03-12_exportacao_multi_formato_filtros.md) | Exportação multi-formato — ExcelJS Streaming, cursor-based pagination, CSV UTF-8 BOM, BullMQ async export | REQ-13 |
| 2026-03-12 | [`2026-03-12_seguranca_2fa_sessao_backup.md`](./2026-03-12_seguranca_2fa_sessao_backup.md) | Segurança B2G — TOTP (otplib), JWT+Redis sliding expiration, bcrypt cost 12, modo manutenção, backup sidecar | REQ-14 |
| 2026-03-12 | [`2026-03-12_cadunico_validacao_socioeconomica.md`](./2026-03-12_cadunico_validacao_socioeconomica.md) | Integração CadÚnico — batch CSV CECAD, AES-256-GCM na aplicação, Blind Index HMAC, BullMQ validação assíncrona | Transversal |
| 2026-03-12 | [`2026-03-12_notificacoes_multicanal_bullmq.md`](./2026-03-12_notificacoes_multicanal_bullmq.md) | Notificações multi-canal — Socket.io Namespace, PostgreSQL persistência, WhatsApp Meta API oficial, SES, deduplicação Redis | Transversal |

---

## Pesquisas Pendentes

> 🎉 **TODAS AS 10 PESQUISAS CONCLUÍDAS.** Ver [`PESQUISAS_PENDENTES.md`](./PESQUISAS_PENDENTES.md) para histórico completo.

---

## Como Usar Estes Relatórios

1. **Gravity (Agente de Código):** Antes de implementar uma feature complexa, verifique se há relatório aqui. Se houver, siga as recomendações — já validadas pelo Tech Lead.
2. **Tech Lead:** Após receber análise do Deep Research, salve aqui com a convenção de nomenclatura, atualize a tabela acima e marque como concluída no `PESQUISAS_PENDENTES.md`.
3. **Gemini:** Use estes relatórios como contexto adicional ao fazer troubleshooting ou análise de código.
