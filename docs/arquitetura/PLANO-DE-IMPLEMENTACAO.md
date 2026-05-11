# 📋 PLANO DE IMPLEMENTAÇÃO — FASE 5 GPS
## 4 Bugs Críticos para Apresentação Executiva
## v1.0 | 07/04/2026 | Baseado em: Deep Research Report + sobre-sistema.md v2.0

> **REGRA DE USO:** Leia integralmente antes de escrever qualquer linha de código.
> Cada seção tem: análise técnica, código exato, pontos de atenção e critério de aceite.
>
> **Docs obrigatórios antes de iniciar:**
> - [`sobre-sistema.md`](./sobre-sistema.md) — arquitetura e módulos (v2.0)
> - [`ESTADO_SISTEMA.md`](./ESTADO_SISTEMA.md) — estado atual, bypasses, bugs (v7.1)
> - [`LIVRO_DE_REGRAS.md`](./LIVRO_DE_REGRAS.md) — regras imutáveis de código
> - [`ERROS_E_SOLUCOES.md`](../seguranca/ERROS_E_SOLUCOES.md) — catálogo de soluções

---

## 🗺️ ORDEM OBRIGATÓRIA DE IMPLEMENTAÇÃO

```
F5.16 → F5.14 → F5.15 → F5.13
```

| Ordem | Item | Arquivo(s) | Motivo da posição |
|-------|------|-----------|-------------------|
| 1º | **F5.16** BYPASS-DEMO-OSRM | `seed-full.ts` | Totalmente isolado — zero conflito |
| 2º | **F5.14** BYPASS-DEMO-STATUS | `service.ts` + `seed-full.ts` | Deve ser antes de F5.15 (mesmo arquivo) |
| 3º | **F5.15** COMPLETED visível | `service.ts` | Depois de F5.14 estar estável |
| 4º | **F5.13** createPortal | `dashboard/page.tsx` | Independente, vai por último |

**Nota do deep research:** F5.14 e F5.15 alteram o mesmo `driver-location.service.ts`.
Fazê-los na mesma sessão de edição em uma única branch elimina conflitos de merge.

---

## ⚙️ F5.16 — BYPASS-DEMO-OSRM

### Arquivo: `backend/prisma/seed-full.ts`

### Causa raiz
MapaMotoristas.tsx dispara ~80 chamadas OSRM em paralelo no browser.
OSRM público tem rate limit de ~1 req/s — 80 simultâneas geram HTTP 429.
O `catch {}` silencioso retorna `[from, to]` → linha reta no mapa.

### Fundamentos técnicos do deep research
- Node.js 18 usa Undici como motor de `fetch` nativo
- Undici tem bug documentado: `UND_ERR_CONNECT_TIMEOUT` pode ocorrer mesmo com `AbortSignal`
  **Fix:** usar `Agent` explícito com `connectTimeout: 15000`
- `overview=simplified` ativa compressão Douglas-Peucker → 100-300 pontos para rota de 500km
  (adequado para Leaflet, não satura banco, respeita LGPD 7 dias)
- Coordenadas OSRM GeoJSON: `[longitude, latitude]` → DEVEM ser invertidas para `[lat, lng]`
- Interpolação de timestamps: usar `route.legs[0].annotation.duration` (duração por segmento)
- Gravar TODOS os pontos (não só X%): backend calcula progresso pela última posição vs distância

### Código a adicionar em seed-full.ts

```typescript
// ── BYPASS-DEMO-OSRM ─────────────────────────────────────────────────────────
// Calcula rotas reais via OSRM do Node.js (sem rate limit do browser).
// REMOVER PARA PRODUÇÃO: substituir por backend OSRM + cache Redis (Fase 6).
// ─────────────────────────────────────────────────────────────────────────────
import { fetch as undiciFetch, Agent } from 'undici';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Agent com connectTimeout explícito previne UND_ERR_CONNECT_TIMEOUT (Node 18/Undici bug)
const osrmAgent = new Agent({ connectTimeout: 15000 });

async function buildSeedRoute(
  originLat: number, originLng: number,
  destLat: number,   destLng: number,
  departureDate: Date,
): Promise<Array<{
  latitude: number; longitude: number; speed: number;
  accuracy: number; source: string; capturedAt: Date;
}>> {
  await delay(800); // throttle — OSRM público aceita ~1 req/s

  const url = `https://router.project-osrm.org/route/v1/driving/`
    + `${originLng},${originLat};${destLng},${destLat}`
    + `?geometries=geojson&overview=simplified&annotations=duration`;

  try {
    const res = await undiciFetch(url, {
      signal: AbortSignal.timeout(15000),
      dispatcher: osrmAgent,
    });
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);

    const data = await res.json() as any;
    if (data.code !== 'Ok' || !data.routes?.length) throw new Error('Rota não encontrada');

    const route    = data.routes[0];
    const coords   = route.geometry.coordinates as [number, number][];
    const durations: number[] = route.legs?.[0]?.annotation?.duration ?? [];

    // Ponto de partida = momento real da saída da viagem
    let tsMs = departureDate.getTime();

    return coords.map(([lon, lat], i) => {
      tsMs += ((durations[i - 1] ?? 0)) * 1000; // avança pelo segmento anterior
      return {
        latitude:  lat,   // OSRM retorna [lon,lat] — invertemos para [lat,lng]
        longitude: lon,
        speed:     60 + Math.random() * 35, // 60-95 km/h realista
        accuracy:  8.5,
        source:    'SEED_OSRM',
        capturedAt: new Date(tsMs),
      };
    });

  } catch (err) {
    console.error(`  ⚠️  OSRM falhou (${originLat},${originLng}→${destLat},${destLng}):`, err);
    // Fallback: 20 pontos interpolados linearmente
    const steps = 20;
    const totalMs = 3 * 3600 * 1000; // 3h estimado
    return Array.from({ length: steps }, (_, i) => ({
      latitude:  originLat + (destLat - originLat) * (i / steps),
      longitude: originLng + (destLng - originLng) * (i / steps),
      speed: 70, accuracy: 50, source: 'SEED_FALLBACK',
      capturedAt: new Date(departureDate.getTime() + (totalMs / steps) * i),
    }));
  }
}
// ── FIM BYPASS-DEMO-OSRM ─────────────────────────────────────────────────────
```

### Integração no loop de motoristas (runSeed_rastreamento)

```typescript
// Substituir o loop `for (const p of m.trail)` por:
const originCity = await prisma.city.findUnique({ where: { id: m.originId } });
const destCity   = await prisma.city.findUnique({ where: { id: m.destId   } });

if (originCity?.latitude && destCity?.latitude) {
  const roadPoints = await buildSeedRoute(
    originCity.latitude, originCity.longitude,
    destCity.latitude,   destCity.longitude,
    trip.departureDate,
  );
  for (const p of roadPoints) {
    await prisma.driverLocation.create({
      data: { driverUserId: user.id, tripId: trip.id, heading: null, ...p },
    });
  }
  console.log(`  ✅ ${m.name} (${roadPoints.length} pts OSRM)`);
}
```

### Alteração em MapaMotoristas.tsx

```typescript
// No updateMap(), na seção de trilha percorrida:
// ANTES: sempre tenta OSRM via buildRoadTrail()
// DEPOIS: usa pontos do banco se disponíveis, OSRM apenas como fallback

const hasBackendTrail = (driver.trail?.length ?? 0) >= 2;
if (hasBackendTrail) {
  // Pontos já são de estrada (seed gravou via OSRM) — desenha direto, zero OSRM no browser
  trailPts = driver.trail!.map(p => [p.latitude, p.longitude] as [number, number]);
} else {
  // Fallback para motoristas reais com poucos pontos GPS (produção futura)
  const raw: [number, number][] = (driver.trail ?? []).map(p => [p.latitude, p.longitude]);
  if (raw.length >= 2) {
    trailPts = await buildRoadTrail(raw); // OSRM mantido como fallback
  } else if (fullRoute.length && driver.progress > 0) {
    trailPts = sliceByProgress(fullRoute, driver.progress);
  }
}

// Adicionar L.canvas() na inicialização do mapa (performance com 11 motoristas):
const canvasRenderer = L.canvas();
// Usar em todas as polylines: L.polyline(pts, { ..., renderer: canvasRenderer })
```

### Pontos de atenção
- `undici` é dependência transitiva do Node.js 18 — não precisa instalar
- Import `from 'undici'` funciona diretamente no `tsx`/`ts-node`
- 11 motoristas × 800ms throttle = ~9 segundos de seed — aceitável
- `overview=simplified` reduz fidelidade em curvas apertadas — aceitável para demo
- `source: 'SEED_OSRM'` no campo `source` diferencia pontos de seed vs reais no banco
- O campo `trail` é o array de DriverLocations retornado pelo `GET /driver/location/:tripId/trail`
  — já é buscado em `loadDrivers()` do dashboard

### Critério de aceite
- [ ] `npx tsx prisma/seed-full.ts` conclui sem HTTP 429 nem `UND_ERR_CONNECT_TIMEOUT`
- [ ] Console exibe `✅ Carlos Souza (XXX pts OSRM)` para cada motorista
- [ ] Mapa renderiza polylines seguindo estradas reais (não linhas retas)
- [ ] Aba Network do browser não faz chamadas para `router.project-osrm.org`
- [ ] 11 motoristas no mapa com trilhas geográficas realistas

---

## ⚙️ F5.14 — BYPASS-DEMO-STATUS

### Arquivos: `driver-location.service.ts` + `seed-full.ts`

### Causa raiz
Seed grava `capturedAt = Date.now() - offset`. Após ~5min → todos `stopped`.
Após ~15min → todos `offline`. Motoristas do seed não fazem `POST /driver/location`.

### Fundamento técnico
- Regex com flag `/i` (case-insensitive): `/\[DEMO:(online|stopped|offline)\]/i`
  Funciona mesmo com texto ao redor: `'Viagem demo [DEMO:online]'` → captura `online`
- Condicionado por `IS_DEMO_MODE=true` — em produção o bloco nunca executa
- O deep research confirma: token é mais robusto que `refreshDriverTimestamps()` para demos
  (determinístico, não depende de relógio, funciona indefinidamente)
- Estratégia dual: usar AMBOS como camadas de proteção

### Motoristas COMPLETED (Tânia, Jonas, Rosa)
Não recebem o token. O `getMotoristaAtivos()` filtra `WHERE status = 'IN_TRANSIT'`.
Esses motoristas são tratados pelo F5.15.

### Código a adicionar em driver-location.service.ts

```typescript
// Em getMotoristaAtivos(), APÓS o bloco que calcula status por diffMin:

// ── BYPASS-DEMO-STATUS ──────────────────────────────────────────────────────
// MOTIVO: Motoristas do seed não fazem POST — capturedAt envelhece e status vira offline.
// Token no campo Trip.notes força o status visual sem alterar lógica de negócio.
// ISOLADO POR ENV: só executa com IS_DEMO_MODE=true. Em produção: nunca executa.
// COMO REMOVER: apagar este bloco. Status em produção vem de capturedAt real.
// ─────────────────────────────────────────────────────────────────────────────
const isDemoMode = process.env.IS_DEMO_MODE === 'true';
if (isDemoMode && trip.notes) {
  const demoMatch = trip.notes.match(/\[DEMO:(online|stopped|offline)\]/i);
  if (demoMatch?.[1]) {
    status = demoMatch[1].toLowerCase() as 'online' | 'stopped' | 'offline';
  }
}
// ── FIM BYPASS-DEMO-STATUS ──────────────────────────────────────────────────
```

### Modificação em seed-full.ts — campo notes dos motoristas

```typescript
// MOTORISTAS ONLINE: carlos, marina, paulo, diego
notes: `Demo: ${m.name} [DEMO:online]`,

// MOTORISTAS STOPPED: ana, fabio
notes: `Demo: ${m.name} [DEMO:stopped]`,

// MOTORISTAS OFFLINE: roberto, lea
notes: `Demo: ${m.name} [DEMO:offline]`,

// MOTORISTAS COMPLETED: tania, jonas, rosa — SEM TOKEN (tratados pelo F5.15)
notes: `Demo: ${m.name} — viagem concluída hoje`,
```

### Adicionar ao backend/.env

```env
IS_DEMO_MODE=true
```

### Pontos de atenção
- Usar `process.env.IS_DEMO_MODE` diretamente (sem ConfigService) — mais simples para bypass
- O bloco DEVE ter o comentário `// BYPASS-DEMO-STATUS` — regra do LIVRO_DE_REGRAS
- `refreshDriverTimestamps()` deve continuar existindo — serve para manter `capturedAt` recente
  para ETA e trilha correta (o token só afeta o campo `status`)

### Critério de aceite
- [ ] `IS_DEMO_MODE=true`: carlos, marina, paulo, diego → 🟢 ONLINE no mapa
- [ ] `IS_DEMO_MODE=true`: ana, fabio → 🟡 STOPPED no mapa
- [ ] `IS_DEMO_MODE=true`: roberto, lea → 🔴 OFFLINE no mapa
- [ ] `IS_DEMO_MODE=false` ou ausente: status calculado normalmente por `capturedAt`
- [ ] Campo `notes` de viagens reais não interfere (regex só captura `[DEMO:...]`)

---

## ⚙️ F5.15 — FIX BUG-COMPLETED-MAPA

### Arquivo: `backend/src/driver-location/driver-location.service.ts`

### Causa raiz
`getMotoristaAtivos()` filtra apenas `status: 'IN_TRANSIT'`.
Ao finalizar a viagem (→ COMPLETED), o motorista desaparece imediatamente do mapa.
Regra de negócio real: deve permanecer visível até que uma nova viagem comece.

### Fundamento técnico (deep research)
- Query bifurcada é o padrão mais performático no Prisma 5.22 (confirmado):
  1. `findMany` das trips IN_TRANSIT (já existente)
  2. `findMany` de DriverLocations nas últimas 24h cujo `driverUserId` NÃO está nas trips ativas
  Isso evita subqueries negativas que causam Full Table Scans no PostgreSQL
- Janela de 24h é o padrão hegemônico em logística de frotas (confirmado)
- Chave virtual para o cache Leaflet: `${trip.id}_COMPLETED` para não colidir com layers ativos
- Retornar `{ eta: null, progress: 100, status: 'offline' }` para motoristas COMPLETED
- Cor no mapa: cinza/desaturado (não vermelho alarme) para indicar "finalizado", não "problema"

### Código a adicionar em driver-location.service.ts

```typescript
// No final de getMotoristaAtivos(), após processar as trips IN_TRANSIT:

// ── FIX BUG-COMPLETED-MAPA ──────────────────────────────────────────────────
// Inclui motoristas que concluíram viagem nas últimas 24h mas não têm trip ativa.
// Aparecem com status 'offline' na última posição conhecida — não somem do mapa.
// Janela de 24h é padrão de logística (cobre operações noturnas e longas distâncias).
// ─────────────────────────────────────────────────────────────────────────────
const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

// IDs dos motoristas já retornados (trips IN_TRANSIT)
const activeDriverIds = result.map(r => r.userId).filter(Boolean) as string[];

// Busca última localização de motoristas inativos com GPS recente
const offlineLocations = await this.prisma.driverLocation.findMany({
  where: {
    driverUserId: { notIn: activeDriverIds },
    capturedAt:   { gte: twentyFourHoursAgo },
  },
  distinct:  ['driverUserId'],
  orderBy:   [{ driverUserId: 'asc' }, { capturedAt: 'desc' }],
  include: {
    user: { select: { name: true } },
    trip: {
      select: {
        id: true, status: true,
        originCity:      { select: { name: true, state: true } },
        destinationCity: { select: { name: true, state: true } },
      },
    },
  },
});

// Monta objetos compatíveis com o formato esperado pelo frontend
const completedDrivers = offlineLocations
  .filter(loc => loc.trip?.status === 'COMPLETED') // apenas viagens concluídas
  .map(loc => ({
    userId:   loc.driverUserId,
    name:     loc.user?.name,
    trip: {
      // Chave virtual: previne colisão com cache Leaflet (markersRef, trailsRef, routesRef)
      id:          `${loc.trip!.id}_COMPLETED`,
      origin:      `${loc.trip!.originCity?.name}/${loc.trip!.originCity?.state}`,
      destination: `${loc.trip!.destinationCity?.name}/${loc.trip!.destinationCity?.state}`,
      originLat:   null, originLng: null, // sem rota nova a traçar
      destinationLat: null, destinationLng: null,
      startedAt:   loc.capturedAt,
    },
    lastLocation: {
      lat:       loc.latitude,
      lng:       loc.longitude,
      speed:     loc.speed,
      heading:   loc.heading,
      capturedAt: loc.capturedAt,
    },
    eta:      null,    // viagem concluída — ETA sem sentido
    progress: 100,     // 100% — chegou
    status:   'offline' as const,
    isCompleted: true, // flag para frontend usar cor diferente (cinza, não vermelho)
  }));

// Retorna union: ativos + concluídos recentes
return [...result, ...completedDrivers];
// ── FIM FIX BUG-COMPLETED-MAPA ──────────────────────────────────────────────
```

### Alteração em MapaMotoristas.tsx — cor dos pins COMPLETED

```typescript
// Na função que gera o ícone do pin, verificar flag isCompleted:
const color = driver.isCompleted
  ? '#9CA3AF'  // cinza desaturado — indica "finalizado organicamente"
  : (STATUS_COLOR[driver.status] || STATUS_COLOR.offline);

// Na legenda do mapa, adicionar:
['#9CA3AF', 'Concluído']
```

### Pontos de atenção
- O índice `@@index([driverUserId, capturedAt])` já existe no schema Prisma — a query `distinct`
  executará por índice, não por Full Table Scan
- A chave virtual `_COMPLETED` **só** é usada no frontend como key Leaflet
  — no banco a trip.id real é preservada
- O campo `isCompleted: true` é adicionado ao objeto de retorno — o DTO/tipo `DriverMarker`
  no frontend deve ser atualizado para aceitar este campo opcional
- F5.15 deve ser implementado DEPOIS de F5.14 estar validado no mesmo arquivo

### Critério de aceite
- [ ] Mudar status de uma trip de `IN_TRANSIT` para `COMPLETED` no banco
- [ ] Atualizar o painel: pin do motorista PERMANECE no mapa (pin cinza)
- [ ] Pin cinza indica conclusão, não erro (sem cor vermelha de alarme)
- [ ] Após 24h da última DriverLocation: pin some do mapa (expiração correta)
- [ ] Motoristas ativos (IN_TRANSIT) não são afetados

---

## ⚙️ F5.13 — FIX BUG-DRAWER-TRANSFORM

### Arquivo: `frontend/app/admin/dashboard/page.tsx`

### Causa raiz (confirmada pelo CSS Level 3 spec)
A div raiz da página tem `className="animate-fade-in"`.
O `fill-mode: both` na animação `fadeInUp` mantém `transform: translateY(0)` ativo após a animação.
Qualquer ancestral com `transform !== none` cria um containing block para `position: fixed`.
O DriverDrawer está dentro dessa div → `position: fixed` ancora no div, não no viewport.

### Fundamento técnico
- Especificação W3C CSS Transforms Level 1: qualquer `transform`, `perspective` ou `filter` ≠ `none`
  em ancestral força o descendente `position: fixed` a ser relativo ao ancestral transformado
- `createPortal(element, document.body)` move o nó DOM para fora da hierarquia problemática
- O portal só falha se o próprio `<body>` ou `<html>` tiver `transform` — antipadrão severo
- **Mounted Pattern** (useState + useEffect) é obrigatório no Next.js 14 App Router:
  o `document` não existe no SSR Node.js — portal sem guard causa erro fatal
- O `dynamic import` com `ssr: false` não é suficiente sozinho para portais — pode causar
  comportamentos imprevistos em Layouts complexos do App Router
- Propagação de eventos: no React, eventos sintéticos seguem a árvore do React (não o DOM)
  — cliques dentro do portal ainda propagam para ancestrais React se não houver `stopPropagation`
- Z-index: com portal em document.body, o valor `200` compete com outros elementos no body
  — **recomendar 9999** para garantir precedência sobre notificações e sidebars

### Código a modificar em dashboard/page.tsx

```typescript
// Adicionar imports no topo:
import { createPortal } from 'react-dom';

// Adicionar state de montagem (já junto dos outros useState):
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

// Substituir o componente DriverDrawer inline:
// ANTES:
// <DriverDrawer driver={drawerDriver} onClose={() => { ... }} />

// DEPOIS (no JSX, no final do return):
{mounted && drawerDriver && createPortal(
  <DriverDrawer
    driver={drawerDriver}
    onClose={() => {
      setDrawerDriver(null);
      setSelectedDriver(null);
      // Nota: o scroll lock é gerenciado pelo próprio DriverDrawer via useEffect cleanup
      // Manter aqui apenas para compatibilidade com .admin-content caso necessário:
      const contentEl = document.querySelector('.admin-content') as HTMLElement | null;
      if (contentEl) contentEl.style.overflowY = 'auto';
    }}
  />,
  document.body
)}
```

### Alteração no DriverDrawer.tsx — scroll lock declarativo

O deep research recomenda mover o scroll lock para dentro do `DriverDrawer` via `useEffect`:

```typescript
// Em DriverDrawer.tsx, adicionar ao topo do componente:
useEffect(() => {
  // Bloqueia scroll da .admin-content (não do body — layout usa overflow:hidden no body)
  const contentEl = document.querySelector('.admin-content') as HTMLElement | null;
  if (contentEl) {
    const original = contentEl.style.overflowY;
    contentEl.style.overflowY = 'hidden';
    // Cleanup restaura automaticamente ao desmontar (fechar drawer)
    return () => { contentEl.style.overflowY = original; };
  }
}, []);

// Aumentar zIndex de 200 para 9999 no container do drawer:
// style={{ position:'fixed', top:0, right:0, width:380, height:'100vh', zIndex:9999, ... }}
```

### Pontos de atenção críticos
- **Event bubbling pelo React tree:** um `onClick` em ancestral React do `DriverDrawer`
  pode ser disparado por cliques dentro do portal — verificar se há handlers no pai
- **Hydration Mismatch:** o `mounted` check garante que no servidor o portal retorna `null`
  (servidor e cliente renderizam o mesmo markup inicial)
- **StrictMode:** o `useEffect` com `setMounted(true)` executa duas vezes no dev
  — comportamento esperado, não quebra a lógica

### Critério de aceite
- [ ] Inspecionar DOM: `.driver-drawer-container` aparece como filho direto de `<body>`
- [ ] Drawer fixa no viewport mesmo quando a página está scrollada
- [ ] Nenhum aviso de "Hydration Mismatch" no console do browser
- [ ] Abrir e fechar o drawer restaura o scroll de `.admin-content` automaticamente
- [ ] Cliques dentro do drawer não propagam para o mapa (pins não são selecionados acidentalmente)

---

## 🔁 PÓS-IMPLEMENTAÇÃO — CHECKLIST GERAL

### Antes da apresentação (5 minutos antes)
```bash
# 1. Rodar seed completo (inclui OSRM — aguardar ~30s)
cd backend && npx tsx prisma/seed-full.ts

# 2. Verificar status dos motoristas no painel
# Admin → Dashboard → Motoristas em Rota
# Confirmar: 4 ONLINE, 2 STOPPED, 2 OFFLINE, 3 pins cinzas (COMPLETED)

# 3. Se necessário, atualizar timestamps (camada extra de segurança)
npx tsx prisma/seed-full.ts --refresh-drivers
```

### Validação técnica rápida
```
✅ F5.16: polylines seguem estradas no mapa
✅ F5.14: carlos/marina/paulo/diego aparecem VERDE
✅ F5.15: tânia/jonas/rosa aparecem como pins CINZAS
✅ F5.13: drawer abre fixado no viewport (não flutua com scroll)
```

---

## 🔮 FASE 6 — REMOÇÃO DOS BYPASSES (pós-apresentação)

### Ordem de remoção

| # | O que remover | Onde | Estratégia de produção |
|---|---------------|------|----------------------|
| 1 | `BYPASS-DEMO-STATUS` | `driver-location.service.ts` | Status calculado por `capturedAt` real |
| 2 | `buildSeedRoute()` | `prisma/seed-full.ts` | Backend OSRM + cache Redis 7 dias |
| 3 | `BYPASS-DEMO-ALERTAS` | `admin/dashboard/page.tsx` | Alertas chegam via WS real |

### Arquitetura de produção OSRM (Fase 6)
```
Camada 1: Redis TTL 7 dias — key: osrm:route:{originCityId}:{destCityId}
Camada 2: Trip.routePoints Json? (persistência além do TTL do Redis)
Camada 3: OSRM público (fallback — 1 chamada por par de cidades na vida do sistema)

Migration necessária:
  ALTER TABLE "Trip" ADD COLUMN "routePoints" jsonb;
  ALTER TABLE "Trip" ADD COLUMN "routePointsCalcAt" TIMESTAMP WITH TIME ZONE;
```

---

*Sistema Upgrade | RR TECNOL | PLANO-DE-IMPLEMENTACAO v1.0 | 07/04/2026*
*Baseado em: Deep Research Report (Arquitetura e Engenharia NestJS/Next.js/Prisma)*
*Referências: CSS Transforms Level 1 W3C, Node.js Undici docs, Prisma 5.22 query engine docs*
