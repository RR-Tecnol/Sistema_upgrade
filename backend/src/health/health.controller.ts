import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Rotas na raiz do prefixo global `/api` — probes: GET /api/health e GET /api/ready
 */
@ApiTags('health')
@Controller()
export class HealthController {
    constructor(private readonly prisma: PrismaService) {}

    @Public()
    @Get('health')
    @ApiOperation({ summary: 'Liveness — sempre 200 se o processo Nest estiver a correr' })
    getHealth() {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }

    @Public()
    @Get('ready')
    @ApiOperation({ summary: 'Readiness — verifica ligação à base de dados' })
    async getReady() {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return { status: 'ready', database: true, timestamp: new Date().toISOString() };
        } catch {
            throw new ServiceUnavailableException('Base de dados indisponível');
        }
    }
}
