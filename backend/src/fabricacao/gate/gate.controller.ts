import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GateService } from './gate.service';
import { AprovarGateDto } from './dto/aprovar-gate.dto';
import { OperacaoRoteiro } from '@prisma/client';

@ApiTags('fabricacao-gates')
@Controller('fabricacao/ordens')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GateController {
  constructor(private readonly gateService: GateService) {}

  @Get(':id/gates/:operacao')
  @Roles('ADMIN', 'COORDINATOR')
  getChecklist(@Param('id') id: string, @Param('operacao') operacao: OperacaoRoteiro) {
    return this.gateService.getChecklist(id, operacao);
  }

  @Post(':id/gates/:operacao/aprovar')
  @Roles('ADMIN', 'COORDINATOR')
  aprovar(
    @Param('id') id: string,
    @Param('operacao') operacao: OperacaoRoteiro,
    @Body() dto: AprovarGateDto,
    @Request() req: any,
  ) {
    return this.gateService.aprovarGate(id, operacao, dto, req.user.id);
  }

  @Patch(':id/gates/:operacao')
  @Roles('ADMIN', 'COORDINATOR')
  salvarChecklist(
    @Param('id') id: string,
    @Param('operacao') operacao: OperacaoRoteiro,
    @Body('itens') itens: any[],
  ) {
    return this.gateService.salvarChecklist(id, operacao, itens);
  }
}
