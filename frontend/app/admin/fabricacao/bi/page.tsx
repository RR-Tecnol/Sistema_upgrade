'use client';
import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, ReferenceLine, Scatter, ScatterChart, ZAxis,
} from 'recharts';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { fabricacaoApi } from '@/lib/api/fabricacao';

const fmtBRL = (v: number) => `R$ ${Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
const fmtK = (v: number) => `R$${(Math.abs(v) / 1000).toFixed(0)}k`;
const TIPO_LABELS: Record<string, string> = {
  SERVICO_DIARIA: 'Diária', SERVICO_PACOTE: 'Pacote', BAU_COMPRA: 'Compra Baú',
  FRETE_AQUISICAO: 'Frete', MATERIAL: 'Material', EQUIPAMENTO: 'Equipamento',
  MAO_DE_OBRA: 'Mão de Obra', PORTEIRA_FECHADA: 'Porteira Fechada',
  DESPESA_GERAL: 'Despesa Geral', OUTRO: 'Outro',
};
const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO_MATERIAL: 'Ag. Material', EM_PRODUCAO: 'Em Produção',
  BLOQUEADA: 'Bloqueada', INSPECAO_FINAL: 'Inspeção', CONCLUIDA: 'Concluída',
};
const STATUS_COLORS: Record<string, string> = {
  AGUARDANDO_MATERIAL: '#D97706', EM_PRODUCAO: '#0891B2',
  BLOQUEADA: '#DC2626', INSPECAO_FINAL: '#7C3AED', CONCLUIDA: '#059669',
};
const TIPO_COLORS = ['#B89B00','#0891B2','#059669','#D97706','#DC2626','#7C3AED','#EA580C','#374151'];

/* Tooltip branco premium */
const LightTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, padding:'12px 16px', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', minWidth:190 }}>
      {label && <div style={{ fontSize:'0.68rem', color:'#6B7280', marginBottom:8, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</div>}
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display:'flex', justifyContent:'space-between', gap:16, marginBottom:4, alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:p.color||'#9CA3AF', flexShrink:0 }}/>
            <span style={{ fontSize:'0.71rem', color:'#374151', fontWeight:600 }}>{p.name}</span>
          </div>
          <span style={{ fontSize:'0.71rem', color:'#111827', fontFamily:'monospace', fontWeight:700 }}>
            {typeof p.value === 'number' && p.value > 100 ? fmtBRL(p.value) : p.value ?? '—'}
          </span>
        </div>
      ))}
    </div>
  );
};

const Card = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div style={{ background:'#FFFFFF', border:'1px solid #E5E7EB', borderRadius:18, padding:'24px 24px 20px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
    <div style={{ marginBottom:18, borderBottom:'2px solid #FEF08A', paddingBottom:12 }}>
      <div style={{ fontFamily:'Orbitron, sans-serif', fontWeight:900, color:'#B89B00', fontSize:'0.75rem', letterSpacing:'0.1em', textTransform:'uppercase' }}>{title}</div>
      {subtitle && <div style={{ fontSize:'0.67rem', color:'#9CA3AF', marginTop:4 }}>{subtitle}</div>}
    </div>
    {children}
  </div>
);

export default function BiPage() {
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fabricacaoApi.bi.dashboard().then(setDash).catch(()=>{}).finally(()=>setLoading(false)); }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:80 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, border:'3px solid #FFD600', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.75s linear infinite', margin:'0 auto 1rem' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color:'#9CA3AF', fontSize:'0.8rem' }}>Carregando BI...</p>
      </div>
    </div>
  );

  const orc = Number(dash?.orcamento_total||0);
  const real = Number(dash?.custo_real_total||0);
  const margemPct = orc > 0 ? ((orc - real) / orc * 100) : 0;
  const acima = real > orc;

  const statusData = (dash?.por_status||[]).map((s:any) => ({
    name: STATUS_LABELS[s.status]||s.status, value: s.count, color: STATUS_COLORS[s.status]||'#9CA3AF',
  }));

  const tipoData = (dash?.custos_por_tipo||[])
    .map((c:any) => ({ name: TIPO_LABELS[c.tipo]||c.tipo, valor: c.total, count: c.count, media: c.media||0 }))
    .sort((a:any,b:any) => b.valor - a.valor);

  const tendencia = (dash?.tendencia_mensal||[]);
  const waterfall = (dash?.waterfall||[]);
  const topOfs = (dash?.top_ofs||[]);
  const scatter = (dash?.scatter_ofs||[]).map((o:any) => ({ ...o, x: o.orcamento, y: o.custo_real, z: Math.max(o.aquisicao, 5000) }));
  const prestadores = (dash?.prestadores_custo||[]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.35rem' }} className="animate-fade-in">
      <style>{`@media(max-width:700px){.bi-grid-3{grid-template-columns:1fr!important}.bi-grid-2{grid-template-columns:1fr!important}}`}</style>
      <AdminHeaderHero title="BI · FABRICAÇÃO" subtitle="Business Intelligence · Análise de Custos e Precificação de Carretas" />

      {/* KPIs linha 1 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'0.85rem' }}>
        <AnimatedKpiCard label="Total OFs" value={dash?.total||0} sub="cadastradas" color="#0891B2" bg="#F0F9FF" border="#BAE6FD" icon={<span>🏭</span>} />
        <AnimatedKpiCard label="Orçamento" value={0} displayValue={fmtK(orc)} sub="total consolidado" color="#B89B00" bg="#FFFDE7" border="#FEF08A" icon={<span>💰</span>} delayMs={60}/>
        <AnimatedKpiCard label="Custo Real" value={0} displayValue={fmtK(real)} sub="realizado" color={acima?'#DC2626':'#059669'} bg={acima?'#FEF2F2':'#F0FDF4'} border={acima?'#FECACA':'#BBF7D0'} icon={<span>📊</span>} delayMs={120}/>
        <AnimatedKpiCard label="Margem" value={0} displayValue={`${Math.abs(margemPct).toFixed(1)}%`} sub={margemPct>=0?'dentro do orçado':'acima do orçado'} color={margemPct>=0?'#059669':'#DC2626'} bg={margemPct>=0?'#F0FDF4':'#FEF2F2'} border={margemPct>=0?'#BBF7D0':'#FECACA'} icon={<span>📈</span>} delayMs={180}/>
        <AnimatedKpiCard label="Ticket Médio" value={0} displayValue={fmtK(dash?.ticket_medio_orca||0)} sub="por OF (orçado)" color="#7C3AED" bg="#F5F3FF" border="#DDD6FE" icon={<span>🎯</span>} delayMs={240}/>
        <AnimatedKpiCard label="Aquisição" value={0} displayValue={fmtK(dash?.aquisicao_total||0)} sub="baú + frete" color="#D97706" bg="#FFFBEB" border="#FDE68A" icon={<span>🚛</span>} delayMs={300}/>
      </div>

      {/* Linha 1: Tendência + Waterfall */}
      <div className="bi-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <Card title="Tendência Mensal de Custos" subtitle="Aquisição vs. Serviços/Materiais acumulados por mês">
          {tendencia.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'#D1D5DB', fontSize:'0.82rem' }}>Sem lançamentos mensais ainda</div>
          ) : (
            <>
              {/* Legenda manual */}
              <div style={{ display:'flex', gap:16, marginBottom:12, flexWrap:'wrap' }}>
                {[{c:'#B89B00',l:'Aquisição'},{c:'#0891B2',l:'Serviços / Materiais'},{c:'#DC2626',l:'Total Geral'}].map(i=>(
                  <div key={i.l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:20, height:3, background:i.c, borderRadius:2 }}/>
                    <span style={{ fontSize:'0.67rem', color:'#6B7280', fontWeight:600 }}>{i.l}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={tendencia} margin={{ top:5, right:16, left:0, bottom:5 }}>
                  <defs>
                    <linearGradient id="gradServ" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891B2" stopOpacity={0.18}/>
                      <stop offset="95%" stopColor="#0891B2" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="gradAq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B89B00" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#B89B00" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#F3F4F6" vertical={false}/>
                  <XAxis dataKey="mes" tick={{ fill:'#9CA3AF', fontSize:10 }} tickLine={false} axisLine={{ stroke:'#E5E7EB' }}/>
                  <YAxis tick={{ fill:'#9CA3AF', fontSize:10 }} tickLine={false} axisLine={false} tickFormatter={fmtK} width={52}/>
                  <Tooltip content={<LightTooltip/>}/>
                  <Area type="monotone" dataKey="aquisicao" name="Aquisição" stroke="#B89B00" strokeWidth={2.5} fill="url(#gradAq)" dot={{ r:5, fill:'#B89B00', stroke:'#fff', strokeWidth:2 }} activeDot={{ r:7 }}/>
                  <Area type="monotone" dataKey="servicos" name="Serviços/Mat" stroke="#0891B2" strokeWidth={2.5} fill="url(#gradServ)" dot={{ r:5, fill:'#0891B2', stroke:'#fff', strokeWidth:2 }} activeDot={{ r:7 }}/>
                  <Line type="monotone" dataKey="total" name="Total Geral" stroke="#DC2626" strokeWidth={3} strokeDasharray="6 3" dot={{ r:6, fill:'#DC2626', stroke:'#fff', strokeWidth:2 }} activeDot={{ r:8 }}/>
                </ComposedChart>
              </ResponsiveContainer>
            </>
          )}
        </Card>

        <Card title="Estrutura de Custo — Waterfall" subtitle="Composição acumulada por categoria">
          {waterfall.every((w:any) => w.value === 0) ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'#D1D5DB', fontSize:'0.82rem' }}>Sem dados de custo ainda</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={waterfall} margin={{ top:5, right:10, left:0, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                  <XAxis dataKey="name" tick={{ fill:'#6B7280', fontSize:10 }} tickLine={false}/>
                  <YAxis tick={{ fill:'#9CA3AF', fontSize:10 }} tickLine={false} axisLine={false} tickFormatter={fmtK} width={48}/>
                  <Tooltip content={<LightTooltip/>}/>
                  <Bar dataKey="value" name="Valor" radius={[6,6,0,0]}>
                    {waterfall.map((_:any,i:number) => <Cell key={i} fill={TIPO_COLORS[i]}/>)}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:12 }}>
                {waterfall.map((w:any,i:number) => (
                  <div key={w.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:TIPO_COLORS[i], flexShrink:0 }}/>
                      <span style={{ fontSize:'0.72rem', color:'#374151', fontWeight:500 }}>{w.name}</span>
                    </div>
                    <span style={{ fontSize:'0.72rem', fontWeight:800, color:'#111827', fontFamily:'monospace' }}>{fmtBRL(w.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Linha 2: Pizza status + Custos por tipo */}
      <div className="bi-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <Card title="OFs por Status" subtitle="Distribuição atual do pipeline de produção">
          {statusData.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'#D1D5DB' }}>Sem dados</div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={72} innerRadius={36} strokeWidth={3}>
                    {statusData.map((s:any,i:number) => <Cell key={i} fill={s.color} stroke="#fff"/>)}
                  </Pie>
                  <Tooltip content={<LightTooltip/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
                {statusData.map((s:any) => (
                  <div key={s.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:10, height:10, borderRadius:3, background:s.color, flexShrink:0 }}/>
                      <span style={{ fontSize:'0.75rem', color:'#374151', fontWeight:500 }}>{s.name}</span>
                    </div>
                    <span style={{ fontFamily:'Orbitron, sans-serif', fontWeight:900, fontSize:'0.8rem', color:'#111827' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="Custos por Categoria" subtitle="Ranking com valor médio por lançamento">
          {tipoData.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'#D1D5DB' }}>Sem lançamentos</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {tipoData.slice(0,6).map((t:any, i:number) => {
                const max = tipoData[0]?.valor || 1;
                const pct = (t.valor / max) * 100;
                return (
                  <div key={t.name}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:'0.72rem', fontWeight:600, color:'#374151' }}>{t.name}</span>
                      <div style={{ textAlign:'right' }}>
                        <span style={{ fontSize:'0.72rem', fontWeight:800, color:'#111827', fontFamily:'monospace' }}>{fmtBRL(t.valor)}</span>
                        <span style={{ fontSize:'0.62rem', color:'#9CA3AF', marginLeft:6 }}>({t.count}x)</span>
                      </div>
                    </div>
                    <div style={{ background:'#F3F4F6', borderRadius:6, height:7, overflow:'hidden' }}>
                      <div style={{ height:7, width:`${pct}%`, background:`linear-gradient(90deg,${TIPO_COLORS[i]}88,${TIPO_COLORS[i]})`, borderRadius:6, transition:'width 0.4s' }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Linha 3: Scatter orçamento vs real */}
      <Card title="Dispersão: Orçado × Custo Real" subtitle="Cada ponto = uma OF · acima da diagonal = estouro de orçamento">
        {scatter.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:'#D1D5DB' }}>Sem OFs com dados suficientes</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top:20, right:20, left:0, bottom:10 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#F3F4F6" />
              <XAxis type="number" dataKey="x" name="Orçado" tick={{ fill:'#475569', fontSize:10 }} tickFormatter={fmtK} label={{ value:'Orçamento', position:'insideBottom', offset:-5, fill:'#475569', fontSize:11 }}/>
              <YAxis type="number" dataKey="y" name="Custo Real" tick={{ fill:'#475569', fontSize:10 }} tickFormatter={fmtK} width={52} label={{ value:'Custo Real', angle:-90, position:'insideLeft', fill:'#475569', fontSize:11 }}/>
              <ZAxis type="number" dataKey="z" range={[60, 400]} name="Aquisição"/>
              <Tooltip cursor={{ strokeDasharray:'3 3' }} content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div style={{ background:'#0F172A', border:'1px solid #334155', borderRadius:10, padding:'10px 14px' }}>
                    <div style={{ fontFamily:'Orbitron, sans-serif', color:'#FFD600', fontWeight:900, fontSize:'0.7rem', marginBottom:6 }}>{d?.codigo}</div>
                    <div style={{ fontSize:'0.68rem', color:'#94A3B8', marginBottom:3 }}>Orçado: <strong style={{ color:'#F1F5F9' }}>{fmtBRL(d?.x)}</strong></div>
                    <div style={{ fontSize:'0.68rem', color:'#94A3B8', marginBottom:3 }}>Real: <strong style={{ color: d?.y > d?.x ? '#F87171' : '#34D399' }}>{fmtBRL(d?.y)}</strong></div>
                    <div style={{ fontSize:'0.68rem', color:'#94A3B8' }}>CPI: <strong style={{ color: d?.cpi < 1 ? '#F87171' : '#34D399' }}>{(d?.cpi||0).toFixed(2)}</strong></div>
                  </div>
                );
              }}/>
              {/* Linha diagonal de equilíbrio (custo = orçamento) */}
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: Math.max(...scatter.map((s:any)=>s.x), 100000), y: Math.max(...scatter.map((s:any)=>s.x), 100000) }]}
                stroke="#FFD600" strokeDasharray="6 4" strokeWidth={1.5}
                label={{ value:'Equilíbrio', fill:'#FFD600', fontSize:9, position:'insideTopRight' }}/>
              <Scatter
                data={scatter}
                fill="#0891B2"
              >
                {scatter.map((s:any, i:number) => (
                  <Cell key={i} fill={s.y > s.x ? '#F87171' : '#34D399'} fillOpacity={0.85}/>
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
        <div style={{ marginTop:12, display:'flex', gap:20, borderTop:'1px solid #F3F4F6', paddingTop:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'#34D399' }}/><span style={{ fontSize:'0.65rem', color:'#64748B' }}>Dentro do orçamento</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'#F87171' }}/><span style={{ fontSize:'0.65rem', color:'#64748B' }}>Acima do orçamento</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#FFD600" strokeWidth="1.5" strokeDasharray="5 3"/></svg>
            <span style={{ fontSize:'0.65rem', color:'#64748B' }}>Linha de equilíbrio</span>
          </div>
        </div>
      </Card>

      {/* Linha 4: Top OFs + Prestadores */}
      <div className="bi-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <Card title="Top OFs por Custo Real" subtitle="Performance vs. orçamento por ordem">
          {topOfs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'#D1D5DB' }}>Sem dados</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {topOfs.map((of:any, i:number) => {
                const pct = of.orcamentoTotal > 0 ? (of.custoRealAcumulado / of.orcamentoTotal) * 100 : 0;
                const acima = pct > 100;
                return (
                  <div key={of.codigo} style={{ padding:'12px 0', borderBottom: i < topOfs.length-1 ? '1px solid #F3F4F6' : 'none' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <div>
                        <span style={{ fontFamily:'Orbitron, sans-serif', fontWeight:900, fontSize:'0.72rem', color:'#B89B00' }}>{of.codigo}</span>
                        <span style={{ marginLeft:8, fontSize:'0.65rem', color:'#9CA3AF' }}>{of.descricaoBau?.slice(0,28)}…</span>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:'Orbitron, sans-serif', fontWeight:900, fontSize:'0.78rem', color: acima?'#DC2626':'#111827' }}>
                          {fmtBRL(Number(of.custoRealAcumulado))}
                        </div>
                        <div style={{ fontSize:'0.62rem', color: acima?'#DC2626':'#9CA3AF', fontWeight:700 }}>{pct.toFixed(1)}% do orç.</div>
                      </div>
                    </div>
                    <div style={{ height:6, background:'#F3F4F6', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:6, width:`${Math.min(pct,100)}%`, background: acima?'linear-gradient(90deg,#DC2626,#EF4444)':'linear-gradient(90deg,#FFD600,#E5B800)', borderRadius:4 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Ranking de Prestadores" subtitle="Por volume financeiro acumulado">
          {prestadores.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'#D1D5DB' }}>Nenhum prestador cadastrado ainda</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {prestadores.map((p:any, i:number) => {
                const max = prestadores[0]?.total || 1;
                const pct = (p.total / max) * 100;
                const isPj = p.tipo === 'PJ';
                return (
                  <div key={p.nome+i}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:'0.58rem', fontWeight:800, padding:'1px 6px', borderRadius:10, background: isPj?'#EDE9FE':'#DCFCE7', color: isPj?'#5B21B6':'#059669', border:`1px solid ${isPj?'#DDD6FE':'#BBF7D0'}` }}>
                          {isPj?'PJ':'PF'}
                        </span>
                        <span style={{ fontSize:'0.72rem', fontWeight:600, color:'#374151' }}>{p.nome}</span>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <span style={{ fontSize:'0.72rem', fontWeight:800, color:'#111827', fontFamily:'monospace' }}>{fmtBRL(p.total)}</span>
                        <span style={{ fontSize:'0.62rem', color:'#9CA3AF', marginLeft:5 }}>({p.lancamentos}x)</span>
                      </div>
                    </div>
                    <div style={{ background:'#F3F4F6', borderRadius:5, height:6, overflow:'hidden' }}>
                      <div style={{ height:6, width:`${pct}%`, background:`linear-gradient(90deg,${isPj?'#7C3AED':'#059669'}88,${isPj?'#7C3AED':'#059669'})`, borderRadius:5 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
