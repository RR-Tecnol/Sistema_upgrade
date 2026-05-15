import {
    Controller, Get, Patch, Delete, Param,
    UseGuards, Request, Query, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const NOTIFICATION_TYPE_VALUES = new Set<string>(Object.values(NotificationType));

/**
 * Notificações persistidas — GET/PATCH/DELETE
 * O model Notification original no schema tem os campos:
 *   id, userId, type, title, message, channel, data, sentAt, readAt, clickedAt, deliveryStatus, errorMessage, createdAt
 *
 * Usamos `readAt` (DateTime?) para indicar lido vs. não-lido
 * e `deliveryStatus` já existente (PENDING/SENT/DELIVERED/FAILED).
 */
@ApiTags('Notificações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
    constructor(private prisma: PrismaService) {}

    /** GET /notifications — lista notificações do usuário logado */
    @Get()
    @ApiOperation({ summary: 'Listar notificações do usuário logado (paginado)' })
    @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, description: 'true = só não lidas' })
    @ApiQuery({ name: 'read', required: false, type: Boolean, description: 'Compat FE: read=false equivale a unreadOnly=true' })
    @ApiQuery({ name: 'type', required: false, enum: NotificationType, description: 'Filtrar por tipo (ex.: CERTIFICATE_AVAILABLE)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async findAll(
        @Request() req: any,
        @Query('unreadOnly') unreadOnly?: string,
        @Query('read') read?: string,
        @Query('type') type?: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    ) {
        const userId = req.user.id;
        const where: any = { userId };
        // Não lidas: unreadOnly=true OU read=false (portal aluno envia read=false)
        const wantsUnread =
            unreadOnly === 'true' ||
            read === 'false' ||
            read === '0';
        if (wantsUnread) where.readAt = null;

        if (type && NOTIFICATION_TYPE_VALUES.has(type)) {
            where.type = type as NotificationType;
        }

        const [items, total, unreadCount] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.notification.count({ where }),
            this.prisma.notification.count({ where: { userId, readAt: null } }),
        ]);

        // Normaliza para o frontend: campo `read` derivado de readAt
        const data = items.map(n => ({
            ...n,
            read: n.readAt !== null,
        }));

        return {
            data,
            meta: {
                total,
                unreadCount,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /** PATCH /notifications/read-all — marcar todas como lidas (antes de /:id/read para não conflitar) */
    @Patch('read-all')
    @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
    async markAllRead(@Request() req: any) {
        return this.prisma.notification.updateMany({
            where: { userId: req.user.id, readAt: null },
            data: { readAt: new Date(), clickedAt: new Date() },
        });
    }

    /** PATCH /notifications/:id/read — marcar uma como lida */
    @Patch(':id/read')
    @ApiOperation({ summary: 'Marcar notificação como lida' })
    async markRead(@Param('id') id: string, @Request() req: any) {
        return this.prisma.notification.updateMany({
            where: { id, userId: req.user.id },
            data: { readAt: new Date() },
        });
    }

    /** DELETE /notifications/:id — excluir notificação */
    @Delete(':id')
    @ApiOperation({ summary: 'Excluir uma notificação' })
    async remove(@Param('id') id: string, @Request() req: any) {
        return this.prisma.notification.deleteMany({
            where: { id, userId: req.user.id },
        });
    }

    /** DELETE /notifications — limpar todas do usuário */
    @Delete()
    @ApiOperation({ summary: 'Limpar todas as notificações do usuário' })
    async clearAll(@Request() req: any) {
        return this.prisma.notification.deleteMany({
            where: { userId: req.user.id },
        });
    }
}
