'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { normalizeEstoqueHubTab, parseEstoqueHubPrStatus, type EstoqueHubTab } from '@/lib/estoque-hub-tabs';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { KpiRowGsr } from '@/components/estoque/gsr/KpiRowGsr';
import { ListaInsumosGsr, type ListaInsumosRow } from '@/components/estoque/gsr/ListaInsumosGsr';
import { SolicitacoesEstoquePanel } from '@/components/estoque/gsr/SolicitacoesEstoquePanel';
import { MovimentacoesRecentesPanel } from '@/components/estoque/gsr/MovimentacoesRecentesPanel';
import { MovimentacaoModal } from '@/components/estoque/MovimentacaoModal';
import { NovoInsumoModal } from '@/components/estoque/NovoInsumoModal';
import { EditarInsumoModal } from '@/components/estoque/EditarInsumoModal';
import { StockItemAuditModal } from '@/components/estoque/gsr/StockItemAuditModal';
import { EstoqueCaminhaoModal } from '@/components/estoque/EstoqueCaminhaoModal';
import { FinancialDashboardPanel } from '@/components/estoque/gsr/FinancialDashboardPanel';
import { OrquestradorInsumoModal } from '@/components/estoque/OrquestradorInsumoModal';
import { SolicitarCompraModal } from '@/components/estoque/SolicitarCompraModal';
import {
    stockApi,
    StockDashboard,
    StockItem,
    StockItemCategory,
    StockCategory,
    TruckStockItem,
    getStockStatus,
    getGlobalStockQuantity,
    daysUntilExpiry,
    defaultStockCategories,
} from '@/lib/api/stock';
import { trucksApi, Truck } from '@/lib/api/trucks';
import { toast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { exportEstoqueXlsx, exportEstoquePdfGeral, exportEstoquePdfCaminhao, exportEstoquePdfTodosCaminhoes } from '@/lib/exports/estoqueExport';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import { normalizePaginated, unwrapListData, ADMIN_PAGE_SIZE_TABLE } from '@/lib/api/pagination';

const TAB_META: { id: EstoqueHubTab; label: string; icon: string }[] = [
    { id: 'solicitacoes', label: 'Solicitações', icon: '🛒' },
    { id: 'central', label: 'Estoque Central', icon: '📦' },
    { id: 'caminhao', label: 'Estoque por Caminhão', icon: '🚛' },
    { id: 'movimentacoes', label: 'Movimentações', icon: '↕' },
    { id: 'financeiro', label: 'Visão Financeira', icon: '💰' },
    
];



function EstoqueHubInner() {
    const router = useRouter();
    const sp = useSearchParams();

    const tab = normalizeEstoqueHubTab(sp.get('tab'));
    const truckIdParam = sp.get('truckId') || '';
    const highlight = sp.get('highlight') || '';
    const audit = sp.get('audit') === '1';
    const auditAction = sp.get('action') || undefined;
    const prStatusFromUrl = parseEstoqueHubPrStatus(sp.get('status'));
    const prCategoriaFromUrl = (sp.get('categoria') || '') as StockItemCategory | '';

    const hubCentralFiltersKey = useRef('');

    const setQuery = useCallback(
        (next: Record<string, string | undefined>) => {
            const q = new URLSearchParams(sp.toString());
            Object.entries(next).forEach(([k, v]) => {
                if (v === undefined || v === '') q.delete(k);
                else q.set(k, v);
            });
            const s = q.toString();
            router.replace(s ? `/admin/estoque?${s}` : '/admin/estoque');
        },
        [router, sp],
    );

    const [userRole, setUserRole] = useState('');
    const [dash, setDash] = useState<StockDashboard | null>(null);
    const [financialDash, setFinancialDash] = useState<any | null>(null);
    const [items, setItems] = useState<StockItem[]>([]);
    const [itemsPage, setItemsPage] = useState(1);
    const [itemsTotal, setItemsTotal] = useState(0);
    const [itemsTotalPages, setItemsTotalPages] = useState(1);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [selectedTruckId, setSelectedTruckId] = useState(truckIdParam);
    const [truckRows, setTruckRows] = useState<ListaInsumosRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingTruck, setLoadingTruck] = useState(false);
    const [solicitacoesRefreshKey, setSolicitacoesRefreshKey] = useState(0);

    const [search, setSearch] = useState('');
    const [categoria, setCategoria] = useState<string>('all');
    const [statusF, setStatusF] = useState<'all' | 'CRITICO' | 'BAIXO' | 'OK' | 'SEM_MINIMO'>('all');
    const [vencF, setVencF] = useState<'all' | '30' | 'expired'>('all');

    const [allCategories, setAllCategories] = useState<StockCategory[]>(() => defaultStockCategories());
    useEffect(() => {
        stockApi.categories.list()
            .then(setAllCategories)
            .catch(() => { /* mantém as categorias default já carregadas */ });
    }, []);

    const CATEGORIAS_OPTIONS = useMemo(() => {
        const opts: { value: string; label: string }[] = [{ value: 'all', label: 'Todas as categorias' }];
        allCategories.forEach(c => {
            opts.push({ value: c.defaultEnum ?? c.id, label: c.nome });
        });
        return opts;
    }, [allCategories]);

    useEffect(() => {
        if (tab !== 'central') return;
        const key = `${sp.get('onlyLow')}|${sp.get('onlyExpiring')}`;
        if (hubCentralFiltersKey.current === key) return;
        hubCentralFiltersKey.current = key;
        if (sp.get('onlyLow') === 'true') setStatusF('BAIXO');
        if (sp.get('onlyExpiring') === 'true') setVencF('30');
    }, [tab, sp]);

    const [movOpen, setMovOpen] = useState(false);
    const [movItemId, setMovItemId] = useState<string | undefined>();
    const [movTruckId, setMovTruckId] = useState<string | undefined>();

    const [auditOpen, setAuditOpen] = useState(false);
    const [auditItemId, setAuditItemId] = useState<string | null>(null);
    const [auditNome, setAuditNome] = useState('');

    const [deleteItem, setDeleteItem] = useState<StockItem | null>(null);

    const [orquestradorOpen, setOrquestradorOpen] = useState(false);
    const [novoOpen, setNovoOpen] = useState(false);
    const [solicitarItem, setSolicitarItem] = useState<StockItem | null>(null);
    const [editItemId, setEditItemId] = useState<string | null>(null);

    const [truckModalOpen, setTruckModalOpen] = useState(false);
    const [truckModalId, setTruckModalId] = useState<string | undefined>();
    const [truckModalName, setTruckModalName] = useState<string | undefined>();

    useEffect(() => {
        const u = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (u) {
            try {
                setUserRole(JSON.parse(u).role || '');
            } catch {
                setUserRole('');
            }
        }
    }, []);

    useEffect(() => {
        setSelectedTruckId(truckIdParam);
    }, [truckIdParam]);

    const loadDashboard = useCallback(async () => {
        try {
            const [d, f] = await Promise.all([
                stockApi.dashboard(),
                stockApi.financialDashboard(),
            ]);
            setDash(d);
            setFinancialDash(f);
        } catch {
            setDash(null);
            setFinancialDash(null);
        }
    }, []);

    const loadItems = useCallback(async () => {
        try {
            const isCustom = categoria !== 'all' && categoria.includes('-'); // IDs customizados usam UUID (tem '-')
            const raw = await stockApi.items.getAll({
                search: search.trim() || undefined,
                categoria: categoria === 'all' || isCustom ? undefined : (categoria as StockItemCategory),
                customCategoryId: isCustom ? categoria : undefined,
                page: itemsPage,
                limit: ADMIN_PAGE_SIZE_TABLE,
            });
            const norm = normalizePaginated<StockItem>(raw, ADMIN_PAGE_SIZE_TABLE);
            setItems(norm.data);
            setItemsTotal(norm.total);
            setItemsTotalPages(norm.totalPages);
        } catch (e) {
            console.error(e);
            toast.error('Erro ao carregar itens');
        }
    }, [search, categoria, itemsPage]);

    useEffect(() => { setItemsPage(1); }, [search, categoria, statusF, vencF]);

    const loadTrucks = useCallback(async () => {
        try {
            const t = await trucksApi.getAll({ limit: 500, page: 1 });
            setTrucks(unwrapListData<Truck>(t));
        } catch {
            setTrucks([]);
        }
    }, []);

    const loadTruckStock = useCallback(async (tid: string) => {
        if (!tid) {
            setTruckRows([]);
            return;
        }
        setLoadingTruck(true);
        try {
            const data = await stockApi.trucks.getStock(tid);
            const mapped: ListaInsumosRow[] = (data.stocks || [])
                .map((ts: TruckStockItem) => {
                    const it = ts.stockItem;
                    if (!it) return null;
                    const merged = { ...it, quantidadeAtual: ts.quantidadeAtual as any } as StockItem;
                    return { item: merged, quantidadeExibida: Number(ts.quantidadeAtual) };
                })
                .filter(Boolean) as ListaInsumosRow[];
            setTruckRows(mapped);
        } catch (e) {
            console.error(e);
            toast.error('Erro ao carregar estoque da carreta');
        } finally {
            setLoadingTruck(false);
        }
    }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await Promise.all([loadDashboard(), loadItems(), loadTrucks()]);
            setLoading(false);
        })();
    }, [loadDashboard, loadItems, loadTrucks]);

    useEffect(() => {
        if (tab !== 'caminhao') return;
        const tid = selectedTruckId || trucks[0]?.id;
        if (tid) loadTruckStock(tid);
    }, [tab, selectedTruckId, trucks, loadTruckStock]);

    const centralRows: ListaInsumosRow[] = useMemo(() => {
        return items
            .filter((it) => {
                const st = getStockStatus(it);
                if (statusF !== 'all' && st !== statusF) return false;
                if (vencF === 'all') return true;
                const d = daysUntilExpiry(it);
                if (vencF === '30') return d !== null && d >= 0 && d <= 30;
                if (vencF === 'expired') return d !== null && d < 0;
                return true;
            })
            .map((it) => ({
                item: it,
                // Quantidade Central = apenas o que está no depósito central (item.quantidadeAtual)
                // Status e mínimo continuam usando getGlobalStockQuantity (central + carretas) via getStockStatus
                quantidadeExibida: Number(it.quantidadeAtual),
            }));
    }, [items, statusF, vencF]);

    const [exportingXlsx, setExportingXlsx] = useState(false);
    const [exportingPdfGeral, setExportingPdfGeral] = useState(false);
    const [exportingPdfCaminhao, setExportingPdfCaminhao] = useState(false);

    const handleExportXlsx = useCallback(async () => {
        setExportingXlsx(true);
        try {
            const movData = await stockApi.movements.list({ limit: 1000 });
            const movRows = Array.isArray(movData) ? movData : [];
            const rows = items.map(it => ({
                ...it,
                quantidadeAtual: Number(it.quantidadeAtual),
                quantidadeMinima: Number(it.quantidadeMinima),
                precoUnitario: it.precoUnitario ? Number(it.precoUnitario) : 0,
                status: getStockStatus(it),
            }));
            await exportEstoqueXlsx(rows, Array.isArray(movRows) ? movRows : []);
            toast.success('XLSX gerado com sucesso!');
        } catch (e) {
            console.error(e);
            toast.error('Erro ao gerar XLSX');
        } finally {
            setExportingXlsx(false);
        }
    }, [items]);

    const handleExportPdfGeral = useCallback(() => {
        setExportingPdfGeral(true);
        try {
            const rows = items.map(it => ({
                ...it,
                quantidadeAtual: Number(it.quantidadeAtual),
                quantidadeMinima: Number(it.quantidadeMinima),
                precoUnitario: it.precoUnitario ? Number(it.precoUnitario) : 0,
                status: getStockStatus(it),
            }));
            exportEstoquePdfGeral(rows, financialDash);
            toast.success('PDF aberto para impressão!');
        } catch (e) {
            console.error(e);
            toast.error('Erro ao gerar PDF');
        } finally {
            setExportingPdfGeral(false);
        }
    }, [items, financialDash]);

    const [pdfCaminhaoMenu, setPdfCaminhaoMenu] = useState(false);

    const handleExportPdfUmCaminhao = useCallback(async (truckId: string, truckIdentifier: string) => {
        setPdfCaminhaoMenu(false);
        setExportingPdfCaminhao(true);
        try {
            const data = await stockApi.trucks.getStock(truckId);
            const stocks = (data.stocks || []).map((ts: any) => ({
                stockItem: ts.stockItem ? {
                    nome: ts.stockItem.nome,
                    unidade: ts.stockItem.unidade,
                    categoria: ts.stockItem.categoria,
                    precoUnitario: ts.stockItem.precoUnitario ? Number(ts.stockItem.precoUnitario) : 0,
                } : null,
                quantidadeAtual: Number(ts.quantidadeAtual),
            }));
            exportEstoquePdfCaminhao(truckIdentifier, stocks);
            toast.success(`PDF da carreta ${truckIdentifier} aberto!`);
        } catch (e) {
            console.error(e);
            toast.error('Erro ao gerar PDF da carreta');
        } finally {
            setExportingPdfCaminhao(false);
        }
    }, []);

    const handleExportPdfTodosCaminhoes = useCallback(async () => {
        setPdfCaminhaoMenu(false);
        setExportingPdfCaminhao(true);
        try {
            if (trucks.length === 0) { toast.error('Nenhuma carreta encontrada'); setExportingPdfCaminhao(false); return; }
            // Buscar estoque de cada carreta em paralelo
            const allTruckStocks = await Promise.all(
                trucks.map(async (t) => {
                    try {
                        const data = await stockApi.trucks.getStock(t.id);
                        const stocks = (data.stocks || []).map((ts: any) => ({
                            stockItem: ts.stockItem ? {
                                nome: ts.stockItem.nome,
                                unidade: ts.stockItem.unidade,
                                categoria: ts.stockItem.categoria,
                                precoUnitario: ts.stockItem.precoUnitario ? Number(ts.stockItem.precoUnitario) : 0,
                            } : null,
                            quantidadeAtual: Number(ts.quantidadeAtual),
                        }));
                        return { identifier: t.identifier, stocks };
                    } catch {
                        return { identifier: t.identifier, stocks: [] };
                    }
                })
            );
            exportEstoquePdfTodosCaminhoes(allTruckStocks);
            toast.success('PDF consolidado de todas as carretas aberto!');
        } catch (e) {
            console.error(e);
            toast.error('Erro ao gerar PDF de todas as carretas');
        } finally {
            setExportingPdfCaminhao(false);
        }
    }, [trucks]);



    const changeTab = (t: EstoqueHubTab) => {
        const tid = t === 'caminhao' ? selectedTruckId || trucks[0]?.id || '' : '';
        if (t === 'caminhao' && tid && !selectedTruckId) setSelectedTruckId(tid);
        const q = new URLSearchParams(sp.toString());
        if (t === 'central') q.delete('tab');
        else q.set('tab', t);
        if (t === 'caminhao' && tid) q.set('truckId', tid);
        else q.delete('truckId');
        if (t !== 'movimentacoes') {
            q.delete('audit');
            q.delete('action');
        }
        const s = q.toString();
        router.replace(s ? `/admin/estoque?${s}` : '/admin/estoque');
    };

    /* ── Upgrade select style ── */
    const selectStyle: React.CSSProperties = {
        width: '100%',
        marginTop: 4,
        padding: '9px 12px',
        borderRadius: 10,
        border: '1.5px solid #E2E8F0',
        background: '#FFFFFF',
        fontSize: '0.82rem',
        color: '#0F172A',
        fontWeight: 600,
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        appearance: 'auto' as const,
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '0.62rem',
        fontWeight: 800,
        color: '#B89B00',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">

            {/* ── HERO HEADER ── */}
            <AdminHeaderHero
                title="CONTROLE DE ESTOQUE"
                subtitle="Gestão completa de insumos e movimentações"
                rightSlot={
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => setOrquestradorOpen(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 20px',
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #FFD600 0%, #E5B800 100%)',
                                color: '#0F172A',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(255,214,0,0.35)',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                fontFamily: 'Orbitron, sans-serif',
                                letterSpacing: '0.04em',
                            }}
                        >
                            + NOVO INSUMO
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMovItemId(undefined);
                                setMovTruckId(undefined);
                                setMovOpen(true);
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 20px',
                                borderRadius: 10,
                                border: '2px solid rgba(255,214,0,0.5)',
                                background: 'rgba(255,214,0,0.12)',
                                color: '#FFD600',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                fontFamily: 'Orbitron, sans-serif',
                                letterSpacing: '0.04em',
                                transition: 'background 0.15s',
                            }}
                        >
                            ↕ MOVIMENTAÇÃO
                        </button>
                    </div>
                }
            />

            {/* ── KPI CARDS ── */}
            <KpiRowGsr dash={dash} />

            {/* ── TABS ── */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #E2E8F0', flexWrap: 'wrap' }}>
                {TAB_META.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => changeTab(t.id)}
                        style={{
                            padding: '12px 20px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            color: tab === t.id ? '#B89B00' : '#64748B',
                            borderBottom: tab === t.id ? '3px solid #B89B00' : '3px solid transparent',
                            marginBottom: -2,
                            fontFamily: tab === t.id ? 'Orbitron, sans-serif' : 'inherit',
                            letterSpacing: tab === t.id ? '0.04em' : 'normal',
                            transition: 'color 0.2s, border-color 0.2s',
                        }}
                    >
                        <span style={{ marginRight: 6 }}>{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── TAB CONTENT: SOLICITAÇÕES ── */}
            {tab === 'solicitacoes' && (
                <SolicitacoesEstoquePanel
                    highlightPrId={highlight || undefined}
                    initialStatusTab={prStatusFromUrl}
                    initialCategoria={prCategoriaFromUrl || undefined}
                    onStockUpdated={() => { loadItems(); loadDashboard(); }}
                    refreshKey={solicitacoesRefreshKey}
                />
            )}

            {/* ── TAB CONTENT: CENTRAL ── */}
            {tab === 'central' && (
                <>
                    {/* ── FILTROS PREMIUM ── */}
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 12,
                            alignItems: 'flex-end',
                            padding: '16px 18px',
                            background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFDF5 50%, #F8FAFC 100%)',
                            borderRadius: 14,
                            border: '1.5px solid #E5D88A55',
                            boxShadow: '0 2px 12px rgba(184,155,0,0.06)',
                        }}
                    >
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={labelStyle}>🔍 Buscar insumo</label>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onBlur={() => loadItems()}
                                onKeyDown={(e) => e.key === 'Enter' && loadItems()}
                                placeholder="Nome ou código..."
                                style={{
                                    ...selectStyle,
                                    background: '#FFFFFF',
                                }}
                            />
                        </div>
                        <div style={{ minWidth: 155 }}>
                            <label style={labelStyle}>📂 Categoria</label>
                            <select
                                value={categoria}
                                onChange={(e) => {
                                    setCategoria(e.target.value);
                                    setTimeout(loadItems, 0);
                                }}
                                style={selectStyle}
                            >
                                {CATEGORIAS_OPTIONS.map((c) => (
                                    <option key={c.value} value={c.value}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ minWidth: 135 }}>
                            <label style={labelStyle}>📊 Status</label>
                            <select
                                value={statusF}
                                onChange={(e) => setStatusF(e.target.value as any)}
                                style={selectStyle}
                            >
                                <option value="all">Todos</option>
                                <option value="CRITICO">🚨 Crítico</option>
                                <option value="BAIXO">⚠️ Baixo</option>
                                <option value="OK">✅ OK</option>
                                <option value="SEM_MINIMO">Sem mínimo</option>
                            </select>
                        </div>
                        <div style={{ minWidth: 145 }}>
                            <label style={labelStyle}>📅 Vencimento</label>
                            <select
                                value={vencF}
                                onChange={(e) => setVencF(e.target.value as any)}
                                style={selectStyle}
                            >
                                <option value="all">Todos</option>
                                <option value="30">⏰ Próximos 30 dias</option>
                                <option value="expired">❌ Vencidos</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                            <button
                                type="button"
                                onClick={handleExportXlsx}
                                disabled={exportingXlsx || items.length === 0}
                                title="Exportar estoque e movimentações para XLSX"
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: 10,
                                    border: '1.5px solid #BBF7D0',
                                    background: exportingXlsx ? '#F0FDF4' : '#ECFDF5',
                                    color: items.length === 0 ? '#94A3B8' : '#059669',
                                    fontWeight: 800,
                                    fontSize: '0.7rem',
                                    cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                                    letterSpacing: '0.05em',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {exportingXlsx ? '⏳ Gerando...' : '📊 XLSX'}
                            </button>
                            <button
                                type="button"
                                onClick={handleExportPdfGeral}
                                disabled={exportingPdfGeral || items.length === 0}
                                title="Gerar PDF geral do estoque central"
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: 10,
                                    border: '1.5px solid #BFDBFE',
                                    background: exportingPdfGeral ? '#EFF6FF' : '#EFF6FF',
                                    color: items.length === 0 ? '#94A3B8' : '#2563EB',
                                    fontWeight: 800,
                                    fontSize: '0.7rem',
                                    cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                                    letterSpacing: '0.05em',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {exportingPdfGeral ? '⏳ Gerando...' : '📄 PDF Geral'}
                            </button>
                            <div style={{ position: 'relative' }}>
                            <button
                                type="button"
                                onClick={() => setPdfCaminhaoMenu(v => !v)}
                                disabled={exportingPdfCaminhao || trucks.length === 0}
                                title="Gerar PDF de carreta(s)"
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: 10,
                                    border: '1.5px solid #FDE68A',
                                    background: '#FFFBEB',
                                    color: trucks.length === 0 ? '#94A3B8' : '#D97706',
                                    fontWeight: 800,
                                    fontSize: '0.7rem',
                                    cursor: trucks.length === 0 ? 'not-allowed' : 'pointer',
                                    letterSpacing: '0.05em',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                {exportingPdfCaminhao ? '⏳ Gerando...' : '🚛 PDF Caminhão'}
                                <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>▼</span>
                            </button>
                            {pdfCaminhaoMenu && (
                                <>
                                    <div
                                        style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                                        onClick={() => setPdfCaminhaoMenu(false)}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 'calc(100% + 6px)',
                                        zIndex: 50,
                                        background: '#fff',
                                        border: '1.5px solid #E2E8F0',
                                        borderRadius: 12,
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                        minWidth: 240,
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{ padding: '8px 14px', fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid #F1F5F9' }}>
                                            Escolher Carreta
                                        </div>
                                        {/* Lista de carretas individuais */}
                                        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                                        {trucks.map((t) => {
                                            const isSelected = (tab as string) === 'caminhao' && (t.id === selectedTruckId || (!selectedTruckId && trucks[0]?.id === t.id));
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => handleExportPdfUmCaminhao(t.id, t.identifier)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                        width: '100%', padding: '10px 16px',
                                                        background: isSelected ? '#FFFBEB' : 'none',
                                                        border: 'none', cursor: 'pointer',
                                                        textAlign: 'left', transition: 'background 0.15s',
                                                        borderLeft: isSelected ? '3px solid #F59E0B' : '3px solid transparent',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#FFF9C4')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = isSelected ? '#FFFBEB' : 'none')}
                                                >
                                                    <span style={{ fontSize: '1rem' }}>🚛</span>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0F172A' }}>{t.identifier}</div>
                                                        {isSelected && <div style={{ fontSize: '0.62rem', color: '#D97706', fontWeight: 700 }}>aba ativa</div>}
                                                    </div>
                                                    <span style={{ fontSize: '0.6rem', color: '#94A3B8' }}>PDF →</span>
                                                </button>
                                            );
                                        })}
                                        </div>
                                        <div style={{ height: 1, background: '#E2E8F0', margin: '4px 0' }} />
                                        {/* Opção: Todas */}
                                        <button
                                            type="button"
                                            onClick={handleExportPdfTodosCaminhoes}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                width: '100%', padding: '12px 16px',
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                textAlign: 'left', transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                        >
                                            <span style={{ fontSize: '1rem' }}>📋</span>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#2563EB' }}>Todas as Carretas</div>
                                                <div style={{ fontSize: '0.62rem', color: '#64748B' }}>Relatório consolidado – {trucks.length} carreta{trucks.length !== 1 ? 's' : ''}</div>
                                            </div>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        </div>
                    </div>

                    {/* ── TABLE HEADER ── */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: -4,
                        marginTop: 16,
                    }}>
                        <div style={{
                            fontFamily: 'Orbitron, sans-serif',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            letterSpacing: '0.12em',
                            color: '#B89B00',
                            textTransform: 'uppercase',
                        }}>
                            Lista de Insumos
                        </div>
                        <span style={{
                            padding: '3px 10px',
                            borderRadius: 20,
                            background: '#FFFDE7',
                            border: '1px solid #FEF08A',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#B89B00',
                        }}>
                            {centralRows.length} itens
                        </span>
                    </div>

                    <ListaInsumosGsr
                        variant="central"
                        rows={centralRows}
                        loading={loading}
                        userRole={userRole}
                        onMovement={({ item }) => {
                            setMovItemId(item.id);
                            setMovTruckId(undefined);
                            setMovOpen(true);
                        }}
                        onHistory={({ item }) => {
                            setAuditItemId(item.id);
                            setAuditNome(item.nome);
                            setAuditOpen(true);
                        }}
                        onDelete={({ item }) => setDeleteItem(item)}
                        onEdit={({ item }) => setEditItemId(item.id)}
                    />
                    <AdminListPagination
                        page={itemsPage}
                        totalPages={itemsTotalPages}
                        total={itemsTotal}
                        loading={loading}
                        onPageChange={setItemsPage}
                        itemLabel="item(ns)"
                        style={{ marginTop: 12 }}
                    />
                </>
            )}

            {/* ── TAB CONTENT: CAMINHÃO ── */}
            {tab === 'caminhao' && (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                    gap: 24, 
                    marginTop: 16,
                    paddingBottom: 24
                }}>
                    {trucks.length === 0 ? (
                        <div style={{ 
                            gridColumn: '1 / -1', 
                            textAlign: 'center', 
                            padding: '60px 20px', 
                            background: '#F8FAFC', 
                            borderRadius: 16,
                            border: '1px dashed #CBD5E1'
                        }}>
                            <div style={{ fontSize: '3rem', opacity: 0.5, marginBottom: 16 }}>🚛</div>
                            <p style={{ color: '#64748B', fontWeight: 600, margin: 0 }}>Nenhum caminhão cadastrado</p>
                        </div>
                    ) : (
                        trucks.map(truck => (
                            <div 
                                key={truck.id} 
                                style={{
                                    background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                                    border: '1.5px solid #E2E8F0',
                                    borderRadius: 16,
                                    padding: 24,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                                    transition: 'all 0.3s ease',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(184, 155, 0, 0.15)';
                                    e.currentTarget.style.borderColor = '#FEF08A';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                                    e.currentTarget.style.borderColor = '#E2E8F0';
                                }}
                            >
                                <div style={{ 
                                    position: 'absolute', 
                                    top: 0, 
                                    right: 0, 
                                    width: 100, 
                                    height: 100, 
                                    background: 'linear-gradient(135deg, #FFD600 0%, #B89B00 100%)', 
                                    opacity: 0.05, 
                                    borderRadius: '0 0 0 100%' 
                                }} />
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, position: 'relative' }}>
                                    <div style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 12,
                                        background: 'linear-gradient(135deg, #FFD600 0%, #B89B00 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.75rem',
                                        boxShadow: '0 4px 10px rgba(184, 155, 0, 0.3)'
                                    }}>
                                        🚛
                                    </div>
                                    <div>
                                        <h3 style={{ 
                                            margin: 0, 
                                            color: '#0F172A', 
                                            fontWeight: 800, 
                                            fontSize: '1.125rem',
                                            fontFamily: 'Orbitron, sans-serif'
                                        }}>
                                            {truck.identifier || truck.licensePlate}
                                        </h3>
                                        {truck.licensePlate && truck.identifier && (
                                            <p style={{ margin: '4px 0 0', color: '#64748B', fontWeight: 600, fontSize: '0.875rem' }}>
                                                {truck.licensePlate}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                <p style={{ margin: '0 0 20px', color: '#64748B', fontSize: '0.875rem' }}>
                                    Clique para ver estoque completo
                                </p>
                                
                                <button
                                    onClick={() => {
                                        setTruckModalId(truck.id);
                                        setTruckModalName(truck.identifier || truck.licensePlate);
                                        setTruckModalOpen(true);
                                    }}
                                    style={{
                                        marginTop: 'auto',
                                        width: '100%',
                                        padding: '12px',
                                        background: 'transparent',
                                        border: '1.5px solid #B89B00',
                                        color: '#B89B00',
                                        borderRadius: 10,
                                        fontWeight: 800,
                                        fontSize: '0.875rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#FFFDE7';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    Ver Estoque
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ── TAB CONTENT: MOVIMENTAÇÕES ── */}
            {tab === 'movimentacoes' && <MovimentacoesRecentesPanel showAudit={audit} auditAction={auditAction} />}

            {tab === 'financeiro' && <FinancialDashboardPanel data={financialDash} />}

            {/* ── MODALS ── */}
            <MovimentacaoModal
                open={movOpen}
                onClose={() => {
                    setMovOpen(false);
                    setMovItemId(undefined);
                    setMovTruckId(undefined);
                }}
                defaultItemId={movItemId}
                defaultFromTruckId={movTruckId}
                defaultType={movTruckId ? 'SAIDA' : 'ENTRADA'}
                onSuccess={() => {
                    loadDashboard();
                    loadItems();
                    if (tab === 'caminhao' && selectedTruckId) loadTruckStock(selectedTruckId);
                }}
            />

            <StockItemAuditModal open={auditOpen} stockItemId={auditItemId} itemNome={auditNome} onClose={() => setAuditOpen(false)} />

            <ConfirmModal
                isOpen={!!deleteItem}
                title="Desativar item?"
                message={deleteItem ? `O item "${deleteItem.nome}" será desativado (soft delete).` : ''}
                confirmLabel="Desativar"
                danger
                onCancel={() => setDeleteItem(null)}
                onConfirm={() => {
                    void (async () => {
                        if (!deleteItem) return;
                        try {
                            await stockApi.items.delete(deleteItem.id);
                            toast.success('Item desativado');
                            setDeleteItem(null);
                            await loadItems();
                            await loadDashboard();
                            if (tab === 'caminhao' && selectedTruckId) await loadTruckStock(selectedTruckId);
                        } catch (e: any) {
                            toast.error(e?.response?.data?.message || 'Erro ao desativar');
                        }
                    })();
                }}
            />

            <NovoInsumoModal
                open={novoOpen}
                onClose={() => setNovoOpen(false)}
                onSuccess={(hasPr) => {
                    loadDashboard();
                    loadItems();
                    if (tab === 'caminhao' && selectedTruckId) loadTruckStock(selectedTruckId);
                    if (hasPr) {
                        changeTab('solicitacoes');
                    }
                }}
            />

            <EditarInsumoModal
                open={!!editItemId}
                itemId={editItemId}
                onClose={() => setEditItemId(null)}
                onSuccess={() => {
                    loadDashboard();
                    loadItems();
                    if (tab === 'caminhao' && selectedTruckId) loadTruckStock(selectedTruckId);
                }}
            />

            <OrquestradorInsumoModal
                open={orquestradorOpen}
                onClose={() => setOrquestradorOpen(false)}
                onNovoInsumo={() => setNovoOpen(true)}
                onItemSelecionado={(item) => setSolicitarItem(item)}
            />

            <SolicitarCompraModal
                item={solicitarItem}
                onClose={() => setSolicitarItem(null)}
                onSuccess={() => {
                    setSolicitarItem(null);
                    setSolicitacoesRefreshKey(k => k + 1);
                    loadDashboard();
                    loadItems();
                }}
            />

            <EstoqueCaminhaoModal
                open={truckModalOpen}
                onClose={() => {
                    setTruckModalOpen(false);
                    setTruckModalId(undefined);
                    setTruckModalName(undefined);
                }}
                truckId={truckModalId}
                truckName={truckModalName}
                userRole={userRole}
            />
        </div>
    );
}

export default function EstoqueHubPage() {
    return (
        <Suspense
            fallback={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 1rem' }} />
                        <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem', letterSpacing: '0.15em', color: '#94A3B8', textTransform: 'uppercase' }}>Carregando estoque...</p>
                    </div>
                </div>
            }
        >
            <EstoqueHubInner />
        </Suspense>
    );
}
