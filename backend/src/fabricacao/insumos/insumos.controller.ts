import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { InsumosService } from './insumos.service';

@ApiTags('fabricacao-insumos')
@Controller('fabricacao/insumos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InsumosController {
  constructor(private readonly insumosService: InsumosService) {}

  @Get()
  @Roles('ADMIN', 'COORDINATOR')
  findAll() {
    return this.insumosService.findAll();
  }
}
