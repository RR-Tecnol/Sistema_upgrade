'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { fabricacaoApi, OrdemFabricacao, OperacaoProducao, EvmMetrics, StatusOrdemFabricacao, OP_STATUS_COLORS, OPERACAO_LABELS, STATUS_LABELS } from '@/lib/api/fabricacao';
import { toast } from '@/components/ui/Toast';

const STATUS_FLOW: { from: StatusOrdemFabricacao; to: StatusOrdemFabricacao; label: string; color: string; bg: string; minProgress?: number }[] = [
  { from: 'AGUARDANDO_MATERIAL', to: 'EM_PRODUCAO',    label: '▶ Iniciar Produção',       color: '#0891B2', bg: '#F0F9FF' },
  { from: 'EM_PRODUCAO',        to: 'INSPECAO_FINAL',  label: '🔍 Enviar p/ Inspeção',    color: '#7C3AED', bg: '#F5F3FF', minProgress: 95 },
  { from: 'EM_PRODUCAO',        to: 'BLOQUEADA',       label: '🚨 Bloquear (ANDON)',      color: '#DC2626', bg: '#FEF2F2' },
  { from: 'BLOQUEADA',          to: 'EM_PRODUCAO',     label: '🔓 Desbloquear',            color: '#0891B2', bg: '#F0F9FF' },
  { from: 'INSPECAO_FINAL',     to: 'EM_PRODUCAO',     label: '↩ Retornar à Produção',   color: '#D97706', bg: '#FFFBEB' },
  { from: 'INSPECAO_FINAL',     to: 'CONCLUIDA',       label: '✅ Concluir OF',            color: '#059669', bg: '#F0FDF4' },
];

// ── Especificações contextuais por gate (espelha gate page) ──────────────────────
const GATE_SPECS_CONFIG: Record<string, {
  title: string;
  fields: { key: string; label: string; type: 'select' | 'number' | 'text'; showIf?: (s: any) => boolean; options?: { value: string; label: string }[] }[];
}> = {
  OP010_VISTORIA_DESMANCHE: {
    title: 'Especificações de Aquisição e Legalização',
    fields: [
      { key: 'tipoIntervencaoChapas', label: 'Intervenção nas Chapas de Alumínio', type: 'select', options: [
        { value: 'LEVANTAMENTO',  label: '⬆ Levantamento (adicionar chapas)' },
        { value: 'REBAIXAMENTO',  label: '⬇ Rebaixamento (corte para reduzir altura)' },
        { value: 'SUBSTITUICAO',  label: '🔄 Substituição (troca de chapas danificadas)' },
        { value: 'NAO_APLICAVEL', label: '✓ Não aplicável (estrutura OK)' },
      ]},
      { key: 'alturaDesejadaCm', label: 'Altura desejada após corte (cm)', type: 'number', showIf: (s) => s.tipoIntervencaoChapas === 'REBAIXAMENTO' },
      { key: 'obsVistoria', label: 'Observações Técnicas', type: 'text' },
    ],
  },
  OP020_SERRALHERIA: {
    title: 'Especificações de Estrutura Externa — Serralheiro',
    fields: [
      { key: 'configEixos', label: 'Configuração de Eixos da Carreta', type: 'select', options: [
        { value: 'JA_2_EIXOS',     label: '✓ Já vem de fábrica com 2 eixos' },
        { value: 'TRES_PARA_DOIS', label: '⚙️ Converter de 3 eixos para 2 eixos' },
      ]},
      { key: 'obsSerralheria', label: 'Observações Técnicas', type: 'text' },
    ],
  },
  OP025_ELETRICA_AUTOMOTIVA: {
    title: 'Especificações de Elétrica Automotiva',
    fields: [
      { key: 'estadoBateria', label: 'Estado da Bateria', type: 'select', options: [
        { value: 'OK',        label: '✅ OK — em bom estado' },
        { value: 'TROCADA',   label: '🔄 Trocada (nova)' },
        { value: 'CARREGADA', label: '⚡ Carregada em oficina' },
      ]},
      { key: 'obsEletricaAuto', label: 'Observações Elétricas Automotivas', type: 'text' },
    ],
  },
  OP030_INFRAESTRUTURA: {
    title: 'Especificações de Estrutura Interna',
    fields: [
      { key: 'tipoInstalacao', label: 'Tipo de instalação elétrica', type: 'select', options: [
        { value: 'PADRAO',    label: '✓ Padrão (monofásico 127V)' },
        { value: 'BIFASICO',  label: '⚡ Bifásico 220V' },
        { value: 'TRIFASICO', label: '⚡ Trifásico' },
      ]},
      { key: 'obsInfra', label: 'Observações Elétricas', type: 'text' },
    ],
  },
};


export default function OrdemDetailPage({ params }: { params: { id: string } }) {
  const [ordem, setOrdem] = useState<OrdemFabricacao | null>(null);
  const [evm, setEvm] = useState<EvmMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [savingSpecs, setSavingSpecs] = useState(false);
  const [activeGate, setActiveGate] = useState<string | null>(null);
  const [gateSpecs, setGateSpecs] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    return Promise.all([
      fabricacaoApi.ordens.get(params.id),
      fabricacaoApi.ordens.getEvm(params.id).catch(() => null),
    ]).then(([o, e]) => {
      setOrdem(o);
      setEvm(e);
      // Detecta o gate ativo atual (primeira op não CONCLUÍDA)
      const ops: OperacaoProducao[] = (o as any)?.operacoes ?? [];
      const current = ops.find((op: OperacaoProducao) => op.status !== 'CONCLUIDA')?.operacao ?? null;
      setActiveGate(current);
      // Carrega specs do gate ativo no campo observacoes (JSON)
      try {
        const raw = o?.observacoes ? JSON.parse(o.observacoes) : {};
        const allSpecs = raw.__specs ?? {};
        if (current && allSpecs[current]) {
          setGateSpecs(allSpecs[current]);
        } else {
          setGateSpecs({});
        }
      } catch { setGateSpecs({}); }
    }).finally(() => setLoading(false));
  }, [params.id]);

  const handleSaveSpecs = async () => {
    if (!ordem) return;
    setSavingSpecs(true);
    try {
      // Busca OF atualizada para evitar observacoes desatualizadas
      const ordemAtual = await fabricacaoApi.ordens.get(params.id);

      // Deriva o gate ativo da OF atualizada (ou usa o estado)
      const ops: any[] = (ordemAtual as any)?.operacoes ?? [];
      const gateAtivo = ops.find((op: any) => op.status !== 'CONCLUIDA')?.operacao ?? activeGate ?? 'GERAL';

      let obsObj: any = {};
      try { obsObj = JSON.parse(ordemAtual.observacoes || '{}'); } catch { obsObj = { _texto: ordemAtual.observacoes }; }
      if (!obsObj.__specs) obsObj.__specs = {};
      obsObj.__specs[gateAtivo] = gateSpecs;

      await fabricacaoApi.ordens.update(params.id, { observacoes: JSON.stringify(obsObj) });
      await load();
      toast.success('Especificações salvas!');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.response?.data?.message || e?.message || 'Erro desconhecido'));
    } finally { setSavingSpecs(false); }
  };

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (novoStatus: StatusOrdemFabricacao) => {
    if (saving) return;
    setSaving(true);
    try {
      await fabricacaoApi.ordens.updateStatus(params.id, novoStatus);
      await load();
      toast.success('Status atualizado!');
    } catch (e) {
      toast.error('Erro ao atualizar status');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #FFD600', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 1rem' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>Carregando...</p>
      </div>
    </div>
  );

  if (!ordem) return <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF' }}>Ordem não encontrada</div>;

  const operacoes: OperacaoProducao[] = ordem.operacoes || [];
  const criticas = operacoes.filter(o => o.isCritical);
  const statusColor = (s: 'GREEN' | 'YELLOW' | 'RED') => s === 'GREEN' ? '#059669' : s === 'YELLOW' ? '#D97706' : '#DC2626';
  const statusBg    = (s: 'GREEN' | 'YELLOW' | 'RED') => s === 'GREEN' ? '#F0FDF4' : s === 'YELLOW' ? '#FFFBEB' : '#FEF2F2';
  const statusBd    = (s: 'GREEN' | 'YELLOW' | 'RED') => s === 'GREEN' ? '#BBF7D0' : s === 'YELLOW' ? '#FDE68A' : '#FECACA';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>

      {/* EVM KPIs */}
      {evm && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem' }}>
          <AnimatedKpiCard label="CPI" value={0} displayValue={evm.cpi.toFixed(2)} sub="índice de custo" color={statusColor(evm.statusCusto)} bg={statusBg(evm.statusCusto)} border={statusBd(evm.statusCusto)} icon={<span>💰</span>} />
          <AnimatedKpiCard label="SPI" value={0} displayValue={evm.spi.toFixed(2)} sub="índice de prazo" color={statusColor(evm.statusPrazo)} bg={statusBg(evm.statusPrazo)} border={statusBd(evm.statusPrazo)} icon={<span>📅</span>} delayMs={60} />
          <AnimatedKpiCard label="% Físico" value={evm.percentualFisico} suffix="%" sub="valor agregado" color="#0891B2" bg="#F0F9FF" border="#BAE6FD" icon={<span>📊</span>} delayMs={120} />
          <AnimatedKpiCard label="EAC" value={0} displayValue={`R$${(evm.eac/1000).toFixed(0)}k`} sub="estimativa final" color={evm.eac > evm.bac ? '#DC2626' : '#059669'} bg={evm.eac > evm.bac ? '#FEF2F2' : '#F0FDF4'} border={evm.eac > evm.bac ? '#FECACA' : '#BBF7D0'} icon={<span>🎯</span>} delayMs={180} />
          <AnimatedKpiCard label="VAC" value={0} displayValue={`R$${(Math.abs(evm.vac)/1000).toFixed(0)}k`} sub={evm.vac >= 0 ? 'abaixo do orç.' : 'acima do orç.'} color={evm.vac >= 0 ? '#059669' : '#DC2626'} bg={evm.vac >= 0 ? '#F0FDF4' : '#FEF2F2'} border={evm.vac >= 0 ? '#BBF7D0' : '#FECACA'} icon={<span>📉</span>} delayMs={240} />
          <AnimatedKpiCard label="TCPI" value={0} displayValue={evm.tcpi.toFixed(2)} sub="eficiência necessária" color={statusColor(evm.statusTcpi)} bg={statusBg(evm.statusTcpi)} border={statusBd(evm.statusTcpi)} icon={<span>⚡</span>} delayMs={300} />
        </div>
      )}

      <style>{`
        .fab-detail-2col { display: grid; grid-template-columns: 1fr 320px; gap: 20px; }
        @media (max-width: 768px) { .fab-detail-2col { grid-template-columns: 1fr; } }
      `}</style>
      <div className="fab-detail-2col">

        {/* Roteiro Stepper */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', alignSelf: 'start' }}>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#B89B00', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: 20, textTransform: 'uppercase' }}>Roteiro de Produção</div>

          {/* Legenda dos grupos de paralelismo */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { color: '#0891B2', label: 'Estrutura Externa' },
              { color: '#7C3AED', label: 'Elétrica Automotiva' },
              { color: '#059669', label: 'Estrutura Interna' },
              { color: '#D97706', label: 'Serviço Interno/Acabamento' },
            ].map(g => (
              <span key={g.label} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.6rem', color: g.color, background: `${g.color}10`, border:`1px solid ${g.color}30`, borderRadius:6, padding:'2px 7px', fontWeight:700 }}>
                <span style={{width:6,height:6,borderRadius:'50%',background:g.color,flexShrink:0}}/>{g.label}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {operacoes.map((op, i) => {
              const isLast = i === operacoes.length - 1;
              const sc = OP_STATUS_COLORS[op.status] || '#6B7280';

              // Grupo de cor por fase
              const groupColor: Record<string,string> = {
                OP010_VISTORIA_DESMANCHE:  '#B89B00',
                OP020_SERRALHERIA:         '#0891B2',
                OP025_ELETRICA_AUTOMOTIVA: '#7C3AED',
                OP030_INFRAESTRUTURA:      '#059669',
                OP040_ACABAMENTO:          '#D97706',
                OP050_MARCENARIA:          '#D97706',
                OP060_GATE_LIBERACAO:      '#059669',
              };
              const gc = groupColor[op.operacao] || sc;

              // Badges de paralelismo
              const parallelBadge: Record<string,string> = {
                OP020_SERRALHERIA:         '⇉ Paralelo',
                OP025_ELETRICA_AUTOMOTIVA: '⇉ Paralelo',
                OP030_INFRAESTRUTURA:      '⇉ Paralelo',
                OP040_ACABAMENTO:          '⇉ Paralelo',
                OP050_MARCENARIA:          '⇉ Paralelo',
              };
              const badge = parallelBadge[op.operacao];

              // Indicador de dependências pendentes para a liberação final (OP060)
              const waitingForLast = op.operacao === 'OP060_GATE_LIBERACAO' && op.status === 'AGUARDANDO'
                ? operacoes.filter(o => o.operacao !== 'OP060_GATE_LIBERACAO' && o.status !== 'CONCLUIDA').map(o => OPERACAO_LABELS[o.operacao] || o.operacao)
                : [];

              return (
                <div key={op.id} style={{ display: 'flex', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${op.status === 'CONCLUIDA' ? gc : op.isCritical ? '#DC2626' : gc}`, background: op.status === 'CONCLUIDA' ? gc : '#FFFFFF', color: op.status === 'CONCLUIDA' ? '#FFF' : gc, fontSize: '0.75rem', fontWeight: 900, flexShrink: 0 }}>
                      {op.status === 'CONCLUIDA' ? '✓' : i + 1}
                    </div>
                    {!isLast && <div style={{ width: 2, flex: 1, minHeight: 16, background: op.status === 'CONCLUIDA' ? `${gc}60` : op.isCritical ? '#FCA5A5' : '#E5E7EB', margin: '4px 0' }} />}
                  </div>
                  <div style={{ paddingBottom: isLast ? 0 : 20, flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: op.status === 'CONCLUIDA' ? gc : op.isCritical ? '#DC2626' : '#111827', fontFamily: 'Inter, sans-serif' }}>
                            {OPERACAO_LABELS[op.operacao] || op.operacao}
                          </span>
                          {op.isCritical && op.status !== 'CONCLUIDA' && <span style={{ fontSize: '0.58rem', color: '#DC2626', fontWeight: 800, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, padding: '1px 5px' }}>● CRÍTICO</span>}
                          {op.status === 'CONCLUIDA' && <span style={{ fontSize: '0.58rem', color: gc, fontWeight: 800 }}>● GATE APROVADO</span>}
                        </div>
                        {/* Badge de paralelismo */}
                        {badge && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.58rem', color: gc, background: `${gc}12`, border: `1px solid ${gc}30`, borderRadius: 4, padding: '1px 6px', marginTop: 2, fontWeight: 700 }}>
                            {badge}
                          </span>
                        )}
                        {/* OP060: aguardando todas as anteriores */}
                        {waitingForLast.length > 0 && (
                          <div style={{ fontSize: '0.6rem', color: '#DC2626', marginTop: 3, background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 4, padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            ⏳ Aguardando: {waitingForLast.join(' · ')}
                          </div>
                        )}
                      </div>
                      {op.status === 'GATE_PENDENTE' ? (
                        <Link href={`/admin/fabricacao/${params.id}/gate/${op.operacao}`}
                          style={{ background: '#F5F3FF', color: '#7C3AED', borderRadius: 20, padding: '4px 12px', fontSize: '0.6rem', fontWeight: 800, flexShrink: 0, border: '1px solid #DDD6FE', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          🔍 APROVAR GATE →
                        </Link>
                      ) : op.status === 'CONCLUIDA' ? (
                        <Link href={`/admin/fabricacao/${params.id}/gate/${op.operacao}`}
                          style={{ background: '#F0FDF4', color: '#059669', borderRadius: 20, padding: '4px 12px', fontSize: '0.6rem', fontWeight: 800, flexShrink: 0, border: '1px solid #BBF7D0', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          ✓ Ver Gate
                        </Link>
                      ) : op.status === 'EM_ANDAMENTO' ? (
                        <Link href={`/admin/fabricacao/${params.id}/gate/${op.operacao}`}
                          style={{ background: '#FFF7ED', color: '#D97706', borderRadius: 20, padding: '4px 12px', fontSize: '0.6rem', fontWeight: 800, flexShrink: 0, border: '1.5px solid #FDE68A', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          ⚙️ Em Produção →
                        </Link>
                      ) : op.status === 'LIBERADA' ? (
                        <Link href={`/admin/fabricacao/${params.id}/gate/${op.operacao}`}
                          style={{ background: `${gc}15`, color: gc, borderRadius: 20, padding: '4px 12px', fontSize: '0.6rem', fontWeight: 800, flexShrink: 0, border: `1px solid ${gc}40`, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          ▶ Iniciar
                        </Link>
                      ) : (
                        <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 20, padding: '2px 10px', fontSize: '0.6rem', fontWeight: 700, flexShrink: 0, border: '1px solid #E5E7EB' }}>
                          {op.status === 'AGUARDANDO' ? '⏸ Aguardando' : op.status.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <div style={{ height: 5, background: '#F3F4F6', borderRadius: 4, marginBottom: 4 }}>
                      <div style={{ height: 5, width: `${op.percentualConcluido}%`, background: op.status === 'CONCLUIDA' ? `linear-gradient(90deg,${gc},${gc}99)` : op.isCritical ? 'linear-gradient(90deg,#DC2626,#EF4444)' : `linear-gradient(90deg,${gc}80,${gc})`, borderRadius: 4 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#9CA3AF' }}>
                      <span>{op.percentualConcluido}% concluído</span>
                      <span>{Number(op.duracaoPrevistaHoras)}h previstas</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {operacoes.length === 0 && <p style={{ color: '#9CA3AF', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>Nenhuma operação cadastrada</p>}
          </div>

          {/* ── Painel de Resumo de Etapas (abaixo do stepper) ── */}
          {operacoes.length > 0 && (() => {
            const concluidas   = operacoes.filter(o => o.status === 'CONCLUIDA').length;
            const emAndamento  = operacoes.filter(o => o.status === 'EM_ANDAMENTO').length;
            const liberadas    = operacoes.filter(o => o.status === 'LIBERADA').length;
            const aguardando   = operacoes.filter(o => o.status === 'AGUARDANDO').length;
            const criticas     = operacoes.filter(o => o.isCritical && o.status !== 'CONCLUIDA').length;
            const progressoMed = Math.round(operacoes.reduce((a,o) => a + Number(o.percentualConcluido ?? 0), 0) / operacoes.length);
            const horasTotal   = operacoes.reduce((a,o) => a + Number(o.duracaoPrevistaHoras ?? 0), 0);
            const stats = [
              { label: 'Concluídas',   value: concluidas,  color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', icon: '✅' },
              { label: 'Em Produção',  value: emAndamento, color: '#D97706', bg: '#FFF7ED', border: '#FDE68A', icon: '⚙️' },
              { label: 'Liberadas',    value: liberadas,   color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD', icon: '▶' },
              { label: 'Aguardando',   value: aguardando,  color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', icon: '⏸' },
            ];
            return (
              <div style={{ marginTop: 24 }}>
                {/* Divider com título */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, #FEF08A, transparent)' }} />
                  <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#B89B00', fontSize: '0.62rem', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>RESUMO DO ROTEIRO</span>
                  <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, transparent, #FEF08A)' }} />
                </div>

                {/* Progresso geral */}
                <div style={{ background: 'linear-gradient(135deg, #FFFDE7, #FFF9C4)', border: '1.5px solid #FEF08A', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#92400E' }}>PROGRESSO GERAL DO ROTEIRO</span>
                    <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#B89B00' }}>{progressoMed}%</span>
                  </div>
                  <div style={{ background: '#FEF08A', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                    <div style={{ height: 10, borderRadius: 8, width: `${progressoMed}%`, background: 'linear-gradient(90deg, #B89B00, #FFD600)', transition: 'width 0.6s ease', boxShadow: '0 0 8px rgba(184,155,0,0.4)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.62rem', color: '#92400E' }}>
                    <span>{concluidas}/{operacoes.length} etapas concluídas</span>
                    <span>{horasTotal}h previstas no total</span>
                  </div>
                </div>

                {/* Stats 2×2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {stats.map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: '1.1rem' }}>{s.icon}</div>
                      <div>
                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: '0.6rem', color: s.color, fontWeight: 600, opacity: 0.75, marginTop: 1 }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Alerta caminho crítico */}
                {criticas > 0 && (
                  <div style={{ marginTop: 12, background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>🚨</span>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#DC2626', marginBottom: 2 }}>CAMINHO CRÍTICO ATIVO</div>
                      <div style={{ fontSize: '0.62rem', color: '#B91C1C', lineHeight: 1.4 }}>
                        {criticas} etapa{criticas > 1 ? 's' : ''} no caminho crítico — qualquer atraso impacta diretamente o prazo final da OF.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Progresso das Etapas */}
          {operacoes.length > 0 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.82rem' }}>📌 Progresso das Etapas</div>
                <div style={{ fontSize: '0.68rem', color: '#6B7280', background: '#F3F4F6', borderRadius: 20, padding: '2px 8px' }}>
                  {operacoes.filter(o => o.percentualConcluido >= 100).length}/{operacoes.length} concluídas
                </div>
              </div>
              {operacoes.map(op => {
                const pct = Math.min(Number(op.percentualConcluido ?? 0), 100);
                const isCrit = op.isCritical;
                const isDone = pct >= 100;
                const isBlocked = op.status === 'BLOQUEADA';
                const barColor = isDone ? '#059669' : isBlocked ? '#DC2626' : isCrit ? '#D97706' : '#0891B2';
                const labelColor = isDone ? '#059669' : isBlocked ? '#DC2626' : isCrit ? '#D97706' : '#374151';
                const statusIcon = isDone ? '✅' : isBlocked ? '🚨' : isCrit ? '⚠️' : '🔵';
                return (
                  <div key={op.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: labelColor, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {statusIcon} {(OPERACAO_LABELS[op.operacao] || op.operacao).split('·')[0].trim().split('—')[0].trim()}
                      </span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: barColor, fontFamily: 'Orbitron, sans-serif' }}>
                        {pct}%
                      </span>
                    </div>
                    <div style={{ background: '#F3F4F6', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                      <div style={{ height: 6, borderRadius: 6, width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}99, ${barColor})`, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
              {criticas.length > 0 && criticas.length < operacoes.length && (
                <div style={{ marginTop: 10, padding: '6px 10px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: '0.67rem', color: '#92400E' }}>
                  ⚠️ <strong>{criticas.length} etapa{criticas.length > 1 ? 's' : ''}</strong> no caminho crítico — qualquer atraso afeta o prazo final.
                </div>
              )}
            </div>
          )}


          {/* Status Control */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.82rem', marginBottom: 6 }}>Status da Ordem</div>
            <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 14 }}>
              Atual: <strong style={{ color: '#111827' }}>{STATUS_LABELS[ordem.status]}</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STATUS_FLOW.filter(t => t.from === ordem.status).map(t => {
                const progresso = evm?.percentualFisico ?? 0;
                const bloqueado = saving || (t.minProgress !== undefined && progresso < t.minProgress);
                const motivo = t.minProgress !== undefined && progresso < t.minProgress
                  ? `Progresso físico insuficiente (${progresso}% de ${t.minProgress}% necessários)`
                  : '';
                return (
                  <div key={t.to}>
                    <button onClick={() => !bloqueado && handleStatusChange(t.to)} disabled={bloqueado}
                      title={motivo}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${bloqueado && !saving ? '#E5E7EB' : t.color + '40'}`, background: bloqueado && !saving ? '#F9FAFB' : t.bg, color: bloqueado && !saving ? '#9CA3AF' : t.color, fontWeight: 700, fontSize: '0.82rem', cursor: bloqueado ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'all 0.15s', textAlign: 'left' }}>
                      {saving ? '⏳ Aguarde...' : t.label}
                    </button>
                    {motivo && (
                      <div style={{ fontSize: '0.65rem', color: '#D97706', marginTop: 4, padding: '4px 8px', background: '#FFFBEB', borderRadius: 6, border: '1px solid #FDE68A' }}>
                        ⚠️ {motivo}
                      </div>
                    )}
                  </div>
                );
              })}
              {STATUS_FLOW.filter(t => t.from === ordem.status).length === 0 && (
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', textAlign: 'center', padding: '8px 0' }}>Nenhuma transição disponível</div>
              )}
            </div>
          </div>

          {/* ── Ficha Técnica — contextual ao gate ativo ── */}
          {(() => {
            const cfg = activeGate ? GATE_SPECS_CONFIG[activeGate] : null;
            if (!activeGate || !cfg) return (
              <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 14, padding: 16, textAlign: 'center' }}>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#059669', fontSize: '0.72rem', letterSpacing: '0.08em', marginBottom: 6 }}>⚙️ FICHA TÉCNICA</div>
                <div style={{ fontSize: '0.72rem', color: '#059669' }}>✅ Todos os gates concluídos</div>
              </div>
            );
            return (
              <div style={{ background: '#FFFFFF', border: '1.5px solid #FDE68A', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#B89B00', fontSize: '0.72rem', letterSpacing: '0.08em' }}>⚙️ FICHA TÉCNICA</div>
                    <div style={{ fontSize: '0.6rem', color: '#9CA3AF', marginTop: 2 }}>{cfg.title}</div>
                  </div>
                </div>

                {cfg.fields.filter(f => !f.showIf || f.showIf(gateSpecs)).map(field => (
                  <div key={field.key} style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: '0.62rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{field.label}</label>
                    {field.type === 'select' ? (
                      <select value={gateSpecs[field.key] ?? ''}
                        onChange={e => setGateSpecs(s => ({ ...s, [field.key]: e.target.value }))}
                        style={{ width: '100%', padding: '7px 9px', borderRadius: 8, border: '1.5px solid #FDE68A', background: '#FFFDE7', fontSize: '0.78rem', color: '#111827', outline: 'none', cursor: 'pointer' }}>
                        <option value="">— Selecione —</option>
                        {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : field.type === 'number' ? (
                      <input type="number" value={gateSpecs[field.key] ?? ''}
                        onChange={e => setGateSpecs(s => ({ ...s, [field.key]: e.target.value }))}
                        style={{ width: '100%', padding: '7px 9px', borderRadius: 8, border: '1.5px solid #FDE68A', background: '#FFFDE7', fontSize: '0.78rem', color: '#111827', outline: 'none' }} />
                    ) : (
                      <input type="text" value={gateSpecs[field.key] ?? ''}
                        onChange={e => setGateSpecs(s => ({ ...s, [field.key]: e.target.value }))}
                        placeholder="Observações técnicas..."
                        style={{ width: '100%', padding: '7px 9px', borderRadius: 8, border: '1.5px solid #FDE68A', background: '#FFFDE7', fontSize: '0.78rem', color: '#111827', outline: 'none' }} />
                    )}
                  </div>
                ))}

                <button onClick={handleSaveSpecs} disabled={savingSpecs}
                  style={{ width: '100%', padding: '8px', borderRadius: 10, background: savingSpecs ? '#E5E7EB' : 'linear-gradient(135deg,#D97706,#B45309)', color: savingSpecs ? '#9CA3AF' : '#FFF', fontWeight: 700, fontSize: '0.75rem', border: 'none', cursor: savingSpecs ? 'not-allowed' : 'pointer', fontFamily: 'Orbitron, sans-serif', marginTop: 4 }}>
                  {savingSpecs ? '⏳ Salvando...' : '💾 Salvar Especificações'}
                </button>
              </div>
            );
          })()}

          {/* Ações rápidas */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.82rem', marginBottom: 14 }}>Ações Rápidas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: '💰 Custos da OF',          href: 'custos' },
                { label: '📈 Análise EVM',            href: 'evm' },
                { label: '📅 Cronograma Gantt',       href: 'gantt' },
                { label: '🧱 Lista de Materiais',      href: 'bom' },
                { label: '⚠️ Não-Conformidades',      href: 'nc' },
                { label: '✏️ Apontamentos',            href: 'apontamentos' },
              ].map(a => (
                <Link key={a.href} href={`/admin/fabricacao/${params.id}/${a.href}`} style={{ display: 'block', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#FFD600'; (e.currentTarget as HTMLAnchorElement).style.background = '#FFFDE7'; (e.currentTarget as HTMLAnchorElement).style.color = '#B89B00'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLAnchorElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLAnchorElement).style.color = '#374151'; }}>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Detalhes */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.82rem', marginBottom: 14 }}>Detalhes da Ordem</div>
            {[
              ['Responsável', ordem.responsavel?.name || '—'],
              ['Grupo', ordem.grupo?.name || '—'],
              ['Tipo Contratação', ordem.tipoContratacao],
              ['Configuração', ordem.configuracao],
              ['Entrada Galpão', new Date(ordem.dataEntradaGalpao).toLocaleDateString('pt-BR')],
              ['Baseline', `${new Date(ordem.dataInicioBaseline).toLocaleDateString('pt-BR')} → ${new Date(ordem.dataConclusaoBaseline).toLocaleDateString('pt-BR')}`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.75rem', gap: 8 }}>
                <span style={{ color: '#9CA3AF', fontWeight: 600, whiteSpace: 'nowrap' }}>{k}</span>
                <span style={{ color: '#111827', fontWeight: 700, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
