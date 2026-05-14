import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FeedbacksService } from './feedbacks.service';
import { FeedbacksController } from './feedbacks.controller';
import { FeedbacksInvitationService } from './feedbacks-invitation.service';
import { FeedbacksMinioService } from './feedbacks-minio.service';
import { FeedbacksScheduler } from './feedbacks.scheduler';
import { NoopEmailProvider, NoopSmsProvider, NoopWhatsappProvider } from './providers/noop-notification.provider';
import { MailModule } from '../mail/mail.module';

@Module({
    imports: [PrismaModule, MailModule],
    controllers: [FeedbacksController],
    providers: [
        FeedbacksService,
        FeedbacksInvitationService,
        FeedbacksMinioService,
        FeedbacksScheduler,
        NoopEmailProvider,
        NoopSmsProvider,
        NoopWhatsappProvider,
    ],
    exports: [FeedbacksInvitationService],
})
export class FeedbacksModule {}
