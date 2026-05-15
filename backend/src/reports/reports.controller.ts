import {
  Controller, Get, Param, Query, Res, UseGuards,
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
@Roles('ADMIN', 'COORDINATOR', 'TEACHER')
@Controller('reports')
export class ReportsController {
  constructor(private readonly pdfService: PdfService) {}

  /**
   * EXEC-05: Endpoint /all — usa a turma mais recente como amostra
   * Posicionado ANTES de /:classId para NestJS não confundir 'all' com um classId
   */
  @Get('frequency/all')
  @ApiOperation({ summary: 'Gerar PDF de frequência da turma mais recente' })
  async frequencyAll(@Res() res: Response) {
    const classes = await this.pdfService.getAllClassIds();
    if (!classes.length) return res.status(404).json({ message: 'Nenhuma turma encontrada' });
    const { buffer, summary, engine } = await this.pdfService.generateFrequencyPdfBuffer(classes[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="frequencia-geral-${new Date().toISOString().slice(0,10)}.pdf"`);
    res.setHeader('X-Summary', JSON.stringify(summary));
    res.setHeader('X-PDF-Engine', engine);
    return res.send(buffer);
  }

  @Get('concludents/all')
  @ApiOperation({ summary: 'Gerar PDF de concludentes da turma mais recente' })
  async concludentsAll(@Res() res: Response) {
    const classes = await this.pdfService.getAllClassIds();
    if (!classes.length) return res.status(404).json({ message: 'Nenhuma turma encontrada' });
    const { buffer, summary, engine } = await this.pdfService.generateConcludentsPdfBuffer(classes[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="concludentes-geral-${new Date().toISOString().slice(0,10)}.pdf"`);
    res.setHeader('X-Summary', JSON.stringify(summary));
    res.setHeader('X-PDF-Engine', engine);
    return res.send(buffer);
  }

  /**
   * REQ-11: Lista de frequência — PDF real via Puppeteer
   */
  @Get('frequency/:classId')
  @ApiOperation({
    summary: 'Gerar PDF de lista de frequência (REQ-11)',
    description: 'Retorna application/pdf gerado via Puppeteer. Template com modelo governamental.',
  })
  @ApiParam({ name: 'classId', description: 'ID da turma' })
  async frequencyReport(
    @Param('classId') classId: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Res() res: Response,
  ) {
    const { buffer, summary, engine } = await this.pdfService.generateFrequencyPdfBuffer(
      classId,
      start,
      end,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="frequencia-${classId}.pdf"`);
    res.setHeader('X-Summary', JSON.stringify(summary));
    res.setHeader('X-PDF-Engine', engine);
    return res.send(buffer);
  }

  /**
   * REQ-11: Apenas dados JSON — para integrações e dashboard
   */
  @Get('frequency/:classId/data')
  @ApiOperation({ summary: 'Dados de frequência em JSON' })
  @ApiParam({ name: 'classId', description: 'ID da turma' })
  async frequencyData(
    @Param('classId') classId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.pdfService.getFrequencyDashboardPayload(classId, start, end);
  }

  @Get('frequency/:classId/xlsx')
  @ApiOperation({ summary: 'XLSX avançado de frequência (dashboard premium)' })
  @ApiParam({ name: 'classId', description: 'ID da turma' })
  async frequencyXlsx(
    @Param('classId') classId: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Res() res: Response,
  ) {
    const buffer = await this.pdfService.generateFrequencyAdvancedXlsxBuffer(classId, start, end);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="frequencia-${classId}-${start || 'periodo'}.xlsx"`);
    return res.send(buffer);
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
    const { buffer, summary, engine } = await this.pdfService.generateConcludentsPdfBuffer(classId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="concludentes-${classId}.pdf"`);
    res.setHeader('X-Summary', JSON.stringify(summary));
    res.setHeader('X-PDF-Engine', engine);
    return res.send(buffer);
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

  @Get('employees/attendance')
  @ApiOperation({ summary: 'PDF de frequência de professores/motoristas por período' })
  async employeesAttendanceReport(
    @Query('role') role: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Res() res: Response,
  ) {
    const { buffer, summary, engine } = await this.pdfService.generateEmployeesAttendancePdfBuffer(
      role,
      start,
      end,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="frequencia-${String(role || 'funcionarios').toLowerCase()}-${start}-${end}.pdf"`,
    );
    res.setHeader('X-Summary', JSON.stringify(summary));
    res.setHeader('X-PDF-Engine', engine);
    return res.send(buffer);
  }

  @Get('employees/attendance/data')
  @ApiOperation({ summary: 'Dados dashboard de frequência de professores/motoristas por período' })
  async employeesAttendanceData(
    @Query('role') role: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.pdfService.getEmployeesAttendanceDashboardPayload(role, start, end);
  }

  @Get('employees/attendance/xlsx')
  @ApiOperation({ summary: 'XLSX avançado de frequência de professores/motoristas' })
  async employeesAttendanceXlsx(
    @Query('role') role: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Res() res: Response,
  ) {
    const buffer = await this.pdfService.generateEmployeesAdvancedXlsxBuffer(role, start, end);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="frequencia-${String(role || 'funcionarios').toLowerCase()}-${start || 'periodo'}.xlsx"`,
    );
    return res.send(buffer);
  }
}
