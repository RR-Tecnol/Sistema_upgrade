'use client';

import { useState, useEffect } from 'react';
import { fabricacaoApi, OperacaoProducao } from '@/lib/api/fabricacao';
import { toast } from '@/components/ui/Toast';

const YELLOW = '#FFD600'; const GREEN = '#00FF8A'; const CYAN = '#00F5FF';

export default function ApontamentoMobilePage({ params }: { params: { codigo: string } }) {
  const codigo = params.codigo;
  const [ordemId, setOrdemId] = useState<string>('');
  const [operacoes, setOperacoes] = useState<OperacaoProducao[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const [form, setForm] = useState({
    operacaoId: '',
    funcionarioId: '',
    data: new Date().toISOString().split('T')[0],
    horasTrabalhadas: 4,
    percentualAvanco: 10,
    descricaoAtividade: '',
  });

  useEffect(() => {
    // Busca a ordem pelo código e carrega dados
    fabricacaoApi.ordens.list({ limit: 100 }).then(res => {
      const ordem = res.data.find(o => o.codigo === codigo);
      if (!ordem) { setLoading(false); return; }
      setOrdemId(ordem.id);
      return Promise.all([
        fabricacaoApi.ordens.getOperacoes(ordem.id),
        fabricacaoApi.funcionarios.list(),
      ]).then(([ops, funcs]) => {
        const disponiveis = ops.filter(op => ['LIBERADA', 'EM_ANDAMENTO', 'GATE_PENDENTE'].includes(op.status));
        setOperacoes(disponiveis);
        setFuncionarios(funcs);
        if (disponiveis.length > 0) setForm(f => ({ ...f, operacaoId: disponiveis[0].id }));
        if (funcs.length > 0) setForm(f => ({ ...f, funcionarioId: funcs[0].id }));
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [codigo]);

  const handleEnviar = async () => {
    if (!form.descricaoAtividade || !form.operacaoId || !form.funcionarioId) { toast.error('Preencha todos os campos obrigatórios'); return; }
    setSaving(true);
    try {
      await fabricacaoApi.apontamentos.registrar(ordemId, { ...form });
      setEnviado(true);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Erro ao registrar apontamento'); } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ background: '#050508', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 48, height: 48, border: `3px solid ${YELLOW}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (enviado) return (
    <div style={{ background: '#050508', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: 20 }}>✅</div>
      <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: GREEN, fontSize: '1.2rem', marginBottom: 12, letterSpacing: '0.1em' }}>APONTAMENTO REGISTRADO!</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', marginBottom: 32 }}>Seu progresso foi salvo com sucesso.</div>
      <button onClick={() => setEnviado(false)} style={{ padding: '16px 32px', borderRadius: 14, background: `linear-gradient(135deg, ${YELLOW}, #E5B800)`, color: '#0F172A', fontWeight: 900, fontSize: '1rem', border: 'none', cursor: 'pointer', fontFamily: 'Orbitron, sans-serif', minHeight: 56 }}>
        NOVO APONTAMENTO
      </button>
    </div>
  );

  if (!ordemId) return (
    <div style={{ background: '#050508', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>❌</div>
      <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#FF2D55', fontSize: '1rem', letterSpacing: '0.1em' }}>ORDEM NÃO ENCONTRADA</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', marginTop: 8 }}>{codigo}</div>
    </div>
  );

  const inputStyle = { width: '100%', background: '#0f0f1a', border: '1.5px solid rgba(255,214,0,0.2)', borderRadius: 14, padding: '16px 18px', color: '#fff', fontSize: '1rem', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' as const, minHeight: 56 };
  const labelStyle = { fontSize: '0.65rem', fontFamily: 'Orbitron, sans-serif', fontWeight: 800, color: 'rgba(255,214,0,0.7)', textTransform: 'uppercase' as const, letterSpacing: '0.12em', display: 'block', marginBottom: 8 };

  return (
    <div style={{ background: '#050508', minHeight: '100vh', padding: '24px 20px 48px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: YELLOW, fontSize: '1.1rem', letterSpacing: '0.1em', marginBottom: 4 }}>APONTAMENTO</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{codigo}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Data */}
        <div>
          <label style={labelStyle}>DATA</label>
          <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={inputStyle} />
        </div>

        {/* Operação */}
        <div>
          <label style={labelStyle}>OPERAÇÃO</label>
          <select value={form.operacaoId} onChange={e => setForm(f => ({ ...f, operacaoId: e.target.value }))} style={{ ...inputStyle, appearance: 'auto' }}>
            {operacoes.map(op => <option key={op.id} value={op.id}>{op.operacao.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        {/* Funcionário */}
        <div>
          <label style={labelStyle}>FUNCIONÁRIO</label>
          <select value={form.funcionarioId} onChange={e => setForm(f => ({ ...f, funcionarioId: e.target.value }))} style={{ ...inputStyle, appearance: 'auto' }}>
            {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome} — {f.funcao}</option>)}
          </select>
        </div>

        {/* Horas — slider */}
        <div>
          <label style={labelStyle}>HORAS TRABALHADAS: <span style={{ color: CYAN, fontFamily: 'Orbitron, sans-serif' }}>{form.horasTrabalhadas.toFixed(1)}h</span></label>
          <input type="range" min={0.5} max={12} step={0.5} value={form.horasTrabalhadas}
            onChange={e => setForm(f => ({ ...f, horasTrabalhadas: parseFloat(e.target.value) }))}
            style={{ width: '100%', accentColor: CYAN, height: 8, cursor: 'pointer' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}><span>0.5h</span><span>12h</span></div>
        </div>

        {/* Avanço % — slider */}
        <div>
          <label style={labelStyle}>AVANÇO DESTA OPERAÇÃO: <span style={{ color: GREEN, fontFamily: 'Orbitron, sans-serif' }}>{form.percentualAvanco}%</span></label>
          <input type="range" min={0} max={100} step={5} value={form.percentualAvanco}
            onChange={e => setForm(f => ({ ...f, percentualAvanco: parseInt(e.target.value) }))}
            style={{ width: '100%', accentColor: GREEN, height: 8, cursor: 'pointer' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}><span>0%</span><span>100%</span></div>
        </div>

        {/* Descrição */}
        <div>
          <label style={labelStyle}>O QUE FOI FEITO *</label>
          <textarea value={form.descricaoAtividade} onChange={e => setForm(f => ({ ...f, descricaoAtividade: e.target.value }))} rows={4} placeholder="Descreva as atividades realizadas hoje..." style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }} />
        </div>

        {/* Enviar */}
        <button onClick={handleEnviar} disabled={saving || !form.descricaoAtividade} style={{ width: '100%', minHeight: 60, borderRadius: 16, border: 'none', background: saving || !form.descricaoAtividade ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${YELLOW}, #E5B800)`, color: saving || !form.descricaoAtividade ? 'rgba(255,255,255,0.3)' : '#0F172A', fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.1em', cursor: saving || !form.descricaoAtividade ? 'not-allowed' : 'pointer', boxShadow: !saving && form.descricaoAtividade ? `0 6px 24px ${YELLOW}40` : 'none', transition: 'all 0.2s' }}>
          {saving ? '⏳ ENVIANDO...' : '✅ REGISTRAR APONTAMENTO'}
        </button>
      </div>
    </div>
  );
}
