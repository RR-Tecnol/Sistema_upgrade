import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ApontamentoService } from './apontamento.service';
import { CreateApontamentoDto } from './dto/create-apontamento.dto';

@ApiTags('fabricacao-apontamentos')
@Controller('fabricacao/ordens')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApontamentoController {
  constructor(private readonly apontamentoService: ApontamentoService) {}

  @Get(':id/apontamentos')
  @Roles('ADMIN', 'COORDINATOR')
  findAll(@Param('id') id: string) {
    return this.apontamentoService['prisma'].apontamentoDiario.findMany({
      where: { ordemId: id },
      orderBy: { createdAt: 'desc' },
      include: { funcionario: true, operacao: true },
    });
  }

  @Post(':id/apontamentos')
  @Roles('ADMIN', 'COORDINATOR')
  registrar(@Param('id') id: string, @Body() dto: CreateApontamentoDto, @Request() req: any) {
    return this.apontamentoService.registrar(id, dto, req.user.id);
  }
}
