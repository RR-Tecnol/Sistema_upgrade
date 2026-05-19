import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client } from 'minio';
import { getBrowserMinioClientConfig, isVpsStorageMode } from '../common/minio-browser-url.util';
import {
    APP_STORAGE_BUCKETS,
    buildPublicReadBucketPolicy,
} from '../common/minio-bucket-policy.util';

@Injectable()
export class MinioService implements OnModuleInit {
    private readonly logger = new Logger(MinioService.name);
    /** Operações servidor → MinIO (hostname Docker `minio` em produção). */
    private client!: Client;
    /** Presigned PUT/GET com host acessível ao browser — Sprint 1 / BUG-20. */
    private presignClient!: Client;

    onModuleInit() {
        const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
        const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
        this.client = new Client({
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT || '9000', 10),
            useSSL: process.env.MINIO_USE_SSL === 'true',
            accessKey,
            secretKey,
        });
        const browser = getBrowserMinioClientConfig();
        this.presignClient = new Client({
            endPoint: browser.endPoint,
            port: browser.port,
            useSSL: browser.useSSL,
            accessKey,
            secretKey,
        });
        this.logger.log(
            `MinIO: interno ${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}; ` +
                `browser ${browser.endPoint}:${browser.port}; ` +
                `VPS storage=${isVpsStorageMode() ? 'sim' : 'não'}`,
        );
        void this.ensureAppBucketsWithPublicRead();
    }

    /** Garante buckets + leitura via proxy `/storage/` na VPS. */
    private async ensureAppBucketsWithPublicRead(): Promise<void> {
        for (const bucket of APP_STORAGE_BUCKETS) {
            try {
                await this.ensureBucket(bucket);
                await this.client.setBucketPolicy(bucket, buildPublicReadBucketPolicy(bucket));
            } catch (err) {
                this.logger.warn(`MinIO policy ${bucket}: ${err}`);
            }
        }
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
        return this.presignClient.presignedPutObject(bucket, key, expirySeconds);
    }

    /** GET assinado para o browser ler imagem/PDF sem expor bucket público */
    async presignedGetUrl(
        bucket: string,
        objectKey: string,
        expirySeconds = 3600,
    ): Promise<string> {
        await this.ensureBucket(bucket);
        return this.presignClient.presignedGetObject(bucket, objectKey, expirySeconds);
    }
}
