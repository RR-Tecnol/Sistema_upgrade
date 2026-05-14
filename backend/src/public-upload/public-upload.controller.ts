import {
    BadRequestException,
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { PublicUploadService } from './public-upload.service';

const MAX_BYTES = 5 * 1024 * 1024;

@ApiTags('Upload público')
@Controller('public')
export class PublicUploadController {
    constructor(private readonly uploads: PublicUploadService) {}

    @Post('upload')
    @Public()
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @ApiOperation({ summary: 'Upload anónimo (PDF/imagem) para cadastro público e documentos' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
            required: ['file'],
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: MAX_BYTES },
        }),
    )
    async upload(@UploadedFile() file?: Express.Multer.File) {
        if (!file?.buffer?.length) {
            throw new BadRequestException('Ficheiro em falta.');
        }
        const mime = (file.mimetype || '').toLowerCase();
        if (!this.uploads.allowedMime(mime)) {
            throw new BadRequestException('Apenas PDF, JPEG, PNG ou WebP são aceites.');
        }
        return this.uploads.upload(file.buffer, mime);
    }
}
