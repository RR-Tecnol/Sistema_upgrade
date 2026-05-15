'use client';

import { useState } from 'react';
import { EmployeeStyleAdminDetailShell } from './employee-style-admin-detail';
import { Truck } from '@/lib/api/trucks';
import { TruckEstoqueZone } from '@/components/estoque/gsr/TruckEstoqueZone';
import { MovimentacaoModal } from '@/components/estoque/MovimentacaoModal';

type CarretaTab = 'estoque' | 'descricao';

const STATUS_CFG: Record<Truck['status'], { label: string; color: string; icon: string }> = {
    AVAILABLE: { label: 'Disponível', color: '#10B981', icon: '✅' },
    IN_USE: { label: 'Em Ação', color: '#FFD600', icon: '🚛' },
    MAINTENANCE: { label: 'Manutenção', color: '#EF4444', icon: '🔧' },
    INACTIVE: { label: 'Inativo', color: '#6B7280', icon: '⏸' },
};

const TYPE_LABEL: Record<Truck['type'], string> = {
    STANDARD: 'Padrão',
    MULTICOURSE: 'Multicurso',
};

const HEADER_CHIP: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.28rem 0.7rem',
    borderRadius: 100,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#E7E5E4',
    fontFamily: 'JetBrains Mono, monospace',
};

function tabBtnStyle(active: boolean): React.CSSProperties {
    return {
        padding: '12px 20px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontWeight: active ? 800 : 700,
        fontSize: '0.88rem',
        color: active ? '#1D4ED8' : '#64748B',
        borderBottom: active ? '3px solid #2563EB' : '3px solid transparent',
        marginBottom: -2,
        transition: 'color 0.18s, border-color 0.18s',
        fontFamily: 'Inter, sans-serif',
        letterSpacing: '0.02em',
    };
}

function formatDate(iso?: string) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div style={{
            padding: '12px 14px', borderRadius: 12,
            background: '#FFFFFF', border: '1px solid #E5E7EB',
            display: 'flex', flexDirection: 'column', gap: 4, minHeight: 64,
        }}>
            <span style={{
                fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8',
                letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>{label}</span>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                {value || '—'}
            </span>
        </div>
    );
}

function DescricaoTab({ truck }: { truck: Truck }) {
    const cfg = STATUS_CFG[truck.status] ?? STATUS_CFG.INACTIVE;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Foto se houver */}
            {truck.photoUrl && (
                <div style={{
                    borderRadius: 14, overflow: 'hidden',
                    border: '1px solid #E5E7EB', maxHeight: 280,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#F8FAFC',
                }}>
                    <img src={truck.photoUrl} alt={truck.identifier}
                        style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} />
                </div>
            )}

            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12,
            }}>
                <Field label="Identificador" value={truck.identifier} />
                <Field label="Placa" value={<span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{truck.licensePlate}</span>} />
                <Field label="Status" value={<span style={{ color: cfg.color }}>{cfg.icon} {cfg.label}</span>} />
                <Field label="Tipo" value={TYPE_LABEL[truck.type]} />
                <Field label="Grupo" value={truck.group?.name} />
                <Field label="Estado" value={truck.state} />
                <Field label="Capacidade" value={`${truck.capacity} vagas`} />
                <Field label="Salas" value={truck.roomsCount} />
                <Field label="Ano/Modelo" value={truck.modelYear} />
                <Field label="Última manutenção" value={formatDate(truck.lastMaintenanceDate)} />
                <Field label="Próxima manutenção" value={formatDate(truck.nextMaintenanceDate)} />
            </div>

            {truck.equipmentList && (
                <div style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: '#F8FAFC', border: '1px solid #E5E7EB',
                }}>
                    <div style={{
                        fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8',
                        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
                    }}>🛠️ Equipamentos</div>
                    <div style={{ fontSize: '0.88rem', color: '#0F172A', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        {truck.equipmentList}
                    </div>
                </div>
            )}

            {truck.notes && (
                <div style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: '#FFFBEB', border: '1px solid #FDE68A',
                }}>
                    <div style={{
                        fontSize: '0.65rem', fontWeight: 800, color: '#92400E',
                        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
                    }}>📝 Observações</div>
                    <div style={{ fontSize: '0.88rem', color: '#0F172A', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        {truck.notes}
                    </div>
                </div>
            )}
        </div>
    );
}

interface Props {
    truck: Truck;
    userRole: string;
    onClose: () => void;
}

export function CarretaDetailModal({ truck, userRole, onClose }: Props) {
    const [tab, setTab] = useState<CarretaTab>('estoque');
    const [movOpen, setMovOpen] = useState(false);

    const cfg = STATUS_CFG[truck.status] ?? STATUS_CFG.INACTIVE;
    const initials = (truck.identifier || 'TRK').slice(0, 2).toUpperCase();

    return (
        <>
            <EmployeeStyleAdminDetailShell
                onClose={onClose}
                accentColor={cfg.color}
                accentGlow={`${cfg.color}33`}
                initials={initials}
                statusBadge={
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 12px', borderRadius: 20,
                        background: `${cfg.color}22`, color: cfg.color,
                        border: `1px solid ${cfg.color}55`,
                        fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em',
                    }}>
                        {cfg.icon} {cfg.label.toUpperCase()}
                    </span>
                }
                headline={truck.identifier}
                headerTags={
                    <>
                        <span style={HEADER_CHIP}>📋 {truck.licensePlate}</span>
                        <span style={{ ...HEADER_CHIP, fontFamily: 'inherit', background: `${cfg.color}22`, border: `1px solid ${cfg.color}55`, color: cfg.color }}>
                            🚛 {TYPE_LABEL[truck.type]}
                        </span>
                        {truck.group?.name && <span style={{ ...HEADER_CHIP, fontFamily: 'inherit' }}>🏷️ {truck.group.name}</span>}
                        <span style={{ ...HEADER_CHIP, fontFamily: 'inherit' }}>📍 {truck.state}</span>
                    </>
                }
                footer={
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => setMovOpen(true)}
                            style={{
                                padding: '10px 18px', borderRadius: 12,
                                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                                color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.85rem',
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                                boxShadow: '0 4px 14px rgba(37,99,235,0.30)',
                            }}
                        >
                            ↕ Nova movimentação
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '10px 18px', borderRadius: 12,
                                border: '1.5px solid #E2E8F0', background: 'transparent',
                                color: '#6B7280', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                            }}
                        >
                            ✕ Fechar
                        </button>
                    </div>
                }
            >
                {/* Tabs strip */}
                <div style={{
                    display: 'flex', gap: 4,
                    borderBottom: '2px solid #E5E7EB',
                    flexWrap: 'wrap',
                }}>
                    <button type="button" onClick={() => setTab('estoque')} style={tabBtnStyle(tab === 'estoque')}>
                        📦 Estoque da carreta
                    </button>
                    <button type="button" onClick={() => setTab('descricao')} style={tabBtnStyle(tab === 'descricao')}>
                        📋 Descrição completa
                    </button>
                </div>

                {tab === 'estoque' && (
                    <TruckEstoqueZone
                        truckId={truck.id}
                        truckIdentifier={truck.identifier}
                        userRole={userRole}
                        readOnly
                    />
                )}

                {tab === 'descricao' && <DescricaoTab truck={truck} />}
            </EmployeeStyleAdminDetailShell>

            <MovimentacaoModal
                open={movOpen}
                onClose={() => setMovOpen(false)}
                initialTruckId={truck.id}
                defaultType="SAIDA"
            />
        </>
    );
}
