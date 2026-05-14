import { Injectable, Logger, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as Minio from 'minio';

const BUCKET = 'public-uploads';

const MIME_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
};

@Injectable()
export class PublicUploadService {
    private readonly logger = new Logger(PublicUploadService.name);
    private readonly client: Minio.Client;

    constructor() {
        this.client = new Minio.Client({
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT || '9000', 10),
            useSSL: (process.env.MINIO_USE_SSL || '').toLowerCase() === 'true',
            accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
            secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        });
        void this.ensureBucket();
    }

    private async ensureBucket() {
        try {
            const exists = await this.client.bucketExists(BUCKET);
            if (!exists) {
                await this.client.makeBucket(BUCKET, 'us-east-1');
                const policy = JSON.stringify({
                    Version: '2012-10-17',
                    Statement: [
                        {
                            Effect: 'Allow',
                            Principal: { AWS: ['*'] },
                            Action: ['s3:GetObject'],
                            Resource: [`arn:aws:s3:::${BUCKET}/*`],
                        },
                    ],
                });
                await this.client.setBucketPolicy(BUCKET, policy);
                this.logger.log(`Bucket '${BUCKET}' criado com leitura pública`);
            }
        } catch (err) {
            this.logger.error('MinIO (public-uploads):', err);
        }
    }

    async upload(buffer: Buffer, mimeType: string): Promise<{ url: string; filename: string }> {
        const ext = MIME_EXT[mimeType];
        if (!ext) {
            throw new BadRequestException(`Tipo não permitido: ${mimeType}`);
        }
        const filename = `anon/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
        try {
            await this.client.putObject(BUCKET, filename, buffer, buffer.length, {
                'Content-Type': mimeType,
            });
        } catch (err) {
            this.logger.error('Falha ao enviar para MinIO', err);
            throw new ServiceUnavailableException(
                'Armazenamento de ficheiros indisponível. Verifique se o MinIO está a correr.',
            );
        }
        // URL para o browser: deve coincidir com o proxy Next (`/storage/*` → MINIO_PUBLIC_BROWSER_URL).
        // No docker-compose local o mapeamento é 9010:9000; URLs com :9000 ou hostname `minio` quebram no browser.
        const url = this.buildBrowserObjectUrl(BUCKET, filename);
        return { url, filename };
    }

    allowedMime(mime: string): boolean {
        return mime in MIME_EXT;
    }

    /** URL absoluta que o painel (Next) consegue reescrever para `/storage/...` ou abrir directamente. */
    private buildBrowserObjectUrl(bucket: string, objectKey: string): string {
        const publicBase = (process.env.MINIO_PUBLIC_BROWSER_URL || '').trim().replace(/\/$/, '');
        if (publicBase) {
            return `${publicBase}/${bucket}/${objectKey}`;
        }
        const host = process.env.MINIO_PUBLIC_HOST || process.env.MINIO_BROWSER_HOST || 'localhost';
        const port = process.env.MINIO_PUBLIC_PORT || process.env.MINIO_BROWSER_PORT || '9010';
        const proto = (process.env.MINIO_USE_SSL || '').toLowerCase() === 'true' ? 'https' : 'http';
        return `${proto}://${host}:${port}/${bucket}/${objectKey}`;
    }
}
