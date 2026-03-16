# 📊 06_PLANEJAMENTO — Backlog de Requisitos e Roadmap de Desenvolvimento

> **O que é este documento?**
> Este é o **documento de planejamento mestre** do projeto Sistema Upgrade. Ele foi construído a partir de duas fontes:
> 1. **A análise inicial** feita pelo consultor (seção original do Gemini)
> 2. **A transcrição literal** da reunião de alinhamento Upgrade × RR Tecnol realizada em **12/03/2026** (42 minutos)
>
> **Para o Gravity (Agente de Código):** Antes de implementar qualquer feature, consulte este documento. Cada item de backlog deve ser rastreado até um requisito desta reunião. Se um requisito parecer conflitar com o `02_LIVRO_DE_REGRAS.md`, consulte o Tech Lead.

---

## 📅 Reunião: Upgrade × RR Tecnol — 12/03/2026

**Participantes:**
- **Robert S. Pimentel** — Stakeholder / Cliente (Upgrade)
- **Ronaldo Ribeiro** — Tech Lead / Arquiteto de Produto (RR Tecnol)

**Duração:** 42 minutos e 59 segundos

**Contexto:** Segunda reunião de alinhamento. O sistema estava sendo desenvolvido com base no fluxo do "Gestão Sobre Rodas" (projeto de saúde), mas precisava ser adaptado para a realidade dos **programas de qualificação profissional Qualifica Maranhão e Qualifica Piauí**. Esta reunião definiu as adaptações necessárias.

---

## 🧠 FUNDAMENTAÇÃO TÉCNICA E DECISÕES ARQUITETURAIS

> **O que é esta seção?**
> Esta seção documenta **por que** cada decisão técnica foi tomada, **com que base** (pesquisas Deep Research), **como valida** os pedidos da reunião, **o que cada implementação faz** e **como o sistema vai funcionar quando estiver pronto**. É a ponte entre a reunião e o código.

---

### 📋 TRANSCRIÇÃO DA REUNIÃO — Upgrade × RR Tecnol (12/03/2026)

A reunião completa guia todas as decisões abaixo. Os pontos-chave foram:

**Sobre a carreta e localização (00:00 – 00:05):**
> *"Para quando a gente for fazer o cadastro, já aparece lá a cidade e a escola que o caminhão vai permanecer... o aluno também vai ter ciência disso."*
→ **Decisão:** Portal do aluno (REQ-06) exibe localização da carreta em tempo real. Dado é do modelo `Acao` + campo `addressDescription`.

**Sobre inscrição digital com reserva de vagas (00:05 – 00:12):**
> *"Enquanto a inscrição não tiver concluída você pega uma vaga de reserva pra quem tem certa urgência... são 4 vagas de reserva por padrão."*
→ **Decisão:** REQ-01 — campo `reserveSlots: Int @default(4)` no model `Class`. O sistema bloqueia as últimas 4 vagas para lista de espera gerenciada manualmente.

**Sobre aprovação por frequência (00:12 – 00:18):**
> *"Frequência de 80%? R: Isso, frequência de 80%. Não tem prova."*
→ **Decisão:** REQ-02 — aprovação automática calculada: `presencas / totalAulas >= 0.80`. Não existe campo de nota no sistema. O certificado só pode ser emitido com essa condição satisfeita.

**Sobre dados socioeconômicos e escola pública (00:18 – 00:22):**
> *"Se a pessoa sempre estudou em escola pública, isso nos diz muito sobre a vulnerabilidade."*
→ **Decisão:** REQ-03 — campo `publicSchoolOnly: Boolean` adicionado ao `StudentSocioeconomic`. REQ-04 — `PE_DE_MEIA` adicionado ao enum `SocialProgram` (validado via CadÚnico batch import).

**Sobre recálculo de calendário com feriados (00:22 – 00:28):**
> *"Às vezes a gente tem que cancelar por causa de feriado ou imprevisto. O sistema precisa recalcular as datas automaticamente."*
→ **Decisão:** REQ-08 — `ClassHoliday` model registra feriados/imprevistos. BullMQ recalcula cronograma com algoritmo O(K) (só percorre dias afetados, não todos os dias do curso).

**Sobre modelo financeiro dos professores CLT (00:28 – 00:32):**
> *"O professor é CLT então a gente paga salário base mais diária de custo... quando a cidade for a menos de 200km ele recebe uma passagem por semana, mais de 200km é quinzenal."*
→ **Decisão:** REQ-09 — campos `monthlySalaryCLT` + `dailyCost` no model `Employee`. Tabela `TravelExpenseConfig` com regras de distância versionadas. **Decimal(12,2) obrigatório — nunca Float para dinheiro** (02_LIVRO_DE_REGRAS.md).

**Sobre relatórios e exportações (00:32 – 00:36):**
> *"Quero todos os alunos da cidade X no ano Y que receberam certificado... No Piauí a gente teve 11 rotas, quais cidades foram beneficiadas?"*
→ **Decisão:** REQ-13 — filtros combinados (estado + ano + cidade + curso + status certificado). ExcelJS Streaming para XLSX (não carrega 50k registros na RAM). Cursor-based pagination no Prisma (O(log N) vs offset O(N)). CSV com UTF-8 BOM + `;` (Excel Brasil).

**Sobre PDF de frequência e certificados (00:36 – 00:42):**
> *"Dia 20 a gente precisa do PDF de frequência, Robert vai mandar o modelo... certificado com logo quando entrar no portal do aluno."*
→ **Decisão:** REQ-11/12 — Puppeteer com Singleton Browser Pool (não abre um browser por PDF — caro em RAM). Certificado gerado na aprovação, salvo no MinIO, link permanente no portal.

---

### 🏗️ DECISÕES ARQUITETURAIS — Justificadas e Fundamentadas

#### 1. Por que NestJS 10 + Next.js 14 (App Router)?

**Validação com a reunião:** O sistema atende 3 perfis de usuário distintos (Admin/Coordenador, Professor/Motorista, Aluno/Cidadão) com UX radicalmente diferente. NestJS fornece API estruturada com RBAC (`@Roles()`), Prisma e filas. Next.js 14 com App Router permite **React Server Components** — a lógica de busca de dados fica no servidor, reduzindo o JavaScript enviado ao celular do aluno do interior (Android 8, 3G rural).

**Fundamentação nas pesquisas:**
- [`2026-03-12_portal_aluno_autenticacao_certificados.md`](./05_reports/2026-03-12_portal_aluno_autenticacao_certificados.md) — Seção "Otimização para Android Legado e 3G Lento": *"No Next.js 14, mover a maior parte da lógica de busca de dados para o servidor. Isso reduz o peso do JavaScript enviado ao celular, agilizando o Time to Interactive."*
- [`2026-03-12_plano_arquitetural_erp_b2g.md`](./05_reports/2026-03-12_plano_arquitetural_erp_b2g.md) — Arquitetura de API separada do frontend via JWT permite escalar cada camada independentemente.

✅ **Por que FUNCIONA:** Com RSC, o aluno com Android 8 no interior do MA não precisa baixar um bundle JavaScript pesado para ver a localização da carreta. O servidor envia HTML pronto. Dispositivos com pouca RAM não engasgam.

❌ **Por que alternativas FALHARIAM:**
- **React SPA puro (CRA/Vite):** Enviaria 500KB+ de JavaScript ao celular. Em 3G, isso leva 8-15 segundos para carregar antes do aluno ver qualquer coisa. Taxa de abandono altíssima.
- **Framework Ruby on Rails / Django monolítico:** Não adequado para o modelo B2G com BullMQ, WebSockets e múltiplos tipos de usuário com lógicas muito diferentes. Não teria a separação de portal admin × portal aluno com performance adequada.
- **Expo / React Native (app mobile):** O aluno precisaria instalar um app. A maioria do público-alvo não tem o hábito de instalar apps e muitos têm armazenamento cheio no celular.

**Como funciona quando pronto:** O portal do aluno em `portal.upgrade.ma.gov.br` carrega a localização da carreta e status do curso direto do servidor (SSR). O aluno não espera JavaScript carregar — vê conteúdo em < 1 segundo mesmo em 3G.

---

#### 2. Por que Decimal(12,2) e nunca Float para valores financeiros?

**Validação com a reunião:** Robert mencionou cálculo de passagens e diárias. Ronaldo confirmou o modelo CLT. A regra da distância (≤ 200km = semanal, > 200km = quinzenal) gera valores fracionados que precisam de soma exata ao longo do mês.

**Fundamentação nas pesquisas:**
- [`2026-03-12_modelo_financeiro_clt_passagens.md`](./05_reports/2026-03-12_modelo_financeiro_clt_passagens.md) — Seção 1 "Fundamentos Matemáticos": *"Float usa representação binária de ponto flutuante (IEEE 754). O valor 0.1 em binário é uma dízima periódica infinita — 0.10000000000000000555111. Em operações repetidas, o erro se acumula."* — e cita que o Banco Central do Brasil exige `NUMERIC` para qualquer sistema financeiro regulado.
- `02_LIVRO_DE_REGRAS.md` — Regra explícita: "Valores monetários SEMPRE como `Decimal` no Prisma, nunca `Float`."

✅ **Por que FUNCIONA:** `NUMERIC(12,2)` no PostgreSQL usa aritmética decimal pura — o mesmo princípio de uma calculadora financeira. `120.10 + 0.10 = 120.20` sempre. Sem surpresas.

❌ **Por que alternativas FALHARIAM:**
- **Float:** `120.10 + 0.10` pode retornar `120.20000000001`. Em um cálculo de 22 dias de diária: `22 × 120.10 = 2642.2000000000003` no Float vs `2642.20` no Decimal. O professor receberia um valor estranho no recibo ou haveria divergência contábil. Em sistemas governamentais isso é motivo de auditoria do TCE.
- **Inteiros (centavos):** Funcionaria matematicamente, mas o Prisma e o PostgreSQL têm suporte nativo ao `NUMERIC` — não há motivo para complexidade adicional de converter manualmente.

**Como funciona quando pronto:** Cálculo da folha mensal do professor: `salário_base + (dias_trabalhados × diária_R$120) + passagens`. Resultado somado com precisão centesimal. Relatório exportado em Excel mostra `1.480,00` nunca `1.479,999999`. Auditoria do TCE não pode questionar arredondamento.

---

#### 3. Por que Soft Delete em tudo (`active: Boolean`)?

**Validação com a reunião:** A reunião explicitamente pediu relatórios históricos como "quantos alunos do PI em 2025 receberam certificado". Se um aluno se matriculou, participou 10 aulas e depois desistiu, ele APARECE nas estatísticas de 2025 (10 presenças registradas), mas NÃO aparece na lista ativa da turma. Isso só é possível com Soft Delete.

**Fundamentação nas pesquisas:**
- [`2026-03-12_exportacao_multi_formato_filtros.md`](./05_reports/2026-03-12_exportacao_multi_formato_filtros.md) — Seção 2 "Filtros Avançados Dinâmicos no Prisma": todos os exemplos de exportação incluem `active: true` como filtro obrigatório e explicam que sem ele registros deletados contaminam relatórios.
- `02_LIVRO_DE_REGRAS.md` — Regra número 1: "Soft Delete obrigatório em todos os modelos. Nunca usar `DELETE FROM` nas queries da aplicação."

✅ **Por que FUNCIONA:** A coluna `active` atua como um switch. `active = false` = invisível para o usuário, mas os dados continuam no banco para histórico, auditoria e relatórios do TCE. É o padrão usado por sistemas governamentais e bancários.

❌ **Por que alternativas FALHARIAM:**
- **Hard Delete (DELETE físico):** O aluno que desistiu em março some do histórico de março. O relatório final do ano fica com número menor que o real. A secretaria apresenta ao MEC números inconsistentes — risco de perda de repasse de verba.
- **Mover para tabela de "arquivados":** Duplica a lógica de todas as queries. Toda busca precisaria consultar 2 tabelas. Complexidade desnecessária com mesma solução que o `active: Boolean`.

**Como funciona quando pronto:** Admin "exclui" aluno → `active = false`. O aluno some da lista operacional. Mas o relatório anual de 2025 ainda conta aquele aluno nas estatísticas — ele aparece no período em que estava ativo. Relatório para o TCE bate com o número real de inscritos.

---

#### 4. Por que MinIO para todos os arquivos (nunca disco local)?

**Validação com a reunião:** PDFs de frequência disparados por e-mail no dia 20 (REQ-11). Certificados acessados pelo aluno a qualquer momento (REQ-06). Fotos de recibo pelo celular (REQ-10). Se guardado em disco local do container Docker → ao reiniciar o servidor ou fazer atualização do sistema: **todos os arquivos são perdidos para sempre.**

**Fundamentação nas pesquisas:**
- [`2026-03-12_portal_reembolso_mobile_upload.md`](./05_reports/2026-03-12_portal_reembolso_mobile_upload.md) — Seção "Presigned URLs e Segurança": *"O upload vai diretamente do celular do professor para o MinIO via Presigned URL — o servidor NestJS não toca no arquivo, não consome banda, não precisa de memória RAM proporcional ao tamanho do arquivo."*
- [`2026-03-12_portal_aluno_autenticacao_certificados.md`](./05_reports/2026-03-12_portal_aluno_autenticacao_certificados.md) — Seção "Estratégia de Armazenamento": *"Para o portal do aluno no interior, a recomendação é a geração única no momento da aprovação, com upload para o MinIO. O processamento de um PDF via Puppeteer pode levar de 2 a 5 segundos — somado à latência 3G, pode levar o navegador mobile a um timeout."*
- `02_LIVRO_DE_REGRAS.md` — "Nunca delete arquivos fisicamente. Nunca salve em disco local."

✅ **Por que FUNCIONA:** MinIO é um armazenamento de objetos persistente e independente do servidor de aplicação. Quando o NestJS reinicia (deploy, crash, atualização), o MinIO continua intacto. Além disso, a Presigned URL permite que o aluno baixe o certificado **diretamente** do MinIO — sem passar pelo servidor. 1000 alunos baixando ao mesmo tempo = zero impacto no servidor.

❌ **Por que alternativas FALHARIAM:**
- **Salvar em disco local do container (`/uploads`):** Na próxima atualização de código (que reinicia o container), todos os certificados e fotos de recibo são apagados. Impossível recuperar. Isso acontece várias vezes por semana durante o desenvolvimento.
- **Servir arquivos pelo NestJS:** Se 500 alunos baixarem certificado ao mesmo tempo no dia da formatura, o servidor fica saturado servindo arquivos. A API trava e nenhum admin consegue usar o painel. Com MinIO, os downloads vão direto da storage — a API fica livre.
- **Google Drive / Dropbox:** Custo elevado para uso programático, sem controle de permissão granular, sem Presigned URLs, sem suporte nativo ao ecossistema NestJS.

**Como funciona quando pronto:**
```
Certificado gerado → upload MinIO (bucket: certificados, privado)
Aluno pede download → NestJS gera Presigned URL (15min de validade)
Aluno clica → browser baixa direto do MinIO (sem passar pelo NestJS)
NestJS não consome banda no download → suporta 1000 downloads simultâneos
```

---

#### 5. Por que BullMQ + Redis para operações pesadas?

**Validação com a reunião:** Robert pediu: PDF de frequência no dia 20 (automático), exportações de relatórios com 50k+ alunos, notificações para múltiplos usuários, validação de CadÚnico para cada inscrição. Todas são operações que levam segundos ou minutos — se feitas de forma síncrona no servidor, travam o sistema inteiro.

**Fundamentação nas pesquisas:**
- [`2026-03-12_exportacao_multi_formato_filtros.md`](./05_reports/2026-03-12_exportacao_multi_formato_filtros.md) — Seção "Arquitetura de Streaming e Processamento em Background": *"O processamento de arquivos grandes em uma requisição HTTP síncrona é uma prática que compromete a escalabilidade do NestJS. Se 10 usuários solicitarem simultaneamente a exportação de 50.000 registros, o servidor poderá sofrer picos de CPU e memória, além de expirar conexões de rede."*
- [`2026-03-12_notificacoes_multicanal_bullmq.md`](./05_reports/2026-03-12_notificacoes_multicanal_bullmq.md) — Seção "WhatsApp Rate Limiting": *"A Meta bloqueia contas que disparam requisições em massa sem controle de taxa. O BullMQ atua como comporta — libera no máximo 40 mensagens por segundo, protegendo a conta oficial de WhatsApp."*
- [`2026-03-12_cadunico_validacao_socioeconomica.md`](./05_reports/2026-03-12_cadunico_validacao_socioeconomica.md) — Seção 4.2 "Por que Rejeitar o Processamento Síncrono?": *"Durante o anúncio público de programas com amplo apelo popular, o servidor acolheria milhares de chamadas simultâneas. Essas transações ocupariam simultaneamente o pool de conexões do Prisma, precipitando falhas catastróficas."*

✅ **Por que FUNCIONA:** BullMQ põe o trabalho em fila no Redis (memória) e um Worker separado processa em background. O servidor API responde em < 100ms para qualquer requisição. O trabalho pesado fica isolado. Se o Worker falhar: ele tenta de novo automaticamente (3 tentativas com espera crescente). Se falhar 3 vezes: vai para Dead Letter Queue para análise manual.

❌ **Por que alternativas FALHARIAM:**
- **Processar diretamente no endpoint (síncrono):** 10 gestores pedindo relatório de 50k alunos ao mesmo tempo = 10 processos simultâneos consumindo RAM. Com 4GB de RAM disponível e cada relatório usando ~2GB: `Out of Memory Killed` — servidor derruba tudo. Zero logs, zero aviso, todos os usuários veem 502 Bad Gateway.
- **setTimeout / setInterval nativo do Node.js:** Sem persistência. Se o servidor reiniciar durante o processamento (deploy de atualização), o trabalho some silenciosamente. Nenhum alerta, nenhuma retentativa. O PDF de frequência do dia 20 simplesmente não é gerado.
- **Cron job externo (Crontab no servidor):** Não integra com o sistema NestJS. Não tem retry, não tem DLQ, não notifica via Socket.io quando termina. Cada job novo precisaria de mais um item no crontab — explosão de complexidade.

**Como funciona quando pronto:**
```
Admin solicita exportação 50k alunos
→ NestJS retorna imediatamente { jobId: "abc123" } (< 100ms)
→ Worker processa em background (2-5 minutos)
→ Socket.io notifica admin: "Relatório pronto!"
→ Admin clica → Presigned URL MinIO (30min de validade)
→ Download direto MinIO → servidor não congestiona
```

---

#### 6. Por que cursor-based pagination e não offset?

**Validação com a reunião:** REQ-13 exige exportar todos os alunos de um estado em um ano — potencialmente 50k+ registros. A exportação precisa iterar por esses dados em blocos sem travar a memória do servidor.

**Fundamentação nas pesquisas:**
- [`2026-03-12_exportacao_multi_formato_filtros.md`](./05_reports/2026-03-12_exportacao_multi_formato_filtros.md) — Seção "Paginação por Cursor vs. Offset": *"A paginação tradicional por offset é uma armadilha de performance para grandes exportações. À medida que o offset aumenta, o banco de dados deve ler e descartar milhares de linhas antes de retornar o resultado. Ex: página 1 em 10ms vs. página 1000 em 5 segundos."*

✅ **Por que FUNCIONA:** Cursor-based usa o ID do último registro como ponto de partida da próxima query. O PostgreSQL usa o índice B-tree (já existente) para saltar diretamente para aquele ponto — O(log N) constante. Não importa se é a 1ª ou a 100ª página: sempre ~10ms.

❌ **Por que alternativas FALHARIAM:**
- **`skip`/`take` (offset) do Prisma:** Para buscar a página 100 de 500 alunos cada (50.000 total), o PostgreSQL executa `OFFSET 49500` — lê internamente 49.500 linhas e as descarta antes de retornar 500. Isso **acontece a cada iteração** do loop de exportação. Resultado: o relatório que deveria levar 5 segundos leva 90 segundos. Para o admin parece que o sistema travou.
- **Buscar tudo de uma vez:** `findMany({ take: 50000 })` — 50k objetos Prisma completos na RAM do processo Node.js = possível OOM. Mesmo que não dê OOM, não consegue fazer streaming para o ExcelJS enquanto ainda busca.

**Como funciona quando pronto:** O gerador de relatório faz 100 buscas de 500 alunos cada (para 50k), cada busca leva ~10ms — tempo total ~1 segundo só de banco. O ExcelJS vai escrevendo linhas em streaming enquanto as buscas acontecem — relatório gerado linha por linha, sem esperar tudo carregar.

---

### 📱 COMO O SISTEMA FUNCIONA QUANDO ESTIVER PRONTO

#### Portal do Aluno (REQ-06) — Jornada Completa do Cidadão

```
[1] Aluno recebe SMS: "Acesse portal.upgrade.ma.gov.br para ver sua carreta"
    ↓
[2] Acessa em celular Android 8, 3G rural
    ↓
[3] Tela de login: CPF + código OTP enviado por SMS (sem senha)
    - Não tem e-mail? Não tem problema. CPF + SMS = acesso garantido.
    - JWT com 7 dias de expiração (usuário raro, não pode perder sessão todo dia)
    ↓
[4] Dashboard do aluno:
    - "Sua carreta está em: Caxias-MA, Escola Estadual João XXIII"
    - "Seu curso: Operador de Computador — 14/04 a 14/05/2025"
    - "Sua frequência: 87% (você pode faltar mais 3 aulas)"
    ↓
[5] Curso concluído (frequência ≥ 80%):
    - Botão "Baixar meu Certificado" aparece automaticamente
    - PDF já está pronto no MinIO (gerado no momento da aprovação)
    - Clique → download em < 2 segundos mesmo no 3G
    - QR Code no certificado → scanner confirma autenticidade na página pública
```

#### Portal do Professor (REQ-09/10) — Jornada do Instrutor CLT

```
[1] Professor recebe agenda da turma em Teresina-PI (< 200km da base)
    ↓
[2] Sistema calcula automaticamente:
    - Salário mensal: R$ 3.500,00 (configurado no cadastro)
    - Diária de custo: R$ 120,00 × 22 dias trabalhados = R$ 2.640,00
    - Passagem: semanal (cidade < 200km) → 4 passagens no mês
    ↓
[3] Professor tem um gasto não previsto (combustível extra):
    - Acessa portal → "Solicitar Reembolso"
    - Tira foto do recibo com câmera (`capture="environment"` → câmera traseira direta)
    - Compressão automática no celular (de 8MB → ~400KB) antes de enviar
    - Upload com barra de progresso (Axios + Presigned URL MinIO)
    - Se 3G cair → retry automático com exponential backoff
    ↓
[4] Admin recebe notificação in-app e WhatsApp:
    "Professor João solicitou reembolso de R$ 85,00. Aprovar?"
    ↓
[5] Admin aprova → professor recebe confirmação via WhatsApp
```

#### Emissão de Relatórios (REQ-11/12/13) — Jornada do Coordenador

```
[1] Dia 20 do mês — sistema dispara automaticamente (BullMQ cron job):
    - Gera PDF de frequência da turma
    - Usa template HTML + Puppeteer (navegador headless, instância singleton)
    - Com logo da empresa (configurada no SystemConfig)
    - Upload MinIO → e-mail disparado via Amazon SES para Robert
    ↓
[2] Coordenador acessa painel de relatórios:
    - Filtros: Estado=MA, Ano=2025, Cidade=Caxias, Curso=Informática
    - Clica "Exportar Excel"
    ↓
[3] Para exportações < 5k alunos: download imediato (streaming XLSX)
    Para exportações > 5k alunos: background job + notificação quando pronto
    ↓
[4] Excel abre no Brasil sem caracteres estranhos:
    - ç, ã, é exibidos corretamente (UTF-8 BOM)
    - Colunas separadas corretamente (ponto-e-vírgula, não vírgula)
    - Linhas verdes = certificado emitido, linhas vermelhas = reprovado
    ↓
[5] Terceira semana do mês:
    - Sistema verifica quais alunos atingiram 80% de frequência
    - Gera automaticamente a "Lista de Concludentes" em PDF
    - Certificados são gerados em batch via BullMQ (máx 10 simultâneos)
    - Alunos recebem notificação: "Seu certificado está disponível no portal"
```

#### Segurança do Sistema Governamental (REQ-14)

```
[1] Admin tenta acessar o painel:
    - Login com email + senha (bcrypt cost factor 12)
    - Sistema exige 2FA (obrigatório para ADMIN/COORDINATOR)
    - Abre Google Authenticator → código de 6 dígitos → acesso concedido
    ↓
[2] Admin trabalha no painel:
    - A cada ação, o timer de inatividade é resetado (30 minutos)
    - A 28 minutos → aviso: "Sua sessão expira em 2 minutos"
    - Se não interagir → deslogado automaticamente
    ↓
[3] Atualização do sistema (manutenção programada):
    - Admin ativa Modo Manutenção (flag Redis instantânea)
    - Portal do aluno exibe: "Sistema em manutenção. Retorno em 15min."
    - Admins continuam acessando normalmente (/admin/* não bloqueado)
    ↓
[4] Backup automático:
    - 3h da manhã: container sidecar roda pg_dump
    - Dados streamados direto para MinIO (zero disco local)
    - Retenção de 30 dias → limpeza automática de backups antigos
    - Se backup falhar → e-mail de alerta para Ronaldo
```

---

### 🔗 RASTREABILIDADE: TRANSCRIÇÃO → PESQUISA → IMPLEMENTAÇÃO

| Trecho da Reunião | Requisito | Pesquisa Deep Research | Arquivo de Implementação |
|---|---|---|---|
| "Carreta na cidade X, aluno tem ciência" | REQ-06 | `portal_aluno_autenticacao_certificados.md` | `portal-aluno/` |
| "4 vagas de reserva por padrão" | REQ-01 | `plano_arquitetural_erp_b2g.md` | `class.service.ts` |
| "Frequência de 80%, não tem prova" | REQ-02 | `plano_arquitetural_erp_b2g.md` | `attendance.service.ts` |
| "Escola pública nos diz sobre vulnerabilidade" | REQ-03 | `cadunico_validacao_socioeconomica.md` | `student-socioeconomic.model` |
| "Pé de Meia no sistema" | REQ-04 | `cadunico_validacao_socioeconomica.md` | `schema.prisma enum SocialProgram` |
| "Feriado → recalcular automaticamente" | REQ-08 | `recalculo_cronograma_feriados.md` | `schedule.service.ts` |
| "Professor CLT: salário + diária + passagem" | REQ-09 | `modelo_financeiro_clt_passagens.md` | `payroll.service.ts` |
| "Foto do recibo no celular" | REQ-10 | `portal_reembolso_mobile_upload.md` | `reimbursement.service.ts` |
| "Dia 20: PDF de frequência com logo" | REQ-11 | `geracao_relatorios_pdf_governamental.md` | `pdf.service.ts` |
| "3ª semana: lista de concludentes" | REQ-12 | `geracao_relatorios_pdf_governamental.md` | `certificate.service.ts` |
| "Alunos da cidade X, ano Y, certificado" | REQ-13 | `exportacao_multi_formato_filtros.md` | `reports.service.ts` |
| "Logout automático, 2FA, backup" | REQ-14 | `seguranca_2fa_sessao_backup.md` | `auth.service.ts` |
| "Bolsa Família, BPC, Pé de Meia" | Transversal | `cadunico_validacao_socioeconomica.md` | `cadunico-import.service.ts` |
| "Alertas de frequência baixa, nova inscrição" | Transversal | `notificacoes_multicanal_bullmq.md` | `notifications.gateway.ts` |

---

## 🗂️ BACKLOG DE REQUISITOS (Extraídos da Reunião)

> **Legenda de Status:**
> - 🟢 **EXISTE** — Já implementado no sistema atual
> - 🟡 **PARCIAL** — Existe no banco/código mas falta lógica de negócio ou tela
> - 🔴 **PENDENTE** — Não existe, precisa ser criado do zero

---

### MÓDULO 1 — Turmas (Fluxo de Criação)

#### REQ-01: Fluxo de Criação de Turma em Etapas
**Origem:** Trecho 00:00:00 — 00:01:26
**Prioridade:** 🔥 Alta
**Status:** 🟡 Parcial (campos existem, fluxo em etapas pode não estar implementado)

**Requisito:** A criação de uma turma deve seguir este fluxo em ordem:
1. Selecionar o **Curso**
2. Selecionar a **Cidade** onde será ministrado
3. Selecionar o **Professor/Instrutor** que vai ministrar
4. Definir as **datas:** início do curso, fim do curso, abertura de inscrições, fechamento de inscrições
5. Definir **lotação máxima** de alunos (varia: 8 ou 16 por turma)
6. Definir **cadastro reserva** (padrão: 4 vagas reserva)
7. Definir **horário de início e fim** da turma
8. Definir **dias de aula** (padrão: segunda a sexta)

**Regra de Negócio Adicional:**
- No **Maranhão**, cada curso é subdividido em **3 turmas** com turnos: `Manhã`, `Tarde` e `Tarde/Noite`
- No **Multicurso** (carreta especial): **5 cursos simultâneos** em **4 horários** ao mesmo tempo

**Schema já suporta:** `Class` tem `startDate`, `endDate`, `vacancies`, `period` (MORNING/AFTERNOON/EVENING), `ClassSchedule` para dias da semana. **Falta:** campo `reserveSlots` (vagas de reserva) no modelo `Class`.

---

#### REQ-02: Aprovação Sem Prova — Critério de Frequência
**Origem:** Trecho 00:02:38
**Prioridade:** 🔥 Alta
**Status:** 🟡 Parcial (frequência registrada, critério de aprovação não automatizado)

**Requisito:** O sistema **não terá avaliações nem provas**. O único critério de aprovação/conclusão é bater a **carga horária mínima de 80%** de presença.

**Relatórios de Conclusão Necessários:**
- Quantos alunos iniciaram o curso
- Quantos finalizaram (alcançaram 80% de presença)
- Quantos serão certificados
- Quantos desistiram

**Regra de Cálculo:** `(aulas_presentes / total_aulas) >= 0.80` → APROVADO → elegível para certificado

---

### MÓDULO 2 — Perfil do Aluno (Ajustes)

#### REQ-03: Novo Campo Obrigatório — "Escola Pública"
**Origem:** Trecho 00:04:08 — 00:05:48
**Prioridade:** 🔥 Alta (exigência do governo)
**Status:** 🔴 Pendente

**Requisito:** Adicionar ao cadastro do aluno a pergunta:
> **"Você sempre estudou em escola pública?"** — Resposta: Sim / Não (botão toggle)

**Onde adicionar:** No formulário de cadastro do aluno (etapa de escolaridade/perfil socioeconômico) e no modelo `StudentSocioeconomic` do Prisma.

**Campo a adicionar no schema:** `publicSchoolOnly Boolean? @default(false)` em `StudentSocioeconomic`

---

#### REQ-04: Novo Programa Social — "Pé de Meia"
**Origem:** Trecho 00:05:48 — 00:06:10
**Prioridade:** 🟠 Média
**Status:** 🔴 Pendente

**Requisito:** Adicionar a opção **"Pé de Meia"** ao enum `SocialProgram` do banco de dados.

**Enum atual:** `NONE | BOLSA_FAMILIA | BPC | AUXILIO_BRASIL | OTHER`
**Enum novo:** `NONE | BOLSA_FAMILIA | BPC | AUXILIO_BRASIL | PE_DE_MEIA | OTHER`

---

#### REQ-05: Campo "Motivação" — De Obrigatório para Opcional
**Origem:** Trecho 00:06:57 — 00:07:15
**Prioridade:** 🟡 Média
**Status:** 🔴 Pendente (campo `motivation` em `StudentProfessional` é String, precisa virar `String?`)

**Requisito:** O campo **"Motivação"** (por que quer fazer o curso) deve deixar de ser obrigatório no formulário. O aluno não é obrigado a preencher.

**Mudança no Frontend:** Remover marcação de `*` (required) do campo
**Mudança no Schema Prisma:** `motivation String` → `motivation String?` em `StudentProfessional`
**Mudança no DTO Backend:** Remover `@IsNotEmpty()` do campo `motivation`

---

#### REQ-06: Portal do Aluno — Acesso a Informações da Turma
**Origem:** Trecho 00:08:43 e 00:39:57
**Prioridade:** 🔥 Alta
**Status:** 🟡 Parcial (portal do aluno existe, verificar se mostra localização da carreta)

**Requisito:** O cidadão deve ter um portal onde pode:
1. Ver **em qual cidade e local** (como escola) o caminhão vai permanecer
2. Ver as **datas** da turma/curso
3. **Emitir o próprio certificado** (a tela de certificado deve ser acessível tanto pelo admin quanto pelo cidadão)
4. **Atualizar status de inscrição:** Se o cidadão se inscrever pelo portal, aparece como "em espera de aprovação" → o admin aprova ou recusa

---

### MÓDULO 3 — Nomenclatura (Mudança Oficial)

#### REQ-07: Renomear "Ação" → "Período de Curso" / "Rota"
**Origem:** Trecho 00:16:18 — 00:17:27
**Prioridade:** 🔥 Alta
**Status:** 🔴 Pendente

**Decisão da Reunião:**
> *"Robert S. Pimentel: essa ação é que nós chamamos aqui de período de curso... Ronaldo Ribeiro: A gente já troca o nome para período de cursos."*

**Regra:** O termo `Ação` no banco e código **permanece como está** (não renomear tabelas). Apenas a **interface do usuário (UI)** deve exibir o nome **"Período de Curso"** ou **"Rota"** onde antes aparecia "Ação".

**Impacto:** Todos os labels, títulos, botões e breadcrumbs do frontend que mostram "Ação/Ações" devem ser substituídos por "Período de Curso / Períodos de Curso" ou "Rota / Rotas".

---

### MÓDULO 4 — Calendário Dinâmico e Feriados

#### REQ-08: Cursos Medidos em Dias Úteis com Recalculo Automático
**Origem:** Trecho 00:29:30 — 00:31:13
**Prioridade:** 🔥 Alta — Ponto Crítico identificado pelo stakeholder
**Status:** 🔴 Pendente

**Requisito completo:**
1. A duração de um curso é medida em **dias úteis** (ex: 15 dias úteis), não em dias corridos
2. O sistema deve calcular automaticamente a **data de término** contando apenas dias úteis a partir da data de início
3. Se durante o curso ocorrer um **feriado municipal** (não catalogado no calendário nacional) ou **evento imprevisto**, o professor deve poder **registrar o dia como não-aula**
4. Ao registrar um dia não-aula: o sistema deve **empurrar automaticamente** a data de término e todos os dias subsequentes do cronograma para a frente por 1 dia útil

**Exemplo citado na reunião:**
> *"Era para terminar dia 12, vai terminar dia 13 agora, porque os dias tudinho pra frente vai ter uma alteração."*

**Implementação necessária:**
- `HolidayService` no backend com lista de feriados nacionais fixos
- Endpoint para o professor registrar um dia de feriado/imprevisto na turma
- Lógica de recálculo de datas ao registrar um dia não-aula
- Feriados municipais configuráveis pelo admin via `SystemConfig`

---

### MÓDULO 5 — Modelo Financeiro e Funcionários (GRANDE MUDANÇA)

#### REQ-09: Instrutores são CLT — Mudança de Modelo de Custo
**Origem:** Trecho 00:18:59 — 00:20:04
**Prioridade:** 🔥 Alta — Mudança estrutural
**Status:** 🔴 Pendente

**O que muda:**
- Sistema antigo (Gestão Sobre Rodas): funcionários recebiam por **diária de trabalho**
- Sistema Upgrade: instrutores são **assalariados CLT** com salário fixo mensal

**Estrutura de custo de um instrutor por Período de Curso:**
| Componente | Valor | Tipo |
|------------|-------|------|
| Salário base (CLT mensal) | Fixo | Mensal |
| Diária de custo (alimentação/hospedagem) | R$ 120/dia | Por dia trabalhado fora |
| Passagem de volta | Variável por distância | Por percurso |

**Regra de Passagem:**
- **Cidade perto:** Professor vai e volta **todo final de semana** → passagem semanal (ida+volta)
- **Cidade longe:** Professor fica no local e volta **a cada 15 dias** → passagem quinzenal

> *"A diária é R$ 120 para permanecer na cidade. Mais a passagem para vir e voltar... tem professor que vai e volta todo final de semana, tem professor que só vem de 15 em 15 dias."*

**Mudança no sistema:**
- O campo `dailyCost` em `Employee` representa a **diária de custo** (alimentação/hospedagem = R$120), NÃO o salário
- Adicionar campos para salário CLT e cálculo de passagens no modelo `Employee` ou criar tabela separada
- O cálculo de custo de uma Rota precisa incluir: diárias × dias + passagens (configuráveis por distância)

---

#### REQ-10: Portal de Reembolso — Registro de Despesas via Mobile
**Origem:** Trecho 00:20:04 — 00:22:00
**Prioridade:** 🟠 Média
**Status:** 🔴 Pendente

**Requisito:** Professor e motorista devem ter uma área no painel (mobile-friendly) onde podem:
1. Registrar um gasto imprevisto (material de limpeza, material de aula, reparo emergencial)
2. Descrever o gasto
3. **Tirar foto do recibo/nota fiscal pelo celular** e fazer o upload diretamente
4. O administrador recebe essa solicitação de reembolso e pode aprovar/rejeitar

**Casos de uso citados:**
- Professor comprou material de aula
- Professor comprou material de limpeza
- Motorista teve gasto com reparo emergencial (que não entra como manutenção formal)

**Diferença de manutenção:** Reparos que já passam pelo módulo de `TruckMaintenance` são geridos pelo admin. Este módulo é para **despesas imprevistas do professor/motorista** no campo.

**Armazenamento:** Upload de fotos via MinIO (bucket específico para comprovantes de reembolso)

---

### MÓDULO 6 — Relatórios Governamentais

#### REQ-11: Lista de Frequência — PDF com Modelo Governamental
**Origem:** Trecho 00:25:29 — 00:27:40
**Prioridade:** 🔥 Alta
**Status:** 🟡 Parcial (dados de frequência existem, PDF não implementado)

**Requisito:**
- Gerar a **lista de frequência** em PDF no **modelo governamental** (Robert vai enviar o modelo)
- PDF deve ter **a logo da empresa**
- Frequências enviadas **todo dia 20 do mês** para a secretaria (comprovação de atividade para pagamento das rotas)
- Deve ter **botão para enviar diretamente por e-mail** (disparo automático)
- O professor deve conseguir gerar esse PDF pela interface dele

---

#### REQ-12: Lista de Concludentes — PDF Antecipado na 3ª Semana
**Origem:** Trecho 00:40:59 — 00:42:00
**Prioridade:** 🔥 Alta
**Status:** 🔴 Pendente

**Requisito:**
- Para cursos de 4 semanas: ao final da **3ª semana**, o professor/admin deve poder emitir a **Lista de Concludentes**
- O PDF deve separar claramente:
  - **Aprovados** — alunos com frequência ≥ 80% das aulas já realizadas
  - **Desistentes/Reprovados** — alunos com frequência < 80%
- Mesmo formato de PDF com logo da empresa
- A secretaria exige este documento **antes do final do curso** para planejamento

---

#### REQ-13: Relatórios com Filtros Avançados e Exportação
**Origem:** Trecho 00:32:30 — 00:36:00
**Prioridade:** 🟠 Média
**Status:** 🟡 Parcial (dashboard existe, filtros avançados para PDF não)

**Requisitos de Filtros:**
- Por **estado** (Maranhão / Piauí)
- Por **ano** (ex: 2025, 2026)
- Por **cidade** (ex: "todos os alunos da cidade X")
- Por **curso** (ex: "alunos do curso de Inteligência Artificial")
- Por **status de certificado** (quem recebeu / quem não recebeu)
- Por **rota** (período de curso específico)

**Exemplos de relatórios citados:**
> *"Quero todos os alunos da cidade X no ano Y que receberam certificado"*
> *"No Piauí, no ano 2025, a gente teve 11 rotas — quais cidades foram beneficiadas?"*
> *"Quantos alunos receberam certificado em cada rota?"*

**Formatos de exportação disponíveis:** Excel, CSV, PDF (com logo), JSON (para integrações)

**Exportações rápidas (pré-configuradas):**
- Lista de alunos
- Relatório de frequência
- Certificados emitidos
- Cursos e turmas
- Inscrições
- Frota de carretas

---

### MÓDULO 7 — Configurações do Sistema

#### REQ-14: Configurações de Segurança e Sessão
**Origem:** Trecho 00:36:00 — 00:38:47
**Prioridade:** 🟡 Média
**Status:** 🟡 Parcial (`SystemConfig` existe no banco, UI de config verificar)

**Funcionalidades de Configuração:**
- **Tempo de inatividade:** Logout automático configurável (ex: 30 minutos)
- **Autenticação em 2 fatores (2FA):** Para ativar/desativar
- **Complexidade de senhas:** Mínimo de caracteres configurável
- **Modo de manutenção:** Bloqueia acesso de alunos, só admin acessa
- **Backup automático** com intervalo configurável
- **Módulo de debug:** Informações sobre frameworks para manutenção emergencial por terceiros

**Configurações de Notificações:**
- Notificações por e-mail: nova inscrição, alerta de frequência, certificado emitido
- Alerta quando frequência do aluno cai abaixo do mínimo
- Alerta de manutenção de carreta
- Alertas de erros críticos e backups

---

## 📋 RESUMO DO BACKLOG — PRIORIZADO

| ID | Módulo | Requisito | Prioridade | Status |
|----|--------|-----------|------------|--------|
| REQ-01 | Turmas | Fluxo criação + reserveSlots | 🔥 Alta | ✅ IMPLEMENTADO |
| REQ-02 | Turmas | Aprovação = 75% frequência | 🔥 Alta | ✅ IMPLEMENTADO |
| REQ-03 | Aluno | Campo escola pública | 🔥 Alta | ✅ IMPLEMENTADO |
| REQ-04 | Aluno | Pé de Meia no enum | 🟠 Média | ✅ IMPLEMENTADO |
| REQ-05 | Aluno | Motivação → opcional | 🟠 Média | ✅ IMPLEMENTADO |
| REQ-06 | Portal Aluno | Ver carreta + certificado | 🔥 Alta | ✅ IMPLEMENTADO |
| REQ-07 | UI | Renomear Ação → Período de Curso | 🔥 Alta | ✅ IMPLEMENTADO |
| REQ-08 | Calendário | Feriado dinâmico + recálculo | 🔥 Alta | ✅ IMPLEMENTADO |
| REQ-09 | Financeiro | Modelo CLT — diária + passagens | 🔥 Alta | ✅ IMPLEMENTADO |
| REQ-10 | Financeiro | Portal reembolso mobile + foto | 🟠 Média | ✅ IMPLEMENTADO |
| REQ-11 | Relatórios | Lista frequência PDF dia 20 | 🔥 Alta | ✅ IMPLEMENTADO |
| REQ-12 | Relatórios | Lista concludentes PDF 3ª semana | 🔥 Alta | ✅ IMPLEMENTADO |
| REQ-13 | Relatórios | Filtros avançados + exportação | 🟠 Média | ✅ IMPLEMENTADO |
| REQ-14 | Config | Segurança, sessão, 2FA, backup | 🟡 Média | ✅ IMPLEMENTADO |

---

## 🛠️ IMPACTOS NO BANCO DE DADOS (Schema Prisma)

Estas são as alterações necessárias no `prisma/schema.prisma` para suportar os novos requisitos:

```prisma
// REQ-03: Campo escola pública no perfil socioeconômico
model StudentSocioeconomic {
  // ... campos existentes ...
  publicSchoolOnly  Boolean? @default(false)  // NOVO
}

// REQ-04: Novo valor no enum SocialProgram
enum SocialProgram {
  NONE
  BOLSA_FAMILIA
  BPC
  AUXILIO_BRASIL
  PE_DE_MEIA         // NOVO
  OTHER
}

// REQ-05: Motivação opcional
model StudentProfessional {
  // ... campos existentes ...
  motivation  String?   // MUDANÇA: era String (obrigatório)
}

// REQ-01: Vagas de reserva na turma
model Class {
  // ... campos existentes ...
  reserveSlots  Int @default(4)  // NOVO
}

// REQ-09: Modelo financeiro CLT
model Employee {
  // ... campos existentes ...
  monthlySalaryCLT  Decimal? @db.Decimal(10, 2)  // NOVO: salário mensal CLT
  // dailyCost existente = diária de custo (alimentação/hospedagem)
}

// REQ-08: Registro de feriados/imprevistos por turma
model ClassHoliday {  // NOVO MODELO
  id          String   @id @default(uuid())
  classId     String
  date        DateTime
  reason      String
  registeredBy String
  createdAt   DateTime @default(now())

  class       Class @relation(fields: [classId], references: [id], onDelete: Cascade)
  registrar   User  @relation(fields: [registeredBy], references: [id])

  @@index([classId])
  @@map("class_holidays")
}

// REQ-10: Solicitações de reembolso
model ReimbursementRequest {  // NOVO MODELO
  id            String   @id @default(uuid())
  requestedBy   String   // userId do professor/motorista
  acaoId        String?  // vinculo com período de curso
  description   String
  amount        Decimal  @db.Decimal(10, 2)
  receiptUrl    String   // foto da nota fiscal/recibo (MinIO)
  status        String   @default("PENDING") // PENDING | APPROVED | REJECTED
  reviewedBy    String?
  reviewedAt    DateTime?
  reviewNotes   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  requester User  @relation("ReimbursementRequester", fields: [requestedBy], references: [id])
  reviewer  User? @relation("ReimbursementReviewer", fields: [reviewedBy], references: [id])

  @@index([requestedBy])
  @@index([status])
  @@map("reimbursement_requests")
}
```

---

## 📝 ANOTAÇÕES DA REUNIÃO — Itens para Acompanhar

- [ ] **Robert enviará o modelo de frequência** pelo WhatsApp para usar como base do PDF
- [ ] **Robert enviará a planilha de cálculo de despesas** dos instrutores (já mencionou que enviou no zap durante a reunião)
- [ ] **Próxima reunião:** Ronaldo marcará para a semana seguinte para apresentar tudo implementado
- [ ] **Próxima reunião mostrará:** Acesso do motorista, acesso do professor e acesso do aluno
- [ ] **Logo da empresa:** Ronaldo confirmou que recebeu a logo no WhatsApp e vai aplicar nos PDFs

---

## 🔗 Documentos Correlacionados

- [`02_LIVRO_DE_REGRAS.md`](./02_LIVRO_DE_REGRAS.md) — Regras de código e nomenclatura (já atualizado com req. desta reunião)
- [`03_DIARIO_DE_BORDO.md`](./03_DIARIO_DE_BORDO.md) — Log de decisões (atualizar a cada implementação)
- [`DOCUMENTACAO_COMPLETA.md`](./DOCUMENTACAO_COMPLETA.md) — Arquitetura atual do sistema (base técnica)
- [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma) — Schema do banco a ser alterado

---

## ✅ IMPLEMENTAÇÕES REALIZADAS ALÉM DO ESCOPO ORIGINAL

Durante a execução dos sprints, foram implementadas funcionalidades além dos 14 requisitos originais da reunião de 12/03/2026:

### Novos módulos entregues (não previstos na reunião)

| Módulo | Sprint | Descrição |
|--------|--------|-----------|
| Parâmetros Financeiros Configuráveis | S3-00 | Admin configura diária, passagem, km limite, % alerta via painel — zero hardcode |
| Portal do Professor completo | S4-01 | 7 telas: layout + dashboard + frequência + [classId] + reembolsos + histórico |
| Bulk Attendance API | S4-01 | POST /classes/:id/attendance/bulk com upsert por classId_studentId_date |
| Dashboard BI de Rotas | S4-02 | GET /dashboard/rotas-bi com filtros estado+ano + seção no dashboard admin |
| Mapa Interativo MA/PI | S4-03 | MapaRotas.tsx com react-simple-maps, marcadores proporcionais, tooltip |
| Seed do Acre (3º estado) | S5-01 | Grupo 1 AC + 10 cidades do Acre no seed |
| UI ativação 2FA | S5-02 | Fluxo completo: QR Code + código 6 dígitos + estados idle/setup/active/disabling |
| CI/CD GitHub Actions | S5-03 | .github/workflows/ci.yml — jobs backend+frontend com tsc+build |
| Modo Manutenção | S5-04 | Middleware 503 no NestJS + página frontend /manutencao |
| Sidebar Admin Mobile | SM-01 | Drawer + hamburger + overlay + fecha ao navegar |
| Breakpoints Sistemáticos | SM-02 | globals.css com grid-4/3/2-cols + font-size 16px + min-height 44px |
| Compressão de Imagem | SM-05 | browser-image-compression: max 500KB/1200px antes do upload |
| WebSocket Real-Time | SF-01 | NotificationsGateway com auth JWT + salas por papel |
| Hook useNotifications | SF-02 | socket.io-client + Header dinâmico com badge e painel ao vivo |

### Bugs críticos encontrados e corrigidos (não previstos)

| Bug | Impacto antes | Correção |
|-----|---------------|----------|
| login() sem return | Login retornava undefined — sistema inacessível | Adicionado return response no auth.service.ts |
| ReimbursementType incompatível | Reembolso do professor sempre falhava (400) | Alinhado enum + campo type no frontend |
| EnrollmentsModule sem NotificationsModule | Backend não subia (DI error) | NotificationsModule adicionado nos imports |
| ClassesModule sem NotificationsModule | Backend não subia (DI error) | NotificationsModule adicionado nos imports |
| teacher/layout.tsx transform fixo | Sidebar mobile nunca fechava | Corrigido translateX(-100%) quando fechado |
| Login redirect professor | 404 para qualquer professor | /professor/dashboard → /teacher/dashboard |
| req.user.sub em 3 controllers | Aluno não via inscrições nem certificados | req.user.sub → req.user.id em 3 endpoints |