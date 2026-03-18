'use client';

import { ReactNode, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    HomeIcon, MapIcon, BanknotesIcon, TruckIcon,
    ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon,
} from '@heroicons/react/24/outline';

/* ─────────────────────────────────────────────
   CONSTANTES — alterar aqui reflete em todo o layout
   ───────────────────────────────────────────── */
const SIDEBAR_W = 240;   // largura da sidebar em px
const PUSH_BP   = 1100;  // acima disso, sidebar entra em push mode (empurra o conteúdo)

const NAV = [
    { label: 'Dashboard',  href: '/driver/dashboard',  Icon: HomeIcon },
    { label: 'Viagens',    href: '/driver/viagens',    Icon: MapIcon },
    { label: 'Reembolsos', href: '/driver/reembolsos', Icon: BanknotesIcon },
    { label: 'Veículo',    href: '/driver/veiculo',    Icon: TruckIcon },
];

/* ─────────────────────────────────────────────
   CSS GLOBAL DO PORTAL — separado do JSX para
   não corromper a árvore de componentes
   ───────────────────────────────────────────── */
const PORTAL_CSS = `
    @keyframes drv-spin { to { transform: rotate(360deg); } }

    /*
     * ARQUITETURA DE LAYOUT
     * ─────────────────────────────────────────
     * Shell: position fixed; inset: 0
     *   Cobre exatamente o viewport — de pixel 0 a pixel N
     *   em qualquer resolução, sem cálculos JS.
     *
     * Sidebar: position fixed; width: 240px; height: 100%
     *   Visibilidade via transform (nunca width:0 que
     *   oculta o conteúdo interno via overflow:hidden).
     *
     * Conteúdo: position fixed; inset: 0; left: var(--drv-left)
     *   --drv-left transiciona entre 0px e 240px conforme
     *   a sidebar abre/fecha em push mode.
     *   Em overlay mode permanece em 0px (sidebar flutua sobre).
     *   O conteúdo SEMPRE preenche da esquerda até a borda direita
     *   independente do tamanho do viewport.
     */

    .drv-shell {
        position: fixed;
        inset: 0;               /* cobre 100% do viewport garantido */
        background: #0F172A;
        font-family: Inter, sans-serif;
        overflow: hidden;
    }

    /* Sidebar: sempre 240px, visibilidade via transform */
    .drv-sidebar {
        position: fixed;
        top: 0;
        left: 0;
        width: 240px;
        height: 100%;
        z-index: 30;
        background: linear-gradient(180deg, #1E293B 0%, #0F172A 100%);
        border-right: 1px solid rgba(8,145,178,.15);
        display: flex;
        flex-direction: column;
        transition: transform .28s cubic-bezier(.4,0,.2,1);
        /* overflow: visible — nunca hidden, senão oculta o conteúdo interno */
        overflow: visible;
    }
    .drv-sidebar.closed { transform: translateX(-240px); }
    .drv-sidebar.open   { transform: translateX(0); }

    /* Conteúdo principal: preenche o espaço à direita da sidebar */
    .drv-content {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: var(--drv-left, 0px); /* transiciona com a sidebar em push mode */
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: left .28s cubic-bezier(.4,0,.2,1);
    }

    /* Header: altura fixa, não encolhe */
    .drv-header {
        height: 60px;
        flex-shrink: 0;
        background: #1E293B;
        border-bottom: 1px solid rgba(255,255,255,.06);
        display: flex;
        align-items: center;
        padding: 0 1rem;
        gap: .75rem;
    }

    /* Main: scroll vertical, sem scroll horizontal */
    .drv-main {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 1.25rem;
    }

    /* Overlay escuro para modo overlay (mobile/tablet) */
    .drv-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.55);
        backdrop-filter: blur(2px);
        z-index: 25;
    }

    /* Botão hamburger */
    .drv-hamburger {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 8px;
        cursor: pointer;
        flex-shrink: 0;
        transition: all .18s;
        background: transparent;
        border: 1px solid rgba(255,255,255,.1);
    }
    .drv-hamburger.open {
        border-color: rgba(8,145,178,.4);
        background: rgba(8,145,178,.1);
    }

    /* Links da navegação */
    .drv-nav-link {
        display: flex;
        align-items: center;
        gap: .65rem;
        padding: .65rem .75rem;
        border-radius: 8px;
        margin-bottom: 2px;
        text-decoration: none;
        font-size: .85rem;
        font-weight: 400;
        color: #94A3B8;
        cursor: pointer;
        white-space: nowrap;
        border-left: 2px solid transparent;
        transition: background .18s, color .18s, border-color .18s;
    }
    .drv-nav-link:hover  { background: rgba(8,145,178,.08); color: #CBD5E1; }
    .drv-nav-link.active {
        background: rgba(8,145,178,.15);
        color: #0891B2;
        font-weight: 600;
        border-left-color: #0891B2;
    }

    /* Scrollbar discreta na navegação */
    .drv-nav::-webkit-scrollbar       { width: 3px; }
    .drv-nav::-webkit-scrollbar-track { background: transparent; }
    .drv-nav::-webkit-scrollbar-thumb { background: rgba(8,145,178,.3); border-radius: 2px; }

    /* Botão Sair */
    .drv-logout {
        display: flex;
        align-items: center;
        gap: .65rem;
        width: 100%;
        padding: .65rem .75rem;
        border-radius: 8px;
        background: transparent;
        border: none;
        cursor: pointer;
        color: #EF4444;
        font-size: .85rem;
        font-weight: 500;
        transition: background .18s;
    }
    .drv-logout:hover { background: rgba(239,68,68,.08); }
`;

export default function DriverLayout({ children }: { children: ReactNode }) {
    const router   = useRouter();
    const pathname = usePathname();

    const [ready,    setReady]    = useState(false);
    const [name,     setName]     = useState('Motorista');
    const [open,     setOpen]     = useState(false);
    const [pushMode, setPushMode] = useState(false);

    /* Detecta o tamanho real da janela e ajusta o modo */
    const sync = useCallback(() => {
        if (typeof window === 'undefined') return;
        const wide = window.innerWidth >= PUSH_BP;
        setPushMode(wide);
        setOpen(wide); // desktop → abre; abaixo → fecha ao redimensionar
    }, []);

    useEffect(() => {
        sync();
        window.addEventListener('resize', sync);
        return () => window.removeEventListener('resize', sync);
    }, [sync]);

    /* Auth */
    useEffect(() => {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) { router.replace('/login'); return; }
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user?.role && user.role !== 'DRIVER') { router.replace('/login'); return; }
        if (user?.name) setName(user.name);
        setReady(true);
    }, [router]);

    function logout() {
        ['token', 'access_token', 'user'].forEach(k => localStorage.removeItem(k));
        router.replace('/login');
    }

    /* Em push mode: conteúdo começa na borda direita da sidebar */
    const contentLeft = pushMode && open ? SIDEBAR_W : 0;

    if (!ready) return (
        <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center',
                      justifyContent:'center', background:'#0F172A' }}>
            <style>{`@keyframes drv-spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ textAlign:'center' }}>
                <div style={{ width:40, height:40, border:'3px solid #0891B2',
                              borderTopColor:'transparent', borderRadius:'50%',
                              animation:'drv-spin .75s linear infinite', margin:'0 auto 1rem' }} />
                <p style={{ color:'#9CA3AF', fontSize:'.8rem', fontFamily:'Orbitron,sans-serif',
                            letterSpacing:'.1em', margin:0 }}>VERIFICANDO ACESSO...</p>
            </div>
        </div>
    );

    return (
        <>
        <style>{PORTAL_CSS}</style>
        <div
            className="drv-shell"
            style={{ '--drv-left': `${contentLeft}px` } as React.CSSProperties}
        >
            {/* Overlay escuro — apenas no modo overlay (mobile/tablet) */}
            {open && !pushMode && (
                <div className="drv-overlay" onClick={() => setOpen(false)} />
            )}

            {/* ══════════ SIDEBAR ══════════ */}
            <aside className={`drv-sidebar ${open ? 'open' : 'closed'}`}>

                {/* Logo */}
                <div style={{ padding:'1.5rem 1.25rem',
                              borderBottom:'1px solid rgba(8,145,178,.12)', flexShrink:0 }}>
                    <div style={{ fontFamily:'Orbitron,sans-serif', fontSize:'1rem',
                                  fontWeight:700, color:'#0891B2', letterSpacing:'.08em' }}>
                        UPGRADE
                    </div>
                    <div style={{ fontSize:'.68rem', color:'#64748B', marginTop:2,
                                  letterSpacing:'.12em', textTransform:'uppercase' }}>
                        Portal do Motorista
                    </div>
                </div>

                {/* Avatar e nome */}
                <div style={{ padding:'1rem 1.25rem',
                              borderBottom:'1px solid rgba(255,255,255,.04)', flexShrink:0 }}>
                    <div style={{
                        width:36, height:36, borderRadius:'50%',
                        background:'linear-gradient(135deg,#0891B2,#0369A1)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontWeight:700, color:'#fff', marginBottom:'.5rem', fontSize:'1rem',
                    }}>
                        {name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontSize:'.82rem', fontWeight:600, color:'#F1F5F9',
                                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {name}
                    </div>
                    <div style={{ fontSize:'.7rem', color:'#64748B' }}>🚛 Motorista</div>
                </div>

                {/* Navegação */}
                <nav className="drv-nav" style={{ flex:1, padding:'.75rem', overflowY:'auto' }}>
                    {NAV.map(({ label, href, Icon }) => {
                        const active = !!pathname?.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`drv-nav-link${active ? ' active' : ''}`}
                                onClick={() => { if (!pushMode) setOpen(false); }}
                            >
                                <Icon style={{ width:18, height:18, flexShrink:0 }} />
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Botão Sair — dentro da sidebar */}
                <div style={{ padding:'.75rem', flexShrink:0,
                              borderTop:'1px solid rgba(255,255,255,.04)' }}>
                    <button className="drv-logout" onClick={logout}>
                        <ArrowRightOnRectangleIcon style={{ width:18, height:18, flexShrink:0 }} />
                        Sair
                    </button>
                </div>
            </aside>

            {/* ══════════ CONTEÚDO ══════════
             * left transiciona via --drv-left no shell.
             * Sempre preenche da esquerda até a borda direita.
             */}
            <div className="drv-content">

                {/* Header */}
                <header className="drv-header">
                    <button
                        className={`drv-hamburger${open ? ' open' : ''}`}
                        onClick={() => setOpen(o => !o)}
                        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
                    >
                        {open
                            ? <XMarkIcon  style={{ width:18, height:18, color:'#0891B2' }} />
                            : <Bars3Icon  style={{ width:18, height:18, color:'#94A3B8' }} />
                        }
                    </button>

                    <div style={{ flex:1, fontSize:'.85rem', color:'#94A3B8',
                                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        Bem-vindo(a),{' '}
                        <span style={{ color:'#0891B2', fontWeight:700 }}>{name}</span>
                    </div>

                    <div style={{ fontSize:'.72rem', color:'#64748B', flexShrink:0, whiteSpace:'nowrap' }}>
                        {new Date().toLocaleDateString('pt-BR',
                            { weekday:'short', day:'2-digit', month:'short' })}
                    </div>
                </header>

                {/* Página */}
                <main className="drv-main">
                    {children}
                </main>
            </div>
        </div>
        </>
    );
}
