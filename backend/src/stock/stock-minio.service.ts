import { Injectable, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import { buildStoredObjectUrl } from '../common/minio-browser-url.util';
import { buildPublicReadBucketPolicy } from '../common/minio-bucket-policy.util';

@Injectable()
export class StockMinioService {
    private readonly logger = new Logger(StockMinioService.name);
    private readonly client: Minio.Client;
    private readonly bucket = 'stock-photos';

    constructor() {
        this.client = new Minio.Client({
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT || '9000'),
            useSSL: (process.env.MINIO_USE_SSL || 'false') === 'true',
            accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
            secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        });
        this.ensureBucket();
    }

    private async ensureBucket() {
        try {
            const exists = await this.client.bucketExists(this.bucket);
            if (!exists) {
                await this.client.makeBucket(this.bucket, 'us-east-1');
                await this.client.setBucketPolicy(
                    this.bucket,
                    buildPublicReadBucketPolicy(this.bucket),
                );
                this.logger.log(`Bucket '${this.bucket}' criado (public read)`);
            }
        } catch (err) {
            this.logger.error('Erro no setup do bucket de estoque:', err);
        }
    }

    async uploadFile(
        objectName: string,
        buffer: Buffer,
        mimeType: string,
    ): Promise<string> {
        await this.client.putObject(this.bucket, objectName, buffer, buffer.length, {
            'Content-Type': mimeType,
        });

        return buildStoredObjectUrl(this.bucket, objectName);
    }
}
