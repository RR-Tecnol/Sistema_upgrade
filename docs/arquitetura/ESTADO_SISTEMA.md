## Estado do Sistema — Sistema Upgrade
## Snapshot do Estado Real | v7.3 | Atualizado: 07/04/2026 — Dashboard Professor + Certificados PDF + Proxy Next.js
## TSC:0 validado | Backend + Frontend OK

---

## 🔗 REFERÊNCIAS CRUZADAS

> **Este arquivo DEVE ser lido antes de qualquer alteração de código.**
> Ele documenta o estado real atual (bugs ativos, bypasses, o que funciona) — sem ele, você pode
> introduzir mudanças que colidem com o que já está estabilizado.
>
> **Ler em conjunto com:**
> - [`sobre-sistema.md`](./sobre-sistema.md) — arquitetura, fluxos por perfil, módulos detalhados
> - [`LIVRO_DE_REGRAS.md`](./LIVRO_DE_REGRAS.md) — regras de código imutáveis
> - [`ERROS_E_SOLUCOES.md`](../seguranca/ERROS_E_SOLUCOES.md) — soluções para os bugs listados aqui
> - [`PROX-PASSOS.md`](./PROX-PASSOS.md) — roadmap de execução (F5 concluída, F6 aguarda apresentação)
> - [`PLANO-DE-IMPLEMENTACAO.md`](./PLANO-DE-IMPLEMENTACAO.md) — **guia técnico completo** com código exato para cada bug
>
> **Navegue por este arquivo:**
> | Seção | O que cobre |
> |--------|-------------|
> | INFRAESTRUTURA | Docker, portas, status das dependências |
> | PORTAIS | O que cada portal tem implementado e o que está pendente |
> | BYPASSES | O que está simulado para demo e precisa ser removido em produção |
> | BUGS ATIVOS | Bugs conhecidos que ainda não foram corrigidos |
> | CREDENCIAIS | Acessos para dev local |

---

## 🟢 INFRAESTRUTURA

| Serviço | Status | Porta |
|---------|--------|-------|
| PostgreSQL (Docker) | ✅ Up | 5432 |
| Redis (Docker) | ✅ Up | 6379 — senha: RR@@Upgrade |
| MinIO (Docker) | ✅ Up | 9000/9001 |
| Backend NestJS | ✅ | 3001 |
| Frontend Next.js | ✅ | 3000 |

---

## 🟢 BANCO DE DADOS — Migrations

| Migration | Status |
|-----------|--------|
| Iniciais (Sprints 0→5) | ✅ |
| add_two_factor | ✅ |
| add_driver_role_and_employee_user_relation | ✅ |
| add_driver_user_id_to_trip | ✅ |
| add_user_preferences | ✅ |
| add_absence_active | ✅ |
| add_employee_attendance | ✅ |
| add_conta_pagar_active | ✅ |
| add_teacher_checkins (db push 25/03) | ✅ |
| add_city_coordinates_and_driver_location (db push 27/03) | ✅ |

---

## 🔐 CREDENCIAIS DE TESTE

```
admin@qualifica.com                   → RR@@Upgrade → ADMIN
maria.professora.visual@qualifica.com → RR@@Upgrade → TEACHER
joao.driver.test99@qualifica.com      → RR@@Upgrade → DRIVER
aluno@qualifica.com                   → RR@@Upgrade → STUDENT

# Motoristas demo (rastreamento):
carlos.souza.demo@qualifica.com      → RR@@Upgrade → DRIVER
ana.lima.demo@qualifica.com          → RR@@Upgrade → DRIVER
roberto.freitas.demo@qualifica.com   → RR@@Upgrade → DRIVER
marina.costa.demo@qualifica.com      → RR@@Upgrade → DRIVER
paulo.ramos.demo@qualifica.com       → RR@@Upgrade → DRIVER
fabio.nunes.demo@qualifica.com       → RR@@Upgrade → DRIVER
lea.santos.demo@qualifica.com        → RR@@Upgrade → DRIVER
diego.alves.demo@qualifica.com       → RR@@Upgrade → DRIVER
```

---

## ✅ FUNCIONALIDADES POR PORTAL (estado atual)

### Portal do Administrador
| Funcionalidade | Status |
|---------------|--------|
| Dashboard analytics reais | ✅ |
| CRUD Alunos/Cursos/Turmas/Funcionários | ✅ |
| Kanban Inscrições — drag & drop com validação | ✅ |
| Frequência alunos (calendário + P/F + histórico) | ✅ |
| Frequência funcionários (calendário + P/F) | ✅ |
| Reembolsos (aprovação/rejeição RolesGuard) | ✅ |
| Contas a Pagar (soft delete + aba Excluídos) | ✅ |
| Certificados (QR Code + botão PDF download) | ✅ **07/04/2026** |
| Configurações (UserPreferences + perfil) | ✅ |
| Tutorial assistido | ✅ |
| Motoristas em Rota — mapa Leaflet em tempo real | ✅ |
| Drawer motorista via React.createPortal (F5.13) | ✅ **07/04** |
| Toggle rotas: Percorrido / Ambos / Falta (F5.17) | ✅ **07/04** |
| Filtro por estado e motorista | ✅ |
| Alertas via WS + bypass demo | ✅ BYPASS-DEMO-ALERTAS ativo |

### Portal do Professor
| Funcionalidade | Status |
|---------------|---------|
| Dashboard analitico — 5 KPIs + Acoes Pendentes + Cards de turma | ✅ **NOVO 07/04/2026** |
| Endpoint GET /classes/teacher/dashboard (aggregado) | ✅ **NOVO 07/04/2026** |
| KPI Alunos em Risco (<75%) por semaforo verde/amarelo/vermelho | ✅ **NOVO 07/04/2026** |
| KPI Ponto Hoje — clique registra checkin em tempo real | ✅ **NOVO 07/04/2026** |
| Zona Acoes Pendentes com alertas freq_pendente/aluno_risco/encerrando | ✅ **NOVO 07/04/2026** |
| Cards de turma com barras de progresso animadas e badge status | ✅ **NOVO 07/04/2026** |
| Frequencia — selecao turma + calendario | ✅ |
| Historico frequencia | ✅ |
| Meu Ponto — checkin real + historico | ✅ |
| Reembolsos | ✅ |
| Imprevistos (modal via createPortal) | ✅ |
| Certificados (abas Elegiveis/Emitidos + QR + PDF) | ✅ **07/04/2026** |
| Tutorial assistido | ✅ |

### Portal do Aluno
| Funcionalidade | Status |
|---------------|--------|
| Dashboard | ✅ |
| Inscrições (Minhas + Disponíveis) | ✅ |
| Calendário frequência interativo | ✅ |
| Certificados QR Code | ✅ |
| Imprevistos | ✅ |
| Configurações | ✅ |

### Portal do Motorista
| Funcionalidade | Status |
|---------------|--------|
| Dashboard (4 KPIs, 5 ações) | ✅ |
| Rastreamento GPS — polling 3min + offline queue | ✅ |
| "Iniciar Viagem" — ativa GPS automaticamente | ✅ |
| "Cheguei" — bate ponto final + para rastreamento | ✅ |
| Card Minha Viagem Ativa — ETA, progresso, velocidade | ✅ |
| Card Meu Desempenho — ranking semanal + KPIs mensais | ✅ |
| Reembolsos | ✅ |
| Manutenção (UTF-8 correto) | ✅ |
| Imprevistos | ✅ |
| Configurações | ✅ |

---

## ✅ BUGS RESOLVIDOS

| ID | Bug | Resultado validado |
|----|-----|--------------------|
| BUG-DASH-01 | Taxa de Aprovacao 0% | **75%** ✅ |
| BUG-DASH-02 | Certificados 0 | **6 certificados** ✅ |
| BUG-SEED-ARQUIVO-SEPARADO | seed-rastreamento.ts violava Regra 6 | Deletado ✅ |
| BUG-PRISMA-CLIENT-STALE | Lint driverLocation no seed | npx prisma generate ✅ |
| BUG-LEAFLET-ASYNC | race condition MapaMotoristas addTo(map) pos-await | Guards + try/catch por driver ✅ **07/04** |
| VULN-FILEURL-VAZIO | Certificate.fileUrl = '' pos-emissao | fileUrl = /api/certificates/download/:code ✅ **07/04** |
| BUG-NEXTJS-PROXY-404 | /api/* interceptado pelo Next.js → 404 | rewrites() em next.config.js → proxy para :3001 ✅ **07/04** |
| BUG-DRAWER-TRANSFORM | DriverDrawer nao fixava no viewport | React.createPortal → document.body (F5.13) ✅ **07/04** |
| BUG-STATUS-STALE | Status motoristas sempre "sem sinal" | BYPASS-DEMO-STATUS via token [DEMO:status] (F5.14) ✅ **07/04** |
| BUG-COMPLETED-MAPA | Motorista some do mapa ao concluir trip | query bifurcada IN_TRANSIT + COMPLETED 24h (F5.15) ✅ **07/04** |
| BUG-OSRM-RATE-LIMIT | Linhas retas no mapa | seed calcula OSRM no Node.js (BYPASS-DEMO-OSRM F5.16) ✅ **07/04** |

---

## 🚧 FASE 5 — Preparação para Apresentação Executiva (EM ANDAMENTO — 27/03/2026)

| Item | Arquivo | Status |
|------|---------|--------|
| F5.1 — Filtro por estado (MA/PI/AC) | `admin/dashboard/page.tsx` | ✅ |
| F5.2/F5.3 — OSRM implementado no código | `MapaMotoristas.tsx` | ✅ código / ❌ runtime (BUG-OSRM-RATE-LIMIT) |
| F5.4/F5.5/F5.6 — Fix StrictMode + tripKey + lat undefined | `MapaMotoristas.tsx` | ✅ |
| F5.7 — seed-rastreamento.ts deletado | — | ✅ |
| F5.8/F5.9 — runSeed_rastreamento() integrado ao seed-full.ts | `prisma/seed-full.ts` | ✅ |
| F5.10 — Script seed:refresh-drivers | `package.json` | ✅ |
| F5.11 — Fix DriverDrawer scroll | `admin/dashboard/page.tsx` | ⚠️ causa raiz era outra (BUG-DRAWER-TRANSFORM) |
| F5.12 — 11 motoristas demo | `prisma/seed-full.ts` | ✅ dados ✅ status (F5.14) |
| BYPASS-DEMO-ALERTAS | `admin/dashboard/page.tsx` | ✅ ATIVO |
| F5.13 — Fix BUG-DRAWER-TRANSFORM via React.createPortal | `DriverDrawer.tsx` + `dashboard/page.tsx` | ✅ **RESOLVIDO** 07/04 |
| F5.14 — BYPASS-DEMO-STATUS via token [DEMO:status] | `service.ts` + `seed-full.ts` + `.env` | ✅ **RESOLVIDO** 07/04 |
| F5.15 — Fix BUG-COMPLETED-MAPA no getMotoristaAtivos() | `driver-location.service.ts` | ✅ **RESOLVIDO** 07/04 |
| F5.16 — BYPASS-DEMO-OSRM: seed calcula rotas via Node.js | `prisma/seed-full.ts` | ✅ **RESOLVIDO** 07/04 |
| F5.17 — Toggle de visualizacao: Percorrido / Ambos / Falta | `MapaMotoristas.tsx` + `dashboard/page.tsx` | ✅ **RESOLVIDO** 07/04 |
| F5.18 — Certificado PDF: PdfService.generateCertificatePdf + GET /download/:code | `pdf.service.ts` + `certificate.controller.ts` | ✅ **RESOLVIDO** 07/04 |
| F5.19 — fileUrl preenchido na emissao + script correcao banco | `certificate.service.ts` + `fix-certificate-fileurls.ts` | ✅ **RESOLVIDO** 07/04 |
| F5.20 — next.config.js rewrites: /api/* → localhost:3001 | `frontend/next.config.js` | ✅ **RESOLVIDO** 07/04 |
| F5.21 — Dashboard Professor: GET /classes/teacher/dashboard | `classes.service.ts` + `classes.controller.ts` + `teacher/dashboard/page.tsx` | ✅ **RESOLVIDO** 07/04 |

---

## ⚠️ BYPASSES ATIVOS — REMOVER ANTES DE PRODUÇÃO

| ID | Localização | O que faz | Como remover |
|----|-------------|-----------|--------------|
| BYPASS-DEMO-ALERTAS | `admin/dashboard/page.tsx` → `loadDrivers()` | Gera alertas sintéticos. `verificarAlertas()` só dispara após `POST /driver/location` — motoristas do seed nunca fazem POST. | Apagar bloco `// ── BYPASS-DEMO-ALERTAS ──`. Em produção alertas chegam via WS (`ws:driver_alert`). |
| BYPASS-DEMO-STATUS | `driver-location.service.ts` → `getMotoristaAtivos()` | Lê token `[DEMO:status]` do campo `notes` da Trip e sobrepõe o status calculado pelo tempo. Ativo com `IS_DEMO_MODE=true`. | Apagar bloco `// BYPASS-DEMO-STATUS`. Em produção status é calculado pelo `capturedAt`. |
| BYPASS-DEMO-OSRM | `prisma/seed-full.ts` → `buildSeedRoute()` | Seed chama OSRM do Node.js e grava pontos das estradas como DriverLocations, evitando rate limit no browser. | Remover `buildSeedRoute()` do seed. Solução de produção: backend calcula OSRM + cache Redis + retorna `routePoints` no endpoint. |

---

## ❌ BUGS ATIVOS (impactam apresentação)

| ID | Descrição | Causa raiz | Estratégia de fix |
|----|-----------|-----------|-------------------|
| BUG-DRAWER-TRANSFORM | ~~Drawer não fixa no viewport~~ | `animate-fade-in` mantém `transform` via `fill-mode:both` | ✅ **F5.13 resolvido** via `React.createPortal` 07/04 |
| BUG-STATUS-STALE | ~~Status sempre "sem sinal"~~ | Motoristas do seed não fazem POST | ✅ **F5.14 resolvido** via BYPASS-DEMO-STATUS 07/04 |
| BUG-COMPLETED-MAPA | ~~Motorista some ao concluir trip~~ | `getMotoristaAtivos()` filtra só `IN_TRANSIT` | ✅ **F5.15 resolvido** query bifurcada + pin cinza 07/04 |
| BUG-OSRM-RATE-LIMIT | ~~Linhas retas no mapa~~ | ~80 chamadas OSRM simultâneas | ✅ **F5.16 resolvido** seed grava pontos via Node.js 07/04 |

---

## 🔮 FASE 6 — PÓS-APRESENTAÇÃO (a executar após demo)

| Item | Arquivo | Status |
|------|---------|--------|
| Remover BYPASS-DEMO-STATUS | `driver-location.service.ts` | ⏳ Aguarda apresentação |
| Remover BYPASS-DEMO-OSRM | `prisma/seed-full.ts` | ⏳ Aguarda apresentação |
| Remover BYPASS-DEMO-ALERTAS | `admin/dashboard/page.tsx` | ⏳ Aguarda apresentação |
| Migration: `routePoints Json?` na Trip | `prisma/schema.prisma` | ⏳ Aguarda apresentação |
| Backend calcula OSRM + cache Redis | `driver-location.service.ts` | ⏳ Aguarda apresentação |
| Frontend usa `driver.trip.routePoints` | `components/MapaMotoristas.tsx` | ⏳ Aguarda apresentação |

> Documento completo de transição: `docs/arquitetura/RASTREAMENTO_PRODUCAO_APRESENTACAO.md`

---

*Sistema Upgrade | RR TECNOL | v7.3 | 07/04/2026*
*F5 completa: GPS demo + Certificados PDF + Dashboard Professor | F6 aguarda pos-apresentacao*
