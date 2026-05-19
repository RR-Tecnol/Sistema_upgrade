export function resolvePagination(
    page?: number | string,
    limit?: number | string,
    defaultLimit = 12,
    maxLimit = 100,
) {
    const pageNum = Math.max(1, parseInt(String(page ?? 1), 10) || 1);
    const limitNum = Math.min(maxLimit, Math.max(1, parseInt(String(limit ?? defaultLimit), 10) || defaultLimit));
    const skip = (pageNum - 1) * limitNum;
    const totalPages = (total: number) => Math.max(1, Math.ceil(total / limitNum));
    return { page: pageNum, limit: limitNum, skip, totalPages };
}

export function paginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
) {
    return {
        data,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
    };
}
