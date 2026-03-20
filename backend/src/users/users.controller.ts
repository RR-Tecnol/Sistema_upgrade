import { Controller, Get, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get()
    @Roles('ADMIN', 'COORDINATOR')
    @ApiOperation({ summary: 'List all users' })
    @ApiQuery({ name: 'role', required: false, description: 'Filter by user role' })
    @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
    async findAll(@Query('role') role?: string) {
        return this.usersService.findAll(role);
    }

    @Get('me')
    @ApiOperation({ summary: 'Get own profile (any authenticated user)' })
    @ApiResponse({ status: 200, description: 'Own profile returned' })
    async getMe(@Request() req: any) {
        return this.usersService.findOne(req.user.userId || req.user.id);
    }

    @Patch('me')
    @ApiOperation({ summary: 'Update own profile (any authenticated user)' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    async updateMe(
        @Request() req: any,
        @Body() data: { name?: string; phone?: string },
    ) {
        return this.usersService.update(req.user.userId || req.user.id, data);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, description: 'User retrieved successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Update user' })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async update(@Param('id') id: string, @Body() data: { name?: string; phone?: string; active?: boolean }) {
        return this.usersService.update(id, data);
    }

    @Delete(':id')
    @Roles('ADMIN')
    @ApiOperation({ summary: 'Deactivate user' })
    @ApiResponse({ status: 200, description: 'User deactivated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async deactivate(@Param('id') id: string) {
        return this.usersService.deactivate(id);
    }
}
