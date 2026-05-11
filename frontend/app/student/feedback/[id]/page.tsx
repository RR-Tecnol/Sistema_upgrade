'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, SparklesIcon, BoltIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import { loadRankCache, saveRankCache } from '@/lib/gamification';

const STEPS = ['Avaliação', 'Comentários', 'Foto Atual', 'Divulgação', 'Chave PIX'];

const STATUS_LABELS: Record<string, string> = {
    EMPLOYED_CLT: 'Empregado CLT',
    EMPLOYED_PJ: 'Empregado PJ',
    SELF_EMPLOYED: 'Autônomo',
    STUDYING: 'Estudando',
    UNEMPLOYED_LOOKING: 'Desempregado (buscando)',
    OTHER: 'Outro',
};

const RATING_LABELS = [
    { key: 'ratingCourse', emoji: '📚', label: 'Conteúdo do Curso' },
    { key: 'ratingTeachers', emoji: '👨‍🏫', label: 'Instrutores' },
    { key: 'ratingManagement', emoji: '🏢', label: 'Organização / Gestão' },
    { key: 'ratingSystem', emoji: '💻', label: 'Sistema / Plataforma' },
    { key: 'ratingGeneral', emoji: '⭐', label: 'Nota Geral' },
];

const PIX_TYPES = [
    { key: 'CPF', icon: '🆔', label: 'CPF' },
    { key: 'EMAIL', icon: '📧', label: 'E-mail' },
    { key: 'PHONE', icon: '📱', label: 'Telefone' },
    { key: 'RANDOM', icon: '🔑', label: 'Chave Aleatória' },
];

interface FeedbackDetail {
    id: string;
    status: string;
    class: {
        course: {
            name: string;
            workloadHours?: number;
            institution?: { name?: string; shortName?: string | null; slug?: string };
        };
        city?: { name: string; state: string };
    };
    student?: { user?: { name?: string } };
    certificate?: { verificationCode: string; issuedAt: string };
    ratingGeneral?: number;
    pixAmount?: number;
    pixKeyType?: 'CPF' | 'EMAIL' | 'PHONE' | 'RANDOM' | null;
    pixKey?: string | null;
    rejectionReason?: string;
    revertReason?: string;
}

export default function StudentFeedbackWizard() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [fb, setFb] = useState<FeedbackDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [comments, setComments] = useState({ commentPositive: '', commentImprovement: '', commentGeneral: '' });
    const [currentStatus, setCurrentStatus] = useState('');
    const [currentStatusDetails, setCurrentStatusDetails] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [pixKeyType, setPixKeyType] = useState('');
    const [pixKey, setPixKey] = useState('');
    /** Fase 6: clique em partilha (LinkedIn ou WhatsApp) — requisito do PIX */
    const [socialShareAck, setSocialShareAck] = useState(false);

    /** Fase 7 — Comprovação real de divulgação social (link + print) */
    const [socialPostPlatform, setSocialPostPlatform] = useState<'LINKEDIN' | 'WHATSAPP' | ''>('');
    const [socialPostUrl, setSocialPostUrl] = useState('');
    const [postProofFile, setPostProofFile] = useState<File | null>(null);
    const [postProofPreview, setPostProofPreview] = useState<string | null>(null);
    const [generatedMessage, setGeneratedMessage] = useState('');

    // Validation state
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [triedNext, setTriedNext] = useState(false);

    // Success state (gamified reward)
    const [showSuccess, setShowSuccess] = useState(false);
    const XP_REWARD = 500;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const r = await api.get(`/feedbacks/my/${id}`);
                setFb(r.data);
            } catch {
                toast.error('Feedback não encontrado');
                router.push('/student/feedback');
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchData();
    }, [id]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onload = () => setPhotoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const MAX_VIDEO_MB = 50;
    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
                toast.error(`Vídeo muito grande. Tamanho máximo: ${MAX_VIDEO_MB}MB`);
                e.target.value = '';
                return;
            }
            if (!file.type.startsWith('video/')) {
                toast.error('Selecione um arquivo de vídeo válido');
                e.target.value = '';
                return;
            }
            // Revoga URL antiga pra evitar memory leak
            if (videoPreview) URL.revokeObjectURL(videoPreview);
            setVideoFile(file);
            setVideoPreview(URL.createObjectURL(file));
        }
    };

    // Cleanup video object URL ao desmontar
    useEffect(() => {
        return () => {
            if (videoPreview) URL.revokeObjectURL(videoPreview);
        };
    }, [videoPreview]);

    const MAX_PROOF_MB = 5;
    const handlePostProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            if (file.size > MAX_PROOF_MB * 1024 * 1024) {
                toast.error(`Imagem muito grande. Tamanho máximo: ${MAX_PROOF_MB}MB`);
                e.target.value = '';
                return;
            }
            if (!file.type.startsWith('image/')) {
                toast.error('Selecione uma imagem (JPG ou PNG)');
                e.target.value = '';
                return;
            }
            setPostProofFile(file);
            const reader = new FileReader();
            reader.onload = () => setPostProofPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    /** Gera mensagem variável baseada no curso, instituição, cidade e dados do certificado */
    const buildPostMessage = (platform: 'LINKEDIN' | 'WHATSAPP', verifyUrl: string): string => {
        if (!fb) return '';
        const courseName = fb.class.course.name || 'Curso';
        const workload = fb.class.course.workloadHours ? `${fb.class.course.workloadHours}h` : '';
        const inst = fb.class.course.institution?.shortName
            || fb.class.course.institution?.name
            || process.env.NEXT_PUBLIC_INSTITUTION_NAME
            || 'UPGRADE';
        const city = fb.class.city?.name || '';
        const state = fb.class.city?.state || '';
        const issuedAt = fb.certificate?.issuedAt
            ? new Date(fb.certificate.issuedAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            : '';
        const courseHashtag = courseName
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '');

        if (platform === 'LINKEDIN') {
            return [
                `🎓 Acabei de concluir o curso de ${courseName} pela ${inst}!`,
                ``,
                workload ? `✅ Carga horária: ${workload}` : null,
                city && state ? `📍 Local: ${city}/${state}` : null,
                issuedAt ? `📅 Concluído em ${issuedAt}` : null,
                ``,
                `Mais uma etapa importante na minha jornada de qualificação profissional. Quem quiser conferir o certificado autenticado: ${verifyUrl}`,
                ``,
                `#QualificaçãoProfissional #Educação #${inst.replace(/\s+/g, '')} ${state ? `#${state}` : ''} #${courseHashtag}`,
            ].filter(Boolean).join('\n');
        }
        // WHATSAPP — casual e curto
        return `Olá! 🎓 Acabei de concluir o curso de ${courseName}${workload ? ` (${workload})` : ''} pela ${inst}${city && state ? ` em ${city}/${state}` : ''}.\n\nConfira meu certificado autenticado: ${verifyUrl}`;
    };

    const handleSubmit = async () => {
        // Validations (all fields mandatory)
        const allErrors = validateAllSteps();
        if (Object.keys(allErrors).length > 0) {
            setErrors(allErrors);
            setTriedNext(true);
            toast.error('Todos os campos são obrigatórios. Revise os campos marcados em vermelho.');
            // jump to first step with error
            const stepWithError = findFirstStepWithError(allErrors);
            if (stepWithError !== step) setStep(stepWithError);
            return;
        }

        try {
            setSubmitting(true);

            // Upload photo
            const { data: presignedPhoto } = await api.post('/feedbacks/presigned-url', {
                filename: photoFile!.name,
                contentType: photoFile!.type,
            });

            await fetch(presignedPhoto.uploadUrl, {
                method: 'PUT',
                body: photoFile,
                headers: { 'Content-Type': photoFile!.type },
            });

            // Upload video
            const { data: presignedVideo } = await api.post('/feedbacks/presigned-url', {
                filename: videoFile!.name,
                contentType: videoFile!.type,
            });

            await fetch(presignedVideo.uploadUrl, {
                method: 'PUT',
                body: videoFile,
                headers: { 'Content-Type': videoFile!.type },
            });

            // Upload screenshot do post (mesmo bucket)
            const { data: presignedProof } = await api.post('/feedbacks/presigned-url', {
                filename: postProofFile!.name,
                contentType: postProofFile!.type,
            });

            await fetch(presignedProof.uploadUrl, {
                method: 'PUT',
                body: postProofFile,
                headers: { 'Content-Type': postProofFile!.type },
            });

            // Submit feedback
            await api.patch(`/feedbacks/${id}/submit`, {
                ...ratings,
                ...comments,
                currentStatus,
                currentStatusDetails,
                currentPhotoUrl: presignedPhoto.fileKey,
                currentVideoUrl: presignedVideo.fileKey,
                pixKeyType,
                pixKey: pixKey.trim(),
                sharedOnSocial: true,
                socialPostPlatform,
                socialPostUrl: socialPostUrl.trim() || undefined,
                socialPostProofUrl: presignedProof.fileKey,
            });

            // Gamification reward — update XP cache for sidebar/header to pick up
            try {
                const cache = loadRankCache();
                if (cache) {
                    saveRankCache({ ...cache, xp: cache.xp + XP_REWARD });
                }
            } catch { /* cache não crítico */ }

            setShowSuccess(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Erro ao enviar feedback');
        } finally {
            setSubmitting(false);
        }
    };

    const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem', width: 40, height: 40 }} />
                <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>CARREGANDO...</p>
            </div>
        );
    }

    if (!fb) return null;

    const canFillWizard = fb.status === 'PENDING_STUDENT_RESPONSE' || fb.status === 'REJECTED';

    // Read-only: envio já feito ou encerrado (não permite reedição pelo wizard)
    if (!canFillWizard) {
        const pixKeyTypeLabel = fb.pixKeyType === 'CPF'
            ? 'CPF'
            : fb.pixKeyType === 'EMAIL'
                ? 'E-mail'
                : fb.pixKeyType === 'PHONE'
                    ? 'Telefone'
                    : fb.pixKeyType === 'RANDOM'
                        ? 'Chave aleatória'
                        : 'Tipo não informado';
        const pixKeySafe = fb.pixKey?.trim() ? fb.pixKey.trim() : 'Chave não informada';
        const statusColor =
            fb.status === 'APPROVED' ? '#059669'
            : fb.status === 'CONTENT_APPROVED' ? '#7C3AED'
            : fb.status === 'REVERTED' ? '#EA580C'
            : fb.status === 'SUBMITTED' ? '#2563EB'
            : '#6B7280';
        const statusLabel =
            fb.status === 'APPROVED' ? 'PIX aprovado — Conta a pagar gerada ✅'
            : fb.status === 'CONTENT_APPROVED' ? 'Triagem aceite — aguardando registo do PIX 👍'
            : fb.status === 'REVERTED' ? 'Revertido ↩️'
            : fb.status === 'SUBMITTED' ? 'Em análise administrativa 🔍'
            : 'Expirado ⏱️';
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 600, margin: '0 auto' }} className="animate-fade-in">
                <button onClick={() => router.push('/student/feedback')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#6B7280', fontWeight: 600 }}>
                    <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Voltar
                </button>
                <div style={{ borderRadius: 20, background: '#fff', border: `2px solid ${statusColor}25`, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                    <div style={{ padding: '1.5rem', background: `${statusColor}08`, borderBottom: `1px solid ${statusColor}15` }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#9CA3AF', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>FEEDBACK</div>
                        <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>{fb.class.course.name}</h2>
                        {fb.class.city && <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 4 }}>📍 {fb.class.city.name}/{fb.class.city.state}</div>}
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', borderRadius: 100, background: `${statusColor}15`, border: `1px solid ${statusColor}30`, marginTop: '0.75rem' }}>
                            <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.72rem', fontWeight: 800, color: statusColor, letterSpacing: '0.06em' }}>{statusLabel}</span>
                        </div>
                    </div>
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {fb.ratingGeneral && <div style={{ fontSize: '0.88rem', color: '#374151' }}>⭐ Nota geral: <strong>{fb.ratingGeneral}/5</strong></div>}
                        <div style={{ padding: '0.85rem 1rem', borderRadius: 14, background: '#F8FAFC', border: '1.5px solid #E2E8F0' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Chave PIX cadastrada</div>
                            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: 4 }}>{pixKeyTypeLabel}</div>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', wordBreak: 'break-all' }}>{pixKeySafe}</div>
                        </div>
                        {fb.status === 'CONTENT_APPROVED' && (
                            <div style={{ padding: '0.85rem 1rem', borderRadius: 14, background: '#F5F3FF', border: '1.5px solid rgba(124,58,237,0.35)', fontSize: '0.8rem', color: '#5B21B6', lineHeight: 1.5 }}>
                                O seu envio foi aceite na triagem. O valor do PIX será confirmado pela equipa e verá aqui assim que a Conta a pagar estiver registada.
                            </div>
                        )}
                        {fb.pixAmount && fb.status === 'APPROVED' && (
                            <div style={{ padding: '0.85rem 1rem', borderRadius: 14, background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', border: '1.5px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <span style={{ fontSize: '1.5rem' }}>💰</span>
                                <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Valor aprovado (PIX)</div>
                                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.25rem', color: '#059669' }}>R$ {Number(fb.pixAmount).toFixed(2)}</div>
                                </div>
                            </div>
                        )}
                        {fb.rejectionReason && (
                            <div style={{ padding: '0.85rem 1rem', borderRadius: 14, background: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)', border: '1.5px solid rgba(220,38,38,0.25)' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', marginBottom: 4 }}>Motivo</div>
                                <p style={{ fontSize: '0.85rem', color: '#374151', margin: 0 }}>{fb.rejectionReason}</p>
                            </div>
                        )}
                        {fb.revertReason && (
                            <div style={{ padding: '0.85rem 1rem', borderRadius: 14, background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)', border: '1.5px solid rgba(234,88,12,0.25)' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', marginBottom: 4 }}>Motivo da Reversão</div>
                                <p style={{ fontSize: '0.85rem', color: '#374151', margin: 0 }}>{fb.revertReason}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Wizard — convite inicial ou reenvio após rejeição
    const validateStep = (idx: number): Record<string, string> => {
        const e: Record<string, string> = {};
        if (idx === 0) {
            RATING_LABELS.forEach(r => { if (!ratings[r.key]) e[r.key] = 'Avaliação obrigatória'; });
        }
        if (idx === 1) {
            if (!comments.commentPositive.trim() || comments.commentPositive.trim().length < 5) e.commentPositive = 'Descreva o que mais gostou (mínimo 5 caracteres)';
            if (!comments.commentImprovement.trim() || comments.commentImprovement.trim().length < 5) e.commentImprovement = 'Descreva o que pode melhorar (mínimo 5 caracteres)';
            if (!comments.commentGeneral.trim() || comments.commentGeneral.trim().length < 5) e.commentGeneral = 'Escreva um comentário geral (mínimo 5 caracteres)';
        }
        if (idx === 2) {
            if (!currentStatus) e.currentStatus = 'Selecione sua situação atual';
            if (!currentStatusDetails.trim() || currentStatusDetails.trim().length < 3) e.currentStatusDetails = 'Descreva onde está trabalhando/estudando (mínimo 3 caracteres)';
            if (!photoFile) e.photo = 'Foto atual é obrigatória';
            if (!videoFile) e.video = 'Vídeo atual é obrigatório';
        }
        if (idx === 3) {
            if (!socialPostPlatform) e.socialPostPlatform = 'Escolha LinkedIn ou WhatsApp';
            if (!socialShareAck) e.sharedOnSocial = 'Clique em "Postar agora" para gerar o post';
            if (socialPostPlatform === 'LINKEDIN') {
                if (!socialPostUrl.trim()) e.socialPostUrl = 'Cole o link do seu post no LinkedIn';
                else if (!/^https?:\/\/.+/i.test(socialPostUrl.trim())) e.socialPostUrl = 'URL inválida (deve começar com https://)';
            }
            if (socialPostPlatform === 'WHATSAPP' && socialPostUrl.trim() && !/^https?:\/\/.+/i.test(socialPostUrl.trim())) {
                e.socialPostUrl = 'URL inválida (se informada, deve começar com https://)';
            }
            if (!postProofFile) e.postProof = 'Envie o screenshot/print do post como comprovação';
        }
        if (idx === 4) {
            if (!pixKeyType) e.pixKeyType = 'Escolha o tipo de chave PIX';
            if (!pixKey.trim() || pixKey.trim().length < 3) e.pixKey = 'Informe uma chave PIX válida';
        }
        return e;
    };

    const validateAllSteps = (): Record<string, string> => ({
        ...validateStep(0), ...validateStep(1), ...validateStep(2), ...validateStep(3), ...validateStep(4),
    });

    const findFirstStepWithError = (allErrs: Record<string, string>): number => {
        for (let i = 0; i < 5; i++) {
            const keys = Object.keys(validateStep(i));
            if (keys.some(k => allErrs[k])) return i;
        }
        return 0;
    };

    const canGoNext = () => Object.keys(validateStep(step)).length === 0;

    const tryGoNext = () => {
        const stepErrors = validateStep(step);
        setErrors(stepErrors);
        setTriedNext(true);
        if (Object.keys(stepErrors).length === 0) {
            setStep(s => s + 1);
            setTriedNext(false);
            setErrors({});
        }
    };

    const fieldErr = (key: string): string | null => triedNext ? (errors[key] ?? null) : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 600, margin: '0 auto' }} className="animate-fade-in">
            <button onClick={() => router.push('/student/feedback')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#6B7280', fontWeight: 600 }}>
                <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Voltar
            </button>

            {/* Course info */}
            <div style={{ borderRadius: 16, background: 'linear-gradient(135deg, #FFD600, #F59E0B)', padding: '1.15rem 1.35rem', boxShadow: '0 4px 16px rgba(255,214,0,0.3)' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,0,0,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>AVALIAÇÃO DE CURSO</div>
                <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.1rem', fontWeight: 900, color: '#0F172A' }}>{fb.class.course.name}</div>
                {fb.class.city && <div style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>📍 {fb.class.city.name}/{fb.class.city.state}</div>}
            </div>

            {fb.status === 'REJECTED' && (
                <div style={{ borderRadius: 14, padding: '1rem 1.15rem', background: '#FEF2F2', border: '1.5px solid rgba(220,38,38,0.25)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', marginBottom: 6 }}>Última análise — precisa reenviar</div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151', lineHeight: 1.55 }}>{fb.rejectionReason?.trim() || 'Verifique também as suas notificações no sistema.'}</p>
                    <p style={{ margin: '0.75rem 0 0', fontSize: '0.76rem', color: '#92400E', fontWeight: 600 }}>Preencha novamente todos os passos abaixo e envie o feedback outra vez.</p>
                </div>
            )}

            {/* Progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {STEPS.map((s, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                        <div style={{
                            width: '100%', height: 4, borderRadius: 2,
                            background: i <= step ? 'linear-gradient(135deg, #FFD600, #F59E0B)' : '#E5E7EB',
                            transition: 'background 0.3s',
                        }} />
                        <span style={{ fontSize: '0.58rem', fontWeight: i === step ? 800 : 500, color: i === step ? '#B89B00' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s}</span>
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div style={{ borderRadius: 20, background: '#fff', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '1.5rem' }}>
                    {/* Step 0 — Ratings */}
                    {step === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em' }}>⭐ Avalie cada aspecto de 1 a 5 <span style={{ color: '#DC2626' }}>*</span></div>
                            {RATING_LABELS.map(({ key, emoji, label }) => {
                                const err = fieldErr(key);
                                return (
                                    <div key={key}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: err ? '#DC2626' : '#374151', marginBottom: 8 }}>
                                            {emoji} {label} <span style={{ color: '#DC2626' }}>*</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {[1, 2, 3, 4, 5].map(v => (
                                                <button key={v} type="button" onClick={() => { setRatings(r => ({ ...r, [key]: v })); if (triedNext) setErrors(e => { const n = {...e}; delete n[key]; return n; }); }}
                                                    style={{
                                                        width: 48, height: 48, borderRadius: 12,
                                                        background: ratings[key] === v ? 'linear-gradient(135deg, #FFD600, #F59E0B)' : '#F9FAFB',
                                                        border: `2px solid ${ratings[key] === v ? '#F59E0B' : err ? '#DC2626' : '#E5E7EB'}`,
                                                        cursor: 'pointer', fontFamily: 'Orbitron, sans-serif', fontWeight: 800,
                                                        fontSize: '1rem', color: ratings[key] === v ? '#0F172A' : '#9CA3AF',
                                                        boxShadow: ratings[key] === v ? '0 4px 12px rgba(255,214,0,0.3)' : 'none',
                                                        transition: 'all 0.15s',
                                                    }}
                                                >{v}</button>
                                            ))}
                                        </div>
                                        {err && <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>⚠️ {err}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Step 1 — Comments */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em' }}>💬 Seus comentários <span style={{ color: '#DC2626' }}>*</span> <span style={{ color: '#9CA3AF', fontWeight: 500 }}>(todos obrigatórios)</span></div>
                            {[
                                { key: 'commentPositive', label: '😊 O que você mais gostou?', placeholder: 'Ex: A didática dos professores e o material de apoio foram excelentes...' },
                                { key: 'commentImprovement', label: '💡 O que podemos melhorar?', placeholder: 'Ex: Mais exercícios práticos e mais tempo para dúvidas no final da aula...' },
                                { key: 'commentGeneral', label: '📝 Comentário geral', placeholder: 'Ex: Curso importante para minha formação, recomendo muito!' },
                            ].map(({ key, label, placeholder }) => {
                                const err = fieldErr(key);
                                return (
                                    <div key={key}>
                                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: err ? '#DC2626' : '#374151', marginBottom: 8, display: 'block' }}>
                                            {label} <span style={{ color: '#DC2626' }}>*</span>
                                        </label>
                                        <textarea
                                            value={(comments as any)[key]}
                                            onChange={e => { setComments(c => ({ ...c, [key]: e.target.value })); if (triedNext) setErrors(er => { const n = {...er}; delete n[key]; return n; }); }}
                                            rows={3}
                                            placeholder={placeholder}
                                            style={{ width: '100%', padding: '0.7rem 0.85rem', borderRadius: 10, border: `2px solid ${err ? '#DC2626' : '#E5E7EB'}`, fontSize: '0.88rem', background: err ? '#FEF2F2' : '#F9FAFB', resize: 'vertical', minHeight: 80 }}
                                        />
                                        {err && <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>⚠️ {err}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Step 2 — Photo & Status */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em' }}>📸 Sua situação atual <span style={{ color: '#DC2626' }}>*</span></div>
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: fieldErr('currentStatus') ? '#DC2626' : '#374151', marginBottom: 8, display: 'block' }}>
                                    Situação profissional <span style={{ color: '#DC2626' }}>*</span>
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                        <button key={key} type="button" onClick={() => { setCurrentStatus(key); if (triedNext) setErrors(er => { const n = {...er}; delete n.currentStatus; return n; }); }}
                                            style={{
                                                padding: '0.65rem 0.75rem', borderRadius: 10,
                                                background: currentStatus === key ? '#FFD60015' : '#F9FAFB',
                                                border: `2px solid ${currentStatus === key ? '#F59E0B' : fieldErr('currentStatus') ? '#DC2626' : '#E5E7EB'}`,
                                                cursor: 'pointer', fontSize: '0.75rem', fontWeight: currentStatus === key ? 700 : 500,
                                                color: currentStatus === key ? '#B89B00' : '#6B7280', textAlign: 'left',
                                                transition: 'all 0.15s',
                                            }}
                                        >{label}</button>
                                    ))}
                                </div>
                                {fieldErr('currentStatus') && <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>⚠️ {fieldErr('currentStatus')}</div>}
                            </div>
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: fieldErr('currentStatusDetails') ? '#DC2626' : '#374151', marginBottom: 6, display: 'block' }}>
                                    Descrição detalhada <span style={{ color: '#DC2626' }}>*</span>
                                </label>
                                <div style={{ fontSize: '0.7rem', color: '#6B7280', marginBottom: 8 }}>
                                    Empresa onde trabalha, curso que está fazendo, cargo, ou outras informações de relevância.
                                </div>
                                <input type="text" value={currentStatusDetails}
                                    onChange={e => { setCurrentStatusDetails(e.target.value); if (triedNext) setErrors(er => { const n = {...er}; delete n.currentStatusDetails; return n; }); }}
                                    placeholder="Ex: Analista Jr. na empresa XYZ / Cursando Administração na UFMA"
                                    style={{ width: '100%', padding: '0.7rem 0.85rem', borderRadius: 10, border: `2px solid ${fieldErr('currentStatusDetails') ? '#DC2626' : '#E5E7EB'}`, fontSize: '0.88rem', background: fieldErr('currentStatusDetails') ? '#FEF2F2' : '#F9FAFB' }}
                                />
                                {fieldErr('currentStatusDetails') && <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>⚠️ {fieldErr('currentStatusDetails')}</div>}
                            </div>
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: fieldErr('photo') ? '#DC2626' : '#374151', marginBottom: 6, display: 'block' }}>
                                    📸 Foto atual (obrigatória) <span style={{ color: '#DC2626' }}>*</span>
                                </label>
                                <div style={{ fontSize: '0.7rem', color: '#6B7280', marginBottom: 8 }}>
                                    Uma foto sua no trabalho atual, cursando ensino superior, em atividade profissional ou em outro contexto relevante para sua trajetória pós-curso.
                                </div>
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.15rem',
                                    borderRadius: 14, border: `2px dashed ${photoPreview ? '#10B981' : fieldErr('photo') ? '#DC2626' : '#D1D5DB'}`,
                                    background: photoPreview ? '#F0FDF4' : fieldErr('photo') ? '#FEF2F2' : '#F9FAFB', cursor: 'pointer',
                                }}>
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { handlePhotoChange(e); if (triedNext) setErrors(er => { const n = {...er}; delete n.photo; return n; }); }} />
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Preview" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: 64, height: 64, borderRadius: 12, background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>📸</div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: photoPreview ? '#059669' : '#374151' }}>{photoFile ? photoFile.name : 'Selecionar foto'}</div>
                                        <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 2 }}>{photoFile ? `${(photoFile.size / 1024).toFixed(0)} KB` : 'JPG ou PNG'}</div>
                                    </div>
                                    {photoFile && (
                                        <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setPhotoFile(null); setPhotoPreview(null); }}
                                            style={{ width: 28, height: 28, borderRadius: 8, background: '#FEE2E2', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                    )}
                                </label>
                                {fieldErr('photo') && <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>⚠️ {fieldErr('photo')}</div>}
                            </div>

                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: fieldErr('video') ? '#DC2626' : '#374151', marginBottom: 6, display: 'block' }}>
                                    🎥 Vídeo atual (obrigatório) <span style={{ color: '#DC2626' }}>*</span>
                                </label>
                                <div style={{ fontSize: '0.7rem', color: '#6B7280', marginBottom: 8 }}>
                                    Um vídeo curto (15-60s) mostrando seu momento atual: no trabalho, na faculdade, em entrevistas ou na sua rotina pós-curso. Máx {MAX_VIDEO_MB}MB.
                                </div>
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.15rem',
                                    borderRadius: 14, border: `2px dashed ${videoPreview ? '#10B981' : fieldErr('video') ? '#DC2626' : '#D1D5DB'}`,
                                    background: videoPreview ? '#F0FDF4' : fieldErr('video') ? '#FEF2F2' : '#F9FAFB', cursor: 'pointer',
                                }}>
                                    <input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => { handleVideoChange(e); if (triedNext) setErrors(er => { const n = {...er}; delete n.video; return n; }); }} />
                                    {videoPreview ? (
                                        <video src={videoPreview} style={{ width: 96, height: 64, borderRadius: 12, objectFit: 'cover', background: '#000' }} muted playsInline />
                                    ) : (
                                        <div style={{ width: 96, height: 64, borderRadius: 12, background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>🎥</div>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: videoPreview ? '#059669' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{videoFile ? videoFile.name : 'Selecionar vídeo'}</div>
                                        <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 2 }}>{videoFile ? `${(videoFile.size / 1024 / 1024).toFixed(1)} MB` : `MP4, MOV ou WEBM — até ${MAX_VIDEO_MB}MB`}</div>
                                    </div>
                                    {videoFile && (
                                        <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); if (videoPreview) URL.revokeObjectURL(videoPreview); setVideoFile(null); setVideoPreview(null); }}
                                            style={{ width: 28, height: 28, borderRadius: 8, background: '#FEE2E2', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                                    )}
                                </label>
                                {videoPreview && (
                                    <div style={{ marginTop: 10, padding: '0.5rem', background: '#000', borderRadius: 10 }}>
                                        <video src={videoPreview} controls style={{ width: '100%', maxHeight: 240, borderRadius: 8, display: 'block' }} playsInline />
                                    </div>
                                )}
                                {fieldErr('video') && <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>⚠️ {fieldErr('video')}</div>}
                            </div>
                        </div>
                    )}

                    {/* Step 3 — Divulgação (requisito do prêmio PIX) */}
                    {step === 3 && (() => {
                        const origin = typeof window !== 'undefined' ? window.location.origin : '';
                        const verifyUrl = fb.certificate?.verificationCode
                            ? `${origin}/certificado/verificar/${fb.certificate.verificationCode}`
                            : origin;

                        const handleSelectPlatform = (platform: 'LINKEDIN' | 'WHATSAPP') => {
                            setSocialPostPlatform(platform);
                            setSocialShareAck(false); // reset — aluno tem que clicar "postar" de novo
                            const msg = buildPostMessage(platform, verifyUrl);
                            setGeneratedMessage(msg);
                            if (triedNext) setErrors(er => { const n = { ...er }; delete n.socialPostPlatform; return n; });
                        };

                        const handlePost = async () => {
                            if (!socialPostPlatform) return;
                            const msg = generatedMessage || buildPostMessage(socialPostPlatform, verifyUrl);

                            if (socialPostPlatform === 'WHATSAPP') {
                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
                                toast.success('WhatsApp aberto. Publique e volte aqui para enviar o print.');
                            } else {
                                // LINKEDIN: copia texto + abre diálogo de partilha (LinkedIn não aceita pré-fill de texto desde 2018)
                                try {
                                    await navigator.clipboard.writeText(msg);
                                    toast.success('Texto copiado! Cole (Ctrl+V) na caixa do LinkedIn que vai abrir.');
                                } catch {
                                    toast.error('Copie o texto manualmente e cole no LinkedIn.');
                                }
                                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`, '_blank', 'noopener,noreferrer');
                            }
                            setSocialShareAck(true);
                            if (triedNext) setErrors(er => { const n = { ...er }; delete n.sharedOnSocial; return n; });
                        };

                        const handleCopyMessage = async () => {
                            try {
                                await navigator.clipboard.writeText(generatedMessage);
                                toast.success('Texto copiado!');
                            } catch {
                                toast.error('Não foi possível copiar. Selecione e copie manualmente.');
                            }
                        };

                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em' }}>🚀 Divulgue sua conquista <span style={{ color: '#DC2626' }}>*</span></div>
                                <p style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
                                    Para receber a recompensa PIX, você precisa publicar o seu certificado no LinkedIn ou WhatsApp e enviar o link + print do post como comprovação. O sistema gera o texto pronto pra você só colar.
                                </p>

                                {/* Bloco A — Escolher plataforma */}
                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: fieldErr('socialPostPlatform') ? '#DC2626' : '#374151', marginBottom: 8, display: 'block' }}>
                                        1️⃣ Onde você vai postar? <span style={{ color: '#DC2626' }}>*</span>
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                        <button type="button" onClick={() => handleSelectPlatform('LINKEDIN')}
                                            style={{
                                                padding: '0.9rem 0.75rem', borderRadius: 14, cursor: 'pointer',
                                                background: socialPostPlatform === 'LINKEDIN'
                                                    ? 'linear-gradient(135deg, #0f172a, #1e3a5f)'
                                                    : '#F9FAFB',
                                                color: socialPostPlatform === 'LINKEDIN' ? '#e0f2fe' : '#374151',
                                                border: `2px solid ${socialPostPlatform === 'LINKEDIN' ? '#38bdf8' : fieldErr('socialPostPlatform') ? '#DC2626' : '#E5E7EB'}`,
                                                fontWeight: 800, fontSize: '0.86rem',
                                                fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.04em',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                boxShadow: socialPostPlatform === 'LINKEDIN' ? '0 8px 24px rgba(2, 132, 199, 0.3)' : 'none',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <span style={{ color: socialPostPlatform === 'LINKEDIN' ? '#38bdf8' : '#0a66c2' }}>in</span>
                                            LinkedIn
                                        </button>
                                        <button type="button" onClick={() => handleSelectPlatform('WHATSAPP')}
                                            style={{
                                                padding: '0.9rem 0.75rem', borderRadius: 14, cursor: 'pointer',
                                                background: socialPostPlatform === 'WHATSAPP'
                                                    ? 'linear-gradient(135deg, #022c22, #064e3b)'
                                                    : '#F9FAFB',
                                                color: socialPostPlatform === 'WHATSAPP' ? '#d1fae5' : '#374151',
                                                border: `2px solid ${socialPostPlatform === 'WHATSAPP' ? '#10B981' : fieldErr('socialPostPlatform') ? '#DC2626' : '#E5E7EB'}`,
                                                fontWeight: 800, fontSize: '0.86rem',
                                                fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.04em',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                boxShadow: socialPostPlatform === 'WHATSAPP' ? '0 8px 24px rgba(16, 185, 129, 0.3)' : 'none',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <span>💬</span> WhatsApp
                                        </button>
                                    </div>
                                    {fieldErr('socialPostPlatform') && <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>⚠️ {fieldErr('socialPostPlatform')}</div>}
                                </div>

                                {/* Bloco B — Mensagem pronta + botão de postar */}
                                {socialPostPlatform && (
                                    <div style={{ animation: 'fbFadeIn 0.3s ease-out' }}>
                                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 8, display: 'block' }}>
                                            2️⃣ Mensagem pronta — edite se quiser
                                        </label>
                                        <div style={{ fontSize: '0.7rem', color: '#6B7280', marginBottom: 8 }}>
                                            {socialPostPlatform === 'LINKEDIN'
                                                ? 'Ao clicar em "Postar agora", o texto é copiado automaticamente e o LinkedIn abre — só colar (Ctrl+V) e publicar.'
                                                : 'Ao clicar em "Postar agora", o WhatsApp Web abre com a mensagem já pronta para enviar.'
                                            }
                                        </div>
                                        <textarea
                                            value={generatedMessage}
                                            onChange={e => setGeneratedMessage(e.target.value)}
                                            rows={socialPostPlatform === 'LINKEDIN' ? 8 : 4}
                                            style={{
                                                width: '100%', padding: '0.75rem 0.85rem', borderRadius: 10,
                                                border: '2px solid #E5E7EB', fontSize: '0.82rem',
                                                background: '#F9FAFB', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
                                            }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                                            <button type="button" onClick={handleCopyMessage}
                                                style={{
                                                    flex: 1, padding: '0.6rem 0.85rem', borderRadius: 10, cursor: 'pointer',
                                                    background: '#F3F4F6', border: '2px solid #E5E7EB',
                                                    fontWeight: 700, fontSize: '0.78rem', color: '#374151',
                                                }}
                                            >📋 Copiar texto</button>
                                            <button type="button" onClick={handlePost}
                                                style={{
                                                    flex: 2, padding: '0.6rem 0.85rem', borderRadius: 10, cursor: 'pointer',
                                                    background: socialShareAck
                                                        ? 'linear-gradient(135deg, #10B981, #059669)'
                                                        : 'linear-gradient(135deg, #FFD600, #F59E0B)',
                                                    color: socialShareAck ? '#fff' : '#0F172A',
                                                    border: 'none', fontWeight: 800, fontSize: '0.82rem',
                                                    fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.04em',
                                                    boxShadow: socialShareAck
                                                        ? '0 4px 16px rgba(16,185,129,0.3)'
                                                        : '0 4px 16px rgba(255,214,0,0.3)',
                                                }}
                                            >{socialShareAck ? '✅ Já postou? Postar de novo' : '🚀 Postar agora'}</button>
                                        </div>
                                    </div>
                                )}

                                {/* Bloco C — Comprovação (só aparece após clicar "Postar agora") */}
                                {socialShareAck && (
                                    <div style={{ animation: 'fbFadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem', borderTop: '2px dashed #E5E7EB', marginTop: '0.5rem' }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
                                            3️⃣ Agora envie a comprovação <span style={{ color: '#DC2626' }}>*</span>
                                        </div>

                                        {/* URL do post */}
                                        <div>
                                            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: fieldErr('socialPostUrl') ? '#DC2626' : '#374151', marginBottom: 6, display: 'block' }}>
                                                🔗 Link do post {socialPostPlatform === 'LINKEDIN' ? <span style={{ color: '#DC2626' }}>*</span> : <span style={{ color: '#9CA3AF', fontWeight: 500 }}>(opcional para WhatsApp Status)</span>}
                                            </label>
                                            <div style={{ fontSize: '0.68rem', color: '#6B7280', marginBottom: 6 }}>
                                                {socialPostPlatform === 'LINKEDIN'
                                                    ? 'No LinkedIn: clique nos 3 pontinhos do seu post → "Copiar link". Cole aqui.'
                                                    : 'Se postou em Status, deixe vazio. Se postou em Canal/Grupo público, cole o link.'}
                                            </div>
                                            <input type="text" value={socialPostUrl}
                                                onChange={e => { setSocialPostUrl(e.target.value); if (triedNext) setErrors(er => { const n = { ...er }; delete n.socialPostUrl; return n; }); }}
                                                placeholder={socialPostPlatform === 'LINKEDIN' ? 'https://www.linkedin.com/posts/seu-usuario_...' : 'https://chat.whatsapp.com/... (opcional)'}
                                                style={{
                                                    width: '100%', padding: '0.7rem 0.85rem', borderRadius: 10,
                                                    border: `2px solid ${fieldErr('socialPostUrl') ? '#DC2626' : '#E5E7EB'}`,
                                                    fontSize: '0.82rem', background: fieldErr('socialPostUrl') ? '#FEF2F2' : '#F9FAFB',
                                                    fontFamily: 'JetBrains Mono, monospace',
                                                }}
                                            />
                                            {fieldErr('socialPostUrl') && <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>⚠️ {fieldErr('socialPostUrl')}</div>}
                                        </div>

                                        {/* Screenshot upload */}
                                        <div>
                                            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: fieldErr('postProof') ? '#DC2626' : '#374151', marginBottom: 6, display: 'block' }}>
                                                📸 Screenshot/print do post <span style={{ color: '#DC2626' }}>*</span>
                                            </label>
                                            <div style={{ fontSize: '0.68rem', color: '#6B7280', marginBottom: 6 }}>
                                                Tire um print do seu post publicado mostrando texto e data. Máx {MAX_PROOF_MB}MB.
                                            </div>
                                            <label style={{
                                                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem',
                                                borderRadius: 12, cursor: 'pointer',
                                                border: `2px dashed ${postProofPreview ? '#10B981' : fieldErr('postProof') ? '#DC2626' : '#D1D5DB'}`,
                                                background: postProofPreview ? '#F0FDF4' : fieldErr('postProof') ? '#FEF2F2' : '#F9FAFB',
                                            }}>
                                                <input type="file" accept="image/*" style={{ display: 'none' }}
                                                    onChange={e => { handlePostProofChange(e); if (triedNext) setErrors(er => { const n = { ...er }; delete n.postProof; return n; }); }} />
                                                {postProofPreview ? (
                                                    <img src={postProofPreview} alt="Preview" style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: 60, height: 60, borderRadius: 10, background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📸</div>
                                                )}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: postProofPreview ? '#059669' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {postProofFile ? postProofFile.name : 'Selecionar print'}
                                                    </div>
                                                    <div style={{ fontSize: '0.66rem', color: '#9CA3AF', marginTop: 2 }}>
                                                        {postProofFile ? `${(postProofFile.size / 1024).toFixed(0)} KB` : `JPG ou PNG — até ${MAX_PROOF_MB}MB`}
                                                    </div>
                                                </div>
                                                {postProofFile && (
                                                    <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setPostProofFile(null); setPostProofPreview(null); }}
                                                        style={{ width: 26, height: 26, borderRadius: 7, background: '#FEE2E2', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                                                )}
                                            </label>
                                            {fieldErr('postProof') && <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>⚠️ {fieldErr('postProof')}</div>}
                                        </div>
                                    </div>
                                )}

                                {fieldErr('sharedOnSocial') && !socialShareAck && (
                                    <div style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 600 }}>⚠️ {fieldErr('sharedOnSocial')}</div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Step 4 — PIX */}
                    {step === 4 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em' }}>💰 Sua chave PIX para receber a recompensa <span style={{ color: '#DC2626' }}>*</span></div>
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: fieldErr('pixKeyType') ? '#DC2626' : '#374151', marginBottom: 8, display: 'block' }}>
                                    Tipo da chave <span style={{ color: '#DC2626' }}>*</span>
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                                    {PIX_TYPES.map(({ key, icon, label }) => (
                                        <button key={key} type="button" onClick={() => { setPixKeyType(key); if (triedNext) setErrors(er => { const n = {...er}; delete n.pixKeyType; return n; }); }}
                                            style={{
                                                padding: '0.75rem', borderRadius: 12,
                                                background: pixKeyType === key ? 'linear-gradient(135deg, #FFD60020, #F59E0B15)' : '#F9FAFB',
                                                border: `2px solid ${pixKeyType === key ? '#F59E0B' : fieldErr('pixKeyType') ? '#DC2626' : '#E5E7EB'}`,
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                fontSize: '0.82rem', fontWeight: pixKeyType === key ? 700 : 500,
                                                color: pixKeyType === key ? '#B89B00' : '#6B7280', transition: 'all 0.15s',
                                            }}
                                        ><span style={{ fontSize: '1.25rem' }}>{icon}</span> {label}</button>
                                    ))}
                                </div>
                                {fieldErr('pixKeyType') && <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>⚠️ {fieldErr('pixKeyType')}</div>}
                            </div>
                            {pixKeyType && (
                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: fieldErr('pixKey') ? '#DC2626' : '#374151', marginBottom: 8, display: 'block' }}>
                                        {pixKeyType === 'CPF' ? '🆔 Número do CPF' : pixKeyType === 'EMAIL' ? '📧 E-mail' : pixKeyType === 'PHONE' ? '📱 Telefone' : '🔑 Chave aleatória'}
                                        <span style={{ color: '#DC2626' }}> *</span>
                                    </label>
                                    <input type="text" value={pixKey}
                                        onChange={e => { setPixKey(e.target.value); if (triedNext) setErrors(er => { const n = {...er}; delete n.pixKey; return n; }); }}
                                        placeholder={pixKeyType === 'CPF' ? '00000000000' : pixKeyType === 'EMAIL' ? 'seu@email.com' : pixKeyType === 'PHONE' ? '11999999999' : 'Cole sua chave aleatória'}
                                        style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: 10, border: `2px solid ${fieldErr('pixKey') ? '#DC2626' : '#E5E7EB'}`, fontSize: '0.92rem', background: fieldErr('pixKey') ? '#FEF2F2' : '#F9FAFB', fontFamily: 'JetBrains Mono, monospace' }}
                                    />
                                    {fieldErr('pixKey') && <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 6, fontWeight: 600 }}>⚠️ {fieldErr('pixKey')}</div>}
                                </div>
                            )}
                            <div style={{ padding: '0.85rem 1rem', borderRadius: 14, background: 'linear-gradient(145deg, #FFFDF5, #FFFDE7)', border: '1.5px solid rgba(255,214,0,0.35)' }}>
                                <div style={{ fontSize: '0.72rem', color: '#92730A', lineHeight: 1.6 }}>
                                    ⚠️ Confira a chave PIX — o valor será enviado para esta conta. Em caso de erro, entre em contato com a coordenação.
                                </div>
                            </div>
                            {/* XP Reward Preview */}
                            <div style={{ padding: '0.95rem 1.1rem', borderRadius: 14, background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', border: '1.5px solid rgba(255,214,0,0.4)', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                                <BoltIcon style={{ width: 28, height: 28, color: '#FFD600', filter: 'drop-shadow(0 0 8px rgba(255,214,0,0.6))' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.62rem', fontWeight: 800, color: '#FFD600', letterSpacing: '0.12em' }}>RECOMPENSA AO ENVIAR</div>
                                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.25rem', fontWeight: 900, color: '#fff', marginTop: 2 }}>+{XP_REWARD} XP <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 600 }}>+ PIX</span></div>
                                </div>
                                <SparklesIcon style={{ width: 22, height: 22, color: '#FFD600' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #F3F4F6', display: 'flex', gap: '0.75rem' }}>
                    {step > 0 && (
                        <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: '0.75rem', background: '#F3F4F6', border: '2px solid #E5E7EB', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Voltar
                        </button>
                    )}
                    {step < STEPS.length - 1 ? (
                        <button onClick={tryGoNext}
                            style={{
                                flex: 2, padding: '0.75rem',
                                background: 'linear-gradient(135deg, #FFD600, #F59E0B)',
                                border: 'none', borderRadius: 12, cursor: 'pointer',
                                fontWeight: 800, fontSize: '0.85rem', color: '#0F172A',
                                fontFamily: 'Orbitron, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                boxShadow: '0 4px 16px rgba(255,214,0,0.3)',
                            }}
                        >Próximo <ArrowRightIcon style={{ width: 16, height: 16 }} /></button>
                    ) : (
                        <button onClick={handleSubmit} disabled={submitting || !socialShareAck}
                            style={{
                                flex: 2, padding: '0.75rem',
                                background: submitting ? '#E5E7EB' : 'linear-gradient(135deg, #10B981, #059669)',
                                border: 'none', borderRadius: 12, cursor: submitting ? 'not-allowed' : 'pointer',
                                fontWeight: 800, fontSize: '0.85rem', color: submitting ? '#9CA3AF' : '#fff',
                                fontFamily: 'Orbitron, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                boxShadow: submitting ? 'none' : '0 4px 16px rgba(16,185,129,0.3)',
                            }}
                        >
                            {submitting ? '⏳ Enviando...' : <><CheckCircleIcon style={{ width: 18, height: 18 }} /> ENVIAR FEEDBACK</>}
                        </button>
                    )}
                </div>
            </div>

            {/* Success modal — Solo Leveling XP reward */}
            {showSuccess && typeof window !== 'undefined' && createPortal(
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                    zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
                    animation: 'fbFadeIn 0.3s ease-out',
                }}>
                    <div style={{
                        maxWidth: 440, width: '100%', borderRadius: 24, overflow: 'hidden',
                        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                        border: '2px solid rgba(255,214,0,0.6)',
                        boxShadow: '0 24px 80px rgba(255,214,0,0.3), 0 0 120px rgba(255,214,0,0.15) inset',
                        animation: 'fbSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                    }}>
                        {/* Glowing header */}
                        <div style={{ padding: '2rem 1.5rem 1.25rem', textAlign: 'center', borderBottom: '1px solid rgba(255,214,0,0.15)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, rgba(255,214,0,0.2), transparent 60%)' }} />
                            <div style={{ position: 'relative', fontSize: '3.5rem', marginBottom: 8, animation: 'fbPulse 1.4s ease-in-out infinite' }}>🏆</div>
                            <div style={{ position: 'relative', fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem', fontWeight: 800, color: '#FFD600', letterSpacing: '0.2em', marginBottom: 4 }}>QUEST COMPLETE</div>
                            <div style={{ position: 'relative', fontFamily: 'Orbitron, sans-serif', fontSize: '1.45rem', fontWeight: 900, color: '#fff' }}>FEEDBACK ENVIADO!</div>
                        </div>
                        {/* XP reward */}
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '1rem 1.15rem', borderRadius: 14, background: 'rgba(255,214,0,0.08)', border: '1.5px solid rgba(255,214,0,0.4)', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <BoltIcon style={{ width: 34, height: 34, color: '#FFD600', filter: 'drop-shadow(0 0 12px rgba(255,214,0,0.8))' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', fontWeight: 800, color: '#FFD600', letterSpacing: '0.14em' }}>XP CONQUISTADO</div>
                                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginTop: 2 }}>+{XP_REWARD}</div>
                                </div>
                                <SparklesIcon style={{ width: 26, height: 26, color: '#FFD600', animation: 'fbSpin 3s linear infinite' }} />
                            </div>
                            <div style={{ padding: '0.9rem 1rem', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.3)', fontSize: '0.82rem', color: '#D1FAE5', lineHeight: 1.5 }}>
                                ✅ Sua avaliação foi enviada para análise. Você será notificado quando o PIX for aprovado — normalmente em até 5 dias úteis.
                            </div>
                            <button onClick={() => router.push('/student/feedback')}
                                style={{
                                    width: '100%', padding: '0.85rem', borderRadius: 12,
                                    background: 'linear-gradient(135deg, #FFD600, #F59E0B)', border: 'none',
                                    fontFamily: 'Orbitron, sans-serif', fontSize: '0.82rem', fontWeight: 800,
                                    color: '#0F172A', cursor: 'pointer', letterSpacing: '0.08em',
                                    boxShadow: '0 4px 20px rgba(255,214,0,0.4)',
                                }}
                            >VOLTAR PARA FEEDBACKS</button>
                        </div>
                    </div>
                    <style>{`
                        @keyframes fbFadeIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes fbSlideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                        @keyframes fbPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
                        @keyframes fbSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    `}</style>
                </div>,
                document.body,
            )}
        </div>
    );
}
