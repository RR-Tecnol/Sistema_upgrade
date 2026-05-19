/** Contrato padrão de listagens paginadas no admin. */
export type PaginatedMeta = {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

export type PaginatedResponse<T> = PaginatedMeta & {
    data: T[];
};

export const ADMIN_PAGE_SIZE_CARDS = 12;
export const ADMIN_PAGE_SIZE_TABLE = 20;

/** Extrai só o array — útil em selects e wizards que precisam de “todos” (com limite alto). */
export function unwrapListData<T>(raw: unknown, fallbackLimit = ADMIN_PAGE_SIZE_CARDS): T[] {
    return normalizePaginated<T>(raw, fallbackLimit).data;
}

export function normalizePaginated<T>(
    raw: unknown,
    fallbackLimit = ADMIN_PAGE_SIZE_CARDS,
): PaginatedResponse<T> {
    if (raw && typeof raw === 'object' && Array.isArray((raw as PaginatedResponse<T>).data)) {
        const r = raw as PaginatedResponse<T>;
        return {
            data: r.data,
            total: r.total ?? r.data.length,
            page: r.page ?? 1,
            limit: r.limit ?? fallbackLimit,
            totalPages: r.totalPages ?? 1,
        };
    }
    const arr = Array.isArray(raw) ? (raw as T[]) : [];
    return {
        data: arr,
        total: arr.length,
        page: 1,
        limit: fallbackLimit,
        totalPages: 1,
    };
}

export function buildPaginationParams(
    page: number,
    limit: number,
    extra?: Record<string, string | number | boolean | undefined>,
): Record<string, string> {
    const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
    };
    if (extra) {
        for (const [k, v] of Object.entries(extra)) {
            if (v !== undefined && v !== '') params[k] = String(v);
        }
    }
    return params;
}
