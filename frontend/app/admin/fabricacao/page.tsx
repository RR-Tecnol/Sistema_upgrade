'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { fabricacaoApi, OrdemFabricacao, StatusOrdemFabricacao, STATUS_COLORS, STATUS_LABELS } from '@/lib/api/fabricacao';

const YELLOW = '#B89B00'; const CYAN = '#0891B2'; const GREEN = '#059669';
const RED = '#DC2626'; const PURPLE = '#7C3AED'; const ORANGE = '#EA580C';

const COLUMNS: { status: StatusOrdemFabricacao; label: string; color: string; bg: string; border: string }[] = [
  { status: 'AGUARDANDO_MATERIAL', label: '⏳ Aguardando Material', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { status: 'EM_PRODUCAO',         label: '⚙️ Em Produção',         color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
  { status: 'BLOQUEADA',           label: '🚨 BLOQUEADA',           color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  { status: 'INSPECAO_FINAL',      label: '🔍 Inspeção Final',      color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  { status: 'CONCLUIDA',           label: '✅ Concluída',           color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
];

export default function FabricacaoPage() {
  const [ordens, setOrdens] = useState<OrdemFabricacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<StatusOrdemFabricacao | 'TODOS'>('TODOS');

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fabricacaoApi.ordens.list({ limit: 100 }); setOrdens(res.data); }
    catch { setOrdens([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const bloqueadas = ordens.filter(o => o.andoneAtivo || o.status === 'BLOQUEADA');
  const emProducao = ordens.filter(o => ['EM_PRODUCAO', 'BLOQUEADA', 'INSPECAO_FINAL', 'AGUARDANDO_MATERIAL'].includes(o.status));
  const totalOrca  = emProducao.reduce((a, o) => a + Number(o.orcamentoTotal), 0);
  const totalCusto = emProducao.reduce((a, o) => a + Number(o.custoRealAcumulado), 0);
  const ordensFiltradas = filtroStatus === 'TODOS' ? ordens : ordens.filter(o => o.status === filtroStatus);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .col-scroll::-webkit-scrollbar{width:4px}
        .col-scroll::-webkit-scrollbar-track{background:transparent}
        .col-scroll::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}
        .col-scroll::-webkit-scrollbar-thumb:hover{background:#D1D5DB}
        .fab-board-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:16px; }
        .fab-board-grid > * { min-width:0; }
        .fab-list-grid  { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; }
        .fab-list-grid > * { min-width:0; }
        @media(max-width:640px){
          .fab-board-grid { grid-template-columns:1fr; }
          .fab-list-grid  { grid-template-columns:1fr; }
        }
      `}</style>

      {/* Alerta ANDON */}
      {bloqueadas.length > 0 && (
        <div style={{ background: '#FEF2F2', border: '2px solid #DC2626', borderRadius: 14, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16, animation: 'pulse 1.5s ease-in-out infinite' }}>
          <span style={{ fontSize: '1.4rem' }}>🚨</span>
          <div>
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#DC2626', fontSize: '0.9rem' }}>ANDON ATIVO — {bloqueadas.length} ORDEM{bloqueadas.length > 1 ? 'S' : ''} BLOQUEADA{bloqueadas.length > 1 ? 'S' : ''}</div>
            <div style={{ fontSize: '0.72rem', color: '#B91C1C', fontFamily: 'JetBrains Mono, monospace' }}>{bloqueadas.map(o => o.codigo).join(' · ')}</div>
          </div>
        </div>
      )}

      <AdminHeaderHero
        title="FABRICAÇÃO INDUSTRIAL"
        subtitle="Ordens de Produção · CPM/EVM · Gates de Qualidade"
        rightSlot={
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/admin/fabricacao/bi" style={{ padding: '10px 18px', borderRadius: 10, border: '1.5px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none' }}>📊 BI</Link>
            <Link href="/admin/fabricacao/insumos" style={{ padding: '10px 18px', borderRadius: 10, border: '1.5px solid #FEF08A', background: '#FFFDE7', color: '#B89B00', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>📦 Materiais</Link>
            <Link href="/admin/fabricacao/nova" style={{ padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg, #FFD600, #E5B800)', color: '#0F172A', fontWeight: 800, fontSize: '0.82rem', fontFamily: 'Orbitron, sans-serif', textDecoration: 'none', boxShadow: '0 4px 14px rgba(255,214,0,0.4)' }}>+ NOVA ORDEM</Link>
          </div>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
        <AnimatedKpiCard label="Ativas" value={emProducao.length} sub="em produção" color={CYAN} bg="#F0F9FF" border="#BAE6FD" icon={<span>⚙️</span>} />
        <AnimatedKpiCard label="Bloqueadas" value={bloqueadas.length} sub="ANDON ativo" color={bloqueadas.length > 0 ? RED : GREEN} bg={bloqueadas.length > 0 ? '#FEF2F2' : '#F0FDF4'} border={bloqueadas.length > 0 ? '#FECACA' : '#BBF7D0'} icon={<span>🚨</span>} delayMs={60} />
        <AnimatedKpiCard label="Orçamento" value={0} displayValue={`R$${(totalOrca / 1000).toFixed(0)}k`} sub="total OFs ativas" color={YELLOW} bg="#FFFDE7" border="#FEF08A" icon={<span>💰</span>} delayMs={120} />
        <AnimatedKpiCard label="Custo Real" value={0} displayValue={`R$${(totalCusto / 1000).toFixed(0)}k`} sub="acumulado" color={totalCusto > totalOrca ? RED : GREEN} bg={totalCusto > totalOrca ? '#FEF2F2' : '#F0FDF4'} border={totalCusto > totalOrca ? '#FECACA' : '#BBF7D0'} icon={<span>📊</span>} delayMs={180} />
        <AnimatedKpiCard label="OFs Total" value={ordens.length} sub="todas as ordens" color={PURPLE} bg="#F5F3FF" border="#DDD6FE" icon={<span>🏭</span>} delayMs={240} />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['TODOS', ...COLUMNS.map(c => c.status)] as const).map(s => {
          const col = COLUMNS.find(c => c.status === s);
          const isActive = filtroStatus === s;
          return (
            <button key={s} onClick={() => setFiltroStatus(s as any)} style={{
              padding: '6px 16px', borderRadius: 20,
              border: `1.5px solid ${isActive ? (col?.border ?? '#FEF08A') : '#E5E7EB'}`,
              background: isActive ? (col?.bg ?? '#FFFDE7') : '#F9FAFB',
              color: isActive ? (col?.color ?? YELLOW) : '#6B7280',
              fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'all 0.15s',
            }}>
              {s === 'TODOS' ? 'TODOS' : STATUS_LABELS[s as StatusOrdemFabricacao]}
            </button>
          );
        })}
      </div>

      {/* Board */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div style={{ width: 40, height: 40, border: '3px solid #FFD600', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
        </div>
      ) : filtroStatus !== 'TODOS' ? (
        <div className="fab-list-grid">
          {ordensFiltradas.length === 0
            ? <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: '#9CA3AF', fontSize: '0.9rem' }}>Nenhuma ordem encontrada</div>
            : ordensFiltradas.map(o => <OrdemCard key={o.id} ordem={o} />)}
        </div>
      ) : (
        <div className="fab-board-grid">
          {COLUMNS.map(col => {
            // Mais recentes primeiro
            const cols = [...ordens.filter(o => o.status === col.status)].sort(
              (a,b) => new Date(b.createdAt ?? b.dataEntradaGalpao).getTime() - new Date(a.createdAt ?? a.dataEntradaGalpao).getTime()
            );
            const MAX_VISIBLE = 4;
            const hasMore = cols.length > MAX_VISIBLE;
            return (
              <div key={col.status} style={{ background: '#FFFFFF', borderRadius: 14, border: `1px solid ${col.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: '12px 16px', borderBottom: `2px solid ${col.border}`, background: col.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: '0.78rem', color: col.color }}>{col.label}</span>
                  <span style={{ background: col.color, color: '#FFF', borderRadius: 20, padding: '2px 10px', fontSize: '0.65rem', fontWeight: 900, fontFamily: 'Orbitron, sans-serif', minWidth: 24, textAlign: 'center' }}>{cols.length}</span>
                </div>
                {/* Scrollable list — altura fixa ~4 cards */}
                <div className="col-scroll" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto', overflowX: 'hidden' }}>
                  {cols.length === 0
                    ? <div style={{ textAlign: 'center', padding: '28px 0', color: '#D1D5DB', fontSize: '0.78rem' }}>Vazio</div>
                    : cols.map(o => <OrdemCard key={o.id} ordem={o} compact />)}
                </div>
                {/* Rodapé com contador de extras */}
                {hasMore && (
                  <div style={{ padding: '8px 16px', borderTop: `1px solid ${col.border}`, background: col.bg, textAlign: 'center', fontSize: '0.65rem', color: col.color, fontWeight: 700, flexShrink: 0 }}>
                    ↕ Role para ver mais {cols.length} ordens
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrdemCard({ ordem, compact }: { ordem: OrdemFabricacao; compact?: boolean }) {
  const col = COLUMNS.find(c => c.status === ordem.status) ?? { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' };
  const orca = Number(ordem.orcamentoTotal);
  const ncs  = ordem._count?.naoConformidades || 0;
  const prog = ordem.status === 'CONCLUIDA' ? 100
    : ordem.operacoes
      ? Math.round(ordem.operacoes.reduce((a, op) => a + (op.percentualConcluido * (Number(op.pesoEvm) / 100)), 0))
      : 0;

  return (
    <Link href={`/admin/fabricacao/${ordem.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${ordem.andoneAtivo ? '#FECACA' : '#E5E7EB'}`, padding: compact ? '12px 14px' : '16px 18px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: ordem.andoneAtivo ? '0 0 12px rgba(220,38,38,0.15)' : '0 1px 4px rgba(0,0,0,0.05)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#FFD600'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = ordem.andoneAtivo ? '#FECACA' : '#E5E7EB'; (e.currentTarget as HTMLDivElement).style.boxShadow = ordem.andoneAtivo ? '0 0 12px rgba(220,38,38,0.15)' : '0 1px 4px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.82rem', color: '#B89B00' }}>{ordem.codigo}</div>
          <span style={{ background: col.bg, color: col.color, border: `1px solid ${col.border}`, borderRadius: 20, padding: '2px 10px', fontSize: '0.6rem', fontWeight: 800 }}>{STATUS_LABELS[ordem.status]}</span>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#374151', marginBottom: 10, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
          {ordem.descricaoBau.length > 52 ? ordem.descricaoBau.slice(0, 52) + '…' : ordem.descricaoBau}
        </div>
        {/* Progress bar */}
        <div style={{ marginBottom: compact ? 0 : 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.6rem', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>PROGRESSO FÍSICO</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669', fontFamily: 'Orbitron, sans-serif' }}>{prog}%</span>
          </div>
          <div style={{ height: 5, background: '#F3F4F6', borderRadius: 4 }}>
            <div style={{ height: 5, width: `${prog}%`, background: 'linear-gradient(90deg, #0891B2, #059669)', borderRadius: 4 }} />
          </div>
        </div>
        {!compact && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>R$ <strong style={{ color: '#111827' }}>{orca.toLocaleString('pt-BR')}</strong></span>
            {ncs > 0 && <span style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 20, padding: '2px 10px', border: '1px solid #FECACA', fontWeight: 700, fontSize: '0.65rem' }}>⚠ {ncs} NC{ncs > 1 ? 's' : ''}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
