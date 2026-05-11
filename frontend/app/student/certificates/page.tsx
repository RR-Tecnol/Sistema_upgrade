'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import api from '@/lib/api/client';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';

const QRCodeSVG = dynamic(() => import('qrcode.react').then(m => m.QRCodeSVG), { ssr: false });

interface Certificate {
    id: string;
    verificationCode: string;
    issuedAt: string;
    status: string;
    fileUrl?: string;
    class: {
        id?: string;
        classIdentifier: string;
        course: { name: string; workloadHours: number };
        startDate: string;
        endDate: string;
    };
}

type RiskLevel = 'ok' | 'watch' | 'risk' | 'critical';

interface CertificateProgressItem {
    classId: string;
    classIdentifier: string;
    courseName: string;
    workloadHours: number;
    classStatus: string;
    enrollmentStatus: string | null;
    certificate: { id: string; issuedAt: string; status: string } | null;
    totalSessions: number;
    presentCount: number;
    unjustifiedAbsenceCount: number;
    justifiedCount: number;
    effectivePresentCount: number;
    attendanceRatePct: number;
    maxUnjustifiedAllowed: number;
    remainingUnjustifiedSlots: number;
    minEffectiveDaysRequired: number;
    riskLevel: RiskLevel;
    /** Risco efectivo para certificado (após penalidades de imprevisto). */
    riskLevelAfterPenalty?: RiskLevel;
    meetsMinimum: boolean;
    expectedTeachingDaysSoFar?: number;
    beforeCourseStart?: boolean;
    awaitsAttendanceRoll?: boolean;
    calendarLowCoverage?: boolean;
    calendarCoverageRatio?: number;
    attendanceRateByRecords?: number;
    usingCalendarDenominator?: boolean;
    /** Soma única das penalidades % (turma PENALIZED) — motor alinhado ao backend. */
    imprevistoPenaltyPctSum?: number;
    attendanceRateBeforePenaltyPct?: number;
    attendanceRateAfterPenaltyPct?: number;
    certificateEligible?: boolean;
    certificateBlockReasons?: string[];
}

function certificateRiskEffective(p: CertificateProgressItem): RiskLevel {
    return p.riskLevelAfterPenalty ?? p.riskLevel;
}

function rateAfterPenalties(p: CertificateProgressItem): number {
    return p.attendanceRateAfterPenaltyPct ?? p.attendanceRatePct;
}

function rateBeforePenalties(p: CertificateProgressItem): number {
    return p.attendanceRateBeforePenaltyPct ?? p.attendanceRatePct;
}

interface CertificateProgressPayload {
    minCertificateAttendancePct: number;
    warnAttendancePct: number;
    worstRisk: RiskLevel;
    items: CertificateProgressItem[];
}

function riskStyles(level: RiskLevel) {
    switch (level) {
        case 'critical':
            return {
                border: '#FECACA',
                bg: '#FEF2F2',
                accent: '#DC2626',
                label: 'Abaixo do mínimo (certificado)',
                short: 'Crítico',
            };
        case 'risk':
            return {
                border: '#FDE68A',
                bg: '#FFFBEB',
                accent: '#D97706',
                label: 'Risco para o certificado',
                short: 'Risco',
            };
        case 'watch':
            return {
                border: '#E5E7EB',
                bg: '#F9FAFB',
                accent: '#6B7280',
                label: 'Atenção às faltas',
                short: 'Atenção',
            };
        default:
            return {
                border: '#BBF7D0',
                bg: '#F0FDF4',
                accent: '#059669',
                label: 'Dentro da meta',
                short: 'OK',
            };
    }
}

export default function StudentCertificatesPage() {
    const [certs, setCerts] = useState<Certificate[]>([]);
    const [progress, setProgress] = useState<CertificateProgressPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Certificate | null>(null);
    const { user } = useAuthStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        (async () => {
            setLoading(true);
            try {
                const [cRes, pRes] = await Promise.all([
                    api.get('/students/me/certificates'),
                    api.get('/students/me/certificate-progress'),
                ]);
                setCerts(Array.isArray(cRes.data) ? cRes.data : []);
                setProgress(pRes.data ?? null);
            } catch {
                setCerts([]);
                setProgress(null);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const progressByClassId = useMemo(() => {
        const m = new Map<string, CertificateProgressItem>();
        (progress?.items ?? []).forEach(it => m.set(it.classId, it));
        return m;
    }, [progress]);

    const alertCount = useMemo(
        () =>
            (progress?.items ?? []).filter(i => {
                const r = certificateRiskEffective(i);
                return r === 'risk' || r === 'critical';
            }).length,
        [progress],
    );

    const avgAttendancePct = useMemo(() => {
        const withData = (progress?.items ?? []).filter(i => i.totalSessions > 0);
        if (!withData.length) return null;
        const sum = withData.reduce((a, i) => a + rateAfterPenalties(i), 0);
        return Math.round((sum / withData.length) * 10) / 10;
    }, [progress]);

    const subtitle = useMemo(() => {
        if (!progress?.items?.length) return 'Seus certificados e acompanhamento de frequência (mín. 75%)';
        if (alertCount > 0) {
            return `${alertCount} turma(s) com alerta de frequência — veja abaixo e as notificações`;
        }
        return 'Seus certificados e acompanhamento de frequência (mín. 75%)';
    }, [progress, alertCount]);

    const openModal = (cert: Certificate) => {
        setSelected(cert);
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setSelected(null);
        document.body.style.overflow = '';
    };

    const verifyUrl = (code: string) =>
        `${typeof window !== 'undefined' ? window.location.origin : 'https://upgrade.app'}/certificado/verificar/${code}`;

    const modal = selected && mounted ? createPortal(
        <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" style={{ maxWidth: 400, textAlign: 'center' as const }} onClick={e => e.stopPropagation()}>
                <button onClick={closeModal} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#9CA3AF' }}>✕</button>

                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆</div>
                    <h3 style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.95rem', color: '#111827', marginBottom: '0.25rem' }}>
                        Certificado de Conclusão
                    </h3>
                    <p style={{ fontWeight: 700, color: '#374151', fontSize: '0.88rem', marginBottom: '0.15rem' }}>{user?.name}</p>
                    <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>{selected.class?.course?.name}</p>
                </div>

                <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: 14, background: '#FFFFFF', border: '2px solid #FFD600', boxShadow: '0 4px 16px rgba(255,214,0,0.2)', marginBottom: '1.25rem' }}>
                    <QRCodeSVG
                        value={verifyUrl(selected.verificationCode)}
                        size={150}
                        level="H"
                        fgColor="#111827"
                    />
                </div>

                <div style={{ padding: '0.65rem 1rem', borderRadius: 10, background: '#FFFDE7', border: '1px solid #FEF08A', marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.58rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Código de Verificação</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 900, color: '#B89B00', fontSize: '0.85rem', letterSpacing: '0.08em' }}>{selected.verificationCode}</div>
                </div>

                {selected.fileUrl && (
                    <a href={selected.fileUrl}
                        download={`certificado-${selected.verificationCode}.pdf`}
                        style={{
                            display: 'block', width: '100%', padding: '0.65rem',
                            textAlign: 'center' as const,
                            background: 'linear-gradient(135deg,#FFD600,#F59E0B)',
                            borderRadius: 10, textDecoration: 'none',
                            color: '#0F172A', fontWeight: 700, fontSize: '0.85rem',
                            marginBottom: '0.75rem', boxShadow: '0 2px 8px rgba(255,214,0,0.3)',
                        }}>
                        ⬇ Baixar Certificado PDF
                    </a>
                )}

                <p style={{ fontSize: '0.7rem', color: '#9CA3AF', lineHeight: 1.6 }}>
                    Mostre este QR Code para comprovar a autenticidade do seu certificado. Qualquer pessoa pode verificar em nosso site.
                </p>
            </div>
        </div>,
        document.body
    ) : null;

    function renderProgressStrip(p: CertificateProgressItem, compact?: boolean) {
        const effectiveRisk = certificateRiskEffective(p);
        const st = riskStyles(effectiveRisk);
        const minPct = progress?.minCertificateAttendancePct ?? 75;
        const warnPct = progress?.warnAttendancePct ?? 80;
        const rateAfter = rateAfterPenalties(p);
        const rateBefore = rateBeforePenalties(p);
        const penaltySum = p.imprevistoPenaltyPctSum ?? 0;
        const hasPenalty = penaltySum > 0.001;

        return (
            <div style={{
                marginTop: compact ? '0.65rem' : '0',
                padding: compact ? '0.55rem 0.65rem' : '0.85rem 1rem',
                borderRadius: 10,
                background: st.bg,
                border: `1px solid ${st.border}`,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: compact ? '0.58rem' : '0.62rem', fontWeight: 800, color: st.accent, letterSpacing: '0.06em' }}>
                        CERTIFICADO • {st.short}
                    </span>
                    <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: compact ? '0.78rem' : '0.88rem', color: st.accent }}>
                        {p.totalSessions === 0 && (p.expectedTeachingDaysSoFar ?? 0) === 0 ? '—' : `${rateAfter}%`}
                    </span>
                </div>
                {!compact && (
                    <div style={{ fontSize: '0.64rem', color: '#6B7280', marginBottom: 6, lineHeight: 1.4 }}>
                        Presença <strong>efectiva</strong> para o certificado (presenças + faltas justificadas no denominador), já com <strong>penalidades de imprevisto</strong> quando aplicadas.
                        Meta: <strong>{minPct}%</strong> · Atenção extra abaixo de <strong>{warnPct}%</strong>.
                    </div>
                )}
                {hasPenalty && !compact && (
                    <div style={{ fontSize: '0.64rem', color: '#92400E', marginBottom: 6, fontWeight: 600 }}>
                        Penalidades de imprevisto (admin): <strong>−{penaltySum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</strong>
                        {rateBefore !== rateAfter && (
                            <> · sem penalidades seria <strong>{rateBefore}%</strong></>
                        )}
                    </div>
                )}
                {p.totalSessions > 0 && (
                    <div style={{ height: 8, borderRadius: 99, background: 'rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{
                            width: `${Math.min(100, rateAfter)}%`,
                            height: '100%',
                            borderRadius: 99,
                            background: effectiveRisk === 'critical' ? '#DC2626'
                                : effectiveRisk === 'risk' ? 'linear-gradient(90deg,#F59E0B,#FFD600)'
                                : 'linear-gradient(90deg,#059669,#34D399)',
                            transition: 'width 0.4s ease',
                        }} />
                    </div>
                )}
                <div style={{ fontSize: compact ? '0.65rem' : '0.7rem', color: '#4B5563', lineHeight: 1.45 }}>
                    <strong>{p.presentCount}</strong> presenças físicas · <strong>{p.unjustifiedAbsenceCount}</strong> faltas injustificadas · <strong>{p.justifiedCount}</strong> faltas justificadas
                    · <strong>{p.effectivePresentCount}</strong> dias com presença <em>efectiva</em> (para a meta)
                </div>
                {p.totalSessions > 0 && (
                    <div style={{ fontSize: compact ? '0.64rem' : '0.68rem', color: '#374151', marginTop: 6, lineHeight: 1.45 }}>
                        <strong>{p.remainingUnjustifiedSlots}</strong> falta(s) injustificada(s) ainda cabem no “orçamento” do denominador actual
                        (máximo permitido: <strong>{p.maxUnjustifiedAllowed}</strong> de <strong>{p.totalSessions}</strong> dias já lançados).
                    </div>
                )}
                {p.totalSessions > 0 && (
                    <div style={{ fontSize: compact ? '0.62rem' : '0.66rem', color: '#4B5563', marginTop: 4 }}>
                        São necessários pelo menos <strong>{p.minEffectiveDaysRequired}</strong> dias com presença efectiva para atingir <strong>{minPct}%</strong> com o denominador actual.
                    </div>
                )}
                {(p.expectedTeachingDaysSoFar ?? 0) > 0 && (
                    <div style={{ fontSize: compact ? '0.62rem' : '0.66rem', color: '#6B7280', marginTop: 6 }}>
                        Dias letivos previstos até hoje (calendário da turma): <strong>{p.expectedTeachingDaysSoFar}</strong>
                        {p.usingCalendarDenominator && p.attendanceRateByRecords != null && p.attendanceRateByRecords !== rateAfter && (
                            <> · taxa só nos lançamentos brutos: <strong>{p.attendanceRateByRecords}%</strong> (para certificado usamos o denominador combinado)</>
                        )}
                    </div>
                )}
                {typeof p.certificateEligible === 'boolean' && !p.certificate && !compact && (
                    <div style={{
                        marginTop: 10,
                        padding: '0.5rem 0.65rem',
                        borderRadius: 8,
                        background: p.certificateEligible ? '#ECFDF5' : '#FEF2F2',
                        border: `1px solid ${p.certificateEligible ? '#A7F3D0' : '#FECACA'}`,
                        fontSize: '0.66rem',
                        color: p.certificateEligible ? '#065F46' : '#7F1D1D',
                        lineHeight: 1.45,
                    }}>
                        {p.certificateEligible ? (
                            <><strong>Elegível</strong> segundo os critérios actuais (frequência + penalidades). A emissão do PDF é feita pela escola.</>
                        ) : (
                            <>
                                <strong>Ainda não elegível</strong> ao certificado com estes números:
                                <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                                    {(p.certificateBlockReasons ?? []).map((r, i) => (
                                        <li key={i}>{r}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                )}
                {p.calendarLowCoverage && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: compact ? '0.62rem' : '0.68rem', color: '#6B7280' }}>
                        Poucos lançamentos de frequência em relação aos dias previstos — o cálculo combina calendário e registos já feitos pelo professor.
                    </p>
                )}
                {effectiveRisk === 'critical' && (
                    <p style={{ margin: '0.45rem 0 0', fontSize: compact ? '0.65rem' : '0.72rem', fontWeight: 700, color: '#991B1B' }}>
                        Presença efectiva (após penalidades) abaixo de {minPct}%. Procure coordenação para regularizar.
                    </p>
                )}
                {effectiveRisk === 'risk' && (
                    <p style={{ margin: '0.45rem 0 0', fontSize: compact ? '0.65rem' : '0.72rem', fontWeight: 600, color: '#92400E' }}>
                        Limite da regra de certificado. Acompanhe frequência, imprevistos e notificações.
                    </p>
                )}
                {compact && (p.totalSessions > 0 || (p.expectedTeachingDaysSoFar ?? 0) > 0) && hasPenalty && (
                    <div style={{ fontSize: '0.58rem', color: '#92400E', marginTop: 6, fontWeight: 600 }}>
                        Penal. imprevisto −{penaltySum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% · certificado {rateAfter}%
                    </div>
                )}
                {!compact && (
                    <Link href={`/student/attendance?classId=${encodeURIComponent(p.classId)}`}
                        style={{ display: 'inline-block', marginTop: 8, fontSize: '0.72rem', fontWeight: 800, color: '#B89B00' }}>
                        Ver calendário de frequência →
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            <AdminHeaderHero
                title="CERTIFICADOS"
                subtitle={subtitle}
                badge="PORTAL DO ALUNO"
                rightSlot={(
                    <Link href="/student/notifications"
                        style={{ padding: '0.6rem 1.2rem', background: alertCount > 0 ? '#FEF2F2' : '#F3F4F6', borderRadius: 10, fontSize: '0.82rem', fontWeight: 700, color: alertCount > 0 ? '#991B1B' : '#374151', textDecoration: 'none', border: `1px solid ${alertCount > 0 ? '#FECACA' : '#E5E7EB'}` }}>
                        {alertCount > 0 ? `🔔 ${alertCount} alerta(s)` : '🔔 Notificações'}
                    </Link>
                )}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <AnimatedKpiCard label="Emitidos" value={certs.length} color="#7C3AED" bg="#F5F3FF" border="#DDD6FE" compact />
                <AnimatedKpiCard label="Válidos" value={certs.filter(c => c.status === 'ACTIVE').length} color="#059669" bg="#F0FDF4" border="#BBF7D0" compact />
                <AnimatedKpiCard
                    label="Média (após penal.)"
                    value={avgAttendancePct != null ? Math.round(avgAttendancePct) : 0}
                    displayValue={avgAttendancePct != null ? `${avgAttendancePct}%` : '—'}
                    color="#B89B00"
                    bg="#FFFDE7"
                    border="#FEF08A"
                    compact
                />
                <AnimatedKpiCard label="Alertas freq." value={alertCount} color={alertCount > 0 ? '#DC2626' : '#6B7280'} bg={alertCount > 0 ? '#FEF2F2' : '#F3F4F6'} border={alertCount > 0 ? '#FECACA' : '#D1D5DB'} compact />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
                </div>
            ) : (
                <>
                    {(progress?.items?.length ?? 0) > 0 && (
                        <div>
                            <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', color: '#B89B00', marginBottom: '0.35rem' }}>
                                PROGRESSO POR TURMA (META {progress?.minCertificateAttendancePct ?? 75}%)
                            </h2>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280', lineHeight: 1.55, marginBottom: '0.85rem', maxWidth: 720 }}>
                                O mesmo cálculo usado pela escola para emissão: presença efectiva nos dias já lançados (e calendário da turma), com penalidades de imprevisto só quando o admin marca <strong>PENALIZED</strong>.
                                Rejeitar imprevisto <strong>sem</strong> penalidade não altera esta percentagem automaticamente — conta a sua falta como injustificada na frequência.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                {(progress?.items ?? []).map((it, i) => {
                                    const eff = certificateRiskEffective(it);
                                    const st = riskStyles(eff);
                                    return (
                                        <div
                                            key={it.classId}
                                            className="glass-card animate-scale-in"
                                            style={{
                                                animationDelay: `${i * 50}ms`,
                                                padding: '1.25rem',
                                                borderTop: `3px solid ${eff === 'ok' ? '#FFD600' : st.accent}`,
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: '0.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9CA3AF', letterSpacing: '0.08em' }}>{it.classIdentifier}</div>
                                                    <h3 style={{ fontWeight: 800, fontSize: '0.92rem', color: '#111827', margin: '0.25rem 0 0', lineHeight: 1.3 }}>{it.courseName}</h3>
                                                </div>
                                                <span style={{
                                                    padding: '0.2rem 0.55rem', borderRadius: 99, fontSize: '0.58rem', fontWeight: 800,
                                                    background: st.bg, color: st.accent, border: `1px solid ${st.border}`, whiteSpace: 'nowrap',
                                                }}>
                                                    {st.label}
                                                </span>
                                            </div>
                                            {it.certificate && (
                                                <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, marginBottom: 8 }}>
                                                    ✓ Certificado emitido em {new Date(it.certificate.issuedAt).toLocaleDateString('pt-BR')}
                                                </div>
                                            )}
                                            {renderProgressStrip(it)}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {certs.length === 0 ? (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆</div>
                            <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                NENHUM CERTIFICADO AINDA
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto', lineHeight: 1.7 }}>
                                Conclua o curso com frequência efetiva ≥ {progress?.minCertificateAttendancePct ?? 75}% (presenças e faltas justificadas nos dias lançados) para receber o certificado digital.
                            </p>
                            <Link href="/student/attendance" style={{ display: 'inline-block', marginTop: '1rem', color: '#B89B00', fontWeight: 800 }}>
                                Ver minha frequência →
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div style={{
                                padding: '1rem 1.25rem', borderRadius: 14,
                                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                                border: '2px solid #F59E0B',
                                borderLeft: '4px solid #FFD600',
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                boxShadow: '0 4px 20px rgba(245,158,11,0.18)',
                            }} className="animate-fade-in">
                                <div style={{
                                    width: 52, height: 52, borderRadius: 12,
                                    background: 'linear-gradient(135deg, #F59E0B, #FFD600)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.6rem', flexShrink: 0,
                                    boxShadow: '0 4px 12px rgba(245,158,11,0.4)',
                                }}>
                                    🏆
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.72rem', color: '#78350F', letterSpacing: '0.1em', marginBottom: 2 }}>
                                        CONQUISTA DESBLOQUEADA
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#0F172A', fontWeight: 700 }}>
                                        {certs.length === 1 ? 'Você recebeu seu 1° Certificado Digital!' : `${certs.length} Certificados conquistados!`}
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: '#92400E', marginTop: 2 }}>
                                        Cada certificado = +100 XP de bônus permanente
                                    </div>
                                </div>
                                <div style={{ flexShrink: 0, textAlign: 'center' }}>
                                    <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.4rem', color: '#F59E0B', lineHeight: 1 }}>+{certs.length * 100}</div>
                                    <div style={{ fontSize: '0.6rem', color: '#92400E', fontFamily: 'JetBrains Mono' }}>XP TOTAL</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                                {certs.map((cert, i) => {
                                    const classId = cert.class?.id;
                                    const p = classId ? progressByClassId.get(classId) : undefined;
                                    return (
                                        <div
                                            key={cert.id}
                                            className="glass-card animate-scale-in"
                                            style={{
                                                animationDelay: `${i * 80}ms`,
                                                padding: '1.5rem',
                                                borderTop: '3px solid #FFD600',
                                                cursor: 'pointer',
                                                transition: 'all 0.25s',
                                            }}
                                            onClick={() => openModal(cert)}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                                                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(255,214,0,0.2)';
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                                (e.currentTarget as HTMLElement).style.boxShadow = '';
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                                <div style={{ fontSize: '2rem' }}>🏆</div>
                                                <span style={{
                                                    padding: '0.2rem 0.65rem', borderRadius: 100, fontSize: '0.62rem', fontWeight: 700,
                                                    background: cert.status === 'ACTIVE' ? '#DCFCE7' : '#FEF2F2',
                                                    color: cert.status === 'ACTIVE' ? '#059669' : '#DC2626',
                                                    border: `1px solid ${cert.status === 'ACTIVE' ? '#BBF7D0' : '#FECACA'}`,
                                                    textTransform: 'uppercase' as const,
                                                }}>
                                                    {cert.status === 'ACTIVE' ? '✓ Válido' : 'Cancelado'}
                                                </span>
                                            </div>

                                            <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                                                {cert.class?.course?.name}
                                            </h3>
                                            <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono', marginBottom: '1rem' }}>
                                                {cert.class?.classIdentifier}
                                            </p>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                                                {[
                                                    { label: 'Carga Horária', value: `${cert.class?.course?.workloadHours || 40}h` },
                                                    { label: 'Emitido em', value: new Date(cert.issuedAt).toLocaleDateString('pt-BR') },
                                                ].map(f => (
                                                    <div key={f.label} style={{ padding: '0.5rem', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                                                        <div style={{ fontSize: '0.6rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{f.label}</div>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginTop: '0.15rem' }}>{f.value}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {p && renderProgressStrip(p, true)}

                                            <div style={{ padding: '0.5rem 0.75rem', borderRadius: 8, background: '#FFFDE7', border: '1px solid #FEF08A', fontSize: '0.72rem', color: '#92730A', fontFamily: 'JetBrains Mono', marginTop: '0.75rem' }}>
                                                🔑 {cert.verificationCode}
                                            </div>

                                            {cert.fileUrl && (
                                                <a href={cert.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    download={`certificado-${cert.verificationCode}.pdf`}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                                        marginTop: '0.75rem', padding: '0.55rem 1rem',
                                                        background: 'linear-gradient(135deg, #FFD600, #F59E0B)',
                                                        borderRadius: 9, textDecoration: 'none',
                                                        color: '#0F172A', fontWeight: 700, fontSize: '0.8rem',
                                                        boxShadow: '0 2px 8px rgba(255,214,0,0.3)', transition: 'all 0.15s',
                                                    }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}>
                                                    ⬇ Baixar Certificado PDF
                                                </a>
                                            )}

                                            <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.75rem', textAlign: 'center' as const }}>
                                                Clique para ver o QR Code
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </>
            )}

            {modal}
        </div>
    );
}
