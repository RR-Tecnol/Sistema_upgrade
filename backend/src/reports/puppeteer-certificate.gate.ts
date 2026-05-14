/**
 * Semáforo simples para limitar instâncias Puppeteer (download em pico de tráfego).
 */
export class PuppeteerCertificateGate {
  private inFlight = 0;
  private readonly q: (() => void)[] = [];

  constructor(
    private readonly maxConcurrent: number,
    private readonly onQueued?: () => void,
  ) {
    if (!Number.isFinite(maxConcurrent) || maxConcurrent < 1) {
      this.maxConcurrent = 3;
    }
  }

  get limit(): number {
    return this.maxConcurrent;
  }

  async use<T>(fn: () => Promise<T>): Promise<T> {
    await this.enter();
    try {
      return await fn();
    } finally {
      this.leave();
    }
  }

  private enter(): Promise<void> {
    return new Promise((resolve) => {
      if (this.inFlight < this.maxConcurrent) {
        this.inFlight += 1;
        resolve();
        return;
      }
      this.onQueued?.();
      this.q.push(() => {
        this.inFlight += 1;
        resolve();
      });
    });
  }

  private leave() {
    this.inFlight -= 1;
    const n = this.q.shift();
    if (n) {
      n();
    }
  }
}

export function getPuppeteerMaxConcurrentFromEnv(): number {
  const raw = process.env.PUPPETEER_MAX_CONCURRENT ?? process.env.CERTIFICATE_PDF_PUPPETEER_MAX;
  if (!raw) {
    return 3;
  }
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return 3;
  }
  if (n > 50) {
    return 50;
  }
  return n;
}
