/**
 * LOCALHOST — espelha `AUTH_BYPASS_MFA` do backend para UI (banner, texto do login).
 * VPS: `NEXT_PUBLIC_DEV_AUTH_BYPASS` ausente ou false no build de produção.
 */
export const isDevAuthBypassUi =
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';
