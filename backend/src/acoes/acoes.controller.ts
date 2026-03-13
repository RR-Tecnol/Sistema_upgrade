import {
    Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AcoesService } from './acoes.service';
import { CreateAcaoDto } from './dto/create-acao.dto';
import { CreateAcaoCustoDto } from './dto/create-acao-custo.dto';
import { CreateAcaoEquipeDto } from './dto/create-acao-equipe.dto';
import { CreateAcaoFuncionarioDto } from './dto/create-acao-funcionario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AcaoStatus } from '@prisma/client';

@ApiTags('acoes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('acoes')
export class AcoesController {
    constructor(private readonly acoesService: AcoesService) { }

    // ── Estatísticas ─────────────────────────────────────────────
    @Get('estatisticas')
    @ApiOperation({ summary: 'Estatísticas gerais das ações' })
    async getEstatisticas() {
        return this.acoesService.getEstatisticas();
    }

    // ── Listagem ─────────────────────────────────────────────────
    @Get()
    @ApiOperation({ summary: 'Listar todas as ações' })
    @ApiQuery({ name: 'status', required: false, enum: AcaoStatus })
    @ApiQuery({ name: 'grupoId', required: false })
    @ApiQuery({ name: 'cidadeId', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiResponse({ status: 200, description: 'Ações listadas com sucesso' })
    async findAll(
        @Query('status') status?: AcaoStatus,
        @Query('grupoId') grupoId?: string,
        @Query('cidadeId') cidadeId?: string,
        @Query('search') search?: string,
    ) {
        return this.acoesService.findAll({ status, grupoId, cidadeId, search });
    }

    // ── Autocomplete de cidades ───────────────────────────────────
    @Get('cidades-autocomplete')
    @ApiOperation({ summary: 'Buscar cidades pelo nome para autocomplete' })
    @ApiQuery({ name: 'q', required: true })
    async searchCidades(@Query('q') q: string) {
        return this.acoesService.searchCidades(q || '');
    }

    // ── Detalhe ──────────────────────────────────────────────────
    @Get(':id')
    @ApiOperation({ summary: 'Detalhe completo de uma ação' })
    @ApiResponse({ status: 200, description: 'Ação encontrada' })
    @ApiResponse({ status: 404, description: 'Ação não encontrada' })
    async findOne(@Param('id') id: string) {
        return this.acoesService.findOne(id);
    }

    @Get(':id/resumo-financeiro')
    @ApiOperation({ summary: 'Resumo financeiro estimado vs real de uma ação' })
    async getResumoFinanceiro(@Param('id') id: string) {
        return this.acoesService.getResumoFinanceiro(id);
    }

    // ── CRUD ─────────────────────────────────────────────────────
    @Post()
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Criar nova ação' })
    @ApiResponse({ status: 201, description: 'Ação criada com sucesso' })
    async create(@Body() data: CreateAcaoDto) {
        return this.acoesService.create(data);
    }

    @Patch(':id')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Atualizar ação' })
    @ApiResponse({ status: 200, description: 'Ação atualizada com sucesso' })
    async update(@Param('id') id: string, @Body() data: Partial<CreateAcaoDto>) {
        return this.acoesService.update(id, data);
    }

    @Patch(':id/status')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Atualizar status da ação' })
    async updateStatus(@Param('id') id: string, @Body('status') status: AcaoStatus) {
        return this.acoesService.updateStatus(id, status);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Excluir ação' })
    @ApiResponse({ status: 200, description: 'Ação excluída com sucesso' })
    async delete(@Param('id') id: string) {
        return this.acoesService.delete(id);
    }

    // ── Turmas ──────────────────────────────────────────────────
    @Post(':id/turmas/:turmaId')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Vincular turma à ação' })
    async addTurma(@Param('id') id: string, @Param('turmaId') turmaId: string) {
        return this.acoesService.addTurma(id, turmaId);
    }

    @Delete(':id/turmas/:turmaId')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Desvincular turma da ação' })
    async removeTurma(@Param('id') id: string, @Param('turmaId') turmaId: string) {
        return this.acoesService.removeTurma(id, turmaId);
    }

    // ── Equipe ───────────────────────────────────────────────────
    @Post(':id/equipe')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Adicionar membro à equipe da ação' })
    async addEquipe(@Param('id') id: string, @Body() data: CreateAcaoEquipeDto) {
        return this.acoesService.addEquipe(id, data);
    }

    @Patch(':id/equipe/:userId/dias')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Atualizar dias trabalhados de membro da equipe' })
    async updateEquipeDias(
        @Param('id') id: string,
        @Param('userId') userId: string,
        @Body('diasTrabalhados') diasTrabalhados: number,
    ) {
        return this.acoesService.updateEquipeDias(id, userId, diasTrabalhados);
    }

    @Delete(':id/equipe/:userId')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Remover membro da equipe' })
    async removeEquipe(@Param('id') id: string, @Param('userId') userId: string) {
        return this.acoesService.removeEquipe(id, userId);
    }

    // ── Custos ───────────────────────────────────────────────────
    @Post(':id/custos')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Registrar custo na ação (abastecimento, despesa ou diária)' })
    async addCusto(@Param('id') id: string, @Body() data: CreateAcaoCustoDto) {
        return this.acoesService.addCusto(id, data);
    }

    @Delete(':id/custos/:custoId')
    @Roles('ADMIN', 'FINANCIAL')
    @ApiOperation({ summary: 'Remover custo da ação' })
    async removeCusto(@Param('id') id: string, @Param('custoId') custoId: string) {
        return this.acoesService.removeCusto(custoId);
    }
    @Get(':id/funcionarios')
    @ApiOperation({ summary: 'Listar funcionários vinculados à ação' })
    async listFuncionarios(@Param('id') id: string) {
        return this.acoesService.listFuncionarios(id);
    }

    @Post(':id/funcionarios')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Vincular funcionário à ação' })
    async addFuncionario(@Param('id') id: string, @Body() data: CreateAcaoFuncionarioDto) {
        return this.acoesService.addFuncionario(id, data);
    }

    @Patch(':id/funcionarios/:employeeId/dias')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Atualizar dias trabalhados do funcionário na ação' })
    async updateFuncionarioDias(
        @Param('id') id: string,
        @Param('employeeId') employeeId: string,
        @Body('diasTrabalhados') diasTrabalhados: number,
    ) {
        return this.acoesService.updateFuncionarioDias(id, employeeId, diasTrabalhados);
    }

    @Delete(':id/funcionarios/:employeeId')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Desvincular funcionário da ação' })
    async removeFuncionario(@Param('id') id: string, @Param('employeeId') employeeId: string) {
        return this.acoesService.removeFuncionario(id, employeeId);
    }
}
