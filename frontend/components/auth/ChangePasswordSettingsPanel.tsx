'use client';

import { useState, type CSSProperties } from 'react';
import api from '@/lib/api/client';

const BLACK = '#0F172A';

export default function ChangePasswordSettingsPanel() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    const submit = async () => {
        setMsg(null);
        if (newPassword.length < 6) {
            setMsg({ type: 'err', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setMsg({ type: 'err', text: 'A nova senha e a confirmação não coincidem.' });
            return;
        }
        setLoading(true);
        try {
            await api.patch('/users/me/password', { currentPassword, newPassword });
            setMsg({ type: 'ok', text: 'Senha alterada com sucesso.' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (e: any) {
            const m = e?.response?.data?.message;
            setMsg({
                type: 'err',
                text: Array.isArray(m) ? m.join(' ') : (m || 'Não foi possível alterar a senha. Verifique a senha atual.'),
            });
        } finally {
            setLoading(false);
        }
    };

    const inputStyle: CSSProperties = {
        width: '100%',
        maxWidth: 320,
        boxSizing: 'border-box',
        padding: '0.65rem 0.85rem',
        borderRadius: 10,
        border: '2px solid #E5E7EB',
        background: '#fff',
        fontSize: '0.88rem',
        color: BLACK,
        outline: 'none',
    };

    return (
        <div style={{ width: '100%', maxWidth: 360 }}>
            <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '0 0 1rem', lineHeight: 1.45 }}>
                Use uma senha forte e diferente da anterior. A alteração é imediata em todos os dispositivos.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                        Senha atual
                    </label>
                    <input
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                        Nova senha
                    </label>
                    <input
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                        Confirmar nova senha
                    </label>
                    <input
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        style={inputStyle}
                    />
                </div>
            </div>
            {msg && (
                <div
                    style={{
                        marginTop: '0.85rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 10,
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        border: msg.type === 'ok' ? '1px solid #BBF7D0' : '1px solid #FECACA',
                        background: msg.type === 'ok' ? '#F0FDF4' : '#FEF2F2',
                        color: msg.type === 'ok' ? '#166534' : '#B91C1C',
                    }}
                >
                    {msg.text}
                </div>
            )}
            <button
                type="button"
                onClick={submit}
                disabled={loading || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                className="btn-primary"
                style={{
                    marginTop: '1rem',
                    width: '100%',
                    maxWidth: 320,
                    justifyContent: 'center',
                    opacity: loading || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword ? 0.55 : 1,
                    cursor: loading || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword ? 'not-allowed' : 'pointer',
                    border: `2px solid ${BLACK}`,
                    boxShadow: '0 4px 14px rgba(255, 214, 0, 0.35)',
                }}
            >
                {loading ? 'A atualizar…' : 'Atualizar senha'}
            </button>
        </div>
    );
}
