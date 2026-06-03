import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const logger = new Logger('AuthLocalhostBypass');

/**
 * Bypass de MFA/OTP — APENAS localhost / desenvolvimento.
 *
 * LOCALHOST: `backend/.env` → AUTH_BYPASS_MFA=true + NODE_ENV=development + FRONTEND_URLS com localhost
 * VPS: AUTH_BYPASS_MFA=false (ou omitir); NODE_ENV=production — este helper devolve sempre false.
 *
 * Ver docs/AUDITORIA/SPRINTS-CORRECAO-VPS.md → secção «Login bypass (localhost)».
 */
export function isLocalhostAuthBypassEnabled(config: ConfigService): boolean {
    if (config.get<string>('AUTH_BYPASS_MFA') !== 'true') {
        return false;
    }

    const nodeEnv = (config.get<string>('NODE_ENV') || '').toLowerCase();
    if (nodeEnv === 'production') {
        logger.error(
            'AUTH_BYPASS_MFA=true ignorado: NODE_ENV=production. Na VPS use AUTH_BYPASS_MFA=false.',
        );
        return false;
    }

    const frontendUrls = config.get<string>('FRONTEND_URLS') || '';
    const looksLocal =
        frontendUrls.includes('localhost') || frontendUrls.includes('127.0.0.1');
    if (!looksLocal) {
        logger.warn(
            'AUTH_BYPASS_MFA=true ignorado: FRONTEND_URLS não contém localhost/127.0.0.1.',
        );
        return false;
    }

    return true;
}
