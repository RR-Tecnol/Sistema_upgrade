'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { fabricacaoApi } from '@/lib/api/fabricacao';
import { toast } from '@/components/ui/Toast';

const STEPS = ['Dados Básicos', 'Produção & Orçamento', 'Custo de Aquisição', 'Confirmar'];

const fieldStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.88rem',
  color: '#111827', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' as const,
};
const labelStyle = {
  fontSize: '0.72rem', fontWeight: 700, color: '#374151', display: 'block' as const,
  marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em',
};
const sectionTitle = (title: string, emoji: string) => (
  <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#B89B00', fontSize: '0.9rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
    <span>{emoji}</span> {title}
  </div>
);

export default function NovaOrdemPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    // Dados básicos
    descricaoBau: '', configuracao: 'STANDARD', tipoContratacao: 'MAO_DE_OBRA',
    bomTemplateId: '', dataEntradaGalpao: '', observacoes: '',
    // Produção & orçamento
    dataInicioBaseline: '', dataConclusaoBaseline: '',
    orcamentoTotal: '', alertaCustoPercent: '110',
    // Custo de aquisição (opcionais)
    cursoEspecifico: '',
    valorBauComprado: '', valorBauDescricao: '',
    valorFreteAquisicao: '', valorFreteDescricao: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ── Máscara BRL: R$ 1.234,56 ──────────────────────────────────────────────
  // Converte o valor bruto do campo (pode ter máscara) em número puro
  const parseBrl = (v: string): number => {
    const digits = v.replace(/\D/g, ''); // remove tudo que não é dígito
    return digits ? Number(digits) / 100 : 0;
  };
  // Formata número em R$ 1.234,56
  const formatBrl = (raw: string): string => {
    const n = parseBrl(raw);
    if (!n && raw === '') return '';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  // Handler para campos de moeda: impede negativos e aplica máscara
  const setBrl = (key: string, input: string) => {
    // Remove tudo que não é dígito (não deixa digitar '-')
    const digits = input.replace(/\D/g, '');
    // Reconstrói o valor em centavos formatado
    const cents = digits ? Number(digits) : 0;
    const formatted = cents
      ? (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '';
    set(key, formatted);
  };

  const canNext = () => {
    if (step === 0) return form.descricaoBau && form.dataEntradaGalpao;
    if (step === 1) return form.dataInicioBaseline && form.dataConclusaoBaseline && form.orcamentoTotal;
    return true; // steps 2 e 3 são sempre avançáveis
  };

  // Converte o campo BRL formatado para número real ao enviar
  const brlToNumber = (v: string) => parseBrl(v);

  const totalAquisicao = (brlToNumber(form.valorBauComprado) || 0) + (brlToNumber(form.valorFreteAquisicao) || 0);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const ordem = await fabricacaoApi.ordens.create({
        descricaoBau: form.descricaoBau,
        configuracao: form.configuracao,
        tipoContratacao: form.tipoContratacao,
        bomTemplateId: form.bomTemplateId || undefined,
        dataEntradaGalpao: form.dataEntradaGalpao,
        dataInicioBaseline: form.dataInicioBaseline,
        dataConclusaoBaseline: form.dataConclusaoBaseline,
        orcamentoTotal: brlToNumber(form.orcamentoTotal),
        alertaCustoPercent: Number(form.alertaCustoPercent),
        observacoes: form.observacoes || undefined,
        // Custo de aquisição (opcionais)
        cursoEspecifico: form.cursoEspecifico || undefined,
        valorBauComprado: form.valorBauComprado ? brlToNumber(form.valorBauComprado) : undefined,
        valorBauDescricao: form.valorBauDescricao || undefined,
        valorFreteAquisicao: form.valorFreteAquisicao ? brlToNumber(form.valorFreteAquisicao) : undefined,
        valorFreteDescricao: form.valorFreteDescricao || undefined,
      });
      toast.success(`Ordem ${ordem.codigo} criada!`);
      router.push(`/admin/fabricacao/${ordem.id}`);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Erro ao criar ordem'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">
      <AdminHeaderHero title="NOVA ORDEM DE FABRICAÇÃO" subtitle="Wizard de criação · 4 passos" />

      {/* Stepper */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', border: `2px solid ${i <= step ? '#FFD600' : '#E5E7EB'}`, background: i < step ? '#FFD600' : i === step ? '#FFFDE7' : '#F9FAFB', color: i < step ? '#0F172A' : i === step ? '#B89B00' : '#D1D5DB' }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '0.60rem', fontWeight: 700, color: i === step ? '#B89B00' : '#9CA3AF', whiteSpace: 'nowrap', textAlign: 'center' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? '#FFD600' : '#E5E7EB', margin: '0 8px', marginBottom: 22 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Form Card */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 16, padding: '32px', maxWidth: 720, margin: '0 auto', width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

        {/* ── PASSO 1: Dados Básicos ── */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionTitle('DADOS BÁSICOS', '🏭')}
            <div>
              <label style={labelStyle}>Descrição do Baú *</label>
              <input value={form.descricaoBau} onChange={e => set('descricaoBau', e.target.value)} placeholder="Ex: Baú padrão Qualifica 2026 — 12m" style={fieldStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Tipo de Configuração</label>
                <select value={form.configuracao} onChange={e => set('configuracao', e.target.value)} style={fieldStyle}>
                  <option value="STANDARD">Standard (Sala Única)</option>
                  <option value="MULTICOURSE">Multicurso (2 Salas)</option>
                  <option value="BAU">Truck</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Data de Entrada no Galpão *</label>
                <input type="date" value={form.dataEntradaGalpao} onChange={e => set('dataEntradaGalpao', e.target.value)} style={fieldStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Observações</label>
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={3} placeholder="Detalhes adicionais..." style={{ ...fieldStyle, resize: 'vertical' }} />
            </div>
          </div>
        )}

        {/* ── PASSO 2: Produção & Orçamento ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionTitle('PRODUÇÃO & ORÇAMENTO', '📅')}
            <div>
              <label style={labelStyle}>Tipo de Contratação</label>
              <select value={form.tipoContratacao} onChange={e => set('tipoContratacao', e.target.value)} style={fieldStyle}>
                <option value="MAO_DE_OBRA">Mão de Obra</option>
                <option value="PORTEIRA_FECHADA">Porteira Fechada</option>
                <option value="MISTO">Misto</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Data Início (Baseline) *</label>
                <input type="date" value={form.dataInicioBaseline} onChange={e => set('dataInicioBaseline', e.target.value)} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Data Conclusão (Baseline) *</label>
                <input type="date" value={form.dataConclusaoBaseline} onChange={e => set('dataConclusaoBaseline', e.target.value)} style={fieldStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Orçamento Total (R$) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.orcamentoTotal}
                  onChange={e => setBrl('orcamentoTotal', e.target.value)}
                  placeholder="R$ 0,00"
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Alerta de Custo (%)</label>
                <input type="number" value={form.alertaCustoPercent} onChange={e => set('alertaCustoPercent', e.target.value)} placeholder="110" style={fieldStyle} />
              </div>
            </div>
          </div>
        )}

        {/* ── PASSO 3: Custo de Aquisição da Carreta ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {sectionTitle('CUSTO DE AQUISIÇÃO DA CARRETA', '🚛')}

            {/* Info */}
            <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, padding: '14px 18px', fontSize: '0.82rem', color: '#0891B2', lineHeight: 1.6 }}>
              Todos os campos abaixo são <strong>opcionais</strong> e podem ser preenchidos agora ou depois. O baú pode ficar pronto antes do curso ser definido.
            </div>

            {/* Baú */}
            <div style={{ background: '#FAFAFA', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px' }}>
              <div style={{ fontWeight: 700, color: '#374151', fontSize: '0.85rem', marginBottom: 14 }}>🏗️ Compra do Baú / Carreta</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Valor do Baú (R$)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.valorBauComprado}
                    onChange={e => setBrl('valorBauComprado', e.target.value)}
                    placeholder="R$ 0,00"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Nota Fiscal / Fornecedor</label>
                  <input value={form.valorBauDescricao} onChange={e => set('valorBauDescricao', e.target.value)} placeholder="NF 1234 - Fornecedor X" style={fieldStyle} />
                </div>
              </div>
            </div>

            {/* Frete */}
            <div style={{ background: '#FAFAFA', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px' }}>
              <div style={{ fontWeight: 700, color: '#374151', fontSize: '0.85rem', marginBottom: 14 }}>🚚 Frete até o Destino</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Valor do Frete (R$)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.valorFreteAquisicao}
                    onChange={e => setBrl('valorFreteAquisicao', e.target.value)}
                    placeholder="R$ 0,00"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Transportadora / Trajeto</label>
                  <input value={form.valorFreteDescricao} onChange={e => set('valorFreteDescricao', e.target.value)} placeholder="Transportadora Rápida — SP → Teresina" style={fieldStyle} />
                </div>
              </div>
            </div>

            {/* Total aquisição */}
            {totalAquisicao > 0 && (
              <div style={{ background: 'linear-gradient(135deg,#FFFDE7,#FFF9C4)', border: '1px solid #FFD600', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#92400E', fontSize: '0.85rem' }}>💰 Custo Base de Aquisição</span>
                <span style={{ fontWeight: 900, color: '#0F172A', fontSize: '1.1rem', fontFamily: 'Orbitron, sans-serif' }}>
                  R$ {totalAquisicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Curso */}
            <div>
              <label style={labelStyle}>Curso Específico <span style={{ fontWeight: 400, color: '#9CA3AF', textTransform: 'none' }}>(Opcional — pode ser definido depois)</span></label>
              <input value={form.cursoEspecifico} onChange={e => set('cursoEspecifico', e.target.value)} placeholder="Ex: Mecânica de Motos" style={fieldStyle} />
            </div>
          </div>
        )}

        {/* ── PASSO 4: Confirmar ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {sectionTitle('CONFIRMAR CRIAÇÃO', '✅')}
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px' }}>
              {[
                ['Descrição', form.descricaoBau],
                ['Configuração', form.configuracao],
                ['Tipo Contratação', form.tipoContratacao],
                ['Entrada Galpão', form.dataEntradaGalpao],
                ['Baseline', `${form.dataInicioBaseline} → ${form.dataConclusaoBaseline}`],
                ['Orçamento', form.orcamentoTotal ? `R$ ${form.orcamentoTotal}` : 'R$ —'],
                ['Alerta Custo', `${form.alertaCustoPercent}%`],
                ...(form.valorBauComprado ? [['Baú (compra)', `R$ ${form.valorBauComprado}`]] : []),
                ...(form.valorFreteAquisicao ? [['Frete Destino', `R$ ${form.valorFreteAquisicao}`]] : []),
                ...(totalAquisicao > 0 ? [['CUSTO AQUISIÇÃO', `R$ ${totalAquisicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]] : []),
                ...(form.cursoEspecifico ? [['Curso', form.cursoEspecifico]] : [['Curso', 'A definir']]),
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>{k}</span>
                  <span style={{ fontSize: '0.82rem', color: k === 'CUSTO AQUISIÇÃO' ? '#B89B00' : '#111827', fontWeight: k === 'CUSTO AQUISIÇÃO' ? 900 : 700, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, padding: '14px 18px', fontSize: '0.82rem', color: '#0891B2', lineHeight: 1.6 }}>
              ℹ️ As <strong>7 operações do roteiro</strong> serão criadas automaticamente com datas CPM calculadas a partir do baseline.
            </div>
          </div>
        )}

        {/* Botões */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid #F3F4F6' }}>
          <button onClick={() => step > 0 ? setStep(s => s - 1) : router.back()} style={{ padding: '11px 24px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
            {step === 0 ? 'Cancelar' : '← Voltar'}
          </button>
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} style={{ padding: '11px 28px', borderRadius: 10, background: canNext() ? 'linear-gradient(135deg,#FFD600,#E5B800)' : '#E5E7EB', color: canNext() ? '#0F172A' : '#9CA3AF', fontWeight: 800, fontSize: '0.85rem', cursor: canNext() ? 'pointer' : 'not-allowed', border: 'none', fontFamily: 'Orbitron, sans-serif' }}>
              Próximo →
            </button>
          ) : (
            <button onClick={handleCreate} disabled={saving} style={{ padding: '11px 28px', borderRadius: 10, background: !saving ? 'linear-gradient(135deg,#FFD600,#E5B800)' : '#E5E7EB', color: !saving ? '#0F172A' : '#9CA3AF', fontWeight: 800, fontSize: '0.85rem', cursor: !saving ? 'pointer' : 'not-allowed', border: 'none', fontFamily: 'Orbitron, sans-serif' }}>
              {saving ? '⏳ Criando...' : '🏭 CRIAR ORDEM'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
