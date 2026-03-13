'use client';

import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

export default function StudentHeader() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
    }, []);

    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        : 'AL';

    return (
        <header className="admin-topbar">
            {/* Title */}
            <div style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', fontWeight: 800, color: '#B89B00', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Portal do Aluno
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
                {/* Notifications */}
                <button style={{
                    position: 'relative', padding: '0.45rem', borderRadius: 8,
                    background: '#F9FAFB', border: '1px solid #E5E7EB',
                    cursor: 'pointer', display: 'flex', transition: 'all 0.2s',
                }}>
                    <BellIcon style={{ width: 16, height: 16, color: '#6B7280' }} />
                </button>

                <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>{user?.name || 'Aluno'}</div>
                        <div style={{ fontSize: '0.62rem', color: '#B89B00', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>ALUNO</div>
                    </div>
                    <div style={{
                        width: 34, height: 34, borderRadius: 9,
                        background: '#FFD600', color: '#000',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.65rem',
                        boxShadow: '0 2px 8px rgba(255,214,0,0.35)', cursor: 'pointer',
                    }}>
                        {initials}
                    </div>
                </div>
            </div>
        </header>
    );
}
