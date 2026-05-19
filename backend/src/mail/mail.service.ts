import { Injectable, Logger } from '@nestjs/common';
import { BrevoClient } from '@getbrevo/brevo';
import { getPrimaryFrontendUrl } from '../common/cors-origins';

/**
 * MailService — envia emails transacionais via Brevo.
 *
 * Fallback de desenvolvimento: quando BREVO_API_KEY não está configurada,
 * todos os emails são logados no console em vez de enviados.
 * Isso garante que o sistema funciona em dev sem configuração de email.
 */
@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly brevo: BrevoClient | null;

    private readonly senderEmail: string;
    private readonly senderName: string;

    constructor() {
        const apiKey = process.env.BREVO_API_KEY?.trim();
        this.senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || 'noreply@qualifica.com.br';
        this.senderName  = process.env.BREVO_SENDER_NAME?.trim()  || 'Qualifica MA/PI';

        if (apiKey) {
            this.brevo = new BrevoClient({ apiKey });
            this.logger.log('✅ Brevo configurado — emails serão enviados via API');
        } else {
            this.brevo = null;
            this.logger.warn('⚠️  BREVO_API_KEY não configurada — emails serão logados no console (modo dev)');
        }
    }

    // ── Método interno de envio ───────────────────────────────────────────────

    private async send(to: string, subject: string, html: string): Promise<void> {
        if (!this.brevo) {
            // Modo dev: log claro no console
            this.logger.warn([
                '',
                '╔═══════════════════════════════════════════════════════════╗',
                '║                   [DEV] EMAIL NÃO ENVIADO                ║',
                `║  Para:    ${to.slice(0, 48).padEnd(48)}║`,
                `║  Assunto: ${subject.slice(0, 48).padEnd(48)}║`,
                '╚═══════════════════════════════════════════════════════════╝',
            ].join('\n'));
            return;
        }

        // ── MODO TESTE: redireciona todos os emails para endereços reais ──────
        // Ative com MAIL_DEV_REDIRECT_TO=email1@ex.com,email2@ex.com no .env
        // ⚠️  REMOVER ou deixar vazio antes de produção oficial
        const redirectRaw = process.env.MAIL_DEV_REDIRECT_TO?.trim();
        const redirectList = redirectRaw
            ? redirectRaw.split(',').map(e => e.trim()).filter(Boolean)
            : [];

        const actualTo = redirectList.length > 0 ? redirectList : [to];
        const actualSubject = redirectList.length > 0
            ? `[TESTE → ${to}] ${subject}`
            : subject;

        if (redirectList.length > 0) {
            this.logger.warn(`[DEV REDIRECT] Email para <${to}> redirecionado → [${redirectList.join(', ')}]`);
        }

        try {
            await this.brevo.transactionalEmails.sendTransacEmail({
                sender: { email: this.senderEmail, name: this.senderName },
                to: actualTo.map(email => ({ email })),
                subject: actualSubject,
                htmlContent: html,
            });
        } catch (err) {
            // Log do erro mas nunca lança exceção — email nunca bloqueia o fluxo principal
            this.logger.error(`Falha ao enviar email para ${to}: ${err}`);
        }

    }


    // ── OTP de login (obrigatório para todos os usuários) ─────────────────────

    async sendOtpLogin(to: string, name: string, code: string): Promise<void> {
        // Dev sem API key: código visível no console para facilitar testes
        if (!this.brevo) {
            this.logger.warn([
                '',
                '╔══════════════════════════════════════════════╗',
                '║          [DEV] CÓDIGO OTP DE LOGIN           ║',
                `║  Para:   ${to.slice(0, 36).padEnd(36)}║`,
                `║  Nome:   ${name.slice(0, 36).padEnd(36)}║`,
                `║  Código: ${code.padEnd(36)}║`,
                '║  Expira: 10 minutos                          ║',
                '╚══════════════════════════════════════════════╝',
            ].join('\n'));
            return;
        }

        const html = this.templateOtp(name, code);
        await this.send(to, `${code} — Codigo de acesso Upgrade`, html);
    }

    // ── Boas-vindas para novo funcionário ─────────────────────────────────────

    async sendStaffWelcome(to: string, name: string): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] Welcome staff email → ${name} <${to}>`);
            return;
        }
        const html = this.templateStaffWelcome(name);
        await this.send(to, 'Bem-vindo ao Sistema Upgrade', html);
    }

    // ── Certificado emitido ───────────────────────────────────────────────────

    async sendCertificateIssued(
        to: string,
        name: string,
        courseName: string,
        verificationCode: string,
    ): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] Certificado email → ${name} <${to}> | ${courseName}`);
            return;
        }
        const base = getPrimaryFrontendUrl().replace(/\/$/, '');
        const verifyUrl  = `${base}/certificado/verificar/${encodeURIComponent(verificationCode)}`;
        const downloadUrl = `${base}/api/certificates/download/${encodeURIComponent(verificationCode)}`;
        const html = this.templateCertificate(name, courseName, verifyUrl, downloadUrl, verificationCode);
        await this.send(
            to,
            `Seu certificado de ${courseName} está pronto — Sistema Upgrade`,
            html,
        );
    }

    // ── Inscrição recebida ────────────────────────────────────────────────────

    async sendEnrollmentReceived(
        to: string,
        name: string,
        courseName: string,
        protocol: string,
    ): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] Inscrição recebida email → ${name} <${to}>`);
            return;
        }
        const html = this.templateEnrollmentReceived(name, courseName, protocol);
        await this.send(to, `Inscrição recebida — ${courseName}`, html);
    }

    // ── Inscrição aprovada ────────────────────────────────────────────────────

    async sendEnrollmentApproved(
        to: string,
        name: string,
        courseName: string,
        startDate?: string,
        city?: string,
    ): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] Inscrição aprovada email → ${name} <${to}>`);
            return;
        }
        const html = this.templateEnrollmentApproved(name, courseName, startDate, city);
        await this.send(to, `✅ Inscrição aprovada — ${courseName}`, html);
    }

    // ── Inscrição rejeitada ───────────────────────────────────────────────────

    async sendEnrollmentRejected(
        to: string,
        name: string,
        courseName: string,
        reason?: string,
    ): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] Inscrição rejeitada email → ${name} <${to}>`);
            return;
        }
        const html = this.templateEnrollmentRejected(name, courseName, reason);
        await this.send(to, `Atualização sobre sua inscrição — ${courseName}`, html);
    }

    // ── Reset de senha ────────────────────────────────────────────────────────

    async sendPasswordReset(to: string, name: string, resetLink: string): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] Password reset email → ${name} <${to}> | Link: ${resetLink}`);
            return;
        }
        const html = this.templatePasswordReset(name, resetLink);
        await this.send(to, 'Redefinição de senha — Sistema Upgrade', html);
    }

    // ── Alertas de Estoque ────────────────────────────────────────────────────

    async sendLowStockAlert(to: string, name: string, itemName: string, currentQty: number, minQty: number): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] Low stock alert → ${name} <${to}> | ${itemName}: ${currentQty}/${minQty}`);
            return;
        }
        const html = this.templateLowStockAlert(name, itemName, currentQty, minQty);
        await this.send(to, `⚠️ Estoque Crítico — ${itemName}`, html);
    }

    async sendPurchaseRequestCreated(to: string, name: string, requesterName: string, itemName: string, qty: number): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] Purchase Request Created → ${name} <${to}> | ${requesterName} requested ${qty}x ${itemName}`);
            return;
        }
        const html = this.templatePurchaseRequestCreated(name, requesterName, itemName, qty);
        await this.send(to, `Nova Solicitação de Compra — ${itemName}`, html);
    }

    async sendPurchaseRequestReviewed(to: string, name: string, itemName: string, status: string, reviewNote?: string): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] Purchase Request Reviewed → ${name} <${to}> | ${itemName} is ${status}`);
            return;
        }
        const html = this.templatePurchaseRequestReviewed(name, itemName, status, reviewNote);
        await this.send(to, `Atualização da Solicitação — ${itemName} foi ${status}`, html);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TEMPLATES HTML
    // ═════════════════════════════════════════════════════════════════════════

    private baseWrapper(content: string): string {
        return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#F4F6FA">
  <div style="max-width:560px;margin:32px auto;padding-bottom:40px"><div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#FFD600 0%,#F59E0B 100%);padding:28px 32px">
      <h1 style="margin:0;font-size:22px;font-weight:900;color:#000;letter-spacing:.08em;font-family:Arial Black,sans-serif">UPGRADE</h1>
      <p style="margin:4px 0 0;font-size:11px;color:rgba(0,0,0,.55);letter-spacing:.15em;text-transform:uppercase">Sistema de Qualificação Profissional</p>
    </div>
    <!-- Body -->
    <div style="padding:32px">
      ${content}
    </div>
    <!-- Footer -->
    <div style="padding:16px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB">
      <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center">
        Sistema Upgrade &middot; Este é um email automático, não responda a esta mensagem.
      </p>
    </div>
  </div></div>
</body>
</html>`;
    }

    private esc(s: string): string {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    private templateOtp(name: string, code: string): string {
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 8px">Olá, <strong>${this.esc(name)}</strong></p>
      <p style="color:#6B7280;font-size:14px;margin:0 0 24px">Use o código abaixo para acessar o sistema:</p>
      <div style="background:#FFFBEB;border:2px solid #FFD600;border-radius:10px;padding:24px;text-align:center;margin:0 0 24px">
        <span style="font-family:'Courier New',Courier,monospace;font-size:40px;font-weight:900;color:#000;letter-spacing:.2em">${this.esc(code)}</span>
      </div>
      <p style="color:#9CA3AF;font-size:12px;margin:0 0 4px">⏱ Este código expira em <strong>10 minutos</strong>.</p>
      <p style="color:#9CA3AF;font-size:12px;margin:0">🔒 Se não foi você quem solicitou, ignore este e-mail.</p>`);
    }

    private templateStaffWelcome(name: string): string {
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 12px">Olá, <strong>${this.esc(name)}</strong>!</p>
      <p style="color:#374151;font-size:14px;margin:0 0 16px">Sua conta no <strong>Sistema Upgrade</strong> foi criada com sucesso.</p>
      <div style="background:#FFFBEB;border-left:4px solid #FFD600;padding:12px 16px;border-radius:4px;margin:0 0 20px">
        <p style="margin:0;font-size:13px;color:#92400E;font-weight:600">⚠️ Ação necessária no primeiro acesso</p>
        <p style="margin:6px 0 0;font-size:13px;color:#92400E">No seu primeiro login, você será solicitado a configurar o <strong>Google Authenticator</strong> para proteger sua conta.</p>
      </div>
      <p style="color:#6B7280;font-size:13px">Instale o app Google Authenticator no seu celular antes de fazer o login.</p>`);
    }

    private templateCertificate(
        name: string,
        courseName: string,
        verifyUrl: string,
        downloadUrl: string,
        code: string,
    ): string {
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 12px">🎉 Parabéns, <strong>${this.esc(name)}</strong>!</p>
      <p style="color:#374151;font-size:14px;margin:0 0 20px">Seu certificado de conclusão do curso <strong>${this.esc(courseName)}</strong> foi emitido.</p>
      <div style="display:flex;gap:12px;margin:0 0 20px">
        <a href="${this.esc(verifyUrl)}" style="flex:1;display:block;padding:12px;background:#FFD600;color:#000;text-align:center;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">🔍 Verificar Autenticidade</a>
        <a href="${this.esc(downloadUrl)}" style="flex:1;display:block;padding:12px;background:#111827;color:#fff;text-align:center;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">📄 Baixar PDF</a>
      </div>
      <p style="color:#9CA3AF;font-size:12px;margin:0">Código de verificação: <code style="background:#F3F4F6;padding:2px 6px;border-radius:4px">${this.esc(code)}</code></p>`);
    }

    private templateEnrollmentReceived(name: string, courseName: string, protocol: string): string {
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 12px">Olá, <strong>${this.esc(name)}</strong>!</p>
      <p style="color:#374151;font-size:14px;margin:0 0 16px">Recebemos sua inscrição para o curso <strong>${this.esc(courseName)}</strong>.</p>
      <div style="background:#FFFBEB;border:1px solid rgba(255,214,0,.4);border-radius:8px;padding:16px;margin:0 0 20px">
        <p style="margin:0;font-size:12px;color:#92400E;font-weight:600;letter-spacing:.08em;text-transform:uppercase">Número do protocolo</p>
        <p style="margin:6px 0 0;font-size:20px;font-weight:900;color:#000;font-family:monospace;letter-spacing:.1em">${this.esc(protocol)}</p>
      </div>
      <p style="color:#6B7280;font-size:13px;margin:0">Sua inscrição está sendo analisada. Você receberá um e-mail assim que houver uma atualização.</p>`);
    }

    private templateEnrollmentApproved(
        name: string,
        courseName: string,
        startDate?: string,
        city?: string,
    ): string {
        const details = [
            startDate ? `<li style="margin:4px 0">📅 <strong>Início:</strong> ${this.esc(startDate)}</li>` : '',
            city       ? `<li style="margin:4px 0">📍 <strong>Local:</strong> ${this.esc(city)}</li>`      : '',
        ].filter(Boolean).join('');

        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 12px">🎉 Parabéns, <strong>${this.esc(name)}</strong>!</p>
      <p style="color:#374151;font-size:14px;margin:0 0 16px">Sua inscrição no curso <strong>${this.esc(courseName)}</strong> foi <strong style="color:#16a34a">aprovada</strong>.</p>
      ${details ? `<ul style="color:#374151;font-size:14px;padding-left:20px;margin:0 0 16px">${details}</ul>` : ''}
      <p style="color:#6B7280;font-size:13px;margin:0">Acesse o portal do aluno para acompanhar sua turma e materiais.</p>`);
    }

    private templateEnrollmentRejected(name: string, courseName: string, reason?: string): string {
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 12px">Olá, <strong>${this.esc(name)}</strong>.</p>
      <p style="color:#374151;font-size:14px;margin:0 0 16px">Infelizmente sua inscrição no curso <strong>${this.esc(courseName)}</strong> não foi aprovada neste momento.</p>
      ${reason ? `<div style="background:#FEF2F2;border-left:4px solid #FECACA;padding:12px 16px;border-radius:4px;margin:0 0 16px"><p style="margin:0;font-size:13px;color:#DC2626"><strong>Motivo:</strong> ${this.esc(reason)}</p></div>` : ''}
      <p style="color:#6B7280;font-size:13px;margin:0">Em caso de dúvidas, entre em contato com a equipe Sistema Upgrade.</p>`);
    }

    private templatePasswordReset(name: string, resetLink: string): string {
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 12px">Olá, <strong>${this.esc(name)}</strong>.</p>
      <p style="color:#374151;font-size:14px;margin:0 0 20px">Recebemos uma solicitação para redefinir sua senha.</p>
      <a href="${this.esc(resetLink)}" style="display:block;padding:14px;background:linear-gradient(180deg,#FFD600 0%,#F59E0B 100%);color:#000;text-align:center;border-radius:8px;text-decoration:none;font-weight:800;font-size:14px;margin:0 0 20px">🔐 Redefinir Minha Senha</a>
      <p style="color:#9CA3AF;font-size:12px;margin:0">Este link expira em 30 minutos. Se não foi você, ignore este e-mail.</p>`);
    }

    // ─── Reembolso Aprovado (Fase 3: Financeiro) ─────────────────────────────

    async sendReimbursementApproved(
        to: string, name: string,
        amount: number, description: string, approverName: string,
    ): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] Reembolso aprovado -> ${name} <${to}> | R$ ${amount}`);
            return;
        }
        const html = this.templateReimbursementApproved(name, amount, description, approverName);
        await this.send(to, `Reembolso Aprovado — R$ ${amount.toFixed(2)}`, html);
    }

    // ─── Reembolso Rejeitado (Fase 3: Financeiro) ────────────────────────────

    async sendReimbursementRejected(
        to: string, name: string,
        amount: number, description: string, reason: string, approverName: string,
    ): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] Reembolso rejeitado -> ${name} <${to}> | motivo: ${reason}`);
            return;
        }
        const html = this.templateReimbursementRejected(name, amount, description, reason, approverName);
        await this.send(to, `Reembolso Nao Aprovado — R$ ${amount.toFixed(2)}`, html);
    }

    // ─── PIX Feedback Aprovado (Fase 3: Financeiro) ──────────────────────────

    async sendFeedbackPixApproved(
        to: string, name: string,
        pixAmount: number, courseName: string, pixKey: string, pixKeyType: string,
    ): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] PIX aprovado -> ${name} <${to}> | R$ ${pixAmount}`);
            return;
        }
        const html = this.templateFeedbackPixApproved(name, pixAmount, courseName, pixKey, pixKeyType);
        await this.send(to, `Sua recompensa PIX de R$ ${pixAmount.toFixed(2)} foi aprovada!`, html);
    }

    // ─── Lembrete de aula (Fase 2: Cron Job) ─────────────────────────────────

    async sendClassReminder(
        to: string, name: string, courseName: string,
        date: string, time: string,
    ): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] Lembrete aula -> ${name} <${to}> | ${courseName} em ${date}`);
            return;
        }
        const html = this.templateClassReminder(name, courseName, date, time);
        await this.send(to, `Lembrete: sua aula de ${courseName} e amanha!`, html);
    }

    // ─── Alerta de falta (Fase 2: Cron Job) ──────────────────────────────────

    async sendAbsenceAlert(
        to: string, name: string, courseName: string,
        totalAbsences: number, totalClasses: number,
    ): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] Alerta falta -> ${name} <${to}> | ${totalAbsences} faltas`);
            return;
        }
        const html = this.templateAbsenceAlert(name, courseName, totalAbsences, totalClasses);
        await this.send(to, `Aviso de falta — ${courseName}`, html);
    }

    // ─── Alerta de manutencao de caminhao (Fase 2: Cron Job) ─────────────────

    async sendMaintenanceAlert(
        to: string, name: string,
        items: { plate: string; model: string; type: string; nextDueDate: string; overdue: boolean }[],
    ): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] Alerta manutencao -> ${name} <${to}> | ${items.length} veiculos`);
            return;
        }
        const html = this.templateMaintenanceAlert(name, items);
        await this.send(to, `Alerta de manutencao preventiva — ${items.length} veiculo(s)`, html);
    }

    // ─── Resumo semanal para admin (Fase 2: Cron Job) ────────────────────────

    async sendWeeklySummary(
        to: string, name: string,
        data: {
            newEnrollments: number; newCertificates: number;
            pendingReimbursements: number; activeClasses: number;
            weekStart: string; weekEnd: string;
        },
    ): Promise<void> {
        if (!this.brevo) {
            this.logger.warn(`[DEV] Resumo semanal -> ${name} <${to}>`);
            return;
        }
        const html = this.templateWeeklySummary(name, data);
        await this.send(to, `Resumo semanal — ${data.weekStart} a ${data.weekEnd}`, html);
    }


    private templateClassReminder(name: string, courseName: string, date: string, time: string): string {
        const timeInfo = time ? `<li style="margin:4px 0">Horario: <strong>${this.esc(time)}</strong></li>` : '';
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 12px">Ola, <strong>${this.esc(name)}</strong>!</p>
      <p style="color:#374151;font-size:14px;margin:0 0 16px">Lembrando que voce tem aula amanha:</p>
      <div style="background:#FFFBEB;border:1px solid rgba(255,214,0,.4);border-radius:8px;padding:16px;margin:0 0 20px">
        <ul style="color:#374151;font-size:14px;padding-left:20px;margin:0">
          <li style="margin:4px 0">Curso: <strong>${this.esc(courseName)}</strong></li>
          <li style="margin:4px 0">Data: <strong>${this.esc(date)}</strong></li>
          ${timeInfo}
        </ul>
      </div>
      <p style="color:#6B7280;font-size:13px;margin:0 0 8px">Nao se atrase! A presenca e obrigatoria para a emissao do certificado.</p>
      <p style="color:#9CA3AF;font-size:12px;margin:0">Caso nao possa comparecer, entre em contato com a equipe do Sistema Upgrade.</p>`);
    }

    private templateAbsenceAlert(name: string, courseName: string, totalAbsences: number, totalClasses: number): string {
        const pct = totalClasses > 0 ? Math.round((totalAbsences / totalClasses) * 100) : 0;
        const danger = pct >= 20;
        const color  = danger ? '#DC2626' : '#D97706';
        const bg     = danger ? '#FEF2F2' : '#FFFBEB';
        const border = danger ? '#FECACA' : 'rgba(255,214,0,.4)';
        const pctStr = totalClasses > 0 ? ` / ${totalClasses} aulas (${pct}%)` : '';
        const warn   = danger
            ? `<p style="margin:6px 0 0;font-size:13px;color:#DC2626">Atencao: voce ultrapassou 20% de faltas. Justifique suas ausencias para nao perder o certificado.</p>`
            : `<p style="margin:6px 0 0;font-size:13px;color:#92400E">Fique atento ao limite de 25% de faltas para garantir o certificado.</p>`;
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 12px">Ola, <strong>${this.esc(name)}</strong>.</p>
      <p style="color:#374151;font-size:14px;margin:0 0 16px">Identificamos sua ausencia hoje na aula de <strong>${this.esc(courseName)}</strong>.</p>
      <div style="background:${bg};border-left:4px solid ${border};padding:12px 16px;border-radius:4px;margin:0 0 20px">
        <p style="margin:0;font-size:13px;color:${color};font-weight:600">Total de faltas nao justificadas: ${totalAbsences}${pctStr}</p>
        ${warn}
      </div>
      <p style="color:#9CA3AF;font-size:12px;margin:0">Se esta ausencia for justificada, entre em contato com o secretario do curso.</p>`);
    }

    private templateMaintenanceAlert(
        name: string,
        items: { plate: string; model: string; type: string; nextDueDate: string; overdue: boolean }[],
    ): string {
        const rows = items.map(i =>
            `<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px">${this.esc(i.plate)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px">${this.esc(i.model)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px">${this.esc(i.type)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;color:${i.overdue ? '#DC2626' : '#D97706'};font-weight:600">
                ${this.esc(i.nextDueDate)}${i.overdue ? ' (VENCIDA)' : ''}
              </td>
            </tr>`
        ).join('');
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 12px">Ola, <strong>${this.esc(name)}</strong>.</p>
      <p style="color:#374151;font-size:14px;margin:0 0 16px">Os seguintes veiculos precisam de manutencao preventiva:</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
        <thead>
          <tr style="background:#F3F4F6">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6B7280">Placa</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6B7280">Modelo</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6B7280">Tipo</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6B7280">Vencimento</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#9CA3AF;font-size:12px;margin:0">Acesse o painel administrativo para registrar as manutencoes realizadas.</p>`);
    }

    private templateWeeklySummary(
        name: string,
        data: {
            newEnrollments: number; newCertificates: number;
            pendingReimbursements: number; activeClasses: number;
            weekStart: string; weekEnd: string;
        },
    ): string {
        const reimColor = data.pendingReimbursements > 0 ? '#DC2626' : '#16a34a';
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 4px">Ola, <strong>${this.esc(name)}</strong>!</p>
      <p style="color:#6B7280;font-size:13px;margin:0 0 20px">Resumo da semana de ${this.esc(data.weekStart)} a ${this.esc(data.weekEnd)}:</p>
      <table style="width:100%;border-collapse:collapse;background:#FFFBEB;border-radius:8px;margin:0 0 20px">
        <tr>
          <td style="padding:14px;text-align:center">
            <p style="margin:0;font-size:11px;color:#92400E;font-weight:600;text-transform:uppercase">Inscricoes</p>
            <p style="margin:4px 0 0;font-size:32px;font-weight:900;color:#000">${data.newEnrollments}</p>
          </td>
          <td style="padding:14px;text-align:center;border-left:1px solid rgba(255,214,0,.3)">
            <p style="margin:0;font-size:11px;color:#92400E;font-weight:600;text-transform:uppercase">Certificados</p>
            <p style="margin:4px 0 0;font-size:32px;font-weight:900;color:#000">${data.newCertificates}</p>
          </td>
          <td style="padding:14px;text-align:center;border-left:1px solid rgba(255,214,0,.3)">
            <p style="margin:0;font-size:11px;color:#92400E;font-weight:600;text-transform:uppercase">Turmas Ativas</p>
            <p style="margin:4px 0 0;font-size:32px;font-weight:900;color:#000">${data.activeClasses}</p>
          </td>
          <td style="padding:14px;text-align:center;border-left:1px solid rgba(255,214,0,.3)">
            <p style="margin:0;font-size:11px;color:#92400E;font-weight:600;text-transform:uppercase">Reembolsos Pend.</p>
            <p style="margin:4px 0 0;font-size:32px;font-weight:900;color:${reimColor}">${data.pendingReimbursements}</p>
          </td>
        </tr>
      </table>
      <p style="color:#9CA3AF;font-size:12px;margin:0">Acesse o painel administrativo para ver o relatorio completo da semana.</p>`);
    }

    private templateReimbursementApproved(name: string, amount: number, description: string, approverName: string): string {
        const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 12px">Ola, <strong>${this.esc(name)}</strong>!</p>
      <p style="color:#374151;font-size:14px;margin:0 0 16px">Seu reembolso foi <strong style="color:#16a34a">aprovado</strong> e encaminhado ao financeiro.</p>
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px;margin:0 0 20px">
        <p style="margin:0 0 8px;font-size:13px;color:#374151"><strong>Valor:</strong>
           <span style="font-size:20px;font-weight:900;color:#16a34a">${fmt(amount)}</span></p>
        <p style="margin:0 0 4px;font-size:13px;color:#374151"><strong>Descricao:</strong> ${this.esc(description)}</p>
        <p style="margin:0;font-size:13px;color:#374151"><strong>Aprovado por:</strong> ${this.esc(approverName)}</p>
      </div>
      <p style="color:#6B7280;font-size:13px;margin:0">O pagamento sera processado pelo financeiro nos proximos dias uteis.</p>`);
    }

    private templateReimbursementRejected(name: string, amount: number, description: string, reason: string, approverName: string): string {
        const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 12px">Ola, <strong>${this.esc(name)}</strong>.</p>
      <p style="color:#374151;font-size:14px;margin:0 0 16px">Infelizmente sua solicitacao de reembolso nao foi aprovada.</p>
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin:0 0 20px">
        <p style="margin:0 0 8px;font-size:13px;color:#374151"><strong>Valor solicitado:</strong> ${fmt(amount)}</p>
        <p style="margin:0 0 8px;font-size:13px;color:#374151"><strong>Descricao:</strong> ${this.esc(description)}</p>
        <p style="margin:0 0 8px;font-size:13px;color:#374151"><strong>Motivo da recusa:</strong>
           <span style="color:#DC2626">${this.esc(reason)}</span></p>
        <p style="margin:0;font-size:13px;color:#374151"><strong>Revisado por:</strong> ${this.esc(approverName)}</p>
      </div>
      <p style="color:#6B7280;font-size:13px;margin:0">Em caso de duvidas, entre em contato com o setor administrativo.</p>`);
    }

    private templateFeedbackPixApproved(name: string, pixAmount: number, courseName: string, pixKey: string, pixKeyType: string): string {
        const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 12px">Parabens, <strong>${this.esc(name)}</strong>!</p>
      <p style="color:#374151;font-size:14px;margin:0 0 16px">Seu feedback do curso foi aprovado e sua recompensa PIX esta a caminho!</p>
      <div style="background:#FFFBEB;border:1px solid rgba(255,214,0,.4);border-radius:8px;padding:20px;margin:0 0 20px;text-align:center">
        <p style="margin:0 0 4px;font-size:12px;color:#92400E;font-weight:600;text-transform:uppercase">Valor da Recompensa</p>
        <p style="margin:0;font-size:40px;font-weight:900;color:#000">${fmt(pixAmount)}</p>
      </div>
      <div style="background:#F9FAFB;border-radius:8px;padding:14px;margin:0 0 20px">
        <p style="margin:0 0 6px;font-size:13px;color:#374151"><strong>Curso:</strong> ${this.esc(courseName)}</p>
        <p style="margin:0;font-size:13px;color:#374151"><strong>Chave PIX (${this.esc(pixKeyType)}):</strong> ${this.esc(pixKey)}</p>
      </div>
      <p style="color:#6B7280;font-size:13px;margin:0 0 8px">O PIX sera enviado para a chave cadastrada em ate 5 dias uteis.</p>
      <p style="color:#9CA3AF;font-size:12px;margin:0">Agradecemos sua participacao no Sistema Upgrade!</p>`);
    }

    private templateLowStockAlert(name: string, itemName: string, currentQty: number, minQty: number): string {
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 12px">Olá, <strong>${this.esc(name)}</strong>.</p>
      <p style="color:#374151;font-size:14px;margin:0 0 16px">O insumo <strong>${this.esc(itemName)}</strong> atingiu nível crítico de estoque.</p>
      <div style="background:#FEF2F2;border-left:4px solid #FECACA;padding:12px 16px;border-radius:4px;margin:0 0 16px">
        <p style="margin:0;font-size:13px;color:#DC2626"><strong>Saldo atual:</strong> ${currentQty} (Mínimo exigido: ${minQty})</p>
      </div>
      <p style="color:#6B7280;font-size:13px;margin:0">Acesse o painel de estoque para solicitar reposição.</p>`);
    }

    private templatePurchaseRequestCreated(name: string, requesterName: string, itemName: string, qty: number): string {
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 12px">Olá, <strong>${this.esc(name)}</strong>.</p>
      <p style="color:#374151;font-size:14px;margin:0 0 16px">Uma nova solicitação de compra foi criada.</p>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:14px;margin:0 0 20px">
        <p style="margin:0 0 6px;font-size:13px;color:#374151"><strong>Solicitante:</strong> ${this.esc(requesterName)}</p>
        <p style="margin:0;font-size:13px;color:#374151"><strong>Pedido:</strong> ${qty}x ${this.esc(itemName)}</p>
      </div>
      <p style="color:#6B7280;font-size:13px;margin:0">Acesse o módulo de Estoque para avaliar e aprovar a solicitação.</p>`);
    }

    private templatePurchaseRequestReviewed(name: string, itemName: string, status: string, reviewNote?: string): string {
        const isApproved = status === 'APROVADA';
        const color = isApproved ? '#16a34a' : '#DC2626';
        return this.baseWrapper(`
      <p style="color:#374151;font-size:15px;margin:0 0 12px">Olá, <strong>${this.esc(name)}</strong>.</p>
      <p style="color:#374151;font-size:14px;margin:0 0 16px">Sua solicitação para <strong>${this.esc(itemName)}</strong> foi <strong style="color:${color}">${status.toLowerCase()}</strong>.</p>
      ${reviewNote ? `<div style="background:#F3F4F6;border-left:4px solid #D1D5DB;padding:12px 16px;border-radius:4px;margin:0 0 16px"><p style="margin:0;font-size:13px;color:#4B5563"><strong>Observação:</strong> ${this.esc(reviewNote)}</p></div>` : ''}
      <p style="color:#6B7280;font-size:13px;margin:0">Acesse o painel para mais detalhes.</p>`);
    }

}