import { Controller, Get, Delete, UseGuards } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * WhatsAppController — Endpoints para gerenciamento da conexão WhatsApp no painel admin.
 * Apenas ADMIN e IT_ADMIN têm acesso.
 *
 * GET  /api/admin/whatsapp/status      → status de conexão
 * GET  /api/admin/whatsapp/qrcode      → QR Code em base64 (quando desconectado)
 * POST /api/admin/whatsapp/disconnect  → desconectar a instância
 */
@Controller('admin/whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'IT_ADMIN')
export class WhatsAppController {
    constructor(private readonly whatsapp: WhatsAppService) {}

    /**
     * Retorna o status de conexão da instância Z-API.
     * Resposta: { connected: boolean, phone?: string, connectedSince?: string, error?: string }
     */
    @Get('status')
    async getStatus() {
        return this.whatsapp.getStatus();
    }

    /**
     * Retorna o QR Code da instância como imagem Base64.
     * Deve ser chamado quando status.connected === false.
     * Resposta: { qrcode: "data:image/png;base64,..." | null, error?: string }
     */
    @Get('qrcode')
    async getQrCode() {
        return this.whatsapp.getQrCode();
    }

    /**
     * Desconecta a instância (logout do WhatsApp vinculado).
     * Após isso, o painel exibirá o QR Code para nova conexão.
     */
    @Delete('disconnect')
    async disconnect() {
        return this.whatsapp.disconnect();
    }
}
