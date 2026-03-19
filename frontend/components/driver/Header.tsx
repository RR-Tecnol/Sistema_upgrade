'use client';

import { ChevronDownIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import NotificationBell from '@/components/ui/NotificationBell';

interface Props {
    onMenuToggle?: () => void;
}

export default function DriverHeader({ onMenuToggle }: Props) {
    const [user, setUser] = useState<any>(null);
    const [date, setDate] = useState('');

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
        const now = new Date();
        setDate(now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
    }, []);

    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        : 'MT';

    return (
        <header className="admin-topbar">
            {/* Hamburger button */}
            <button
                onClick={onMenuToggle}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 9, marginRight: '0.75rem',
                    border: '1px solid rgba(0,0,0,0.1)', background: 'transparent',
                    cursor: 'pointer', flexShrink: 0, transition: 'all 0.18s',
                }}
                aria-label="Abrir menu"
            >
                <Bars3Icon style={{ width: 18, height: 18, color: '#6B7280' }} />
            </button>

            {/* Date */}
            <div style={{ flex: 1, fontSize: '0.78rem', color: '#6B7280', fontWeight: 500, textTransform: 'capitalize' }}>
                {date}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <NotificationBell />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: '#FFD600',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.65rem', color: '#000',
                    }}>
                        {initials}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>{user?.name?.split(' ')[0] || 'Motorista'}</span>
                        <span style={{ fontSize: '0.62rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Motorista</span>
                    </div>
                    <ChevronDownIcon style={{ width: 14, height: 14, color: '#9CA3AF' }} />
                </div>
            </div>
        </header>
    );
}
