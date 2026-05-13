import { Injectable, Logger } from '@nestjs/common';
import * as Minio from 'minio';

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
                const policy = JSON.stringify({
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Principal: { AWS: ['*'] },
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${this.bucket}/*`],
                    }],
                });
                await this.client.setBucketPolicy(this.bucket, policy);
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

        const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
        const port = process.env.MINIO_PORT || '9000';
        const useSSL = (process.env.MINIO_USE_SSL || 'false') === 'true';
        const proto = useSSL ? 'https' : 'http';
        return `${proto}://${endpoint}:${port}/${this.bucket}/${objectName}`;
    }
}
