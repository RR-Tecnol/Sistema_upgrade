import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { OperacoesService } from './operacoes.service';

@ApiTags('fabricacao-operacoes')
@Controller('fabricacao/ordens')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OperacoesController {
  constructor(private readonly operacoesService: OperacoesService) {}

  @Get(':id/operacoes')
  @Roles('ADMIN', 'COORDINATOR')
  findByOrdem(@Param('id') id: string) {
    return this.operacoesService.findByOrdem(id);
  }
}
