'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
    getContasPagar, createContaPagar, updateContaPagar,
    marcarComoPaga, deleteContaPagar, ContaPagar, ContasPagarResponse,
} from '@/lib/api/contasPagar';
import api from '@/lib/api/client';

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

// ── Tipos de conta (igual Sistema Carreta) ──────────────────────────────────
const TIPOS_ESTRADA = [
    { value: 'pneu_furado', label: 'Pneu Furado', icon: '🛞', color: '#DC3545' },
    { value: 'troca_oleo', label: 'Troca de Óleo', icon: '🛢️', color: '#F97316' },
    { value: 'abastecimento', label: 'Abastecimento', icon: '⛽', color: '#10B981' },
    { value: 'manutencao_mecanica', label: 'Manutenção Mecânica', icon: '🔧', color: '#6366F1' },
    { value: 'manutencao', label: 'Manutenção Caminhão', icon: '🛠️', color: '#7C3AED' },
    { value: 'reboque', label: 'Reboque', icon: '🚛', color: '#EC4899' },
    { value: 'lavagem', label: 'Lavagem', icon: '🧼', color: '#06B6D4' },
    { value: 'pedagio', label: 'Pedágio', icon: '🛣️', color: '#84CC16' },
];
const TIPOS_HABITUAL = [
    { value: 'agua', label: 'Água', icon: '💧', color: '#3B82F6' },
    { value: 'energia', label: 'Energia', icon: '⚡', color: '#F59E0B' },
    { value: 'aluguel', label: 'Aluguel', icon: '🏠', color: '#8B5CF6' },
    { value: 'internet', label: 'Internet', icon: '🌐', color: '#10B981' },
    { value: 'telefone', label: 'Telefone', icon: '📱', color: '#06B6D4' },
];
const TIPOS_OUTROS = [
    { value: 'funcionario', label: 'Funcionário', icon: '👤', color: '#2563EB' },
    { value: 'espontaneo', label: 'Personalizado', icon: '✨', color: '#A855F7' },
    { value: 'outros', label: 'Outros', icon: '📦', color: '#64748B' },
];
const TODOS_TIPOS = [...TIPOS_ESTRADA, ...TIPOS_HABITUAL, ...TIPOS_OUTROS];
const getTipo = (v: string) => TODOS_TIPOS.find(t => t.value === v) ?? { label: v, icon: '📄', color: '#6B7280' };

const STATUS_CFG = {
    pendente: { label: 'Pendente', icon: '⏳', color: '#D97706', bg: 'rgba(251,191,36,.12)', border: 'rgba(251,191,36,.35)' },
    paga: { label: 'Paga', icon: '✅', color: '#059669', bg: 'rgba(16,185,129,.1)', border: 'rgba(16,185,129,.35)' },
    vencida: { label: 'Vencida', icon: '🔴', color: '#DC2626', bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.35)' },
    cancelada: { label: 'Cancelada', icon: '🚫', color: '#6B7280', bg: 'rgba(107,114,128,.1)', border: 'rgba(107,114,128,.3)' },
};

const fmtCur = (v: number | string) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiStatus({ k, value, i }: { k: keyof typeof STATUS_CFG; value: number; i: number }) {
    const s = STATUS_CFG[k];
    return (
        <div className="cp-card3d" style={{
            borderRadius: 16, padding: '18px 20px',
            background: s.bg, border: `1px solid ${s.border}`,
            borderLeft: `4px solid ${s.color}`,
            boxShadow: '0 3px 16px rgba(0,0,0,.06)',
            animation: `cp-fade-up .5s ${i * .08}s both`,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>{s.icon}</div>
                <span style={{ color: '#6B7280', fontSize: '.85rem', fontWeight: 600 }}>{s.label}</span>
            </div>
            <div style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '1.2rem', color: s.color }}>{fmtCur(value)}</div>
        </div>
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
    const [tipoSel, setTipoSel] = useState<typeof TODOS_TIPOS[0] | null>(editing ? (getTipo(conta!.tipo_conta) as any) : null);
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

    const selTipo = (t: typeof TODOS_TIPOS[0]) => {
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)', padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 700, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 96px rgba(0,0,0,.35)', animation: 'cp-modal-in .3s cubic-bezier(.16,1,.3,1)' }}>
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563EB)', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>💲</div>
                    <div>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '.58rem', color: 'rgba(255,255,255,.6)', letterSpacing: '.15em' }}>UPGRADE // FINANCEIRO</div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>{editing ? 'Editar Conta' : 'Nova Conta'}</div>
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
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function ContasPagarPage() {
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
            const d = await getContasPagar({
                tipo_conta: filterTipo || undefined,
                status: filterStatus || undefined,
                cidade: filterCidade || undefined,
                data_inicio: filterDataInicio || undefined,
                data_fim: filterDataFim || undefined,
                search: searchTerm || undefined,
            });
            setResp(d);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [filterTipo, filterStatus, filterCidade, filterDataInicio, filterDataFim, searchTerm]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        api.get('/acoes').then(r => setAcoes(r.data.map((a: any) => ({ id: a.id, nome: a.nome })))).catch(() => { });
    }, []);

    const onMouse = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = heroRef.current?.getBoundingClientRect();
        if (r) setMousePos({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
    };

    const handleDelete = async () => {
        if (!deleteContaId) return;
        try { await deleteContaPagar(deleteContaId); setDeleteContaId(null); load(); } catch { alert('Erro ao excluir conta.'); setDeleteContaId(null); }
    };

    const handlePagar = async (id: string) => {
        try { await marcarComoPaga(id); load(); } catch { alert('Erro ao marcar como paga.'); }
    };

    const openEdit = (c: ContaPagar) => { setEditingConta(c); setShowModal(true); };
    const openNew = () => { setEditingConta(null); setShowModal(true); };
    const onSaved = () => { setShowModal(false); load(); };

    const totalGeral = resp ? Number(resp.totaisPorStatus.pendente) + Number(resp.totaisPorStatus.paga) + Number(resp.totaisPorStatus.vencida) + Number(resp.totaisPorStatus.cancelada) : 0;
    const contas = resp?.contas ?? [];

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
                                    { icon: '🖨️', label: 'PDF Profissional', sub: 'Abre prévia para imprimir', color: '#f97316', action: () => { gerarRelatorioPDF(contas, resp?.totaisPorStatus ?? {}, { tipo: filterTipo, status: filterStatus, cidade: filterCidade, 'período de': filterDataInicio, 'período até': filterDataFim }); setShowReport(false); } },
                                    { icon: '📊', label: 'Exportar CSV', sub: 'Compatível com Excel', color: '#22c55e', action: () => { exportarCSV(contas); setShowReport(false); } },
                                    { icon: '{ }', label: 'Exportar JSON', sub: 'Para integrações', color: '#60a5fa', action: () => { exportarJSON(contas); setShowReport(false); } },
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
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)', textAlign: 'center' }}>{contas.length} lançamentos · {new Date().toLocaleDateString('pt-BR')}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── KPI POR STATUS ─────────────────────── */}
            {resp && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
                    {(Object.keys(STATUS_CFG) as (keyof typeof STATUS_CFG)[]).map((k, i) => (
                        <KpiStatus key={k} k={k} value={Number(resp.totaisPorStatus[k] ?? 0)} i={i} />
                    ))}
                    <div className="cp-card3d" style={{ borderRadius: 16, padding: '18px 20px', background: 'rgba(255,214,0,.06)', border: '1px solid rgba(255,214,0,.3)', borderLeft: '4px solid #FFD600', boxShadow: '0 3px 16px rgba(0,0,0,.06)', animation: 'cp-fade-up .5s .32s both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,214,0,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>📊</div>
                            <span style={{ color: '#6B7280', fontSize: '.85rem', fontWeight: 600 }}>Total Geral</span>
                        </div>
                        <div style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1.2rem', color: '#FFD600', filter: 'drop-shadow(0 0 8px rgba(255,214,0,.4))' }}>{fmtCur(totalGeral)}</div>
                    </div>
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
                    <span style={{ fontFamily: 'Orbitron', fontSize: '.62rem', fontWeight: 800, color: '#FFD600', letterSpacing: '.13em' }}>LANÇAMENTOS ({contas.length})</span>
                    <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#FFD600', boxShadow: '0 0 7px #FFD600', animation: 'cp-pulse-dot 1.5s infinite' }} />
                </div>
                {/* FEAT-CP3: Tabs de status rápidas */}
                <div style={{ background: '#fff', borderLeft: '1px solid rgba(255,214,0,.15)', borderRight: '1px solid rgba(255,214,0,.15)', padding: '10px 16px', display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid #F3F4F6' }}>
                    {[
                        { label: 'Todos', value: '', icon: '📋', count: contas.length },
                        { label: 'Pendentes', value: 'pendente', icon: '⏳', count: contas.filter(c => c.status === 'pendente').length },
                        { label: 'Pagas', value: 'paga', icon: '✅', count: contas.filter(c => c.status === 'paga').length },
                        { label: 'Vencidas', value: 'vencida', icon: '🔴', count: contas.filter(c => c.status === 'vencida').length },
                        { label: 'Canceladas', value: 'cancelada', icon: '🚫', count: contas.filter(c => c.status === 'cancelada').length },
                    ].map(tab => {
                        const active = filterStatus === tab.value;
                        return (
                            <button key={tab.value} onClick={() => { setFilterStatus(tab.value); }}
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

                {contas.length === 0 ? (
                    <div style={{ background: '#fff', borderRadius: '0 0 14px 14px', border: '1px solid rgba(255,214,0,.15)', borderTop: 'none', padding: 48, textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📄</div>
                        <div style={{ fontFamily: 'Orbitron', fontSize: '.8rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '.1em' }}>NENHUMA CONTA ENCONTRADA</div>
                        <div style={{ color: '#D1D5DB', fontSize: '.82rem', marginTop: 6 }}>Clique em <b>+ NOVA CONTA</b> para registrar.</div>
                        <button onClick={openNew} style={{ marginTop: 18, padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '.88rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,.3)' }}>+ Nova Conta</button>
                    </div>
                ) : (
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
                        {contas.map((c, i) => {
                            const tipo = getTipo(c.tipo_conta);
                            const st = STATUS_CFG[c.status] ?? STATUS_CFG.pendente;
                            const vencida = c.status === 'pendente' && new Date(c.data_vencimento) < new Date();
                            return (
                                <div key={c.id} style={{
                                    background: '#fff',
                                    borderRadius: 14,
                                    border: '1px solid #E5E7EB',
                                    padding: 16,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                    boxShadow: '0 2px 10px rgba(0,0,0,.06)',
                                    transition: 'transform .18s, box-shadow .18s',
                                    animation: `cp-fade-up .35s ${Math.min(i, 8) * .04}s both`,
                                    cursor: 'default',
                                }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,.1)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 10px rgba(0,0,0,.06)'; }}
                                >
                                    {/* Topo: ícone + status badge */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 11,
                                            background: `${tipo.color}18`,
                                            border: `1px solid ${tipo.color}40`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.25rem', flexShrink: 0,
                                        }}>{tipo.icon}</div>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            padding: '3px 10px', borderRadius: 100,
                                            background: st.bg, border: `1px solid ${st.border}`,
                                            fontSize: '.68rem', fontWeight: 700, color: st.color,
                                        }}>{st.icon} {st.label}</span>
                                    </div>

                                    {/* Tipo e descrição */}
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '.9rem', color: tipo.color, marginBottom: 2 }}>
                                            {tipo.label}
                                            {c.recorrente && <span style={{ marginLeft: 5, fontSize: '.62rem', background: 'rgba(37,99,235,.1)', color: '#2563EB', border: '1px solid rgba(37,99,235,.25)', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>↻</span>}
                                        </div>
                                        <div style={{ fontSize: '.78rem', color: '#6B7280', lineHeight: 1.4, wordBreak: 'break-word' }}>
                                            {c.descricao}
                                            {c.acao && (
                                                <div style={{ marginTop: 2 }}>
                                                    <Link href={`/admin/acoes/${c.acao.id}`} style={{ textDecoration: 'none', color: '#B89B00', fontSize: '.7rem', fontWeight: 600 }}>⚡ {c.acao.nome}</Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Valor */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ color: '#2563EB', fontWeight: 700, fontSize: '.85rem' }}>$</span>
                                        <span style={{
                                            fontWeight: 800, fontSize: '.97rem',
                                            color: c.status === 'paga' ? '#059669' : c.status === 'vencida' ? '#DC2626' : '#111827',
                                        }}>{fmtCur(c.valor)}</span>
                                    </div>

                                    {/* Data + Cidade */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem', color: vencida ? '#DC2626' : '#6B7280', fontWeight: vencida ? 700 : 400 }}>
                                            <span>📅</span> {fmtDate(c.data_vencimento)}
                                        </div>
                                        {c.cidade && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem', color: '#6B7280' }}>
                                                <span>📍</span> {c.cidade}
                                            </div>
                                        )}
                                    </div>

                                    {/* Separador */}
                                    <div style={{ borderTop: '1px solid #F3F4F6' }} />

                                    {/* Botões */}
                                    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                                        <span style={{ fontSize: '.8rem', color: '#D1D5DB', cursor: 'default' }}>📎</span>
                                        <button onClick={() => openEdit(c)}
                                            style={{
                                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                                padding: '6px 0', borderRadius: 8,
                                                background: '#F9FAFB', border: '1px solid #E5E7EB',
                                                color: '#374151', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer',
                                                transition: 'all .15s',
                                            }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#EFF6FF'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#2563EB'; (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
                                        >✏️ Editar</button>
                                        {c.status === 'pendente' && (
                                            <button title="Marcar como paga" onClick={() => handlePagar(c.id)}
                                                style={{ padding: '6px 9px', borderRadius: 8, background: 'rgba(5,150,105,.08)', border: '1px solid rgba(5,150,105,.3)', color: '#059669', fontSize: '.82rem', cursor: 'pointer', fontWeight: 700 }}>✅</button>
                                        )}
                                        <button title="Excluir" onClick={() => { setDeleteContaId(c.id); setDeleteContaDesc(c.descricao); }}
                                            style={{ padding: '6px 9px', borderRadius: 8, background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.25)', color: '#DC2626', fontSize: '.82rem', cursor: 'pointer' }}>🗑️</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Rodapé total */}
                {contas.length > 0 && (
                    <div style={{ marginTop: 12, padding: '10px 18px', borderRadius: 10, background: 'linear-gradient(135deg,rgba(255,214,0,.06),rgba(255,214,0,.02))', border: '1px solid rgba(255,214,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'Orbitron', fontSize: '.62rem', fontWeight: 800, color: '#B89B00', letterSpacing: '.1em' }}>TOTAL — {contas.length} LANÇAMENTOS</span>
                        <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '.96rem', color: '#FFD600', filter: 'drop-shadow(0 0 8px rgba(255,214,0,.4))' }}>
                            {fmtCur(contas.reduce((s, c) => s + Number(c.valor), 0))}
                        </span>
                    </div>
                )}
            </div>
        </div>
        {/* FEAT-CP2: Modal de confirmação de exclusão */}
        {deleteContaId && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
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
        )}
        </React.Fragment>
    );
}
