/**
 * Política de leitura pública em bucket MinIO — necessária para o nginx servir
 * `GET https://dominio/storage/<bucket>/<key>` sem presigned com host `minio`.
 */
export function buildPublicReadBucketPolicy(bucket: string): string {
    return JSON.stringify({
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucket}/*`],
            },
        ],
    });
}

/** Buckets usados por anexos do sistema (Sprint 1 / VPS). */
export const APP_STORAGE_BUCKETS = [
    'public-uploads',
    'stock-photos',
    'student-photos',
    process.env.MINIO_BUCKET_REIMBURSEMENT || 'reimbursements',
    process.env.MINIO_BUCKET_FEEDBACK || 'feedbacks',
    process.env.MINIO_BUCKET_CONTAS_PAGAR || 'contas-pagar',
    process.env.MINIO_BUCKET_REPORTS || 'reports',
    process.env.MINIO_BUCKET_PRODUCAO_FOTOS || 'producao-fotos',
    process.env.MINIO_BUCKET_PRODUCAO_DOCS  || 'producao-docs',
] as const;
