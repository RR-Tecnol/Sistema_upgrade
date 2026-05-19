'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { acoesApi, Acao, AcaoStatus, AcaoCustoTipo } from '@/lib/api/acoes';
import { holidayApi } from '@/lib/api/holiday';
import api from '@/lib/api/acoes';
import apiClient from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { LocationFields, LocationFieldsValue } from '@/components/admin/LocationFields';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import { KitInsumosEditor } from '@/components/estoque/KitInsumosEditor';
import { BaixaEstoqueEditor } from '@/components/estoque/BaixaEstoqueEditor';
import { ConcluirAcaoModal } from '@/components/acoes/ConcluirAcaoModal';
import { AcaoEquipeVinculoPanel } from '@/components/admin/acoes/AcaoEquipeVinculoPanel';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import { normalizePaginated, ADMIN_PAGE_SIZE_CARDS, ADMIN_PAGE_SIZE_TABLE } from '@/lib/api/pagination';

const FUTURISTIC_CSS = `
@keyframes holo-scan {
  0% { transform: translateY(-100%); opacity: 0; }
  10% { opacity: 0.6; }
  90% { opacity: 0.6; }
  100% { transform: translateY(400%); opacity: 0; }
}
@keyframes grid-pulse {
  0%,100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}
@keyframes neon-border {
  0%,100% { box-shadow: 0 0 8px #FFD600, 0 0 20px rgba(255,214,0,0.3), inset 0 0 8px rgba(255,214,0,0.05); }
  50% { box-shadow: 0 0 16px #FFD600, 0 0 40px rgba(255,214,0,0.5), inset 0 0 16px rgba(255,214,0,0.1); }
}
@keyframes float3d {
  0%,100% { transform: translateY(0px) rotateX(0deg); }
  50% { transform: translateY(-6px) rotateX(2deg); }
}
@keyframes orbit {
  from { transform: rotate(0deg) translateX(60px) rotate(0deg); }
  to { transform: rotate(360deg) translateX(60px) rotate(-360deg); }
}
@keyframes data-stream {
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(-40px); opacity: 0; }
}
@keyframes slide-tab {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@keyframes flicker {
  0%,19%,21%,23%,25%,54%,56%,100% { opacity: 1; }
  20%,24%,55% { opacity: 0.4; }
}
@keyframes counter-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes hero-gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes particle-float {
  0% { transform: translateY(0) translateX(0) scale(1); opacity: 0.7; }
  33% { transform: translateY(-20px) translateX(10px) scale(1.2); opacity: 1; }
  66% { transform: translateY(-10px) translateX(-8px) scale(0.9); opacity: 0.5; }
  100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.7; }
}
@keyframes ring-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes ring-counter {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}
.futuristic-tab-btn { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.futuristic-tab-btn:hover { transform: translateY(-2px); }
.futuristic-card-3d { transition: transform 0.4s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s ease; transform-style: preserve-3d; }
.futuristic-card-3d:hover { transform: perspective(800px) rotateX(-4deg) rotateY(4deg) translateZ(8px); }
.stat-neon:hover { animation: neon-border 1.5s ease-in-out infinite; }
.holo-text { background: linear-gradient(90deg,#B89B00,#FFD600,#fff,#FFD600,#B89B00); background-size:200%; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation: hero-gradient 4s linear infinite; }
`;

// ── Utilitários ──────────────────────────────────────────────────

const statusConfig: Record<AcaoStatus, { label: string; color: string; bg: string; border: string }> = {
    PLANEJADA: { label: 'Planejada', color: '#92400E', bg: '#FFF9C4', border: '#FFE97A' },
    EM_ANDAMENTO: { label: 'Em Andamento', color: '#065F46', bg: '#DCFCE7', border: '#BBF7D0' },
    CONCLUIDA: { label: 'Concluída', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
    CANCELADA: { label: 'Cancelada', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

const statusDot: Record<AcaoStatus, string> = {
    PLANEJADA: '#D97706', EM_ANDAMENTO: '#059669', CONCLUIDA: '#1D4ED8', CANCELADA: '#DC2626',
};

const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtCurrency = (v: number | string) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const TABS = [
    { id: 'geral', label: 'Visão Geral', icon: '📊' },
    { id: 'turmas', label: 'Turmas', icon: '🎓' },
    { id: 'funcionarios', label: 'Equipe e diárias', icon: '👷' },
    { id: 'custos', label: 'Custos', icon: '💰' },
    { id: 'insumos', label: 'Kit de Insumos', icon: '🎒' },
    { id: 'baixa', label: 'Baixa de Estoque', icon: '↧' },
    { id: 'inscricoes', label: 'Inscrições', icon: '📋' },
];

// MEL-04: Mapeamento de status de turma
const TURMA_STATUS_CFG: Record<string, string> = {
    PLANNED: 'Planejada',
    ENROLLMENT_OPEN: 'Matrículas Abertas',
    ENROLLMENT_CLOSED: 'Matrículas Fechadas',
    IN_PROGRESS: 'Em Andamento',
    COMPLETED: 'Concluída',
    CANCELLED: 'Cancelada',
};

// Estilos reutilizáveis inline
const INPUT: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9,
    border: '1.5px solid #E5E7EB', background: '#F9FAFB',
    fontSize: '0.85rem', color: '#111827', outline: 'none', fontFamily: 'inherit',
};
const LABEL: React.CSSProperties = {
    display: 'block', fontSize: '0.68rem', fontWeight: 700,
    textTransform: 'uppercase' as const, letterSpacing: '0.08em',
    color: '#6B7280', marginBottom: '0.35rem',
};

// ── InfoItem ─────────────────────────────────────────────────────

function InfoItem({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
    return (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #F9FAFB', gridColumn: wide ? '1/-1' : undefined }}>
            <div style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
            <div style={{ color: '#111827', fontSize: '0.88rem', fontWeight: 500 }}>{value}</div>
        </div>
    );
}

// ── TabGeral ─────────────────────────────────────────────────────

function TabGeral({ acao, onUpdate }: { acao: Acao; onUpdate: () => void }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        nome: acao.nome, localExecucao: acao.localExecucao || '',
        observacoes: acao.observacoes || '',
        distanciaKm: String(acao.distanciaKm || ''),
        precoCombustivelL: String(acao.precoCombustivelL || ''),
        autonomiaKmL: String(acao.autonomiaKmL || ''),
    });
    // Local físico (REQ-LOCAL-2026) — pré-preenchido com valores existentes
    const [acaoLocation, setAcaoLocation] = useState<LocationFieldsValue>({
        name: acao.localExecucao ?? null,
        address: acao.localEndereco ?? null,
        reference: acao.localReferencia ?? null,
        latitude: acao.localLatitude ?? null,
        longitude: acao.localLongitude ?? null,
    });
    const [loading, setLoading] = useState(false);

    const save = async () => {
        setLoading(true);
        await acoesApi.atualizar(acao.id, {
            ...form,
            distanciaKm: Number(form.distanciaKm) || undefined,
            precoCombustivelL: Number(form.precoCombustivelL) || undefined,
            autonomiaKmL: Number(form.autonomiaKmL) || undefined,
            // Local físico (REQ-LOCAL-2026)
            localExecucao: acaoLocation.name || form.localExecucao || undefined,
            localEndereco: acaoLocation.address || undefined,
            localReferencia: acaoLocation.reference || undefined,
            localLatitude: acaoLocation.latitude ?? undefined,
            localLongitude: acaoLocation.longitude ?? undefined,
        } as any);
        setLoading(false);
        setEditing(false);
        onUpdate();
    };

    const rf = acao.resumoFinanceiro;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Informações */}
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,214,0,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', background: '#fff' }}>
                <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #0a0a0f, #111118)', borderBottom: '1px solid rgba(255,214,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px 16px 0 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,214,0,0.15)', border: '1px solid rgba(255,214,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>📋</div>
                        <span style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 800, color: '#FFD600', letterSpacing: '0.15em' }}>INFORMAÇÕES BÁSICAS</span>
                    </div>
                    <button onClick={() => setEditing(!editing)} style={{
                        padding: '6px 16px', borderRadius: 8,
                        background: editing ? 'rgba(220,38,38,0.15)' : 'rgba(255,214,0,0.12)',
                        border: `1px solid ${editing ? 'rgba(220,38,38,0.4)' : 'rgba(255,214,0,0.35)'}`,
                        color: editing ? '#f87171' : '#FFD600', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'Orbitron', letterSpacing: '0.05em', transition: 'all 0.2s'
                    }}>
                        {editing ? '✕ CANCELAR' : '✏️ EDITAR'}
                    </button>
                </div>
                {editing ? (
                    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                        <div style={{ gridColumn: '1/-1' }}><label style={LABEL}>Nome</label><input style={INPUT} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
                        <div><label style={LABEL}>Distância (km)</label><input type="number" style={INPUT} value={form.distanciaKm} onChange={e => setForm(f => ({ ...f, distanciaKm: e.target.value }))} /></div>
                        <div><label style={LABEL}>Combustível (R$/L)</label><input type="number" step="0.01" style={INPUT} value={form.precoCombustivelL} onChange={e => setForm(f => ({ ...f, precoCombustivelL: e.target.value }))} /></div>
                        <div><label style={LABEL}>Autonomia (km/L)</label><input type="number" step="0.1" style={INPUT} value={form.autonomiaKmL} onChange={e => setForm(f => ({ ...f, autonomiaKmL: e.target.value }))} /></div>
                        <div style={{ gridColumn: '1/-1' }}>
                            <label style={LABEL}>📍 Local físico onde a ação ocorre</label>
                            <LocationFields
                                value={acaoLocation}
                                onChange={setAcaoLocation}
                                cityContext={acao.cidade ? `${acao.cidade.name}, ${acao.cidade.state}, Brasil` : (acao.cidadeNome ? `${acao.cidadeNome}, Brasil` : undefined)}
                            />
                        </div>
                        <div style={{ gridColumn: '1/-1' }}><label style={LABEL}>Observações</label><textarea style={{ ...INPUT, resize: 'vertical', minHeight: 80 }} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} /></div>
                        <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-primary" onClick={save} disabled={loading}>{loading ? 'Salvando...' : '💾 Salvar alterações'}</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                        <InfoItem label="Nome" value={acao.nome} wide />
                        <InfoItem
                            label="Cidade"
                            value={acao.cidade ? `${acao.cidade.name}, ${acao.cidade.state}` : (acao.cidadeNome || '—')}
                        />
                        <InfoItem label="Grupo" value={acao.grupo?.name || '—'} />
                        <InfoItem label="Carreta" value={acao.carreta ? `${acao.carreta.identifier} — ${acao.carreta.licensePlate}` : 'Não vinculada'} />
                        <InfoItem label="Local" value={acao.localExecucao || '—'} />
                        {acao.localEndereco && <InfoItem label="Endereço" value={acao.localEndereco} wide />}
                        {acao.localReferencia && <InfoItem label="Ponto de referência" value={acao.localReferencia} wide />}
                        {(acao.localLatitude && acao.localLongitude) && (
                            <InfoItem
                                label="Coordenadas"
                                value={(
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${acao.localLatitude},${acao.localLongitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#2563EB', textDecoration: 'none' }}
                                    >
                                        🗺️ {acao.localLatitude.toFixed(5)}, {acao.localLongitude.toFixed(5)} →
                                    </a>
                                ) as any}
                            />
                        )}
                        <InfoItem label="Início" value={fmtDate(acao.dataInicio)} />
                        <InfoItem label="Fim" value={fmtDate(acao.dataFim)} />
                        <InfoItem label="Inscrições Online" value={acao.permitirInscricoes ? '✅ Ativas' : '❌ Desativadas'} />
                        {acao.observacoes && <InfoItem label="Observações" value={acao.observacoes} wide />}
                    </div>
                )}
            </div>

            {/* Logística */}
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,214,0,0.2)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', background: '#fff' }}>
                <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #0a0a0f, #111118)', borderBottom: '1px solid rgba(255,214,0,0.15)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,214,0,0.15)', border: '1px solid rgba(255,214,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>⛽</div>
                        <span style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 800, color: '#FFD600', letterSpacing: '0.15em' }}>LOGÍSTICA ESTIMADA</span>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFD600', boxShadow: '0 0 8px #FFD600', animation: 'yellowPulse 2s infinite' }} />
                </div>
                <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                    {[
                        { label: 'Distância Total', value: acao.distanciaKm ? `${Number(acao.distanciaKm)} km` : '—', icon: '📡', highlight: false, color: '#60A5FA', bg: '#EFF6FF', border: '#BFDBFE' },
                        { label: 'Combustível (R$/L)', value: acao.precoCombustivelL ? fmtCurrency(Number(acao.precoCombustivelL)) : '—', icon: '⛽', highlight: false, color: '#F87171', bg: '#FEF2F2', border: '#FECACA' },
                        { label: 'Autonomia', value: acao.autonomiaKmL ? `${Number(acao.autonomiaKmL)} km/L` : '—', icon: '⚡', highlight: false, color: '#FBBF24', bg: '#FFFBEB', border: '#FDE68A' },
                        ...(rf ? [
                            { label: 'Litros Estimados', value: `${rf.estimado.litrosEstimados.toFixed(1)} L`, icon: '💧', highlight: true, color: '#38BDF8', bg: '#F0F9FF', border: '#BAE6FD' },
                            { label: 'Custo Comb.', value: fmtCurrency(rf.estimado.combustivel), icon: '💰', highlight: true, color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
                        ] : []),
                    ].map((item, i) => (
                        <AnimatedKpiCard
                            key={item.label}
                            label={item.label}
                            value={0}
                            displayValue={item.value}
                            color={item.color}
                            bg={item.bg}
                            border={item.border}
                            delayMs={i * 90}
                            compact
                            icon={<span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{item.icon}</span>}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── TabTurmas ─────────────────────────────────────────────────────

function TabTurmas({ acao, onUpdate }: { acao: Acao; onUpdate: () => void }) {
    const [turmaPage, setTurmaPage] = useState(1);
    const turmasVinculadas = acao.turmas || [];
    const turmasPaged = turmasVinculadas.slice((turmaPage - 1) * ADMIN_PAGE_SIZE_TABLE, turmaPage * ADMIN_PAGE_SIZE_TABLE);
    const turmasTotalPages = Math.max(1, Math.ceil(turmasVinculadas.length / ADMIN_PAGE_SIZE_TABLE));

    const [turmasDisponiveis, setTurmasDisponiveis] = useState<any[]>([]);
    const [selectedTurma, setSelectedTurma] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingList, setLoadingList] = useState(false);

    useEffect(() => {
        if (!acao.grupoId) {
            setTurmasDisponiveis([]);
            return;
        }
        setLoadingList(true);
        acoesApi
            .listTurmasElegiveis(acao.id)
            .then(rows => setTurmasDisponiveis(Array.isArray(rows) ? rows : []))
            .catch(() => setTurmasDisponiveis([]))
            .finally(() => setLoadingList(false));
    }, [acao.grupoId, acao.id]);

    const vincular = async () => {
        if (!selectedTurma) return;
        setLoading(true);
        try {
            const res = await acoesApi.addTurma(acao.id, selectedTurma);
            const inherited = res?.inheritedClassTeachers ?? 0;
            if (inherited > 0) {
                toast.success(`Turma vinculada. ${inherited} professor(es) do curso base aplicado(s) à turma.`);
            } else {
                toast.success('Turma vinculada ao período.');
            }
            setSelectedTurma('');
            onUpdate();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Não foi possível vincular a turma.');
        } finally {
            setLoading(false);
        }
    };

    const [confirmDesvincular, setConfirmDesvincular] = useState<string | null>(null);
    const desvincular = async (turmaId: string) => {
        await acoesApi.removeTurma(acao.id, turmaId);
        setConfirmDesvincular(null);
        onUpdate();
    };

    const vinculadasIds = (acao.turmas || []).map(t => t.turmaId);
    const disponiveis = turmasDisponiveis.filter(t => !vinculadasIds.includes(t.id));

    const turmaRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B89B00' }}>🎓 Vincular turma</div>
                    <Link href={`/admin/turmas/nova?acaoId=${acao.id}`} className="btn-primary" style={{ fontSize: '0.75rem', padding: '6px 14px', textDecoration: 'none' }}>
                        + Nova turma
                    </Link>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0 0 12px', lineHeight: 1.45 }}>
                    Turmas do mesmo grupo do período (qualquer curso). O curso motor do período aparece primeiro na lista. Professor,
                    motorista e diárias: aba <strong>Funcionários</strong>.
                </p>
                {loadingList ? (
                    <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Carregando…</p>
                ) : (
                    <>
                    <div style={turmaRow}>
                        <select style={INPUT} value={selectedTurma} onChange={e => setSelectedTurma(e.target.value)}>
                            <option value="">Selecione uma turma…</option>
                            {disponiveis.map((t: any) => (
                                <option key={t.id} value={t.id}>
                                    {t.classIdentifier} — {t.course?.name || 'Curso'}
                                    {acao.motorCourseId && t.courseId === acao.motorCourseId ? ' ★' : ''} (
                                    {TURMA_STATUS_CFG[t.status] || t.status})
                                </option>
                            ))}
                        </select>
                        <button type="button" className="btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={vincular} disabled={!selectedTurma || loading}>
                            {loading ? '…' : '+ Vincular'}
                        </button>
                    </div>
                        {disponiveis.length === 0 && (
                            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: '10px 0 0', lineHeight: 1.45 }}>
                                Nenhuma turma elegível. Verifique se a turma pertence ao mesmo grupo, não está concluída/cancelada nem
                                vinculada a outro período ativo.
                            </p>
                        )}
                    </>
                )}
            </div>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', background: '#FFFDE7', borderRadius: '16px 16px 0 0' }}>
                    <span style={{ fontFamily: 'Orbitron', fontSize: '0.68rem', fontWeight: 800, color: '#B89B00', letterSpacing: '0.1em' }}>📚 TURMAS VINCULADAS ({acao.turmas?.length || 0})</span>
                </div>
                {(acao.turmas || []).length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: '0.88rem' }}>Nenhuma turma vinculada ainda.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead><tr><th>Identificador</th><th>Curso</th><th>Status</th><th>Vagas</th><th>Inscritos</th><th>Período</th><th></th></tr></thead>
                            <tbody>
                                {turmasPaged.map(at => (
                                    <tr key={at.id}>
                                        <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', background: '#FFFDE7', color: '#B89B00', padding: '2px 7px', borderRadius: 5, border: '1px solid #FEF08A' }}>{at.turma?.classIdentifier}</span></td>
                                        <td style={{ fontWeight: 600 }}>{at.turma?.course?.name || '—'}</td>
                                        <td><span className="badge badge-gray">{TURMA_STATUS_CFG[at.turma?.status || ''] || at.turma?.status}</span></td>
                                        <td>{at.turma?.vacancies}</td>
                                        <td>{at.turma?._count?.enrollments ?? '—'}</td>
                                        <td style={{ fontSize: '0.8rem', color: '#6B7280' }}>{fmtDate(at.turma?.startDate)} → {fmtDate(at.turma?.endDate)}</td>
                                         <td>{confirmDesvincular === at.turmaId ? (
                                             <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                 <span style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 600 }}>Confirmar?</span>
                                                 <button className="btn-danger" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => desvincular(at.turmaId)}>Sim</button>
                                                 <button className="btn-ghost" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => setConfirmDesvincular(null)}>Não</button>
                                             </span>
                                         ) : (
                                             <button className="btn-danger" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => setConfirmDesvincular(at.turmaId)}>Remover</button>
                                         )}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <AdminListPagination
                    page={turmaPage}
                    totalPages={turmasTotalPages}
                    total={turmasVinculadas.length}
                    onPageChange={setTurmaPage}
                    itemLabel="turma(s)"
                    style={{ padding: '0 20px 16px' }}
                />
            </div>
        </div>
    );
}


// ── TabCustos ─────────────────────────────────────────────────────

function TabCustos({ acao, onUpdate }: { acao: Acao; onUpdate: () => void }) {
    const [custoPage, setCustoPage] = useState(1);
    const [showModal, setShowModal] = useState<'ABASTECIMENTO' | 'DESPESA_GERAL' | null>(null);
    const [form, setForm] = useState({ descricao: '', valor: '', data: new Date().toISOString().split('T')[0], litros: '', observacoes: '' });
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');

    const rf = acao.resumoFinanceiro;

    const submitCusto = async () => {
        if (!showModal) return;
        setLoading(true);
        await acoesApi.addCusto(acao.id, {
            tipo: showModal as AcaoCustoTipo,
            descricao: form.descricao, valor: Number(form.valor), data: form.data,
            litros: form.litros ? Number(form.litros) : undefined,
            observacoes: form.observacoes || undefined,
        });
        setForm({ descricao: '', valor: '', data: new Date().toISOString().split('T')[0], litros: '', observacoes: '' });
        setLoading(false);
        setShowModal(null);
        onUpdate();
    };

    const [confirmRemoverCusto, setConfirmRemoverCusto] = useState<string | null>(null);
    const remover = async (custoId: string) => {
        await acoesApi.removeCusto(acao.id, custoId);
        setConfirmRemoverCusto(null);
        onUpdate();
    };

    const tipoBadge: Record<string, { label: string; bg: string; color: string; border: string }> = {
        ABASTECIMENTO: { label: 'Abastecimento', bg: '#FFF9C4', color: '#92400E', border: '#FFE97A' },
        DESPESA_GERAL: { label: 'Despesa Geral', bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
        DIARIA_FUNCIONARIO: { label: 'Diária', bg: '#DCFCE7', color: '#065F46', border: '#BBF7D0' },
    };

    const custosFiltrados = (acao.custos || []).filter(c => !filter || c.tipo === filter);
    const custosPaged = custosFiltrados.slice((custoPage - 1) * ADMIN_PAGE_SIZE_TABLE, custoPage * ADMIN_PAGE_SIZE_TABLE);
    const custosTotalPages = Math.max(1, Math.ceil(custosFiltrados.length / ADMIN_PAGE_SIZE_TABLE));

    useEffect(() => { setCustoPage(1); }, [filter]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Cards de resumo estimado x real */}
            {rf && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    {[
                        { label: 'Custo Estimado', icon: '⚡', value: fmtCurrency(rf.estimado.total), sub1: `⛽ ${fmtCurrency(rf.estimado.combustivel)} · 👥 ${fmtCurrency(rf.estimado.diarias)}`, glow: '255,214,0', color: '#FFD600', bg: '#FFFDE7', border: '#FEF08A' },
                        { label: 'Custo Real', icon: '💵', value: fmtCurrency(rf.real.total), sub1: `⛽ ${fmtCurrency(rf.real.abastecimentos)} · 📋 ${fmtCurrency(rf.real.despesasGerais)}`, glow: '5,150,105', color: '#34D399', bg: '#ECFDF5', border: '#A7F3D0' },
                        {
                            label: rf.economia >= 0 ? 'Economia' : 'Excesso', icon: rf.economia >= 0 ? '📉' : '📈',
                            value: fmtCurrency(Math.abs(rf.economia)),
                            sub1: rf.economia >= 0 ? 'Abaixo do previsto ✓' : 'Acima do previsto !',
                            glow: rf.economia >= 0 ? '29,78,216' : '220,38,38',
                            color: rf.economia >= 0 ? '#60A5FA' : '#f87171',
                            bg: rf.economia >= 0 ? '#EFF6FF' : '#FEF2F2',
                            border: rf.economia >= 0 ? '#BFDBFE' : '#FECACA',
                        },
                    ].map((card, i) => (
                        <AnimatedKpiCard
                            key={card.label}
                            label={card.label}
                            value={0}
                            displayValue={card.value}
                            sub={card.sub1}
                            color={card.color}
                            bg={`linear-gradient(135deg, rgba(${card.glow},0.08), ${card.bg})`}
                            border={card.border}
                            delayMs={i * 90}
                            compact
                            icon={<span style={{ fontSize: '1rem', lineHeight: 1 }}>{card.icon}</span>}
                        />
                    ))}
                </div>
            )}

            {/* Ações de lançamento */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => setShowModal('ABASTECIMENTO')} style={{ padding: '9px 18px', borderRadius: 9, background: '#FFF9C4', border: '1px solid #FFE97A', color: '#92400E', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>⛽ + Abastecimento</button>
                <button onClick={() => setShowModal('DESPESA_GERAL')} style={{ padding: '9px 18px', borderRadius: 9, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>📋 + Despesa Geral</button>
                <select style={{ ...INPUT, width: 'auto', minWidth: 160 }} value={filter} onChange={e => { setFilter(e.target.value); setCustoPage(1); }}>
                    <option value="">Todos os tipos</option>
                    <option value="ABASTECIMENTO">Abastecimentos</option>
                    <option value="DESPESA_GERAL">Despesas Gerais</option>
                    <option value="DIARIA_FUNCIONARIO">Diárias</option>
                </select>
            </div>

            {/* Tabela */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', background: '#FFFDE7', borderRadius: '16px 16px 0 0' }}>
                    <span style={{ fontFamily: 'Orbitron', fontSize: '0.68rem', fontWeight: 800, color: '#B89B00', letterSpacing: '0.1em' }}>📊 LANÇAMENTOS ({custosFiltrados.length})</span>
                </div>
                {custosFiltrados.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: '0.88rem' }}>Nenhum lançamento registrado.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>{filter === 'ABASTECIMENTO' ? 'Litros' : filter === 'DIARIA_FUNCIONARIO' ? 'Dias Trab.' : filter === 'DESPESA_GERAL' ? 'Detalhe' : 'Detalhe'}</th><th>Valor</th><th></th></tr></thead>
                            <tbody>
                                {custosPaged.map(c => {
                                    const tb = tipoBadge[c.tipo];
                                    return (
                                        <tr key={c.id}>
                                            <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(c.data)}</td>
                                            <td><span style={{ padding: '3px 10px', background: tb.bg, color: tb.color, border: `1px solid ${tb.border}`, borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>{tb.label}</span></td>
                                            <td>{c.descricao}</td>
                                            <td style={{ fontSize: '0.82rem', color: '#374151' }}>
                                                {c.tipo === 'ABASTECIMENTO' && (
                                                    c.litros ? <span style={{ fontFamily: 'JetBrains Mono', background: '#FFF9C4', color: '#92400E', padding: '2px 8px', borderRadius: 5, fontWeight: 700, border: '1px solid #FFE97A' }}>{c.litros}L</span> : <span style={{ color: '#D1D5DB' }}>—</span>
                                                )}
                                                {c.tipo === 'DIARIA_FUNCIONARIO' && (() => {
                                                    const match = c.observacoes?.match(/^(\d+)\s*dia/);
                                                    const dias = match ? match[1] : null;
                                                    return dias
                                                        ? <span style={{ fontFamily: 'JetBrains Mono', background: '#DCFCE7', color: '#065F46', padding: '2px 8px', borderRadius: 5, fontWeight: 700, border: '1px solid #BBF7D0' }}>{dias} dias</span>
                                                        : <span style={{ color: '#D1D5DB' }}>—</span>;
                                                })()}
                                                {c.tipo === 'DESPESA_GERAL' && (
                                                    c.observacoes
                                                        ? <span style={{ color: '#6B7280', fontStyle: 'italic', fontSize: '0.78rem', maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.observacoes}>{c.observacoes}</span>
                                                        : <span style={{ color: '#D1D5DB' }}>—</span>
                                                )}
                                            </td>
                                            <td><strong style={{ color: '#059669' }}>{fmtCurrency(c.valor)}</strong></td>
                                             <td>{confirmRemoverCusto === c.id ? (
                                                 <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                     <span style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 600 }}>Confirmar?</span>
                                                     <button className="btn-danger" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => remover(c.id)}>Sim</button>
                                                     <button className="btn-ghost" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => setConfirmRemoverCusto(null)}>Não</button>
                                                 </span>
                                             ) : (
                                                 <button className="btn-danger" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => setConfirmRemoverCusto(c.id)}>Remover</button>
                                             )}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <AdminListPagination
                    page={custoPage}
                    totalPages={custosTotalPages}
                    total={custosFiltrados.length}
                    onPageChange={setCustoPage}
                    itemLabel="lançamento(s)"
                    style={{ padding: '0 20px 16px' }}
                />
            </div>

            {/* Modal de custo */}
            {showModal && (
                <ModalPortal>
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowModal(null)}>
                    <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '18px 24px 12px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10, background: '#FFFDE7', borderRadius: '18px 18px 0 0' }}>
                            <span style={{ fontSize: '1.2rem' }}>{showModal === 'ABASTECIMENTO' ? '⛽' : '📋'}</span>
                            <div>
                                <h3 style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 900, color: '#111827', margin: 0 }}>{showModal === 'ABASTECIMENTO' ? 'ABASTECIMENTO' : 'DESPESA GERAL'}</h3>
                            </div>
                            <button onClick={() => setShowModal(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
                        </div>
                        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div><label style={LABEL}>Descrição *</label><input style={INPUT} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder={showModal === 'ABASTECIMENTO' ? 'Ex: Abast. posto km 350' : 'Ex: Café da manhã equipe'} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div><label style={LABEL}>Valor (R$) *</label><input type="number" step="0.01" style={INPUT} value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} /></div>
                                <div><label style={LABEL}>Data *</label><input type="date" style={INPUT} value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
                            </div>
                            {showModal === 'ABASTECIMENTO' && <div><label style={LABEL}>Litros</label><input type="number" step="0.1" style={INPUT} value={form.litros} onChange={e => setForm(f => ({ ...f, litros: e.target.value }))} placeholder="Ex: 85.5" /></div>}
                            <div><label style={LABEL}>Observações</label><input style={INPUT} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid #F3F4F6' }}>
                                <button onClick={() => setShowModal(null)} style={{ padding: '8px 18px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 9, cursor: 'pointer', fontSize: '0.85rem', color: '#6B7280', fontWeight: 600 }}>Cancelar</button>
                                <button className="btn-primary" onClick={submitCusto} disabled={loading || !form.descricao || !form.valor}>
                                    {loading ? 'Salvando...' : '💾 Salvar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}
        </div>
    );
}

// ── TabFuncionários ────────────────────────────────────────────

const ROLE_CFG: Record<string, { label: string; icon: string; color: string; glow: string; bg: string }> = {
    INSTRUCTOR: { label: 'Instrutor', icon: '🎓', color: '#B45309', glow: 'rgba(180,83,9,0.4)', bg: 'rgba(251,191,36,0.08)' },
    DRIVER: { label: 'Motorista', icon: '🚚', color: '#1D4ED8', glow: 'rgba(29,78,216,0.4)', bg: 'rgba(59,130,246,0.08)' },
    COORDINATOR: { label: 'Coordenador', icon: '🌟', color: '#7C3AED', glow: 'rgba(124,58,237,0.4)', bg: 'rgba(139,92,246,0.08)' },
    NURSE: { label: 'Enfermeiro(a)', icon: '🏥', color: '#DC2626', glow: 'rgba(220,38,38,0.4)', bg: 'rgba(239,68,68,0.08)' },
    TECHNICIAN: { label: 'Técnico', icon: '🔧', color: '#059669', glow: 'rgba(5,150,105,0.4)', bg: 'rgba(16,185,129,0.08)' },
    ADMINISTRATIVE: { label: 'Administrativo', icon: '💼', color: '#0891B2', glow: 'rgba(8,145,178,0.4)', bg: 'rgba(14,165,233,0.08)' },
    OTHER: { label: 'Outro', icon: '👤', color: '#6B7280', glow: 'rgba(107,114,128,0.4)', bg: 'rgba(156,163,175,0.08)' },
};

function TabFuncionarios({ acao, onUpdate }: { acao: Acao; onUpdate: () => void | Promise<void> }) {
    const [funcionarios, setFuncionarios] = useState<NonNullable<Acao['funcionarios']>>([]);
    const [funcPage, setFuncPage] = useState(1);
    const [funcTotal, setFuncTotal] = useState(0);
    const [funcTotalPages, setFuncTotalPages] = useState(1);
    const [loadingFunc, setLoadingFunc] = useState(false);

    const diasCorridos = (() => {
        if (!acao.dataInicio || !acao.dataFim) return 1;
        const diff = new Date(acao.dataFim).getTime() - new Date(acao.dataInicio).getTime();
        return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
    })();

    const [calResumo, setCalResumo] = useState<{
        temTurma: boolean;
        diasLetivos: number;
        diasCorridos: number;
        aviso?: string;
        paymentNote?: string;
        workloadScopeNote?: string;
        suggestedDiasPagamento?: number;
        paymentAdjustmentNote?: string;
        applyPaymentSuggestionRecommended?: boolean;
        teachingDaysTarget?: number;
        formulaLabel?: string;
        motorResumo?: string;
        motorCourseName?: string;
        courseWorkloadHours?: number;
        hoursPerSession?: number;
        workload?: { status: string; message: string } | null;
    } | null>(null);

    const [occDates, setOccDates] = useState('');
    const [occReason, setOccReason] = useState('');
    const [occLoading, setOccLoading] = useState(false);

    const diasSugeridos =
        calResumo?.suggestedDiasPagamento ?? calResumo?.diasLetivos ?? diasCorridos;

    const [editDias, setEditDias] = useState<Record<string, number>>({});
    const [hovCard, setHovCard] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
    const [recalcMotorLoading, setRecalcMotorLoading] = useState(false);
    const [recalcMotorResult, setRecalcMotorResult] = useState<string | null>(null);
    const [regeneratingTrips, setRegeneratingTrips] = useState<string | null>(null);

    const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

    const recalcularMotor = async () => {
        if (!(acao.turmas?.length ?? 0)) {
            showToast('Vincule turmas na aba Turmas antes de recalcular.', false);
            return;
        }
        setRecalcMotorLoading(true);
        setRecalcMotorResult(null);
        try {
            const res = await acoesApi.recalcularMotorPeriodo(acao.id);
            setRecalcMotorResult(res.message);
            showToast(res.message, true);
            await onUpdate();
            const fresh = await acoesApi.getCalendarioResumo(acao.id);
            setCalResumo(fresh);
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Erro ao recalcular o período.', false);
        } finally {
            setRecalcMotorLoading(false);
        }
    };

    useEffect(() => {
        acoesApi.getCalendarioResumo(acao.id).then(setCalResumo).catch(() => setCalResumo(null));
    }, [acao.id, acao.dataInicio, acao.dataFim, acao.turmas?.length, acao.period, acao.startTime, acao.endTime]);

    const loadFuncionarios = useCallback(async () => {
        setLoadingFunc(true);
        try {
            const raw = await acoesApi.listFuncionarios(acao.id, { page: funcPage, limit: ADMIN_PAGE_SIZE_CARDS });
            const norm = normalizePaginated<NonNullable<Acao['funcionarios']>[number]>(raw, ADMIN_PAGE_SIZE_CARDS);
            setFuncionarios(norm.data);
            setFuncTotal(norm.total);
            setFuncTotalPages(norm.totalPages);
        } catch {
            setFuncionarios([]);
            setFuncTotal(0);
            setFuncTotalPages(1);
        } finally {
            setLoadingFunc(false);
        }
    }, [acao.id, funcPage]);

    useEffect(() => { loadFuncionarios(); }, [loadFuncionarios]);

    const updateDias = async (employeeId: string) => {
        const dias = editDias[employeeId];
        if (dias === undefined) return;
        await acoesApi.updateFuncionarioDias(acao.id, employeeId, dias);
        showToast('Dias atualizados!', true);
        onUpdate();
    };

    const remover = async (employeeId: string) => {
        try {
            await acoesApi.removeFuncionario(acao.id, employeeId);
            setConfirmRemove(null);
            showToast('Funcionário removido com sucesso.', true);
            onUpdate();
        } catch (e: any) {
            setConfirmRemove(null);
            showToast(e?.response?.data?.message || 'Erro ao remover funcionário', false);
        }
    };

    const regenerarViagens = async (employeeId: string) => {
        setRegeneratingTrips(employeeId);
        try {
            const res = await acoesApi.regenerateFuncionarioTrips(acao.id, employeeId);
            const detail = res.perClass?.length
                ? res.perClass.map(pc => `${pc.classIdentifier || 'Turma'}: ${pc.generated} — ${pc.message}`).join(' | ')
                : res.message;
            if ((res.tripsGenerated ?? 0) === 0) {
                showToast(res.tripsWarning ? `${detail}. ${res.tripsWarning}` : detail, false);
            } else {
                showToast(`${res.message} (${res.tripsGenerated} viagem(ns))`, true);
            }
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Erro ao regenerar viagens.', false);
        } finally {
            setRegeneratingTrips(null);
        }
    };

    const submitOcorrencia = async () => {
        const dates = occDates
            .split(/[\n,;]+/)
            .map((d) => d.trim())
            .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
        if (!dates.length || !occReason.trim()) {
            showToast('Informe data(s) YYYY-MM-DD e motivo.', false);
            return;
        }
        setOccLoading(true);
        try {
            const res = await holidayApi.registerAcaoHolidays(acao.id, {
                dates,
                reason: occReason.trim(),
            });
            setOccDates('');
            setOccReason('');
            showToast(res.message || 'Ocorrência registrada.', true);
            acoesApi.getCalendarioResumo(acao.id).then(setCalResumo).catch(() => {});
            onUpdate();
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Erro ao registrar ocorrência', false);
        } finally {
            setOccLoading(false);
        }
    };

    const totalEstimado = (acao.funcionarios || []).reduce((sum, f) => {
        const dias = editDias[f.employeeId] ?? f.diasTrabalhados;
        return sum + Number(f.valorDiaria) * dias;
    }, 0);

    const funcionariosList = funcionarios.length > 0 ? funcionarios : (acao.funcionarios || []);

    const FMT_CSS: React.CSSProperties = {
        width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9,
        border: '1.5px solid #E5E7EB', background: '#F9FAFB',
        fontSize: '0.85rem', color: '#111827', outline: 'none', fontFamily: 'inherit',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* TOAST */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 80, right: 24, zIndex: 9999, padding: '12px 20px',
                    background: toast.ok ? '#D1FAE5' : '#FEE2E2',
                    border: `1px solid ${toast.ok ? '#6EE7B7' : '#FCA5A5'}`,
                    borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    fontSize: '0.85rem', fontWeight: 600, color: toast.ok ? '#065F46' : '#991B1B',
                    animation: 'counter-up 0.25s both'
                }}>{toast.msg}</div>
            )}

            <div style={{ padding: '14px 18px', borderRadius: 14, border: '1px solid #E5E7EB', background: '#FAFAFA', fontSize: '0.8rem', color: '#4B5563', lineHeight: 1.55 }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: '0.62rem', fontWeight: 800, color: '#374151', letterSpacing: '0.1em', marginBottom: 8 }}>
                    COMO ESTA ABA FUNCIONA
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                    <li><strong>Motor do período</strong> — turno, feriados e carga horária definem os dias letivos para pagamento.</li>
                    <li><strong>Um único vínculo</strong> — busque no cadastro de Funcionários; ao confirmar, cria o card de diária.</li>
                    <li><strong>Instrutor</strong> — escolha a turma/curso; as diárias seguem a carga daquele curso (ex.: 60h ≠ 120h). <strong>Motorista e demais</strong> — usam o motor do período (recalcule após vincular turmas novas).</li>
                </ul>
            </div>

            {calResumo && (
                <div
                    style={{
                        padding: '14px 18px',
                        borderRadius: 14,
                        border: '1px solid #BFDBFE',
                        background: 'linear-gradient(180deg, #EFF6FF 0%, #F8FAFC 100%)',
                    }}
                >
                    <div style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 800, color: '#1D4ED8', letterSpacing: '0.1em', marginBottom: 8 }}>
                        MOTOR DO PERÍODO (FONTE DAS DIÁRIAS)
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 1.25rem', fontSize: '0.82rem', color: '#1E3A8A', marginBottom: 8 }}>
                        {calResumo.motorCourseName ? (
                            <span>
                                Curso motor: <strong>{calResumo.motorCourseName}</strong>
                                {calResumo.courseWorkloadHours ? ` (${calResumo.courseWorkloadHours}h)` : ''}
                            </span>
                        ) : null}
                        <span style={{ fontWeight: 700 }}>Diárias: {diasSugeridos} dia(s)</span>
                        {calResumo.teachingDaysTarget != null ? (
                            <span>{calResumo.teachingDaysTarget} encontro(s) no contrato</span>
                        ) : null}
                    </div>
                    {calResumo.motorResumo ? (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#334155', lineHeight: 1.5 }}>{calResumo.motorResumo}</p>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 1.25rem', fontSize: '0.82rem', color: '#1E3A8A' }}>
                            <span><strong>{calResumo.diasLetivos}</strong> dias letivos no período</span>
                            <span><strong>{calResumo.diasCorridos}</strong> dias corridos</span>
                            {calResumo.formulaLabel ? <span>{calResumo.formulaLabel}</span> : null}
                        </div>
                    )}
                    {calResumo.aviso ? (
                        <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#991B1B', lineHeight: 1.45, fontWeight: 600 }}>
                            {calResumo.aviso}
                        </p>
                    ) : null}
                    {!calResumo.motorResumo && calResumo.paymentNote ? (
                        <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#1D4ED8', lineHeight: 1.45 }}>{calResumo.paymentNote}</p>
                    ) : null}
                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                        <button
                            type="button"
                            className="btn-primary"
                            style={{ fontSize: '0.78rem', padding: '8px 14px' }}
                            disabled={recalcMotorLoading || !(acao.turmas?.length ?? 0)}
                            onClick={recalcularMotor}
                        >
                            {recalcMotorLoading ? 'Recalculando…' : 'Recalcular período pelas turmas'}
                        </button>
                        <span style={{ fontSize: '0.72rem', color: '#64748B', maxWidth: 420, lineHeight: 1.4 }}>
                            Ajusta a data fim do período e de cada turma conforme a carga horária de cada curso (ex.: Administração 120h estende o período; Cybersecurity 60h mantém o fim próprio).
                        </span>
                    </div>
                    {recalcMotorResult ? (
                        <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: '#065F46', lineHeight: 1.45 }}>{recalcMotorResult}</p>
                    ) : null}
                </div>
            )}

            {/* AVISO CONTA A PAGAR */}
            {(acao.funcionarios?.length ?? 0) > 0 && acao.status !== 'EM_ANDAMENTO' && (
                <div style={{
                    padding: '14px 20px', borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(255,214,0,0.12), rgba(255,214,0,0.04))',
                    border: '1.5px solid rgba(255,214,0,0.45)',
                    boxShadow: '0 0 24px rgba(255,214,0,0.12)',
                    display: 'flex', alignItems: 'center', gap: 14,
                }}>
                    <div style={{ fontSize: '1.5rem' }}>⚡</div>
                    <div>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 800, color: '#B89B00', letterSpacing: '0.12em', marginBottom: 4 }}>GERAÇÃO AUTOMÁTICA AO ATIVAR</div>
                        <div style={{ fontSize: '0.82rem', color: '#374151' }}>
                            Ao mudar o status para <strong>Em Andamento</strong>, serão gerados automaticamente{' '}
                            <strong style={{ color: '#059669', fontFamily: 'Orbitron', fontSize: '0.88rem' }}>{fmtCurrency(totalEstimado)}</strong>{' '}
                            em <strong>Contas a Pagar</strong> (diárias dos funcionários).
                        </div>
                    </div>
                </div>
            )}

            {calResumo?.temTurma && (
                <div style={{ padding: '16px 20px', borderRadius: 14, border: '1px solid #E5E7EB', background: '#fff' }}>
                    <div style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 800, color: '#6B7280', marginBottom: 10, letterSpacing: '0.1em' }}>
                        REGISTRAR DIA SEM AULA (OCORRÊNCIA)
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                        <div>
                            <label style={LABEL}>Datas (YYYY-MM-DD, uma por linha)</label>
                            <textarea style={{ ...FMT_CSS, minHeight: 64 }} value={occDates} onChange={(e) => setOccDates(e.target.value)} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                            <div>
                                <label style={LABEL}>Motivo</label>
                                <input style={FMT_CSS} value={occReason} onChange={(e) => setOccReason(e.target.value)} />
                            </div>
                            <button type="button" className="btn-secondary" disabled={occLoading} onClick={submitOcorrencia} style={{ height: 42 }}>
                                {occLoading ? 'Registrando…' : 'Registrar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AcaoEquipeVinculoPanel
                acao={acao}
                calResumo={calResumo}
                diasSugeridos={diasSugeridos}
                onUpdate={onUpdate}
            />

            {/* CARDS DE FUNCIONÁRIOS */}
            {funcionariosList.length === 0 && !loadingFunc ? (
                <div style={{ textAlign: 'center', padding: '50px 24px', background: '#fff', borderRadius: 16, border: '1px solid #F3F4F6' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.3 }}>👷</div>
                    <h3 style={{ color: '#374151', fontSize: '1rem', margin: '0 0 6px', fontFamily: 'Orbitron' }}>Nenhum funcionário vinculado</h3>
                    <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>Adicione funcionários acima. Ao ativar a ação, as diárias serão geradas automaticamente em Contas a Pagar.</p>
                </div>
            ) : (
                <>
                    {/* Resumo Total */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px', borderRadius: 14,
                        background: 'linear-gradient(135deg, rgba(5,150,105,0.08), rgba(16,185,129,0.03))',
                        border: '1px solid rgba(5,150,105,0.25)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '1.2rem' }}>💰</span>
                            <span style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 800, color: '#065F46', letterSpacing: '0.12em' }}>CUSTO ESTIMADO DE DIÁRIAS</span>
                        </div>
                        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.2rem', color: '#059669', filter: 'drop-shadow(0 0 10px rgba(5,150,105,0.4))' }}>
                            {fmtCurrency(totalEstimado)}
                        </div>
                    </div>

                    {/* Cards Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                        {funcionariosList.map((f) => {
                            const emp = f.employee;
                            const cfg = ROLE_CFG[emp?.role || 'OTHER'] || ROLE_CFG.OTHER;
                            const dias = editDias[f.employeeId] ?? f.diasTrabalhados;
                            const custo = Number(f.valorDiaria) * dias;
                            const isHov = hovCard === f.employeeId;

                            return (
                                <div key={f.employeeId}
                                    onMouseEnter={() => setHovCard(f.employeeId)}
                                    onMouseLeave={() => setHovCard(null)}
                                    style={{
                                        position: 'relative', overflow: 'hidden',
                                        borderRadius: 18, background: '#fff',
                                        border: `1.5px solid ${isHov ? cfg.color + '60' : cfg.color + '20'}`,
                                        boxShadow: isHov ? `0 0 32px ${cfg.glow}, 0 8px 28px rgba(0,0,0,0.1)` : '0 2px 10px rgba(0,0,0,0.05)',
                                        transition: 'all 0.3s cubic-bezier(0.23,1,0.32,1)',
                                        transform: isHov ? 'perspective(800px) rotateX(-2deg) rotateY(3deg) translateY(-5px)' : 'none',
                                        animation: 'counter-up 0.4s both',
                                    }}>
                                    {/* Barra de cor superior */}
                                    <div style={{ height: 4, background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`, opacity: isHov ? 1 : 0.6, transition: 'opacity 0.3s' }} />

                                    {/* Grid de fundo animado */}
                                    <div style={{
                                        position: 'absolute', inset: 0, pointerEvents: 'none',
                                        backgroundImage: `linear-gradient(${cfg.color}06 1px,transparent 1px),linear-gradient(90deg,${cfg.color}06 1px,transparent 1px)`,
                                        backgroundSize: '24px 24px', opacity: isHov ? 1 : 0, transition: 'opacity 0.4s'
                                    }} />

                                    <div style={{ padding: '18px 20px' }}>
                                        {/* Header */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                                            {/* Avatar */}
                                            <div style={{
                                                width: 58, height: 58, borderRadius: 14, flexShrink: 0,
                                                background: `linear-gradient(135deg, ${cfg.color}30, ${cfg.color}10)`,
                                                border: `2px solid ${cfg.color}50`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '1.6rem',
                                                boxShadow: `0 0 20px ${cfg.glow}`,
                                                position: 'relative',
                                            }}>
                                                {cfg.icon}
                                                {/* Active dot */}
                                                <div style={{
                                                    position: 'absolute', bottom: -2, right: -2,
                                                    width: 12, height: 12, borderRadius: '50%',
                                                    background: emp?.active ? '#10B981' : '#6B7280',
                                                    border: '2px solid #fff',
                                                    boxShadow: emp?.active ? '0 0 8px rgba(16,185,129,0.6)' : 'none',
                                                }} />
                                            </div>

                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827', marginBottom: 3 }}>{emp?.name || '—'}</div>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.color}30`, fontSize: '0.68rem', fontWeight: 700, color: cfg.color }}>
                                                        {cfg.icon} {cfg.label}
                                                    </span>
                                                </div>
                                                {emp?.specialty && <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>{emp.specialty}</div>}
                                            </div>

                                            {/* Custo badge */}
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: '#059669', filter: 'drop-shadow(0 0 8px rgba(5,150,105,0.4))' }}>{fmtCurrency(custo)}</div>
                                                <div style={{ fontSize: '0.62rem', color: '#9CA3AF', marginTop: 2 }}>{dias} dia(s) letivo(s)</div>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${cfg.color}30, transparent)`, marginBottom: 14 }} />

                                        {/* Diária e Dias editor */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                                            <div style={{ padding: '10px 14px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.color}20`, textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.6rem', color: cfg.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Diária</div>
                                                <div style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '0.95rem', color: cfg.color }}>{fmtCurrency(f.valorDiaria)}</div>
                                            </div>
                                            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.6rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Dias Trabalhados</div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                    <input type="number" min={1} value={editDias[f.employeeId] ?? f.diasTrabalhados}
                                                        onChange={e => setEditDias(d => ({ ...d, [f.employeeId]: Number(e.target.value) }))}
                                                        style={{ width: 72, padding: '4px 8px', border: `1.5px solid ${cfg.color}40`, borderRadius: 7, textAlign: 'center', fontSize: '0.88rem', outline: 'none', background: '#fff', color: '#111827', fontFamily: 'Orbitron' }} />
                                                    <button onClick={() => updateDias(f.employeeId)} style={{
                                                        padding: '4px 10px', borderRadius: 7, background: `${cfg.color}15`, border: `1px solid ${cfg.color}40`,
                                                        color: cfg.color, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700
                                                    }}>✓</button>
                                                </div>
                                                <p style={{ fontSize: '0.65rem', color: '#6B7280', marginTop: 8, lineHeight: 1.4, textAlign: 'left' }}>
                                                    {dias} dia(s) letivo(s) no período — diária × dias (motor do período).
                                                </p>
                                                {calResumo?.suggestedDiasPagamento != null && (editDias[f.employeeId] ?? f.diasTrabalhados) !== diasSugeridos && (
                                                    <button
                                                        type="button"
                                                        className="btn-secondary"
                                                        style={{ fontSize: '0.65rem', marginTop: 6, width: '100%' }}
                                                        onClick={() => setEditDias(d => ({ ...d, [f.employeeId]: diasSugeridos }))}
                                                    >
                                                        Usar {diasSugeridos} dia(s) do motor
                                                    </button>
                                                )}
                                                {calResumo?.workload?.status === 'short' && calResumo.workload.message && (
                                                    <p style={{ fontSize: '0.64rem', color: '#991B1B', marginTop: 6, lineHeight: 1.35, fontWeight: 600 }}>
                                                        {calResumo.workload.message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Contato */}
                                        {(emp?.phone || emp?.email) && (
                                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                                                {emp.phone && <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>📞 {emp.phone}</span>}
                                                {emp.email && <span style={{ fontSize: '0.72rem', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>📧 {emp.email}</span>}
                                            </div>
                                        )}

                                        {/* Ações */}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                                            {emp?.role === 'DRIVER' && (
                                                <button
                                                    type="button"
                                                    disabled={regeneratingTrips === f.employeeId}
                                                    onClick={() => regenerarViagens(f.employeeId)}
                                                    style={{
                                                        padding: '6px 14px', borderRadius: 9,
                                                        background: 'rgba(29,78,216,0.08)', border: '1px solid rgba(29,78,216,0.35)',
                                                        color: '#1D4ED8', fontWeight: 700, fontSize: '0.75rem',
                                                        cursor: regeneratingTrips === f.employeeId ? 'wait' : 'pointer',
                                                    }}
                                                >
                                                    {regeneratingTrips === f.employeeId ? 'Gerando…' : '🚛 Regenerar viagens'}
                                                </button>
                                            )}
                                            {confirmRemove === f.employeeId ? (
                                                <>
                                                    <span style={{ fontSize: '0.75rem', color: '#DC2626', alignSelf: 'center', fontWeight: 600 }}>Confirmar remoção?</span>
                                                    <button onClick={() => remover(f.employeeId)} style={{
                                                        padding: '6px 14px', borderRadius: 9,
                                                        background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.5)',
                                                        color: '#DC2626', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
                                                    }}>✓ Sim</button>
                                                    <button onClick={() => setConfirmRemove(null)} style={{
                                                        padding: '6px 14px', borderRadius: 9,
                                                        background: '#F3F4F6', border: '1px solid #E5E7EB',
                                                        color: '#6B7280', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                                                    }}>✕ Não</button>
                                                </>
                                            ) : (
                                                <button onClick={() => setConfirmRemove(f.employeeId)} style={{
                                                    padding: '6px 14px', borderRadius: 9,
                                                    background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
                                                    color: '#DC2626', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.15)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.06)'; }}>
                                                    ✕ Remover
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <AdminListPagination
                        page={funcPage}
                        totalPages={funcTotalPages}
                        total={funcTotal}
                        loading={loadingFunc}
                        onPageChange={setFuncPage}
                        itemLabel="funcionário(s)"
                    />
                </>
            )}
        </div>
    );
}

// ── TabInscricoes ───────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    PENDING:            { label: 'Pendente',     color: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
    APPROVED:           { label: 'Aprovada',     color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7' },
    ENROLLED:           { label: 'Matriculado',  color: '#1E3A8A', bg: '#DBEAFE', border: '#93C5FD' },
    REJECTED:           { label: 'Rejeitada',    color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5' },
    WAITLIST:           { label: 'Lista Espera', color: '#92400E', bg: '#FEF9C3', border: '#FEF08A' },
    DROPOUT:            { label: 'Desistente',   color: '#374151', bg: '#F3F4F6', border: '#D1D5DB' },
    CORRECTION_NEEDED:  { label: 'Correção',     color: '#7C3AED', bg: '#EDE9FE', border: '#C4B5FD' },
    DOCUMENT_PENDING:   { label: 'Doc. Pendente',color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
};

function StatusBadge({ status }: { status: string }) {
    const c = STATUS_CFG[status] || { label: status, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
    return <span style={{ fontSize: '0.7rem', fontWeight: 700, color: c.color, background: c.bg, border: `1px solid ${c.border}`, padding: '2px 10px', borderRadius: 20 }}>{c.label}</span>;
}

function TabInscricoes({ acao, onRefresh }: { acao: Acao; onRefresh: () => void }) {
    const [query, setQuery] = useState('');
    const [buscaRes, setBuscaRes] = useState<any[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [aluno, setAluno] = useState<any | null>(null);
    const [turmaSel, setTurmaSel] = useState('');
    const [showDrop, setShowDrop] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debRef = useRef<NodeJS.Timeout>();

    const [inscPorTurma, setInscPorTurma] = useState<Record<string, any>>({});
    const [inscPage, setInscPage] = useState(1);
    const [inscTotal, setInscTotal] = useState(0);
    const [inscTotalPages, setInscTotalPages] = useState(1);
    const [loadingInsc, setLoadingInsc] = useState(false);
    const [filtroStatus, setFiltroStatus] = useState('TODOS');
    const [filtroTurma, setFiltroTurma] = useState('TODAS');
    const [inscrevendo, setInscrevendo] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [loadingAct, setLoadingAct] = useState<string | null>(null);
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);

    const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

    const carregarInsc = useCallback(async () => {
        if (!acao.turmas?.length) return;
        setLoadingInsc(true);
        try {
            const res = await Promise.all(
                acao.turmas.map(at =>
                    api.get(`/enrollments`, {
                        params: { classId: at.turmaId, page: inscPage, limit: ADMIN_PAGE_SIZE_TABLE },
                    }).then(r => {
                        const norm = normalizePaginated(r.data, ADMIN_PAGE_SIZE_TABLE);
                        return {
                            turmaId: at.turmaId,
                            turmaIdentifier: at.turma?.classIdentifier || at.turmaId,
                            curso: at.turma?.course?.name || '—',
                            vagas: at.turma?.vacancies || 0,
                            inscritos: norm.data,
                            total: norm.total,
                        };
                    }).catch(() => ({ turmaId: at.turmaId, turmaIdentifier: at.turmaId, curso: '—', vagas: 0, inscritos: [], total: 0 }))
                )
            );
            const mapa: Record<string, any> = {};
            let totalInsc = 0;
            res.forEach(r => { mapa[r.turmaId] = r; totalInsc += r.total || r.inscritos?.length || 0; });
            setInscPorTurma(mapa);
            setInscTotal(totalInsc);
            setInscTotalPages(Math.max(1, Math.ceil(totalInsc / ADMIN_PAGE_SIZE_TABLE)));
        } finally { setLoadingInsc(false); }
    }, [acao, inscPage]);

    useEffect(() => { setInscPage(1); }, [filtroStatus, filtroTurma]);

    useEffect(() => { carregarInsc(); }, [carregarInsc]);

    useEffect(() => {
        clearTimeout(debRef.current);
        if (query.length < 2) { setBuscaRes([]); return; }
        setBuscando(true);
        debRef.current = setTimeout(async () => {
            try {
                const r = await api.get(`/admin/students?search=${encodeURIComponent(query)}&limit=8`);
                const d = r.data?.data || r.data || [];
                setBuscaRes(Array.isArray(d) ? d : []);
                setShowDrop(true);
            } catch { setBuscaRes([]); } finally { setBuscando(false); }
        }, 320);
    }, [query]);

    useEffect(() => {
        const close = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDrop(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const inscrever = async () => {
        if (!aluno || !turmaSel) return;
        setInscrevendo(true);
        try {
            // Usa o endpoint admin que não exige ENROLLMENT_OPEN e usa studentId diretamente
            await api.post('/enrollments/admin', {
                studentId: aluno.id,
                classId: turmaSel,
            });
            showToast(`✅ ${aluno.user?.name || aluno.fullName} inscrito com sucesso!`, true);
            setAluno(null); setQuery(''); setTurmaSel('');
            carregarInsc(); onRefresh();
        } catch (e: any) {
            showToast(`❌ ${e?.response?.data?.message || 'Erro ao inscrever'}`, false);
        } finally { setInscrevendo(false); }
    };

    const acaoInsc = async (id: string, tipo: 'approve' | 'reject' | 'waitlist') => {
        setLoadingAct(id + tipo);
        try {
            if (tipo === 'approve') await api.patch(`/enrollments/${id}/approve`, { notes: 'Aprovado pelo administrador' });
            else if (tipo === 'reject') await api.patch(`/enrollments/${id}/reject`, { rejectionReason: 'Rejeitado pelo administrador' });
            else await api.patch(`/enrollments/${id}/waitlist`, { reason: '' });
            showToast('Status atualizado!', true); carregarInsc();
        } catch (e: any) { showToast(e?.response?.data?.message || 'Erro', false); }
        finally { setLoadingAct(null); }
    };

    const todas = Object.values(inscPorTurma).flatMap((t: any) =>
        (t.inscritos as any[]).map((i: any) => ({ ...i, _tid: t.turmaId, _tId: t.turmaIdentifier, _curso: t.curso }))
    );
    const filtradas = todas.filter(i => {
        if (filtroStatus !== 'TODOS' && i.status !== filtroStatus) return false;
        if (filtroTurma !== 'TODAS' && i._tid !== filtroTurma) return false;
        return true;
    });

    const BTN: React.CSSProperties = { padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, transition: 'opacity 0.15s' };
    const INPUT: React.CSSProperties = { width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9, border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as const };
    const LBL: React.CSSProperties = { display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: '#6B7280', marginBottom: 5 };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {toast && (
                <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 9999, padding: '12px 20px', background: toast.ok ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${toast.ok ? '#6EE7B7' : '#FCA5A5'}`, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '0.85rem', fontWeight: 600, color: toast.ok ? '#065F46' : '#991B1B', animation: 'slideUp 0.25s' }}>
                    {toast.msg}
                </div>
            )}

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12 }}>
                {[
                    { label: 'Total', val: todas.length, icon: '👥', glow: '255,214,0', color: '#FFD600' },
                    { label: 'Aprovados', val: todas.filter(i => i.status === 'APPROVED').length, icon: '✅', glow: '52,211,153', color: '#34D399' },
                    { label: 'Pendentes', val: todas.filter(i => i.status === 'PENDING').length, icon: '⏳', glow: '251,191,36', color: '#FBBF24' },
                    { label: 'Lista Espera', val: todas.filter(i => i.status === 'WAITLIST').length, icon: '🕐', glow: '96,165,250', color: '#60A5FA' },
                ].map((k, i) => (
                    <AnimatedKpiCard
                        key={k.label}
                        label={k.label}
                        value={k.val}
                        color={k.color}
                        bg={`linear-gradient(135deg, rgba(${k.glow},0.12), transparent)`}
                        border={k.color}
                        delayMs={i * 80}
                        icon={<span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{k.icon}</span>}
                    />
                ))}
            </div>

            {/* AVISO: sem turmas vinculadas */}
            {(!acao.turmas || acao.turmas.length === 0) && (
                <div style={{
                    padding: '20px 24px', borderRadius: 16,
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.04))',
                    border: '1.5px solid rgba(251,191,36,0.5)',
                    boxShadow: '0 0 20px rgba(251,191,36,0.1)',
                    display: 'flex', alignItems: 'center', gap: 16,
                }}>
                    <div style={{ fontSize: '2rem', flexShrink: 0 }}>📭</div>
                    <div>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', fontWeight: 800, color: '#92400E', letterSpacing: '0.08em', marginBottom: 4 }}>
                            NENHUMA TURMA VINCULADA A ESTA AÇÃO
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#78350F', lineHeight: 1.5 }}>
                            Para inscrever alunos, primeiro vincule pelo menos uma turma na aba <strong>🎓 Turmas</strong>.
                            Após vincular, as turmas estarão disponíveis no seletor abaixo.
                        </div>
                    </div>
                </div>
            )}

            {/* Inscrever aluno */}
            <div style={{ background: 'var(--bg-card)', border: '1.5px solid #FEF08A', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'relative', overflow: 'visible' }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 800, color: '#B89B00', letterSpacing: '0.12em', marginBottom: 14 }}>➕ INSCREVER ALUNO MANUALMENTE</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                    <div ref={searchRef} style={{ position: 'relative' }}>
                        <label style={LBL}>Buscar Aluno *</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                value={aluno ? (aluno.user?.name || aluno.fullName) : query}
                                onChange={e => { setAluno(null); setQuery(e.target.value); }}
                                onFocus={() => buscaRes.length > 0 && setShowDrop(true)}
                                placeholder="Nome ou CPF..."
                                style={{ ...INPUT, border: `1.5px solid ${aluno ? '#FFD600' : '#E5E7EB'}` }}
                            />
                            {buscando && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#9CA3AF' }}>⏳</span>}
                            {aluno && <button onClick={() => { setAluno(null); setQuery(''); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1rem' }}>✕</button>}
                        </div>
                        {showDrop && buscaRes.length > 0 && !aluno && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.13)', overflow: 'hidden', marginTop: 4 }}>
                                {buscaRes.map((a: any) => (
                                    <div key={a.id} onClick={() => { setAluno(a); setQuery(''); setShowDrop(false); }}
                                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F9FAFB', display: 'flex', alignItems: 'center', gap: 10 }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#FFFDE7')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>{(a.user?.name || 'A')[0]}</div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{a.user?.name || a.fullName}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>CPF: {a.cpf}</div>
                                        </div>
                                        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: '#FFFDE7', color: '#B89B00', padding: '2px 8px', borderRadius: 6, border: '1px solid #FEF08A', fontWeight: 700 }}>selecionar</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {query.length >= 2 && !buscando && buscaRes.length === 0 && showDrop && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', fontSize: '0.82rem', color: '#9CA3AF', marginTop: 4 }}>Nenhum aluno encontrado.</div>
                        )}
                    </div>
                    <div>
                        <label style={LBL}>Turma *</label>
                        <select value={turmaSel} onChange={e => setTurmaSel(e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}>
                            <option value="">Selecione a turma...</option>
                            {acao.turmas?.map(at => (
                                <option key={at.turmaId} value={at.turmaId}>
                                    {at.turma?.classIdentifier} — {at.turma?.course?.name || 'Curso'}
                                    {at.turma?.vacancies ? ` (${at.turma.vacancies} vagas)` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button onClick={inscrever} disabled={!aluno || !turmaSel || inscrevendo} style={{
                        padding: '0.65rem 18px', borderRadius: 10, border: 'none',
                        cursor: (!aluno || !turmaSel) ? 'not-allowed' : 'pointer',
                        background: (!aluno || !turmaSel) ? '#E5E7EB' : '#FFD600',
                        color: (!aluno || !turmaSel) ? '#9CA3AF' : '#111827',
                        fontWeight: 800, fontSize: '0.8rem', fontFamily: 'Orbitron', whiteSpace: 'nowrap',
                        boxShadow: (!aluno || !turmaSel) ? 'none' : '0 3px 12px rgba(255,214,0,0.4)',
                    }}>{inscrevendo ? '⏳ Inscrevendo...' : '⚡ Inscrever'}</button>
                </div>
                {aluno && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: '#FFFDE7', borderRadius: 10, border: '1px solid #FEF08A', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{(aluno.user?.name || 'A')[0]}</div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{aluno.user?.name || aluno.fullName}</div>
                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'flex', gap: 12 }}>
                                <span>CPF: <strong style={{ fontFamily: 'JetBrains Mono' }}>{aluno.cpf}</strong></span>
                                {aluno.phone && <span>📱 {aluno.phone}</span>}
                                {aluno.city && <span>📍 {aluno.city}/{aluno.state}</span>}
                            </div>
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: '0.68rem', background: '#D1FAE5', color: '#065F46', padding: '3px 10px', borderRadius: 8, border: '1px solid #6EE7B7', fontWeight: 700 }}>✓ Selecionado</span>
                    </div>
                )}
            </div>

            {/* Lista */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', background: '#FAFBFC', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', fontWeight: 800, color: '#B89B00', letterSpacing: '0.1em' }}>📋 INSCRIÇÕES ({filtradas.length})</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid #E5E7EB', fontSize: '0.75rem', cursor: 'pointer' }}>
                            <option value="TODAS">Todas as turmas</option>
                            {Object.values(inscPorTurma).map((t: any) => <option key={t.turmaId} value={t.turmaId}>{t.turmaIdentifier}</option>)}
                        </select>
                        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid #E5E7EB', fontSize: '0.75rem', cursor: 'pointer' }}>
                            <option value="TODOS">Todos os status</option>
                            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <button onClick={carregarInsc} style={{ padding: '4px 12px', borderRadius: 7, border: '1px solid #E5E7EB', fontSize: '0.75rem', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>🔄</button>
                    </div>
                </div>
                {loadingInsc ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>⏳ Carregando...</div>
                ) : filtradas.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📋</div>
                        <div style={{ color: '#6B7280', fontWeight: 600 }}>Nenhuma inscrição encontrada</div>
                        <div style={{ color: '#9CA3AF', fontSize: '0.82rem', marginTop: 4 }}>Use o painel acima para inscrever alunos.</div>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#F9FAFB' }}>
                                    {['Aluno', 'CPF', 'Turma / Curso', 'Status', 'Data', 'Ações'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', borderBottom: '1px solid #F3F4F6', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtradas.map((i: any) => (
                                    <tr key={i.id}
                                        onMouseEnter={() => setHoveredRow(i.id)}
                                        onMouseLeave={() => setHoveredRow(null)}
                                        style={{ borderBottom: '1px solid #F9FAFB', background: hoveredRow === i.id ? '#FFFDE7' : 'transparent', transition: 'background 0.15s' }}>
                                        <td style={{ padding: '10px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
                                                    {(i.student?.user?.name || i.fullName || '?')[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{i.student?.user?.name || i.fullName || '—'}</div>
                                                    <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{i.student?.user?.email || ''}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: '#374151' }}>{i.student?.cpf || '—'}</td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#FFFDE7', color: '#B89B00', padding: '2px 7px', borderRadius: 5, border: '1px solid #FEF08A' }}>{i._tId}</span>
                                            <div style={{ fontSize: '0.67rem', color: '#9CA3AF', marginTop: 2 }}>{i._curso}</div>
                                        </td>
                                        <td style={{ padding: '10px 14px' }}><StatusBadge status={i.status} /></td>
                                        <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
                                            {i.enrolledAt ? new Date(i.enrolledAt).toLocaleDateString('pt-BR') : '—'}
                                        </td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <div style={{ display: 'flex', gap: 5 }}>
                                                {/* Aprovar: apenas PENDING ou WAITLIST */}
                                                {(i.status === 'PENDING' || i.status === 'WAITLIST') && <button onClick={() => acaoInsc(i.id, 'approve')} disabled={loadingAct === i.id + 'approve'} style={{ ...BTN, background: '#D1FAE5', color: '#065F46' }}>✅ Aprovar</button>}
                                                {/* Rejeitar: apenas PENDING ou WAITLIST */}
                                                {(i.status === 'PENDING' || i.status === 'WAITLIST') && <button onClick={() => acaoInsc(i.id, 'reject')} disabled={loadingAct === i.id + 'reject'} style={{ ...BTN, background: '#FEE2E2', color: '#991B1B' }}>❌ Rejeitar</button>}
                                                {/* Espera: apenas PENDING ou APPROVED — não para ENROLLED (já matriculado) */}
                                                {(i.status === 'PENDING' || i.status === 'APPROVED') && <button onClick={() => acaoInsc(i.id, 'waitlist')} disabled={loadingAct === i.id + 'waitlist'} style={{ ...BTN, background: '#FEF9C3', color: '#92400E' }}>⏳ Espera</button>}
                                                {/* Confirmar matrícula: apenas APPROVED */}
                                                {i.status === 'APPROVED' && <button onClick={() => acaoInsc(i.id, 'approve')} disabled={loadingAct === i.id + 'approve'} style={{ ...BTN, background: '#DBEAFE', color: '#1E3A8A' }}>🎓 Matricular</button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <AdminListPagination
                    page={inscPage}
                    totalPages={inscTotalPages}
                    total={inscTotal}
                    loading={loadingInsc}
                    onPageChange={setInscPage}
                    itemLabel="inscrição(ões)"
                />
            </div>
        </div>
    );
}

// ── Página Principal ─────────────────────────────────────────────

export default function AcaoDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = params?.id as string;
    const [acao, setAcao] = useState<Acao | null>(null);
    // Permite entrar direto numa aba via `?tab=baixa`, `?tab=insumos`, etc.
    // Útil pra atalhos cruzados (ex.: estoque/baixa-acao → ação na aba "Baixa de Estoque").
    const tabFromUrl = searchParams?.get('tab') ?? null;
    const validTabIds = TABS.map((t) => t.id);
    const initialTab = tabFromUrl && validTabIds.includes(tabFromUrl) ? tabFromUrl : 'geral';
    const [activeTab, setActiveTab] = useState(initialTab);

    // Reage se a query mudar (navegação entre abas via Link/Push).
    useEffect(() => {
        if (tabFromUrl && validTabIds.includes(tabFromUrl) && tabFromUrl !== activeTab) {
            setActiveTab(tabFromUrl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tabFromUrl]);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
    const heroRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        try {
            const data = await acoesApi.buscar(id);
            setAcao(data);
        } catch {
            router.push('/admin/acoes');
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => { load(); }, [load]);

    const [concluirModalOpen, setConcluirModalOpen] = useState(false);

    const changeStatus = async (status: AcaoStatus) => {
        if (!acao) return;
        // Interceptar transição para CONCLUIDA: pode haver sobra do kit para tratar.
        // O modal cuida da decisão; só persiste o status ao retornar de onConfirm.
        if (status === 'CONCLUIDA' && acao.status !== 'CONCLUIDA') {
            setConcluirModalOpen(true);
            return;
        }
        setUpdatingStatus(true);
        await acoesApi.atualizarStatus(acao.id, status);
        await load();
        setUpdatingStatus(false);
    };

    const handleConcluirConfirmado = async () => {
        if (!acao) return;
        setConcluirModalOpen(false);
        setUpdatingStatus(true);
        try {
            await acoesApi.atualizarStatus(acao.id, 'CONCLUIDA');
            await load();
        } finally {
            setUpdatingStatus(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 24 }}>
            <style>{FUTURISTIC_CSS}</style>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#FFD600', animation: 'ring-rotate 1s linear infinite' }} />
                <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '2px solid transparent', borderBottomColor: 'rgba(255,214,0,0.5)', animation: 'ring-counter 0.8s linear infinite' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>⚡</div>
            </div>
            <div style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', color: '#B89B00', letterSpacing: '0.2em', animation: 'flicker 2s infinite' }}>CARREGANDO AÇÃO...</div>
        </div>
    );

    if (!acao) return null;

    const cfg = statusConfig[acao.status];
    const dot = statusDot[acao.status];

    const onHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = heroRef.current?.getBoundingClientRect();
        if (!r) return;
        setMousePos({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
    };

    const PARTICLES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const statusGlowColor: Record<AcaoStatus, string> = {
        PLANEJADA: '#D97706', EM_ANDAMENTO: '#059669', CONCLUIDA: '#1D4ED8', CANCELADA: '#DC2626'
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <style>{FUTURISTIC_CSS}</style>

            {/* Breadcrumb futuristic */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: '0.78rem' }}>
                <Link href="/admin/acoes" style={{ color: '#B89B00', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: 'rgba(255,214,0,0.08)', border: '1px solid rgba(255,214,0,0.25)', transition: 'all 0.2s' }}>
                    <ChevronLeftIcon style={{ width: 13, height: 13 }} /> AÇÕES
                </Link>
                <span style={{ color: 'rgba(255,214,0,0.4)', fontFamily: 'Orbitron' }}>/</span>
                <span style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', color: '#6B7280', letterSpacing: '0.06em' }}>{acao.nome}</span>
            </div>

            {/* === HERO FUTURISTA === */}
            <div ref={heroRef} onMouseMove={onHeroMouseMove}
                style={{
                    position: 'relative', borderRadius: '24px 24px 0 0', overflow: 'hidden', border: '1px solid rgba(255,214,0,0.3)', borderBottom: 'none',
                    background: 'linear-gradient(135deg, #0a0a0f 0%, #111118 40%, #0f0f1a 100%)',
                    boxShadow: `0 0 60px rgba(255,214,0,0.12), 0 0 0 1px rgba(255,214,0,0.15), inset 0 1px 0 rgba(255,214,0,0.2)`
                }}>

                {/* Grid holográfico animado */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    backgroundImage: `linear-gradient(rgba(255,214,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,214,0,0.04) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px', animation: 'grid-pulse 4s ease-in-out infinite'
                }} />

                {/* Scan line holográfica */}
                <div style={{
                    position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(255,214,0,0.6), transparent)',
                    animation: 'holo-scan 4s ease-in-out infinite', pointerEvents: 'none', zIndex: 2
                }} />

                {/* Glow de mouse */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
                    background: `radial-gradient(circle 300px at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(255,214,0,0.08), transparent 70%)`,
                    transition: 'background 0.1s'
                }} />

                {/* Partículas flutuantes */}
                {PARTICLES.map(i => (
                    <div key={i} style={{
                        position: 'absolute', width: 3 + Math.sin(i) * 2, height: 3 + Math.sin(i) * 2,
                        borderRadius: '50%', background: '#FFD600', opacity: 0.15 + Math.random() * 0.3,
                        left: `${8 + i * 7.5}%`, top: `${20 + Math.sin(i * 0.9) * 60}%`,
                        animation: `particle-float ${3 + i * 0.4}s ease-in-out ${i * 0.3}s infinite`,
                        boxShadow: '0 0 6px #FFD600', pointerEvents: 'none'
                    }} />
                ))}

                {/* Decoração: Anéis orbitais no canto */}
                <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, opacity: 0.15, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid #FFD600', animation: 'ring-rotate 8s linear infinite' }} />
                    <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', border: '1px dashed rgba(255,214,0,0.5)', animation: 'ring-counter 5s linear infinite' }} />
                    <div style={{ position: 'absolute', inset: 40, borderRadius: '50%', border: '1px solid rgba(255,214,0,0.3)', animation: 'ring-rotate 3s linear infinite' }} />
                </div>

                {/* Conteúdo principal do Hero */}
                <div style={{ position: 'relative', zIndex: 3, padding: '32px 36px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>

                        {/* Ícone + Título */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                            {/* Ícone 3D com anéis */}
                            <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0, animation: 'float3d 4s ease-in-out infinite' }}>
                                <div style={{
                                    position: 'absolute', inset: 0, borderRadius: 18,
                                    background: 'linear-gradient(135deg, #FFD600, #E6A800)',
                                    boxShadow: '0 0 24px rgba(255,214,0,0.6), 0 0 60px rgba(255,214,0,0.2), 0 8px 32px rgba(0,0,0,0.4)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem'
                                }}>⚡</div>
                                <div style={{ position: 'absolute', inset: -6, borderRadius: 22, border: '1px solid rgba(255,214,0,0.3)', animation: 'ring-rotate 6s linear infinite', pointerEvents: 'none' }} />
                            </div>

                            <div>
                                <div style={{ fontFamily: 'Orbitron', fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,214,0,0.6)', letterSpacing: '0.25em', marginBottom: 6 }}>UPGRADE // AÇÃO OPERACIONAL</div>
                                <h1 className="holo-text" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.6rem', fontWeight: 900, margin: '0 0 14px', letterSpacing: '0.05em', lineHeight: 1.1 }}>{acao.nome}</h1>

                                {/* Metadados em chips */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                    {/* Status badge neon */}
                                    <span style={{
                                        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 100,
                                        background: `rgba(${cfg.color === '#065F46' ? '5,150,105' : cfg.color === '#1E40AF' ? '29,78,216' : cfg.color === '#DC2626' ? '220,38,38' : '217,119,6'},0.15)`,
                                        border: `1px solid ${statusGlowColor[acao.status]}`,
                                        boxShadow: `0 0 12px ${statusGlowColor[acao.status]}44`,
                                        fontSize: '0.72rem', fontWeight: 800, color: '#fff', fontFamily: 'Orbitron', letterSpacing: '0.05em', animation: 'neon-border 2s ease-in-out infinite'
                                    }}>
                                        <span style={{
                                            width: 6, height: 6, borderRadius: '50%', background: statusGlowColor[acao.status],
                                            boxShadow: `0 0 6px ${statusGlowColor[acao.status]}`, display: 'inline-block', animation: 'yellowPulse 1.5s infinite'
                                        }} />
                                        {cfg.label.toUpperCase()}
                                    </span>
                                    {[
                                        { icon: '📍', text: acao.cidade ? `${acao.cidade.name}, ${acao.cidade.state}` : (acao.cidadeNome || '—') },
                                        { icon: '📅', text: `${fmtDate(acao.dataInicio)} → ${fmtDate(acao.dataFim)}` },
                                        acao.carreta && { icon: '🚛', text: acao.carreta.identifier },
                                        { icon: '🎓', text: `${acao.turmas?.length || 0} turmas` },
                                        { icon: '👥', text: `${acao.equipe?.length || 0} equipe` },
                                    ].filter(Boolean).map((chip: any, i) => (
                                        <span key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px',
                                            borderRadius: 100, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                                            fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)'
                                        }}>
                                            {chip.icon} {chip.text}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Status control futurista */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                            <div style={{ fontFamily: 'Orbitron', fontSize: '0.55rem', color: 'rgba(255,214,0,0.5)', fontWeight: 700, letterSpacing: '0.2em' }}>ALTERAR STATUS</div>
                            <select value={acao.status} onChange={e => changeStatus(e.target.value as AcaoStatus)} disabled={updatingStatus}
                                style={{
                                    padding: '10px 16px', border: '1.5px solid rgba(255,214,0,0.3)', borderRadius: 10,
                                    fontSize: '0.82rem', color: '#fff', outline: 'none', cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.05)', fontWeight: 700, fontFamily: 'Orbitron',
                                    backdropFilter: 'blur(8px)', boxShadow: '0 0 16px rgba(255,214,0,0.1)'
                                }}>
                                <option style={{ background: '#111' }} value="PLANEJADA">⚡ Planejada</option>
                                <option style={{ background: '#111' }} value="EM_ANDAMENTO">🔥 Em Andamento</option>
                                <option style={{ background: '#111' }} value="CONCLUIDA">✅ Concluída</option>
                                <option style={{ background: '#111' }} value="CANCELADA">❌ Cancelada</option>
                            </select>
                        </div>
                    </div>

                    {/* === TABS FUTURISTAS === */}
                    <div style={{ display: 'flex', gap: 0, marginTop: 28, paddingLeft: 0, position: 'relative' }}>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'rgba(255,214,0,0.2)' }} />
                        {TABS.map((tab, idx) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button key={tab.id} className="futuristic-tab-btn"
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        position: 'relative', padding: '12px 20px',
                                        background: isActive ? 'rgba(255,214,0,0.08)' : 'transparent',
                                        border: 'none', borderBottom: isActive ? '2px solid #FFD600' : '2px solid transparent',
                                        color: isActive ? '#FFD600' : 'rgba(255,255,255,0.45)',
                                        fontWeight: isActive ? 800 : 500, fontFamily: isActive ? 'Orbitron' : 'Inter',
                                        fontSize: '0.78rem', cursor: 'pointer', letterSpacing: isActive ? '0.05em' : 0,
                                        boxShadow: isActive ? '0 -2px 16px rgba(255,214,0,0.15) inset' : 'none',
                                        borderRadius: '8px 8px 0 0'
                                    }}>
                                    <span style={{ marginRight: 6 }}>{tab.icon}</span>{tab.label}
                                    {isActive && <div style={{
                                        position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 2,
                                        background: 'linear-gradient(90deg, transparent, #FFD600, transparent)',
                                        boxShadow: '0 0 8px #FFD600', animation: 'slide-tab 0.3s ease-out'
                                    }} />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Tab content */}
            <div style={{
                background: '#F4F6FA', borderRadius: '0 0 24px 24px',
                border: '1px solid rgba(255,214,0,0.15)', borderTop: 'none', padding: 28,
                boxShadow: '0 20px 60px rgba(0,0,0,0.08)'
            }}>
                {activeTab === 'geral' && <TabGeral acao={acao} onUpdate={load} />}
                {activeTab === 'turmas' && <TabTurmas acao={acao} onUpdate={load} />}
                {activeTab === 'funcionarios' && <TabFuncionarios acao={acao} onUpdate={load} />}
                {activeTab === 'custos' && <TabCustos acao={acao} onUpdate={load} />}
                {activeTab === 'insumos' && <KitInsumosEditor acaoId={acao.id} />}
                {activeTab === 'baixa' && <BaixaEstoqueEditor acaoId={acao.id} />}
                {activeTab === 'inscricoes' && <TabInscricoes acao={acao} onRefresh={load} />}
            </div>

            <ConcluirAcaoModal
                acaoId={acao.id}
                acaoNome={acao.nome}
                open={concluirModalOpen}
                onClose={() => setConcluirModalOpen(false)}
                onConfirm={handleConcluirConfirmado}
            />
        </div>
    );
}
