'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { studentsApi } from '@/lib/api/students';
import Link from 'next/link';
import { AdminCreationSuccessScreen } from '@/components/admin/AdminCreationSuccessScreen';

const INIT = {
  name: '', email: '', password: '', phone: '', phoneAlt: '',
  cpf: '', birthDate: '',
  gender: 'MALE', raceColor: 'BROWN', maritalStatus: 'SINGLE',
  motherName: '', fatherName: '', nationality: 'Brasileira',
  birthCity: '', birthState: 'MA', socialName: '',
  cep: '', street: '', addressNumber: '', complement: '',
  neighborhood: '', city: '', state: 'MA', zone: 'URBAN',
  hasWhatsapp: true, allowWhatsappContact: true, allowEmailContact: true,
  educationLevel: 'HIGH_SCHOOL_COMPLETE', employmentStatus: 'UNEMPLOYED',
  familyIncome: 'FROM_1_TO_2_MW', familyMembersCount: 4, socialProgram: 'NONE',
  socialProgramOther: '', // REQ-05: campo para "Outro" programa social
  hasDisability: false, disabilityType: 'NONE', disabilityAdaptation: false,
  previousQualification: '', professionalInterest: '',
  careerGoal: 'SEEK_EMPLOYMENT', howHeardAbout: '', motivation: '',
};

const STEPS = [
  { id: 1, label: 'Acesso', emoji: '🔐', desc: 'Login e contato' },
  { id: 2, label: 'Pessoal', emoji: '👤', desc: 'Documentos e filiação' },
  { id: 3, label: 'Endereço', emoji: '📍', desc: 'Localização' },
  { id: 4, label: 'Perfil', emoji: '📊', desc: 'Dados socioeconômicos' },
  { id: 5, label: 'Objetivo', emoji: '🎯', desc: 'Carreira e motivação' },
];
const HERO_BG = ['#FFFDE7', '#F5F3FF', '#E0F7FA', '#DCFCE7', '#FFF7ED'];

function FG({ label, hint, error, req, children }: { label: string; hint?: string; error?: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div className='na-fg'>
      <label className='na-label'>{label}{req && <span style={{ color: '#EF4444', marginLeft: '.2rem' }}>*</span>}</label>
      {hint && <p className='na-hint'>{hint}</p>}
      {children}
      {error && <p className='na-err'>⚠ {error}</p>}
    </div>
  );
}

function NI({ name, value, onChange, hasErr = false, style, placeholder, type = 'text', min, max, autoFocus }: {
  name: string; value: any; onChange: any; hasErr?: boolean; style?: React.CSSProperties;
  placeholder?: string; type?: string; min?: number; max?: number; autoFocus?: boolean;
}) {
  return (
    <input name={name} value={value} onChange={onChange} placeholder={placeholder}
      type={type} min={min} max={max} autoFocus={autoFocus} style={style}
      className={'na-input' + (hasErr ? ' na-ie' : '')}
    />
  );
}

function NS({ name, value, onChange, children }: { name: string; value: any; onChange: any; children: React.ReactNode }) {
  return (
    <select name={name} value={value} onChange={onChange} className='na-input na-sel'>
      {children}
    </select>
  );
}

function Tog({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button type='button' onClick={() => onChange(!checked)} className={'na-tog' + (checked ? ' na-tog-on' : '')}>
      <div className={'na-sw' + (checked ? ' na-sw-on' : '')}><div className='na-thumb' /></div>
      <div style={{ textAlign: 'left' }}>
        <div className='na-tl'>{label}</div>
        {sub && <div className='na-ts'>{sub}</div>}
      </div>
    </button>
  );
}

function PwBar({ pw }: { pw: string }) {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(pw)).length;
  const cols = ['#E5E7EB', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
  const labs = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  if (!pw) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.35rem' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= score ? cols[score] : '#E5E7EB', transition: 'background .3s' }} />
      ))}
      <span style={{ fontSize: '.7rem', fontWeight: 700, color: cols[score], width: '4rem' }}>{labs[score]}</span>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const ini = name.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  return (
    <div className='na-avatar'>
      {ini
        ? <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{ini}</span>
        : <span style={{ fontSize: '1.4rem' }}>👤</span>
      }
    </div>
  );
}

const maskCpf = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};
const maskPhone = (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 15);
const maskCep = (v: string) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);

export default function NovoAlunoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INIT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const set = useCallback((k: string, v: unknown) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  }, []);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') set(name, (e.target as HTMLInputElement).checked);
    else if (type === 'number') set(name, parseInt(value) || 0);
    else set(name, value);
  };

  const fetchCep = async (cep: string) => {
    const d = cep.replace(/\D/g, '');
    if (d.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch('https://viacep.com.br/ws/' + d + '/json/');
      const j = await r.json();
      if (!j.erro) setForm(p => ({ ...p, street: j.logradouro || p.street, neighborhood: j.bairro || p.neighborhood, city: j.localidade || p.city }));
    } finally { setCepLoading(false); }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!form.name.trim()) e.name = 'Nome obrigatório';
      if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Email inválido';
      if (form.password.length < 6) e.password = 'Mínimo 6 caracteres';
      if (!form.phone.trim()) e.phone = 'Telefone obrigatório';
    }
    if (step === 2) {
      if (form.cpf.replace(/\D/g, '').length !== 11) e.cpf = 'CPF inválido';
      if (!form.birthDate) e.birthDate = 'Data de nascimento obrigatória';
      if (!form.motherName.trim()) e.motherName = 'Nome da mãe obrigatório';
    }
    if (step === 3) {
      if (form.cep.replace(/\D/g, '').length !== 8) e.cep = 'CEP inválido';
      if (!form.street.trim()) e.street = 'Rua obrigatória';
      if (!form.addressNumber.trim()) e.addressNumber = 'Número obrigatório';
      if (!form.neighborhood.trim()) e.neighborhood = 'Bairro obrigatório';
      if (!form.city.trim()) e.city = 'Cidade obrigatória';
    }
    if (step === 5) {
      // motivação é OPCIONAL (REQ-05)
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => { if (validate()) setStep(s => Math.min(5, s + 1)); };
  const goBack = () => setStep(s => Math.max(1, s - 1));

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await studentsApi.create({
        ...form,
        fatherName: form.fatherName || undefined,
        socialName: form.socialName || undefined,
        complement: form.complement || undefined,
        phoneAlt: form.phoneAlt || undefined,
        socialProgram: form.socialProgram || undefined,
        // BUG-S1: só enviar socialProgramOther quando socialProgram === 'OTHER'
        socialProgramOther: form.socialProgram === 'OTHER' ? (form.socialProgramOther || undefined) : undefined,
        disabilityType: form.hasDisability ? form.disabilityType : undefined,
        previousQualification: form.previousQualification || undefined,
        professionalInterest: form.professionalInterest || undefined,
        howHeardAbout: form.howHeardAbout || undefined,
      } as any);
      setSuccess(true);
      setTimeout(() => router.push('/admin/alunos'), 2200);
    } catch (err: any) {
      const msgRaw = err?.response?.data?.message;
      const msg = Array.isArray(msgRaw) ? msgRaw.join(' · ') : (msgRaw || 'Erro ao cadastrar aluno.');
      setErrors({ name: msg });
      setStep(1);
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <AdminCreationSuccessScreen
        title="ALUNO CADASTRADO!"
        secondaryLine={`\u201c${form.name}\u201d foi adicionado com sucesso ao sistema.`}
        redirectMessage="Redirecionando para lista de alunos..."
      />
    );
  }

  const S = STEPS[step - 1];

  return (
    <div className='na-wrap'>
      <div className='na-hdr'>
        <Link href='/admin/alunos' className='na-back'>←</Link>
        <div>
          <h1 className='na-title'>Novo Aluno</h1>
          <p className='na-sub'>Etapa {step} de {STEPS.length} — {STEPS.filter((_, i) => i < step - 1).length} concluída(s)</p>
        </div>
        <Avatar name={form.name} />
      </div>

      <div className='na-pills'>
        {STEPS.map(s => (
          <button key={s.id} type='button'
            className={'na-pill' + (s.id === step ? ' na-pill-a' : s.id < step ? ' na-pill-d' : '')}
            onClick={() => { if (s.id < step) setStep(s.id); }}
            disabled={s.id > step}>
            {s.id < step ? '✓' : s.emoji} {s.label}
          </button>
        ))}
      </div>

      <div className='na-prog-track'>
        <div className='na-prog-fill' style={{ width: ((step / 5) * 100) + '%' }} />
      </div>

      <div className='na-card'>
        <div className='na-body' key={step}>
          <div className='na-hero'>
            <div className='na-hero-icon' style={{ background: HERO_BG[step - 1] }}>{S.emoji}</div>
            <div>
              <div className='na-hero-t'>{S.label}</div>
              <div className='na-hero-s'>{S.desc}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontFamily: '"JetBrains Mono",monospace', fontSize: '.72rem', color: '#9CA3AF' }}>{step}/{STEPS.length}</div>
          </div>

          {step === 1 && (
            <div className='na-sec'>
              <div className='na-sl'>Dados de Acesso</div>
              <div className='na-g2' style={{ marginBottom: '.75rem' }}>
                <FG label='Nome Completo' req error={errors.name}>
                  <NI name='name' value={form.name} onChange={handle} placeholder='Ex: Maria da Silva Santos' hasErr={!!errors.name} autoFocus />
                </FG>
                <FG label='Email' req error={errors.email}>
                  <NI name='email' type='email' value={form.email} onChange={handle} placeholder='exemplo@email.com' hasErr={!!errors.email} />
                </FG>
              </div>
              <div className='na-g2' style={{ marginBottom: '1.25rem', alignItems: 'flex-start' }}>
                <FG label='Senha' req error={errors.password}>
                  <NI name='password' type='password' value={form.password} onChange={handle} hasErr={!!errors.password} />
                  <p className='na-hint'>Mínimo 6 caracteres</p>
                  <PwBar pw={form.password} />
                </FG>
                <FG label='Telefone' req error={errors.phone}>
                  <NI name='phone' value={form.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('phone', maskPhone(e.target.value))} placeholder='(98) 98765-4321' hasErr={!!errors.phone} />
                </FG>
              </div>

              <div className='na-sl'>Preferências de Contato</div>
              <div className='na-g2'>
                <Tog checked={form.hasWhatsapp} onChange={v => set('hasWhatsapp', v)} label='Possui WhatsApp' sub='No número informado' />
                <Tog checked={form.allowEmailContact} onChange={v => set('allowEmailContact', v)} label='Aceita contato por E-mail' sub='Notificações e avisos' />
                <Tog checked={form.allowWhatsappContact} onChange={v => set('allowWhatsappContact', v)} label='Aceita WhatsApp' sub='Mensagens do sistema' />
                <FG label='Telefone Alternativo'>
                  <NI name='phoneAlt' value={form.phoneAlt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('phoneAlt', maskPhone(e.target.value))} placeholder='(98) 99999-0000' />
                </FG>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className='na-sec'>
              <div className='na-sl'>Documentação</div>
              <div className='na-g3' style={{ marginBottom: '1.25rem' }}>
                <FG label='CPF' req error={errors.cpf}>
                  <NI name='cpf' value={form.cpf} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('cpf', maskCpf(e.target.value))} placeholder='123.456.789-00' hasErr={!!errors.cpf} />
                </FG>
              </div>
              <div className='na-sl'>Dados Pessoais</div>
              <div className='na-g3' style={{ marginBottom: '1.25rem' }}>
                <FG label='Data de Nascimento' req error={errors.birthDate}><NI name='birthDate' type='date' value={form.birthDate} onChange={handle} hasErr={!!errors.birthDate} /></FG>
                <FG label='Gênero' req><NS name='gender' value={form.gender} onChange={handle}><option value='MALE'>Masculino</option><option value='FEMALE'>Feminino</option><option value='NON_BINARY'>Não-binário</option><option value='PREFER_NOT_TO_SAY'>Prefiro não informar</option></NS></FG>
                <FG label='Estado Civil' req><NS name='maritalStatus' value={form.maritalStatus} onChange={handle}><option value='SINGLE'>Solteiro(a)</option><option value='MARRIED'>Casado(a)</option><option value='DIVORCED'>Divorciado(a)</option><option value='WIDOWED'>Viúvo(a)</option></NS></FG>
                <FG label='Raça/Cor' req><NS name='raceColor' value={form.raceColor} onChange={handle}><option value='WHITE'>Branco</option><option value='BLACK'>Preto</option><option value='BROWN'>Pardo</option><option value='YELLOW'>Amarelo</option><option value='INDIGENOUS'>Indígena</option><option value='PREFER_NOT_TO_SAY'>Prefiro não informar</option></NS></FG>
                <FG label='Nacionalidade'><NI name='nationality' value={form.nationality} onChange={handle} /></FG>
                <FG label='Nome Social'><NI name='socialName' value={form.socialName} onChange={handle} placeholder='Opcional' /></FG>
              </div>
              <div className='na-sl'>Filiação e Naturalidade</div>
              <div className='na-g2'>
                <FG label='Nome da Mãe' req error={errors.motherName}><NI name='motherName' value={form.motherName} onChange={handle} hasErr={!!errors.motherName} /></FG>
                <FG label='Nome do Pai'><NI name='fatherName' value={form.fatherName} onChange={handle} placeholder='Opcional' /></FG>
                <FG label='Cidade de Nascimento'><NI name='birthCity' value={form.birthCity} onChange={handle} /></FG>
                <FG label='Estado de Nascimento'><NS name='birthState' value={form.birthState} onChange={handle}><option value='MA'>Maranhão</option><option value='PI'>Piauí</option><option value='PA'>Pará</option><option value='CE'>Ceará</option><option value='BA'>Bahia</option><option value='SP'>São Paulo</option><option value='Outro'>Outro</option></NS></FG>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className='na-sec'>
              <div className='na-sl'>Endereço</div>
              <div className='na-tip'><span>💡</span><span>Digite o CEP e clique em <strong>Buscar</strong> para preenchimento automático via ViaCEP.</span></div>
              <div className='na-g3' style={{ marginBottom: '1.25rem' }}>
                <FG label='CEP' req error={errors.cep}>
                  <div className='na-cep-row'>
                    <NI name='cep' value={form.cep} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('cep', maskCep(e.target.value))} placeholder='65000-000' hasErr={!!errors.cep} style={{ flex: 1 }} />
                    <button type='button' className='na-cep-btn' onClick={() => fetchCep(form.cep)}>{cepLoading ? '…' : 'Buscar'}</button>
                  </div>
                </FG>
                <FG label='Número' req error={errors.addressNumber}><NI name='addressNumber' value={form.addressNumber} onChange={handle} placeholder='123' hasErr={!!errors.addressNumber} /></FG>
                <FG label='Complemento'><NI name='complement' value={form.complement} onChange={handle} placeholder='Ap, Bloco...' /></FG>
              </div>
              <div style={{ marginBottom: '1.1rem' }}>
                <FG label='Logradouro / Rua' req error={errors.street}><NI name='street' value={form.street} onChange={handle} hasErr={!!errors.street} /></FG>
              </div>
              <div className='na-g3' style={{ marginBottom: '1.1rem' }}>
                <FG label='Bairro' req error={errors.neighborhood}><NI name='neighborhood' value={form.neighborhood} onChange={handle} hasErr={!!errors.neighborhood} /></FG>
                <FG label='Cidade' req error={errors.city}><NI name='city' value={form.city} onChange={handle} hasErr={!!errors.city} /></FG>
                <FG label='Estado' req><NS name='state' value={form.state} onChange={handle}><option value='MA'>Maranhão</option><option value='PI'>Piauí</option><option value='PA'>Pará</option><option value='CE'>Ceará</option><option value='BA'>Bahia</option><option value='Outro'>Outro</option></NS></FG>
              </div>
              <div className='na-g2'>
                <FG label='Zona Residencial' req><NS name='zone' value={form.zone} onChange={handle}><option value='URBAN'>🏙 Urbana</option><option value='RURAL'>🌾 Rural</option></NS></FG>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className='na-sec'>
              <div className='na-sl'>Educação e Renda</div>
              <div className='na-g2' style={{ marginBottom: '1.25rem' }}>
                <FG label='Escolaridade' req><NS name='educationLevel' value={form.educationLevel} onChange={handle}><option value='ELEMENTARY_INCOMPLETE'>Fundamental Incompleto</option><option value='ELEMENTARY_COMPLETE'>Fundamental Completo</option><option value='HIGH_SCHOOL_INCOMPLETE'>Médio Incompleto</option><option value='HIGH_SCHOOL_COMPLETE'>Médio Completo</option><option value='HIGHER_INCOMPLETE'>Superior Incompleto</option><option value='HIGHER_COMPLETE'>Superior Completo</option></NS></FG>
                <FG label='Situação de Emprego' req><NS name='employmentStatus' value={form.employmentStatus} onChange={handle}><option value='EMPLOYED_CLT'>✅ Empregado CLT</option><option value='EMPLOYED_PJ'>💼 Empregado PJ</option><option value='SELF_EMPLOYED'>🔧 Autônomo</option><option value='UNEMPLOYED'>❌ Desempregado</option><option value='STUDENT'>📚 Estudante</option><option value='HOMEMAKER'>🏠 Do Lar</option><option value='RETIRED'>🏖 Aposentado</option><option value='OTHER'>Outro</option></NS></FG>
                <FG label='Renda Familiar' req><NS name='familyIncome' value={form.familyIncome} onChange={handle}><option value='UP_TO_1_MW'>Até 1 salário mínimo</option><option value='FROM_1_TO_2_MW'>1 a 2 salários</option><option value='FROM_2_TO_3_MW'>2 a 3 salários</option><option value='FROM_3_TO_5_MW'>3 a 5 salários</option><option value='ABOVE_5_MW'>Acima de 5 salários</option><option value='PREFER_NOT_TO_SAY'>Prefiro não informar</option></NS></FG>
                <FG label='Membros na Família' req><NI name='familyMembersCount' type='number' value={form.familyMembersCount} onChange={handle} min={1} max={30} /></FG>
              </div>
              <div className='na-sl'>Acessibilidade e Programas</div>
              <div style={{ marginBottom: '1rem' }}>
                <FG label='Programa Social'>
                  <NS name='socialProgram' value={form.socialProgram} onChange={handle}>
                    <option value='NONE'>Nenhum</option>
                    <option value='BOLSA_FAMILIA'>Bolsa Família</option>
                    <option value='BPC'>BPC/LOAS</option>
                    <option value='AUXILIO_BRASIL'>Auxílio Brasil</option>
                    <option value='PE_DE_MEIA'>Pé de Meia</option>
                    <option value='OTHER'>Outro</option>
                  </NS>
                  {/* BUG-10: campo de texto quando "Outro" selecionado */}
                  {form.socialProgram === 'OTHER' && (
                    <NI name='socialProgramOther' value={(form as any).socialProgramOther}
                      onChange={handle} placeholder='Qual programa?' style={{ marginTop: '.45rem' }} />
                  )}
                </FG>
              </div>
              <Tog checked={form.hasDisability} onChange={v => set('hasDisability', v)} label='Pessoa com Deficiência (PcD)' sub='Declaro que possuo alguma deficiência' />
              <div className='na-dis' style={{ maxHeight: form.hasDisability ? '300px' : 0, opacity: form.hasDisability ? 1 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>

                <div className='na-g2' style={{ marginTop: '1rem' }}>
                  <FG label='Tipo de Deficiência'><NS name='disabilityType' value={form.disabilityType} onChange={handle}><option value='NONE'>Nenhuma</option><option value='VISUAL'>Visual</option><option value='HEARING'>Auditiva</option><option value='PHYSICAL'>Física / Motora</option><option value='INTELLECTUAL'>Intelectual</option><option value='MULTIPLE'>Múltipla</option><option value='OTHER'>Outra</option></NS></FG>
                  <FG label=''><Tog checked={form.disabilityAdaptation} onChange={v => set('disabilityAdaptation', v)} label='Precisa de adaptação' sub='No espaço de aula' /></FG>
                </div>
              </div>
              {/* BUG-2.1: toggle escola pública (REQ-03) */}
              <div style={{ marginTop: '1rem' }}>
                <Tog checked={(form as any).publicSchoolOnly ?? false} onChange={v => set('publicSchoolOnly', v)} label='Sempre estudou em escola pública?' sub='Toda a trajetória escolar em escola pública (REQ-03)' />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className='na-sec'>
              <div className='na-sl'>Objetivo de Carreira</div>
              <div className='na-cg'>
                {[
                  { v: 'SEEK_EMPLOYMENT', e: '💼', l: 'Conseguir Emprego', s: 'Emprego formal / CLT' },
                  { v: 'ENTREPRENEURSHIP', e: '🚀', l: 'Empreender', s: 'Abrir ou expandir negócio' },
                  { v: 'SELF_EMPLOYED', e: '🔧', l: 'Trabalho Autônomo', s: 'Freelancer / conta própria' },
                  { v: 'NOT_SURE', e: '🤔', l: 'Ainda não sei', s: 'Quero explorar opções' },
                ].map(o => (
                  <button key={o.v} type='button' onClick={() => set('careerGoal', o.v)}
                    className={'na-cc' + (form.careerGoal === o.v ? ' na-cc-on' : '')}>
                    <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.3rem' }}>{o.e}</span>
                    <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#111827' }}>{o.l}</div>
                    <div style={{ fontSize: '.72rem', color: '#9CA3AF', marginTop: '.15rem' }}>{o.s}</div>
                  </button>
                ))}
              </div>
              <div className='na-g1'>
                <FG label='Qualificação Anterior'><NI name='previousQualification' value={form.previousQualification} onChange={handle} placeholder='Ex: Curso de Costura, Excel Básico...' /></FG>
                <FG label='Área de Interesse Profissional'><NI name='professionalInterest' value={form.professionalInterest} onChange={handle} placeholder='Ex: Tecnologia, Gastronomia, Saúde...' /></FG>
                <FG label='Como ficou sabendo?'><NS name='howHeardAbout' value={form.howHeardAbout} onChange={handle}><option value=''>Selecione...</option><option value='SOCIAL_MEDIA'>📱 Redes Sociais</option><option value='FRIEND'>👥 Indicação de amigo/familiar</option><option value='RECOMMENDATION'>🤝 Indicado por organização/entidade</option><option value='GOVERNMENT'>🏛 Secretaria / Governo</option><option value='RADIO'>📻 Rádio / TV</option><option value='FLYER'>📄 Panfleto</option><option value='OTHER'>Outro</option></NS></FG>
                {/* BUG-2.3: campo opcional quando "Indicado por organização" */}
                {form.howHeardAbout === 'RECOMMENDATION' && (
                  <FG label='Por qual organização / entidade foi indicado?' hint='Opcional'>
                    <NI name='howHeardAboutOther' value={(form as any).howHeardAboutOther || ''} onChange={handle} placeholder='Ex: CRAS, Secretaria Municipal, Igreja...' />
                  </FG>
                )}
                <FG label='Motivação' error={errors.motivation} hint='Opcional — Por que deseja participar do programa?'>
                  <textarea name='motivation' value={form.motivation} onChange={handle}
                    className={'na-input' + (errors.motivation ? ' na-ie' : '')}
                    style={{ resize: 'vertical', minHeight: '100px', fontFamily: 'inherit', lineHeight: 1.7 }}
                    placeholder='Descreva brevemente seus objetivos com o curso...' />
                </FG>
              </div>
            </div>
          )}
        </div>

        <div className='na-footer'>
          <div>
            {step > 1
              ? <button type='button' className='na-btn-b' onClick={goBack}>← Voltar</button>
              : <Link href='/admin/alunos' className='na-btn-b'>Cancelar</Link>
            }
          </div>
          <div>
            {step < 5
              ? <button type='button' className='na-btn-n' onClick={goNext}>Próximo: {STEPS[step].label} →</button>
              : <button type='button' className={'na-btn-n na-btn-s'} onClick={submit} disabled={loading}>{loading ? '⏳ Cadastrando...' : '✓ Cadastrar Aluno'}</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}