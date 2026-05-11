# 🗺️ PRÓXIMOS PASSOS — Sistema Upgrade
## Plano de Execução | v11.0 | 07/04/2026 — F5 concluída, F6 aguarda pós-apresentação

---

## 🔗 REFERÊNCIAS CRUZADAS

> **Este documento é o roadmap de execução.** Leia-o após a documentação canónica do código.
>
> **Ler nesta ordem antes de executar qualquer passo:**
> 1. [`../sistema-atual/README.md`](../sistema-atual/README.md) — índice da fonte de verdade técnica
> 2. [`../sistema-atual/07-integracoes-notificacoes-arquivos-mapa.md`](../sistema-atual/07-integracoes-notificacoes-arquivos-mapa.md) — GPS, mapas, sockets, ficheiros
> 3. [`../SEEDS_GUIDE.md`](../SEEDS_GUIDE.md) — seeds e dados de desenvolvimento
> 4. Este arquivo — o que FAZER e em qual ordem
>
> **⭐ FASE 5 CONCLUÍDA — F5.13 a F5.17 IMPLEMENTADOS (07/04/2026)**
> → Ver **[`PLANO-DE-IMPLEMENTACAO.md`](./PLANO-DE-IMPLEMENTACAO.md)** para detalhes
>
> **Links especializados por fase:**
> | Fase | Doc específico |
> |------|----------------|
> | **F5.13–F5.16 (implementação imediata)** | **[`PLANO-DE-IMPLEMENTACAO.md`](./PLANO-DE-IMPLEMENTACAO.md)** |
> | F5 — GPS Demo / pós-produção | [`PLANO-DE-IMPLEMENTACAO.md`](./PLANO-DE-IMPLEMENTACAO.md) (secções de bypass) + [`../sistema-atual/07-integracoes-notificacoes-arquivos-mapa.md`](../sistema-atual/07-integracoes-notificacoes-arquivos-mapa.md) |
> | Schema/Prisma | [`../sistema-atual/05-dados-prisma-migracoes-seeds.md`](../sistema-atual/05-dados-prisma-migracoes-seeds.md) · [`../SEEDS_GUIDE.md`](../SEEDS_GUIDE.md) |
> | Responsividade portal /driver | Código `frontend/app/driver/*` + [`../sistema-atual/04-frontend-portais-e-rotas.md`](../sistema-atual/04-frontend-portais-e-rotas.md) |

---

## ✅ SISTEMA BASE 100% CONCLUÍDO (25/03/2026)

| Grupo | Itens | Status |
|-------|-------|--------|
| Infraestrutura (Grupo 0) | Redis senha, seed, RolesGuard, soft delete | ✅ |
| Bugs Críticos (Grupo 1) | TypeError turmas, UTC datas, UserPreferences, reembolso | ✅ |
| UI/UX (Grupo 2) | Modais, hamburger, overflow, QR Code | ✅ |
| Features Novas (Grupo 3) | WS, freq. func., calendário aluno, tutorial, imprevistos, kanban, ponto professor | ✅ |
| Sprint Final | Sidebar, dashboard motorista, notificações, logout | ✅ |
| Sprint Fechamento | Checkin professor, kanban transições, freq. func. calendário, UTF-8, animações | ✅ |
| BUG-DASH-01/02 | Taxa aprovação + certificados | ✅ |

---

## 🚀 PARA DEPLOY EM PRODUÇÃO (quando F5 estiver completo)

```powershell
# 1. Backend
cd backend
Remove-Item Env:PORT -ErrorAction SilentlyContinue
npm run build
npx tsc --noEmit
npm run start:prod

# 2. Frontend
cd frontend
npm run build
npm run start

# 3. Scripts de manutenção
npx tsx prisma/seed-full.ts
npx tsx prisma/fix-utf8-notifications.ts

# ⚠️ ANTES DO DEPLOY: remover bypasses de demo
# Ver PLANO-DE-IMPLEMENTACAO.md §REMOÇÃO PÓS-APRESENTAÇÃO
```

---

## 🔖 AVISOS PERMANENTES

1. **`npx tsc --noEmit`** → zero erros antes de qualquer commit
2. **Nunca `SUPER_ADMIN`** — role não existe no enum `UserRole`
3. **`req.user.id` SEMPRE** — nunca `req.user.sub`
4. **WS em try/catch separado**, fora de `$transaction`
5. **Soft delete sempre** — nunca `.delete()` em entidades de negócio
6. **Um seed: `seed-full.ts`** — nunca criar seeds adicionais
7. **Rotas literais ANTES de `:id`** no NestJS
8. **`GET /employees`** retorna `{ employees: [], total, byRole, byDept }` — não array direto
9. **`GET /reimbursements`** retorna `{ data: [], meta: {} }` — nunca `Array.isArray(res.data)` direto
10. **Schema sem BOM** — usar `fix-bom.ps1` se necessário
11. **VALID_TRANSITIONS** — sempre validar transição kanban antes de chamar API
12. **`catch (err: any)`** — sempre inspecionar `err?.response?.data?.message` no toast
13. **`GET /classes`** aceita apenas UM status por vez — não enviar array
14. **IS_DEMO_MODE=true** no `backend/.env` para ativar bypasses de demo (F5.14)
15. **`GET /classes/teacher/dashboard`** retorna objeto agregado — literal antes de `:id` (LIVRO §2)
16. **`/api/*` no frontend** precisa de rewrite em `next.config.js` — Next.js intercepta antes do backend sem proxy

---

## 🚀 FEATURE — RASTREAMENTO DE MOTORISTAS

### FASES 1–4 ✅ CONCLUÍDAS

| Fase | Descrição | Status |
|------|-----------|--------|
| Fase 1 — Base de dados | City coords, DriverLocation model, LGPD cleanup | ✅ |
| Fase 2 — Backend tracking | 9 endpoints GPS, ETA, alertas WS | ✅ |
| Fase 3 — Portal Motorista | useDriverTracking, Iniciar/Chegar, KPIs | ✅ |
| Fase 4 — Dashboard Admin | Leaflet mapa, DriverDrawer, filtros, alertas | ✅ |

---

### FASE 5 — Correções para Apresentação 🚧 EM ANDAMENTO

> **Código pronto para execução:** ver **[`PLANO-DE-IMPLEMENTACAO.md`](./PLANO-DE-IMPLEMENTACAO.md)**

| Passo | Descrição | Arquivo(s) | Status |
|-------|-----------|------------|--------|
| F5.1–F5.12 | Filtros, OSRM código, seed 11 motoristas, scripts | vários | ✅ |
| **F5.16** | **BYPASS-DEMO-OSRM** — seed Node.js calcula OSRM, grava DriverLocations | `seed-full.ts` + `MapaMotoristas.tsx` | ✅ **07/04** |
| **F5.14** | **BYPASS-DEMO-STATUS** — token `[DEMO:status]` + IS_DEMO_MODE env | `driver-location.service.ts` + `seed-full.ts` + `.env` | ✅ **07/04** |
| **F5.15** | **BUG-COMPLETED-MAPA** — motoristas COMPLETED visíveis 24h, pin cinza | `driver-location.service.ts` | ✅ **07/04** |
| **F5.13** | **BUG-DRAWER-TRANSFORM** — createPortal, zIndex 9999, scroll declarativo | `DriverDrawer.tsx` + `dashboard/page.tsx` | ✅ **07/04** |
| **F5.17** | **Toggle rota** — Percorrido / Falta / Ambos (Deep Research §6) | `MapaMotoristas.tsx` + `dashboard/page.tsx` | ✅ **07/04** |

### Por que esta ordem?

| Ordem | Motivo |
|-------|--------|
| F5.16 primeiro | Independente — só seed-full.ts e MapaMotoristas.tsx |
| F5.14 antes de F5.15 | Ambos alteram `driver-location.service.ts` — F5.14 primeiro evita conflito |
| F5.15 após F5.14 | Adiciona 2ª query no mesmo `getMotoristaAtivos()` já modificado |
| F5.13 por último | Independente — só DriverDrawer.tsx e dashboard/page.tsx |

### Insights críticos do Deep Research (07/04/2026)

| Item | Descoberta |
|------|-----------|
| F5.13 zIndex | Usar `9999` (não `200`) |
| F5.13 scroll | `useEffect` cleanup no DriverDrawer, não no `onClose` |
| F5.14 | **Nunca apagar** o bloco — condicionar com `IS_DEMO_MODE=true` |
| F5.14 regex | Flag `i` obrigatória: `/\[DEMO:(online|stopped|offline)\]/i` |
| F5.15 query | 2 queries separadas > subquery aninhada (performance) |
| F5.15 cache | `VIRTUAL_${driverId}_COMPLETED` como trip.id — não colapsa cache Leaflet |
| F5.15 visual | Pin cinza para COMPLETED (não vermelho) |
| F5.16 Node.js | `undici.Agent({ connectTimeout: 15000 })` — evita UND_ERR_CONNECT_TIMEOUT |
| F5.16 OSRM | `overview=simplified` — gera 100-300 pontos (não full) |
| F5.16 frontend | OSRM no browser vira **fallback** (não removido), `trail.length >= 2` tem prioridade |
| F5.16 Leaflet | Adicionar `L.canvas()` — evita SVG lag com 11+ motoristas |

### Checklist pré-apresentação
```
☑ npm run seed:full                               # seed com OSRM (F5.16) ✅
☑ Verificar 11 motoristas no mapa
☑ Verificar status correto (verde/amarelo/vermelho/cinza)  # F5.14 ✅
☑ Verificar rotas nas estradas (não linhas retas)          # F5.16 ✅
☑ Motoristas COMPLETED com pin cinza 24h                   # F5.15 ✅
☑ DriverDrawer fixo no viewport ao clicar no pin           # F5.13 ✅
☑ Toggle de modos: ↩ Percorrido / ⇌ Ambos / ↪ Falta       # F5.17 ✅
☑ Testar filtros por estado (MA/PI/AC)
☑ npx tsx prisma/seed-full.ts --refresh-drivers   # 5 min antes da apresentação
```

---

## ✅ FASE 5.B — Certificados PDF + Dashboard Professor (07/04/2026)

> **Todos os itens abaixo foram implementados e validados com `npx tsc --noEmit` (zero erros).**

| Item | Arquivo(s) | Status |
|------|------------|--------|
| **F5.18** | **PdfService.generateCertificatePdf** — HTML Puppeteer com QR embutido, download sob demanda | `pdf.service.ts` | ✅ **07/04** |
| **F5.18** | **GET /certificates/download/:code** — endpoint público (`@Public()`) que gera e serve o PDF | `certificate.controller.ts` | ✅ **07/04** |
| **F5.19** | **fileUrl preenchido na emissão** — CertificateService.issueCertificate grava `fileUrl = /api/certificates/download/:code` | `certificate.service.ts` | ✅ **07/04** |
| **F5.19** | **Botão PDF no Admin** — `admin/certificados/page.tsx` exibe colВão com link de download | `admin/certificados/page.tsx` | ✅ **07/04** |
| **F5.19** | **Botão PDF na verificação pública** — `certificado/verificar/[code]/page.tsx` | `app/certificado/verificar/[code]/page.tsx` | ✅ **07/04** |
| **F5.20** | **next.config.js rewrites** — `/api/*` → `localhost:3001/api/*` (evita 404 do Next.js interceptando) | `frontend/next.config.js` | ✅ **07/04** |
| **F5.21** | **Dashboard Agregado do Professor** — endpoint `GET /classes/teacher/dashboard` | `classes.service.ts` + `classes.controller.ts` | ✅ **07/04** |
| **F5.21** | **teacher/dashboard/page.tsx reescrito** — 4 zonas (Banner + 5 KPIs + Acões Pendentes + Cards de turma + CTA) | `teacher/dashboard/page.tsx` | ✅ **07/04** |
| **F5.21** | **Alertas automáticos** — freq_pendente / aluno_risco / encerrando / checkin | `teacher/dashboard/page.tsx` | ✅ **07/04** |

---

## 📋 BACKLOG PÓS-AUDITORIA

Itens solicitados pelo cliente que **não** bloqueiam a apresentação e devem ser implementados
após a auditoria executiva.

| # | Feature | Módulo(s) | Detalhes | ID |
|---|---------|-----------|----------|-----|
| 1 | **Upload de documentos comprobatórios** | Reembolsos + Imprevistos | Motorista anexa atestado/recibo (JPG, PNG, PDF · max 10MB) no formulário. Backend salva no MinIO e retorna URL. Cards exibem badge 📎. ADM vê documento na revisão. | **F5.18** |
| 2 | **Revisão completa do sistema de notificações** | Todos os perfis (Admin, Motorista, Professor, Aluno, Coord.) | Auditoria de cobertura e consistência de todos os eventos de notificação: persistência no banco, WS em tempo real, isolamento em try/catch fora de $transaction, UX do sino e agrupamento por tipo. | **📌 NOTA** |

> **Código e especificação completa:** ver [`PLANO-DE-IMPLEMENTACAO.md §F5.18`](./PLANO-DE-IMPLEMENTACAO.md)
>
> **Schema já preparado** — campos `documentUrl` (Absence) and `receiptUrl` (Reimbursement) já existem.
> Não requer migration de banco de dados.

> **Revisão de notificações:** ver [`PLANO-DE-IMPLEMENTACAO.md §NOTA REVISÃO NOTIFICAÇÕES`](./PLANO-DE-IMPLEMENTACAO.md)
>
> **Infraestrutura já existe** — `NotificationsGateway`, `notifyUser()`, `notifyAdmins()`, `NotificationBell`.
> O trabalho é auditar gaps, garantir persistência em todos os módulos e padronizar a UX do sino.


---

## 🏭 FASE 6 — PÓS-APRESENTAÇÃO: PRODUÇÃO REAL

> **Documentos:** [`PLANO-DE-IMPLEMENTACAO.md §REMOÇÃO`](./PLANO-DE-IMPLEMENTACAO.md) + [`../sistema-atual/07-integracoes-notificacoes-arquivos-mapa.md`](../sistema-atual/07-integracoes-notificacoes-arquivos-mapa.md)

| # | Ação | Arquivo |
|---|------|---------|
| 1 | Remover BYPASS-DEMO-STATUS (ou setar IS_DEMO_MODE=false) | `driver-location.service.ts` / `.env` |
| 2 | Remover BYPASS-DEMO-OSRM (`buildSeedRoute()`) | `prisma/seed-desenvolvimento/seed-full.ts` |
| 3 | Remover BYPASS-DEMO-ALERTAS | `admin/dashboard/page.tsx` |
| 4 | Migration `routePoints Json?` na Trip | `prisma/schema.prisma` |
| 5 | Implementar `getOrCalculateRoute()` + Redis TTL 7d | `driver-location.service.ts` |
| 6 | Frontend usa `driver.trip.routePoints` | `MapaMotoristas.tsx` |

---

*Sistema Upgrade | RR TECNOL | v10.0 | 07/04/2026*
*Atualizado após Deep Research — ver `AFAZERES/PLANO-DE-IMPLEMENTACAO.md` para código real*
