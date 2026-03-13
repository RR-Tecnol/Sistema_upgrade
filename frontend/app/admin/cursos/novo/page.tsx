'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { coursesApi, CreateCourseDto } from '@/lib/api/courses';
import Link from 'next/link';

// ── Icons (inline SVGs to avoid extra deps) ──────────────────────────────────
const Icons = {
    Arrow: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
    ),
    Book: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
    ),
    Clock: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
            <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
        </svg>
    ),
    Map: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-10.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
        </svg>
    ),
    Check: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    ),
    Sparkle: () => (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
    ),
    Star: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
    ),
    Truck: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
    ),
    Plus: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    ),
    X: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    Loader: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 animate-spin">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
    ),
};

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
    { id: 1, label: 'Identidade', icon: 'book', desc: 'Nome e descrição' },
    { id: 2, label: 'Estrutura', icon: 'clock', desc: 'Carga e duração' },
    { id: 3, label: 'Abrangência', icon: 'map', desc: 'Regiões e ementa' },
    { id: 4, label: 'Revisão', icon: 'check', desc: 'Confirmar e criar' },
];

// ── Reusable field components ─────────────────────────────────────────────────
function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="nc-field">
            <label className="nc-label">{label}</label>
            {hint && <p className="nc-hint">{hint}</p>}
            {children}
        </div>
    );
}

function NumberStepper({ name, value, onChange, min = 1, max = 9999, suffix = '' }: {
    name: string; value: number; onChange: (name: string, val: number) => void;
    min?: number; max?: number; suffix?: string;
}) {
    return (
        <div className="nc-stepper">
            <button type="button" className="nc-stepper-btn" onClick={() => onChange(name, Math.max(min, value - 1))}>−</button>
            <span className="nc-stepper-val">{value}{suffix && <em>{suffix}</em>}</span>
            <button type="button" className="nc-stepper-btn" onClick={() => onChange(name, Math.min(max, value + 1))}>+</button>
        </div>
    );
}

function Toggle({ checked, onChange, label, sublabel }: {
    checked: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string;
}) {
    return (
        <button type="button" onClick={() => onChange(!checked)}
            className={`nc-toggle-card ${checked ? 'nc-toggle-card--on' : ''}`}>
            <div className="nc-toggle-icon">{checked ? '✓' : '○'}</div>
            <div className="flex-1 text-left">
                <div className="nc-toggle-label">{label}</div>
                {sublabel && <div className="nc-toggle-sub">{sublabel}</div>}
            </div>
            <div className={`nc-toggle-switch ${checked ? 'nc-toggle-switch--on' : ''}`}>
                <div className="nc-toggle-thumb" />
            </div>
        </button>
    );
}

// ── Tag input for prerequisites ───────────────────────────────────────────────
function TagInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [tags, setTags] = useState<string[]>(value ? value.split(',').map(t => t.trim()).filter(Boolean) : []);
    const [input, setInput] = useState('');
    const ref = useRef<HTMLInputElement>(null);

    const addTag = () => {
        const t = input.trim();
        if (t && !tags.includes(t)) {
            const next = [...tags, t];
            setTags(next);
            onChange(next.join(', '));
        }
        setInput('');
    };

    const removeTag = (i: number) => {
        const next = tags.filter((_, idx) => idx !== i);
        setTags(next);
        onChange(next.join(', '));
    };

    return (
        <div className="nc-tag-box" onClick={() => ref.current?.focus()}>
            {tags.map((t, i) => (
                <span key={i} className="nc-tag">
                    {t}
                    <button type="button" onClick={e => { e.stopPropagation(); removeTag(i); }} className="nc-tag-x">
                        <Icons.X />
                    </button>
                </span>
            ))}
            <input
                ref={ref}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                placeholder={tags.length === 0 ? 'Digite e pressione Enter...' : ''}
                className="nc-tag-input"
            />
        </div>
    );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
    return (
        <div className="nc-progress">
            <div className="nc-progress-fill" style={{ width: `${((step) / total) * 100}%` }} />
        </div>
    );
}

// ── Review card ───────────────────────────────────────────────────────────────
function ReviewRow({ label, value }: { label: string; value: string | number | boolean }) {
    const display = typeof value === 'boolean' ? (value ? '✓ Sim' : '✗ Não') : String(value || '—');
    return (
        <div className="nc-review-row">
            <span className="nc-review-label">{label}</span>
            <span className={`nc-review-value ${typeof value === 'boolean' ? (value ? 'text-emerald-600' : 'text-red-400') : ''}`}>{display}</span>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NovoCursoPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');

    const [formData, setFormData] = useState<CreateCourseDto>({
        name: '',
        description: '',
        durationDaysMA: 30,
        durationDaysPI: 30,
        workloadHours: 120,
        prerequisites: '',
        syllabus: '',
        availableInMA: true,
        availableInPI: true,
        isMulticourse: false,
    });

    const set = (field: string, value: unknown) =>
        setFormData(p => ({ ...p, [field]: value }));

    const setNum = (name: string, val: number) =>
        setFormData(p => ({ ...p, [name]: val }));

    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        set(name, value);
        if (errors[name]) setErrors(p => { const n = { ...p }; delete n[name]; return n; });
    };

    // ── Validation per step ──
    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (step === 1) {
            if (!formData.name.trim()) errs.name = 'Nome é obrigatório';
            if (!formData.description.trim()) errs.description = 'Descrição é obrigatória';
            if (formData.description.trim().length < 20) errs.description = 'Descrição muito curta (mín. 20 caracteres)';
        }
        if (step === 2) {
            if (formData.workloadHours < 1) errs.workloadHours = 'Informe a carga horária';
            if (formData.durationDaysMA < 1) errs.durationDaysMA = 'Duração inválida';
            if (formData.durationDaysPI < 1) errs.durationDaysPI = 'Duração inválida';
        }
        if (step === 3) {
            if (!formData.syllabus.trim()) errs.syllabus = 'Ementa é obrigatória';
            if (!formData.availableInMA && !formData.availableInPI) errs.region = 'Selecione ao menos uma região';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const goNext = () => {
        if (!validate()) return;
        setAnimDir('forward');
        setStep(s => Math.min(4, s + 1));
    };

    const goBack = () => {
        setAnimDir('back');
        setStep(s => Math.max(1, s - 1));
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            await coursesApi.create(formData);
            setSuccess(true);
            setTimeout(() => router.push('/admin/cursos'), 2200);
        } catch {
            setErrors({ submit: 'Erro ao criar curso. Tente novamente.' });
        } finally {
            setLoading(false);
        }
    };

    const charCount = formData.description.length;
    const syllabusLines = formData.syllabus.split('\n').filter(l => l.trim()).length;

    // ── Step 1: Identity ──────────────────────────────────────────────────────
    const Step1 = () => (
        <div className="nc-step-body">
            <div className="nc-step-hero">
                <div className="nc-hero-icon nc-hero-icon--yellow"><Icons.Book /></div>
                <div>
                    <h2 className="nc-step-title">Identidade do Curso</h2>
                    <p className="nc-step-sub">Como o mundo vai conhecer este curso?</p>
                </div>
            </div>

            <FieldGroup label="Nome do Curso *" hint="Seja objetivo. Ex: Informática Básica para Inclusão Digital">
                <div className="relative">
                    <input
                        name="name"
                        value={formData.name}
                        onChange={handleInput}
                        className={`nc-input nc-input--lg ${errors.name ? 'nc-input--error' : ''}`}
                        placeholder="Ex: Informática Básica"
                        autoFocus
                    />
                    {formData.name && (
                        <span className="nc-input-badge">
                            {formData.name.length} chars
                        </span>
                    )}
                </div>
                {errors.name && <p className="nc-error">{errors.name}</p>}
            </FieldGroup>

            <FieldGroup label="Descrição do Curso *" hint="Apresente o curso de forma clara e motivadora para os alunos">
                <div className="relative">
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInput}
                        className={`nc-input nc-textarea ${errors.description ? 'nc-input--error' : ''}`}
                        placeholder="Descreva os objetivos, público-alvo e benefícios do curso para os alunos..."
                        rows={5}
                    />
                    <span className={`nc-char-count ${charCount > 500 ? 'text-amber-500' : ''}`}>
                        {charCount} / 1000
                    </span>
                </div>
                {errors.description && <p className="nc-error">{errors.description}</p>}
            </FieldGroup>

            <FieldGroup label="Tipo de Curso">
                <Toggle
                    checked={formData.isMulticourse}
                    onChange={v => set('isMulticourse', v)}
                    label="Multicurso"
                    sublabel="Agrupa múltiplas disciplinas ou módulos em sequência"
                />
            </FieldGroup>
        </div>
    );

    // ── Step 2: Structure ─────────────────────────────────────────────────────
    const Step2 = () => (
        <div className="nc-step-body">
            <div className="nc-step-hero">
                <div className="nc-hero-icon nc-hero-icon--cyan"><Icons.Clock /></div>
                <div>
                    <h2 className="nc-step-title">Estrutura Temporal</h2>
                    <p className="nc-step-sub">Defina carga horária e duração em cada estado</p>
                </div>
            </div>

            <FieldGroup label="Carga Horária Total *" hint="Total de horas-aula previstas no curso">
                <div className="nc-stepper-row">
                    <NumberStepper name="workloadHours" value={formData.workloadHours} onChange={setNum} min={1} max={9999} suffix="h" />
                    <div className="nc-metric-card nc-metric-yellow">
                        <span className="nc-metric-num">{formData.workloadHours}</span>
                        <span className="nc-metric-unit">horas</span>
                    </div>
                    <div className="nc-metric-card nc-metric-blue">
                        <span className="nc-metric-num">{Math.ceil(formData.workloadHours / 4)}</span>
                        <span className="nc-metric-unit">semanas est.</span>
                    </div>
                </div>
                {errors.workloadHours && <p className="nc-error">{errors.workloadHours}</p>}
            </FieldGroup>

            <div className="nc-grid-2">
                <FieldGroup label="Duração no Maranhão *" hint="Dias para conclusão (MA)">
                    <div className="nc-duration-card nc-duration-ma">
                        <div className="nc-duration-flag">🟢 MA</div>
                        <NumberStepper name="durationDaysMA" value={formData.durationDaysMA} onChange={setNum} min={1} suffix=" dias" />
                        <div className="nc-duration-weeks">{Math.ceil(formData.durationDaysMA / 5)} semanas letivas</div>
                    </div>
                    {errors.durationDaysMA && <p className="nc-error">{errors.durationDaysMA}</p>}
                </FieldGroup>

                <FieldGroup label="Duração no Piauí *" hint="Dias para conclusão (PI)">
                    <div className="nc-duration-card nc-duration-pi">
                        <div className="nc-duration-flag">🔵 PI</div>
                        <NumberStepper name="durationDaysPI" value={formData.durationDaysPI} onChange={setNum} min={1} suffix=" dias" />
                        <div className="nc-duration-weeks">{Math.ceil(formData.durationDaysPI / 5)} semanas letivas</div>
                    </div>
                    {errors.durationDaysPI && <p className="nc-error">{errors.durationDaysPI}</p>}
                </FieldGroup>
            </div>

            {/* Comparison widget */}
            <div className="nc-compare-card">
                <p className="nc-compare-title">Diferença entre regiões</p>
                <div className="nc-compare-bars">
                    <div className="nc-compare-bar-row">
                        <span>MA</span>
                        <div className="nc-compare-track">
                            <div className="nc-compare-fill nc-compare-fill--ma"
                                style={{ width: `${Math.min(100, (formData.durationDaysMA / Math.max(formData.durationDaysMA, formData.durationDaysPI)) * 100)}%` }} />
                        </div>
                        <span className="nc-compare-label">{formData.durationDaysMA}d</span>
                    </div>
                    <div className="nc-compare-bar-row">
                        <span>PI</span>
                        <div className="nc-compare-track">
                            <div className="nc-compare-fill nc-compare-fill--pi"
                                style={{ width: `${Math.min(100, (formData.durationDaysPI / Math.max(formData.durationDaysMA, formData.durationDaysPI)) * 100)}%` }} />
                        </div>
                        <span className="nc-compare-label">{formData.durationDaysPI}d</span>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── Step 3: Reach + Syllabus ──────────────────────────────────────────────
    const Step3 = () => (
        <div className="nc-step-body">
            <div className="nc-step-hero">
                <div className="nc-hero-icon nc-hero-icon--purple"><Icons.Map /></div>
                <div>
                    <h2 className="nc-step-title">Abrangência & Conteúdo</h2>
                    <p className="nc-step-sub">Onde o curso irá e o que ele ensina</p>
                </div>
            </div>

            <FieldGroup label="Regiões de Atuação *">
                <div className="nc-regions">
                    <Toggle
                        checked={formData.availableInMA}
                        onChange={v => set('availableInMA', v)}
                        label="Maranhão"
                        sublabel="Qualifica Maranhão — programa itinerante"
                    />
                    <Toggle
                        checked={formData.availableInPI}
                        onChange={v => set('availableInPI', v)}
                        label="Piauí"
                        sublabel="Qualifica Piauí — programa itinerante"
                    />
                </div>
                {errors.region && <p className="nc-error">{errors.region}</p>}
            </FieldGroup>

            <FieldGroup label="Pré-requisitos" hint="Adicione tags pressionando Enter ou vírgula">
                <TagInput value={formData.prerequisites ?? ''} onChange={v => set('prerequisites', v)} />
            </FieldGroup>

            <FieldGroup label="Ementa do Curso *" hint={`${syllabusLines} módulo(s) detectado(s) — uma linha por módulo`}>
                <div className="relative">
                    <textarea
                        name="syllabus"
                        value={formData.syllabus}
                        onChange={handleInput}
                        className={`nc-input nc-textarea nc-syllabus ${errors.syllabus ? 'nc-input--error' : ''}`}
                        placeholder={"Módulo 1: Introdução à Informática\nMódulo 2: Sistema Operacional Windows\nMódulo 3: Internet e E-mail\nMódulo 4: Pacote Office Básico"}
                        rows={8}
                    />
                    {syllabusLines > 0 && (
                        <div className="nc-syllabus-pills">
                            {formData.syllabus.split('\n').filter(l => l.trim()).slice(0, 6).map((m, i) => (
                                <span key={i} className="nc-syllabus-pill">
                                    <span className="nc-syllabus-num">{i + 1}</span>
                                    {m.replace(/^módulo\s*\d+[:.]\s*/i, '').substring(0, 30)}{m.length > 30 ? '…' : ''}
                                </span>
                            ))}
                            {syllabusLines > 6 && <span className="nc-syllabus-pill nc-syllabus-pill--more">+{syllabusLines - 6} mais</span>}
                        </div>
                    )}
                </div>
                {errors.syllabus && <p className="nc-error">{errors.syllabus}</p>}
            </FieldGroup>
        </div>
    );

    // ── Step 4: Review ────────────────────────────────────────────────────────
    const Step4 = () => (
        <div className="nc-step-body">
            <div className="nc-step-hero">
                <div className="nc-hero-icon nc-hero-icon--green"><Icons.Check /></div>
                <div>
                    <h2 className="nc-step-title">Revisão Final</h2>
                    <p className="nc-step-sub">Confirme os dados antes de criar o curso</p>
                </div>
            </div>

            <div className="nc-review-grid">
                <div className="nc-review-section">
                    <div className="nc-review-section-title"><Icons.Book /> Identidade</div>
                    <ReviewRow label="Nome" value={formData.name} />
                    <ReviewRow label="Multicurso" value={formData.isMulticourse} />
                    <div className="nc-review-row nc-review-row--desc">
                        <span className="nc-review-label">Descrição</span>
                        <span className="nc-review-desc">{formData.description || '—'}</span>
                    </div>
                </div>

                <div className="nc-review-section">
                    <div className="nc-review-section-title"><Icons.Clock /> Estrutura</div>
                    <ReviewRow label="Carga Horária" value={`${formData.workloadHours}h`} />
                    <ReviewRow label="Duração MA" value={`${formData.durationDaysMA} dias`} />
                    <ReviewRow label="Duração PI" value={`${formData.durationDaysPI} dias`} />
                </div>

                <div className="nc-review-section">
                    <div className="nc-review-section-title"><Icons.Map /> Abrangência</div>
                    <ReviewRow label="Disponível MA" value={formData.availableInMA} />
                    <ReviewRow label="Disponível PI" value={formData.availableInPI} />
                    <ReviewRow label="Pré-requisitos" value={formData.prerequisites || 'Nenhum'} />
                </div>

                <div className="nc-review-section nc-review-section--wide">
                    <div className="nc-review-section-title"><Icons.Star /> Ementa</div>
                    <div className="nc-review-syllabus">
                        {formData.syllabus.split('\n').filter(l => l.trim()).map((m, i) => (
                            <div key={i} className="nc-review-syllabus-item">
                                <span className="nc-review-syllabus-num">{i + 1}</span>
                                <span>{m}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {errors.submit && (
                <div className="nc-alert-error">
                    <span>⚠</span> {errors.submit}
                </div>
            )}
        </div>
    );

    // ── Success Overlay ───────────────────────────────────────────────────────
    if (success) {
        return (
            <div className="nc-success-overlay">
                <div className="nc-success-card">
                    <div className="nc-success-ring">
                        <div className="nc-success-icon"><Icons.Check /></div>
                    </div>
                    <h2 className="nc-success-title">Curso Criado!</h2>
                    <p className="nc-success-sub">"{formData.name}" foi cadastrado com sucesso.</p>
                    <div className="nc-success-bar" />
                    <p className="nc-success-redirect">Redirecionando para lista de cursos...</p>
                </div>
            </div>
        );
    }

    // FEAT-CUR2: renderização condicional direta evita piscar (Step1..4 redefinidas a cada render criavam unmount/mount)
    const renderStep = () => {
        switch (step) {
            case 1: return <Step1 />;
            case 2: return <Step2 />;
            case 3: return <Step3 />;
            default: return <Step4 />;
        }
    };

    return (
        <>
            <style>{`
        /* ── Page wrapper ── */
        .nc-page { max-width: 860px; margin: 0 auto; padding: 0 0 4rem; }

        /* ── Header ── */
        .nc-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
        .nc-back { display:flex; align-items:center; justify-content:center; width:2.5rem; height:2.5rem;
          border-radius:12px; border:1.5px solid var(--border-default); background:#fff;
          cursor:pointer; transition:all .2s; color:var(--text-secondary); text-decoration:none; }
        .nc-back:hover { border-color:var(--brand-yellow); background:var(--brand-yellow-light); color:#000; transform:translateY(-1px); }
        .nc-page-title { font-family:'Orbitron',sans-serif; font-size:2.2rem; font-weight:900;
          background:linear-gradient(135deg,#B89B00,#FFD600,#E6A800);
          -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
        .nc-page-sub { font-size:.85rem; color:var(--text-muted); margin-top:.2rem; }

        /* ── Stepper nav ── */
        .nc-stepper-nav { display:flex; gap:.5rem; margin-bottom:1.5rem; position:relative; }
        .nc-stepper-nav::before { content:''; position:absolute; top:50%; left:0; right:0; height:1px;
          background:var(--border-default); z-index:0; transform:translateY(-50%); }
        .nc-step-pill { display:flex; align-items:center; gap:.5rem; padding:.45rem 1.1rem .45rem .7rem;
          border-radius:100px; border:1.5px solid var(--border-default); background:#fff;
          font-size:.78rem; font-weight:600; cursor:pointer; transition:all .2s;
          position:relative; z-index:1; color:var(--text-muted); white-space:nowrap; }
        .nc-step-pill--active { border-color:var(--brand-yellow); background:var(--brand-yellow);
          color:#000; box-shadow:0 2px 10px rgba(255,214,0,.4); }
        .nc-step-pill--done { border-color:#10b981; background:#ecfdf5; color:#059669; }
        .nc-step-dot { width:1.4rem; height:1.4rem; border-radius:50%; display:flex;
          align-items:center; justify-content:center; font-size:.65rem; font-weight:800;
          background:currentColor; color:#fff; }
        .nc-step-pill--active .nc-step-dot { background:#000; color:var(--brand-yellow); }
        .nc-step-pill--done .nc-step-dot { background:#10b981; color:#fff; }

        /* ── Progress ── */
        .nc-progress { height:3px; background:var(--border-default); border-radius:99px; margin-bottom:2rem; overflow:hidden; }
        .nc-progress-fill { height:100%; background:linear-gradient(90deg,#B89B00,#FFD600,#E6A800);
          border-radius:99px; transition:width .5s cubic-bezier(.16,1,.3,1); }

        /* ── Main card ── */
        .nc-card { background:#fff; border:1.5px solid var(--border-subtle);
          border-radius:20px; box-shadow:0 4px 24px rgba(0,0,0,.06); overflow:hidden; }

        /* ── Step body ── */
        .nc-step-body { padding:2rem 2.5rem; display:flex; flex-direction:column; gap:2rem;
          animation: ncFadeIn .4s cubic-bezier(.16,1,.3,1) both; }
        @keyframes ncFadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }

        /* ── Step hero ── */
        .nc-step-hero { display:flex; align-items:center; gap:1.25rem; padding-bottom:1.5rem;
          border-bottom:1.5px solid var(--border-subtle); }
        .nc-hero-icon { width:3.5rem; height:3.5rem; border-radius:16px; display:flex;
          align-items:center; justify-content:center; flex-shrink:0; }
        .nc-hero-icon--yellow { background:linear-gradient(135deg,#FFD600,#E6A800); color:#000;
          box-shadow:0 4px 16px rgba(255,214,0,.4); }
        .nc-hero-icon--cyan { background:linear-gradient(135deg,#0891B2,#0E7490); color:#fff;
          box-shadow:0 4px 16px rgba(8,145,178,.35); }
        .nc-hero-icon--purple { background:linear-gradient(135deg,#7C3AED,#6D28D9); color:#fff;
          box-shadow:0 4px 16px rgba(124,58,237,.35); }
        .nc-hero-icon--green { background:linear-gradient(135deg,#059669,#047857); color:#fff;
          box-shadow:0 4px 16px rgba(5,150,105,.35); }
        .nc-step-title { font-family:'Orbitron',sans-serif; font-size:1.4rem; font-weight:800; color:var(--text-primary); }
        .nc-step-sub { font-size:.85rem; color:var(--text-muted); margin-top:.2rem; }

        /* ── Fields ── */
        .nc-field { display:flex; flex-direction:column; gap:.5rem; }
        .nc-label { font-size:.7rem; font-weight:800; text-transform:uppercase; letter-spacing:.08em;
          color:var(--text-muted); }
        .nc-hint { font-size:.78rem; color:#9CA3AF; margin-top:-.25rem; margin-bottom:.1rem; }
        .nc-input { width:100%; padding:.8rem 1.1rem; border:1.5px solid var(--border-default);
          border-radius:12px; font-size:.9rem; color:var(--text-primary); background:#fff;
          transition:all .2s; outline:none; }
        .nc-input::placeholder { color:#C9CDD4; }
        .nc-input:hover { border-color:rgba(255,214,0,.6); }
        .nc-input:focus { border-color:var(--brand-yellow); box-shadow:0 0 0 4px rgba(255,214,0,.12); }
        .nc-input--lg { font-size:1.05rem; padding:.95rem 1.1rem; font-weight:500; }
        .nc-input--error { border-color:#F87171 !important; box-shadow:0 0 0 3px rgba(248,113,113,.15) !important; }
        .nc-error { font-size:.75rem; color:#DC2626; font-weight:600; display:flex; align-items:center; gap:.3rem; }
        .nc-error::before { content:'⚠'; }
        .nc-textarea { resize:vertical; min-height:120px; font-family:'Inter',sans-serif; line-height:1.7; }
        .nc-syllabus { font-family:'JetBrains Mono',monospace; font-size:.85rem; min-height:180px; }
        .nc-input-badge { position:absolute; right:.8rem; top:50%; transform:translateY(-50%);
          font-size:.65rem; font-weight:700; color:var(--text-muted);
          background:#F3F4F6; padding:.15rem .5rem; border-radius:99px; }
        .nc-char-count { position:absolute; right:.8rem; bottom:.6rem; font-size:.65rem;
          color:var(--text-muted); }

        /* ── Stepper number ── */
        .nc-stepper { display:inline-flex; align-items:center; gap:0; border:1.5px solid var(--border-default);
          border-radius:12px; overflow:hidden; background:#fff; }
        .nc-stepper-btn { width:2.6rem; height:2.6rem; display:flex; align-items:center; justify-content:center;
          font-size:1.2rem; font-weight:700; cursor:pointer; border:none; background:transparent;
          color:var(--text-secondary); transition:all .15s; }
        .nc-stepper-btn:hover { background:var(--brand-yellow-light); color:#000; }
        .nc-stepper-val { min-width:4.5rem; text-align:center; font-family:'Orbitron',sans-serif;
          font-size:1.1rem; font-weight:800; color:var(--text-primary); padding:0 .5rem; }
        .nc-stepper-val em { font-style:normal; font-size:.65rem; font-family:'Inter',sans-serif;
          color:var(--text-muted); margin-left:.2rem; }
        .nc-stepper-row { display:flex; align-items:center; gap:1.25rem; flex-wrap:wrap; }

        /* ── Metric cards ── */
        .nc-metric-card { display:flex; flex-direction:column; align-items:center;
          padding:.5rem 1.25rem; border-radius:12px; border:1.5px solid; }
        .nc-metric-yellow { background:#FFFBEB; border-color:#FDE68A; }
        .nc-metric-blue { background:#EFF6FF; border-color:#BFDBFE; }
        .nc-metric-num { font-family:'Orbitron',sans-serif; font-size:1.4rem; font-weight:800;
          color:var(--text-primary); line-height:1; }
        .nc-metric-unit { font-size:.6rem; text-transform:uppercase; letter-spacing:.08em;
          color:var(--text-muted); font-weight:700; margin-top:.15rem; }

        /* ── Duration card ── */
        .nc-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; }
        @media(max-width:600px) { .nc-grid-2 { grid-template-columns:1fr; } }
        .nc-duration-card { border:1.5px solid; border-radius:16px; padding:1.25rem;
          display:flex; flex-direction:column; align-items:center; gap:.75rem; }
        .nc-duration-ma { background:#F0FDF4; border-color:#BBF7D0; }
        .nc-duration-pi { background:#EFF6FF; border-color:#BFDBFE; }
        .nc-duration-flag { font-weight:800; font-size:.8rem; letter-spacing:.05em; }
        .nc-duration-weeks { font-size:.72rem; color:var(--text-muted); font-weight:600;
          background:#fff; padding:.2rem .7rem; border-radius:99px; border:1px solid var(--border-subtle); }

        /* ── Compare bars ── */
        .nc-compare-card { background:#F9FAFB; border:1.5px solid var(--border-subtle);
          border-radius:14px; padding:1.25rem 1.5rem; }
        .nc-compare-title { font-size:.72rem; font-weight:800; text-transform:uppercase;
          letter-spacing:.08em; color:var(--text-muted); margin-bottom:.85rem; }
        .nc-compare-bars { display:flex; flex-direction:column; gap:.75rem; }
        .nc-compare-bar-row { display:flex; align-items:center; gap:.75rem; font-size:.8rem; font-weight:700; }
        .nc-compare-bar-row > span:first-child { width:1.5rem; color:var(--text-muted); }
        .nc-compare-track { flex:1; height:10px; background:#E5E7EB; border-radius:99px; overflow:hidden; }
        .nc-compare-fill { height:100%; border-radius:99px; transition:width .5s cubic-bezier(.16,1,.3,1); }
        .nc-compare-fill--ma { background:linear-gradient(90deg,#10b981,#059669); }
        .nc-compare-fill--pi { background:linear-gradient(90deg,#3b82f6,#2563eb); }
        .nc-compare-label { width:2.5rem; text-align:right; color:var(--text-secondary); }

        /* ── Toggle card ── */
        .nc-toggle-card { display:flex; align-items:center; gap:1rem; border:1.5px solid var(--border-default);
          border-radius:14px; padding:1rem 1.25rem; background:#fff; cursor:pointer;
          transition:all .2s; width:100%; }
        .nc-toggle-card:hover { border-color:rgba(255,214,0,.5); background:#FFFBEB; }
        .nc-toggle-card--on { border-color:var(--brand-yellow); background:#FFFDE7;
          box-shadow:0 0 0 3px rgba(255,214,0,.12); }
        .nc-toggle-icon { font-size:1.1rem; width:1.5rem; }
        .nc-toggle-label { font-size:.9rem; font-weight:700; color:var(--text-primary); }
        .nc-toggle-sub { font-size:.75rem; color:var(--text-muted); margin-top:.15rem; }
        .nc-toggle-switch { width:2.5rem; height:1.4rem; border-radius:99px;
          background:#E5E7EB; position:relative; transition:background .2s; flex-shrink:0; }
        .nc-toggle-switch--on { background:var(--brand-yellow); }
        .nc-toggle-thumb { position:absolute; top:.2rem; left:.2rem; width:1rem; height:1rem;
          border-radius:50%; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.2);
          transition:transform .2s cubic-bezier(.16,1,.3,1); }
        .nc-toggle-switch--on .nc-toggle-thumb { transform:translateX(1.1rem); }

        /* ── Regions ── */
        .nc-regions { display:flex; flex-direction:column; gap:.75rem; }

        /* ── Tag input ── */
        .nc-tag-box { display:flex; flex-wrap:wrap; gap:.4rem; padding:.65rem .85rem;
          border:1.5px solid var(--border-default); border-radius:12px; background:#fff;
          cursor:text; min-height:3rem; align-items:center; transition:all .2s; }
        .nc-tag-box:focus-within { border-color:var(--brand-yellow); box-shadow:0 0 0 4px rgba(255,214,0,.12); }
        .nc-tag { display:inline-flex; align-items:center; gap:.3rem; background:#FFFDE7;
          border:1px solid #FDE68A; border-radius:8px; padding:.2rem .55rem;
          font-size:.78rem; font-weight:600; color:#92730A; }
        .nc-tag-x { display:flex; align-items:center; cursor:pointer; color:#B89B00;
          border:none; background:none; padding:0; line-height:1; }
        .nc-tag-input { border:none; outline:none; font-size:.88rem; background:transparent;
          flex:1; min-width:120px; color:var(--text-primary); }

        /* ── Syllabus pills preview ── */
        .nc-syllabus-pills { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:.75rem; }
        .nc-syllabus-pill { display:inline-flex; align-items:center; gap:.4rem;
          background:#F5F3FF; border:1px solid #DDD6FE; border-radius:8px;
          padding:.2rem .65rem; font-size:.72rem; font-weight:600; color:#6D28D9; }
        .nc-syllabus-pill--more { background:#F3F4F6; border-color:#E5E7EB; color:#6B7280; }
        .nc-syllabus-num { width:1.2rem; height:1.2rem; border-radius:50%; background:#7C3AED;
          color:#fff; font-size:.6rem; display:inline-flex; align-items:center; justify-content:center;
          font-weight:800; flex-shrink:0; }

        /* ── Review ── */
        .nc-review-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
        @media(max-width:640px) { .nc-review-grid { grid-template-columns:1fr; } }
        .nc-review-section { background:#F9FAFB; border:1.5px solid var(--border-subtle);
          border-radius:14px; padding:1.1rem 1.25rem; display:flex; flex-direction:column; gap:.6rem; }
        .nc-review-section--wide { grid-column:1 / -1; }
        .nc-review-section-title { display:flex; align-items:center; gap:.5rem; font-size:.7rem;
          font-weight:800; text-transform:uppercase; letter-spacing:.1em; color:var(--text-muted);
          padding-bottom:.6rem; border-bottom:1px solid var(--border-subtle); }
        .nc-review-row { display:flex; justify-content:space-between; align-items:baseline; gap:.5rem; }
        .nc-review-row--desc { flex-direction:column; align-items:flex-start; }
        .nc-review-label { font-size:.75rem; color:var(--text-muted); font-weight:600; flex-shrink:0; }
        .nc-review-value { font-size:.85rem; font-weight:700; color:var(--text-primary); text-align:right; }
        .nc-review-desc { font-size:.82rem; color:var(--text-secondary); line-height:1.6;
          max-height:4.5rem; overflow:hidden; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; }
        .nc-review-syllabus { display:flex; flex-direction:column; gap:.5rem; }
        .nc-review-syllabus-item { display:flex; align-items:center; gap:.75rem;
          font-size:.82rem; color:var(--text-secondary); }
        .nc-review-syllabus-num { width:1.5rem; height:1.5rem; border-radius:6px;
          background:var(--brand-yellow); color:#000; font-size:.65rem; font-weight:800;
          display:flex; align-items:center; justify-content:center; flex-shrink:0; }

        /* ── Alert ── */
        .nc-alert-error { background:#FEF2F2; border:1.5px solid #FECACA; border-radius:12px;
          padding:.85rem 1.1rem; color:#DC2626; font-size:.85rem; font-weight:600;
          display:flex; align-items:center; gap:.5rem; }

        /* ── Footer actions ── */
        .nc-footer { padding:1.5rem 2.5rem; border-top:1.5px solid var(--border-subtle);
          display:flex; justify-content:space-between; align-items:center; background:#FAFBFC; }
        .nc-footer-left { display:flex; align-items:center; gap:.5rem; }
        .nc-footer-right { display:flex; align-items:center; gap:.75rem; }
        .nc-step-indicator { font-size:.75rem; font-weight:700; color:var(--text-muted);
          font-family:'JetBrains Mono',monospace; }
        .nc-btn-back { display:inline-flex; align-items:center; gap:.4rem; padding:.65rem 1.25rem;
          border:1.5px solid var(--border-default); border-radius:10px; background:#fff;
          font-size:.85rem; font-weight:600; color:var(--text-secondary); cursor:pointer;
          transition:all .2s; }
        .nc-btn-back:hover { border-color:var(--brand-yellow); color:#000; background:#FFFBEB; }
        .nc-btn-next { display:inline-flex; align-items:center; gap:.5rem; padding:.7rem 1.6rem;
          border-radius:10px; border:none; background:var(--brand-yellow); color:#000;
          font-size:.9rem; font-weight:800; cursor:pointer; transition:all .2s;
          box-shadow:0 2px 10px rgba(255,214,0,.4); }
        .nc-btn-next:hover { background:var(--brand-yellow-dark); transform:translateY(-1px);
          box-shadow:0 4px 18px rgba(255,214,0,.5); }
        .nc-btn-next:active { transform:scale(.97); }
        .nc-btn-next:disabled { opacity:.5; cursor:not-allowed; transform:none; box-shadow:none; }
        .nc-btn-submit { background:linear-gradient(135deg,#059669,#047857); color:#fff;
          box-shadow:0 2px 10px rgba(5,150,105,.4); }
        .nc-btn-submit:hover { background:linear-gradient(135deg,#047857,#065F46);
          box-shadow:0 4px 18px rgba(5,150,105,.5); transform:translateY(-1px); }

        /* ── Success overlay ── */
        .nc-success-overlay { position:fixed; inset:0; background:rgba(255,255,255,.92);
          backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center;
          z-index:100; animation:ncFadeIn .4s both; }
        .nc-success-card { text-align:center; max-width:360px; padding:3rem 2rem; }
        .nc-success-ring { width:6rem; height:6rem; border-radius:50%; border:3px solid #10b981;
          display:flex; align-items:center; justify-content:center; margin:0 auto 1.5rem;
          animation:ncPop .5s cubic-bezier(.16,1,.3,1) both; }
        @keyframes ncPop { from{opacity:0;transform:scale(.5)} to{opacity:1;transform:scale(1)} }
        .nc-success-icon { width:3rem; height:3rem; border-radius:50%; background:#10b981;
          display:flex; align-items:center; justify-content:center; color:#fff; }
        .nc-success-title { font-family:'Orbitron',sans-serif; font-size:2rem; font-weight:900;
          color:var(--text-primary); margin-bottom:.5rem; }
        .nc-success-sub { font-size:.9rem; color:var(--text-muted); margin-bottom:2rem; }
        .nc-success-bar { height:3px; background:#E5E7EB; border-radius:99px; overflow:hidden; margin-bottom:1rem; }
        .nc-success-bar::after { content:''; display:block; height:100%;
          background:linear-gradient(90deg,#10b981,#059669);
          animation:ncFill 2s linear both; }
        @keyframes ncFill { from{width:0} to{width:100%} }
        .nc-success-redirect { font-size:.78rem; color:#9CA3AF; }
      `}</style>

            <div className="nc-page">
                {/* Header */}
                <div className="nc-header">
                    <Link href="/admin/cursos" className="nc-back">
                        <Icons.Arrow />
                    </Link>
                    <div>
                        <h1 className="nc-page-title">Novo Curso</h1>
                        <p className="nc-page-sub">Cadastre um novo curso no sistema Upgrade</p>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)', fontFamily: '"JetBrains Mono",monospace' }}>
                            Etapa {step} de {STEPS.length}
                        </span>
                    </div>
                </div>

                {/* Step pills */}
                <div className="nc-stepper-nav">
                    {STEPS.map(s => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                                if (s.id < step) { setAnimDir('back'); setStep(s.id); }
                            }}
                            className={`nc-step-pill ${s.id === step ? 'nc-step-pill--active' : s.id < step ? 'nc-step-pill--done' : ''}`}
                            disabled={s.id > step}
                        >
                            <span className="nc-step-dot" style={{ background: s.id === step ? '#000' : s.id < step ? '#10b981' : '#D1D5DB', color: s.id === step ? 'var(--brand-yellow)' : '#fff', fontSize: '.6rem' }}>
                                {s.id < step ? '✓' : s.id}
                            </span>
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Progress */}
                <ProgressBar step={step} total={STEPS.length} />

                {/* Card */}
                <div className="nc-card">
                    {renderStep()}


                    {/* Footer */}
                    <div className="nc-footer">
                        <div className="nc-footer-left">
                            {step > 1 && (
                                <button type="button" className="nc-btn-back" onClick={goBack}>
                                    ← Voltar
                                </button>
                            )}
                            {step === 1 && (
                                <Link href="/admin/cursos" className="nc-btn-back" style={{ textDecoration: 'none' }}>
                                    Cancelar
                                </Link>
                            )}
                        </div>

                        <div className="nc-footer-right">
                            {step < 4 ? (
                                <button type="button" className="nc-btn-next" onClick={goNext}>
                                    Próximo → {STEPS[step]?.label}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="nc-btn-next nc-btn-submit"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <><Icons.Loader /> Criando curso...</>
                                    ) : (
                                        <><Icons.Sparkle /> Criar Curso</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
