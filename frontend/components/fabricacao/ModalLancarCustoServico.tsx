'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { fabricacaoApi, TipoPrestador } from '@/lib/api/fabricacao';
import { toast } from '@/components/ui/Toast';

const OFICIOS = ['Marceneiro','Serralheiro','Eletricista','Pintor','Mecânico','Encanador','Tapeceiro','Vidraceiro','Outro'];
const OPERACOES = [
  { value: '', label: 'Geral (sem gate específico)' },
  { value: 'OP010_VISTORIA_DESMANCHE',  label: 'OP010 · Aquisição e Legalização' },
  { value: 'OP020_SERRALHERIA',          label: 'OP020 · Estrutura Externa' },
  { value: 'OP025_ELETRICA_AUTOMOTIVA',  label: 'OP025 · Elétrica Automotiva' },
  { value: 'OP030_INFRAESTRUTURA',       label: 'OP030 · Estrutura Interna' },
  { value: 'OP040_ACABAMENTO',           label: 'OP040 · Serviço Interno' },
  { value: 'OP050_MARCENARIA',           label: 'OP050 · Serviço de Acabamento' },
  { value: 'OP060_GATE_LIBERACAO',       label: 'OP060 · Gate de Liberação Final' },
];

const fs: React.CSSProperties = {
  width:'100%', padding:'8px 11px', borderRadius:8, border:'1px solid #E5E7EB',
  background:'#F9FAFB', fontSize:'0.83rem', color:'#111827', outline:'none',
  fontFamily:'Inter, sans-serif', boxSizing:'border-box',
};
const ls: React.CSSProperties = {
  fontSize:'0.65rem', fontWeight:700, color:'#374151', display:'block',
  marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em',
};

const parseBrl = (v: string) => { const d=v.replace(/\D/g,''); return d?Number(d)/100:0; };
const maskBrl  = (s: string) => { const d=s.replace(/\D/g,''); const n=d?Number(d)/100:0; return n?n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):''; };
const maskCpf  = (v: string) => v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
const maskCnpj = (v: string) => v.replace(/\D/g,'').slice(0,14).replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d{1,2})$/,'$1-$2');
const maskTel  = (v: string) => { const d=v.replace(/\D/g,'').slice(0,11); return d.length<=10?d.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3'):d.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3'); };

// ── Calendário compacto ────────────────────────────────────────────────────
function CalendarioSelector({ selecionados, onChange }: { selecionados: Set<string>; onChange:(d:Set<string>)=>void }) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());

  const diasDoMes = useMemo(() => {
    const primeiro = new Date(ano, mes, 1);
    const ultimo   = new Date(ano, mes+1, 0);
    const inicio   = (primeiro.getDay() + 6) % 7;
    const dias: (number|null)[] = Array(inicio).fill(null);
    for (let d=1; d<=ultimo.getDate(); d++) dias.push(d);
    while (dias.length%7!==0) dias.push(null);
    return dias;
  }, [ano, mes]);

  const toKey = (d: number) => `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const toggle = (d: number) => { const k=toKey(d); const next=new Set(selecionados); next.has(k)?next.delete(k):next.add(k); onChange(next); };
  const navMes = (delta: number) => { const d=new Date(ano,mes+delta,1); setAno(d.getFullYear()); setMes(d.getMonth()); };
  const nomeMes = new Date(ano,mes,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});

  return (
    <div style={{background:'#F9FAFB',border:'1px solid #E5E7EB',borderRadius:10,padding:'10px 12px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <button onClick={()=>navMes(-1)} style={{background:'none',border:'1px solid #E5E7EB',borderRadius:6,padding:'2px 8px',cursor:'pointer',fontSize:'0.72rem',color:'#6B7280'}}>◀</button>
        <span style={{fontWeight:700,color:'#111827',fontSize:'0.74rem',textTransform:'capitalize'}}>{nomeMes}</span>
        <button onClick={()=>navMes(1)}  style={{background:'none',border:'1px solid #E5E7EB',borderRadius:6,padding:'2px 8px',cursor:'pointer',fontSize:'0.72rem',color:'#6B7280'}}>▶</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:2}}>
        {['S','T','Q','Q','S','S','D'].map((d,i)=>(
          <div key={i} style={{textAlign:'center',fontSize:'0.55rem',fontWeight:700,color:'#9CA3AF'}}>{d}</div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {diasDoMes.map((d,i)=>{
          if(!d) return <div key={i}/>;
          const k=toKey(d); const sel=selecionados.has(k);
          const fds=(new Date(ano,mes,d).getDay()+6)%7>=5;
          return (
            <button key={k} onClick={()=>toggle(d)} style={{
              padding:'4px 0',borderRadius:6,border:'none',cursor:'pointer',
              fontSize:'0.71rem',fontWeight:sel?900:400,
              background:sel?'#FFD600':fds?'#F3F4F6':'#FFFFFF',
              color:sel?'#0F172A':fds?'#9CA3AF':'#374151',
              boxShadow:sel?'0 1px 4px rgba(255,214,0,0.45)':'none',
              transition:'all 0.1s',
            }}>{d}</button>
          );
        })}
      </div>
      {selecionados.size>0&&(
        <div style={{marginTop:6,textAlign:'center',fontSize:'0.68rem',fontWeight:700,color:'#B89B00'}}>
          📅 {selecionados.size} dia{selecionados.size>1?'s':''} selecionado{selecionados.size>1?'s':''}
        </div>
      )}
    </div>
  );
}

// ── Card seletor compacto ─────────────────────────────────────────────────
function CardSelect({ active, accent, onClick, icon, label, desc }: any) {
  return (
    <button onClick={onClick} style={{
      padding:'9px 11px',borderRadius:9,cursor:'pointer',textAlign:'left',width:'100%',
      border:`2px solid ${active?accent:'#E5E7EB'}`,
      background:active?`${accent}1A`:'#F9FAFB',
    }}>
      <div style={{fontWeight:700,color:'#111827',fontSize:'0.78rem'}}>{icon} {label}</div>
      <div style={{fontSize:'0.65rem',color:'#6B7280',marginTop:1}}>{desc}</div>
    </button>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────
interface Props { ordemId: string; onClose:()=>void; onSuccess:()=>void; }

export default function ModalLancarCustoServico({ ordemId, onClose, onSuccess }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [saving,       setSaving]      = useState(false);
  const [tipo,         setTipo]        = useState<'SERVICO_PACOTE'|'SERVICO_DIARIA'>('SERVICO_PACOTE');
  const [tipoPrest,    setTipoPrest]   = useState<TipoPrestador>('PF');
  const [oficio,       setOficio]      = useState('');
  const [oficioCustom, setOficioCustom]= useState('');
  const [descricao,    setDescricao]   = useState('');
  const [operacao,     setOperacao]    = useState('');
  const [dataVenc,     setDataVenc]    = useState(new Date().toISOString().split('T')[0]);
  const [valorStr,     setValorStr]    = useState('');
  const [nome,         setNome]        = useState('');
  const [cpf,          setCpf]         = useState('');
  const [telefone,     setTelefone]    = useState('');
  const [cnpj,         setCnpj]        = useState('');
  const [contato,      setContato]     = useState('');
  const [diasSel,      setDiasSel]     = useState<Set<string>>(new Set());

  const oficioFinal = oficio==='Outro'?oficioCustom:oficio;
  const valorNum    = parseBrl(valorStr);
  const totalFinal  = tipo==='SERVICO_DIARIA'?diasSel.size*valorNum:valorNum;
  const canSave     = descricao&&(tipo==='SERVICO_PACOTE'?valorNum>0:diasSel.size>0&&valorNum>0)&&dataVenc&&nome;

  const handleSave = async () => {
    setSaving(true);
    try {
      await fabricacaoApi.ordens.registrarCusto(ordemId, {
        tipo, oficio:oficioFinal||undefined, descricao, valor:totalFinal,
        operacao:operacao||undefined, dataVencimento:dataVenc,
        tipoPrestador:tipoPrest,
        prestadorNome:nome||undefined,
        prestadorCpf: tipoPrest==='PF'?cpf||undefined:undefined,
        prestadorCnpj:tipoPrest==='PJ'?cnpj||undefined:undefined,
        prestadorTelefone:telefone||undefined,
        prestadorContato: tipoPrest==='PJ'?contato||undefined:undefined,
        diasTrabalhados:tipo==='SERVICO_DIARIA'?[...diasSel].sort():undefined,
        valorDiaria:tipo==='SERVICO_DIARIA'?valorNum:undefined,
      });
      toast.success('Custo lançado! Prestador registrado.');
      onSuccess(); onClose();
    } catch (e:any) {
      toast.error(e?.response?.data?.message||'Erro ao lançar custo');
    } finally { setSaving(false); }
  };

  const modalContent = (
    <>
      {/* Estilos globais para bloquear scroll do body */}
      <style>{`body { overflow: hidden !important; }`}</style>

      {/* ── Overlay: cobre 100% do viewport incluindo sidebar ── */}
      <div
        onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}
        style={{
          position:'fixed',
          top:0, left:0, right:0, bottom:0,
          width:'100vw', height:'100vh',
          background:'rgba(15,23,42,0.55)',
          backdropFilter:'blur(2px)',
          zIndex:99999,
          display:'flex',
          alignItems:'flex-start',       // posiciona no TOPO
          justifyContent:'center',       // centralizado horizontalmente
          paddingTop:'48px',             // distância do topo da tela
          boxSizing:'border-box',
          overflowY:'auto',
        }}
      >
        {/* ── Modal box ── */}
        <div
          onClick={e=>e.stopPropagation()}
          style={{
            background:'#FFFFFF',
            borderRadius:16,
            width:'100%',
            maxWidth:540,
            maxHeight:'calc(100vh - 80px)',
            display:'flex',
            flexDirection:'column',
            boxShadow:'0 24px 64px rgba(0,0,0,0.3)',
            margin:'0 16px',
          }}
        >
          {/* Header */}
          <div style={{padding:'16px 22px 12px',borderBottom:'1px solid #F3F4F6',flexShrink:0}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontFamily:'Orbitron, sans-serif',fontWeight:900,color:'#0F172A',fontSize:'0.88rem'}}>🔧 LANÇAR CUSTO DE SERVIÇO</div>
                <div style={{fontSize:'0.7rem',color:'#9CA3AF',marginTop:2}}>Registre o serviço e os dados do prestador</div>
              </div>
              <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:'1.2rem',color:'#9CA3AF',padding:4,lineHeight:1}}>✕</button>
            </div>
          </div>

          {/* Body scrollável */}
          <div style={{padding:'14px 22px',overflowY:'auto',flex:1,display:'flex',flexDirection:'column',gap:12}}>

            {/* Tipo cobrança + Tipo prestador */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label style={ls}>Tipo de Cobrança</label>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  <CardSelect active={tipo==='SERVICO_PACOTE'} accent="#FFD600" onClick={()=>setTipo('SERVICO_PACOTE')} icon="📋" label="Pacote Fechado" desc="Valor único pelo serviço" />
                  <CardSelect active={tipo==='SERVICO_DIARIA'} accent="#FFD600" onClick={()=>setTipo('SERVICO_DIARIA')} icon="📅" label="Diária" desc="Dias pelo calendário" />
                </div>
              </div>
              <div>
                <label style={ls}>Tipo de Prestador</label>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  <CardSelect active={tipoPrest==='PF'} accent="#7C3AED" onClick={()=>setTipoPrest('PF')} icon="👤" label="Pessoa Física" desc="CPF · Nome · Telefone" />
                  <CardSelect active={tipoPrest==='PJ'} accent="#7C3AED" onClick={()=>setTipoPrest('PJ')} icon="🏢" label="Pessoa Jurídica" desc="CNPJ · Razão Social" />
                </div>
              </div>
            </div>

            {/* Dados do prestador */}
            <div style={{background:'#F8F7FF',border:'1px solid #DDD6FE',borderRadius:10,padding:'11px 13px'}}>
              <div style={{fontWeight:700,color:'#5B21B6',fontSize:'0.65rem',marginBottom:9,textTransform:'uppercase',letterSpacing:'0.06em'}}>
                {tipoPrest==='PF'?'👤 Pessoa Física':'🏢 Empresa'}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={ls}>{tipoPrest==='PF'?'Nome Completo *':'Razão Social *'}</label>
                  <input value={nome} onChange={e=>setNome(e.target.value)} placeholder={tipoPrest==='PF'?'Ex: João da Silva':'Ex: Instalações Rápidas LTDA'} style={fs}/>
                </div>
                {tipoPrest==='PF'?(
                  <>
                    <div><label style={ls}>CPF</label><input value={cpf} onChange={e=>setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" style={fs}/></div>
                    <div><label style={ls}>Telefone</label><input value={telefone} onChange={e=>setTelefone(maskTel(e.target.value))} placeholder="(00) 00000-0000" style={fs}/></div>
                  </>
                ):(
                  <>
                    <div><label style={ls}>CNPJ</label><input value={cnpj} onChange={e=>setCnpj(maskCnpj(e.target.value))} placeholder="00.000.000/0001-00" style={fs}/></div>
                    <div><label style={ls}>Telefone</label><input value={telefone} onChange={e=>setTelefone(maskTel(e.target.value))} placeholder="(00) 00000-0000" style={fs}/></div>
                    <div style={{gridColumn:'1/-1'}}><label style={ls}>Nome do Contato (opcional)</label><input value={contato} onChange={e=>setContato(e.target.value)} placeholder="Ex: Maria Lima" style={fs}/></div>
                  </>
                )}
              </div>
            </div>

            {/* Ofício + Gate lado a lado */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label style={ls}>Ofício / Função</label>
                <select value={oficio} onChange={e=>setOficio(e.target.value)} style={fs}>
                  <option value="">Selecione...</option>
                  {OFICIOS.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
                {oficio==='Outro'&&<input value={oficioCustom} onChange={e=>setOficioCustom(e.target.value)} placeholder="Descreva..." style={{...fs,marginTop:5}}/>}
              </div>
              <div>
                <label style={ls}>Gate / Operação</label>
                <select value={operacao} onChange={e=>setOperacao(e.target.value)} style={fs}>
                  {OPERACOES.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label style={ls}>Descrição do Serviço *</label>
              <textarea value={descricao} onChange={e=>setDescricao(e.target.value)} rows={2}
                placeholder={tipo==='SERVICO_DIARIA'?'Ex: Estrutura metálica das bancadas laterais':'Ex: Fabricação e instalação dos móveis completos'}
                style={{...fs,resize:'vertical'}}/>
            </div>

            {/* Calendário (só diária) */}
            {tipo==='SERVICO_DIARIA'&&(
              <div>
                <label style={ls}>Dias Trabalhados — clique para selecionar</label>
                <CalendarioSelector selecionados={diasSel} onChange={setDiasSel}/>
              </div>
            )}

            {/* Valor + Data */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label style={ls}>{tipo==='SERVICO_DIARIA'?'Valor por Diária (R$) *':'Valor do Pacote (R$) *'}</label>
                <input type="text" inputMode="numeric" value={valorStr} onChange={e=>setValorStr(maskBrl(e.target.value))} placeholder="R$ 0,00" style={fs}/>
              </div>
              <div>
                <label style={ls}>Data de Vencimento *</label>
                <input type="date" value={dataVenc} onChange={e=>setDataVenc(e.target.value)} style={fs}/>
              </div>
            </div>

            {/* Resumo */}
            {canSave&&(
              <div style={{background:'linear-gradient(135deg,#FFFDE7,#FFF9C4)',border:'1px solid #FFD600',borderRadius:10,padding:'10px 13px'}}>
                <div style={{fontSize:'0.62rem',color:'#92400E',fontWeight:700,marginBottom:5}}>📋 RESUMO</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
                  <div>
                    <div style={{fontWeight:800,color:'#111827',fontSize:'0.83rem'}}>{nome}</div>
                    <div style={{fontSize:'0.67rem',color:'#6B7280'}}>
                      {oficioFinal||'Ofício não selecionado'} · {tipoPrest==='PF'?'PF':'PJ'}
                      {tipo==='SERVICO_DIARIA'&&diasSel.size>0?` · ${diasSel.size} dias`:''}
                    </div>
                  </div>
                  <div style={{fontFamily:'Orbitron, sans-serif',fontWeight:900,color:'#0F172A',fontSize:'0.97rem'}}>
                    R$ {totalFinal.toLocaleString('pt-BR',{minimumFractionDigits:2})}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer fixo */}
          <div style={{padding:'11px 22px 16px',borderTop:'1px solid #F3F4F6',display:'flex',gap:10,flexShrink:0}}>
            <button onClick={onClose} style={{flex:1,padding:'10px',borderRadius:9,border:'1px solid #E5E7EB',background:'#F9FAFB',color:'#6B7280',fontWeight:700,fontSize:'0.81rem',cursor:'pointer'}}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!canSave||saving} style={{
              flex:2,padding:'10px',borderRadius:9,border:'none',
              background:canSave&&!saving?'linear-gradient(135deg,#FFD600,#E5B800)':'#E5E7EB',
              color:canSave&&!saving?'#0F172A':'#9CA3AF',
              fontWeight:800,fontFamily:'Orbitron, sans-serif',fontSize:'0.82rem',
              cursor:canSave&&!saving?'pointer':'not-allowed',
            }}>
              {saving?'⏳ Lançando...':'✅ LANÇAR CUSTO'}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Renderiza diretamente no <body> via Portal — escapa de qualquer layout pai
  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
