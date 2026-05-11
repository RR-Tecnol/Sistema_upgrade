import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { AdminStudentsController } from './admin-students.controller';
import { AdminStudentsService } from './admin-students.service';
import { MinioService } from './minio.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
        MulterModule.register({ storage: undefined }), // use memory storage (buffer)
    ],
    controllers: [StudentsController, AdminStudentsController],
    providers: [StudentsService, AdminStudentsService, MinioService],
    exports: [StudentsService, AdminStudentsService, MinioService],
})
export class StudentsModule { }
