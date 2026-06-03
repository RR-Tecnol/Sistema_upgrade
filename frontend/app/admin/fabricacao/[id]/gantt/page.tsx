'use client';

import { useEffect, useState } from 'react';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { fabricacaoApi, OperacaoProducao, OrdemFabricacao, OPERACAO_LABELS } from '@/lib/api/fabricacao';

export default function GanttPage({ params }: { params: { id: string } }) {
  const [ordem, setOrdem] = useState<OrdemFabricacao | null>(null);
  const [operacoes, setOperacoes] = useState<OperacaoProducao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fabricacaoApi.ordens.get(params.id).then(o => {
      setOrdem(o);
      setOperacoes((o as any).operacoes || []);
    }).finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div style={{ padding: '48px 0', textAlign: 'center', color: '#9CA3AF' }}>Carregando Gantt...</div>;
  if (!ordem) return null;

  const inicio    = new Date(ordem.dataInicioBaseline);
  const fim       = new Date(ordem.dataConclusaoBaseline);
  const totalDias = Math.max(1, (fim.getTime() - inicio.getTime()) / 86400000);
  const hoje      = new Date();
  const hojePct   = Math.min(100, Math.max(0, ((hoje.getTime() - inicio.getTime()) / 86400000 / totalDias) * 100));

  const toPercent = (d?: string) => {
    if (!d) return 0;
    return Math.min(100, Math.max(0, ((new Date(d).getTime() - inicio.getTime()) / 86400000 / totalDias) * 100));
  };
  const widthPct = (es?: string, ef?: string) => Math.max(2, toPercent(ef) - toPercent(es));

  // ── Cores por status ────────────────────────────────────────────────────────
  const getBarColor = (op: OperacaoProducao) => {
    if (op.status === 'CONCLUIDA')    return '#059669'; // verde
    if (op.status === 'LIBERADA')     return '#0891B2'; // azul
    if (op.status === 'EM_ANDAMENTO') return '#D97706'; // amarelo
    if (op.isCritical)                return '#DC2626'; // vermelho crítico
    return '#9CA3AF';                                   // cinza aguardando
  };
  const getProgressGradient = (op: OperacaoProducao) => {
    if (op.status === 'CONCLUIDA') return 'linear-gradient(90deg,#059669,#34D399)';
    if (op.isCritical)             return 'linear-gradient(90deg,#DC2626,#EF4444)';
    return 'linear-gradient(90deg,#0891B2,#059669)';
  };
  const getLabelColor = (op: OperacaoProducao) => {
    if (op.status === 'CONCLUIDA') return '#059669';
    if (op.isCritical)             return '#DC2626';
    return '#374151';
  };

  const meses: { label: string; pct: number }[] = [];
  let cur = new Date(inicio); cur.setDate(1);
  while (cur <= fim) {
    const pct = ((cur.getTime() - inicio.getTime()) / 86400000 / totalDias) * 100;
    if (pct >= 0 && pct <= 100) meses.push({ label: cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), pct });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">
      <AdminHeaderHero
        title="CRONOGRAMA GANTT"
        subtitle={`${inicio.toLocaleDateString('pt-BR')} → ${fim.toLocaleDateString('pt-BR')}`}
      />

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {[
          { color: '#DC2626', label: 'Caminho Crítico' },
          { color: '#0891B2', label: 'Liberada' },
          { color: '#D97706', label: 'Em Andamento' },
          { color: '#059669', label: 'Concluída' },
          { color: '#9CA3AF', label: 'Aguardando' },
          { color: '#B89B00', label: 'Hoje' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#374151', fontWeight: 600 }}>
            <div style={{ width: 16, height: 6, background: l.color, borderRadius: 3 }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Gantt — grid de 3 colunas: label | barras | % */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 16, padding: '20px 16px', overflowX: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '175px 1fr 40px', gap: '0 0', minWidth: 560 }}>

          {/* Cabeçalho linha de meses */}
          <div style={{ height: 32 }} />
          <div style={{ position: 'relative', height: 32, borderBottom: '1px solid #E5E7EB', marginBottom: 4 }}>
            {meses.map(m => (
              <span key={m.label} style={{ position: 'absolute', left: `${m.pct}%`, fontSize: '0.62rem', color: '#9CA3AF', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontWeight: 700, bottom: 6 }}>
                {m.label}
              </span>
            ))}
            {/* Linha hoje no header */}
            <div style={{ position: 'absolute', left: `${hojePct}%`, top: 0, bottom: 0, width: 2, background: '#B89B00', opacity: 0.8 }}>
              <div style={{ position: 'absolute', bottom: '100%', left: 4, fontSize: '0.55rem', color: '#B89B00', whiteSpace: 'nowrap', fontWeight: 800 }}>HOJE</div>
            </div>
          </div>
          <div style={{ height: 32 }} />

          {/* Operações */}
          {operacoes.map((op, i) => {
            const left      = toPercent(op.esDate);
            const w         = widthPct(op.esDate, op.efDate);
            const barColor  = getBarColor(op);
            const concluida = op.status === 'CONCLUIDA';
            const pct       = concluida ? 100 : (op.percentualConcluido ?? 0);

            return (
              <div key={op.id} style={{ display: 'contents' }}>
                {/* Label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, paddingRight: 10, overflow: 'hidden' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: barColor, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.72rem', color: getLabelColor(op), fontWeight: concluida ? 700 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i + 1}. {(OPERACAO_LABELS[op.operacao] || op.operacao).split(' · ')[1] || op.operacao}
                  </span>
                </div>

                {/* Barra */}
                <div style={{ position: 'relative', height: 44, display: 'flex', alignItems: 'center' }}>
                  {/* Track de fundo */}
                  <div style={{ position: 'absolute', left: 0, right: 0, height: 20, background: '#F3F4F6', borderRadius: 6 }} />

                  {concluida ? (
                    /* CONCLUÍDA: barra verde cobre o track inteiro */
                    <div style={{ position: 'absolute', left: 0, right: 0, height: 20, background: 'linear-gradient(90deg,#059669,#34D399)', borderRadius: 6, boxShadow: '0 1px 6px rgba(5,150,105,0.25)' }} />
                  ) : (
                    /* Em andamento: barra na posição planejada */
                    <div style={{ position: 'absolute', left: `${left}%`, width: `${w}%`, height: 20, background: `${barColor}20`, border: `1.5px solid ${barColor}60`, borderRadius: 6, overflow: 'hidden', minWidth: 6 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: getProgressGradient(op), borderRadius: 6, transition: 'width 0.5s ease' }} />
                    </div>
                  )}

                  {/* Linha hoje */}
                  <div style={{ position: 'absolute', left: `${hojePct}%`, top: 0, bottom: 0, width: 2, background: '#B89B00', opacity: 0.5, zIndex: 5, pointerEvents: 'none' }} />
                </div>

                {/* % — coluna isolada, nunca transborda */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: 44, paddingLeft: 6 }}>
                  <span style={{ fontSize: '0.62rem', color: concluida ? '#059669' : '#6B7280', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
