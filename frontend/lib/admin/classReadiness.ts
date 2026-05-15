/**
 * Fluxo Upgrade (resumo para admins):
 *
 * - A página pública de cursos e as inscrições mostram turmas com status “Matrículas abertas”.
 *   Isso não exige que a turma esteja ligada a um período de curso.
 * - O vínculo turma ↔ período de curso serve para operação e relatórios; o status da turma
 *   e o status do período são campos independentes (não mudam um ao outro sozinhos).
 *
 * Datas de matrícula na turma (`enrollmentOpenDate` / `enrollmentCloseDate`) são distintas
 * das datas de execução no período (`dataInicio` / `dataFim`). Se existir período ligado com
 * início e fim preenchidos, não mostramos aviso de “datas de matrícula em falta” só por
 * esses campos da turma estarem vazios (evita falso positivo; unificação total de dados fica
 * para uma fase posterior).
 *
 * Estes avisos são só lembretes na interface — não impedem guardar o novo status da turma.
 */

import type { Class } from '@/lib/api/classes';

export type ClassReadinessSeverity = 'info' | 'warning';

export interface ClassReadinessWarning {
    code: string;
    severity: ClassReadinessSeverity;
    message: string;
}

type ClassWithRelations = Class & {
    enrollments?: Array<{ status?: string }>;
    _count?: { enrollments?: number };
};

/** Algum período de curso ligado traz calendário de execução (início e fim). */
function linkedAcaoHasExecutionWindow(acaoLinks: ClassWithRelations['acaoTurmas']): boolean {
    if (!Array.isArray(acaoLinks) || acaoLinks.length === 0) return false;
    return acaoLinks.some((row) => {
        const a = row?.acao;
        const d1 = a?.dataInicio;
        const d2 = a?.dataFim;
        return Boolean(d1 && d2);
    });
}

/** Vagas efectivamente ocupadas por matrículas já aprovadas ou matriculadas. */
function countEnrolledOrApproved(cls: ClassWithRelations): number {
    if (Array.isArray(cls.enrollments) && cls.enrollments.length > 0) {
        return cls.enrollments.filter((e) => ['ENROLLED', 'APPROVED'].includes(e.status ?? '')).length;
    }
    return 0;
}

/**
 * Avisos sobre o estado pretendido (`intendedStatus`) após confirmar a alteração,
 * com base nos dados actuais da turma (ficha completa ao abrir o modal ou o módulo).
 */
export function computeClassReadinessWarnings(
    cls: ClassWithRelations,
    intendedStatus: string,
): ClassReadinessWarning[] {
    const warnings: ClassReadinessWarning[] = [];
    const acaoLinks = cls.acaoTurmas ?? [];
    const filledSlots = countEnrolledOrApproved(cls);

    if (intendedStatus === 'ENROLLMENT_OPEN') {
        if (acaoLinks.length === 0) {
            warnings.push({
                code: 'open_no_acao',
                severity: 'warning',
                message:
                    'Esta turma ainda não está ligada a nenhum período de curso. As inscrições na internet funcionam pelo status da turma, mas viagens, custos e relatórios ficam incompletos sem esse vínculo. Use a aba “Período de curso” no módulo da turma ou a área Períodos de curso.',
            });
        }
        if (cls.vacancies <= filledSlots) {
            warnings.push({
                code: 'open_no_vacancies',
                severity: 'warning',
                message: `Não há vagas livres para novas matrículas (${filledSlots} aluno(s) já contabilizado(s) nas ${cls.vacancies} vagas). Ajuste o número de vagas ou feche as matrículas.`,
            });
        }
        const enrollmentWindowMissing = !cls.enrollmentOpenDate || !cls.enrollmentCloseDate;
        if (enrollmentWindowMissing && !linkedAcaoHasExecutionWindow(acaoLinks)) {
            warnings.push({
                code: 'open_dates_missing',
                severity: 'info',
                message:
                    'As datas de abertura e fechamento das matrículas na ficha da turma (Editar turma) e o calendário no período de curso ligado ainda não estão definidos de forma completa. Preencha as datas na turma ou ligue a um período com início e fim; as inscrições na internet seguem o status “Matrículas abertas”.',
            });
        }
    }

    if (intendedStatus === 'IN_PROGRESS') {
        for (const row of acaoLinks) {
            const ast = row.acao?.status;
            if (ast === 'PLANEJADA') {
                warnings.push({
                    code: 'in_progress_acao_planejada',
                    severity: 'warning',
                    message: `O período de curso "${row.acao?.nome ?? '—'}" ainda está “Planejada” — confira se o calendário operacional está alinhado com a turma em andamento.`,
                });
                break;
            }
        }
    }

    return warnings;
}
