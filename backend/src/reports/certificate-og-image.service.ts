import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { PrismaService } from '../prisma/prisma.service';
import { CertificateMetricsService } from './certificate-metrics.service';
import { PuppeteerCertificateGate, getPuppeteerMaxConcurrentFromEnv } from './puppeteer-certificate.gate';

const OG_W = 1200;
const OG_H = 630;

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * PNG 1200×630 para Open Graph (cache agressiva em disco).
 */
@Injectable()
export class CertificateOgImageService {
  private readonly log = new Logger(CertificateOgImageService.name);
  private readonly gate: PuppeteerCertificateGate;

  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: CertificateMetricsService,
  ) {
    this.gate = new PuppeteerCertificateGate(
      getPuppeteerMaxConcurrentFromEnv(),
      () => this.metrics.recordPuppeteerGateBlock(),
    );
  }

  private cacheRoot(): string {
    return process.env.CERT_OG_IMAGE_CACHE_DIR || path.join(process.cwd(), 'tmp', 'certificates', 'og-cache');
  }

  private cachePathFor(code: string, templateVersionId: string | null, institutionId: string | null): string {
    const key = createHash('sha256')
      .update(`${code}|${templateVersionId ?? 'none'}|${institutionId ?? 'none'}|og-v2`)
      .digest('hex');
    return path.join(this.cacheRoot(), `${key}.png`);
  }

  async getPngForVerificationCode(code: string): Promise<Buffer> {
    const cert = await this.prisma.certificate.findFirst({
      where: { verificationCode: code, status: 'ACTIVE' },
      include: {
        student: { include: { user: { select: { name: true } } } },
        class: {
          include: {
            course: {
              select: {
                name: true,
                workloadHours: true,
                institution: {
                  select: {
                    id: true,
                    shortName: true,
                    name: true,
                    logoUrl: true,
                    primaryColor: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!cert) {
      throw new NotFoundException('Certificado não encontrado');
    }

    const inst = cert.class?.course?.institution;
    const filePath = this.cachePathFor(code, cert.templateVersionId, inst?.id ?? null);
    try {
      const buf = await fs.readFile(filePath);
      if (buf.length > 100) {
        return buf;
      }
    } catch {
      // miss
    }

    const t0 = performance.now();
    const buf = await this.renderPng({
      ...cert,
      institution: cert.class?.course?.institution ?? null,
    });
    this.metrics.recordPuppeteerRun(performance.now() - t0);
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, buf);
    } catch (e) {
      this.log.warn(`OG cache write falhou: ${e instanceof Error ? e.message : String(e)}`);
    }
    return buf;
  }

  private async renderPng(
    cert: {
      verificationCode: string;
      templateVersionId: string | null;
      issuedAt: Date;
      student: { user: { name: string } | null } | null;
      class: { course: { name: string; workloadHours: number } | null } | null;
      /** Opcional: cópia de `class.course.institution` para branding OG */
      institution: {
        shortName: string | null;
        name: string;
        logoUrl: string | null;
        primaryColor: string | null;
      } | null;
    },
  ): Promise<Buffer> {
    const name = cert.student?.user?.name?.trim() || 'Aluno';
    const course = cert.class?.course?.name?.trim() || 'Curso';
    const hours = cert.class?.course?.workloadHours ?? 0;
    const codeShort = cert.verificationCode;
    const issued = new Date(cert.issuedAt).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const inst = cert.institution;
    const brandLabel =
      inst?.shortName?.trim() || inst?.name?.trim() || process.env.CERT_PUBLIC_INSTITUTION_NAME?.trim() || 'UPGRADE';
    const barColor =
      inst?.primaryColor?.trim() || process.env.CERT_BRAND_PRIMARY_COLOR?.trim() || '#22d3ee';
    const brandLogo = inst?.logoUrl?.trim() || process.env.CERT_BRAND_LOGO_URL?.trim() || null;

    const brandBlock = brandLogo
      ? `<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap"><img src="${escHtml(brandLogo)}" alt="" style="max-height:40px;max-width:200px;object-fit:contain" crossorigin="anonymous" /><span class="brand" style="margin:0">${escHtml(brandLabel)}</span></div>`
      : `<div class="brand">${escHtml(brandLabel)}</div>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@800;900&family=Inter:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin:0; padding:0; }
  body {
    width:${OG_W}px; height:${OG_H}px;
    background: linear-gradient(145deg, #0f172a 0%, #1e293b 40%, #0b1220 100%);
    font-family: Inter, system-ui, sans-serif; color: #e2e8f0;
    position: relative; overflow: hidden;
  }
  .glow { position:absolute; inset:0; background:
    radial-gradient(ellipse 80% 50% at 20% 10%, rgba(6,182,212,0.2), transparent 50%),
    radial-gradient(ellipse 60% 40% at 100% 80%, rgba(168,85,247,0.12), transparent 45%);
  }
  .bar { position:absolute; top:0; left:0; right:0; height:6px;
    background: linear-gradient(90deg, ${barColor}, #a855f7, #f59e0b);
  }
  .inner { padding: 48px 56px; position: relative; z-index: 1; }
  .brand { font-family: Orbitron, sans-serif; font-size: 18px; letter-spacing:0.25em; color: #fbbf24; font-weight: 900; }
  h1 { font-family: Orbitron, sans-serif; font-size: 38px; font-weight: 900; color: #f8fafc; margin: 20px 0 12px;
    line-height: 1.15; max-width: 1050px; }
  .course { font-size: 24px; font-weight: 600; color: #94a3b8; max-width: 1000px; }
  .meta { margin-top: 32px; display: flex; gap: 32px; flex-wrap: wrap; font-size: 16px; color: #94a3b8; }
  .badge {
    display: inline-flex; align-items: center; gap: 10px; margin-top: 40px;
    padding: 14px 24px; border-radius: 9999px; background: rgba(16,185,129,0.15);
    border: 1px solid rgba(16,185,129,0.4); color: #6ee7b7; font-weight: 700; font-size: 17px;
  }
  .code { font-family: ui-monospace, monospace; font-size: 13px; color: #64748b; margin-top: 20px; }
</style></head>
<body>
  <div class="glow"></div>
  <div class="bar"></div>
  <div class="inner">
    ${brandBlock}
    <h1>${escHtml(name)}</h1>
    <p class="course">${escHtml(course)} — ${hours}h · Emitido em ${escHtml(issued)}</p>
    <div class="badge">✓ Certificado autêntico verificado</div>
    <p class="code">${escHtml(codeShort)}</p>
  </div>
</body></html>`;

    return this.gate.use(async () => {
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
      });
      try {
        const page = await browser.newPage();
        await page.setViewport({ width: OG_W, height: OG_H, deviceScaleFactor: 1 });
        await page.setContent(html, { waitUntil: 'networkidle0' as any });
        const b64 = await page.screenshot({ type: 'png', fullPage: false, omitBackground: false });
        return Buffer.from(b64);
      } finally {
        await browser.close();
      }
    });
  }
}
