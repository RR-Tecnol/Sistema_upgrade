/**
 * Origens do frontend para CORS e Socket.IO.
 * Use FRONTEND_URLS (vírgula) ou FRONTEND_URL (uma ou várias URLs separadas por vírgula).
 */
function uniq(origins: string[]): string[] {
  return [...new Set(origins.map((o) => o.replace(/\/$/, '')))];
}

export function getFrontendCorsOrigins(): string | string[] {
  const raw = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '').trim();
  const devDefaults = defaultOrigins();
  const devList = Array.isArray(devDefaults) ? devDefaults : [devDefaults];

  /** Em desenvolvimento, faz merge com a lista padrão para não bloquear 127.0.0.1 vs localhost nem portas extra. */
  if (process.env.NODE_ENV !== 'production') {
    const fromEnv = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const merged = uniq([...fromEnv, ...devList]);
    if (merged.length === 0) return devDefaults;
    if (merged.length === 1) return merged[0]!;
    return merged;
  }

  if (raw) {
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) return defaultOrigins();
    if (list.length === 1) return list[0]!;
    return list;
  }
  return defaultOrigins();
}

function defaultOrigins(): string | string[] {
  if (process.env.NODE_ENV === 'production') {
    return 'http://localhost:3000';
  }
  /** Dev: localhost e 127.0.0.1 — o browser trata como origens diferentes (CORS). */
  const ports = [3000, 3001, 3010, 3020];
  const hosts = ['localhost', '127.0.0.1'];
  const list: string[] = [];
  for (const host of hosts) {
    for (const port of ports) {
      list.push(`http://${host}:${port}`);
    }
  }
  return list;
}

/** Primeira origem — links em PDF (QR), redirects, etc. */
export function getPrimaryFrontendUrl(): string {
  const o = getFrontendCorsOrigins();
  if (Array.isArray(o)) return o[0] || 'http://localhost:3000';
  return o;
}
