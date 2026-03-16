'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import api from '@/lib/api/client';

/* ── Types ─────────────────────────────────────────── */
type EmployeeRole = 'INSTRUCTOR' | 'DRIVER' | 'COORDINATOR' | 'TECHNICIAN' | 'ADMINISTRATIVE' | 'OTHER';
type EmployeeDepartment = 'ACADEMIC' | 'OPERATIONS' | 'HEALTH' | 'FINANCIAL' | 'ADMINISTRATION' | 'LOGISTICS';

interface Employee {
    id: string;
    name: string;
    role: EmployeeRole;
    department: EmployeeDepartment;
    cpf?: string;
    rg?: string;
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

const EMPTY_FORM = {
    name: '', role: 'INSTRUCTOR' as EmployeeRole, department: 'ACADEMIC' as EmployeeDepartment,
    cpf: '', rg: '', phone: '', email: '', specialty: '', dailyCost: '', hireDate: '', notes: '', active: true,
    contractType: '', monthlySalaryCLT: '', travelRuleKm: 200,
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
                                <img src={emp.photoUrl} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} />
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
                    {emp.dailyCost != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '0.78rem', width: 18, textAlign: 'center' }}>💰</span>
                            <span style={{
                                fontSize: '0.82rem', fontWeight: 800, color: '#059669',
                                fontFamily: 'JetBrains Mono, monospace',
                            }}>R$ {Number(emp.dailyCost).toFixed(2)}<span style={{ fontWeight: 500, color: '#9CA3AF' }}>/dia</span></span>
                        </div>
                    )}
                    {!emp.phone && !emp.email && !emp.specialty && emp.dailyCost == null && (
                        <div style={{ fontSize: '0.76rem', color: '#D1D5DB', fontStyle: 'italic' }}>Sem dados de contato</div>
                    )}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: `linear-gradient(90deg, ${role.color}30, transparent)`, marginBottom: '0.9rem' }} />

                {/* Action buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
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

    return (
        <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                width: '100%', maxWidth: 540,
                height: '100%',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
                boxShadow: '-12px 0 60px rgba(0,0,0,0.3)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
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
                            <Pill icon="📄" label="RG" value={employee.rg} accent="#6366F1" />
                            <Pill icon="📅" label="Data de Admissão" value={fmtDate(employee.hireDate)} accent="#6366F1" />
                            <Pill icon="⭐" label="Especialidade" value={employee.specialty} accent="#6366F1" />
                        </div>
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
    );
}



/* ── Modal ─────────────────────────────────────────── */
function EmployeeModal({ employee, onClose, onSave }: { employee?: Employee | null; onClose: () => void; onSave: () => void }) {
    const [form, setForm] = useState(employee ? {
        name: employee.name, role: employee.role, department: employee.department,
        cpf: employee.cpf || '', rg: employee.rg || '', phone: employee.phone || '',
        email: employee.email || '', specialty: employee.specialty || '',
        dailyCost: employee.dailyCost?.toString() || '', hireDate: employee.hireDate?.split('T')[0] || '',
        notes: employee.notes || '', active: employee.active,
        contractType: employee.contractType || '',
        monthlySalaryCLT: employee.monthlySalaryCLT?.toString() || '',
        travelRuleKm: employee.travelRuleKm || 200,
    } : { ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(0);

    const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async () => {
        if (!form.name.trim()) { setError('Nome é obrigatório'); return; }
        setSaving(true);
        setError('');
        try {
            const payload = {
                name: form.name, role: form.role, department: form.department,
                cpf: form.cpf || undefined, rg: form.rg || undefined,
                phone: form.phone || undefined, email: form.email || undefined,
                specialty: form.specialty || undefined,
                dailyCost: form.dailyCost ? parseCurrency(form.dailyCost as string) : undefined,
                hireDate: form.hireDate || undefined, notes: form.notes || undefined,
                active: form.active,
                contractType: form.contractType || undefined,
                monthlySalaryCLT: form.monthlySalaryCLT ? parseCurrency(form.monthlySalaryCLT as string) : undefined,
                travelRuleKm: form.travelRuleKm ? parseInt(String(form.travelRuleKm)) : undefined,
            };
            if (employee?.id) {
                await api.put(`/employees/${employee.id}`, payload);
            } else {
                await api.post('/employees', payload);
            }
            onSave();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Erro ao salvar funcionário');
        } finally {
            setSaving(false);
        }
    };

    const steps = ['Identificação', 'Cargo & Setor', 'Contato & Dados'];
    const selectedRole = ROLE_CONFIG[form.role];

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
        }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="animate-scale-in" style={{
                width: '100%', maxWidth: 560,
                background: 'linear-gradient(145deg, #FFFFFF, #F9FAFB)',
                borderRadius: 24, boxShadow: '0 32px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,214,0,0.3)',
                overflow: 'hidden',
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
                <div style={{ padding: '1.5rem', maxHeight: 440, overflowY: 'auto' }} className="custom-scrollbar">

                    {/* Step 0 — Identificação */}
                    {step === 0 && (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="form-label">Nome Completo *</label>
                                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="João da Silva..." />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label className="form-label">CPF</label>
                                    <input className="form-input" value={form.cpf} onChange={e => set('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} inputMode="numeric" />
                                </div>
                                <div>
                                    <label className="form-label">RG</label>
                                    <input className="form-input" value={form.rg} onChange={e => set('rg', e.target.value)} placeholder="00.000.000-0" />
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
                            <div>
                                <label className="form-label">Observações</label>
                                <textarea className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Informações adicionais..." rows={3} style={{ resize: 'vertical' }} />
                            </div>
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
    );
}

/* ── MAIN PAGE ─────────────────────────────────────── */
export default function FuncionariosPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterActive, setFilterActive] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [kpis, setKpis] = useState({ total: 0, active: 0, byRole: [] as any[], byDept: [] as any[] });
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (search) params.search = search;
            if (filterRole) params.role = filterRole;
            if (filterDept) params.department = filterDept;
            if (filterActive) params.active = filterActive;

            const res = await api.get('/employees', { params });
            const data = res.data;
            setEmployees(data.employees || []);
            setKpis({ total: data.total || 0, active: data.activeCount || 0, byRole: data.byRole || [], byDept: data.byDept || [] });
        } catch (e) {
            console.error('Failed to fetch employees:', e);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    }, [search, filterRole, filterDept, filterActive]);

    useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

    const handleEdit = (emp: Employee) => { setEditingEmployee(emp); setModalOpen(true); };

    const handleToggleActive = async (id: string) => {
        try { await api.patch(`/employees/${id}/toggle-active`); fetchEmployees(); } catch (e) { console.error(e); }
    };

    const handleDelete = async (id: string) => {
        try { await api.delete(`/employees/${id}`); setDeleteConfirm(null); fetchEmployees(); } catch (e) { console.error(e); }
    };

    const handleModalSave = () => { setModalOpen(false); setEditingEmployee(null); fetchEmployees(); };

    const topRole = kpis.byRole.sort((a, b) => b._count._all - a._count._all)[0];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">

            {/* ── HERO HEADER ── */}
            <div style={{
                position: 'relative', borderRadius: 24, overflow: 'hidden',
                background: 'linear-gradient(135deg, #0A0A0A 0%, #1C1C2E 50%, #0A0A0A 100%)',
                border: '1px solid rgba(255,214,0,0.2)', padding: '2rem 2.5rem',
                boxShadow: '0 0 60px rgba(255,214,0,0.05), inset 0 1px 0 rgba(255,255,255,0.05)',
                minHeight: 160,
            }}>
                <ParticleField />
                {/* Grid lines decoration */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,214,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,214,0,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <div style={{
                                width: 42, height: 42, borderRadius: 12,
                                background: 'linear-gradient(135deg, #FFD600, #B89B00)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.3rem', boxShadow: '0 0 20px rgba(255,214,0,0.4)',
                            }}>👥</div>
                            <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.8rem', letterSpacing: '0.1em', color: '#FFFFFF', textShadow: '0 0 30px rgba(255,214,0,0.4)', margin: 0 }}>
                                FUNCIONÁRIOS
                            </h1>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', margin: 0, letterSpacing: '0.08em' }}>
                            GESTÃO DE EQUIPE — SISTEMA UPGRADE
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => { setEditingEmployee(null); setModalOpen(true); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.7rem 1.4rem', borderRadius: 12, cursor: 'pointer',
                                background: 'linear-gradient(135deg, #FFD600, #B89B00)',
                                border: 'none', color: '#000', fontWeight: 800, fontSize: '0.85rem',
                                boxShadow: '0 4px 20px rgba(255,214,0,0.4)', letterSpacing: '0.04em',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(255,214,0,0.55)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(255,214,0,0.4)'; }}
                        >
                            <span style={{ fontSize: '1rem' }}>＋</span> Novo Funcionário
                        </button>
                    </div>
                </div>

                {/* KPI Strip */}
                <div style={{ position: 'relative', display: 'flex', gap: '1.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                    {[
                        { label: 'TOTAL', value: kpis.total, color: '#FFD600' },
                        { label: 'ATIVOS', value: kpis.active, color: '#00FF8A' },
                        { label: 'INATIVOS', value: kpis.total - kpis.active, color: '#FF2D55' },
                    ].map((k, i) => (
                        <div key={i} style={{
                            padding: '0.75rem 1.25rem', borderRadius: 14,
                            background: 'rgba(255,255,255,0.04)', border: `1px solid ${k.color}25`,
                            backdropFilter: 'blur(8px)',
                        }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: k.color, letterSpacing: '0.15em', marginBottom: '0.2rem' }}>{k.label}</div>
                            <AnimCounter value={k.value} color={k.color} />
                        </div>
                    ))}
                </div>
            </div>

            {/* ── ROLE KPI CARDS ── */}
            {kpis.byRole.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
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

            {/* ── FILTER BAR ── */}
            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                {/* Search */}
                <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nome, CPF, e-mail..."
                        className="form-input" style={{ paddingLeft: '2.1rem', fontSize: '0.82rem' }}
                    />
                </div>
                <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="form-input" style={{ width: 160, fontSize: '0.82rem' }}>
                    <option value="">Todos os cargos</option>
                    {ROLES.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="form-input" style={{ width: 160, fontSize: '0.82rem' }}>
                    <option value="">Todos os departamentos</option>
                    {DEPTS.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className="form-input" style={{ width: 130, fontSize: '0.82rem' }}>
                    <option value="">Todos os status</option>
                    <option value="true">✅ Ativos</option>
                    <option value="false">⏸ Inativos</option>
                </select>
                {/* View mode toggle */}
                <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    {(['grid', 'list'] as const).map(mode => (
                        <button key={mode} onClick={() => setViewMode(mode)}
                            style={{
                                padding: '0.5rem 0.7rem', border: 'none', cursor: 'pointer',
                                background: viewMode === mode ? '#FFD600' : 'transparent',
                                color: viewMode === mode ? '#000' : '#9CA3AF', fontSize: '0.8rem',
                                transition: 'all 0.2s', fontWeight: 600,
                            }}>
                            {mode === 'grid' ? '⊞' : '☰'}
                        </button>
                    ))}
                </div>
                {(search || filterRole || filterDept || filterActive) && (
                    <button onClick={() => { setSearch(''); setFilterRole(''); setFilterDept(''); setFilterActive(''); }}
                        className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', color: '#6B7280' }}>
                        ✕ Limpar
                    </button>
                )}
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
            ) : viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.1rem' }}>
                    {employees.map((emp, i) => (
                        <div key={emp.id} className="animate-scale-in" style={{ animationDelay: `${i * 50}ms` }}>
                            <EmployeeCard
                                emp={emp}
                                onEdit={() => handleEdit(emp)}
                                onToggle={() => handleToggleActive(emp.id)}
                                onDelete={() => setDeleteConfirm(emp.id)}
                                onDetails={() => setDetailEmployee(emp)}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                /* List mode */
                <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
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
                                                <button onClick={() => setDetailEmployee(emp)} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.25)', color: '#4F46E5', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}>🔍</button>
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

            {/* ── TOTAL BADGE ── */}
            {employees.length > 0 && (
                <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    Exibindo {employees.length} de {kpis.total} funcionários
                </div>
            )}

            {/* ── DETAIL PANEL ── */}
            {detailEmployee && (
                <EmployeeDetailModal
                    employee={detailEmployee}
                    onClose={() => setDetailEmployee(null)}
                    onEdit={() => { setEditingEmployee(detailEmployee); setModalOpen(true); }}
                />
            )}

            {/* ── MODAL ── */}
            {modalOpen && (
                <EmployeeModal
                    employee={editingEmployee}
                    onClose={() => { setModalOpen(false); setEditingEmployee(null); }}
                    onSave={handleModalSave}
                />
            )}

            {/* ── DELETE CONFIRM ── */}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
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
            )}
        </div>
    );
}
