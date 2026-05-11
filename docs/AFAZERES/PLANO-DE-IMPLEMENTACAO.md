# 📋 PLANO DE IMPLEMENTAÇÃO — Fase 5 (F5.13–F5.16)
## Resolução dos 4 Bugs Críticos | v1.0 | 07/04/2026
## Baseado em: Deep Research Report + sobre-sistema.md v2.0 + código-fonte auditado

> **Propósito:** Plano técnico cirúrgico com código real para implementação dos 4 bugs
> que bloqueiam a apresentação executiva. Cada seção contém causa raiz confirmada,
> código pronto, pontos de atenção e critério de aceite.
>
> **Executar nesta ordem exata:** F5.16 → F5.14 → F5.15 → F5.13
> **Referências obrigatórias antes de implementar:**
> - Doc canónica: `docs/sistema-atual/` (mapas, GPS, frontend, seeds) — ver `07-integracoes-notificacoes-arquivos-mapa.md`, `04-frontend-portais-e-rotas.md`, `05-dados-prisma-migracoes-seeds.md`
> - Código: `backend/src/driver-location/`, `frontend/components/MapaMotoristas.tsx`, `frontend/components/DriverDrawer.tsx`, `backend/prisma/seed-desenvolvimento/seed-full.ts`
> - Docs antigas (`docs/arquitetura/*`, `docs/seguranca/*`) foram **removidas** em 2026-05-11; detalhe histórico de bypasses está neste plano e no Git

---

## 🔗 CONTEXTO TÉCNICO CONFIRMADO PELO DEEP RESEARCH

O relatório técnico de engenharia confirmou as 4 causas raiz e validou (ou corrigiu) cada
estratégia de fix planejada. Os insights críticos adicionados pelo deep research:

| Bug | Insight adicional do relatório |
|-----|-------------------------------|
| F5.13 | `zIndex: 200` insuficiente — usar `9999`. Scroll lock via `useEffect` cleanup no próprio DriverDrawer, não no `onClose`. Event bubbling do portal segue árvore React, não DOM. |
| F5.14 | Usar `IS_DEMO_MODE=true` env var — **nunca apagar o bloco**, apenas condicionar. Regex precisa de flag `i` para case-insensitive. |
| F5.15 | Query bifurcada (2 queries) > subquery aninhada em performance. Usar `VIRTUAL_${driverId}_COMPLETED` como chave para não colapsar cache Leaflet. Pin cinza (não vermelho) para COMPLETED. |
| F5.16 | Node.js 18 Undici tem `UND_ERR_CONNECT_TIMEOUT` — usar `Agent({ connectTimeout: 15000 })`. `overview=simplified` gera 100-300 pontos (ideal). Adicionar `L.canvas()` no Leaflet para evitar SVG lag. OSRM no frontend se torna **fallback** (não é removido, apenas rebaixado). |

---

## ═══════════════════════════════════════════════════════════
## F5.16 — BYPASS-DEMO-OSRM
## Arquivos: `backend/prisma/seed-full.ts` + `frontend/components/MapaMotoristas.tsx`
## ═══════════════════════════════════════════════════════════

### Problema confirmado
Browser dispara ~80 chamadas OSRM simultâneas (por motorista × 3 operações: rota completa +
trilha + rota restante). OSRM público tolera ~1 req/s. Rate limit silencioso → `catch{}` →
linha reta. O `AbortSignal.timeout()` gera `TimeoutError` (não `AbortError`) — ambos capturados
pelo `catch {}` sem nenhum log.

### Solução: Seed calcula OSRM no Node.js, grava como DriverLocations

#### PARTE A — seed-full.ts: adicionar função `buildSeedRoute()`

Inserir ANTES da função `runSeed_rastreamento()`:

```typescript
// ─────────────────────────────────────────────────────────────────────────────
// BYPASS-DEMO-OSRM — F5.16
// Calcula rota pelas estradas via OSRM no Node.js (sem rate limit de browser).
// Grava pontos como DriverLocation records no banco.
// REMOVER PARA PRODUÇÃO: apagar esta função e usar getOrCalculateRoute() do backend.
// Ver RASTREAMENTO_PRODUCAO_APRESENTACAO.md para solução de produção.
// ─────────────────────────────────────────────────────────────────────────────
import { fetch, Agent } from 'undici';

const _osrmAgent = new Agent({ connectTimeout: 15000 });
const _osrmDelay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function buildSeedRoute(
  originLat: number, originLng: number,
  destLat: number,   destLng: number,
): Promise<Array<{ lat: number; lng: number; speed: number; t: Date }>> {
  // Throttle obrigatório: OSRM público tolera ~1 req/s
  await _osrmDelay(800);

  // overview=simplified → Douglas-Peucker comprime para 100-300 pontos (ideal)
  // annotations=true → retorna durations por segmento para interpolação de timestamps
  const url = `https://router.project-osrm.org/route/v1/driving/` +
    `${originLng},${originLat};${destLng},${destLat}` +
    `?geometries=geojson&overview=simplified&annotations=true`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      dispatcher: _osrmAgent,
    } as any);

    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data: any = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) throw new Error('OSRM sem rota');

    const route = data.routes[0];
    // GeoJSON retorna [longitude, latitude] — inverter para [lat, lng] (Leaflet/Prisma)
    const coords: [number, number][] = route.geometry.coordinates.map(
      ([lon, lat]: [number, number]) => [lat, lon]
    );
    // durations[i] = segundos do segmento i→i+1
    const durations: number[] = route.legs[0]?.annotation?.duration ?? [];

    // Interpola timestamps: começa em (agora - duração_total) e avança por segmento
    let tsMs = Date.now() - route.duration * 1000;
    return coords.map(([lat, lng], i) => {
      const segSec = durations[i] ?? 0;
      tsMs += segSec * 1000;
      return {
        lat, lng,
        speed: 60 + Math.random() * 25, // 60-85 km/h realista
        t: new Date(tsMs),
      };
    });
  } catch (err) {
    console.warn(`  ⚠️  OSRM fallback (linha reta) para ${originLat},${originLng}→${destLat},${destLng}:`, err);
    // Fallback: 2 pontos (origem e destino) — linha reta no pior caso
    return [
      { lat: originLat, lng: originLng, speed: 0,  t: new Date(Date.now() - 3600000) },
      { lat: destLat,   lng: destLng,   speed: 0,  t: new Date() },
    ];
  }
}
// ── FIM BYPASS-DEMO-OSRM (buildSeedRoute) ──────────────────────────────────
```

#### Integração no `runSeed_rastreamento()`

Dentro do loop `for (const m of MOTORISTAS)`, substituir a criação direta dos pontos do trail
pelo resultado do `buildSeedRoute()`:

```typescript
// ANTES (pontos hardcoded do trail m.trail):
for (const p of m.trail) {
  await prisma.driverLocation.create({
    data: { driverUserId: user.id, tripId: trip.id,
            latitude: p.lat, longitude: p.lng, ... }
  });
}

// DEPOIS (com buildSeedRoute):
// Busca lat/lng da cidade origem e destino já carregadas nas variáveis C()
const originCity  = await prisma.city.findUnique({ where: { id: m.originId } });
const destCity    = await prisma.city.findUnique({ where: { id: m.destId } });

let routePoints = m.trail.map(p => ({ lat: p.lat, lng: p.lng, speed: p.spd, t: p.t }));

if (originCity?.latitude && destCity?.latitude) {
  console.log(`  🗺️  Calculando rota OSRM para ${m.name}...`);
  const osrmPts = await buildSeedRoute(
    originCity.latitude, originCity.longitude,
    destCity.latitude,   destCity.longitude,
  );
  if (osrmPts.length > 2) routePoints = osrmPts;
}

for (const p of routePoints) {
  await prisma.driverLocation.create({
    data: {
      driverUserId: user.id, tripId: trip.id,
      latitude: p.lat, longitude: p.lng,
      speed: p.speed, heading: null, accuracy: 8.5,
      source: 'GPS_DEVICE', capturedAt: p.t,
    },
  });
}
console.log(`  ✅ ${m.name} (${routePoints.length} pts GPS via OSRM)`);
```

#### PARTE B — MapaMotoristas.tsx: rebaixar OSRM para fallback

Modificar `updateMap()` — a lógica de trilha percorrida passa a priorizar o trail do banco:

```typescript
// ANTES: buildRoadTrail(raw) chamava OSRM para cada segmento
// DEPOIS: se trail.length >= 2, desenha direto; OSRM só como fallback

let trailPts: [number, number][] = trailCacheRef.current.get(tripKey) ?? [];

if (!trailPts.length) {
  // Prioridade 1: pontos do banco (seed OSRM ou GPS real)
  if ((driver.trail?.length ?? 0) >= 2) {
    trailPts = driver.trail!.map(p => [p.latitude, p.longitude]);
    // NÃO chama OSRM — pontos já seguem estradas (seed F5.16)
  } else if (fullRoute.length && driver.progress > 0) {
    // Prioridade 2: fatia da rota completa pelo progresso
    trailPts = sliceByProgress(fullRoute, driver.progress);
  }
  // Prioridade 3 (fallback produção): OSRM apenas se sem trail e sem rota completa
  // Mantido como fallback silencioso para motoristas reais com poucos pontos GPS
  if (trailPts.length > 1) trailCacheRef.current.set(tripKey, trailPts);
}
```

Adicionar `L.canvas()` na inicialização do mapa (dentro do `import('leaflet').then`):

```typescript
// Forçar renderização por canvas (evita SVG lag com 11+ motoristas)
const renderer = L.canvas();
// Usar em todas as polylines: L.polyline(pts, { renderer, ... })
```

### Pontos de atenção
- `undici` já é dependência transitiva do Node.js 18 — sem necessidade de instalar
- O throttle de 800ms faz o seed demorar ~9-10 segundos para 11 motoristas — **normal**
- `overview=simplified` é obrigatório — `overview=full` retorna milhares de pontos
- Timestamps interpolados precisam ter o último ponto com `capturedAt` recente (now - 3min)
  para o motorista aparecer como ONLINE no serviço de status

### Critério de aceite
- [ ] `npm run seed:full` completa sem HTTP 429 ou UND_ERR_CONNECT_TIMEOUT
- [ ] No mapa, polilinhas seguem estradas reais (não linhas retas)
- [ ] Aba Network do browser não mostra nenhuma chamada para `router.project-osrm.org`
- [ ] `console.log` do seed exibe "X pts GPS via OSRM" para cada motorista


---

## ═══════════════════════════════════════════════════════════
## F5.14 — BYPASS-DEMO-STATUS
## Arquivos: `backend/src/driver-location/driver-location.service.ts` + `backend/prisma/seed-full.ts`
## ═══════════════════════════════════════════════════════════

### Problema confirmado
Motoristas do seed nunca fazem `POST /driver/location`. O campo `capturedAt` da última
`DriverLocation` envelhece em tempo real. Em 5 min → STOPPED. Em 15 min → OFFLINE.
`refreshDriverTimestamps()` existe mas é frágil: deve ser rodado "5 min antes" e pode ser
esquecido. O bypass por token é determinístico e não requer ação manual durante a apresentação.

### Descoberta crítica do deep research
**Nunca apagar o bloco de bypass** — condicioná-lo por `IS_DEMO_MODE=true` no `.env`.
Em produção, a variável não existe → código ignorado → zero risco de vazamento.

### PARTE A — driver-location.service.ts: adicionar bypass no `getMotoristaAtivos()`

Localizar o bloco de cálculo de status dentro de `getMotoristaAtivos()`:

```typescript
// CÓDIGO ATUAL (após calcular diffMin):
let status: 'online' | 'offline' | 'stopped' = 'offline';
if (diffMin <= 5)  status = 'online';
else if (diffMin <= 15) status = 'stopped';

// ADICIONAR LOGO APÓS (antes de calcular ETA):
// ── BYPASS-DEMO-STATUS — F5.14 ─────────────────────────────────────────────
// Sobrepõe status calculado por tempo com token semântico no campo Trip.notes.
// Ativo APENAS quando IS_DEMO_MODE=true no .env — nunca vaza para produção.
// Como remover: apagar este bloco inteiro. Em produção status é calculado pelo capturedAt.
// Ver RASTREAMENTO_PRODUCAO_APRESENTACAO.md §REMOÇÃO-BYPASSES.
if (process.env.IS_DEMO_MODE === 'true' && trip.notes) {
  const demoMatch = trip.notes.match(/\[DEMO:(online|stopped|offline)\]/i);
  if (demoMatch?.[1]) {
    status = demoMatch[1].toLowerCase() as 'online' | 'offline' | 'stopped';
  }
}
// ── FIM BYPASS-DEMO-STATUS ──────────────────────────────────────────────────
```

### PARTE B — seed-full.ts: adicionar token nas trips de cada motorista demo

No `runSeed_rastreamento()`, ao criar cada trip, o campo `notes` recebe o token correspondente:

```typescript
// Tabela de mapeamento: email → token de status
const DEMO_STATUS_MAP: Record<string, string> = {
  'carlos.souza.demo@qualifica.com':    '[DEMO:online]',   // 45% MA→PI
  'marina.costa.demo@qualifica.com':    '[DEMO:online]',   // 88% arriving_soon
  'paulo.ramos.demo@qualifica.com':     '[DEMO:online]',   // 8% iniciando
  'diego.alves.demo@qualifica.com':     '[DEMO:online]',   // 35% rota longa
  'ana.lima.demo@qualifica.com':        '[DEMO:stopped]',  // long_stop
  'fabio.nunes.demo@qualifica.com':     '[DEMO:stopped]',  // parado AC
  'roberto.freitas.demo@qualifica.com': '[DEMO:offline]',  // no_signal
  'lea.santos.demo@qualifica.com':      '[DEMO:offline]',  // sem sinal MA
};

// Dentro do loop, ao criar a trip:
const trip = await prisma.trip.create({
  data: {
    truckId: truck.id,
    driverName: m.name,
    driverUserId: user.id,
    originCityId: m.originId,
    destinationCityId: m.destId,
    departureDate: hrs(m.depHrs),
    expectedArrivalDate: new Date(Date.now() + m.expHrs * 3600000),
    status: 'IN_TRANSIT',
    // Token BYPASS-DEMO-STATUS embutido no texto da nota
    notes: `Demo: ${m.name} ${DEMO_STATUS_MAP[m.email] ?? ''}`.trim(),
  },
});
```

### PARTE C — .env: adicionar variável de ambiente

No arquivo `backend/.env` (e `backend/.env.example`):

```env
# DEMO MODE — habilita bypasses de apresentação (BYPASS-DEMO-STATUS etc.)
# NUNCA colocar true em produção — apenas no ambiente de desenvolvimento/demo
IS_DEMO_MODE=true
```

### Por que não aplicar a COMPLETED (Tânia, Jonas, Rosa)?
Conforme confirmado no relatório: `getMotoristaAtivos()` filtra `status: 'IN_TRANSIT'`.
As trips COMPLETED nunca entram no loop — o bypass não se aplica e não é necessário.
Esses motoristas são cobertos pelo F5.15 (BUG-COMPLETED-MAPA).

### Por que token é mais robusto que `refreshDriverTimestamps()`?
`refreshDriverTimestamps()` deve ser rodado exatamente 5 min antes e depende de ação manual.
O token é declarativo: independe de quando o seed foi rodado, sempre funciona.
Recomendação: **manter ambos** — token como garantia principal, refresh como fallback.

### Pontos de atenção
- A flag `i` no regex é obrigatória: `/\[DEMO:(online|stopped|offline)\]/i`
- O campo `notes` pode ter texto antes/depois do token — `match()` localiza em qualquer posição
- Se `IS_DEMO_MODE` não estiver definido → `undefined === 'true'` → `false` → bypass ignorado ✓
- Nunca commitar `.env` com `IS_DEMO_MODE=true` — apenas `.env.example`

### Prevenção de regressão em produção
Mesmo que um usuário real escreva `[DEMO:online]` num campo notes de trip real,
sem `IS_DEMO_MODE=true` o bypass é ignorado pelo `if (process.env.IS_DEMO_MODE === 'true')`.
Proteção em duas camadas: env var + token formato improvável em uso orgânico.

### Critério de aceite
- [ ] Com `IS_DEMO_MODE=true`: motoristas ONLINE/STOPPED/OFFLINE aparecem corretos no mapa independente da hora
- [ ] Com `IS_DEMO_MODE=false` (ou variável ausente): status é calculado pelo capturedAt (comportamento natural)
- [ ] Campo `notes` das trips demo contém os tokens corretos (verificar via Prisma Studio ou SQL)
- [ ] `refreshDriverTimestamps()` ainda funciona como backup


---

## ═══════════════════════════════════════════════════════════
## F5.15 — Fix BUG-COMPLETED-MAPA
## Arquivo: `backend/src/driver-location/driver-location.service.ts`
## ═══════════════════════════════════════════════════════════

### Problema confirmado
`getMotoristaAtivos()` usa `WHERE status = 'IN_TRANSIT'`. Ao completar a viagem,
o motorista some do mapa imediatamente. Regra de negócio correta: motorista deve
permanecer visível (com status `offline`) por 24h ou até iniciar nova viagem.

### Descoberta crítica do deep research
**Performance:** Query bifurcada (2 queries no Node.js) supera subquery aninhada.
PostgreSQL com `NOT IN` sobre subquery pode fazer full scan; array em memória com `notIn` usa índice.
**Cache Leaflet:** usar `VIRTUAL_${driverId}_COMPLETED` como `trip.id` para não colapsar
`fullRouteCacheRef` e `trailCacheRef` (keyed por tripKey).
**Visual:** pin cinza/desaturado para COMPLETED — não vermelho (evita "dissonância cognitiva").

### Implementação: expandir `getMotoristaAtivos()` com 2ª query

```typescript
async getMotoristaAtivos() {
  // ──────────────────────────────────────────────
  // PARTE 1: motoristas IN_TRANSIT (lógica atual)
  // ──────────────────────────────────────────────
  const trips = await this.prisma.trip.findMany({
    where: { status: 'IN_TRANSIT', driverUserId: { not: null } },
    include: {
      driverUser:      { select: { id: true, name: true } },
      originCity:      { select: { name: true, state: true, latitude: true, longitude: true } },
      destinationCity: { select: { name: true, state: true, latitude: true, longitude: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // DEDUP: mantém apenas a trip mais recente por motorista
  const uniqueTrips = trips.reduce((acc, trip) => {
    if (!acc.has(trip.driverUserId!)) acc.set(trip.driverUserId!, trip);
    return acc;
  }, new Map<string, typeof trips[0]>());
  const dedupedTrips = Array.from(uniqueTrips.values());

  const activeDriverIds = dedupedTrips.map(t => t.driverUserId!);

  // Processa ativos (lógica existente — ETA, status, progresso)
  const activeResults = await Promise.all(dedupedTrips.map(async (trip) => {
    // ... lógica atual de cálculo de status, ETA, progresso ...
    // BYPASS-DEMO-STATUS inserido aqui conforme F5.14
    const ultima = await this.prisma.driverLocation.findFirst({
      where: { driverUserId: trip.driverUserId! },
      orderBy: { capturedAt: 'desc' },
    });
    const agora = new Date();
    const diffMin = ultima
      ? (agora.getTime() - new Date(ultima.capturedAt).getTime()) / 60000
      : Infinity;
    let status: 'online' | 'offline' | 'stopped' = 'offline';
    if (diffMin <= 5)  status = 'online';
    else if (diffMin <= 15) status = 'stopped';

    // BYPASS-DEMO-STATUS — F5.14
    if (process.env.IS_DEMO_MODE === 'true' && trip.notes) {
      const demoMatch = trip.notes.match(/\[DEMO:(online|stopped|offline)\]/i);
      if (demoMatch?.[1]) status = demoMatch[1].toLowerCase() as typeof status;
    }

    let eta = null;
    let progress = 0;
    if (ultima && trip.destinationCity.latitude && trip.destinationCity.longitude) {
      eta = await this.calcularETA(
        trip.driverUserId!,
        ultima.latitude, ultima.longitude,
        trip.destinationCity.latitude, trip.destinationCity.longitude,
      );
      if (trip.originCity.latitude && trip.originCity.longitude) {
        const totalKm = this.haversineKm(
          trip.originCity.latitude, trip.originCity.longitude,
          trip.destinationCity.latitude, trip.destinationCity.longitude,
        );
        const restanteKm = eta.distanciaKm;
        progress = totalKm > 0 ? Math.min(100, Math.round(((totalKm - restanteKm) / totalKm) * 100)) : 0;
      }
    }

    return {
      userId:   trip.driverUserId,
      name:     trip.driverUser?.name,
      trip: {
        id:             trip.id,
        origin:         `${trip.originCity.name}/${trip.originCity.state}`,
        destination:    `${trip.destinationCity.name}/${trip.destinationCity.state}`,
        originLat:      trip.originCity.latitude,
        originLng:      trip.originCity.longitude,
        destinationLat: trip.destinationCity.latitude,
        destinationLng: trip.destinationCity.longitude,
        startedAt:      trip.departureDate,
      },
      lastLocation: ultima ? {
        lat: ultima.latitude, lng: ultima.longitude,
        speed: ultima.speed, heading: ultima.heading, capturedAt: ultima.capturedAt,
      } : null,
      eta, progress, status,
    };
  }));

  // ──────────────────────────────────────────────────────────────────
  // PARTE 2: motoristas COMPLETED (BUG-COMPLETED-MAPA — F5.15)
  // Busca drivers com DriverLocation < 24h que NÃO têm trip IN_TRANSIT
  // ──────────────────────────────────────────────────────────────────
  const vinte4hAtras = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Query bifurcada (abordagem mais performática — evita subquery aninhada)
  const recentLocations = await this.prisma.driverLocation.findMany({
    where: {
      driverUserId: { notIn: activeDriverIds },   // exclui quem já está IN_TRANSIT
      capturedAt:   { gte: vinte4hAtras },
    },
    distinct:  ['driverUserId'],                  // uma linha por motorista (mais recente)
    orderBy:   [{ driverUserId: 'asc' }, { capturedAt: 'desc' }],
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  const completedResults = await Promise.all(recentLocations.map(async (loc) => {
    // Busca a última trip COMPLETED do motorista para exibir rota no mapa
    const lastTrip = await this.prisma.trip.findFirst({
      where: {
        driverUserId: loc.driverUserId,
        status: 'COMPLETED',
      },
      include: {
        originCity:      { select: { name: true, state: true, latitude: true, longitude: true } },
        destinationCity: { select: { name: true, state: true, latitude: true, longitude: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      userId: loc.driverUserId,
      name:   loc.user?.name ?? 'Motorista',
      trip: {
        // Chave virtualizada — evita colapso do cache Leaflet com trips reais
        id:             lastTrip ? `${lastTrip.id}_COMPLETED` : `VIRTUAL_${loc.driverUserId}_OFFLINE`,
        origin:         lastTrip ? `${lastTrip.originCity.name}/${lastTrip.originCity.state}` : '—',
        destination:    lastTrip ? `${lastTrip.destinationCity.name}/${lastTrip.destinationCity.state}` : '—',
        originLat:      lastTrip?.originCity.latitude      ?? null,
        originLng:      lastTrip?.originCity.longitude     ?? null,
        destinationLat: lastTrip?.destinationCity.latitude ?? null,
        destinationLng: lastTrip?.destinationCity.longitude ?? null,
        startedAt:      lastTrip?.departureDate ?? loc.capturedAt,
      },
      lastLocation: {
        lat: loc.latitude, lng: loc.longitude,
        speed: loc.speed, heading: loc.heading, capturedAt: loc.capturedAt,
      },
      // Propriedades fixas para motoristas COMPLETED
      eta:      null,
      progress: 100,
      status:   'offline' as const,
      isCompleted: true,  // flag para frontend aplicar pin cinza
    };
  }));

  // Retorna união: ativos + completados recentes
  return [...activeResults, ...completedResults];
}
```

### Ajuste no frontend: MapaMotoristas.tsx — pin cinza para COMPLETED

No `updateMap()`, após verificar `driver.status`:

```typescript
// Detecta motorista que concluiu viagem (via flag ou id virtualizado)
const isCompleted = (driver as any).isCompleted === true
                 || driver.trip.id.includes('_COMPLETED')
                 || driver.trip.id.includes('VIRTUAL_');

// Cor do pin: cinza para COMPLETED, status normal para IN_TRANSIT
const color = isCompleted ? '#94A3B8' :
  (STATUS_COLOR[driver.status] || STATUS_COLOR.offline);
```

### Pontos de atenção
- `distinct: ['driverUserId']` com Prisma 5.22: funciona com PostgreSQL, confirmar se
  `orderBy` combinado com `distinct` gera o resultado esperado (último capturedAt por driver)
- Se `distinct + orderBy` não garantir o mais recente, usar `groupBy` alternativo
- A flag `isCompleted: true` não está no tipo `DriverMarker` — adicionar como `isCompleted?: boolean`
- Índices necessários no banco (já existem): `@@index([driverUserId, capturedAt])` em `DriverLocation`

### Critério de aceite
- [ ] Motorista completa viagem → pin permanece no mapa em cinza por até 24h
- [ ] Após 24h ou ao iniciar nova viagem, pin desaparece naturalmente
- [ ] Mapa não faz chamadas OSRM extras para o motorista COMPLETED (trip.id virtualizado)
- [ ] GET /driver/location/active retorna motoristas COMPLETED na lista (verificar via curl)
- [ ] ETA é `null` e progress é `100` para todos os COMPLETED


---

## ═══════════════════════════════════════════════════════════
## F5.13 — Fix BUG-DRAWER-TRANSFORM
## Arquivo: `frontend/app/admin/dashboard/page.tsx` + `frontend/components/DriverDrawer.tsx`
## ═══════════════════════════════════════════════════════════

### Causa raiz confirmada (W3C CSS Transforms Module Level 1)
`animate-fade-in` aplica `transform: translateY(0)` com `fill-mode: both` → o transform
persiste após a animação → CSS Level 3 obriga que qualquer ancestral com `transform ≠ none`
seja o containing block para `position: fixed` → drawer ancorado no div pai, não no viewport.
**Não é bug de browser: é comportamento especificado pela W3C.**

### Solução confirmada pelo deep research
`React.createPortal(drawerContent, document.body)` — transplanta o nó DOM para fora de
qualquer ancestral com transform. A única falha seria se o próprio `<body>` tivesse transform
(antipadrão severo — não é o caso aqui).

### Descobertas críticas adicionais do deep research

1. **`zIndex: 200` é insuficiente** — toasts, sidebars e bibliotecas de terceiros frequentemente
   usam valores altos. Usar `zIndex: 9999`.

2. **Mounted Pattern obrigatório** — `createPortal` com `document.body` falha no servidor
   (SSR). O `dynamic import com ssr:false` não garante o mesmo isolamento. O padrão
   `useState(false) + useEffect(() => setMounted(true))` é o correto para Next.js 14 App Router.

3. **Scroll lock via `useEffect` cleanup** — manipular `document.querySelector` no `onClose`
   viola o princípio declarativo do React. O scroll lock deve ser gerenciado pelo próprio
   `DriverDrawer` via cleanup do `useEffect`.

4. **Event bubbling** — eventos no portal sobem pela árvore React (não pelo DOM). Clique
   dentro do drawer aciona handlers do ancestral React se não houver `stopPropagation`.

### PARTE A — DriverDrawer.tsx: refatorar para usar createPortal

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { DriverMarker } from './MapaMotoristas';

interface DriverDrawerProps {
  driver: DriverMarker | null;
  onClose: () => void;
}

export default function DriverDrawer({ driver, onClose }: DriverDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Gerencia scroll lock de forma declarativa (cleanup restaura ao desmontar)
  useEffect(() => {
    if (!driver || !mounted) return;
    const contentEl = document.querySelector('.admin-content') as HTMLElement | null;
    if (contentEl) contentEl.style.overflowY = 'hidden';
    return () => {
      if (contentEl) contentEl.style.overflowY = 'auto';
    };
  }, [driver, mounted]);

  // Guarda SSR: sem mounted ou sem driver → não renderiza nada
  if (!mounted || !driver) return null;

  const STATUS_COLOR = { online: '#22C55E', stopped: '#F59E0B', offline: '#EF4444' };
  const STATUS_LABEL = { online: 'Online', stopped: 'Parado', offline: 'Sem sinal' };
  const isCompleted  = (driver as any).isCompleted === true;
  const stColor      = isCompleted ? '#94A3B8' : (STATUS_COLOR[driver.status] || '#EF4444');

  const drawerContent = (
    <>
      {/* Overlay semitransparente */}
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
          zIndex: 9998,
        }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, width: 380, height: '100vh',
          zIndex: 9999,    // valor alto — sobrepõe toasts e sidebars
          background: '#0F172A', borderLeft: '1px solid rgba(255,214,0,0.15)',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
          animation: 'slideInRight .25s cubic-bezier(.22,1,.36,1)',
        }}
        // Impede propagação para o overlay (event bubbling via árvore React)
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: stColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '1rem', flexShrink: 0 }}>
            {driver.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{driver.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginTop: '.15rem' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: stColor, display: 'inline-block' }} />
              <span style={{ fontSize: '.72rem', color: stColor, fontWeight: 700 }}>
                {isCompleted ? 'Viagem concluída' : STATUS_LABEL[driver.status]}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '1.2rem', cursor: 'pointer', padding: '.25rem', lineHeight: 1 }} aria-label="Fechar">✕</button>
        </div>

        {/* Conteúdo */}
        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
          {/* Rota */}
          <div style={{ padding: '.85rem 1rem', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '.6rem', color: '#475569', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '.5rem' }}>ROTA</div>
            <div style={{ fontSize: '.85rem', color: '#F1F5F9', fontWeight: 700 }}>
              {driver.trip.origin}
              <span style={{ color: '#FFD600', margin: '0 .35rem' }}>→</span>
              {driver.trip.destination}
            </div>
          </div>

          {/* Progresso + ETA */}
          {!isCompleted && (
            <div style={{ padding: '.85rem 1rem', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '.6rem', color: '#475569', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '.5rem' }}>PROGRESSO</div>
              <div style={{ height: 5, borderRadius: 3, background: '#1E293B', overflow: 'hidden', marginBottom: '.5rem' }}>
                <div style={{ height: '100%', width: `${driver.progress}%`, background: 'linear-gradient(90deg,#22C55E,#86EFAC)', borderRadius: 3 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: '#64748B' }}>
                <span>{driver.progress}% concluído</span>
                {driver.eta && <span style={{ color: '#0891B2', fontWeight: 700 }}>
                  ETA: {driver.eta.minutos < 60 ? `${driver.eta.minutos}min` : `${Math.floor(driver.eta.minutos / 60)}h${driver.eta.minutos % 60}min`}
                </span>}
              </div>
            </div>
          )}

          {/* Última posição */}
          {driver.lastLocation && (
            <div style={{ padding: '.85rem 1rem', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '.6rem', color: '#475569', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '.5rem' }}>ÚLTIMA POSIÇÃO</div>
              <div style={{ fontSize: '.78rem', color: '#94A3B8', fontFamily: '"JetBrains Mono",monospace' }}>
                {driver.lastLocation.lat.toFixed(4)}, {driver.lastLocation.lng.toFixed(4)}
              </div>
              {driver.lastLocation.speed != null && (
                <div style={{ fontSize: '.72rem', color: '#059669', marginTop: '.3rem' }}>
                  {Math.round(driver.lastLocation.speed)} km/h
                </div>
              )}
              <div style={{ fontSize: '.65rem', color: '#475569', marginTop: '.3rem' }}>
                {new Date(driver.lastLocation.capturedAt).toLocaleString('pt-BR')}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // Portal: renderiza em document.body, fora de qualquer ancestral com transform
  return createPortal(drawerContent, document.body);
}
```

### PARTE B — dashboard/page.tsx: ajustar uso do DriverDrawer

Remover a referência ao bloco `{/* F4.4: Drawer lateral do motorista */}` atual e substituir por:

```tsx
// Remover esta linha (DriverDrawer inline que sofre com o containing block):
// <DriverDrawer driver={drawerDriver} onClose={() => { ... }} />

// O DriverDrawer agora é auto-gerenciado via createPortal — apenas passar props:
<DriverDrawer
  driver={drawerDriver}
  onClose={() => {
    setDrawerDriver(null);
    setSelectedDriver(null);
    // scroll lock é gerenciado internamente pelo DriverDrawer via useEffect cleanup
  }}
/>

// Remover também as linhas que manipulam overflowY diretamente:
// const contentEl = document.querySelector('.admin-content') as HTMLElement | null;
// if (contentEl) contentEl.style.overflowY = 'hidden'; // ← remover
// if (contentEl) contentEl.style.overflowY = 'auto';   // ← remover
```

O `dynamic` import do DriverDrawer já existe no topo do arquivo:
```tsx
const DriverDrawer = dynamic(() => import('@/components/DriverDrawer'), { ssr: false });
```
Este import pode ser mantido ou removido — o `mounted check` dentro do `DriverDrawer` já
garante SSR-safe. Manter o `dynamic` não causa problemas e é uma camada extra de segurança.

### Pontos de atenção
- **`zIndex: 9999`** — verificar se algum outro elemento (sidebar, header, toast) usa valor >= 9999
  e ajustar a hierarquia se necessário
- **Event bubbling** — o `onClick={e => e.stopPropagation()}` no drawer impede que cliques
  internos fechem o drawer via overlay. Verificar se outros handlers de clique no dashboard
  não disparam acidentalmente
- **`slideInRight` animation** — esta animação no próprio drawer não cria containing block
  porque o drawer está em `document.body` (sem ancestral com transform problemático)
- **TypeScript** — adicionar `isCompleted?: boolean` ao tipo `DriverMarker` em `MapaMotoristas.tsx`

### Critério de aceite
- [ ] Abrir o drawer → ele aparece fixo no lado direito do viewport, independente do scroll da página
- [ ] DevTools DOM: `driver-drawer-container` (ou equivalente) aparece como filho direto de `<body>`
- [ ] Nenhum aviso de Hydration Mismatch no console ao recarregar a página
- [ ] Scroll da `.admin-content` fica bloqueado com drawer aberto e restaurado ao fechar
- [ ] Clicar no overlay fecha o drawer; clicar dentro do drawer não fecha


---

## ═══════════════════════════════════════════════════════════
## ORDEM DE EXECUÇÃO — CHECKLIST COMPLETO
## ═══════════════════════════════════════════════════════════

### Por que esta ordem?

| Ordem | Item | Motivo |
|-------|------|--------|
| 1º | **F5.16** (seed OSRM) | Independente — só altera `seed-full.ts` + `MapaMotoristas.tsx`. Sem dependências. |
| 2º | **F5.14** (bypass status) | Altera `driver-location.service.ts` + `seed-full.ts`. Deve vir antes de F5.15 pois ambos alteram o mesmo service. |
| 3º | **F5.15** (COMPLETED visível) | Altera `driver-location.service.ts`. Requer que F5.14 já esteja integrado (edita o mesmo bloco `getMotoristaAtivos`). |
| 4º | **F5.13** (createPortal) | Independente — só altera `DriverDrawer.tsx` + `dashboard/page.tsx`. Pode ser último. |

### ⚠️ Atenção interdependente F5.14 + F5.15
Ambos modificam `getMotoristaAtivos()` em `driver-location.service.ts`.
Se executados em sessões separadas: **F5.14 primeiro**, commit, depois F5.15.
Se executados na mesma sessão: implementar F5.14 primeiro, depois adicionar F5.15 logo abaixo.
Nunca editar o mesmo bloco de código em paralelo sem consolidar.

---

### CHECKLIST DE EXECUÇÃO (por ordem)

```
── F5.16 — BYPASS-DEMO-OSRM ─────────────────────────────────────────────────
□ Instalar/verificar que 'undici' está disponível (transitivo do Node.js 18)
□ Adicionar função buildSeedRoute() em seed-full.ts (ANTES de runSeed_rastreamento)
□ Integrar buildSeedRoute() no loop for (const m of MOTORISTAS)
□ Atualizar updateMap() em MapaMotoristas.tsx: prioridade trail.length >= 2
□ Adicionar L.canvas() renderer nas polylines do Leaflet
□ Rodar: npx tsx prisma/seed-full.ts
□ Verificar: log mostra "X pts GPS via OSRM" para cada motorista
□ Verificar: mapa mostra polilinhas nas estradas, sem chamadas ao OSRM no Network
□ npx tsc --noEmit → zero erros

── F5.14 — BYPASS-DEMO-STATUS ──────────────────────────────────────────────
□ Adicionar IS_DEMO_MODE=true em backend/.env
□ Adicionar IS_DEMO_MODE=<ver_instrucoes> em backend/.env.example
□ Adicionar DEMO_STATUS_MAP em seed-full.ts (runSeed_rastreamento)
□ Passar o token correto no campo notes de cada trip criada
□ Adicionar bloco BYPASS-DEMO-STATUS em getMotoristaAtivos() do service
□ Testar: rodar seed + verificar status dos motoristas no mapa
□ Testar: IS_DEMO_MODE=false → status calculado normalmente (não pelo token)
□ npx tsc --noEmit → zero erros

── F5.15 — FIX BUG-COMPLETED-MAPA ─────────────────────────────────────────
□ Expandir getMotoristaAtivos() com a 2ª query (recentLocations)
□ Adicionar tipo isCompleted?: boolean em DriverMarker (MapaMotoristas.tsx)
□ Ajustar cor do pin no updateMap() para cinza quando isCompleted === true
□ Testar: motorista conclui viagem → pin permanece cinza no mapa
□ Testar: GET /driver/location/active retorna motoristas COMPLETED
□ npx tsc --noEmit → zero erros

── F5.13 — FIX BUG-DRAWER-TRANSFORM ──────────────────────────────────────
□ Refatorar DriverDrawer.tsx para usar createPortal
□ Implementar mounted check (useState + useEffect)
□ Implementar scroll lock via useEffect cleanup (não no onClose)
□ Ajustar zIndex para 9999 (overlay: 9998, drawer: 9999)
□ Remover manipulação manual de overflowY do dashboard/page.tsx
□ Testar: drawer aparece fixo no viewport ao rolar a página
□ Verificar no DevTools: drawer é filho direto de <body>
□ Verificar: sem Hydration Mismatch no console
□ npx tsc --noEmit → zero erros

── VALIDAÇÃO FINAL ────────────────────────────────────────────────────────
□ npm run build (backend + frontend) → zero erros
□ Seed completo: npm run seed:full
□ Verificar 11 motoristas no mapa com status correto
□ Testar drawer em todos os motoristas (online, stopped, offline, completed)
□ Testar filtros por estado e por motorista
□ Testar alertas (no_signal, long_stop, arriving_soon)
□ npx tsx prisma/seed-full.ts --refresh-drivers (5 min antes da apresentação)
```

---

## ═══════════════════════════════════════════════════════════
## REMOÇÃO PÓS-APRESENTAÇÃO (Fase 6)
## ═══════════════════════════════════════════════════════════

> Executar após a apresentação executiva. Instruções históricas estavam em `docs/arquitetura/RASTREAMENTO_PRODUCAO_APRESENTACAO.md` (removido); usar esta secção + código + `docs/sistema-atual/07-integracoes-notificacoes-arquivos-mapa.md`

| # | Bypass | Arquivo | Ação | Quando |
|---|--------|---------|------|--------|
| 1 | BYPASS-DEMO-STATUS | `driver-location.service.ts` | Apagar bloco entre `// BYPASS-DEMO-STATUS` e `// FIM BYPASS-DEMO-STATUS` | Após apresentação |
| 2 | BYPASS-DEMO-OSRM | `prisma/seed-full.ts` | Apagar função `buildSeedRoute()` e referências | Após implementar P1/P2 de produção |
| 3 | BYPASS-DEMO-ALERTAS | `admin/dashboard/page.tsx` | Apagar bloco `// ── BYPASS-DEMO-ALERTAS ──` | Após produção com motoristas reais |
| 4 | IS_DEMO_MODE | `backend/.env` | Remover ou setar `false` | Após apresentação |

### Substituições de produção necessárias (Fase 6)

**P1 — routePoints na Trip (migration Prisma):**
```prisma
model Trip {
  ...
  routePoints       Json?      // [[lat,lng],...] pré-calculado via OSRM backend
  routePointsCalcAt DateTime?
}
```

**P2 — getOrCalculateRoute() no backend:**
- Chave Redis: `osrm:route:{originCityId}:{destCityId}` TTL 7 dias
- Cálculo único por par de cidades na vida do sistema
- Retornar `routePoints` no `GET /driver/location/active`
- Frontend usa `driver.trip.routePoints` — zero OSRM no browser

---

## ═══════════════════════════════════════════════════════════
## REFERÊNCIAS CRUZADAS
## ═══════════════════════════════════════════════════════════

| Fonte | Relação com este plano |
|-------|------------------------|
| `docs/sistema-atual/07-integracoes-notificacoes-arquivos-mapa.md` | Mapas, OSRM, driver location, MinIO |
| `docs/sistema-atual/04-frontend-portais-e-rotas.md` | Rotas admin/driver; componentes de mapa |
| `docs/sistema-atual/05-dados-prisma-migracoes-seeds.md` | Seed `seed-desenvolvimento/seed-full.ts`, migrations |
| `docs/sistema-atual/README.md` | Índice da documentação canónica |
| Git / este ficheiro | Bypasses e bugs F5.13–F5.16 descritos nas secções acima |

---

*Sistema Upgrade | RR TECNOL | PLANO-DE-IMPLEMENTACAO v1.0 | 07/04/2026*
*Baseado em: Relatório de Arquitetura e Engenharia (Deep Research) + sobre-sistema.md v2.0*
*Revisado por: Claude (Auditor) | A ser executado por: Antygravity (Windsurf/Sonnet)*

---

## ═══════════════════════════════════════════════════════════
## F5.18 — FEATURE: UPLOAD DE DOCUMENTOS COMPROBATÓRIOS
## Módulos: Reembolsos + Imprevistos (Portal do Motorista)
## Prioridade: Pós-auditoria | Status: 📋 BACKLOG
## ═══════════════════════════════════════════════════════════

> **Origem:** Solicitação do cliente — 07/04/2026
> **Motivação:** Reembolsos e Imprevistos precisam de comprovação documental (atestados, recibos,
> declarações) anexada pelo motorista diretamente no formulário, eliminando o envio avulso
> por WhatsApp/e-mail ao coordenador.
> **Quando implementar:** Após a auditoria executiva do cliente. Não bloqueia a apresentação atual.

---

### Schema já preparado (sem migration necessária)

```prisma
model Absence       { documentUrl String? }  // ← campo já existe
model Reimbursement { receiptUrl  String? }  // ← campo já existe
```

---

### O que o motorista poderá fazer

- Nos formulários de **Registrar Imprevisto** e **Solicitar Reembolso**, um campo opcional
  "Documento Comprobatório" que aceita:
  - Imagem: `.jpg`, `.jpeg`, `.png`, `.webp`
  - Documento: `.pdf`
  - Tamanho máximo: **10 MB**
- **Pré-visualização inline** antes do envio:
  - Imagem → thumbnail 80×80px com botão de remoção
  - PDF → ícone PDF + nome do arquivo e botão de remoção
- Após o registro, o card exibe ícone **📎** clicável que abre o documento em nova aba
- O ADM vê o link/documento ao revisar os registros no painel admin

---

### Arquitetura: fluxo de upload em 2 etapas

```
1. UPLOAD DO ARQUIVO
   Frontend → POST /upload  (multipart/form-data, campo: "file")
   Backend  → valida tipo/tamanho → salva no MinIO → retorna { url: string }

2. REGISTRO COM URL RESOLVIDA
   Frontend → POST /driver/absences  { type, date, description, documentUrl }
             ou POST /reimbursements { type, amount, description, receiptUrl }
```

---

### Backend — Novo endpoint POST /upload

**Arquivo novo:** `backend/src/upload/upload.controller.ts`

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
@UseGuards(JwtAuthGuard)
async uploadFile(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    const ALLOWED = ['image/jpeg','image/png','image/webp','application/pdf'];
    if (!ALLOWED.includes(file.mimetype)) throw new BadRequestException('Tipo de arquivo não permitido');
    const key = `docs/${req.user.id}/${Date.now()}-${randomUUID()}${path.extname(file.originalname)}`;
    await minioClient.putObject(process.env.MINIO_BUCKET, key, file.buffer);
    return { url: `${process.env.MINIO_PUBLIC_URL}/${process.env.MINIO_BUCKET}/${key}` };
}
```

---

### Frontend — Componente FileInput reutilizável

**Arquivo novo:** `frontend/components/ui/FileInput.tsx`

```tsx
// Props: value: File | null, onChange: (f: File | null) => void, label?: string
// UX:
//   - Área de drop estilizada (borda tracejada amarela, ícone 📁)
//   - Texto: "Clique ou arraste um arquivo (JPG, PNG, PDF · max 10 MB)"
//   - Preview automático: imagem → thumbnail | PDF → ícone + nome
//   - Botão "×" para remover o arquivo selecionado
```

#### Integração no ModalRegistrar (imprevistos)

```typescript
const [docFile, setDocFile] = useState<File | null>(null);

// No handleSubmit:
let documentUrl: string | undefined;
if (docFile) {
    const fd = new FormData();
    fd.append('file', docFile);
    const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    documentUrl = res.data.url;
}
await api.post('/driver/absences', { ...form, documentUrl });
```

#### Integração no modal de Reembolsos

Mesma lógica — `receiptUrl` ao invés de `documentUrl`.

---

### Pontos de atenção

- **Bucket MinIO** `qualifica-docs` deve existir (criar via UI MinIO ou CLI)
- **Signed URLs** são preferíveis para segurança — salvar apenas a `key`, gerar URL com TTL ao exibir
- **Validação de tipo** deve ser feita no backend (nunca confiar no `mimetype` do cliente)
- **`@types/multer`** necessário para tipagem de `Express.Multer.File`
- **Env vars novas:** `MINIO_PUBLIC_URL`, `MINIO_BUCKET` em `backend/.env` e `.env.example`

---

### Checklist de implementação

```
── Backend ───────────────────────────────────────────────────────────────────
□ Verificar SDK MinIO instalado (minio ou @aws-sdk/client-s3)
□ Criar UploadModule: controller + service com memoryStorage
□ Endpoint POST /upload com validação tipo/tamanho e escrita no MinIO
□ Configurar bucket 'qualifica-docs' no MinIO
□ Adicionar MINIO_PUBLIC_URL, MINIO_BUCKET em .env + .env.example
□ Testar via curl/Postman → retorna { url: string }
□ npx tsc --noEmit → zero erros

── Frontend ──────────────────────────────────────────────────────────────────
□ Criar FileInput.tsx reutilizável com preview (imagem/PDF)
□ Integrar em ModalRegistrar (imprevistos/page.tsx)
□ Integrar no formulário de reembolso (reembolsos/page.tsx)
□ Lógica de upload (POST /upload) antes do POST do registro
□ Exibir badge 📎 nos cards com documento
□ ADM consegue ver o documento na modal de revisão
□ Testar com JPG, PNG, PDF, e arquivo > 10MB (deve rejeitar)
□ npx tsc --noEmit → zero erros
```

### Critérios de aceite

- [ ] Motorista anexa imagem ou PDF ao registrar imprevisto/reembolso
- [ ] Arquivo inválido (tipo ou tamanho) → toast de erro claro
- [ ] Card exibe 📎 e documento abre em nova aba após o registro
- [ ] ADM vê o documento ao revisar o imprevisto/reembolso
- [ ] Sem documento → campo fica null, fluxo funciona normalmente
- [ ] `npx tsc --noEmit` → zero erros

---

### Posição na ordem de execução

**Implementar após a auditoria executiva.**
Sugestão pós-auditoria: **F5.18 → Fase 6** (remoção de bypasses GPS) → **P1/P2** (OSRM produção).

---

*📋 BACKLOG — Registrado em 07/04/2026 por solicitação do cliente*


---

## ═══════════════════════════════════════════════════════════
## F5.17 — FEATURE: MODOS DE VISUALIZAÇÃO DE ROTA
## "Percorrido" | "Falta Percorrer" | "Ambos"
## Arquivo: `frontend/components/MapaMotoristas.tsx`
## ═══════════════════════════════════════════════════════════

### Origem desta feature

A Seção 6 do Deep Research Report ("Avaliação Arquitetural Adicional") identificou que
mostrar **apenas o rastro do passado** é a abordagem de menor valor operacional:

> *"Enquanto grande parcela das interfaces gráficas insiste, equivocadamente, em gastar
> processamento reestruturando passados espaciais incompletos devido a blackouts de rede
> celular, o Predictive Routing inverte o escopo computacional para focar em telemetrias
> prospectivas."*

O relatório conclui:

> *"a única métrica incontestavelmente determinante gerada na sala de operação logística
> (Dashboard Admin) sobreveio pela previsão ajustada e probabilidade calculada do Tempo
> de Chegada Estipulado (ETA) somada à projeção de distância mitigante."*

E especifica a implementação:

> *"submeter a última estampa de longitude e latitude válida do motorista (last known
> position) em contraste com o centro de entrega almejado ao construto da OSRM para
> traçar a polyline restante do alvo. As linhas traçadas a partir desta matriz assumem
> tipografias ou colorações distintas no mapa Leaflet (exemplo: Tracejado semitransparente,
> dashArray: '10, 10')"*

### Por que 3 modos (não só o falta percorrer)

| Modo | Valor operacional | Quando usar |
|------|------------------|-------------|
| **Percorrido** (rastro) | Auditoria de percurso, confirmar que seguiu a rota | Após chegada, revisão histórica |
| **Falta percorrer** (preditivo) | Estimativa de chegada, motorista offline ainda útil | Operação em tempo real — **mais útil** |
| **Ambos** | Visão completa: onde foi + onde vai | Apresentação executiva, visão gerencial |

O toggle de 3 modos resolve a limitação identificada: quando o motorista perde sinal,
o rastro congela e se torna inútil. Com o modo "Falta percorrer", o admin ainda vê
a rota restante calculada a partir da última posição conhecida.

---

### Especificação técnica

#### Infraestrutura já disponível (F5.16 constrói isso)
Após F5.16, cada motorista já tem no banco:
- `driver.trail[]` — pontos da rota completa gravados pelo seed (estradas reais)
- `driver.progress` — % concluído calculado pelo backend (0–100)
- `driver.trip.originLat/Lng` e `destinationLat/Lng` — coordenadas de origem e destino
- `driver.eta` — ETA calculado pelo backend (distância + velocidade média)

Com isso, **tudo que precisamos para os 3 modos já existe no payload** — é só uma questão
de qual slice da `fullRoute` desenhamos no Leaflet.

#### Lógica dos 3 modos com `sliceByProgress()`

```
fullRoute = rota completa (origem → destino) — 100-300 pontos OSRM
progress  = 45 (%)

MODO "percorrido":
  pontos = fullRoute.slice(0, corte)         // primeiros 45%
  estilo = sólido, cor do status (verde/amarelo/vermelho)

MODO "falta":
  pontos = fullRoute.slice(corte)            // últimos 55%
  inicio = lastLocation (posição atual real) → sobrepõe o primeiro ponto do slice
  estilo = pontilhado (#FFD600), opacidade 0.85

MODO "ambos":
  pontos A = fullRoute.slice(0, corte)       // percorrido — sólido, cor do status
  pontos B = fullRoute.slice(corte)          // falta — pontilhado amarelo
  pin = posição atual (no limite entre A e B)
```

onde `corte = Math.floor(fullRoute.length * progress / 100)`

#### Estado do toggle

O toggle é **global no mapa** (um selector único), não por motorista individual.
Estado: `'trail' | 'remaining' | 'both'` — padrão inicial: `'both'` (mais impressionante).

---

### Implementação: MapaMotoristas.tsx

#### PARTE A — Interface e props

Adicionar ao tipo `MapaMotoristaProps`:
```typescript
interface MapaMotoristaProps {
  drivers: DriverMarker[];
  selectedDriverId?: string | null;
  onDriverClick?: (driverId: string) => void;
  routeMode?: 'trail' | 'remaining' | 'both';  // NOVO — padrão: 'both'
}
```

#### PARTE B — Refs adicionais para as linhas do "falta percorrer"

```typescript
// Adicionar ao bloco de refs existente (após trailsRef e routesRef):
const remainingRef = useRef<Map<string, any>>(new Map()); // polylines "falta percorrer"
```

Incluir `remainingRef` no cleanup (dentro do `return () => { ... }` do useEffect de init):
```typescript
remainingRef.current.forEach(l => l.remove());
remainingRef.current.clear();
```

E no bloco de remoção de layers obsoletos dentro de `updateMap()`:
```typescript
remainingRef.current.forEach((l, k) => {
  if (!activeKeys.has(k)) { l.remove(); remainingRef.current.delete(k); }
});
```

#### PARTE C — Lógica de desenho dos 3 modos em `updateMap()`

Substituir o bloco atual de trilha + rota restante pela lógica unificada dos 3 modos:

```typescript
// Recebe routeMode da prop (padrão 'both' se não informado)
const mode = routeMode ?? 'both';

// ── Calcula corte baseado no progresso ──────────────────────────────────────
let trailPts:     [number, number][] = [];
let remainingPts: [number, number][] = [];

if (fullRoute.length > 1 && driver.progress >= 0) {
  const corte = Math.max(1, Math.floor(fullRoute.length * driver.progress / 100));

  if (mode === 'trail' || mode === 'both') {
    // Prioridade: pontos reais do banco (F5.16) se disponíveis
    if ((driver.trail?.length ?? 0) >= 2) {
      trailPts = driver.trail!.map(p => [p.latitude, p.longitude]);
    } else {
      trailPts = fullRoute.slice(0, corte);
    }
  }

  if (mode === 'remaining' || mode === 'both') {
    // Rota restante: do corte até o destino
    // Primeiro ponto = posição atual real (mais preciso que o corte matemático)
    remainingPts = [
      [lat, lng],              // posição atual do motorista
      ...fullRoute.slice(corte) // resto da rota calculada
    ];
  }
}

// ── Desenha trilha percorrida ────────────────────────────────────────────────
if (trailPts.length > 1) {
  if (trailsRef.current.has(tripKey)) {
    trailsRef.current.get(tripKey).setLatLngs(trailPts);
  } else {
    trailsRef.current.set(tripKey,
      L.polyline(trailPts, {
        renderer,
        color,        // cor do status: verde/amarelo/vermelho/cinza
        weight: 4,
        opacity: 0.9,
      }).addTo(map)
    );
  }
} else if (trailsRef.current.has(tripKey)) {
  // Remove se modo mudou para 'remaining'
  trailsRef.current.get(tripKey).remove();
  trailsRef.current.delete(tripKey);
}

// ── Desenha rota restante (falta percorrer) ─────────────────────────────────
if (remainingPts.length > 1) {
  if (remainingRef.current.has(tripKey)) {
    remainingRef.current.get(tripKey).setLatLngs(remainingPts);
  } else {
    remainingRef.current.set(tripKey,
      L.polyline(remainingPts, {
        renderer,
        color: '#FFD600',     // amarelo institucional — distinto da trilha
        weight: 3,
        opacity: 0.75,
        dashArray: '10 8',    // pontilhado = estimativa/futuro
      }).addTo(map)
    );
  }
} else if (remainingRef.current.has(tripKey)) {
  remainingRef.current.get(tripKey).remove();
  remainingRef.current.delete(tripKey);
}

// ── Pin de destino (mantido como está, só aparece com modo remaining ou both) ──
// (código do destino já existente — sem alteração necessária)
```

#### PARTE D — Legenda atualizada no mapa

Substituir a legenda estática atual:

```tsx
{/* Legenda dinâmica */}
<div style={{ position:'absolute', bottom:12, left:12, zIndex:500, pointerEvents:'none',
  background:'rgba(15,23,42,0.92)', borderRadius:8, padding:'6px 12px',
  display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>

  {/* Status de motoristas */}
  {[['#22C55E','Online'],['#F59E0B','Parado'],['#EF4444','Sem sinal'],['#94A3B8','Concluído']].map(([c,l]) => (
    <div key={l} style={{display:'flex',alignItems:'center',gap:5}}>
      <div style={{width:10,height:10,borderRadius:'50%',background:c}}/>
      <span style={{fontSize:'.7rem',color:'#94A3B8'}}>{l}</span>
    </div>
  ))}

  <div style={{width:1,height:12,background:'rgba(255,255,255,.15)'}}/>

  {/* Legenda das linhas — muda conforme o modo */}
  {(routeMode === 'trail' || routeMode === 'both') && (
    <div style={{display:'flex',alignItems:'center',gap:5}}>
      <svg width="22" height="6">
        <line x1="0" y1="3" x2="22" y2="3" stroke="#22C55E" strokeWidth="3" strokeLinecap="round"/>
      </svg>
      <span style={{fontSize:'.7rem',color:'#94A3B8'}}>Percorrido</span>
    </div>
  )}

  {(routeMode === 'remaining' || routeMode === 'both') && (
    <div style={{display:'flex',alignItems:'center',gap:5}}>
      <svg width="22" height="6">
        <line x1="0" y1="3" x2="22" y2="3" stroke="#FFD600"
          strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round"/>
      </svg>
      <span style={{fontSize:'.7rem',color:'#94A3B8'}}>Rota restante</span>
    </div>
  )}
</div>
```

---

### Implementação: dashboard/page.tsx — Toggle de 3 modos

#### Estado

```typescript
// Adicionar ao bloco de estados do componente AdminDashboard:
const [routeMode, setRouteMode] = useState<'trail' | 'remaining' | 'both'>('both');
```

#### Toggle no header do bloco de motoristas

Dentro da div de filtros (onde está o select de estado e motorista), adicionar antes do botão 🔄:

```tsx
{/* Toggle de modo de visualização da rota */}
<div style={{
  display:'flex', gap:0, borderRadius:8, overflow:'hidden',
  border:'1px solid rgba(255,255,255,0.1)', height:36,
}}>
  {([
    { key: 'trail',     label: '↩ Percorrido',  title: 'Mostrar apenas o caminho percorrido' },
    { key: 'both',      label: '⇌ Ambos',       title: 'Mostrar percorrido + rota restante' },
    { key: 'remaining', label: '↪ Falta',       title: 'Mostrar apenas o trecho que falta percorrer' },
  ] as const).map(opt => (
    <button
      key={opt.key}
      title={opt.title}
      onClick={() => setRouteMode(opt.key)}
      style={{
        background: routeMode === opt.key ? 'rgba(255,214,0,0.15)' : '#1E293B',
        border: 'none',
        borderRight: opt.key !== 'remaining' ? '1px solid rgba(255,255,255,0.1)' : 'none',
        padding:'.2rem .65rem', color: routeMode === opt.key ? '#FFD600' : '#64748B',
        fontSize:'.72rem', fontWeight: routeMode === opt.key ? 800 : 500,
        cursor:'pointer', transition:'all .15s', whiteSpace:'nowrap',
      }}
    >
      {opt.label}
    </button>
  ))}
</div>
```

#### Passar prop para o MapaMotoristas

```tsx
<MapaMotoristas
  drivers={driversFiltered}
  selectedDriverId={selectedDriver}
  onDriverClick={(id) => { ... }}
  routeMode={routeMode}   {/* NOVO */}
/>
```

---

### Valor para a apresentação executiva

| Situação | Modo recomendado | O que o apresentador diz |
|----------|-----------------|--------------------------|
| Visão geral inicial | **Ambos** | *"Linha sólida = onde já foi. Linha pontilhada amarela = onde ainda vai."* |
| Motorista offline | **Falta percorrer** | *"Mesmo sem sinal, o sistema ainda mostra a rota que ele precisa fazer."* |
| Verificar rota percorrida | **Percorrido** | *"Aqui você confirma que o motorista seguiu o trajeto correto."* |

### Pontos de atenção

- **Cache**: `remainingRef` usa o mesmo `tripKey` que `trailsRef` — sem conflito pois são refs separados
- **Modo 'remaining' offline**: quando motorista está offline (`diffMin > 15`), o `lastLocation` é o último ponto registrado — a linha amarela ainda é útil e **não congela** pois mostra o caminho que ainda falta
- **Progresso = 100** (COMPLETED): `remainingPts` será vazio (sem trecho a mostrar) — correto
- **TypeScript**: `routeMode` como prop opcional com default interno — sem breaking change

### Critério de aceite

- [ ] Toggle de 3 modos visível no header do bloco de motoristas
- [ ] Modo "Percorrido": apenas linha sólida colorida do início até posição atual
- [ ] Modo "Falta percorrer": apenas linha pontilhada amarela da posição atual até destino
- [ ] Modo "Ambos": ambas as linhas no mapa simultaneamente
- [ ] Legenda atualiza conforme o modo selecionado
- [ ] Motorista offline: modo "Falta" ainda mostra rota restante a partir da última posição conhecida
- [ ] Motorista COMPLETED: nenhuma linha de rota restante (progress = 100)
- [ ] `npx tsc --noEmit` → zero erros

---

### Posição na ordem de execução

Este item **deve ser implementado após F5.16** (que grava os pontos OSRM no banco e
torna `driver.trail` rico o suficiente para o cálculo de `sliceByProgress` funcionar).

**Ordem atualizada:** F5.16 → F5.14 → F5.15 → F5.13 → **F5.17**

F5.17 é independente de F5.14/F5.15/F5.13 — pode ser feito em paralelo com qualquer um
dos outros três, mas F5.16 é pré-requisito.

---

## ═══════════════════════════════════════════════════════════
## 📌 NOTA — REVISÃO COMPLETA DO SISTEMA DE NOTIFICAÇÕES
## Escopo: Todos os perfis (Admin, Motorista, Professor, Aluno, Coordenador)
## Prioridade: Pós-auditoria | Status: 📋 PENDENTE
## ═══════════════════════════════════════════════════════════

> **Registrado em:** 07/04/2026
> **Origem:** Revisão preventiva — garantir consistência, cobertura e UX unificada
> de notificações em todos os portais após crescimento incremental das Fases 1–5.
> **Quando implementar:** Após a auditoria executiva (pós-Fase 5).

---

### Contexto

O sistema de notificações foi crescendo de forma incremental ao longo das Fases 1–5.
Cada feature nova (imprevistos, reembolsos, aprovações, alertas de risco, GPS) adicionou
seus próprios disparos. A revisão consolida todos os fluxos, elimina gaps e padroniza a UX.

**Infraestrutura existente (não alterar a estrutura base):**
- `backend/src/notifications/notifications.gateway.ts` — WebSocket (Socket.io)
- `backend/src/notifications/notifications.service.ts` — `notifyUser()` + `notifyAdmins()`
- `frontend/components/ui/NotificationBell.tsx` — sino com contador
- Schema Prisma: `Notification { id, userId, type, title, message, read, createdAt }`

---

### Escopo por perfil

#### 🔴 ADMIN / COORDENADOR
| Evento | Trigger | Status |
|--------|---------|--------|
| Novo imprevisto registrado | `POST /driver/absences` | ⚠️ Verificar se notifica admin |
| Novo reembolso solicitado | `POST /reimbursements` | ⚠️ Verificar se notifica admin |
| Aluno em risco de reprovação | `POST /classes/:id/aluno-risco` | ✅ Implementado |
| Motorista sem sinal (no_signal) | polling GPS | ⚠️ Verificar persistência no banco |
| Motorista parado há muito tempo (long_stop) | idem | ⚠️ Verificar persistência |
| Motorista chegando (arriving_soon) | idem | ⚠️ Verificar persistência |
| Nova inscrição de aluno | `POST /enrollments` | ⚠️ Verificar |
| Certificado emitido | `POST /certificates/:id/issue` | ⚠️ Verificar |

#### 🚛 MOTORISTA
| Evento | Trigger | Status |
|--------|---------|--------|
| Imprevisto aprovado/rejeitado/penalizado | `PATCH /admin/absences/:id/review` | ⚠️ Verificar WS |
| Reembolso aprovado/rejeitado | `PATCH /reimbursements/:id/review` | ⚠️ Verificar |
| Nova viagem planejada atribuída | criação de Trip | ⚠️ Verificar |

#### 👩‍🏫 PROFESSOR
| Evento | Trigger | Status |
|--------|---------|--------|
| Imprevisto aprovado/rejeitado/penalizado | `PATCH /admin/absences/:id/review` | ⚠️ Verificar |
| Alerta de risco enviado (confirmação) | `POST /classes/:id/aluno-risco` | ✅ Toast local |
| Turma encerrada pelo admin | mudança de status da Class | ⚠️ Verificar |

#### 🎓 ALUNO
| Evento | Trigger | Status |
|--------|---------|--------|
| Inscrição aprovada/rejeitada | `PATCH /enrollments/:id/status` | ⚠️ Verificar |
| Alerta de risco de frequência | `POST /classes/:id/aluno-risco` | ✅ Implementado |
| Certificado disponível para download | emissão do certificado | ⚠️ Verificar |

---

### Arquivos-chave para auditar

```
backend/src/notifications/notifications.service.ts      — notifyUser() + notifyAdmins()
backend/src/notifications/notifications.gateway.ts      — WebSocket rooms
backend/src/absences/absences.service.ts                — review() dispara notify?
backend/src/reimbursement/reimbursement.service.ts      — review() dispara notify?
backend/src/enrollments/enrollments.service.ts          — status change dispara notify?
backend/src/certificates/certificate.service.ts         — issueCertificate() dispara notify?
backend/src/driver-location/driver-location.service.ts  — alertas GPS persistidos no banco?
frontend/components/ui/NotificationBell.tsx             — lida/não-lida, agrupamento, badge
```

---

### O que verificar em cada módulo

1. **Persistência** — o evento grava `Notification` no banco (`notifications.create()`)?
2. **WS em tempo real** — chama `notifyUser(userId, payload)` ou `notifyAdmins(payload)`?
3. **Conteúdo** — `type`, `title`, `message` padronizados e descritivos?
4. **Leitura** — o sino marca como lida ao clicar? Endpoint `PATCH /notifications/:id/read` funciona?
5. **Isolamento** — `notifyUser` em `try/catch` separado, fora de `$transaction`? **(REGRA OURO)**

---

### Checklist de implementação

```
── Auditoria ─────────────────────────────────────────────────────────────────
□ Mapear todos os service.create() de Notification existentes no backend
□ Identificar eventos sem notificação (gaps na tabela acima)
□ Confirmar que notifyUser/notifyAdmins estão SEMPRE em try/catch fora de $transaction

── Backend (gaps a preencher) ────────────────────────────────────────────────
□ absences.service.ts    → review() → notifyUser(funcionário afetado)
□ reimbursement.service  → review() → notifyUser(motorista/professor)
□ enrollments.service    → updateStatus() → notifyUser(aluno)
□ certificate.service    → issueCertificate() → notifyUser(aluno)
□ driver-location.service → alertas GPS → persiste Notification no banco

── Frontend ──────────────────────────────────────────────────────────────────
□ NotificationBell: agrupamento visual por tipo (GPS / Frequência / Reembolso / Imprevisto)
□ Verificar badge reseta ao marcar todas como lidas
□ Alertas GPS (arriving_soon, long_stop): badge especial no mapa além do sino
□ Página /admin/notifications (se não existir): listagem paginada com filtros

── Validação ─────────────────────────────────────────────────────────────────
□ Testar cada evento → verificar Notification no banco (Prisma Studio ou SQL)
□ Testar WS: 2 abas abertas (admin + perfil afetado) → evento aparece em tempo real no sino
□ npx tsc --noEmit → zero erros
```

---

### Critérios de aceite

- [ ] Cada evento listado persiste `Notification` no banco
- [ ] Eventos de usuário chegam em tempo real via WS ao usuário-alvo
- [ ] Eventos globais chegam via `notifyAdmins` para ADMIN e COORDINATOR
- [ ] `notifyUser`/`notifyAdmins` em `try/catch` separados de qualquer `$transaction`
- [ ] `NotificationBell` exibe contador correto e zera ao marcar como lida
- [ ] `npx tsc --noEmit` → zero erros

---

*📋 Nota registrada em 07/04/2026 — revisão completa do sistema de notificações (todos os perfis)*
