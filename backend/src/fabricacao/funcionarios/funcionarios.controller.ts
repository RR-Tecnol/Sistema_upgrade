import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { FuncionariosService } from './funcionarios.service';

@ApiTags('fabricacao-funcionarios')
@Controller('fabricacao/funcionarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FuncionariosController {
  constructor(private readonly funcionariosService: FuncionariosService) {}

  @Get()
  @Roles('ADMIN', 'COORDINATOR')
  findAll(@Query('ordemId') ordemId?: string) {
    return this.funcionariosService.findAll(ordemId);
  }
}
