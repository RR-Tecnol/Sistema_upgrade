import { Module } from '@nestjs/common';
import { PublicUploadController } from './public-upload.controller';
import { PublicUploadService } from './public-upload.service';

@Module({
    controllers: [PublicUploadController],
    providers: [PublicUploadService],
})
export class PublicUploadModule {}
