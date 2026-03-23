import {
    Controller, Get, Post, Put, Patch, Delete,
    Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContasPagarService } from './contas-pagar.service';
import { CreateContaPagarDto } from './dto/create-conta-pagar.dto';

@ApiTags('Contas a Pagar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contas-pagar')
export class ContasPagarController {
    constructor(private readonly service: ContasPagarService) { }

    @Post()
    @ApiOperation({ summary: 'Criar nova conta a pagar' })
    create(@Body() dto: CreateContaPagarDto) {
        return this.service.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar contas a pagar com filtros (includeDeleted=true para excluídas)' })
    findAll(
        @Query('tipo_conta') tipo_conta?: string,
        @Query('status') status?: string,
        @Query('cidade') cidade?: string,
        @Query('data_inicio') data_inicio?: string,
        @Query('data_fim') data_fim?: string,
        @Query('search') search?: string,
        @Query('includeDeleted') includeDeleted?: string,
    ) {
        return this.service.findAll({
            tipo_conta, status, cidade, data_inicio, data_fim, search,
            includeDeleted: includeDeleted === 'true',
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar uma conta a pagar' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Atualizar conta a pagar' })
    update(@Param('id') id: string, @Body() dto: Partial<CreateContaPagarDto> & { data_pagamento?: string; status?: any }) {
        return this.service.update(id, dto);
    }

    @Patch(':id/pagar')
    @ApiOperation({ summary: 'Marcar conta como paga' })
    marcarComoPaga(@Param('id') id: string) {
        return this.service.marcarComoPaga(id);
    }

    // PASSO 3.9: restaurar conta excluída (soft delete reversal)
    @Patch(':id/restore')
    @ApiOperation({ summary: 'Restaurar conta excluída (PASSO 3.9)' })
    restore(@Param('id') id: string) {
        return this.service.restore(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Excluir conta a pagar' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
