'use client';

import { StockDashboard } from '@/lib/api/stock';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';

export function KpiRowGsr({ dash }: { dash: StockDashboard | null }) {
    if (!dash) {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="adm-kpi-card adm-scale-in"
                        style={{
                            animationDelay: `${i * 60}ms`,
                            height: 95,
                            background: '#FAFBFC',
                            borderColor: '#E5E7EB',
                        }}
                    >
                        <div className="adm-kpi-grid" />
                        <div style={{ position: 'relative', zIndex: 1, padding: '1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#F3F4F6' }} />
                            <div>
                                <div style={{ width: 80, height: 10, borderRadius: 4, background: '#E5E7EB', marginBottom: 8 }} />
                                <div style={{ width: 50, height: 20, borderRadius: 4, background: '#E5E7EB' }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const cards = [
        {
            label: 'Total de Insumos',
            value: dash.totalAtivos ?? dash.totalItens,
            icon: <span aria-hidden>📦</span>,
            color: '#B89B00',
            bg: '#FFFDE7',
            border: '#FEF08A',
        },
        {
            label: 'Estoque Crítico',
            value: dash.alertasEstoqueCritico ?? 0,
            icon: <span aria-hidden>🚨</span>,
            color: '#DC2626',
            bg: '#FEF2F2',
            border: '#FECACA',
        },
        {
            label: 'Estoque Baixo',
            value: dash.alertasEstoqueBaixoNaoCritico ?? Math.max(0, (dash.alertasEstoqueBaixo ?? 0) - (dash.alertasEstoqueCritico ?? 0)),
            icon: <span aria-hidden>⚠️</span>,
            color: '#EA580C',
            bg: '#FFF7ED',
            border: '#FED7AA',
        },
        {
            label: 'Vencendo em 30 dias',
            value: dash.alertasVencendo ?? 0,
            icon: <span aria-hidden>⏰</span>,
            color: '#0891B2',
            bg: '#F0F9FF',
            border: '#BAE6FD',
        },
    ];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
            {cards.map((c, i) => (
                <AnimatedKpiCard
                    key={c.label}
                    label={c.label}
                    value={Number(c.value)}
                    color={c.color}
                    bg={c.bg}
                    border={c.border}
                    icon={c.icon}
                    compact
                    delayMs={i * 60}
                />
            ))}
        </div>
    );
}
