'use client';

import { useEffect, useState } from 'react';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { fabricacaoApi, InsumoFabricacao } from '@/lib/api/fabricacao';
import { toast } from '@/components/ui/Toast';

const CSS = `
@keyframes ins-scan{0%,100%{top:0;opacity:.6}50%{top:100%;opacity:.2}}
@keyframes ins-grid{0%,100%{opacity:.08}50%{opacity:.18}}
@keyframes ins-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes ins-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}
@keyframes ins-slide{from{transform:translateX(-8px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes ins-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
`;

const FAB = '#F59E0B';

type InsStatus = 'OK'|'BAIXO'|'CRITICO'|'ZERADO';
function getStatus(i: InsumoFabricacao): {label:string;color:string;bg:string;border:string;icon:string;pct:number} {
  const pct = i.quantidadeMinima > 0 ? (i.quantidadeAtual / i.quantidadeMinima) * 100 : 100;
  if (pct <= 0)  return {label:'ZERADO',  color:'#DC2626',bg:'#FEF2F2',border:'#FECACA',icon:'🚨',pct:0};
  if (pct <= 50) return {label:'CRÍTICO', color:'#DC2626',bg:'#FEF2F2',border:'#FECACA',icon:'⚠️',pct};
  if (pct < 100) return {label:'BAIXO',   color:'#D97706',bg:'#FFFBEB',border:'#FDE68A',icon:'⚡',pct};
  return               {label:'OK',      color:'#059669',bg:'#F0FDF4',border:'#BBF7D0',icon:'✅',pct:Math.min(pct,200)};
}

function InsumoCard({item, index}: {item: InsumoFabricacao; index: number}) {
  const [hov, setHov] = useState(false);
  const st = getStatus(item);
  const bc = st.color;
  const preco = Number(item.precoUnitario ?? 0);
  const valorTotal = item.quantidadeAtual * preco;
  const src = (item as any)._source as string | undefined;

  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{position:'relative',overflow:'hidden',borderRadius:20,background:'#fff',borderStyle:'solid',borderWidth:'1px 1px 1px 4px',borderTopColor:hov?`${bc}55`:`${bc}20`,borderRightColor:hov?`${bc}55`:`${bc}20`,borderBottomColor:hov?`${bc}55`:`${bc}20`,borderLeftColor:bc,boxShadow:hov?`0 0 24px ${bc}18,0 12px 32px rgba(0,0,0,.1)`:'0 2px 8px rgba(0,0,0,.06)',transition:'all .3s cubic-bezier(.175,.885,.32,1.275)',transform:hov?'perspective(800px) rotateX(-2deg) rotateY(2deg) translateY(-5px)':'none',animation:`ins-slide 0.5s ${index*40}ms both`,display:'flex',flexDirection:'column'}}>
      <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:`linear-gradient(${bc}05 1px,transparent 1px),linear-gradient(90deg,${bc}05 1px,transparent 1px)`,backgroundSize:'28px 28px',animation:'ins-grid 5s ease-in-out infinite'}}/>
      <div style={{position:'absolute',left:0,right:0,height:1.5,background:`linear-gradient(90deg,transparent,${bc}40,transparent)`,animation:'ins-scan 4.5s ease-in-out infinite',pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${bc},transparent)`,opacity:hov?.9:.4,transition:'opacity .3s'}}/>
      <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,border:`1px solid ${bc}14`,borderRadius:'50%',animation:'ins-ring 12s linear infinite',pointerEvents:'none'}}/>

      <div style={{position:'relative',zIndex:1,padding:'18px 18px 14px'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div style={{width:48,height:48,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',background:`linear-gradient(135deg,${bc}22,${bc}06)`,border:`1px solid ${bc}35`,boxShadow:hov?`0 0 14px ${bc}35`:`0 0 4px ${bc}10`}}>🏭</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
            {st.label !== 'OK' && <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:20,background:st.bg,border:`1px solid ${st.border}`,fontSize:'0.6rem',fontWeight:800,color:st.color,textTransform:'uppercase',letterSpacing:'0.06em',animation:st.label==='CRÍTICO'?'ins-pulse 1.4s infinite':'none'}}>{st.icon} {st.label}</span>}
            <span style={{display:'flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,background:`${FAB}15`,border:`1px solid ${FAB}35`,fontSize:'0.62rem',fontWeight:700,color:FAB,textTransform:'uppercase',letterSpacing:'0.05em'}}>
              <span style={{width:5,height:5,borderRadius:'50%',background:FAB,animation:'ins-pulse 2s infinite',display:'inline-block'}}/>
              {src === 'estoque' ? 'Estoque Central' : 'Fabricação'}
            </span>
          </div>
        </div>

        {/* Nome */}
        <div style={{fontFamily:'Orbitron,sans-serif',fontWeight:800,fontSize:'0.95rem',color:'#111827',marginBottom:2,letterSpacing:'.02em',minHeight:'2.4em',lineHeight:1.2,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any,overflow:'hidden',textOverflow:'ellipsis'}}>{item.nome}</div>
        <div style={{fontSize:'0.7rem',color:'#9CA3AF',marginBottom:12,fontFamily:'JetBrains Mono,monospace'}}>{item.codigoInterno??'—'} · {item.unidade}</div>

        {/* Saldo */}
        <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:6}}>
          <span style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,fontSize:'1.7rem',color:bc,filter:hov?`drop-shadow(0 0 8px ${bc}70)`:'none',transition:'filter .3s',animation:'ins-float 3s ease-in-out infinite'}}>
            {Number(item.quantidadeAtual).toLocaleString('pt-BR',{maximumFractionDigits:2})}
          </span>
          <span style={{fontSize:'0.72rem',color:'#9CA3AF',fontWeight:600}}>{item.unidade} · mín {Number(item.quantidadeMinima).toLocaleString('pt-BR',{maximumFractionDigits:2})}</span>
        </div>

        {/* Progress */}
        <div style={{height:6,background:'#F3F4F6',borderRadius:6,marginBottom:12,overflow:'hidden'}}>
          <div style={{height:6,width:`${Math.min(st.pct,100)}%`,background:`linear-gradient(90deg,${bc}99,${bc})`,borderRadius:6,transition:'width 0.8s ease',boxShadow:hov?`0 0 8px ${bc}60`:'none'}}/>
        </div>

        {/* Valor em estoque */}
        {preco > 0 && (
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,padding:'4px 10px',borderRadius:8,background:'linear-gradient(135deg,#FFFDE7,#FEF3C7)',border:'1px solid #FEF08A',width:'fit-content'}}>
            <span style={{fontSize:'0.62rem',fontWeight:800,color:'#B89B00',letterSpacing:'0.05em'}}>VALOR EM ESTOQUE</span>
            <span style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,fontSize:'0.82rem',color:'#7C5A00'}}>R$ {valorTotal.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
            <span style={{fontSize:'0.6rem',color:'#92400E',opacity:.75}}>({item.quantidadeAtual} × R${preco.toFixed(2).replace('.',',')})</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{position:'relative',zIndex:1,borderTop:`1px solid ${bc}15`,background:'rgba(0,0,0,.01)',padding:'10px 18px',display:'flex',gap:8,alignItems:'center'}}>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:2}}>
          <span style={{fontSize:'0.6rem',fontWeight:800,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.06em'}}>Saldo Atual</span>
          <span style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,fontSize:'0.95rem',color:bc}}>{item.quantidadeAtual.toLocaleString('pt-BR',{maximumFractionDigits:2})} {item.unidade}</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:2,textAlign:'right'}}>
          <span style={{fontSize:'0.6rem',fontWeight:800,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.06em'}}>Preço Unit.</span>
          <span style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,fontSize:'0.95rem',color:'#374151'}}>{preco>0?`R$ ${preco.toLocaleString('pt-BR',{minimumFractionDigits:2})}`:'—'}</span>
        </div>
      </div>
    </div>
  );
}

function InsumoTable({items}: {items: InsumoFabricacao[]}) {
  return (
    <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 80px 80px 110px 110px 90px',padding:'10px 20px',background:'#FFFDE7',borderBottom:'2px solid #FEF08A'}}>
        {['INSUMO','SALDO','MÍNIMO','STATUS','PREÇO UNIT.','ORIGEM'].map(h=>(
          <div key={h} style={{fontSize:'0.62rem',fontWeight:800,color:'#B89B00',textTransform:'uppercase',letterSpacing:'0.08em'}}>{h}</div>
        ))}
      </div>
      {items.length===0 ? (
        <div style={{padding:'48px',textAlign:'center',color:'#9CA3AF'}}>Nenhum item encontrado</div>
      ) : items.map((item,i)=>{
        const st = getStatus(item);
        const preco = Number(item.precoUnitario??0);
        const src = (item as any)._source as string | undefined;
        return (
          <div key={item.id} style={{display:'grid',gridTemplateColumns:'1fr 80px 80px 110px 110px 90px',padding:'14px 20px',borderBottom:i<items.length-1?'1px solid #F9FAFB':'none',alignItems:'center',borderLeft:`3px solid ${st.color}`,transition:'background .15s'}}
            onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='#FAFAFA'}
            onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
            <div>
              <div style={{fontWeight:700,fontSize:'0.85rem',color:'#111827'}}>{item.nome}</div>
              <div style={{fontSize:'0.68rem',color:'#9CA3AF',fontFamily:'JetBrains Mono,monospace'}}>{item.codigoInterno??'—'} · {item.unidade}</div>
              <div style={{marginTop:5,height:4,background:'#F3F4F6',borderRadius:4,maxWidth:160}}>
                <div style={{height:4,width:`${Math.min(st.pct,100)}%`,background:`linear-gradient(90deg,${st.color}99,${st.color})`,borderRadius:4}}/>
              </div>
            </div>
            <div style={{fontFamily:'Orbitron,sans-serif',fontWeight:700,fontSize:'0.8rem',color:st.color}}>{Number(item.quantidadeAtual).toLocaleString('pt-BR',{maximumFractionDigits:2})}</div>
            <div style={{fontFamily:'Orbitron,sans-serif',fontWeight:700,fontSize:'0.8rem',color:'#374151'}}>{Number(item.quantidadeMinima).toLocaleString('pt-BR',{maximumFractionDigits:2})}</div>
            <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:20,background:st.bg,border:`1px solid ${st.border}`,fontSize:'0.6rem',fontWeight:800,color:st.color,whiteSpace:'nowrap',width:'fit-content',justifySelf:'start'}}>{st.icon} {st.label}</span>
            <div style={{fontFamily:'Orbitron,sans-serif',fontWeight:800,fontSize:'0.8rem',color:'#B89B00'}}>{preco>0?`R$ ${preco.toLocaleString('pt-BR',{minimumFractionDigits:2})}`:'—'}</div>
            <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:20,background:src==='estoque'?'#EFF6FF':'#F5F3FF',border:`1px solid ${src==='estoque'?'#BFDBFE':'#DDD6FE'}`,fontSize:'0.58rem',fontWeight:700,color:src==='estoque'?'#1D4ED8':'#7C3AED',whiteSpace:'nowrap',width:'fit-content',justifySelf:'start'}}>
              {src==='estoque'?'🏪 Central':'🏭 Fab'}
            </span>
          </div>
        );
      })}
      <div style={{padding:'10px 20px',borderTop:'1px solid #F3F4F6',fontSize:'0.72rem',color:'#9CA3AF'}}>{items.length} item(ns)</div>
    </div>
  );
}

export default function InsumosPage() {
  const [insumos, setInsumos] = useState<InsumoFabricacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all'|'OK'|'BAIXO'|'CRITICO'|'ZERADO'>('all');
  const [view, setView] = useState<'cards'|'table'>('cards');

  useEffect(()=>{
    setLoading(true);
    fabricacaoApi.insumos.list().then(setInsumos).catch(()=>toast.error('Erro ao carregar insumos')).finally(()=>setLoading(false));
  },[]);

  const filtered = insumos.filter(i => {
    const matchSearch = !search || i.nome.toLowerCase().includes(search.toLowerCase()) || i.codigoInterno?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filterStatus === 'all') return true;
    const st = getStatus(i);
    if (filterStatus === 'CRITICO') return st.label === 'CRÍTICO' || st.label === 'ZERADO';
    if (filterStatus === 'BAIXO')   return st.label === 'BAIXO';
    if (filterStatus === 'ZERADO')  return st.label === 'ZERADO';
    if (filterStatus === 'OK')      return st.label === 'OK';
    return true;
  });

  const criticos = insumos.filter(i => { const st = getStatus(i); return st.label === 'CRÍTICO'; }).length;
  const baixos   = insumos.filter(i => { const st = getStatus(i); return st.label === 'BAIXO'; }).length;
  const zerados  = insumos.filter(i => { const st = getStatus(i); return st.label === 'ZERADO'; }).length;
  const ok       = insumos.filter(i => { const st = getStatus(i); return st.label === 'OK'; }).length;

  const ST_OPTS: [string,string][] = [
    ['all','Todos'],['OK','✅ OK'],['BAIXO','⚡ Baixo'],['CRITICO','⚠️ Crítico'],['ZERADO','🚨 Zerado'],
  ];

  return (
    <>
      <style>{CSS}</style>
      <div style={{display:'flex',flexDirection:'column',gap:'1.5rem'}} className="animate-fade-in">
        <AdminHeaderHero title="MATERIAIS DE FABRICAÇÃO" subtitle="Catálogo completo — estoque próprio + central (MATERIAL_FABRICACAO)" badge={`${insumos.length} ${insumos.length===1?'item':'itens'}`}/>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'0.85rem'}}>
          <AnimatedKpiCard label="Total" value={insumos.length} sub="cadastrados" color="#0891B2" bg="#F0F9FF" border="#BAE6FD" icon={<span>📦</span>}/>
          <AnimatedKpiCard label="Críticos" value={criticos} sub="≤ 50% mínimo" color={criticos>0?'#DC2626':'#059669'} bg={criticos>0?'#FEF2F2':'#F0FDF4'} border={criticos>0?'#FECACA':'#BBF7D0'} icon={<span>🚨</span>} delayMs={40}/>
          <AnimatedKpiCard label="Baixos" value={baixos} sub="abaixo mínimo" color={baixos>0?'#D97706':'#059669'} bg={baixos>0?'#FFFBEB':'#F0FDF4'} border={baixos>0?'#FDE68A':'#BBF7D0'} icon={<span>⚠️</span>} delayMs={80}/>
          <AnimatedKpiCard label="Zerados" value={zerados} sub="sem estoque" color={zerados>0?'#991B1B':'#059669'} bg={zerados>0?'#FEF2F2':'#F0FDF4'} border={zerados>0?'#FECACA':'#BBF7D0'} icon={<span>🪫</span>} delayMs={120}/>
          <AnimatedKpiCard label="Regulares" value={ok} sub="estoque OK" color="#059669" bg="#F0FDF4" border="#BBF7D0" icon={<span>✅</span>} delayMs={160}/>
        </div>

        {/* Filtros + Toggle */}
        <div style={{background:'#FFFFFF',border:'1px solid #E5E7EB',borderRadius:14,padding:'14px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.05)',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar insumo ou código..." style={{padding:'6px 12px',borderRadius:9,border:'1px solid #E5E7EB',fontSize:'0.78rem',color:'#111827',outline:'none',background:'#FAFAFA',width:220}}/>
          {ST_OPTS.map(([v,l])=>(
            <button key={v} onClick={()=>setFilterStatus(v as any)} style={{padding:'6px 12px',borderRadius:9,border:`1px solid ${filterStatus===v?FAB:'#E5E7EB'}`,background:filterStatus===v?`${FAB}15`:'#FAFAFA',color:filterStatus===v?FAB:'#6B7280',fontSize:'0.72rem',fontWeight:filterStatus===v?800:600,cursor:'pointer',transition:'all .2s'}}>{l}</button>
          ))}
          <span style={{fontSize:'0.72rem',color:'#9CA3AF',marginLeft:'auto'}}>{filtered.length} {filtered.length===1?'item':'itens'}</span>
          {/* Toggle */}
          <div style={{display:'flex',background:'#F3F4F6',borderRadius:999,padding:3,gap:2}}>
            <button onClick={()=>setView('cards')} style={{padding:'6px 16px',borderRadius:999,border:'none',background:view==='cards'?'#111827':'transparent',color:view==='cards'?FAB:'#6B7280',fontSize:'0.72rem',fontWeight:800,cursor:'pointer',letterSpacing:'0.06em',textTransform:'uppercase',transition:'all .2s',fontFamily:'Orbitron,sans-serif'}}>CARTÕES</button>
            <button onClick={()=>setView('table')} style={{padding:'6px 16px',borderRadius:999,border:'none',background:view==='table'?'#111827':'transparent',color:view==='table'?FAB:'#6B7280',fontSize:'0.72rem',fontWeight:800,cursor:'pointer',letterSpacing:'0.06em',textTransform:'uppercase',transition:'all .2s',fontFamily:'Orbitron,sans-serif'}}>TABELA</button>
          </div>
        </div>

        {/* Banner críticos/baixos */}
        {(criticos>0||baixos>0||zerados>0)&&filterStatus==='all'&&(
          <button onClick={()=>setFilterStatus(zerados>0?'ZERADO':criticos>0?'CRITICO':'BAIXO')} style={{display:'flex',alignItems:'center',gap:12,padding:'0.9rem 1.2rem',borderRadius:12,background:'linear-gradient(135deg,#FEF2F2,#FEE2E2)',border:'1.5px solid #FECACA',cursor:'pointer',textAlign:'left'}}>
            <span style={{fontSize:'1.3rem'}}>{zerados>0?'🚨':'⚠️'}</span>
            <div style={{flex:1}}><div style={{fontWeight:800,fontSize:'0.85rem',color:'#DC2626'}}>{zerados+criticos+baixos} {(zerados+criticos+baixos)===1?'material exige':'materiais exigem'} atenção</div><div style={{fontSize:'0.72rem',color:'#991B1B',marginTop:2}}>Clique para filtrar e revisar</div></div>
            <span style={{fontSize:'1.2rem',color:'#DC2626'}}>→</span>
          </button>
        )}

        {/* Conteúdo */}
        {loading ? (
          <div style={{padding:'64px 0',textAlign:'center',color:'#9CA3AF'}}>Carregando...</div>
        ) : view==='cards' ? (
          filtered.length===0 ? (
            <div style={{textAlign:'center',padding:'3rem 1rem'}}>
              <div style={{fontSize:'3rem',marginBottom:12,animation:'ins-float 3s ease-in-out infinite'}}>🏭</div>
              <p style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.72rem',letterSpacing:'.15em',color:'#9CA3AF',marginBottom:8}}>NENHUM MATERIAL ENCONTRADO</p>
              <p style={{fontSize:'0.78rem',color:'#6B7280',maxWidth:360,margin:'0 auto'}}>Cadastre itens no estoque central com a categoria <strong>Materiais para Fabricação</strong>.</p>
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:'1.25rem'}}>
              {filtered.map((item,i)=><InsumoCard key={item.id} item={item} index={i}/>)}
            </div>
          )
        ) : (
          <InsumoTable items={filtered}/>
        )}
      </div>
    </>
  );
}
