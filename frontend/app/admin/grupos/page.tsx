'use client';

import { useEffect, useState } from 'react';
import { groupsApi, Group } from '@/lib/api/groups';
import { PencilIcon, TrashIcon, PlusIcon, BuildingOfficeIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { toast } from '@/components/ui/Toast';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { GruposSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { CreationSuccessScreen } from '@/components/CreationSuccessScreen';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import { normalizePaginated, ADMIN_PAGE_SIZE_CARDS } from '@/lib/api/pagination';

const STATE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; accent: string }> = {
    MA: { label: 'Maranhão', color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD', accent: '#0E7490' },
    PI: { label: 'Piauí', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', accent: '#047857' },
};

/* ── Modal de Confirmação (layout padrão do sistema) ── */
function ModalConfirmacao({ title, message, onConfirm, onCancel, danger = true }: {
    title: string; message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
    return (
        <ModalPortal>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={onCancel}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'slideUp 0.2s' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ padding: '18px 24px 14px', background: danger ? '#FEF2F2' : '#FFFDE7', borderBottom: `1px solid ${danger ? '#FECACA' : '#FEF08A'}`, borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: danger ? '#DC2626' : '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {danger ? <TrashIcon style={{ width: 18, height: 18, color: '#fff' }} /> : <CheckIcon style={{ width: 18, height: 18, color: '#000' }} />}
                    </div>
                    <div>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 900, color: '#111827', margin: 0 }}>{title}</h2>
                    </div>
                    <button onClick={onCancel} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px' }}>
                    <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6, margin: '0 0 1.25rem' }}>{message}</p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button onClick={onCancel} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Cancelar</button>
                        <button onClick={onConfirm} style={{ padding: '9px 20px', background: danger ? '#DC2626' : '#FFD600', border: 'none', color: danger ? '#fff' : '#000', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {danger ? <><TrashIcon style={{ width: 14, height: 14 }} /> Excluir</> : <><CheckIcon style={{ width: 14, height: 14 }} /> Confirmar</>}
                        </button>
                    </div>
                </div>
            </div>
            <style>{`@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
        </ModalPortal>
    );
}

/* ── Modal de Edição de Grupo ── */
function ModalEdicaoGrupo({ group, onClose, onSaved }: { group: Group; onClose: () => void; onSaved: () => void }) {
    const [name, setName] = useState(group.name);
    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState('');
    const cfg = STATE_CONFIG[group.state] || STATE_CONFIG['MA'];

    const handleSave = async () => {
        if (!name.trim()) { setErrMsg('Nome obrigatório.'); return; }
        setLoading(true); setErrMsg('');
        try {
            await groupsApi.update(group.id, { name: name.trim() });
            onSaved(); onClose();
        } catch (e: any) {
            setErrMsg(e?.response?.data?.message || 'Erro ao salvar grupo.');
        } finally { setLoading(false); }
    };

    return (
        <ModalPortal>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'slideUp 0.2s' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ padding: '18px 24px 14px', background: cfg.bg, borderBottom: `1px solid ${cfg.border}`, borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PencilIcon style={{ width: 18, height: 18, color: '#fff' }} />
                    </div>
                    <div>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 900, color: '#111827', margin: 0 }}>EDITAR GRUPO</h2>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#9CA3AF' }}>{STATE_CONFIG[group.state]?.label || group.state}</p>
                    </div>
                    <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#6B7280', marginBottom: '0.35rem' }}>
                            Nome do Grupo *
                        </label>
                        <input
                            value={name} onChange={e => setName(e.target.value)}
                            style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9, border: `1.5px solid ${cfg.border}`, background: '#F9FAFB', fontSize: '0.9rem', color: '#111827', outline: 'none' }}
                            placeholder="Ex: Grupo 1 MA" autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
                        />
                    </div>
                    {errMsg && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', color: '#DC2626' }}>⚠ {errMsg}</div>}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button onClick={onClose} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Cancelar</button>
                        <button onClick={handleSave} disabled={loading} className="btn-primary">
                            {loading ? 'Salvando...' : '💾 Salvar'}
                        </button>
                    </div>
                </div>
            </div>
            <style>{`@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
        </ModalPortal>
    );
}

export default function GruposPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [editGroup, setEditGroup] = useState<Group | null>(null);
    const [deleteGroup, setDeleteGroup] = useState<Group | null>(null);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [newGroupForm, setNewGroupForm] = useState({ name: '', state: 'MA' });
    const [newGroupSaving, setNewGroupSaving] = useState(false);
    const [creationDone, setCreationDone] = useState<{ name: string } | null>(null);

    useEffect(() => { loadGroups(); }, [page]);
    useEffect(() => {
        if (!creationDone) return;
        const t = setTimeout(() => setCreationDone(null), 2400);
        return () => clearTimeout(t);
    }, [creationDone]);
    useEffect(() => {
        const hasOpenModal = !!editGroup || !!deleteGroup || showNewGroup;
        document.body.style.overflow = hasOpenModal ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [editGroup, deleteGroup, showNewGroup]);

    const loadGroups = async () => {
        try {
            setLoading(true);
            const raw = await groupsApi.getAll({ page, limit: ADMIN_PAGE_SIZE_CARDS });
            const norm = normalizePaginated<Group>(raw, ADMIN_PAGE_SIZE_CARDS);
            setGroups(norm.data);
            setTotal(norm.total);
            setTotalPages(norm.totalPages);
        } catch (error) {
            /* silencioso — lista vazia exibida ao usuário */
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteGroup) return;
        try {
            await groupsApi.delete(deleteGroup.id);
            setDeleteGroup(null);
            await loadGroups();
            toast.success('Grupo excluído com sucesso!');
        } catch {
            toast.error('Erro ao excluir grupo. Verifique se não há carretas ou turmas vinculadas.');
            setDeleteGroup(null);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupForm.name.trim()) return;
        setNewGroupSaving(true);
        try {
            const createdName = newGroupForm.name.trim();
            await groupsApi.create({ name: createdName, state: newGroupForm.state });
            setShowNewGroup(false);
            setNewGroupForm({ name: '', state: 'MA' });
            await loadGroups();
            setCreationDone({ name: createdName });
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Erro ao criar grupo.');
        } finally {
            setNewGroupSaving(false);
        }
    };

    const maGroups = groups.filter(g => g.state === 'MA');
    const piGroups = groups.filter(g => g.state === 'PI');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">

            <AdminHeaderHero
                title="GRUPOS"
                subtitle="Divisões operacionais do programa Qualifica MA & PI"
                rightSlot={(
                    <button
                        onClick={() => setShowNewGroup(true)}
                        className="btn-primary"
                    >
                        <PlusIcon style={{ width: 16, height: 16 }} />
                        Novo Grupo
                    </button>
                )}
            />
            <GruposSidebarTutorial />

            {/* STATS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {[
                    { label: 'Total de Grupos', value: groups.length, color: '#FFD600', bg: '#FFFDE7', border: '#FEF08A' },
                    { label: 'Grupos Maranhão', value: maGroups.length, color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
                    { label: 'Grupos Piauí', value: piGroups.length, color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
                ].map((s, i) => (
                    <AnimatedKpiCard
                        key={s.label}
                        label={s.label}
                        value={s.value}
                        color={s.color}
                        bg={s.bg}
                        border={s.border}
                        delayMs={i * 60}
                    />
                ))}
            </div>

            {/* LOADING */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO GRUPOS...</p>
                </div>
            )}

            {/* EMPTY */}
            {!loading && groups.length === 0 && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <BuildingOfficeIcon style={{ width: 48, height: 48, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>NENHUM GRUPO CADASTRADO</p>
                </div>
            )}

            {/* CARDS */}
            {!loading && groups.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {groups.map((group, i) => {
                        const cfg = STATE_CONFIG[group.state] || STATE_CONFIG['MA'];
                        const initials = group.name
                            .split(' ')
                            .filter((w: string) => w.length > 1)
                            .map((w: string) => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase();

                        return (
                            <div
                                key={group.id}
                                className="glass-card animate-scale-in"
                                style={{
                                    animationDelay: `${i * 70}ms`,
                                    padding: 0,
                                    overflow: 'hidden',
                                    borderTop: `3px solid ${cfg.color}`,
                                    transition: 'all 0.25s',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${cfg.color}22, 0 2px 8px rgba(0,0,0,0.08)`;
                                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.boxShadow = '';
                                    (e.currentTarget as HTMLElement).style.transform = '';
                                }}
                            >
                                {/* Card top */}
                                <div style={{ padding: '1.25rem 1.25rem 1rem', background: cfg.bg }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: 52, height: 52, borderRadius: 14,
                                            background: cfg.color, color: '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.9rem',
                                            flexShrink: 0,
                                            boxShadow: `0 4px 12px ${cfg.color}44`,
                                        }}>
                                            {initials}
                                        </div>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{
                                                fontSize: '1rem', fontWeight: 800, color: '#111827',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                marginBottom: '0.3rem',
                                            }}>
                                                {group.name}
                                            </div>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '0.2rem 0.65rem',
                                                borderRadius: 100,
                                                background: cfg.color + '20',
                                                color: cfg.accent,
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                border: `1px solid ${cfg.border}`,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                            }}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card footer */}
                                <div style={{ padding: '0.85rem 1.25rem', borderTop: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '0.6rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.15rem' }}>Cadastrado em</div>
                                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>
                                            {new Date(group.createdAt).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        {/* FEAT-GRP: editar com modal real */}
                                        <button
                                            onClick={() => setEditGroup(group)}
                                            title="Editar grupo"
                                            style={{ padding: '0.45rem', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', cursor: 'pointer', display: 'flex' }}
                                        >
                                            <PencilIcon style={{ width: 15, height: 15 }} />
                                        </button>
                                        {/* Modal de exclusão padrão */}
                                        <button
                                            onClick={() => setDeleteGroup(group)}
                                            title="Excluir grupo"
                                            style={{ padding: '0.45rem', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer', display: 'flex' }}
                                        >
                                            <TrashIcon style={{ width: 15, height: 15 }} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <AdminListPagination
                page={page}
                totalPages={totalPages}
                total={total}
                loading={loading}
                onPageChange={setPage}
                itemLabel="grupo(s)"
            />

            {/* INFO */}
            <div style={{
                padding: '1.25rem 1.5rem',
                borderRadius: 14,
                background: '#FFFDE7',
                border: '1px solid #FEF08A',
                display: 'flex', alignItems: 'flex-start', gap: '1rem',
            }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFD600', flexShrink: 0, marginTop: '0.45rem' }} />
                <div>
                    <div style={{ fontWeight: 700, color: '#92730A', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Sobre os Grupos Operacionais</div>
                    <p style={{ fontSize: '0.8rem', color: '#78716C', lineHeight: 1.7 }}>
                        Os grupos representam as divisões operacionais do programa Qualifica MA &amp; PI.
                        Cada grupo gerencia um conjunto de <strong>carretas e turmas</strong> em seu respectivo estado.
                        <br />Exemplos: <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#0891B2' }}>Grupo 1 MA</span>, <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#0891B2' }}>Grupo 2 MA</span>, <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#059669' }}>Grupo 1 PI</span>
                    </p>
                </div>
            </div>

            {/* Modais */}
            {editGroup && (
                <ModalEdicaoGrupo
                    group={editGroup}
                    onClose={() => setEditGroup(null)}
                    onSaved={loadGroups}
                />
            )}
            {deleteGroup && (
                <ModalConfirmacao
                    title="EXCLUIR GRUPO"
                    message={`Tem certeza que deseja excluir o grupo "${deleteGroup.name}"? Esta ação não pode ser desfeita. Grupos com carretas ou turmas vinculadas não podem ser excluídos.`}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteGroup(null)}
                />
            )}

            {/* Modal: Novo Grupo */}
            {creationDone && (
                <ModalPortal>
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: MODAL_PORTAL_Z_INDEX,
                        background: 'rgba(255,255,255,0.96)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem',
                    }}
                >
                    <CreationSuccessScreen
                        title="GRUPO CRIADO!"
                        entityName={creationDone.name}
                        redirectMessage="Atualizando a lista de grupos..."
                        alinhamento="center"
                        minHeight="50vh"
                    />
                </div>
                </ModalPortal>
            )}

            {showNewGroup && (
                <ModalPortal>
                <div className="modal-overlay" style={{ zIndex: MODAL_PORTAL_Z_INDEX }} onClick={() => setShowNewGroup(false)}>
                    <div className="modal-content animate-scale-in" style={{ maxWidth: 420, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowNewGroup(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#9CA3AF' }}>✕</button>

                        <h3 style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: '#111827', marginBottom: '0.4rem' }}>
                            ➕ NOVO GRUPO
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '1.25rem' }}>
                            Criação de uma nova divisão operacional
                        </p>

                        <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="form-label">Nome do Grupo *</label>
                                <input
                                    className="form-input"
                                    value={newGroupForm.name}
                                    onChange={e => setNewGroupForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Ex: Grupo 1 MA, Grupo Norte PI..."
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="form-label">Estado *</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {[{ value: 'MA', label: '🟡 Maranhão', color: '#0891B2' }, { value: 'PI', label: '🟢 Piauí', color: '#059669' }].map(opt => (
                                        <button key={opt.value} type="button"
                                            onClick={() => setNewGroupForm(f => ({ ...f, state: opt.value }))}
                                            style={{
                                                flex: 1, padding: '0.65rem', borderRadius: 10, cursor: 'pointer',
                                                border: `1.5px solid ${newGroupForm.state === opt.value ? opt.color : '#E5E7EB'}`,
                                                background: newGroupForm.state === opt.value ? opt.color + '15' : 'transparent',
                                                color: newGroupForm.state === opt.value ? opt.color : '#6B7280',
                                                fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.15s',
                                            }}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                                <button type="button" onClick={() => setShowNewGroup(false)}
                                    style={{ flex: 1, padding: '0.7rem', borderRadius: 10, border: '1.5px solid #E5E7EB', background: 'transparent', color: '#6B7280', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={newGroupSaving || !newGroupForm.name.trim()}
                                    className="btn-primary" style={{ flex: 1.5, justifyContent: 'center', opacity: !newGroupForm.name.trim() ? 0.5 : 1 }}>
                                    {newGroupSaving
                                        ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Criando...</>
                                        : '✓ Criar Grupo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                </ModalPortal>
            )}
        </div>
    );
}
