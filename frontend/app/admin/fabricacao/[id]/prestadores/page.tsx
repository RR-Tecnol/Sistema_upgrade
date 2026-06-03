'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { fabricacaoApi, Prestador } from '@/lib/api/fabricacao';

const OPERACAO_LABELS: Record<string, string> = {
  OP010_VISTORIA_DESMANCHE:  'OP010 · Aquisição',
  OP020_SERRALHERIA:         'OP020 · Estrutura Externa',
  OP025_ELETRICA_AUTOMOTIVA: 'OP025 · Elétrica Auto',
  OP030_INFRAESTRUTURA:      'OP030 · Estrutura Interna',
  OP040_ACABAMENTO:          'OP040 · Serviço Interno',
  OP050_MARCENARIA:          'OP050 · Acabamento',
  OP060_GATE_LIBERACAO:      'OP060 · Gate Final',
};

const STATUS_CONTA: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  pendente:  { label: 'Pendente',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B' },
  paga:      { label: 'Pago',      color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', dot: '#10B981' },
  vencida:   { label: 'Vencido',   color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444' },
  cancelada: { label: 'Cancelada', color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB', dot: '#D1D5DB' },
};

const PJ_CONFIG = { color: '#059669', glow: 'rgba(5,150,105,0.45)', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.30)', label: 'Pessoa Jurídica', icon: '🏢' };
const PF_CONFIG = { color: '#7C3AED', glow: 'rgba(124,58,237,0.45)', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.30)', label: 'Pessoa Física',  icon: '👤' };

const fmt    = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const fmtDay = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/* ── Prestador Card (mesmo padrão EmployeeCard) ── */
function PrestadorCard({ p }: { p: Prestador }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const cfg = p.tipoPrestador === 'PJ' ? PJ_CONFIG : PF_CONFIG;
  const sc  = p.custo?.contaPagar ? (STATUS_CONTA[p.custo.contaPagar.status] ?? STATUS_CONTA.pendente) : null;
  const isDiaria = p.custo?.tipo === 'SERVICO_DIARIA';

  const initials = p.nome.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const rotX = (((e.clientY - rect.top)  / rect.height) - 0.5) * -8;
    const rotY = (((e.clientX - rect.left) / rect.width)  - 0.5) *  8;
    ref.current.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-2px)`;
    ref.current.style.transition = 'transform 0.1s ease';
  };
  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    ref.current.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
    setHovered(false);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        borderRadius: 20, background: '#FFFFFF', overflow: 'hidden', willChange: 'transform',
        transition: 'transform 0.15s ease, box-shadow 0.25s ease',
        boxShadow: hovered
          ? `0 20px 48px rgba(0,0,0,0.13), 0 0 0 1.5px ${cfg.color}60`
          : `0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px ${cfg.color}30`,
      }}
    >
      {/* Top color bar com glow */}
      <div style={{
        height: 4,
        background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)`,
        boxShadow: `0 2px 12px ${cfg.glow}`,
      }} />

      <div style={{ padding: '1.25rem 1.4rem' }}>
        {/* Linha 1: avatar + identidade + badge tipo */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
          {/* Avatar com iniciais */}
          <div style={{
            width: 64, height: 64, borderRadius: 16, flexShrink: 0,
            background: `linear-gradient(135deg, ${cfg.bg}, ${cfg.color}15)`,
            border: `2px solid ${cfg.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 20px ${cfg.glow}`,
            fontFamily: 'Orbitron, sans-serif', fontWeight: 900,
            fontSize: '1.2rem', color: cfg.color, letterSpacing: '-0.02em',
          }}>
            {initials || cfg.icon}
          </div>

          {/* Identidade */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827', marginBottom: '0.25rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.nome}
            </div>
            {/* Função chip */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.25rem 0.7rem', borderRadius: 100,
              background: cfg.bg, border: `1.5px solid ${cfg.border}`,
              fontSize: '0.72rem', fontWeight: 700, color: cfg.color, letterSpacing: '0.03em', marginBottom: '0.3rem',
            }}>
              <span style={{ fontSize: '0.85rem' }}>{cfg.icon}</span>
              {p.funcao || cfg.label}
            </span>
            {/* Badge PF/PJ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: cfg.color }}>{p.tipoPrestador === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</span>
            </div>
          </div>

          {/* Status financeiro top-right */}
          {sc && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
              padding: '0.22rem 0.65rem', borderRadius: 100,
              background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
              fontSize: '0.63rem', fontWeight: 800, letterSpacing: '0.06em',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
              {sc.label}
            </div>
          )}
        </div>

        {/* Info pills em coluna (padrão EmployeeCard) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1rem' }}>
          {p.cpf && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.78rem', width: 18, textAlign: 'center' }}>🪪</span>
              <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500, fontFamily: 'JetBrains Mono, monospace' }}>CPF: {p.cpf}</span>
            </div>
          )}
          {p.cnpj && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.78rem', width: 18, textAlign: 'center' }}>🏛️</span>
              <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500, fontFamily: 'JetBrains Mono, monospace' }}>CNPJ: {p.cnpj}</span>
            </div>
          )}
          {p.telefone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.78rem', width: 18, textAlign: 'center' }}>📞</span>
              <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500 }}>{p.telefone}</span>
            </div>
          )}
          {p.tipoPrestador === 'PJ' && p.contato && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.78rem', width: 18, textAlign: 'center' }}>👤</span>
              <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500 }}>Contato: {p.contato}</span>
            </div>
          )}
          {p.custo && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.78rem', width: 18, textAlign: 'center' }}>💰</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#B89B00', fontFamily: 'JetBrains Mono, monospace' }}>
                  R$ {fmt(p.custo.valor)}
                  {isDiaria && p.custo.numeroDiarias && (
                    <span style={{ fontWeight: 500, color: '#9CA3AF', fontSize: '0.72rem' }}> · {p.custo.numeroDiarias}x R${fmt(p.custo.valorDiaria ?? 0)}/dia</span>
                  )}
                </span>
              </div>
              {p.custo.operacao && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.78rem', width: 18, textAlign: 'center' }}>⚙️</span>
                  <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 }}>{OPERACAO_LABELS[p.custo.operacao] ?? p.custo.operacao}</span>
                </div>
              )}
              {p.custo.dataVencimento && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.78rem', width: 18, textAlign: 'center' }}>📅</span>
                  <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 }}>
                    Venc.: <strong style={{ color: '#374151' }}>{new Date(p.custo.dataVencimento).toLocaleDateString('pt-BR')}</strong>
                    {' · '}
                    <span style={{
                      background: isDiaria ? '#F0F9FF' : '#FFFDE7',
                      color: isDiaria ? '#0891B2' : '#B89B00',
                      border: `1px solid ${isDiaria ? '#BAE6FD' : '#FEF08A'}`,
                      borderRadius: 8, padding: '1px 7px', fontSize: '0.62rem', fontWeight: 800,
                    }}>
                      {isDiaria ? 'Diária' : 'Pacote'}
                    </span>
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Divider gradiente (padrão EmployeeCard) */}
        <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}30, transparent)`, marginBottom: '0.85rem' }} />

        {/* Dias trabalhados */}
        {isDiaria && p.custo?.diasTrabalhados && p.custo.diasTrabalhados.length > 0 && (
          <div>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              📅 Dias Trabalhados
              <span style={{ background: '#FFFDE7', color: '#B89B00', border: '1px solid #FEF08A', borderRadius: 20, padding: '1px 7px', fontSize: '0.6rem', fontWeight: 800 }}>
                {p.custo.diasTrabalhados.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {p.custo.diasTrabalhados.map(d => (
                <span key={d} style={{
                  background: `linear-gradient(135deg, #FFFDE7, #FEF9C3)`,
                  color: '#92400E', border: '1px solid #FEF08A',
                  borderRadius: 8, padding: '3px 9px', fontSize: '0.7rem', fontWeight: 700,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}>
                  {fmtDay(d)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Page ── */
export default function PrestadoresPage({ params }: { params: { id: string } }) {
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filtro, setFiltro]           = useState<'TODOS' | 'PF' | 'PJ'>('TODOS');

  const load = useCallback(async () => {
    setLoading(true);
    try { setPrestadores(await fabricacaoApi.ordens.getPrestadores(params.id)); }
    catch { setPrestadores([]); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const filtrados  = filtro === 'TODOS' ? prestadores : prestadores.filter(p => p.tipoPrestador === filtro);
  const totalPF    = prestadores.filter(p => p.tipoPrestador === 'PF').length;
  const totalPJ    = prestadores.filter(p => p.tipoPrestador === 'PJ').length;
  const valorTotal = prestadores.reduce((a, p) => a + (p.custo?.valor ?? 0), 0);
  const pagos      = prestadores.filter(p => p.custo?.contaPagar?.status === 'pago').length;
  const fmt2       = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <AdminHeaderHero title="PRESTADORES DE SERVIÇO" subtitle="Pessoas físicas e jurídicas vinculadas a esta OF" />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '0.85rem' }}>
        {[
          { label: 'Total',           val: `${prestadores.length}`, icon: '👷', color: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
          { label: 'Pessoa Física',   val: `${totalPF}`,            icon: '👤', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
          { label: 'Pessoa Jurídica', val: `${totalPJ}`,            icon: '🏢', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
          { label: 'Pagamentos OK',   val: `${pagos}/${prestadores.length}`, icon: '✅', color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
          { label: 'Total Contratado', val: `R$ ${fmt2(valorTotal)}`, icon: '💰', color: '#B89B00', bg: '#FFFDE7', border: '#FEF08A' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1.5px solid ${k.border}`, borderRadius: 16, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, color: k.color, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: k.label === 'Total Contratado' ? '0.82rem' : '1.4rem', color: k.color }}>{k.val}</div>
            </div>
            <div style={{ fontSize: '1.4rem' }}>{k.icon}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {(['TODOS', 'PF', 'PJ'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            padding: '7px 18px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
            border: `1.5px solid ${filtro === f ? '#FFD600' : '#E5E7EB'}`,
            background: filtro === f ? '#FFFDE7' : '#F9FAFB',
            color: filtro === f ? '#B89B00' : '#6B7280',
            transition: 'all 0.15s',
          }}>
            {f === 'TODOS' ? '🔍 Todos' : f === 'PF' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#9CA3AF' }}>
          {filtrados.length} prestador{filtrados.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Lista em grid (padrão funcionários) */}
      {loading ? (
        <div style={{ padding: '64px 0', textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #FFD600', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto' }} />
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 18, padding: '72px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>👷</div>
          <div style={{ fontWeight: 800, color: '#111827', marginBottom: 6 }}>Nenhum prestador cadastrado</div>
          <div style={{ fontSize: '0.82rem', color: '#9CA3AF', maxWidth: 340, margin: '0 auto', lineHeight: 1.6 }}>
            Prestadores são vinculados automaticamente ao lançar um custo de serviço com o nome do prestador.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
          {filtrados.map(p => <PrestadorCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
