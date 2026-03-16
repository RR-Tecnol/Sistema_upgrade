import { Module } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { CoursesModule } from '../courses/courses.module';
import { TrucksModule } from '../trucks/trucks.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [CoursesModule, TrucksModule, NotificationsModule],
    controllers: [ClassesController],
    providers: [ClassesService],
    exports: [ClassesService],
})
export class ClassesModule { }
