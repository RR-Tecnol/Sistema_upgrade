import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client } from 'minio';

/**
 * FeedbacksMinioService — Presigned URL para bucket de feedbacks.
 * Segue exatamente o padrão de reimbursement/minio.service.ts
 */
@Injectable()
export class FeedbacksMinioService implements OnModuleInit {
    private readonly logger = new Logger(FeedbacksMinioService.name);
    private client!: Client;

    onModuleInit() {
        this.client = new Client({
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT || '9000', 10),
            useSSL: process.env.MINIO_USE_SSL === 'true',
            accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
            secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        });
        this.logger.log('MinIO client (feedbacks) inicializado');
    }

    getClient(): Client {
        return this.client;
    }

    private get bucket(): string {
        return process.env.MINIO_BUCKET_FEEDBACK || 'feedbacks';
    }

    async ensureBucket(): Promise<void> {
        const exists = await this.client.bucketExists(this.bucket);
        if (!exists) {
            await this.client.makeBucket(this.bucket, 'us-east-1');
            this.logger.log(`Bucket '${this.bucket}' criado`);
        }
    }

    async presignedPutUrl(
        key: string,
        expirySeconds = 900,
    ): Promise<string> {
        await this.ensureBucket();
        return this.client.presignedPutObject(this.bucket, key, expirySeconds);
    }

    async presignedGetUrl(
        key: string,
        expirySeconds = 900,
        options?: { downloadFilename?: string },
    ): Promise<string> {
        await this.ensureBucket();
        const reqParams: Record<string, string> = {};
        if (options?.downloadFilename) {
            // Sanitiza nome: remove aspas duplas e control chars
            const safe = options.downloadFilename.replace(/["\r\n]/g, '_');
            reqParams['response-content-disposition'] = `attachment; filename="${safe}"`;
        }
        return this.client.presignedGetObject(this.bucket, key, expirySeconds, reqParams);
    }
}
