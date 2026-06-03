'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { classesApi } from '@/lib/api/classes';
import { acoesApi, type Acao } from '@/lib/api/acoes';
import api from '@/lib/api/client';
import {
    ArrowLeftIcon,
    PencilIcon,
    ChartBarIcon,
    CheckCircleIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import { computeClassReadinessWarnings } from '@/lib/admin/classReadiness';
import type { Class } from '@/lib/api/classes';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import { ADMIN_PAGE_SIZE_TABLE } from '@/lib/api/pagination';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    PLANNED:           { label: 'Planejada',          color: '#9CA3AF', bg: '#F9FAFB',                  border: '#E5E7EB' },
    ENROLLMENT_OPEN:   { label: 'Matrículas Abertas', color: '#059669', bg: 'rgba(5,150,105,0.08)',     border: 'rgba(5,150,105,0.3)' },
    ENROLLMENT_CLOSED: { label: 'Matrículas Fechadas',color: '#D97706', bg: 'rgba(217,119,6,0.08)',     border: 'rgba(217,119,6,0.3)' },
    IN_PROGRESS:       { label: 'Em Andamento',       color: '#2563EB', bg: 'rgba(37,99,235,0.08)',     border: 'rgba(37,99,235,0.3)' },
    COMPLETED:         { label: 'Concluída',           color: '#7C3AED', bg: 'rgba(124,58,237,0.08)',    border: 'rgba(124,58,237,0.3)' },
    CANCELLED:         { label: 'Cancelada',           color: '#DC2626', bg: 'rgba(220,38,38,0.08)',     border: 'rgba(220,38,38,0.3)' },
};

const ALL_STATUSES = ['PLANNED','ENROLLMENT_OPEN','ENROLLMENT_CLOSED','IN_PROGRESS','COMPLETED','CANCELLED'];
const EDITABLE_STATUSES = ['PLANNED','ENROLLMENT_OPEN','ENROLLMENT_CLOSED','IN_PROGRESS','COMPLETED','CANCELLED'];

const PERIOD_LABEL: Record<string, string> = {
    MORNING: '🌅 Manhã', AFTERNOON: '☀ Tarde', EVENING: '🌙 Noite',
};

const ACAO_STATUS_LABEL: Record<string, string> = {
    PLANEJADA: 'Planejada',
    EM_ANDAMENTO: 'Em andamento',
    CONCLUIDA: 'Concluída',
    CANCELADA: 'Cancelada',
};

export interface TurmaDetailWorkspaceProps {
    classId: string;
    /** `drawer`: painel lateral na lista de turmas; `page`: rota dedicada */
    mode?: 'page' | 'drawer';
    onClose?: () => void;
    /** Chamado após guardar turma ou status (ex.: refrescar lista) */
    onUpdated?: () => void;
    /** No modo gaveta, abre estatísticas sem navegar para outra rota */
    onRequestStats?: () => void;
    /** Ao abrir a partir do lápis na lista, abre directamente o modal “Editar Turma”. */
    openEditOnMount?: boolean;
}

export default function TurmaDetailWorkspace({
    classId,
    mode = 'page',
    onClose,
    onUpdated,
    onRequestStats,
    openEditOnMount = false,
}: TurmaDetailWorkspaceProps) {
    const id = classId;
    const router = useRouter();
    const [turma, setTurma] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'alunos' | 'frequencia' | 'vinculos' | 'info' | 'periodo'>('alunos');
    const [enrollPage, setEnrollPage] = useState(1);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [savingStatus, setSavingStatus] = useState(false);
    const [statusError, setStatusError] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState('');
    const [editForm, setEditForm] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [trucks, setTrucks] = useState<any[]>([]);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);
    const [acoesParaVincular, setAcoesParaVincular] = useState<Acao[]>([]);
    const [loadingAcoesPeriodo, setLoadingAcoesPeriodo] = useState(false);
    const [periodoPickerAcaoId, setPeriodoPickerAcaoId] = useState('');
    const [linkingPeriodo, setLinkingPeriodo] = useState(false);
    const didAutoOpenEdit = useRef(false);
    // MEL-06: vínculo professor↔turma
    const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
    const [showTeacherModal, setShowTeacherModal] = useState(false);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [teacherConfirmStep, setTeacherConfirmStep] = useState(false);
    const [assigningTeacher, setAssigningTeacher] = useState(false);
    const [removingTeacherId, setRemovingTeacherId] = useState<string | null>(null);
    const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
    const [driverAcaoId, setDriverAcaoId] = useState('');
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [assigningDriverTurma, setAssigningDriverTurma] = useState(false);

    useEffect(() => { load(); }, [classId]);
    useEffect(() => {
        didAutoOpenEdit.current = false;
    }, [classId, openEditOnMount]);

    useEffect(() => {
        Promise.all([
            api.get('/courses').then(r => Array.isArray(r.data) ? r.data : r.data?.data || []),
            api.get('/groups').then(r => Array.isArray(r.data) ? r.data : r.data?.data || []),
            api.get('/cities').then(r => Array.isArray(r.data) ? r.data : r.data?.data || []),
            api.get('/trucks').then(r => Array.isArray(r.data) ? r.data : r.data?.data || []),
        ]).then(([c, g, ci, t]) => {
            setCourses(c);
            setGroups(g);
            setCities(ci);
            setTrucks(t);
        }).catch(() => {});
        // MEL-06: busca professores disponíveis
        api.get('/users?role=TEACHER')
            .then(r => {
                const list = Array.isArray(r.data) ? r.data : r.data?.data || [];
                setAvailableTeachers(list.filter((u: any) => u.active !== false));
            })
            .catch(() => {});
        api.get('/users?role=DRIVER')
            .then(r => {
                const list = Array.isArray(r.data) ? r.data : r.data?.data || [];
                setAvailableDrivers(list.filter((u: any) => u.active !== false));
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (activeTab !== 'periodo' || !turma?.id) return;
        const linkedIds = new Set((turma.acaoTurmas || []).map((x: { acaoId: string }) => x.acaoId));
        const params: { grupoId?: string; cidadeId?: string } = {};
        if (turma.groupId) params.grupoId = turma.groupId;
        if (turma.cityId) params.cidadeId = turma.cityId;
        setLoadingAcoesPeriodo(true);
        acoesApi
            .listar(Object.keys(params).length ? params : undefined)
            .then((list) =>
                setAcoesParaVincular(
                    list.filter((a: Acao) => !linkedIds.has(a.id) && a.status !== 'CANCELADA'),
                ),
            )
            .catch(() => setAcoesParaVincular([]))
            .finally(() => setLoadingAcoesPeriodo(false));
    }, [activeTab, turma]);

    async function load() {
        setLoading(true);
        try {
            const [cls, st] = await Promise.all([
                classesApi.getOne(id),
                classesApi.getStatistics(id).catch(() => null),
            ]);

            // BUG-13 Fallback: Se módulos não vieram populados na turma, buscar do curso diretamente
            if (cls?.courseId && (!cls.course || !(cls.course as any).modules || (cls.course as any).modules.length === 0)) {
                try {
                    const cRes = await api.get(`/courses/${cls.courseId}`);
                    if (cRes.data && Array.isArray(cRes.data.modules)) {
                        if (!cls.course) cls.course = { id: cls.courseId, name: cRes.data.name } as any;
                        (cls.course as any).modules = cRes.data.modules;
                    }
                } catch { }
            }

            setTurma(cls);
            setStats(st);
        } catch {
            if (mode === 'drawer' && onClose) onClose();
            else router.replace('/admin/turmas');
        } finally {
            setLoading(false);
        }
    }

    async function handleStatusSave() {
        if (!selectedStatus || !turma) return;
        setSavingStatus(true);
        setStatusError('');
        try {
            await classesApi.updateStatus(id, selectedStatus);
            setShowStatusModal(false);
            showToast('Status atualizado com sucesso!', 'success');
            const warns = computeClassReadinessWarnings(
                turma as Class & { enrollments?: Array<{ status?: string }>; _count?: { enrollments?: number } },
                selectedStatus,
            );
            if (warns.some((w) => w.severity === 'warning')) {
                setTimeout(
                    () =>
                        showToast(
                            'Ainda há avisos de consistência — reveja vínculos em Períodos de curso ou complete o cadastro da turma.',
                            'warning',
                        ),
                    400,
                );
            }
            onUpdated?.();
            load();
        } catch (e: any) {
            setStatusError(e?.response?.data?.message || 'Erro ao atualizar status');
        } finally {
            setSavingStatus(false);
        }
    }

    async function handleAssignDriverTurma() {
        const acaoId = driverAcaoId || (turma?.acaoTurmas?.[0] as any)?.acaoId;
        if (!acaoId || !selectedDriverId) return;
        setAssigningDriverTurma(true);
        try {
            const res = await acoesApi.assignDriverTurma(acaoId, id, selectedDriverId);
            const n = res?.generated ?? 0;
            showToast(
                n > 0
                    ? `Motorista vinculado — ${n} viagem(ns) gerada(s) para esta turma.`
                    : res?.message || 'Motorista vinculado à turma.',
                'success',
            );
            setSelectedDriverId('');
            onUpdated?.();
            await load();
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Não foi possível vincular o motorista.', 'error');
        } finally {
            setAssigningDriverTurma(false);
        }
    }

    async function handleVincularPeriodo() {
        if (!periodoPickerAcaoId) return;
        setLinkingPeriodo(true);
        try {
            await acoesApi.addTurma(periodoPickerAcaoId, id);
            setPeriodoPickerAcaoId('');
            showToast('Turma ligada ao período de curso. A lista e os vínculos foram atualizados.', 'success');
            onUpdated?.();
            await load();
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Não foi possível vincular. Tente na ficha do período de curso.', 'error');
        } finally {
            setLinkingPeriodo(false);
        }
    }

    function showToast(msg: string, type: 'success' | 'error' | 'warning') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }

    function openEditModalFromTurma(t: typeof turma) {
        if (!t) return;
        setEditError('');
        setEditForm({
            classIdentifier: t.classIdentifier || '',
            courseId: t.courseId || '',
            groupId: t.groupId || '',
            cityId: t.cityId || '',
            period: t.period || 'MORNING',
            startTime: t.startTime || '07:00',
            endTime: t.endTime || '12:00',
            startDate: t.startDate ? new Date(t.startDate).toISOString().slice(0, 10) : '',
            endDate: t.endDate ? new Date(t.endDate).toISOString().slice(0, 10) : '',
            vacancies: t.vacancies ?? 30,
            reserveSlots: t.reserveSlots ?? 0,
            truckId: t.truckId || '',
            status: t.status || 'PLANNED',
            enrollmentOpenDate: t.enrollmentOpenDate ? new Date(t.enrollmentOpenDate).toISOString().slice(0, 10) : '',
            enrollmentCloseDate: t.enrollmentCloseDate ? new Date(t.enrollmentCloseDate).toISOString().slice(0, 10) : '',
        });
        setShowEditModal(true);
    }

    function openEditModal() {
        openEditModalFromTurma(turma);
    }

    useEffect(() => {
        if (!openEditOnMount || loading || !turma || didAutoOpenEdit.current) return;
        didAutoOpenEdit.current = true;
        openEditModalFromTurma(turma);
    }, [openEditOnMount, loading, turma]);

    // MEL-06: vincular professor à turma (com modal de confirmação)
    async function handleAssignTeacher() {
        if (!selectedTeacherId || assigningTeacher) return;
        setAssigningTeacher(true);
        try {
            const teacherUser = availableTeachers.find(u => u.id === selectedTeacherId);
            if (!teacherUser) throw new Error('Professor não encontrado');
            // Backend aceita User.id ou Teacher.id (BUG-19 / Sprint 3)
            const res = await api.post(`/classes/${id}/teachers/${selectedTeacherId}`);
            const synced = res.data?.syncedToCourse || res.data?.academicSync?.courseLinks > 0;
            showToast(
                synced
                    ? 'Professor vinculado à turma e ao curso base.'
                    : 'Professor vinculado à turma com sucesso!',
                'success',
            );
            setShowTeacherModal(false);
            setTeacherConfirmStep(false);
            setSelectedTeacherId('');
            load();
            onUpdated?.();
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Não foi possível vincular o professor.', 'error');
        } finally {
            setAssigningTeacher(false);
        }
    }

    async function handleRemoveTeacher(classTeacherId: string) {
        setRemovingTeacherId(classTeacherId);
        try {
            await api.delete(`/classes/${id}/teachers/${classTeacherId}`);
            showToast('Professor desvinculado.', 'success');
            load();
            onUpdated?.();
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Erro ao desvincular professor.', 'error');
        } finally {
            setRemovingTeacherId(null);
        }
    }

    async function handleEditSave() {
        if (!editForm) return;
        setSavingEdit(true);
        setEditError('');
        try {
            await classesApi.update(id, {
                ...editForm,
                vacancies: Number(editForm.vacancies),
                reserveSlots: Number(editForm.reserveSlots || 0),
                truckId: editForm.truckId || undefined,
                enrollmentOpenDate: editForm.enrollmentOpenDate || undefined,
                enrollmentCloseDate: editForm.enrollmentCloseDate || undefined,
            });
            setShowEditModal(false);
            showToast('Turma atualizada com sucesso!', 'success');
            onUpdated?.();
            load();
        } catch (e: any) {
            setEditError(e?.response?.data?.message || 'Erro ao salvar alterações da turma.');
        } finally {
            setSavingEdit(false);
        }
    }

    const statusModalWarnings = useMemo(() => {
        if (!turma || !selectedStatus || !showStatusModal) return [];
        return computeClassReadinessWarnings(
            turma as Class & { enrollments?: Array<{ status?: string }>; _count?: { enrollments?: number } },
            selectedStatus,
        );
    }, [turma, selectedStatus, showStatusModal]);

    if (loading) return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
            <div style={{ textAlign:'center' }}>
                <div className="spinner" style={{ margin:'0 auto 1rem' }} />
                <p style={{ fontFamily:'Orbitron', fontSize:'0.7rem', letterSpacing:'0.15em', color:'var(--text-muted)' }}>CARREGANDO TURMA...</p>
            </div>
        </div>
    );

    if (!turma) return null;

    const cfg = STATUS_CFG[turma.status] || STATUS_CFG.PLANNED;
    // enrollments reais vêm de turma.enrollments (classesApi.getOne inclui a relação)
    // stats.enrollments é { total, approved, pending } — objeto de métricas, não array
    const enrollments: any[] = Array.isArray(turma?.enrollments) ? turma.enrollments : [];
    const enrollTotalPages = Math.max(1, Math.ceil(enrollments.length / ADMIN_PAGE_SIZE_TABLE));
    const enrollmentsPaged = enrollments.slice((enrollPage - 1) * ADMIN_PAGE_SIZE_TABLE, enrollPage * ADMIN_PAGE_SIZE_TABLE);
    const attendanceHistory: any[] = stats?.attendanceHistory || [];
    const totalPresent = stats?.attendance?.present ?? 0;
    const totalAbsent = (stats?.attendance?.total ?? 0) - totalPresent;
    const avgRate = stats?.attendance?.rate ?? 0;
    const teacherNames = Array.isArray(turma?.teachers)
        ? turma.teachers.map((t: any) => t?.teacher?.user?.name).filter(Boolean)
        : [];
    const enrolledNow = enrollments.filter((e: any) => ['ENROLLED', 'APPROVED'].includes(e.status)).length;
    const modules = Array.isArray(turma?.course?.modules) ? turma.course.modules : [];
    const linkedActions = Array.isArray(turma?.acaoTurmas) ? turma.acaoTurmas : [];

    const startDate = new Date(turma.startDate);
    const endDate = new Date(turma.endDate);
    const today = new Date();
    const daysTotal = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
    const daysLeft = Math.max(0, Math.round((endDate.getTime() - today.getTime()) / 86400000));
    const progress = Math.min(100, Math.max(0, Math.round(((today.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100)));

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }} className="animate-fade-in">
            {/* Toast */}
            {toast && (
                <div style={{
                    position:'fixed', top:20, right:20, zIndex:9999,
                    background: toast.type === 'success' ? '#059669' : toast.type === 'warning' ? '#D97706' : '#DC2626',
                    color:'#fff', padding:'0.75rem 1.25rem', borderRadius:10,
                    fontWeight:600, fontSize:'0.85rem', boxShadow:'0 4px 20px rgba(0,0,0,0.3)',
                    animation:'fadeIn 0.2s',
                }}>
                    {toast.type === 'success' ? '✓ ' : toast.type === 'warning' ? '⚠ ' : '✕ '}{toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                    {mode === 'drawer' && onClose ? (
                        <button
                            type="button"
                            onClick={onClose}
                            title="Fechar"
                            style={{
                                display:'flex', alignItems:'center', justifyContent:'center',
                                width:36, height:36, borderRadius:9,
                                background:'rgba(255,214,0,0.08)', border:'1px solid rgba(255,214,0,0.3)',
                                color:'#B89B00', cursor:'pointer', transition:'all 0.2s',
                            }}
                        >
                            <ArrowLeftIcon style={{ width:16, height:16 }} />
                        </button>
                    ) : (
                        <Link href="/admin/turmas" style={{
                            display:'flex', alignItems:'center', justifyContent:'center',
                            width:36, height:36, borderRadius:9,
                            background:'rgba(255,214,0,0.08)', border:'1px solid rgba(255,214,0,0.3)',
                            color:'#B89B00', textDecoration:'none', transition:'all 0.2s',
                        }}>
                            <ArrowLeftIcon style={{ width:16, height:16 }} />
                        </Link>
                    )}
                    <div>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
                            <h1 className="gradient-text" style={{ fontFamily:'Orbitron', fontSize:'1.75rem', fontWeight:900, letterSpacing:'0.08em' }}>
                                {turma.classIdentifier}
                            </h1>
                            <span style={{
                                padding:'0.3rem 0.85rem', borderRadius:100,
                                fontSize:'0.7rem', fontWeight:700,
                                background: cfg.bg, color: cfg.color, border:`1px solid ${cfg.border}`,
                            }}>
                                {cfg.label}
                            </span>
                        </div>
                        <p style={{ color:'var(--text-muted)', fontSize:'0.82rem', marginTop:'0.2rem' }}>
                            {turma.course?.name || '—'} · {turma.city?.name || '—'} ({turma.city?.state || '—'})
                        </p>
                    </div>
                </div>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                    <button
                        onClick={openEditModal}
                        style={{
                            display:'flex', alignItems:'center', gap:6,
                            padding:'0.55rem 1.1rem', borderRadius:10,
                            background:'rgba(255,214,0,0.08)', border:'1px solid rgba(255,214,0,0.3)',
                            color:'#B89B00', fontWeight:700, fontSize:'0.8rem', cursor:'pointer',
                        }}
                    >
                        <PencilIcon style={{ width:14, height:14 }} />
                        Editar Turma
                    </button>
                    {mode === 'drawer' && onRequestStats ? (
                        <button
                            type="button"
                            onClick={onRequestStats}
                            style={{
                                display:'flex', alignItems:'center', gap:6,
                                padding:'0.55rem 1.1rem', borderRadius:10,
                                background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.3)',
                                color:'#7C3AED', fontWeight:700, fontSize:'0.8rem', cursor:'pointer',
                            }}
                        >
                            <ChartBarIcon style={{ width:14, height:14 }} />
                            Ver Mais
                        </button>
                    ) : (
                        <Link href={`/admin/turmas/${id}/estatisticas`} style={{
                            display:'flex', alignItems:'center', gap:6,
                            padding:'0.55rem 1.1rem', borderRadius:10,
                            background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.3)',
                            color:'#7C3AED', fontWeight:700, fontSize:'0.8rem', textDecoration:'none',
                        }}>
                            <ChartBarIcon style={{ width:14, height:14 }} />
                            Ver Mais
                        </Link>
                    )}
                    <button
                        onClick={() => { setSelectedStatus(turma.status); setShowStatusModal(true); }}
                        style={{
                            display:'flex', alignItems:'center', gap:6,
                            padding:'0.55rem 1.1rem', borderRadius:10,
                            background:'rgba(0,245,255,0.08)', border:'1px solid rgba(0,245,255,0.3)',
                            color:'#0E7490', fontWeight:700, fontSize:'0.8rem', cursor:'pointer',
                        }}
                    >
                        Alterar Status
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'1rem' }}>
                {[
                    { label:'Vagas',         value: turma.vacancies,    color:'#B89B00', icon:'🪑' },
                    { label:'Inscritos',     value: enrollments.length, color:'#2563EB', icon:'👥' },
                    { label:'Freq. Média',   value: `${Math.round(avgRate)}%`, color: avgRate >= 75 ? '#059669' : '#DC2626', icon:'📊' },
                    { label:'Dias Restantes',value: daysLeft,           color:'#7C3AED', icon:'📅' },
                ].map((kpi, i) => (
                    <div key={i} className="glass-card animate-scale-in" style={{ animationDelay:`${i*60}ms`, padding:'1rem' }}>
                        <div style={{ fontSize:'1.5rem', marginBottom:'0.4rem' }}>{kpi.icon}</div>
                        <div style={{ fontFamily:'Orbitron', fontWeight:900, fontSize:'1.6rem', color: kpi.color }}>{kpi.value}</div>
                        <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700 }}>{kpi.label}</div>
                    </div>
                ))}
            </div>

            {/* Progress bar período */}
            {turma.status === 'IN_PROGRESS' && (
                <div className="glass-card" style={{ padding:'1rem 1.25rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem', fontSize:'0.75rem', color:'var(--text-muted)', fontWeight:600 }}>
                        <span>Início: {startDate.toLocaleDateString('pt-BR')}</span>
                        <span style={{ color:'#B89B00', fontFamily:'Orbitron', fontWeight:800 }}>{progress}% concluído</span>
                        <span>Término: {endDate.toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="progress-bar" style={{ height:8 }}>
                        <div className="progress-fill" style={{ width:`${progress}%`, background:'linear-gradient(90deg,#FFD600,#B89B00)' }} />
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', padding:'0.3rem', background:'#F3F4F6', borderRadius:12, width:'100%', maxWidth:'100%' }}>
                {[
                    { key:'alunos', label:'👥 Alunos', count: enrollments.length },
                    { key:'frequencia', label:'📊 Frequência', count: attendanceHistory.length },
                    { key:'vinculos', label:'🔗 Vínculos', count: modules.length + linkedActions.length },
                    { key:'info', label:'ℹ️ Informações' },
                    { key:'periodo', label:'📆 Período de curso', count: linkedActions.length },
                ].map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key as any)}
                        style={{
                            padding:'0.5rem 1rem', borderRadius:9, fontSize:'0.8rem', fontWeight:700,
                            cursor:'pointer', transition:'all 0.2s', border:'none',
                            background: activeTab === t.key ? '#FFD600' : 'transparent',
                            color: activeTab === t.key ? '#000' : '#6B7280',
                            boxShadow: activeTab === t.key ? '0 2px 8px rgba(255,214,0,0.3)' : 'none',
                        }}
                    >
                        {t.label}{'count' in t ? ` (${t.count})` : ''}
                    </button>
                ))}
            </div>

            {/* Tab: Alunos */}
            {activeTab === 'alunos' && (
                enrollments.length === 0 ? (
                    <div className="glass-card" style={{ textAlign:'center', padding:'4rem' }}>
                        <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>👥</div>
                        <p style={{ fontFamily:'Orbitron', fontSize:'0.75rem', letterSpacing:'0.15em', color:'var(--text-muted)' }}>NENHUM ALUNO MATRICULADO</p>
                        <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginTop:'0.5rem' }}>
                            Abra as inscrições para a turma começar a receber alunos
                        </p>
                    </div>
                ) : (
                    <>
                    <div className="glass-card" style={{ padding:0, overflow:'hidden' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Aluno</th>
                                    <th>CPF</th>
                                    <th>Status</th>
                                    <th>Frequência</th>
                                    <th>Protocolo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enrollmentsPaged.map((enr: any) => {
                                    const rate = enr.attendanceRate ?? null;
                                    const statusColors: Record<string, string> = {
                                        ENROLLED:'#059669', PENDING:'#D97706', CANCELLED:'#DC2626',
                                        WAITLISTED:'#6B7280', COMPLETED:'#7C3AED',
                                    };
                                    const statusLabels: Record<string, string> = {
                                        ENROLLED:'Matriculado', PENDING:'Pendente', CANCELLED:'Cancelado',
                                        WAITLISTED:'Lista de Espera', COMPLETED:'Concluído',
                                    };
                                    return (
                                        <tr key={enr.id}>
                                            <td style={{ fontWeight:600, color:'#111827' }}>{enr.student?.user?.name || enr.studentName || '—'}</td>
                                            <td style={{ fontFamily:'JetBrains Mono', fontSize:'0.75rem', color:'#9CA3AF' }}>{enr.student?.cpf || '—'}</td>
                                            <td>
                                                <span style={{
                                                    padding:'0.2rem 0.6rem', borderRadius:100, fontSize:'0.65rem', fontWeight:700,
                                                    background: (statusColors[enr.status] || '#9CA3AF') + '18',
                                                    color: statusColors[enr.status] || '#9CA3AF',
                                                    border:`1px solid ${(statusColors[enr.status] || '#9CA3AF')}30`,
                                                }}>
                                                    {statusLabels[enr.status] || enr.status}
                                                </span>
                                            </td>
                                            <td>
                                                {rate !== null ? (
                                                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                                                        <div className="progress-bar" style={{ width:60, height:5 }}>
                                                            <div className="progress-fill" style={{ width:`${rate}%`, background: rate >= 75 ? '#059669' : '#DC2626' }} />
                                                        </div>
                                                        <span style={{ fontFamily:'Orbitron', fontWeight:700, fontSize:'0.75rem', color: rate >= 75 ? '#059669' : '#DC2626' }}>
                                                            {Math.round(rate)}%
                                                        </span>
                                                    </div>
                                                ) : <span style={{ color:'#9CA3AF', fontSize:'0.75rem' }}>—</span>}
                                            </td>
                                            <td style={{ fontFamily:'JetBrains Mono', fontSize:'0.72rem', color:'#9CA3AF' }}>{enr.protocol || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <AdminListPagination
                        page={enrollPage}
                        totalPages={enrollTotalPages}
                        total={enrollments.length}
                        onPageChange={setEnrollPage}
                        itemLabel="aluno(s)"
                        style={{ marginTop: 12 }}
                    />
                </>
                )
            )}

            {/* Tab: Vínculos amplos */}
            {activeTab === 'vinculos' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                    <div className="glass-card" style={{ padding:'1rem' }}>
                        <h3 style={{ fontFamily:'Orbitron', fontSize:'0.72rem', letterSpacing:'0.1em', color:'#6B7280', marginBottom:'0.75rem' }}>
                            MÓDULOS DO CURSO ({modules.length})
                        </h3>
                        {modules.length === 0 ? (
                            <p style={{ color:'#9CA3AF', fontSize:'0.78rem' }}>Nenhum módulo estruturado vinculado.</p>
                        ) : (
                            <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                                {modules.slice(0, 12).map((m: any) => (
                                    <div key={m.id} style={{ border:'1px solid #E5E7EB', borderRadius:9, padding:'0.55rem 0.7rem' }}>
                                        <div style={{ fontSize:'0.8rem', fontWeight:700, color:'#111827' }}>{m.order}. {m.moduleName}</div>
                                        <div style={{ fontSize:'0.72rem', color:'#6B7280' }}>Sala {m.room} • {m.startTime} - {m.endTime}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="glass-card" style={{ padding:'1rem' }}>
                        <h3 style={{ fontFamily:'Orbitron', fontSize:'0.72rem', letterSpacing:'0.1em', color:'#6B7280', marginBottom:'0.75rem' }}>
                            MATERIAIS / CERTIFICAÇÃO
                        </h3>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem' }}>
                            <div style={{ border:'1px solid #E5E7EB', borderRadius:10, padding:'0.75rem' }}>
                                <div style={{ fontSize:'0.66rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6B7280' }}>Materiais vinculados</div>
                                <div style={{ fontFamily:'Orbitron', fontWeight:900, fontSize:'1.2rem', color:'#0891B2' }}>{turma?._count?.materials ?? 0}</div>
                            </div>
                            <div style={{ border:'1px solid #E5E7EB', borderRadius:10, padding:'0.75rem' }}>
                                <div style={{ fontSize:'0.66rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6B7280' }}>Certificados emitidos</div>
                                <div style={{ fontFamily:'Orbitron', fontWeight:900, fontSize:'1.2rem', color:'#7C3AED' }}>{turma?._count?.certificates ?? 0}</div>
                            </div>
                        </div>
                        <p style={{ marginTop:'0.7rem', fontSize:'0.74rem', color:'#6B7280' }}>
                            Esse consolidado permite validar prontidão da turma para conclusão e emissão final.
                        </p>
                    </div>

                    <div className="glass-card" style={{ padding:'1rem', gridColumn:'1 / -1' }}>
                        <h3 style={{ fontFamily:'Orbitron', fontSize:'0.72rem', letterSpacing:'0.1em', color:'#6B7280', marginBottom:'0.75rem' }}>
                            PERÍODOS/AÇÕES VINCULADAS ({linkedActions.length})
                        </h3>
                        {linkedActions.length === 0 ? (
                            <p style={{ color:'#9CA3AF', fontSize:'0.78rem' }}>Nenhum período operacional vinculado.</p>
                        ) : (
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'0.6rem' }}>
                                {linkedActions.map((item: any) => (
                                    <div key={item.id} style={{ border:'1px solid #E5E7EB', borderRadius:10, padding:'0.7rem 0.8rem' }}>
                                        <div style={{ fontSize:'0.82rem', fontWeight:700, color:'#111827' }}>{item.acao?.nome || 'Período'}</div>
                                        <div style={{ fontSize:'0.72rem', color:'#6B7280' }}>
                                            {item.acao?.cidadeNome || 'Cidade n/d'} • {ACAO_STATUS_LABEL[item.acao?.status || ''] || item.acao?.status || 'Status n/d'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: Frequência */}
            {activeTab === 'frequencia' && (
                attendanceHistory.length === 0 ? (
                    <div className="glass-card" style={{ textAlign:'center', padding:'4rem' }}>
                        <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📊</div>
                        <p style={{ fontFamily:'Orbitron', fontSize:'0.75rem', letterSpacing:'0.15em', color:'var(--text-muted)' }}>NENHUMA FREQUÊNCIA REGISTRADA</p>
                        <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginTop:'0.5rem' }}>O professor deve lançar frequência pelo portal do professor</p>
                    </div>
                ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                        {attendanceHistory.map((day: any, i: number) => (
                            <div key={i} className="glass-card animate-scale-in" style={{ animationDelay:`${i*40}ms`, padding:'0.85rem 1.25rem', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'0.5rem' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                                    <div style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:'0.85rem', color:'#B89B00' }}>
                                        {new Date(day.date).toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'2-digit' })}
                                    </div>
                                    <div style={{ display:'flex', gap:'0.75rem', fontSize:'0.8rem' }}>
                                        <span style={{ color:'#059669', display:'flex', alignItems:'center', gap:4 }}>
                                            <CheckCircleIcon style={{ width:14 }} />{day.presentCount} presentes
                                        </span>
                                        <span style={{ color:'#DC2626', display:'flex', alignItems:'center', gap:4 }}>
                                            <XCircleIcon style={{ width:14 }} />{day.absentCount} faltas
                                        </span>
                                    </div>
                                </div>
                                <div style={{ fontFamily:'Orbitron', fontWeight:900, fontSize:'0.9rem', color: day.rate >= 75 ? '#059669' : '#DC2626' }}>
                                    {Math.round(day.rate || 0)}%
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Tab: Info */}
            {activeTab === 'info' && (
                <div className="glass-card" style={{ padding:'1.5rem' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1.5rem' }}>
                        {[
                            { label:'Código da Turma', value: turma.classIdentifier, mono: true },
                            { label:'Curso', value: turma.course?.name || '—' },
                            { label:'Grupo', value: turma.group?.name || '—' },
                            { label:'Cidade', value: `${turma.city?.name || '—'} – ${turma.city?.state || '—'}` },
                            { label:'Período', value: PERIOD_LABEL[turma.period] || turma.period },
                            { label:'Horário', value: `${turma.startTime} – ${turma.endTime}`, mono: true },
                            { label:'Início', value: startDate.toLocaleDateString('pt-BR') },
                            { label:'Término', value: endDate.toLocaleDateString('pt-BR') },
                            { label:'Vagas', value: `${turma.vacancies} vagas` },
                            { label:'Reservas', value: turma.reserveSlots ? `${turma.reserveSlots} reservas` : '—' },
                            { label:'Carreta', value: turma.truck?.identifier || '—' },
                            { label:'Motorista/Veículo', value: turma.truck ? `${turma.truck.identifier}${turma.truck.licensePlate ? ` (${turma.truck.licensePlate})` : ''}` : 'Não vinculado' },
                            { label:'Alunos ativos agora', value: `${enrolledNow} aluno(s)` },
                            { label:'Status', value: STATUS_CFG[turma.status]?.label || turma.status },
                        ].map((item, i) => (
                            <div key={i}>
                                <div style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'0.3rem' }}>
                                    {item.label}
                                </div>
                                <div style={{ fontSize:'0.88rem', fontWeight:600, color:'#111827', fontFamily: item.mono ? 'JetBrains Mono' : 'inherit' }}>
                                    {item.value}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* MEL-06: Seção de Professores com ação de vínculo */}
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #F3F4F6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <div style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                                Professores Vinculados
                            </div>
                            <button
                                onClick={() => { setSelectedTeacherId(''); setTeacherConfirmStep(false); setShowTeacherModal(true); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '0.35rem 0.8rem', borderRadius: 8,
                                    background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.25)',
                                    color: '#1E40AF', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer',
                                }}
                            >
                                + Vincular Professor
                            </button>
                        </div>
                        {Array.isArray(turma?.teachers) && turma.teachers.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {turma.teachers.map((ct: any) => {
                                    const name = ct?.teacher?.user?.name || 'Professor';
                                    const email = ct?.teacher?.user?.email || '';
                                    return (
                                        <div key={ct.id} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '0.5rem 0.75rem', borderRadius: 9,
                                            background: '#F9FAFB', border: '1px solid #E5E7EB',
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{name}</div>
                                                {email && <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{email}</div>}
                                            </div>
                                            <button
                                                onClick={() => handleRemoveTeacher(ct.teacherId)}
                                                disabled={removingTeacherId === ct.teacherId}
                                                style={{
                                                    padding: '0.3rem 0.6rem', borderRadius: 7,
                                                    background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)',
                                                    color: '#DC2626', fontWeight: 700, fontSize: '0.68rem',
                                                    cursor: removingTeacherId === ct.teacherId ? 'not-allowed' : 'pointer',
                                                    opacity: removingTeacherId === ct.teacherId ? 0.6 : 1,
                                                }}
                                            >
                                                {removingTeacherId === ct.teacherId ? '...' : '✕ Desvincular'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ fontSize: '0.85rem', color: '#9CA3AF', fontStyle: 'italic' }}>Nenhum professor vinculado</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'periodo' && (
                <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                    <div className="glass-card" style={{ padding:'1.25rem' }}>
                        <h3 style={{ fontFamily:'Orbitron', fontSize:'0.72rem', letterSpacing:'0.1em', color:'#6B7280', marginBottom:'0.6rem' }}>
                            PERÍODO DE CURSO LIGADO A ESTA TURMA
                        </h3>
                        <p style={{ fontSize:'0.82rem', color:'#6B7280', marginBottom:'1rem', lineHeight:1.5 }}>
                            Aqui você vê em que período de curso (execução em campo) esta turma está cadastrada. Sem esse vínculo, inscrições e aulas podem continuar, mas viagens, equipe e custos ficam desligados do calendário operacional.
                        </p>
                        {linkedActions.length === 0 ? (
                            <p style={{ color:'#9CA3AF', fontSize:'0.85rem', marginBottom:'1rem' }}>
                                Nenhum período de curso ligado a esta turma.
                            </p>
                        ) : (
                            <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
                                {linkedActions.map((item: { id: string; acaoId: string; acao?: { id?: string; nome?: string; status?: string; cidadeNome?: string; dataInicio?: string; dataFim?: string } }) => {
                                    const aid = item.acao?.id || item.acaoId;
                                    return (
                                        <div
                                            key={item.id}
                                            style={{
                                                border:'1px solid #E5E7EB',
                                                borderRadius:12,
                                                padding:'1rem',
                                                display:'flex',
                                                flexWrap:'wrap',
                                                justifyContent:'space-between',
                                                gap:'0.75rem',
                                                alignItems:'flex-start',
                                            }}
                                        >
                                            <div style={{ minWidth:0, flex:'1 1 200px' }}>
                                                <div style={{ fontWeight:800, fontSize:'0.95rem', color:'#111827' }}>{item.acao?.nome || 'Período de curso'}</div>
                                                <div style={{ fontSize:'0.78rem', color:'#6B7280', marginTop:4 }}>
                                                    {item.acao?.cidadeNome || '—'} · {ACAO_STATUS_LABEL[item.acao?.status || ''] || item.acao?.status || '—'}
                                                </div>
                                                {item.acao?.dataInicio && item.acao?.dataFim ? (
                                                    <div style={{ fontSize:'0.75rem', color:'#9CA3AF', marginTop:6 }}>
                                                        {new Date(item.acao.dataInicio).toLocaleDateString('pt-BR')} — {new Date(item.acao.dataFim).toLocaleDateString('pt-BR')}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <Link
                                                href={`/admin/acoes/${aid}`}
                                                style={{
                                                    display:'inline-flex',
                                                    alignItems:'center',
                                                    padding:'0.45rem 0.9rem',
                                                    borderRadius:9,
                                                    background:'rgba(255,214,0,0.12)',
                                                    border:'1px solid rgba(255,214,0,0.35)',
                                                    color:'#B45309',
                                                    fontWeight:800,
                                                    fontSize:'0.78rem',
                                                    textDecoration:'none',
                                                    whiteSpace:'nowrap',
                                                }}
                                            >
                                                Abrir ficha do período
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="glass-card" style={{ padding:'1.25rem' }}>
                        <h3 style={{ fontFamily:'Orbitron', fontSize:'0.72rem', letterSpacing:'0.1em', color:'#6B7280', marginBottom:'0.75rem' }}>
                            AÇÕES RÁPIDAS
                        </h3>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', marginBottom:'1rem' }}>
                            <Link
                                href="/admin/acoes"
                                style={{
                                    display:'inline-flex',
                                    alignItems:'center',
                                    padding:'0.55rem 1rem',
                                    borderRadius:10,
                                    background:'#0F172A',
                                    color:'#FFD600',
                                    fontWeight:800,
                                    fontSize:'0.8rem',
                                    textDecoration:'none',
                                }}
                            >
                                Criar novo período de curso
                            </Link>
                            <Link
                                href="/admin/acoes"
                                style={{
                                    display:'inline-flex',
                                    alignItems:'center',
                                    padding:'0.55rem 1rem',
                                    borderRadius:10,
                                    background:'transparent',
                                    border:'1px solid #E5E7EB',
                                    color:'#374151',
                                    fontWeight:700,
                                    fontSize:'0.8rem',
                                    textDecoration:'none',
                                }}
                            >
                                Ver todos os períodos
                            </Link>
                        </div>
                        <p style={{ fontSize:'0.78rem', color:'#6B7280', marginBottom:'0.65rem' }}>
                            Vincular a um período já existente (mesmo grupo e cidade da turma):
                        </p>
                        {loadingAcoesPeriodo ? (
                            <p style={{ fontSize:'0.8rem', color:'#9CA3AF' }}>Carregando períodos disponíveis…</p>
                        ) : acoesParaVincular.length === 0 ? (
                            <p style={{ fontSize:'0.8rem', color:'#9CA3AF', lineHeight:1.45 }}>
                                Não há outros períodos elegíveis neste grupo e cidade. Crie um período novo ou abra um período na lista geral e adicione esta turma na seção de turmas da ficha.
                            </p>
                        ) : (
                            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', alignItems:'stretch' }}>
                                <select
                                    className="form-input"
                                    value={periodoPickerAcaoId}
                                    onChange={(e) => setPeriodoPickerAcaoId(e.target.value)}
                                    style={{ flex:'1 1 220px', minWidth:0 }}
                                >
                                    <option value="">Escolher período…</option>
                                    {acoesParaVincular.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.nome} · {a.cidadeNome}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    disabled={!periodoPickerAcaoId || linkingPeriodo}
                                    onClick={handleVincularPeriodo}
                                    style={{ flex:'0 1 auto', minWidth:'min(100%, 160px)' }}
                                >
                                    {linkingPeriodo ? 'Vinculando…' : 'Vincular a esta turma'}
                                </button>
                            </div>
                        )}
                    </div>

                    {linkedActions.length > 0 && (
                        <div className="glass-card" style={{ padding: '1.25rem' }}>
                            <h3 style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', letterSpacing: '0.1em', color: '#6B7280', marginBottom: '0.6rem' }}>
                                MOTORISTA DESTA TURMA
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: '1rem', lineHeight: 1.5 }}>
                                Gera viagens só para esta turma. Carreta do período ou da turma. Para todas as turmas, use a ficha do período.
                            </p>
                            {linkedActions.length > 1 && (
                                <select
                                    className="form-input"
                                    value={driverAcaoId}
                                    onChange={(e) => setDriverAcaoId(e.target.value)}
                                    style={{ marginBottom: '0.65rem', width: '100%' }}
                                >
                                    <option value="">Período para vincular motorista…</option>
                                    {linkedActions.map((item: any) => (
                                        <option key={item.acaoId} value={item.acaoId}>
                                            {item.acao?.nome || item.acaoId}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <select
                                    className="form-input"
                                    value={selectedDriverId}
                                    onChange={(e) => setSelectedDriverId(e.target.value)}
                                    style={{ flex: '1 1 220px', minWidth: 0 }}
                                >
                                    <option value="">Escolher motorista…</option>
                                    {availableDrivers.map((d: any) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    disabled={!selectedDriverId || assigningDriverTurma}
                                    onClick={handleAssignDriverTurma}
                                >
                                    {assigningDriverTurma ? 'Vinculando…' : 'Vincular motorista'}
                                </button>
                            </div>
                            {turma?.truck?.identifier && (
                                <p style={{ marginTop: '0.65rem', fontSize: '0.78rem', color: '#059669' }}>
                                    Carreta: <strong>{turma.truck.identifier}</strong>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modal: Alterar Status */}
            {showStatusModal && (
                <ModalPortal>
                <div className="modal-overlay" style={{ zIndex: MODAL_PORTAL_Z_INDEX }} onClick={() => { setShowStatusModal(false); setStatusError(''); }}>
                    <div className="modal-content modal-content--sm" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setShowStatusModal(false); setStatusError(''); }}
                            style={{ position:'absolute', top:'1rem', right:'1rem', background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#9CA3AF' }}>✕</button>

                        <h3 style={{ fontFamily:'Orbitron', fontWeight:900, fontSize:'1rem', marginBottom:'1rem', color:'#111827' }}>
                            Alterar Status da Turma
                        </h3>
                        <p style={{ fontSize:'0.82rem', color:'#6B7280', marginBottom:'1.25rem' }}>
                            Turma: <strong>{turma.classIdentifier}</strong>
                        </p>

                        <div className="modal-status-options" style={{ display:'flex', flexDirection:'column', gap:'0.5rem', marginBottom:'1.25rem' }}>
                            {ALL_STATUSES.map(s => {
                                const c = STATUS_CFG[s];
                                const isSelected = selectedStatus === s;
                                return (
                                    <button key={s} onClick={() => setSelectedStatus(s)}
                                        style={{
                                            padding:'0.65rem 1rem', borderRadius:10, cursor:'pointer',
                                            width:'100%', boxSizing:'border-box', minWidth:0,
                                            display:'grid', gridTemplateColumns:'auto 1fr auto', alignItems:'center', gap:'0.75rem',
                                            border: `1.5px solid ${isSelected ? c.color : '#E5E7EB'}`,
                                            background: isSelected ? c.bg : 'transparent',
                                            transition:'all 0.15s',
                                            textAlign:'left',
                                        }}
                                    >
                                        <span style={{
                                            width:10, height:10, borderRadius:'50%', background: c.color,
                                            boxShadow: isSelected ? `0 0 8px ${c.color}` : 'none',
                                            flexShrink:0,
                                        }} />
                                        <span style={{
                                            fontSize:'0.82rem', fontWeight:700, color: isSelected ? c.color : '#374151',
                                            minWidth:0, overflowWrap:'break-word',
                                        }}>
                                            {c.label}
                                        </span>
                                        {turma.status === s ? (
                                            <span style={{ fontSize:'0.65rem', color:'#9CA3AF', whiteSpace:'nowrap' }}>Atual</span>
                                        ) : (
                                            <span />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {statusModalWarnings.length > 0 ? (
                            <div
                                style={{
                                    marginBottom: '1rem',
                                    padding: '0.75rem 0.9rem',
                                    borderRadius: 10,
                                    background: '#FFFBEB',
                                    border: '1px solid #FDE68A',
                                }}
                            >
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#92400E', letterSpacing: '0.06em', marginBottom: 8 }}>
                                    Antes de confirmar
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#78350F', fontSize: '0.78rem', lineHeight: 1.45 }}>
                                    {statusModalWarnings.map((w) => (
                                        <li key={w.code} style={{ marginBottom: 6 }}>
                                            <strong>{w.severity === 'warning' ? 'Atenção: ' : 'Info: '}</strong>
                                            {w.message}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/admin/acoes"
                                    style={{ display: 'inline-block', marginTop: 8, fontSize: '0.76rem', fontWeight: 700, color: '#B45309' }}
                                >
                                    Abrir períodos de curso →
                                </Link>
                            </div>
                        ) : (
                            <div
                                style={{
                                    marginBottom: '1rem',
                                    padding: '0.75rem 0.9rem',
                                    borderRadius: 10,
                                    background: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                }}
                            >
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#047857', letterSpacing: '0.06em', marginBottom: 6 }}>
                                    Verificação rápida
                                </div>
                                <p style={{ margin: 0, color: '#065F46', fontSize: '0.78rem', lineHeight: 1.45, fontWeight: 600 }}>
                                    Com os dados atuais, não há inconsistências para o estado que escolheu. Pode confirmar.
                                </p>
                            </div>
                        )}

                        {statusError && (
                            <div style={{ padding:'0.65rem 1rem', borderRadius:9, background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:'0.8rem', fontWeight:600, marginBottom:'1rem' }}>
                                ⚠️ {statusError}
                            </div>
                        )}

                        <div className="modal-actions-row">
                            <button type="button" onClick={() => { setShowStatusModal(false); setStatusError(''); }}
                                className="btn-ghost" style={{ padding:'0.7rem', borderRadius:10, fontWeight:700, fontSize:'0.85rem' }}>
                                Cancelar
                            </button>
                            <button type="button" onClick={handleStatusSave} disabled={savingStatus || selectedStatus === turma.status}
                                className="btn-primary" style={{ justifyContent:'center', opacity: (savingStatus || selectedStatus === turma.status) ? 0.6 : 1 }}>
                                {savingStatus ? <><div className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> Salvando...</> : '✓ Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}

            {showEditModal && editForm && (
                <ModalPortal>
                    <div className="modal-overlay" style={{ zIndex: MODAL_PORTAL_Z_INDEX }} onClick={() => setShowEditModal(false)}>
                        <div className="modal-content modal-content--lg" onClick={e => e.stopPropagation()}>
                            <h3 style={{ fontFamily:'Orbitron', fontWeight:900, fontSize:'0.95rem', marginBottom:'1rem', color:'#111827' }}>
                                Editar Turma
                            </h3>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                                <div>
                                    <label style={{ fontSize:'0.68rem', fontWeight:700 }}>Identificador</label>
                                    <input className="form-input" value={editForm.classIdentifier} onChange={e => setEditForm((f: any) => ({ ...f, classIdentifier: e.target.value.toUpperCase() }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize:'0.68rem', fontWeight:700 }}>Status</label>
                                    <select className="form-input" value={editForm.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}>
                                        {EDITABLE_STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s]?.label || s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize:'0.68rem', fontWeight:700 }}>Curso</label>
                                    <select className="form-input" value={editForm.courseId} onChange={e => setEditForm((f: any) => ({ ...f, courseId: e.target.value }))}>
                                        <option value="">Selecione...</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize:'0.68rem', fontWeight:700 }}>Grupo</label>
                                    <select className="form-input" value={editForm.groupId} onChange={e => setEditForm((f: any) => ({ ...f, groupId: e.target.value }))}>
                                        <option value="">Selecione...</option>
                                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize:'0.68rem', fontWeight:700 }}>Cidade</label>
                                    <select className="form-input" value={editForm.cityId} onChange={e => setEditForm((f: any) => ({ ...f, cityId: e.target.value }))}>
                                        <option value="">Selecione...</option>
                                        {cities.map(c => <option key={c.id} value={c.id}>{c.name} - {c.state}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize:'0.68rem', fontWeight:700 }}>Carreta</label>
                                    <select className="form-input" value={editForm.truckId} onChange={e => setEditForm((f: any) => ({ ...f, truckId: e.target.value }))}>
                                        <option value="">Sem carreta</option>
                                        {trucks.map(t => <option key={t.id} value={t.id}>{t.identifier}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize:'0.68rem', fontWeight:700 }}>Período</label>
                                    <select className="form-input" value={editForm.period} onChange={e => setEditForm((f: any) => ({ ...f, period: e.target.value }))}>
                                        <option value="MORNING">Manhã</option>
                                        <option value="AFTERNOON">Tarde</option>
                                        <option value="EVENING">Noite</option>
                                    </select>
                                </div>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                                    <div>
                                        <label style={{ fontSize:'0.68rem', fontWeight:700 }}>Início</label>
                                        <input type="time" className="form-input" value={editForm.startTime} onChange={e => setEditForm((f: any) => ({ ...f, startTime: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize:'0.68rem', fontWeight:700 }}>Fim</label>
                                        <input type="time" className="form-input" value={editForm.endTime} onChange={e => setEditForm((f: any) => ({ ...f, endTime: e.target.value }))} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize:'0.68rem', fontWeight:700 }}>Data início</label>
                                    <input type="date" className="form-input" value={editForm.startDate} onChange={e => setEditForm((f: any) => ({ ...f, startDate: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize:'0.68rem', fontWeight:700 }}>Data fim</label>
                                    <input type="date" className="form-input" value={editForm.endDate} onChange={e => setEditForm((f: any) => ({ ...f, endDate: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize:'0.68rem', fontWeight:700 }}>Vagas</label>
                                    <input type="number" min={1} className="form-input" value={editForm.vacancies} onChange={e => setEditForm((f: any) => ({ ...f, vacancies: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize:'0.68rem', fontWeight:700 }}>Reserva</label>
                                    <input type="number" min={0} className="form-input" value={editForm.reserveSlots} onChange={e => setEditForm((f: any) => ({ ...f, reserveSlots: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize:'0.68rem', fontWeight:700 }}>Abertura inscrições</label>
                                    <input type="date" className="form-input" value={editForm.enrollmentOpenDate} onChange={e => setEditForm((f: any) => ({ ...f, enrollmentOpenDate: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize:'0.68rem', fontWeight:700 }}>Fechamento inscrições</label>
                                    <input type="date" className="form-input" value={editForm.enrollmentCloseDate} onChange={e => setEditForm((f: any) => ({ ...f, enrollmentCloseDate: e.target.value }))} />
                                </div>
                            </div>
                            {editError && <div style={{ marginTop:10, fontSize:'0.8rem', color:'#DC2626' }}>{editError}</div>}
                            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:14 }}>
                                <button className="btn-ghost" onClick={() => setShowEditModal(false)}>Cancelar</button>
                                <button className="btn-primary" onClick={handleEditSave} disabled={savingEdit}>
                                    {savingEdit ? 'Salvando...' : 'Salvar alterações'}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* MEL-06: Modal de Vinculação Professor↔Turma */}
            {showTeacherModal && (
                <ModalPortal>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.22)', animation: 'fadeIn 0.2s' }}>
                            <div style={{ padding: '20px 24px 14px', background: 'linear-gradient(135deg,#1E3A8A,#2563EB)', borderRadius: '18px 18px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🎓</div>
                                <div>
                                    <div style={{ fontFamily: 'Orbitron', fontSize: '0.82rem', fontWeight: 900, color: '#fff', letterSpacing: '0.06em' }}>VINCULAR PROFESSOR</div>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Turma: {turma.classIdentifier}</div>
                                </div>
                                <button onClick={() => setShowTeacherModal(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                            </div>
                            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {!teacherConfirmStep ? (
                                    <>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', marginBottom: 6 }}>
                                                Selecione o Professor *
                                            </label>
                                            <select
                                                value={selectedTeacherId}
                                                onChange={e => setSelectedTeacherId(e.target.value)}
                                                style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9, border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.85rem', color: '#111827', outline: 'none', cursor: 'pointer' }}
                                            >
                                                <option value="">Selecione um professor…</option>
                                                {availableTeachers.map((t: any) => (
                                                    <option key={t.id} value={t.id}>{t.name} {t.email ? `(${t.email})` : ''}</option>
                                                ))}
                                            </select>
                                            {availableTeachers.length === 0 && (
                                                <div style={{ marginTop: 6, fontSize: '0.72rem', color: '#F59E0B' }}>⚠ Nenhum professor ativo encontrado no sistema.</div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                            <button type="button" onClick={() => setShowTeacherModal(false)} style={{ padding: '0.55rem 1.1rem', borderRadius: 9, background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!selectedTeacherId}
                                                onClick={() => setTeacherConfirmStep(true)}
                                                style={{ padding: '0.55rem 1.25rem', borderRadius: 9, background: !selectedTeacherId ? '#E5E7EB' : 'linear-gradient(135deg,#1E3A8A,#2563EB)', border: 'none', color: '#fff', fontWeight: 700, cursor: !selectedTeacherId ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
                                            >
                                                Continuar →
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ padding: '12px 14px', borderRadius: 10, background: '#FFF7ED', border: '1px solid rgba(245,158,11,0.35)' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#92400E', marginBottom: 4 }}>⚠ Confirmação de vínculo</div>
                                            <div style={{ fontSize: '0.78rem', color: '#B45309', lineHeight: 1.5 }}>
                                                Você está prestes a vincular <strong>{availableTeachers.find(t => t.id === selectedTeacherId)?.name}</strong> à turma <strong>{turma.classIdentifier}</strong>. O professor terá acesso para lançar frequência e visualizar os dados desta turma.
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                            <button type="button" onClick={() => setTeacherConfirmStep(false)} style={{ padding: '0.55rem 1.1rem', borderRadius: 9, background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                                                ← Voltar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleAssignTeacher()}
                                                disabled={assigningTeacher}
                                                style={{ padding: '0.55rem 1.25rem', borderRadius: 9, background: assigningTeacher ? '#E5E7EB' : 'linear-gradient(135deg,#059669,#047857)', border: 'none', color: '#fff', fontWeight: 700, cursor: assigningTeacher ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
                                            >
                                                {assigningTeacher ? 'Vinculando…' : '✓ Confirmar Vínculo'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
