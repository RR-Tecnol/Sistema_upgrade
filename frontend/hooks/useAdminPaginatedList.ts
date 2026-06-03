'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PaginatedMeta, PaginatedResponse } from '@/lib/api/pagination';
import { normalizePaginated } from '@/lib/api/pagination';

export type UseAdminPaginatedListOptions<T> = {
    fetchPage: (page: number, limit: number) => Promise<PaginatedResponse<T> | T[]>;
    limit?: number;
    /** Chave estável — mudança reseta para página 1 e recarrega */
    deps?: unknown[];
    enabled?: boolean;
};

export function useAdminPaginatedList<T>({
    fetchPage,
    limit = 12,
    deps = [],
    enabled = true,
}: UseAdminPaginatedListOptions<T>) {
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<T[]>([]);
    const [meta, setMeta] = useState<PaginatedMeta>({
        total: 0,
        page: 1,
        limit,
        totalPages: 1,
    });
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        if (!enabled) return;
        setLoading(true);
        try {
            const raw = await fetchPage(page, limit);
            const norm = normalizePaginated<T>(raw, limit);
            setItems(norm.data);
            setMeta({
                total: norm.total,
                page: norm.page,
                limit: norm.limit,
                totalPages: norm.totalPages,
            });
        } catch {
            setItems([]);
            setMeta({ total: 0, page: 1, limit, totalPages: 1 });
        } finally {
            setLoading(false);
        }
    }, [enabled, fetchPage, page, limit]);

    useEffect(() => {
        setPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    useEffect(() => {
        load();
    }, [load]);

    return {
        items,
        loading,
        page,
        setPage,
        total: meta.total,
        totalPages: meta.totalPages,
        limit: meta.limit,
        reload: load,
    };
}
