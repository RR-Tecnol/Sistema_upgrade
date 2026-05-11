# 🧠 BASE DE CONHECIMENTO ESTRATÉGICO — Sistema Upgrade
## Decisões Arquiteturais com Fonte | v3.0 | 18/03/2026

> Cada decisão tem: contexto, alternativas rejeitadas, justificativa e impacto se reverter.
> NÃO modificar sem pesquisa que justifique e aprovação do Tech Lead.

---

## 🔗 REFERÊNCIAS CRUZADAS

> **Quando ler este documento:**
> Antes de propor qualquer mudança arquitetural significativa (troca de framework, banco, auth, storage, etc.).
> Cada decisão aqui tomou horas de pesquisa — leia antes de reinventar.
>
> **Ler antes deste:**
> - [`sobre-sistema.md §2`](./sobre-sistema.md) — stack atual e versões exatas
> - [`LIVRO_DE_REGRAS.md`](./LIVRO_DE_REGRAS.md) — regras derivadas destas decisões
>
> **Mapeamento decisão → regra:**
> | Decisão | Regra no LIVRO_DE_REGRAS |
> |---------|-------------------------|
> | #2 Prisma Decimal (nunca Float) | §3 — "Valores monetários sempre Decimal" |
> | #3 MinIO Presigned URLs | §4 — "Uploads via MinIO" |
> | #5 Soft Delete | §3 — "Nunca DELETE direto" |
> | #6 JWT duplo | §5 — "Segurança e Auth" |
> | #8 Singleton MinIO | ERROS#BUG-MINIO-01 |
> | #9 req.user.id (nunca sub) | §2 — "Controllers NestJS" |
> | #11 $transaction no enrollment | ERROS#BUG-CONCURRENT-01 |
> | #12 Porta 3001 | `SETUP.md` + `ESTADO_SISTEMA.md` §INFRAESTRUTURA |

---

## 1. Stack: NestJS 10 + Next.js 14 (App Router)

**Contexto:** Sistema B2G para 3 perfis radicalmente diferentes (Admin, Professor, Aluno cidadão).
O aluno está no interior do MA/PI com Android 8 e 3G rural.

**Decisão:** NestJS (API estruturada com RBAC + Prisma) + Next.js 14 com React Server Components.

**Por que funciona:** RSC permite que a página do aluno seja renderizada no servidor — zero JavaScript extra enviado ao celular. O aluno com Android 8 no 3G rural vê conteúdo em <1 segundo.

**Alternativas rejeitadas:**
- **React SPA puro:** 500KB+ de JS → 8-15s para carregar em 3G → abandono garantido
- **React Native/Expo:** Usuários não instalam apps; armazenamento cheio nos celulares
- **Monolito PHP/Django:** Não suporta arquitetura de portais separados com performance adequada

**Impacto se reverter:** Perda de performance critical para alunos no campo.

---

## 2. Prisma Decimal(12,2) — Nunca Float

**Contexto:** Cálculos financeiros: salário CLT + diárias R$120 + passagens. Auditoria do TCE.

**Decisão:** `Decimal` no Prisma / `NUMERIC(12,2)` no PostgreSQL.

**Por que funciona:** Aritmética decimal pura. `120.10 + 0.10 = 120.20` sempre, sem surpresas. Banco Central exige `NUMERIC` para sistemas financeiros.

**Alternativas rejeitadas:**
- **Float:** `120.10 + 0.10 = 120.20000000001` — erro acumulado em relatórios do TCE = auditoria
- **Inteiros (centavos):** Funciona matematicamente mas complexidade desnecessária com NUMERIC disponível

**Impacto se reverter:** Erros de centavo em folha de pagamento → divergência contábil → risco TCE.

---

## 3. MinIO para Todos os Uploads

**Contexto:** PDFs de frequência, certificados, fotos de recibo. Container Docker reinicia a cada deploy.

**Decisão:** MinIO (S3-compatible) com Presigned URLs. Upload direto do browser para o MinIO.

**Por que funciona:** MinIO é persistente e independente do container NestJS. 1000 alunos baixando certificado = zero impacto no servidor (download vai direto para o MinIO).

**Alternativas rejeitadas:**
- **Disco local `/uploads`:** Apagado a cada deploy (reinício do container) = perda permanente de dados
- **Servir arquivos pelo NestJS:** Server saturado com 500 downloads simultâneos → API travada
- **Google Drive/Dropbox:** Sem suporte nativo, sem Presigned URLs, custo elevado

**Impacto se reverter:** Perda de certificados e recibos após qualquer atualização do sistema.

---

## 4. Redis + BullMQ para Operações Pesadas

**Contexto:** PDF de frequência no dia 20, exportações 50k+ alunos, notificações em massa, validação CadÚnico.

**Decisão:** BullMQ com Redis. Jobs em background, retry automático (3x com espera crescente), Dead Letter Queue.

**Por que funciona:** API responde em <100ms sempre. Trabalho pesado isolado. Se falhar: retry automático. Se falhar 3x: DLQ para análise manual.

**Alternativas rejeitadas:**
- **Síncrono no endpoint:** 10 relatórios simultâneos de 50k alunos = OOM → 502 para todos
- **setTimeout nativo:** Sem persistência — reinício do servidor silencia o job permanentemente
- **Crontab externo:** Sem DI, sem retry, sem notificação via Socket.io — explosão de complexidade

**Impacto se reverter:** Sistema trava com relatórios grandes; PDF do dia 20 não é gerado.

---

## 5. Soft Delete (`active: Boolean`)

**Contexto:** Relatórios históricos governamentais. "Quantos alunos do PI em 2025 receberam certificado?"

**Decisão:** Nunca `DELETE FROM`. Apenas `active = false`. Dados ficam para histórico e auditoria.

**Por que funciona:** Aluno desistente em março ainda conta nas estatísticas de março. O relatório anual bate com a realidade. TCE não pode questionar inconsistência.

**Alternativas rejeitadas:**
- **Hard delete:** Aluno desistente some do histórico → número real menor que o registrado → MEC questiona → risco de perda de repasse
- **Tabela de arquivados:** Duplica toda a lógica de queries — complexidade sem benefício

**Impacto se reverter:** Perda de dados históricos para auditorias do TCE/MEC.

---

## 6. JWT Duplo (Access 15min + Refresh 7d)

**Contexto:** Sistema governamental acessado em celular com conexão instável. Aluno não pode perder sessão toda hora.

**Decisão:** Access token curto (15min) para segurança; Refresh token longo (7d) para conforto do usuário.

**Por que funciona:** Se o access token for roubado, expira em 15 minutos. O aluno no campo não precisa fazer login todo dia.

**Alternativas rejeitadas:**
- **Token único longo:** Token roubado = acesso por meses
- **Token único curto:** Aluno no campo perde sessão no meio do cadastro — abandono

**Impacto se reverter:** Ou segurança comprometida ou experiência horrível no mobile.

---

## 7. Cursor-Based Pagination (não offset)

**Contexto:** Exportação de 50k+ alunos em blocos para o gerador de relatório XLSX.

**Decisão:** `cursor: { id: lastId }` no Prisma em vez de `skip/take`.

**Por que funciona:** O PostgreSQL usa índice B-tree para saltar diretamente ao cursor — O(log N) constante. Página 1 e página 1000 levam o mesmo tempo (~10ms).

**Alternativas rejeitadas:**
- **`skip`/`take`:** OFFSET 49500 = PostgreSQL lê 49.500 linhas e descarta → relatório de 5s vira 90s

**Impacto se reverter:** Exportações grandes se tornam impossíveis (timeout de conexão).

---

## 8. Singleton Pattern para MinIO Client (BUG-11)

**Contexto:** `reimbursement.service.ts` instanciava `new Client()` MinIO a cada chamada de upload.

**Decisão:** `MinioService` como singleton via DI do NestJS (`@Injectable()` + `OnModuleInit`).

**Por que funciona:** Uma conexão TCP reutilizada para todas as requisições. 50 professores enviando foto = 1 conexão TCP, não 50.

**Impacto se reverter:** 50 conexões simultâneas → MinIO ECONNREFUSED → uploads falham.

---

## 9. `req.user.id` — Nunca `req.user.sub`

**Contexto:** `JwtStrategy.validate()` retorna objeto com campo `id`. O JWT payload tem `sub`. São campos diferentes.

**Decisão:** Nos controllers NestJS, SEMPRE usar `req.user.id`.

**Por que funciona:** O Guard executa `validate()` e substitui o payload raw pelo objeto retornado. O objeto retornado tem `id`. `sub` existe apenas no token JWT bruto.

**Impacto se reverter:** Aluno não vê suas inscrições/certificados; `issuedBy` em certificados fica null.

---

## 10. Sistema Web Responsivo (não app nativo)

**Contexto:** Público-alvo tem celular Android antigo, armazenamento cheio, hábito baixo de instalar apps.

**Decisão:** PWA-ready Next.js com breakpoints sistemáticos. Mesma URL funciona no desktop e mobile.

**Por que funciona:** Aluno acessa pelo link do SMS/WhatsApp — nenhuma instalação necessária. Professor usa a câmera traseira nativa via `capture="environment"`.

**Impacto se reverter:** Alunos não acessariam o portal. Investimento em React Native sem retorno.

---

## 11. `$prisma.$transaction` no Enrollment

**Contexto:** Race condition TOCTOU: dois requests simultâneos passavam no check de vagas e criavam duas matrículas.

**Decisão:** Toda a criação de enrollment dentro de `this.prisma.$transaction(async (tx) => {...})`.

**Por que funciona:** PostgreSQL usa lock de linha dentro da transação. O segundo request aguarda. Turma nunca fica com vagas excedidas.

**Impacto se reverter:** Em alta demanda (inscrições abertas), turmas ficam superlotadas.

---

## 12. Porta 3001 para o Backend Local (padrão canônico)

**Contexto:** NestJS usa 3000 por padrão, mas o frontend já ocupa 3000. A porta 3001 foi escolhida como próxima disponível e está definida em `backend/.env PORT=3001`.

**Decisão:** **Porta canônica do backend = 3001**, definida em `backend/.env`. Nunca sobrescrever via `$env:PORT=3002` — a confusão veio de sessões onde o backend foi iniciado manualmente com porta diferente, mas o `.env` sempre foi 3001.

**Configuração correta:**
```
backend/.env: PORT=3001
frontend/.env: NEXT_PUBLIC_API_URL=http://localhost:3001/api
               NEXT_PUBLIC_WS_URL=http://localhost:3001
```

**Fonte:** 5 fontes independentes confirmam 3001: `00_INDEX.md` antigo, `05_ARQUITETURA.md`, `MASTER.md`, `REGRAS.md`, `RELATORIO_PRE_FASE2.md`, e `backend/.env PORT=3001`.

---

*Sistema Upgrade | RR TECNOL | 18/03/2026 | Consolidado de: 06_PLANEJAMENTO.md + ANALISE_REUNIAO_GRAVITY2.md + 08_ESTADO_SISTEMA.md + 05_reports/*
