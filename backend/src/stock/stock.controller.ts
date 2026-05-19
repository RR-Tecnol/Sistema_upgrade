import {
    BadRequestException,
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Request,
    DefaultValuePipe,
    ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiConsumes,
    ApiQuery,
    ApiParam,
    ApiBody,
} from '@nestjs/swagger';
import { StockService } from './stock.service';
import { StockMinioService } from './stock-minio.service';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { CreateItemWithPurchaseRequestDto } from './dto/create-item-with-purchase-request.dto';
import { CreateStockCategoryDto, UpdateStockCategoryDto } from './dto/stock-category.dto';
import { BulkUpsertAcaoReservationsDto } from './dto/acao-reservation.dto';
import { UpdateTruckStockMinimoDto } from './dto/update-truck-stock-minimo.dto';
import { BaixaAcaoLoteDto, DevolverSobraLoteDto } from './dto/baixa-acao.dto';
import {
    ApprovePurchaseRequestDto,
    RejectPurchaseRequestDto,
} from './dto/review-purchase-request.dto';
import { CreateStockBudgetDto, UpdateStockBudgetDto } from './dto/stock-budget.dto';
import { UpsertAcaoStockBudgetDto } from './dto/acao-stock-budget.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StockMovementType, StockPurchaseRequestStatus } from '@prisma/client';

@ApiTags('Estoque')
@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StockController {
    constructor(
        private stockService: StockService,
        private stockMinioService: StockMinioService,
    ) {}

    // ═══════════════════════════════════════════════════════════════════
    //   DASHBOARD + ALERTAS
    // ═══════════════════════════════════════════════════════════════════

    @Get('dashboard')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'KPIs gerais do módulo de estoque' })
    @ApiResponse({ status: 200, description: 'Dashboard com totais, alertas e valor estimado' })
    dashboard() {
        return this.stockService.dashboard();
    }

    @Get('financials')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'KPIs financeiros globais do estoque' })
    financialDashboard() {
        return this.stockService.financialDashboard();
    }

    @Get('items/:id/financials')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL', 'DRIVER', 'TEACHER')
    @ApiOperation({ summary: 'KPIs financeiros de um item específico' })
    @ApiParam({ name: 'id' })
    itemFinancials(@Param('id') id: string) {
        return this.stockService.itemFinancials(id);
    }

    @Get('alerts/low')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Itens com estoque abaixo da quantidade mínima' })
    lowAlerts() {
        return this.stockService.lowStockAlerts();
    }

    @Get('alerts/expiring')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Itens vencendo nos próximos N dias' })
    @ApiQuery({ name: 'diasAteVencer', required: false, type: Number, example: 30 })
    expiringAlerts(
        @Query('diasAteVencer', new DefaultValuePipe(30), ParseIntPipe) diasAteVencer = 30,
    ) {
        return this.stockService.expiringStockAlerts(diasAteVencer);
    }

    // ═══════════════════════════════════════════════════════════════════
    //   ITENS (CRUD)
    // ═══════════════════════════════════════════════════════════════════

    @Get('items')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL', 'DRIVER', 'TEACHER')
    @ApiOperation({ summary: 'Listar itens do estoque central com filtros' })
    @ApiQuery({ name: 'categoria', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'onlyLow', required: false, type: Boolean })
    @ApiQuery({ name: 'onlyExpiring', required: false, type: Boolean })
    @ApiQuery({ name: 'diasAteVencer', required: false, type: Number })
    @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    findAllItems(
        @Query('categoria') categoria?: string,
        @Query('customCategoryId') customCategoryId?: string,
        @Query('search') search?: string,
        @Query('onlyLow') onlyLow?: string,
        @Query('onlyExpiring') onlyExpiring?: string,
        @Query('diasAteVencer') diasAteVencer?: string,
        @Query('includeInactive') includeInactive?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.stockService.findAllItems({
            categoria,
            customCategoryId,
            search,
            onlyLow: onlyLow === 'true',
            onlyExpiring: onlyExpiring === 'true',
            diasAteVencer: diasAteVencer ? parseInt(diasAteVencer, 10) : undefined,
            includeInactive: includeInactive === 'true',
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    @Get('items/:id')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL', 'DRIVER', 'TEACHER')
    @ApiOperation({ summary: 'Detalhe de um item (saldo central + saldo por carreta + últimas movimentações)' })
    @ApiParam({ name: 'id' })
    findOneItem(@Param('id') id: string) {
        return this.stockService.findOneItem(id);
    }

    @Post('items')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Cadastrar novo item no estoque central' })
    @ApiResponse({ status: 201 })
    @ApiResponse({ status: 409, description: 'Código interno já existe' })
    createItem(@Body() data: CreateStockItemDto, @Request() req: any) {
        return this.stockService.createItem(data, { id: req.user.id, role: req.user.role });
    }

    @Post('items/with-purchase-request')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR')
    @ApiOperation({
        summary: 'Cadastrar item + Solicitação de Compra inicial (transacional)',
        description:
            'Cria o StockItem e a StockPurchaseRequest pendente em uma única transação. ' +
            'Se a PR falhar (validação, regra de negócio), o item NÃO é criado — evita o estado ' +
            '"item órfão sem origem financeira" do fluxo de 2 chamadas separadas.',
    })
    @ApiResponse({ status: 201, description: 'Retorna { item, purchaseRequest }' })
    @ApiResponse({ status: 409, description: 'Código interno já existe (ATIVO ou INATIVO)' })
    createItemWithPurchaseRequest(
        @Body() dto: CreateItemWithPurchaseRequestDto,
        @Request() req: any,
    ) {
        return this.stockService.createItemWithPurchaseRequest(dto, {
            id: req.user.id,
            role: req.user.role,
        });
    }

    @Post('items/upload-photo')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Upload de foto do item (multipart) — retorna URL pública no MinIO' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 201, description: 'Foto enviada. Resposta: { url: string }' })
    @UseInterceptors(FileInterceptor('photo'))
    async uploadItemPhoto(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('Arquivo não enviado');
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
            throw new BadRequestException('Formato inválido. Use JPG, PNG ou WebP.');
        }
        if (file.size > 5 * 1024 * 1024) {
            throw new BadRequestException('Tamanho máximo: 5MB');
        }
        const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
        const objectName = `stock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const url = await this.stockMinioService.uploadFile(objectName, file.buffer, file.mimetype);
        return { url };
    }

    @Patch('items/:id')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Editar dados do item (NÃO altera saldo — use movimentação AJUSTE para isso)' })
    @ApiParam({ name: 'id' })
    updateItem(@Param('id') id: string, @Body() data: UpdateStockItemDto, @Request() req: any) {
        return this.stockService.updateItem(id, data, { id: req.user.id, role: req.user.role });
    }

    @Delete('items/:id')
    @Roles('ADMIN', 'IT_ADMIN')
    @ApiOperation({ summary: 'Desativar item (soft delete; falha se há saldo em carretas ou solicitação pendente)' })
    @ApiParam({ name: 'id' })
    deleteItem(@Param('id') id: string, @Request() req: any) {
        return this.stockService.deleteItem(id, { id: req.user.id, role: req.user.role });
    }

    @Post('items/:id/reactivate')
    @Roles('ADMIN', 'IT_ADMIN')
    @ApiOperation({
        summary: 'Reativar item desativado (atualiza dados cadastrais com o body opcional)',
        description:
            'Reabilita um item soft-deletado, mantendo o histórico de movimentações antigas (mesmo id). ' +
            'Saldo SEMPRE volta como 0 — para inserir estoque, use Solicitação de Compra após reativar. ' +
            'Disparado tipicamente quando admin tenta cadastrar um item com codigoInterno de um inativo.',
    })
    @ApiParam({ name: 'id', description: 'ID do item desativado' })
    @ApiBody({ type: UpdateStockItemDto, required: false })
    reactivateItem(
        @Param('id') id: string,
        @Body() data: UpdateStockItemDto | undefined,
        @Request() req: any,
    ) {
        return this.stockService.reactivateItem(id, data, { id: req.user.id, role: req.user.role });
    }

    // ═══════════════════════════════════════════════════════════════════
    //   DASHBOARD AGRUPADO — por categoria e por carreta
    // ═══════════════════════════════════════════════════════════════════

    @Get('dashboard/by-category')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER', 'DRIVER')
    @ApiOperation({
        summary: 'KPIs agregados por categoria (default + customizadas) — para grade de cards',
        description:
            'Retorna 1 linha por categoria: 8 defaults sempre presentes (mesmo zeradas) + qualquer ' +
            'categoria custom que tenha itens vinculados. Cada linha traz totalItens, saldoCentral, ' +
            'saldoEmTransito, qtdCritica, qtdBaixa e valorEstimado.',
    })
    dashboardByCategory() {
        return this.stockService.dashboardByCategory();
    }

    @Get('dashboard/by-truck')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER', 'DRIVER')
    @ApiOperation({
        summary: 'KPIs agregados por carreta — para grade de cards no dashboard de estoque',
        description:
            'Retorna 1 linha por carreta ativa: totalItensDistintos, quantidadeTotal, valorEstimado e ' +
            'top 12 itens (já ordenados por quantidade desc) para preview rápido.',
    })
    dashboardByTruck() {
        return this.stockService.dashboardByTruck();
    }

    // ═══════════════════════════════════════════════════════════════════
    //   CATEGORIAS CUSTOMIZADAS
    // ═══════════════════════════════════════════════════════════════════

    @Get('categories')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER', 'DRIVER')
    @ApiOperation({
        summary: 'Lista todas as categorias (8 default + customizadas pelo admin)',
        description:
            'Retorna categorias ativas por padrão. Use ?includeInactive=true para incluir as desativadas (admin).',
    })
    @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
    listCategories(@Query('includeInactive') includeInactive?: string) {
        return this.stockService.listCategories({
            includeInactive: includeInactive === 'true',
        });
    }

    @Post('categories')
    @Roles('ADMIN', 'IT_ADMIN')
    @ApiOperation({
        summary: 'Cria uma nova categoria customizada (admin)',
        description:
            'Categorias customizadas coexistem com as 8 default. Apenas admin pode criar. ' +
            'O slug é gerado automaticamente a partir do nome (URL-safe, sem acentos).',
    })
    @ApiBody({ type: CreateStockCategoryDto })
    createCategory(@Body() dto: CreateStockCategoryDto, @Request() req: any) {
        return this.stockService.createCategory(dto, { id: req.user.id, role: req.user.role });
    }

    @Patch('categories/:id')
    @Roles('ADMIN', 'IT_ADMIN')
    @ApiOperation({
        summary: 'Atualiza ou desativa uma categoria customizada',
        description:
            'Categorias DEFAULT (isDefault=true) não podem ser renomeadas nem desativadas. ' +
            'Para desativar custom, não pode haver itens ativos usando.',
    })
    @ApiParam({ name: 'id' })
    @ApiBody({ type: UpdateStockCategoryDto })
    updateCategory(
        @Param('id') id: string,
        @Body() dto: UpdateStockCategoryDto,
        @Request() req: any,
    ) {
        return this.stockService.updateCategory(id, dto, { id: req.user.id, role: req.user.role });
    }

    // ═══════════════════════════════════════════════════════════════════
    //   SALDO POR CARRETA
    // ═══════════════════════════════════════════════════════════════════

    @Get('trucks/:truckId')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL', 'DRIVER', 'TEACHER')
    @ApiOperation({ summary: 'Listar todos os itens com saldo em uma carreta' })
    @ApiParam({ name: 'truckId' })
    findStockByTruck(@Param('truckId') truckId: string) {
        return this.stockService.findStockByTruck(truckId);
    }

    @Patch('trucks/:truckId/items/:stockItemId/minimo')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Atualizar quantidade mínima de um item na carreta' })
    @ApiParam({ name: 'truckId' })
    @ApiParam({ name: 'stockItemId' })
    @ApiBody({ type: UpdateTruckStockMinimoDto })
    updateTruckStockMinimo(
        @Param('truckId') truckId: string,
        @Param('stockItemId') stockItemId: string,
        @Body() dto: UpdateTruckStockMinimoDto,
        @Request() req: any,
    ) {
        return this.stockService.updateTruckStockMinimo(
            truckId,
            stockItemId,
            dto.quantidadeMinima,
            { id: req.user.id, role: req.user.role },
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    //   MOVIMENTAÇÕES
    // ═══════════════════════════════════════════════════════════════════

    @Post('movements')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'DRIVER', 'TEACHER')
    @ApiOperation({
        summary: 'Registrar movimentação de estoque (transação atômica)',
        description:
            'Tipos: ENTRADA, SAIDA, TRANSFERENCIA, DEVOLUCAO, AJUSTE, PERDA. ' +
            'REPOSICAO é gerada apenas pela aprovação de StockPurchaseRequest.',
    })
    @ApiBody({ type: CreateMovementDto })
    createMovement(@Body() dto: CreateMovementDto, @Request() req: any) {
        return this.stockService.createMovement(dto, { id: req.user.id, role: req.user.role });
    }

    @Get('movements')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL', 'DRIVER', 'TEACHER')
    @ApiOperation({ summary: 'Histórico de movimentações (filtrável)' })
    @ApiQuery({ name: 'type', required: false, enum: StockMovementType })
    @ApiQuery({ name: 'stockItemId', required: false })
    @ApiQuery({ name: 'truckId', required: false })
    @ApiQuery({ name: 'acaoId', required: false })
    @ApiQuery({ name: 'from', required: false, description: 'ISO 8601 — data inicial' })
    @ApiQuery({ name: 'to', required: false, description: 'ISO 8601 — data final' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    listMovements(
        @Query('type') type?: StockMovementType,
        @Query('stockItemId') stockItemId?: string,
        @Query('truckId') truckId?: string,
        @Query('acaoId') acaoId?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('limit') limit?: string,
    ) {
        return this.stockService.listMovements({
            type,
            stockItemId,
            truckId,
            acaoId,
            from,
            to,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    //   SOLICITAÇÕES DE COMPRA (workflow de aprovação)
    // ═══════════════════════════════════════════════════════════════════

    @Post('purchase-requests')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'DRIVER', 'TEACHER')
    @ApiOperation({ summary: 'Criar solicitação de compra (REPOSICAO) — fica PENDENTE até aprovação do admin' })
    createPurchaseRequest(@Body() dto: CreatePurchaseRequestDto, @Request() req: any) {
        return this.stockService.createPurchaseRequest(dto, { id: req.user.id, role: req.user.role });
    }

    @Get('purchase-requests')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'DRIVER', 'TEACHER', 'FINANCIAL')
    @ApiOperation({
        summary: 'Listar solicitações de compra',
        description: 'ADMIN/IT_ADMIN vê todas; demais roles veem apenas as próprias.',
    })
    @ApiQuery({ name: 'status', required: false, enum: StockPurchaseRequestStatus })
    @ApiQuery({ name: 'stockItemId', required: false })
    @ApiQuery({ name: 'onlyMine', required: false, type: Boolean })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    listPurchaseRequests(
        @Request() req: any,
        @Query('status') status?: StockPurchaseRequestStatus,
        @Query('stockItemId') stockItemId?: string,
        @Query('onlyMine') onlyMine?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.stockService.listPurchaseRequests(
            { id: req.user.id, role: req.user.role },
            {
                status,
                stockItemId,
                onlyMine: onlyMine === 'true',
                page: page ? parseInt(page, 10) : undefined,
                limit: limit ? parseInt(limit, 10) : undefined,
            },
        );
    }

    @Get('purchase-requests/:id')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'DRIVER', 'TEACHER', 'FINANCIAL')
    @ApiOperation({ summary: 'Detalhe de uma solicitação de compra' })
    @ApiParam({ name: 'id' })
    findOnePurchaseRequest(@Param('id') id: string, @Request() req: any) {
        return this.stockService.findOnePurchaseRequest(id, { id: req.user.id, role: req.user.role });
    }

    @Patch('purchase-requests/:id/approve')
    @Roles('ADMIN', 'IT_ADMIN')
    @ApiOperation({
        summary: 'APROVAR solicitação de compra (apenas ADMIN)',
        description: 'Cria StockMovement(REPOSICAO), ContaPagar e atualiza saldo central em uma única transação.',
    })
    @ApiBody({ type: ApprovePurchaseRequestDto })
    approvePurchaseRequest(
        @Param('id') id: string,
        @Body() dto: ApprovePurchaseRequestDto,
        @Request() req: any,
    ) {
        return this.stockService.approvePurchaseRequest(id, dto, {
            id: req.user.id,
            role: req.user.role,
        });
    }

    @Patch('purchase-requests/:id/reject')
    @Roles('ADMIN', 'IT_ADMIN')
    @ApiOperation({ summary: 'REJEITAR solicitação de compra com motivo (apenas ADMIN)' })
    @ApiBody({ type: RejectPurchaseRequestDto })
    rejectPurchaseRequest(
        @Param('id') id: string,
        @Body() dto: RejectPurchaseRequestDto,
        @Request() req: any,
    ) {
        return this.stockService.rejectPurchaseRequest(id, dto, {
            id: req.user.id,
            role: req.user.role,
        });
    }

    @Post('purchase-requests/:id/confirm-receipt')
    @Roles('ADMIN', 'IT_ADMIN')
    @ApiOperation({
        summary: 'Confirmar RECEBIMENTO físico de uma solicitação APROVADA',
        description:
            'Dispara entrada real no estoque: decrementa quantidadeEmTransito, ' +
            'incrementa quantidadeAtual, cria StockMovement REPOSICAO e marca PR como RECEBIDA. ' +
            'É idempotente: se já estiver RECEBIDA, retorna o estado atual sem alteração. ' +
            'Esta ação também é disparada automaticamente quando a ContaPagar vinculada é marcada como paga.',
    })
    @ApiParam({ name: 'id', description: 'ID da StockPurchaseRequest' })
    confirmReceipt(
        @Param('id') id: string,
        @Request() req: any,
    ) {
        return this.stockService.confirmReceiptOfPurchase(
            id,
            { id: req.user.id, role: req.user.role },
            'MANUAL_RECEIPT',
        );
    }

    @Delete('purchase-requests/:id')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'DRIVER', 'TEACHER')
    @ApiOperation({ summary: 'Cancelar própria solicitação (apenas se ainda PENDENTE)' })
    cancelPurchaseRequest(@Param('id') id: string, @Request() req: any) {
        return this.stockService.cancelPurchaseRequest(id, {
            id: req.user.id,
            role: req.user.role,
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    //   CONSUMO POR AÇÃO
    // ═══════════════════════════════════════════════════════════════════

    @Get('consumption/by-acao/:acaoId')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER', 'DRIVER')
    @ApiOperation({
        summary: 'Consumo total por item dentro de uma ação (agrega StockMovement type=SAIDA)',
        description:
            'Fonte única da verdade: stock_movements. Não há AcaoInsumo separado — ' +
            'a soma é feita em tempo real para evitar inconsistência entre duas tabelas.',
    })
    @ApiParam({ name: 'acaoId' })
    getConsumptionByAcao(@Param('acaoId') acaoId: string) {
        return this.stockService.consumptionByAcao(acaoId);
    }

    // ═══════════════════════════════════════════════════════════════════
    //   FECHAMENTO DE CICLO — Baixa de estoque por Ação
    // ═══════════════════════════════════════════════════════════════════

    @Get('acoes/:acaoId/baixa-status')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL', 'DRIVER', 'TEACHER')
    @ApiOperation({
        summary: 'Estado consolidado da baixa de estoque de uma ação (kit + saldo + saídas + sobra)',
        description:
            'Fonte única para a UI de "Dar baixa": traz o kit previsto, o que já foi consumido, ' +
            'o saldo nas carretas com sugestão de origem por item, status por linha ' +
            '(ATENDIDA/PARCIAL/PRONTA/INSUFICIENTE/SEM_SALDO), saídas já realizadas, ' +
            'consumos fora do kit e identificação de sobra para o fechamento.',
    })
    @ApiParam({ name: 'acaoId' })
    getBaixaStatus(@Param('acaoId') acaoId: string) {
        return this.stockService.baixaStatusByAcao(acaoId);
    }

    @Post('acoes/:acaoId/baixa')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'DRIVER', 'TEACHER')
    @ApiOperation({
        summary: 'Baixa de estoque em LOTE para uma ação (atômico)',
        description:
            'Gera N movimentações SAIDA de uma vez, em uma única transação. ' +
            'Se qualquer item falhar (saldo insuficiente, carreta inválida etc.), nenhuma SAIDA é persistida. ' +
            'Atualiza AcaoStockReservation.quantidadeConsumida automaticamente quando existir reserva. ' +
            'Cada SAIDA gera um AuditLog próprio (STOCK_MOVEMENT_SAIDA com fonte=BAIXA_LOTE).',
    })
    @ApiParam({ name: 'acaoId' })
    @ApiBody({ type: BaixaAcaoLoteDto })
    baixaEmLote(
        @Param('acaoId') acaoId: string,
        @Body() dto: BaixaAcaoLoteDto,
        @Request() req: any,
    ) {
        return this.stockService.baixaEmLoteForAcao(
            acaoId,
            dto.items,
            { id: req.user.id, role: req.user.role },
            dto.observacaoGlobal,
        );
    }

    @Post('acoes/:acaoId/tratar-sobra')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR')
    @ApiOperation({
        summary: 'Trata sobra do kit ao concluir uma ação (DEVOLVER / MANTER / PERDA)',
        description:
            'Por item, decide: DEVOLVER (gera DEVOLUCAO Carreta→Central), ' +
            'MANTER (não movimenta — sobra fica na carreta) ou PERDA (gera PERDA, exige motivo). ' +
            'Tudo numa transação. Auditável (1 log por decisão, mesmo MANTER).',
    })
    @ApiParam({ name: 'acaoId' })
    @ApiBody({ type: DevolverSobraLoteDto })
    tratarSobra(
        @Param('acaoId') acaoId: string,
        @Body() dto: DevolverSobraLoteDto,
        @Request() req: any,
    ) {
        return this.stockService.tratarSobraDoKit(acaoId, dto.items, {
            id: req.user.id,
            role: req.user.role,
        });
    }

    @Get('consumption/by-item/:stockItemId')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER', 'DRIVER')
    @ApiOperation({
        summary: 'Consumo por AÇÃO para um item (inverso: este item foi pra quais ações)',
        description:
            'Útil no detalhe do item para mostrar "este item já foi consumido por estas ações/cursos". ' +
            'Agrega StockMovement type=SAIDA por acaoId.',
    })
    @ApiParam({ name: 'stockItemId' })
    getConsumptionByItem(@Param('stockItemId') stockItemId: string) {
        return this.stockService.consumptionByItem(stockItemId);
    }

    // ═══════════════════════════════════════════════════════════════════
    //   RESERVAS DE INSUMOS POR AÇÃO — kit previsto antes da execução
    // ═══════════════════════════════════════════════════════════════════

    @Get('acoes/:acaoId/reservations')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER', 'DRIVER')
    @ApiOperation({
        summary: 'Lista o kit de insumos previstos de uma ação (planejamento)',
        description:
            'Retorna cada reserva enriquecida com saldo central atual, valor estimado e ' +
            'status de cobertura (ATENDIDA / PARCIAL / PLANEJADA / INSUFICIENTE). ' +
            'Use no formulário da ação e no dashboard de alertas.',
    })
    @ApiParam({ name: 'acaoId' })
    listAcaoReservations(@Param('acaoId') acaoId: string) {
        return this.stockService.listReservationsByAcao(acaoId);
    }

    @Post('acoes/:acaoId/reservations')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR')
    @ApiOperation({
        summary: 'Define/sincroniza o kit de insumos previstos de uma ação (bulk upsert)',
        description:
            'Sincroniza completo: reservas existentes não listadas no payload são REMOVIDAS. ' +
            'Reservas com consumo já registrado (quantidadeConsumida > 0) não podem ser removidas — ' +
            'cancele/devolva o consumo via Movimentação antes.',
    })
    @ApiParam({ name: 'acaoId' })
    @ApiBody({ type: BulkUpsertAcaoReservationsDto })
    upsertAcaoReservations(
        @Param('acaoId') acaoId: string,
        @Body() body: BulkUpsertAcaoReservationsDto,
        @Request() req: any,
    ) {
        return this.stockService.upsertReservationsForAcao(
            acaoId,
            body.items,
            { id: req.user.id, role: req.user.role },
        );
    }

    @Get('items/:stockItemId/reservations')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER', 'DRIVER')
    @ApiOperation({
        summary: 'Lista a quais AÇÕES futuras um item está alocado (planejamento)',
        description:
            'Card do item: "este item está reservado para 3 ações futuras: 45un". ' +
            'Considera apenas ações com status PLANEJADA ou EM_ANDAMENTO.',
    })
    @ApiParam({ name: 'stockItemId' })
    listReservationsByItem(@Param('stockItemId') stockItemId: string) {
        return this.stockService.reservationsByItem(stockItemId);
    }

    // ═══════════════════════════════════════════════════════════════════
    //   HISTÓRICO / AUDITORIA UNIFICADA
    // ═══════════════════════════════════════════════════════════════════

    @Get('history')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({
        summary: 'Histórico unificado de auditoria do módulo Estoque',
        description:
            'Timeline rastreável de TODAS as ações relevantes em estoque: criação/edição/desativação ' +
            'de itens, movimentações (entrada/saída/transferência/ajuste/perda/devolução/reposição) ' +
            'e ciclo de vida de solicitações de compra (criar/aprovar/rejeitar/cancelar). ' +
            'Cada entry registra quem, quando, o quê (action), em qual recurso e snapshots before/after.',
    })
    @ApiQuery({ name: 'action', required: false, description: 'Filtra por trecho da action (ex.: APPROVE, CREATE)' })
    @ApiQuery({ name: 'tableName', required: false, description: 'stock_items | stock_movements | stock_purchase_requests' })
    @ApiQuery({ name: 'userId', required: false, description: 'Filtra pelo autor da ação' })
    @ApiQuery({ name: 'recordId', required: false, description: 'Filtra pelo ID exato do registro (item, mov, PR)' })
    @ApiQuery({ name: 'stockItemId', required: false, description: 'Filtra por todas as ações ligadas a um item' })
    @ApiQuery({ name: 'from', required: false, description: 'ISO 8601 — data inicial' })
    @ApiQuery({ name: 'to', required: false, description: 'ISO 8601 — data final' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
    getHistory(
        @Query('action') action?: string,
        @Query('tableName') tableName?: string,
        @Query('userId') userId?: string,
        @Query('recordId') recordId?: string,
        @Query('stockItemId') stockItemId?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.stockService.getUnifiedHistory({
            action,
            tableName,
            userId,
            recordId,
            stockItemId,
            from,
            to,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    //   VERBAS (REQ 2026-05) — StockBudget mensal + AcaoStockBudget
    // ═══════════════════════════════════════════════════════════════════

    @Get('budgets')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Lista verbas mensais de estoque por categoria' })
    @ApiQuery({ name: 'ano', required: false, type: Number })
    @ApiQuery({ name: 'mes', required: false, type: Number })
    @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
    listStockBudgets(
        @Query('ano') ano?: string,
        @Query('mes') mes?: string,
        @Query('includeInactive') includeInactive?: string,
    ) {
        return this.stockService.listStockBudgets({
            ano: ano ? parseInt(ano, 10) : undefined,
            mes: mes ? parseInt(mes, 10) : undefined,
            includeInactive: includeInactive === 'true',
        });
    }

    @Post('budgets')
    @Roles('ADMIN', 'IT_ADMIN')
    @ApiOperation({ summary: 'Cria verba mensal por categoria [ADMIN]' })
    @ApiBody({ type: CreateStockBudgetDto })
    createStockBudget(@Body() dto: CreateStockBudgetDto, @Request() req: any) {
        return this.stockService.createStockBudget(dto, req.user);
    }

    @Patch('budgets/:id')
    @Roles('ADMIN', 'IT_ADMIN')
    @ApiOperation({ summary: 'Atualiza verba mensal por categoria [ADMIN]' })
    @ApiParam({ name: 'id' })
    @ApiBody({ type: UpdateStockBudgetDto })
    updateStockBudget(@Param('id') id: string, @Body() dto: UpdateStockBudgetDto, @Request() req: any) {
        return this.stockService.updateStockBudget(id, dto, req.user);
    }

    @Delete('budgets/:id')
    @Roles('ADMIN', 'IT_ADMIN')
    @ApiOperation({ summary: 'Desativa verba mensal (soft delete) [ADMIN]' })
    @ApiParam({ name: 'id' })
    deleteStockBudget(@Param('id') id: string, @Request() req: any) {
        return this.stockService.deleteStockBudget(id, req.user);
    }

    @Get('acoes/:acaoId/budget')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR', 'FINANCIAL')
    @ApiOperation({ summary: 'Retorna verba + status de uso da ação' })
    @ApiParam({ name: 'acaoId' })
    getAcaoStockBudget(@Param('acaoId') acaoId: string) {
        return this.stockService.getAcaoStockBudgetStatus(acaoId);
    }

    @Post('acoes/:acaoId/budget')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Cria ou atualiza verba da ação [ADMIN/COORD]' })
    @ApiParam({ name: 'acaoId' })
    @ApiBody({ type: UpsertAcaoStockBudgetDto })
    upsertAcaoStockBudget(@Param('acaoId') acaoId: string, @Body() dto: UpsertAcaoStockBudgetDto, @Request() req: any) {
        return this.stockService.upsertAcaoStockBudget({ ...dto, acaoId }, req.user);
    }

    @Delete('acoes/:acaoId/budget')
    @Roles('ADMIN', 'IT_ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Desativa verba da ação (soft delete) [ADMIN/COORD]' })
    @ApiParam({ name: 'acaoId' })
    deleteAcaoStockBudget(@Param('acaoId') acaoId: string, @Request() req: any) {
        return this.stockService.deleteAcaoStockBudget(acaoId, req.user);
    }
}
