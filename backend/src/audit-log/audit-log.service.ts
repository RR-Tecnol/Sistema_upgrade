import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface LogActionDto {
    userId?: string;
    action: string;           // ex: 'CREATE_ENROLLMENT' | 'UPDATE_EMPLOYEE' | 'DELETE_USER'
    tableName: string;        // ex: 'enrollments' | 'users'
    recordId?: string;
    oldData?: Record<string, any>;
    newData?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * AuditLogService
 * Serviço singleton para registrar ações críticas do sistema na tabela audit_logs.
 * Injetar em qualquer controller/service que precise de rastreabilidade.
 * O módulo é @Global, então não precisa de import adicional.
 */
@Injectable()
export class AuditLogService {
    constructor(private readonly prisma: PrismaService) {}

    async log(dto: LogActionDto): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    userId: dto.userId ?? null,
                    action: dto.action,
                    tableName: dto.tableName,
                    recordId: dto.recordId ?? null,
                    oldData: dto.oldData ?? undefined,
                    newData: dto.newData ?? undefined,
                    ipAddress: dto.ipAddress ?? null,
                    userAgent: dto.userAgent ?? null,
                },
            });
        } catch (err) {
            // Log de auditoria nunca deve quebrar o fluxo principal
            console.error('[AuditLog] Falha ao registrar ação:', err);
        }
    }
}
