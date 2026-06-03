'use client';
import { useState, useMemo } from 'react';
import { InsumoFabricacao } from '@/lib/api/fabricacao';

interface MatItem { insumoId: string; quantidade: number }
interface Props {
  materiais: MatItem[];
  insumosBom: InsumoFabricacao[];
  insumosExtras: InsumoFabricacao[];
  onChange: (m: MatItem[]) => void;
}

const FAB = '#F59E0B';
const CSS = `
@keyframes ms-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes ms-dot{0%,100%{transform:scale(1)}50%{transform:scale(1.4)}}
`;

function saldoInfo(ins?: InsumoFabricacao) {
  if (!ins) return null;
  const q = Number(ins.quantidadeAtual ?? 0);
  const min = Number(ins.quantidadeMinima ?? 0);
  const pct = min > 0 ? (q / min) * 100 : 100;
  let color = '#059669';
  let label = 'OK';
  if (q <= 0) { color = '#DC2626'; label = 'ZERADO'; }
  else if (pct <= 50) { color = '#DC2626'; label = 'CRÍTICO'; }
  else if (pct < 100) { color = '#D97706'; label = 'BAIXO'; }
  const un = ins.unidadeMedida || ins.unidade || 'un';
  return { q, color, label, un, preco: Number(ins.precoUnitario ?? 0) };
}

function Dropdown({ open, onClose, bom, ext, search, setSearch, onSelect, selectedId }: {
  open: boolean; onClose: () => void;
  bom: InsumoFabricacao[]; ext: InsumoFabricacao[];
  search: string; setSearch: (s: string) => void;
  onSelect: (id: string) => void; selectedId: string;
}) {
  if (!open) return null;
  const filtB = bom.filter(i => !search || i.nome.toLowerCase().includes(search.toLowerCase()) || (i.codigoInterno ?? '').toLowerCase().includes(search.toLowerCase()));
  const filtE = ext.filter(i => !search || i.nome.toLowerCase().includes(search.toLowerCase()) || (i.codigoInterno ?? '').toLowerCase().includes(search.toLowerCase()));
  const none = filtB.length === 0 && filtE.length === 0;

  const Row = ({ ins, accent }: { ins: InsumoFabricacao; accent: string }) => {
    const si = saldoInfo(ins);
    const isSel = ins.id === selectedId;
    return (
      <button onClick={() => { onSelect(ins.id); onClose(); setSearch(''); }}
        style={{ width: '100%', padding: '9px 14px', border: 'none', background: isSel ? `${accent}12` : 'transparent', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid #F9FAFB', transition: 'background .12s' }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = `${accent}08`}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = isSel ? `${accent}12` : 'transparent'}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ins.nome}</div>
          <div style={{ fontSize: '0.62rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono,monospace' }}>{ins.codigoInterno ?? '—'} · {ins.unidadeMedida || ins.unidade}</div>
        </div>
        {si && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: '0.72rem', color: si.color }}>{si.q.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</div>
            <div style={{ fontSize: '0.58rem', color: '#9CA3AF' }}>em estoque</div>
          </div>
        )}
      </button>
    );
  };

  return (
    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, marginTop: 4, background: '#fff', borderRadius: 12, border: `1.5px solid ${FAB}80`, boxShadow: '0 16px 48px rgba(0,0,0,.22)', overflow: 'hidden' }}>
      {/* Search */}
      <div style={{ padding: '9px 12px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>🔍</span>
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou código..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.82rem', background: 'transparent', color: '#111827' }} />
        {search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '0.9rem' }}>✕</button>}
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {none ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.82rem' }}>Nenhum insumo encontrado</div>
        ) : (
          <>
            {filtB.length > 0 && (
              <>
                <div style={{ padding: '5px 12px', fontSize: '0.6rem', fontWeight: 800, color: FAB, textTransform: 'uppercase', letterSpacing: '0.08em', background: '#FFFDE7', borderBottom: '1px solid #FEF08A', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: FAB, display: 'inline-block', animation: 'ms-dot 2s infinite' }} />
                  Previstos no BOM da OF
                </div>
                {filtB.map(i => <Row key={i.id} ins={i} accent={FAB} />)}
              </>
            )}
            {filtE.length > 0 && (
              <>
                <div style={{ padding: '5px 12px', fontSize: '0.6rem', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#F5F3FF', borderBottom: '1px solid #EDE9FE' }}>
                  📦 Outros do Catálogo
                </div>
                {filtE.map(i => <Row key={i.id} ins={i} accent="#7C3AED" />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InsumoCard({ mat, index, allInsumos, insumosBom, insumosBomIds, onUpdate, onRemove }: {
  mat: MatItem; index: number; allInsumos: InsumoFabricacao[];
  insumosBom: InsumoFabricacao[]; insumosBomIds: Set<string>;
  onUpdate: (f: keyof MatItem, v: string | number) => void; onRemove: () => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(!mat.insumoId);

  const sel = allInsumos.find(i => i.id === mat.insumoId);
  const isBom = insumosBomIds.has(mat.insumoId);
  const si = saldoInfo(sel);
  const bc = isBom ? FAB : sel ? '#7C3AED' : '#D1D5DB';
  const un = sel?.unidadeMedida || sel?.unidade || 'un';
  const custo = sel && mat.quantidade > 0 ? mat.quantidade * (si?.preco ?? 0) : 0;

  // Quick picks: top 5 BOM items not yet selected elsewhere
  const quickPicks = insumosBom.slice(0, 5);

  return (
    <div style={{ position: 'relative', borderRadius: 14, border: `1.5px solid ${bc}`, background: '#fff', zIndex: open ? 100 : 1, animation: `ms-in 0.3s ${index * 50}ms both`, boxShadow: sel ? `0 2px 12px ${bc}22` : '0 1px 4px rgba(0,0,0,.06)' }}>
      {/* Top accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg,transparent,${bc},transparent)`, borderRadius: '13px 13px 0 0' }} />

      <div style={{ padding: '12px 14px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: `${bc}18`, border: `1px solid ${bc}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
              {sel ? '📦' : '➕'}
            </div>
            <div>
              <div style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF' }}>
                Material #{index + 1}{isBom ? <span style={{ color: FAB, marginLeft: 4 }}>· BOM ✓</span> : null}
              </div>
              {sel && <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>{sel.nome}</div>}
            </div>
          </div>
          <button onClick={onRemove} style={{ width: 26, height: 26, borderRadius: 7, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
        </div>

        {/* Quick picks (only when no item selected) */}
        {!sel && quickPicks.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
            <div style={{ width: '100%', fontSize: '0.6rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              Mais usados
            </div>
            {quickPicks.map(ins => (
              <button key={ins.id} onClick={() => { onUpdate('insumoId', ins.id); setOpen(false); }}
                style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${FAB}50`, background: `${FAB}10`, color: FAB, fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ins.nome}
              </button>
            ))}
          </div>
        )}

        {/* Selector */}
        <div style={{ position: 'relative', marginBottom: sel ? 10 : 0 }}>
          <button onClick={() => setOpen(v => !v)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 9, border: `1.5px solid ${open ? bc : '#E5E7EB'}`, background: open ? `${bc}08` : '#F9FAFB', textAlign: 'left', cursor: 'pointer', fontSize: '0.82rem', color: sel ? '#111827' : '#9CA3AF', fontWeight: sel ? 600 : 400, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all .18s' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {sel ? `${sel.nome} (${un})` : '— Selecione ou pesquise —'}
            </span>
            <span style={{ color: '#9CA3AF', transition: 'transform .18s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0, marginLeft: 6 }}>▾</span>
          </button>

          <Dropdown
            open={open} onClose={() => setOpen(false)}
            bom={insumosBom} ext={allInsumos.filter(i => !insumosBomIds.has(i.id))}
            search={search} setSearch={setSearch}
            onSelect={id => onUpdate('insumoId', id)} selectedId={mat.insumoId}
          />
        </div>

        {/* Stock badge */}
        {si && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: si.color + '15', border: `1px solid ${si.color}30`, fontSize: '0.62rem', fontWeight: 800, color: si.color, whiteSpace: 'nowrap' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: si.color, display: 'inline-block' }} />
              {si.label} · {si.q.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {si.un}
            </span>
            {si.preco > 0 && <span style={{ fontSize: '0.62rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono,monospace' }}>R$ {si.preco.toFixed(2).replace('.', ',')} / {si.un}</span>}
          </div>
        )}

        {/* Quantity stepper — full width */}
        {sel && (
          <>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Quantidade ({un})</div>
            <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${bc}`, borderRadius: 10, overflow: 'hidden', marginBottom: custo > 0 ? 8 : 0 }}>
              <button onClick={() => onUpdate('quantidade', Math.max(1, mat.quantidade - 1))}
                style={{ padding: '8px 14px', border: 'none', background: `${bc}12`, cursor: 'pointer', fontWeight: 900, fontSize: '1rem', color: bc, flexShrink: 0 }}>−</button>
              <input type="number" min={1} step={1} value={mat.quantidade}
                onChange={e => onUpdate('quantidade', Math.max(1, Math.round(parseFloat(e.target.value) || 1)))}
                style={{ flex: 1, border: 'none', outline: 'none', textAlign: 'center', fontSize: '0.95rem', fontWeight: 800, color: '#111827', fontFamily: 'Orbitron,sans-serif', background: 'transparent', padding: '8px 0', minWidth: 0 }} />
              <button onClick={() => onUpdate('quantidade', mat.quantidade + 1)}
                style={{ padding: '8px 14px', border: 'none', background: `${bc}12`, cursor: 'pointer', fontWeight: 900, fontSize: '1rem', color: bc, flexShrink: 0 }}>+</button>
            </div>

            {/* Cost — below stepper, full width */}
            {custo > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#FFFDE7', borderRadius: 9, border: '1px solid #FEF08A' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#B89B00', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custo estimado</span>
                <span style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: '0.85rem', color: '#7C5A00' }}>R$ {custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MaterialSelectorPremium({ materiais, insumosBom, insumosExtras, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const allInsumos = useMemo(() => [...insumosBom, ...insumosExtras], [insumosBom, insumosExtras]);
  const insumosBomIds = useMemo(() => new Set(insumosBom.map(i => i.id)), [insumosBom]);

  const add = () => { onChange([...materiais, { insumoId: '', quantidade: 1 }]); setOpen(true); };
  const remove = (i: number) => onChange(materiais.filter((_, idx) => idx !== i));
  const update = (i: number, f: keyof MatItem, v: string | number) =>
    onChange(materiais.map((m, idx) => idx === i ? { ...m, [f]: v } : m));

  const totalCusto = materiais.reduce((acc, m) => {
    const ins = allInsumos.find(i => i.id === m.insumoId);
    return acc + (ins ? m.quantidade * Number(ins.precoUnitario ?? 0) : 0);
  }, 0);

  return (
    <>
      <style>{CSS}</style>
      <div style={{ marginTop: 20, borderRadius: 16, border: `1.5px solid ${open || materiais.length > 0 ? FAB + '60' : '#E5E7EB'}`, transition: 'border-color .3s', background: open || materiais.length > 0 ? '#FFFEF5' : '#FAFAFA', overflow: 'visible' }}>
        {/* Header */}
        <button onClick={() => setOpen(v => !v)}
          style={{ width: '100%', padding: '13px 18px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${FAB}18`, border: `1px solid ${FAB}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>📦</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: '0.78rem', color: '#374151', letterSpacing: '0.08em' }}>MATERIAIS CONSUMIDOS</span>
                {materiais.length > 0 && (
                  <span style={{ background: FAB, color: '#0F172A', borderRadius: 20, padding: '2px 9px', fontSize: '0.65rem', fontWeight: 900 }}>{materiais.length}</span>
                )}
              </div>
              {totalCusto > 0 && (
                <div style={{ fontSize: '0.65rem', color: '#B89B00', fontFamily: 'JetBrains Mono,monospace', marginTop: 1 }}>
                  Custo total: R$ {totalCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
          </div>
          <span style={{ color: '#9CA3AF', fontSize: '0.8rem', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▾</span>
        </button>

        {open && (
          <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${FAB}20` }}>
            {materiais.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: 6 }}>🏭</div>
                <div style={{ fontFamily: 'Orbitron,sans-serif', fontSize: '0.62rem', color: '#9CA3AF', letterSpacing: '.12em', marginBottom: 4 }}>NENHUM MATERIAL ADICIONADO</div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Clique em "+ Adicionar Material" para registrar consumo</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, paddingTop: 14, paddingBottom: 14 }}>
                {materiais.map((m, i) => (
                  <InsumoCard key={i} mat={m} index={i}
                    allInsumos={allInsumos} insumosBom={insumosBom} insumosBomIds={insumosBomIds}
                    onUpdate={(f, v) => update(i, f, v)} onRemove={() => remove(i)} />
                ))}
              </div>
            )}

            <button onClick={add}
              style={{ width: '100%', padding: '10px 16px', borderRadius: 12, border: `2px dashed ${FAB}60`, background: `${FAB}06`, color: FAB, cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', fontFamily: 'Orbitron,sans-serif', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s' }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = `${FAB}15`; b.style.borderColor = FAB; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = `${FAB}06`; b.style.borderColor = `${FAB}60`; }}>
              <span style={{ fontSize: '1.1rem' }}>+</span> ADICIONAR MATERIAL
            </button>
          </div>
        )}
      </div>
    </>
  );
}
