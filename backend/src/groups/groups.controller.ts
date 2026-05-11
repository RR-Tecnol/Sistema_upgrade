import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('groups')
@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GroupsController {
    constructor(private groupsService: GroupsService) { }

    @Get()
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'List all groups' })
    @ApiResponse({ status: 200, description: 'Groups retrieved successfully' })
    async findAll() {
        return this.groupsService.findAll();
    }

    @Get(':id')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Get group by ID' })
    @ApiResponse({ status: 200, description: 'Group retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Group not found' })
    async findOne(@Param('id') id: string) {
        return this.groupsService.findOne(id);
    }

    @Post()
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Create new group' })
    @ApiResponse({ status: 201, description: 'Group created successfully' })
    @ApiResponse({ status: 409, description: 'Group name already exists' })
    async create(@Body() data: CreateGroupDto) {
        return this.groupsService.create(data);
    }

    @Patch(':id')
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'Update group' })
    @ApiResponse({ status: 200, description: 'Group updated successfully' })
    @ApiResponse({ status: 404, description: 'Group not found' })
    async update(@Param('id') id: string, @Body() data: UpdateGroupDto) {
        return this.groupsService.update(id, data);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Delete group' })
    @ApiResponse({ status: 200, description: 'Group deleted successfully' })
    @ApiResponse({ status: 404, description: 'Group not found' })
    @ApiResponse({ status: 409, description: 'Cannot delete group with existing trucks or classes' })
    async delete(@Param('id') id: string) {
        return this.groupsService.delete(id);
    }
}
