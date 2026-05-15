'use client';

import type { AxiosInstance } from 'axios';

type DashboardPayload = {
    classInfo?: {
        classIdentifier?: string;
        course?: { name?: string; workloadHours?: number };
        city?: { name?: string; state?: string };
        startDate?: string;
        endDate?: string;
    };
    summary?: Record<string, unknown>;
    period?: { start?: string; end?: string };
    lessonDates?: string[];
    students?: Array<{
        ordem: number;
        studentId: string;
        nome: string;
        presencas: number;
        faltas: number;
        percentual: number;
        statusLinha: string;
    }>;
    matrix?: {
        dates?: string[];
        byStudent?: Record<string, Record<string, boolean>>;
    };
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

function excelCol(n: number): string {
    let x = n;
    let s = '';
    while (x > 0) {
        const rem = (x - 1) % 26;
        s = String.fromCharCode(65 + rem) + s;
        x = Math.floor((x - 1) / 26);
    }
    return s;
}

function shiftDays(iso: string, days: number): string {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export async function downloadFrequencyDashboardXlsx(
    api: AxiosInstance,
    classId: string,
    start?: string,
    end?: string,
): Promise<void> {
    const ExcelJS = await import('exceljs');
    const { data } = await api.get<DashboardPayload>(`/reports/frequency/${classId}/data`, {
        params: { start, end },
    });
    const period = data.period ?? { start: start || '', end: end || '' };
    const pStart = period.start || start || new Date().toISOString().slice(0, 10);
    const pEnd = period.end || end || new Date().toISOString().slice(0, 10);
    const rangeDays =
        Math.max(
            1,
            Math.floor(
                (new Date(`${pEnd}T00:00:00Z`).getTime() - new Date(`${pStart}T00:00:00Z`).getTime()) /
                    86400000,
            ) + 1,
        );
    const prevStart = shiftDays(pStart, -rangeDays);
    const prevEnd = shiftDays(pEnd, -rangeDays);
    const prevRes = await api.get<DashboardPayload>(`/reports/frequency/${classId}/data`, {
        params: { start: prevStart, end: prevEnd },
    });
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sistema Qualifica';
    wb.created = new Date();

    const course = data.classInfo?.course?.name ?? '—';
    const turma = data.classInfo?.classIdentifier ?? classId.slice(0, 8);
    const city = data.classInfo?.city
        ? `${data.classInfo.city.name}/${data.classInfo.city.state}`
        : '—';

    const s = data.summary ?? {};
    const prevS = prevRes.data.summary ?? {};
    const students = data.students ?? [];
    const dates = [...(data.lessonDates ?? data.matrix?.dates ?? [])].sort();
    const bySt = data.matrix?.byStudent ?? {};

    // ── Abas base (back-end) ──
    const basePainel = wb.addWorksheet('Base_Painel');
    const baseAlunos = wb.addWorksheet('Base_Alunos');
    const baseMatriz = wb.addWorksheet('Base_Matriz');
    const modelMetrics = wb.addWorksheet('Model_Metrics');
    basePainel.state = 'hidden';
    baseAlunos.state = 'hidden';
    baseMatriz.state = 'hidden';
    modelMetrics.state = 'hidden';

    basePainel.getCell('A1').value = 'Infos';
    basePainel.getCell('A4').value = 'Total de alunos';
    basePainel.getCell('A6').value = '>=80%';
    basePainel.getCell('A7').value = 'Em risco (<80%)';
    basePainel.getCell('A8').value = 'Média %';
    basePainel.getCell('B4').value = Number(s.totalAlunos ?? students.length ?? 0);
    basePainel.getCell('B6').value = Number(s.aprovados ?? 0);
    basePainel.getCell('B7').value = Number(s.emRisco ?? 0);
    basePainel.getCell('B8').value = Number(s.mediaPercentualTurma ?? 0);
    basePainel.getCell('A10').value = 'Prev Total';
    basePainel.getCell('A11').value = 'Prev >=80%';
    basePainel.getCell('A12').value = 'Prev Risco';
    basePainel.getCell('A13').value = 'Prev Média %';
    basePainel.getCell('B10').value = Number(prevS.totalAlunos ?? 0);
    basePainel.getCell('B11').value = Number(prevS.aprovados ?? 0);
    basePainel.getCell('B12').value = Number(prevS.emRisco ?? 0);
    basePainel.getCell('B13').value = Number(prevS.mediaPercentualTurma ?? 0);

    baseAlunos.addRow(['ID', 'Nome', 'ID Aluno', 'P', 'F', '%', 'Status']);
    for (const st of students) {
        baseAlunos.addRow([
            st.ordem,
            st.nome,
            st.studentId,
            st.presencas,
            st.faltas,
            st.percentual / 100,
            st.statusLinha,
        ]);
    }

    baseMatriz.addRow(['Ordem', 'Nome', ...dates.map((d) => d.slice(5))]);
    for (const st of students) {
        const m = bySt[st.studentId] as Record<string, boolean> | undefined;
        baseMatriz.addRow([
            st.ordem,
            st.nome,
            ...dates.map((d) => {
                if (!m || m[d] === undefined) return '';
                return m[d] ? 'P' : 'F';
            }),
        ]);
    }

    modelMetrics.getCell('A1').value = 'Metric';
    modelMetrics.getCell('B1').value = 'Value';
    modelMetrics.getCell('C1').value = 'DeltaAbs';
    modelMetrics.getCell('D1').value = 'DeltaPct';
    const mmRows = [
        ['Total', "='Base_Painel'!B4", "='Base_Painel'!B4-'Base_Painel'!B10", '=IF(\'Base_Painel\'!B10=0,0,C2/\'Base_Painel\'!B10)'],
        ['>=80%', "='Base_Painel'!B6", "='Base_Painel'!B6-'Base_Painel'!B11", '=IF(\'Base_Painel\'!B11=0,0,C3/\'Base_Painel\'!B11)'],
        ['Risco', "='Base_Painel'!B7", "='Base_Painel'!B7-'Base_Painel'!B12", '=IF(\'Base_Painel\'!B12=0,0,C4/\'Base_Painel\'!B12)'],
        ['Média%', "='Base_Painel'!B8/100", "=('Base_Painel'!B8-'Base_Painel'!B13)/100", '=IF(\'Base_Painel\'!B13=0,0,C5/(\'Base_Painel\'!B13/100))'],
    ] as const;
    mmRows.forEach((r0, idx) => {
        const r = idx + 2;
        modelMetrics.getCell(`A${r}`).value = r0[0];
        modelMetrics.getCell(`B${r}`).value = { formula: r0[1] };
        modelMetrics.getCell(`C${r}`).value = { formula: r0[2] };
        modelMetrics.getCell(`D${r}`).value = { formula: r0[3] };
    });
    modelMetrics.getCell('B5').numFmt = '0.00%';
    modelMetrics.getCell('C5').numFmt = '0.00%';
    modelMetrics.getColumn(4).numFmt = '0.00%';

    // ── Dashboard (front-end) ──
    const dash = wb.addWorksheet('Dash_Executive', {
        views: [{ state: 'frozen', ySplit: 9, xSplit: 1, showGridLines: false }],
    });
    dash.getColumn(1).width = 2;
    dash.getColumn(2).width = 30;
    for (let c = 3; c <= 5; c += 1) dash.getColumn(c).width = 12;
    const endCol = Math.max(6, 6 + dates.length + 4);
    for (let c = 6; c <= endCol; c += 1) dash.getColumn(c).width = 5;

    dash.getCell('B2').value = 'DASHBOARD DE FREQUÊNCIA E RETENÇÃO';
    dash.getCell('B2').font = { bold: true, size: 20, color: { argb: 'FF1E3A8A' } };
    dash.getCell('B3').value = `${course} · ${turma} · ${city} · Período ${pStart} até ${pEnd}`;
    dash.getCell('B3').font = { size: 11, color: { argb: 'FF6B7280' } };

    const kpiHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } } as const;
    const kpiBorderColor = { argb: 'FFD1D5DB' };
    const kpiHeader = ['B5', 'C5', 'D5', 'E5'];
    const kpiValue = ['B6', 'C6', 'D6', 'E6'];
    const kpiTitles = ['Total de Alunos', 'Média Turma', 'Acima de 80%', 'Em Risco (<80%)'];
    const kpiFormulas = ["='Model_Metrics'!B2", "='Model_Metrics'!B5", "='Model_Metrics'!B3", "='Model_Metrics'!B4"];
    for (let i = 0; i < kpiHeader.length; i += 1) {
        const h = dash.getCell(kpiHeader[i]);
        h.value = kpiTitles[i];
        h.font = { bold: true, size: 10, color: { argb: 'FF6B7280' } };
        h.alignment = { horizontal: 'center', vertical: 'middle' };
        h.fill = kpiHeaderFill;
        h.border = {
            top: { style: 'thin', color: kpiBorderColor },
            left: { style: 'thin', color: kpiBorderColor },
            right: { style: 'thin', color: kpiBorderColor },
        };
        const v = dash.getCell(kpiValue[i]);
        v.value = { formula: kpiFormulas[i] };
        v.font = { bold: true, size: 24, color: { argb: 'FF111827' } };
        v.alignment = { horizontal: 'center', vertical: 'middle' };
        v.fill = kpiHeaderFill;
        v.border = {
            bottom: { style: 'thin', color: kpiBorderColor },
            left: { style: 'thin', color: kpiBorderColor },
            right: { style: 'thin', color: kpiBorderColor },
        };
    }
    dash.getCell('C6').numFmt = '0.0%';
    dash.getCell('B7').value = { formula: '=IF(Model_Metrics!D2>=0,"▲ ","▼ ")&TEXT(ABS(Model_Metrics!D2),"0.0%")&" vs período anterior"' };
    dash.getCell('C7').value = { formula: '=IF(Model_Metrics!D5>=0,"▲ ","▼ ")&TEXT(ABS(Model_Metrics!D5),"0.0%")' };
    dash.getCell('D7').value = { formula: '=IF(Model_Metrics!D3>=0,"▲ ","▼ ")&TEXT(ABS(Model_Metrics!D3),"0.0%")' };
    dash.getCell('E7').value = { formula: '=IF(Model_Metrics!D4>=0,"▲ ","▼ ")&TEXT(ABS(Model_Metrics!D4),"0.0%")' };
    ['B7', 'C7', 'D7', 'E7'].forEach((a) => {
        dash.getCell(a).font = { bold: true, size: 10, color: { argb: 'FF475569' } };
        dash.getCell(a).alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const headers = ['Nome do Aluno', 'Freq %', 'P', 'F', 'Tendência', ...dates.map((d) => d.slice(5))];
    const headerRow = 9;
    headers.forEach((h, idx) => {
        const cell = dash.getCell(headerRow, idx + 2);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
    });

    const startRow = 10;
    const maxRows = Math.max(5, students.length);
    for (let i = 0; i < maxRows; i += 1) {
        const row = startRow + i;
        dash.getCell(`B${row}`).value = { formula: `=IF('Base_Alunos'!B${i + 2}="","",'Base_Alunos'!B${i + 2})` };
        dash.getCell(`C${row}`).value = { formula: `=IF(B${row}="","",'Base_Alunos'!F${i + 2})` };
        dash.getCell(`D${row}`).value = { formula: `=IF(B${row}="","",'Base_Alunos'!D${i + 2})` };
        dash.getCell(`E${row}`).value = { formula: `=IF(B${row}="","",'Base_Alunos'!E${i + 2})` };
        dash.getCell(`F${row}`).value = { formula: `=IF(B${row}="","",IF(C${row}>=0.8,"OK","ATENÇÃO"))` };
        dash.getCell(`C${row}`).numFmt = '0.0%';
        for (let d = 0; d < dates.length; d += 1) {
            const col = 7 + d; // G...
            const colLetter = String.fromCharCode(67 + d); // C...
            dash.getCell(row, col).value = {
                formula: `=IF(B${row}="","",'Base_Matriz'!${colLetter}${i + 2})`,
            };
        }
    }

    const lastRow = startRow + Math.max(0, students.length - 1);
    if (students.length > 0 && typeof (dash as any).addConditionalFormatting === 'function') {
        const endCol = excelCol(6 + dates.length);
        (dash as any).addConditionalFormatting({
            ref: `G${startRow}:${endCol}${lastRow}`,
            rules: [
                {
                    type: 'containsText',
                    operator: 'containsText',
                    text: 'P',
                    style: {
                        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD1FAE5' } },
                        font: { color: { argb: 'FF065F46' }, bold: true },
                    },
                },
                {
                    type: 'containsText',
                    operator: 'containsText',
                    text: 'F',
                    style: {
                        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEE2E2' } },
                        font: { color: { argb: 'FF991B1B' }, bold: true },
                    },
                },
            ],
        });
    }

    // Insights automáticos
    dash.mergeCells('I2:N2');
    dash.getCell('I2').value = 'INSIGHTS AUTOMÁTICOS';
    dash.getCell('I2').font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
    dash.getCell('I3').value = {
        formula:
            '=IF(Model_Metrics!D4>0.12,"⚠ Risco subiu " & TEXT(Model_Metrics!D4,"0.0%") & " vs período anterior.","✓ Risco estável/queda: " & TEXT(Model_Metrics!D4,"0.0%"))',
    };
    dash.getCell('I4').value = {
        formula:
            '=IF(Base_Painel!B7>0, "Top risco: " & IFERROR(INDEX(Base_Alunos!B:B, MATCH(MIN(Base_Alunos!F:F), Base_Alunos!F:F,0)), "—"), "Sem alunos em risco no período.")',
    };
    dash.getCell('I5').value = {
        formula:
            '="Meta ≥80%: " & Base_Painel!B6 & " de " & Base_Painel!B4 & " (" & TEXT(IF(Base_Painel!B4=0,0,Base_Painel!B6/Base_Painel!B4),"0.0%") & ")"',
    };
    ['I3', 'I4', 'I5'].forEach((c) => {
        dash.getCell(c).font = { size: 10, color: { argb: 'FF334155' } };
    });

    // Abas técnicas visíveis para auditoria rápida.
    const alum = wb.addWorksheet('Dash_Detail_Alunos');
    alum.columns = [{ width: 6 }, { width: 36 }, { width: 12 }, { width: 10 }, { width: 10 }, { width: 14 }, { width: 16 }];
    alum.addRow(['#', 'Nome', 'ID aluno', 'P', 'F', '%', 'Situação']);
    for (const st of students) {
        alum.addRow([st.ordem, st.nome, st.studentId, st.presencas, st.faltas, st.percentual / 100, st.statusLinha]);
    }
    alum.getColumn(6).numFmt = '0.0%';

    const mat = wb.addWorksheet('Dash_Matriz');
    mat.addRow(['Ordem', 'Nome', ...dates.map((d) => d.slice(5))]);
    for (const st of students) {
        const m = bySt[st.studentId] as Record<string, boolean> | undefined;
        mat.addRow([
            st.ordem,
            st.nome,
            ...dates.map((d) => (m && m[d] !== undefined ? (m[d] ? 'P' : 'F') : '')),
        ]);
    }
    mat.views = [{ state: 'frozen', ySplit: 1, xSplit: 2 }];

    const buf = await wb.xlsx.writeBuffer();
    saveBuffer(buf as ArrayBuffer, `frequencia-dashboard-${turma}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
