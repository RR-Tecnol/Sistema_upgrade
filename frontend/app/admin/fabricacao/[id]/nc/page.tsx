'use client';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { fabricacaoApi } from '@/lib/api/fabricacao';
import { toast } from '@/components/ui/Toast';

function Modal({ children, zIndex = 1000 }: { children: React.ReactNode; zIndex?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'auto' }}>
      {children}
    </div>,
    document.body
  );
}

const TIPO_LABEL: Record<string,string> = {
  DANO_ESTRUTURAL_DESCOBERTO:'Dano Estrutural',
  DESVIO_DIMENSIONAL:'Desvio Dimensional',
  DEFEITO_MATERIAL:'Defeito de Material',
  ATRASO_ENTREGA_INSUMO:'Atraso de Insumo',
  DEFEITO_EQUIPAMENTO_INSTALADO:'Defeito de Equipamento',
  ACIDENTE_TRABALHO:'Acidente de Trabalho',
  OUTRO:'Outro',
};
const TIPO_COLOR: Record<string,string> = {
  DANO_ESTRUTURAL_DESCOBERTO:'#DC2626',DESVIO_DIMENSIONAL:'#D97706',
  DEFEITO_MATERIAL:'#7C3AED',ATRASO_ENTREGA_INSUMO:'#0891B2',
  DEFEITO_EQUIPAMENTO_INSTALADO:'#EA580C',ACIDENTE_TRABALHO:'#991B1B',OUTRO:'#6B7280',
};
const STATUS_CFG: Record<string,{label:string;color:string;bg:string;border:string}> = {
  ABERTA:       {label:'Aberta',      color:'#DC2626',bg:'#FEF2F2',border:'#FECACA'},
  EM_TRATATIVA: {label:'Em Tratativa',color:'#D97706',bg:'#FFFBEB',border:'#FDE68A'},
  RESOLVIDA:    {label:'Resolvida',   color:'#059669',bg:'#F0FDF4',border:'#BBF7D0'},
  CANCELADA:    {label:'Cancelada',   color:'#6B7280',bg:'#F9FAFB',border:'#E5E7EB'},
};
const TIPOS = ['DANO_ESTRUTURAL_DESCOBERTO','DESVIO_DIMENSIONAL','DEFEITO_MATERIAL','ATRASO_ENTREGA_INSUMO','DEFEITO_EQUIPAMENTO_INSTALADO','ACIDENTE_TRABALHO','OUTRO'];

const initForm = {descricao:'',tipo:'DANO_ESTRUTURAL_DESCOBERTO',bloqueiaProducao:false,impactoFinanceiro:'',impactoDias:'',acaoCorretiva:''};

export default function NcPage({params}:{params:{id:string}}) {
  const [ncs,setNcs]         = useState<any[]>([]);
  const [loading,setLoading] = useState(true);
  const [modal,setModal]     = useState(false);
  const [resolveModal,setResolveModal] = useState<any|null>(null);
  const [form,setForm]       = useState(initForm);
  const [resolveForm,setResolveForm] = useState({resolucao:'',status:'RESOLVIDA'});
  const [saving,setSaving]   = useState(false);

  // Bloqueia scroll do body quando qualquer modal está aberto
  useEffect(()=>{
    const anyOpen = modal || !!resolveModal;
    document.body.style.overflow = anyOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modal, resolveModal]);

  const load = async()=>{
    try{setNcs(await fabricacaoApi.ncs.list(params.id));}
    catch{setNcs([]);}finally{setLoading(false);}
  };
  useEffect(()=>{load();},[params.id]);

  const handleCreate = async()=>{
    if(!form.descricao.trim())return;
    setSaving(true);
    try{
      await fabricacaoApi.ncs.create(params.id,{
        descricao:form.descricao,tipo:form.tipo as any,bloqueiaProducao:form.bloqueiaProducao,
        impactoFinanceiro:form.impactoFinanceiro?Number(form.impactoFinanceiro):undefined,
        impactoDias:form.impactoDias?Number(form.impactoDias):undefined,
        acaoCorretiva:form.acaoCorretiva||undefined,
      });
      toast.success('NC registrada!');setModal(false);setForm(initForm);load();
    }catch{toast.error('Erro ao registrar NC');}finally{setSaving(false);}
  };

  const handleResolve = async()=>{
    if(!resolveModal||!resolveForm.resolucao.trim())return;
    setSaving(true);
    try{
      await fabricacaoApi.ncs.resolver(params.id,resolveModal.id,{resolucao:resolveForm.resolucao,status:resolveForm.status});
      toast.success('NC atualizada!');setResolveModal(null);setResolveForm({resolucao:'',status:'RESOLVIDA'});load();
    }catch{toast.error('Erro ao resolver NC');}finally{setSaving(false);}
  };

  const abertas    = ncs.filter(n=>n.status==='ABERTA').length;
  const tratativas = ncs.filter(n=>n.status==='EM_TRATATIVA').length;
  const resolvidas = ncs.filter(n=>n.status==='RESOLVIDA').length;
  const bloqueantes= ncs.filter(n=>n.bloqueiaProducao&&n.status==='ABERTA').length;
  const impactoTotal = ncs.reduce((a,n)=>a+Number(n.impactoFinanceiro??0),0);

  const fmt = (v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0});
  const fmtDate = (d:string)=>new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
  const fmtTime = (d:string)=>new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});

  const inputStyle:React.CSSProperties = {width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #E5E7EB',background:'#F9FAFB',fontSize:'0.85rem',color:'#111827',outline:'none',fontFamily:'Inter,sans-serif'};
  const labelStyle:React.CSSProperties = {fontSize:'0.68rem',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:6};

  return(
    <div style={{display:'flex',flexDirection:'column',gap:'1.35rem'}} className="animate-fade-in">
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}@keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}.nc-card{animation:slideIn 0.3s ease}`}</style>

      <AdminHeaderHero title="NÃO-CONFORMIDADES" subtitle="Registro, rastreabilidade e controle de qualidade da OF"
        rightSlot={
          <button onClick={()=>setModal(true)} style={{padding:'10px 22px',borderRadius:10,background:'linear-gradient(135deg,#FFD600,#E5B800)',color:'#0F172A',fontWeight:800,fontSize:'0.82rem',fontFamily:'Orbitron,sans-serif',border:'none',cursor:'pointer',boxShadow:'0 4px 14px rgba(255,214,0,0.35)'}}>
            + REGISTRAR NC
          </button>
        }
      />

      {bloqueantes>0&&(
        <div style={{background:'linear-gradient(135deg,#FEF2F2,#FEE2E2)',border:'2px solid #DC2626',borderRadius:16,padding:'16px 24px',display:'flex',alignItems:'center',gap:16,animation:'pulse 1.2s infinite',boxShadow:'0 4px 20px rgba(220,38,38,0.2)'}}>
          <div style={{width:48,height:48,background:'#DC2626',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',flexShrink:0}}>🚨</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,color:'#DC2626',fontSize:'0.85rem',letterSpacing:'0.08em'}}>ANDON ATIVO — PRODUÇÃO BLOQUEADA</div>
            <div style={{fontSize:'0.72rem',color:'#B91C1C',marginTop:3}}>{bloqueantes} NC{bloqueantes>1?'s':''} bloqueante{bloqueantes>1?'s':''} impedem o avanço desta ordem. Resolva para liberar a linha.</div>
          </div>
          <div style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,color:'#DC2626',fontSize:'1.4rem'}}>{bloqueantes}</div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'0.85rem'}}>
        <AnimatedKpiCard label="Abertas"      value={abertas}    sub="aguardando" color="#DC2626" bg="#FEF2F2" border="#FECACA" icon={<span>🔴</span>}/>
        <AnimatedKpiCard label="Em Tratativa" value={tratativas} sub="em andamento" color="#D97706" bg="#FFFBEB" border="#FDE68A" icon={<span>🔧</span>} delayMs={60}/>
        <AnimatedKpiCard label="Resolvidas"   value={resolvidas} sub="encerradas" color="#059669" bg="#F0FDF4" border="#BBF7D0" icon={<span>✅</span>} delayMs={120}/>
        <AnimatedKpiCard label="Bloqueantes"  value={bloqueantes} sub="ANDON ativo" color={bloqueantes>0?'#DC2626':'#059669'} bg={bloqueantes>0?'#FEF2F2':'#F0FDF4'} border={bloqueantes>0?'#FECACA':'#BBF7D0'} icon={<span>🚨</span>} delayMs={180}/>
        <AnimatedKpiCard label="Impacto $"    value={0} displayValue={fmt(impactoTotal)} sub="estimado" color="#7C3AED" bg="#F5F3FF" border="#DDD6FE" icon={<span>💸</span>} delayMs={240}/>
      </div>

      {loading?(
        <div style={{padding:'60px 0',textAlign:'center',color:'#9CA3AF'}}>
          <div style={{width:36,height:36,border:'3px solid #FFD600',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.75s linear infinite',margin:'0 auto 12px'}}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          Carregando não-conformidades...
        </div>
      ):ncs.length===0?(
        <div style={{background:'#FFFFFF',border:'1px solid #E5E7EB',borderRadius:16,padding:'60px 0',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
          <div style={{fontSize:'2.5rem',marginBottom:12}}>✅</div>
          <div style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,color:'#059669',fontSize:'0.82rem',letterSpacing:'0.08em',marginBottom:8}}>ZERO NÃO-CONFORMIDADES</div>
          <div style={{fontSize:'0.82rem',color:'#9CA3AF'}}>Esta ordem não possui NCs registradas — excelente controle de qualidade!</div>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {ncs.map((nc,idx)=>{
            const cfg = STATUS_CFG[nc.status]??STATUS_CFG.CANCELADA;
            const tc  = TIPO_COLOR[nc.tipo]??'#6B7280';
            const tl  = TIPO_LABEL[nc.tipo]??nc.tipo;
            const canResolve = nc.status==='ABERTA'||nc.status==='EM_TRATATIVA';
            return(
              <div key={nc.id} className="nc-card" style={{background:'#FFFFFF',border:`1px solid ${nc.bloqueiaProducao&&nc.status==='ABERTA'?'#FECACA':'#E5E7EB'}`,borderRadius:16,overflow:'hidden',boxShadow:`0 2px 8px rgba(0,0,0,0.06)${nc.bloqueiaProducao&&nc.status==='ABERTA'?',0 0 0 2px #FCA5A5':''}`,transition:'box-shadow 0.2s'}}>
                {/* Top stripe */}
                <div style={{height:4,background:`linear-gradient(90deg,${tc},${tc}60)`}}/>
                <div style={{padding:'18px 20px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
                    <div style={{flex:1,minWidth:0}}>
                      {/* Header row */}
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
                        <span style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,color:'#9CA3AF',fontSize:'0.6rem',letterSpacing:'0.1em'}}>{nc.codigo}</span>
                        <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:'0.62rem',color:tc,background:`${tc}15`,border:`1px solid ${tc}30`,borderRadius:6,padding:'2px 8px',fontWeight:800}}>
                          <span style={{width:5,height:5,borderRadius:'50%',background:tc,flexShrink:0,display:'inline-block'}}/>
                          {tl.toUpperCase()}
                        </span>
                        {nc.bloqueiaProducao&&<span style={{fontSize:'0.6rem',fontWeight:800,color:'#DC2626',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:6,padding:'2px 8px'}}>🚨 BLOQUEANTE</span>}
                      </div>
                      {/* Descrição */}
                      <div style={{fontSize:'0.9rem',color:'#111827',fontWeight:600,lineHeight:1.55,marginBottom:12}}>{nc.descricao}</div>
                      {/* Impactos */}
                      {(nc.impactoFinanceiro||nc.impactoDias)&&(
                        <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                          {nc.impactoFinanceiro&&<span style={{fontSize:'0.68rem',fontWeight:700,color:'#7C3AED',background:'#F5F3FF',border:'1px solid #DDD6FE',borderRadius:8,padding:'3px 10px'}}>💸 {fmt(Number(nc.impactoFinanceiro))}</span>}
                          {nc.impactoDias&&<span style={{fontSize:'0.68rem',fontWeight:700,color:'#D97706',background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:8,padding:'3px 10px'}}>📅 {nc.impactoDias} dia{nc.impactoDias>1?'s':''} de impacto</span>}
                        </div>
                      )}
                      {/* Ação corretiva inicial */}
                      {nc.acaoCorretiva&&!nc.resolucao&&(
                        <div style={{padding:'8px 12px',background:'#F0F9FF',border:'1px solid #BAE6FD',borderRadius:10,fontSize:'0.75rem',color:'#0369A1',marginBottom:10}}>
                          <strong>Ação planejada:</strong> {nc.acaoCorretiva}
                        </div>
                      )}
                      {/* Resolução */}
                      {nc.resolucao&&(
                        <div style={{padding:'10px 14px',background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:10,fontSize:'0.78rem',color:'#065F46',marginBottom:10}}>
                          <div style={{fontWeight:800,marginBottom:4,fontSize:'0.65rem',textTransform:'uppercase',letterSpacing:'0.06em',color:'#059669'}}>✅ Resolução</div>
                          {nc.resolucao}
                        </div>
                      )}
                      {/* Footer meta */}
                      <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,#6B7280,#374151)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',color:'#FFF',fontWeight:800,flexShrink:0}}>
                            {(nc.registrador?.name||'?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{fontSize:'0.65rem',fontWeight:700,color:'#374151'}}>{nc.registrador?.name||nc.registradoPor?.name||'—'}</div>
                            <div style={{fontSize:'0.6rem',color:'#9CA3AF'}}>Registrou</div>
                          </div>
                        </div>
                        <div style={{fontSize:'0.65rem',color:'#9CA3AF',display:'flex',flexDirection:'column',gap:1}}>
                          <span>{fmtDate(nc.createdAt)}</span>
                          <span>{fmtTime(nc.createdAt)}</span>
                        </div>
                        {idx===0&&abertas>0&&<span style={{fontSize:'0.6rem',color:'#D97706',background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:6,padding:'2px 7px',fontWeight:700}}>⏰ Mais recente</span>}
                      </div>
                    </div>
                    {/* Right: status + action */}
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10,flexShrink:0}}>
                      <span style={{background:cfg.bg,color:cfg.color,border:`1.5px solid ${cfg.border}`,borderRadius:20,padding:'5px 14px',fontSize:'0.68rem',fontWeight:800,letterSpacing:'0.04em'}}>{cfg.label}</span>
                      {canResolve&&(
                        <button onClick={()=>{setResolveModal(nc);setResolveForm({resolucao:nc.acaoCorretiva||'',status:'RESOLVIDA'});}}
                          style={{padding:'7px 14px',borderRadius:10,background:'linear-gradient(135deg,#059669,#047857)',color:'#FFF',fontWeight:700,fontSize:'0.72rem',border:'none',cursor:'pointer',boxShadow:'0 2px 8px rgba(5,150,105,0.25)'}}>
                          ✓ Resolver
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar NC */}
      {modal&&(
        <Modal>
          <div style={{background:'#FFFFFF',borderRadius:20,padding:'32px',width:'100%',maxWidth:580,boxShadow:'0 24px 60px rgba(0,0,0,0.25)',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,color:'#B89B00',fontSize:'0.88rem',letterSpacing:'0.08em',marginBottom:6}}>REGISTRAR NÃO-CONFORMIDADE</div>
            <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginBottom:24}}>Preencha os dados da ocorrência de qualidade</div>
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div>
                <label style={labelStyle}>Tipo de NC</label>
                <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={inputStyle}>
                  {TIPOS.map(t=><option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Descrição * <span style={{color:'#9CA3AF',fontWeight:400,textTransform:'none'}}>— detalhe a ocorrência</span></label>
                <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} rows={3} placeholder="Descreva a não-conformidade com detalhes técnicos..." style={{...inputStyle,resize:'vertical'}}/>
              </div>
              <div>
                <label style={labelStyle}>Ação Corretiva Planejada</label>
                <input value={form.acaoCorretiva} onChange={e=>setForm(f=>({...f,acaoCorretiva:e.target.value}))} placeholder="Ação prevista para resolução..." style={inputStyle}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={labelStyle}>Impacto Financeiro (R$)</label>
                  <input type="number" value={form.impactoFinanceiro} onChange={e=>setForm(f=>({...f,impactoFinanceiro:e.target.value}))} placeholder="0" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Impacto em Dias</label>
                  <input type="number" value={form.impactoDias} onChange={e=>setForm(f=>({...f,impactoDias:e.target.value}))} placeholder="0" style={inputStyle}/>
                </div>
              </div>
              <label style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer',padding:'12px 16px',background:form.bloqueiaProducao?'#FEF2F2':'#F9FAFB',border:`1.5px solid ${form.bloqueiaProducao?'#FECACA':'#E5E7EB'}`,borderRadius:12,transition:'all 0.15s'}}>
                <input type="checkbox" checked={form.bloqueiaProducao} onChange={e=>setForm(f=>({...f,bloqueiaProducao:e.target.checked}))} style={{width:18,height:18,accentColor:'#DC2626'}}/>
                <div>
                  <div style={{fontWeight:700,color:form.bloqueiaProducao?'#DC2626':'#374151',fontSize:'0.85rem'}}>🚨 Bloqueante (ANDON)</div>
                  <div style={{fontSize:'0.68rem',color:form.bloqueiaProducao?'#B91C1C':'#9CA3AF',marginTop:2}}>Esta NC impede o avanço da ordem de fabricação</div>
                </div>
              </label>
            </div>
            <div style={{display:'flex',gap:12,marginTop:28,justifyContent:'flex-end'}}>
              <button onClick={()=>{setModal(false);setForm(initForm);}} style={{padding:'10px 22px',borderRadius:10,border:'1px solid #E5E7EB',background:'#F9FAFB',color:'#6B7280',fontWeight:700,cursor:'pointer',fontSize:'0.85rem'}}>Cancelar</button>
              <button onClick={handleCreate} disabled={!form.descricao.trim()||saving} style={{padding:'10px 24px',borderRadius:10,background:form.descricao.trim()&&!saving?'linear-gradient(135deg,#FFD600,#E5B800)':'#E5E7EB',color:form.descricao.trim()&&!saving?'#0F172A':'#9CA3AF',fontWeight:800,cursor:form.descricao.trim()&&!saving?'pointer':'not-allowed',border:'none',fontSize:'0.85rem',fontFamily:'Orbitron,sans-serif'}}>
                {saving?'Registrando...':'Registrar NC'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Resolver NC */}
      {resolveModal&&(
        <Modal>
          <div style={{background:'#FFFFFF',borderRadius:20,padding:'32px',width:'100%',maxWidth:520,boxShadow:'0 24px 60px rgba(0,0,0,0.25)'}}>
            <div style={{fontFamily:'Orbitron,sans-serif',fontWeight:900,color:'#059669',fontSize:'0.88rem',letterSpacing:'0.08em',marginBottom:6}}>RESOLVER NÃO-CONFORMIDADE</div>
            <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginBottom:4}}>{resolveModal.codigo}</div>
            <div style={{padding:'10px 14px',background:'#F9FAFB',border:'1px solid #E5E7EB',borderRadius:10,fontSize:'0.82rem',color:'#374151',marginBottom:20}}>{resolveModal.descricao}</div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={labelStyle}>Novo Status</label>
                <div style={{display:'flex',gap:8}}>
                  {['EM_TRATATIVA','RESOLVIDA','CANCELADA'].map(s=>{
                    const c = STATUS_CFG[s];
                    return <button key={s} onClick={()=>setResolveForm(f=>({...f,status:s}))} style={{flex:1,padding:'8px',borderRadius:10,border:`2px solid ${resolveForm.status===s?c.color:c.border}`,background:resolveForm.status===s?c.bg:'#FFFFFF',color:c.color,fontWeight:800,fontSize:'0.68rem',cursor:'pointer',transition:'all 0.15s'}}>{c.label}</button>;
                  })}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Descrição da Resolução *</label>
                <textarea value={resolveForm.resolucao} onChange={e=>setResolveForm(f=>({...f,resolucao:e.target.value}))} rows={3} placeholder="Descreva como a NC foi tratada e resolvida..." style={{...inputStyle,resize:'vertical'}}/>
              </div>
            </div>
            <div style={{display:'flex',gap:12,marginTop:24,justifyContent:'flex-end'}}>
              <button onClick={()=>setResolveModal(null)} style={{padding:'10px 22px',borderRadius:10,border:'1px solid #E5E7EB',background:'#F9FAFB',color:'#6B7280',fontWeight:700,cursor:'pointer',fontSize:'0.85rem'}}>Cancelar</button>
              <button onClick={handleResolve} disabled={!resolveForm.resolucao.trim()||saving} style={{padding:'10px 24px',borderRadius:10,background:resolveForm.resolucao.trim()&&!saving?'linear-gradient(135deg,#059669,#047857)':'#E5E7EB',color:resolveForm.resolucao.trim()&&!saving?'#FFF':'#9CA3AF',fontWeight:800,cursor:resolveForm.resolucao.trim()&&!saving?'pointer':'not-allowed',border:'none',fontSize:'0.85rem',fontFamily:'Orbitron,sans-serif'}}>
                {saving?'Salvando...':'Confirmar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
