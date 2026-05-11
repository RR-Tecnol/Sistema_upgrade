'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api/client';
import dynamic from 'next/dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Course {
    id: string;
    name: string;
    description: string;
    workloadHours: number;
}

interface ClassData {
    id: string;
    startDate: string;
    endDate: string;
    vacancies: number;
    status: string;
    period: string;
    course: Course;
    city: { id: string; name: string; state: string };
    group: { id: string; name: string };
    _count: { enrollments: number };
    // Local físico (REQ-LOCAL-2026)
    locationName?: string | null;
    locationAddress?: string | null;
    locationReference?: string | null;
    locationLatitude?: number | null;
    locationLongitude?: number | null;
}

// ─── Mini Particle Background (client-only) ───────────────────────────────────
function MiniParticlesInner() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let animId: number;
        let W = canvas.width = window.innerWidth;
        let H = canvas.height = 320;
        const onResize = () => { W = canvas.width = window.innerWidth; };
        window.addEventListener('resize', onResize);
        const particles = Array.from({ length: 40 }, () => ({
            x: Math.random() * W, y: Math.random() * H,
            r: Math.random() * 1.5 + 0.2,
            dx: (Math.random() - 0.5) * 0.3, dy: (Math.random() - 0.5) * 0.3,
            o: Math.random() * 0.4 + 0.05,
        }));
        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            for (const p of particles) {
                p.x += p.dx; p.y += p.dy;
                if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
                if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(251,191,36,${p.o})`; ctx.fill();
            }
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); };
    }, []);
    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" style={{ zIndex: 0 }} />;
}
const MiniParticles = dynamic(() => Promise.resolve(MiniParticlesInner), { ssr: false });

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div
            className="rounded-2xl p-6 animate-pulse"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
            <div className="h-4 rounded mb-3" style={{ background: 'rgba(255,255,255,0.08)', width: '60%' }} />
            <div className="h-6 rounded mb-4" style={{ background: 'rgba(255,255,255,0.06)', width: '85%' }} />
            <div className="space-y-2 mb-4">
                <div className="h-3 rounded" style={{ background: 'rgba(255,255,255,0.05)', width: '70%' }} />
                <div className="h-3 rounded" style={{ background: 'rgba(255,255,255,0.05)', width: '55%' }} />
                <div className="h-3 rounded" style={{ background: 'rgba(255,255,255,0.05)', width: '65%' }} />
            </div>
            <div className="h-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
    );
}

// ─── Course Card ──────────────────────────────────────────────────────────────
function CourseCard({ classData, index }: { classData: ClassData; index: number }) {
    const [hovered, setHovered] = useState(false);
    const vacancies = classData.vacancies - classData._count.enrollments;
    const isFull = vacancies <= 0;
    const filled = Math.min((classData._count.enrollments / classData.vacancies) * 100, 100);

    const periodLabels: Record<string, { label: string; icon: string }> = {
        MORNING: { label: 'Manhã', icon: '🌅' },
        AFTERNOON: { label: 'Tarde', icon: '☀️' },
        EVENING: { label: 'Noite', icon: '🌙' },
    };
    const period = periodLabels[classData.period] || { label: classData.period, icon: '🕐' };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const courseEmojis: Record<string, string> = {
        'tecnologia': '💻', 'gastronomia': '🍳', 'saúde': '🏥', 'saude': '🏥',
        'negócios': '💼', 'negocios': '💼', 'artesanato': '🎨', 'moda': '👗',
        'beleza': '💅', 'construção': '🏗️', 'construcao': '🏗️', 'elétrica': '⚡',
        'eletrica': '⚡', 'mecânica': '🔧', 'mecanica': '🔧',
    };
    const courseEmoji = Object.entries(courseEmojis).find(([key]) =>
        classData.course.name.toLowerCase().includes(key)
    )?.[1] || '🎓';

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="rounded-2xl p-6 flex flex-col transition-all duration-500 cursor-default"
            style={{
                background: hovered
                    ? 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(0,0,0,0.7) 100%)'
                    : 'rgba(255,255,255,0.03)',
                border: hovered ? '1px solid rgba(251,191,36,0.45)' : '1px solid rgba(255,255,255,0.07)',
                boxShadow: hovered ? '0 0 40px rgba(251,191,36,0.15), inset 0 0 30px rgba(251,191,36,0.04)' : 'none',
                transform: hovered ? 'translateY(-6px) scale(1.01)' : 'scale(1)',
                animationDelay: `${index * 0.06}s`,
            }}
        >
            {/* Top: emoji + city badge */}
            <div className="flex items-start justify-between mb-4">
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform duration-300"
                    style={{
                        background: 'rgba(251,191,36,0.1)',
                        border: '1px solid rgba(251,191,36,0.2)',
                        transform: hovered ? 'scale(1.15) rotate(5deg)' : 'scale(1)',
                    }}
                >
                    {courseEmoji}
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.25)' }}
                    >
                        📍 {classData.city.name} — {classData.city.state}
                    </span>
                    <span
                        className="text-xs px-2.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#9CA3AF' }}
                    >
                        {period.icon} {period.label}
                    </span>
                </div>
            </div>

            {/* Course Name */}
            <h3
                className="text-lg font-black mb-1 leading-tight transition-colors duration-300"
                style={{ color: hovered ? '#FBBF24' : '#fff' }}
            >
                {classData.course.name}
            </h3>
            <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
                {classData.group.name}
            </p>

            {/* Info Row */}
            <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: '#9CA3AF' }}>
                <span>⏱ {classData.course.workloadHours}h</span>
                <span>📅 {formatDate(classData.startDate)}</span>
            </div>

            {/* Local físico — REQ-LOCAL-2026 */}
            {(classData.locationName || classData.locationAddress) && (
                <div
                    className="mb-4 px-3 py-2 rounded-lg"
                    style={{
                        background: 'rgba(251,191,36,0.06)',
                        border: '1px solid rgba(251,191,36,0.18)',
                    }}
                >
                    <div className="text-xs font-bold mb-0.5" style={{ color: '#FBBF24' }}>
                        📍 Local da turma
                    </div>
                    {classData.locationName && (
                        <div className="text-xs font-semibold" style={{ color: '#fff' }}>
                            {classData.locationName}
                        </div>
                    )}
                    {classData.locationAddress && (
                        <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                            {classData.locationAddress}
                        </div>
                    )}
                </div>
            )}

            {/* Vacancy Bar */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>Vagas</span>
                    <span
                        className="text-xs font-bold"
                        style={{ color: isFull ? '#EF4444' : '#22C55E' }}
                    >
                        {isFull ? 'Esgotadas' : `${vacancies} disponíveis`}
                    </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                            width: `${filled}%`,
                            background: isFull
                                ? 'linear-gradient(90deg, #DC2626, #EF4444)'
                                : `linear-gradient(90deg, #FBBF24, #F59E0B)`,
                            boxShadow: isFull ? '0 0 8px rgba(239,68,68,0.4)' : '0 0 8px rgba(251,191,36,0.4)',
                        }}
                    />
                </div>
            </div>

            {/* CTA */}
            <div className="mt-auto">
                {isFull ? (
                    <div
                        className="w-full py-3 rounded-xl text-center text-sm font-semibold"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                        🔒 Vagas Esgotadas
                    </div>
                ) : (
                    <a
                        href={`/inscricao/${classData.id}`}
                        className="w-full py-3 rounded-xl text-center text-sm font-black block transition-all duration-300"
                        style={{
                            background: hovered
                                ? 'linear-gradient(135deg, #FBBF24, #F59E0B)'
                                : 'rgba(251,191,36,0.12)',
                            color: hovered ? '#000' : '#FBBF24',
                            border: '1px solid rgba(251,191,36,0.3)',
                            boxShadow: hovered ? '0 0 25px rgba(251,191,36,0.4)' : 'none',
                        }}
                    >
                        {hovered ? '🚀 Inscrever-se Agora →' : 'Inscrever-se'}
                    </a>
                )}
            </div>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
    return (
        <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
            <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl mb-6"
                style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.15)' }}
            >
                {hasFilters ? '🔍' : '🎓'}
            </div>
            <h3 className="text-2xl font-black text-white mb-2">
                {hasFilters ? 'Nenhum resultado encontrado' : 'Nenhum curso disponível'}
            </h3>
            <p className="text-gray-500 max-w-md">
                {hasFilters
                    ? 'Tente ajustar os filtros para encontrar cursos disponíveis na sua região.'
                    : 'Em breve novos cursos estarão disponíveis. Fique de olho!'}
            </p>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CursosPublicPage() {
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [navBg, setNavBg] = useState(false);

    useEffect(() => {
        const handleScroll = () => setNavBg(window.scrollY > 40);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => { fetchClasses(); }, [stateFilter]);

    const fetchClasses = async () => {
        try {
            setLoading(true);
            const params: Record<string, string> = { status: 'ENROLLMENT_OPEN' };
            if (stateFilter) params.state = stateFilter;
            const response = await api.get('/classes/public', { params });
            setClasses(response.data);
        } catch (error) {
            /* silencioso — lista vazia exibida ao usuário */
        } finally {
            setLoading(false);
        }
    };

    const filteredClasses = classes.filter((c) => {
        const q = search.toLowerCase();
        if (!q && !cityFilter) return true;
        const matchSearch = !q || (
            c.course.name.toLowerCase().includes(q) ||
            c.city.name.toLowerCase().includes(q) ||
            c.group.name.toLowerCase().includes(q)
        );
        const matchCity = !cityFilter || c.city.name.toLowerCase().includes(cityFilter.toLowerCase());
        return matchSearch && matchCity;
    });

    const hasFilters = !!search || !!stateFilter || !!cityFilter;

    return (
        <div
            className="min-h-screen"
            style={{ background: '#080808', color: '#fff', fontFamily: '"Inter", system-ui, sans-serif' }}
        >
            <style suppressHydrationWarning>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes gradientShift {
                    0%   { background-position: 0% 50%; }
                    50%  { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes pulseGlow {
                    0%,100% { box-shadow: 0 0 20px rgba(251,191,36,0.3); }
                    50%     { box-shadow: 0 0 40px rgba(251,191,36,0.6); }
                }
                @keyframes shimmer {
                    0%   { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes float {
                    0%,100% { transform: translateY(0px); }
                    50%     { transform: translateY(-8px); }
                }

                .search-input:focus { outline: none; border-color: rgba(251,191,36,0.6) !important; box-shadow: 0 0 0 3px rgba(251,191,36,0.1); }
                .search-input::placeholder { color: #4B5563; }
                .select-dark { color-scheme: dark; }
                .select-dark option { background: #111; color: #fff; }

                .hero-gradient-text {
                    background: linear-gradient(135deg, #fff 0%, #FBBF24 40%, #F59E0B 70%, #fff 100%);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: gradientShift 4s linear infinite;
                }

                .grid-bg {
                    background-image:
                        linear-gradient(rgba(251,191,36,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(251,191,36,0.03) 1px, transparent 1px);
                    background-size: 60px 60px;
                }

                .card-appear {
                    opacity: 0;
                    animation: fadeUp 0.6s ease forwards;
                }

                .yellow-btn {
                    position: relative;
                    overflow: hidden;
                    background: linear-gradient(135deg, #FBBF24, #F59E0B);
                    color: #000;
                    font-weight: 800;
                    transition: all 0.3s;
                }
                .yellow-btn::before {
                    content: '';
                    position: absolute;
                    top: 0; left: -100%; width: 100%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    transition: left 0.5s;
                }
                .yellow-btn:hover::before { left: 100%; }
                .yellow-btn:hover { transform: scale(1.04); box-shadow: 0 0 30px rgba(251,191,36,0.5); }

                .ghost-btn {
                    border: 1px solid rgba(251,191,36,0.4);
                    color: #FBBF24;
                    transition: all 0.3s;
                    background: transparent;
                }
                .ghost-btn:hover {
                    background: rgba(251,191,36,0.1);
                    border-color: rgba(251,191,36,0.8);
                    box-shadow: 0 0 20px rgba(251,191,36,0.2);
                }

                .tag-btn {
                    border: 1px solid rgba(255,255,255,0.08);
                    color: #6B7280;
                    background: transparent;
                    transition: all 0.25s;
                    cursor: pointer;
                }
                .tag-btn:hover, .tag-btn.active {
                    border-color: rgba(251,191,36,0.5);
                    color: #FBBF24;
                    background: rgba(251,191,36,0.08);
                }
                .tag-btn.active { box-shadow: 0 0 12px rgba(251,191,36,0.2); }
            `}</style>

            {/* ══ NAVBAR ══ */}
            <nav
                className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
                style={{
                    background: navBg ? 'rgba(8,8,8,0.95)' : 'rgba(8,8,8,0.7)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: navBg ? '1px solid rgba(251,191,36,0.1)' : '1px solid rgba(255,255,255,0.04)',
                }}
            >
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-black text-sm"
                            style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', animation: 'pulseGlow 2s ease-in-out infinite' }}
                        >
                            U
                        </div>
                        <span className="text-white font-black text-lg tracking-tight">UPGRADE</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        {[['/', 'Início'], ['/cursos', 'Cursos'], ['/#sobre', 'Sobre']].map(([href, label]) => (
                            <Link
                                key={label}
                                href={href}
                                className="text-sm font-medium transition-colors duration-300 tracking-wide"
                                style={{ color: label === 'Cursos' ? '#FBBF24' : '#9CA3AF' }}
                            >
                                {label}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/login" className="ghost-btn px-4 py-2 rounded-xl text-sm font-semibold">
                            Entrar
                        </Link>
                        <Link href="/#inscricao" className="yellow-btn px-4 py-2 rounded-xl text-sm">
                            Inscrever-se →
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ══ HERO HEADER ══ */}
            <section
                className="relative overflow-hidden grid-bg"
                style={{ paddingTop: '80px', minHeight: '320px', display: 'flex', alignItems: 'center' }}
            >
                <MiniParticles />

                {/* Glow orb */}
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at top, rgba(251,191,36,0.08) 0%, transparent 70%)' }}
                />

                <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 w-full">
                    <div
                        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
                        style={{ animation: 'fadeUp 0.7s ease forwards' }}
                    >
                        <div>
                            <div
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4"
                                style={{
                                    background: 'rgba(251,191,36,0.1)',
                                    border: '1px solid rgba(251,191,36,0.25)',
                                    color: '#FBBF24',
                                    letterSpacing: '0.08em',
                                }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                                INSCRIÇÕES ABERTAS
                            </div>
                            <h1 className="text-5xl sm:text-6xl font-black leading-none mb-3">
                                <span className="hero-gradient-text">Cursos</span>{' '}
                                <span className="text-white">Disponíveis</span>
                            </h1>
                            <p className="text-gray-500 text-lg max-w-xl">
                                Qualificação profissional de alto nível — encontre o curso certo para acelerar sua carreira.
                            </p>
                        </div>

                        <div className="text-right hidden md:block">
                            <div className="text-4xl font-black" style={{ color: '#FBBF24' }}>
                                {loading ? '—' : filteredClasses.length}
                            </div>
                            <div className="text-gray-500 text-sm tracking-widest uppercase">
                                {filteredClasses.length === 1 ? 'turma encontrada' : 'turmas encontradas'}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ FILTERS ══ */}
            <div className="sticky top-[65px] z-40" style={{ background: 'rgba(8,8,8,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar por curso, cidade ou grupo..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="search-input w-full pl-11 pr-4 py-3 rounded-xl text-white text-sm"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                }}
                            />
                        </div>

                        {/* State Tabs */}
                        <div className="flex items-center gap-2">
                            {[['', 'Todos'], ['MA', 'Maranhão'], ['PI', 'Piauí']].map(([val, label]) => (
                                <button
                                    key={val}
                                    onClick={() => setStateFilter(val)}
                                    className={`tag-btn px-4 py-3 rounded-xl text-sm font-semibold ${stateFilter === val ? 'active' : ''}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* City */}
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">📍</span>
                            <input
                                type="text"
                                placeholder="Cidade..."
                                value={cityFilter}
                                onChange={(e) => setCityFilter(e.target.value)}
                                className="search-input pl-10 pr-4 py-3 rounded-xl text-white text-sm w-44"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                }}
                            />
                        </div>

                        {/* Clear */}
                        {hasFilters && (
                            <button
                                onClick={() => { setSearch(''); setStateFilter(''); setCityFilter(''); }}
                                className="ghost-btn px-4 py-3 rounded-xl text-sm whitespace-nowrap"
                            >
                                ✕ Limpar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ GRID ══ */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredClasses.length === 0
                            ? <EmptyState hasFilters={hasFilters} />
                            : filteredClasses.map((classData, i) => (
                                <div
                                    key={classData.id}
                                    className="card-appear"
                                    style={{ animationDelay: `${i * 0.05}s` }}
                                >
                                    <CourseCard classData={classData} index={i} />
                                </div>
                            ))
                        }
                    </div>
                )}
            </main>

            {/* ══ FOOTER ══ */}
            <footer
                className="py-8 px-6 mt-12"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#050505' }}
            >
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-black text-xs"
                            style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)' }}
                        >
                            U
                        </div>
                        <span className="text-white font-bold text-sm">UPGRADE</span>
                    </div>
                    <p className="text-gray-600 text-xs">
                        © 2026 Upgrade — Qualificação Profissional. Todos os direitos reservados.
                    </p>
                    <Link href="/" className="text-gray-600 text-xs hover:text-yellow-400 transition-colors">
                        ← Voltar ao início
                    </Link>
                </div>
            </footer>
        </div>
    );
}
