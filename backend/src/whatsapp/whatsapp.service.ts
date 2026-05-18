import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

/**
 * WhatsAppService — Integração Z-API
 * ─────────────────────────────────────────────────────────────────────────────
 * Serviço global que centraliza todos os disparos de WhatsApp do sistema.
 * Usa a API REST da Z-API (https://z-api.io).
 *
 * Variáveis de ambiente (.env):
 *   ZAPI_INSTANCE_ID  — ID da instância no painel Z-API
 *   ZAPI_TOKEN        — Token da instância
 *   ZAPI_CLIENT_TOKEN — Security Token do cliente (aba "Security" no painel)
 *   ZAPI_BASE_URL     — (opcional) padrão: https://api.z-api.io
 *
 * MODO DEV: se ZAPI_INSTANCE_ID não estiver configurado, apenas loga — nunca lança erro.
 * FAILSAFE: todos os métodos são fire-and-forget com timeout de 8s — nunca bloqueiam o fluxo.
 */
@Injectable()
export class WhatsAppService {
    private readonly logger = new Logger(WhatsAppService.name);
    private readonly instanceId: string | null;
    private readonly token: string | null;
    private readonly clientToken: string | null;
    private readonly baseUrl: string;

    constructor(private readonly prisma: PrismaService) {
        this.instanceId = process.env.ZAPI_INSTANCE_ID?.trim() || null;
        this.token = process.env.ZAPI_TOKEN?.trim() || null;
        this.clientToken = process.env.ZAPI_CLIENT_TOKEN?.trim() || null; // opcional
        this.baseUrl = process.env.ZAPI_BASE_URL?.trim() || 'https://api.z-api.io';

        if (this.instanceId) {
            this.logger.log('✅ WhatsApp Z-API configurado — mensagens serão enviadas');
        } else {
            this.logger.warn('⚠️  ZAPI_INSTANCE_ID não configurado — WhatsApp em modo dev (apenas log)');
        }
    }

    // ─── Verificar se está configurado ───────────────────────────────────────

    get isConfigured(): boolean {
        // clientToken é opcional — só instanceId e token são obrigatórios
        return !!(this.instanceId && this.token);
    }

    // ─── Formatação de telefone ───────────────────────────────────────────────

    /**
     * Formata um número de telefone brasileiro para o padrão Z-API.
     * Aceita: (98) 98765-4321, 9898765-4321, +5598987654321, 5598987654321
     * Retorna: 5598987654321 (sem espaços/parênteses/hífens, com 55)
     */
    formatPhone(phone: string): string {
        // Remove tudo que não é dígito
        let digits = phone.replace(/\D/g, '');

        // Remove código de país se duplicado (5555...)
        if (digits.startsWith('55') && digits.length > 13) {
            digits = digits.slice(2);
        }

        // Adiciona 55 se não tiver
        if (!digits.startsWith('55')) {
            digits = '55' + digits;
        }

        return digits;
    }

    // ─── Envio base ───────────────────────────────────────────────────────────

    /**
     * Envia mensagem de texto para um número de telefone.
     * @param phone Número BR (qualquer formato: com/sem 55, com/sem formatação)
     * @param message Texto da mensagem (suporta *negrito* e _itálico_ do WhatsApp)
     */
    async sendText(phone: string, message: string): Promise<void> {
        if (!this.isConfigured) {
            this.logger.warn(`[DEV WhatsApp] → ${phone}\n${message}`);
            return;
        }

        const formattedPhone = this.formatPhone(phone);
        const url = `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}/send-text`;

        // Client-Token é opcional — só envia o header se configurado
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.clientToken) headers['Client-Token'] = this.clientToken;

        try {
            await axios.post(
                url,
                { phone: formattedPhone, message },
                { headers, timeout: 8000 },
            );
            this.logger.log(`📱 WhatsApp enviado → ${formattedPhone}`);
        } catch (err: any) {
            const status = err?.response?.status;
            const detail = err?.response?.data?.error || err?.message;
            this.logger.warn(`⚠️  Falha ao enviar WhatsApp para ${formattedPhone}: [${status}] ${detail}`);
        }
    }

    /**
     * Busca o telefone de um aluno em student_contacts e envia.
     * Só envia se: hasWhatsapp=true E allowWhatsappContact=true
     */
    async sendToStudent(studentId: string, message: string): Promise<void> {
        try {
            const contact = await this.prisma.studentContact.findUnique({
                where: { studentId },
                select: { phone: true, hasWhatsapp: true, allowWhatsappContact: true },
            });

            if (!contact) {
                this.logger.debug(`[WhatsApp] Sem contato para studentId=${studentId}`);
                return;
            }
            if (!contact.hasWhatsapp || !contact.allowWhatsappContact) {
                this.logger.debug(`[WhatsApp] Aluno ${studentId} não autoriza WhatsApp`);
                return;
            }
            if (!contact.phone) {
                this.logger.debug(`[WhatsApp] Aluno ${studentId} sem telefone cadastrado`);
                return;
            }

            await this.sendText(contact.phone, message);
        } catch (err) {
            this.logger.warn(`[WhatsApp] Erro ao buscar contato do aluno ${studentId}: ${err}`);
        }
    }

    /**
     * Busca o telefone de um usuário (User.phone) e envia.
     * Usado para professores, motoristas e funcionários.
     */
    async sendToUser(userId: string, message: string): Promise<void> {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { phone: true, name: true },
            });

            if (!user?.phone) {
                this.logger.debug(`[WhatsApp] Usuário ${userId} sem telefone cadastrado`);
                return;
            }

            await this.sendText(user.phone, message);
        } catch (err) {
            this.logger.warn(`[WhatsApp] Erro ao buscar telefone do usuário ${userId}: ${err}`);
        }
    }

    // ─── Status e QR Code (para o painel admin) ──────────────────────────────

    /**
     * Retorna o status de conexão da instância Z-API.
     */
    async getStatus(): Promise<{
        connected: boolean;
        phone?: string;
        connectedSince?: string;
        error?: string;
    }> {
        if (!this.isConfigured) {
            return { connected: false, error: 'Z-API não configurado (ZAPI_INSTANCE_ID ausente)' };
        }

        try {
            const url = `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}/status`;
            const headers: Record<string, string> = {};
            if (this.clientToken) headers['Client-Token'] = this.clientToken;

            const res = await axios.get(url, { headers, timeout: 8000 });
            const data = res.data;
            const connected = data?.connected === true;
            const phone = data?.phone ?? undefined;
            return { connected, phone };
        } catch (err: any) {
            const detail = err?.response?.data?.error || err?.message;
            return { connected: false, error: detail };
        }
    }

    /**
     * Retorna o QR Code da instância como imagem Base64.
     * Usar quando status.connected === false para exibir no painel admin.
     */
    async getQrCode(): Promise<{ qrcode: string | null; error?: string }> {
        if (!this.isConfigured) {
            return { qrcode: null, error: 'Z-API não configurado' };
        }

        try {
            const url = `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}/qr-code/image`;
            const headers: Record<string, string> = {};
            if (this.clientToken) headers['Client-Token'] = this.clientToken;

            const res = await axios.get(url, {
                headers,
                timeout: 10000,
            });

            // A Z-API retorna um JSON: { value: 'data:image/png;base64,...' }
            const qrcode = res.data?.value || null;
            return { qrcode };
        } catch (err: any) {
            const detail = err?.response?.data?.error || err?.message;
            this.logger.warn(`[WhatsApp] Falha ao obter QR Code: ${detail}`);
            return { qrcode: null, error: detail };
        }
    }

    /**
     * Desconecta a instância (logout do WhatsApp vinculado).
     */
    async disconnect(): Promise<{ success: boolean; error?: string }> {
        if (!this.isConfigured) {
            return { success: false, error: 'Z-API não configurado' };
        }

        try {
            const url = `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}/disconnect`;
            const headers: Record<string, string> = {};
            if (this.clientToken) headers['Client-Token'] = this.clientToken;

            await axios.get(url, { headers, timeout: 8000 });
            this.logger.log('📴 WhatsApp desconectado via painel admin');
            return { success: true };
        } catch (err: any) {
            const detail = err?.response?.data?.error || err?.message;
            return { success: false, error: detail };
        }
    }

    // ─── Mensagens prontas do sistema ─────────────────────────────────────────

    async notifyEnrollmentReceived(studentId: string, studentName: string, courseName: string, protocol: string) {
        const msg = `🎓 *Olá, ${studentName}!*\n\nSua inscrição no curso *${courseName}* foi recebida com sucesso! ✅\n\n📋 Protocolo: \`${protocol}\`\n\nAguarde a análise da nossa equipe. Em breve você receberá a confirmação.\n\n_Sistema Upgrade_`;
        await this.sendToStudent(studentId, msg);
    }

    async notifyEnrollmentApproved(studentId: string, studentName: string, courseName: string, startDate?: string, city?: string) {
        const details = [
            startDate ? `📅 Início: ${startDate}` : '',
            city ? `📍 Local: ${city}` : '',
        ].filter(Boolean).join('\n');

        const msg = `✅ *Inscrição Aprovada!*\n\nParabéns, *${studentName}*! Sua inscrição no curso *${courseName}* foi aprovada.\n\n${details ? details + '\n\n' : ''}Acesse o portal do aluno para mais detalhes.\n\n_Sistema Upgrade_`;
        await this.sendToStudent(studentId, msg);
    }

    async notifyEnrollmentRejected(studentId: string, studentName: string, courseName: string, reason?: string) {
        const msg = `❌ *Atualização da sua Inscrição*\n\nOlá, *${studentName}*. Infelizmente sua inscrição no curso *${courseName}* não foi aprovada neste momento.${reason ? `\n\n📝 Motivo: ${reason}` : ''}\n\nEm caso de dúvidas, entre em contato com nossa equipe.\n\n_Sistema Upgrade_`;
        await this.sendToStudent(studentId, msg);
    }

    async notifyCertificateIssued(studentId: string, studentName: string, courseName: string, verificationCode: string, verifyUrl: string) {
        const msg = `🏆 *Certificado Disponível!*\n\n*${studentName}*, seu certificado de conclusão do curso *${courseName}* está pronto!\n\n🔗 Verificar autenticidade:\n${verifyUrl}\n\n🔑 Código: \`${verificationCode}\`\n\n_Sistema Upgrade_`;
        await this.sendToStudent(studentId, msg);
    }

    async notifyFeedbackInvitation(studentId: string, studentName: string, courseName: string) {
        const msg = `🎁 *Ganhe um PIX!*\n\nOlá, *${studentName}*! Seu certificado do curso *${courseName}* foi emitido.\n\nResponda nossa pesquisa rápida e receba uma *recompensa em PIX* 💰\n\nAcesse o portal do aluno para participar!\n\n_Sistema Upgrade_`;
        await this.sendToStudent(studentId, msg);
    }

    async notifyFeedbackPixApproved(studentId: string, studentName: string, pixAmount: number, courseName: string) {
        const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
        const msg = `💸 *Recompensa PIX Aprovada!*\n\nParabéns, *${studentName}*! Sua avaliação do curso *${courseName}* foi aprovada.\n\n💰 Valor: *${fmt(pixAmount)}*\n\nO PIX será enviado para a chave cadastrada em até 5 dias úteis.\n\n_Sistema Upgrade_`;
        await this.sendToStudent(studentId, msg);
    }

    async notifyAbsenceReviewed(userId: string, userName: string, status: string, description: string, adminNote?: string) {
        const statusMap: Record<string, string> = {
            VALIDATED: '✅ Justificativa Aprovada',
            REJECTED: '❌ Justificativa Reprovada',
            PENALIZED: '⚠️ Imprevisto Penalizado',
        };
        const label = statusMap[status] || `Imprevisto: ${status}`;
        const msg = `${label}\n\nOlá, *${userName}*. Seu imprevisto foi analisado.\n\n📝 Ocorrência: ${description}${adminNote ? `\n\n💬 Observação: ${adminNote}` : ''}\n\nAcesse o portal para mais detalhes.\n\n_Sistema Upgrade_`;
        await this.sendToUser(userId, msg);
    }

    async notifyReimbursementApproved(userId: string, userName: string, amount: number, description: string) {
        const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
        const msg = `✅ *Reembolso Aprovado!*\n\nOlá, *${userName}*! Seu reembolso foi aprovado.\n\n💰 Valor: *${fmt(amount)}*\n📝 Referente a: ${description}\n\nO pagamento será processado pelo financeiro nos próximos dias úteis.\n\n_Sistema Upgrade_`;
        await this.sendToUser(userId, msg);
    }

    async notifyReimbursementRejected(userId: string, userName: string, amount: number, description: string, reason: string) {
        const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
        const msg = `❌ *Reembolso Não Aprovado*\n\nOlá, *${userName}*. Sua solicitação de reembolso não foi aprovada.\n\n💰 Valor: ${fmt(amount)}\n📝 Descrição: ${description}\n\n📋 Motivo: ${reason}\n\nEm caso de dúvidas, fale com a equipe administrativa.\n\n_Sistema Upgrade_`;
        await this.sendToUser(userId, msg);
    }
}
