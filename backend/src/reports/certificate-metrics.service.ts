import { Injectable } from '@nestjs/common';

/**
 * Métricas leves em memória (cache, motores de PDF, fila Puppeteer).
 * Não persiste; adequado a dashboard rápido e inspeção de saúde.
 */
@Injectable()
export class CertificateMetricsService {
  private cacheHits = 0;
  private cacheMisses = 0;
  private puppeteerTotalMs = 0;
  private puppeteerOps = 0;
  private pdfLibTotalMs = 0;
  private pdfLibOps = 0;
  /** Pedidos que tiveram de aguardar vaga no semáforo (não rejeitados) */
  private puppeteerGateWaits = 0;

  recordCacheHit() {
    this.cacheHits += 1;
  }

  recordCacheMiss() {
    this.cacheMisses += 1;
  }

  recordPuppeteerRun(ms: number) {
    if (Number.isFinite(ms) && ms >= 0) {
      this.puppeteerTotalMs += ms;
      this.puppeteerOps += 1;
    }
  }

  recordPdfLibRun(ms: number) {
    if (Number.isFinite(ms) && ms >= 0) {
      this.pdfLibTotalMs += ms;
      this.pdfLibOps += 1;
    }
  }

  recordPuppeteerGateBlock() {
    this.puppeteerGateWaits += 1;
  }

  getSnapshot() {
    const pAvg = this.puppeteerOps ? this.puppeteerTotalMs / this.puppeteerOps : 0;
    const lAvg = this.pdfLibOps ? this.pdfLibTotalMs / this.pdfLibOps : 0;
    return {
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate:
          this.cacheHits + this.cacheMisses > 0
            ? this.cacheHits / (this.cacheHits + this.cacheMisses)
            : 0,
      },
      generationMs: {
        puppeteer: {
          count: this.puppeteerOps,
          total: Math.round(this.puppeteerTotalMs * 10) / 10,
          avg: Math.round(pAvg * 100) / 100,
        },
        pdfLib: {
          count: this.pdfLibOps,
          total: Math.round(this.pdfLibTotalMs * 10) / 10,
          avg: Math.round(lAvg * 100) / 100,
        },
      },
      puppeteer: {
        gateWaits: this.puppeteerGateWaits,
        maxConcurrent: process.env.PUPPETEER_MAX_CONCURRENT ?? '3 (default)',
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
