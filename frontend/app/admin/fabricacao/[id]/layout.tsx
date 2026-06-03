'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { fabricacaoApi, OrdemFabricacao, STATUS_LABELS, STATUS_COLORS } from '@/lib/api/fabricacao';

const STATUS_LIGHT: Record<string, { color: string; bg: string; border: string }> = {
  AGUARDANDO_MATERIAL: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  EM_PRODUCAO:         { color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
  BLOQUEADA:           { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  INSPECAO_FINAL:      { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  CONCLUIDA:           { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
};

const TABS = [
  { href: '',               label: 'Visão Geral',       icon: '📊' },
  { href: '/gantt',         label: 'Gantt',              icon: '📅' },
  { href: '/evm',           label: 'EVM',                icon: '📈' },
  { href: '/custos',        label: 'Custos',             icon: '💰' },
  { href: '/prestadores',   label: 'Prestadores',        icon: '👷' },
  { href: '/bom',           label: 'Lista de Materiais', icon: '📋' },
  { href: '/nc',            label: 'NCs',                icon: '⚠️' },
  { href: '/apontamentos',  label: 'Apontamentos',       icon: '✍️' },
];

export default function OrdemLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const pathname = usePathname();
  const [ordem, setOrdem] = useState<OrdemFabricacao | null>(null);

  useEffect(() => {
    fabricacaoApi.ordens.get(params.id).then(setOrdem).catch(() => {});
  }, [params.id]);

  const sl = ordem ? (STATUS_LIGHT[ordem.status] ?? { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' }) : { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' };
  const isGatePage = pathname.includes('/gate/');
  const backHref = isGatePage ? `/admin/fabricacao/${params.id}` : '/admin/fabricacao';
  const base = `/admin/fabricacao/${params.id}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">
      <style>{`
        .fab-order-header-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
        .fab-order-meta { display: flex; gap: 24px; flex-wrap: wrap; }
        @media (max-width: 768px) {
          .fab-order-meta { gap: 12px; }
          .fab-order-meta > div { text-align: left; }
        }
      `}</style>

      {/* Header da Ordem — card branco com accent amarelo */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #FFD600' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="fab-order-header-row">
              <Link href={backHref} style={{
                fontSize: '0.72rem', color: '#B89B00', textDecoration: 'none', fontWeight: 700,
                background: '#FFFDE7', border: '1.5px solid #FFD600', borderRadius: 20,
                padding: '3px 12px', display: 'inline-flex', alignItems: 'center', gap: 4,
                transition: 'all 0.15s', letterSpacing: '0.01em',
              }}>← Fabricação</Link>
              <span style={{ color: '#E5E7EB' }}>·</span>
              <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#B89B00', fontSize: '1rem' }}>{ordem?.codigo || '...'}</span>
              {ordem && (
                <span style={{ background: sl.bg, color: sl.color, border: `1px solid ${sl.border}`, borderRadius: 20, padding: '3px 12px', fontSize: '0.65rem', fontWeight: 800 }}>
                  {STATUS_LABELS[ordem.status]}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#374151', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>{ordem?.descricaoBau || '...'}</div>
            {ordem?.cliente && <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 4 }}>Cliente: {ordem.cliente}</div>}
          </div>
          {ordem && (
            <div className="fab-order-meta">
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Orçamento</div>
                <div style={{ fontSize: '0.95rem', fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#B89B00' }}>R$ {Number(ordem.orcamentoTotal).toLocaleString('pt-BR')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Prazo</div>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#111827' }}>{new Date(ordem.dataConclusaoBaseline).toLocaleDateString('pt-BR')}</div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginTop: 20, flexWrap: 'wrap', borderTop: '1px solid #F3F4F6', paddingTop: 16 }}>
          {TABS.map(tab => {
            const href = base + tab.href;
            const isActive = tab.href === '' ? pathname === base : pathname.startsWith(href);
            return (
              <Link key={tab.href} href={href} style={{
                padding: '6px 14px', borderRadius: 8,
                background: isActive ? '#FFFDE7' : 'transparent',
                border: `1.5px solid ${isActive ? '#FEF08A' : '#E5E7EB'}`,
                color: isActive ? '#B89B00' : '#6B7280',
                fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.15s',
              }}>
                {tab.icon} {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
