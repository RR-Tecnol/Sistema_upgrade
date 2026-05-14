import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailScheduler } from './mail.scheduler';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [MailService, MailScheduler],
    exports: [MailService],
})
export class MailModule {}
