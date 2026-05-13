import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const META_SUFFIX = '.meta.json';

export type CertificatePdfCacheMetaV1 = {
  v: 1;
  templateVersionId: string;
  contentKey: string;
  /** ISO (para limpeza / inspeção) */
  savedAt: string;
};

export type ContentKeyInput = {
  /** Versão de modelo usada no render (snapshot ou resolvida) */
  templateVersionId: string;
  /** Nome do ficheiro PDF base quando aplicável (ficheiro em disco pode mudar sem mudar o id) */
  templatePdfFileHint?: string | null;
  studentName: string;
  courseName: string;
  workload: number;
  classIdentifier: string;
  cityName: string;
  cityState: string;
  /** Data de emissão (ISO) */
  issuedAtIso: string;
  issuerName: string;
  verificationCode: string;
  /** Tipo lógico de render: HTML | PDF_BASE | BUILTIN_HTML */
  engine: 'HTML' | 'PDF_BASE' | 'BUILTIN_HTML';
  /** Marca/white-label — qualquer alteração de instituição invalida o binário */
  institutionId: string;
};

/**
 * Cache em disco para `generateCertificatePdf` (não aplica a pré-visualização).
 * Invalidação: `debug === true` ignora; `sync-template` deve chamar `invalidate`.
 */
@Injectable()
export class CertificatePdfCacheService {
  private readonly log = new Logger(CertificatePdfCacheService.name);

  isEnabled(): boolean {
    if (process.env.CERT_PDF_CACHE_ENABLED === '0' || process.env.CERT_PDF_CACHE_DISABLED === '1') {
      return false;
    }
    return true;
  }

  private getRootDir(): string {
    return (
      process.env.CERT_PDF_CACHE_DIR ||
      path.resolve(process.cwd(), 'tmp', 'certificates', 'pdf-cache')
    );
  }

  /** Exposto para tarefa de limpeza (atime) e inspeção. */
  getCacheRootDir(): string {
    return this.getRootDir();
  }

  private hashVerificationCode(verificationCode: string): string {
    return createHash('sha256').update(verificationCode, 'utf8').digest('hex');
  }

  buildContentKey(input: ContentKeyInput): string {
    return createHash('sha256')
      .update(
        [
          input.templateVersionId,
          input.engine,
          input.templatePdfFileHint ?? '',
          input.studentName,
          input.courseName,
          String(input.workload),
          input.classIdentifier,
          input.cityName,
          input.cityState,
          input.issuedAtIso,
          input.issuerName,
          input.verificationCode,
          input.institutionId,
        ].join('\u001f'),
        'utf8',
      )
      .digest('hex');
  }

  private dirFor(verificationCode: string): string {
    const h = this.hashVerificationCode(verificationCode);
    return path.join(this.getRootDir(), h.slice(0, 2), h);
  }

  private dataPath(verificationCode: string): string {
    return path.join(this.dirFor(verificationCode), 'data.pdf');
  }

  private metaPath(verificationCode: string): string {
    return path.join(this.dirFor(verificationCode), `data.pdf${META_SUFFIX}`);
  }

  /**
   * Devolve o buffer se meta coincidir com a assinatura pedida; caso contrário `null`.
   */
  async get(verificationCode: string, expected: { templateVersionId: string; contentKey: string }): Promise<Buffer | null> {
    if (!this.isEnabled()) {
      return null;
    }
    const metaPath = this.metaPath(verificationCode);
    const dataPath = this.dataPath(verificationCode);
    try {
      const raw = await fs.readFile(metaPath, 'utf8');
      const meta = JSON.parse(raw) as CertificatePdfCacheMetaV1;
      if (meta.v !== 1) {
        return null;
      }
      if (meta.templateVersionId !== expected.templateVersionId) {
        return null;
      }
      if (meta.contentKey !== expected.contentKey) {
        return null;
      }
      return await fs.readFile(dataPath);
    } catch {
      return null;
    }
  }

  async set(
    verificationCode: string,
    put: { templateVersionId: string; contentKey: string },
    buffer: Buffer,
  ): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }
    const dir = this.dirFor(verificationCode);
    const tmp = path.join(dir, `data.${randomBytes(6).toString('hex')}.part`);
    const dataPath = this.dataPath(verificationCode);
    const mPath = this.metaPath(verificationCode);
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(tmp, buffer);
      const meta: CertificatePdfCacheMetaV1 = {
        v: 1,
        templateVersionId: put.templateVersionId,
        contentKey: put.contentKey,
        savedAt: new Date().toISOString(),
      };
      const metaTmp = mPath + '.new';
      await fs.writeFile(metaTmp, JSON.stringify(meta), 'utf8');
      await fs.rename(tmp, dataPath);
      await fs.rename(metaTmp, mPath);
    } catch (e) {
      this.log.warn(
        `Falha a gravar cache de PDF (${verificationCode}): ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      try {
        await fs.unlink(tmp).catch(() => undefined);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Remove a entrada (após `sync-template` ou mudança explícita).
   */
  async invalidate(verificationCode: string): Promise<void> {
    const dir = this.dirFor(verificationCode);
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      // ok
    }
  }
}
