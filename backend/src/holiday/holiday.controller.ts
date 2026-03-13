import {
  Controller, Post, Get, Delete, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiProperty,
} from '@nestjs/swagger';
import { IsString, IsDateString, IsNotEmpty } from 'class-validator';
import { HolidayService } from './holiday.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

export class RegisterHolidayDto {
  @ApiProperty({ example: '2025-04-21', description: 'Data do feriado/imprevisto (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({
    example: 'Feriado Municipal — Aniversário da Cidade',
    description: 'Motivo do cancelamento',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

@ApiTags('Feriados e Imprevistos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('holiday')
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  /**
   * REQ-08: Professor ou admin registra um dia de não-aula.
   * O sistema recalcula a data de término da turma automaticamente.
   * Reunião 00:29:30 — "era para terminar dia 12, vai terminar dia 13"
   */
  @Post('class/:classId')
  @ApiOperation({ summary: 'Registrar feriado/imprevisto em turma (recalcula data de término)' })
  @ApiParam({ name: 'classId', description: 'ID da turma' })
  registerClassHoliday(
    @Param('classId') classId: string,
    @Body() dto: RegisterHolidayDto,
    @Request() req: any,
  ) {
    return this.holidayService.registerClassHoliday(
      classId,
      dto.date,
      dto.reason,
      req.user.id,
    );
  }

  /**
   * Lista todos os feriados/imprevistos de uma turma
   */
  @Get('class/:classId')
  @ApiOperation({ summary: 'Listar feriados/imprevistos de uma turma' })
  @ApiParam({ name: 'classId', description: 'ID da turma' })
  listClassHolidays(@Param('classId') classId: string) {
    return this.holidayService.listClassHolidays(classId);
  }

  /**
   * Remove um feriado registrado (Soft Delete) e reverte a data de término
   */
  @Delete(':holidayId')
  @Roles('ADMIN', 'COORDINATOR')
  @ApiOperation({ summary: 'Remover feriado registrado (reverte data de término) — só ADMIN/COORDINATOR' })
  @ApiParam({ name: 'holidayId', description: 'ID do registro de feriado' })
  removeClassHoliday(@Param('holidayId') holidayId: string) {
    return this.holidayService.removeClassHoliday(holidayId);
  }

  /**
   * Lista feriados nacionais de um ano (útil para o calendário do frontend)
   */
  @Get('national/:year')
  @ApiOperation({ summary: 'Listar feriados nacionais de um ano' })
  @ApiParam({ name: 'year', description: 'Ano (ex: 2025)', type: Number })
  getNationalHolidays(@Param('year') year: string) {
    return this.holidayService.getNationalHolidays(parseInt(year, 10));
  }
}
