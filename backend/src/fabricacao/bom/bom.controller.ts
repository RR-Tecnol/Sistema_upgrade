import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { BomService } from './bom.service';

@ApiTags('fabricacao-bom')
@Controller('fabricacao/bom')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @Get('templates')
  @Roles('ADMIN', 'COORDINATOR')
  findTemplates() {
    return this.bomService.findTemplates();
  }

  @Get('templates/:id')
  @Roles('ADMIN', 'COORDINATOR')
  findOne(@Param('id') id: string) {
    return this.bomService.findOneTemplate(id);
  }
}
