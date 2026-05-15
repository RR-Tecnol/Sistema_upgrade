'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardApi, DashboardStats, Activity, UpcomingClass } from '@/lib/api/dashboard';
import { ClockIcon, CalendarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import api from '@/lib/api/client';
import type { DriverMarker } from '@/components/MapaMotoristas';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AdminCollapsibleTutorial from '@/components/admin/AdminCollapsibleTutorial';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';

// Leaflet é browser-only — carregamento dinâmico obrigatório
const MapaMotoristas = dynamic(() => import('@/components/MapaMotoristas'), {
    ssr: false,
    loading: () => (
        <div style={{ height: 400, background: '#0F172A', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#475569', fontSize: '.85rem' }}>
            🗺️ Carregando mapa...
        </div>
    ),
});
const DriverDrawer = dynamic(() => import('@/components/DriverDrawer'), { ssr: false });

interface AnalyticsData {
    inscricoesPorMes: { month: string; total: number; aprovados: number }[];
    alunosPorCurso: { curso: string; alunos: number; turmas: number }[];
    distribuicaoEstado: { name: string; value: number; color: string }[];
    statusInscricoes: { name: string; value: number; color: string }[];
    certificadosEmitidos: number;
    resumo: { totalStudents: number; totalCourses: number; totalClasses: number; totalEnrollments: number; totalActions: number };
}

type DrilldownKey =
    | 'coursesActive'
    | 'studentsTotal'
    | 'classesActive'
    | 'enrollmentsPending'
    | 'statesAvailable'
    | 'approvalRate'
    | 'attendanceRate'
    | 'certificatesIssued';

/** Navegação contextual no painel de KPI — substitui exibição de JSON bruto. */
function drilldownQuickAction(type: DrilldownKey, row: Record<string, unknown>): { href: string; label: string } | null {
    switch (type) {
        case 'coursesActive': {
            const id = row.id as string | undefined;
            return id ? { href: `/admin/cursos/${id}`, label: 'Abrir ficha do curso' } : null;
        }
        case 'studentsTotal': {
            const id = row.id as string | undefined;
            return id ? { href: `/admin/alunos/${id}`, label: 'Abrir ficha do aluno' } : null;
        }
        case 'classesActive':
        case 'attendanceRate': {
            const id = row.id as string | undefined;
            return id ? { href: `/admin/turmas/${id}`, label: 'Abrir ficha da turma' } : null;
        }
        case 'enrollmentsPending': {
            const id = row.id as string | undefined;
            return id ? { href: `/admin/inscricoes?open=${encodeURIComponent(id)}`, label: 'Abrir detalhe da inscrição' } : null;
        }
        case 'statesAvailable':
            return { href: '/admin/configuracoes', label: 'Configurações operacionais (cidades / UF)' };
        case 'approvalRate':
            return { href: '/admin/relatorios', label: 'Abrir relatórios' };
        case 'certificatesIssued': {
            const nestStudent = row.student as { id?: string } | undefined;
            const sid = (row.studentId as string | undefined) ?? nestStudent?.id;
            if (sid) return { href: `/admin/alunos/${sid}`, label: 'Abrir ficha do aluno' };
            const nestClass = row.class as { id?: string } | undefined;
            const cid = (row.classId as string | undefined) ?? nestClass?.id;
            if (cid) return { href: `/admin/turmas/${cid}`, label: 'Abrir ficha da turma' };
            return { href: '/admin/certificados', label: 'Abrir certificados' };
        }
        default:
            return null;
    }
}

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [upcoming, setUpcoming] = useState<UpcomingClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState('');
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [statesAvailableCount, setStatesAvailableCount] = useState(0);
    const [statesAvailableList, setStatesAvailableList] = useState<string[]>([]);
    const [drilldownOpen, setDrilldownOpen] = useState(false);
    const [drilldownType, setDrilldownType] = useState<DrilldownKey | null>(null);
    const [drilldownLoading, setDrilldownLoading] = useState(false);
    const [drilldownRows, setDrilldownRows] = useState<any[]>([]);
    const [drilldownQuery, setDrilldownQuery] = useState('');
    const [statesOperationalMeta, setStatesOperationalMeta] = useState<Array<{ uf: string; cities: number }>>([]);

    // F4.3: Estado dos motoristas em tempo real
    const [drivers, setDrivers] = useState<DriverMarker[]>([]);
    const [driversLoading, setDriversLoading] = useState(true);
    const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
    const [drawerDriver, setDrawerDriver] = useState<DriverMarker | null>(null);
    const [driverFilter, setDriverFilter] = useState<string>('TODOS');   // filtro por motorista
    const [estadoFilter, setEstadoFilter] = useState<string>('TODOS');   // filtro por estado
    const [routeMode, setRouteMode] = useState<'trail' | 'remaining' | 'both'>('both'); // F5.17
    // F4.7: Alertas ativos
    const [alerts, setAlerts] = useState<Array<{ type: string; driverName: string; message: string; timestamp: string }>>([]);
    // Fase 6: saúde do motor de certificados
    const [dashTab, setDashTab] = useState<'ops' | 'health'>('ops');
    const [certHealth, setCertHealth] = useState<{
        cache: { hits: number; misses: number; hitRate: number };
        generationMs: { puppeteer: { count: number; avg: number }; pdfLib: { count: number; avg: number } };
        puppeteer: { gateWaits: number; maxConcurrent: string };
    } | null>(null);
    const [emission, setEmission] = useState<{ byCourse: { name: string; count: number }[]; byState: { state: string; count: number }[]; total: number } | null>(null);
    const [healthLoading, setHealthLoading] = useState(false);

    useEffect(() => {
        load();
        loadDrivers();
        const iv = setInterval(load, 30000);
        // F4.6: motoristas atualizados via WS — polling leve de backup a cada 30s
        const driverIv = setInterval(loadDrivers, 30000);
        return () => { clearInterval(iv); clearInterval(driverIv); };
    }, []);

    useEffect(() => {
        if (dashTab !== 'health') return;
        let ok = true;
        setHealthLoading(true);
        (async () => {
            try {
                const [h, e] = await Promise.all([
                    api.get('/certificates/admin/stats'),
                    api.get('/certificates/admin/emission-breakdown'),
                ]);
                if (ok) {
                    setCertHealth(h.data);
                    setEmission(e.data);
                }
            } catch {
                if (ok) { setCertHealth(null); setEmission(null); }
            } finally {
                if (ok) setHealthLoading(false);
            }
        })();
        return () => { ok = false; };
    }, [dashTab]);

    const load = async () => {
        try {
            const [s, a, u, analyticsRes] = await Promise.all([
                dashboardApi.getStats(),
                dashboardApi.getRecentActivity(),
                dashboardApi.getUpcomingClasses(),
                api.get('/dashboard/analytics').catch(() => ({ data: null })),
            ]);
            setStats(s);
            setActivities(a);
            setUpcoming(u);
            if (analyticsRes.data) setAnalytics(analyticsRes.data);
            const citiesRes = await api.get('/cities').catch(() => ({ data: [] as any[] }));
            const cityRows = Array.isArray(citiesRes.data) ? citiesRes.data : (citiesRes.data?.data || []);
            const ufs = new Set<string>((cityRows || []).map((c: any) => String(c.state || '').toUpperCase()).filter((uf: string) => /^[A-Z]{2}$/.test(uf)));
            setStatesAvailableCount(ufs.size);
            setStatesAvailableList(Array.from(ufs).sort((a, b) => a.localeCompare(b, 'pt-BR')));
            const byUfCount = (cityRows || []).reduce((acc: Record<string, number>, c: any) => {
                const uf = String(c.state || '').toUpperCase();
                if (/^[A-Z]{2}$/.test(uf)) acc[uf] = (acc[uf] || 0) + 1;
                return acc;
            }, {});
            setStatesOperationalMeta(
                Object.entries(byUfCount)
                    .map(([uf, cities]) => ({ uf, cities: Number(cities) || 0 }))
                    .sort((a, b) => a.uf.localeCompare(b.uf, 'pt-BR')),
            );
            setLastUpdate(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        } catch { } finally { setLoading(false); }
    };

    const openDrilldown = async (type: DrilldownKey) => {
        setDrilldownType(type);
        setDrilldownOpen(true);
        setDrilldownLoading(true);
        setDrilldownRows([]);
        setDrilldownQuery('');
        try {
            if (type === 'coursesActive') {
                const res = await api.get('/courses');
                const rows = (Array.isArray(res.data) ? res.data : res.data?.data || []).filter((c: any) => c.active !== false);
                setDrilldownRows(rows);
                return;
            }
            if (type === 'studentsTotal') {
                const res = await api.get('/admin/students', { params: { page: 1, limit: 200 } });
                setDrilldownRows(Array.isArray(res.data?.data) ? res.data.data : []);
                return;
            }
            if (type === 'classesActive') {
                const res = await api.get('/classes');
                const activeStatuses = new Set(['PLANNED', 'ENROLLMENT_OPEN', 'ENROLLMENT_CLOSED', 'IN_PROGRESS']);
                const rows = (Array.isArray(res.data) ? res.data : res.data?.data || []).filter((t: any) => activeStatuses.has(String(t.status || '')));
                setDrilldownRows(rows);
                return;
            }
            if (type === 'enrollmentsPending') {
                const res = await api.get('/enrollments?limit=300');
                const pendingStatuses = new Set(['PENDING', 'DOCUMENT_PENDING', 'DOCUMENTS_PENDING', 'WAITLIST']);
                const rows = (Array.isArray(res.data) ? res.data : res.data?.data || []).filter((e: any) => pendingStatuses.has(String(e.status || '')));
                setDrilldownRows(rows);
                return;
            }
            if (type === 'statesAvailable') {
                setDrilldownRows(statesOperationalMeta.length > 0 ? statesOperationalMeta : statesAvailableList.map((uf) => ({ uf, cities: 0 })));
                return;
            }
            if (type === 'approvalRate') {
                const rows = (analytics?.inscricoesPorMes || []).map((m) => ({
                    period: m.month,
                    total: m.total,
                    approved: m.aprovados,
                    rate: m.total > 0 ? Math.round((m.aprovados / m.total) * 100) : 0,
                }));
                setDrilldownRows(rows);
                return;
            }
            if (type === 'attendanceRate') {
                const res = await api.get('/classes');
                const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];
                setDrilldownRows(rows);
                return;
            }
            if (type === 'certificatesIssued') {
                const res = await api.get('/certificates');
                setDrilldownRows(Array.isArray(res.data) ? res.data : res.data?.data || []);
                return;
            }
        } catch {
            setDrilldownRows([]);
        } finally {
            setDrilldownLoading(false);
        }
    };

    const drilldownTitle: Record<DrilldownKey, string> = {
        coursesActive: 'Cursos ativos',
        studentsTotal: 'Alunos cadastrados',
        classesActive: 'Turmas ativas',
        enrollmentsPending: 'Inscrições pendentes',
        statesAvailable: 'Estados disponíveis',
        approvalRate: 'Aprovação por período',
        attendanceRate: 'Frequência por turma',
        certificatesIssued: 'Certificados emitidos',
    };

    const drilldownAccent: Record<DrilldownKey, { color: string; bg: string; border: string }> = {
        coursesActive: { color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
        studentsTotal: { color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
        classesActive: { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
        enrollmentsPending: { color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
        statesAvailable: { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
        approvalRate: { color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
        attendanceRate: { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
        certificatesIssued: { color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
    };

    const filteredDrilldownRows = drilldownRows.filter((row) => {
        if (!drilldownQuery.trim()) return true;
        const q = drilldownQuery.trim().toLowerCase();
        return JSON.stringify(row).toLowerCase().includes(q);
    });

    // F4.3: Carrega motoristas ativos do backend
    const loadDrivers = useCallback(async () => {
        setDriversLoading(true);
        try {
            const res = await api.get('/driver/location/active');
            const driversData: DriverMarker[] = res.data?.drivers ?? [];
            // Busca trilhas para cada motorista com trip ativa
            const withTrails = await Promise.all(driversData.map(async (d) => {
                if (!d.trip?.id) return d;
                try {
                    const trailRes = await api.get(`/driver/location/${d.trip.id}/trail`);
                    return { ...d, trail: trailRes.data?.trail ?? [] };
                } catch { return d; }
            }));
            setDrivers(withTrails);

        } catch { setDrivers([]); } finally { setDriversLoading(false); }
    }, []);

    // F4.6: Escuta eventos WS para atualizar posição dos motoristas em tempo real
    // useNotifications já existe e está conectado — ouvimos driver_location_update
    useEffect(() => {
        const handler = (event: CustomEvent) => {
            const { driverUserId, lat, lng, speed, heading, capturedAt } = event.detail;
            setDrivers(prev => prev.map(d => {
                if (d.userId !== driverUserId) return d;
                return {
                    ...d,
                    status: 'online' as const,
                    lastLocation: { lat, lng, speed, heading, capturedAt },
                    trail: [...(d.trail ?? []), { latitude: lat, longitude: lng }],
                };
            }));
        };
        const alertHandler = (event: CustomEvent) => {
            const { driverName, message, type, timestamp } = event.detail;
            setAlerts(prev => [{ type, driverName, message, timestamp: timestamp || new Date().toISOString() }, ...prev].slice(0, 10));
        };
        window.addEventListener('ws:driver_location_update', handler as EventListener);
        window.addEventListener('ws:driver_alert', alertHandler as EventListener);
        return () => {
            window.removeEventListener('ws:driver_location_update', handler as EventListener);
            window.removeEventListener('ws:driver_alert', alertHandler as EventListener);
        };
    }, []);

    const studentsByState = stats?.students.byState || {};
    const sortedStudentStates = Object.entries(studentsByState).sort((a, b) => b[1] - a[1]);
    const topStatesSummary = sortedStudentStates.slice(0, 2).map(([uf, n]) => `${uf} ${n}`).join(' · ');
    const totalStudents = stats?.students.total || 0;

    // Sparklines calculadas dos dados reais (array vazio enquanto carrega — Sparkline retorna null para < 2 pontos)
    const sparkEnroll = analytics?.inscricoesPorMes.map(m => m.total) ?? [];
    const sparkAprovados = analytics?.inscricoesPorMes.map(m => m.aprovados) ?? [];
    const taxaAprovacao = analytics?.inscricoesPorMes.length
        ? Math.round(
            (analytics.inscricoesPorMes.reduce((acc, m) => acc + m.aprovados, 0) /
             Math.max(analytics.inscricoesPorMes.reduce((acc, m) => acc + m.total, 0), 1)) * 100
          )
        : 0;
    // BUG-DASH-02 FIX: ler o campo real de certificados (tabela Certificate), não enrollment.status
    const certCount = analytics?.certificadosEmitidos ?? 0;

    // Extrai UF do campo "Cidade/UF" ou "Cidade/UF → Cidade/UF"
    const extractUF = (d: DriverMarker) => {
        const match = (d.trip.origin + ' ' + d.trip.destination).match(/\/([A-Z]{2})/g);
        return match ? [...new Set(match.map(m => m.slice(1)))] : [];
    };

    // Estados presentes nos motoristas ativos (para o select)
    const estadosDisponiveis = [...new Set(drivers.flatMap(d => extractUF(d)))].sort();

    // Motoristas filtrados: por estado E por motorista individual
    const driversFiltered = drivers.filter(d => {
        const passaEstado = estadoFilter === 'TODOS' || extractUF(d).includes(estadoFilter);
        const passaMotorista = driverFilter === 'TODOS' || d.userId === driverFilter;
        return passaEstado && passaMotorista;
    });

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 1rem' }} />
                <p style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">

            <AdminHeaderHero
                title="DASHBOARD"
                subtitle="Visão geral inteligente do ecossistema"
                badge={lastUpdate ? `ONLINE · ${lastUpdate}` : 'ONLINE'}
            />

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(['ops', 'health'] as const).map(tab => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setDashTab(tab)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: 10,
                            border: `2px solid ${dashTab === tab ? '#B89B00' : '#E5E7EB'}`,
                            background: dashTab === tab ? 'linear-gradient(135deg, #FFFDE7, #FFFBEB)' : '#F9FAFB',
                            fontFamily: 'Orbitron, sans-serif',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: dashTab === tab ? '#0F172A' : '#6B7280',
                            cursor: 'pointer',
                        }}
                    >
                        {tab === 'ops' ? 'Operacional' : 'Saúde do Sistema (certificados)'}
                    </button>
                ))}
            </div>

            {dashTab === 'health' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <AdminCollapsibleTutorial
                    storageKey="admin-dashboard-cert-health-tutorial-expanded"
                    emoji="🏥"
                    title="SAÚDE DO SISTEMA — CERTIFICADOS (PDF)"
                    steps={[
                        {
                            num: '1',
                            color: '#3B82F6',
                            title: 'Para que serve este painel',
                            body: 'Mostra se a emissão de certificados em PDF está a correr bem: velocidade, filas e reutilização de ficheiros já gerados. Não substitui relatórios pedagógicos nem rankings de turma.',
                        },
                        {
                            num: '2',
                            color: '#B89B00',
                            title: 'Taxa de reutilização de PDFs',
                            body: 'Indica com que frequência o sistema volta a usar um PDF já criado em vez de gerar de novo. Valores mais altos significam menos espera quando alguém volta a pedir o mesmo documento.',
                        },
                        {
                            num: '3',
                            color: '#059669',
                            title: 'Tempos médios de geração',
                            body: 'Os dois cartões de tempo mostram o desempenho habitual em cada modo de emissão: um para o PDF completo com o layout oficial; outro para o modo alternativo quando o primeiro não está disponível. Serve para comparar se algo ficou mais lento que o normal.',
                        },
                        {
                            num: '4',
                            color: '#8B5CF6',
                            title: 'Fila e limite simultâneo',
                            body: '“Na fila de espera” soma pedidos que tiveram de aguardar porque já havia muitas emissões ao mesmo tempo. O limite de pedidos em paralelo é definido na instalação — se a fila crescer muito em horários de pico, fale com a equipa técnica.',
                        },
                        {
                            num: '5',
                            color: '#EA580C',
                            title: 'Emissões por curso e por UF',
                            body: 'Quantos certificados activos existem por curso e por estado: ajuda a ver distribuição geográfica e volume por formação.',
                        },
                        {
                            num: '6',
                            color: '#64748B',
                            title: 'Porque pode aparecer tudo em zero',
                            body: 'Os números voltam a começar após uma actualização do sistema ou quando ainda não houve pedidos de certificado desde o último arranque. É esperado até voltarem a gerar-se ou descarregarem PDFs.',
                        },
                    ]}
                />

                {healthLoading && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>A carregar métricas…</p>}

                {certHealth && !healthLoading && (
                    <>
                        <div style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.12em', color: '#B89B00', textTransform: 'uppercase' }}>
                            Motor de certificados
                        </div>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '0.85rem',
                            }}
                        >
                            <AnimatedKpiCard
                                label="Reutilização de PDFs"
                                value={0}
                                displayValue={`${Math.round((certHealth.cache.hitRate ?? 0) * 1000) / 10}%`}
                                sub={`${certHealth.cache.hits} reutilizações · ${certHealth.cache.misses} geradas de novo`}
                                color="#B89B00"
                                bg="#FFFDE7"
                                border="#FEF08A"
                                icon={<span aria-hidden>📦</span>}
                                compact
                            />
                            <AnimatedKpiCard
                                label="Tempo médio — PDF completo"
                                value={0}
                                displayValue={`${Math.round((certHealth.generationMs.puppeteer.avg ?? 0) * 10) / 10} ms`}
                                sub={`${certHealth.generationMs.puppeteer.count} medições`}
                                color="#059669"
                                bg="#F0FDF4"
                                border="#BBF7D0"
                                icon={<span aria-hidden>🎭</span>}
                                compact
                                delayMs={40}
                            />
                            <AnimatedKpiCard
                                label="Tempo médio — modo compatível"
                                value={0}
                                displayValue={`${Math.round((certHealth.generationMs.pdfLib.avg ?? 0) * 10) / 10} ms`}
                                sub={`${certHealth.generationMs.pdfLib.count} medições`}
                                color="#0891B2"
                                bg="#F0F9FF"
                                border="#BAE6FD"
                                icon={<span aria-hidden>📄</span>}
                                compact
                                delayMs={80}
                            />
                        </div>

                        <div
                            style={{
                                background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                                borderRadius: 16,
                                border: '1px solid #E2E8F0',
                                padding: '1.1rem 1.2rem',
                                boxShadow: '0 10px 26px rgba(15,23,42,0.08)',
                                display: 'grid',
                                gridTemplateColumns: '1fr auto',
                                gap: '0.9rem',
                                minWidth: 0,
                            }}
                        >
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.22rem 0.62rem', borderRadius: 999, border: '1px solid #FED7AA', background: '#FFF7ED', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#C2410C', marginBottom: '0.55rem' }}>
                                    ⏳ Fila de emissão de PDFs
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', fontFamily: 'Orbitron, sans-serif' }}>{certHealth.puppeteer.gateWaits}</span>
                                    <span style={{ fontSize: '0.88rem', color: '#64748B', fontWeight: 600 }}>pedido(s) aguardando vaga de processamento</span>
                                </div>
                                <div style={{ marginTop: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>
                                        Pressão da fila:
                                    </span>
                                    <span style={{ fontSize: '0.74rem', color: '#0F172A', fontWeight: 800, fontFamily: 'Orbitron, sans-serif' }}>
                                        {Math.round((certHealth.puppeteer.gateWaits / Math.max(Number(certHealth.puppeteer.maxConcurrent) || 1, 1)) * 100)}%
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                                        (referência por capacidade paralela)
                                    </span>
                                </div>
                            </div>
                            <div style={{ minWidth: 210, maxWidth: 260 }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748B', marginBottom: '0.4rem', textAlign: 'right' }}>
                                    Concorrência configurada
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
                                    até {String(certHealth.puppeteer.maxConcurrent)} pedidos em paralelo
                                </div>
                                <div style={{ marginTop: '0.5rem', height: 8, borderRadius: 999, background: '#E2E8F0', overflow: 'hidden' }}>
                                    <div
                                        style={{
                                            height: '100%',
                                            width: `${Math.min(100, Math.round((certHealth.puppeteer.gateWaits / Math.max(Number(certHealth.puppeteer.maxConcurrent) || 1, 1)) * 100))}%`,
                                            background: 'linear-gradient(90deg, #F59E0B 0%, #EA580C 100%)',
                                            borderRadius: 999,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}
                {emission && !healthLoading && (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '1.25rem',
                        }}
                    >
                        <div
                            style={{
                                background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
                                borderRadius: 16,
                                border: '1px solid #E2E8F0',
                                padding: '1.15rem 1.15rem 1rem',
                                boxShadow: '0 10px 22px rgba(15,23,42,0.07)',
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: 0,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', display: 'inline-flex', alignItems: 'center', gap: 8 }}>🎓 Emissões por Curso</div>
                                <div style={{ background: '#F3F4F6', padding: '0.2rem 0.65rem', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700, color: '#6B7280' }}>{emission.total} total</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {emission.byCourse.slice(0, 12).map((c) => (
                                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', minWidth: 0 }}>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                            <div style={{ marginTop: 4, height: 6, borderRadius: 999, background: '#E2E8F0', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${emission.total > 0 ? Math.max(3, Math.round((c.count / emission.total) * 100)) : 0}%`, background: 'linear-gradient(90deg, #0891B2 0%, #06B6D4 100%)' }} />
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#111827', fontFamily: 'Orbitron, sans-serif' }}>{c.count}</span>
                                            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700 }}>
                                                {emission.total > 0 ? `${Math.round((c.count / emission.total) * 100)}%` : '0%'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '0.9rem', paddingTop: '0.85rem', borderTop: '1px dashed #CBD5E1', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '0.65rem' }}>
                                <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '0.5rem 0.6rem', background: '#FFFFFF' }}>
                                    <div style={{ fontSize: '0.64rem', fontWeight: 800, letterSpacing: '0.08em', color: '#64748B', textTransform: 'uppercase' }}>Curso líder</div>
                                    <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#0F172A', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {emission.byCourse[0]?.name || '—'}
                                    </div>
                                </div>
                                <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '0.5rem 0.6rem', background: '#FFFFFF' }}>
                                    <div style={{ fontSize: '0.64rem', fontWeight: 800, letterSpacing: '0.08em', color: '#64748B', textTransform: 'uppercase' }}>Concentração topo 3</div>
                                    <div style={{ marginTop: 4, fontSize: '0.84rem', color: '#0F172A', fontWeight: 800, fontFamily: 'Orbitron, sans-serif' }}>
                                        {emission.total > 0 ? `${Math.round((emission.byCourse.slice(0, 3).reduce((acc, x) => acc + x.count, 0) / emission.total) * 100)}%` : '0%'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div
                            style={{
                                background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
                                borderRadius: 16,
                                border: '1px solid #E2E8F0',
                                padding: '1.15rem 1.15rem 1rem',
                                boxShadow: '0 10px 22px rgba(15,23,42,0.07)',
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: 0,
                            }}
                        >
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}>🗺️ Distribuição por UF</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {emission.byState.map((s, idx) => (
                                    <div key={s.state} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#64748B', flexShrink: 0 }}>{s.state}</div>
                                            <div style={{ minWidth: 0 }}>
                                                <span style={{ fontSize: '0.88rem', color: '#374151', fontWeight: 600 }}>{s.state}</span>
                                                <div style={{ fontSize: '0.66rem', color: '#94A3B8', marginTop: 1 }}>#{idx + 1} no ranking</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#111827', fontFamily: 'Orbitron, sans-serif' }}>{s.count}</span>
                                            <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 700 }}>
                                                {emission.total > 0 ? `${Math.round((s.count / emission.total) * 100)}%` : '0%'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '0.9rem', paddingTop: '0.85rem', borderTop: '1px dashed #CBD5E1', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '0.65rem' }}>
                                <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '0.5rem 0.6rem', background: '#FFFFFF' }}>
                                    <div style={{ fontSize: '0.64rem', fontWeight: 800, letterSpacing: '0.08em', color: '#64748B', textTransform: 'uppercase' }}>UFs com emissão</div>
                                    <div style={{ marginTop: 4, fontSize: '0.84rem', color: '#0F172A', fontWeight: 800, fontFamily: 'Orbitron, sans-serif' }}>{emission.byState.length}</div>
                                </div>
                                <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '0.5rem 0.6rem', background: '#FFFFFF' }}>
                                    <div style={{ fontSize: '0.64rem', fontWeight: 800, letterSpacing: '0.08em', color: '#64748B', textTransform: 'uppercase' }}>UF líder</div>
                                    <div style={{ marginTop: 4, fontSize: '0.84rem', color: '#0F172A', fontWeight: 800 }}>
                                        {emission.byState[0]?.state || '—'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            )}

            {dashTab === 'ops' && (
            <>
            <AdminCollapsibleTutorial
                storageKey="admin-dashboard-ops-tutorial-expanded"
                emoji="📊"
                title="COMO USAR O DASHBOARD OPERACIONAL"
                steps={[
                    {
                        num: '1',
                        color: '#3B82F6',
                        title: 'Cartões principais (primeira linha)',
                        body: 'Cursos ativos, alunos, turmas, inscrições pendentes e estados disponíveis são filtros de visão geral. Clique num cartão para abrir o detalhe (lista ou dados relacionados) sem sair do painel.',
                    },
                    {
                        num: '2',
                        color: '#B89B00',
                        title: 'Métricas secundárias',
                        body: 'Taxa de aprovação, frequência média e certificados emitidos resumem indicadores académicos; também são clicáveis para ver o detalhe contextual.',
                    },
                    {
                        num: '3',
                        color: '#059669',
                        title: 'Distribuição de alunos por UF',
                        body: 'Barras proporcionais à matrícula por estado — útil para planeamento geográfico e comparar pesos de cada UF.',
                    },
                    {
                        num: '4',
                        color: '#8B5CF6',
                        title: 'Actividade e agenda',
                        body: 'Últimos eventos do sistema e próximas aulas ajudam a acompanhar o ritmo operacional do dia.',
                    },
                    {
                        num: '5',
                        color: '#EA580C',
                        title: 'Mapa de motoristas',
                        body: 'Visualização em tempo real das viagens em campo; use filtros por estado ou por motorista e abra o painel lateral para detalhes da viagem.',
                    },
                    {
                        num: '6',
                        color: '#0891B2',
                        title: 'Separador Saúde do Sistema',
                        body: 'No topo, alterne para “Saúde do Sistema (certificados)” para ver se a emissão de PDFs está rápida, se há fila de espera e quantos certificados existem por curso e por estado.',
                    },
                ]}
            />

            {/* ── ROW 1: PRIMARY KPIs ── */}
            <div className="grid-4-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                <AnimatedKpiCard label="Cursos Ativos" value={stats?.courses.active || 0} sub={`de ${stats?.courses.total || 0} cursos · clique para ver`} color="#B89B00" bg="#FFFDE7" border="#FEF08A" icon={<span>📚</span>} onClick={() => openDrilldown('coursesActive')} />
                <AnimatedKpiCard label="Total de Alunos" value={totalStudents} sub={`${topStatesSummary || 'Sem distribuição por UF'} · clique para ver`} color="#0891B2" bg="#F0F9FF" border="#BAE6FD" icon={<span>👥</span>} delayMs={60} onClick={() => openDrilldown('studentsTotal')} />
                <AnimatedKpiCard label="Turmas Ativas" value={stats?.classes.active || 0} sub={`de ${stats?.classes.total || 0} turmas · clique para ver`} color="#059669" bg="#F0FDF4" border="#BBF7D0" icon={<span>🏫</span>} delayMs={120} onClick={() => openDrilldown('classesActive')} />
                <AnimatedKpiCard label="Inscrições Pendentes" value={stats?.enrollments.pending || 0} sub={`${stats?.enrollments.total || 0} inscrições total · clique para ver`} color="#EA580C" bg="#FFF7ED" border="#FED7AA" icon={<span>📝</span>} delayMs={180} onClick={() => openDrilldown('enrollmentsPending')} />
                <AnimatedKpiCard label="Estados Disponíveis" value={statesAvailableCount} sub="vindos de Configurações > Operacional · clique para ver" color="#7C3AED" bg="#F5F3FF" border="#DDD6FE" icon={<span>🗺️</span>} delayMs={240} onClick={() => openDrilldown('statesAvailable')} />
            </div>

            {/* ── ROW 2: SECONDARY METRICS ── */}
            <div className="grid-3-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                <AnimatedKpiCard label="Taxa de Aprovação" value={taxaAprovacao} suffix="%" sub="clique para ver detalhes" color="#B89B00" bg="#FFFDE7" border="#FEF08A" icon={<span>📈</span>} onClick={() => openDrilldown('approvalRate')} />
                <AnimatedKpiCard
                    label="Frequência Média"
                    value={stats?.attendance.rate || 0}
                    suffix="%"
                    sub={`${stats?.attendance.totalRecords || 0} presenças registradas · clique para ver`}
                    color="#059669"
                    bg="#F0FDF4"
                    border="#BBF7D0"
                    icon={<span>✅</span>}
                    delayMs={60}
                    onClick={() => openDrilldown('attendanceRate')}
                />
                <AnimatedKpiCard label="Certificados Emitidos" value={certCount} sub="clique para ver detalhes" color="#0891B2" bg="#F0F9FF" border="#BAE6FD" icon={<span>🏆</span>} delayMs={120} onClick={() => openDrilldown('certificatesIssued')} />
            </div>

            {/* ── ROW 3: STATES BAR ── */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: '0.85rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.72rem', color: '#9CA3AF', letterSpacing: '0.1em' }}>DISTRIBUIÇÃO DE ALUNOS</span>
                    </div>
                    {sortedStudentStates.map(([uf, n], idx) => {
                        const pct = totalStudents ? Math.round((n / totalStudents) * 100) : 0;
                        const color = ['#0891B2', '#059669', '#7C3AED', '#EA580C', '#DC2626'][idx % 5];
                        const bg = ['#E0F2FE', '#DCFCE7', '#F5F3FF', '#FFF7ED', '#FEF2F2'][idx % 5];
                        return (
                        <div key={uf} style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{ padding: '0.15rem 0.5rem', borderRadius: 100, background: bg, color: color, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em' }}>{uf}</span>
                                    <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>Estado {uf}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                                    <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: color }}>{n}</span>
                                    <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{pct}%</span>
                                </div>
                            </div>
                            <div style={{ height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>

            {/* ── ROW 4: ACTIVITIES + UPCOMING ── */}
            <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                {/* Recent Activity */}
                <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFDE7' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ClockIcon style={{ width: 14, height: 14, color: '#B89B00' }} />
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>Atividades Recentes</span>
                        </div>
                        <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.75rem', color: '#B89B00' }}>{activities.length}</span>
                    </div>
                    <div className="custom-scrollbar" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {activities.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#D1D5DB' }}>
                                <div style={{ width: 32, height: 32, borderRadius: 9, background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                                    <ClockIcon style={{ width: 16, height: 16, color: '#D1D5DB' }} />
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Nenhuma atividade recente</p>
                            </div>
                        ) : activities.map((a, i) => (
                            <div key={i} style={{ padding: '0.7rem 1rem', borderBottom: '1px solid #F9FAFB', display: 'flex', gap: '0.65rem', transition: 'background 0.15s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FFFDE7'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FFFFFF'}
                            >
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFD600', flexShrink: 0, marginTop: '0.4rem' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827', marginBottom: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.action}</p>
                                    <p style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{a.description}</p>
                                    <p style={{ fontSize: '0.62rem', color: '#D1D5DB', marginTop: '0.15rem', fontFamily: 'JetBrains Mono' }}>{new Date(a.timestamp).toLocaleString('pt-BR')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Classes */}
                <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0F9FF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CalendarIcon style={{ width: 14, height: 14, color: '#0891B2' }} />
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>Próximas Turmas</span>
                        </div>
                        <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.75rem', color: '#0891B2' }}>{upcoming.length}</span>
                    </div>
                    <div className="custom-scrollbar" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        {upcoming.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                                <div style={{ width: 32, height: 32, borderRadius: 9, background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                                    <CalendarIcon style={{ width: 16, height: 16, color: '#D1D5DB' }} />
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Nenhuma turma próxima</p>
                            </div>
                        ) : upcoming.slice(0, 6).map((item, i) => (
                            <div key={item.id} style={{ padding: '0.7rem 1rem', borderBottom: '1px solid #F9FAFB', transition: 'background 0.15s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F0F9FF'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FFFFFF'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '0.5rem' }}>{item.course.name}</span>
                                    <span style={{ padding: '0.15rem 0.5rem', borderRadius: 100, fontSize: '0.62rem', fontWeight: 700, background: '#F0F9FF', color: '#0891B2', border: '1px solid #BAE6FD', whiteSpace: 'nowrap', flexShrink: 0 }}>{item._count.enrollments} alunos</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{item.city?.name} — {item.city?.state}</span>
                                    <span style={{ fontSize: '0.62rem', fontFamily: 'JetBrains Mono', color: '#0891B2', fontWeight: 700 }}>
                                        {new Date(item.startDate).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── ROW 5: QUICK LINKS ── */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E7EB', padding: '0.85rem 1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9CA3AF' }}>Acesso Rápido</span>
                    <div style={{ width: 1, height: 18, background: '#E5E7EB' }} />
                    {[
                        { label: 'Inscrições', href: '/admin/inscricoes', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
                        { label: 'Frequência', href: '/admin/frequencia', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
                        { label: 'Certificados', href: '/admin/certificados', color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
                        { label: 'Relatórios', href: '/admin/relatorios', color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
                        { label: 'Alunos', href: '/admin/alunos', color: '#374151', bg: '#F9FAFB', border: '#E5E7EB' },
                        { label: 'Turmas', href: '/admin/turmas', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
                    ].map(l => (
                        <Link key={l.href} href={l.href}
                            style={{ padding: '0.4rem 0.9rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none', background: l.bg, border: `1px solid ${l.border}`, color: l.color, transition: 'all 0.18s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 10px ${l.color}22`; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                        >
                            {l.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── ROW 6: MOTORISTAS EM ROTA — F4.3 a F4.7 ── */}
            <div style={{ background: '#0F172A', borderRadius: 16, border: '1px solid rgba(255,214,0,0.15)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem' }}>
                    <div>
                        <h2 style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: '.9rem', color: '#FFD600', letterSpacing: '.08em', margin: 0 }}>
                            🚛 MOTORISTAS EM ROTA
                        </h2>
                        <p style={{ fontSize: '.75rem', color: '#475569', margin: '2px 0 0' }}>
                            {drivers.filter(d => d.status === 'online').length} online ·
                            {drivers.filter(d => d.status === 'offline' || d.status === 'stopped').length} sem sinal ·
                            Atualizado: {lastUpdate || '--:--'}
                        </p>
                    </div>
                    {/* Filtros: estado + motorista */}
                    <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Filtro por estado */}
                        <select value={estadoFilter} onChange={e => {
                            setEstadoFilter(e.target.value);
                            setDriverFilter('TODOS');
                            setSelectedDriver(null);
                        }} style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, padding: '.35rem .75rem', color: '#F1F5F9', fontSize: '.8rem',
                            cursor: 'pointer', height: 36 }}>
                            <option value="TODOS">Todos estados</option>
                            {estadosDisponiveis.map(uf => (
                                <option key={uf} value={uf}>{uf}</option>
                            ))}
                        </select>
                        {/* Filtro por motorista */}
                        <select value={driverFilter} onChange={e => {
                            setDriverFilter(e.target.value);
                            setSelectedDriver(e.target.value === 'TODOS' ? null : e.target.value);
                        }} style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, padding: '.35rem .75rem', color: '#F1F5F9', fontSize: '.8rem',
                            cursor: 'pointer', height: 36 }}>
                            <option value="TODOS">Todos motoristas</option>
                            {(estadoFilter === 'TODOS' ? drivers : drivers.filter(d => extractUF(d).includes(estadoFilter)))
                                .map(d => <option key={d.userId} value={d.userId}>{d.name}</option>)}
                        </select>

                        {/* F5.17: Toggle de modo de visualização de rota */}
                        <div style={{
                            display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.1)', height: 36,
                        }}>
                            {([
                                { key: 'trail'     as const, label: '↩ Percorrido', title: 'Mostrar apenas o caminho percorrido' },
                                { key: 'both'      as const, label: '⇌ Ambos',      title: 'Percorrido + rota restante (padrão)' },
                                { key: 'remaining' as const, label: '↪ Falta',      title: 'Mostrar o trecho que ainda falta percorrer' },
                            ]).map((opt, idx, arr) => (
                                <button
                                    key={opt.key}
                                    title={opt.title}
                                    onClick={() => setRouteMode(opt.key)}
                                    style={{
                                        background: routeMode === opt.key ? 'rgba(255,214,0,0.15)' : '#1E293B',
                                        border: 'none',
                                        borderRight: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                        padding: '.2rem .65rem',
                                        color: routeMode === opt.key ? '#FFD600' : '#64748B',
                                        fontSize: '.72rem',
                                        fontWeight: routeMode === opt.key ? 800 : 500,
                                        cursor: 'pointer',
                                        transition: 'all .15s',
                                        whiteSpace: 'nowrap',
                                        height: '100%',
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <button onClick={loadDrivers} style={{ background: '#1E293B',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                            padding: '.35rem .75rem', color: '#94A3B8', fontSize: '.8rem',
                            cursor: 'pointer', height: 36 }} title="Atualizar">
                            🔄
                        </button>
                    </div>
                </div>

                {driversLoading && drivers.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🛰️</div>
                        <div style={{ fontFamily: 'Orbitron,sans-serif', fontSize: '.72rem', letterSpacing: '.1em' }}>
                            CARREGANDO MOTORISTAS...
                        </div>
                    </div>
                ) : drivers.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🛣️</div>
                        <div style={{ fontFamily: 'Orbitron,sans-serif', fontSize: '.72rem', letterSpacing: '.1em', color: '#334155' }}>
                            NENHUM MOTORISTA EM ROTA
                        </div>
                        <p style={{ fontSize: '.75rem', color: '#334155', marginTop: '.4rem' }}>
                            Viagens IN_TRANSIT aparecem aqui em tempo real.
                        </p>
                    </div>
                ) : (
                    <div className="driver-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0 }}>
                        <style>{`
                            @media(max-width:900px){.driver-grid{grid-template-columns:1fr !important;}}
                            @media(max-width:900px){.driver-list-col{border-left:none !important; border-top:1px solid rgba(255,255,255,0.06) !important; max-height:300px !important;}}
                        `}</style>
                        {/* Mapa F4.1/F4.2 */}
                        <div style={{ padding: '1rem 1.25rem 0' }}>
                            <MapaMotoristas
                                drivers={driversFiltered}
                                selectedDriverId={selectedDriver}
                                routeMode={routeMode}
                                onDriverClick={(id) => {
                                    setSelectedDriver(id);
                                    setDrawerDriver(drivers.find(d => d.userId === id) ?? null);
                                    // F5.13: scroll lock gerenciado pelo DriverDrawer via useEffect cleanup
                                }}
                            />
                        </div>
                        {/* F4.3: Lista lateral */}
                        <div className="custom-scrollbar driver-list-col" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', maxHeight: 500, overflowY: 'auto' }}>
                            {driversFiltered.map(d => {
                                    const stColor = { online: '#22C55E', stopped: '#F59E0B', offline: '#EF4444' }[d.status];
                                    const isSelected = selectedDriver === d.userId;
                                    return (
                                        <div key={d.userId}
                                            onClick={() => {
                                                setSelectedDriver(d.userId);
                                                setDrawerDriver(d);
                                            }}
                                            style={{ padding: '.85rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                cursor: 'pointer', background: isSelected ? 'rgba(255,214,0,0.05)' : 'transparent',
                                                transition: 'background .15s', borderLeft: isSelected ? `3px solid #FFD600` : '3px solid transparent' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%',
                                                    background: stColor, flexShrink: 0,
                                                    boxShadow: d.status === 'online' ? `0 0 0 3px ${stColor}33` : 'none' }} />
                                                <span style={{ fontWeight: 700, fontSize: '.82rem', color: '#F1F5F9',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {d.name}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '.7rem', color: '#64748B', marginBottom: '.3rem',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {d.trip.origin} → {d.trip.destination}
                                            </div>
                                            {/* Barra de progresso */}
                                            <div style={{ height: 3, borderRadius: 2, background: '#1E293B', overflow: 'hidden', marginBottom: '.3rem' }}>
                                                <div style={{ height: '100%', width: `${d.progress}%`,
                                                    background: 'linear-gradient(90deg,#22C55E,#86EFAC)', borderRadius: 2 }} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.65rem', color: '#475569' }}>
                                                <span>{d.progress}% concluído</span>
                                                {d.eta && <span style={{ color: '#0891B2', fontWeight: 600 }}>
                                                    ETA: {d.eta.minutos < 60 ? `${d.eta.minutos}min` : `${Math.floor(d.eta.minutos / 60)}h${d.eta.minutos % 60}min`}
                                                </span>}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}

                {/* F4.7: Painel de alertas ativos */}
                {alerts.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '.75rem 1.25rem' }}>
                        <div style={{ fontSize: '.62rem', fontWeight: 700, color: '#EF4444',
                            textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>
                            ⚠️ Alertas Ativos
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                            {alerts.slice(0, 3).map((a, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.75rem',
                                    padding: '.4rem .75rem', borderRadius: 7,
                                    background: a.type === 'no_signal' ? 'rgba(239,68,68,.1)' :
                                        a.type === 'long_stop' ? 'rgba(245,158,11,.1)' : 'rgba(34,197,94,.1)',
                                    border: `1px solid ${a.type === 'no_signal' ? 'rgba(239,68,68,.2)' :
                                        a.type === 'long_stop' ? 'rgba(245,158,11,.2)' : 'rgba(34,197,94,.2)'}` }}>
                                    <span style={{ fontSize: '.9rem' }}>
                                        {a.type === 'no_signal' ? '🔴' : a.type === 'long_stop' ? '🟡' : '🟢'}
                                    </span>
                                    <span style={{ fontSize: '.75rem', color: '#94A3B8', flex: 1 }}>{a.message}</span>
                                    <span style={{ fontSize: '.65rem', color: '#475569', whiteSpace: 'nowrap' }}>
                                        {new Date(a.timestamp).toLocaleTimeString('pt-BR')}
                                    </span>
                                    <button onClick={() => setAlerts(prev => prev.filter((_, j) => j !== i))}
                                        style={{ background: 'none', border: 'none', color: '#475569',
                                            cursor: 'pointer', fontSize: '.8rem', padding: 0 }}>✕</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            </>
            )}

            {/* F4.4: Drawer lateral do motorista — F5.13: createPortal gerencia scroll lock */}
            <DriverDrawer driver={drawerDriver} onClose={() => {
                setDrawerDriver(null);
                setSelectedDriver(null);
                // F5.13: scroll lock é restaurado automaticamente pelo cleanup do useEffect do DriverDrawer
            }} />

            {drilldownOpen && drilldownType && (
                <ModalPortal>
                    <div
                        onClick={() => setDrilldownOpen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: MODAL_PORTAL_Z_INDEX,
                            background: 'rgba(2, 6, 23, 0.45)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                        }}
                    >
                        <aside
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: 'min(560px, 96vw)',
                                height: '100vh',
                                background: '#FFFFFF',
                                borderLeft: '1px solid #E5E7EB',
                                boxShadow: '-8px 0 30px rgba(15, 23, 42, 0.16)',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div style={{ padding: '1rem 1.1rem', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem', background: 'linear-gradient(135deg, #0F172A, #1E293B)' }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '0.08em', color: '#F8FAFC' }}>
                                        {drilldownTitle[drilldownType]}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                                        {drilldownLoading ? 'Carregando dados...' : `${filteredDrilldownRows.length} de ${drilldownRows.length} registro(s)`}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDrilldownOpen(false)}
                                    style={{ border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.08)', color: '#F8FAFC', borderRadius: 8, padding: '0.35rem 0.6rem', cursor: 'pointer', fontWeight: 700 }}
                                >
                                    Fechar
                                </button>
                            </div>
                            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                                <input
                                    value={drilldownQuery}
                                    onChange={(e) => setDrilldownQuery(e.target.value)}
                                    placeholder="Buscar em todos os campos..."
                                    style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 10, padding: '0.55rem 0.75rem', fontSize: '0.8rem', outline: 'none' }}
                                />
                            </div>
                            <div className="custom-scrollbar" style={{ padding: '0.85rem 1rem', overflowY: 'auto', flex: 1, display: 'grid', gap: '0.65rem', background: '#F8FAFC' }}>
                                {drilldownLoading && <div style={{ fontSize: '0.82rem', color: '#64748B' }}>Buscando informações...</div>}
                                {!drilldownLoading && filteredDrilldownRows.length === 0 && (
                                    <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Nenhum dado encontrado para este indicador.</div>
                                )}
                                {!drilldownLoading && filteredDrilldownRows.map((row, idx) => {
                                    const rowKey = String(row.id || row.uf || row.period || idx);
                                    const quick = drilldownType ? drilldownQuickAction(drilldownType, row as Record<string, unknown>) : null;
                                    return (
                                    <div key={rowKey} style={{ border: `1px solid ${drilldownAccent[drilldownType].border}`, borderRadius: 12, padding: '0.8rem 0.85rem', background: drilldownAccent[drilldownType].bg, boxShadow: '0 2px 10px rgba(15,23,42,0.06)' }}>
                                        {drilldownType === 'coursesActive' && (
                                            <>
                                                <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0F172A' }}>{row.name || 'Curso sem nome'}</div>
                                                <div style={{ fontSize: '0.73rem', color: '#334155' }}>Carga horária: {row.workloadHours ?? row.workload ?? 0}h · Ativo: {row.active === false ? 'Não' : 'Sim'}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 3 }}>Descrição: {row.description || '—'} · Pré-requisitos: {row.prerequisites || '—'}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 3 }}>Ementa: {row.syllabus || '—'}</div>
                                            </>
                                        )}
                                        {drilldownType === 'studentsTotal' && (
                                            <>
                                                <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0F172A' }}>{row.user?.name || 'Aluno sem nome'}</div>
                                                <div style={{ fontSize: '0.73rem', color: '#334155' }}>E-mail: {row.user?.email || '—'} · Telefone: {row.user?.phone || '—'}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 3 }}>CPF: {row.cpf || '—'} · Cidade/UF: {row.address?.city || '—'}/{row.address?.state || '—'} · Matrículas: {row._count?.enrollments ?? 0}</div>
                                            </>
                                        )}
                                        {drilldownType === 'classesActive' && (
                                            <>
                                                <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0F172A' }}>{row.classIdentifier || row.id}</div>
                                                <div style={{ fontSize: '0.73rem', color: '#334155' }}>{row.course?.name || 'Curso —'} · {row.city?.name || 'Cidade —'}/{row.city?.state || '--'} · {row.status}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 3 }}>Período: {row.period || '—'} · Vagas: {row.vacancies ?? 0} · Início: {row.startDate ? new Date(row.startDate).toLocaleDateString('pt-BR') : '—'}</div>
                                            </>
                                        )}
                                        {drilldownType === 'enrollmentsPending' && (
                                            <>
                                                <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0F172A' }}>{row.student?.user?.name || row.student?.name || 'Aluno —'}</div>
                                                <div style={{ fontSize: '0.73rem', color: '#334155' }}>Status: {row.status} · Turma: {row.class?.classIdentifier || row.classId || '—'}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 3 }}>Curso: {row.class?.course?.name || '—'} · Cidade: {row.class?.city?.name || '—'}/{row.class?.city?.state || '--'} · Criado em: {row.createdAt ? new Date(row.createdAt).toLocaleString('pt-BR') : '—'}</div>
                                            </>
                                        )}
                                        {drilldownType === 'statesAvailable' && (
                                            <>
                                                <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0F172A' }}>UF {row.uf}</div>
                                                <div style={{ fontSize: '0.73rem', color: '#334155' }}>Cidades operacionais cadastradas: {row.cities ?? 0}</div>
                                            </>
                                        )}
                                        {drilldownType === 'approvalRate' && (
                                            <>
                                                <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0F172A' }}>{row.period}</div>
                                                <div style={{ fontSize: '0.73rem', color: '#334155' }}>Aprovados: {row.approved} · Total: {row.total} · Taxa: {row.rate}%</div>
                                            </>
                                        )}
                                        {drilldownType === 'attendanceRate' && (
                                            <>
                                                <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0F172A' }}>{row.classIdentifier || row.id}</div>
                                                <div style={{ fontSize: '0.73rem', color: '#334155' }}>{row.course?.name || 'Curso —'} · {row.city?.name || 'Cidade —'}/{row.city?.state || '--'} · {row.status}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 3 }}>Período: {row.period || '—'} · Horário: {row.startTime || '--'} até {row.endTime || '--'} · Local: {row.locationName || '—'}</div>
                                            </>
                                        )}
                                        {drilldownType === 'certificatesIssued' && (
                                            <>
                                                <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0F172A' }}>{row.student?.user?.name || 'Aluno —'}</div>
                                                <div style={{ fontSize: '0.73rem', color: '#334155' }}>{row.class?.course?.name || 'Curso —'} · Código: {row.verificationCode || '—'}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 3 }}>Emissão: {row.issuedAt ? new Date(row.issuedAt).toLocaleString('pt-BR') : '—'} · Status: {row.status || '—'}</div>
                                            </>
                                        )}
                                        {quick && (
                                            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDrilldownOpen(false);
                                                        router.push(quick.href);
                                                    }}
                                                    style={{
                                                        border: `1px solid ${drilldownAccent[drilldownType].border}`,
                                                        background: 'linear-gradient(135deg, #0F172A, #1E293B)',
                                                        color: '#F8FAFC',
                                                        borderRadius: 8,
                                                        fontWeight: 800,
                                                        fontSize: '0.72rem',
                                                        padding: '0.42rem 0.75rem',
                                                        cursor: 'pointer',
                                                        fontFamily: 'Orbitron, sans-serif',
                                                        letterSpacing: '0.04em',
                                                    }}
                                                >
                                                    {quick.label} →
                                                </button>
                                                <Link
                                                    href={quick.href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={() => setDrilldownOpen(false)}
                                                    style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}
                                                >
                                                    Abrir em nova aba
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )})}
                            </div>
                        </aside>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
