'use client';

import type { AxiosInstance } from 'axios';

type QuickExportKey =
    | 'students'
    | 'frequency'
    | 'certificates'
    | 'courses-classes'
    | 'enrollments'
    | 'trucks';

type JsonMap = Record<string, any>;

function toList(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
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

function text(v: any): string {
    if (v === null || v === undefined || v === '') return '-';
    return String(v);
}

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

async function makeWorkbook() {
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sistema Qualifica';
    wb.created = new Date();
    return { ExcelJS, wb };
}

/** `endCol` ex.: 'J' — merge A1:J1 e A2:J2 */
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

/** Lista paginada GET /admin/students (GET /students não existe para admin). */
async function fetchAllAdminStudents(api: AxiosInstance): Promise<JsonMap[]> {
    const limit = 500;
    let page = 1;
    const all: JsonMap[] = [];
    let totalPages = 1;
    do {
        const res = await api.get('/admin/students', { params: { limit, page } });
        const chunk = toList(res.data);
        all.push(...chunk);
        totalPages = res.data?.meta?.totalPages ?? 1;
        page += 1;
    } while (page <= totalPages && page <= 200);
    return all;
}

async function exportStudents(api: AxiosInstance) {
    const students = await fetchAllAdminStudents(api);
    const { wb } = await makeWorkbook();
    const sheet = wb.addWorksheet('Lista de Alunos');
    const lastCol = 'J';

    styleTitle(sheet, '📘 Lista de Alunos - Sistema Qualifica', `Gerado em ${excelDateTime(new Date())}`, lastCol);
    const headers = [
        'ID',
        'Nome',
        'CPF',
        'E-mail',
        'Telefone',
        'Cidade',
        'UF',
        'Inscrições',
        'Ativo',
        'Cadastro',
    ];
    sheet.columns = headers.map((h, i) => ({ header: h, key: `c${i}`, width: i === 0 ? 36 : i === 1 ? 32 : i === 3 ? 34 : 14 }));

    const header = sheet.getRow(4);
    header.values = headers;
    styleHeaderRow(header, 'FFE0F2FE');

    students.forEach((s: JsonMap) => {
        const phone = s.user?.phone || s.contact?.phone || '-';
        const email = s.user?.email || s.contact?.email || '-';
        const active = (s.user?.active ?? s.active) ? 'SIM' : 'NÃO';
        sheet.addRow([
            text(s.id),
            text(s.user?.name),
            text(s.cpf),
            text(email),
            text(phone),
            text(s.address?.city),
            text(s.address?.state),
            Number(s._count?.enrollments ?? 0),
            active,
            excelDate(s.createdAt),
        ]);
    });

    const start = 5;
    const end = Math.max(start, sheet.rowCount);
    styleDataRows(sheet, start, end);
    const totalRow = sheet.addRow([
        'TOTAL',
        { formula: `COUNTA(B${start}:B${end})` },
        '',
        '',
        '',
        '',
        '',
        { formula: `SUM(H${start}:H${end})` },
        { formula: `COUNTIF(I${start}:I${end},"SIM")` },
        '',
    ]);
    styleTotalsRow(totalRow);
    sheet.autoFilter = { from: 'A4', to: `${lastCol}4` };

    const buffer = await wb.xlsx.writeBuffer();
    saveBufferAsFile(buffer as ArrayBuffer, `alunos-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportEnrollments(api: AxiosInstance) {
    const res = await api.get('/enrollments', { params: { limit: 10000 } });
    const enrollments = toList(res.data);
    const { wb } = await makeWorkbook();
    const sheet = wb.addWorksheet('Inscrições');
    const lastCol = 'O';

    styleTitle(sheet, '🧾 Inscrições / Matrículas', `Gerado em ${excelDateTime(new Date())}`, lastCol);
    const headers = [
        'ID',
        'Protocolo',
        'Aluno',
        'CPF',
        'E-mail',
        'Telefone',
        'Curso',
        'CH (h)',
        'Turma',
        'Cidade turma',
        'UF',
        'Grupo',
        'Status',
        'Criado em',
        'Atualizado',
    ];
    sheet.columns = headers.map((_, i) => ({ width: i === 0 ? 34 : i === 2 ? 28 : 12 }));

    const header = sheet.getRow(4);
    header.values = headers;
    styleHeaderRow(header, 'FFEDE9FE');

    enrollments.forEach((e: JsonMap) => {
        const phone = e.student?.user?.phone || e.student?.contact?.phone || '-';
        const email = e.student?.user?.email || e.student?.contact?.email || '-';
        sheet.addRow([
            text(e.id),
            text(e.protocol),
            text(e.student?.user?.name),
            text(e.student?.cpf),
            text(email),
            text(phone),
            text(e.class?.course?.name),
            Number(e.class?.course?.workloadHours ?? 0),
            text(e.class?.classIdentifier),
            text(e.class?.city?.name),
            text(e.class?.city?.state),
            text(e.class?.group?.name),
            text(e.status),
            excelDateTime(e.createdAt),
            excelDateTime(e.updatedAt),
        ]);
    });
    const start = 5;
    const end = Math.max(start, sheet.rowCount);
    styleDataRows(sheet, start, end);
    const totalRow = sheet.addRow([
        'TOTAL',
        '',
        { formula: `COUNTA(C${start}:C${end})` },
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
    ]);
    styleTotalsRow(totalRow);
    sheet.autoFilter = { from: 'A4', to: `${lastCol}4` };

    const buffer = await wb.xlsx.writeBuffer();
    saveBufferAsFile(buffer as ArrayBuffer, `inscricoes-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportFrequency(api: AxiosInstance) {
    const [classesRes, enrollRes] = await Promise.all([
        api.get('/classes', { params: { limit: 5000 } }),
        api.get('/enrollments', { params: { limit: 10000 } }),
    ]);
    const classes = toList(classesRes.data);
    const enrollments = toList(enrollRes.data);
    const { wb } = await makeWorkbook();
    const sheet = wb.addWorksheet('Frequência por Turma');
    const lastCol = 'J';

    styleTitle(sheet, '📗 Relatório agregado por turma', `Gerado em ${excelDateTime(new Date())}`, lastCol);
    const headers = [
        'Turma',
        'Curso',
        'Cidade',
        'UF',
        'Início',
        'Fim',
        'Inscrições',
        'Aprovados',
        'Matriculados',
        'Conversão %',
    ];
    sheet.columns = headers.map(() => ({ width: 14 }));

    const header = sheet.getRow(4);
    header.values = headers;
    styleHeaderRow(header, 'FFDCFCE7');

    const byClass = new Map<string, JsonMap[]>();
    enrollments.forEach((e: JsonMap) => {
        const classId = e.classId || e.class?.id;
        if (!classId) return;
        const arr = byClass.get(classId) || [];
        arr.push(e);
        byClass.set(classId, arr);
    });

    classes.forEach((c: JsonMap) => {
        const arr = byClass.get(c.id) || [];
        const approved = arr.filter((i) => i.status === 'APPROVED').length;
        const enrolled = arr.filter((i) => i.status === 'ENROLLED').length;
        sheet.addRow([
            text(c.classIdentifier),
            text(c.course?.name),
            text(c.city?.name),
            text(c.city?.state),
            excelDate(c.startDate),
            excelDate(c.endDate),
            arr.length,
            approved,
            enrolled,
            null,
        ]);
    });

    const start = 5;
    const end = Math.max(start, sheet.rowCount);
    for (let r = start; r <= end; r += 1) {
        sheet.getCell(`J${r}`).value = { formula: `IF(G${r}=0,0,(H${r}+I${r})/G${r})` };
        sheet.getCell(`J${r}`).numFmt = '0.00%';
    }
    styleDataRows(sheet, start, end);
    const totalRow = sheet.addRow([
        'TOTAL',
        '',
        '',
        '',
        '',
        '',
        { formula: `SUM(G${start}:G${end})` },
        { formula: `SUM(H${start}:H${end})` },
        { formula: `SUM(I${start}:I${end})` },
        {
            formula: `IF(SUM(G${start}:G${end})=0,0,(SUM(H${start}:H${end})+SUM(I${start}:I${end}))/SUM(G${start}:G${end}))`,
        },
    ]);
    totalRow.getCell(10).numFmt = '0.00%';
    styleTotalsRow(totalRow);
    sheet.autoFilter = { from: 'A4', to: `${lastCol}4` };

    const buffer = await wb.xlsx.writeBuffer();
    saveBufferAsFile(buffer as ArrayBuffer, `frequencia-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportCertificates(api: AxiosInstance) {
    const res = await api.get('/certificates', { params: { limit: 10000 } });
    const certs = toList(res.data);
    const { wb } = await makeWorkbook();
    const sheet = wb.addWorksheet('Certificados');
    const lastCol = 'L';

    styleTitle(sheet, '🏅 Certificados emitidos', `Gerado em ${excelDateTime(new Date())}`, lastCol);
    const headers = [
        'Código verificação',
        'Estado',
        'Aluno',
        'E-mail aluno',
        'Curso',
        'CH (h)',
        'Turma',
        'Cidade turma',
        'UF turma',
        'Emitido por',
        'Emitido em',
        'Modelo',
    ];
    sheet.columns = headers.map((_, i) => ({ width: i === 0 ? 36 : i === 3 ? 30 : 14 }));

    const header = sheet.getRow(4);
    header.values = headers;
    styleHeaderRow(header, 'FFFFF9C4');

    certs.forEach((c: JsonMap) => {
        sheet.addRow([
            text(c.verificationCode),
            text(c.status),
            text(c.student?.user?.name),
            text(c.student?.user?.email),
            text(c.class?.course?.name),
            Number(c.class?.course?.workloadHours ?? 0),
            text(c.class?.classIdentifier),
            text(c.class?.city?.name),
            text(c.class?.city?.state),
            text(c.issuer?.name),
            excelDateTime(c.issuedAt),
            text(c.templateVersion?.title ?? c.templateVersion?.templateId),
        ]);
    });
    const start = 5;
    const end = Math.max(start, sheet.rowCount);
    styleDataRows(sheet, start, end);
    const totalRow = sheet.addRow([
        'TOTAL',
        '',
        { formula: `COUNTA(C${start}:C${end})` },
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
    ]);
    styleTotalsRow(totalRow);
    sheet.autoFilter = { from: 'A4', to: `${lastCol}4` };

    const buffer = await wb.xlsx.writeBuffer();
    saveBufferAsFile(buffer as ArrayBuffer, `certificados-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportCoursesAndClasses(api: AxiosInstance) {
    const [coursesRes, classesRes] = await Promise.all([
        api.get('/courses', { params: { limit: 5000 } }),
        api.get('/classes', { params: { limit: 5000 } }),
    ]);
    const courses = toList(coursesRes.data);
    const classes = toList(classesRes.data);
    const { wb } = await makeWorkbook();

    const coursesLastCol = 'J';
    const coursesSheet = wb.addWorksheet('Cursos');
    styleTitle(coursesSheet, '📙 Catálogo de Cursos', `Gerado em ${excelDateTime(new Date())}`, coursesLastCol);
    const cHeaders = [
        'ID',
        'Nome',
        'Instituição',
        'CH (h)',
        'Dias MA',
        'Dias PI',
        'Turmas',
        'Módulos',
        'Multicurso',
        'Ativo',
    ];
    coursesSheet.columns = cHeaders.map(() => ({ width: 14 }));
    const cHeader = coursesSheet.getRow(4);
    cHeader.values = cHeaders;
    styleHeaderRow(cHeader, 'FFFFEDD5');
    courses.forEach((c: JsonMap) => {
        const inst = c.institution?.shortName || c.institution?.name || '-';
        coursesSheet.addRow([
            text(c.id),
            text(c.name),
            text(inst),
            Number(c.workloadHours ?? 0),
            Number(c.durationDaysMA ?? 0),
            Number(c.durationDaysPI ?? 0),
            Number(c._count?.classes ?? 0),
            Number(c._count?.modules ?? 0),
            c.isMulticourse ? 'SIM' : 'NÃO',
            c.active ? 'SIM' : 'NÃO',
        ]);
    });
    const cStart = 5;
    const cEnd = Math.max(cStart, coursesSheet.rowCount);
    styleDataRows(coursesSheet, cStart, cEnd);
    styleTotalsRow(
        coursesSheet.addRow([
            'TOTAL',
            { formula: `COUNTA(B${cStart}:B${cEnd})` },
            '',
            '',
            '',
            '',
            { formula: `SUM(G${cStart}:G${cEnd})` },
            '',
            '',
            '',
        ]),
    );
    coursesSheet.autoFilter = { from: 'A4', to: `${coursesLastCol}4` };

    const classesLastCol = 'L';
    const classesSheet = wb.addWorksheet('Turmas');
    styleTitle(classesSheet, '📘 Turmas', `Gerado em ${excelDateTime(new Date())}`, classesLastCol);
    const tHeaders = [
        'ID',
        'Turma',
        'Curso',
        'CH curso (h)',
        'Cidade',
        'UF',
        'Grupo',
        'Início',
        'Fim',
        'Inscrições',
        'Vagas',
        'Status',
    ];
    classesSheet.columns = tHeaders.map(() => ({ width: 13 }));
    const tHeader = classesSheet.getRow(4);
    tHeader.values = tHeaders;
    styleHeaderRow(tHeader, 'FFFFEDD5');
    classes.forEach((t: JsonMap) => {
        classesSheet.addRow([
            text(t.id),
            text(t.classIdentifier),
            text(t.course?.name),
            Number(t.course?.workloadHours ?? 0),
            text(t.city?.name),
            text(t.city?.state),
            text(t.group?.name),
            excelDate(t.startDate),
            excelDate(t.endDate),
            Number(t._count?.enrollments ?? 0),
            Number(t.vacancies ?? 0),
            text(t.status),
        ]);
    });
    const tStart = 5;
    const tEnd = Math.max(tStart, classesSheet.rowCount);
    styleDataRows(classesSheet, tStart, tEnd);
    styleTotalsRow(
        classesSheet.addRow([
            'TOTAL',
            { formula: `COUNTA(B${tStart}:B${tEnd})` },
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            { formula: `SUM(J${tStart}:J${tEnd})` },
            { formula: `SUM(K${tStart}:K${tEnd})` },
            '',
        ]),
    );
    classesSheet.autoFilter = { from: 'A4', to: `${classesLastCol}4` };

    const buffer = await wb.xlsx.writeBuffer();
    saveBufferAsFile(buffer as ArrayBuffer, `cursos-turmas-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportTrucks(api: AxiosInstance) {
    const res = await api.get('/trucks', { params: { limit: 5000 } });
    const trucks = toList(res.data);
    const { wb } = await makeWorkbook();
    const sheet = wb.addWorksheet('Frota');
    const lastCol = 'L';

    styleTitle(sheet, '🚛 Frota de Carretas', `Gerado em ${excelDateTime(new Date())}`, lastCol);
    const headers = [
        'ID',
        'Identificador',
        'Placa',
        'UF base',
        'Tipo',
        'Lugares',
        'Salas',
        'Status',
        'Grupo',
        'Turmas',
        'Viagens',
        'Ano modelo',
    ];
    sheet.columns = headers.map(() => ({ width: 12 }));

    const header = sheet.getRow(4);
    header.values = headers;
    styleHeaderRow(header, 'FFF3F4F6');
    trucks.forEach((t: JsonMap) => {
        sheet.addRow([
            text(t.id),
            text(t.identifier),
            text(t.licensePlate),
            text(t.state),
            text(t.type),
            Number(t.capacity ?? 0),
            Number(t.roomsCount ?? 0),
            text(t.status),
            text(t.group?.name),
            Number(t._count?.classes ?? 0),
            Number(t._count?.trips ?? 0),
            text(t.modelYear),
        ]);
    });
    const start = 5;
    const end = Math.max(start, sheet.rowCount);
    styleDataRows(sheet, start, end);
    styleTotalsRow(sheet.addRow([
        'TOTAL',
        { formula: `COUNTA(B${start}:B${end})` },
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        { formula: `SUM(J${start}:J${end})` },
        '',
        '',
    ]));
    sheet.autoFilter = { from: 'A4', to: `${lastCol}4` };

    const buffer = await wb.xlsx.writeBuffer();
    saveBufferAsFile(buffer as ArrayBuffer, `frota-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function runAdminQuickExport(kind: QuickExportKey, api: AxiosInstance) {
    switch (kind) {
        case 'students':
            return exportStudents(api);
        case 'frequency':
            return exportFrequency(api);
        case 'certificates':
            return exportCertificates(api);
        case 'courses-classes':
            return exportCoursesAndClasses(api);
        case 'enrollments':
            return exportEnrollments(api);
        case 'trucks':
            return exportTrucks(api);
        default:
            throw new Error('Tipo de exportação não suportado.');
    }
}

export type { QuickExportKey };
