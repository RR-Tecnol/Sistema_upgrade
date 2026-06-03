'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { fabricacaoApi, ApontamentoDiario, OperacaoProducao, FuncionarioProducao, BomItem, InsumoFabricacao, OPERACAO_LABELS } from '@/lib/api/fabricacao';
import MaterialSelectorPremium from '@/components/fabricacao/MaterialSelectorPremium';

interface MaterialItem { insumoId: string; quantidade: number }

const EMPTY_FORM = {
  operacaoId: '',
  funcionarioId: '',
  data: new Date().toISOString().split('T')[0],
  horasTrabalhadas: 8,
  percentualAvanco: 0,
  descricaoAtividade: '',
  observacoes: '',
};

export default function ApontamentosPage({ params }: { params: { id: string } }) {
  const [apontamentos, setApontamentos] = useState<ApontamentoDiario[]>([]);
  const [operacoes, setOperacoes]       = useState<OperacaoProducao[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioProducao[]>([]);
  const [bomItems, setBomItems]         = useState<BomItem[]>([]);
  const [insumos, setInsumos]           = useState<InsumoFabricacao[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [materiais, setMateriais]       = useState<MaterialItem[]>([]);
  const [showMateriais, setShowMateriais] = useState(false);
  const [erro, setErro]                 = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aps, ordem, funcs, bom, ins] = await Promise.all([
        fabricacaoApi.apontamentos.list(params.id),
        fabricacaoApi.ordens.get(params.id),
        fabricacaoApi.funcionarios.list(params.id),
        fabricacaoApi.bom.list(params.id),
        fabricacaoApi.insumos.list(),
      ]);
      setApontamentos(aps);
      setOperacoes(ordem.operacoes || []);
      setFuncionarios(funcs);
      setBomItems(bom);
      setInsumos(ins);
    } catch { setApontamentos([]); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    setErro('');
    if (!form.operacaoId)               return setErro('Selecione a operação');
    if (!form.funcionarioId)            return setErro('Selecione o funcionário');
    if (!form.descricaoAtividade.trim()) return setErro('Descreva a atividade realizada');
    if (form.horasTrabalhadas <= 0)     return setErro('Informe as horas trabalhadas');

    const matsValidos = materiais
      .filter(m => m.insumoId && m.quantidade > 0)
      .map(m => {
        const insumo = [...insumosBom, ...insumosExtras].find(i => i.id === m.insumoId);
        // Para itens do estoque central: id === stockItemId (mesmo UUID)
        if (insumo?._source === 'estoque') {
          return { stockItemId: insumo._stockItemId ?? m.insumoId, quantidade: m.quantidade };
        }
        return { insumoId: m.insumoId, quantidade: m.quantidade };
      });

    setSaving(true);
    try {
      await fabricacaoApi.apontamentos.registrar(params.id, {
        operacaoId: form.operacaoId,
        funcionarioId: form.funcionarioId,
        data: form.data,
        horasTrabalhadas: form.horasTrabalhadas,
        percentualAvanco: form.percentualAvanco,
        descricaoAtividade: form.descricaoAtividade,
        observacoes: form.observacoes || undefined,
        materiaisConsumidos: matsValidos.length > 0 ? matsValidos : undefined,
      });
      setForm(EMPTY_FORM);
      setMateriais([]);
      setShowMateriais(false);
      setShowForm(false);
      await load();
    } catch (e: any) {
      setErro(e?.response?.data?.message || 'Erro ao registrar apontamento');
    } finally {
      setSaving(false);
    }
  };

  const addMaterial    = () => setMateriais(m => [...m, { insumoId: '', quantidade: 1 }]);
  const removeMaterial = (i: number) => setMateriais(m => m.filter((_, idx) => idx !== i));
  const updateMaterial = (i: number, field: keyof MaterialItem, val: string | number) =>
    setMateriais(m => m.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  // Enriquece itens do BOM com dados completos do estoque (quantidadeAtual, precoUnitario, etc.)
  const insumosBom = bomItems
    .map(b => {
      const full = insumos.find(i => i.id === b.insumo?.id);
      return full ?? b.insumo;           // usa dados completos se disponível
    })
    .filter(Boolean) as InsumoFabricacao[];
  const insumosBomIds = new Set(insumosBom.map(i => i.id));
  const insumosExtras = insumos.filter(i => !insumosBomIds.has(i.id));

  const totalHoras    = apontamentos.reduce((a, ap) => a + Number(ap.horasTrabalhadas), 0);
  const operadoresSet = new Set(apontamentos.map(a => a.funcionarioId || a.operador?.id));
  const hoje          = apontamentos.filter(a => new Date(a.data).toDateString() === new Date().toDateString()).length;

  const inputHelper = (label: string, node: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {node}
    </div>
  );

  const selectStyle: React.CSSProperties = {
    padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB',
    background: '#F9FAFB', fontSize: '0.85rem', color: '#111827',
    outline: 'none', width: '100%', cursor: 'pointer',
  };
  const inputStyle: React.CSSProperties = { ...selectStyle, cursor: 'text' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
        .ap-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }
        @media (max-width: 640px) { .ap-form-grid { grid-template-columns: 1fr; gap: 12px; } }
      `}</style>

      <AdminHeaderHero
        title="APONTAMENTOS"
        subtitle="Registro de horas trabalhadas e materiais consumidos"
        rightSlot={
          <button onClick={() => setShowForm(v => !v)} style={{
            padding: '10px 20px', borderRadius: 10,
            background: showForm ? '#F3F4F6' : 'linear-gradient(135deg,#FFD600,#E5B800)',
            color: showForm ? '#6B7280' : '#0F172A',
            fontWeight: 800, fontSize: '0.82rem',
            fontFamily: 'Orbitron, sans-serif', border: 'none', cursor: 'pointer',
            boxShadow: showForm ? 'none' : '0 4px 14px rgba(255,214,0,0.4)',
          }}>
            {showForm ? '✕ Cancelar' : '+ Registrar Apontamento'}
          </button>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem' }}>
        <AnimatedKpiCard label="Total de Horas" value={0} displayValue={`${totalHoras.toFixed(1)}h`} sub="acumuladas"        color="#0891B2" bg="#F0F9FF" border="#BAE6FD" icon={<span>⏱️</span>} />
        <AnimatedKpiCard label="Apontamentos"   value={apontamentos.length}  sub="registros"           color="#059669" bg="#F0FDF4" border="#BBF7D0" icon={<span>✍️</span>}  delayMs={60} />
        <AnimatedKpiCard label="Operadores"     value={operadoresSet.size}   sub="funcionários ativos" color="#7C3AED" bg="#F5F3FF" border="#DDD6FE" icon={<span>👷</span>}  delayMs={120} />
        <AnimatedKpiCard label="Hoje"           value={hoje}                 sub="apontamentos hoje"   color="#D97706" bg="#FFFBEB" border="#FDE68A" icon={<span>📅</span>}  delayMs={180} />
        <AnimatedKpiCard label="Itens BOM"      value={bomItems.length}      sub="materiais da OF"     color="#B89B00" bg="#FFFDE7" border="#FEF08A" icon={<span>📦</span>}  delayMs={240} />
      </div>

      {/* Formulário */}
      {showForm && (
        <div style={{ background: '#FFFFFF', border: '1.5px solid #FFD600', borderRadius: 16, padding: 28, boxShadow: '0 4px 20px rgba(255,214,0,0.15)', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#B89B00', fontSize: '0.82rem', letterSpacing: '0.1em', marginBottom: 24 }}>
            ✏️ NOVO APONTAMENTO
          </div>

          {/* Operação + Funcionário */}
          <div className="ap-form-grid">
            {inputHelper('Operação *',
              <select value={form.operacaoId} onChange={e => setForm(f => ({ ...f, operacaoId: e.target.value }))} style={selectStyle}>
                <option value="">— Selecione a operação —</option>
                {operacoes.map(op => (
                  <option key={op.id} value={op.id}>
                    {OPERACAO_LABELS[op.operacao] || op.operacao} [{op.status}]
                  </option>
                ))}
              </select>
            )}
            {inputHelper('Funcionário *',
              <select value={form.funcionarioId} onChange={e => setForm(f => ({ ...f, funcionarioId: e.target.value }))} style={selectStyle}>
                <option value="">— Selecione o funcionário —</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>{f.nome} — {f.funcao}</option>
                ))}
              </select>
            )}
          </div>

          {/* Data + Horas */}
          <div className="ap-form-grid">
            {inputHelper('Data *',
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={inputStyle} />
            )}
            {inputHelper('Horas Trabalhadas *',
              <input type="number" min={0.5} max={16} step={0.5} value={form.horasTrabalhadas}
                onChange={e => setForm(f => ({ ...f, horasTrabalhadas: parseFloat(e.target.value) }))} style={inputStyle} />
            )}
          </div>

          {/* Slider % avanço */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>% Avanço na Operação</label>
              <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.88rem', color: '#059669' }}>{form.percentualAvanco}%</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={form.percentualAvanco}
              onChange={e => setForm(f => ({ ...f, percentualAvanco: parseInt(e.target.value) }))}
              style={{ width: '100%', accentColor: '#059669', height: 6, cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#D1D5DB', marginTop: 4 }}>
              <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>
          </div>

          {/* Descrição + Observações */}
          {inputHelper('Descrição da Atividade Realizada *',
            <textarea rows={3} value={form.descricaoAtividade}
              onChange={e => setForm(f => ({ ...f, descricaoAtividade: e.target.value }))}
              placeholder="Ex: Realizamos a desmontagem do sistema elétrico existente, identificando 3 pontos de corrosão..."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }} />
          )}
          <div style={{ marginTop: 18 }}>
            {inputHelper('Observações (opcional)',
              <textarea rows={2} value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Pendências, intercorrências, materiais adicionais necessários..."
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }} />
            )}
          </div>

          {/* ── Materiais Consumidos — PREMIUM ──── */}
          <MaterialSelectorPremium
            materiais={materiais}
            insumosBom={insumosBom}
            insumosExtras={insumosExtras}
            onChange={setMateriais}
          />

          {erro && (
            <div style={{ marginTop: 16, padding: '10px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#DC2626', fontSize: '0.82rem', fontWeight: 600 }}>
              ⚠️ {erro}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button
              onClick={() => { setShowForm(false); setErro(''); setForm(EMPTY_FORM); setMateriais([]); setShowMateriais(false); }}
              style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit} disabled={saving}
              style={{ padding: '10px 24px', borderRadius: 10, background: saving ? '#E5E7EB' : 'linear-gradient(135deg,#FFD600,#E5B800)', color: saving ? '#9CA3AF' : '#0F172A', fontWeight: 800, fontSize: '0.82rem', fontFamily: 'Orbitron, sans-serif', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 14px rgba(255,214,0,0.3)' }}
            >
              {saving ? '⏳ Salvando...' : '✔ Registrar Apontamento'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de Apontamentos */}
      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #FFD600', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto' }} />
        </div>
      ) : apontamentos.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: '56px 24px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✍️</div>
          <div style={{ fontWeight: 700, color: '#111827', marginBottom: 6 }}>Nenhum apontamento registrado</div>
          <div style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: 20 }}>Clique em "+ Registrar Apontamento" ou use o QR Code da OF no celular</div>
          <button onClick={() => setShowForm(true)} style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#FFD600,#E5B800)', color: '#0F172A', fontWeight: 800, fontSize: '0.82rem', fontFamily: 'Orbitron, sans-serif', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(255,214,0,0.3)' }}>
            + Registrar Primeiro Apontamento
          </button>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 560 }}>
          <div style={{ padding: '14px 20px', borderBottom: '2px solid #F3F4F6', background: '#F9FAFB', display: 'grid', gridTemplateColumns: '110px 1fr 1fr 70px 80px 90px', gap: 0 }}>
            {['Data', 'Funcionário', 'Operação', 'Horas', 'Avanço', 'Atividade'].map(h => (
              <div key={h} style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
            ))}
          </div>
          {apontamentos.map((ap, i) => (
            <div key={ap.id}
              style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 70px 80px 90px', gap: 0, padding: '14px 20px', borderBottom: i < apontamentos.length - 1 ? '1px solid #F9FAFB' : 'none', alignItems: 'center', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FAFAFA'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              <div style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>
                {new Date(ap.data).toLocaleDateString('pt-BR')}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{ap.funcionario?.nome || ap.operador?.name || '—'}</div>
                <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{ap.funcionario?.funcao || ap.operador?.role || ''}</div>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500 }}>
                {ap.operacao ? (OPERACAO_LABELS[ap.operacao.operacao] || ap.operacao.operacao) : '—'}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0891B2', fontFamily: 'Orbitron, sans-serif' }}>
                {Number(ap.horasTrabalhadas).toFixed(1)}h
              </div>
              <div>
                <span style={{ background: '#F0FDF4', color: '#059669', border: '1px solid #BBF7D0', borderRadius: 20, padding: '2px 10px', fontSize: '0.68rem', fontWeight: 800, fontFamily: 'Orbitron, sans-serif' }}>
                  {ap.percentualAvanco}%
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ap.descricaoAtividade}>
                {ap.descricaoAtividade}
              </div>
            </div>
          ))}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
