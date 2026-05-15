'use client';

// ─── Tipos mínimos necessários ────────────────────────────────────────────────
type StockItemRow = {
    nome: string;
    codigoInterno?: string | null;
    unidade: string;
    quantidadeAtual: number | string;
    quantidadeMinima: number | string;
    precoUnitario?: number | string | null;
    categoria?: string;
    localizacao?: string | null;
    validade?: string | Date | null;
    fornecedor?: string | null;
    observacoes?: string | null;
    status?: string;          // OK | BAIXO | CRITICO | SEM_MINIMO
};

type TruckStockRow = {
    stockItem?: {
        nome?: string;
        unidade?: string;
        precoUnitario?: number | string | null;
        categoria?: string;
    } | null;
    quantidadeAtual: number | string;
};

type MovimentacaoRow = {
    type?: string;
    quantidade?: number | string;
    stockItem?: { nome?: string; unidade?: string } | null;
    fromTruck?: { identifier?: string } | null;
    toTruck?: { identifier?: string } | null;
    registrar?: { name?: string } | null;
    observacao?: string | null;
    createdAt?: string | Date | null;
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function saveBufferAsFile(buffer: ArrayBuffer, filename: string) {
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function savePdfAsFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
        win.addEventListener('load', () => {
            win.focus();
            win.print();
        });
    }
}

function excelDate(v?: string | Date | null): string {
    if (!v) return '-';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR');
}

function excelDateTime(v?: string | Date | null): string {
    if (!v) return '-';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('pt-BR');
}

function num(v: any): number {
    return Number(v ?? 0);
}

function text(v: any): string {
    if (v === null || v === undefined || v === '') return '-';
    return String(v);
}

function brl(v: any): string {
    return num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusLabel(s?: string) {
    switch (s) {
        case 'CRITICO': return '🚨 Crítico';
        case 'BAIXO': return '⚠️ Baixo';
        case 'OK': return '✅ OK';
        case 'SEM_MINIMO': return '— Sem mínimo';
        default: return s || '-';
    }
}

function movTypeLabel(t?: string) {
    switch (t) {
        case 'ENTRADA': return '⬇️ Entrada';
        case 'SAIDA': return '⬆️ Saída';
        case 'REPOSICAO': return '🔁 Reposição';
        case 'DEVOLUCAO': return '↩️ Devolução';
        case 'AJUSTE': return '⚙️ Ajuste';
        case 'PERDA': return '❌ Perda';
        default: return t || '-';
    }
}

async function makeWorkbook() {
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sistema Qualifica';
    wb.created = new Date();
    return { ExcelJS, wb };
}

function styleTitle(sheet: any, title: string, subtitle: string, endCol = 'H') {
    sheet.mergeCells(`A1:${endCol}1`);
    sheet.getCell('A1').value = title;
    sheet.getCell('A1').font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFDD600' } };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A0A0F' } };
    sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.mergeCells(`A2:${endCol}2`);
    sheet.getCell('A2').value = subtitle;
    sheet.getCell('A2').font = { name: 'Calibri', size: 10, color: { argb: 'FF9CA3AF' } };
    sheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111118' } };
    sheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' };
}

function styleHeaderRow(row: any, headerArgb: string) {
    row.eachCell((cell: any) => {
        cell.font = { bold: true, color: { argb: 'FF1F2937' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerArgb } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };
    });
}

function styleDataRows(sheet: any, startRow: number, endRow: number) {
    for (let r = startRow; r <= endRow; r += 1) {
        const row = sheet.getRow(r);
        row.eachCell((cell: any) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            };
        });
    }
}

function styleTotalsRow(row: any) {
    row.eachCell((cell: any) => {
        cell.font = { bold: true, color: { argb: 'FF111827' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDE7' } };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFFDE68A' } },
            left: { style: 'thin', color: { argb: 'FFFDE68A' } },
            bottom: { style: 'thin', color: { argb: 'FFFDE68A' } },
            right: { style: 'thin', color: { argb: 'FFFDE68A' } },
        };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  XLSX – Estoque Central + Movimentações
// ─────────────────────────────────────────────────────────────────────────────
export async function exportEstoqueXlsx(
    items: StockItemRow[],
    movimentacoes: MovimentacaoRow[],
) {
    const { wb } = await makeWorkbook();

    // ── Aba 1: Estoque Central ──────────────────────────────────────────
    const sh1 = wb.addWorksheet('Estoque Central');
    const lastCol1 = 'K';
    styleTitle(sh1, '📦 Estoque Central – Sistema Qualifica', `Gerado em ${excelDateTime(new Date())}`, lastCol1);
    const h1 = ['Cód. Interno', 'Nome', 'Categoria', 'Unidade', 'Qtd. Atual', 'Qtd. Mínima', 'Status', 'Preço Unit.', 'Valor Total', 'Localização', 'Vencimento'];
    sh1.columns = [
        { width: 14 }, { width: 30 }, { width: 18 }, { width: 10 },
        { width: 12 }, { width: 12 }, { width: 14 }, { width: 14 },
        { width: 16 }, { width: 18 }, { width: 14 },
    ];
    const header1 = sh1.getRow(4);
    header1.values = h1;
    styleHeaderRow(header1, 'FFFEF9C3');

    let totalValor = 0;
    items.forEach((it) => {
        const qtd = num(it.quantidadeAtual);
        const preco = num(it.precoUnitario);
        const valor = qtd * preco;
        totalValor += valor;
        sh1.addRow([
            text(it.codigoInterno),
            text(it.nome),
            text(it.categoria),
            text(it.unidade),
            qtd,
            num(it.quantidadeMinima),
            statusLabel(it.status),
            preco,
            valor,
            text(it.localizacao),
            excelDate(it.validade),
        ]);
    });

    const s1 = 5;
    const e1 = Math.max(s1, sh1.rowCount);
    styleDataRows(sh1, s1, e1);
    // Formato moeda nas colunas H e I
    for (let r = s1; r <= e1; r++) {
        sh1.getCell(`H${r}`).numFmt = 'R$ #,##0.00';
        sh1.getCell(`I${r}`).numFmt = 'R$ #,##0.00';
    }
    const tot1 = sh1.addRow(['TOTAL', `${items.length} itens`, '', '', { formula: `SUM(E${s1}:E${e1})` }, '', '', '', { formula: `SUM(I${s1}:I${e1})` }, '', '']);
    tot1.getCell(9).numFmt = 'R$ #,##0.00';
    styleTotalsRow(tot1);
    sh1.autoFilter = { from: 'A4', to: `${lastCol1}4` };

    // ── Aba 2: Movimentações ────────────────────────────────────────────
    if (movimentacoes.length > 0) {
        const sh2 = wb.addWorksheet('Movimentações');
        const lastCol2 = 'H';
        styleTitle(sh2, '↕ Movimentações de Estoque', `Gerado em ${excelDateTime(new Date())}`, lastCol2);
        const h2 = ['Data', 'Tipo', 'Insumo', 'Unidade', 'Quantidade', 'Origem', 'Destino', 'Registrado Por'];
        sh2.columns = [
            { width: 18 }, { width: 14 }, { width: 28 }, { width: 10 },
            { width: 12 }, { width: 20 }, { width: 20 }, { width: 22 },
        ];
        const header2 = sh2.getRow(4);
        header2.values = h2;
        styleHeaderRow(header2, 'FFE0E7FF');

        movimentacoes.forEach((m) => {
            sh2.addRow([
                excelDateTime(m.createdAt),
                movTypeLabel(m.type),
                text(m.stockItem?.nome),
                text(m.stockItem?.unidade),
                num(m.quantidade),
                text(m.fromTruck?.identifier),
                text(m.toTruck?.identifier),
                text(m.registrar?.name),
            ]);
        });
        const s2 = 5;
        const e2 = Math.max(s2, sh2.rowCount);
        styleDataRows(sh2, s2, e2);
        styleTotalsRow(sh2.addRow(['TOTAL', '', '', '', { formula: `SUM(E${s2}:E${e2})` }, '', '', '']));
        sh2.autoFilter = { from: 'A4', to: `${lastCol2}4` };
    }

    const buffer = await wb.xlsx.writeBuffer();
    saveBufferAsFile(buffer as ArrayBuffer, `estoque-central-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  PDF GERAL – Relatório em HTML/Print
// ─────────────────────────────────────────────────────────────────────────────
export function exportEstoquePdfGeral(items: StockItemRow[], financialData?: any) {
    const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const totalItens = items.length;
    const totalCritico = items.filter(i => i.status === 'CRITICO').length;
    const totalBaixo = items.filter(i => i.status === 'BAIXO').length;
    const totalOK = items.filter(i => i.status === 'OK').length;
    const valorTotal = items.reduce((acc, i) => acc + num(i.quantidadeAtual) * num(i.precoUnitario), 0);

    const rows = items.map((it, idx) => {
        const st = it.status;
        const color = st === 'CRITICO' ? '#DC2626' : st === 'BAIXO' ? '#D97706' : '#059669';
        const bg = st === 'CRITICO' ? '#FEF2F2' : st === 'BAIXO' ? '#FFFBEB' : '#F0FDF4';
        return `
        <tr style="background:${idx % 2 === 0 ? '#fff' : '#F8FAFC'}">
            <td>${text(it.codigoInterno)}</td>
            <td><strong>${text(it.nome)}</strong></td>
            <td>${text(it.categoria)}</td>
            <td style="text-align:center">${num(it.quantidadeAtual)} ${text(it.unidade)}</td>
            <td style="text-align:center">${num(it.quantidadeMinima)}</td>
            <td style="text-align:right">${brl(it.precoUnitario)}</td>
            <td style="text-align:right;font-weight:700">${brl(num(it.quantidadeAtual) * num(it.precoUnitario))}</td>
            <td style="text-align:center;color:${color};background:${bg};font-weight:700;border-radius:6px;padding:2px 8px">${statusLabel(it.status)}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Estoque – ${hoje}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
  .header { background: #0f172a; color: #fff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 18px; font-weight: 900; letter-spacing: 0.05em; }
  .header .date { font-size: 10px; color: #94a3b8; margin-top: 4px; }
  .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; padding: 16px 24px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
  .kpi { background: #fff; border-radius: 10px; border: 1px solid #E2E8F0; padding: 12px; text-align: center; }
  .kpi .label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.08em; }
  .kpi .value { font-size: 22px; font-weight: 900; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 0 24px; width: calc(100% - 48px); }
  th { background: #0f172a; color: #fdd600; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; padding: 10px 8px; text-align: left; }
  td { padding: 8px; font-size: 10px; border-bottom: 1px solid #F1F5F9; }
  .section-title { padding: 16px 24px 8px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #334155; }
  .footer { text-align: center; font-size: 9px; color: #94a3b8; padding: 16px; border-top: 1px solid #E2E8F0; margin-top: 24px; }
  @media print { @page { size: A4 landscape; margin: 10mm; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="date">📅 Gerado em ${hoje}</div>
      <h1>📦 Relatório de Estoque Central</h1>
    </div>
    <div style="text-align:right;font-size:10px;color:#94a3b8">Sistema Qualifica</div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="label">Total de Itens</div><div class="value" style="color:#0F172A">${totalItens}</div></div>
    <div class="kpi"><div class="label">🚨 Críticos</div><div class="value" style="color:#DC2626">${totalCritico}</div></div>
    <div class="kpi"><div class="label">⚠️ Estoque Baixo</div><div class="value" style="color:#D97706">${totalBaixo}</div></div>
    <div class="kpi"><div class="label">✅ Status OK</div><div class="value" style="color:#059669">${totalOK}</div></div>
    <div class="kpi"><div class="label">💰 Valor Total</div><div class="value" style="color:#0891B2;font-size:15px">${brl(valorTotal)}</div></div>
  </div>

  <div class="section-title">Lista Completa de Insumos</div>
  <table>
    <thead>
      <tr>
        <th>Código</th><th>Nome</th><th>Categoria</th><th>Quantidade</th>
        <th>Qtd. Mínima</th><th>Preço Unit.</th><th>Valor Total</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr style="background:#FFFDE7;font-weight:700">
        <td colspan="3">TOTAL (${totalItens} itens)</td>
        <td></td><td></td><td></td>
        <td style="text-align:right">${brl(valorTotal)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">Relatório gerado automaticamente pelo Sistema Qualifica – ${hoje}</div>
</body>
</html>`;

    savePdfAsFile(html, `estoque-geral-${new Date().toISOString().slice(0, 10)}.html`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  PDF CAMINHÃO – Relatório por carreta
// ─────────────────────────────────────────────────────────────────────────────
export function exportEstoquePdfCaminhao(
    truckIdentifier: string,
    stocks: TruckStockRow[],
) {
    const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const valorTotal = stocks.reduce((acc, ts) => {
        return acc + num(ts.quantidadeAtual) * num(ts.stockItem?.precoUnitario);
    }, 0);

    const rows = stocks.map((ts, idx) => {
        const item = ts.stockItem;
        const qtd = num(ts.quantidadeAtual);
        const preco = num(item?.precoUnitario);
        return `
        <tr style="background:${idx % 2 === 0 ? '#fff' : '#F8FAFC'}">
            <td><strong>${text(item?.nome)}</strong></td>
            <td>${text(item?.categoria)}</td>
            <td style="text-align:center">${qtd} ${text(item?.unidade)}</td>
            <td style="text-align:right">${brl(preco)}</td>
            <td style="text-align:right;font-weight:700">${brl(qtd * preco)}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Estoque por Caminhão – ${truckIdentifier}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
  .header { background: #0f172a; color: #fff; padding: 20px 24px; }
  .header .badge { display: inline-block; background: #FDD600; color: #0f172a; font-size: 9px; font-weight: 900; padding: 3px 10px; border-radius: 20px; letter-spacing: 0.1em; margin-bottom: 6px; }
  .header h1 { font-size: 18px; font-weight: 900; }
  .header .date { font-size: 10px; color: #94a3b8; margin-top: 4px; }
  .kpis { display: flex; gap: 16px; padding: 16px 24px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
  .kpi { background: #fff; border-radius: 10px; border: 1px solid #E2E8F0; padding: 12px 20px; }
  .kpi .label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.08em; }
  .kpi .value { font-size: 22px; font-weight: 900; margin-top: 4px; }
  table { width: calc(100% - 48px); border-collapse: collapse; margin: 16px 24px; }
  th { background: #0f172a; color: #fdd600; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; padding: 10px 8px; text-align: left; }
  td { padding: 8px; font-size: 10px; border-bottom: 1px solid #F1F5F9; }
  .footer { text-align: center; font-size: 9px; color: #94a3b8; padding: 16px; border-top: 1px solid #E2E8F0; margin-top: 24px; }
  @media print { @page { size: A4; margin: 10mm; } }
</style>
</head>
<body>
  <div class="header">
    <div class="badge">🚛 ESTOQUE POR CAMINHÃO</div>
    <h1>${truckIdentifier}</h1>
    <div class="date">📅 Gerado em ${hoje}</div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="label">Tipos de Insumo</div><div class="value" style="color:#0F172A">${stocks.length}</div></div>
    <div class="kpi"><div class="label">💰 Valor Total em Estoque</div><div class="value" style="color:#059669;font-size:16px">${brl(valorTotal)}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Insumo</th><th>Categoria</th><th>Quantidade</th><th>Preço Unit.</th><th>Valor Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr style="background:#FFFDE7;font-weight:700">
        <td colspan="2">TOTAL (${stocks.length} itens)</td>
        <td></td><td></td>
        <td style="text-align:right">${brl(valorTotal)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">Relatório gerado automaticamente pelo Sistema Qualifica – ${hoje}</div>
</body>
</html>`;

    savePdfAsFile(html, `estoque-caminhao-${truckIdentifier}-${new Date().toISOString().slice(0, 10)}.html`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  PDF TODOS OS CAMINHÕES – Um relatório consolidado com seção por carreta
// ─────────────────────────────────────────────────────────────────────────────
export function exportEstoquePdfTodosCaminhoes(
    trucks: { identifier: string; stocks: TruckStockRow[] }[],
) {
    const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    const grandTotal = trucks.reduce((acc, t) =>
        acc + t.stocks.reduce((a, ts) => a + num(ts.quantidadeAtual) * num(ts.stockItem?.precoUnitario), 0), 0);

    const truckSections = trucks.map((t) => {
        const valorTruck = t.stocks.reduce((acc, ts) => acc + num(ts.quantidadeAtual) * num(ts.stockItem?.precoUnitario), 0);
        const rows = t.stocks.map((ts, idx) => {
            const item = ts.stockItem;
            const qtd = num(ts.quantidadeAtual);
            const preco = num(item?.precoUnitario);
            return `
            <tr style="background:${idx % 2 === 0 ? '#fff' : '#F8FAFC'}">
                <td><strong>${text(item?.nome)}</strong></td>
                <td>${text(item?.categoria)}</td>
                <td style="text-align:center">${qtd} ${text(item?.unidade)}</td>
                <td style="text-align:right">${brl(preco)}</td>
                <td style="text-align:right;font-weight:700">${brl(qtd * preco)}</td>
            </tr>`;
        }).join('');

        const emptyRow = t.stocks.length === 0
            ? `<tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:20px">Sem insumos nesta carreta</td></tr>`
            : '';

        return `
        <div class="truck-section">
            <div class="truck-header">
                <span class="truck-badge">🚛 CARRETA</span>
                <span class="truck-id">${text(t.identifier)}</span>
                <span class="truck-valor">${brl(valorTruck)}</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Insumo</th><th>Categoria</th><th>Quantidade</th><th>Preço Unit.</th><th>Valor Total</th>
                    </tr>
                </thead>
                <tbody>${rows}${emptyRow}</tbody>
                <tfoot>
                    <tr style="background:#FFFDE7;font-weight:700">
                        <td colspan="2">SUBTOTAL (${t.stocks.length} itens)</td>
                        <td></td><td></td>
                        <td style="text-align:right">${brl(valorTruck)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Estoque Consolidado – Todas as Carretas</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
  .header { background: #0f172a; color: #fff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 18px; font-weight: 900; letter-spacing: 0.05em; }
  .header .date { font-size: 10px; color: #94a3b8; margin-top: 4px; }
  .summary { display: flex; gap: 16px; padding: 14px 24px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
  .kpi { background: #fff; border-radius: 10px; border: 1px solid #E2E8F0; padding: 10px 18px; }
  .kpi .label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748B; letter-spacing: 0.08em; }
  .kpi .value { font-size: 20px; font-weight: 900; margin-top: 4px; }
  .truck-section { margin: 0 24px 28px; }
  .truck-header { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #1e293b; color: #fff; border-radius: 10px 10px 0 0; }
  .truck-badge { background: #FDD600; color: #0f172a; font-size: 8px; font-weight: 900; padding: 2px 8px; border-radius: 20px; letter-spacing: 0.1em; }
  .truck-id { font-weight: 900; font-size: 14px; flex: 1; }
  .truck-valor { font-size: 12px; font-weight: 700; color: #86efac; }
  table { width: 100%; border-collapse: collapse; border: 1px solid #E2E8F0; }
  th { background: #334155; color: #fdd600; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; padding: 8px 10px; text-align: left; }
  td { padding: 7px 10px; font-size: 10px; border-bottom: 1px solid #F1F5F9; }
  .section-label { padding: 20px 24px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; border-top: 2px solid #E2E8F0; margin-top: 8px; }
  .footer { text-align: center; font-size: 9px; color: #94a3b8; padding: 16px; border-top: 1px solid #E2E8F0; margin-top: 16px; }
  @media print { @page { size: A4; margin: 10mm; } .truck-section { page-break-inside: avoid; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="date">📅 Gerado em ${hoje}</div>
      <h1>🚛 Estoque Consolidado – Todas as Carretas</h1>
    </div>
    <div style="text-align:right;font-size:10px;color:#94a3b8">Sistema Qualifica</div>
  </div>

  <div class="summary">
    <div class="kpi"><div class="label">Total de Carretas</div><div class="value" style="color:#0F172A">${trucks.length}</div></div>
    <div class="kpi"><div class="label">💰 Valor Total Consolidado</div><div class="value" style="color:#059669;font-size:15px">${brl(grandTotal)}</div></div>
  </div>

  <div class="section-label">Detalhamento por Carreta</div>
  ${truckSections}

  <div class="footer">Relatório gerado automaticamente pelo Sistema Qualifica – ${hoje}</div>
</body>
</html>`;

    savePdfAsFile(html, `estoque-todas-carretas-${new Date().toISOString().slice(0, 10)}.html`);
}
