'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// ─── Animated Particle Canvas ─────────────────────────────────────────────────
function ParticleCanvasInner() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        let W = canvas.width = window.innerWidth;
        let H = canvas.height = window.innerHeight;

        const onResize = () => {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', onResize);

        const count = 80;
        const particles = Array.from({ length: count }, () => ({
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * 1.8 + 0.3,
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.4,
            opacity: Math.random() * 0.5 + 0.1,
        }));

        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            for (const p of particles) {
                p.x += p.dx;
                p.y += p.dy;
                if (p.x < 0) p.x = W;
                if (p.x > W) p.x = 0;
                if (p.y < 0) p.y = H;
                if (p.y > H) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(251, 191, 36, ${p.opacity})`;
                ctx.fill();
            }

            // Draw connections
            for (let i = 0; i < count; i++) {
                for (let j = i + 1; j < count; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(251, 191, 36, ${0.08 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
        />
    );
}

/** Só monta o canvas no cliente — evita hidratação e não depende de `next/dynamic` (chunks webpack em dev). */
function ParticleCanvas() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    if (!mounted) {
        return (
            <div
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 0 }}
                aria-hidden
            />
        );
    }
    return <ParticleCanvasInner />;
}

// ─── Typewriter ───────────────────────────────────────────────────────────────
function TypeWriter({ words }: { words: string[] }) {
    const [idx, setIdx] = useState(0);
    const [text, setText] = useState('');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const current = words[idx];
        let timeout: ReturnType<typeof setTimeout>;

        if (!deleting && text === current) {
            timeout = setTimeout(() => setDeleting(true), 2000);
        } else if (deleting && text === '') {
            setDeleting(false);
            setIdx((i) => (i + 1) % words.length);
        } else {
            timeout = setTimeout(() => {
                setText(deleting ? text.slice(0, -1) : current.slice(0, text.length + 1));
            }, deleting ? 60 : 90);
        }
        return () => clearTimeout(timeout);
    }, [text, deleting, idx, words]);

    return (
        <span
            className="text-transparent bg-clip-text"
            style={{
                backgroundImage: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #EF4444 100%)',
                WebkitBackgroundClip: 'text',
            }}
        >
            {text}
            <span
                className="inline-block w-[3px] h-[0.85em] ml-1 align-middle animate-pulse"
                style={{ background: '#FBBF24', borderRadius: 2 }}
            />
        </span>
    );
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function Counter({ end, suffix = '', label }: { end: number; suffix?: string; label: string }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const started = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !started.current) {
                started.current = true;
                const duration = 2000;
                const steps = 60;
                const increment = end / steps;
                let current = 0;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= end) {
                        setCount(end);
                        clearInterval(timer);
                    } else {
                        setCount(Math.floor(current));
                    }
                }, duration / steps);
            }
        }, { threshold: 0.3 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end]);

    return (
        <div ref={ref} className="text-center group">
            <div
                className="text-5xl font-black mb-2 transition-transform duration-300 group-hover:scale-110"
                style={{ color: '#FBBF24', textShadow: '0 0 30px rgba(251,191,36,0.5)' }}
            >
                {count.toLocaleString('pt-BR')}{suffix}
            </div>
            <div className="text-gray-400 text-sm font-medium tracking-widest uppercase">{label}</div>
        </div>
    );
}

// ─── Glowing Card ─────────────────────────────────────────────────────────────
function GlowCard({ icon, title, desc, delay }: { icon: string; title: string; desc: string; delay: string }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative rounded-2xl p-6 cursor-default transition-all duration-500"
            style={{
                background: hovered
                    ? 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(0,0,0,0.6) 100%)'
                    : 'rgba(255,255,255,0.03)',
                border: hovered ? '1px solid rgba(251,191,36,0.5)' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: hovered ? '0 0 40px rgba(251,191,36,0.2), inset 0 0 40px rgba(251,191,36,0.05)' : 'none',
                transform: hovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
                animationDelay: delay,
            }}
        >
            <div
                className="text-4xl mb-4 transition-transform duration-300"
                style={{ transform: hovered ? 'scale(1.2) rotate(5deg)' : 'scale(1) rotate(0deg)' }}
            >
                {icon}
            </div>
            <h3 className="text-white text-xl font-bold mb-2">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
            {hovered && (
                <div
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-2xl"
                    style={{ background: 'linear-gradient(90deg, transparent, #FBBF24, transparent)', animation: 'shimmer 1s ease' }}
                />
            )}
        </div>
    );
}

// ─── Step Card ────────────────────────────────────────────────────────────────
function StepCard({ number, title, desc }: { number: string; title: string; desc: string }) {
    return (
        <div className="flex items-start gap-4 group">
            <div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-black text-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                style={{
                    background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                    boxShadow: '0 4px 20px rgba(251,191,36,0.4)',
                }}
            >
                {number}
            </div>
            <div>
                <h4 className="text-white font-semibold mb-1 group-hover:text-yellow-400 transition-colors duration-300">{title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
    const [scrollY, setScrollY] = useState(0);
    const [navBg, setNavBg] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
            setNavBg(window.scrollY > 60);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen" style={{ background: '#080808', color: '#fff', fontFamily: '"Inter", system-ui, sans-serif' }}>

            <style suppressHydrationWarning>{`
        @keyframes shimmer {
          0% { opacity: 0; transform: scaleX(0); }
          100% { opacity: 1; transform: scaleX(1); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-15px) rotate(1deg); }
          66% { transform: translateY(-8px) rotate(-1deg); }
        }

        @keyframes floatReverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(-1.5deg); }
          66% { transform: translateY(-20px) rotate(1.5deg); }
        }

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(251,191,36,0.3), 0 0 40px rgba(251,191,36,0.1); }
          50% { box-shadow: 0 0 40px rgba(251,191,36,0.6), 0 0 80px rgba(251,191,36,0.3); }
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes rotateRing {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes rotateRingReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-reverse { animation: floatReverse 8s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
        .animate-fade-up { animation: fadeUp 0.8s ease forwards; }
        .animate-fade-in { animation: fadeIn 1s ease forwards; }
        .animate-rotate-ring { animation: rotateRing 10s linear infinite; }
        .animate-rotate-ring-reverse { animation: rotateRingReverse 15s linear infinite; }

        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }

        .hero-gradient-text {
          background: linear-gradient(135deg, #fff 0%, #FBBF24 40%, #F59E0B 70%, #fff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 4s linear infinite;
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
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s;
        }
        .yellow-btn:hover::before { left: 100%; }
        .yellow-btn:hover { transform: scale(1.04); box-shadow: 0 0 40px rgba(251,191,36,0.6); }

        .ghost-btn {
          border: 1px solid rgba(251,191,36,0.4);
          color: #FBBF24;
          transition: all 0.3s;
          background: transparent;
        }
        .ghost-btn:hover {
          background: rgba(251,191,36,0.1);
          border-color: rgba(251,191,36,0.8);
          box-shadow: 0 0 30px rgba(251,191,36,0.2);
        }

        .grid-bg {
          background-image:
            linear-gradient(rgba(251,191,36,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(251,191,36,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .scanline-anim {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 0%, rgba(251,191,36,0.015) 50%, transparent 100%);
          height: 200px;
          animation: scanline 8s linear infinite;
          pointer-events: none;
        }

        .glass-card {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .section-reveal {
          opacity: 0;
          transform: translateY(40px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .section-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

            {/* ══════════════════ NAVBAR ══════════════════ */}
            <nav
                className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
                style={{
                    background: navBg ? 'rgba(8,8,8,0.95)' : 'transparent',
                    backdropFilter: navBg ? 'blur(20px)' : 'none',
                    borderBottom: navBg ? '1px solid rgba(251,191,36,0.1)' : 'none',
                }}
            >
                <style suppressHydrationWarning>{`
                    .nav-links-desktop { display: none; }
                    .nav-btn-cursos { display: none; }
                    .nav-hamburger { display: flex !important; }
                    @media (min-width: 768px) {
                        .nav-links-desktop { display: flex; align-items: center; gap: 32px; }
                        .nav-btn-cursos { display: inline-flex !important; }
                        .nav-hamburger { display: none !important; }
                        .nav-mobile-panel { display: none !important; }
                    }
                `}</style>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

                        {/* ── Logo: ícone U + UPGRADE ── */}
                        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
                            <div
                                className="animate-pulse-glow"
                                style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 900, color: '#000', fontSize: '1rem', flexShrink: 0,
                                }}
                            >
                                U
                            </div>
                            <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
                                UPGRADE
                            </span>
                        </Link>

                        {/* ── Nav Links (desktop only via CSS) ── */}
                        <div className="nav-links-desktop">
                            <Link href="/cursos" style={{ color: '#9CA3AF', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', letterSpacing: '0.04em' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#FBBF24')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}>
                                Cursos
                            </Link>
                            <a href="#sobre" style={{ color: '#9CA3AF', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', letterSpacing: '0.04em' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#FBBF24')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}>
                                Sobre
                            </a>
                            <Link href="/cursos" style={{ color: '#9CA3AF', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', letterSpacing: '0.04em' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#FBBF24')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}>
                                Inscrição
                            </Link>
                        </div>

                        {/* ── Botões CTA + Hambúrguer ── */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <Link
                                href="/login"
                                className="ghost-btn"
                                style={{ padding: '7px 16px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                            >
                                Entrar
                            </Link>
                            <Link
                                href="/cursos"
                                className="yellow-btn nav-btn-cursos"
                                style={{ padding: '7px 16px', borderRadius: 10, fontSize: '0.85rem', whiteSpace: 'nowrap', textDecoration: 'none' }}
                            >
                                Ver Cursos →
                            </Link>

                            {/* Hambúrguer — só mobile */}
                            <button
                                aria-label="Abrir menu"
                                className="nav-hamburger"
                                onClick={() => {
                                    const m = document.getElementById('nav-mobile-menu');
                                    if (m) m.style.display = m.style.display === 'none' ? 'flex' : 'none';
                                }}
                                style={{
                                    background: 'rgba(251,191,36,0.1)',
                                    border: '1px solid rgba(251,191,36,0.3)',
                                    borderRadius: 8, padding: '7px 9px',
                                    cursor: 'pointer',
                                    flexDirection: 'column', gap: 4,
                                    alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <span style={{ width: 16, height: 2, background: '#FBBF24', borderRadius: 2, display: 'block' }} />
                                <span style={{ width: 16, height: 2, background: '#FBBF24', borderRadius: 2, display: 'block' }} />
                                <span style={{ width: 16, height: 2, background: '#FBBF24', borderRadius: 2, display: 'block' }} />
                            </button>
                        </div>
                    </div>

                    {/* ── Painel Mobile ── */}
                    <div
                        id="nav-mobile-menu"
                        className="nav-mobile-panel"
                        style={{
                            display: 'none',
                            flexDirection: 'column',
                            gap: 2,
                            paddingBottom: 12,
                            borderTop: '1px solid rgba(251,191,36,0.15)',
                        }}
                    >
                        <Link href="/cursos" style={{ padding: '11px 6px', color: '#D1D5DB', fontSize: '0.92rem', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            📚 Cursos
                        </Link>
                        <a href="#sobre"
                            onClick={() => { const m = document.getElementById('nav-mobile-menu'); if (m) m.style.display = 'none'; }}
                            style={{ padding: '11px 6px', color: '#D1D5DB', fontSize: '0.92rem', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            ℹ️ Sobre
                        </a>
                        <Link href="/cursos" style={{ padding: '11px 6px', color: '#D1D5DB', fontSize: '0.92rem', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            📝 Inscrição
                        </Link>
                        <Link
                            href="/cursos"
                            className="yellow-btn"
                            style={{ marginTop: 10, padding: '12px 0', borderRadius: 12, fontSize: '0.92rem', textDecoration: 'none', textAlign: 'center', display: 'block' }}
                        >
                            🚀 Ver Cursos →
                        </Link>
                    </div>
                </div>
            </nav>


            {/* ══════════════════ HERO ══════════════════ */}
            <section
                className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden grid-bg"
                style={{ paddingTop: '80px' }}
            >
                <ParticleCanvas />
                <div className="scanline-anim" />

                {/* Glow Orbs */}
                <div
                    className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)',
                        filter: 'blur(40px)',
                        transform: `translate(${scrollY * 0.05}px, ${scrollY * -0.03}px)`,
                    }}
                />
                <div
                    className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)',
                        filter: 'blur(60px)',
                        transform: `translate(${scrollY * -0.04}px, ${scrollY * 0.02}px)`,
                    }}
                />

                {/* Rotating Rings */}
                <div className="absolute left-[5%] top-[20%] pointer-events-none animate-float opacity-20">
                    <div
                        className="w-40 h-40 rounded-full animate-rotate-ring"
                        style={{ border: '1px solid rgba(251,191,36,0.5)' }}
                    />
                    <div
                        className="absolute inset-4 rounded-full animate-rotate-ring-reverse"
                        style={{ border: '1px dashed rgba(251,191,36,0.3)' }}
                    />
                </div>
                <div className="absolute right-[5%] bottom-[25%] pointer-events-none animate-float-reverse opacity-20">
                    <div
                        className="w-24 h-24 rounded-full animate-rotate-ring-reverse"
                        style={{ border: '1px solid rgba(251,191,36,0.4)' }}
                    />
                </div>

                {/* Hero Content */}
                <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
                    {/* Badge */}
                    <div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8 animate-fade-up"
                        style={{
                            background: 'rgba(251,191,36,0.1)',
                            border: '1px solid rgba(251,191,36,0.3)',
                            color: '#FBBF24',
                            letterSpacing: '0.1em',
                        }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                        PLATAFORMA DE QUALIFICAÇÃO PROFISSIONAL
                    </div>

                    <h1
                        className="text-6xl sm:text-7xl lg:text-8xl font-black leading-none mb-4 animate-fade-up delay-100"
                        style={{ opacity: 0 }}
                    >
                        <span className="hero-gradient-text">UPGRADE</span>
                    </h1>

                    <div
                        className="text-2xl sm:text-3xl lg:text-4xl font-light text-gray-300 mb-6 animate-fade-up delay-200 min-h-[1.4em]"
                        style={{ opacity: 0 }}
                    >
                        Transforme-se em{' '}
                        <TypeWriter words={['Profissional', 'Especialista', 'Líder', 'Expert']} />
                    </div>

                    <p
                        className="text-gray-400 text-lg max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-up delay-300"
                        style={{ opacity: 0 }}
                    >
                        Capacitação profissional de alto nível, certificação reconhecida e acesso ao mercado de trabalho. O futuro começa agora.
                    </p>

                    <div
                        className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up delay-400"
                        style={{ opacity: 0 }}
                    >
                        <Link href="/cursos" className="yellow-btn px-8 py-4 rounded-2xl text-base flex items-center justify-center gap-2">
                            <span>🚀</span> Explorar Cursos
                        </Link>
                        <a href="#sobre" className="ghost-btn px-8 py-4 rounded-2xl text-base flex items-center justify-center gap-2">
                            <span>▶</span> Conheça o Programa
                        </a>
                    </div>

                    {/* Scroll Indicator */}
                    <div className="mt-20 flex flex-col items-center gap-2 animate-fade-up delay-600" style={{ opacity: 0 }}>
                        <span className="text-gray-600 text-xs tracking-widest uppercase">Scroll para explorar</span>
                        <div
                            className="w-6 h-10 rounded-full border border-gray-700 flex items-start justify-center p-1"
                        >
                            <div
                                className="w-1.5 h-3 rounded-full bg-yellow-400"
                                style={{ animation: 'float 1.5s ease-in-out infinite' }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ STATS ══════════════════ */}
            <section
                className="py-20"
                style={{ background: 'linear-gradient(180deg, #080808 0%, #0f0f0f 100%)' }}
            >
                <div className="max-w-6xl mx-auto px-6">
                    <div
                        className="rounded-3xl p-12 grid grid-cols-2 lg:grid-cols-4 gap-8"
                        style={{
                            background: 'linear-gradient(135deg, rgba(251,191,36,0.07) 0%, rgba(0,0,0,0.4) 100%)',
                            border: '1px solid rgba(251,191,36,0.15)',
                            boxShadow: '0 0 80px rgba(251,191,36,0.05)',
                        }}
                    >
                        <Counter end={5000} suffix="+" label="Alunos Formados" />
                        <Counter end={120} suffix="+" label="Turmas Ativas" />
                        <Counter end={30} suffix="+" label="Cursos Disponíveis" />
                        <Counter end={98} suffix="%" label="Taxa de Satisfação" />
                    </div>
                </div>
            </section>

            {/* ══════════════════ FEATURES ══════════════════ */}
            <section id="cursos" className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <p
                            className="text-xs font-bold tracking-widest uppercase mb-4"
                            style={{ color: '#FBBF24' }}
                        >
                            Por que nos escolher
                        </p>
                        <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
                            Diferenciais que{' '}
                            <span
                                className="text-transparent bg-clip-text"
                                style={{ backgroundImage: 'linear-gradient(135deg, #FBBF24, #EF4444)' }}
                            >
                                fazem a diferença
                            </span>
                        </h2>
                        <p className="text-gray-400 max-w-xl mx-auto">
                            Muito além de um curso — uma transformação completa de carreira com suporte total
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: '🎓', title: 'Certificação Real', desc: 'Certificados reconhecidos pelo mercado de trabalho nacional' },
                            { icon: '⚡', title: 'Inscrição Rápida', desc: 'Processo 100% online, simples e sem burocracia' },
                            { icon: '🏆', title: 'Alta Qualidade', desc: 'Instrutores especializados e metodologia comprovada' },
                            { icon: '🆓', title: 'Acesso Gratuito', desc: 'Sem custos de matrícula — educação acessível para todos' },
                            { icon: '📍', title: 'Unidades Móveis', desc: 'Carretas de capacitação chegam até a sua cidade' },
                            { icon: '🤝', title: 'Suporte Total', desc: 'Acompanhamento durante toda a jornada de aprendizado' },
                            { icon: '📊', title: 'Progresso Visível', desc: 'Dashboard personalizado para acompanhar sua evolução' },
                            { icon: '🌐', title: 'Múltiplas Áreas', desc: 'Tecnologia, gastronomia, saúde, negócios e muito mais' },
                        ].map((f, i) => (
                            <GlowCard key={i} icon={f.icon} title={f.title} desc={f.desc} delay={`${i * 0.05}s`} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ ABOUT ══════════════════ */}
            <section
                id="sobre"
                className="py-24 px-6"
                style={{ background: 'linear-gradient(180deg, #080808 0%, #0a0a0a 100%)' }}
            >
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        {/* Left */}
                        <div>
                            <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#FBBF24' }}>
                                Sobre o programa
                            </p>
                            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
                                Quem somos e o que{' '}
                                <span
                                    className="text-transparent bg-clip-text"
                                    style={{ backgroundImage: 'linear-gradient(135deg, #FBBF24, #F59E0B)' }}
                                >
                                    entregamos
                                </span>
                            </h2>
                            <div className="space-y-4 text-gray-400 leading-relaxed">
                                <p>
                                    A <strong className="text-white">Upgrade</strong> é uma empresa especializada em programas de qualificação profissional itinerante, levando educação e oportunidades até onde as pessoas estão — por meio de carretas e unidades móveis equipadas.
                                </p>
                                <p>
                                    Operamos programas de capacitação em parceria com governos estaduais, empresas e comunidades, garantindo formação prática, empregabilidade real e certificações de valor.
                                </p>
                                <p>
                                    Nossa missão é simples: <strong className="text-yellow-400">transformar vidas através da educação profissional.</strong>
                                </p>
                            </div>
                            <Link
                                href="/cursos"
                                className="yellow-btn inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm mt-8"
                            >
                                Ver Cursos Disponíveis →
                            </Link>
                        </div>

                        {/* Right — How it works */}
                        <div
                            className="rounded-3xl p-8 space-y-8"
                            style={{
                                background: 'linear-gradient(135deg, rgba(251,191,36,0.06), rgba(0,0,0,0.5))',
                                border: '1px solid rgba(251,191,36,0.15)',
                            }}
                        >
                            <h3
                                className="text-xl font-black tracking-wide uppercase"
                                style={{ color: '#FBBF24' }}
                            >
                                Como funciona?
                            </h3>
                            <div className="space-y-7">
                                <StepCard number="1" title="Escolha seu curso" desc="Explore os cursos disponíveis e find o que se encaixa no seu perfil e objetivos" />
                                <StepCard number="2" title="Faça sua inscrição" desc="Preencha o formulário online com seus dados em menos de 5 minutos" />
                                <StepCard number="3" title="Aguarde a aprovação" desc="Sua inscrição é analisada e você recebe confirmação por e-mail ou SMS" />
                                <StepCard number="4" title="Comece sua jornada" desc="Apareça nas aulas, aprenda na prática e conquiste sua certificação" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ CTA FINAL ══════════════════ */}
            <section id="inscricao" className="py-32 px-6 relative overflow-hidden">
                {/* BG glow */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.1) 0%, transparent 70%)',
                    }}
                />
                <div className="absolute inset-0 grid-bg opacity-50" />

                <div className="relative z-10 max-w-3xl mx-auto text-center">
                    <div
                        className="text-6xl mb-6 animate-float inline-block"
                    >
                        ⚡
                    </div>
                    <h2 className="text-4xl sm:text-6xl font-black text-white mb-4 leading-tight">
                        Pronto para fazer seu{' '}
                        <span
                            className="text-transparent bg-clip-text"
                            style={{ backgroundImage: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #EF4444 100%)' }}
                        >
                            UPGRADE
                        </span>
                        ?
                    </h2>
                    <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
                        Não deixe a oportunidade passar. Inscreva-se agora e dê o próximo passo na sua carreira profissional.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/cursos"
                            className="yellow-btn px-10 py-5 rounded-2xl text-lg animate-pulse-glow"
                        >
                            🚀 Inscrever-se Agora
                        </Link>
                        <Link
                            href="/login"
                            className="ghost-btn px-10 py-5 rounded-2xl text-lg"
                        >
                            Área do Aluno →
                        </Link>
                    </div>
                </div>
            </section>

            {/* ══════════════════ FOOTER ══════════════════ */}
            <footer
                className="py-10 px-6"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#050505' }}
            >
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <img
                            src="/logo-upgrade.png"
                            alt="Upgrade Tecnologia Educacional"
                            style={{ height: 40, width: 'auto', objectFit: 'contain', opacity: 0.85 }}
                        />
                    </div>
                    <p className="text-gray-600 text-sm">
                        © 2026 Upgrade — Qualificação Profissional. Todos os direitos reservados.
                    </p>
                    <div className="flex gap-6">
                        {['Privacidade', 'Termos', 'Contato'].map((l) => (
                            <a key={l} href="#" className="text-gray-600 text-sm hover:text-yellow-400 transition-colors">
                                {l}
                            </a>
                        ))}
                    </div>
                </div>
            </footer>

        </div>
    );
}
