import {
    Controller, Get, Post, Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CertificateService } from './certificate.service';

class IssueCertDto {
    studentId!: string;
    classId!: string;
}

@ApiTags('Certificados')
@Controller('certificates')
export class CertificateController {
    constructor(private readonly svc: CertificateService) {}

    // ── ADMIN / TEACHER ──────────────────────────────

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
    @Get()
    @ApiOperation({ summary: 'Lista todos os certificados emitidos' })
    findAll() { return this.svc.findAll(); }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
    @Get('eligible')
    @ApiOperation({ summary: 'Alunos elegíveis para certificação (freq. ≥75%)' })
    findEligible() { return this.svc.findEligible(); }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN', 'TEACHER')
    @Post()
    @ApiOperation({ summary: 'Emite certificado (REQ-06)' })
    issue(@Body() dto: IssueCertDto, @Request() req: any) {
        return this.svc.issueCertificate(dto.studentId, dto.classId, req.user.id);
    }

    // ── ALUNO: próprios certificados ─────────────────

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('my')
    @ApiOperation({ summary: 'Meus certificados (portal do aluno REQ-06)' })
    myCertificates(@Request() req: any) {
        return this.svc.findMyCertificates(req.user.id);
    }

    // ── PÚBLICO ──────────────────────────────────────

    @Get('verify/:code')
    @ApiOperation({ summary: 'Verifica autenticidade via código (público)' })
    @ApiParam({ name: 'code', description: 'Código UPG-...' })
    verify(@Param('code') code: string) {
        return this.svc.verify(code);
    }
}
