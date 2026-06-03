export type TemplateScope = 'GLOBAL' | 'COURSE' | 'STATE' | 'COURSE_STATE' | 'PUBLIC_FILE';
export type TemplateVersionStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';

export type TemplateBadgeInfo = {
    label: string;
    background: string;
    color: string;
    border: string;
} | null;

export function getTemplateBadge(
    scope: TemplateScope,
    status: TemplateVersionStatus | undefined,
    courseId?: string | null,
): TemplateBadgeInfo {
    if (!status) return null;

    if (status === 'PUBLISHED' && scope === 'STATE') {
        return {
            label: 'Mestre UF',
            background: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE',
        };
    }

    if (
        status === 'PUBLISHED'
        && (scope === 'COURSE' || scope === 'COURSE_STATE')
        && courseId
    ) {
        return {
            label: 'Oficial na emissão',
            background: '#ECFDF5',
            color: '#047857',
            border: '1px solid #A7F3D0',
        };
    }

    if (status === 'DRAFT' || status === 'PENDING_APPROVAL') {
        return {
            label: status === 'PENDING_APPROVAL' ? 'Aguardando aprovação' : 'Rascunho',
            background: '#F3F4F6',
            color: '#4B5563',
            border: '1px solid #E5E7EB',
        };
    }

    if (status === 'APPROVED') {
        return {
            label: 'Aprovado (não publicado)',
            background: '#FFFBEB',
            color: '#92400E',
            border: '1px solid #FDE68A',
        };
    }

    return null;
}
