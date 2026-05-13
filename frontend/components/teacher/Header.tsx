'use client';

import { Bars3Icon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import NotificationBell from '@/components/ui/NotificationBell';
import { useAuthStore } from '@/stores/useAuthStore';

interface Props {
    onMenuToggle?: () => void;
}

export default function TeacherHeader({ onMenuToggle }: Props) {
    const { user } = useAuthStore();
    const [date, setDate] = useState('');

    useEffect(() => {
        const now = new Date();
        setDate(now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
    }, []);

    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        : 'PR';

    return (
        <header className="admin-topbar">
            <button onClick={onMenuToggle} className="hamburger-btn" aria-label="Abrir menu">
                <Bars3Icon style={{ width: 20, height: 20, color: '#6B7280' }} />
            </button>

            <div style={{ flex: 1, fontSize: '0.78rem', color: '#6B7280', fontWeight: 500, textTransform: 'capitalize' }}>
                {date}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <NotificationBell />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, textAlign: 'right' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>{user?.name?.split(' ')[0] || 'Professor'}</span>
                        <span style={{ fontSize: '0.62rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Professor</span>
                    </div>
                    <div style={{
                        width: 34, height: 34, borderRadius: 10, background: '#FFD600',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.65rem', color: '#000',
                        boxShadow: '0 2px 8px rgba(255,214,0,0.35)',
                    }}>
                        {initials}
                    </div>
                </div>
            </div>
        </header>
    );
}
