import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { OrdemService } from './ordem.service';
import { CreateOrdemDto } from './dto/create-ordem.dto';
import { LancarCustoServicoDto } from './dto/lancar-custo-servico.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { StatusOrdemFabricacao } from '@prisma/client';

@ApiTags('fabricacao-ordens')
@Controller('fabricacao/ordens')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdemController {
  constructor(
    private readonly ordemService: OrdemService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
  findAll(
    @Query('status') status?: StatusOrdemFabricacao,
    @Query('grupoId') grupoId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordemService.findAll({
      status, grupoId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get(':id')
  @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
  findOne(@Param('id') id: string) {
    return this.ordemService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'COORDINATOR')
  create(@Body() dto: CreateOrdemDto, @Request() req: any) {
    // validateUser retorna { id, email, role } — usar req.user.id (não userId)
    return this.ordemService.create(dto, req.user.id);
  }

  @Get(':id/evm')
  @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
  getEvm(@Param('id') id: string) {
    return this.ordemService.calcularEvmAtual(id);
  }

  @Get(':id/evm/historico')
  @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
  getEvmHistorico(@Param('id') id: string) {
    return this.ordemService['prisma'].snapshotEvm.findMany({
      where: { ordemId: id },
      orderBy: { data: 'asc' },
    });
  }

  @Get(':id/bom')
  @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
  async getBom(@Param('id') id: string) {
    // Busca todos os StockItems da categoria MATERIAL_FABRICACAO
    const stockItems = await this.prisma.stockItem.findMany({
      where: { categoria: 'MATERIAL_FABRICACAO', active: true },
      orderBy: { nome: 'asc' },
    });

    // Busca apontamentos desta OF — materiaisConsumidos é campo Json, já vem incluído
    const apontamentos = await this.prisma.apontamentoDiario.findMany({
      where: { ordemId: id },
    });

    // Mapeia stockItemId → quantidade consumida somando todos os apontamentos
    // Lê tanto stockItemId (campo correto) quanto insumoId (compatibilidade com registros antigos)
    const consumoPorItem: Record<string, number> = {};
    for (const ap of apontamentos) {
      const mats = (ap.materiaisConsumidos ?? []) as Array<{
        stockItemId?: string;
        insumoId?: string;
        quantidade?: number;
      }>;
      for (const mat of mats) {
        const itemId = mat.stockItemId ?? mat.insumoId; // stockItemId tem prioridade
        if (itemId) {
          consumoPorItem[itemId] = (consumoPorItem[itemId] ?? 0) + Number(mat.quantidade ?? 0);
        }
      }
    }

    // Formata como BomItem compatível com o frontend
    return stockItems.map(item => ({
      id: item.id,
      ordemId: id,
      insumoId: item.id,
      quantidadePrevista: Number(item.quantidadeMinima) || 0,
      quantidadeRealizada: consumoPorItem[item.id] ?? 0,
      quantidadeConsumida: consumoPorItem[item.id] ?? 0,
      insumo: {
        id: item.id,
        nome: item.nome,
        codigoInterno: item.codigoInterno,
        unidadeMedida: item.unidade,
        unidade: item.unidade,
        precoUnitario: Number(item.precoUnitario ?? 0),
        // ↓ estoque REAL atual do Central — sempre atualizado
        quantidadeAtual: Number(item.quantidadeAtual ?? 0),
        quantidadeMinima: Number(item.quantidadeMinima ?? 0),
        _source: 'estoque',
      },
    }));
  }

  @Get(':id/custos')
  @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
  getCustos(@Param('id') id: string) {
    return this.ordemService['prisma'].custoOf.findMany({
      where: { ordemId: id },
      orderBy: { createdAt: 'desc' },
      include: { fornecedor: true, contaPagar: true },
    });
  }

  @Delete(':id/custos/:custoId')
  @Roles('ADMIN', 'COORDINATOR')
  deletarCusto(
    @Param('id') id: string,
    @Param('custoId') custoId: string,
    @Request() req: any,
  ) {
    return this.ordemService.deletarCusto(id, custoId, req.user.id);
  }

  @Post(':id/custos')
  @Roles('ADMIN', 'COORDINATOR')
  registrarCusto(@Param('id') id: string, @Body() dto: LancarCustoServicoDto, @Request() req: any) {
    return this.ordemService.registrarCusto(id, dto as any, req.user.id);
  }

  @Get(':id/prestadores')
  @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
  getPrestadores(@Param('id') id: string) {
    return this.ordemService.getPrestadores(id);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'COORDINATOR')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: StatusOrdemFabricacao,
    @Request() req: any,
  ) {
    return this.ordemService.updateStatus(id, status, req.user.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'COORDINATOR')
  updateOrdem(
    @Param('id') id: string,
    @Body() dto: {
      observacoes?: string;
      alertaCustoPercent?: number;
      cursoEspecifico?: string;
      valorBauComprado?: number;
      valorBauDescricao?: string;
      valorFreteAquisicao?: number;
      valorFreteDescricao?: string;
    },
    @Request() req: any,
  ) {
    return this.ordemService.updateCampos(id, dto, req.user.id);
  }
}
