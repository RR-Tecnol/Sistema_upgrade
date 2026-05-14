import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DriverLocationService } from './driver-location.service';
import { DriverLocationController } from './driver-location.controller';
import { CitiesModule } from '../cities/cities.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        ScheduleModule.forRoot(), // F1.6: habilita cron jobs para cleanup LGPD
        CitiesModule,             // F2.7: geocode do destino para ETA
        NotificationsModule,      // F2.9: emissao WS para admins (driver_location_update, alertas)
    ],
    controllers: [DriverLocationController],
    providers: [DriverLocationService],
    exports: [DriverLocationService],
})
export class DriverLocationModule { }
