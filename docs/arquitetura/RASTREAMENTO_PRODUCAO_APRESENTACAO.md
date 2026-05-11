# 🗺️ RASTREAMENTO — PRODUÇÃO, APRESENTAÇÃO E TRANSIÇÃO
## Documento técnico | v1.0 | 27/03/2026
## Sistema Upgrade — RR TECNOL / Qualifica MA/PI/AC

> Este documento cobre os três momentos do sistema de rastreamento:
> 1. **DEMO** — como fazer a apresentação funcionar sem falhas
> 2. **TRANSIÇÃO** — como remover os bypasses após a apresentação
> 3. **PRODUÇÃO** — como o sistema funcionará com motoristas reais

---

## 🔗 REFERÊNCIAS CRUZADAS

> **Quando ler este documento:**
> Apenas quando for trabalhar com o sistema de rastreamento GPS, apresentação executiva ou remoção de bypasses.
>
> **Ler antes deste:**
> - [`ESTADO_SISTEMA.md`](./ESTADO_SISTEMA.md) — quais bypasses estão ativos (F5.13–F5.16)
> - [`PROX-PASSOS.md`](./PROX-PASSOS.md) — status de cada fase F5.x e o que ainda está pendente
> - [`sobre-sistema.md §11.8`](./sobre-sistema.md) — documentação completa do módulo DriverLocation
> - [`LIVRO_DE_REGRAS.md §8G`](./LIVRO_DE_REGRAS.md) — anti-padrões de GPS e mapas
> - [`ERROS_E_SOLUCOES.md`](../seguranca/ERROS_E_SOLUCOES.md) — BUG-DRAWER-TRANSFORM e BUG-OSRM-RATE-LIMIT
>
> **Arquivos impactados pelos bypasses documentados aqui:**
> | Bypass | Arquivo no código |
> |--------|-------------------|
> | BYPASS-DEMO-STATUS | `backend/src/driver-location/driver-location.service.ts` |
> | BYPASS-DEMO-OSRM | `backend/prisma/seed-full.ts` (função `buildSeedRoute`) |
> | BYPASS-DEMO-ALERTAS | `frontend/app/admin/dashboard/page.tsx` |

---

## 📌 POR QUE EXISTE DIFERENÇA ENTRE DEMO E PRODUÇÃO

O sistema de rastreamento é correto e funcional para produção. A diferença existe em três pontos:

| Problema Demo | Causa raiz | Solução Demo | Solução Produção |
|---------------|-----------|-------------|-----------------|
| Status sempre "sem sinal" | Motoristas demo não fazem POST /driver/location | Token `[DEMO:status]` no `notes` da Trip | Motoristas reais enviam POST a cada 3min → `capturedAt` recente |
| Linhas retas no mapa | Browser faz ~80 req OSRM simultâneas → rate limit | Seed calcula OSRM no Node.js e grava pontos no banco | Backend calcula OSRM na criação da Trip + cache Redis |
| Drawer não fixa viewport | `animate-fade-in` cria stacking context via `transform` | `React.createPortal` — **fix definitivo** para produção também | Mesmo fix — não é bypass |
| Motorista some ao concluir | `getMotoristaAtivos()` filtra só `IN_TRANSIT` | Incluir `DriverLocation` recente (<24h) — **fix definitivo** | Mesmo fix — não é bypass |

**Observação:** F5.13 e F5.15 são **fixes reais** que melhoram o sistema em produção também.
F5.14 e F5.16 são **bypasses temporários** para demo que devem ser removidos antes de produção.

---

## 🎬 PARTE 1 — APRESENTAÇÃO IDEAL

### Checklist pré-apresentação (D-1 e D-day)

```
D-1:
□ npm run prisma:seed         → seed completo com 11 motoristas
□ npx tsc --noEmit            → zero erros TypeScript
□ Testar abertura do DriverDrawer → verifica fix F5.13 (portal)
□ Verificar rotas no mapa → devem seguir estradas (fix F5.16)
□ Verificar status coloridos → verde/amarelo/vermelho (fix F5.14)

D-day (5 minutos antes):
□ npm run seed:refresh-drivers → atualiza timestamps para manter status
□ Abrir browser em localhost:3000/admin/dashboard
□ Logar como admin@qualifica.com / RR@@Upgrade
□ Confirmar que o mapa mostra motoristas com cores corretas
□ Confirmar que clicar em um motorista abre o drawer fixo na tela
□ Confirmar que as rotas seguem estradas (não linhas retas)
```

### Script de demonstração (fluxo sugerido)

**Abertura — visão geral (30s):**
- Mostrar dashboard com KPIs acadêmicos
- Rolar para baixo → seção "Motoristas em Rota"
- Destacar: "Sistema em tempo real — 11 motoristas ativos agora"

**Mapa (60s):**
- Mostrar filtro por estado (MA / PI / AC)
- Zoom em um motorista ONLINE (verde) → Carlos Souza SLZ→Teresina
- Mostrar trilha verde sólida (percorrido) + linha pontilhada (estimativa)
- Destacar que as linhas seguem estradas reais, não linhas retas

**Drawer de detalhes (60s):**
- Clicar no pin de Marina Costa (88%, ETA < 30min, alerta arriving_soon)
- Mostrar drawer fixo na lateral direita com:
  - Status ONLINE (verde)
  - Rota Caxias/MA → São Luís/MA
  - Barra de progresso 88%
  - ETA em destaque (orbitron font)
  - Velocidade + coordenadas
- Fechar drawer → mapa volta ao normal

**Alertas (30s):**
- Mostrar painel de alertas na parte inferior
- Destacar: "Sistema alerta automaticamente sobre situações críticas"
- Roberto Freitas: 🔴 sem sinal há X min
- Ana Lima: 🟡 parada longa
- Marina Costa: 🟢 chegando em breve

**Motoristas COMPLETED (20s):**
- Filtrar por estado AC → mostrar Tânia Melo (viagem concluída, ainda visível)
- Destacar: "Motoristas que concluíram permanecem visíveis até iniciar nova viagem"

**Filtros (20s):**
- Usar filtro "Todos motoristas" → dropdown → selecionar Diego Alves (rota longa AC→MA)
- Mostrar zoom automático no motorista selecionado

### O que NÃO fazer durante a apresentação
- Não abrir DevTools (pode aparecer log de BYPASS-DEMO-* nos comentários do código)
- Não rolar a page muito rápido (status pode piscar durante reload)
- Não demonstrar o portal do motorista fazendo GPS real (motoristas demo não enviam POST)
- Não abrir múltiplas abas do admin ao mesmo tempo

---

## 🔄 PARTE 2 — TRANSIÇÃO PÓS-APRESENTAÇÃO

### Ordem de remoção dos bypasses

**1. Remover BYPASS-DEMO-STATUS** (mais urgente — afeta cálculo de status em produção)
```typescript
// driver-location.service.ts → getMotoristaAtivos()
// Apagar completamente o bloco abaixo:
// ── BYPASS-DEMO-STATUS ──────────────────────────────────────────────────────
// const demoMatch = trip.notes?.match(/\[DEMO:(online|stopped|offline)\]/);
// if (demoMatch) status = demoMatch[1] as typeof status;
// ── FIM BYPASS-DEMO-STATUS ──────────────────────────────────────────────────
```

**2. Remover BYPASS-DEMO-OSRM** (seed deixa de calcular rotas no front-end)
```typescript
// prisma/seed-full.ts
// Apagar a função buildSeedRoute() inteiramente
// Substituir na runSeed_rastreamento(): uso de interpolação linear simples
// (não importa — seed de demo não vai mais ser usado em produção)
```

**3. Remover BYPASS-DEMO-ALERTAS** (já documentado — alertas vêm via WS em produção)
```typescript
// admin/dashboard/page.tsx → loadDrivers()
// Apagar bloco: // ── BYPASS-DEMO-ALERTAS ──  até  // ── FIM BYPASS-DEMO-ALERTAS ──
```

**4. Limpar tokens do seed (optional)**
- Os tokens `[DEMO:*]` no campo `notes` das Trips demo podem ser mantidos inofensivos após
  o bypass ser removido do service (o service simplesmente os ignorará)
- Alternativamente, limpar via: `UPDATE "Trip" SET notes = NULL WHERE notes LIKE '%[DEMO:%'`

### Verificação pós-remoção
```powershell
cd backend
npx tsc --noEmit          # zero erros
npm run build             # build passa
# Testar manualmente: motorista real faz POST → status atualiza em tempo real
```

---

## 🏭 PARTE 3 — ARQUITETURA DE PRODUÇÃO

### Diagrama de fluxo de dados em produção

```
MOTORISTA (celular/GPS)
    │ POST /driver/location a cada 3min
    ▼
BACKEND NestJS (porta 3001)
    ├── Salva DriverLocation no PostgreSQL
    ├── Calcula status (online/stopped/offline) por capturedAt
    ├── Verifica alertas (sem sinal / parada longa / chegando)
    ├── Emite WS driver_location_update + driver_alert → ADMIN
    │
    └── GET /driver/location/active (ADMIN)
            ├── Busca trips IN_TRANSIT + DriverLocation < 24h
            ├── Para cada trip: busca routePoints no campo Trip.routePoints (JSON)
            │   ├── Se routePoints existir → retorna direto (rota pré-calculada)
            │   └── Se não existir → calcula OSRM no servidor + salva no campo + retorna
            └── Retorna: { drivers: [..., trail: DriverLocation[], routePoints: [lat,lng][] ] }

FRONTEND Next.js (porta 3000)
    ├── Recebe routePoints já calculados do backend
    ├── Desenha polylines via Leaflet (zero OSRM no browser)
    ├── Atualiza posição via WS (driver_location_update)
    └── Exibe DriverDrawer via createPortal → fixo no viewport
```

### Schema da Trip em produção (campo routePoints)

```prisma
model Trip {
  id                  String          @id @default(uuid())
  // ... campos existentes ...
  notes               String?
  // CAMPO NOVO — adicionado na migração de produção:
  routePoints         Json?           // [[lat, lng], [lat, lng], ...] — rota completa pelas estradas
  routePointsCalcAt   DateTime?       // quando foi calculado (para invalidação)
  // ... relações existentes ...
}
```

**Por que `Json?` no Prisma:**
- PostgreSQL `jsonb` armazena arrays de coordenadas eficientemente
- Prisma tipa como `Json` → no TypeScript trata como `[number, number][]`
- Sem overhead de tabela separada para pontos de rota
- Permite índice GIN no PostgreSQL para queries geoespaciais futuras

### Serviço de cache Redis para rotas OSRM

```typescript
// Em produção, driver-location.service.ts:

// Chave Redis: `osrm:route:${originCityId}:${destCityId}`
// TTL: 7 dias (rotas entre cidades não mudam)
// Padrão Cache-Aside:

async getOrCalculateRoute(
  originCityId: string, destCityId: string,
  originLat: number, originLng: number,
  destLat: number, destLng: number
): Promise<[number, number][]> {

  const cacheKey = `osrm:route:${originCityId}:${destCityId}`;

  // 1. Tentar Redis primeiro
  const cached = await this.cacheManager.get<string>(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Tentar campo routePoints da Trip no banco
  const trip = await this.prisma.trip.findFirst({
    where: { originCityId, destinationCityId: destCityId, routePoints: { not: null } }
  });
  if (trip?.routePoints) {
    const pts = trip.routePoints as [number, number][];
    await this.cacheManager.set(cacheKey, JSON.stringify(pts), 7 * 24 * 3600 * 1000);
    return pts;
  }

  // 3. Calcular via OSRM (backend → sem CORS, sem rate limit de browser)
  const pts = await this.fetchOSRMRoute(originLat, originLng, destLat, destLng);

  // 4. Salvar no Redis + no campo routePoints de TODAS as trips com esse par
  await this.cacheManager.set(cacheKey, JSON.stringify(pts), 7 * 24 * 3600 * 1000);
  await this.prisma.trip.updateMany({
    where: { originCityId, destinationCityId: destCityId },
    data: { routePoints: pts as any, routePointsCalcAt: new Date() }
  });

  return pts;
}

private async fetchOSRMRoute(
  oLat: number, oLng: number, dLat: number, dLng: number
): Promise<[number, number][]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data = await res.json();
    if (data.code !== 'Ok') throw new Error(`OSRM code: ${data.code}`);
    return data.routes[0].geometry.coordinates.map(
      ([lon, lat]: [number, number]) => [lat, lon] as [number, number]
    );
  } catch (err) {
    this.logger.warn(`OSRM falhou para (${oLat},${oLng})→(${dLat},${dLng}): ${err}`);
    return [[oLat, oLng], [dLat, dLng]]; // fallback: linha reta
  }
}
```

### Frontend em produção — zero OSRM

```typescript
// MapaMotoristas.tsx em produção:
// driver.routePoints já vem do endpoint como [lat, lng][]
// Frontend apenas desenha — sem nenhuma chamada OSRM

// Trilha percorrida = sliceByProgress(driver.routePoints, driver.progress)
// Rota restante = driver.routePoints.slice(cutIndex)

// PRODUÇÃO: backend calcula OSRM + cacheia Redis + retorna routePoints no endpoint
// Frontend: zero chamadas OSRM, apenas desenha polylines via Leaflet
```

### Estratégia de cache por camada

```
CAMADA 1 — Redis (TTL: 7 dias)
  Chave: osrm:route:{originCityId}:{destCityId}
  Uso: ~30 pares de cidades → ~30 entradas → memória negligível
  Invalidação: automática por TTL / manual se estrada mudar

CAMADA 2 — Campo routePoints no banco (persistente)
  Chave: Trip.routePoints (Json?)
  Uso: já calculado → nunca chama OSRM novamente para o mesmo par
  Vantagem: sobrevive a restart do Redis

CAMADA 3 — OSRM público (fallback)
  Chamado apenas quando nem Redis nem banco têm a rota
  Máximo: 1 chamada por par de cidades na vida do sistema
  Throttle: sem necessidade (poucas chamadas esporádicas)
```

### Migração do schema para produção

```sql
-- Migration: add_route_points_to_trip
ALTER TABLE "Trip" ADD COLUMN "routePoints" jsonb;
ALTER TABLE "Trip" ADD COLUMN "routePointsCalcAt" TIMESTAMP WITH TIME ZONE;

-- Índice para queries futuras (geoespacial)
-- Opcional: adicionar quando necessário
-- CREATE INDEX idx_trip_route_points ON "Trip" USING gin("routePoints");
```

```prisma
// schema.prisma — adicionar ao model Trip:
routePoints         Json?
routePointsCalcAt   DateTime?
```

**Comando de migração:**
```powershell
cd backend
npx prisma migrate dev --name add_route_points_to_trip
npx prisma generate
```

### Endpoint atualizado para produção

```typescript
// GET /driver/location/active — resposta em produção:
{
  "drivers": [
    {
      "userId": "...",
      "name": "Carlos Souza",
      "status": "online",           // calculado por capturedAt real
      "lastLocation": { "lat": -4.8, "lng": -42.1, "speed": 87, ... },
      "trip": {
        "id": "...",
        "origin": "São Luís/MA",
        "destination": "Teresina/PI",
        "originLat": -2.53, "originLng": -44.3,
        "destinationLat": -5.09, "destinationLng": -42.8,
        "routePoints": [[-2.53,-44.3],[-3.1,-43.9],...,[-5.09,-42.8]]
        //                ↑ 50-100 pontos pelas estradas reais — pré-calculado no backend
      },
      "eta": { "distanciaKm": 340, "minutos": 234, "fonte": "haversine" },
      "progress": 45,
      "trail": [                    // últimas posições reais do GPS
        { "latitude": -4.8, "longitude": -42.1, "capturedAt": "..." },
        ...
      ]
    }
  ]
}
```

---

## 📋 TABELA COMPLETA — DEMO vs PRODUÇÃO

| Componente | Estado DEMO (apresentação) | Estado PRODUÇÃO |
|------------|---------------------------|-----------------|
| Status motorista | Token `[DEMO:status]` em `notes` sobrepõe cálculo | `capturedAt` real calculado em tempo real |
| Rotas no mapa | Pontos das estradas gravados pelo seed via Node.js | Backend calcula OSRM na criação da Trip + cache Redis |
| DriverDrawer | `createPortal → document.body` (fix real, já em prod) | `createPortal → document.body` (mesmo código) |
| Motoristas COMPLETED | Incluídos com `DriverLocation` < 24h (fix real) | Mesmo comportamento |
| Alertas | Sintéticos gerados no frontend por BYPASS-DEMO-ALERTAS | Via WS `driver_alert` do backend |
| Atualização posição | Seed estático + `seed:refresh-drivers` antes de apresentar | POST /driver/location a cada 3min do app do motorista |
| OSRM no browser | Zero chamadas (pontos já no banco via seed) | Zero chamadas (pontos retornados pelo endpoint) |
| Redis | Usado para WS e sessões (existente) | Adicional: cache de rotas OSRM por par cidade-origem/destino |

---

## 🔮 PRÓXIMAS FEATURES (pós-produção)

A arquitetura atual suporta naturalmente estas evoluções:

1. **WebSocket em vez de polling** — o gateway WS já existe e emite `driver_location_update`
   O portal do motorista pode trocar polling de 3min por push WS → atualização instantânea

2. **OSRM próprio via Docker** — elimina dependência da API pública
   ```yaml
   # docker-compose.yml
   osrm:
     image: ghcr.io/project-osrm/osrm-backend
     volumes: ["./data:/data"]
     command: osrm-routed --algorithm mld /data/brazil-latest.osrm
     ports: ["5001:5000"]
   ```
   Trocar URL no service: `http://osrm:5000` → sem rate limit, sem CORS

3. **Geofencing** — alertas automáticos quando motorista entra/sai de uma área
   PostgreSQL + PostGIS para queries geoespaciais eficientes

4. **Histórico de rotas** — interface para visualizar trajeto de dias anteriores
   `DriverLocation` já é persistido por 7 dias (LGPD cleanup job existente)

5. **ETA via Google Maps** — trocar Haversine por Google Distance Matrix API
   Campo `GOOGLE_MAPS_KEY` no `.env` já está previsto no service

---

## 🔑 RESUMO EXECUTIVO PARA O TECH LEAD

### Antes da apresentação: 4 itens a implementar
1. F5.16 → seed grava rotas reais → mapa mostra estradas (não linhas retas)
2. F5.14 → status fixo via token → motoristas ficam verde/amarelo/vermelho para sempre
3. F5.15 → COMPLETED visível → Tânia/Jonas/Rosa permanecem no mapa após viagem
4. F5.13 → createPortal → drawer trava na tela sem precisar scrollar

### Após a apresentação: 3 itens a remover
1. BYPASS-DEMO-STATUS em `driver-location.service.ts`
2. BYPASS-DEMO-OSRM em `prisma/seed-full.ts` (função `buildSeedRoute`)
3. BYPASS-DEMO-ALERTAS em `admin/dashboard/page.tsx`

### Para ir a produção: 2 itens a implementar
1. Adicionar campo `routePoints Json?` na Trip (migration + `db push`)
2. Implementar `getOrCalculateRoute()` no service usando Redis + OSRM no backend

### O que JÁ está pronto para produção (não precisa mudar)
- Todo o backend de rastreamento (F1-F4)
- Portal do motorista (F3)
- WS para alertas e posição em tempo real
- Job LGPD de cleanup (7 dias)
- Autenticação e RolesGuard
- Cálculo de ETA por Haversine

---

*Sistema Upgrade | RR TECNOL | v1.0 | 27/03/2026*
*Documento técnico de rastreamento — Demo, Transição e Produção*
