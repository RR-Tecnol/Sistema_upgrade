'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { studentsApi } from '@/lib/api/students';
import Image from 'next/image';
import Link from 'next/link';
import {
    ENROLLMENT_DOC_LABELS,
    downloadEnrollmentFileFromUrl,
    getMissingEnrollmentDocumentEntries,
} from '@/components/enrollment/EnrollmentDocumentsPreview';
import StudentDocumentUploadList, {
    buildDocumentsPayload,
    parseStudentDocumentsFromApi,
} from '@/components/documents/StudentDocumentUploadList';
import { toast } from '@/components/ui/Toast';

/* ── helpers ─────────────────────────────────────── */
const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtCpf = (s?: string) => s ? s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—';
const fmtPhone = (s?: string) => s ? s.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : '—';
const fmtCep = (s?: string) => s ? s.replace(/(\d{5})(\d{3})/, '$1-$2') : '—';

const GENDER_MAP: Record<string,string> = { MALE:'Masculino', FEMALE:'Feminino', NON_BINARY:'Não-binário', PREFER_NOT_TO_SAY:'Prefiro não informar' };
const RACE_MAP: Record<string,string> = { WHITE:'Branco', BLACK:'Preto', BROWN:'Pardo', YELLOW:'Amarelo', INDIGENOUS:'Indígena', PREFER_NOT_TO_SAY:'Prefiro não informar' };
const CIVIL_MAP: Record<string,string> = { SINGLE:'Solteiro(a)', MARRIED:'Casado(a)', DIVORCED:'Divorciado(a)', WIDOWED:'Viúvo(a)', SEPARATED:'Separado(a)' };
const EDU_MAP: Record<string,string> = { NO_FORMAL_EDUCATION:'Sem escolaridade', ELEMENTARY_INCOMPLETE:'Fund. Incompleto', ELEMENTARY_COMPLETE:'Fund. Completo', HIGH_SCHOOL_INCOMPLETE:'Médio Incompleto', HIGH_SCHOOL_COMPLETE:'Médio Completo', HIGHER_INCOMPLETE:'Superior Incompleto', HIGHER_COMPLETE:'Superior Completo', POSTGRADUATE:'Pós-graduação' };
const EMP_MAP: Record<string,string> = { EMPLOYED_CLT:'Empregado CLT', EMPLOYED_PJ:'Empregado PJ', SELF_EMPLOYED:'Autônomo', UNEMPLOYED:'Desempregado', STUDENT:'Estudante', HOMEMAKER:'Do Lar', RETIRED:'Aposentado', OTHER:'Outro' };
const INC_MAP: Record<string,string> = { UP_TO_1_MW:'Até 1 SM', FROM_1_TO_2_MW:'1–2 SM', FROM_2_TO_3_MW:'2–3 SM', FROM_3_TO_5_MW:'3–5 SM', ABOVE_5_MW:'Acima de 5 SM', PREFER_NOT_TO_SAY:'Não informado' };
const CAREER_MAP: Record<string,string> = { SEEK_EMPLOYMENT:'Conseguir Emprego', ENTREPRENEURSHIP:'Empreender', SELF_EMPLOYED:'Trabalho Autônomo', NOT_SURE:'Ainda não sei', OTHER:'Outro' };
const ZONE_MAP: Record<string,string> = { URBAN:'Urbana', RURAL:'Rural' };
const PROG_MAP: Record<string,string> = { NONE:'Nenhum', BOLSA_FAMILIA:'Bolsa Família', BPC:'BPC/LOAS', AUXILIO_BRASIL:'Auxílio Brasil', OTHER:'Outro' };
const ENROLL_STATUS_MAP: Record<string,{ label:string; bg:string; color:string }> = {
  PENDING:{ label:'Pendente', bg:'#FFFDE7', color:'#92730A' },
  APPROVED:{ label:'Aprovado', bg:'#DCFCE7', color:'#15803D' },
  REJECTED:{ label:'Rejeitado', bg:'#FEF2F2', color:'#DC2626' },
  ENROLLED:{ label:'Matriculado', bg:'#E0F2FE', color:'#0369A1' },
  DOCUMENT_PENDING:{ label:'Doc. Pendente', bg:'#FFF7ED', color:'#C2410C' },
  WAITLIST:{ label:'Lista Espera', bg:'#F5F3FF', color:'#6D28D9' },
  DROPOUT:{ label:'Desistência', bg:'#F3F4F6', color:'#6B7280' },
};

/* ── count-up ───────────────────────────────────────── */
function useCountUp(target: number, dur = 800) {
  const [v, setV] = useState(0);
  const r = useRef(0);
  useEffect(() => {
    if (!target) { setV(0); return; }
    const s = Date.now();
    const tick = () => { const p = Math.min((Date.now()-s)/dur,1); setV(Math.round((1-Math.pow(1-p,3))*target)); if(p<1) r.current=requestAnimationFrame(tick); };
    r.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(r.current);
  }, [target]);
  return v;
}

/* ── Row ─────────────────────────────────────────── */
function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'.18rem' }}>
      <div style={{ fontSize:'.62rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.09em', color:'#9CA3AF' }}>{label}</div>
      <div style={{ fontSize:'.88rem', fontWeight:600, color: value ? '#111827' : '#D1D5DB', fontFamily: mono ? '"JetBrains Mono",monospace' : 'inherit' }}>{value || '—'}</div>
    </div>
  );
}

/* ── Section ──────────────────────────────────────── */
function Section({ emoji, title, children }: { emoji:string; title:string; children:React.ReactNode }) {
  return (
    <div style={{ background:'#fff', border:'1.5px solid #F3F4F6', borderRadius:18, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.05)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'.75rem', padding:'1.1rem 1.5rem', borderBottom:'1px solid #F9FAFB', background:'#FAFBFC' }}>
        <span style={{ fontSize:'1.2rem' }}>{emoji}</span>
        <span style={{ fontSize:'.78rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'#374151' }}>{title}</span>
      </div>
      <div style={{ padding:'1.25rem 1.5rem' }}>{children}</div>
    </div>
  );
}

/* ── KPI ─────────────────────────────────────────── */
function KPI({ emoji, label, value, color, bg }: { emoji:string; label:string; value:number; color:string; bg:string }) {
  const n = useCountUp(value);
  return (
    <div style={{ background:bg, border:`1.5px solid ${color}33`, borderRadius:14, padding:'1rem 1.25rem', display:'flex', alignItems:'center', gap:'.85rem', transition:'transform .2s, box-shadow .2s', cursor:'default' }}
         onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform='translateY(-2px)'; el.style.boxShadow=`0 6px 20px ${color}22`; }}
         onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform='translateY(0)'; el.style.boxShadow='none'; }}>
      <span style={{ fontSize:'1.5rem' }}>{emoji}</span>
      <div>
        <div style={{ fontFamily:'"Orbitron",sans-serif', fontSize:'1.6rem', fontWeight:900, color, lineHeight:1 }}>{n}</div>
        <div style={{ fontSize:'.68rem', color, opacity:.7, fontWeight:700 }}>{label}</div>
      </div>
    </div>
  );
}

/* ── PhotoUpload ──────────────────────────────────── */
function PhotoUpload({ studentId, currentPhoto, initials, isMA, onUploaded }: {
  studentId: string; currentPhoto?: string | null; initials: string; isMA: boolean; onUploaded: (url: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentPhoto || null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Apenas imagens são permitidas'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Arquivo deve ter menos de 5MB'); return; }
    setError(''); setUploading(true); setSuccess(false);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const result = await studentsApi.uploadPhoto(studentId, file);
      setPreview(result.photoUrl);
      onUploaded(result.photoUrl);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erro ao enviar foto');
      setPreview(currentPhoto || null);
    } finally { setUploading(false); }
  }, [studentId, currentPhoto, onUploaded]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const grad = isMA ? 'linear-gradient(135deg,#0891B2,#06B6D4)' : 'linear-gradient(135deg,#059669,#10B981)';
  const glow = isMA ? 'rgba(8,145,178,.35)' : 'rgba(5,150,105,.35)';

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'.75rem' }}>
      {/* Avatar / Photo zone */}
      <div
        style={{
          position:'relative', width:120, height:120, borderRadius:'50%', cursor:'pointer',
          border: dragOver ? '3px dashed #FFD600' : '3px solid transparent',
          background: dragOver ? '#FFFDE7' : 'transparent',
          transition:'all .25s', flexShrink:0,
        }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        title="Clique ou arraste uma foto"
      >
        {preview ? (
          <img src={preview} alt="Foto do aluno" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover', boxShadow:`0 4px 20px ${glow}` }}/>
        ) : (
          <div style={{ width:'100%', height:'100%', borderRadius:'50%', background:grad, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 20px ${glow}` }}>
            <span style={{ fontFamily:'"Orbitron",sans-serif', fontSize:'2rem', fontWeight:900, color:'#fff' }}>{initials}</span>
          </div>
        )}

        {/* Overlay on hover */}
        <div style={{
          position:'absolute', inset:0, borderRadius:'50%', background:'rgba(0,0,0,.5)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          opacity: uploading || dragOver ? 1 : 0, transition:'opacity .2s',
        }}
          onMouseEnter={e => !uploading && !dragOver && ((e.currentTarget as HTMLElement).style.opacity='1')}
          onMouseLeave={e => !uploading && !dragOver && ((e.currentTarget as HTMLElement).style.opacity='0')}
        >
          {uploading ? (
            <div style={{ width:28, height:28, border:'3px solid #FFD600', borderTopColor:'transparent', borderRadius:'50%', animation:'phSpin .7s linear infinite' }}/>
          ) : dragOver ? (
            <span style={{ fontSize:'1.5rem' }}>📥</span>
          ) : (
            <>
              <span style={{ fontSize:'1.3rem' }}>📷</span>
              <span style={{ fontSize:'.58rem', color:'#fff', fontWeight:700, marginTop:'.25rem', textAlign:'center', letterSpacing:'.05em' }}>ALTERAR</span>
            </>
          )}
        </div>

        {/* Success checkmark */}
        {success && (
          <div style={{ position:'absolute', bottom:4, right:4, width:24, height:24, borderRadius:'50%', background:'#15803D', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,.2)' }}>
            <span style={{ color:'#fff', fontSize:'.75rem' }}>✓</span>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }}
        onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />

      {/* Hint */}
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'.65rem', color:'#9CA3AF', fontWeight:600 }}>JPG, PNG ou WebP · Máx 5MB</div>
        {error && <div style={{ fontSize:'.65rem', color:'#DC2626', fontWeight:700, marginTop:'.2rem' }}>⚠ {error}</div>}
        {success && <div style={{ fontSize:'.65rem', color:'#15803D', fontWeight:700, marginTop:'.2rem' }}>✓ Foto atualizada!</div>}
      </div>

      <style>{`@keyframes phSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Tabs ─────────────────────────────────────────── */
const TABS = [
  { id:'info', emoji:'👤', label:'Perfil' },
  { id:'address', emoji:'📍', label:'Endereço' },
  { id:'socio', emoji:'📊', label:'Socioeconômico' },
  { id:'career', emoji:'🎯', label:'Carreira' },
  { id:'enrollments', emoji:'📋', label:'Matrículas' },
  { id:'frequencia', emoji:'📈', label:'Frequência' },
  { id:'certificados', emoji:'🏅', label:'Certificados' },
  { id:'auditoria', emoji:'🧾', label:'Auditoria' },
];

/* ── Main ─────────────────────────────────────────── */
export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [tabIn, setTabIn] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [docDraft, setDocDraft] = useState<Record<string, string>>({});
  const [savingDocs, setSavingDocs] = useState(false);
  const [remindingDocs, setRemindingDocs] = useState(false);

  useEffect(() => { if (params.id) load(); }, [params.id]);

  const load = async () => {
    try {
      setLoading(true);
      const d = await studentsApi.getById(params.id as string);
      setStudent(d);
      setPhotoUrl(d.photoUrl || null);
      setDocDraft(parseStudentDocumentsFromApi(d.documents));
    } catch {
      router.push('/admin/alunos');
    } finally { setLoading(false); }
  };

  const switchTab = (id: string) => {
    setTabIn(false);
    setTimeout(() => { setActiveTab(id); setTabIn(true); }, 180);
  };

  const missingRequiredDocs = getMissingEnrollmentDocumentEntries(docDraft).filter((m) => m.required);
  const saveDocuments = async () => {
    if (!params.id) return;
    setSavingDocs(true);
    try {
      await studentsApi.update(params.id as string, { documents: buildDocumentsPayload(docDraft) } as any);
      toast.success('Documentação guardada.');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao guardar documentos.');
    } finally {
      setSavingDocs(false);
    }
  };

  const remindDocuments = async () => {
    if (!params.id) return;
    setRemindingDocs(true);
    try {
      const r = await studentsApi.notifyPendingDocuments(params.id as string);
      toast.success(r.message);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao enviar lembrete.');
    } finally {
      setRemindingDocs(false);
    }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:400 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:52, height:52, borderRadius:'50%', border:'3px solid #FFD600', borderTopColor:'transparent', animation:'spin .8s linear infinite', margin:'0 auto 1rem' }}/>
        <p style={{ fontFamily:'"Orbitron",sans-serif', fontSize:'.65rem', letterSpacing:'.15em', color:'#9CA3AF' }}>CARREGANDO ALUNO...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (!student) return null;

  const initials = student.user.name.split(' ').filter(Boolean).slice(0,2).map((n:string) => n[0].toUpperCase()).join('');
  const isMA = student.address?.state === 'MA';
  const enr = student.enrollments || [];
  const att = student.attendances || [];
  const certs = student.certificates || [];
  const consents = student.legalConsents || [];
  const attendanceByClass = att.reduce((acc: Record<string, { present: number; absent: number; courseName: string }>, cur: any) => {
    const k = cur.classId || 'sem_turma';
    if (!acc[k]) acc[k] = { present: 0, absent: 0, courseName: cur.class?.course?.name || 'Sem curso' };
    if (cur.present) acc[k].present += 1; else acc[k].absent += 1;
    return acc;
  }, {});

  return (
    <div style={{ maxWidth:900, margin:'0 auto', paddingBottom:'3rem' }}>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:'1.5rem', marginBottom:'1.75rem', flexWrap:'wrap' }}>
        <Link href="/admin/alunos" style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'2.6rem', height:'2.6rem', borderRadius:12, border:'1.5px solid #E5E7EB', background:'#fff', color:'#6B7280', textDecoration:'none', flexShrink:0, fontSize:'1.1rem', transition:'all .2s', marginTop:'1.5rem' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='#FFD600'; el.style.background='#FFFDE7'; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='#E5E7EB'; el.style.background='#fff'; }}>
          ←
        </Link>

        {/* PHOTO UPLOAD AVATAR */}
        <PhotoUpload
          studentId={params.id as string}
          currentPhoto={photoUrl}
          initials={initials}
          isMA={isMA}
          onUploaded={url => setPhotoUrl(url)}
        />

        <div style={{ flex:1, minWidth:0 }}>
          <h1 style={{ fontFamily:'"Orbitron",sans-serif', fontSize:'1.75rem', fontWeight:900, background:'linear-gradient(135deg,#B89B00,#FFD600,#E6A800)', WebkitBackgroundClip:'text', backgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'.2rem', lineHeight:1.2 }}>
            {student.socialName || student.user.name}
          </h1>
          <div style={{ display:'flex', alignItems:'center', gap:'.75rem', flexWrap:'wrap' }}>
            <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.78rem', color:'#9CA3AF' }}>
              {fmtCpf(student.cpf)}
            </span>
            <span style={{ padding:'.15rem .65rem', borderRadius:100, fontSize:'.65rem', fontWeight:800, letterSpacing:'.07em', background: student.active ? '#DCFCE7' : '#F3F4F6', color: student.active ? '#15803D' : '#9CA3AF', border: `1px solid ${student.active ? '#BBF7D0' : '#E5E7EB'}` }}>
              {student.active ? '● Ativo' : '○ Inativo'}
            </span>
            {student.address && (
              <span style={{ padding:'.15rem .65rem', borderRadius:100, fontSize:'.65rem', fontWeight:800, background: isMA ? '#E0F2FE' : '#DCFCE7', color: isMA ? '#0369A1' : '#15803D', border:`1px solid ${isMA ? '#BAE6FD' : '#BBF7D0'}` }}>
                {student.address.state}
              </span>
            )}
          </div>
          <div style={{ fontSize:'.78rem', color:'#9CA3AF', marginTop:'.3rem' }}>
            Cadastrado em {fmt(student.createdAt)} · {student.user.email}
          </div>
          <div style={{ fontSize:'.65rem', color:'#C4B5A0', marginTop:'.15rem', fontStyle:'italic' }}>
            Clique na foto para alterar · Drag & Drop também funciona
          </div>
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'.75rem', marginBottom:'1.5rem' }}>
        <KPI emoji="📋" label="Matrículas" value={enr.length} color="#B89B00" bg="#FFFDE7"/>
        <KPI emoji="✅" label="Presenças" value={att.filter((a:any)=>a.present).length} color="#059669" bg="#DCFCE7"/>
        <KPI emoji="🏆" label="Certificados" value={certs.length} color="#7C3AED" bg="#F5F3FF"/>
        <KPI emoji="📅" label="Faltas" value={att.filter((a:any)=>!a.present).length} color="#DC2626" bg="#FEF2F2"/>
      </div>

      {/* ── TABS ── */}
      <div style={{ display:'flex', gap:'.35rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => switchTab(t.id)}
            style={{ display:'flex', alignItems:'center', gap:'.4rem', padding:'.4rem 1rem', borderRadius:100, fontSize:'.75rem', fontWeight:700, cursor:'pointer', border:'1.5px solid', transition:'all .2s',
              background: activeTab===t.id ? '#FFD600' : '#fff',
              borderColor: activeTab===t.id ? '#FFD600' : '#E5E7EB',
              color: activeTab===t.id ? '#000' : '#9CA3AF',
              boxShadow: activeTab===t.id ? '0 2px 10px rgba(255,214,0,.35)' : 'none',
            }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ opacity: tabIn ? 1 : 0, transform: tabIn ? 'translateY(0)' : 'translateY(8px)', transition:'all .25s cubic-bezier(.16,1,.3,1)', display:'flex', flexDirection:'column', gap:'1rem' }}>

        {activeTab === 'info' && (<>
          <Section emoji="🔐" title="Dados de Acesso">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'1.1rem' }}>
              <Row label="Nome Completo" value={student.user.name}/>
              <Row label="Nome Social" value={student.socialName}/>
              <Row label="Email" value={student.user.email} mono/>
              <Row label="Telefone" value={fmtPhone(student.user.phone)} mono/>
            </div>
          </Section>
          <Section emoji="📄" title="Documentação e Dados Pessoais">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'1.1rem' }}>
              <Row label="CPF" value={fmtCpf(student.cpf)} mono/>
              <Row label="Data de Nascimento" value={fmt(student.birthDate)}/>
              <Row label="Gênero" value={GENDER_MAP[student.gender] || student.gender}/>
              <Row label="Raça/Cor" value={RACE_MAP[student.raceColor] || student.raceColor}/>
              <Row label="Estado Civil" value={CIVIL_MAP[student.maritalStatus] || student.maritalStatus}/>
              <Row label="Nacionalidade" value={student.nationality}/>
              <Row label="Naturalidade" value={student.birthCity ? `${student.birthCity}/${student.birthState}` : undefined}/>
            </div>
          </Section>

          <Section emoji="📁" title="Documentação (ficheiros)">
            {missingRequiredDocs.length > 0 && (
              <div style={{ marginBottom: '1rem', padding: '0.65rem 0.85rem', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: '0.78rem', color: '#92400E', fontWeight: 600 }}>
                Obrigatórios em falta: {missingRequiredDocs.map((m) => m.label).join(', ')}
              </div>
            )}
            <StudentDocumentUploadList
              value={docDraft}
              onChange={setDocDraft}
              variant="adminLight"
              hint="Envie ou substitua ficheiros e clique em Guardar para gravar no perfil do aluno."
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginTop: '1.1rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => void saveDocuments()}
                disabled={savingDocs}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: 10,
                  border: '1px solid #B89B00',
                  background: '#FFD600',
                  color: '#111',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: savingDocs ? 'wait' : 'pointer',
                  opacity: savingDocs ? 0.75 : 1,
                }}
              >
                {savingDocs ? 'A guardar…' : 'Guardar documentação'}
              </button>
              <button
                type="button"
                onClick={() => void remindDocuments()}
                disabled={remindingDocs || missingRequiredDocs.length === 0}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  background: '#fff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: missingRequiredDocs.length === 0 || remindingDocs ? 'not-allowed' : 'pointer',
                  opacity: missingRequiredDocs.length === 0 ? 0.5 : 1,
                }}
              >
                {remindingDocs ? '…' : 'Reenviar aviso ao aluno'}
              </button>
            </div>
            {Object.keys(docDraft).some((k) => docDraft[k]?.trim()) && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #F3F4F6' }}>
                <button
                  type="button"
                  onClick={async () => {
                    const entries = Object.entries(docDraft).filter(([, v]) => v && String(v).trim().length > 0);
                    const prefix = (student.cpf || 'aluno').replace(/\D/g, '') || 'aluno';
                    for (const [key, raw] of entries) {
                      const href = String(raw).trim();
                      await downloadEnrollmentFileFromUrl(href, `${prefix}_${key}`);
                      await new Promise((r) => setTimeout(r, 280));
                    }
                  }}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '0.45rem 0.85rem',
                    borderRadius: 10,
                    border: '1px solid #D1D5DB',
                    background: '#fff',
                    color: '#374151',
                    cursor: 'pointer',
                    marginBottom: '0.75rem',
                  }}
                >
                  Baixar todos os documentos
                </button>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:'0.75rem' }}>
                  {(['identidade', 'cpfDoc', 'addressProof', 'educationProof', 'photo'] as const).map((key) => {
                    const href = docDraft[key];
                    if (!href || !String(href).trim()) return null;
                    const url = String(href).trim();
                    const label = ENROLLMENT_DOC_LABELS[key] || key;
                    const linkStyle = { flex: 1, minWidth: 0, padding: '0.75rem 1rem', background: '#F3F4F6', borderRadius: '12px', color: '#1F2937', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #E5E7EB' } as const;
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'stretch', gap: 8, flexWrap: 'wrap' }}>
                        <a href={url} target="_blank" rel="noreferrer" style={linkStyle}>↗ {label}</a>
                        <button
                          type="button"
                          title="Descarregar ficheiro"
                          onClick={() => downloadEnrollmentFileFromUrl(url, `${(student.cpf || 'aluno').replace(/\D/g, '') || 'aluno'}_${key}`)}
                          style={{
                            padding: '0.75rem 0.85rem',
                            borderRadius: 12,
                            border: '1px solid #D1D5DB',
                            background: '#fff',
                            color: '#374151',
                            fontWeight: 800,
                            fontSize: '0.68rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Baixar
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Section>

          <Section emoji="👨‍👩‍👧" title="Filiação">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.1rem' }}>
              <Row label="Nome da Mãe" value={student.motherName}/>
              <Row label="Nome do Pai" value={student.fatherName}/>
            </div>
          </Section>
          {student.contact && (
            <Section emoji="📬" title="Contato e Preferências">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'1rem' }}>
                <Row label="Telefone Alt." value={fmtPhone(student.contact.phoneAlt)} mono/>
                {[
                  { label:'Possui WhatsApp', val: student.contact.hasWhatsapp },
                  { label:'Aceita WhatsApp', val: student.contact.allowWhatsappContact },
                  { label:'Aceita E-mail', val: student.contact.allowEmailContact },
                ].map(item => (
                  <div key={item.label} style={{ display:'flex', flexDirection:'column', gap:'.18rem' }}>
                    <div style={{ fontSize:'.62rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.09em', color:'#9CA3AF' }}>{item.label}</div>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:'.3rem', padding:'.2rem .6rem', borderRadius:100, fontSize:'.72rem', fontWeight:700, background: item.val ? '#DCFCE7' : '#F3F4F6', color: item.val ? '#15803D' : '#9CA3AF', width:'fit-content' }}>
                      {item.val ? '✓ Sim' : '✗ Não'}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>)}

        {activeTab === 'address' && student.address && (
          <Section emoji="🗺" title="Localização">
            <div style={{ marginBottom:'1.25rem', padding:'1rem', background:'#F9FAFB', borderRadius:12, display:'flex', alignItems:'center', gap:'.75rem' }}>
              <span style={{ fontSize:'2rem' }}>📍</span>
              <div>
                <div style={{ fontWeight:700, color:'#111827', fontSize:'1rem' }}>
                  {student.address.street}, {student.address.number}{student.address.complement ? ` — ${student.address.complement}` : ''}
                </div>
                <div style={{ color:'#6B7280', fontSize:'.85rem' }}>
                  {student.address.neighborhood} · {student.address.city}/{student.address.state} · CEP {fmtCep(student.address.cep)}
                </div>
                <div style={{ marginTop:'.35rem' }}>
                  <span style={{ padding:'.15rem .65rem', borderRadius:100, fontSize:'.65rem', fontWeight:800, background: student.address.zone==='URBAN' ? '#E0F2FE' : '#DCFCE7', color: student.address.zone==='URBAN' ? '#0369A1' : '#15803D', border: `1px solid ${student.address.zone==='URBAN' ? '#BAE6FD' : '#BBF7D0'}` }}>
                    Zona {ZONE_MAP[student.address.zone] || student.address.zone}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'1rem' }}>
              <Row label="CEP" value={fmtCep(student.address.cep)} mono/>
              <Row label="Logradouro" value={student.address.street}/>
              <Row label="Número" value={student.address.number}/>
              <Row label="Complemento" value={student.address.complement}/>
              <Row label="Bairro" value={student.address.neighborhood}/>
              <Row label="Cidade" value={student.address.city}/>
              <Row label="Estado" value={student.address.state}/>
              <Row label="Zona" value={ZONE_MAP[student.address.zone] || student.address.zone}/>
            </div>
          </Section>
        )}
        {activeTab === 'address' && !student.address && (
          <div style={{ textAlign:'center', padding:'3rem', color:'#D1D5DB' }}>
            <span style={{ fontSize:'2rem', display:'block', marginBottom:'.75rem' }}>📭</span>
            <p style={{ fontFamily:'"Orbitron",sans-serif', fontSize:'.7rem', letterSpacing:'.1em' }}>ENDEREÇO NÃO CADASTRADO</p>
          </div>
        )}

        {activeTab === 'socio' && student.socioeconomic && (<>
          <Section emoji="🏦" title="Educação e Emprego">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'1.1rem' }}>
              <Row label="Escolaridade" value={EDU_MAP[student.socioeconomic.educationLevel] || student.socioeconomic.educationLevel}/>
              <Row label="Situação de Emprego" value={EMP_MAP[student.socioeconomic.employmentStatus] || student.socioeconomic.employmentStatus}/>
              <Row label="Renda Familiar" value={INC_MAP[student.socioeconomic.familyIncome] || student.socioeconomic.familyIncome}/>
              <Row label="Membros na Família" value={String(student.socioeconomic.familyMembersCount)}/>
              <Row label="Programa Social" value={PROG_MAP[student.socioeconomic.socialProgram] || student.socioeconomic.socialProgram}/>
            </div>
          </Section>
          <Section emoji="♿" title="Acessibilidade">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'1rem' }}>
              <div>
                <div style={{ fontSize:'.62rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.09em', color:'#9CA3AF', marginBottom:'.3rem' }}>PcD</div>
                <span style={{ display:'inline-flex', alignItems:'center', gap:'.3rem', padding:'.2rem .65rem', borderRadius:100, fontSize:'.72rem', fontWeight:700, background: student.socioeconomic.hasDisability ? '#FEF2F2' : '#F3F4F6', color: student.socioeconomic.hasDisability ? '#DC2626' : '#9CA3AF', width:'fit-content' }}>
                  {student.socioeconomic.hasDisability ? '● Sim' : '○ Não'}
                </span>
              </div>
              {student.socioeconomic.hasDisability && <>
                <Row label="Tipo" value={student.socioeconomic.disabilityType}/>
                <div>
                  <div style={{ fontSize:'.62rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.09em', color:'#9CA3AF', marginBottom:'.3rem' }}>Precisa de adaptação</div>
                  <span style={{ display:'inline-flex', padding:'.2rem .65rem', borderRadius:100, fontSize:'.72rem', fontWeight:700, background: student.socioeconomic.disabilityAdaptation ? '#FFFDE7' : '#F3F4F6', color: student.socioeconomic.disabilityAdaptation ? '#92730A' : '#9CA3AF', width:'fit-content' }}>
                    {student.socioeconomic.disabilityAdaptation ? '✓ Sim' : '✗ Não'}
                  </span>
                </div>
              </>}
            </div>
          </Section>
        </>)}
        {activeTab === 'socio' && !student.socioeconomic && (
          <div style={{ textAlign:'center', padding:'3rem', color:'#D1D5DB' }}>
            <span style={{ fontSize:'2rem', display:'block', marginBottom:'.75rem' }}>📊</span>
            <p style={{ fontFamily:'"Orbitron",sans-serif', fontSize:'.7rem', letterSpacing:'.1em' }}>DADOS NÃO CADASTRADOS</p>
          </div>
        )}

        {activeTab === 'career' && student.professional && (
          <Section emoji="🎯" title="Objetivos Profissionais">
            <div style={{ marginBottom:'1.25rem' }}>
              <div style={{ fontSize:'.62rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.09em', color:'#9CA3AF', marginBottom:'.5rem' }}>Objetivo de Carreira</div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'.5rem', padding:'.5rem 1rem', borderRadius:12, background:'#FFFDE7', border:'1.5px solid #FFD600', fontWeight:700, color:'#92730A', fontSize:'.85rem' }}>
                🎯 {CAREER_MAP[student.professional.careerGoal] || student.professional.careerGoal}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'1.1rem', marginBottom:'1.25rem' }}>
              <Row label="Qualificação Anterior" value={student.professional.previousQualification}/>
              <Row label="Área de Interesse" value={student.professional.professionalInterest}/>
              <Row label="Como nos conheceu" value={student.professional.howHeardAbout}/>
            </div>
            {student.professional.motivation && (
              <div>
                <div style={{ fontSize:'.62rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.09em', color:'#9CA3AF', marginBottom:'.5rem' }}>Motivação</div>
                <div style={{ background:'#F9FAFB', border:'1px solid #F3F4F6', borderRadius:12, padding:'1rem', fontSize:'.85rem', color:'#374151', lineHeight:1.7 }}>
                  {student.professional.motivation}
                </div>
              </div>
            )}
          </Section>
        )}
        {activeTab === 'career' && !student.professional && (
          <div style={{ textAlign:'center', padding:'3rem', color:'#D1D5DB' }}>
            <span style={{ fontSize:'2rem', display:'block', marginBottom:'.75rem' }}>🎯</span>
            <p style={{ fontFamily:'"Orbitron",sans-serif', fontSize:'.7rem', letterSpacing:'.1em' }}>DADOS NÃO CADASTRADOS</p>
          </div>
        )}

        {activeTab === 'enrollments' && (
          enr.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem', color:'#D1D5DB' }}>
              <span style={{ fontSize:'2.5rem', display:'block', marginBottom:'.75rem' }}>📋</span>
              <p style={{ fontFamily:'"Orbitron",sans-serif', fontSize:'.7rem', letterSpacing:'.1em' }}>NENHUMA MATRÍCULA ENCONTRADA</p>
              <p style={{ fontSize:'.78rem', color:'#D1D5DB', marginTop:'.4rem' }}>Este aluno ainda não possui matrículas</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'.75rem' }}>
              {enr.map((e: any, i: number) => {
                const s = ENROLL_STATUS_MAP[e.status] || { label: e.status, bg:'#F3F4F6', color:'#6B7280' };
                return (
                  <div key={e.id} style={{ background:'#fff', border:'1.5px solid #F3F4F6', borderRadius:14, padding:'1rem 1.25rem', display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap', boxShadow:'0 1px 4px rgba(0,0,0,.05)', animation:`fadeSlide .3s ${i*50}ms both`, transition:'box-shadow .2s' }}
                    onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.boxShadow='0 4px 16px rgba(0,0,0,.1)'}
                    onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.boxShadow='0 1px 4px rgba(0,0,0,.05)'}>
                    <div style={{ width:40, height:40, borderRadius:10, background:'#FFFDE7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontSize:'1.2rem' }}>📚</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, color:'#111827', fontSize:'.88rem', marginBottom:'.15rem' }}>
                        {e.class?.course?.name || '—'}
                      </div>
                      <div style={{ fontSize:'.75rem', color:'#9CA3AF' }}>
                        {e.class?.city?.name}{e.class?.city?.state ? `/${e.class.city.state}` : ''} · Protocolo: <span style={{ fontFamily:'"JetBrains Mono",monospace' }}>{e.protocol}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'.3rem' }}>
                      <span style={{ padding:'.2rem .7rem', borderRadius:100, fontSize:'.68rem', fontWeight:800, background:s.bg, color:s.color, whiteSpace:'nowrap' }}>{s.label}</span>
                      <span style={{ fontSize:'.68rem', color:'#9CA3AF' }}>{fmt(e.enrolledAt)}</span>
                    </div>
                  </div>
                );
              })}
              <style>{`@keyframes fadeSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
            </div>
          )
        )}

        {activeTab === 'frequencia' && (
          Object.keys(attendanceByClass).length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem', color:'#D1D5DB' }}>
              <span style={{ fontSize:'2.5rem', display:'block', marginBottom:'.75rem' }}>📈</span>
              <p style={{ fontFamily:'"Orbitron",sans-serif', fontSize:'.7rem', letterSpacing:'.1em' }}>SEM HISTÓRICO DE FREQUÊNCIA</p>
            </div>
          ) : (
            <Section emoji="📈" title="Consolidado de Frequência por Turma">
              <div style={{ display:'grid', gap:'.7rem' }}>
                {Object.entries(attendanceByClass as Record<string, { present: number; absent: number; courseName: string }>).map(([classId, data]) => {
                  const total = data.present + data.absent;
                  const rate = total ? Math.round((data.present / total) * 100) : 0;
                  return (
                    <div key={classId} style={{ border:'1px solid #E5E7EB', borderRadius:12, padding:'0.85rem 1rem', background:'#fff' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                        <div style={{ fontWeight:700, color:'#111827', fontSize:'.85rem' }}>{data.courseName}</div>
                        <span style={{ fontFamily:'"Orbitron",sans-serif', fontWeight:900, color: rate >= 75 ? '#15803D' : '#DC2626' }}>{rate}%</span>
                      </div>
                      <div style={{ marginTop:6, fontSize:'.75rem', color:'#6B7280' }}>
                        Presentes: {data.present} · Faltas: {data.absent} · Total de registros: {total}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )
        )}

        {activeTab === 'certificados' && (
          certs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem', color:'#D1D5DB' }}>
              <span style={{ fontSize:'2.5rem', display:'block', marginBottom:'.75rem' }}>🏅</span>
              <p style={{ fontFamily:'"Orbitron",sans-serif', fontSize:'.7rem', letterSpacing:'.1em' }}>SEM CERTIFICADOS EMITIDOS</p>
            </div>
          ) : (
            <Section emoji="🏅" title="Histórico de Certificados">
              <div style={{ display:'flex', flexDirection:'column', gap:'.75rem' }}>
                {certs.map((c: any) => (
                  <div key={c.id} style={{ border:'1px solid #E5E7EB', borderRadius:12, padding:'0.85rem 1rem', display:'flex', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
                    <div>
                      <div style={{ fontWeight:700, color:'#111827', fontSize:'.85rem' }}>{c.class?.course?.name || 'Curso'}</div>
                      <div style={{ fontSize:'.75rem', color:'#6B7280' }}>Código: {c.certificateCode || '—'}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'.72rem', color:'#6B7280' }}>Emitido em</div>
                      <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.78rem', color:'#111827' }}>{fmt(c.issuedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )
        )}

        {activeTab === 'auditoria' && (
          <Section emoji="🧾" title="Auditoria e Consentimentos (LGPD)">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:'0.75rem', marginBottom:'1rem' }}>
              <div style={{ border:'1px solid #E5E7EB', borderRadius:12, padding:'0.8rem' }}>
                <div style={{ fontSize:'.66rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:'#6B7280' }}>Criado em</div>
                <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.82rem', color:'#111827' }}>{fmt(student.createdAt)}</div>
              </div>
              <div style={{ border:'1px solid #E5E7EB', borderRadius:12, padding:'0.8rem' }}>
                <div style={{ fontSize:'.66rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:'#6B7280' }}>Último login (user)</div>
                <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.82rem', color:'#111827' }}>{fmt(student.user?.lastLoginAt)}</div>
              </div>
            </div>

            <div style={{ fontSize:'.68rem', fontWeight:800, letterSpacing:'.08em', textTransform:'uppercase', color:'#6B7280', marginBottom:8 }}>
              Registros de consentimento ({consents.length})
            </div>
            {consents.length === 0 ? (
              <p style={{ color:'#9CA3AF', fontSize:'.78rem' }}>Nenhum consentimento registrado.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
                {consents.map((c: any) => (
                  <div key={c.id} style={{ border:'1px solid #E5E7EB', borderRadius:10, padding:'0.7rem 0.8rem' }}>
                    <div style={{ fontSize:'.8rem', fontWeight:700, color:'#111827' }}>
                      Termos: {c.termsAccepted ? 'Sim' : 'Não'} · LGPD: {c.dataProcessing ? 'Sim' : 'Não'} · Imagem: {c.imageUse ? 'Sim' : 'Não'}
                    </div>
                    <div style={{ fontSize:'.72rem', color:'#6B7280' }}>Registrado em {fmt(c.recordedAt)} {c.ipAddress ? `· IP ${c.ipAddress}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}
