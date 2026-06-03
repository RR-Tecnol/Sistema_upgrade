'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { fabricacaoApi, CustoOf, OrdemFabricacao, OPERACAO_LABELS } from '@/lib/api/fabricacao';
import { toast } from '@/components/ui/Toast';
import ModalLancarCustoServico from '@/components/fabricacao/ModalLancarCustoServico';
import api from '@/lib/api/client';

const TIPO_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  SERVICO_DIARIA: { label: 'Diária', icon: '📅', color: '#0891B2', bg: '#F0F9FF' },
  SERVICO_PACOTE: { label: 'Pacote', icon: '📋', color: '#0891B2', bg: '#F0F9FF' },
  BAU_COMPRA: { label: 'Compra Baú', icon: '🚛', color: '#D97706', bg: '#FFFBEB' },
  FRETE_AQUISICAO: { label: 'Frete', icon: '🚚', color: '#D97706', bg: '#FFFBEB' },
  MATERIAL: { label: 'Material', icon: '📦', color: '#059669', bg: '#F0FDF4' },
  EQUIPAMENTO: { label: 'Equipamento', icon: '🔧', color: '#374151', bg: '#F9FAFB' },
  MAO_DE_OBRA: { label: 'Mão de Obra', icon: '👷', color: '#374151', bg: '#F9FAFB' },
  PORTEIRA_FECHADA: { label: 'Porteira Fechada', icon: '🔒', color: '#374151', bg: '#F9FAFB' },
  DESPESA_GERAL: { label: 'Despesa Geral', icon: '💸', color: '#374151', bg: '#F9FAFB' },
  OUTRO: { label: 'Outro', icon: '➕', color: '#374151', bg: '#F9FAFB' },
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

export default function CustosPage({ params }: { params: { id: string } }) {
  const [ordem, setOrdem] = useState<OrdemFabricacao | null>(null);
  const [custos, setCustos] = useState<CustoOf[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [editAq, setEditAq] = useState(false);
  const [savingAq, setSavingAq] = useState(false);
  const [aqForm, setAqForm] = useState({ cursoEspecifico: '', valorBauComprado: '', valorBauDescricao: '', valorFreteAquisicao: '', valorFreteDescricao: '' });
  const [fotosOf, setFotosOf] = useState<string[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [deletingCusto, setDeletingCusto] = useState<string | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, c] = await Promise.all([
        fabricacaoApi.ordens.get(params.id),
        fabricacaoApi.ordens.getCustos(params.id),
      ]);
      setOrdem(o);
      setCustos(c);
    } catch {
      toast.error('Erro ao carregar dados de custo');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  // Sync aqForm when ordem loads
  useEffect(() => {
    if (!ordem) return;
    setAqForm({
      cursoEspecifico: ordem.cursoEspecifico || '',
      valorBauComprado: ordem.valorBauComprado ? String(ordem.valorBauComprado) : '',
      valorBauDescricao: ordem.valorBauDescricao || '',
      valorFreteAquisicao: ordem.valorFreteAquisicao ? String(ordem.valorFreteAquisicao) : '',
      valorFreteDescricao: ordem.valorFreteDescricao || '',
    });
    try { const o = JSON.parse(ordem.observacoes || '{}'); setFotosOf(o.__fotos_of ?? []); } catch { setFotosOf([]); }
  }, [ordem]);

  const handleSaveAq = async () => {
    setSavingAq(true);
    try {
      await fabricacaoApi.ordens.update(params.id, {
        cursoEspecifico: aqForm.cursoEspecifico || undefined,
        valorBauComprado: aqForm.valorBauComprado ? Number(aqForm.valorBauComprado) : undefined,
        valorBauDescricao: aqForm.valorBauDescricao || undefined,
        valorFreteAquisicao: aqForm.valorFreteAquisicao ? Number(aqForm.valorFreteAquisicao) : undefined,
        valorFreteDescricao: aqForm.valorFreteDescricao || undefined,
      });
      toast.success('Custo de aquisição atualizado!');
      setEditAq(false); await load();
    } catch { toast.error('Erro ao salvar'); } finally { setSavingAq(false); }
  };

  const handleFotoOf = async (files: FileList | null) => {
    if (!files?.length || !ordem) return;
    setUploadingFoto(true);
    const novas: string[] = [];
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData(); fd.append('file', f);
        const res = await api.post<{ url: string }>('/public/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        novas.push(res.data.url);
      }
      const o2 = await fabricacaoApi.ordens.get(params.id);
      let obs: any = {}; try { obs = JSON.parse(o2.observacoes || '{}'); } catch { }
      obs.__fotos_of = [...(obs.__fotos_of ?? []), ...novas];
      await fabricacaoApi.ordens.update(params.id, { observacoes: JSON.stringify(obs) });
      setFotosOf(p => [...p, ...novas]);
      toast.success(`${novas.length} foto(s) adicionada(s)!`);
    } catch { toast.error('Erro ao enviar foto'); }
    finally { setUploadingFoto(false); if (fotoRef.current) fotoRef.current.value = ''; }
  };

  const handleDeletarCusto = async (custoId: string) => {
    if (!confirm('Remover este lançamento? A conta a pagar vinculada será cancelada.')) return;
    setDeletingCusto(custoId);
    try {
      await fabricacaoApi.ordens.deletarCusto(params.id, custoId);
      toast.success('Lançamento removido!');
      await load();
    } catch { toast.error('Erro ao remover lançamento'); }
    finally { setDeletingCusto(null); }
  };

  const gerarPDF = () => {
    if (!ordem) return;
    const fmt2 = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const fmtD = (d: string) => new Date(d).toLocaleDateString('pt-BR');
    const totalAq   = (Number(ordem.valorBauComprado) || 0) + (Number(ordem.valorFreteAquisicao) || 0);
    const totalServ = custos.filter(c => ['SERVICO_DIARIA','SERVICO_PACOTE','MAO_DE_OBRA','PORTEIRA_FECHADA'].includes(c.tipo)).reduce((s,c)=>s+Number(c.valor),0);
    const totalMat  = custos.filter(c => c.tipo==='MATERIAL').reduce((s,c)=>s+Number(c.valor),0);
    const totalOut  = custos.filter(c => !['SERVICO_DIARIA','SERVICO_PACOTE','MAO_DE_OBRA','PORTEIRA_FECHADA','MATERIAL'].includes(c.tipo)).reduce((s,c)=>s+Number(c.valor),0);
    const totalG    = totalAq + totalServ + totalMat + totalOut;
    const orcamento = Number(ordem.orcamentoTotal) || 0;
    const pctExec   = orcamento > 0 ? Math.round((totalG / orcamento) * 100) : 0;
    const geradoEm  = new Date().toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });

    // Linhas da tabela de lançamentos (com prestador)
    const rows = custos.map((c, i) => {
      const cfg = TIPO_CONFIG[c.tipo] || TIPO_CONFIG.OUTRO;
      const tipoPrestBadge = c.prestadorNome
        ? `<span class="badge-${c.tipoPrestador === 'PJ' ? 'pj' : 'pf'}">${c.tipoPrestador === 'PJ' ? 'PJ' : 'PF'}</span>`
        : '';
      const docLine = c.prestadorCpf
        ? `<div class="doc">CPF ${c.prestadorCpf}</div>`
        : c.prestadorCnpj
        ? `<div class="doc">CNPJ ${c.prestadorCnpj}</div>`
        : '';
      const prestadorCell = c.prestadorNome
        ? `<div class="prest-card prest-${c.tipoPrestador === 'PJ' ? 'pj' : 'pf'}">${tipoPrestBadge}<div><div class="prest-nome">${c.prestadorNome}</div>${docLine}</div></div>`
        : `<span style="color:#CCC">—</span>`;
      const gateLabel = c.operacao
        ? (OPERACAO_LABELS[c.operacao] || c.operacao).split('·')[0].trim()
        : 'Geral';
      return `<tr class="${i % 2 === 0 ? 'even' : 'odd'}">
        <td><span class="tipo-badge" style="background:${cfg.bg};color:${cfg.color}">${cfg.icon} ${cfg.label}</span></td>
        <td>${c.oficio || '—'}</td>
        <td>${prestadorCell}</td>
        <td>${c.descricao}</td>
        <td style="white-space:nowrap;font-size:9px;color:#666">${gateLabel}</td>
        <td style="white-space:nowrap">${fmtD(c.dataVencimento)}</td>
        <td style="text-align:right;font-weight:800;font-size:11px">${fmt2(Number(c.valor))}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Custos — ${ordem.codigo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }

  /* ── CABEÇALHO ─────────────────────────────────────────── */
  .header {
    background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
    color: #fff; padding: 28px 32px 22px;
    display: flex; justify-content: space-between; align-items: flex-start;
  }
  .header-left .logo { font-size: 9px; font-weight: 800; letter-spacing: .15em;
    color: #FFD600; text-transform: uppercase; margin-bottom: 6px; }
  .header-left .titulo { font-size: 22px; font-weight: 900; letter-spacing: .04em;
    color: #FFD600; line-height: 1.1; }
  .header-left .subtitulo { font-size: 11px; color: #94A3B8; margin-top: 4px; }
  .header-right { text-align: right; }
  .header-right .of-code { font-size: 18px; font-weight: 900; color: #FFD600; letter-spacing:.08em; }
  .header-right .gerado { font-size: 9px; color: #64748B; margin-top: 4px; }
  .header-right .status-bar { margin-top: 10px; background: #334155;
    border-radius: 6px; padding: 8px 12px; min-width: 200px; }
  .header-right .status-bar .sl { font-size: 9px; color: #94A3B8; text-transform: uppercase; letter-spacing:.05em; margin-bottom: 3px; }
  .progress-bg { background: #1E293B; border-radius: 4px; height: 8px; overflow: hidden; }
  .progress-fill { background: linear-gradient(90deg, #FFD600, #F59E0B);
    height: 8px; border-radius: 4px; width: ${Math.min(pctExec, 100)}%; }
  .pct-label { font-size: 11px; font-weight: 800; color: #FFD600; margin-top: 3px; }

  /* ── KPIs ──────────────────────────────────────────────── */
  .kpis { display: flex; gap: 0; background: #F8FAFC;
    border-bottom: 3px solid #FFD600; }
  .kpi { flex: 1; padding: 14px 20px; border-right: 1px solid #E2E8F0; }
  .kpi:last-child { border-right: none; }
  .kpi-label { font-size: 8.5px; font-weight: 700; color: #64748B;
    text-transform: uppercase; letter-spacing: .07em; margin-bottom: 4px; }
  .kpi-val { font-size: 14px; font-weight: 900; color: #0F172A; }
  .kpi-val.highlight { color: #D97706; }
  .kpi-val.green { color: #059669; }

  /* ── BODY ──────────────────────────────────────────────── */
  .body { padding: 24px 32px; }

  /* ── SEÇÕES ─────────────────────────────────────────────── */
  .section-title {
    font-size: 11px; font-weight: 800; color: #0F172A;
    text-transform: uppercase; letter-spacing: .08em;
    border-left: 4px solid #FFD600; padding-left: 10px;
    margin: 20px 0 10px;
  }

  /* ── TABELAS ─────────────────────────────────────────────── */
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead tr { background: #1E293B; }
  th { padding: 8px 10px; text-align: left; font-size: 8.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .07em; color: #94A3B8; }
  td { padding: 9px 10px; vertical-align: middle; }
  tr.even td { background: #F8FAFC; }
  tr.odd td { background: #FFFFFF; }
  tr:not(thead tr):hover td { background: #FFF9C4; }
  tfoot tr td { background: linear-gradient(135deg,#FFFDE7,#FFF3C4) !important;
    border-top: 2px solid #FFD600; font-weight: 800; font-size: 11px; }

  /* ── TIPO BADGE ─────────────────────────────────────────── */
  .tipo-badge { display: inline-block; padding: 2px 8px; border-radius: 20px;
    font-size: 9px; font-weight: 700; }

  /* ── PRESTADOR ───────────────────────────────────────────── */
  .prest-card { display: flex; align-items: flex-start; gap: 6px;
    padding: 4px 8px; border-radius: 6px; }
  .prest-pf { background: #F0FDF4; border-left: 3px solid #059669; }
  .prest-pj { background: #F5F3FF; border-left: 3px solid #7C3AED; }
  .prest-nome { font-weight: 700; font-size: 10px; color: #111; }
  .doc { font-size: 8.5px; color: #6B7280; font-family: 'Courier New', monospace; margin-top: 1px; }
  .badge-pf { display: inline-block; font-size: 7.5px; font-weight: 800;
    padding: 1px 5px; border-radius: 10px; margin-top: 2px;
    background: #DCFCE7; color: #059669; border: 1px solid #BBF7D0; }
  .badge-pj { display: inline-block; font-size: 7.5px; font-weight: 800;
    padding: 1px 5px; border-radius: 10px; margin-top: 2px;
    background: #EDE9FE; color: #5B21B6; border: 1px solid #DDD6FE; }

  /* ── RODAPÉ ──────────────────────────────────────────────── */
  .footer { margin-top: 32px; padding: 16px 32px;
    background: #F8FAFC; border-top: 2px solid #E2E8F0;
    display: flex; justify-content: space-between; align-items: center; }
  .footer-left { font-size: 9px; color: #94A3B8; }
  .footer-right { font-size: 9px; color: #94A3B8; text-align: right; }
  .footer-brand { font-size: 10px; font-weight: 800; color: #FFD600;
    letter-spacing: .1em; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { background: #0F172A !important; }
    tr.even td { background: #F8FAFC !important; }
    tfoot tr td { background: #FFFDE7 !important; }
  }
</style>
</head>
<body>

<!-- CABEÇALHO -->
<div class="header">
  <div class="header-left">
    <div class="logo">⚙ Sistema de Fabricação · Relatório Financeiro</div>
    <div class="titulo">RELATÓRIO DE CUSTOS</div>
    <div class="subtitulo">${ordem.descricaoBau || 'Baú / Carreta'}${ordem.cursoEspecifico ? ' · ' + ordem.cursoEspecifico : ''}</div>
  </div>
  <div class="header-right">
    <div class="of-code">${ordem.codigo}</div>
    <div class="gerado">Gerado em ${geradoEm}</div>
    <div class="status-bar">
      <div class="sl">Execução do Orçamento</div>
      <div class="progress-bg"><div class="progress-fill"></div></div>
      <div class="pct-label">${pctExec}% consumido · ${fmt2(totalG)} de ${fmt2(orcamento)}</div>
    </div>
  </div>
</div>

<!-- KPIs -->
<div class="kpis">
  <div class="kpi"><div class="kpi-label">Aquisição (Baú + Frete)</div><div class="kpi-val">${fmt2(totalAq)}</div></div>
  <div class="kpi"><div class="kpi-label">Materiais</div><div class="kpi-val">${fmt2(totalMat)}</div></div>
  <div class="kpi"><div class="kpi-label">Serviços</div><div class="kpi-val">${fmt2(totalServ)}</div></div>
  <div class="kpi"><div class="kpi-label">Outros</div><div class="kpi-val">${fmt2(totalOut)}</div></div>
  <div class="kpi"><div class="kpi-label">Total Geral</div><div class="kpi-val highlight">${fmt2(totalG)}</div></div>
  <div class="kpi"><div class="kpi-label">Orçamento</div><div class="kpi-val green">${fmt2(orcamento)}</div></div>
</div>

<div class="body">
  ${(ordem.valorBauComprado || ordem.valorFreteAquisicao) ? `
  <div class="section-title">🚛 Custo de Aquisição da Carreta</div>
  <table>
    <thead><tr><th>Item</th><th>Descrição</th><th style="text-align:right">Valor</th></tr></thead>
    <tbody>
      ${ordem.valorBauComprado ? `<tr class="even"><td>Baú / Carreta</td><td>${ordem.valorBauDescricao || '—'}</td><td style="text-align:right;font-weight:700">${fmt2(Number(ordem.valorBauComprado))}</td></tr>` : ''}
      ${ordem.valorFreteAquisicao ? `<tr class="odd"><td>Frete até o Destino</td><td>${ordem.valorFreteDescricao || '—'}</td><td style="text-align:right;font-weight:700">${fmt2(Number(ordem.valorFreteAquisicao))}</td></tr>` : ''}
    </tbody>
    <tfoot><tr><td colspan="2"><strong>Subtotal Aquisição</strong></td><td style="text-align:right">${fmt2(totalAq)}</td></tr></tfoot>
  </table>` : ''}

  <div class="section-title">📋 Lançamentos de Serviços e Materiais</div>
  <table>
    <thead>
      <tr>
        <th>Tipo</th>
        <th>Ofício</th>
        <th>Prestador</th>
        <th>Descrição</th>
        <th>Gate</th>
        <th>Vencimento</th>
        <th style="text-align:right">Valor</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="6"><strong>TOTAL GERAL (${custos.length} lançamento${custos.length !== 1 ? 's' : ''})</strong></td>
        <td style="text-align:right">${fmt2(totalG)}</td>
      </tr>
    </tfoot>
  </table>
</div>

<!-- RODAPÉ -->
<div class="footer">
  <div class="footer-left">
    <div class="footer-brand">UPGRADE · SISTEMA DE FABRICAÇÃO</div>
    <div style="margin-top:3px">Documento gerado automaticamente em ${geradoEm} · Confidencial</div>
  </div>
  <div class="footer-right">
    <div>OF: <strong>${ordem.codigo}</strong></div>
    <div>Orçamento: <strong>${fmt2(orcamento)}</strong> · Realizado: <strong>${fmt2(totalG)}</strong></div>
  </div>
</div>

</body></html>`;

    const w = window.open('', '_blank');
    if (!w) return toast.error('Pop-up bloqueado. Permita pop-ups e tente novamente.');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  };


  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #FFD600', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 1rem' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>Carregando custos...</p>
      </div>
    </div>
  );

  if (!ordem) return <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF' }}>Ordem não encontrada</div>;

  // ── Cálculos ─────────────────────────────────────────────────────────────
  const aquisicao = (Number(ordem.valorBauComprado) || 0) + (Number(ordem.valorFreteAquisicao) || 0);
  const totalServicos = custos
    .filter(c => ['SERVICO_DIARIA', 'SERVICO_PACOTE', 'MAO_DE_OBRA', 'PORTEIRA_FECHADA'].includes(c.tipo))
    .reduce((s, c) => s + Number(c.valor), 0);
  const totalMateriais = custos
    .filter(c => c.tipo === 'MATERIAL')
    .reduce((s, c) => s + Number(c.valor), 0);
  const totalOutros = custos
    .filter(c => !['SERVICO_DIARIA', 'SERVICO_PACOTE', 'MAO_DE_OBRA', 'PORTEIRA_FECHADA', 'MATERIAL'].includes(c.tipo))
    .reduce((s, c) => s + Number(c.valor), 0);
  const totalGeral = aquisicao + totalServicos + totalMateriais + totalOutros;
  const orcamento = Number(ordem.orcamentoTotal);
  const desvioPercent = orcamento > 0 ? ((totalGeral - orcamento) / orcamento) * 100 : 0;
  const desvioPositivo = desvioPercent <= 0;

  // Custos por gate
  const porGate: Record<string, number> = {};
  custos.forEach(c => {
    const g = c.operacao || 'Geral';
    porGate[g] = (porGate[g] || 0) + Number(c.valor);
  });

  const custosFiltrados = filtroTipo ? custos.filter(c => c.tipo === filtroTipo) : custos;

  // KPI Card
  const KpiCard = ({ icon, label, value, sub, color, bg, border }: any) => (
    <div style={{ background: bg || '#F9FAFB', border: `1px solid ${border || '#E5E7EB'}`, borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: '1.4rem' }}>{icon}</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.15rem', color: color || '#111827' }}>
        R$ {fmt(value)}
      </div>
      {sub && <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#B89B00', fontSize: '0.9rem', letterSpacing: '0.08em' }}>
            💰 DASHBOARD DE CUSTOS
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 4 }}>
            {ordem.codigo} {ordem.cursoEspecifico ? `· ${ordem.cursoEspecifico}` : '· Curso a definir'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={gerarPDF}
            style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            📄 Exportar PDF
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#FFD600,#E5B800)', color: '#0F172A', fontWeight: 800, fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            + LANÇAR SERVIÇO
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <KpiCard icon="🚛" label="Aquisição (Baú + Frete)" value={aquisicao} sub="custo base da carreta" color="#D97706" bg="#FFFBEB" border="#FDE68A" />
        <KpiCard icon="📦" label="Materiais" value={totalMateriais} sub="empresa pagou" color="#059669" bg="#F0FDF4" border="#BBF7D0" />
        <KpiCard icon="🔧" label="Serviços" value={totalServicos} sub="diárias + pacotes" color="#0891B2" bg="#F0F9FF" border="#BAE6FD" />
        <KpiCard icon="💰" label="Total Real" value={totalGeral} sub="soma de todos os custos" color="#0F172A" bg="#F9FAFB" border="#E5E7EB" />
        <div style={{ background: desvioPositivo ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${desvioPositivo ? '#BBF7D0' : '#FECACA'}`, borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: '1.4rem' }}>{desvioPositivo ? '✅' : '⚠️'}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Orçamento vs. Real</span>
          </div>
          <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: desvioPositivo ? '#059669' : '#DC2626' }}>
            {desvioPositivo ? '▼' : '▲'} {Math.abs(desvioPercent).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>
            Orç: R$ {fmt(orcamento)}
          </div>
        </div>
      </div>

      {/* Barra de progresso orçamento */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>Execução do Orçamento</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: desvioPositivo ? '#059669' : '#DC2626' }}>
            R$ {fmt(totalGeral)} / R$ {fmt(orcamento)}
          </span>
        </div>
        <div style={{ height: 10, background: '#F3F4F6', borderRadius: 8 }}>
          <div style={{
            height: 10,
            width: `${Math.min((totalGeral / orcamento) * 100, 100)}%`,
            background: totalGeral > orcamento
              ? 'linear-gradient(90deg,#DC2626,#EF4444)'
              : totalGeral > orcamento * 0.8
                ? 'linear-gradient(90deg,#D97706,#F59E0B)'
                : 'linear-gradient(90deg,#059669,#34D399)',
            borderRadius: 8,
            transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.68rem', color: '#9CA3AF' }}>
          <span>{orcamento > 0 ? ((totalGeral / orcamento) * 100).toFixed(1) : 0}% consumido</span>
          <span>Saldo: R$ {fmt(Math.max(orcamento - totalGeral, 0))}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Card Aquisição — com edição inline */}
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: 20 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: '#92400E', fontSize: '0.82rem' }}>🚛 Custo de Aquisição da Carreta</div>
            {!editAq ? (
              <button onClick={() => setEditAq(true)}
                style={{ padding: '4px 12px', borderRadius: 8, border: '1.5px solid #FDE68A', background: '#FFFFFF', color: '#D97706', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>
                ✏️ Editar
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditAq(false)}
                  style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSaveAq} disabled={savingAq}
                  style={{ padding: '4px 14px', borderRadius: 8, border: 'none', background: savingAq ? '#E5E7EB' : 'linear-gradient(135deg,#FFD600,#E5B800)', color: savingAq ? '#9CA3AF' : '#0F172A', fontWeight: 800, fontSize: '0.72rem', cursor: savingAq ? 'not-allowed' : 'pointer', fontFamily: 'Orbitron, sans-serif' }}>
                  {savingAq ? '⏳' : '✅ Salvar'}
                </button>
              </div>
            )}
          </div>

          {editAq ? (
            /* ── Modo edição ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Curso Específico</label>
                <input value={aqForm.cursoEspecifico} onChange={e => setAqForm(f => ({ ...f, cursoEspecifico: e.target.value }))}
                  placeholder="Ex: Mecânica de Motos (opcional)"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #FDE68A', background: '#FFFDE7', fontSize: '0.82rem', color: '#111827', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Valor do Baú (R$)</label>
                  <input type="number" value={aqForm.valorBauComprado} onChange={e => setAqForm(f => ({ ...f, valorBauComprado: e.target.value }))}
                    placeholder="85000"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #FDE68A', background: '#FFFDE7', fontSize: '0.82rem', color: '#111827', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>NF / Fornecedor</label>
                  <input value={aqForm.valorBauDescricao} onChange={e => setAqForm(f => ({ ...f, valorBauDescricao: e.target.value }))}
                    placeholder="NF 1234 - Fornecedor X"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #FDE68A', background: '#FFFDE7', fontSize: '0.82rem', color: '#111827', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Frete até Teresina (R$)</label>
                  <input type="number" value={aqForm.valorFreteAquisicao} onChange={e => setAqForm(f => ({ ...f, valorFreteAquisicao: e.target.value }))}
                    placeholder="5000"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #FDE68A', background: '#FFFDE7', fontSize: '0.82rem', color: '#111827', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Transportadora</label>
                  <input value={aqForm.valorFreteDescricao} onChange={e => setAqForm(f => ({ ...f, valorFreteDescricao: e.target.value }))}
                    placeholder="Transportadora Rápida"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #FDE68A', background: '#FFFDE7', fontSize: '0.82rem', color: '#111827', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              {/* Preview live */}
              {(Number(aqForm.valorBauComprado) + Number(aqForm.valorFreteAquisicao)) > 0 && (
                <div style={{ background: 'linear-gradient(135deg,#FFFDE7,#FFF9C4)', border: '1px solid #FFD600', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400E' }}>Total Aquisição</span>
                  <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#0F172A', fontSize: '0.95rem' }}>
                    R$ {fmt(Number(aqForm.valorBauComprado || 0) + Number(aqForm.valorFreteAquisicao || 0))}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* ── Modo leitura ── */
            <>
              {ordem.cursoEspecifico && (
                <div style={{ marginBottom: 10, fontSize: '0.78rem', color: '#374151', background: '#FFF', borderRadius: 8, padding: '6px 10px', border: '1px solid #FDE68A' }}>
                  🎓 <strong>Curso:</strong> {ordem.cursoEspecifico}
                </div>
              )}
              {ordem.valorBauComprado ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.82rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#374151' }}>Baú / Carreta</div>
                    {ordem.valorBauDescricao && <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{ordem.valorBauDescricao}</div>}
                  </div>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>R$ {fmt(Number(ordem.valorBauComprado))}</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 10 }}>Valor do baú não informado — clique em ✏️ Editar</div>
              )}
              {ordem.valorFreteAquisicao ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.82rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#374151' }}>Frete até Teresina</div>
                    {ordem.valorFreteDescricao && <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{ordem.valorFreteDescricao}</div>}
                  </div>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>R$ {fmt(Number(ordem.valorFreteAquisicao))}</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 10 }}>Frete não informado — clique em ✏️ Editar</div>
              )}
              <div style={{ borderTop: '1px solid #FDE68A', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 800, color: '#92400E', fontSize: '0.82rem' }}>TOTAL AQUISIÇÃO</span>
                <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#0F172A' }}>R$ {fmt(aquisicao)}</span>
              </div>
            </>
          )}
        </div>

        {/* Custo por Gate */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 700, color: '#374151', fontSize: '0.82rem', marginBottom: 14 }}>📊 Custo por Gate</div>
          {Object.keys(porGate).length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>Nenhum custo lançado ainda</div>
          ) : (
            Object.entries(porGate).map(([gate, val]) => (
              <div key={gate} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>
                    {OPERACAO_LABELS[gate] || gate}
                  </div>
                  <div style={{ height: 4, background: '#F3F4F6', borderRadius: 3, marginTop: 4, width: 120 }}>
                    <div style={{ height: 4, width: `${Math.min((val / Math.max(...Object.values(porGate))) * 100, 100)}%`, background: 'linear-gradient(90deg,#FFD600,#E5B800)', borderRadius: 3 }} />
                  </div>
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>R$ {fmt(val)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tabela de lançamentos */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.88rem' }}>📋 Todos os Lançamentos</div>
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '0.78rem', background: '#F9FAFB', color: '#374151', cursor: 'pointer' }}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(TIPO_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>

        {custosFiltrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
            Nenhum lançamento encontrado
            <div style={{ marginTop: 12 }}>
              <button onClick={() => setShowModal(true)} style={{ padding: '8px 20px', borderRadius: 10, border: '1.5px solid #FFD600', background: '#FFFDE7', color: '#B89B00', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                + Lançar primeiro custo
              </button>
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['Tipo', 'Ofício', 'Prestador', 'Descrição', 'Gate', 'Vencimento', 'Valor', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {custosFiltrados.map((c, i) => {
                const cfg = TIPO_CONFIG[c.tipo] || TIPO_CONFIG.OUTRO;
                return (
                  <tr key={c.id} style={{ borderTop: '1px solid #F3F4F6', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#374151', fontWeight: 600 }}>
                      {c.oficio || '—'}
                    </td>
                    {/* ─── Coluna Prestador ─── */}
                    <td style={{ padding: '10px 16px', minWidth: 160 }}>
                      {c.prestadorNome ? (
                        <div style={{
                          display: 'inline-flex', flexDirection: 'column', gap: 3,
                          background: c.tipoPrestador === 'PJ' ? '#F5F3FF' : '#F0FDF4',
                          border: `1px solid ${c.tipoPrestador === 'PJ' ? '#DDD6FE' : '#BBF7D0'}`,
                          borderLeft: `3px solid ${c.tipoPrestador === 'PJ' ? '#7C3AED' : '#059669'}`,
                          borderRadius: 8, padding: '5px 10px', maxWidth: 175,
                        }}>
                          {/* Nome + tipo */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.04em',
                              color: c.tipoPrestador === 'PJ' ? '#5B21B6' : '#059669' }}>
                              {c.tipoPrestador === 'PJ' ? 'PJ' : 'PF'}
                            </span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                              {c.prestadorNome}
                            </span>
                          </div>
                          {/* Documento */}
                          {(c.prestadorCpf || c.prestadorCnpj) && (
                            <span style={{ fontSize: '0.63rem', color: '#6B7280',
                              fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.02em' }}>
                              {c.prestadorCpf ? `CPF ${c.prestadorCpf}` : `CNPJ ${c.prestadorCnpj}`}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#D1D5DB' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#374151', maxWidth: 240 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.descricao}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.72rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {c.operacao ? (OPERACAO_LABELS[c.operacao] || c.operacao).split('·')[0].trim() : 'Geral'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {fmtDate(c.dataVencimento)}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.88rem', color: '#0F172A', whiteSpace: 'nowrap' }}>
                      R$ {fmt(Number(c.valor))}
                    </td>
                    <td style={{ padding: '12px 8px', width: 48 }}>
                      <button
                        onClick={() => handleDeletarCusto(c.id)}
                        disabled={deletingCusto === c.id}
                        title="Remover lançamento"
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: '0.72rem', fontWeight: 700, cursor: deletingCusto === c.id ? 'wait' : 'pointer', opacity: deletingCusto === c.id ? 0.6 : 1 }}>
                        {deletingCusto === c.id ? '⏳' : '✕'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'linear-gradient(135deg,#FFFDE7,#FFF9C4)', borderTop: '2px solid #FFD600' }}>
                <td colSpan={7} style={{ padding: '14px 16px', fontWeight: 800, color: '#92400E', fontSize: '0.82rem' }}>
                  TOTAL ({custosFiltrados.length} lançamentos)
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#0F172A', whiteSpace: 'nowrap' }}>
                  R$ {fmt(custosFiltrados.reduce((s, c) => s + Number(c.valor), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Fotos Contínuas da OF */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: '#374151', fontSize: '0.88rem' }}>📸 Fotos da Fabricação</div>
          <button onClick={() => fotoRef.current?.click()} disabled={uploadingFoto}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #FFD600', background: '#FFFDE7', color: '#B89B00', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
            {uploadingFoto ? '⏳ Enviando...' : '+ Adicionar Foto'}
          </button>
          <input ref={fotoRef} type="file" accept="image/*" multiple hidden onChange={e => handleFotoOf(e.target.files)} />
        </div>
        {fotosOf.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF', fontSize: '0.82rem' }}>Nenhuma foto adicionada ainda</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {fotosOf.map((url, i) => (
              <div key={url} onClick={() => setLightbox(url)}
                style={{ width: 90, height: 68, borderRadius: 10, overflow: 'hidden', cursor: 'zoom-in', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', position: 'relative' }}>
                <img src={url} alt={`foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="90" height="68"><rect fill="%23F3F4F6" width="90" height="68"/><text x="45" y="38" font-size="20" text-anchor="middle">📷</text></svg>'; }} />
                <div style={{ position: 'absolute', bottom: 2, right: 4, fontSize: '0.55rem', color: '#FFF', fontWeight: 700, background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '1px 4px' }}>{i + 1}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={lightbox} alt="foto" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12 }} />
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ModalLancarCustoServico
          ordemId={params.id}
          onClose={() => setShowModal(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
