import { PrismaClient } from '@prisma/client';

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(8,0,0,0); return d; }
function daysAhead(n: number) { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(8,0,0,0); return d; }

export async function seedOperacional(prisma: PrismaClient, ctx: {
    adminUser: any; courseMap: Record<string, string>;
    mariaUser: any; carlosUser: any; mariaTeacher: any; carlosTeacher: any;
    truck1: any; truck2: any; g1ma: any; g1pi: any;
    studentMap: Record<string, { userId: string; studentId: string }>;
}) {
    const { adminUser, courseMap, mariaUser, carlosUser, mariaTeacher, carlosTeacher, truck1, truck2, g1ma, g1pi, studentMap } = ctx;
    console.log('\n━━━ [M3] Turmas, Inscrições, Frequências, Certificados, Materiais ━━━');

    const slz = await prisma.city.findFirst({ where: { name: 'São Luís', state: 'MA' } });
    const ter = await prisma.city.findFirst({ where: { name: 'Teresina', state: 'PI' } });
    const imp = await prisma.city.findFirst({ where: { name: 'Imperatriz', state: 'MA' } });

    // ══════════════════════════════════════════════════════════════════
    // TURMAS
    // ══════════════════════════════════════════════════════════════════
    // ── Upsert helper para Class (classIdentifier não é @unique no schema) ────
    const turmas: any[] = [];
    async function upsertClass(data: any) {
        const ex = await prisma.class.findFirst({ where: { classIdentifier: data.classIdentifier } });
        return ex ?? await prisma.class.create({ data });
    }

    // T1: IN_PROGRESS — Informática Básica — São Luís
    const t1 = await upsertClass({
        classIdentifier: 'INF-SLZ-001', courseId: courseMap['Informática Básica'], groupId: g1ma.id, cityId: slz!.id,
        truckId: truck1.id, period: 'MORNING', startTime: '08:00', endTime: '12:00',
        startDate: daysAgo(20), endDate: daysAhead(10), vacancies: 40, status: 'IN_PROGRESS',
    });
    turmas.push(t1);

    // T2: ENROLLMENT_OPEN — Excel Avançado — Teresina
    const t2 = await upsertClass({
        classIdentifier: 'EXC-TER-001', courseId: courseMap['Excel Avançado'], groupId: g1pi.id, cityId: ter!.id,
        truckId: truck2.id, period: 'AFTERNOON', startTime: '14:00', endTime: '18:00',
        startDate: daysAhead(7), endDate: daysAhead(27), vacancies: 35, status: 'ENROLLMENT_OPEN',
    });
    turmas.push(t2);

    // T3: COMPLETED — Assistente Administrativo — São Luís
    const t3 = await upsertClass({
        classIdentifier: 'ADM-SLZ-001', courseId: courseMap['Assistente Administrativo'], groupId: g1ma.id, cityId: slz!.id,
        truckId: truck1.id, period: 'EVENING', startTime: '18:30', endTime: '22:00',
        startDate: daysAgo(60), endDate: daysAgo(5), vacancies: 30, status: 'COMPLETED',
    });
    turmas.push(t3);

    // T4: PLANNED — Marketing Digital — Imperatriz
    const t4 = await upsertClass({
        classIdentifier: 'MKT-IMP-001', courseId: courseMap['Marketing Digital'], groupId: g1ma.id, cityId: imp!.id,
        truckId: truck1.id, period: 'MORNING', startTime: '08:00', endTime: '12:00',
        startDate: daysAhead(30), endDate: daysAhead(60), vacancies: 40, status: 'PLANNED',
    });
    turmas.push(t4);

    console.log(`  ✅ ${turmas.length} turmas criadas`);

    // ══════════════════════════════════════════════════════════════════
    // PERIODOS DE CURSO (ACOES) + VINCULOS COM TURMAS
    // ══════════════════════════════════════════════════════════════════
    async function upsertAcao(data: any) {
        const ex = await prisma.acao.findFirst({
            where: {
                nome: data.nome,
                cidadeNome: data.cidadeNome,
                grupoId: data.grupoId,
                dataInicio: data.dataInicio,
                dataFim: data.dataFim,
            },
        });
        return ex ?? await prisma.acao.create({ data });
    }

    const periodos = [
        await upsertAcao({
            nome: 'Período Informática Básica — São Luís',
            cidadeNome: 'São Luís',
            cidadeId: slz!.id,
            grupoId: g1ma.id,
            carretaId: truck1.id,
            status: 'EM_ANDAMENTO',
            dataInicio: t1.startDate,
            dataFim: t1.endDate,
            localExecucao: 'Unidade móvel São Luís',
            observacoes: 'Período operacional vinculado às turmas do eixo de informática.',
        }),
        await upsertAcao({
            nome: 'Período Excel Avançado — Teresina',
            cidadeNome: 'Teresina',
            cidadeId: ter!.id,
            grupoId: g1pi.id,
            carretaId: truck2.id,
            status: 'PLANEJADA',
            dataInicio: t2.startDate,
            dataFim: t2.endDate,
            localExecucao: 'Unidade móvel Teresina',
            observacoes: 'Período com inscrições em andamento.',
        }),
        await upsertAcao({
            nome: 'Período Marketing Digital — Imperatriz',
            cidadeNome: 'Imperatriz',
            cidadeId: imp!.id,
            grupoId: g1ma.id,
            carretaId: truck1.id,
            status: 'PLANEJADA',
            dataInicio: t4.startDate,
            dataFim: t4.endDate,
            localExecucao: 'Unidade móvel Imperatriz',
            observacoes: 'Período planejado para próximo ciclo.',
        }),
    ];

    const vinculos: Array<{ acaoId: string; turmaId: string }> = [
        { acaoId: periodos[0].id, turmaId: t1.id },
        { acaoId: periodos[1].id, turmaId: t2.id },
        { acaoId: periodos[0].id, turmaId: t3.id },
        { acaoId: periodos[2].id, turmaId: t4.id },
    ];
    for (const v of vinculos) {
        const ex = await prisma.acaoTurma.findFirst({ where: { acaoId: v.acaoId, turmaId: v.turmaId } });
        if (!ex) await prisma.acaoTurma.create({ data: v });
    }
    console.log(`  ✅ ${periodos.length} períodos de curso (ações) e ${vinculos.length} vínculos com turmas`);

    // ── Vincular professores às turmas ────────────────────────────────
    for (const t of [t1, t3]) {
        const ex = await prisma.classTeacher.findFirst({ where: { classId: t.id, teacherId: mariaTeacher.id } });
        if (!ex) await prisma.classTeacher.create({ data: { classId: t.id, teacherId: mariaTeacher.id, isSubstitute: false }});
    }
    for (const t of [t2, t4]) {
        const ex = await prisma.classTeacher.findFirst({ where: { classId: t.id, teacherId: carlosTeacher.id } });
        if (!ex) await prisma.classTeacher.create({ data: { classId: t.id, teacherId: carlosTeacher.id, isSubstitute: false }});
    }

    // Feriado na turma T1
    const holEx = await prisma.classHoliday.findFirst({ where: { classId: t1.id } });
    if (!holEx) await prisma.classHoliday.create({ data: { classId: t1.id, date: daysAgo(15), reason: 'Feriado Municipal — Dia de São Luís (10 de setembro)', registeredBy: adminUser.id }});

    // ══════════════════════════════════════════════════════════════════
    // INSCRIÇÕES + FREQUÊNCIAS + CERTIFICADOS
    // ══════════════════════════════════════════════════════════════════
    const students = Object.values(studentMap);
    const statusList = ['ENROLLED', 'APPROVED', 'PENDING', 'REJECTED', 'WAITLIST', 'DROPOUT'] as const;

    // Davi — ENROLLED na T1 (turma em andamento) + frequências
    const daviS = studentMap['davi.martins@qualifica.com'];
    if (daviS) {
        const enEx = await prisma.enrollment.findFirst({ where: { studentId: daviS.studentId, classId: t1.id } });
        const en1 = enEx ?? await prisma.enrollment.create({ data: {
            studentId: daviS.studentId, classId: t1.id,
            protocol: `UPG-DAVI-${t1.id.slice(0,8).toUpperCase()}`,
            status: 'ENROLLED', enrolledAt: daysAgo(22), reviewedAt: daysAgo(21), reviewedBy: adminUser.id,
        }});

        // 20 dias de frequência (16 presentes, 4 faltas)
        for (let i = 1; i <= 20; i++) {
            const d = daysAgo(20 - i + 1);
            if (d.getDay() === 0 || d.getDay() === 6) continue;
            try { await prisma.attendance.upsert({ where: { classId_studentId_date: { classId: t1.id, studentId: daviS.studentId, date: d }}, update: {}, create: { classId: t1.id, studentId: daviS.studentId, date: d, present: i % 5 !== 0, registeredBy: adminUser.id }}); } catch {}
        }

        // Davi — ENROLLED na T3 (concluída) + certificado
        const en3Ex = await prisma.enrollment.findFirst({ where: { studentId: daviS.studentId, classId: t3.id } });
        if (!en3Ex) await prisma.enrollment.create({ data: { studentId: daviS.studentId, classId: t3.id, protocol: `UPG-DAVI-${t3.id.slice(0,8).toUpperCase()}`, status: 'ENROLLED', enrolledAt: daysAgo(62), reviewedAt: daysAgo(61), reviewedBy: adminUser.id }});

        // Certificado para Davi (turma concluída)
        const certEx = await prisma.certificate.findFirst({ where: { studentId: daviS.studentId, classId: t3.id } });
        if (!certEx) await prisma.certificate.create({ data: {
            studentId: daviS.studentId, classId: t3.id,
            verificationCode: `CERT-DAVI-${Date.now().toString(36).toUpperCase()}`,
            fileUrl: '/certificates/placeholder-cert.pdf',
            qrCodeUrl: '/qrcodes/placeholder-qr.png',
            issuedAt: daysAgo(4), issuedBy: adminUser.id, status: 'ACTIVE',
        }});

        // Davi — WAITLIST na T2
        const en2Ex = await prisma.enrollment.findFirst({ where: { studentId: daviS.studentId, classId: t2.id } });
        if (!en2Ex) await prisma.enrollment.create({ data: { studentId: daviS.studentId, classId: t2.id, protocol: `UPG-DAVI-${t2.id.slice(0,8).toUpperCase()}`, status: 'WAITLIST', enrolledAt: daysAgo(3) }});
    }

    // Ana — APPROVED na T2 + REJECTED no histórico
    const anaS = studentMap['ana.lima@qualifica.com'];
    if (anaS) {
        const enEx = await prisma.enrollment.findFirst({ where: { studentId: anaS.studentId, classId: t2.id } });
        if (!enEx) await prisma.enrollment.create({ data: { studentId: anaS.studentId, classId: t2.id, protocol: `UPG-ANA-${t2.id.slice(0,8).toUpperCase()}`, status: 'APPROVED', enrolledAt: daysAgo(5), reviewedAt: daysAgo(4), reviewedBy: adminUser.id }});
        const enT3Ex = await prisma.enrollment.findFirst({ where: { studentId: anaS.studentId, classId: t3.id } });
        if (!enT3Ex) await prisma.enrollment.create({ data: { studentId: anaS.studentId, classId: t3.id, protocol: `UPG-ANA-${t3.id.slice(0,8).toUpperCase()}`, status: 'REJECTED', enrolledAt: daysAgo(65), reviewedAt: daysAgo(63), reviewedBy: adminUser.id, rejectionReason: 'Documentação incompleta — RG ilegível. Favor reenviar com foto nítida.' }});
    }

    // Pedro — 3 matrículas (demo certificados + multicurso): T1 Informática, T2 Excel, T3 Assistente
    const pedroS = studentMap['pedro.santos@qualifica.com'];
    if (pedroS) {
        async function upsertPedroEnrollment(classId: string, protocol: string) {
            const ex = await prisma.enrollment.findFirst({ where: { studentId: pedroS.studentId, classId } });
            const common = {
                protocol,
                status: 'ENROLLED' as const,
                enrolledAt: daysAgo(28),
                reviewedAt: daysAgo(27),
                reviewedBy: adminUser.id,
            };
            if (ex) {
                await prisma.enrollment.update({ where: { id: ex.id }, data: common });
            } else {
                await prisma.enrollment.create({ data: { studentId: pedroS.studentId, classId, ...common } });
            }
        }
        await upsertPedroEnrollment(t1.id, `UPG-PEDRO-${t1.id.slice(0, 8).toUpperCase()}`);
        await upsertPedroEnrollment(t2.id, `UPG-PEDRO-${t2.id.slice(0, 8).toUpperCase()}`);
        await upsertPedroEnrollment(t3.id, `UPG-PEDRO-${t3.id.slice(0, 8).toUpperCase()}`);

        // Frequência — T1 (turma em andamento): presença alta para meta de certificado
        for (let i = 1; i <= 22; i++) {
            const d = daysAgo(22 - i + 1);
            if (d.getDay() === 0 || d.getDay() === 6) continue;
            try {
                await prisma.attendance.upsert({
                    where: { classId_studentId_date: { classId: t1.id, studentId: pedroS.studentId, date: d } },
                    update: {},
                    create: { classId: t1.id, studentId: pedroS.studentId, date: d, present: true, registeredBy: adminUser.id },
                });
            } catch { /* slot duplicado ou data inválida — ignora */ }
        }

        // Frequência — T3 (turma concluída): dias úteis dentro do período da turma
        const tStart = new Date(t3.startDate);
        const tEnd = new Date(t3.endDate);
        for (let t = tStart.getTime(); t <= tEnd.getTime(); t += 86400000) {
            const d = new Date(t);
            if (d.getDay() === 0 || d.getDay() === 6) continue;
            try {
                await prisma.attendance.upsert({
                    where: {
                        classId_studentId_date: { classId: t3.id, studentId: pedroS.studentId, date: d },
                    },
                    update: {},
                    create: {
                        classId: t3.id,
                        studentId: pedroS.studentId,
                        date: d,
                        present: true,
                        registeredBy: adminUser.id,
                    },
                });
            } catch { /* ignora */ }
        }

        // Exemplo visual para Kanban: 1 aluno com documentação 100% completa (placeholders)
        await prisma.student.update({
            where: { id: pedroS.studentId },
            data: {
                documents: {
                    photo: 'https://placehold.co/1080x1350/png?text=Selfie+Pedro+UPGRADE',
                    identidade: 'https://placehold.co/1400x900/png?text=RG+Pedro+UPGRADE',
                    addressProof: 'https://placehold.co/1400x900/png?text=Comprovante+Residencia+Pedro',
                    cpfDoc: 'https://placehold.co/1400x900/png?text=CPF+Pedro',
                    educationProof: 'https://placehold.co/1400x900/png?text=Comprovante+Escolaridade+Pedro',
                } as any,
            },
        });
    }

    console.log('  ✅ Inscrições (ENROLLED/APPROVED/PENDING/REJECTED/WAITLIST) + frequências + certificado');

    // ══════════════════════════════════════════════════════════════════
    // MATERIAIS
    // ══════════════════════════════════════════════════════════════════
    const MATS = [
        { title: 'Apostila Informática Básica — Módulo 1', description: 'Material teórico completo do Módulo 1 — Introdução ao Windows 10 e organização de arquivos.', fileUrl: '/materiais/apostila-info-m1.pdf', fileType: 'application/pdf', fileSize: 2048000, courseId: courseMap['Informática Básica'], visibility: 'PUBLIC' as const },
        { title: 'Planilha de Exercícios Excel Avançado', description: 'Exercícios práticos de fórmulas PROCV, Tabela Dinâmica e Macros VBA com gabarito.', fileUrl: '/materiais/exercicios-excel.xlsx', fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileSize: 512000, courseId: courseMap['Excel Avançado'], visibility: 'COURSE_RESTRICTED' as const },
        { title: 'Apresentação Marketing Digital — Redes Sociais', description: 'Slides da aula sobre estratégias de conteúdo no Instagram e TikTok para negócios locais.', fileUrl: '/materiais/mkt-redes-sociais.pptx', fileType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', fileSize: 8192000, courseId: courseMap['Marketing Digital'], visibility: 'PUBLIC' as const },
        { title: 'Plano de Negócios — Template Word', description: 'Modelo completo para elaboração de plano de negócios conforme SEBRAE — inclui análise SWOT.', fileUrl: '/materiais/plano-negocios-template.docx', fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileSize: 350000, courseId: courseMap['Empreendedorismo'], visibility: 'PUBLIC' as const },
    ];
    for (const m of MATS) {
        const ex = await prisma.material.findFirst({ where: { title: m.title } });
        if (!ex) await prisma.material.create({ data: { ...m, uploadedBy: mariaUser.id, tags: 'aula,material,apostila', downloadCount: Math.floor(Math.random()*30+5) }});
    }
    console.log(`  ✅ ${MATS.length} materiais`);

    // ══════════════════════════════════════════════════════════════════
    // CONTAS A PAGAR
    // ══════════════════════════════════════════════════════════════════
    const CONTAS = [
        { tipo_conta: 'abastecimento', descricao: 'Abastecimento TRK-001 — posto BR posto km 12 rodovia BR-135', valor: 450.00, data_vencimento: daysAgo(2), data_pagamento: daysAgo(1), status: 'paga' as const, cidade: 'São Luís' },
        { tipo_conta: 'pneu_furado', descricao: 'Troca de pneu furado TRK-001 — pneu 295/80 R22.5 borracharia BR-316 km 347', valor: 890.00, data_vencimento: daysAhead(5), status: 'pendente' as const, cidade: 'Caxias' },
        { tipo_conta: 'agua', descricao: 'Abastecimento de água potável para consumo durante viagem MA → PI', valor: 45.00, data_vencimento: daysAgo(10), data_pagamento: daysAgo(8), status: 'paga' as const, cidade: 'Timon' },
        { tipo_conta: 'espontaneo', tipo_espontaneo: 'Material de limpeza', descricao: 'Compra de material de limpeza para higienização interna do veículo após rota', valor: 120.00, data_vencimento: daysAgo(30), status: 'vencida' as const, cidade: 'São Luís' },
    ];
    for (const c of CONTAS) {
        const ex = await prisma.contaPagar.findFirst({ where: { descricao: c.descricao } });
        if (!ex) await prisma.contaPagar.create({ data: c });
    }
    console.log(`  ✅ ${CONTAS.length} contas a pagar`);

    // ══════════════════════════════════════════════════════════════════
    // REEMBOLSOS (professores)
    // ══════════════════════════════════════════════════════════════════
    const mariaEmp = await prisma.employee.findFirst({ where: { userId: mariaUser.id } }) ??
        await prisma.employee.create({ data: { cpf: '321.654.987-00', name: 'Maria Silva Pereira', role: 'INSTRUCTOR', department: 'ACADEMIC', phone: '(98) 99111-2233', contractType: 'PJ', active: true, userId: mariaUser.id }});
    await prisma.reimbursement.create({ data: { requestedBy: mariaUser.id, employeeId: mariaEmp.id, type: 'CLASSROOM_MATERIAL', amount: 145.90, description: 'Material de aula — 2 caixas de marcador para lousa, papel sulfite A4 e canetas para atividades práticas', receiptUrl: '', status: 'PENDING', active: true }});
    await prisma.reimbursement.create({ data: { requestedBy: mariaUser.id, employeeId: mariaEmp.id, type: 'CLEANING_MATERIAL', amount: 68.50, description: 'Material de limpeza para sala de aula — detergente, álcool 70% e pano de chão', receiptUrl: '', status: 'APPROVED', approvedBy: adminUser.id, approvedAt: daysAgo(3), active: true }});

    // ══════════════════════════════════════════════════════════════════
    // NOTIFICAÇÕES
    // ══════════════════════════════════════════════════════════════════
    if (daviS) {
        const NOTIFS = [
            { type: 'ENROLLMENT_APPROVED' as const, title: 'Inscrição Aprovada!', message: `Parabéns! Sua inscrição no curso Informática Básica (turma INF-SLZ-001) foi aprovada. Apresente-se no primeiro dia de aula com RG e comprovante de residência.`, channel: 'IN_APP' as const },
            { type: 'CLASS_REMINDER' as const, title: 'Lembrete de Aula Amanhã', message: 'Seu curso de Informática Básica tem aula amanhã às 08h00. Local: Carreta Educacional TRK-001 — Av. Principal, São Luís.', channel: 'IN_APP' as const },
            { type: 'CERTIFICATE_AVAILABLE' as const, title: 'Certificado Disponível!', message: 'Seu certificado do curso Assistente Administrativo está disponível para download no portal.', channel: 'IN_APP' as const },
            { type: 'MATERIAL_AVAILABLE' as const, title: 'Novo Material Disponível', message: 'A professora Maria Silva publicou a Apostila Informática Básica — Módulo 1. Acesse na aba Materiais.', channel: 'IN_APP' as const },
        ];
        for (const n of NOTIFS) {
            await prisma.notification.create({ data: { userId: daviS.userId, ...n, deliveryStatus: 'DELIVERED', sentAt: daysAgo(2), readAt: daysAgo(1) }});
        }
    }
    // Notificação para admin
    await prisma.notification.create({ data: { userId: adminUser.id, type: 'ENROLLMENT_RECEIVED', title: 'Nova Inscrição Recebida', message: 'Pedro Henrique Santos Oliveira se inscreveu no curso Informática Básica (turma INF-SLZ-001). Aguardando análise.', channel: 'IN_APP', deliveryStatus: 'DELIVERED', sentAt: daysAgo(1) }});

    console.log('  ✅ Notificações');

    // ══════════════════════════════════════════════════════════════════
    // FEEDBACKS (CourseFeedback)
    // ══════════════════════════════════════════════════════════════════
    // CourseFeedback requer certificateId (único por cert). Só cria se já existe certificado para Davi na T3.
    try {
        if (daviS) {
            const cert = await prisma.certificate.findFirst({ where: { studentId: daviS.studentId, classId: t3.id } });
            if (cert) {
                const fbEx = await prisma.courseFeedback.findFirst({ where: { studentId: daviS.studentId, classId: t3.id } });
                if (!fbEx) {
                    await prisma.courseFeedback.create({ data: {
                        studentId: daviS.studentId, classId: t3.id,
                        certificateId: cert.id, status: 'APPROVED',
                        ratingCourse: 5, ratingSystem: 4, ratingManagement: 5, ratingTeachers: 5, ratingGeneral: 5,
                        commentPositive: 'Excelente curso! A professora Maria explicou muito bem todos os conteúdos práticos.',
                        commentImprovement: 'Poderia ter mais aulas de Excel avançado no módulo final.',
                        commentGeneral: 'Já consegui uma entrevista de emprego graças ao certificado!',
                        currentStatus: 'EMPLOYED_CLT',
                        currentStatusDetails: 'Contratado como Assistente Administrativo.',
                        submittedAt: daysAgo(3), invitedAt: daysAgo(6), expiresAt: daysAhead(24),
                    }});
                }
            }
        }
        console.log('  ✅ Feedbacks');
    } catch (e: any) {
        console.warn('  ⚠️  CourseFeedback ignorado (migração pendente?):', e?.message?.split('\n')[0]);
    }

    // ══════════════════════════════════════════════════════════════════
    // AUDITLOG (atividades recentes para o dashboard)
    // ══════════════════════════════════════════════════════════════════
    const AUDITS = [
        { action: 'ENROLLMENT_APPROVED', tableName: 'enrollments', userId: adminUser.id, newData: { student: 'Davi Rhuan da Silva Martins', course: 'Informática Básica', status: 'ENROLLED' }},
        { action: 'CERTIFICATE_ISSUED', tableName: 'certificates', userId: adminUser.id, newData: { student: 'Davi Rhuan da Silva Martins', course: 'Assistente Administrativo' }},
        { action: 'CLASS_CREATED', tableName: 'classes', userId: adminUser.id, newData: { identifier: 'MKT-IMP-001', course: 'Marketing Digital', city: 'Imperatriz' }},
        { action: 'ENROLLMENT_RECEIVED', tableName: 'enrollments', userId: adminUser.id, newData: { student: 'Pedro Henrique Santos Oliveira', course: 'Informática Básica' }},
        { action: 'ABSENCE_REGISTERED', tableName: 'absences', userId: adminUser.id, newData: { employee: 'Maria Silva Pereira', type: 'EMERGENCY', status: 'PENDING' }},
    ];
    for (let i = 0; i < AUDITS.length; i++) {
        const a = AUDITS[i];
        const ex = await prisma.auditLog.findFirst({ where: { action: a.action, tableName: a.tableName } });
        if (!ex) await prisma.auditLog.create({ data: { userId: a.userId, action: a.action, tableName: a.tableName, newData: a.newData, createdAt: daysAgo(i) }});
    }
    console.log('  ✅ AuditLog (atividades recentes)');

    return { t1, t2, t3, t4 };
}
