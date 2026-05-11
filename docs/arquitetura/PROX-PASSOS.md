# 📌 PRÓXIMOS PASSOS — Sistema Upgrade
## v9.0 | 07/04/2026 | Fase 5 em andamento — 4 bugs críticos pendentes

> **LEIA ANTES:** Este arquivo é um índice de navegação.
> Para detalhes de implementação de código, acesse o **PLANO-DE-IMPLEMENTACAO.md**.
>
> **Docs relacionados:**
> - [`PLANO-DE-IMPLEMENTACAO.md`](./PLANO-DE-IMPLEMENTACAO.md) ← **NOVO** — guia técnico completo dos 4 bugs
> - [`ESTADO_SISTEMA.md`](./ESTADO_SISTEMA.md) — estado atual do sistema (v7.1)
> - [`sobre-sistema.md`](./sobre-sistema.md) — arquitetura completa (v2.0)
> - [`RASTREAMENTO_PRODUCAO_APRESENTACAO.md`](./RASTREAMENTO_PRODUCAO_APRESENTACAO.md) — transição demo→produção

---

## 🔴 FASE 5 — PENDENTE (bloqueia apresentação executiva)

### Ordem obrigatória: F5.16 → F5.14 → F5.15 → F5.13

| Item | Bug que resolve | Status | Arquivo(s) | Detalhes |
|------|----------------|--------|-----------|----------|
| **F5.16** | BUG-OSRM-RATE-LIMIT | ❌ PENDENTE | `seed-full.ts` + `MapaMotoristas.tsx` | [Ver §F5.16](./PLANO-DE-IMPLEMENTACAO.md#️-f516--bypass-demo-osrm) |
| **F5.14** | BUG-STATUS-STALE | ❌ PENDENTE | `driver-location.service.ts` + `seed-full.ts` | [Ver §F5.14](./PLANO-DE-IMPLEMENTACAO.md#️-f514--bypass-demo-status) |
| **F5.15** | BUG-COMPLETED-MAPA | ❌ PENDENTE | `driver-location.service.ts` | [Ver §F5.15](./PLANO-DE-IMPLEMENTACAO.md#️-f515--fix-bug-completed-mapa) |
| **F5.13** | BUG-DRAWER-TRANSFORM | ❌ PENDENTE | `dashboard/page.tsx` + `DriverDrawer.tsx` | [Ver §F5.13](./PLANO-DE-IMPLEMENTACAO.md#️-f513--fix-bug-drawer-transform) |

### Resumo dos bugs

| ID | Sintoma | Causa raiz | Fix |
|----|---------|-----------|-----|
| BUG-OSRM-RATE-LIMIT | Linhas retas no mapa | ~80 req OSRM simultâneas no browser → HTTP 429 → `catch{}` silencioso | Seed chama OSRM via Node.js (800ms throttle), grava pontos das estradas como DriverLocations |
| BUG-STATUS-STALE | Todos "sem sinal" | `capturedAt` do seed envelhece em minutos — motoristas nunca fazem POST | Token `[DEMO:status]` no `Trip.notes`, condicionado por `IS_DEMO_MODE=true` |
| BUG-COMPLETED-MAPA | Motorista some ao concluir | `getMotoristaAtivos()` filtra só `IN_TRANSIT` | Query bifurcada: inclui drivers com DriverLocation < 24h → pin cinza no mapa |
| BUG-DRAWER-TRANSFORM | Drawer flutua com scroll | `animate-fade-in` (fill-mode:both) cria containing block CSS — `position:fixed` âncora no ancestral | `createPortal(drawer, document.body)` com mounted check (useState+useEffect) |

---

## ✅ FASE 5 — CONCLUÍDO (F5.1 a F5.12)

| Item | Descrição | Status |
|------|-----------|--------|
| F5.1 | Filtro por estado MA/PI/AC no mapa | ✅ |
| F5.2/F5.3 | OSRM implementado no frontend | ✅ código / ❌ runtime (F5.16 resolve) |
| F5.4/F5.5/F5.6 | Fix StrictMode + tripKey + lat undefined | ✅ |
| F5.7 | seed-rastreamento.ts deletado (violava Regra 6) | ✅ |
| F5.8/F5.9 | runSeed_rastreamento() integrado ao seed-full.ts | ✅ |
| F5.10 | Script seed:refresh-drivers | ✅ |
| F5.11 | Fix scroll DriverDrawer (causa raiz era outra — tratada no F5.13) | ⚠️ |
| F5.12 | 11 motoristas demo com dados GPS | ✅ dados / ❌ status (F5.14 resolve) |
| BYPASS-DEMO-ALERTAS | Alertas sintéticos para demo | ✅ ATIVO |

---

## 🔮 FASE 6 — PÓS-APRESENTAÇÃO

> Execução SOMENTE após a apresentação executiva ser realizada com sucesso.
> Detalhes em [`RASTREAMENTO_PRODUCAO_APRESENTACAO.md`](./RASTREAMENTO_PRODUCAO_APRESENTACAO.md)

| Item | O que faz | Arquivo | Status |
|------|-----------|---------|--------|
| Remover BYPASS-DEMO-STATUS | Produção usa `capturedAt` real | `driver-location.service.ts` | ⏳ |
| Remover BYPASS-DEMO-OSRM | Produção usa backend OSRM + Redis | `seed-full.ts` | ⏳ |
| Remover BYPASS-DEMO-ALERTAS | Produção usa WS real | `dashboard/page.tsx` | ⏳ |
| Migration `routePoints Json?` | Persistência de rotas na Trip | `schema.prisma` | ⏳ |
| `getOrCalculateRoute()` service | OSRM backend + cache Redis 7 dias | `driver-location.service.ts` | ⏳ |
| Frontend usa `driver.trip.routePoints` | Zero OSRM no browser em produção | `MapaMotoristas.tsx` | ⏳ |

---

## 📋 CHECKLIST PARA A APRESENTAÇÃO

```bash
# 5 minutos antes:
cd backend
npx tsx prisma/seed-full.ts          # seed completo com OSRM (~30s após F5.16)
npx tsx prisma/seed-full.ts --refresh-drivers  # atualiza timestamps (camada extra)

# Verificar no painel:
# Admin → Dashboard → Motoristas em Rota
# ✅ 4 pins VERDES  (carlos, marina, paulo, diego)
# ✅ 2 pins AMARELOS (ana, fabio)
# ✅ 2 pins VERMELHOS (roberto, lea)
# ✅ 3 pins CINZAS  (tânia, jonas, rosa — COMPLETED)
# ✅ Polylines seguindo estradas reais
# ✅ Drawer abre fixado no viewport
```

---

*Sistema Upgrade | RR TECNOL | v9.0 | 07/04/2026*
