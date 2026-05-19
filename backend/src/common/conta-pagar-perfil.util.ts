import { UserRole } from '@prisma/client';

/** Slugs estáveis para UI / filtros (BUG-14). */
export type OrigemPerfilCode =
    | 'MOTORISTA'
    | 'PROFESSOR'
    | 'COORDENADOR'
    | 'ADMIN'
    | 'FINANCEIRO'
    | 'ALUNO'
    | 'FUNCIONARIO'
    | 'OUTRO';

const USER_ROLE_MAP: Partial<Record<UserRole, OrigemPerfilCode>> = {
    DRIVER: 'MOTORISTA',
    TEACHER: 'PROFESSOR',
    COORDINATOR: 'COORDENADOR',
    ADMIN: 'ADMIN',
    FINANCIAL: 'FINANCEIRO',
    STUDENT: 'ALUNO',
    IT_ADMIN: 'ADMIN',
};

const EMPLOYEE_ROLE_MAP: Record<string, OrigemPerfilCode> = {
    DRIVER: 'MOTORISTA',
    INSTRUCTOR: 'PROFESSOR',
    COORDINATOR: 'COORDENADOR',
    NURSE: 'FUNCIONARIO',
    TECHNICIAN: 'FUNCIONARIO',
    ADMINISTRATIVE: 'ADMIN',
    OTHER: 'FUNCIONARIO',
};

const LABELS: Record<OrigemPerfilCode, string> = {
    MOTORISTA: 'Motorista',
    PROFESSOR: 'Professor',
    COORDENADOR: 'Coordenador',
    ADMIN: 'Administrador',
    FINANCEIRO: 'Financeiro',
    ALUNO: 'Aluno',
    FUNCIONARIO: 'Funcionário',
    OUTRO: 'Outro',
};

export function origemPerfilLabel(code: OrigemPerfilCode): string {
    return LABELS[code] ?? LABELS.OUTRO;
}

export function mapUserRoleToOrigemPerfil(role?: string | null): OrigemPerfilCode | null {
    if (!role) return null;
    return USER_ROLE_MAP[role as UserRole] ?? null;
}

export function mapEmployeeRoleToOrigemPerfil(role?: string | null): OrigemPerfilCode | null {
    if (!role) return null;
    return EMPLOYEE_ROLE_MAP[role.toUpperCase()] ?? null;
}

/** Lê `perfil=DRIVER` ou `perfil=INSTRUCTOR` das observações (reembolso aprovado). */
export function parsePerfilFromObservacoes(observacoes?: string | null): OrigemPerfilCode | null {
    if (!observacoes) return null;
    const m = observacoes.match(/perfil\s*=\s*([^|]+)/i);
    if (!m) return null;
    const raw = m[1].trim();
    return (
        mapUserRoleToOrigemPerfil(raw) ||
        mapEmployeeRoleToOrigemPerfil(raw) ||
        (LABELS[raw as OrigemPerfilCode] ? (raw as OrigemPerfilCode) : null)
    );
}

export function resolveOrigemPerfilForConta(conta: {
    tipo_conta: string;
    observacoes?: string | null;
    descricao?: string | null;
    stockPurchaseRequest?: { requester?: { role?: string } | null } | null;
}): { code: OrigemPerfilCode; label: string } {
    const fromStock = mapUserRoleToOrigemPerfil(conta.stockPurchaseRequest?.requester?.role);
    if (fromStock) {
        return { code: fromStock, label: origemPerfilLabel(fromStock) };
    }

    const fromObs = parsePerfilFromObservacoes(conta.observacoes);
    if (fromObs) {
        return { code: fromObs, label: origemPerfilLabel(fromObs) };
    }

    if (conta.tipo_conta === 'diaria_funcionario') {
        return { code: 'FUNCIONARIO', label: 'Diária de funcionário' };
    }

    if (conta.tipo_conta === 'funcionario' || /reembolso/i.test(conta.observacoes || '')) {
        return { code: 'FUNCIONARIO', label: 'Reembolso' };
    }

    return { code: 'OUTRO', label: origemPerfilLabel('OUTRO') };
}
