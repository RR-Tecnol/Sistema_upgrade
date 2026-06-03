import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { FornecedoresService } from './fornecedores.service';

@ApiTags('fabricacao-fornecedores')
@Controller('fabricacao/ordens')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FornecedoresController {
  constructor(private readonly fornecedoresService: FornecedoresService) {}

  @Get(':id/fornecedores')
  @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
  findByOrdem(@Param('id') id: string) {
    return this.fornecedoresService.findByOrdem(id);
  }
}
