import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { plainAddPlaceholder } from '@signpdf/placeholder-plain';
import { P12Signer } from '@signpdf/signer-p12';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import signpdf from '@signpdf/signpdf';

/**
 * Contexto opcional por instituição (white-label). Caminho do .pfx e metadados;
 * se o ficheiro PFX da instituição falhar, recai em CERT_SIGN_PATH (env).
 */
export type PadesInstitutionContext = {
  /** Slug (ex.: `upgrade`) — procura `CERT_SIGN_PASSWORD_{SLUG}` */
  slug: string;
  signPfxPath: string | null;
  displayName?: string | null;
  siteUrl?: string | null;
};

/**
 * PAdES opcional: certificado A1 (.p12 / .pfx) em caminho da instituição ou CERT_SIGN_PATH.
 * Se ausente, expirado ou com erro, devolve o buffer original (graceful).
 */
@Injectable()
export class CertificatePdfSigningService {
  private readonly log = new Logger(CertificatePdfSigningService.name);

  private resolvePfxPassword(slug?: string | null): string | undefined {
    if (slug) {
      const k = 'CERT_SIGN_PASSWORD_' + slug.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const v = process.env[k];
      if (v !== undefined) {
        return v;
      }
    }
    return process.env.CERT_SIGN_PASSWORD;
  }

  private async resolveCertificatePath(institution: PadesInstitutionContext | null | undefined): Promise<string | null> {
    const envPath = process.env.CERT_SIGN_PATH?.trim();
    if (institution?.signPfxPath?.trim()) {
      const raw = institution.signPfxPath.trim();
      const resolved = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
      try {
        await fs.access(resolved);
        return resolved;
      } catch {
        this.log.warn(
          `Assinatura: ficheiro PFX da instituição inacessível (${resolved}); ` +
            'a recuar para CERT_SIGN_PATH do ambiente, se existir.',
        );
      }
    }
    if (envPath) {
      return envPath;
    }
    return null;
  }

  async signPadesIfConfigured(
    pdfBuffer: Buffer,
    institution?: PadesInstitutionContext | null,
  ): Promise<Buffer> {
    const certPath = await this.resolveCertificatePath(institution);
    if (!certPath) {
      return pdfBuffer;
    }
    const pass = this.resolvePfxPassword(institution?.slug);
    if (pass === undefined) {
      this.log.warn('PFX definido (instituição ou CERT_SIGN_PATH) sem senha; assinatura PAdES ignorada.');
      return pdfBuffer;
    }
    const contactInfo =
      institution?.siteUrl?.trim() || process.env.CERT_SIGN_CONTACT || 'https://cursos.upgrade';
    const name =
      institution?.displayName?.trim() || process.env.CERT_SIGN_NAME || 'Upgrade Tecnologia Educacional';
    const appName = `${name} — Certificados`;
    try {
      const p12 = await fs.readFile(certPath);
      const withPlaceholder = plainAddPlaceholder({
        pdfBuffer,
        reason: 'Certificação de autenticidade e integridade (PAdES).',
        contactInfo,
        name,
        location: process.env.CERT_SIGN_LOCATION || 'Brasil',
        appName,
      });
      const signer = new P12Signer(p12, { passphrase: pass });
      const out = await signpdf.sign(withPlaceholder, signer, new Date());
      return out as Buffer;
    } catch (e) {
      this.log.warn(
        `Assinatura PAdES não aplicada (rede/credenciais/validade): ${e instanceof Error ? e.message : String(e)}`,
      );
      return pdfBuffer;
    }
  }
}
