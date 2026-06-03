'use client';

export type AdminListPaginationProps = {
    page: number;
    totalPages: number;
    total: number;
    loading?: boolean;
    onPageChange: (page: number) => void;
    /** Ex.: "disponível(is)", "funcionário(s)", "conta(s)" */
    itemLabel?: string;
    className?: string;
    style?: React.CSSProperties;
};

/**
 * Footer padrão do admin (Período de curso → Equipe): contador + Anterior/Próximo.
 */
export function AdminListPagination({
    page,
    totalPages,
    total,
    loading = false,
    onPageChange,
    itemLabel = 'registro(s)',
    className,
    style,
}: AdminListPaginationProps) {
    if (total <= 0) return null;

    const showNav = totalPages > 1;

    return (
        <div
            className={className}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontSize: '0.78rem',
                color: '#6B7280',
                ...style,
            }}
        >
            <span style={{ textAlign: 'center' }}>
                {total} {itemLabel}
                {showNav ? ` — página ${page} de ${totalPages}` : ''}
            </span>
            {showNav && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                        type="button"
                        className="btn-secondary"
                        disabled={page <= 1 || loading}
                        onClick={() => onPageChange(Math.max(1, page - 1))}
                    >
                        Anterior
                    </button>
                    <button
                        type="button"
                        className="btn-secondary"
                        disabled={page >= totalPages || loading}
                        onClick={() => onPageChange(page + 1)}
                    >
                        Próximo
                    </button>
                </div>
            )}
        </div>
    );
}
