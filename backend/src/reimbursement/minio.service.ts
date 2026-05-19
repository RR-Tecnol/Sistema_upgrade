import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client } from 'minio';
import { isVpsStorageMode } from '../common/minio-browser-url.util';
import {
    APP_STORAGE_BUCKETS,
    buildPublicReadBucketPolicy,
} from '../common/minio-bucket-policy.util';

@Injectable()
export class MinioService implements OnModuleInit {
    private readonly logger = new Logger(MinioService.name);
    private client!: Client;
    /** Client configurado com o host PÚBLICO — gera HMAC válido para o browser */
    private presignClient!: Client;

    onModuleInit() {
        const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
        const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
        const endPoint  = process.env.MINIO_ENDPOINT || 'localhost';
        const port      = parseInt(process.env.MINIO_PORT || '9000', 10);
        const useSSL    = process.env.MINIO_USE_SSL === 'true';

        // Client interno — para operações reais (buckets, stat, etc.)
        this.client = new Client({ endPoint, port, useSSL, accessKey, secretKey });

        // Client público — APENAS para gerar presigned URLs com HMAC do host público
        // A URL gerada terá Host: <publicHost> — a assinatura será válida quando o browser enviar para esse host
        const publicBrowserUrl = (process.env.MINIO_PUBLIC_BROWSER_URL || '').trim();
        if (publicBrowserUrl) {
            try {
                const pub = new URL(publicBrowserUrl);
                const pubPort  = pub.port ? parseInt(pub.port, 10) : (pub.protocol === 'https:' ? 443 : 80);
                const pubSSL   = pub.protocol === 'https:';
                this.presignClient = new Client({
                    endPoint:  pub.hostname,
                    port:      pubPort,
                    useSSL:    pubSSL,
                    accessKey,
                    secretKey,
                    region:    'us-east-1',
                });
                this.logger.log(
                    `MinIO presign client: ${pub.protocol}//${pub.hostname}:${pubPort} (storagePrefix=${pub.pathname.replace(/\/$/, '')})`,
                );
            } catch {
                this.presignClient = this.client;
                this.logger.warn('MINIO_PUBLIC_BROWSER_URL inválida — usando client interno para presign');
            }
        } else {
            this.presignClient = this.client;
        }

        this.logger.log(
            `MinIO interno: ${endPoint}:${port}; publicBrowserUrl=${publicBrowserUrl || 'não-configurado'}; VPS=${isVpsStorageMode() ? 'sim' : 'não'}`,
        );
        void this.ensureAppBucketsWithPublicRead();
    }

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

    getClient(): Client { return this.client; }

    async ensureBucket(bucket: string): Promise<void> {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
            await this.client.makeBucket(bucket, 'us-east-1');
            this.logger.log(`Bucket '${bucket}' criado`);
        }
    }

    /**
     * Gera URL pré-assinada para PUT direto do browser.
     *
     * Usa presignClient configurado com o host PÚBLICO (ex: sistemaupgrade.com.br:443).
     * O HMAC é calculado com Host: sistemaupgrade.com.br → válido quando o browser enviar
     * para https://sistemaupgrade.com.br/storage/{bucket}/{key}
     *
     * nginx: location /storage/ { proxy_pass http://127.0.0.1:9000/; proxy_set_header Host $host; }
     * MinIO recebe path /{bucket}/{key} com Host: sistemaupgrade.com.br → assinatura válida.
     */
    async presignedPutUrl(bucket: string, key: string, expirySeconds = 900): Promise<string> {
        try { await this.ensureBucket(bucket); } catch (err) {
            this.logger.warn(`ensureBucket ${bucket}: ${(err as Error).message}`);
        }
        const rawUrl = await this.presignClient.presignedPutObject(bucket, key, expirySeconds);
        return this.addStoragePrefix(rawUrl);
    }

    /** GET assinado para admin/driver ver foto. */
    async presignedGetUrl(bucket: string, objectKey: string, expirySeconds = 3600): Promise<string> {
        try { await this.ensureBucket(bucket); } catch (err) {
            this.logger.warn(`ensureBucket ${bucket}: ${(err as Error).message}`);
        }
        const rawUrl = await this.presignClient.presignedGetObject(bucket, objectKey, expirySeconds);
        return this.addStoragePrefix(rawUrl);
    }

    /**
     * Adiciona o prefixo /storage ao path da URL gerada pelo presignClient público.
     * Ex: https://sistemaupgrade.com.br/reports/key?X-Amz-...
     *  → https://sistemaupgrade.com.br/storage/reports/key?X-Amz-...
     *
     * O host e a assinatura NÃO são alterados — apenas o path é prefixado.
     * nginx então strip /storage/ e encaminha /{bucket}/{key} para MinIO.
     */
    private addStoragePrefix(rawUrl: string): string {
        const publicBase = (process.env.MINIO_PUBLIC_BROWSER_URL || '').trim();
        if (!publicBase) return rawUrl;
        try {
            const pub    = new URL(publicBase);
            const prefix = pub.pathname.replace(/\/+$/, ''); // ex: /storage
            if (!prefix) return rawUrl;
            const u = new URL(rawUrl);
            if (!u.pathname.startsWith(prefix)) {
                u.pathname = prefix + u.pathname;
            }
            return u.toString();
        } catch {
            return rawUrl;
        }
    }
}
