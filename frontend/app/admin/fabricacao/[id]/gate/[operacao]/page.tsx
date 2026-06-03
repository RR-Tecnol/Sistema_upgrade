'use client';

import { useEffect, useState, useRef } from 'react';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { fabricacaoApi, OPERACAO_LABELS } from '@/lib/api/fabricacao';
import { toast } from '@/components/ui/Toast';
import api from '@/lib/api/client';

interface GateItem {
  item: string;
  label: string;
  obrigatorio: boolean;
  minFotos?: number;
  ok: boolean;
  obs?: string;
  fotosUrls?: string[];
}

// ── Especificações contextuais por gate ─────────────────────────────────────
const GATE_SPECS_CONFIG: Record<string, {
  title: string;
  fields: { key: string; label: string; type: 'select' | 'number' | 'text'; showIf?: (s: any) => boolean; options?: { value: string; label: string }[] }[];
  dynamicObrigatorio?: { condition: (s: any) => boolean; item: string }[];
}> = {
  OP010_VISTORIA_DESMANCHE: {
    title: 'Especificações de Vistoria / Desmanche',
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
    title: 'Especificações de Serralheria',
    fields: [
      { key: 'configEixos', label: 'Configuração de Eixos da Carreta', type: 'select', options: [
        { value: 'JA_2_EIXOS',      label: '✓ Já vem de fábrica com 2 eixos (nenhum ajuste necessário)' },
        { value: 'TRES_PARA_DOIS',  label: '⚙️ Converter de 3 eixos para 2 eixos (ajuste necessário)' },
      ]},
      { key: 'obsSerralheria', label: 'Observações Técnicas de Serralheria', type: 'text' },
    ],
    dynamicObrigatorio: [
      { condition: (s) => s.configEixos === 'TRES_PARA_DOIS', item: 'ajuste_2_eixos' },
    ],
  },
  OP030_INFRAESTRUTURA: {
    title: 'Especificações de Infraestrutura Elétrica',
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

export default function GatePage({ params }: { params: { id: string; operacao: string } }) {
  const [itens, setItens]       = useState<GateItem[]>([]);
  const [obs, setObs]           = useState('');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [approvedAt, setApprovedAt] = useState<string | null>(null);
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [gateSpecs, setGateSpecs] = useState<Record<string, string>>({});
  const [savingSpecs, setSavingSpecs] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const specConfig = GATE_SPECS_CONFIG[params.operacao] ?? null;

  useEffect(() => {
    // Carrega gate checklist + OF specs em paralelo
    Promise.all([
      fabricacaoApi.gates.get(params.id, params.operacao),
      fabricacaoApi.ordens.get(params.id).catch(() => null),
    ]).then(([g, ordem]: [any, any]) => {
      const template: GateItem[] = (g?.itens ?? []).map((i: any) => ({
        item:      i.item ?? i.label,
        label:     i.label,
        obrigatorio: i.obrigatorio ?? false,
        minFotos:  i.minFotos ?? undefined,
        ok:        i.ok ?? false,
        obs:       i.obs ?? '',
        fotosUrls: i.fotosUrls ?? [],
      }));

      const salvo: any[]     = g?.registroExistente?.itensChecklist ?? [];
      const savedObs: string = g?.registroExistente?.observacaoFinal ?? '';
      const jaAprovado: boolean       = g?.registroExistente?.aprovado ?? false;
      const emAprovadoEm: string|null = g?.registroExistente?.aprovadoEm ?? null;

      const merged = template.map(t => {
        const prev = salvo.find((s: any) => (s.item ?? s.label) === t.item);
        return prev ? { ...t, ok: prev.ok ?? t.ok, obs: prev.obs ?? t.obs, fotosUrls: prev.fotosUrls ?? t.fotosUrls } : t;
      });

      // Carrega specs desta gate a partir do campo observacoes da OF
      let loadedSpecs: Record<string, string> = {};
      try {
        const obsObj = JSON.parse(ordem?.observacoes || '{}');
        const allSpecs = obsObj.__specs ?? {};
        // Pega apenas as specs desta gate (key = operacao)
        loadedSpecs = allSpecs[params.operacao] ?? {};
        // Retrocompat: OP010 pode ter specs no nivel raiz
        if (params.operacao === 'OP010_VISTORIA_DESMANCHE' && !loadedSpecs.tipoIntervencaoChapas && allSpecs.tipoIntervencaoChapas) {
          loadedSpecs = { tipoIntervencaoChapas: allSpecs.tipoIntervencaoChapas, alturaDesejadaCm: allSpecs.alturaDesejadaCm ?? '', obsVistoria: allSpecs.observacoesTecnicas ?? '' };
        }
      } catch { /* observacoes is plain text */ }

      // Aplica obrigatoriedade dinâmica com base nas specs
      const cfg = GATE_SPECS_CONFIG[params.operacao];
      const mergedWithDynamic = merged.map(item => {
        if (!cfg?.dynamicObrigatorio) return item;
        const rule = cfg.dynamicObrigatorio.find(r => r.item === item.item);
        if (rule) return { ...item, obrigatorio: rule.condition(loadedSpecs) };
        return item;
      });

      setItens(mergedWithDynamic);
      setObs(savedObs);
      setIsApproved(jaAprovado);
      setApprovedAt(emAprovadoEm);
      setGateSpecs(loadedSpecs);
    })
    .catch(() => setItens([]))
    .finally(() => setLoading(false));
  }, [params.id, params.operacao]);

  // Aplica dinamicamente obrigatoriedade quando specs mudam
  const applyDynamicObrigatorio = (specs: Record<string, string>) => {
    const cfg = GATE_SPECS_CONFIG[params.operacao];
    if (!cfg?.dynamicObrigatorio) return;
    setItens(prev => prev.map(item => {
      const rule = cfg.dynamicObrigatorio!.find(r => r.item === item.item);
      if (rule) return { ...item, obrigatorio: rule.condition(specs) };
      return item;
    }));
  };

  const handleSpecChange = (key: string, value: string) => {
    const next = { ...gateSpecs, [key]: value };
    setGateSpecs(next);
    applyDynamicObrigatorio(next);
  };

  const handleSaveSpecs = async () => {
    setSavingSpecs(true);
    try {
      const ordem = await fabricacaoApi.ordens.get(params.id);
      let obsObj: any = {};
      try { obsObj = JSON.parse(ordem.observacoes || '{}'); } catch { obsObj = { _texto: ordem.observacoes }; }
      if (!obsObj.__specs) obsObj.__specs = {};
      obsObj.__specs[params.operacao] = gateSpecs;
      await fabricacaoApi.ordens.update(params.id, { observacoes: JSON.stringify(obsObj) });
      toast.success('Especificações salvas!');
    } catch { toast.error('Erro ao salvar especificações'); }
    finally { setSavingSpecs(false); }
  };

  const updateItem = (item: string, patch: Partial<GateItem>) =>
    setItens(prev => prev.map(i => i.item === item ? { ...i, ...patch } : i));

  const toggle = (item: string) => {
    const it = itens.find(i => i.item === item);
    if (!it) return;
    if (!it.ok && it.minFotos && (it.fotosUrls?.length ?? 0) < it.minFotos) {
      toast.error(`Este item requer mín. ${it.minFotos} foto(s). Envie as fotos primeiro.`);
      return;
    }
    updateItem(item, { ok: !it.ok });
  };

  const handleFileChange = async (itemKey: string, files: FileList | null) => {
    if (!files?.length) return;
    setUploadingItem(itemKey);
    const novas: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        const res = await api.post<{ url: string }>('/public/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        novas.push(res.data.url);
      }
      setItens(prev => prev.map(i => {
        if (i.item !== itemKey) return i;
        const novaLista = [...(i.fotosUrls ?? []), ...novas];
        const autoOk = i.minFotos ? novaLista.length >= i.minFotos : i.ok;
        return { ...i, fotosUrls: novaLista, ok: autoOk };
      }));
      toast.success(`${novas.length} foto(s) enviada(s)!`);
    } catch {
      toast.error('Erro ao enviar foto. Verifique o MinIO.');
    } finally {
      setUploadingItem(null);
      const ref = fileRefs.current?.[itemKey];
      if (ref) ref.value = '';
    }
  };

  const removerFoto = (itemKey: string, url: string) => {
    setItens(prev => prev.map(i => {
      if (i.item !== itemKey) return i;
      const novaLista = (i.fotosUrls ?? []).filter(f => f !== url);
      return { ...i, fotosUrls: novaLista, ok: i.minFotos ? novaLista.length >= i.minFotos : i.ok };
    }));
  };

  const downloadFoto = (url: string) => {
    const a = document.createElement('a');
    a.href = url; a.download = url.split('/').pop() || 'foto.jpg'; a.target = '_blank'; a.click();
  };

  const okCount    = itens.filter(i => i.ok).length;
  const total      = itens.length;
  const pct        = total > 0 ? Math.round((okCount / total) * 100) : 100;
  const pending    = itens.filter(i => i.obrigatorio && !i.ok).length;
  const totalFotos = itens.reduce((acc, i) => acc + (i.fotosUrls?.length ?? 0), 0);
  const canApprove = pending === 0;
  const opLabel    = OPERACAO_LABELS[params.operacao] || params.operacao;

  const handleSave = async () => {
    setSaving(true);
    try {
      await fabricacaoApi.gates.updateChecklist(params.id, params.operacao, itens);
      toast.success('Checklist salvo!');
    } catch { toast.error('Erro ao salvar'); } finally { setSaving(false); }
  };

  const handleApprove = async () => {
    if (!canApprove || saving) return;
    setSaving(true);
    try {
      const todasFotos = itens.flatMap(i => i.fotosUrls ?? []);
      await (fabricacaoApi.gates as any).aprovar(params.id, params.operacao, {
        itens:     itens.map(i => ({ item: i.item, ok: i.ok, obs: i.obs ?? '', fotosUrls: i.fotosUrls ?? [] })),
        fotosUrls: todasFotos,
        observacao: obs || undefined,
      });
      toast.success(`Gate ${opLabel} aprovado! ✅`);
      setTimeout(() => window.history.back(), 1800);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao aprovar gate');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pop{0%{transform:scale(0.8)}100%{transform:scale(1)}}
        .foto-mini:hover .foto-actions{opacity:1!important}
      `}</style>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={lightbox} alt="foto" style={{ maxWidth: '90vw', maxHeight: '82vh', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14 }}>
              <button onClick={() => downloadFoto(lightbox)} style={{ padding: '8px 20px', borderRadius: 10, background: '#059669', color: '#FFF', fontWeight: 700, fontSize: '0.82rem', border: 'none', cursor: 'pointer' }}>⬇ Download</button>
              <button onClick={() => setLightbox(null)} style={{ padding: '8px 20px', borderRadius: 10, background: '#374151', color: '#FFF', fontWeight: 700, fontSize: '0.82rem', border: 'none', cursor: 'pointer' }}>✕ Fechar</button>
            </div>
          </div>
        </div>
      )}

      <AdminHeaderHero title="GATE DE QUALIDADE" subtitle={opLabel}
        rightSlot={
          isApproved ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 12, padding: '8px 18px' }}>
              <span style={{ fontSize: '1.1rem' }}>✅</span>
              <div>
                <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.82rem' }}>Gate Aprovado</div>
                {approvedAt && <div style={{ fontSize: '0.65rem', color: '#6B7280' }}>{new Date(approvedAt).toLocaleString('pt-BR')}</div>}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleSave} disabled={saving} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                {saving ? 'Salvando...' : '💾 Salvar'}
              </button>
              <button onClick={handleApprove} disabled={!canApprove || saving}
                style={{ padding: '10px 24px', borderRadius: 10, background: canApprove ? 'linear-gradient(135deg,#059669,#047857)' : '#E5E7EB', color: canApprove ? '#FFF' : '#9CA3AF', fontWeight: 800, fontSize: '0.85rem', fontFamily: 'Orbitron, sans-serif', border: 'none', cursor: canApprove ? 'pointer' : 'not-allowed', boxShadow: canApprove ? '0 4px 14px rgba(5,150,105,0.3)' : 'none', transition: 'all 0.2s' }}>
                {saving ? '⏳ Aprovando...' : '✅ Aprovar Gate'}
              </button>
            </div>
          )
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem' }}>
        <AnimatedKpiCard label="Concluídos"  value={okCount}    sub={`de ${total} itens`}  color="#059669" bg="#F0FDF4" border="#BBF7D0" icon={<span>✅</span>} />
        <AnimatedKpiCard label="Progresso"   value={pct}        suffix="%"                 color={pct===100?'#059669':pct>=60?'#D97706':'#DC2626'} bg={pct===100?'#F0FDF4':pct>=60?'#FFFBEB':'#FEF2F2'} border={pct===100?'#BBF7D0':pct>=60?'#FDE68A':'#FECACA'} icon={<span>📊</span>} delayMs={60} />
        <AnimatedKpiCard label="Pendentes"   value={pending}    sub="obrigatórios"         color={pending>0?'#DC2626':'#059669'} bg={pending>0?'#FEF2F2':'#F0FDF4'} border={pending>0?'#FECACA':'#BBF7D0'} icon={<span>⚠️</span>} delayMs={120} />
        <AnimatedKpiCard label="Total Fotos" value={totalFotos} sub="anexadas"             color="#0891B2" bg="#F0F9FF" border="#BAE6FD" icon={<span>📸</span>} delayMs={180} />
      </div>

      {/* ── Ficha Técnica contextual do gate ── */}
      {specConfig && (
        <div style={{ background: '#FFFFFF', border: '1.5px solid #FDE68A', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#B89B00', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
              ⚙️ FICHA TÉCNICA — {specConfig.title.toUpperCase()}
            </div>
            {!isApproved && (
              <button onClick={handleSaveSpecs} disabled={savingSpecs}
                style={{ padding: '6px 16px', borderRadius: 8, background: savingSpecs ? '#E5E7EB' : 'linear-gradient(135deg,#D97706,#B45309)', color: savingSpecs ? '#9CA3AF' : '#FFF', fontWeight: 700, fontSize: '0.72rem', border: 'none', cursor: savingSpecs ? 'not-allowed' : 'pointer', fontFamily: 'Orbitron, sans-serif' }}>
                {savingSpecs ? '⏳' : '💾 Salvar'}
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {specConfig.fields.filter(f => !f.showIf || f.showIf(gateSpecs)).map(field => (
              <div key={field.key}>
                <label style={{ fontSize: '0.62rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    value={gateSpecs[field.key] ?? ''}
                    onChange={e => !isApproved && handleSpecChange(field.key, e.target.value)}
                    disabled={isApproved}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #FDE68A', background: isApproved ? '#F9FAFB' : '#FFFDE7', fontSize: '0.78rem', color: '#111827', outline: 'none', cursor: isApproved ? 'default' : 'pointer', opacity: isApproved ? 0.8 : 1 }}>
                    <option value="">— Selecione —</option>
                    {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : field.type === 'number' ? (
                  <input type="number"
                    value={gateSpecs[field.key] ?? ''}
                    onChange={e => !isApproved && handleSpecChange(field.key, e.target.value)}
                    readOnly={isApproved}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #FDE68A', background: isApproved ? '#F9FAFB' : '#FFFDE7', fontSize: '0.78rem', color: '#111827', outline: 'none' }} />
                ) : (
                  <input type="text"
                    value={gateSpecs[field.key] ?? ''}
                    onChange={e => !isApproved && handleSpecChange(field.key, e.target.value)}
                    readOnly={isApproved}
                    placeholder="Observações técnicas..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #FDE68A', background: isApproved ? '#F9FAFB' : '#FFFDE7', fontSize: '0.78rem', color: '#111827', outline: 'none' }} />
                )}
              </div>
            ))}
          </div>

          {/* Info dinâmica de obrigatoriedade */}
          {specConfig.dynamicObrigatorio?.map(rule => {
            const isActive = rule.condition(gateSpecs);
            const itemLabel = itens.find(i => i.item === rule.item)?.label ?? rule.item;
            return (
              <div key={rule.item} style={{ marginTop: 12, padding: '8px 12px', background: isActive ? '#FEF2F2' : '#F0FDF4', borderRadius: 8, fontSize: '0.72rem', color: isActive ? '#DC2626' : '#059669', fontWeight: 700, border: `1px solid ${isActive ? '#FECACA' : '#BBF7D0'}` }}>
                {isActive
                  ? `⚠️ "${itemLabel}" → marcado como OBRIGATÓRIO (conf. eixos: 3→2)`
                  : `✓ Ajuste de eixos não necessário — item opcional no checklist`}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, color: '#374151', fontSize: '0.85rem' }}>Progresso do Checklist</span>
          <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: '#B89B00', fontSize: '0.9rem' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: '#F3F4F6', borderRadius: 8 }}>
          <div style={{ height: 8, width: `${pct}%`, background: pct===100?'linear-gradient(90deg,#059669,#34D399)':'linear-gradient(90deg,#0891B2,#059669)', borderRadius: 8, transition: 'width 0.6s ease' }} />
        </div>
        {!canApprove && <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#DC2626', fontWeight: 600 }}>⚠️ Marque todos os itens ⭐ Obrigatórios para habilitar a aprovação.</div>}
      </div>

      {/* ── CHECKLIST COM FOTOS POR ITEM ── */}
      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #FFD600', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {itens.map(item => {
            const fotoCount   = item.fotosUrls?.length ?? 0;
            const fotoMin     = item.minFotos ?? 0;
            const fotoOk      = fotoMin === 0 || fotoCount >= fotoMin;
            const isUploading = uploadingItem === item.item;
            const temFotos    = fotoCount > 0 || fotoMin > 0;

            return (
              <div key={item.item} style={{ background: item.ok ? '#F0FDF4' : '#FFF', border: `1.5px solid ${item.ok ? '#86EFAC' : item.obrigatorio ? '#FDE68A' : '#E5E7EB'}`, borderRadius: 16, padding: '18px 20px', transition: 'all 0.15s', borderLeft: `4px solid ${item.ok ? '#059669' : item.obrigatorio ? '#D97706' : '#E5E7EB'}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>

                  {/* Checkbox — read-only quando aprovado */}
                  <div onClick={() => !isApproved && toggle(item.item)} style={{ width: 30, height: 30, borderRadius: 9, border: `2.5px solid ${item.ok ? '#059669' : '#D1D5DB'}`, background: item.ok ? '#059669' : '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#FFF', fontWeight: 900, fontSize: '0.9rem', cursor: isApproved ? 'default' : 'pointer', marginTop: 2, transition: 'all 0.2s', opacity: isApproved ? 0.85 : 1 }}>
                    {item.ok ? '✓' : ''}
                  </div>

                  <div style={{ flex: 1 }}>
                    {/* Label + badges */}
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      <span onClick={() => !isApproved && toggle(item.item)} style={{ fontWeight: 600, color: '#111827', fontSize: '0.88rem', cursor: isApproved ? 'default' : 'pointer' }}>{item.label}</span>
                      {item.obrigatorio
                        ? <span style={{ fontSize: '0.62rem', color: '#D97706', fontWeight: 800, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 20, padding: '1px 8px' }}>⭐ Obrigatório</span>
                        : <span style={{ fontSize: '0.62rem', color: '#9CA3AF', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 20, padding: '1px 8px' }}>Opcional</span>}
                      {fotoMin > 0 && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: fotoOk ? '#059669' : '#DC2626', background: fotoOk ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${fotoOk ? '#BBF7D0' : '#FECACA'}`, borderRadius: 20, padding: '1px 8px' }}>
                          📸 {fotoCount}/{fotoMin}
                        </span>
                      )}
                    </div>

                    {/* Observação */}
                    <input type="text" placeholder="Observação sobre este item (opcional)..."
                      value={item.obs ?? ''} onChange={e => updateItem(item.item, { obs: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '0.75rem', color: '#6B7280', background: '#F9FAFB', outline: 'none', marginBottom: temFotos ? 12 : 0 }} />

                    {/* Galeria inline do item */}
                    {temFotos && (
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                          📸 Fotos deste item {fotoMin > 0 && `(mín. ${fotoMin})`}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
                          {(item.fotosUrls ?? []).map((url, idx) => (
                            <div key={url} className="foto-mini" style={{ position: 'relative', width: 80, height: 60, borderRadius: 10, overflow: 'hidden', background: '#F3F4F6', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', cursor: 'zoom-in', flexShrink: 0 }}>
                              <img src={url} alt={`foto ${idx+1}`} onClick={() => setLightbox(url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => { (e.target as HTMLImageElement).src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><rect fill="%23F3F4F6" width="80" height="60"/><text x="40" y="35" font-size="18" text-anchor="middle">📷</text></svg>'; }} />
                              <div className="foto-actions" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', opacity: 0, transition: 'opacity 0.15s', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', justifyContent: 'center' }}>
                                <button onClick={() => setLightbox(url)} style={{ padding: '2px 8px', background: '#FFF', color: '#111', border: 'none', borderRadius: 5, fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}>🔍 Ver</button>
                                <button onClick={() => downloadFoto(url)} style={{ padding: '2px 8px', background: '#059669', color: '#FFF', border: 'none', borderRadius: 5, fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}>⬇ DL</button>
                                <button onClick={() => removerFoto(item.item, url)} style={{ padding: '2px 8px', background: '#DC2626', color: '#FFF', border: 'none', borderRadius: 5, fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}>✕</button>
                              </div>
                              <div style={{ position: 'absolute', bottom: 2, left: 4, fontSize: '0.55rem', color: '#FFF', fontWeight: 700, background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '1px 4px' }}>{idx+1}</div>
                            </div>
                          ))}

                          {/* Botão adicionar */}
                          <div onClick={() => fileRefs.current?.[item.item]?.click()}
                            style={{ width: 80, height: 60, borderRadius: 10, border: `2px dashed ${fotoMin > 0 && !fotoOk ? '#FCA5A5' : '#BAE6FD'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: isUploading ? 'wait' : 'pointer', background: '#F0F9FF', flexShrink: 0, transition: 'border-color 0.2s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#0891B2'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = fotoMin > 0 && !fotoOk ? '#FCA5A5' : '#BAE6FD'}>
                            {isUploading
                              ? <div style={{ width: 18, height: 18, border: '2px solid #0891B2', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                              : <><span style={{ fontSize: '1.1rem' }}>📎</span><span style={{ fontSize: '0.55rem', color: '#9CA3AF', marginTop: 2 }}>Foto</span></>}
                          </div>
                          <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
                            ref={el => { if (fileRefs.current) fileRefs.current[item.item] = el; }}
                            onChange={e => handleFileChange(item.item, e.target.files)} />
                        </div>

                        {fotoMin > 0 && !fotoOk && (
                          <div style={{ marginTop: 6, fontSize: '0.7rem', color: '#DC2626', fontWeight: 600 }}>
                            📸 Faltam {fotoMin - fotoCount} foto(s) para liberar este item
                          </div>
                        )}
                        {fotoMin > 0 && fotoOk && (
                          <div style={{ marginTop: 6, fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
                            ✓ Mínimo atingido — item marcado automaticamente como conforme
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botão foto para itens SEM minFotos (qualquer item pode ter foto) */}
                    {!temFotos && (
                      <button onClick={() => fileRefs.current?.[item.item]?.click()} disabled={isUploading}
                        style={{ marginTop: 6, padding: '4px 12px', borderRadius: 8, border: '1px solid #BAE6FD', background: '#F0F9FF', color: '#0891B2', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                        {isUploading ? '⏳ Enviando...' : '📎 Anexar foto'}
                      </button>
                    )}
                    {!temFotos && (
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
                        ref={el => { if (fileRefs.current) fileRefs.current[item.item] = el; }}
                        onChange={e => handleFileChange(item.item, e.target.files)} />
                    )}
                  </div>

                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: item.ok ? '#059669' : '#9CA3AF', background: item.ok ? '#F0FDF4' : '#F3F4F6', border: `1px solid ${item.ok ? '#BBF7D0' : '#E5E7EB'}`, borderRadius: 20, padding: '2px 10px', flexShrink: 0, marginTop: 4 }}>
                    {item.ok ? 'Conforme' : 'Pendente'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Observação Final */}
      <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 700, color: '#374151', fontSize: '0.82rem', marginBottom: 8 }}>📝 Observação Final do Gate</div>
        <textarea rows={3} value={obs} onChange={e => setObs(e.target.value)}
          placeholder="Observações gerais sobre a inspeção desta etapa..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', resize: 'vertical', outline: 'none', background: '#FAFAFA' }} />
      </div>
    </div>
  );
}
