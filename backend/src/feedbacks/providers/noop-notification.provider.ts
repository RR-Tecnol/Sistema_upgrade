import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, NotificationPayload } from './notification-provider.interface';

/**
 * NoopNotificationProvider — delivery real fica para sprint futura.
 * Hoje só loga. Pronto para ser substituído por SendGrid/Twilio/Z-API sem mexer em quem consome.
 */
@Injectable()
export class NoopEmailProvider implements NotificationProvider {
    readonly channel = 'EMAIL' as const;
    private readonly logger = new Logger(NoopEmailProvider.name);
    async send(p: NotificationPayload) {
        this.logger.log(`[NOOP-EMAIL] → ${p.userId} | ${p.title}`);
    }
}

@Injectable()
export class NoopSmsProvider implements NotificationProvider {
    readonly channel = 'SMS' as const;
    private readonly logger = new Logger(NoopSmsProvider.name);
    async send(p: NotificationPayload) {
        this.logger.log(`[NOOP-SMS] → ${p.userId} | ${p.title}`);
    }
}

@Injectable()
export class NoopWhatsappProvider implements NotificationProvider {
    readonly channel = 'WHATSAPP' as const;
    private readonly logger = new Logger(NoopWhatsappProvider.name);
    async send(p: NotificationPayload) {
        this.logger.log(`[NOOP-WHATSAPP] → ${p.userId} | ${p.title}`);
    }
}
