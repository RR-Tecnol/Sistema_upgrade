import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { NotificationsSenderService } from './notifications-sender.service';

@Global()
@Module({
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (config: ConfigService) => ({
                secret: config.get('JWT_SECRET'),
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [NotificationsController],
    providers: [NotificationsGateway, NotificationsSenderService],
    exports: [NotificationsGateway, NotificationsSenderService],
})
export class NotificationsModule {}

