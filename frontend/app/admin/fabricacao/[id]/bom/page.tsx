'use client';

import { useEffect, useState } from 'react';
import { fabricacaoApi, BomItem } from '@/lib/api/fabricacao';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { toast } from '@/components/ui/Toast';

const CSS = `
@keyframes bom-scan{0%,100%{top:0;opacity:.6}50%{top:100%;opacity:.2}}
@keyframes bom-grid{0%,100%{opacity:.08}50%{opacity:.18}}
@keyframes bom-ring{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes bom-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}
@keyframes bom-slide{from{transform:translateX(-8px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes bom-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
`;

const FAB = '#F59E0B';
type BomStatus = 'OK'|'ATENCAO'|'EXCEDIDO'|'ZERADO';
const ST_META:Record<BomStatus,{label:string;color:string;bg:string;border:string;icon:string}> = {
  OK:      {label:'OK',      color:'#059669',bg:'#F0FDF4',border:'#BBF7D0',icon:'✅'},
  ATENCAO: {label:'Atenção', color:'#D97706',bg:'#FFFBEB',border:'#FDE68A',icon:'⚠️'},
  EXCEDIDO:{label:'Excedido',color:'#DC2626',bg:'#FEF2F2',border:'#FECACA',icon:'🚨'},
  ZERADO:  {label:'S/ Min',  color:'#6B7280',bg:'#F9FAFB',border:'#E5E7EB',icon:'◌'},
};
function getStatus(prev:number,real:number):BomStatus{
  if(prev===0) return 'ZERADO';
  const p=real/prev;
  if(p>=1) return 'EXCEDIDO';
  if(p>=0.8) return 'ATENCAO';
  return 'OK';
}

function BomCard({item,index}:{item:BomItem;index:number}){
  const [hov,setHov]=useState(false);
  const prev=Number(item.quantidadePrevista);
  const real=Number(item.quantidadeRealizada??item.quantidadeConsumida??0);
  const pct=prev>0?Math.min((real/prev)*100,100):0;
  const st=getStatus(prev,real);
  const meta=ST_META[st];
  const preco=Number(item.insumo?.precoUnitario??0);
  const custo=real*preco;
  const un=item.insumo?.unidadeMedida??item.insumo?.unidade??'un';
  const bc=st==='EXCEDIDO'?'#DC2626':st==='ATENCAO'?'#D97706':FAB;
  // Estoque REAL do Central — nunca usa previsto - consumido
  const estoqueAtual = Number(item.insumo?.quantidadeAtual ?? Math.max(prev - real, 0));
  return(
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{position:'relative',overflow:'hidden',borderRadius:20,background:'#fff',borderStyle:'solid',borderWidth:'1px 1px 1px 4px',borderTopColor:hov?`${bc}55`:`${bc}20`,borderRightColor:hov?`${bc}55`:`${bc}20`,borderBottomColor:hov?`${bc}55`:`${bc}20`,borderLeftColor:bc,boxShadow:hov?`0 0 24px ${bc}18,0 12px 32px rgba(0,0,0,.1)`:'0 2px 8px rgba(0,0,0,.06)',transition:'all .3s cubic-bezier(.175,.885,.32,1.275)',transform:hov?'perspective(800px) rotateX(-2deg) rotateY(2deg) translateY(-5px)':'none',animation:`bom-slide 0.5s ${index*40}ms both`,display:'flex',flexDirection:'column'}}>
      <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:`linear-gradient(${bc}05 1px,transparent 1px),linear-gradient(90deg,${bc}05 1px,transparent 1px)`,backgroundSize:'28px 28px',animation:'bom-grid 5s ease-in-out infinite'}}/>
      <div style={{position:'absolute',left:0,right:0,height:1.5,background:`linear-gradient(90deg,transparent,${bc}40,transparent)`,animation:'bom-scan 4.5s ease-in-out infinite',pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${bc},transparent)`,opacity:hov?.9:.4,transition:'opacity .3s'}}/>
      <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,border:`1px solid ${bc}14`,borderRadius:'50%',animation:'bom-ring 12s linear infinite',pointerEvents:'none'}}/>
      <div style={{position:'relative',zIndex:1,padding:'18px 18px 14px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div style={{width:48,height:48,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',background:`linear-gradient(135deg,${bc}22,${bc}06)`,border:`1px solid ${bc}35`,boxShadow:hov?`0 0 14px ${bc}35`:`0 0 4px ${bc}10`}}>🏭</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:20,background:meta.bg,border:`1px solid ${meta.border}`,fontSize:'0.6rem',fontWeight:800,color:meta.color,textTransform:'uppercase',letterSpacing:'0.06em',animation:st==='EXCEDIDO'?'bom-pulse 1.4s infinite':'none'}}>{meta.icon} {meta.label}</span>
            <span style={{display:'flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,background:`${FAB}15`,border:`1px solid ${FAB}35`,fontSize:'0.62rem',fontWeight:700,color:FAB,textTransform:'uppercase',letterSpacing:'0.05em'}}><span style={{width:5,height:5,borderRadius:'50%',background:FAB,animation:'bom-pulse 2s infinite',display:'inline-block'}}/>Fabricação</span>
          </div>
        </div>
        <div style={{fontFamily:'Orbitron,sans-serif',fontWeight:800,fontSize:'0.95rem',color:'#111827',marginBottom:2,letterSpacing:'.02em',minHeight:'2.4em',lineHeight:1.2,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any,overflow:'hidden',textOverflow:'ellipsis'}}>{item.insumo?.nome||'—'}</div>
        <div style={{fontSize:'0.7rem',color:'#9CA3AF',marginBottom:12,fontFamily:'JetBrains Mono,monospace'}}>{item.insumo?.codigoInterno??'—'} · {un}</div>
        <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:6}}>
          <span style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,fontSize:'1.7rem',color:bc,filter:hov?`drop-shadow(0 0 8px ${bc}70)`:'none',transition:'filter .3s',animation:'bom-float 3s ease-in-out infinite'}}>{real.toLocaleString('pt-BR',{maximumFractionDigits:2})}</span>
          <span style={{fontSize:'0.72rem',color:'#9CA3AF',fontWeight:600}}>{un} consumido · prev. {prev.toLocaleString('pt-BR',{maximumFractionDigits:2})}</span>
        </div>
        <div style={{height:6,background:'#F3F4F6',borderRadius:6,marginBottom:12,overflow:'hidden'}}>
          <div style={{height:6,width:`${pct}%`,background:`linear-gradient(90deg,${bc}99,${bc})`,borderRadius:6,transition:'width 0.8s ease',boxShadow:hov?`0 0 8px ${bc}60`:'none'}}/>
        </div>
        {custo>0&&<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,padding:'4px 10px',borderRadius:8,background:'linear-gradient(135deg,#FFFDE7,#FEF3C7)',border:'1px solid #FEF08A',width:'fit-content'}}><span style={{fontSize:'0.62rem',fontWeight:800,color:'#B89B00',letterSpacing:'0.05em'}}>CUSTO REAL</span><span style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,fontSize:'0.82rem',color:'#7C5A00'}}>R$ {custo.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>}
      </div>
      <div style={{position:'relative',zIndex:1,borderTop:`1px solid ${bc}15`,background:'rgba(0,0,0,.01)',padding:'10px 18px',display:'flex',gap:8,alignItems:'center'}}>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:2}}><span style={{fontSize:'0.6rem',fontWeight:800,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.06em'}}>Consumo</span><span style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,fontSize:'0.95rem',color:bc}}>{prev>0?Math.round((real/prev)*100):0}%</span></div>
        <div style={{display:'flex',flexDirection:'column',gap:2}}>
          <span style={{fontSize:'0.6rem',fontWeight:800,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.06em'}}>Disponível (Central)</span>
          <span style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,fontSize:'0.95rem',color: estoqueAtual <= 0 ? '#DC2626' : estoqueAtual < Number(item.insumo?.quantidadeMinima??0) ? '#D97706' : '#374151'}}>
            {estoqueAtual.toLocaleString('pt-BR',{maximumFractionDigits:2})} {un}
          </span>
        </div>
      </div>
    </div>
  );
}

function BomTable({items}:{items:BomItem[]}){
  return(
    <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 90px 90px 120px 110px 110px',padding:'10px 20px',background:'#FFFDE7',borderBottom:'2px solid #FEF08A'}}>
        {['INSUMO','CONSUMIDO','PREVISTO','DISPONÍVEL (CENTRAL)','CUSTO REAL','STATUS'].map(h=>(
          <div key={h} style={{fontSize:'0.62rem',fontWeight:800,color:'#B89B00',textTransform:'uppercase',letterSpacing:'0.08em'}}>{h}</div>
        ))}
      </div>
      {items.length===0?<div style={{padding:'48px',textAlign:'center',color:'#9CA3AF'}}>Nenhum item encontrado</div>:items.map((item,i)=>{
        const prev=Number(item.quantidadePrevista);
        const real=Number(item.quantidadeRealizada??item.quantidadeConsumida??0);
        const pct=prev>0?Math.round((real/prev)*100):0;
        const st=getStatus(prev,real);
        const meta=ST_META[st];
        const preco=Number(item.insumo?.precoUnitario??0);
        const custo=real*preco;
        const un=item.insumo?.unidadeMedida??item.insumo?.unidade??'un';
        const bc=st==='EXCEDIDO'?'#DC2626':st==='ATENCAO'?'#D97706':FAB;
        // Estoque real do Central
        const estoqueAtual = Number(item.insumo?.quantidadeAtual ?? Math.max(prev - real, 0));
        const estoqueColor = estoqueAtual <= 0 ? '#DC2626' : estoqueAtual < Number(item.insumo?.quantidadeMinima ?? 0) ? '#D97706' : '#374151';
        return(
          <div key={item.id} style={{display:'grid',gridTemplateColumns:'1fr 90px 90px 120px 110px 110px',padding:'14px 20px',borderBottom:i<items.length-1?'1px solid #F9FAFB':'none',alignItems:'center',borderLeft:`3px solid ${bc}`,transition:'background .15s'}} onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='#FAFAFA'} onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
            <div>
              <div style={{fontWeight:700,fontSize:'0.85rem',color:'#111827'}}>{item.insumo?.nome||'—'}</div>
              <div style={{fontSize:'0.68rem',color:'#9CA3AF',fontFamily:'JetBrains Mono,monospace'}}>{item.insumo?.codigoInterno??'—'} · {un}</div>
              <div style={{marginTop:5,height:4,background:'#F3F4F6',borderRadius:4,maxWidth:160}}><div style={{height:4,width:`${Math.min(pct,100)}%`,background:`linear-gradient(90deg,${bc}99,${bc})`,borderRadius:4}}/></div>
            </div>
            <div style={{fontFamily:'Orbitron,sans-serif',fontWeight:700,fontSize:'0.8rem',color:bc}}>{real.toLocaleString('pt-BR',{maximumFractionDigits:2})}</div>
            <div style={{fontFamily:'Orbitron,sans-serif',fontWeight:700,fontSize:'0.8rem',color:'#374151'}}>{prev.toLocaleString('pt-BR',{maximumFractionDigits:2})}</div>
            <div style={{fontFamily:'Orbitron,sans-serif',fontWeight:800,fontSize:'0.85rem',color:estoqueColor}}>
              {estoqueAtual.toLocaleString('pt-BR',{maximumFractionDigits:2})} {un}
            </div>
            <div style={{fontSize:'0.78rem',fontWeight:700,color:'#7C5A00'}}>{custo>0?`R$ ${custo.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'—'}</div>
            <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:20,background:meta.bg,border:`1px solid ${meta.border}`,fontSize:'0.6rem',fontWeight:800,color:meta.color,whiteSpace:'nowrap',width:'fit-content',justifySelf:'start'}}>{meta.icon} {meta.label}</span>
          </div>
        );
      })}
      <div style={{padding:'10px 20px',borderTop:'1px solid #F3F4F6',fontSize:'0.72rem',color:'#9CA3AF'}}>{items.length} item(ns)</div>
    </div>
  );
}

export default function BomPage({params}:{params:{id:string}}){
  const [bom,setBom]=useState<BomItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [filterStatus,setFilterStatus]=useState<'all'|BomStatus>('all');
  const [view,setView]=useState<'cards'|'table'>('cards');

  useEffect(()=>{
    setLoading(true);
    fabricacaoApi.bom.list(params.id).then(setBom).catch(()=>{setBom([]);toast.error('Erro ao carregar lista de materiais');}).finally(()=>setLoading(false));
  },[params.id]);

  const filtered=bom.filter(b=>{
    const nome=b.insumo?.nome?.toLowerCase()??'';
    const cod=b.insumo?.codigoInterno?.toLowerCase()??'';
    const matchSearch=!search||nome.includes(search.toLowerCase())||cod.includes(search.toLowerCase());
    const st=getStatus(Number(b.quantidadePrevista),Number(b.quantidadeRealizada??b.quantidadeConsumida??0));
    return matchSearch&&(filterStatus==='all'||st===filterStatus);
  });

  const totalPrev=bom.reduce((a,b)=>a+Number(b.quantidadePrevista),0);
  const totalReal=bom.reduce((a,b)=>a+Number(b.quantidadeRealizada??b.quantidadeConsumida??0),0);
  const pctGeral=totalPrev>0?Math.round((totalReal/totalPrev)*100):0;
  const custo=bom.reduce((a,b)=>{const r=Number(b.quantidadeRealizada??b.quantidadeConsumida??0);return a+r*Number(b.insumo?.precoUnitario??0);},0);
  const pendentes = bom.filter(b => {
    const prev = Number(b.quantidadePrevista);
    const real = Number(b.quantidadeRealizada ?? b.quantidadeConsumida ?? 0);
    return prev > 0 && real > 0 && real < prev; // consumo iniciado mas incompleto
  }).length;
  const naoIniciados = bom.filter(b => Number(b.quantidadeRealizada ?? b.quantidadeConsumida ?? 0) === 0).length;
  const excedidos=bom.filter(b=>{const p=Number(b.quantidadePrevista),r=Number(b.quantidadeRealizada??b.quantidadeConsumida??0);return p>0&&r>=p;}).length;

  const ST_OPTS:[string,string][]=[['all','Todos'],['OK','✅ OK'],['ATENCAO','⚠️ Atenção'],['EXCEDIDO','🚨 Excedido'],['ZERADO','◌ Sem Mínimo']];

  return(
    <>
      <style>{CSS}</style>
      <div style={{display:'flex',flexDirection:'column',gap:'1.5rem'}} className="animate-fade-in">
        <AdminHeaderHero title="LISTA DE MATERIAIS" subtitle="Materiais para fabricação — previstos vs. consumidos na ordem" badge={`${bom.length} ${bom.length===1?'item':'itens'}`}/>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'0.85rem'}}>
          <AnimatedKpiCard label="Itens" value={bom.length} sub="materiais" color="#0891B2" bg="#F0F9FF" border="#BAE6FD" icon={<span>📋</span>}/>
          <AnimatedKpiCard label="Consumo" value={pctGeral} suffix="%" sub="realizado" color={pctGeral>=100?'#DC2626':pctGeral>=80?'#D97706':'#059669'} bg={pctGeral>=100?'#FEF2F2':pctGeral>=80?'#FFFBEB':'#F0FDF4'} border={pctGeral>=100?'#FECACA':pctGeral>=80?'#FDE68A':'#BBF7D0'} icon={<span>📊</span>} delayMs={60}/>
          <AnimatedKpiCard label="Custo Real" value={0} displayValue={`R$${(custo/1000).toFixed(1)}k`} sub="acumulado" color="#B89B00" bg="#FFFDE7" border="#FEF08A" icon={<span>💰</span>} delayMs={120}/>
          <AnimatedKpiCard label="Pendentes" value={pendentes} sub="consumo parcial" color="#D97706" bg="#FFFBEB" border="#FDE68A" icon={<span>⏳</span>} delayMs={180}/>
          {naoIniciados > 0 && <AnimatedKpiCard label="Não Iniciados" value={naoIniciados} sub="sem consumo ainda" color="#6B7280" bg="#F9FAFB" border="#E5E7EB" icon={<span>◌</span>} delayMs={220}/>}
          {excedidos>0&&<AnimatedKpiCard label="Excedidos" value={excedidos} sub="acima do previsto" color="#DC2626" bg="#FEF2F2" border="#FECACA" icon={<span>🚨</span>} delayMs={240}/>}
        </div>

        {/* Filtros + Toggle */}
        <div style={{background:'#FFFFFF',border:'1px solid #E5E7EB',borderRadius:14,padding:'14px 18px',boxShadow:'0 1px 4px rgba(0,0,0,.05)',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar insumo, código..." style={{padding:'6px 12px',borderRadius:9,border:'1px solid #E5E7EB',fontSize:'0.78rem',color:'#111827',outline:'none',background:'#FAFAFA',width:220}}/>

          {/* Filtros status */}
          {ST_OPTS.map(([v,l])=>(
            <button key={v} onClick={()=>setFilterStatus(v as any)} style={{padding:'6px 12px',borderRadius:9,border:`1px solid ${filterStatus===v?FAB:'#E5E7EB'}`,background:filterStatus===v?`${FAB}15`:'#FAFAFA',color:filterStatus===v?FAB:'#6B7280',fontSize:'0.72rem',fontWeight:filterStatus===v?800:600,cursor:'pointer',transition:'all .2s'}}>{l}</button>
          ))}

          <span style={{fontSize:'0.72rem',color:'#9CA3AF',marginLeft:'auto'}}>{filtered.length} {filtered.length===1?'item':'itens'}</span>

          {/* Toggle CARTÕES / TABELA */}
          <div style={{display:'flex',background:'#F3F4F6',borderRadius:999,padding:3,gap:2}}>
            <button onClick={()=>setView('cards')} style={{padding:'6px 16px',borderRadius:999,border:'none',background:view==='cards'?'#111827':'transparent',color:view==='cards'?FAB:'#6B7280',fontSize:'0.72rem',fontWeight:800,cursor:'pointer',letterSpacing:'0.06em',textTransform:'uppercase',transition:'all .2s',fontFamily:'Orbitron,sans-serif'}}>CARTÕES</button>
            <button onClick={()=>setView('table')} style={{padding:'6px 16px',borderRadius:999,border:'none',background:view==='table'?'#111827':'transparent',color:view==='table'?FAB:'#6B7280',fontSize:'0.72rem',fontWeight:800,cursor:'pointer',letterSpacing:'0.06em',textTransform:'uppercase',transition:'all .2s',fontFamily:'Orbitron,sans-serif'}}>TABELA</button>
          </div>
        </div>

        {/* Banner excedidos */}
        {excedidos>0&&(
          <button onClick={()=>setFilterStatus('EXCEDIDO')} style={{display:'flex',alignItems:'center',gap:12,padding:'0.9rem 1.2rem',borderRadius:12,background:'linear-gradient(135deg,#FEF2F2,#FEE2E2)',border:'1.5px solid #FECACA',cursor:'pointer',textAlign:'left'}}>
            <span style={{fontSize:'1.3rem'}}>🚨</span>
            <div style={{flex:1}}><div style={{fontWeight:800,fontSize:'0.85rem',color:'#DC2626'}}>{excedidos} {excedidos===1?'material excedeu':'materiais excederam'} o consumo previsto</div><div style={{fontSize:'0.72rem',color:'#991B1B',marginTop:2}}>Clique para filtrar e revisar</div></div>
            <span style={{fontSize:'1.2rem',color:'#DC2626'}}>→</span>
          </button>
        )}

        {/* Conteúdo */}
        {loading?(
          <div style={{padding:'64px 0',textAlign:'center',color:'#9CA3AF'}}>Carregando...</div>
        ):view==='cards'?(
          filtered.length===0?(
            <div style={{textAlign:'center',padding:'3rem 1rem'}}>
              <div style={{fontSize:'3rem',marginBottom:12,animation:'bom-float 3s ease-in-out infinite'}}>🏭</div>
              <p style={{fontFamily:'Orbitron,sans-serif',fontSize:'0.72rem',letterSpacing:'.15em',color:'#9CA3AF',marginBottom:8}}>NENHUM MATERIAL ENCONTRADO</p>
              <p style={{fontSize:'0.78rem',color:'#6B7280',maxWidth:360,margin:'0 auto'}}>Cadastre itens no estoque central com a categoria <strong>Materiais para Fabricação</strong>.</p>
            </div>
          ):(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:'1.25rem'}}>
              {filtered.map((item,i)=><BomCard key={item.id} item={item} index={i}/>)}
            </div>
          )
        ):(
          <BomTable items={filtered}/>
        )}
      </div>
    </>
  );
}
