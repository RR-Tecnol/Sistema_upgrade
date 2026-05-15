/**
 * Service dedicado ao gerenciamento de comprovantes (anexos) de Conta a Pagar.
 *
 * Mantido fora do serviço principal para isolar a dependência do MinIO e o ciclo
 * de upload via presigned URL. Padrão idêntico ao usado em `reimbursement`:
 *   1) front pede `presignedPutUrl` → MinIO devolve URL de upload temporária
 *   2) front faz PUT direto no MinIO (sem passar pelo backend)
 *   3) front chama `PATCH /contas-pagar/:id` ou este endpoint dedicado
 *      para persistir `comprovante_url` no banco
 *
 * Para visualização usamos presigned GET (URL temporária, sem expor bucket).
 */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../reimbursement/minio.service';

const BUCKET = process.env.MINIO_BUCKET_CONTAS_PAGAR || 'contas-pagar';
const MAX_FILENAME = 200;

@Injectable()
export class ContasPagarComprovanteService {
    private readonly logger = new Logger(ContasPagarComprovanteService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly minio: MinioService,
    ) { }

    /**
     * Gera URL temporária (15min) para o front enviar o arquivo direto ao MinIO.
     * Retorna também o `fileKey` (caminho dentro do bucket) e o `fileUrl` público
     * — que será persistido depois em `comprovante_url`.
     */
    async getPresignedUploadUrl(
        userId: string,
        contaId: string,
        filename: string,
        contentType: string,
    ): Promise<{ uploadUrl: string; fileKey: string; fileUrl: string }> {
        if (!filename?.trim() || filename.length > MAX_FILENAME) {
            throw new BadRequestException('Nome de arquivo inválido (vazio ou maior que 200 caracteres).');
        }
        if (!contentType?.trim()) {
            throw new BadRequestException('Content-Type é obrigatório.');
        }

        // Confere que a conta existe antes de gerar URL — evita uploads "órfãos".
        const conta = await this.prisma.contaPagar.findUnique({
            where: { id: contaId },
            select: { id: true, active: true },
        });
        if (!conta || !conta.active) {
            throw new NotFoundException('Conta a pagar não encontrada.');
        }

        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileKey = `${contaId}/${Date.now()}_${safeName}`;
        const uploadUrl = await this.minio.presignedPutUrl(BUCKET, fileKey, 900);

        const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
        const port = process.env.MINIO_PORT || '9010';
        const useSSL = process.env.MINIO_USE_SSL === 'true';
        const protocol = useSSL ? 'https' : 'http';
        const fileUrl = `${protocol}://${endpoint}:${port}/${BUCKET}/${fileKey}`;

        return { uploadUrl, fileKey, fileUrl };
    }

    /**
     * Persiste o URL do comprovante no banco e dispara auditoria via campo
     * `updatedAt` (PATCH normal já cobre auditoria geral — aqui o foco é
     * separar do PATCH de edição livre da conta).
     */
    async setComprovanteUrl(contaId: string, fileUrl: string): Promise<{ comprovante_url: string }> {
        const conta = await this.prisma.contaPagar.findUnique({
            where: { id: contaId },
            select: { id: true, active: true },
        });
        if (!conta || !conta.active) {
            throw new NotFoundException('Conta a pagar não encontrada.');
        }
        if (!fileUrl?.trim()) {
            throw new BadRequestException('URL do comprovante é obrigatória.');
        }

        const updated = await this.prisma.contaPagar.update({
            where: { id: contaId },
            data: { comprovante_url: fileUrl },
            select: { comprovante_url: true },
        });

        return { comprovante_url: updated.comprovante_url ?? '' };
    }

    /**
     * Remove o vínculo do comprovante. NÃO apaga o objeto no MinIO (mantém
     * para auditoria — usuário pode reanexar o mesmo arquivo se for engano).
     */
    async removeComprovante(contaId: string): Promise<{ ok: true }> {
        const conta = await this.prisma.contaPagar.findUnique({
            where: { id: contaId },
            select: { id: true, active: true, comprovante_url: true },
        });
        if (!conta || !conta.active) {
            throw new NotFoundException('Conta a pagar não encontrada.');
        }
        if (!conta.comprovante_url) {
            throw new BadRequestException('Esta conta não possui comprovante anexado.');
        }

        await this.prisma.contaPagar.update({
            where: { id: contaId },
            data: { comprovante_url: null },
        });
        return { ok: true };
    }

    /**
     * Gera URL GET assinada (60min) para o browser visualizar o comprovante.
     * Aceita tanto `comprovante_url` salvo no formato `http://host:port/bucket/key`
     * (caso novo) quanto URLs antigas/manuais — nesse caso, devolve o próprio URL.
     */
    async getPresignedViewUrl(contaId: string): Promise<{ url: string }> {
        const conta = await this.prisma.contaPagar.findUnique({
            where: { id: contaId },
            select: { comprovante_url: true, active: true },
        });
        if (!conta || !conta.active) {
            throw new NotFoundException('Conta a pagar não encontrada.');
        }
        if (!conta.comprovante_url) {
            throw new NotFoundException('Comprovante não anexado.');
        }

        // Se o URL salvo seguiu o padrão `${protocol}://${endpoint}:${port}/${bucket}/${key}`,
        // extraímos a chave e geramos URL assinada. Caso contrário, devolvemos como está
        // (compatibilidade com URLs externas inseridas via PATCH manual).
        try {
            const url = new URL(conta.comprovante_url);
            // Padrão esperado: /<bucket>/<key>
            const path = url.pathname.replace(/^\/+/, '');
            const [bucketPart, ...keyParts] = path.split('/');
            const key = keyParts.join('/');
            if (bucketPart === BUCKET && key) {
                const signed = await this.minio.presignedGetUrl(BUCKET, key, 3600);
                return { url: signed };
            }
            return { url: conta.comprovante_url };
        } catch {
            return { url: conta.comprovante_url };
        }
    }
}
