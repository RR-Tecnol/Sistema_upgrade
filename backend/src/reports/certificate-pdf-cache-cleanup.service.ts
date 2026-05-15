import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { CertificatePdfCacheService } from './certificate-pdf-cache.service';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Remove ficheiros de cache de PDF de certificados com atime &gt; 30 dias.
 */
@Injectable()
export class CertificatePdfCacheCleanupService {
  private readonly log = new Logger(CertificatePdfCacheCleanupService.name);

  constructor(private readonly cache: CertificatePdfCacheService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeOldCacheFiles() {
    if (!this.cache.isEnabled()) {
      return;
    }
    const root = this.cache.getCacheRootDir();
    const now = Date.now();
    let removed = 0;
    let errors = 0;
    try {
      await fs.mkdir(root, { recursive: true });
    } catch {
      return;
    }
    const walk = async (dir: string) => {
      let entries: import('node:fs').Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          await walk(p);
          try {
            const sub = await fs.readdir(p);
            if (sub.length === 0) {
              await fs.rmdir(p);
            }
          } catch {
            // ok
          }
        } else {
          try {
            const st = await fs.stat(p);
            if (now - st.atimeMs > THIRTY_DAYS_MS) {
              await fs.unlink(p);
              removed += 1;
            }
          } catch {
            errors += 1;
          }
        }
      }
    };
    try {
      await walk(root);
      if (removed > 0) {
        this.log.log(`Cache PDF certificados: removidos ${removed} ficheiro(s) com atime &gt; 30 dias.`);
      }
      if (errors) {
        this.log.warn(`Cache PDF certificados: ${errors} erro(s) ao apagar entradas.`);
      }
    } catch (e) {
      this.log.warn(`Limpeza de cache de PDF: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
