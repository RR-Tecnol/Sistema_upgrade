/**
 * Perfis com conta interna (não aluno) que seguem MFA no login:
 * OTP por e-mail (se activo) + Authenticator quando aplicável.
 */
export const STAFF_MFA_ROLES = ['IT_ADMIN', 'ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER', 'DRIVER'] as const;

export function isStaffMfaRole(role: string): boolean {
    return (STAFF_MFA_ROLES as readonly string[]).includes(role);
}

/** Novo utilizador com password: forçar configuração do Authenticator no primeiro login. */
export function staffRoleRequiresTotpSetupOnCreate(userRole: string): boolean {
    return isStaffMfaRole(userRole);
}
