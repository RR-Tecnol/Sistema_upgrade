'use client';

import type { AxiosInstance } from 'axios';

type DashboardPayload = {
    meta: { role: string; roleLabel: string; start: string; end: string };
    summary: {
        totalFuncionarios: number;
        diasPeriodo: number;
        mediaPercentual: number;
        acima80: number;
        emRisco: number;
    };
    records: Array<{
        ordem: number;
        employeeId: string;
        nome: string;
        role: string;
        presencas: number;
        faltas: number;
        justificadas: number;
        totalLancamentos: number;
        percentual: number;
    }>;
};

function saveBuffer(buffer: ArrayBuffer, filename: string) {
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

export async function downloadEmployeeFrequencyDashboardXlsx(
    api: AxiosInstance,
    role: 'TEACHER' | 'DRIVER',
    start: string,
    end: string,
) {
    const ExcelJS = await import('exceljs');
    const { data } = await api.get<DashboardPayload>('/reports/employees/attendance/data', {
        params: { role, start, end },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sistema Qualifica';
    wb.created = new Date();

    const basePainel = wb.addWorksheet('Base_Painel');
    const baseFuncionarios = wb.addWorksheet('Base_Funcionarios');
    basePainel.state = 'hidden';
    baseFuncionarios.state = 'hidden';

    basePainel.getCell('A4').value = 'Total';
    basePainel.getCell('A5').value = 'Média %';
    basePainel.getCell('A6').value = '>=80%';
    basePainel.getCell('A7').value = 'Risco';
    basePainel.getCell('B4').value = data.summary.totalFuncionarios;
    basePainel.getCell('B5').value = data.summary.mediaPercentual;
    basePainel.getCell('B6').value = data.summary.acima80;
    basePainel.getCell('B7').value = data.summary.emRisco;

    const dash = wb.addWorksheet('📊 Dashboard', {
        views: [{ state: 'frozen', ySplit: 9, xSplit: 1, showGridLines: false }],
    });
    dash.getColumn(1).width = 2;
    dash.getColumn(2).width = 32;
    for (let c = 3; c <= 5; c += 1) dash.getColumn(c).width = 12;
    for (let c = 6; c <= 10; c += 1) dash.getColumn(c).width = 11;
    dash.mergeCells('B2:F2');
    dash.getCell('B2').value = `DASHBOARD DE FREQUÊNCIA — ${data.meta.roleLabel.toUpperCase()}`;
    dash.getCell('B2').font = { bold: true, size: 20, color: { argb: 'FF1E3A8A' } };
    dash.mergeCells('B3:F3');
    dash.getCell('B3').value = `Período customizado: ${data.meta.start} até ${data.meta.end}`;
    dash.getCell('B3').font = { size: 11, color: { argb: 'FF6B7280' } };

    const kTitles = ['Total', 'Média Turma', 'Acima de 80%', 'Em Risco (<80%)'];
    const kHead = ['B5', 'C5', 'D5', 'E5'];
    const kVals = ['B6', 'C6', 'D6', 'E6'];
    const kForm = ["='Base_Painel'!B4", "='Base_Painel'!B5/100", "='Base_Painel'!B6", "='Base_Painel'!B7"];
    for (let i = 0; i < 4; i += 1) {
        const h = dash.getCell(kHead[i]);
        h.value = kTitles[i];
        h.font = { bold: true, size: 10, color: { argb: 'FF6B7280' } };
        h.alignment = { horizontal: 'center', vertical: 'middle' };
        h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        h.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };
        const v = dash.getCell(kVals[i]);
        v.value = { formula: kForm[i] };
        v.font = { bold: true, size: 24, color: { argb: 'FF111827' } };
        v.alignment = { horizontal: 'center', vertical: 'middle' };
        v.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        v.border = {
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };
    }
    dash.getCell('C6').numFmt = '0.0%';

    baseFuncionarios.columns = [
        { width: 6 },
        { width: 34 },
        { width: 18 },
        { width: 8 },
        { width: 8 },
        { width: 8 },
        { width: 12 },
        { width: 12 },
    ];
    baseFuncionarios.addRow(['#', 'Nome', 'Perfil', 'P', 'F', 'J', 'Total', 'Freq %']);
    for (const row of data.records) {
        baseFuncionarios.addRow([
            row.ordem,
            row.nome,
            row.role,
            row.presencas,
            row.faltas,
            row.justificadas,
            row.totalLancamentos,
            row.percentual / 100,
        ]);
    }
    baseFuncionarios.getColumn(8).numFmt = '0.0%';

    const hRow = 9;
    const headers = ['Nome', 'Perfil', 'P', 'F', 'J', 'Freq %'];
    headers.forEach((h, i) => {
        const c = dash.getCell(hRow, i + 2);
        c.value = h;
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
    });
    for (let i = 0; i < data.records.length; i += 1) {
        const r = i + 10;
        const src = i + 2;
        dash.getCell(`B${r}`).value = { formula: `=IF('Base_Funcionarios'!B${src}="","",'Base_Funcionarios'!B${src})` };
        dash.getCell(`C${r}`).value = { formula: `=IF(B${r}="","",'Base_Funcionarios'!C${src})` };
        dash.getCell(`D${r}`).value = { formula: `=IF(B${r}="","",'Base_Funcionarios'!D${src})` };
        dash.getCell(`E${r}`).value = { formula: `=IF(B${r}="","",'Base_Funcionarios'!E${src})` };
        dash.getCell(`F${r}`).value = { formula: `=IF(B${r}="","",'Base_Funcionarios'!F${src})` };
        dash.getCell(`G${r}`).value = { formula: `=IF(B${r}="","",'Base_Funcionarios'!H${src})` };
        dash.getCell(`G${r}`).numFmt = '0.0%';
    }

    const ws = wb.addWorksheet('Funcionarios');
    ws.columns = [
        { width: 6 },
        { width: 34 },
        { width: 18 },
        { width: 8 },
        { width: 8 },
        { width: 8 },
        { width: 12 },
        { width: 12 },
    ];
    ws.addRow(['#', 'Nome', 'Perfil', 'P', 'F', 'J', 'Total', 'Freq %']);
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    for (const row of data.records) {
        ws.addRow([
            row.ordem,
            row.nome,
            row.role,
            row.presencas,
            row.faltas,
            row.justificadas,
            row.totalLancamentos,
            row.percentual / 100,
        ]);
    }
    ws.getColumn(8).numFmt = '0.0%';
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const buf = await wb.xlsx.writeBuffer();
    saveBuffer(
        buf as ArrayBuffer,
        `frequencia-${data.meta.role.toLowerCase()}-${data.meta.start}-${data.meta.end}.xlsx`,
    );
}

