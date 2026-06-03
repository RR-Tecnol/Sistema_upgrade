'use client';

import { useEffect, useState, useCallback, useRef, type CSSProperties, type FocusEvent } from 'react';
import api from '@/lib/api/client';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { FuncionariosSidebarTutorial } from '@/components/admin/adminSidebarTutorials';
import AdminViewModeToggle from '@/components/admin/AdminViewModeToggle';
import { usePersistedAdminViewMode } from '@/hooks/usePersistedAdminViewMode';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { CreationSuccessScreen } from '@/components/CreationSuccessScreen';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import { EmployeeDocumentsPreview } from '@/components/admin/EmployeeDocumentsPreview';
import { toast } from '@/components/ui/Toast';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import { resolveMediaUrl } from '@/lib/resolve-media-url';

/* ── Types ─────────────────────────────────────────── */
type EmployeeRole = 'INSTRUCTOR' | 'DRIVER' | 'COORDINATOR' | 'TECHNICIAN' | 'ADMINISTRATIVE' | 'OTHER';
type EmployeeDepartment = 'ACADEMIC' | 'OPERATIONS' | 'HEALTH' | 'FINANCIAL' | 'ADMINISTRATION' | 'LOGISTICS';

interface Employee {
    id: string;
    /** User de login (quando existir) — alinha reembolsos com `requestedBy` */
    userId?: string | null;
    name: string;
    role: EmployeeRole;
    department: EmployeeDepartment;
    cpf?: string;
    phone?: string;
    email?: string;
    specialty?: string;
    dailyCost?: number;
    contractType?: string;
    monthlySalaryCLT?: number;
    travelRuleKm?: number;
    hireDate?: string;
    notes?: string;
    photoUrl?: string;
    documents?: any;
    active: boolean;
    createdAt: string;
}

/* ── Constants ─────────────────────────────────────── */
const ROLE_CONFIG: Record<EmployeeRole, { label: string; icon: string; color: string; glow: string; bg: string }> = {
    INSTRUCTOR: { label: 'Instrutor', icon: '🎓', color: '#FFD600', glow: 'rgba(255,214,0,0.5)', bg: 'rgba(255,214,0,0.08)' },
    DRIVER: { label: 'Motorista', icon: '🚛', color: '#0891B2', glow: 'rgba(8,145,178,0.5)', bg: 'rgba(8,145,178,0.08)' },
    COORDINATOR: { label: 'Coordenador', icon: '🎯', color: '#7C3AED', glow: 'rgba(124,58,237,0.5)', bg: 'rgba(124,58,237,0.08)' },
    TECHNICIAN: { label: 'Técnico', icon: '🔧', color: '#EA580C', glow: 'rgba(234,88,12,0.5)', bg: 'rgba(234,88,12,0.08)' },
    ADMINISTRATIVE: { label: 'Administrativo', icon: '📋', color: '#059669', glow: 'rgba(5,150,105,0.5)', bg: 'rgba(5,150,105,0.08)' },
    OTHER: { label: 'Outros', icon: '👤', color: '#6B7280', glow: 'rgba(107,114,128,0.5)', bg: 'rgba(107,114,128,0.08)' },
};

const DEPT_CONFIG: Record<EmployeeDepartment, { label: string; color: string }> = {
    ACADEMIC: { label: 'Acadêmico', color: '#FFD600' },
    OPERATIONS: { label: 'Operações', color: '#0891B2' },
    HEALTH: { label: 'Saúde', color: '#EC4899' },
    FINANCIAL: { label: 'Financeiro', color: '#059669' },
    ADMINISTRATION: { label: 'Administração', color: '#7C3AED' },
    LOGISTICS: { label: 'Logística', color: '#EA580C' },
};

const ROLES = Object.entries(ROLE_CONFIG) as [EmployeeRole, typeof ROLE_CONFIG[EmployeeRole]][];
const DEPTS = Object.entries(DEPT_CONFIG) as [EmployeeDepartment, typeof DEPT_CONFIG[EmployeeDepartment]][];

/* Formata CPF: 000.000.000-00 */
function maskCPF(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0,3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
    return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
}

/* Formata Telefone: (00) 00000-0000 celular | (00) 0000-0000 fixo */
function maskPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
}

function maskCEP(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/* Formata moeda: R$ 1.234,56 */
function maskCurrency(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const num = parseInt(digits, 10) / 100;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* Converte valor mascarado de volta para número */
function parseCurrency(value: string): number {
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
}

type DocumentPreviewFieldProps = {
    label: string;
    value?: string;
    onChange: (url: string) => void;
    acceptNoPossui?: boolean;
};

function DocumentPreviewField({ label, value, onChange, acceptNoPossui = false }: DocumentPreviewFieldProps) {
    const [uploading, setUploading] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const fileInputId = `doc-upload-${label.replace(/\s+/g, '-').toLowerCase()}`;
    const resolved = (value || '').trim();
    const isNoPossui = resolved.toLowerCase() === 'não possui' || resolved.toLowerCase() === 'nao possui';
    const isPdf = /\.pdf(\?.*)?$/i.test(resolved);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/public/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onChange(res.data?.url || '');
        } catch {
            toast.error('Não foi possível enviar o documento. Verifique se o MinIO está ativo (porta 9010).');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    return (
        <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
            <div style={{ padding: '0.45rem 0.65rem', fontSize: '0.68rem', fontWeight: 800, color: '#374151', borderBottom: '1px solid #F3F4F6' }}>
                {label}
            </div>
            <div style={{ height: 112, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {!resolved ? (
                    <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Sem arquivo</span>
                ) : isNoPossui ? (
                    <span style={{ fontSize: '0.78rem', color: '#B45309', fontWeight: 700 }}>não possui</span>
                ) : isPdf ? (
                    <span style={{ fontSize: '1.6rem' }}>📄</span>
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolved} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                )}
            </div>
            <div style={{ padding: '0.5rem 0.6rem', display: 'flex', gap: 6, justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                    {!isNoPossui && resolved && (
                        <button type="button" onClick={() => setLightboxOpen(true)} style={{ border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', borderRadius: 8, padding: '0.25rem 0.55rem', fontSize: '0.66rem', fontWeight: 800, cursor: 'pointer' }}>
                            Ver
                        </button>
                    )}
                    <label htmlFor={fileInputId} style={{ border: '1px solid #BBF7D0', background: '#ECFDF5', color: '#047857', borderRadius: 8, padding: '0.25rem 0.55rem', fontSize: '0.66rem', fontWeight: 800, cursor: 'pointer' }}>
                        {uploading ? 'Enviando...' : 'Trocar imagem'}
                    </label>
                    <input id={fileInputId} type="file" accept=".pdf,image/*" onChange={handleUpload} style={{ display: 'none' }} />
                </div>
                {acceptNoPossui && (
                    <button type="button" onClick={() => onChange('Não possui')} style={{ border: '1px solid #FDE68A', background: '#FFFBEB', color: '#B45309', borderRadius: 8, padding: '0.25rem 0.5rem', fontSize: '0.64rem', fontWeight: 800, cursor: 'pointer' }}>
                        não possui
                    </button>
                )}
            </div>

            {lightboxOpen && resolved && !isNoPossui && (
                <ModalPortal>
                    <div className="modal-overlay" style={{ zIndex: MODAL_PORTAL_Z_INDEX + 5, background: 'rgba(15,23,42,0.88)' }} onClick={() => setLightboxOpen(false)}>
                        <div className="modal-content" style={{ width: 'min(96vw, 980px)', maxHeight: '92vh', overflow: 'hidden', padding: 0, borderRadius: 14 }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.9rem', borderBottom: '1px solid #E5E7EB', background: '#fff' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>{label}</div>
                                <button onClick={() => setLightboxOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.15rem', lineHeight: 1 }}>✕</button>
                            </div>
                            <div style={{ background: '#0B1220', maxHeight: 'calc(92vh - 46px)', overflow: 'auto' }}>
                                {isPdf ? (
                                    <object data={resolved} type="application/pdf" title={label} style={{ width: '100%', height: 'calc(92vh - 46px)', display: 'block', background: '#fff' }}>
                                        <div style={{ padding: '1rem', color: '#E2E8F0', fontSize: '0.85rem' }}>Pré-visualização de PDF indisponível.</div>
                                    </object>
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={resolved} alt={label} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain', background: '#fff' }} />
                                )}
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}

const EMPTY_FORM = {
    name: '', role: 'INSTRUCTOR' as EmployeeRole, department: 'ACADEMIC' as EmployeeDepartment,
    cpf: '', rg: '', phone: '', email: '', specialty: '', dailyCost: '', hireDate: '', notes: '', active: true,
    contractType: '', monthlySalaryCLT: '', travelRuleKm: 200,
    password: '', confirmPassword: '',
    addressCep: '', addressStreet: '', addressNumber: '', addressNeighborhood: '', addressCity: '', addressStateUf: '',
    docUrl: '', addressUrl: '', selfieUrl: '', criminalRecordUrl: '',
    teacherEducation: '', teacherFieldOfStudy: '', teacherProfessionalReg: '', teacherDiplomaUrl: '', teacherCertificatesUrl: '', teacherExperienceUrl: '',
    driverCnhNumber: '', driverCnhCategory: '', driverCnhExpiration: '', driverCnhUrl: '', driverTransportCourseUrl: '', driverToxicologicalUrl: '', driverCnhRecordUrl: '',
    coordinatorExperienceTime: '', coordinatorSpecializationUrl: '',
};

/* ── 3D Tilt Card ──────────────────────────────────── */
function TiltCard({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotX = ((y - cy) / cy) * -8;
        const rotY = ((x - cx) / cx) * 8;
        ref.current.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.03)`;
        ref.current.style.transition = 'transform 0.1s ease';
    };
    const handleMouseLeave = () => {
        if (!ref.current) return;
        ref.current.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
        ref.current.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
    };
    return (
        <div ref={ref} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} style={style} className={className}>
            {children}
        </div>
    );
}

/* ── Particle System ───────────────────────────────── */
function ParticleField() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number; color: string }[] = [];
        const colors = ['255,214,0', '124,58,237', '8,145,178', '5,150,105'];
        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 2 + 0.5, a: Math.random(),
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }
        let raf: number;
        function animate() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                p.a += 0.005;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.color},${(Math.sin(p.a) * 0.3 + 0.4).toFixed(2)})`;
                ctx.fill();
            });
            particles.forEach((p1, i) => {
                particles.slice(i + 1).forEach(p2 => {
                    const dx = p1.x - p2.x, dy = p1.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 80) {
                        if (!ctx) return;
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(255,214,0,${(1 - dist / 80) * 0.15})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                });
            });
            raf = requestAnimationFrame(animate);
        }
        animate();
        return () => cancelAnimationFrame(raf);
    }, []);
    return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

/* ── Animated Counter ──────────────────────────────── */
function AnimCounter({ value, color }: { value: number; color: string }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        let start = 0;
        const step = Math.ceil(value / 20);
        const t = setInterval(() => {
            start += step;
            if (start >= value) { setDisplay(value); clearInterval(t); }
            else setDisplay(start);
        }, 40);
        return () => clearInterval(t);
    }, [value]);
    return <span style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '2rem', color, textShadow: `0 0 20px ${color}` }}>{display}</span>;
}

/* ── Employee Card (horizontal, redesigned) ────────── */
function EmployeeCard({ emp, onEdit, onToggle, onDelete, onDetails }: { emp: Employee; onEdit: () => void; onToggle: () => void; onDelete: () => void; onDetails: () => void; }) {
    const role = ROLE_CONFIG[emp.role];
    const dept = DEPT_CONFIG[emp.department];
    const initials = emp.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const [hovered, setHovered] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // 3D tilt
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotX = ((y - cy) / cy) * -5;
        const rotY = ((x - cx) / cx) * 5;
        ref.current.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-2px)`;
    };
    const handleMouseLeave = () => {
        if (!ref.current) return;
        ref.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
        setHovered(false);
    };

    return (
        <div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={handleMouseLeave}
            style={{
                transition: 'transform 0.15s ease, box-shadow 0.25s ease',
                borderRadius: 20,
                boxShadow: hovered
                    ? `0 20px 48px rgba(0,0,0,0.13), 0 0 0 1.5px ${role.color}60`
                    : `0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px ${emp.active ? role.color + '30' : '#E5E7EB'}`,
                overflow: 'hidden',
                background: '#FFFFFF',
                opacity: emp.active ? 1 : 0.65,
                willChange: 'transform',
            }}
        >
            {/* Top color bar */}
            <div style={{
                height: 4,
                background: `linear-gradient(90deg, ${role.color}, ${role.color}88)`,
                boxShadow: `0 2px 12px ${role.glow}`,
            }} />

            <div style={{ padding: '1.35rem 1.4rem' }}>
                {/* Top row: avatar + identity + status badge */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                            width: 72, height: 72, borderRadius: 18,
                            background: `linear-gradient(135deg, ${role.bg}, ${role.color}15)`,
                            border: `2px solid ${role.color}50`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 0 24px ${role.glow}`,
                            fontFamily: 'Orbitron, sans-serif', fontWeight: 900,
                            fontSize: '1.35rem', color: role.color,
                            letterSpacing: '-0.02em',
                        }}>
                            {emp.photoUrl ? (
                                <img
                                    src={resolveMediaUrl(emp.photoUrl) || emp.photoUrl}
                                    alt={emp.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            ) : initials}
                        </div>
                        {/* Status pulse */}
                        <div style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 16, height: 16, borderRadius: '50%',
                            background: emp.active ? '#22C55E' : '#9CA3AF',
                            border: '2.5px solid #ffffff',
                            boxShadow: emp.active ? '0 0 10px rgba(34,197,94,0.7)' : 'none',
                        }} />
                    </div>

                    {/* Identity */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontWeight: 800, fontSize: '1rem', color: '#111827',
                            marginBottom: '0.3rem', lineHeight: 1.2,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {emp.name}
                        </div>
                        {/* Role chip */}
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            padding: '0.3rem 0.72rem', borderRadius: 100,
                            background: role.bg, border: `1.5px solid ${role.color}50`,
                            fontSize: '0.73rem', fontWeight: 700, color: role.color,
                            letterSpacing: '0.03em', marginBottom: '0.3rem',
                        }}>
                            <span style={{ fontSize: '0.9rem' }}>{role.icon}</span>
                            {role.label}
                        </span>
                        {/* Dept */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: dept.color, boxShadow: `0 0 6px ${dept.color}` }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: dept.color }}>{dept.label}</span>
                        </div>
                    </div>

                    {/* Active pill top-right */}
                    <div style={{
                        padding: '0.22rem 0.6rem', borderRadius: 100, flexShrink: 0,
                        fontSize: '0.63rem', fontWeight: 800, letterSpacing: '0.06em',
                        background: emp.active ? 'rgba(34,197,94,0.1)' : 'rgba(156,163,175,0.12)',
                        color: emp.active ? '#16A34A' : '#9CA3AF',
                        border: `1px solid ${emp.active ? 'rgba(34,197,94,0.3)' : 'rgba(156,163,175,0.25)'}`,
                    }}>
                        {emp.active ? '● ATIVO' : '● INATIVO'}
                    </div>
                </div>

                {/* Info pills row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.1rem' }}>
                    {emp.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '0.78rem', width: 18, textAlign: 'center' }}>📞</span>
                            <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500 }}>{emp.phone}</span>
                        </div>
                    )}
                    {emp.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                            <span style={{ fontSize: '0.78rem', width: 18, textAlign: 'center', flexShrink: 0 }}>📧</span>
                            <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</span>
                        </div>
                    )}
                    {emp.specialty && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '0.78rem', width: 18, textAlign: 'center' }}>⭐</span>
                            <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500 }}>{emp.specialty}</span>
                        </div>
                    )}
                    {emp.contractType === 'CLT' && emp.monthlySalaryCLT != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '0.78rem', width: 18, textAlign: 'center' }}>📋</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#7C3AED', fontFamily: 'JetBrains Mono, monospace' }}>
                                CLT · R$ {Number(emp.monthlySalaryCLT).toFixed(2)}
                                <span style={{ fontWeight: 500, color: '#9CA3AF' }}>/mês</span>
                            </span>
                        </div>
                    ) : emp.dailyCost != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '0.78rem', width: 18, textAlign: 'center' }}>💰</span>
                            <span style={{
                                fontSize: '0.82rem', fontWeight: 800, color: '#059669',
                                fontFamily: 'JetBrains Mono, monospace',
                            }}>R$ {Number(emp.dailyCost).toFixed(2)}<span style={{ fontWeight: 500, color: '#9CA3AF' }}>/dia</span></span>
                        </div>
                    ) : null}
                    {!emp.phone && !emp.email && !emp.specialty && emp.dailyCost == null && emp.monthlySalaryCLT == null && (
                        <div style={{ fontSize: '0.76rem', color: '#D1D5DB', fontStyle: 'italic' }}>Sem dados de contato</div>
                    )}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: `linear-gradient(90deg, ${role.color}30, transparent)`, marginBottom: '0.9rem' }} />

                {/* Action buttons */}
                <div className="func-emp-btn-trio" style={{ marginBottom: '0.5rem' }}>
                    <button
                        onClick={onDetails}
                        style={{
                            padding: '0.55rem 0', borderRadius: 10, cursor: 'pointer',
                            background: 'linear-gradient(135deg, #FFD600, #B89B00)',
                            border: 'none',
                            color: '#000', fontWeight: 800, fontSize: '0.76rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                            transition: 'all 0.18s', gridColumn: '1 / -1',
                            boxShadow: '0 2px 10px rgba(255,214,0,0.3)',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(255,214,0,0.5)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(255,214,0,0.3)'; }}
                    >
                        🔍 Ver Detalhes
                    </button>
                </div>
                <div className="func-emp-btn-trio">
                    <button
                        onClick={onEdit}
                        style={{
                            padding: '0.55rem 0', borderRadius: 10, cursor: 'pointer',
                            background: 'rgba(255,214,0,0.08)', border: '1px solid rgba(255,214,0,0.35)',
                            color: '#B89B00', fontWeight: 700, fontSize: '0.76rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                            transition: 'all 0.18s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,214,0,0.18)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,214,0,0.08)'; }}
                    >
                        ✏️ Editar
                    </button>
                    <button
                        onClick={onToggle}
                        style={{
                            padding: '0.55rem 0', borderRadius: 10, cursor: 'pointer',
                            background: emp.active ? 'rgba(234,88,12,0.07)' : 'rgba(34,197,94,0.07)',
                            border: `1px solid ${emp.active ? 'rgba(234,88,12,0.3)' : 'rgba(34,197,94,0.3)'}`,
                            color: emp.active ? '#EA580C' : '#16A34A', fontWeight: 700, fontSize: '0.76rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                            transition: 'all 0.18s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                    >
                        {emp.active ? '⏸ Pausar' : '▶ Ativar'}
                    </button>
                    <button
                        onClick={onDelete}
                        style={{
                            padding: '0.55rem 0', borderRadius: 10, cursor: 'pointer',
                            background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.22)',
                            color: '#DC2626', fontWeight: 700, fontSize: '0.76rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                            transition: 'all 0.18s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.14)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.06)'; }}
                    >
                        🗑️ Excluir
                    </button>
                </div>
            </div>
        </div>
    );
}

const REIMB_CATEGORY_LABELS: Record<string, string> = {
    CLASSROOM_MATERIAL: 'Material de aula',
    CLEANING_MATERIAL: 'Material de limpeza',
    EMERGENCY_REPAIR: 'Reparo emergencial',
    FOOD: 'Alimentação',
    OTHER: 'Outro',
};

function isReimbReceiptImage(url?: string | null): boolean {
    if (!url || !String(url).trim()) return false;
    return /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(String(url));
}

function isReimbReceiptPdf(url?: string | null): boolean {
    if (!url || !String(url).trim()) return false;
    return /\.pdf(\?|#|$)/i.test(String(url));
}

type ReimbRow = {
    id: string;
    type: string;
    amount: number | string;
    description: string;
    receiptUrl?: string | null;
    status: string;
    createdAt: string;
    rejectionReason?: string | null;
};

/** Secção colapsável: reembolsos do funcionário com pré-visualização do recibo (sem sair do modal). */
function EmployeeReimbursementsCollapsible({ employeeId }: { employeeId: string }) {
    const [open, setOpen] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<ReimbRow[]>([]);

    useEffect(() => {
        if (!open || loaded) return;
        let cancelled = false;
        setLoading(true);
        api
            .get('/reimbursements', { params: { employeeId, limit: 80, page: 1 } })
            .then(res => {
                if (cancelled) return;
                const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
                setRows(list);
            })
            .catch(() => {
                if (!cancelled) setRows([]);
            })
            .finally(() => {
                if (!cancelled) {
                    setLoaded(true);
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [open, loaded, employeeId]);

    const fmtMoney = (v: number | string) =>
        Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtD = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

    const pending = rows.filter(r => r.status === 'PENDING').length;

    return (
        <div
            style={{
                borderRadius: 14,
                border: '1.5px solid rgba(5,150,105,0.25)',
                background: 'linear-gradient(180deg, rgba(5,150,105,0.06) 0%, #fff 48%)',
                overflow: 'hidden',
            }}
        >
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    border: 'none',
                    background: open ? 'rgba(5,150,105,0.08)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    <span style={{ fontSize: '1.15rem' }}>💰</span>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#047857', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Reembolsos
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>
                            {loaded
                                ? `${rows.length} pedido(s)${pending ? ` · ${pending} pendente(s)` : ''}`
                                : 'Toque para carregar e ver comprovantes'}
                        </div>
                    </div>
                </div>
                <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 800, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
            </button>
            {open && (
                <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid rgba(5,150,105,0.12)' }}>
                    {loading && (
                        <p style={{ fontSize: '0.8rem', color: '#6B7280', padding: '0.75rem 0' }}>A carregar reembolsos…</p>
                    )}
                    {!loading && rows.length === 0 && (
                        <p style={{ fontSize: '0.8rem', color: '#6B7280', padding: '0.75rem 0', margin: 0 }}>
                            Nenhum reembolso associado a este colaborador.
                        </p>
                    )}
                    {!loading &&
                        rows.map(r => {
                            const st =
                                r.status === 'APPROVED'
                                    ? { bg: '#ECFDF5', color: '#047857', label: 'Aprovado' }
                                    : r.status === 'REJECTED'
                                      ? { bg: '#FEF2F2', color: '#B91C1C', label: 'Rejeitado' }
                                      : { bg: '#FFFBEB', color: '#B45309', label: 'Pendente' };
                            const cat = REIMB_CATEGORY_LABELS[r.type] || r.type;
                            const url = r.receiptUrl?.trim();
                            return (
                                <div
                                    key={r.id}
                                    style={{
                                        marginTop: '0.75rem',
                                        borderRadius: 12,
                                        border: '1px solid #E5E7EB',
                                        background: '#fff',
                                        padding: '0.85rem 1rem',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                    }}
                                >
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: 6 }}>
                                        <span
                                            style={{
                                                fontSize: '0.62rem',
                                                fontWeight: 800,
                                                padding: '2px 8px',
                                                borderRadius: 100,
                                                background: st.bg,
                                                color: st.color,
                                                letterSpacing: '0.04em',
                                            }}
                                        >
                                            {st.label}
                                        </span>
                                        <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{fmtD(r.createdAt)}</span>
                                        <span style={{ fontSize: '0.68rem', color: '#6B7280' }}>{cat}</span>
                                        <span style={{ marginLeft: 'auto', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#111827' }}>
                                            {fmtMoney(r.amount)}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: '#374151', margin: '0 0 0.5rem', lineHeight: 1.45 }}>{r.description}</p>
                                    {r.status === 'REJECTED' && r.rejectionReason && (
                                        <p style={{ fontSize: '0.72rem', color: '#991B1B', margin: '0 0 0.5rem' }}>
                                            Motivo: {r.rejectionReason}
                                        </p>
                                    )}
                                    {url && isReimbReceiptImage(url) && (
                                        <div style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={url} alt="Comprovante" style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block' }} />
                                        </div>
                                    )}
                                    {url && isReimbReceiptPdf(url) && (
                                        <div style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#F3F4F6' }}>
                                            <object
                                                data={url}
                                                type="application/pdf"
                                                title="Comprovante PDF"
                                                style={{ width: '100%', height: 220, display: 'block' }}
                                            >
                                                <div style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#6B7280' }}>
                                                    Pré-visualização indisponível.{' '}
                                                    <a href={url} target="_blank" rel="noreferrer" style={{ color: '#2563EB', fontWeight: 700 }}>
                                                        Abrir PDF
                                                    </a>
                                                </div>
                                            </object>
                                        </div>
                                    )}
                                    {url && !isReimbReceiptImage(url) && !isReimbReceiptPdf(url) && (
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB' }}
                                        >
                                            Abrir comprovante ↗
                                        </a>
                                    )}
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}


/* ── Detail Modal (redesigned) ──────────────────────── */
function EmployeeDetailModal({ employee, onClose, onEdit }: { employee: Employee; onClose: () => void; onEdit: () => void }) {
    const role = ROLE_CONFIG[employee.role] ?? ROLE_CONFIG['OTHER'];
    const dept = DEPT_CONFIG[employee.department] ?? DEPT_CONFIG['ADMINISTRATION'];
    const initials = employee.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : null;
    const fmtMoney = (v?: number) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null;

    /* Info pill — label + value */
    const Pill = ({ icon, label, value, accent }: { icon: string; label: string; value?: string | number | null; accent?: string }) => {
        if (!value && value !== 0) return null;
        return (
            <div style={{
                background: accent ? `${accent}08` : '#F8FAFC',
                border: `1.5px solid ${accent ? `${accent}22` : '#E2E8F0'}`,
                borderRadius: 14, padding: '0.85rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                minWidth: 0,
            }}>
                <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{icon}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: accent ?? '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.18rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
                </div>
            </div>
        );
    };

    /* Section header */
    const SectionTitle = ({ icon, title, color }: { icon: string; title: string; color: string }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, border: `1.5px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>{icon}</div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{title}</span>
            <div style={{ flex: 1, height: 1, background: `${color}20` }} />
        </div>
    );
    const isImageDoc = (url?: string) => !!url && /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url);
    const isPdfDoc = (url?: string) => !!url && /\.pdf(\?.*)?$/i.test(url);
    const isDocMarkedMissing = (url?: string | null) => {
        if (!url) return false;
        return ['não possui', 'nao possui', 'não tem', 'nao tem'].includes(url.trim().toLowerCase());
    };
    const buildDocCards = (docs: any) => {
        const mapped: { label: string; url: string }[] = [];
        const push = (label: string, url?: string | null) => { if (url) mapped.push({ label, url }); };
        push('Identidade (Frente/Verso)', docs?.general?.docUrl);
        push('Comprovante de Residência', docs?.general?.addressUrl);
        push('Foto/Selfie', docs?.general?.selfieUrl);
        push('Antecedentes Criminais', docs?.general?.criminalRecordUrl);
        push('Diploma (Frente/Verso)', docs?.teacher?.diplomaUrl);
        push('Certificados/Pós', docs?.teacher?.certificatesUrl);
        push('CNH', docs?.driver?.cnhUrl);
        push('Exame Toxicológico', docs?.driver?.toxicologicalUrl);
        push('Curso de Transporte', docs?.driver?.transportCourseUrl);
        push('Prontuário DETRAN', docs?.driver?.cnhRecordUrl);
        push('Especialização/Gestão', docs?.coordinator?.specializationUrl);
        return mapped;
    };
    const docs = employee.documents || {};
    const requiredDocs: { key: string; label: string; value?: string | null; urgent: boolean; acceptsMissingDeclaration?: boolean }[] = [
        { key: 'general.docUrl', label: 'Identidade (RG/CNH)', value: docs?.general?.docUrl, urgent: true },
        { key: 'general.addressUrl', label: 'Comprovante de Residência', value: docs?.general?.addressUrl, urgent: true },
        { key: 'general.selfieUrl', label: 'Selfie/Foto', value: docs?.general?.selfieUrl, urgent: true },
        // Regra de negócio: no cadastro por link, "Não possui" para antecedentes é uma
        // declaração válida e não deve contar como pendência obrigatória.
        { key: 'general.criminalRecordUrl', label: 'Antecedentes Criminais', value: docs?.general?.criminalRecordUrl, urgent: true, acceptsMissingDeclaration: true },
        ...(employee.role === 'INSTRUCTOR' ? [
            { key: 'teacher.diplomaUrl', label: 'Diploma', value: docs?.teacher?.diplomaUrl, urgent: true },
        ] : []),
        ...(employee.role === 'DRIVER' ? [
            { key: 'driver.cnhUrl', label: 'CNH', value: docs?.driver?.cnhUrl, urgent: true },
            { key: 'driver.transportCourseUrl', label: 'Curso de Transporte', value: docs?.driver?.transportCourseUrl, urgent: true },
            { key: 'driver.toxicologicalUrl', label: 'Exame Toxicológico', value: docs?.driver?.toxicologicalUrl, urgent: true },
        ] : []),
        ...(employee.role === 'COORDINATOR' ? [
            { key: 'coordinator.specializationUrl', label: 'Especialização/Gestão', value: docs?.coordinator?.specializationUrl, urgent: true },
        ] : []),
    ];
    const missingRequiredDocs = requiredDocs.filter((d) => {
        if (!d.value) return true;
        if (isDocMarkedMissing(d.value) && !d.acceptsMissingDeclaration) return true;
        return false;
    });
    const hasAnyAddressData = docs?.address && Object.values(docs.address).some(v => !!v);

    return (
        <ModalPortal>
        <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', padding: '0.75rem' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                width: '100%', maxWidth: 1200,
                height: 'calc(100vh - 1.5rem)',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
                boxShadow: '0 16px 42px rgba(0,0,0,0.35)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 18,
                animation: 'slideInRight 0.3s cubic-bezier(0.22,1,0.36,1)',
            }}>

                {/* ═══ HEADER ═══ */}
                <div style={{
                    background: `linear-gradient(135deg, #0A0A0A 0%, ${role.color}22 100%)`,
                    borderBottom: `3px solid ${role.color}`,
                    padding: '1.75rem 1.75rem 1.25rem',
                    position: 'relative', overflow: 'hidden', flexShrink: 0,
                }}>
                    {/* Grid decoration */}
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
                    {/* Glow */}
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${role.color}25 0%, transparent 70%)`, pointerEvents: 'none' }} />

                    {/* Close */}
                    <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, width: 32, height: 32, color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>✕</button>

                    <div style={{ position: 'relative', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                        {/* Big Avatar */}
                        <div style={{
                            width: 80, height: 80, borderRadius: 20, flexShrink: 0,
                            background: `linear-gradient(135deg, ${role.color}30, ${role.color}10)`,
                            border: `2.5px solid ${role.color}70`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.6rem',
                            color: role.color, boxShadow: `0 0 30px ${role.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
                        }}>{initials}</div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Status pill */}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', background: employee.active ? 'rgba(34,197,94,0.2)' : 'rgba(107,114,128,0.2)', color: employee.active ? '#4ADE80' : '#9CA3AF', border: `1px solid ${employee.active ? 'rgba(74,222,128,0.4)' : 'rgba(156,163,175,0.3)'}`, marginBottom: '0.4rem' }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: employee.active ? '#4ADE80' : '#9CA3AF', display: 'inline-block', boxShadow: employee.active ? '0 0 6px #4ADE80' : 'none' }} />
                                {employee.active ? 'ATIVO' : 'INATIVO'}
                            </span>

                            {/* Name */}
                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.15rem', color: '#FFFFFF', letterSpacing: '0.04em', lineHeight: 1.2, marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {employee.name}
                            </div>

                            {/* Tags */}
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: `${role.color}22`, border: `1px solid ${role.color}50`, fontSize: '0.72rem', fontWeight: 700, color: role.color }}>
                                    {role.icon} {role.label}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.7rem', borderRadius: 100, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.72rem', fontWeight: 600, color: dept.color }}>
                                    {dept.label}
                                </span>
                                {employee.contractType && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.28rem 0.7rem', borderRadius: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                                        {employee.contractType}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ BODY ═══ */}
                <div style={{ flex: 1, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', minHeight: 0 }}>

                    {/* Identificação */}
                    <div>
                        <SectionTitle icon="🪪" title="Identificação" color="#6366F1" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            <Pill icon="🪪" label="CPF" value={employee.cpf} accent="#6366F1" />
                            <Pill icon="📅" label="Data de Admissão" value={fmtDate(employee.hireDate)} accent="#6366F1" />
                            <Pill icon="⭐" label="Especialidade" value={employee.specialty} accent="#6366F1" />
                            <Pill icon="📧" label="E-mail" value={employee.email} accent="#6366F1" />
                            <Pill icon="📱" label="Telefone" value={employee.phone} accent="#6366F1" />
                        </div>
                    </div>

                    <div>
                        <SectionTitle icon="🧾" title="Dados Cadastrais" color="#7C3AED" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            <Pill icon="🏷️" label="Cargo" value={role.label} accent="#7C3AED" />
                            <Pill icon="🏢" label="Departamento" value={dept.label} accent="#7C3AED" />
                            <Pill icon="📜" label="Tipo de Contrato" value={employee.contractType} accent="#7C3AED" />
                            <Pill icon="📍" label="Regra de Passagem" value={employee.travelRuleKm != null ? `${employee.travelRuleKm} km` : null} accent="#7C3AED" />
                        </div>
                        {hasAnyAddressData && (
                            <div style={{ marginTop: '0.75rem', background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 12, padding: '0.85rem 1rem' }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#7C3AED', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Endereço informado no cadastro</div>
                                <div style={{ fontSize: '0.84rem', color: '#374151' }}>
                                    {[docs?.address?.street, docs?.address?.number, docs?.address?.neighborhood].filter(Boolean).join(', ')}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 3 }}>
                                    {[docs?.address?.city, docs?.address?.stateUf, docs?.address?.cep].filter(Boolean).join(' • ')}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Documentos */}
                    <div>
                        <SectionTitle icon="📁" title="Documentos Anexados" color="#3B82F6" />
                        {missingRequiredDocs.length > 0 && (
                            <div style={{ marginBottom: '0.75rem', background: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: 12, padding: '0.75rem 0.95rem' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#C2410C', letterSpacing: '0.06em' }}>
                                    URGENTE: DOCUMENTAÇÃO INCOMPLETA
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#9A3412', marginTop: 4 }}>
                                    {missingRequiredDocs.length} documento(s) obrigatório(s) ausente(s). Solicite com urgência ao colaborador e, se necessário, anexe manualmente no cadastro.
                                </div>
                            </div>
                        )}
                        {employee.documents && Object.keys(employee.documents).length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem', background: 'rgba(59,130,246,0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)' }}>
                                {buildDocCards(employee.documents).map((doc) => (
                                    isDocMarkedMissing(doc.url) ? (
                                        <div
                                            key={doc.label}
                                            style={{ border: '1px solid #FDE68A', borderRadius: 10, background: '#FFFBEB', overflow: 'hidden' }}
                                        >
                                            <div style={{ height: 92, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ fontSize: '1.8rem' }}>📄</span>
                                            </div>
                                            <div style={{ padding: '0.5rem 0.6rem' }}>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>{doc.label}</div>
                                                <div style={{ fontSize: '0.65rem', color: '#B45309', marginTop: 2, fontWeight: 700 }}>
                                                    não possui
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <a
                                            key={doc.label}
                                            href={doc.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ textDecoration: 'none', border: '1px solid #DBEAFE', borderRadius: 10, background: '#fff', overflow: 'hidden' }}
                                        >
                                            <div
                                                style={{
                                                    width: '100%',
                                                    minHeight: 112,
                                                    maxHeight: 320,
                                                    background: '#F8FAFC',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '0.45rem',
                                                    boxSizing: 'border-box',
                                                }}
                                            >
                                                {isImageDoc(doc.url) ? (
                                                    <img
                                                        src={doc.url}
                                                        alt={doc.label}
                                                        style={{
                                                            maxWidth: '100%',
                                                            maxHeight: 280,
                                                            width: 'auto',
                                                            height: 'auto',
                                                            objectFit: 'contain',
                                                            display: 'block',
                                                        }}
                                                    />
                                                ) : isPdfDoc(doc.url) ? (
                                                    <span style={{ fontSize: '2rem' }}>📄</span>
                                                ) : (
                                                    <span style={{ fontSize: '2rem' }}>📎</span>
                                                )}
                                            </div>
                                            <div style={{ padding: '0.5rem 0.6rem' }}>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1D4ED8' }}>{doc.label}</div>
                                                <div style={{ fontSize: '0.65rem', color: '#6B7280', marginTop: 2 }}>
                                                    {isPdfDoc(doc.url) ? 'Abrir PDF' : 'Abrir arquivo'} ↗
                                                </div>
                                            </div>
                                        </a>
                                    )
                                ))}
                            </div>
                        ) : (
                            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#B91C1C', fontWeight: 600 }}>
                                Este funcionário não possui documentos anexados no cadastro. Urgente solicitar e inserir manualmente.
                            </div>
                        )}
                    </div>

                    {/* Contato */}
                    <div>
                        <SectionTitle icon="📞" title="Contato" color="#0891B2" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            <Pill icon="📱" label="WhatsApp" value={employee.phone} accent="#0891B2" />
                            <Pill icon="📧" label="E-mail" value={employee.email} accent="#0891B2" />
                        </div>
                    </div>

                    {/* Financeiro */}
                    <div>
                        <SectionTitle icon="💰" title="Financeiro" color="#059669" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            <Pill icon="📋" label="Tipo de Contrato" value={employee.contractType} accent="#059669" />
                            <Pill icon="💵" label="Custo Diária" value={fmtMoney(employee.dailyCost)} accent="#059669" />
                            {employee.monthlySalaryCLT != null && (
                                <Pill icon="🏦" label="Salário Base CLT" value={fmtMoney(employee.monthlySalaryCLT)} accent="#059669" />
                            )}
                            {employee.travelRuleKm != null && (
                                <Pill icon="📍" label="Limite KM Passagem" value={`${employee.travelRuleKm} km`} accent="#059669" />
                            )}
                        </div>
                        <div style={{ marginTop: '0.85rem' }}>
                            <EmployeeReimbursementsCollapsible key={employee.id} employeeId={employee.id} />
                        </div>
                    </div>

                    {/* Observações */}
                    {employee.notes && (
                        <div>
                            <SectionTitle icon="📝" title="Observações" color="#EA580C" />
                            <div style={{ background: 'rgba(234,88,12,0.04)', border: '1.5px solid rgba(234,88,12,0.2)', borderRadius: 14, padding: '1rem 1.1rem', fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, fontStyle: 'italic' }}>
                                {employee.notes}
                            </div>
                        </div>
                    )}

                    {/* Sistema */}
                    <div>
                        <SectionTitle icon="🕐" title="Sistema" color="#6B7280" />
                        <Pill icon="📅" label="Cadastrado em" value={fmtDate(employee.createdAt)} accent="#6B7280" />
                    </div>
                </div>

                {/* ═══ FOOTER ═══ */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E2E8F0', background: '#FFFFFF', display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: '0.75rem', borderRadius: 12, border: '1.5px solid #E2E8F0',
                        background: 'transparent', color: '#6B7280', fontWeight: 700, fontSize: '0.85rem',
                        cursor: 'pointer', transition: 'all 0.18s',
                    }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                        ✕ Fechar
                    </button>
                    <button
                        onClick={() => { onClose(); onEdit(); }}
                        style={{
                            flex: 2, padding: '0.75rem', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg, #FFD600, #B89B00)',
                            color: '#000', fontWeight: 900, fontSize: '0.88rem',
                            cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,214,0,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            transition: 'all 0.18s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(255,214,0,0.55)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(255,214,0,0.4)'; }}
                    >
                        ✏️ Editar Funcionário
                    </button>
                </div>
            </div>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </div>
        </ModalPortal>
    );
}



/* ── Modal ─────────────────────────────────────────── */
function EmployeeModal({ employee, onClose, onSave }: { employee?: Employee | null; onClose: () => void; onSave: () => void }) {
    const docs = (employee?.documents || {}) as any;
    const [form, setForm] = useState(employee ? {
        name: employee.name, role: employee.role, department: employee.department,
        cpf: employee.cpf || '', phone: employee.phone || '',
        email: employee.email || '', specialty: employee.specialty || '',
        dailyCost: employee.dailyCost?.toString() || '', hireDate: employee.hireDate?.split('T')[0] || '',
        notes: employee.notes || '', active: employee.active,
        contractType: employee.contractType || '',
        monthlySalaryCLT: employee.monthlySalaryCLT?.toString() || '',
        travelRuleKm: employee.travelRuleKm || 200,
        password: '', confirmPassword: '',
        addressCep: docs?.address?.cep || '',
        addressStreet: docs?.address?.street || '',
        addressNumber: docs?.address?.number || '',
        addressNeighborhood: docs?.address?.neighborhood || '',
        addressCity: docs?.address?.city || '',
        addressStateUf: docs?.address?.stateUf || '',
        docUrl: docs?.general?.docUrl || '',
        addressUrl: docs?.general?.addressUrl || '',
        selfieUrl: docs?.general?.selfieUrl || '',
        criminalRecordUrl: docs?.general?.criminalRecordUrl || '',
        teacherEducation: docs?.teacher?.education || '',
        teacherFieldOfStudy: docs?.teacher?.fieldOfStudy || '',
        teacherProfessionalReg: docs?.teacher?.professionalReg || '',
        teacherDiplomaUrl: docs?.teacher?.diplomaUrl || '',
        teacherCertificatesUrl: docs?.teacher?.certificatesUrl || '',
        teacherExperienceUrl: docs?.teacher?.experienceUrl || '',
        driverCnhNumber: docs?.driver?.cnhNumber || '',
        driverCnhCategory: docs?.driver?.cnhCategory || '',
        driverCnhExpiration: docs?.driver?.cnhExpiration || '',
        driverCnhUrl: docs?.driver?.cnhUrl || '',
        driverTransportCourseUrl: docs?.driver?.transportCourseUrl || '',
        driverToxicologicalUrl: docs?.driver?.toxicologicalUrl || '',
        driverCnhRecordUrl: docs?.driver?.cnhRecordUrl || '',
        coordinatorExperienceTime: docs?.coordinator?.experienceTime || '',
        coordinatorSpecializationUrl: docs?.coordinator?.specializationUrl || '',
    } : { ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(0);
    const [postSavePhase, setPostSavePhase] = useState<'idle' | 'create' | 'update'>('idle');

    const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    useEffect(() => {
        if (postSavePhase === 'idle') return;
        const t = setTimeout(() => {
            setPostSavePhase('idle');
            onSave();
            onClose();
        }, 2200);
        return () => clearTimeout(t);
    }, [postSavePhase, onSave, onClose]);

    const handleSubmit = async () => {
        if (!form.name.trim()) { setError('Nome é obrigatório'); return; }
        // Validação de senha — só quando preenchida
        if (form.password) {
            if (form.password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return; }
            if (form.password !== form.confirmPassword) { setError('As senhas não coincidem'); return; }
        }
        setSaving(true);
        setError('');
        try {
            const payload: any = {
                name: form.name, role: form.role, department: form.department,
                cpf: form.cpf || undefined,
                phone: form.phone || undefined, email: form.email || undefined,
                specialty: form.specialty || undefined,
                dailyCost: form.dailyCost ? parseCurrency(form.dailyCost as string) : undefined,
                hireDate: form.hireDate || undefined, notes: form.notes || undefined,
                active: form.active,
                contractType: form.contractType || undefined,
                monthlySalaryCLT: form.monthlySalaryCLT ? parseCurrency(form.monthlySalaryCLT as string) : undefined,
                travelRuleKm: form.travelRuleKm ? parseInt(String(form.travelRuleKm)) : undefined,
                documents: {
                    address: {
                        cep: form.addressCep?.replace(/\D/g, '') || '',
                        street: form.addressStreet || '',
                        number: form.addressNumber || '',
                        neighborhood: form.addressNeighborhood || '',
                        city: form.addressCity || '',
                        stateUf: form.addressStateUf || '',
                    },
                    general: {
                        docUrl: form.docUrl || '',
                        addressUrl: form.addressUrl || '',
                        selfieUrl: form.selfieUrl || '',
                        criminalRecordUrl: form.criminalRecordUrl || '',
                    },
                    teacher: {
                        education: form.teacherEducation || '',
                        fieldOfStudy: form.teacherFieldOfStudy || '',
                        professionalReg: form.teacherProfessionalReg || '',
                        diplomaUrl: form.teacherDiplomaUrl || '',
                        certificatesUrl: form.teacherCertificatesUrl || '',
                        experienceUrl: form.teacherExperienceUrl || '',
                    },
                    driver: {
                        cnhNumber: form.driverCnhNumber || '',
                        cnhCategory: form.driverCnhCategory || '',
                        cnhExpiration: form.driverCnhExpiration || '',
                        cnhUrl: form.driverCnhUrl || '',
                        transportCourseUrl: form.driverTransportCourseUrl || '',
                        toxicologicalUrl: form.driverToxicologicalUrl || '',
                        cnhRecordUrl: form.driverCnhRecordUrl || '',
                    },
                    coordinator: {
                        experienceTime: form.coordinatorExperienceTime || '',
                        specializationUrl: form.coordinatorSpecializationUrl || '',
                    },
                },
                ...(form.password ? { password: form.password } : {}),
            };
            if (employee?.id) {
                await api.put(`/employees/${employee.id}`, payload);
                setPostSavePhase('update');
            } else {
                await api.post('/employees', payload);
                setPostSavePhase('create');
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Erro ao salvar funcionário');
        } finally {
            setSaving(false);
        }
    };

    const steps = ['Identificação', 'Cargo & Setor', 'Contato & Dados'];
    const selectedRole = ROLE_CONFIG[form.role];

    if (postSavePhase !== 'idle') {
        return (
            <ModalPortal>
            <div
                style={{
                    position: 'fixed', inset: 0, zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
                }}
                onClick={e => {
                    if (e.target === e.currentTarget) {
                        setPostSavePhase('idle');
                        onSave();
                        onClose();
                    }
                }}
            >
                <div className="animate-scale-in" style={{ background: '#fff', borderRadius: 24, padding: '2rem 1.5rem', maxWidth: 460, width: '92%' }} onClick={e => e.stopPropagation()}>
                    <CreationSuccessScreen
                        title={postSavePhase === 'create' ? 'FUNCIONÁRIO CADASTRADO!' : 'FUNCIONÁRIO ATUALIZADO!'}
                        entityName={form.name}
                        redirectMessage="Atualizando a lista de funcionários..."
                        alinhamento="center"
                        minHeight="auto"
                    />
                </div>
            </div>
            </ModalPortal>
        );
    }

    return (
        <ModalPortal>
        <div style={{
            position: 'fixed', inset: 0, zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
        }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="animate-scale-in" style={{
                width: '100%', maxWidth: 860,
                maxHeight: 'calc(100vh - 2rem)',
                background: 'linear-gradient(145deg, #FFFFFF, #F9FAFB)',
                borderRadius: 24, boxShadow: '0 32px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,214,0,0.3)',
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
            }}>
                {/* Modal header */}
                <div style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)',
                    position: 'relative', overflow: 'hidden',
                }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(255,214,0,0.02) 8px, rgba(255,214,0,0.02) 9px)' }} />
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFD600', letterSpacing: '0.12em' }}>
                                {employee ? '✏️ EDITAR FUNCIONÁRIO' : '➕ NOVO FUNCIONÁRIO'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>
                                Passo {step + 1} de {steps.length} — {steps[step]}
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                    </div>
                    {/* Step progress */}
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1rem', position: 'relative' }}>
                        {steps.map((s, i) => (
                            <div key={i} onClick={() => setStep(i)} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? '#FFD600' : 'rgba(255,255,255,0.15)', cursor: 'pointer', transition: 'background 0.3s' }} />
                        ))}
                    </div>
                </div>

                {/* Modal body */}
                <div style={{ padding: '1.5rem', maxHeight: 620, overflowY: 'auto' }} className="custom-scrollbar">

                    {/* Step 0 — Identificação */}
                    {step === 0 && (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="form-label">Nome Completo *</label>
                                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="João da Silva..." />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                                <div>
                                    <label className="form-label">CPF</label>
                                    <input className="form-input" value={form.cpf} onChange={e => set('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} inputMode="numeric" />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Data de Admissão</label>
                                <input type="date" className="form-input" value={form.hireDate} onChange={e => set('hireDate', e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: 12, background: form.active ? 'rgba(0,255,138,0.06)' : 'rgba(107,114,128,0.06)', border: `1px solid ${form.active ? 'rgba(0,255,138,0.3)' : 'rgba(107,114,128,0.2)'}` }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>Status do Funcionário</div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{form.active ? 'Ativo no sistema' : 'Inativo'}</div>
                                </div>
                                <button type="button" onClick={() => set('active', !form.active)}
                                    style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', background: form.active ? '#00FF8A' : '#E5E7EB', border: 'none', transition: 'background 0.25s', flexShrink: 0 }}>
                                    <span style={{ position: 'absolute', top: 3, left: form.active ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)', display: 'block' }} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 1 — Cargo & Setor */}
                    {step === 1 && (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="form-label">Cargo / Função *</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    {ROLES.map(([roleKey, cfg]) => (
                                        <button key={roleKey} type="button" onClick={() => set('role', roleKey)}
                                            style={{
                                                padding: '0.65rem 0.75rem', borderRadius: 12, cursor: 'pointer',
                                                border: `2px solid ${form.role === roleKey ? cfg.color : '#E5E7EB'}`,
                                                background: form.role === roleKey ? cfg.bg : 'transparent',
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                fontSize: '0.78rem', fontWeight: 700, color: form.role === roleKey ? cfg.color : '#6B7280',
                                                transition: 'all 0.2s',
                                                boxShadow: form.role === roleKey ? `0 0 12px ${cfg.glow}` : 'none',
                                            }}>
                                            <span style={{ fontSize: '1.1rem' }}>{cfg.icon}</span>
                                            {cfg.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Departamento *</label>
                                <select className="form-input" value={form.department} onChange={e => set('department', e.target.value)}>
                                    {DEPTS.map(([deptKey, cfg]) => (
                                        <option key={deptKey} value={deptKey}>{cfg.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Especialidade / Habilidade</label>
                                <input className="form-input" value={form.specialty} onChange={e => set('specialty', e.target.value)} placeholder="Ex: CNH categoria E, Eletrônica..." />
                            </div>
                            <div>
                                <label className="form-label">Tipo de Contrato</label>
                                <select className="form-input" value={form.contractType || ''} onChange={e => set('contractType', e.target.value)}>
                                    <option value="">Selecione...</option>
                                    <option value="CLT">CLT — Assalariado</option>
                                    <option value="PJ">PJ — Pessoa Jurídica</option>
                                    <option value="FREELANCE">Freelance</option>
                                </select>
                            </div>
                            {form.contractType === 'CLT' && (
                                <div>
                                    <label className="form-label">Salário Base Mensal (R$)</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.82rem', color: '#6B7280', pointerEvents: 'none', fontWeight: 600 }}>R$</span>
                                        <input className="form-input" style={{ paddingLeft: '2.2rem' }}
                                            value={form.monthlySalaryCLT || ''}
                                            onChange={e => set('monthlySalaryCLT', maskCurrency(e.target.value))}
                                            placeholder="0,00" inputMode="numeric" />
                                    </div>
                                </div>
                            )}
                            {form.contractType === 'CLT' && (
                                <div>
                                    <label className="form-label">Distância limite para passagem semanal (km)</label>
                                    <input type="number" className="form-input"
                                        value={form.travelRuleKm || 200} onChange={e => set('travelRuleKm', e.target.value)}
                                        placeholder="200" />
                                    <p style={{fontSize:'0.7rem', color:'#9CA3AF', marginTop:'0.25rem'}}>
                                        ≤ {form.travelRuleKm || 200}km = passagem semanal · acima = quinzenal
                                    </p>
                                </div>
                            )}
                            <div>
                                <label className="form-label">Custo Diária (R$)</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.82rem', color: '#6B7280', pointerEvents: 'none', fontWeight: 600 }}>R$</span>
                                    <input className="form-input" style={{ paddingLeft: '2.2rem' }}
                                        value={form.dailyCost}
                                        onChange={e => set('dailyCost', maskCurrency(e.target.value))}
                                        placeholder="0,00" inputMode="numeric" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2 — Contato & Dados */}
                    {step === 2 && (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="form-label">Telefone / WhatsApp</label>
                                <input className="form-input" value={form.phone} onChange={e => set('phone', maskPhone(e.target.value))} placeholder="(98) 99999-9999" maxLength={15} inputMode="numeric" />
                            </div>
                            <div>
                                <label className="form-label">E-mail</label>
                                <input type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="funcionario@upgrade.ma" />
                            </div>
                            {/* Campos de acesso ao sistema — só mostrar em novo funcionário */}
                            {!employee && (
                                <>
                                    <div style={{ padding: '0.75rem 1rem', borderRadius: 12, background: 'rgba(8,145,178,0.05)', border: '1px solid rgba(8,145,178,0.2)' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0891B2', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                            🔑 Acesso ao Sistema (opcional)
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: '0.75rem' }}>
                                            Preencha para criar login. Deixe em branco se o funcionário não precisa acessar o sistema.
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            <div>
                                                <label className="form-label">Senha</label>
                                                <input type="password" className="form-input" value={form.password || ''} onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
                                            </div>
                                            <div>
                                                <label className="form-label">Confirmar Senha</label>
                                                <input type="password" className="form-input" value={form.confirmPassword || ''} onChange={e => set('confirmPassword', e.target.value)} placeholder="Repita a senha" autoComplete="new-password" />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="form-label">Observações</label>
                                <textarea className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Informações adicionais..." rows={3} style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ marginTop: '0.4rem', borderTop: '1px dashed #E5E7EB', paddingTop: '0.85rem' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7C3AED', letterSpacing: '0.09em', marginBottom: '0.5rem' }}>ENDEREÇO (CONTRATO ÚNICO)</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                    <input className="form-input" value={form.addressCep} onChange={e => set('addressCep', maskCEP(e.target.value))} placeholder="CEP 00000-000" />
                                    <input className="form-input" value={form.addressCity} onChange={e => set('addressCity', e.target.value)} placeholder="Cidade" />
                                    <input className="form-input" value={form.addressStreet} onChange={e => set('addressStreet', e.target.value)} placeholder="Rua / Logradouro" />
                                    <input className="form-input" value={form.addressNumber} onChange={e => set('addressNumber', e.target.value)} placeholder="Número / S/N" />
                                    <input className="form-input" value={form.addressNeighborhood} onChange={e => set('addressNeighborhood', e.target.value)} placeholder="Bairro" />
                                    <input className="form-input" value={form.addressStateUf} onChange={e => set('addressStateUf', e.target.value)} placeholder="UF" />
                                </div>
                            </div>
                            <div style={{ marginTop: '0.5rem' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#B45309', letterSpacing: '0.09em', marginBottom: '0.5rem' }}>DOCUMENTOS GERAIS (MESMO DO LINK)</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '0.6rem' }}>
                                    <DocumentPreviewField label="Identidade (frente/verso)" value={form.docUrl} onChange={(v) => set('docUrl', v)} />
                                    <DocumentPreviewField label="Comprovante de residência" value={form.addressUrl} onChange={(v) => set('addressUrl', v)} />
                                    <DocumentPreviewField label="Selfie" value={form.selfieUrl} onChange={(v) => set('selfieUrl', v)} />
                                    <DocumentPreviewField label="Antecedentes criminais" value={form.criminalRecordUrl} onChange={(v) => set('criminalRecordUrl', v)} acceptNoPossui />
                                </div>
                            </div>
                            {form.role === 'INSTRUCTOR' && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563EB', letterSpacing: '0.09em', marginBottom: '0.5rem' }}>DADOS DE PROFESSOR</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <input className="form-input" value={form.teacherEducation} onChange={e => set('teacherEducation', e.target.value)} placeholder="Escolaridade" />
                                        <input className="form-input" value={form.teacherFieldOfStudy} onChange={e => set('teacherFieldOfStudy', e.target.value)} placeholder="Área de formação" />
                                        <input className="form-input" value={form.teacherProfessionalReg} onChange={e => set('teacherProfessionalReg', e.target.value)} placeholder="Registro profissional" />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '0.6rem', marginTop: '0.5rem' }}>
                                        <DocumentPreviewField label="Diploma" value={form.teacherDiplomaUrl} onChange={(v) => set('teacherDiplomaUrl', v)} />
                                        <DocumentPreviewField label="Certificados" value={form.teacherCertificatesUrl} onChange={(v) => set('teacherCertificatesUrl', v)} />
                                        <DocumentPreviewField label="Comprovante de experiência" value={form.teacherExperienceUrl} onChange={(v) => set('teacherExperienceUrl', v)} />
                                    </div>
                                </div>
                            )}
                            {form.role === 'DRIVER' && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0891B2', letterSpacing: '0.09em', marginBottom: '0.5rem' }}>DADOS DE MOTORISTA</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <input className="form-input" value={form.driverCnhNumber} onChange={e => set('driverCnhNumber', e.target.value)} placeholder="Número CNH" />
                                        <input className="form-input" value={form.driverCnhCategory} onChange={e => set('driverCnhCategory', e.target.value)} placeholder="Categoria CNH" />
                                        <input className="form-input" value={form.driverCnhExpiration} onChange={e => set('driverCnhExpiration', e.target.value)} placeholder="Validade CNH (YYYY-MM-DD)" />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '0.6rem', marginTop: '0.5rem' }}>
                                        <DocumentPreviewField label="CNH" value={form.driverCnhUrl} onChange={(v) => set('driverCnhUrl', v)} />
                                        <DocumentPreviewField label="Curso transporte" value={form.driverTransportCourseUrl} onChange={(v) => set('driverTransportCourseUrl', v)} />
                                        <DocumentPreviewField label="Exame toxicológico" value={form.driverToxicologicalUrl} onChange={(v) => set('driverToxicologicalUrl', v)} />
                                        <DocumentPreviewField label="Prontuário CNH" value={form.driverCnhRecordUrl} onChange={(v) => set('driverCnhRecordUrl', v)} />
                                    </div>
                                </div>
                            )}
                            {form.role === 'COORDINATOR' && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7C3AED', letterSpacing: '0.09em', marginBottom: '0.5rem' }}>DADOS DE COORDENADOR</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <input className="form-input" value={form.coordinatorExperienceTime} onChange={e => set('coordinatorExperienceTime', e.target.value)} placeholder="Tempo de experiência" />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem', marginTop: '0.5rem' }}>
                                        <DocumentPreviewField label="Especialização/Gestão" value={form.coordinatorSpecializationUrl} onChange={(v) => set('coordinatorSpecializationUrl', v)} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div style={{ marginTop: '0.75rem', padding: '0.7rem 1rem', borderRadius: 10, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', color: '#DC2626', fontSize: '0.8rem', fontWeight: 600 }}>
                            ⚠️ {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
                    <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
                        className="btn-ghost" style={{ fontSize: '0.82rem' }}>
                        {step === 0 ? '✕ Cancelar' : '← Anterior'}
                    </button>
                    {step < 2 ? (
                        <button onClick={() => setStep(s => s + 1)} className="btn-primary" style={{ fontSize: '0.82rem' }}>
                            Próximo →
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ fontSize: '0.82rem', minWidth: 140, justifyContent: 'center' }}>
                            {saving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, boxShadow: 'none' }} /> Salvando...</> : <><span>💾</span> {employee ? 'Salvar Edição' : 'Cadastrar'}</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
        </ModalPortal>
    );
}

/* ── GENERATE LINK MODAL ───────────────────────────── */
function GenerateLinkModal({ onClose }: { onClose: () => void }) {
    const [role, setRole] = useState('INSTRUCTOR');
    const [department, setDepartment] = useState('ACADEMIC');
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await api.post('/employees/registration-token', { role, department });
            const token = res.data.token;
            const link = `${window.location.origin}/registro/funcionario/${token}`;
            setGeneratedLink(link);
        } catch (e: any) {
            console.error('Erro ao gerar link:', e.response?.data || e.message || e);
            alert(`Erro ao gerar link: ${e.response?.data?.message || e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalPortal>
        <div style={{ position: 'fixed', inset: 0, zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
            <div className="animate-scale-in" style={{ background: '#FFFFFF', width: '100%', maxWidth: 480, borderRadius: 24, boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>🔗</div>
                        <div>
                            <h2 style={{ margin: 0, fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#111827', letterSpacing: '0.05em' }}>GERAR LINK SEGURO</h2>
                            <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>Cadastro autônomo de funcionário</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: '0.4rem', fontSize: '1.2rem', color: '#9CA3AF' }}>✕</button>
                </div>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {!generatedLink ? (
                        <>
                            <div className="form-group">
                                <label className="form-label">Cargo Destinado</label>
                                <select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
                                    {ROLES.map(([k, v]) => <option key={k} value={k}>{(v as any).icon || ''} {v.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Departamento</label>
                                <select className="form-input" value={department} onChange={e => setDepartment(e.target.value)}>
                                    {DEPTS.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                            </div>
                            <button onClick={handleGenerate} disabled={loading} className="btn-primary" style={{ width: '100%', padding: '0.9rem', fontSize: '0.85rem', marginTop: '1rem', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
                                {loading ? 'Gerando...' : 'Gerar Link Único'}
                            </button>
                        </>
                    ) : (
                        <div className="animate-fade-in" style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669', marginBottom: '0.5rem' }}>Link Gerado com Sucesso!</h3>
                            <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '1.5rem' }}>Envie o link abaixo para o futuro funcionário preencher seus dados.</p>
                            
                            <div style={{ display: 'flex', gap: '0.5rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '0.5rem', alignItems: 'center' }}>
                                <input type="text" readOnly value={generatedLink} style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.75rem', color: '#111827', outline: 'none', padding: '0 0.5rem' }} />
                                <button onClick={() => { navigator.clipboard.writeText(generatedLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: copied ? '#10B981' : '#111827', color: '#fff', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                                    {copied ? 'Copiado!' : 'Copiar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </ModalPortal>
    );
}

/* ── MAIN PAGE ─────────────────────────────────────── */
export default function FuncionariosPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [empPage, setEmpPage] = useState(1);
    const [empTotalPages, setEmpTotalPages] = useState(1);
    const [empTotal, setEmpTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterActive, setFilterActive] = useState('');
    const [employeesViewMode, setEmployeesViewMode] = usePersistedAdminViewMode('admin:funcionarios:employees', 'card');
    const [pendingViewMode, setPendingViewMode] = usePersistedAdminViewMode('admin:funcionarios:pending', 'card');
    const [kpis, setKpis] = useState({ total: 0, active: 0, byRole: [] as any[], byDept: [] as any[] });
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    // Aba Pendentes — usuários auto-cadastrados aguardando aprovação
    const [activeTab, setActiveTab] = useState<'employees' | 'pending'>('employees');
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [pendingPage, setPendingPage] = useState(1);
    const [pendingTotalPages, setPendingTotalPages] = useState(1);
    const [pendingTotal, setPendingTotal] = useState(0);
    const [loadingPending, setLoadingPending] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [pendingDailyCost, setPendingDailyCost] = useState<Record<string, string>>({});
    const [pendingContractType, setPendingContractType] = useState<Record<string, 'CLT' | 'FREELANCE'>>({});
    const [pendingMonthlySalaryCLT, setPendingMonthlySalaryCLT] = useState<Record<string, string>>({});
    const [pendingToast, setPendingToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [expandedPendingId, setExpandedPendingId] = useState<string | null>(null);
    const [adminInviteLink, setAdminInviteLink] = useState('');
    const [adminInviteOpen, setAdminInviteOpen] = useState(false);
    const [adminInviteLoading, setAdminInviteLoading] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState('');

    useEffect(() => {
        const u = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (u) {
            try { setCurrentUserRole(JSON.parse(u).role ?? ''); } catch {}
        }
    }, []);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page: empPage, limit: 12 };
            if (search) params.search = search;
            if (filterRole) params.role = filterRole;
            if (filterDept) params.department = filterDept;
            if (filterActive) params.active = filterActive;

            const res = await api.get('/employees', { params });
            const data = res.data;
            setEmployees(data.employees || []);
            setEmpTotal(data.total || 0);
            setEmpTotalPages(data.totalPages || 1);
            setKpis({ total: data.total || 0, active: data.activeCount || 0, byRole: data.byRole || [], byDept: data.byDept || [] });
        } catch {
            setEmployees([]);
            setEmpTotal(0);
            setEmpTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [search, filterRole, filterDept, filterActive, empPage]);

    useEffect(() => { setEmpPage(1); }, [search, filterRole, filterDept, filterActive]);

    useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

    const handleEdit = (emp: Employee) => { setEditingEmployee(emp); setModalOpen(true); document.body.style.overflow = 'hidden'; };

    const handleToggleActive = async (id: string) => {
        try { await api.patch(`/employees/${id}/toggle-active`); fetchEmployees(); } catch { /* silencioso */ }
    };

    const handleDelete = async (id: string) => {
        try { await api.delete(`/employees/${id}`); setDeleteConfirm(null); fetchEmployees(); } catch { /* silencioso */ }
    };

    const handleModalSave = () => { setModalOpen(false); setEditingEmployee(null); document.body.style.overflow = ''; fetchEmployees(); };

    // ── Pendentes: buscar solicitações de cadastro
    const fetchPending = useCallback(async () => {
        setLoadingPending(true);
        try {
            const res = await api.get('/employees/registration-requests', {
                params: { page: pendingPage, limit: 12 },
            });
            const data = res.data;
            const list = data?.data ?? (Array.isArray(data) ? data : []);
            setPendingUsers(list);
            setPendingTotal(data?.total ?? list.length);
            setPendingTotalPages(data?.totalPages ?? 1);
        } catch {
            setPendingUsers([]);
            setPendingTotal(0);
            setPendingTotalPages(1);
        } finally { setLoadingPending(false); }
    }, [pendingPage]);

    useEffect(() => { if (activeTab === 'pending') setPendingPage(1); }, [activeTab]);

    useEffect(() => { if (activeTab === 'pending') fetchPending(); }, [activeTab, fetchPending]);

    const showPendingToast = (msg: string, ok: boolean) => {
        setPendingToast({ msg, ok }); setTimeout(() => setPendingToast(null), 3500);
    };

    const getRoleDataKey = (role?: string) => {
        if (role === 'INSTRUCTOR') return 'teacher';
        if (role === 'DRIVER') return 'driver';
        if (role === 'COORDINATOR') return 'coordinator';
        return null;
    };

    const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api').replace(/\/api\/?$/, '');
    const normalizeDocUrl = (raw: string) => {
        const value = raw.trim();
        if (!value) return value;
        if (/^https?:\/\//i.test(value)) return value;
        if (value.startsWith('//')) return `https:${value}`;
        if (value.startsWith('/')) return `${apiOrigin}${value}`;
        return `${apiOrigin}/${value}`;
    };
    const getPendingDocs = (submittedData: any) => {
        const docs: { key: string; url: string }[] = [];
        if (!submittedData || typeof submittedData !== 'object') return docs;
        const scanObj = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;
            Object.entries(obj).forEach(([k, v]) => {
                if (typeof v === 'string' && k.toLowerCase().includes('url') && v.trim() !== '') {
                    const normalized = normalizeDocUrl(v);
                    const marker = normalized.toLowerCase().trim();
                    if (['não possui', 'nao possui', 'não tem', 'nao tem'].includes(marker)) return;
                    docs.push({ key: k, url: normalized });
                } else if (typeof v === 'object' && v !== null) scanObj(v);
            });
        };
        scanObj(submittedData);
        return docs;
    };

    const getPendingContractType = (id: string) => pendingContractType[id] ?? 'FREELANCE';

    const renderPendingFinanceBanner = (reqId: string) => {
        const contractType = getPendingContractType(reqId);
        const isClt = contractType === 'CLT';
        return (
            <div style={{ marginBottom: '1rem', background: isClt ? '#EDE9FE' : '#ECFDF5', border: `1px solid ${isClt ? '#C4B5FD' : '#BBF7D0'}`, borderRadius: 12, padding: '0.85rem 1rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: isClt ? '#5B21B6' : '#065F46', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
                    DEFINIR CONTRATO PARA APROVAÇÃO
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {(['CLT', 'FREELANCE'] as const).map(opt => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => setPendingContractType(prev => ({ ...prev, [reqId]: opt }))}
                                style={{
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: 8,
                                    border: contractType === opt ? '2px solid #111827' : '1px solid #D1D5DB',
                                    background: contractType === opt ? '#111827' : '#fff',
                                    color: contractType === opt ? '#FFD600' : '#374151',
                                    fontWeight: 800,
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                }}
                            >
                                {opt === 'CLT' ? 'CLT' : 'Diária'}
                            </button>
                        ))}
                    </div>
                    {isClt ? (
                        <input
                            value={pendingMonthlySalaryCLT[reqId] ?? ''}
                            onChange={(e) => setPendingMonthlySalaryCLT(prev => ({ ...prev, [reqId]: maskCurrency(e.target.value) }))}
                            placeholder="Salário mensal"
                            className="form-input"
                            style={{ width: 150, fontSize: '0.8rem', fontWeight: 700, color: '#5B21B6', background: '#fff' }}
                        />
                    ) : (
                        <input
                            value={pendingDailyCost[reqId] ?? ''}
                            onChange={(e) => setPendingDailyCost(prev => ({ ...prev, [reqId]: maskCurrency(e.target.value) }))}
                            placeholder="Valor diária"
                            className="form-input"
                            style={{ width: 130, fontSize: '0.8rem', fontWeight: 700, color: '#065F46', background: '#fff' }}
                        />
                    )}
                    <span style={{ fontSize: '0.75rem', color: isClt ? '#6D28D9' : '#047857' }}>
                        {isClt
                            ? 'Salário mensal CLT — no período de curso entra proporcional + passagens.'
                            : 'Diária — no período de curso conta dias × valor/dia.'}
                    </span>
                </div>
            </div>
        );
    };

    const handleApprove = async (id: string, name: string) => {
        const contractType = getPendingContractType(id);
        const payload: Record<string, unknown> = { contractType };
        if (contractType === 'CLT') {
            const salary = parseCurrency(pendingMonthlySalaryCLT[id] || '');
            if (!salary || salary <= 0) {
                showPendingToast('Informe o salário mensal CLT para aprovar.', false);
                return;
            }
            payload.monthlySalaryCLT = salary;
        } else {
            const dailyCostValue = parseCurrency(pendingDailyCost[id] || '');
            if (!dailyCostValue || dailyCostValue <= 0) {
                showPendingToast('Informe a diária para aprovar este cadastro.', false);
                return;
            }
            payload.dailyCost = dailyCostValue;
        }
        setPendingAction(id + 'approve');
        try {
            await api.post(`/employees/registration-requests/${id}/approve`, payload);
            showPendingToast(`✅ ${name} aprovado com sucesso!`, true);
            setPendingDailyCost(prev => ({ ...prev, [id]: '' }));
            setPendingMonthlySalaryCLT(prev => ({ ...prev, [id]: '' }));
            fetchPending();
            fetchEmployees();
        } catch (err: any) {
            showPendingToast(err?.response?.data?.message || 'Erro ao aprovar usuário', false);
        } finally { setPendingAction(null); }
    };

    const handleReject = async (id: string, name: string) => {
        setPendingAction(id + 'reject');
        try {
            // Em uma implementação completa, teríamos um endpoint de rejeição
            // Para simplificar, vou apenas marcar como rejeitado ou remover
            await api.delete(`/employees/registration-requests/${id}`);
            showPendingToast(`🗑️ Cadastro de ${name} rejeitado.`, true);
            fetchPending();
        } catch {
            showPendingToast('Erro ao rejeitar usuário', false);
        } finally { setPendingAction(null); }
    };

    const topRole = kpis.byRole.sort((a, b) => b._count._all - a._count._all)[0];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
        <style>{`
            .func-kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }
            .func-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.1rem; }
            .func-card-grid > * { min-width: 0; overflow: hidden; }
            .func-filter-selects { display: flex; flex-wrap: wrap; gap: 0.65rem; align-items: flex-end; }
            .func-select-cargo { flex: 0 1 172px; min-width: 152px; display: flex; flex-direction: column; gap: 6px; }
            .func-select-dept  { flex: 0 1 188px; min-width: 160px; display: flex; flex-direction: column; gap: 6px; }
            .func-select-status { flex: 0 1 156px; min-width: 140px; display: flex; flex-direction: column; gap: 6px; }
            .func-table-wrap { background: #FFFFFF; border-radius: 16px; border: 1px solid #E5E7EB; overflow: hidden; }
            .func-emp-btn-trio { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; }
            @media (max-width: 640px) {
                .func-kpi-grid { grid-template-columns: repeat(3, 1fr); }
                .func-card-grid { grid-template-columns: 1fr; }
                .func-filter-selects { flex-direction: column; }
                .func-select-cargo, .func-select-dept, .func-select-status { flex: 1 1 100%; min-width: 0; width: 100%; }
                .func-table-wrap { overflow-x: auto; }
            }
            @media (max-width: 400px) {
                .func-emp-btn-trio { grid-template-columns: 1fr 1fr; }
            }
        `}</style>

            {/* ── HERO HEADER ── */}
            <div style={{
                position: 'relative', borderRadius: 24, overflow: 'hidden',
                background: 'linear-gradient(135deg, #0A0A0A 0%, #1C1C2E 50%, #0A0A0A 100%)',
                border: '1px solid rgba(255,214,0,0.2)', padding: 'clamp(1.25rem, 4vw, 2rem) clamp(1rem, 4vw, 2.5rem)',
                boxShadow: '0 0 60px rgba(255,214,0,0.05), inset 0 1px 0 rgba(255,255,255,0.05)',
                minHeight: 160,
            }}>
                <ParticleField />
                {/* Grid lines decoration */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,214,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,214,0,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div>
                        {/* overflow:hidden garante que o título não vaze além do hero no mobile */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', overflow: 'hidden' }}>
                            <div style={{
                                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                                background: 'linear-gradient(135deg, #FFD600, #B89B00)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.3rem', boxShadow: '0 0 20px rgba(255,214,0,0.4)',
                            }}>👥</div>
                            <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 'clamp(1.1rem, 5vw, 1.8rem)', letterSpacing: '0.06em', color: '#FFFFFF', textShadow: '0 0 30px rgba(255,214,0,0.4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                                FUNCIONÁRIOS
                            </h1>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', margin: 0, letterSpacing: '0.08em' }}>
                            GESTÃO DE EQUIPE — SISTEMA UPGRADE
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {/* Convidar Administrador — EXCLUSIVO IT_ADMIN */}
                        {currentUserRole === 'IT_ADMIN' && (
                            <button
                                onClick={async () => {
                                    setAdminInviteLoading(true);
                                    try {
                                        const res = await api.post('/employees/admin-invite');
                                        const token = res.data.token;
                                        setAdminInviteLink(`${window.location.origin}/registro/funcionario/${token}`);
                                        setAdminInviteOpen(true);
                                    } catch (e: any) {
                                        alert(`Erro ao gerar convite: ${e.response?.data?.message || e.message}`);
                                    } finally { setAdminInviteLoading(false); }
                                }}
                                disabled={adminInviteLoading}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.7rem 1.4rem', borderRadius: 12, cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
                                    border: 'none', color: '#fff', fontWeight: 800, fontSize: '0.85rem',
                                    boxShadow: '0 4px 20px rgba(124,58,237,0.4)', letterSpacing: '0.04em',
                                    transition: 'all 0.2s', opacity: adminInviteLoading ? 0.7 : 1,
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(124,58,237,0.55)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(124,58,237,0.4)'; }}
                            >
                                <span style={{ fontSize: '1rem' }}>🛡️</span>
                                {adminInviteLoading ? 'Gerando...' : 'Convidar Administrador'}
                            </button>
                        )}
                        <button
                            onClick={() => setLinkModalOpen(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.7rem 1.4rem', borderRadius: 12, cursor: 'pointer',
                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                border: 'none', color: '#fff', fontWeight: 800, fontSize: '0.85rem',
                                boxShadow: '0 4px 20px rgba(16,185,129,0.3)', letterSpacing: '0.04em',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(16,185,129,0.45)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(16,185,129,0.3)'; }}
                        >
                            <span style={{ fontSize: '1rem' }}>🔗</span> Gerar Link de Cadastro
                        </button>
                        <button
                            onClick={() => { setEditingEmployee(null); setModalOpen(true); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.7rem 1.4rem', borderRadius: 12, cursor: 'pointer',
                                background: 'linear-gradient(135deg, #1F2937, #111827)',
                                border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 800, fontSize: '0.85rem',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.3)', letterSpacing: '0.04em',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(0,0,0,0.5)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'; }}
                        >
                            <span style={{ fontSize: '1rem' }}>＋</span> Manual
                        </button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '0.85rem', marginTop: '1.5rem' }}>
                    {[
                        { label: 'TOTAL', value: kpis.total, color: '#FFD600', bg: '#FFFDE7', border: '#FEF08A', icon: '👥' },
                        { label: 'ATIVOS', value: kpis.active, color: '#00A76F', bg: '#F0FDF4', border: '#BBF7D0', icon: '✅' },
                        { label: 'INATIVOS', value: kpis.total - kpis.active, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: '⛔' },
                    ].map((k, i) => (
                        <AnimatedKpiCard
                            key={i}
                            label={k.label}
                            value={k.value}
                            color={k.color}
                            bg={k.bg}
                            border={k.border}
                            icon={<span>{k.icon}</span>}
                            delayMs={i * 60}
                        />
                    ))}
                </div>
            </div>

            <FuncionariosSidebarTutorial />

            {/* ── TABS ── */}
            <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '2px solid #F3F4F6', paddingBottom: 0 }}>
                {([
                    { key: 'employees' as const, label: '👥 Funcionários', count: kpis.total, accent: '#FFD600' },
                    { key: 'pending' as const, label: '⏳ Pendentes', count: pendingTotal, accent: '#DC2626' },
                ]).map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                        padding: '0.6rem 1.1rem', border: 'none', cursor: 'pointer', background: 'transparent',
                        fontWeight: activeTab === tab.key ? 800 : 500, fontSize: '0.82rem',
                        color: activeTab === tab.key ? '#111827' : '#6B7280',
                        borderBottom: `3px solid ${activeTab === tab.key ? tab.accent : 'transparent'}`,
                        display: 'inline-flex', alignItems: 'center', gap: '0.45rem', transition: 'all 0.15s',
                        marginBottom: -2,
                    }}>
                        {tab.label}
                        {tab.count > 0 && (
                            <span style={{
                                background: tab.accent, color: tab.key === 'pending' ? '#fff' : '#000',
                                fontSize: '0.6rem', fontWeight: 900, padding: '1px 5px', borderRadius: 100,
                            }}>{tab.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── ABA PENDENTES ── */}
            {activeTab === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {pendingToast && (
                        <div className="animate-scale-in" style={{
                            position: 'fixed', top: 80, right: 24, zIndex: 9999, padding: '12px 20px',
                            background: pendingToast.ok ? '#D1FAE5' : '#FEE2E2',
                            border: `1px solid ${pendingToast.ok ? '#6EE7B7' : '#FCA5A5'}`,
                            borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                            fontSize: '0.85rem', fontWeight: 600, color: pendingToast.ok ? '#065F46' : '#991B1B',
                        }}>{pendingToast.msg}</div>
                    )}
                    <div style={{ background: 'rgba(251,191,36,0.08)', borderRadius: 14, border: '1.5px solid rgba(251,191,36,0.4)', padding: '0.9rem 1.2rem' }}>
                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem', fontWeight: 800, color: '#92400E', letterSpacing: '0.12em', marginBottom: '0.3rem' }}>⚠️ CADASTROS AGUARDANDO APROVAÇÃO</div>
                        <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>Usuários que se auto-cadastraram via <strong>/registro</strong> enquanto aguardam aprovação do administrador.</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <AdminViewModeToggle mode={pendingViewMode} onChange={setPendingViewMode} />
                    </div>
                    {loadingPending ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}><div className="spinner" style={{ margin: '0 auto 1rem', width: 38, height: 38 }} /> Carregando...</div>
                    ) : pendingUsers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
                            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.72rem', letterSpacing: '0.15em', color: '#059669' }}>NENHUM CADASTRO PENDENTE</div>
                        </div>
                    ) : pendingViewMode === 'table' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid #E5E7EB', background: '#fff' }}>
                                <table className="data-table" style={{ minWidth: 720 }}>
                                    <thead>
                                        <tr>
                                            <th>Nome</th>
                                            <th>Cargo</th>
                                            <th>CPF</th>
                                            <th>Contacto</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingUsers.map((req: any) => {
                                            const tokenRole = req.token?.role || 'INSTRUCTOR';
                                            const cfg = ROLE_CONFIG[tokenRole as EmployeeRole] || { label: 'Funcionário', icon: '👤', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' };
                                            const approving = pendingAction === req.id + 'approve';
                                            const rejecting = pendingAction === req.id + 'reject';
                                            return (
                                                <tr key={req.id} className="animate-fade-in">
                                                    <td style={{ fontWeight: 700, color: '#111827' }}>{req.name}</td>
                                                    <td>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.18rem 0.5rem', borderRadius: 100, background: cfg.bg, border: `1px solid ${cfg.color}30`, fontSize: '0.7rem', fontWeight: 700, color: cfg.color }}>{cfg.icon} {cfg.label}</span>
                                                    </td>
                                                    <td style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>{req.cpf || '—'}</td>
                                                    <td style={{ fontSize: '0.72rem', color: '#6B7280', maxWidth: 200 }}>
                                                        {req.email && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>📧 {req.email}</div>}
                                                        {req.phone && <div>📞 {req.phone}</div>}
                                                        {!req.email && !req.phone && '—'}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                            <button type="button" onClick={() => setExpandedPendingId(expandedPendingId === req.id ? null : req.id)} style={{ padding: '0.35rem 0.65rem', borderRadius: 8, border: '1px solid #E5E7EB', background: expandedPendingId === req.id ? '#FFFDE7' : '#F9FAFB', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                                                {expandedPendingId === req.id ? '▲ Ocultar' : '▼ Detalhes'}
                                                            </button>
                                                            <button type="button" onClick={() => handleApprove(req.id, req.name)} disabled={!!pendingAction} style={{ padding: '0.35rem 0.65rem', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer', opacity: pendingAction ? 0.6 : 1 }}>
                                                                {approving ? '…' : '✅ Aprovar'}
                                                            </button>
                                                            <button type="button" onClick={() => handleReject(req.id, req.name)} disabled={!!pendingAction} style={{ padding: '0.35rem 0.6rem', borderRadius: 8, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', color: '#DC2626', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', opacity: pendingAction ? 0.6 : 1 }}>
                                                                {rejecting ? '…' : '🗑️ Rejeitar'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {expandedPendingId && (() => {
                                const req = pendingUsers.find((r: any) => r.id === expandedPendingId);
                                if (!req) return null;
                                return (
                                    <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', border: '1px solid #E5E7EB' }}>
                                        {renderPendingFinanceBanner(req.id)}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                            <div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6B7280', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>📋 DADOS DO CADASTRO</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8rem', color: '#374151' }}>
                                                    {Object.entries(req.submittedData || {}).map(([k, v]) => {
                                                        if (['documents', 'password', 'confirmPassword'].includes(k)) return null;
                                                        if (k === 'address' && typeof v === 'object' && v) {
                                                            const addr = v as any;
                                                            return (
                                                                <div key={k} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '0.85rem', gridColumn: '1 / -1', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>📍 Endereço</div>
                                                                    <div style={{ fontWeight: 700, color: '#111827' }}>{addr.street}, {addr.number} {addr.complement ? ` - ${addr.complement}` : ''}</div>
                                                                    <div style={{ color: '#6B7280', fontSize: '0.75rem', marginTop: '0.2rem' }}>{addr.neighborhood} · {addr.city}/{addr.stateUf} · CEP {addr.cep}</div>
                                                                </div>
                                                            );
                                                        }
                                                        const roleDataKey = getRoleDataKey(req.token?.role);
                                                        if (['teacher', 'driver', 'coordinator'].includes(k) && typeof v === 'object' && v && k === roleDataKey) {
                                                            const roleData = v as any;
                                                            const roleName = k === 'teacher' ? 'Professor' : k === 'driver' ? 'Motorista' : 'Coordenador';
                                                            const icon = k === 'teacher' ? '🎓' : k === 'driver' ? '🚛' : '🎯';
                                                            return (
                                                                <div key={k} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '0.85rem', gridColumn: '1 / -1', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>{icon} Dados de {roleName}</div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                                                                        {Object.entries(roleData).filter(([rk]) => !rk.toLowerCase().includes('url')).map(([rk, rv]) => (
                                                                            <div key={rk}>
                                                                                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>{rk.replace(/([A-Z])/g, ' $1').trim()}</div>
                                                                                <div style={{ fontWeight: 600, color: '#111827', marginTop: '0.15rem' }}>{String(rv || '—')}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        if (typeof v === 'object') return null;
                                                        const labelMap: Record<string, string> = { name: 'Nome', cpf: 'CPF', email: 'E-mail', phone: 'Telefone', birthDate: 'Nascimento', gender: 'Gênero', raceColor: 'Raça/Cor', maritalStatus: 'Estado Civil', nationality: 'Nacionalidade', birthCity: 'Naturalidade', motherName: 'Nome da Mãe', fatherName: 'Nome do Pai' };
                                                        const label = labelMap[k] || k.replace(/([A-Z])/g, ' $1').trim().toUpperCase();
                                                        return (
                                                            <div key={k} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '0.6rem 0.85rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                                                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                                                                <div style={{ fontWeight: 600, color: '#111827', marginTop: '0.2rem' }}>{k === 'birthDate' ? String(v).split('T')[0].split('-').reverse().join('/') : String(v || '—')}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6B7280', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>📁 DOCUMENTOS ENVIADOS</div>
                                                {(() => {
                                                    const docs = getPendingDocs(req.submittedData);
                                                    const friendlyMap: Record<string, string> = { docUrl: 'Identidade (Frente/Verso)', addressUrl: 'Compr. Residência', selfieUrl: 'Selfie Rosto', criminalRecordUrl: 'Ant. Criminais', diplomaUrl: 'Diploma', certificatesUrl: 'Certificados', experienceUrl: 'Compr. Experiência', cnhUrl: 'CNH (Foto)', transportCourseUrl: 'Curso Transporte', toxicologicalUrl: 'Exame Toxicológico', cnhRecordUrl: 'Prontuário CNH', specializationUrl: 'Especialização/Gestão' };
                                                    const previewDocs = docs.map((doc) => ({
                                                        key: doc.key,
                                                        label: friendlyMap[doc.key] || doc.key.replace(/([A-Z])/g, ' $1').trim(),
                                                        url: doc.url,
                                                    }));
                                                    return <EmployeeDocumentsPreview docs={previewDocs} />;
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : pendingUsers.map((req: any) => {
                        const tokenRole = req.token?.role || 'INSTRUCTOR';
                        const cfg = ROLE_CONFIG[tokenRole as EmployeeRole] || { label: 'Funcionário', icon: '👤', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' };
                        const initials = req.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || '??';
                        const approving = pendingAction === req.id + 'approve';
                        const rejecting = pendingAction === req.id + 'reject';
                        return (
                            <div key={req.id} className="animate-scale-in" style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${cfg.color}30`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.3s' }}>
                                {/* CARD HEADER (Clickable) */}
                                <div onClick={() => setExpandedPendingId(expandedPendingId === req.id ? null : req.id)} style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', background: expandedPendingId === req.id ? '#FAFAFA' : '#fff' }}>
                                    <div style={{ width: 50, height: 50, borderRadius: 14, background: cfg.bg, border: `1.5px solid ${cfg.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron, sans-serif', fontWeight: 900, color: cfg.color, flexShrink: 0 }}>{initials}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {req.name}
                                            <span style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 500 }}>(Clique para expandir)</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.18rem 0.5rem', borderRadius: 100, background: cfg.bg, border: `1px solid ${cfg.color}30`, fontSize: '0.7rem', fontWeight: 700, color: cfg.color }}>{cfg.icon} {cfg.label}</span>
                                            {req.cpf && <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>🪪 CPF: {req.cpf}</span>}
                                            {req.email && <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>📧 {req.email}</span>}
                                            {req.phone && <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>📞 {req.phone}</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                        <button onClick={(e) => { e.stopPropagation(); handleApprove(req.id, req.name); }} disabled={!!pendingAction} style={{ padding: '0.5rem 0.9rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', opacity: pendingAction ? 0.6 : 1, minWidth: 85 }}>
                                            {approving ? '...' : '✅ Aprovar'}
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleReject(req.id, req.name); }} disabled={!!pendingAction} style={{ padding: '0.5rem 0.85rem', borderRadius: 10, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', color: '#DC2626', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', opacity: pendingAction ? 0.6 : 1, minWidth: 85 }}>
                                            {rejecting ? '...' : '🗑️ Rejeitar'}
                                        </button>
                                        <span style={{ fontSize: '1.2rem', color: '#9CA3AF', transform: expandedPendingId === req.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', display: 'flex', alignItems: 'center' }}>▼</span>
                                    </div>
                                </div>
                                
                                {/* EXPANDED DETAILS */}
                                {expandedPendingId === req.id && (
                                    <div className="animate-fade-in" style={{ padding: '1.5rem', borderTop: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                                        {renderPendingFinanceBanner(req.id)}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                            
                                            {/* Dados Cadastrais Adicionais */}
                                            <div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6B7280', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>📋 DADOS DO CADASTRO</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8rem', color: '#374151' }}>
                                                    {Object.entries(req.submittedData || {}).map(([k, v]) => {
                                                        if (['documents', 'password', 'confirmPassword'].includes(k)) return null;
                                                        
                                                        // Endereço
                                                        if (k === 'address' && typeof v === 'object' && v) {
                                                            const addr = v as any;
                                                            return (
                                                                <div key={k} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '0.85rem', gridColumn: '1 / -1', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>📍 Endereço</div>
                                                                    <div style={{ fontWeight: 700, color: '#111827' }}>{addr.street}, {addr.number} {addr.complement ? ` - ${addr.complement}` : ''}</div>
                                                                    <div style={{ color: '#6B7280', fontSize: '0.75rem', marginTop: '0.2rem' }}>{addr.neighborhood} · {addr.city}/{addr.stateUf} · CEP {addr.cep}</div>
                                                                </div>
                                                            );
                                                        }

                                                        // Dados Específicos do Cargo
                                                        const roleDataKey = getRoleDataKey(req.token?.role);
                                                        if (['teacher', 'driver', 'coordinator'].includes(k) && typeof v === 'object' && v && k === roleDataKey) {
                                                            const roleData = v as any;
                                                            const roleName = k === 'teacher' ? 'Professor' : k === 'driver' ? 'Motorista' : 'Coordenador';
                                                            const icon = k === 'teacher' ? '🎓' : k === 'driver' ? '🚛' : '🎯';
                                                            return (
                                                                <div key={k} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '0.85rem', gridColumn: '1 / -1', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>{icon} Dados de {roleName}</div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                                                                        {Object.entries(roleData).filter(([rk]) => !rk.toLowerCase().includes('url')).map(([rk, rv]) => (
                                                                             <div key={rk}>
                                                                                 <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>{rk.replace(/([A-Z])/g, ' $1').trim()}</div>
                                                                                 <div style={{ fontWeight: 600, color: '#111827', marginTop: '0.15rem' }}>{String(rv || '—')}</div>
                                                                             </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        // Ignorar outros objetos complexos (como token)
                                                        if (typeof v === 'object') return null;
                                                        
                                                        // Mapeamento de campos básicos
                                                        const labelMap: Record<string,string> = { name: 'Nome', cpf: 'CPF', email: 'E-mail', phone: 'Telefone', birthDate: 'Nascimento', gender: 'Gênero', raceColor: 'Raça/Cor', maritalStatus: 'Estado Civil', nationality: 'Nacionalidade', birthCity: 'Naturalidade', motherName: 'Nome da Mãe', fatherName: 'Nome do Pai' };
                                                        const label = labelMap[k] || k.replace(/([A-Z])/g, ' $1').trim().toUpperCase();

                                                        return (
                                                            <div key={k} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '0.6rem 0.85rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                                                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                                                                <div style={{ fontWeight: 600, color: '#111827', marginTop: '0.2rem' }}>{k === 'birthDate' ? String(v).split('T')[0].split('-').reverse().join('/') : String(v || '—')}</div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            {/* Documentos Anexados */}
                                            <div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6B7280', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>📁 DOCUMENTOS ENVIADOS</div>
                                                {(() => {
                                                    const docs = getPendingDocs(req.submittedData);
                                                    const friendlyMap: Record<string,string> = { docUrl: 'Identidade (Frente/Verso)', addressUrl: 'Compr. Residência', selfieUrl: 'Selfie Rosto', criminalRecordUrl: 'Ant. Criminais', diplomaUrl: 'Diploma', certificatesUrl: 'Certificados', experienceUrl: 'Compr. Experiência', cnhUrl: 'CNH (Foto)', transportCourseUrl: 'Curso Transporte', toxicologicalUrl: 'Exame Toxicológico', cnhRecordUrl: 'Prontuário CNH', specializationUrl: 'Especialização/Gestão' };
                                                    const previewDocs = docs.map((doc) => ({
                                                        key: doc.key,
                                                        label: friendlyMap[doc.key] || doc.key.replace(/([A-Z])/g, ' $1').trim(),
                                                        url: doc.url,
                                                    }));
                                                    return <EmployeeDocumentsPreview docs={previewDocs} />;
                                                })()}
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── ROLE KPI CARDS (aba Funcionários) ── */}
            {activeTab === 'employees' && kpis.byRole.length > 0 && (
                <div className="func-kpi-grid">
                    {kpis.byRole.map((r: any, i: number) => {
                        const cfg = ROLE_CONFIG[r.role as EmployeeRole];
                        if (!cfg) return null;
                        return (
                            <div key={i} className="animate-scale-in" style={{ animationDelay: `${i * 60}ms` }}
                                onClick={() => setFilterRole(filterRole === r.role ? '' : r.role)}>
                                <TiltCard style={{
                                    padding: '0.85rem 1rem', borderRadius: 14,
                                    background: filterRole === r.role ? cfg.bg : '#FFFFFF',
                                    border: `1.5px solid ${filterRole === r.role ? cfg.color : cfg.color + '30'}`,
                                    cursor: 'pointer', textAlign: 'center',
                                    boxShadow: filterRole === r.role ? `0 0 18px ${cfg.glow}` : '0 1px 4px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s',
                                }}>
                                    <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{cfg.icon}</div>
                                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.3rem', color: cfg.color, textShadow: `0 0 12px ${cfg.glow}` }}>{r._count._all}</div>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: cfg.color, opacity: 0.8, letterSpacing: '0.08em' }}>{cfg.label.toUpperCase()}</div>
                                </TiltCard>
                            </div>
                        );
                    })}

                </div>
            )}

            {/* ── FILTER BAR (padrão admin: ouro + slate, animação suave) ── */}
            <div
                className="animate-fade-in"
                style={{
                    borderRadius: 16,
                    border: '1px solid #FDE68A',
                    background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 52%, #F8FAFC 100%)',
                    boxShadow: '0 10px 32px rgba(245, 158, 11, 0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
                    overflow: 'hidden',
                }}
            >
                <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, #FACC15, #EAB308, transparent)', opacity: 0.95 }} />
                <div style={{ padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <FunnelIcon style={{ width: 18, height: 18, color: '#B45309', flexShrink: 0 }} aria-hidden />
                        <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em', color: '#92400E', textTransform: 'uppercase' }}>
                            Filtros da equipa
                        </span>
                    </div>

                    <div className="func-filter-selects">
                        <div style={{ flex: '1 1 220px', minWidth: 200, position: 'relative' }}>
                            <label htmlFor="emp-filter-search" className="form-label" style={{ marginBottom: 6, fontSize: '0.62rem', color: '#92400E' }}>
                                Busca
                            </label>
                            <div style={{ position: 'relative' }}>
                                <MagnifyingGlassIcon
                                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#94A3B8', pointerEvents: 'none' }}
                                    aria-hidden
                                />
                                <input
                                    id="emp-filter-search"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Nome, CPF ou e-mail…"
                                    className="form-input"
                                    style={{
                                        paddingLeft: '2.45rem',
                                        fontSize: '0.82rem',
                                        borderRadius: 12,
                                        border: '1.5px solid #E5E7EB',
                                        background: '#FFFFFF',
                                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#FACC15';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(250, 204, 21, 0.22)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#E5E7EB';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>
                        </div>

                        {(() => {
                            const selectStyle: CSSProperties = {
                                width: '100%',
                                fontSize: '0.8rem',
                                padding: '0.58rem 0.75rem',
                                borderRadius: 12,
                                border: '1.5px solid #E5E7EB',
                                background: '#FFFFFF',
                                cursor: 'pointer',
                                fontWeight: 600,
                                color: '#0F172A',
                                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                            };
                            const onSelFocus = (e: FocusEvent<HTMLSelectElement>) => {
                                e.target.style.borderColor = '#FACC15';
                                e.target.style.boxShadow = '0 0 0 3px rgba(250, 204, 21, 0.2)';
                            };
                            const onSelBlur = (e: FocusEvent<HTMLSelectElement>) => {
                                e.target.style.borderColor = '#E5E7EB';
                                e.target.style.boxShadow = 'none';
                            };
                            return (
                                <>
                                    <div className="func-select-cargo">
                                        <label htmlFor="filter-role" className="form-label" style={{ marginBottom: 0, fontSize: '0.62rem', color: '#92400E' }}>Cargo</label>
                                        <select id="filter-role" value={filterRole} onChange={e => setFilterRole(e.target.value)} className="form-input" style={selectStyle} onFocus={onSelFocus} onBlur={onSelBlur}>
                                            <option value="">Todos os cargos</option>
                                            {ROLES.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="func-select-dept">
                                        <label htmlFor="filter-dept" className="form-label" style={{ marginBottom: 0, fontSize: '0.62rem', color: '#92400E' }}>Departamento</label>
                                        <select id="filter-dept" value={filterDept} onChange={e => setFilterDept(e.target.value)} className="form-input" style={selectStyle} onFocus={onSelFocus} onBlur={onSelBlur}>
                                            <option value="">Todos os departamentos</option>
                                            {DEPTS.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="func-select-status">
                                        <label htmlFor="filter-active" className="form-label" style={{ marginBottom: 0, fontSize: '0.62rem', color: '#92400E' }}>Status</label>
                                        <select id="filter-active" value={filterActive} onChange={e => setFilterActive(e.target.value)} className="form-input" style={selectStyle} onFocus={onSelFocus} onBlur={onSelBlur}>
                                            <option value="">Todos os status</option>
                                            <option value="true">Ativos</option>
                                            <option value="false">Inativos</option>
                                        </select>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            paddingTop: '0.65rem',
                            borderTop: '1px dashed rgba(234, 179, 8, 0.35)',
                        }}
                    >
                        {activeTab === 'employees' ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
                                <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.1em', color: '#92400E', textTransform: 'uppercase' }}>
                                    Visualização
                                </span>
                                <AdminViewModeToggle mode={employeesViewMode} onChange={setEmployeesViewMode} />
                            </div>
                        ) : <div />}

                        {(search || filterRole || filterDept || filterActive) ? (
                            <button
                                type="button"
                                onClick={() => { setSearch(''); setFilterRole(''); setFilterDept(''); setFilterActive(''); }}
                                style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    fontFamily: 'Orbitron, sans-serif',
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    padding: '0.45rem 1rem',
                                    borderRadius: 10,
                                    border: '1.5px solid #FECACA',
                                    background: '#FEF2F2',
                                    color: '#B91C1C',
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(239, 68, 68, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = '';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                Limpar filtros
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* ── CONTENT ── */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1.5rem', width: 48, height: 48 }} />
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>
                        CARREGANDO EQUIPE...
                    </div>
                </div>
            ) : employees.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '5rem 2rem',
                    background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: 20,
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👥</div>
                    <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        NENHUM FUNCIONÁRIO ENCONTRADO
                    </div>
                    <button onClick={() => { setEditingEmployee(null); setModalOpen(true); }} className="btn-primary">
                        ＋ Cadastrar Primeiro Funcionário
                    </button>
                </div>
            ) : employeesViewMode === 'card' ? (
                <div className="func-card-grid">
                    {employees.map((emp, i) => (
                        <div key={emp.id} className="animate-scale-in" style={{ animationDelay: `${i * 50}ms` }}>
                            <EmployeeCard
                                emp={emp}
                                onEdit={() => handleEdit(emp)}
                                onToggle={() => handleToggleActive(emp.id)}
                                onDelete={() => setDeleteConfirm(emp.id)}
                                onDetails={() => { setDetailEmployee(emp); document.body.style.overflow = 'hidden'; }}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                /* List mode */
                <div className="func-table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Funcionário</th>
                                <th>Cargo</th>
                                <th>Departamento</th>
                                <th>Contato</th>
                                <th>Diária</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp, i) => {
                                const role = ROLE_CONFIG[emp.role];
                                const dept = DEPT_CONFIG[emp.department];
                                const initials = emp.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                                return (
                                    <tr key={emp.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 10, background: role.bg, border: `1px solid ${role.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.7rem', color: role.color, flexShrink: 0 }}>
                                                    {initials}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{emp.name}</div>
                                                    {emp.specialty && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{emp.specialty}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: 100, background: role.bg, border: `1px solid ${role.color}30`, fontSize: '0.68rem', fontWeight: 700, color: role.color }}>
                                                {role.icon} {role.label}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.78rem', color: dept.color, fontWeight: 600 }}>{dept.label}</td>
                                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {emp.phone && <div>📞 {emp.phone}</div>}
                                            {emp.email && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>📧 {emp.email}</div>}
                                        </td>
                                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', fontWeight: 700, color: '#059669' }}>
                                            {emp.dailyCost != null ? `R$ ${Number(emp.dailyCost).toFixed(2)}` : '—'}
                                        </td>
                                        <td>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: 100, fontSize: '0.68rem', fontWeight: 700, background: emp.active ? 'rgba(0,255,138,0.1)' : 'rgba(107,114,128,0.1)', color: emp.active ? '#059669' : '#6B7280', border: `1px solid ${emp.active ? 'rgba(0,255,138,0.3)' : 'rgba(107,114,128,0.2)'}` }}>
                                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: emp.active ? '#059669' : '#6B7280', display: 'inline-block' }} />
                                                {emp.active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                <button onClick={() => { setDetailEmployee(emp); document.body.style.overflow = 'hidden'; }} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.25)', color: '#4F46E5', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}>🔍</button>
                                                <button onClick={() => handleEdit(emp)} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: 'rgba(255,214,0,0.1)', border: '1px solid rgba(255,214,0,0.3)', color: '#B89B00', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}>✏️</button>
                                                <button onClick={() => handleToggleActive(emp.id)} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: emp.active ? 'rgba(234,88,12,0.08)' : 'rgba(5,150,105,0.08)', border: `1px solid ${emp.active ? 'rgba(234,88,12,0.25)' : 'rgba(5,150,105,0.25)'}`, color: emp.active ? '#EA580C' : '#059669', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}>{emp.active ? '⏸' : '▶️'}</button>
                                                <button onClick={() => setDeleteConfirm(emp.id)} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'employees' && (
                <AdminListPagination
                    page={empPage}
                    totalPages={empTotalPages}
                    total={empTotal}
                    loading={loading}
                    onPageChange={setEmpPage}
                    itemLabel="funcionário(s)"
                />
            )}

            {activeTab === 'pending' && pendingTotal > 0 && (
                <AdminListPagination
                    page={pendingPage}
                    totalPages={pendingTotalPages}
                    total={pendingTotal}
                    loading={loadingPending}
                    onPageChange={setPendingPage}
                    itemLabel="pendente(s)"
                />
            )}

            {/* ── DETAIL PANEL ── */}
            {detailEmployee && (
                <EmployeeDetailModal
                    employee={detailEmployee}
                    onClose={() => { setDetailEmployee(null); document.body.style.overflow = ''; }}
                    onEdit={() => { setEditingEmployee(detailEmployee); setModalOpen(true); }}
                />
            )}

            {/* ── MODALS ── */}
            {linkModalOpen && <GenerateLinkModal onClose={() => setLinkModalOpen(false)} />}

            {/* Modal Convidar Admin — IT_ADMIN only */}
            {adminInviteOpen && (
                <ModalPortal>
                <div style={{ position: 'fixed', inset: 0, zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
                    <div className="animate-scale-in" style={{ background: '#fff', width: '100%', maxWidth: 480, borderRadius: 24, boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 28 }}>🛡️</span>
                                <div>
                                    <div style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: '0.9rem', letterSpacing: '0.05em' }}>CONVITE DE ADMINISTRADOR</div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Link único gerado — válido por 7 dias</div>
                                </div>
                            </div>
                            <button onClick={() => { setAdminInviteOpen(false); setAdminInviteLink(''); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '0.4rem 0.7rem', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.6 }}>
                                Envie o link abaixo para o contratado. Ele preencherá seus dados e a solicitação aparecerá na aba <strong>Pendentes</strong> para aprovação.
                            </p>
                            <div style={{ display: 'flex', gap: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '0.5rem', alignItems: 'center' }}>
                                <input readOnly value={adminInviteLink} style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.72rem', color: '#111827', outline: 'none', padding: '0 0.5rem' }} />
                                <button onClick={() => navigator.clipboard.writeText(adminInviteLink)} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: '#7C3AED', color: '#fff', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                                    Copiar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}

            {modalOpen && (
                <EmployeeModal
                    employee={editingEmployee}
                    onClose={() => { setModalOpen(false); setEditingEmployee(null); }}
                    onSave={handleModalSave}
                />
            )}

            {/* ── DELETE CONFIRM ── */}
            {deleteConfirm && (
                <ModalPortal>
                <div style={{ position: 'fixed', inset: 0, zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="animate-scale-in" style={{ background: '#FFFFFF', borderRadius: 20, padding: '2rem', maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
                        <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.9rem', color: '#111827', marginBottom: '0.5rem' }}>CONFIRMAR EXCLUSÃO</div>
                        <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: '1.5rem' }}>Esta ação é permanente e não pode ser desfeita.</p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button onClick={() => setDeleteConfirm(null)} className="btn-ghost">Cancelar</button>
                            <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: '0.6rem 1.4rem', borderRadius: 10, background: '#DC2626', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Excluir</button>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}
        </div>
    );
}
