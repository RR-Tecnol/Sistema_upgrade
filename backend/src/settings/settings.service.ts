import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SettingsService — REQ-14 (Configurações de Segurança e Sistema)
 *
 * Estratégia: persiste as configurações em um arquivo JSON local
 * (`data/settings.json`) no diretório do backend, sem necessidade de
 * nova tabela no banco. Este é o padrão mais simples para configurações
 * globais que raramente mudam e não precisam de histórico.
 *
 * Em produção, pode-se migrar para uma tabela `system_settings` se necessário.
 */
export interface SystemSettings {
    // Geral
    nomeSistema: string;
    emailContato: string;
    fusoHorario: string;
    idioma: string;

    // Notificações
    notifEmail: boolean;
    notifNovaInscricao: boolean;
    notifFrequenciaBaixa: boolean;
    notifCertificado: boolean;
    notifSistema: boolean;
    limiteFrequencia: string;

    // Segurança (REQ-14)
    sessaoTimeout: string;    // minutos; '0' = nunca
    doisFatores: boolean;
    logAcesso: boolean;
    senhaComplexidade: 'baixa' | 'media' | 'alta';

    // Sistema
    manutencao: boolean;
    backupAuto: boolean;
    intervalBackup: 'diario' | 'semanal' | 'quinzenal' | 'mensal';
    modoDebug: boolean;

    // Dados
    periodoRetencao: string;  // dias
    exportFormato: 'xlsx' | 'csv' | 'pdf';

    // Parâmetros Financeiros (S3-00 — Sprint 3)
    valorPassagemViagem: number;         // R$ — confirmado na planilha do Robert
    valorDiariaPadrao: number;           // R$ — sugestão padrão ao vincular instrutor
    kmLimitePassagemSemanal: number;     // km — ≤ este valor = passagem semanal
    diasUteisReferenciaMes: number;      // padrão CLT = 22 dias
    percentualAlertaCusto: number;       // ex: 110 = alerta quando real > 110% do estimado

    // Meta
    updatedAt: string;
    updatedBy: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
    nomeSistema: 'Sistema Qualifica MA & PI',
    emailContato: 'contato@qualifica.ma.gov.br',
    fusoHorario: 'America/Fortaleza',
    idioma: 'pt-BR',
    notifEmail: true,
    notifNovaInscricao: true,
    notifFrequenciaBaixa: true,
    notifCertificado: true,
    notifSistema: false,
    limiteFrequencia: '75',
    sessaoTimeout: '480',
    doisFatores: false,
    logAcesso: true,
    senhaComplexidade: 'media',
    manutencao: false,
    backupAuto: true,
    intervalBackup: 'diario',
    modoDebug: false,
    periodoRetencao: '365',
    exportFormato: 'xlsx',
    valorPassagemViagem: 270,
    valorDiariaPadrao: 120,
    kmLimitePassagemSemanal: 200,
    diasUteisReferenciaMes: 22,
    percentualAlertaCusto: 110,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
};

@Injectable()
export class SettingsService implements OnModuleInit {
    private readonly filePath: string;
    private cache: SystemSettings | null = null;

    constructor() {
        // Salva em <root>/data/settings.json
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        this.filePath = path.join(dataDir, 'settings.json');
    }

    onModuleInit() {
        // Carrega cache na inicialização para não ler arquivo a cada request
        this.cache = this.readFromDisk();
    }

    /** Retorna as configurações atuais */
    get(): SystemSettings {
        if (!this.cache) {
            this.cache = this.readFromDisk();
        }
        return this.cache;
    }

    /** Persiste configurações (merge parcial) */
    update(partial: Partial<SystemSettings>, updatedBy: string): SystemSettings {
        const current = this.get();
        const updated: SystemSettings = {
            ...current,
            ...partial,
            updatedAt: new Date().toISOString(),
            updatedBy,
        };
        this.cache = updated;
        fs.writeFileSync(this.filePath, JSON.stringify(updated, null, 2), 'utf-8');
        return updated;
    }

    /** Verifica se o sistema está em modo manutenção */
    isMaintenanceMode(): boolean {
        return this.get().manutencao;
    }

    /** Retorna timeout de sessão em milissegundos (para uso em guards JWT) */
    getSessionTimeoutMs(): number {
        const mins = parseInt(this.get().sessaoTimeout, 10);
        return mins === 0 ? 0 : mins * 60 * 1000;
    }

    /** Valida complexidade de senha segundo configuração ativa */
    validatePasswordStrength(password: string): { valid: boolean; message?: string } {
        const lvl = this.get().senhaComplexidade;
        if (lvl === 'baixa' && password.length < 6) {
            return { valid: false, message: 'Senha muito curta (mínimo 6 caracteres)' };
        }
        if (lvl === 'media') {
            if (password.length < 8) return { valid: false, message: 'Mínimo 8 caracteres' };
            if (!/\d/.test(password)) return { valid: false, message: 'Deve conter pelo menos um número' };
        }
        if (lvl === 'alta') {
            if (password.length < 10) return { valid: false, message: 'Mínimo 10 caracteres' };
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                return { valid: false, message: 'Deve conter pelo menos um caractere especial' };
            }
        }
        return { valid: true };
    }

    private readFromDisk(): SystemSettings {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
            }
        } catch {
            // Arquivo corrompido — usa defaults
        }
        return { ...DEFAULT_SETTINGS };
    }
}
