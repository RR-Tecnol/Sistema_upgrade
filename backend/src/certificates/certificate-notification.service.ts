import { Injectable, Logger } from '@nestjs/common';
import { getPrimaryFrontendUrl } from '../common/cors-origins';
import { MailService } from '../mail/mail.service';
import { NotificationsSenderService } from '../notifications/notifications-sender.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

export type IssuedCertificatePayload = {
  verificationCode: string;
  studentEmail: string | null;
  studentName: string;
  courseName: string;
  studentUserId?: string;
  studentId?: string;  // ← necessário para enviar WhatsApp via student_contacts
};

/**
 * CertificateNotificationService — notificações pós-emissão de certificado.
 *
 * Usa MailService (Brevo) para email e WhatsAppService (Z-API) para WhatsApp.
 * Falhas nunca bloqueiam a emissão do certificado (chamado com void).
 */
@Injectable()
export class CertificateNotificationService {
  private readonly log = new Logger(CertificateNotificationService.name);

  constructor(
    private readonly mail: MailService,
    private readonly notificationsSender: NotificationsSenderService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async notifyCertificateIssued(p: IssuedCertificatePayload): Promise<void> {
    const base = getPrimaryFrontendUrl().replace(/\/$/, '');
    const verifyUrl = `${base}/certificado/verificar/${encodeURIComponent(p.verificationCode)}`;

    // ── Email via Brevo ──────────────────────────────────────────────────────
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

    // ── WhatsApp via Z-API ───────────────────────────────────────────────────
    if (p.studentId) {
      try {
        void this.whatsapp.notifyCertificateIssued(
          p.studentId,
          p.studentName,
          p.courseName,
          p.verificationCode,
          verifyUrl,
        );
      } catch {
        /* WhatsApp nunca bloqueia a emissão do certificado */
      }
    }

    // ── Notificação in-app via WebSocket ─────────────────────────────────────
    if (p.studentUserId) {
      await this.notificationsSender.certificateIssued(p.studentUserId, p.courseName).catch(() => {});
    }
  }
}

