'use client';

import { useEffect, useState } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Dot,
} from 'recharts';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { fabricacaoApi, EvmMetrics, SnapshotEvm, OrdemFabricacao } from '@/lib/api/fabricacao';

/* ─── Helpers ─────────────────────────────────────────────────────────── */
const fmtBRL = (v: number) =>
  `R$ ${Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
const fmtK = (v: number) =>
  `R$${(Math.abs(Number(v)) / 1000).toFixed(0)}k`;

/**
 * Gera a curva PV planejada completa com distribuição em "S" (sigmoide).
 * Usa a fórmula de Gompertz para distribuição realista de trabalho.
 */
function gerarCurvaPV(
  inicio: Date,
  fim: Date,
  bac: number,
  steps = 40,
): { ts: number; label: string; PV_Planejado: number }[] {
  const total = fim.getTime() - inicio.getTime();
  const result = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0..1
    // Sigmoide (Gompertz): crescimento lento no início, acelerado no meio, lento no fim
    const pv = bac * (1 - Math.exp(-6 * Math.pow(t, 1.5)));
    const ts = inicio.getTime() + total * t;
    const d = new Date(ts);
    result.push({
      ts,
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      PV_Planejado: Math.round(pv),
    });
  }
  return result;
}

/* ─── Custom Tooltip ───────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0F172A', border: '1px solid #334155', borderRadius: 10,
      padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: 200,
    }}>
      <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginBottom: 8, fontWeight: 700 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <span style={{ fontSize: '0.72rem', color: p.color, fontWeight: 600 }}>{p.name}</span>
          <span style={{ fontSize: '0.72rem', color: '#F1F5F9', fontFamily: 'monospace' }}>
            {p.value != null ? fmtBRL(p.value) : '—'}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── Status colors ─────────────────────────────────────────────────────── */
const sc = (s: 'GREEN' | 'YELLOW' | 'RED') =>
  s === 'GREEN' ? '#059669' : s === 'YELLOW' ? '#D97706' : '#DC2626';
const sb = (s: 'GREEN' | 'YELLOW' | 'RED') =>
  s === 'GREEN' ? '#F0FDF4' : s === 'YELLOW' ? '#FFFBEB' : '#FEF2F2';
const sd = (s: 'GREEN' | 'YELLOW' | 'RED') =>
  s === 'GREEN' ? '#BBF7D0' : s === 'YELLOW' ? '#FDE68A' : '#FECACA';

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function EvmPage({ params }: { params: { id: string } }) {
  const [evm, setEvm] = useState<EvmMetrics | null>(null);
  const [historico, setHistorico] = useState<SnapshotEvm[]>([]);
  const [ordem, setOrdem] = useState<OrdemFabricacao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fabricacaoApi.ordens.getEvm(params.id),
      fabricacaoApi.ordens.getEvmHistorico(params.id),
      fabricacaoApi.ordens.get(params.id),
    ]).then(([e, h, o]) => {
      setEvm(e); setHistorico(h); setOrdem(o);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #FFD600', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 1rem' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>Carregando EVM...</p>
      </div>
    </div>
  );

  /* ── Montar dados do gráfico ──────────────────────────────────────────── */
  const bac = evm?.bac ?? 0;
  const inicio = ordem ? new Date(ordem.dataInicioBaseline) : new Date();
  const fim = ordem ? new Date(ordem.dataConclusaoBaseline) : new Date(Date.now() + 30 * 86400000);
  const hoje = new Date();
  const hojeTs = hoje.getTime();

  // 1. Curva PV planejada completa (S-curve)
  const pvCurve = gerarCurvaPV(inicio, fim, bac, 50);

  // 2. Pontos reais do histórico (EV, AC)
  const actualMap = new Map<string, { EV_Real: number; AC_Real: number; EAC_Proj: number }>();
  historico.forEach(s => {
    const ts = new Date(s.data).getTime();
    const label = new Date(s.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    actualMap.set(label, {
      EV_Real: Number(s.ev),
      AC_Real: Number(s.ac),
      EAC_Proj: Number(s.eac),
    });
  });

  // 3. Merge: cada ponto da curva PV pode ter dados reais se coincidir com snapshot
  const chartData = pvCurve.map(pt => {
    const real = actualMap.get(pt.label);
    return {
      ...pt,
      EV_Real: real?.EV_Real ?? null,
      AC_Real: real?.AC_Real ?? null,
      EAC_Proj: real?.EAC_Proj ?? null,
      isToday: Math.abs(pt.ts - hojeTs) < 86400000 * 0.75,
    };
  });

  // 4. Linha de projeção EAC — do ponto atual ao fim do projeto
  const eacFinal = evm?.eac ?? bac;
  const evAtual = evm?.ev ?? 0;
  const acAtual = evm?.ac ?? 0;
  const todayLabel = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  // % tempo decorrido
  const totalMs = fim.getTime() - inicio.getTime();
  const decorrido = Math.max(0, Math.min(1, (hojeTs - inicio.getTime()) / totalMs));

  // Inserir ponto de hoje + projeção EAC
  const finalData = chartData.map((pt, idx) => {
    const tPct = (pt.ts - inicio.getTime()) / totalMs;
    const isAfterToday = pt.ts > hojeTs;
    return {
      ...pt,
      // Projeção EAC: linha do ponto atual até o EAC final
      EAC_Linha: isAfterToday && evm
        ? Math.round(acAtual + (eacFinal - acAtual) * ((tPct - decorrido) / (1 - decorrido + 0.001)))
        : null,
    };
  });

  const todayIndex = finalData.findIndex(d => d.isToday);
  const todayLabelForRef = todayIndex >= 0 ? finalData[todayIndex].label : todayLabel;

  const hasData = historico.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">
      <style>{`
        @media (max-width: 900px) { .evm-interp { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) { .evm-fin-item { border-right: none !important; border-bottom: 1px solid #F3F4F6 !important; } }
      `}</style>
      <AdminHeaderHero title="ANÁLISE EVM" subtitle="Earned Value Management · Desempenho de Custo e Prazo" />

      {/* KPI indices */}
      {evm && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem' }}>
            <AnimatedKpiCard label="CPI" value={0} displayValue={evm.cpi.toFixed(2)} sub="Índice de custo" color={sc(evm.statusCusto)} bg={sb(evm.statusCusto)} border={sd(evm.statusCusto)} icon={<span>💰</span>} />
            <AnimatedKpiCard label="SPI" value={0} displayValue={evm.spi.toFixed(2)} sub="Índice de prazo" color={sc(evm.statusPrazo)} bg={sb(evm.statusPrazo)} border={sd(evm.statusPrazo)} icon={<span>📅</span>} delayMs={60} />
            <AnimatedKpiCard label="% Físico" value={evm.percentualFisico} suffix="%" sub="Valor agregado" color="#0891B2" bg="#F0F9FF" border="#BAE6FD" icon={<span>📊</span>} delayMs={120} />
            <AnimatedKpiCard label="EAC" value={0} displayValue={`R$${(evm.eac / 1000).toFixed(0)}k`} sub="Estimativa final" color={evm.eac > evm.bac ? '#DC2626' : '#059669'} bg={evm.eac > evm.bac ? '#FEF2F2' : '#F0FDF4'} border={evm.eac > evm.bac ? '#FECACA' : '#BBF7D0'} icon={<span>🎯</span>} delayMs={180} />
            <AnimatedKpiCard label="VAC" value={0} displayValue={`R$${(Math.abs(evm.vac) / 1000).toFixed(0)}k`} sub={evm.vac >= 0 ? 'abaixo do orç.' : 'acima do orç.'} color={evm.vac >= 0 ? '#059669' : '#DC2626'} bg={evm.vac >= 0 ? '#F0FDF4' : '#FEF2F2'} border={evm.vac >= 0 ? '#BBF7D0' : '#FECACA'} icon={<span>📉</span>} delayMs={240} />
            <AnimatedKpiCard label="TCPI" value={0} displayValue={evm.tcpi.toFixed(2)} sub="Eficiência necessária" color={sc(evm.statusTcpi)} bg={sb(evm.statusTcpi)} border={sd(evm.statusTcpi)} icon={<span>⚡</span>} delayMs={300} />
          </div>

          {/* Valores financeiros */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' }}>
              <span style={{ fontWeight: 800, color: '#111827', fontSize: '0.82rem' }}>Valores Financeiros EVM</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 0 }}>
              {[
                { label: 'BAC', value: evm.bac, color: '#B89B00', sub: 'Orçamento total' },
                { label: 'EV', value: evm.ev, color: '#0891B2', sub: 'Valor agregado' },
                { label: 'PV', value: evm.pv, color: '#6B7280', sub: 'Valor planejado' },
                { label: 'AC', value: evm.ac, color: '#D97706', sub: 'Custo real' },
                { label: 'EAC', value: evm.eac, color: evm.eac > evm.bac ? '#DC2626' : '#059669', sub: 'Estimativa final' },
                { label: 'ETC', value: evm.etc, color: '#6B7280', sub: 'Restante previsto' },
                { label: 'VAC', value: evm.vac, color: evm.vac >= 0 ? '#059669' : '#DC2626', sub: 'Variação final' },
              ].map((f, i, arr) => (
                <div key={f.label} className="evm-fin-item" style={{ padding: '12px 14px', borderRight: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{f.label}</div>
                  <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.78rem', color: f.color }}>R${Math.abs(f.value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                  <div style={{ fontSize: '0.58rem', color: '#9CA3AF', marginTop: 2 }}>{f.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Interpretações */}
          <div className="evm-interp" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { label: 'CPI', text: evm.interpretacaoCpi, s: evm.statusCusto },
              { label: 'SPI', text: evm.interpretacaoSpi, s: evm.statusPrazo },
            ].map(i => (
              <div key={i.label} style={{ background: sb(i.s as any), border: `1px solid ${sd(i.s as any)}`, borderRadius: 14, padding: '16px 20px', borderLeft: `4px solid ${sc(i.s as any)}` }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: sc(i.s as any), fontSize: '0.72rem', marginBottom: 8, letterSpacing: '0.08em' }}>{i.label} — INTERPRETAÇÃO</div>
                <div style={{ fontSize: '0.82rem', color: '#374151', fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>{i.text}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── S-Curve Profissional ───────────────────────────────────────────── */}
      <div style={{ background: '#0F172A', borderRadius: 18, padding: '28px 28px 20px', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#FFD600', fontSize: '0.85rem', letterSpacing: '0.12em', marginBottom: 4 }}>
              S-CURVE — EARNED VALUE MANAGEMENT
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
              Curva de valor planejado vs. desempenho real · {inicio.toLocaleDateString('pt-BR')} → {fim.toLocaleDateString('pt-BR')}
            </div>
          </div>
          {evm && (
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: 'BAC', val: fmtK(bac), color: '#FFD600' },
                { label: 'EAC', val: fmtK(eacFinal), color: eacFinal > bac ? '#F87171' : '#34D399' },
                { label: 'CPI', val: evm.cpi.toFixed(2), color: evm.cpi >= 0.9 ? '#34D399' : '#F87171' },
              ].map(badge => (
                <div key={badge.label} style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.58rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{badge.label}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 900, color: badge.color, fontFamily: 'Orbitron, sans-serif' }}>{badge.val}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legenda manual */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { color: '#7C3AED', dash: false, label: 'PV — Valor Planejado (S-Curve Baseline)' },
            { color: '#06B6D4', dash: false, label: 'EV — Valor Agregado Real' },
            { color: '#F59E0B', dash: false, label: 'AC — Custo Real' },
            { color: '#F87171', dash: true,  label: 'EAC — Projeção de Custo Final' },
            { color: '#FFD600', dash: true,  label: 'Hoje' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="24" height="10">
                <line x1="0" y1="5" x2="24" y2="5"
                  stroke={l.color} strokeWidth={l.dash ? 1.5 : 2}
                  strokeDasharray={l.dash ? '4 3' : 'none'} />
              </svg>
              <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={finalData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="evFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#06B6D4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="acFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />

            <XAxis
              dataKey="label"
              tick={{ fill: '#475569', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#1E293B' }}
              interval={Math.floor(finalData.length / 8)}
            />
            <YAxis
              tick={{ fill: '#475569', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtK}
              width={56}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* BAC reference line */}
            {bac > 0 && (
              <ReferenceLine
                y={bac}
                stroke="#FFD600"
                strokeDasharray="8 4"
                strokeWidth={1}
                label={{ value: `BAC ${fmtK(bac)}`, position: 'right', fill: '#FFD600', fontSize: 9 }}
              />
            )}

            {/* Linha de HOJE */}
            {todayLabelForRef && (
              <ReferenceLine
                x={todayLabelForRef}
                stroke="#FFD600"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{ value: 'Hoje', position: 'top', fill: '#FFD600', fontSize: 9 }}
              />
            )}

            {/* PV — curva planejada (área) */}
            <Area
              type="monotoneX"
              dataKey="PV_Planejado"
              name="PV — Planejado"
              stroke="#7C3AED"
              strokeWidth={2}
              fill="url(#pvFill)"
              dot={false}
              activeDot={{ r: 4, fill: '#7C3AED', stroke: '#fff', strokeWidth: 2 }}
            />

            {/* EV — Valor Agregado Real (somente pontos com dados) */}
            <Area
              type="monotone"
              dataKey="EV_Real"
              name="EV — Valor Agregado"
              stroke="#06B6D4"
              strokeWidth={2.5}
              fill="url(#evFill)"
              connectNulls={false}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.EV_Real == null) return <></>;
                return <circle key={`ev-dot-${cx}`} cx={cx} cy={cy} r={5} fill="#06B6D4" stroke="#0F172A" strokeWidth={2} />;
              }}
              activeDot={{ r: 6, fill: '#06B6D4', stroke: '#fff', strokeWidth: 2 }}
            />

            {/* AC — Custo Real */}
            <Area
              type="monotone"
              dataKey="AC_Real"
              name="AC — Custo Real"
              stroke="#F59E0B"
              strokeWidth={2.5}
              fill="url(#acFill)"
              connectNulls={false}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.AC_Real == null) return <></>;
                return <circle key={`ac-dot-${cx}`} cx={cx} cy={cy} r={5} fill="#F59E0B" stroke="#0F172A" strokeWidth={2} />;
              }}
              activeDot={{ r: 6, fill: '#F59E0B', stroke: '#fff', strokeWidth: 2 }}
            />

            {/* EAC — Projeção pontilhada */}
            {evm && eacFinal !== bac && (
              <Line
                type="monotone"
                dataKey="EAC_Linha"
                name="EAC — Projeção"
                stroke="#F87171"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                connectNulls={false}
                activeDot={{ r: 4, fill: '#F87171', stroke: '#fff', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Rodapé informativo */}
        <div style={{ marginTop: 12, display: 'flex', gap: 20, flexWrap: 'wrap', borderTop: '1px solid #1E293B', paddingTop: 12 }}>
          {evm && [
            { label: 'Variação de Custo (CV)', val: fmtBRL(evm.cv), ok: evm.cv >= 0 },
            { label: 'Variação de Prazo (SV)', val: fmtBRL(evm.sv), ok: evm.sv >= 0 },
            { label: 'Progresso Físico', val: `${evm.percentualFisico.toFixed(1)}%`, ok: evm.percentualFisico > 50 },
            { label: 'Projeção vs. Orçamento', val: eacFinal > bac ? `+${fmtBRL(eacFinal - bac)} acima` : `${fmtBRL(bac - eacFinal)} abaixo`, ok: eacFinal <= bac },
          ].map(item => (
            <div key={item.label} style={{ fontSize: '0.68rem', color: '#475569' }}>
              {item.label}: <strong style={{ color: item.ok ? '#34D399' : '#F87171' }}>{item.val}</strong>
            </div>
          ))}
          {!hasData && (
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontStyle: 'italic' }}>
              ℹ️ Nenhum apontamento registrado ainda — a curva PV planejada é exibida como referência
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
