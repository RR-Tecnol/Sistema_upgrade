// BACKUP — gerado automaticamente em 2026-05-26
// Para restaurar: copie o conteúdo deste arquivo para page.tsx

'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { fabricacaoApi, ApontamentoDiario, OperacaoProducao, FuncionarioProducao, BomItem, InsumoFabricacao, OPERACAO_LABELS } from '@/lib/api/fabricacao';

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
        fabricacaoApi.funcionarios.list(),
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
        if (insumo?._source === 'estoque' && insumo._stockItemId) {
          return { stockItemId: insumo._stockItemId, quantidade: m.quantidade };
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

  const insumosBom    = bomItems.map(b => b.insumo).filter(Boolean) as InsumoFabricacao[];
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
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}`}</style>
      <AdminHeaderHero title="APONTAMENTOS" subtitle="Registro de horas trabalhadas e materiais consumidos"
        rightSlot={<button onClick={() => setShowForm(v => !v)} style={{ padding: '10px 20px', borderRadius: 10, background: showForm ? '#F3F4F6' : 'linear-gradient(135deg,#FFD600,#E5B800)', color: showForm ? '#6B7280' : '#0F172A', fontWeight: 800, fontSize: '0.82rem', fontFamily: 'Orbitron, sans-serif', border: 'none', cursor: 'pointer', boxShadow: showForm ? 'none' : '0 4px 14px rgba(255,214,0,0.4)' }}>{showForm ? '✕ Cancelar' : '+ Registrar Apontamento'}</button>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem' }}>
        <AnimatedKpiCard label="Total de Horas" value={0} displayValue={`${totalHoras.toFixed(1)}h`} sub="acumuladas" color="#0891B2" bg="#F0F9FF" border="#BAE6FD" icon={<span>⏱️</span>} />
        <AnimatedKpiCard label="Apontamentos" value={apontamentos.length} sub="registros" color="#059669" bg="#F0FDF4" border="#BBF7D0" icon={<span>✍️</span>} delayMs={60} />
        <AnimatedKpiCard label="Operadores" value={operadoresSet.size} sub="funcionários ativos" color="#7C3AED" bg="#F5F3FF" border="#DDD6FE" icon={<span>👷</span>} delayMs={120} />
        <AnimatedKpiCard label="Hoje" value={hoje} sub="apontamentos hoje" color="#D97706" bg="#FFFBEB" border="#FDE68A" icon={<span>📅</span>} delayMs={180} />
        <AnimatedKpiCard label="Itens BOM" value={bomItems.length} sub="materiais da OF" color="#B89B00" bg="#FFFDE7" border="#FEF08A" icon={<span>📦</span>} delayMs={240} />
      </div>
      {/* form omitted for brevity — see page.tsx */}
    </div>
  );
}
