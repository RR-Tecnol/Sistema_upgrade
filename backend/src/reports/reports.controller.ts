import {
  Controller, Get, Param, Res, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { PdfService } from './pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Relatórios PDF')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
@Controller('reports')
export class ReportsController {
  constructor(private readonly pdfService: PdfService) {}

  /**
   * REQ-11: Lista de frequência — PDF real via Puppeteer
   * Template PROVISÓRIO — substituir buildFrequencyHtml() quando Robert enviar o modelo oficial.
   * A lógica de dados e este controller NÃO precisam mudar.
   */
  @Get('frequency/:classId')
  @ApiOperation({
    summary: 'Gerar PDF de lista de frequência (REQ-11)',
    description: 'Retorna application/pdf gerado via Puppeteer. Template provisório.',
  })
  @ApiParam({ name: 'classId', description: 'ID da turma' })
  async frequencyReport(@Param('classId') classId: string, @Res() res: Response) {
    const { html, summary } = await this.pdfService.generateFrequencyReport(classId);
    const pdf = await this.pdfService.htmlToPdf(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="frequencia-${classId}.pdf"`);
    res.setHeader('X-Summary', JSON.stringify(summary));
    return res.send(pdf);
  }

  /**
   * REQ-11: Apenas dados JSON — para integrações e dashboard
   */
  @Get('frequency/:classId/data')
  @ApiOperation({ summary: 'Dados de frequência em JSON' })
  @ApiParam({ name: 'classId', description: 'ID da turma' })
  async frequencyData(@Param('classId') classId: string) {
    const { classInfo, summary } = await this.pdfService.generateFrequencyReport(classId);
    return { classInfo, summary };
  }

  /**
   * REQ-12: Lista de concludentes 3ª semana — PDF real via Puppeteer
   * Critério: aprovados ≥75% das aulas realizadas / desistentes <75% (LIVRO_REGRAS §5.3)
   */
  @Get('concludents/:classId')
  @ApiOperation({
    summary: 'Gerar PDF de concludentes 3ª semana (REQ-12)',
    description: 'Separa aprovados (≥75%) e desistentes (<75%). Template provisório.',
  })
  @ApiParam({ name: 'classId', description: 'ID da turma' })
  async concludentsReport(@Param('classId') classId: string, @Res() res: Response) {
    const { html, summary } = await this.pdfService.generateConcludentsList(classId);
    const pdf = await this.pdfService.htmlToPdf(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="concludentes-${classId}.pdf"`);
    res.setHeader('X-Summary', JSON.stringify(summary));
    return res.send(pdf);
  }

  /**
   * REQ-12: Apenas dados JSON — para integração com frontend
   */
  @Get('concludents/:classId/data')
  @ApiOperation({ summary: 'Dados de concludentes em JSON' })
  @ApiParam({ name: 'classId', description: 'ID da turma' })
  async concludentsData(@Param('classId') classId: string) {
    const { classInfo, summary } = await this.pdfService.generateConcludentsList(classId);
    return { classInfo, summary };
  }
}
