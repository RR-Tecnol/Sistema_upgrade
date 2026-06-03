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
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Estatísticas gerais das ações' })
    async getEstatisticas() {
        return this.acoesService.getEstatisticas();
    }

    // ── Listagem ─────────────────────────────────────────────────
    @Get()
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Listar todas as ações' })
    @ApiQuery({ name: 'status', required: false, enum: AcaoStatus })
    @ApiQuery({ name: 'grupoId', required: false })
    @ApiQuery({ name: 'cidadeId', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiResponse({ status: 200, description: 'Ações listadas com sucesso' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async findAll(
        @Query('status') status?: AcaoStatus,
        @Query('grupoId') grupoId?: string,
        @Query('cidadeId') cidadeId?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.acoesService.findAll({
            status,
            grupoId,
            cidadeId,
            search,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    // ── Autocomplete de cidades ───────────────────────────────────
    @Get('cidades-autocomplete')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Buscar cidades pelo nome para autocomplete' })
    @ApiQuery({ name: 'q', required: true })
    async searchCidades(@Query('q') q: string) {
        return this.acoesService.searchCidades(q || '');
    }

    @Get('turmas-by-course/:courseId')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Turmas existentes de um curso (fluxo período — evitar duplicar)' })
    @ApiQuery({ name: 'groupId', required: false })
    @ApiQuery({ name: 'excludeAcaoId', required: false, description: 'Exclui turmas já vinculadas a este período' })
    async listTurmasByCourse(
        @Param('courseId') courseId: string,
        @Query('groupId') groupId?: string,
        @Query('excludeAcaoId') excludeAcaoId?: string,
    ) {
        return this.acoesService.listTurmasByCourse(courseId, groupId, excludeAcaoId);
    }

    @Get(':id/turmas-elegiveis')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Turmas do grupo elegíveis para vincular ao período' })
    async listTurmasElegiveis(@Param('id') id: string) {
        return this.acoesService.listTurmasElegiveis(id);
    }

    // ── Detalhe ──────────────────────────────────────────────────
    @Get(':id')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Detalhe completo de uma ação' })
    @ApiResponse({ status: 200, description: 'Ação encontrada' })
    @ApiResponse({ status: 404, description: 'Ação não encontrada' })
    async findOne(@Param('id') id: string) {
        return this.acoesService.findOne(id);
    }

    @Get(':id/resumo-financeiro')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Resumo financeiro estimado vs real de uma ação' })
    async getResumoFinanceiro(@Param('id') id: string) {
        return this.acoesService.getResumoFinanceiro(id);
    }

    @Get(':id/calendario-resumo')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Dias letivos vs corridos do período (política da turma vinculada)' })
    async getCalendarioResumo(@Param('id') id: string) {
        return this.acoesService.getCalendarioResumo(id);
    }

    @Post(':id/motor/recalcular')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({
        summary:
            'Recalcula data fim do período e de cada turma conforme a carga horária de cada curso vinculado',
    })
    async recalcularMotorPeriodo(@Param('id') id: string) {
        return this.acoesService.recalcularMotorPeriodo(id);
    }

    @Post(':id/instructor-dias-preview')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Sugere dias de diária do instrutor pelas turmas/cursos selecionados' })
    async previewInstructorDias(@Param('id') id: string, @Body('classIds') classIds: string[]) {
        return this.acoesService.previewInstructorDias(id, Array.isArray(classIds) ? classIds : []);
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

    @Get(':id/teachers')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Listar professores do período (turmas + cursos)' })
    async listTeachers(@Param('id') id: string) {
        return this.acoesService.listTeachers(id);
    }

    @Post(':id/teachers/:teacherId')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Vincular professor ao período (propaga turmas e cursos)' })
    async assignTeacher(@Param('id') id: string, @Param('teacherId') teacherId: string) {
        return this.acoesService.assignTeacher(id, teacherId);
    }

    @Get(':id/teachers/pool')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Professores do curso base elegíveis neste período' })
    async listTeacherPool(@Param('id') id: string) {
        return this.acoesService.listTeacherPool(id);
    }

    @Post(':id/drivers/:driverUserId')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Vincular motorista ao período (carreta + viagens automáticas)' })
    async assignDriver(@Param('id') id: string, @Param('driverUserId') driverUserId: string) {
        return this.acoesService.assignDriver(id, driverUserId);
    }

    @Post(':id/turmas/:turmaId/driver/:driverUserId')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Vincular motorista a uma turma do período' })
    async assignDriverTurma(
        @Param('id') id: string,
        @Param('turmaId') turmaId: string,
        @Param('driverUserId') driverUserId: string,
    ) {
        return this.acoesService.assignDriverToTurma(id, turmaId, driverUserId);
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
    @Get(':id/funcionarios/disponiveis')
    @Roles('ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Funcionários ativos ainda não vinculados ao período (paginado)' })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'role', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async listFuncionariosDisponiveis(
        @Param('id') id: string,
        @Query('search') search?: string,
        @Query('role') role?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.acoesService.listFuncionariosDisponiveis(id, {
            search,
            role,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    @Get(':id/funcionarios')
    @ApiOperation({ summary: 'Listar funcionários vinculados à ação (paginado)' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async listFuncionarios(
        @Param('id') id: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.acoesService.listFuncionarios(id, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    @Post(':id/funcionarios')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Vincular funcionário à ação' })
    async addFuncionario(@Param('id') id: string, @Body() data: CreateAcaoFuncionarioDto) {
        return this.acoesService.addFuncionario(id, data);
    }

    @Post(':id/funcionarios/:employeeId/regenerate-trips')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Regenerar viagens do motorista no período (carreta + agenda)' })
    async regenerateFuncionarioTrips(
        @Param('id') id: string,
        @Param('employeeId') employeeId: string,
    ) {
        return this.acoesService.regenerateFuncionarioTrips(id, employeeId);
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
