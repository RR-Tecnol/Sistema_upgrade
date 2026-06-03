import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { NcService } from './nc.service';
import { CreateNcDto } from './dto/create-nc.dto';
import { StatusNaoConformidade } from '@prisma/client';

@ApiTags('fabricacao-nc')
@Controller('fabricacao/ordens')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NcController {
  constructor(private readonly ncService: NcService) {}

  @Get(':id/nc')
  @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
  findAll(@Param('id') id: string) {
    return this.ncService['prisma'].naoConformidade.findMany({
      where: { ordemId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        registrador: { select: { id: true, name: true, email: true } },
      },
    });
  }

  @Post(':id/nc')
  @Roles('ADMIN', 'COORDINATOR')
  registrar(@Param('id') id: string, @Body() dto: CreateNcDto, @Request() req: any) {
    return this.ncService.registrar(id, dto, req.user.id);
  }

  @Patch(':id/nc/:ncId/resolver')
  @Roles('ADMIN', 'COORDINATOR')
  resolver(
    @Param('id') id: string,
    @Param('ncId') ncId: string,
    @Body() body: { resolucao: string; status: StatusNaoConformidade },
    @Request() req: any,
  ) {
    return this.ncService.resolver(id, ncId, body.resolucao, body.status, req.user.id);
  }
}
