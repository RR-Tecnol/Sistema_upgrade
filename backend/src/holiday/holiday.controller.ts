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
import { Public } from '../auth/decorators/public.decorator';
import { PreloadStateHolidaysDto } from './dto/preload-state-holidays.dto';
import { RegisterAcaoHolidaysDto } from './dto/register-acao-holidays.dto';
import { PreloadNationalCatalogDto } from './dto/preload-national-catalog.dto';

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
@Controller('holiday')
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  /**
   * REQ-08: Professor ou admin registra um dia de não-aula.
   * O sistema recalcula a data de término da turma automaticamente.
   * Reunião 00:29:30 — "era para terminar dia 12, vai terminar dia 13"
   */
  @Post('class/:classId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COORDINATOR', 'TEACHER')
  @ApiBearerAuth()
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
      req.user.role,
    );
  }

  @Post('acao/:acaoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COORDINATOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar dia(s) sem aula no período (motor N, sync turma/período)' })
  @ApiParam({ name: 'acaoId', description: 'ID do período de curso' })
  registerAcaoHolidays(
    @Param('acaoId') acaoId: string,
    @Body() dto: RegisterAcaoHolidaysDto,
    @Request() req: any,
  ) {
    return this.holidayService.registerAcaoHolidays(
      acaoId,
      dto,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * Lista todos os feriados/imprevistos de uma turma
   */
  @Get('class/:classId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COORDINATOR', 'TEACHER', 'STUDENT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar feriados/imprevistos de uma turma' })
  @ApiParam({ name: 'classId', description: 'ID da turma' })
  listClassHolidays(@Param('classId') classId: string, @Request() req: any) {
    return this.holidayService.listClassHolidays(classId, req.user.id, req.user.role);
  }

  /**
   * Remove um feriado registrado (Soft Delete) e reverte a data de término
   */
  @Delete(':holidayId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COORDINATOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover feriado registrado (reverte data de término) — só ADMIN/COORDINATOR' })
  @ApiParam({ name: 'holidayId', description: 'ID do registro de feriado' })
  removeClassHoliday(@Param('holidayId') holidayId: string) {
    return this.holidayService.removeClassHoliday(holidayId);
  }

  /**
   * Lista feriados nacionais de um ano (útil para o calendário do frontend)
   */
  @Get('national/:year')
  @Public()
  @ApiOperation({ summary: 'Listar feriados nacionais de um ano' })
  @ApiParam({ name: 'year', description: 'Ano (ex: 2025)', type: Number })
  getNationalHolidays(@Param('year') year: string) {
    return this.holidayService.getNationalHolidays(parseInt(year, 10));
  }

  /**
   * Feriados estaduais com datas fixas para uma UF (ex.: RS → Farroupilha 20/09).
   */
  @Get('state/:uf/:year')
  @Public()
  @ApiOperation({ summary: 'Listar feriados estaduais fixos de uma UF em um ano' })
  @ApiParam({ name: 'uf', description: 'Sigla da UF (ex: MA, SP)', type: String })
  @ApiParam({ name: 'year', description: 'Ano civil', type: Number })
  getStateHolidays(@Param('uf') uf: string, @Param('year') year: string) {
    const y = parseInt(year, 10);
    if (!Number.isFinite(y)) {
      return [];
    }
    return this.holidayService.getStateHolidaysForYear(uf, y);
  }

  /** BUG-15: catálogo global (lista sem turma). */
  @Get('catalog')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COORDINATOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar feriados do catálogo global do sistema' })
  listCatalog(@Request() req: any) {
    return this.holidayService.listCatalog(req.user.id, req.user.role);
  }

  @Post('preload-national-catalog')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COORDINATOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pré-carregar feriados nacionais no catálogo global (não exige turma ativa)' })
  preloadNationalCatalog(@Body() dto: PreloadNationalCatalogDto, @Request() req: any) {
    return this.holidayService.preloadNationalCatalog(req.user.id, req.user.role, dto);
  }

  @Post('preload-state-catalog')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COORDINATOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pré-carregar feriados estaduais no catálogo global por UF' })
  preloadStateCatalog(@Body() dto: PreloadStateHolidaysDto, @Request() req: any) {
    return this.holidayService.preloadStateCatalog(req.user.id, req.user.role, dto);
  }

  @Delete('catalog/:holidayId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COORDINATOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover feriado do catálogo global (soft delete)' })
  removeCatalogHoliday(@Param('holidayId') holidayId: string, @Request() req: any) {
    return this.holidayService.removeCatalogHoliday(holidayId, req.user.role);
  }

  /**
   * Pré-carrega feriados estaduais no catálogo e, se `applyToActiveClasses`, nas turmas IN_PROGRESS.
   */
  @Post('preload-state-holidays')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'COORDINATOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pré-carregar feriados estaduais (catálogo + opcional turmas IN_PROGRESS)' })
  preloadStateHolidays(@Body() dto: PreloadStateHolidaysDto, @Request() req: any) {
    return this.holidayService.preloadStateCatalog(req.user.id, req.user.role, dto);
  }
}
