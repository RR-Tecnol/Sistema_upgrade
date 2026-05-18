'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Painel de Gerenciamento do WhatsApp — /admin/configuracoes/whatsapp
 *
 * Exibido dentro da página de configurações. O ADM escaneia o QR Code
 * diretamente nesta tela sem precisar acessar o painel Z-API.
 */

interface WhatsAppStatus {
    connected: boolean;
    phone?: string;
    connectedSince?: string;
    error?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function fetchApi(path: string, options?: RequestInit) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    const res = await fetch(`${API_BASE}/${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(options?.headers || {}),
        },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export default function WhatsAppConfigPage() {
    const [status, setStatus] = useState<WhatsAppStatus | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [qrLoading, setQrLoading] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const qrIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // ── Busca o status de conexão ─────────────────────────────────────────────
    const fetchStatus = useCallback(async () => {
        try {
            const data: WhatsAppStatus = await fetchApi('admin/whatsapp/status');
            setStatus(data);
            setLastRefresh(new Date());
            return data.connected;
        } catch {
            setStatus({ connected: false, error: 'Não foi possível verificar o status' });
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Busca o QR Code ───────────────────────────────────────────────────────
    const fetchQrCode = useCallback(async () => {
        setQrLoading(true);
        try {
            const data = await fetchApi('admin/whatsapp/qrcode');
            setQrCode(data?.qrcode || null);
        } catch {
            setQrCode(null);
        } finally {
            setQrLoading(false);
        }
    }, []);

    // ── Inicializa polling ────────────────────────────────────────────────────
    useEffect(() => {
        fetchStatus().then(connected => {
            if (!connected) fetchQrCode();
        });

        // Status a cada 5s
        statusIntervalRef.current = setInterval(async () => {
            const connected = await fetchStatus();
            if (connected) {
                // Parar polling do QR se conectou
                if (qrIntervalRef.current) {
                    clearInterval(qrIntervalRef.current);
                    qrIntervalRef.current = null;
                }
                setQrCode(null);
            }
        }, 5000);

        return () => {
            if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
            if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
        };
    }, [fetchStatus, fetchQrCode]);

    // ── Quando desconectado, polling do QR a cada 28s ─────────────────────────
    useEffect(() => {
        if (status && !status.connected) {
            if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
            qrIntervalRef.current = setInterval(fetchQrCode, 28000);
        } else {
            if (qrIntervalRef.current) {
                clearInterval(qrIntervalRef.current);
                qrIntervalRef.current = null;
            }
        }
        return () => {
            if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
        };
    }, [status?.connected, fetchQrCode]);

    // ── Desconectar ───────────────────────────────────────────────────────────
    const handleDisconnect = async () => {
        if (!confirm('Tem certeza? O WhatsApp será desconectado e os disparos automáticos serão pausados.')) return;
        setDisconnecting(true);
        try {
            await fetchApi('admin/whatsapp/disconnect', { method: 'DELETE' });
            setStatus({ connected: false });
            fetchQrCode();
        } catch {
            alert('Erro ao desconectar. Tente novamente.');
        } finally {
            setDisconnecting(false);
        }
    };

    const formatPhone = (phone?: string) => {
        if (!phone) return '';
        const d = phone.replace(/\D/g, '');
        if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
        return phone;
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div style={styles.card}>
                <div style={styles.headerRow}>
                    <span style={{ fontSize: 24 }}>📱</span>
                    <h2 style={styles.title}>WhatsApp</h2>
                </div>
                <div style={styles.loadingBox}>
                    <div style={styles.spinner} />
                    <span style={{ color: '#6B7280', fontSize: 14 }}>Verificando conexão...</span>
                </div>
            </div>
        );
    }

    const connected = status?.connected ?? false;

    return (
        <div style={styles.card}>
            {/* Header */}
            <div style={styles.headerRow}>
                <span style={{ fontSize: 24 }}>📱</span>
                <div>
                    <h2 style={styles.title}>WhatsApp</h2>
                    <p style={styles.subtitle}>Notificações automáticas para alunos e funcionários</p>
                </div>
            </div>

            {/* Status Badge */}
            <div style={{
                ...styles.statusBadge,
                background: connected ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${connected ? '#BBF7D0' : '#FECACA'}`,
            }}>
                <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: connected ? '#16a34a' : '#DC2626',
                    display: 'inline-block',
                    boxShadow: connected ? '0 0 0 3px rgba(22,163,74,0.15)' : 'none',
                    animation: connected ? 'pulse 2s infinite' : 'none',
                }} />
                <span style={{
                    fontWeight: 700, fontSize: 14,
                    color: connected ? '#15803D' : '#DC2626',
                }}>
                    {connected ? 'Conectado' : 'Desconectado'}
                </span>
                {connected && status?.phone && (
                    <span style={{ fontSize: 13, color: '#4B5563', marginLeft: 8 }}>
                        — {formatPhone(status.phone)}
                    </span>
                )}
                {lastRefresh && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9CA3AF' }}>
                        Atualizado às {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                )}
            </div>

            {/* Erro de configuração */}
            {status?.error && (
                <div style={styles.errorBox}>
                    <strong>⚠️ Atenção:</strong> {status.error}
                </div>
            )}

            {/* Estado CONECTADO */}
            {connected && (
                <div style={styles.connectedBox}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 32 }}>✅</span>
                            <div>
                                <p style={{ margin: 0, fontWeight: 700, color: '#111827' }}>
                                    WhatsApp conectado com sucesso!
                                </p>
                                <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
                                    Todos os disparos automáticos estão ativos.
                                </p>
                            </div>
                        </div>

                        <div style={styles.notifList}>
                            <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 13, color: '#374151' }}>
                                Notificações ativas:
                            </p>
                            {[
                                '✅ Inscrição recebida / aprovada / rejeitada',
                                '🏆 Certificado disponível',
                                '🎁 Convite de feedback pós-curso',
                                '💰 Aprovação de reembolso',
                                '⚠️ Resultado de revisão de imprevisto',
                            ].map(item => (
                                <div key={item} style={{ fontSize: 13, color: '#374151', padding: '3px 0' }}>
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        style={styles.disconnectBtn}
                    >
                        {disconnecting ? '⏳ Desconectando...' : '🔌 Desconectar'}
                    </button>
                </div>
            )}

            {/* Estado DESCONECTADO — QR Code */}
            {!connected && (
                <div style={styles.qrBox}>
                    <p style={{ margin: '0 0 16px', fontWeight: 600, color: '#374151', textAlign: 'center' }}>
                        Escaneie o QR Code para conectar
                    </p>

                    {/* QR Code */}
                    <div style={styles.qrFrame}>
                        {qrLoading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <div style={styles.spinner} />
                                <span style={{ fontSize: 12, color: '#9CA3AF' }}>Gerando QR Code...</span>
                            </div>
                        ) : qrCode ? (
                            <img
                                src={qrCode}
                                alt="QR Code WhatsApp"
                                style={{ width: 200, height: 200, objectFit: 'contain' }}
                            />
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 40, marginBottom: 8 }}>❌</div>
                                <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>
                                    QR Code indisponível
                                </p>
                                <p style={{ color: '#9CA3AF', fontSize: 12, margin: '4px 0 0' }}>
                                    Verifique as configurações Z-API no servidor
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Instruções */}
                    <div style={styles.instructionBox}>
                        <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 13, color: '#374151' }}>
                            Como conectar:
                        </p>
                        {[
                            '1. Abra o WhatsApp no celular',
                            '2. Toque em ⋮ (menu) → Dispositivos vinculados',
                            '3. Toque em "Vincular dispositivo"',
                            '4. Escaneie o QR Code acima',
                        ].map(step => (
                            <p key={step} style={{ margin: '3px 0', fontSize: 13, color: '#6B7280' }}>{step}</p>
                        ))}
                    </div>

                    {/* Botão atualizar QR */}
                    <button
                        onClick={fetchQrCode}
                        disabled={qrLoading}
                        style={styles.refreshBtn}
                    >
                        {qrLoading ? '⏳ Atualizando...' : '🔄 Atualizar QR Code'}
                    </button>

                    <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
                        O QR Code é atualizado automaticamente a cada 28 segundos
                    </p>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(22,163,74,0.4); }
                    70% { box-shadow: 0 0 0 8px rgba(22,163,74,0); }
                    100% { box-shadow: 0 0 0 0 rgba(22,163,74,0); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    card: {
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #E5E7EB',
        padding: 24,
        maxWidth: 520,
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
    },
    headerRow: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 16,
    },
    title: {
        margin: 0,
        fontSize: 18,
        fontWeight: 700,
        color: '#111827',
    },
    subtitle: {
        margin: '2px 0 0',
        fontSize: 13,
        color: '#6B7280',
    },
    statusBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 8,
        marginBottom: 16,
    },
    loadingBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: '32px 0',
    },
    spinner: {
        width: 28,
        height: 28,
        border: '3px solid #E5E7EB',
        borderTop: '3px solid #FFD600',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    errorBox: {
        background: '#FEF3C7',
        border: '1px solid #FDE68A',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
        color: '#92400E',
        marginBottom: 16,
    },
    connectedBox: {
        background: '#F0FDF4',
        border: '1px solid #BBF7D0',
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
    },
    notifList: {
        marginTop: 16,
        background: '#fff',
        borderRadius: 8,
        padding: 12,
        border: '1px solid #E5E7EB',
    },
    disconnectBtn: {
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        color: '#DC2626',
        borderRadius: 8,
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        alignSelf: 'flex-start',
    },
    qrBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: '8px 0',
    },
    qrFrame: {
        width: 220,
        height: 220,
        border: '2px solid #E5E7EB',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAFAFA',
        overflow: 'hidden',
    },
    instructionBox: {
        background: '#FFFBEB',
        border: '1px solid rgba(255,214,0,0.4)',
        borderRadius: 8,
        padding: '12px 16px',
        width: '100%',
        boxSizing: 'border-box',
    },
    refreshBtn: {
        background: '#F3F4F6',
        border: '1px solid #E5E7EB',
        color: '#374151',
        borderRadius: 8,
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
    },
};
