import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PayrollService } from './payroll.service';

/**
 * PayrollController — REQ-09
 *
 * Expõe os cálculos de custo de campo CLT.
 * REGRA: professor CLT = salário base (custo org.) + diárias (R$120) + passagens (semanal/quinzenal).
 * Alinhado com transcrição 00:18:59–00:20:04 e 02_LIVRO_DE_REGRAS.md.
 */
@ApiTags('payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  /**
   * GET /payroll/employee/:id
   * Calcula custo de campo de um único funcionário em um período.
   *
   * @query diasTrabalhados - Número de dias trabalhados no período
   * @query distanciaKm    - Distância da cidade sede (define freq. passagem)
   * @query valorPassagem  - Valor de passagem ida+volta (R$)
   * @query semanas        - Quantidade de semanas do período
   */
  @Get('employee/:id')
  @ApiOperation({ summary: 'Calcula custo de campo de um funcionário CLT (REQ-09)' })
  @ApiQuery({ name: 'diasTrabalhados', type: Number, required: true })
  @ApiQuery({ name: 'distanciaKm', type: Number, required: true })
  @ApiQuery({ name: 'valorPassagem', type: Number, required: true })
  @ApiQuery({ name: 'semanas', type: Number, required: true })
  async calculateEmployee(
    @Param('id') id: string,
    @Query('diasTrabalhados') diasTrabalhados: string,
    @Query('distanciaKm') distanciaKm: string,
    @Query('valorPassagem') valorPassagem: string,
    @Query('semanas') semanas: string,
  ) {
    const dias = parseInt(diasTrabalhados);
    const km = parseFloat(distanciaKm);
    const passagem = parseFloat(valorPassagem);
    const sem = parseInt(semanas);

    if (isNaN(dias) || isNaN(km) || isNaN(passagem) || isNaN(sem)) {
      throw new BadRequestException(
        'Parâmetros inválidos: diasTrabalhados, distanciaKm, valorPassagem e semanas são obrigatórios e numéricos.',
      );
    }

    return this.payrollService.calculateFieldCost(id, dias, km, passagem, sem);
  }

  /**
   * GET /payroll/acao/:acaoId
   * Calcula custo total de todos os funcionários de um Período de Curso.
   *
   * @query valorPassagem - Valor unitário de passagem ida+volta (R$)
   */
  @Get('acao/:acaoId')
  @ApiOperation({ summary: 'Calcula custo total de campo de todos os funcionários de um Período de Curso (REQ-09)' })
  @ApiQuery({ name: 'valorPassagem', type: Number, required: true })
  async calculateAcao(
    @Param('acaoId') acaoId: string,
    @Query('valorPassagem') valorPassagem: string,
  ) {
    const passagem = parseFloat(valorPassagem);

    if (isNaN(passagem)) {
      throw new BadRequestException(
        'Parâmetro valorPassagem é obrigatório e deve ser numérico.',
      );
    }

    return this.payrollService.calculateAcaoCost(acaoId, passagem);
  }

  /**
   * GET /payroll/travel-rule
   * Retorna a regra de frequência de passagem para uma distância
   * WEEKLY (≤200km) ou BIWEEKLY (>200km)
   */
  @Get('travel-rule')
  @ApiOperation({ summary: 'Verifica regra semanal/quinzenal para uma distância (REQ-09)' })
  @ApiQuery({ name: 'distanciaKm', type: Number, required: true })
  getTravelRule(@Query('distanciaKm') distanciaKm: string) {
    const km = parseFloat(distanciaKm);
    if (isNaN(km)) {
      throw new BadRequestException('distanciaKm deve ser numérico');
    }
    const freq = this.payrollService.getTravelFrequency(km);
    return {
      distanciaKm: km,
      frequencia: freq,
      descricao: freq === 'WEEKLY'
        ? 'Cidade a ≤200km — passagem semanal (ida+volta por semana)'
        : 'Cidade a >200km — passagem quinzenal (ida+volta a cada 2 semanas)',
      fundamento: 'Transcrição reunião 00:18:59 — "menos de 200km passagem por semana, mais de 200km é quinzenal"',
    };
  }
}
