import {
    Controller, Get, Post, Put, Patch, Delete,
    Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@ApiTags('Funcionários')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
    constructor(private readonly service: EmployeesService) { }

    @Post()
    @ApiOperation({ summary: 'Cadastrar novo funcionário' })
    create(@Body() dto: CreateEmployeeDto) {
        return this.service.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar funcionários com filtros e KPIs' })
    findAll(
        @Query('role') role?: string,
        @Query('department') department?: string,
        @Query('active') active?: string,
        @Query('search') search?: string,
    ) {
        return this.service.findAll({ role, department, active, search });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar funcionário por ID' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Atualizar funcionário' })
    update(@Param('id') id: string, @Body() dto: Partial<CreateEmployeeDto>) {
        return this.service.update(id, dto);
    }

    @Patch(':id/toggle-active')
    @ApiOperation({ summary: 'Ativar/desativar funcionário' })
    toggleActive(@Param('id') id: string) {
        return this.service.toggleActive(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Excluir funcionário' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
