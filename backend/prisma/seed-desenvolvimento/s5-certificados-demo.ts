/**
 * M3b — Moldes mestres MA/PI, modelos por curso+UF (3 cursos para demo do Pedro),
 * vínculo TeacherCourse (Maria ↔ Informática Básica) e 2 certificados ACTIVE para Pedro.
 *
 * Executado por seed-full.ts após seedOperacional (precisa de turmas/classIdentifier e studentMap).
 */
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PrismaClient, CertificateTemplateScope, CertificateTemplateType } from '@prisma/client';
import { CertificateTemplateService } from '../../src/certificates/certificate-template.service';

function daysAgo(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(12, 0, 0, 0);
    return d;
}

async function fileExistsAbs(abs: string): Promise<boolean> {
    try {
        await fs.access(abs);
        return true;
    } catch {
        return false;
    }
}

/** Coordenadas alinhadas ao editor / molde mestre (pt). */
const defaultCoordinates = {
    nameX: 420,
    nameY: 255,
    nameSize: 24,
    detailsY: 212,
    detailsSize: 11,
    qrX: 740,
    qrY: 28,
    qrSize: 64,
    paragraphX: 95,
    paragraphY: 220,
    paragraphW: 700,
    paragraphH: 165,
    bodyTextSize: 17,
    line1Y: 328,
    line2Y: 298,
    line3Y: 268,
    p2CourseBoxX: 255,
    p2CourseBoxY: 575,
    p2CourseBoxW: 350,
    p2CourseBoxH: 44,
    p2CourseTextSize: 15,
};

const defaultPdfFlags = {
    drawHeaderNameAndDetails: false,
    useBodyWhiteMask: false,
    usePage2TitleWhiteMask: false,
    signatureMode: 'AUTO' as const,
};

export async function seedCertificateTemplatesAndPedroCerts(
    prisma: PrismaClient,
    opts: {
        adminUser: { id: string };
        courseMap: Record<string, string>;
        studentMap: Record<string, { userId: string; studentId: string }>;
        mariaTeacherId: string;
    },
): Promise<void> {
    const { adminUser, courseMap, studentMap, mariaTeacherId } = opts;
    const svcAny = new CertificateTemplateService(prisma as any);
    const user = { id: adminUser.id, role: 'ADMIN' as const };

    console.log('\n━━━ [M3b] Certificados: moldes + 3 modelos por curso + Pedro (2 emits) ━━━');

    const publicDir = path.resolve(process.cwd(), '../public');
    const maBg = path.join(publicDir, 'certificados', 'maranhao', 'fundo-limpo.png');
    const piBg = path.join(publicDir, 'certificados', 'piaui', 'fundo-limpo.png');
    const maBgOk = await fileExistsAbs(maBg);
    const piBgOk = await fileExistsAbs(piBg);

    await svcAny.seedMasterTemplates(user);

    const infId = courseMap['Informática Básica'];
    const excelId = courseMap['Excel Avançado'];
    const admId = courseMap['Assistente Administrativo'];
    if (!infId || !excelId || !admId) {
        console.warn('  ⚠️  courseMap incompleto — abortando modelos por curso');
        return;
    }

    await prisma.teacherCourse.upsert({
        where: { teacherId_courseId: { teacherId: mariaTeacherId, courseId: infId } },
        update: {},
        create: { teacherId: mariaTeacherId, courseId: infId },
    });
    console.log('  ✅ TeacherCourse: Maria Silva Pereira ↔ Informática Básica');

    /** Textos espelhando s1-infra (descrição, pré-requisitos, programa modular). */
    const infParagraph =
        'Certificamos que {{ALUNO_NOME}} concluiu com aproveitamento o curso {{CURSO}}, na modalidade presencial, ' +
        'com carga horária de {{CARGA_HORARIA}} horas/aula, sob orientação da professora **Maria Silva Pereira**, ' +
        'abrangendo fundamentos de informática em ambiente Windows, editor de texto, planilhas e uso da Internet, ' +
        'conforme programa institucional para formação profissional. ' +
        'Pré-requisitos de ingresso: ensino fundamental completo.';

    await svcAny.upsertTemplateVersion(
        {
            scope: CertificateTemplateScope.COURSE_STATE,
            courseId: infId,
            state: 'MA',
            title: 'Certificado — Informática Básica (MA) — Profª Maria Silva Pereira',
            templateType: CertificateTemplateType.PDF_BASE,
            pdfPath: maBgOk ? maBg : undefined,
            coordinateOverrides: defaultCoordinates,
            pdfTextOverrides: {
                ...defaultPdfFlags,
                paragraphTemplate: infParagraph,
                dateTemplate: '{{CIDADE}} - {{UF}}, {{DATA_EXTENSO}}.',
                page2WorkloadTemplate:
                    '{{CARGA_HORARIA}}H — PROGRAMA: Windows e organização de ficheiros; Word; Excel; Internet e segurança.',
                syllabusTitleContent:
                    'Windows e sistema\n§§§\nMódulo Word\n§§§\nMódulo Excel\n§§§\nInternet e segurança',
                syllabusWorkloadContent: '30h\n§§§\n30h\n§§§\n30h\n§§§\n30h',
                syllabusDescContent:
                    'Ambiente gráfico, pastas e ficheiros.\n§§§\nDocumentos profissionais.\n§§§\nPlanilhas e funções básicas.\n§§§\nNavegação e boas práticas.',
            },
            placeholders: [
                'ALUNO_NOME',
                'CURSO_NOME',
                'CARGA_HORARIA',
                'CIDADE',
                'ESTADO',
                'DATA_EMISSAO',
                'CODIGO_VERIFICACAO',
                'QR_CODE_DATA_URL',
                'TURMA',
                'EMISSOR',
            ],
            notes:
                'Modelo específico Informática Básica — MA (turma INF-SLZ-001). Docente de referência no texto: Maria Silva Pereira. ' +
                'Dados do curso no seed: 120h, pré-requisito ensino fundamental completo, ementa em 4 módulos.',
            autoPublish: true,
        },
        user,
    );

    await svcAny.upsertTemplateVersion(
        {
            scope: CertificateTemplateScope.COURSE_STATE,
            courseId: excelId,
            state: 'PI',
            title: 'Certificado — Excel Avançado (PI)',
            templateType: CertificateTemplateType.PDF_BASE,
            pdfPath: piBgOk ? piBg : undefined,
            coordinateOverrides: defaultCoordinates,
            pdfTextOverrides: {
                ...defaultPdfFlags,
                paragraphTemplate:
                    'Certificamos que {{ALUNO_NOME}} concluiu o curso {{CURSO}}, com {{CARGA_HORARIA}} horas/aula, em formação profissional em planilhas eletrónicas avançadas (fórmulas complexas, tabelas dinâmicas e introdução a macros VBA), em conformidade com o programa pedagógico institucional.',
                dateTemplate: '{{CIDADE}} - {{UF}}, {{DATA_EXTENSO}}.',
                page2WorkloadTemplate: '{{CARGA_HORARIA}}H — Módulos: Fórmulas avançadas | Tabelas dinâmicas | Macros VBA.',
            },
            notes: 'Modelo Excel Avançado — UF PI (ex.: turma EXC-TER-001 em Teresina).',
            autoPublish: true,
        },
        user,
    );

    await svcAny.upsertTemplateVersion(
        {
            scope: CertificateTemplateScope.COURSE_STATE,
            courseId: admId,
            state: 'MA',
            title: 'Certificado — Assistente Administrativo (MA)',
            templateType: CertificateTemplateType.PDF_BASE,
            pdfPath: maBgOk ? maBg : undefined,
            coordinateOverrides: defaultCoordinates,
            pdfTextOverrides: {
                ...defaultPdfFlags,
                paragraphTemplate:
                    'Certificamos que {{ALUNO_NOME}} concluiu o curso {{CURSO}}, com {{CARGA_HORARIA}} horas/aula, em rotinas administrativas, atendimento, documentação e apoio à gestão, segundo programa aprovado pela instituição.',
                dateTemplate: '{{CIDADE}} - {{UF}}, {{DATA_EXTENSO}}.',
                page2WorkloadTemplate:
                    '{{CARGA_HORARIA}}H — PROGRAMA: Rotinas administrativas | Atendimento | Documentos | Informática aplicada.',
                syllabusTitleContent:
                    'Rotinas administrativas\n§§§\nAtendimento\n§§§\nDocumentos\n§§§\nInformática aplicada',
                syllabusWorkloadContent: '45h\n§§§\n45h\n§§§\n45h\n§§§\n45h',
                syllabusDescContent:
                    'Organização de escritório e arquivos.\n§§§\nRelacionamento com público.\n§§§\nBoas práticas documentais.\n§§§\nFerramentas digitais.',
            },
            notes: 'Modelo Assistente Administrativo — MA (turma ADM-SLZ-001).',
            autoPublish: true,
        },
        user,
    );

    console.log('  ✅ Modelos publicados: Informática Básica (MA), Excel Avançado (PI), Assistente Administrativo (MA)');

    const pedro = studentMap['pedro.santos@qualifica.com'];
    if (!pedro) {
        console.warn('  ⚠️  Pedro não encontrado — certificados demo omitidos');
        return;
    }

    const t1 = await prisma.class.findFirst({ where: { classIdentifier: 'INF-SLZ-001' } });
    const t3 = await prisma.class.findFirst({ where: { classIdentifier: 'ADM-SLZ-001' } });
    if (!t1 || !t3) {
        console.warn('  ⚠️  Turmas INF-SLZ-001 ou ADM-SLZ-001 não encontradas');
        return;
    }

    const vInf = await svcAny.resolvePublishedTemplate(infId, 'MA');
    const vAdm = await svcAny.resolvePublishedTemplate(admId, 'MA');
    if (!vInf?.id || !vAdm?.id) {
        console.warn('  ⚠️  resolvePublishedTemplate não devolveu versão para certificado Pedro');
        return;
    }

    const mkCode = (suffix: string) =>
        `UPG-PEDRO-${suffix}-${randomBytes(8).toString('hex').toUpperCase()}`;

    const pairs: Array<{ classId: string; templateVersionId: string; suffix: string }> = [
        { classId: t1.id, templateVersionId: vInf.id, suffix: 'INF' },
        { classId: t3.id, templateVersionId: vAdm.id, suffix: 'ADM' },
    ];

    for (const { classId, templateVersionId, suffix } of pairs) {
        const exists = await prisma.certificate.findFirst({
            where: { studentId: pedro.studentId, classId, status: 'ACTIVE' },
        });
        if (exists) {
            console.log(`  ⏭️  Certificado Pedro já existe (${suffix})`);
            continue;
        }
        const verificationCode = mkCode(suffix);
        await prisma.certificate.create({
            data: {
                studentId: pedro.studentId,
                classId,
                templateVersionId,
                verificationCode,
                fileUrl: `/api/certificates/download/${verificationCode}`,
                qrCodeUrl: null,
                issuedAt: daysAgo(suffix === 'INF' ? 2 : 4),
                issuedBy: adminUser.id,
                status: 'ACTIVE',
            },
        });
        console.log(`  ✅ Certificado Pedro (${suffix}) → ${verificationCode}`);
        await prisma.notification.create({
            data: {
                userId: pedro.userId,
                type: 'CERTIFICATE_AVAILABLE',
                title: 'Certificado disponível',
                message:
                    suffix === 'INF'
                        ? 'O seu certificado do curso Informática Básica está disponível no portal.'
                        : 'O seu certificado do curso Assistente Administrativo está disponível no portal.',
                channel: 'IN_APP',
                deliveryStatus: 'DELIVERED',
                sentAt: daysAgo(1),
            },
        });
    }
}
