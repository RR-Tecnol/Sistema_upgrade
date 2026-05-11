import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client } from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
    private readonly logger = new Logger(MinioService.name);
    private client!: Client;

    onModuleInit() {
        this.client = new Client({
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT || '9000', 10),
            useSSL: process.env.MINIO_USE_SSL === 'true',
            accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
            secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        });
        this.logger.log('MinIO client inicializado (singleton)');
    }

    getClient(): Client {
        return this.client;
    }

    async ensureBucket(bucket: string): Promise<void> {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
            await this.client.makeBucket(bucket, 'us-east-1');
            this.logger.log(`Bucket '${bucket}' criado`);
        }
    }

    async presignedPutUrl(
        bucket: string,
        key: string,
        expirySeconds = 900,
    ): Promise<string> {
        await this.ensureBucket(bucket);
        return this.client.presignedPutObject(bucket, key, expirySeconds);
    }

    /** GET assinado para o browser ler imagem/PDF sem expor bucket público */
    async presignedGetUrl(
        bucket: string,
        objectKey: string,
        expirySeconds = 3600,
    ): Promise<string> {
        await this.ensureBucket(bucket);
        return this.client.presignedGetObject(bucket, objectKey, expirySeconds);
    }
}
