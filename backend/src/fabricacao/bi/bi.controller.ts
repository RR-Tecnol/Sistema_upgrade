import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { BiService } from './bi.service';

@ApiTags('fabricacao-bi')
@Controller('fabricacao/bi')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BiController {
  constructor(private readonly biService: BiService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
  getDashboard() {
    return this.biService.getDashboard();
  }
}
