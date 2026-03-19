import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('audit-logs')
export class AuditLogController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    @ApiOperation({ summary: 'Listar logs de auditoria (apenas ADMIN)' })
    async findAll(
        @Query('page') page = '1',
        @Query('limit') limit = '50',
        @Query('userId') userId?: string,
        @Query('action') action?: string,
        @Query('tableName') tableName?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const where: any = {};
        if (userId) where.userId = userId;
        if (action) where.action = { contains: action, mode: 'insensitive' };
        if (tableName) where.tableName = tableName;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to);
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, name: true, email: true, role: true } },
                },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            data: logs,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        };
    }
}
