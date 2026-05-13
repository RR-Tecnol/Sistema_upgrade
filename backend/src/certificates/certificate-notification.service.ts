import { Injectable, Logger } from '@nestjs/common';
import { getPrimaryFrontendUrl } from '../common/cors-origins';
import { MailService } from '../mail/mail.service';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';

export type IssuedCertificatePayload = {
  verificationCode: string;
  studentEmail: string | null;
  studentName: string;
  courseName: string;
  studentUserId?: string;
};

/**
 * CertificateNotificationService — notificações pós-emissão de certificado.
 *
 * Usa MailService (Brevo) para email — mantém webhook WhatsApp para futura integração.
 * Falhas nunca bloqueiam a emissão do certificado (chamado com void).
 */
@Injectable()
export class CertificateNotificationService {
  private readonly log = new Logger(CertificateNotificationService.name);

  constructor(
    private readonly mail: MailService,
    private readonly notificationsSender: NotificationsSenderService,
  ) {}

  async notifyCertificateIssued(p: IssuedCertificatePayload): Promise<void> {
    const base = getPrimaryFrontendUrl().replace(/\/$/, '');
    const verifyUrl   = `${base}/certificado/verificar/${encodeURIComponent(p.verificationCode)}`;
    const downloadUrl = `${base}/api/certificates/download/${encodeURIComponent(p.verificationCode)}`;

    // Email via Brevo (MailService)
    if (p.studentEmail?.includes('@')) {
      await this.mail.sendCertificateIssued(
        p.studentEmail,
        p.studentName,
        p.courseName,
        p.verificationCode,
      );
    } else {
      this.log.debug('Sem e-mail do aluno — notificação por e-mail ignorada');
    }

    // Webhook WhatsApp — reservado para futura integração
    await this.postWhatsappHook(p, verifyUrl, downloadUrl);

    // Notificação in-app via WebSocket
    if (p.studentUserId) {
      await this.notificationsSender.certificateIssued(p.studentUserId, p.courseName).catch(() => {});
    }
  }

  private async postWhatsappHook(
    p: IssuedCertificatePayload,
    verifyUrl: string,
    downloadUrl: string,
  ): Promise<void> {
    const url = process.env.CERT_WHATSAPP_WEBHOOK_URL?.trim();
    if (!url) return;

    const body = {
      event: 'certificate.issued',
      verificationCode: p.verificationCode,
      studentName: p.studentName,
      courseName: p.courseName,
      verifyUrl,
      downloadUrl,
    };

    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) this.log.warn(`Webhook WhatsApp respondeu ${r.status}`);
    } catch (e) {
      this.log.warn(`Webhook WhatsApp falhou: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
