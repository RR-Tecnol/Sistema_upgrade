'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    getContasPagar, createContaPagar, updateContaPagar,
    marcarComoPaga, deleteContaPagar, restoreContaPagar, ContaPagar, ContasPagarResponse,
} from '@/lib/api/contasPagar';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import { useAdminFinanceRefresh } from '@/hooks/useAdminFinanceRefresh';
import { usePersistedAdminViewMode } from '@/hooks/usePersistedAdminViewMode';
import AdminViewModeToggle from '@/components/admin/AdminViewModeToggle';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import {
    TIPOS_ESTRADA,
    TIPOS_HABITUAL,
    TIPOS_OUTROS,
    TODOS_TIPOS,
    getTipo,
    ORIGEM_TIPO_CONTA,
    agregarContasPorTipo,
    slugsCatalogoKpiCompleto,
    agregadoParaSlug,
    type AgregadoTipo,
    type TipoContaVisual,
} from '@/lib/contasPagarTipoConta';

// ── Report Utilities ──────────────────────────────────────────────────────────
const fmtCurReport = (v: number | string) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDateReport = (d: string) =>
    d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

function gerarRelatorioPDF(contas: ContaPagar[], totais: any, filtros: Record<string, string>) {
    const agora = new Date().toLocaleString('pt-BR');
    const total = contas.reduce((s, c) => s + Number(c.valor), 0);

    const linhas = contas.map((c, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
            <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151">${fmtDateReport(c.data_vencimento)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">
                <span style="background:${c.status === 'paga' ? '#d1fae5' : c.status === 'vencida' ? '#fee2e2' : '#fef3c7'};color:${c.status === 'paga' ? '#065f46' : c.status === 'vencida' ? '#dc2626' : '#92400e'};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">${c.status.toUpperCase()}</span>
            </td>
            <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151">${c.tipo_conta.replace(/_/g, ' ')}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#111827;max-width:200px;word-break:break-word">${c.descricao}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151">${c.cidade || '—'}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:800;color:${c.status === 'paga' ? '#059669' : c.status === 'vencida' ? '#dc2626' : '#1e40af'};text-align:right">${fmtCurReport(c.valor)}</td>
        </tr>
    `).join('');

    const filtrosAtivos = Object.entries(filtros).filter(([, v]) => v).map(([k, v]) => `<span style="margin-right:8px;padding:2px 8px;background:#e0e7ff;color:#3730a3;border-radius:4px;font-size:11px">${k}: <b>${v}</b></span>`).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Relatório Contas a Pagar — UPGRADE</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Inter:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #111827; }
    @media print {
        body { background: #fff; }
        .no-print { display: none !important; }
        @page { margin: 1.5cm; size: A4 landscape; }
    }
</style></head>
<body>
<div style="max-width:1100px;margin:0 auto;padding:32px 24px">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0a0a0f,#1e3a5f);border-radius:16px;padding:28px 32px;margin-bottom:24px;position:relative;overflow:hidden">
        <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,214,0,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,214,0,.04) 1px,transparent 1px);background-size:30px 30px"></div>
        <div style="position:relative;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
            <div>
                <div style="font-family:'Orbitron',sans-serif;font-size:10px;color:rgba(255,214,0,.6);letter-spacing:.2em;margin-bottom:6px">UPGRADE // RELATÓRIO FINANCEIRO</div>
                <div style="font-family:'Orbitron',sans-serif;font-size:24px;font-weight:900;color:#FFD600;letter-spacing:.04em">CONTAS A PAGAR</div>
                <div style="color:rgba(255,255,255,.5);font-size:13px;margin-top:4px">Emitido em ${agora}</div>
            </div>
            <div style="text-align:right">
                <div style="font-family:'Orbitron',sans-serif;font-size:28px;font-weight:900;color:#FFD600">${fmtCurReport(total)}</div>
                <div style="color:rgba(255,255,255,.5);font-size:12px">${contas.length} lançamento(s)</div>
            </div>
        </div>
    </div>

    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
        ${[['Pendente', '#D97706', '#FFFBEB', totais.pendente], ['Paga', '#059669', '#ECFDF5', totais.paga], ['Vencida', '#DC2626', '#FEF2F2', totais.vencida], ['Cancelada', '#6B7280', '#F9FAFB', totais.cancelada]].map(([l, c, bg, v]) => `
        <div style="background:${bg};border:1px solid ${c}30;border-left:4px solid ${c};border-radius:12px;padding:16px">
            <div style="font-size:12px;color:#6B7280;font-weight:600;margin-bottom:6px">${l}</div>
            <div style="font-family:'Orbitron',sans-serif;font-size:18px;font-weight:800;color:${c}">${fmtCurReport(Number(v ?? 0))}</div>
        </div>
        `).join('')}
    </div>

    ${filtrosAtivos ? `<div style="margin-bottom:16px;padding:10px 14px;background:#f0f4ff;border-radius:10px;border:1px solid #c7d2fe"><span style="font-size:12px;color:#6b7280;font-weight:600">Filtros aplicados: </span>${filtrosAtivos}</div>` : ''}

    <!-- Tabela -->
    <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 16px rgba(0,0,0,.06)">
        <div style="background:linear-gradient(135deg,#0a0a0f,#111118);padding:14px 20px;display:flex;align-items:center;gap:10px">
            <span style="font-family:'Orbitron',sans-serif;font-size:10px;font-weight:800;color:#FFD600;letter-spacing:.13em">LANÇAMENTOS (${contas.length})</span>
        </div>
        <table style="width:100%;border-collapse:collapse">
            <thead>
                <tr style="background:#f8fafc">
                    <th style="padding:10px 10px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb">Vencimento</th>
                    <th style="padding:10px 10px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb">Status</th>
                    <th style="padding:10px 10px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb">Tipo</th>
                    <th style="padding:10px 10px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb">Descrição</th>
                    <th style="padding:10px 10px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb">Cidade</th>
                    <th style="padding:10px 10px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb">Valor</th>
                </tr>
            </thead>
            <tbody>${linhas}</tbody>
            <tfoot>
                <tr style="background:linear-gradient(135deg,rgba(255,214,0,.06),rgba(255,214,0,.02));border-top:2px solid rgba(255,214,0,.3)">
                    <td colspan="5" style="padding:12px 10px;font-family:'Orbitron',sans-serif;font-size:11px;font-weight:800;color:#B89B00;letter-spacing:.1em">TOTAL GERAL</td>
                    <td style="padding:12px 10px;text-align:right;font-family:'Orbitron',sans-serif;font-size:16px;font-weight:900;color:#FFD600">${fmtCurReport(total)}</td>
                </tr>
            </tfoot>
        </table>
    </div>

    <div style="margin-top:16px;text-align:center;color:#9ca3af;font-size:11px">Relatório gerado automaticamente pelo Sistema UPGRADE • ${agora}</div>

    <button class="no-print" onclick="window.print()" style="position:fixed;bottom:24px;right:24px;padding:14px 28px;background:linear-gradient(135deg,#FFD600,#E6A800);border:none;border-radius:12px;font-family:'Orbitron',sans-serif;font-weight:800;font-size:13px;color:#000;cursor:pointer;box-shadow:0 0 24px rgba(255,214,0,.5);letter-spacing:.04em">🖨️ IMPRIMIR / SALVAR PDF</button>
</div>
</body></html>`;

    // Usar Blob URL para evitar bloqueio de popup e abrir diretamente
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    // Liberar a URL após abertura
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

function exportarCSV(contas: ContaPagar[]) {
    const headers = ['Vencimento', 'Status', 'Tipo', 'Descricao', 'Cidade', 'Fornecedor', 'Observacoes', 'Valor (R$)'];
    const rows = contas.map(c => [
        fmtDateReport(c.data_vencimento),
        c.status,
        c.tipo_conta,
        `"${(c.descricao || '').replace(/"/g, '""')}"`,
        c.cidade || '',
        (c as any).fornecedor || '',
        `"${(c.observacoes || '').replace(/"/g, '""')}"`,
        Number(c.valor).toFixed(2).replace('.', ','),
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `contas-a-pagar-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function exportarJSON(contas: ContaPagar[]) {
    const blob = new Blob([JSON.stringify(contas, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `contas-a-pagar-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
@keyframes cp-scan { 0%{transform:translateY(-100%);opacity:0} 10%{opacity:.5} 90%{opacity:.5} 100%{transform:translateY(500%);opacity:0} }
@keyframes cp-grid { 0%,100%{opacity:.25} 50%{opacity:.55} }
@keyframes cp-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes cp-ring { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes cp-ring2 { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
@keyframes cp-fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes cp-slide-in { from{transform:translateX(-16px);opacity:0} to{transform:translateX(0);opacity:1} }
@keyframes cp-pulse-dot { 0%,100%{opacity:1} 50%{opacity:.3} }
@keyframes cp-holo { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes cp-modal-in { from{opacity:0;transform:scale(.94) translateY(14px)} to{opacity:1;transform:scale(1) translateY(0)} }
@keyframes cp-flicker { 0%,19%,21%,100%{opacity:1} 20%{opacity:.4} }
@keyframes cr-fade-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
@keyframes cr-scan { 0%,100%{top:0;opacity:.6} 50%{top:100%;opacity:.2} }
@keyframes cr-grid { 0%,100%{opacity:.08} 50%{opacity:.18} }
@keyframes cr-ring { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes cr-pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
@keyframes cr-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes cr-truck-slide { from{transform:translateX(-8px);opacity:0} to{transform:translateX(0);opacity:1} }
@keyframes cp-highlight-ring { 0%,100%{ box-shadow:0 0 0 0 rgba(37,99,235,.45);} 50%{ box-shadow:0 0 0 6px rgba(37,99,235,.12);} }
.cp-holo-text { background:linear-gradient(90deg,#B89B00,#FFD600,#fff9cc,#FFD600,#B89B00); background-size:200%; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:cp-holo 4s linear infinite; }
.cp-card3d { transition:transform .3s ease,box-shadow .3s; }
.cp-card3d:hover { transform:perspective(700px) rotateX(-2deg) rotateY(3deg) translateY(-3px); }
.cp-row:hover { background:rgba(255,214,0,.04) !important; }
.cp-type-btn { border:1.5px solid #E5E7EB; border-radius:14px; padding:16px 8px 12px; display:flex; flex-direction:column; align-items:center; gap:7px; cursor:pointer; transition:all .18s; background:#fff; }
.cp-type-btn:hover { border-color:#1e40af; background:rgba(37,99,235,.05); transform:translateY(-2px); box-shadow:0 5px 18px rgba(37,99,235,.13); }
.cp-type-btn.selected { border-color:#2563EB; background:rgba(37,99,235,.08); box-shadow:0 0 0 3px rgba(37,99,235,.18); }
.cp-input { width:100%; padding:.68rem 1rem; border-radius:9px; border:1.5px solid #E5E7EB; background:#F9FAFB; font-size:.88rem; outline:none; transition:border-color .18s,box-shadow .18s; box-sizing:border-box; }
.cp-input:focus { border-color:#2563EB; background:#fff; box-shadow:0 0 0 3px rgba(37,99,235,.12); }
`;

const REIMBURSEMENT_CATEGORY_LABELS: Record<string, string> = {
    CLASSROOM_MATERIAL: 'Material de Aula',
    CLEANING_MATERIAL: 'Material de Limpeza',
    EMERGENCY_REPAIR: 'Reparo Emergencial',
    FOOD: 'Alimentação',
    OTHER: 'Outro',
};

type ReimbursementMeta = { isReimbursement: boolean; reimbursementId?: string; category?: string; reason?: string };

function parseReimbursementMeta(conta: ContaPagar): ReimbursementMeta {
    const raw = conta.observacoes || '';
    const markerMatch = raw.match(/reimbursementId:([a-f0-9-]{8,})/i);
    const normalizedIdMatch = raw.match(/reimbursementId=([a-f0-9-]{8,})/i);
    const reimbursementId = markerMatch?.[1] || normalizedIdMatch?.[1];
    const legacy = raw.match(/Categoria:\s*([^|]+)\s*\|\s*Motivo:\s*([^|]+)\s*\|\s*reimbursementId:([a-f0-9-]+)/i);
    if (legacy) {
        return {
            isReimbursement: true,
            category: legacy[1]?.trim(),
            reason: legacy[2]?.trim(),
            reimbursementId: legacy[3]?.trim(),
        };
    }
    const looksLikeReimbursement = /origem\s*=\s*reembolso/i.test(raw) || /Reembolso de Despesas/i.test(conta.descricao) || !!reimbursementId;
    if (!looksLikeReimbursement) return { isReimbursement: false };
    const categoryMatch = raw.match(/categoria\s*=\s*([^|]+)/i);
    const reasonMatch = raw.match(/motivo\s*=\s*([^|]+)/i);
    const reasonFromDescription = conta.descricao.includes(' — ') ? conta.descricao.split(' — ').slice(1).join(' — ').trim() : undefined;
    return {
        isReimbursement: true,
        reimbursementId,
        category: categoryMatch?.[1]?.trim(),
        reason: reasonMatch?.[1]?.trim() || reasonFromDescription,
    };
}

const STATUS_CFG = {
    pendente: { label: 'Pendente', icon: '⏳', color: '#D97706', bg: 'rgba(251,191,36,.12)', border: 'rgba(251,191,36,.35)' },
    paga: { label: 'Paga', icon: '✅', color: '#059669', bg: 'rgba(16,185,129,.1)', border: 'rgba(16,185,129,.35)' },
    vencida: { label: 'Vencida', icon: '🔴', color: '#DC2626', bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.35)' },
    cancelada: { label: 'Cancelada', icon: '🚫', color: '#6B7280', bg: 'rgba(107,114,128,.1)', border: 'rgba(107,114,128,.3)' },
};

const fmtCur = (v: number | string) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** Mesmo padrão visual dos KPIs em `/admin/carretas` — valor monetário animado */
function useCountUpMoney(targetCents: number, duration = 900) {
    const [count, setCount] = useState(0);
    const raf = useRef(0);
    useEffect(() => {
        if (targetCents <= 0) {
            setCount(0);
            return;
        }
        const start = Date.now();
        const tick = () => {
            const p = Math.min((Date.now() - start) / duration, 1);
            setCount(Math.round((1 - Math.pow(1 - p, 3)) * targetCents));
            if (p < 1) raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [targetCents, duration]);
    return count;
}

/** KPI por status — mesmo padrão visual que `TipoContaKpiCard`. Clicar aplica / remove filtro de status na lista. */
function StatusContaKpiCard({
    label,
    icon,
    color,
    valueReais,
    count,
    valorPendente,
    valorPago,
    canceladaFooter,
    selected,
    showFiltraBadge = true,
    delay,
    titleTip,
    onToggle,
}: {
    label: string;
    icon: string;
    color: string;
    valueReais: number;
    count: number;
    valorPendente: number;
    valorPago: number;
    canceladaFooter?: boolean;
    selected: boolean;
    showFiltraBadge?: boolean;
    delay: number;
    titleTip?: string;
    onToggle: () => void;
}) {
    const cents = Math.max(0, Math.round(Number(valueReais) * 100));
    const n = useCountUpMoney(cents, 700);
    const shown = (n / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const [hov, setHov] = useState(false);
    return (
        <button
            className="adm-kpi-card adm-scale-in"
            type="button"
            title={titleTip ?? label}
            onClick={onToggle}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                animationDelay: `${delay}ms`,
                background: '#fff',
                borderTopColor: selected ? color : `${color}88`,
                borderRightColor: selected ? color : `${color}88`,
                borderBottomColor: selected ? color : `${color}88`,
                borderLeftColor: color,
                boxShadow: selected
                    ? `0 0 0 3px ${color}22, 0 8px 22px rgba(0,0,0,.08)`
                    : hov ? `0 8px 24px ${color}18` : '0 2px 8px rgba(0,0,0,.06)',
                padding: '16px 18px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
            }}
        >
            <div className="adm-kpi-grid" />
            <div className="adm-kpi-scan" style={{ background: `linear-gradient(90deg, transparent, ${color}66, transparent)` }} />
            <div className="adm-kpi-topline" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: hov ? 1 : 0.45 }} />
            <div className="adm-kpi-ring" style={{ borderColor: `${color}2A` }} />
            <div className="adm-kpi-ring adm-kpi-ring-sm" style={{ borderColor: `${color}1F` }} />
            <div className="adm-kpi-dot" style={{ background: color }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{
                        width: 30, height: 30, borderRadius: 10, border: `1px solid ${color}66`, background: `${color}1A`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0,
                        boxShadow: hov ? `0 0 14px ${color}40` : `0 0 6px ${color}20`, transition: 'box-shadow .3s ease',
                    }}>{icon}</span>
                    {selected && showFiltraBadge && (
                        <span style={{ fontSize: '.58rem', fontWeight: 800, color, border: `1px solid ${color}55`, borderRadius: 6, padding: '2px 6px' }}>FILTRO</span>
                    )}
                </div>
                <div style={{
                    fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.05rem',
                    color, lineHeight: 1.2, marginBottom: 6,
                }}>{shown}</div>
                <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#374151', marginBottom: 4, lineHeight: 1.3 }}>{label}</div>
                <div style={{ fontSize: '.62rem', color: '#9CA3AF', lineHeight: 1.45 }}>
                    {count} lançamento{count !== 1 ? 's' : ''}
                    {canceladaFooter ? (
                        <span style={{ color: '#6B7280' }}> · Total registado {fmtCur(valueReais)}</span>
                    ) : (
                        <>
                            <span style={{ color: '#D97706' }}> · Pend. {fmtCur(valorPendente)}</span>
                            <span style={{ color: '#059669' }}> · Pago {fmtCur(valorPago)}</span>
                        </>
                    )}
                </div>
            </div>
        </button>
    );
}

/** KPI compacto por `tipo_conta` — reflecte o resultado actual (filtros da API). Clicar filtra a lista por tipo. */
function TipoContaKpiCard({
    meta,
    ag,
    selected,
    delay,
    onToggleFilter,
}: {
    meta: TipoContaVisual;
    ag: AgregadoTipo;
    selected: boolean;
    delay: number;
    onToggleFilter: () => void;
}) {
    const color = meta.color;
    const cents = Math.max(0, Math.round(Number(ag.total) * 100));
    const n = useCountUpMoney(cents, 700);
    const shown = (n / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const [hov, setHov] = useState(false);
    const origem = ORIGEM_TIPO_CONTA[meta.value];
    const titleTip = origem ? `${origem.modulo} — ${origem.notas}` : `Slug: ${meta.value}`;
    return (
        <button
            className="adm-kpi-card adm-scale-in"
            type="button"
            title={titleTip}
            onClick={onToggleFilter}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                animationDelay: `${delay}ms`,
                background: '#fff',
                borderTopColor: selected ? color : `${color}88`,
                borderRightColor: selected ? color : `${color}88`,
                borderBottomColor: selected ? color : `${color}88`,
                borderLeftColor: color,
                boxShadow: selected
                    ? `0 0 0 3px ${color}22, 0 8px 22px rgba(0,0,0,.08)`
                    : hov ? `0 8px 24px ${color}18` : '0 2px 8px rgba(0,0,0,.06)',
                padding: '16px 18px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
            }}
        >
            <div className="adm-kpi-grid" />
            <div className="adm-kpi-scan" style={{ background: `linear-gradient(90deg, transparent, ${color}66, transparent)` }} />
            <div className="adm-kpi-topline" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: hov ? 1 : 0.45 }} />
            <div className="adm-kpi-ring" style={{ borderColor: `${color}2A` }} />
            <div className="adm-kpi-ring adm-kpi-ring-sm" style={{ borderColor: `${color}1F` }} />
            <div className="adm-kpi-dot" style={{ background: color }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{
                        width: 30, height: 30, borderRadius: 10, border: `1px solid ${color}66`, background: `${color}1A`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0,
                        boxShadow: hov ? `0 0 14px ${color}40` : `0 0 6px ${color}20`, transition: 'box-shadow .3s ease',
                        fontSize: '1rem',
                    }}>{meta.icon}</span>
                    {selected && (
                        <span style={{ fontSize: '.58rem', fontWeight: 800, color, border: `1px solid ${color}55`, borderRadius: 6, padding: '2px 6px' }}>FILTRO</span>
                    )}
                </div>
                <div style={{
                    fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.05rem',
                    color, lineHeight: 1.2, marginBottom: 6,
                }}>{shown}</div>
                <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#374151', marginBottom: 4, lineHeight: 1.3 }}>{meta.label}</div>
                <div style={{ fontSize: '.62rem', color: '#9CA3AF', lineHeight: 1.45 }}>
                    {ag.count} lançamento{ag.count !== 1 ? 's' : ''}
                    <span style={{ color: '#D97706' }}> · Pend. {fmtCur(ag.valorPendente)}</span>
                    <span style={{ color: '#059669' }}> · Pago {fmtCur(ag.valorPago)}</span>
                </div>
            </div>
        </button>
    );
}

/** Cartão de lançamento — mesmo DNA visual de `TruckCard` em `/admin/carretas` */
function LancamentoCarretaCard({
    c,
    index,
    tipo,
    st,
    vencida,
    reimbursementMeta,
    primaryDescription,
    highlighted,
    onOpenTrace,
    onEdit,
    onPay,
    onDelete,
}: {
    c: ContaPagar;
    index: number;
    tipo: { label: string; icon: string; color: string };
    st: { label: string; icon: string; color: string; bg: string; border: string };
    vencida: boolean;
    reimbursementMeta: ReimbursementMeta;
    primaryDescription: string;
    highlighted?: boolean;
    onOpenTrace: () => void;
    onEdit: () => void;
    onPay: () => void;
    onDelete: () => void;
}) {
    const accentColor = st.color;
    const [hov, setHov] = useState(false);
    return (
        <div
            className="adm-kpi-card"
            id={`conta-pagar-card-${c.id}`}
            onClick={onOpenTrace}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                position: 'relative', overflow: 'hidden', borderRadius: 20,
                background: '#fff',
                borderStyle: 'solid',
                borderWidth: '1px 1px 1px 4px',
                borderTopColor: `${hov ? accentColor + '55' : accentColor + '20'}`,
                borderRightColor: `${hov ? accentColor + '55' : accentColor + '20'}`,
                borderBottomColor: `${hov ? accentColor + '55' : accentColor + '20'}`,
                borderLeftColor: accentColor,
                boxShadow: highlighted
                    ? `0 0 0 3px rgba(37,99,235,.35), 0 12px 28px rgba(37,99,235,.15)`
                    : hov
                        ? `0 0 24px ${accentColor}18, 0 12px 32px rgba(0,0,0,.1)`
                        : `0 2px 8px rgba(0,0,0,.06)`,
                transition: 'all .3s cubic-bezier(.175,.885,.32,1.275)',
                transform: hov ? 'perspective(800px) rotateX(-2deg) rotateY(3deg) translateY(-6px)' : 'none',
                animation: highlighted
                    ? `cp-highlight-ring 1.6s ease-in-out 3, cr-truck-slide .5s ${Math.min(index, 8) * 40}ms both`
                    : `cr-truck-slide .5s ${Math.min(index, 8) * 40}ms both`,
                display: 'flex', flexDirection: 'column',
                cursor: 'pointer',
            }}
        >
            <div className="adm-kpi-grid" />
            <div className="adm-kpi-scan" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}66, transparent)` }} />
            <div className="adm-kpi-topline" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, opacity: hov ? .9 : .4 }} />
            <div className="adm-kpi-ring" style={{ borderColor: `${accentColor}2A` }} />
            <div className="adm-kpi-ring adm-kpi-ring-sm" style={{ borderColor: `${accentColor}1F` }} />
            <div className="adm-kpi-dot" style={{ background: accentColor }} />

            <div style={{ position: 'relative', zIndex: 1, padding: '18px 18px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem',
                        background: `linear-gradient(135deg,${tipo.color}22,${tipo.color}06)`,
                        border: `1px solid ${tipo.color}35`,
                        boxShadow: hov ? `0 0 14px ${tipo.color}35` : `0 0 4px ${tipo.color}10`,
                        transition: 'box-shadow .3s',
                    }}>{tipo.icon}</div>
                    <span style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20,
                        background: st.bg, border: `1px solid ${st.border}`,
                        fontSize: '0.68rem', fontWeight: 700, color: st.color,
                    }}>
                        <span style={{
                            width: 5, height: 5, borderRadius: '50%', background: st.color,
                            animation: 'cr-pulse-dot 2s infinite', display: 'inline-block',
                        }} />
                        {st.icon} {st.label}
                    </span>
                </div>

                <div style={{
                    fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '0.95rem',
                    color: tipo.color, marginBottom: 4, letterSpacing: '.02em',
                }}>
                    {tipo.label}
                    {c.recorrente && (
                        <span style={{ marginLeft: 6, fontSize: '.62rem', background: 'rgba(37,99,235,.1)', color: '#2563EB', border: '1px solid rgba(37,99,235,.25)', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>↻</span>
                    )}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6B7280', lineHeight: 1.45, wordBreak: 'break-word', marginBottom: 12 }} title={primaryDescription}>
                    {primaryDescription}
                    {reimbursementMeta.isReimbursement && (
                        <div style={{ marginTop: 6, fontSize: '.65rem', fontWeight: 600, color: '#2563EB' }}>
                            Reembolso
                            {reimbursementMeta.category && (
                                <span> · {REIMBURSEMENT_CATEGORY_LABELS[reimbursementMeta.category] || reimbursementMeta.category}</span>
                            )}
                        </div>
                    )}
                    {c.acao && (
                        <div style={{ marginTop: 4 }}>
                            <Link href={`/admin/acoes/${c.acao.id}`} style={{ textDecoration: 'none', color: '#B89B00', fontSize: '.7rem', fontWeight: 600 }}>
                                ⚡ {c.acao.nome}
                            </Link>
                        </div>
                    )}
                    {c.tipo_conta === 'feedback_pix' && c.courseFeedback?.id && (
                        <div style={{ marginTop: 6 }}>
                            <Link href={`/admin/feedbacks/${c.courseFeedback.id}`} style={{ fontSize: '.7rem', fontWeight: 700, color: '#2563EB' }}>
                                Feedback →
                            </Link>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                    <span style={{ color: '#2563EB', fontWeight: 800, fontSize: '.85rem' }}>$</span>
                    <span style={{
                        fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.35rem',
                        color: c.status === 'paga' ? '#059669' : c.status === 'vencida' ? '#DC2626' : '#111827',
                        filter: hov ? `drop-shadow(0 0 6px ${accentColor}50)` : 'none',
                        animation: 'cr-float 3s ease-in-out infinite',
                    }}>{fmtCur(c.valor)}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem',
                        color: vencida ? '#DC2626' : '#6B7280', fontWeight: vencida ? 700 : 400,
                    }}>
                        <span>📅</span> {fmtDate(c.data_vencimento)}
                    </div>
                    {c.cidade ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem', color: '#6B7280' }}>
                            <span>📍</span> {c.cidade}
                        </div>
                    ) : null}
                </div>

                {vencida && c.status === 'pendente' && (
                    <div style={{
                        padding: '8px 12px', borderRadius: 10,
                        background: '#FEF2F2', border: '1px solid #FECACA',
                        color: '#DC2626', fontSize: '0.7rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
                    }}>
                        ⚠️ Vencimento ultrapassado — revisar pagamento
                    </div>
                )}
            </div>

            <div style={{
                position: 'relative', zIndex: 1,
                borderTop: `1px solid ${accentColor}15`,
                background: 'rgba(0,0,0,.01)',
                padding: '10px 18px',
                display: 'flex', gap: 8, alignItems: 'center',
            }}>
                <span style={{ fontSize: '.85rem', opacity: 0.35, cursor: 'default' }} title="Anexo (futuro)">📎</span>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    style={{
                        flex: 1, textAlign: 'center',
                        padding: '8px 0', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700,
                        background: '#F9FAFB', border: `1px solid ${accentColor}30`,
                        color: '#374151', cursor: 'pointer',
                        transition: 'background .2s, border-color .2s',
                    }}
                >
                    ✏️ Editar
                </button>
                {c.status === 'pendente' && (
                    <button
                        type="button"
                        title="Marcar como paga"
                        onClick={(e) => { e.stopPropagation(); onPay(); }}
                        style={{
                            padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                            background: 'rgba(5,150,105,.1)', border: '1px solid rgba(5,150,105,.35)',
                            color: '#059669', fontSize: '0.72rem', fontWeight: 700,
                        }}
                    >
                        ✅
                    </button>
                )}
                <button
                    type="button"
                    title="Excluir"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    style={{
                        padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                        background: '#FEF2F2', border: '1px solid #FECACA',
                        color: '#EF4444', fontSize: '0.72rem', fontWeight: 700,
                    }}
                >
                    🗑
                </button>
            </div>
        </div>
    );
}

function ContaRastreioModal({
    conta,
    onClose,
}: {
    conta: ContaPagar;
    onClose: () => void;
}) {
    const [tab, setTab] = useState<'resumo' | 'auditoria' | 'solicitacoes' | 'analitico'>('resumo');
    const tipo = getTipo(conta.tipo_conta);
    const origem = ORIGEM_TIPO_CONTA[conta.tipo_conta];
    const reimbursementMeta = parseReimbursementMeta(conta);
    const studentName = conta.courseFeedback?.student?.user?.name;
    const studentEmail = conta.courseFeedback?.student?.user?.email;
    const rastreioEventos = [
        { when: conta.createdAt, label: 'Cadastro do lançamento', detail: 'Conta criada e registrada na listagem financeira.' },
        { when: conta.data_vencimento, label: 'Vencimento planejado', detail: `Status atual: ${STATUS_CFG[conta.status].label}.` },
        ...(conta.data_pagamento ? [{ when: conta.data_pagamento, label: 'Liquidação', detail: 'Pagamento registrado no fluxo financeiro.' }] : []),
        ...(conta.updatedAt && conta.updatedAt !== conta.createdAt ? [{ when: conta.updatedAt, label: 'Última atualização', detail: 'Alteração administrativa no lançamento.' }] : []),
    ];

    return (
        <ModalPortal>
            <div
                role="presentation"
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: MODAL_PORTAL_Z_INDEX,
                    background: 'rgba(0,0,0,.52)', backdropFilter: 'blur(3px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
                }}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Rastreio de lançamento"
                    onClick={e => e.stopPropagation()}
                    style={{
                        width: 'min(980px, 96vw)', maxHeight: '90vh', overflow: 'auto',
                        borderRadius: 18, background: '#fff', border: `1px solid ${tipo.color}55`,
                        boxShadow: `0 24px 60px rgba(0,0,0,.45), 0 0 0 1px ${tipo.color}22`,
                        animation: 'cp-modal-in .22s ease',
                    }}
                >
                    <div style={{
                        padding: '14px 18px', borderBottom: `1px solid ${tipo.color}22`,
                        background: 'linear-gradient(135deg,#0a0a0f,#111118)', display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        <span style={{ fontSize: '1.1rem' }}>{tipo.icon}</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontFamily: 'Orbitron', fontSize: '.62rem', color: 'rgba(255,214,0,.7)', letterSpacing: '.12em' }}>MÓDULO DE RASTREIO</div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conta.descricao}</div>
                        </div>
                        <button onClick={onClose} style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                    </div>

                    <div style={{ padding: '12px 16px', display: 'flex', gap: 8, borderBottom: '1px solid #F3F4F6', flexWrap: 'wrap' }}>
                        {[
                            { id: 'resumo', label: 'Resumo executivo', icon: '📋' },
                            { id: 'auditoria', label: 'Origem & auditoria', icon: '🧭' },
                            { id: 'solicitacoes', label: 'Solicitações', icon: '🧾' },
                            { id: 'analitico', label: 'Análise de risco', icon: '🧠' },
                        ].map(t => {
                            const active = tab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id as typeof tab)}
                                    style={{
                                        padding: '7px 12px', borderRadius: 9, border: `1px solid ${active ? tipo.color : '#E5E7EB'}`,
                                        background: active ? `${tipo.color}14` : '#fff', color: active ? tipo.color : '#6B7280',
                                        fontSize: '.74rem', fontWeight: 800, cursor: 'pointer',
                                    }}
                                >
                                    {t.icon} {t.label}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ padding: 16 }}>
                        {tab === 'resumo' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                                {[
                                    { k: 'Tipo', v: `${tipo.label} (${conta.tipo_conta})` },
                                    { k: 'Status', v: STATUS_CFG[conta.status].label },
                                    { k: 'Valor', v: fmtCur(conta.valor) },
                                    { k: 'Cidade', v: conta.cidade || 'Não informada' },
                                    { k: 'Vencimento', v: fmtDate(conta.data_vencimento) },
                                    { k: 'Pagamento', v: conta.data_pagamento ? fmtDate(conta.data_pagamento) : 'Ainda não pago' },
                                ].map(item => (
                                    <div key={item.k} className="adm-kpi-card" style={{ background: '#fff', borderTopColor: `${tipo.color}88`, borderRightColor: `${tipo.color}66`, borderBottomColor: `${tipo.color}66`, borderLeftColor: tipo.color, padding: '12px 14px' }}>
                                        <div className="adm-kpi-grid" />
                                        <div style={{ position: 'relative', zIndex: 1 }}>
                                            <div style={{ fontSize: '.62rem', color: '#9CA3AF', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>{item.k}</div>
                                            <div style={{ marginTop: 3, fontWeight: 700, color: '#111827', lineHeight: 1.35 }}>{item.v}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {tab === 'auditoria' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                                <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', background: '#FAFAFA' }}>
                                    <div style={{ fontWeight: 800, color: '#374151', marginBottom: 6 }}>Origem do lançamento</div>
                                    <div style={{ color: '#6B7280', fontSize: '.86rem' }}>{origem ? `${origem.modulo} — ${origem.notas}` : 'Origem manual/legado não mapeada.'}</div>
                                </div>
                                <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', background: '#FAFAFA' }}>
                                    <div style={{ fontWeight: 800, color: '#374151', marginBottom: 8 }}>Linha do tempo administrativa</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {rastreioEventos.map(ev => (
                                            <div key={`${ev.label}-${ev.when}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                                <span style={{ marginTop: 4, width: 7, height: 7, borderRadius: '50%', background: tipo.color, flexShrink: 0 }} />
                                                <div>
                                                    <div style={{ fontWeight: 700, color: '#374151' }}>{ev.label}</div>
                                                    <div style={{ fontSize: '.78rem', color: '#9CA3AF' }}>{fmtDate(ev.when)} · {ev.detail}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ border: '1px dashed #D1D5DB', borderRadius: 12, padding: '10px 12px', color: '#6B7280', fontSize: '.8rem' }}>
                                    Responsável por cadastro/edição detalhada não está persistido no schema actual de `ContaPagar` (não há `createdBy/updatedBy` na tabela).
                                </div>
                            </div>
                        )}

                        {tab === 'solicitacoes' && (
                            <div style={{ display: 'grid', gap: 10 }}>
                                {reimbursementMeta.isReimbursement ? (
                                    <div style={{ border: '1px solid rgba(37,99,235,.25)', borderRadius: 12, background: 'rgba(37,99,235,.06)', padding: '12px 14px' }}>
                                        <div style={{ fontWeight: 800, color: '#1D4ED8', marginBottom: 6 }}>Solicitação de reembolso identificada</div>
                                        <div style={{ fontSize: '.84rem', color: '#374151' }}>
                                            {reimbursementMeta.reimbursementId ? `ID ${reimbursementMeta.reimbursementId} · ` : ''}Categoria {reimbursementMeta.category ? (REIMBURSEMENT_CATEGORY_LABELS[reimbursementMeta.category] || reimbursementMeta.category) : 'não informada'}.
                                        </div>
                                        <div style={{ marginTop: 4, fontSize: '.8rem', color: '#6B7280' }}>{reimbursementMeta.reason || 'Sem motivo textual no registro.'}</div>
                                    </div>
                                ) : (
                                    <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, background: '#FAFAFA', padding: '12px 14px', color: '#6B7280', fontSize: '.84rem' }}>
                                        Não foi identificado marcador explícito de solicitação de reembolso neste lançamento.
                                    </div>
                                )}
                                {conta.courseFeedback ? (
                                    <div style={{ border: '1px solid rgba(5,150,105,.25)', borderRadius: 12, background: 'rgba(5,150,105,.06)', padding: '12px 14px' }}>
                                        <div style={{ fontWeight: 800, color: '#047857', marginBottom: 6 }}>Vínculo com feedback / PIX</div>
                                        <div style={{ fontSize: '.84rem', color: '#374151' }}>
                                            Feedback #{conta.courseFeedback.id.slice(0, 8)} · status {conta.courseFeedback.status || 'n/d'}
                                        </div>
                                        <div style={{ marginTop: 4, fontSize: '.8rem', color: '#6B7280' }}>
                                            Solicitante: {studentName || 'não informado'}{studentEmail ? ` (${studentEmail})` : ''}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, background: '#FAFAFA', padding: '12px 14px', color: '#6B7280', fontSize: '.84rem' }}>
                                        Sem vínculo directo com feedback/aluno neste lançamento.
                                    </div>
                                )}
                                <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, background: '#fff', padding: '12px 14px' }}>
                                    <div style={{ fontWeight: 800, color: '#374151', marginBottom: 5 }}>Observações brutas</div>
                                    <div style={{ fontSize: '.8rem', color: '#6B7280', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                                        {conta.observacoes?.trim() || 'Sem observações adicionais.'}
                                    </div>
                                </div>
                            </div>
                        )}
                        {tab === 'analitico' && (
                            <div style={{ display: 'grid', gap: 10 }}>
                                <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, background: '#FAFAFA', padding: '12px 14px' }}>
                                    <div style={{ fontWeight: 800, color: '#111827', marginBottom: 8 }}>Checklist de conformidade financeira</div>
                                    <div style={{ fontSize: '.84rem', color: '#334155', lineHeight: 1.6 }}>
                                        <div>• <b>Valor consistente:</b> {Number(conta.valor) > 0 ? 'sim' : 'não'}</div>
                                        <div>• <b>Cidade informada:</b> {conta.cidade?.trim() ? 'sim' : 'não'}</div>
                                        <div>• <b>Data de vencimento:</b> {conta.data_vencimento ? fmtDate(conta.data_vencimento) : 'ausente'}</div>
                                        <div>• <b>Pagamento registrado:</b> {conta.data_pagamento ? fmtDate(conta.data_pagamento) : 'pendente'}</div>
                                        <div>• <b>Tempo entre criação e vencimento:</b> {Math.max(0, Math.round((new Date(conta.data_vencimento).getTime() - new Date(conta.createdAt).getTime()) / 86400000))} dia(s)</div>
                                    </div>
                                </div>
                                <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, background: '#fff', padding: '12px 14px' }}>
                                    <div style={{ fontWeight: 800, color: '#111827', marginBottom: 8 }}>Perguntas-chave para auditoria administrativa</div>
                                    <div style={{ fontSize: '.82rem', color: '#475569', lineHeight: 1.6 }}>
                                        <div>1) Esta conta tem origem operacional comprovável no módulo {origem?.modulo || 'não mapeado'}?</div>
                                        <div>2) Há vínculo de beneficiário, solicitação ou feedback identificável?</div>
                                        <div>3) O status atual ({STATUS_CFG[conta.status].label}) está coerente com as datas de vencimento/pagamento?</div>
                                        <div>4) Existem observações suficientes para uma reabertura sem depender de memória do operador?</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

// ── FloatInput ────────────────────────────────────────────────────────────────
function FInput({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ position: 'relative', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '6px 14px 10px' }}>
            <label style={{ position: 'absolute', top: -10, left: 10, background: '#fff', padding: '0 4px', fontSize: '.67rem', fontWeight: 700, color: '#6B7280', letterSpacing: '.05em' }}>{label}</label>
            {children}
        </div>
    );
}

// ── Modal Nova/Editar Conta ───────────────────────────────────────────────────
function Modal({ conta, acoes, onClose, onSaved }: {
    conta?: ContaPagar | null;
    acoes: { id: string; nome: string }[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const editing = !!conta;
    const [step, setStep] = useState<1 | 2>(editing ? 2 : 1);
    const [tipoSel, setTipoSel] = useState<TipoContaVisual | null>(editing ? getTipo(conta!.tipo_conta) : null);
    const [form, setForm] = useState({
        descricao: conta?.descricao ?? '',
        valor: conta?.valor ? String(conta.valor) : '',
        data_vencimento: conta?.data_vencimento?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        status: (conta?.status ?? 'pendente') as 'pendente' | 'paga' | 'vencida' | 'cancelada',
        recorrente: conta?.recorrente ?? false,
        observacoes: conta?.observacoes ?? '',
        acao_id: conta?.acaoId ?? '',
        cidade: conta?.cidade ?? '',
        tipo_espontaneo: conta?.tipo_espontaneo ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [erro, setErro] = useState('');

    const selTipo = (t: TipoContaVisual) => {
        setTipoSel(t);
        setForm(f => ({ ...f, descricao: f.descricao || t.label }));
        setStep(2);
    };

    const salvar = async () => {
        if (!tipoSel) return;
        if (!form.descricao.trim()) { setErro('Informe a descrição.'); return; }
        if (!form.valor || isNaN(parseFloat(form.valor))) { setErro('Informe o valor.'); return; }
        if (!form.data_vencimento) { setErro('Informe a data de vencimento.'); return; }
        setSaving(true); setErro('');
        try {
            const payload = {
                tipo_conta: tipoSel.value,
                tipo_espontaneo: tipoSel.value === 'espontaneo' ? form.tipo_espontaneo : undefined,
                descricao: form.descricao.trim(),
                valor: parseFloat(form.valor),
                data_vencimento: form.data_vencimento,
                status: form.status,
                recorrente: form.recorrente,
                observacoes: form.observacoes.trim() || undefined,
                acao_id: form.acao_id || undefined,
                cidade: form.cidade.trim() || undefined,
            };
            if (editing) await updateContaPagar(conta!.id, payload);
            else await createContaPagar(payload);
            onSaved();
        } catch (e: any) {
            setErro(e?.response?.data?.message || 'Erro ao salvar. Tente novamente.');
        } finally { setSaving(false); }
    };

    const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    return (
        <ModalPortal>
            <div
                role="presentation"
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: MODAL_PORTAL_Z_INDEX,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,.55)',
                    backdropFilter: 'blur(6px)',
                    padding: 16,
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    boxSizing: 'border-box',
                }}
                onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="cp-modal-title"
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: '#fff',
                        borderRadius: 20,
                        width: '100%',
                        maxWidth: 700,
                        maxHeight: 'min(92vh, calc(100vh - 32px))',
                        margin: 'auto',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 32px 96px rgba(0,0,0,.35)',
                        animation: 'cp-modal-in .3s cubic-bezier(.16,1,.3,1)',
                        flexShrink: 0,
                    }}
                >
                    {/* Header */}
                    <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563EB)', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>💲</div>
                        <div>
                            <div style={{ fontFamily: 'Orbitron', fontSize: '.58rem', color: 'rgba(255,255,255,.6)', letterSpacing: '.15em' }}>UPGRADE // FINANCEIRO</div>
                            <div id="cp-modal-title" style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>{editing ? 'Editar Conta' : 'Nova Conta'}</div>
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                            {step === 2 && !editing && <button onClick={() => setStep(1)} style={{ padding: '5px 14px', borderRadius: 8, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.22)', color: '#fff', fontSize: '.78rem', cursor: 'pointer' }}>← Voltar</button>}
                            <button onClick={onClose} style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                        </div>
                    </div>

                    {/* Body */}
                    <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
                        {step === 1 ? (
                            <>
                                <div style={{ fontWeight: 700, fontSize: '.93rem', color: '#374151', marginBottom: 18 }}>Tipo de Conta</div>
                                {[
                                    { label: 'Custos de Estrada', cor: '#DC2626', tipos: TIPOS_ESTRADA },
                                    { label: 'Contas Habituais', cor: '#7C3AED', tipos: TIPOS_HABITUAL },
                                    { label: 'Outros', cor: '#D97706', tipos: TIPOS_OUTROS },
                                ].map(cat => (
                                    <div key={cat.label} style={{ marginBottom: 22 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.cor }} />
                                            <span style={{ fontSize: '.82rem', fontWeight: 700, color: cat.cor }}>{cat.label}</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9 }}>
                                            {cat.tipos.map(t => (
                                                <button key={t.value} className={`cp-type-btn${tipoSel?.value === t.value ? ' selected' : ''}`} onClick={() => selTipo(t)}>
                                                    <span style={{ fontSize: '1.5rem' }}>{t.icon}</span>
                                                    <span style={{ fontSize: '.68rem', fontWeight: 600, color: '#374151', textAlign: 'center', lineHeight: 1.25 }}>{t.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {/* Tipo badge */}
                                {tipoSel && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(37,99,235,.06)', border: '1px solid rgba(37,99,235,.2)' }}>
                                        <span style={{ fontSize: '1.3rem' }}>{tipoSel.icon}</span>
                                        <div>
                                            <div style={{ fontSize: '.68rem', color: '#6B7280', fontWeight: 600 }}>Tipo selecionado</div>
                                            <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#1e40af' }}>{tipoSel.label}</div>
                                        </div>
                                    </div>
                                )}
                                {/* Descrição personalizada para espontaneo */}
                                {tipoSel?.value === 'espontaneo' && (
                                    <input className="cp-input" placeholder="Nome do tipo personalizado..." value={form.tipo_espontaneo} onChange={e => set('tipo_espontaneo', e.target.value)} />
                                )}
                                {/* Descrição */}
                                <textarea className="cp-input" placeholder="Descrição" rows={2} value={form.descricao} onChange={e => set('descricao', e.target.value)} style={{ resize: 'none', fontFamily: 'inherit' }} />
                                {/* Valor + Data */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <FInput label="Valor (R$)">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                                            <span style={{ color: '#2563EB', fontWeight: 700 }}>R$</span>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={form.valor}
                                                onFocus={e => { if (e.target.value === '0' || e.target.value === '0,00') e.target.select(); }}
                                                onChange={e => {
                                                    // Permite apenas números e vírgula/ponto
                                                    const raw = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                                                    set('valor', raw);
                                                }}
                                                placeholder="0,00"
                                                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '.93rem', background: 'transparent' }}
                                            />
                                        </div>
                                    </FInput>
                                    <FInput label="Data de Vencimento">
                                        <input type="date" value={form.data_vencimento} onChange={e => set('data_vencimento', e.target.value)}
                                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '.88rem', background: 'transparent', paddingTop: 4 }} />
                                    </FInput>
                                </div>
                                {/* Vincular Ação */}
                                <select className="cp-input" value={form.acao_id} onChange={e => set('acao_id', e.target.value)}>
                                    <option value="">Vincular a Ação (opcional)</option>
                                    {acoes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                                </select>
                                <div style={{ fontSize: '.7rem', color: '#9CA3AF', marginTop: -8 }}>Vincule esta conta a uma ação específica para rastreamento de custos</div>
                                {/* Cidade + Status */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <FInput label="Cidade (para relatórios)">
                                        <input type="text" value={form.cidade} onChange={e => set('cidade', e.target.value)}
                                            placeholder="Ex: São Luís" style={{ border: 'none', outline: 'none', width: '100%', fontSize: '.88rem', background: 'transparent', paddingTop: 4 }} />
                                    </FInput>
                                    <FInput label="Status">
                                        <select value={form.status} onChange={e => set('status', e.target.value)}
                                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '.88rem', background: 'transparent', paddingTop: 4 }}>
                                            <option value="pendente">Pendente</option>
                                            <option value="paga">Paga</option>
                                            <option value="vencida">Vencida</option>
                                            <option value="cancelada">Cancelada</option>
                                        </select>
                                    </FInput>
                                </div>
                                {/* Recorrente */}
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'rgba(37,99,235,.04)', border: '1px solid rgba(37,99,235,.15)', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={form.recorrente} onChange={e => set('recorrente', e.target.checked)} style={{ width: 16, height: 16 }} />
                                    <span style={{ fontSize: '.87rem', fontWeight: 600, color: '#374151' }}>Conta recorrente (mensal)</span>
                                </label>
                                {/* Observações */}
                                <textarea className="cp-input" placeholder="Observações (opcional)" rows={2} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} style={{ resize: 'none', fontFamily: 'inherit' }} />
                                {erro && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '.82rem', fontWeight: 600 }}>⚠️ {erro}</div>}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '14px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#FAFAFA', flexShrink: 0 }}>
                        <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 10, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '.85rem', cursor: 'pointer' }}>Cancelar</button>
                        {step === 2 && (
                            <button onClick={salvar} disabled={saving} style={{
                                padding: '9px 24px', borderRadius: 10,
                                background: saving ? '#93C5FD' : 'linear-gradient(135deg,#2563EB,#1D4ED8)',
                                border: 'none', color: '#fff', fontWeight: 700, fontSize: '.88rem',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                boxShadow: saving ? 'none' : '0 4px 12px rgba(37,99,235,.35)',
                            }}>
                                {saving ? '⏳ Salvando...' : '✅ Salvar'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
function ContasPagarPageInner() {
    const searchParams = useSearchParams();
    const highlightId = searchParams.get('highlight');
    const [resp, setResp] = useState<ContasPagarResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterTipo, setFilterTipo] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCidade, setFilterCidade] = useState('');
    const [filterDataInicio, setFilterDataInicio] = useState('');
    const [filterDataFim, setFilterDataFim] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingConta, setEditingConta] = useState<ContaPagar | null>(null);
    const [acoes, setAcoes] = useState<{ id: string; nome: string }[]>([]);
    const [mousePos, setMousePos] = useState({ x: .5, y: .5 });
    const [deleteContaId, setDeleteContaId] = useState<string | null>(null);
    const [deleteContaDesc, setDeleteContaDesc] = useState('');
    const [traceConta, setTraceConta] = useState<ContaPagar | null>(null);
    // PASSO 3.9: aba excluídos
    const [showDeleted, setShowDeleted] = useState(false);
    const [deletedContas, setDeletedContas] = useState<ContaPagar[]>([]);
    const [collapseStatusCards, setCollapseStatusCards] = useState(false);
    const [collapseTipoCards, setCollapseTipoCards] = useState(false);
    const [collapseLancamentoCards, setCollapseLancamentoCards] = useState(false);
    const [lancamentosViewMode, setLancamentosViewMode] = usePersistedAdminViewMode('contas-a-pagar:lancamentos', 'card');
    const heroRef = useRef<HTMLDivElement>(null);
    const PARTICLES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const [showReport, setShowReport] = useState(false);
    const [reportTop, setReportTop] = useState(0);
    const reportBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!((e.target as HTMLElement).closest('[data-report-root]'))) setShowReport(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleReport = () => {
        if (!showReport && reportBtnRef.current) {
            const rect = reportBtnRef.current.getBoundingClientRect();
            setReportTop(rect.bottom + 6);
        }
        setShowReport(s => !s);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [d, del] = await Promise.all([
                getContasPagar({
                    status: filterStatus || undefined,
                    cidade: filterCidade || undefined,
                    data_inicio: filterDataInicio || undefined,
                    data_fim: filterDataFim || undefined,
                    search: searchTerm || undefined,
                }),
                // PASSO 3.9: buscar excluídos em paralelo
                getContasPagar({ includeDeleted: true }),
            ]);
            setResp(d);
            setDeletedContas(del.contas || []);
        } catch { /* silencioso — estado vazio exibido */ }
        finally { setLoading(false); }
    }, [filterStatus, filterCidade, filterDataInicio, filterDataFim, searchTerm]);

    useEffect(() => { load(); }, [load]);
    useAdminFinanceRefresh(load, ['contas']);

    const contas = resp?.contas ?? [];
    const contasExibidas = useMemo(
        () => (filterTipo ? contas.filter(c => c.tipo_conta === filterTipo) : contas),
        [contas, filterTipo],
    );

    const contasForScroll = contasExibidas;
    useEffect(() => {
        if (!highlightId || loading || contasForScroll.length === 0) return;
        const id = requestAnimationFrame(() => {
            const el = document.getElementById(`conta-pagar-card-${highlightId}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        return () => cancelAnimationFrame(id);
    }, [highlightId, loading, contasForScroll]);
    useEffect(() => {
        api.get('/acoes').then(r => setAcoes(r.data.map((a: any) => ({ id: a.id, nome: a.nome })))).catch(() => { });
    }, []);

    const onMouse = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = heroRef.current?.getBoundingClientRect();
        if (r) setMousePos({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
    };

    const handleDelete = async () => {
        if (!deleteContaId) return;
        try { await deleteContaPagar(deleteContaId); setDeleteContaId(null); load(); toast.success('Conta excluída com sucesso!'); } catch { toast.error('Erro ao excluir conta.'); setDeleteContaId(null); }
    };

    // PASSO 3.9: restaurar conta excluída
    const handleRestore = async (id: string, desc: string) => {
        try { await restoreContaPagar(id); load(); toast.success(`"${desc}" restaurada com sucesso!`); }
        catch { toast.error('Erro ao restaurar conta.'); }
    };

    const handlePagar = async (id: string) => {
        try { await marcarComoPaga(id); load(); toast.success('Conta marcada como paga!'); } catch { toast.error('Erro ao marcar como paga.'); }
    };

    const openEdit = (c: ContaPagar) => { setEditingConta(c); setShowModal(true); };
    const openNew = () => { setEditingConta(null); setShowModal(true); };
    const onSaved = () => { setShowModal(false); load(); };

    const totalGeral = resp ? Number(resp.totaisPorStatus.pendente) + Number(resp.totaisPorStatus.paga) + Number(resp.totaisPorStatus.vencida) + Number(resp.totaisPorStatus.cancelada) : 0;

    const agregadosPorTipo = useMemo(() => agregarContasPorTipo(contas), [contas]);
    const tiposKpiSlugs = useMemo(() => slugsCatalogoKpiCompleto(agregadosPorTipo), [agregadosPorTipo]);

    const statusKpiFoot = useMemo(() => {
        const sumVal = (xs: ContaPagar[]) => xs.reduce((s, c) => s + Number(c.valor), 0);
        const by = (st: ContaPagar['status']) => contas.filter(c => c.status === st);
        const pend = by('pendente');
        const paga = by('paga');
        const venc = by('vencida');
        const canc = by('cancelada');
        return {
            pendente: { count: pend.length, vp: sumVal(pend), vpg: 0 as number },
            paga: { count: paga.length, vp: 0, vpg: sumVal(paga) },
            vencida: { count: venc.length, vp: sumVal(venc), vpg: 0 },
            cancelada: { count: canc.length },
            total: { count: contas.length, vp: sumVal([...pend, ...venc]), vpg: sumVal(paga) },
        };
    }, [contas]);

    if (loading && !resp) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 24 }}>
            <style>{CSS}</style>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#FFD600', animation: 'cp-ring 1s linear infinite' }} />
                <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '2px solid transparent', borderBottomColor: 'rgba(255,214,0,.4)', animation: 'cp-ring2 .7s linear infinite' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>💰</div>
            </div>
            <div style={{ fontFamily: 'Orbitron', fontSize: '.72rem', color: '#B89B00', letterSpacing: '.2em', animation: 'cp-flicker 2s infinite' }}>CARREGANDO CONTAS...</div>
        </div>
    );

    return (
        <React.Fragment>
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <style>{CSS}</style>

                {/* MODAL */}
                {showModal && <Modal conta={editingConta} acoes={acoes} onClose={() => setShowModal(false)} onSaved={onSaved} />}
            {traceConta && <ContaRastreioModal conta={traceConta} onClose={() => setTraceConta(null)} />}

                {/* ─── HERO ─────────────────────────────────── */}
                <div ref={heroRef} onMouseMove={onMouse}
                    style={{
                        position: 'relative', borderRadius: 22, overflow: 'hidden', padding: '28px 32px 24px',
                        background: 'linear-gradient(135deg,#0a0a0f,#111118,#0f0f1a)',
                        border: '1px solid rgba(255,214,0,.25)',
                        boxShadow: '0 0 60px rgba(255,214,0,.08),0 0 0 1px rgba(255,214,0,.1),inset 0 1px 0 rgba(255,214,0,.12)'
                    }}>
                    <div style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        backgroundImage: 'linear-gradient(rgba(255,214,0,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,214,0,.04) 1px,transparent 1px)',
                        backgroundSize: '36px 36px', animation: 'cp-grid 4s ease-in-out infinite'
                    }} />
                    <div style={{
                        position: 'absolute', left: 0, right: 0, height: 2,
                        background: 'linear-gradient(90deg,transparent,rgba(255,214,0,.5),transparent)',
                        animation: 'cp-scan 4s ease-in-out infinite', pointerEvents: 'none', zIndex: 2
                    }} />
                    <div style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
                        background: `radial-gradient(circle 300px at ${mousePos.x * 100}% ${mousePos.y * 100}%,rgba(255,214,0,.07),transparent 70%)`
                    }} />
                    {PARTICLES.map(i => (<div key={i} style={{ position: 'absolute', width: 2, height: 2, borderRadius: '50%', background: '#FFD600', opacity: .15, left: `${6 + i * 9}%`, top: `${15 + Math.sin(i * .8) * 70}%`, animation: `cp-float ${3 + i * .4}s ease-in-out ${i * .22}s infinite`, boxShadow: '0 0 5px #FFD600', pointerEvents: 'none' }} />))}
                    <div style={{ position: 'absolute', right: -15, top: -15, width: 120, height: 120, opacity: .1, pointerEvents: 'none' }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid #FFD600', animation: 'cp-ring 8s linear infinite' }} />
                        <div style={{ position: 'absolute', inset: 18, borderRadius: '50%', border: '1px dashed rgba(255,214,0,.5)', animation: 'cp-ring2 5s linear infinite' }} />
                    </div>

                    <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                            <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0, animation: 'cp-float 4s ease-in-out infinite' }}>
                                <div style={{ position: 'absolute', inset: 0, borderRadius: 14, background: 'linear-gradient(135deg,#FFD600,#E6A800)', boxShadow: '0 0 20px rgba(255,214,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.7rem' }}>💰</div>
                            </div>
                            <div>
                                <div style={{ fontFamily: 'Orbitron', fontSize: '.58rem', fontWeight: 700, color: 'rgba(255,214,0,.6)', letterSpacing: '.22em', marginBottom: 5 }}>UPGRADE // FINANCEIRO OPERACIONAL</div>
                                <h1 className="cp-holo-text" style={{ fontFamily: 'Orbitron', fontSize: '1.55rem', fontWeight: 900, margin: '0 0 8px', letterSpacing: '.04em' }}>CONTAS A PAGAR</h1>
                                <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '.8rem', margin: 0 }}>Gestão de custos de estrada e despesas operacionais</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button onClick={openNew} style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 11,
                                background: 'linear-gradient(135deg,#FFD600,#E6A800)', border: 'none',
                                color: '#000', fontFamily: 'Orbitron', fontSize: '.72rem', fontWeight: 800,
                                letterSpacing: '.06em', cursor: 'pointer',
                                boxShadow: '0 0 20px rgba(255,214,0,.4),0 4px 14px rgba(0,0,0,.28)',
                            }}>＋ NOVA CONTA</button>
                            <Link href="/admin/acoes" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 11, background: 'rgba(255,214,0,.1)', border: '1px solid rgba(255,214,0,.3)', color: '#FFD600', fontFamily: 'Orbitron', fontSize: '.7rem', fontWeight: 700, textDecoration: 'none' }}>⚡ VER AÇÕES</Link>
                            {/* ── Relatórios Dropdown ── */}
                            <div data-report-root style={{ position: 'relative' }}>
                                <button ref={reportBtnRef} onClick={toggleReport} style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 11,
                                    background: showReport ? 'rgba(99,102,241,.25)' : 'rgba(99,102,241,.1)',
                                    border: '1px solid rgba(99,102,241,.4)', color: '#A5B4FC',
                                    fontFamily: 'Orbitron', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer',
                                    boxShadow: showReport ? '0 0 16px rgba(99,102,241,.35)' : 'none', transition: 'all .2s',
                                }}>📊 RELATÓRIOS {showReport ? '▲' : '▼'}</button>
                            </div>
                            {showReport && (
                                <div data-report-root style={{
                                    position: 'fixed', top: reportTop, right: 8, zIndex: 99999,
                                    background: '#1e1e2e', border: '1px solid rgba(99,102,241,.3)',
                                    borderRadius: 14, overflow: 'hidden', width: 260,
                                    boxShadow: '0 20px 60px rgba(0,0,0,.7),0 0 0 1px rgba(99,102,241,.2)',
                                    animation: 'cp-modal-in .2s ease',
                                }}>
                                    <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                                        <div style={{ fontFamily: 'Orbitron', fontSize: '9px', color: 'rgba(165,180,252,.5)', letterSpacing: '.15em' }}>UPGRADE // RELATÓRIOS</div>
                                        <div style={{ fontWeight: 700, fontSize: '12px', color: '#fff', marginTop: 2 }}>Exportar dados</div>
                                    </div>
                                    {[
                                        { icon: '🖨️', label: 'PDF Profissional', sub: 'Abre prévia para imprimir', color: '#f97316', action: () => { gerarRelatorioPDF(contasExibidas, resp?.totaisPorStatus ?? {}, { tipo: filterTipo || '(todos)', status: filterStatus, cidade: filterCidade, 'período de': filterDataInicio, 'período até': filterDataFim }); setShowReport(false); } },
                                        { icon: '📊', label: 'Exportar CSV', sub: 'Compatível com Excel', color: '#22c55e', action: () => { exportarCSV(contasExibidas); setShowReport(false); } },
                                        { icon: '{ }', label: 'Exportar JSON', sub: 'Para integrações', color: '#60a5fa', action: () => { exportarJSON(contasExibidas); setShowReport(false); } },
                                    ].map(item => (
                                        <button key={item.label} onClick={item.action} style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                                            background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                                            borderBottom: '1px solid rgba(255,255,255,.04)', transition: 'background .15s',
                                        }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.06)'}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                        >
                                            <div style={{ width: 36, height: 36, borderRadius: 9, background: `${item.color}18`, border: `1px solid ${item.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{item.icon}</div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9' }}>{item.label}</div>
                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', marginTop: 1 }}>{item.sub}</div>
                                            </div>
                                        </button>
                                    ))}
                                    <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)', textAlign: 'center' }}>{contasExibidas.length} lançamentos · {new Date().toLocaleDateString('pt-BR')}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─── KPI por status — mesmo padrão de card que «POR TIPO DE CONTA» ─── */}
                {resp && (
                    <div style={{ marginTop: 4 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap',
                        }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D97706' }} />
                            <button
                                type="button"
                                onClick={() => setCollapseStatusCards(v => !v)}
                                title={collapseStatusCards ? 'Expandir cards de status' : 'Colapsar cards de status'}
                                style={{
                                    fontFamily: 'Orbitron',
                                    fontSize: '.65rem',
                                    fontWeight: 800,
                                    color: '#b45309',
                                    letterSpacing: '.12em',
                                    background: 'transparent',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    transition: 'all .18s ease',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-1px) scale(1.04)';
                                    e.currentTarget.style.textShadow = '0 0 12px rgba(217,119,6,.45)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.textShadow = 'none';
                                }}
                            >
                                {collapseStatusCards ? '▸ POR STATUS' : '▾ POR STATUS'}
                            </button>
                            <span style={{ fontSize: '.72rem', color: '#9CA3AF' }}>
                                Totais da lista actual (API) · clique para filtrar por status (mesmo efeito que os filtros / tabs abaixo)
                            </span>
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                                {filterTipo ? (
                                    <button
                                        type="button"
                                        onClick={() => setFilterTipo('')}
                                        style={{
                                            fontFamily: 'Orbitron',
                                            fontSize: '.65rem',
                                            fontWeight: 800,
                                            color: '#1e40af',
                                            letterSpacing: '.08em',
                                            background: 'transparent',
                                            border: 'none',
                                            padding: 0,
                                            cursor: 'pointer',
                                            transition: 'all .18s ease',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-1px) scale(1.04)';
                                            e.currentTarget.style.textShadow = '0 0 12px rgba(37,99,235,.45)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                            e.currentTarget.style.textShadow = 'none';
                                        }}
                                    >
                                        Limpar filtro de tipo
                                    </button>
                                ) : null}
                                {filterStatus ? (
                                    <button
                                        type="button"
                                        onClick={() => { setShowDeleted(false); setFilterStatus(''); }}
                                        style={{
                                            fontFamily: 'Orbitron',
                                            fontSize: '.65rem',
                                            fontWeight: 800,
                                            color: '#b45309',
                                            letterSpacing: '.08em',
                                            background: 'transparent',
                                            border: 'none',
                                            padding: 0,
                                            cursor: 'pointer',
                                            transition: 'all .18s ease',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-1px) scale(1.04)';
                                            e.currentTarget.style.textShadow = '0 0 12px rgba(217,119,6,.45)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                            e.currentTarget.style.textShadow = 'none';
                                        }}
                                    >
                                        Limpar filtro de status
                                    </button>
                                ) : null}
                            </div>
                        </div>
                        {!collapseStatusCards && <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
                            gap: 12,
                        }}>
                            <StatusContaKpiCard
                                label="Pendente"
                                icon="⏳"
                                color="#D97706"
                                valueReais={Number(resp.totaisPorStatus.pendente ?? 0)}
                                count={statusKpiFoot.pendente.count}
                                valorPendente={statusKpiFoot.pendente.vp}
                                valorPago={statusKpiFoot.pendente.vpg}
                                selected={filterStatus === 'pendente'}
                                delay={40}
                                titleTip="Filtrar lista: apenas pendentes"
                                onToggle={() => { setShowDeleted(false); setFilterStatus(prev => (prev === 'pendente' ? '' : 'pendente')); }}
                            />
                            <StatusContaKpiCard
                                label="Paga"
                                icon="✅"
                                color="#059669"
                                valueReais={Number(resp.totaisPorStatus.paga ?? 0)}
                                count={statusKpiFoot.paga.count}
                                valorPendente={statusKpiFoot.paga.vp}
                                valorPago={statusKpiFoot.paga.vpg}
                                selected={filterStatus === 'paga'}
                                delay={65}
                                titleTip="Filtrar lista: apenas pagas"
                                onToggle={() => { setShowDeleted(false); setFilterStatus(prev => (prev === 'paga' ? '' : 'paga')); }}
                            />
                            <StatusContaKpiCard
                                label="Vencida"
                                icon="🔴"
                                color="#DC2626"
                                valueReais={Number(resp.totaisPorStatus.vencida ?? 0)}
                                count={statusKpiFoot.vencida.count}
                                valorPendente={statusKpiFoot.vencida.vp}
                                valorPago={statusKpiFoot.vencida.vpg}
                                selected={filterStatus === 'vencida'}
                                delay={90}
                                titleTip="Filtrar lista: apenas vencidas"
                                onToggle={() => { setShowDeleted(false); setFilterStatus(prev => (prev === 'vencida' ? '' : 'vencida')); }}
                            />
                            <StatusContaKpiCard
                                label="Cancelada"
                                icon="🚫"
                                color="#6B7280"
                                valueReais={Number(resp.totaisPorStatus.cancelada ?? 0)}
                                count={statusKpiFoot.cancelada.count}
                                valorPendente={0}
                                valorPago={0}
                                canceladaFooter
                                selected={filterStatus === 'cancelada'}
                                delay={115}
                                titleTip="Filtrar lista: apenas canceladas"
                                onToggle={() => { setShowDeleted(false); setFilterStatus(prev => (prev === 'cancelada' ? '' : 'cancelada')); }}
                            />
                            <StatusContaKpiCard
                                label="Total geral"
                                icon="📊"
                                color="#FFD600"
                                valueReais={totalGeral}
                                count={statusKpiFoot.total.count}
                                valorPendente={statusKpiFoot.total.vp}
                                valorPago={statusKpiFoot.total.vpg}
                                selected={filterStatus === ''}
                                showFiltraBadge={false}
                                delay={140}
                                titleTip="Mostrar todos os status"
                                onToggle={() => { setShowDeleted(false); setFilterStatus(''); }}
                            />
                        </div>}
                        {collapseStatusCards && (
                            <div style={{
                                borderRadius: 12,
                                border: '1px dashed rgba(217,119,6,.35)',
                                background: 'linear-gradient(135deg,rgba(217,119,6,.06),rgba(217,119,6,.02))',
                                padding: '10px 14px',
                                color: '#b45309',
                                fontSize: '.72rem',
                                fontWeight: 700,
                            }}>
                                Cards de status colapsados. Clique em <b>▸ POR STATUS</b> para abrir novamente.
                            </div>
                        )}
                    </div>
                )}

                {/* ─── KPI por tipo de conta (catálogo completo; filtro de tipo só na grelha) ─── */}
                {resp && (
                    <div style={{ marginTop: 4 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap',
                        }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} />
                            <button
                                type="button"
                                onClick={() => setCollapseTipoCards(v => !v)}
                                title={collapseTipoCards ? 'Expandir cards por tipo' : 'Colapsar cards por tipo'}
                                style={{
                                    fontFamily: 'Orbitron',
                                    fontSize: '.65rem',
                                    fontWeight: 800,
                                    color: '#1e40af',
                                    letterSpacing: '.12em',
                                    background: 'transparent',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    transition: 'all .18s ease',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-1px) scale(1.04)';
                                    e.currentTarget.style.textShadow = '0 0 12px rgba(37,99,235,.45)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.textShadow = 'none';
                                }}
                            >
                                {collapseTipoCards ? '▸ POR TIPO DE CONTA' : '▾ POR TIPO DE CONTA'}
                            </button>
                            <span style={{ fontSize: '.72rem', color: '#9CA3AF' }}>
                                Totais sobre todos os tipos da lista actual (status, datas, busca) · clique para filtrar só a grelha de lançamentos
                            </span>
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }} />
                        </div>
                        {!collapseTipoCards && <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
                            gap: 12,
                        }}>
                            {tiposKpiSlugs.map((slug, idx) => {
                                const ag = agregadoParaSlug(slug, agregadosPorTipo);
                                const meta = getTipo(slug);
                                return (
                                    <TipoContaKpiCard
                                        key={slug}
                                        meta={meta}
                                        ag={ag}
                                        selected={filterTipo === slug}
                                        delay={40 + idx * 25}
                                        onToggleFilter={() => setFilterTipo(prev => (prev === slug ? '' : slug))}
                                    />
                                );
                            })}
                        </div>}
                        {!collapseTipoCards && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setFilterTipo('')}
                                    style={{
                                        fontFamily: 'Orbitron',
                                        fontSize: '.65rem',
                                        fontWeight: 800,
                                        color: '#1e40af',
                                        letterSpacing: '.08em',
                                        background: 'transparent',
                                        border: 'none',
                                        padding: 0,
                                        cursor: 'pointer',
                                        transition: 'all .18s ease',
                                        opacity: filterTipo ? 1 : 0.45,
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-1px) scale(1.04)';
                                        e.currentTarget.style.textShadow = '0 0 12px rgba(37,99,235,.45)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.textShadow = 'none';
                                    }}
                                >
                                    Limpar filtro de tipo
                                </button>
                            </div>
                        )}
                        {collapseTipoCards && (
                            <div style={{
                                borderRadius: 12,
                                border: '1px dashed rgba(37,99,235,.35)',
                                background: 'linear-gradient(135deg,rgba(37,99,235,.06),rgba(37,99,235,.02))',
                                padding: '10px 14px',
                                color: '#1e40af',
                                fontSize: '.72rem',
                                fontWeight: 700,
                            }}>
                                Cards por tipo colapsados. Clique em <b>▸ POR TIPO DE CONTA</b> para abrir novamente.
                            </div>
                        )}
                    </div>
                )}

                {/* ─── FILTROS ─────────────────────────────── */}
                <div style={{ borderRadius: 14, border: '1px solid rgba(255,214,0,.2)', background: '#fff', overflow: 'hidden', boxShadow: '0 3px 16px rgba(0,0,0,.05)' }}>
                    <div style={{ padding: '12px 18px', background: 'linear-gradient(135deg,#0a0a0f,#111118)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,214,0,.15)', border: '1px solid rgba(255,214,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.78rem' }}>🔍</div>
                        <span style={{ fontFamily: 'Orbitron', fontSize: '.62rem', fontWeight: 800, color: '#FFD600', letterSpacing: '.13em' }}>FILTROS</span>
                        <button onClick={() => setShowFilters(s => !s)} style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 7, background: 'rgba(255,214,0,.1)', border: '1px solid rgba(255,214,0,.25)', color: 'rgba(255,214,0,.8)', fontSize: '.65rem', cursor: 'pointer', fontFamily: 'Orbitron', fontWeight: 700 }}>
                            {showFilters ? '▲ RECOLHER' : '▼ EXPANDIR'}
                        </button>
                        <button onClick={load} style={{ padding: '4px 12px', borderRadius: 7, background: 'rgba(255,214,0,.12)', border: '1px solid rgba(255,214,0,.3)', color: '#FFD600', fontSize: '.65rem', cursor: 'pointer', fontFamily: 'Orbitron', fontWeight: 700 }}>🔄</button>
                    </div>
                    <div style={{ padding: '14px 18px' }}>
                        {/* Busca — sempre visível */}
                        <input className="cp-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="🔍  Buscar por descrição ou cidade..." style={{ marginBottom: showFilters ? 12 : 0 }} />
                        {showFilters && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 10, marginTop: 4 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '.63rem', fontWeight: 700, textTransform: 'uppercase', color: '#6B7280', marginBottom: 5 }}>Tipo</label>
                                    <select className="cp-input" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
                                        <option value="">Todos</option>
                                        {TODOS_TIPOS.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '.63rem', fontWeight: 700, textTransform: 'uppercase', color: '#6B7280', marginBottom: 5 }}>Status</label>
                                    <select className="cp-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                        <option value="">Todos</option>
                                        <option value="pendente">⏳ Pendente</option>
                                        <option value="paga">✅ Paga</option>
                                        <option value="vencida">🔴 Vencida</option>
                                        <option value="cancelada">🚫 Cancelada</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '.63rem', fontWeight: 700, textTransform: 'uppercase', color: '#6B7280', marginBottom: 5 }}>Cidade</label>
                                    <input className="cp-input" value={filterCidade} onChange={e => setFilterCidade(e.target.value)} placeholder="Ex: São Luís" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '.63rem', fontWeight: 700, textTransform: 'uppercase', color: '#6B7280', marginBottom: 5 }}>De</label>
                                    <input type="date" className="cp-input" value={filterDataInicio} onChange={e => setFilterDataInicio(e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '.63rem', fontWeight: 700, textTransform: 'uppercase', color: '#6B7280', marginBottom: 5 }}>Até</label>
                                    <input type="date" className="cp-input" value={filterDataFim} onChange={e => setFilterDataFim(e.target.value)} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── GRID DE CARDS (igual Sistema Carreta) ── */}
                <div>
                    {/* Header do bloco */}
                    <div style={{ borderRadius: '14px 14px 0 0', padding: '12px 18px', background: 'linear-gradient(135deg,#0a0a0f,#111118)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,214,0,.15)', border: '1px solid rgba(255,214,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.78rem' }}>📄</div>
                        <span style={{ fontFamily: 'Orbitron', fontSize: '.62rem', fontWeight: 800, color: '#FFD600', letterSpacing: '.13em' }}>LANÇAMENTOS ({contasExibidas.length})</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {!collapseLancamentoCards ? (
                                <AdminViewModeToggle mode={lancamentosViewMode} onChange={setLancamentosViewMode} />
                            ) : null}
                            <button
                                type="button"
                                onClick={() => setCollapseLancamentoCards(v => !v)}
                                style={{
                                    padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(255,214,0,.35)',
                                    background: 'rgba(255,214,0,.08)', fontSize: '.7rem', fontWeight: 700, color: '#FFD600', cursor: 'pointer',
                                }}
                            >
                                {collapseLancamentoCards ? 'Expandir lista' : 'Colapsar lista'}
                            </button>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFD600', boxShadow: '0 0 7px #FFD600', animation: 'cp-pulse-dot 1.5s infinite' }} />
                        </div>
                    </div>
                    {!collapseLancamentoCards && (
                        <>
                            <div style={{ background: '#fff', borderLeft: '1px solid rgba(255,214,0,.15)', borderRight: '1px solid rgba(255,214,0,.15)', padding: '10px 16px', display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid #F3F4F6' }}>
                                {[
                                    { label: 'Todos', value: '', icon: '📋', count: contasExibidas.length },
                                    { label: 'Pendentes', value: 'pendente', icon: '⏳', count: contasExibidas.filter(c => c.status === 'pendente').length },
                                    { label: 'Pagas', value: 'paga', icon: '✅', count: contasExibidas.filter(c => c.status === 'paga').length },
                                    { label: 'Vencidas', value: 'vencida', icon: '🔴', count: contasExibidas.filter(c => c.status === 'vencida').length },
                                    { label: 'Canceladas', value: 'cancelada', icon: '🚫', count: contasExibidas.filter(c => c.status === 'cancelada').length },
                                    { label: 'Excluídos', value: '__deleted__', icon: '🗑️', count: deletedContas.length },
                                ].map(tab => {
                                    const active = filterStatus === tab.value;
                                    return (
                                        <button key={tab.value} onClick={() => { if (tab.value === '__deleted__') { setShowDeleted(s => !s); } else { setFilterStatus(tab.value); setShowDeleted(false); } }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 5,
                                                padding: '5px 12px', borderRadius: 8, border: 'none',
                                                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                                                transition: 'all 0.15s',
                                                background: active ? (tab.value === 'cancelada' ? '#FEF2F2' : tab.value === 'pendente' ? '#FFFDE7' : tab.value === 'paga' ? '#DCFCE7' : tab.value === 'vencida' ? '#FEE2E2' : '#111827') : '#F3F4F6',
                                                color: active ? (tab.value === 'cancelada' ? '#DC2626' : tab.value === 'pendente' ? '#B89B00' : tab.value === 'paga' ? '#059669' : tab.value === 'vencida' ? '#DC2626' : '#FFD600') : '#6B7280',
                                                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                            }}>
                                            <span>{tab.icon}</span>
                                            <span>{tab.label}</span>
                                            <span style={{ background: active ? 'rgba(0,0,0,0.1)' : '#E5E7EB', borderRadius: 99, padding: '1px 6px', fontSize: '0.65rem' }}>{tab.count}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {contasExibidas.length === 0 ? (
                                <div style={{ background: '#fff', borderRadius: '0 0 14px 14px', border: '1px solid rgba(255,214,0,.15)', borderTop: 'none', padding: 48, textAlign: 'center' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📄</div>
                                    <div style={{ fontFamily: 'Orbitron', fontSize: '.8rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '.1em' }}>NENHUMA CONTA ENCONTRADA</div>
                                    <div style={{ color: '#D1D5DB', fontSize: '.82rem', marginTop: 6 }}>Clique em <b>+ NOVA CONTA</b> para registrar.</div>
                                    <button onClick={openNew} style={{ marginTop: 18, padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '.88rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,.3)' }}>+ Nova Conta</button>
                                </div>
                            ) : lancamentosViewMode === 'card' ? (
                                <div style={{
                                    background: '#F8FAFC',
                                    border: '1px solid rgba(255,214,0,.15)',
                                    borderTop: 'none',
                                    borderRadius: '0 0 14px 14px',
                                    padding: 16,
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                    gap: 14,
                                }}>
                                    {contasExibidas.map((c, i) => {
                                        const tipo = getTipo(c.tipo_conta);
                                        const st = STATUS_CFG[c.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pendente;
                                        const vencida = c.status === 'pendente' && new Date(c.data_vencimento) < new Date();
                                        const reimbursementMeta = parseReimbursementMeta(c);
                                        const primaryDescription =
                                            reimbursementMeta.isReimbursement && c.descricao.includes(' — ')
                                                ? c.descricao.split(' — ')[0]
                                                : c.descricao;
                                        return (
                                            <LancamentoCarretaCard
                                                key={c.id}
                                                c={c}
                                                index={i}
                                                tipo={tipo}
                                                st={st}
                                                vencida={vencida}
                                                reimbursementMeta={reimbursementMeta}
                                                primaryDescription={primaryDescription}
                                                highlighted={!!highlightId && highlightId === c.id}
                                                    onOpenTrace={() => setTraceConta(c)}
                                                onEdit={() => openEdit(c)}
                                                onPay={() => handlePagar(c.id)}
                                                onDelete={() => {
                                                    setDeleteContaId(c.id);
                                                    setDeleteContaDesc(c.descricao);
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{
                                    background: '#fff',
                                    border: '1px solid rgba(255,214,0,.15)',
                                    borderTop: 'none',
                                    borderRadius: '0 0 14px 14px',
                                    overflowX: 'auto',
                                }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.76rem', minWidth: 720 }}>
                                        <thead>
                                            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                                                {(['Venc.', 'Status', 'Tipo', 'Descrição', 'Cidade', 'Valor', 'Ações'] as const).map(h => (
                                                    <th key={h} style={{ padding: '10px 8px', fontWeight: 800, color: '#6B7280', whiteSpace: 'nowrap', letterSpacing: '.04em', textTransform: 'uppercase', fontSize: '.62rem' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contasExibidas.map((c, i) => {
                                                const tipo = getTipo(c.tipo_conta);
                                                const st = STATUS_CFG[c.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pendente;
                                                const vencida = c.status === 'pendente' && new Date(c.data_vencimento) < new Date();
                                                const highlighted = !!highlightId && highlightId === c.id;
                                                return (
                                                    <tr
                                                        key={c.id}
                                                        id={`conta-pagar-card-${c.id}`}
                                                        onClick={() => setTraceConta(c)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid #F3F4F6',
                                                            background: i % 2 === 0 ? '#fff' : '#FAFBFC',
                                                            outline: highlighted ? '2px solid rgba(37,99,235,.45)' : 'none',
                                                            outlineOffset: -2,
                                                        }}
                                                    >
                                                        <td style={{ padding: '8px', color: vencida ? '#DC2626' : '#374151', fontWeight: vencida ? 700 : 500 }}>{fmtDate(c.data_vencimento)}</td>
                                                        <td style={{ padding: '8px' }}><span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '.65rem', fontWeight: 700, background: st.bg, border: `1px solid ${st.border}`, color: st.color }}>{st.label}</span></td>
                                                        <td style={{ padding: '8px', fontWeight: 600, color: tipo.color }}>{tipo.label}</td>
                                                        <td style={{ padding: '8px', maxWidth: 220, wordBreak: 'break-word', color: '#374151' }}>{c.descricao}</td>
                                                        <td style={{ padding: '8px', color: '#64748B' }}>{c.cidade || '—'}</td>
                                                        <td style={{ padding: '8px', fontFamily: 'Orbitron, monospace', fontWeight: 900, color: c.status === 'paga' ? '#059669' : c.status === 'vencida' ? '#DC2626' : '#111827', whiteSpace: 'nowrap' }}>{fmtCur(c.valor)}</td>
                                                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                                                            <button type="button" onClick={() => openEdit(c)} style={{ marginRight: 6, padding: '4px 8px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#F9FAFB', cursor: 'pointer', fontSize: '.65rem', fontWeight: 700 }}>Editar</button>
                                                            {c.status === 'pendente' ? (
                                                                <button type="button" onClick={() => handlePagar(c.id)} style={{ marginRight: 6, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(5,150,105,.35)', background: 'rgba(5,150,105,.08)', color: '#059669', cursor: 'pointer', fontSize: '.65rem', fontWeight: 700 }}>Pagar</button>
                                                            ) : null}
                                                            <button type="button" onClick={() => { setDeleteContaId(c.id); setDeleteContaDesc(c.descricao); }} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', fontSize: '.65rem', fontWeight: 700 }}>Excluir</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Rodapé total */}
                            {contasExibidas.length > 0 && (
                                <div style={{ marginTop: 12, padding: '10px 18px', borderRadius: 10, background: 'linear-gradient(135deg,rgba(255,214,0,.06),rgba(255,214,0,.02))', border: '1px solid rgba(255,214,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontFamily: 'Orbitron', fontSize: '.62rem', fontWeight: 800, color: '#B89B00', letterSpacing: '.1em' }}>TOTAL — {contasExibidas.length} LANÇAMENTOS</span>
                                    <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '.96rem', color: '#FFD600', filter: 'drop-shadow(0 0 8px rgba(255,214,0,.4))' }}>
                                        {fmtCur(contasExibidas.reduce((s, c) => s + Number(c.valor), 0))}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            {/* PASSO 3.9: Seção de contas excluídas */}
            {showDeleted && (
                <div style={{ marginTop: '1.5rem', borderRadius: 14, border: '2px solid #FECACA', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 18px', background: '#FEF2F2', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1rem' }}>🗑️</span>
                        <span style={{ fontFamily: 'Orbitron', fontSize: '.62rem', fontWeight: 800, color: '#DC2626', letterSpacing: '.1em' }}>CONTAS EXCLUÍDAS ({deletedContas.length})</span>
                        <span style={{ marginLeft: 'auto', fontSize: '.72rem', color: '#9CA3AF' }}>Clique em Restaurar para reativar</span>
                    </div>
                    {deletedContas.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', background: '#fff' }}>
                            <div style={{ color: '#9CA3AF', fontSize: '.85rem' }}>Nenhuma conta excluída</div>
                        </div>
                    ) : (
                        <div style={{ background: '#fff', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {deletedContas.map(c => (
                                <div key={c.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    padding: '0.75rem 1rem', borderRadius: 10,
                                    background: '#FEF2F2', border: '1px solid #FECACA',
                                    opacity: 0.85,
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '.88rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {c.descricao}
                                        </div>
                                        <div style={{ fontSize: '.72rem', color: '#9CA3AF', marginTop: 2 }}>
                                            {c.tipo_conta.replace(/_/g, ' ')} · {fmtCur(c.valor)} · Venc. {fmtDate(c.data_vencimento)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRestore(c.id, c.descricao)}
                                        style={{
                                            padding: '6px 14px', borderRadius: 8, flexShrink: 0,
                                            background: 'rgba(5,150,105,.1)', border: '1px solid rgba(5,150,105,.35)',
                                            color: '#059669', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer',
                                            transition: 'all .15s',
                                        }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(5,150,105,.2)'; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(5,150,105,.1)'; }}
                                    >↩ Restaurar</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* FEAT-CP2: Modal de confirmação de exclusão */}
            {deleteContaId && (
                <ModalPortal>
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                        onClick={() => setDeleteContaId(null)}>
                        <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'cp-modal-in .2s ease' }}
                            onClick={e => e.stopPropagation()}>
                            <div style={{ padding: '18px 24px 14px', background: '#FEF2F2', borderBottom: '1px solid #FECACA', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🗑️</div>
                                <h2 style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 900, color: '#111827', margin: 0 }}>EXCLUIR CONTA</h2>
                                <button onClick={() => setDeleteContaId(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                            </div>
                            <div style={{ padding: '20px 24px' }}>
                                <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
                                    Tem certeza que deseja excluir a conta <strong>"{deleteContaDesc}"</strong>?<br />
                                    Esta ação não pode ser desfeita.
                                </p>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                    <button onClick={() => setDeleteContaId(null)} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Cancelar</button>
                                    <button onClick={handleDelete} style={{ padding: '9px 20px', background: '#DC2626', border: 'none', color: '#fff', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>🗑️ Excluir</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </React.Fragment>
    );
}

export default function ContasPagarPage() {
    return (
        <Suspense fallback={(
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 24 }}>
                <style>{CSS}</style>
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#FFD600', animation: 'cp-ring 1s linear infinite' }} />
                    <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '2px solid transparent', borderBottomColor: 'rgba(255,214,0,.4)', animation: 'cp-ring2 .7s linear infinite' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>💰</div>
                </div>
                <div style={{ fontFamily: 'Orbitron', fontSize: '.72rem', color: '#B89B00', letterSpacing: '.2em' }}>CARREGANDO CONTAS...</div>
            </div>
        )}>
            <ContasPagarPageInner />
        </Suspense>
    );
}
