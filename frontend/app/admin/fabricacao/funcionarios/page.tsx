'use client';

import { useEffect, useState } from 'react';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { fabricacaoApi, FuncionarioProducao } from '@/lib/api/fabricacao';

const FUNCAO_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  SERRALHEIRO: { color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
  MARCENEIRO:  { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  ELETRICISTA: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  PINTOR:      { color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
  ENCARREGADO: { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
  AJUDANTE:    { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  SUPERVISOR:  { color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
};

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<FuncionarioProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fabricacaoApi.funcionarios.list().then(setFuncionarios).catch(() => {}).finally(() => setLoading(false)); }, []);

  const filtered = funcionarios.filter(f => !search || f.nome.toLowerCase().includes(search.toLowerCase()) || f.funcao.toLowerCase().includes(search.toLowerCase()));
  const ativos = funcionarios.filter(f => f.active).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">
      <AdminHeaderHero title="EQUIPE DE PRODUÇÃO" subtitle="Funcionários e operadores do galpão de fabricação" />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
        <AnimatedKpiCard label="Total"   value={funcionarios.length} sub="cadastrados" color="#0891B2" bg="#F0F9FF" border="#BAE6FD" icon={<span>👷</span>} />
        <AnimatedKpiCard label="Ativos"  value={ativos}              sub="em produção" color="#059669" bg="#F0FDF4" border="#BBF7D0" icon={<span>✅</span>} delayMs={60} />
        <AnimatedKpiCard label="Inativos" value={funcionarios.length - ativos} sub="afastados" color="#6B7280" bg="#F9FAFB" border="#E5E7EB" icon={<span>⏸️</span>} delayMs={120} />
      </div>

      {/* Busca */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: '12px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar por nome ou função..." style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.9rem', color: '#111827', background: 'transparent', fontFamily: 'Inter, sans-serif' }} />
      </div>

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: '#9CA3AF' }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#D1D5DB', fontSize: '0.9rem' }}>Nenhum funcionário encontrado</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map(func => {
            const cfg = FUNCAO_CONFIG[func.funcao] ?? FUNCAO_CONFIG.AJUDANTE;
            return (
              <div key={func.id} style={{ background: '#FFFFFF', border: `1px solid ${func.active ? '#E5E7EB' : '#F3F4F6'}`, borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s', borderTop: `3px solid ${cfg.color}`, opacity: func.active ? 1 : 0.65 }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                {/* Avatar */}
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', marginBottom: 14 }}>👷</div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>{func.nome}</div>
                <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 20, padding: '3px 12px', fontSize: '0.65rem', fontWeight: 800 }}>{func.funcao}</span>
                {(func.telefone || func.valorDiaria) && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {func.telefone && <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>📞 {func.telefone}</div>}
                    {func.valorDiaria && <div style={{ fontSize: '0.75rem', color: '#B89B00', fontWeight: 700 }}>💰 R$ {Number(func.valorDiaria).toFixed(2)}/dia</div>}
                  </div>
                )}
                {!func.active && (
                  <div style={{ marginTop: 10 }}>
                    <span style={{ background: '#F3F4F6', color: '#9CA3AF', borderRadius: 20, padding: '2px 10px', fontSize: '0.65rem', fontWeight: 700, border: '1px solid #E5E7EB' }}>● INATIVO</span>
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
