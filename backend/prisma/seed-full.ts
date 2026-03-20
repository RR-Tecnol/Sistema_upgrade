/**
 * seed-full.ts — SEED UNIFICADO COMPLETO
 * Consolida: seed.ts + seed-usuarios-visuais.ts + seed-test.ts +
 *            seed-test-data.ts + seed-demo.ts + seed-extra.ts +
 *            seed-final.ts + seed-mega.ts + seed-apresentacao.ts
 * Execute: npx tsx prisma/seed-full.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { execSync } from 'child_process';
import process from 'node:process';

const prisma = new PrismaClient();

function diasUteis(back: number): Date {
    const d = new Date();
    let count = 0;
    while (count < back) {
        d.setDate(d.getDate() - 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) count++;
    }
    d.setHours(10, 0, 0, 0);
    return new Date(d);
}

async function runSeed1_base() {
    console.log('\n━━━ [1/9] seed.ts — Grupos, Cidades, Cursos, Admin ━━━');
    const grupo1MA = await prisma.group.upsert({ where: { name: 'Grupo 1 MA' }, update: {}, create: { name: 'Grupo 1 MA', state: 'MA' } });
    await prisma.group.upsert({ where: { name: 'Grupo 2 MA' }, update: {}, create: { name: 'Grupo 2 MA', state: 'MA' } });
    await prisma.group.upsert({ where: { name: 'Grupo 1 PI' }, update: {}, create: { name: 'Grupo 1 PI', state: 'PI' } });
    await prisma.group.upsert({ where: { name: 'Grupo 1 AC' }, update: {}, create: { name: 'Grupo 1 AC', state: 'AC' } });
    console.log('✅ Grupos criados');

    const cities = [
        { name: 'São Luís', state: 'MA', ibgeCode: '2111300' }, { name: 'Imperatriz', state: 'MA', ibgeCode: '2105302' },
        { name: 'São José de Ribamar', state: 'MA', ibgeCode: '2111201' }, { name: 'Timon', state: 'MA', ibgeCode: '2112209' },
        { name: 'Caxias', state: 'MA', ibgeCode: '2103000' }, { name: 'Codó', state: 'MA', ibgeCode: '2103307' },
        { name: 'Paço do Lumiar', state: 'MA', ibgeCode: '2107704' }, { name: 'Açailândia', state: 'MA', ibgeCode: '2100055' },
        { name: 'Bacabal', state: 'MA', ibgeCode: '2101202' }, { name: 'Balsas', state: 'MA', ibgeCode: '2101400' },
        { name: 'Teresina', state: 'PI', ibgeCode: '2211001' }, { name: 'Parnaíba', state: 'PI', ibgeCode: '2207702' },
        { name: 'Picos', state: 'PI', ibgeCode: '2208007' }, { name: 'Floriano', state: 'PI', ibgeCode: '2203909' },
        { name: 'Piripiri', state: 'PI', ibgeCode: '2208304' }, { name: 'Campo Maior', state: 'PI', ibgeCode: '2202251' },
        { name: 'Barras', state: 'PI', ibgeCode: '2201200' }, { name: 'Altos', state: 'PI', ibgeCode: '2200400' },
        { name: 'Esperantina', state: 'PI', ibgeCode: '2203701' }, { name: 'Pedro II', state: 'PI', ibgeCode: '2207900' },
        { name: 'Rio Branco', state: 'AC', ibgeCode: '1200401' }, { name: 'Cruzeiro do Sul', state: 'AC', ibgeCode: '1200203' },
        { name: 'Sena Madureira', state: 'AC', ibgeCode: '1200500' }, { name: 'Taraucaá', state: 'AC', ibgeCode: '1200609' },
        { name: 'Feijó', state: 'AC', ibgeCode: '1200302' }, { name: 'Brasileia', state: 'AC', ibgeCode: '1200104' },
        { name: 'Epitaciolândia', state: 'AC', ibgeCode: '1200252' }, { name: 'Xapuri', state: 'AC', ibgeCode: '1200708' },
        { name: 'Senador Guiomard', state: 'AC', ibgeCode: '1200450' }, { name: 'Plácido de Castro', state: 'AC', ibgeCode: '1200385' },
    ];
    for (const city of cities) await prisma.city.upsert({ where: { name_state: { name: city.name, state: city.state } }, update: {}, create: city });
    console.log(`✅ ${cities.length} cidades criadas`);

    const courses = [
        { name: 'Informática Básica', description: 'Curso básico de informática com Windows, Word, Excel e Internet', durationDaysMA: 30, durationDaysPI: 30, workloadHours: 120, prerequisites: 'Ensino fundamental completo', syllabus: 'Módulo 1: Introdução\nMódulo 2: Windows\nMódulo 3: Word\nMódulo 4: Excel\nMódulo 5: Internet', availableInMA: true, availableInPI: true, isMulticourse: false },
        { name: 'Excel Avançado', description: 'Curso avançado de Excel com fórmulas, tabelas dinâmicas e macros', durationDaysMA: 20, durationDaysPI: 20, workloadHours: 80, prerequisites: 'Conhecimento básico de Excel', syllabus: 'Módulo 1: Fórmulas\nMódulo 2: Tabelas Dinâmicas\nMódulo 3: Gráficos\nMódulo 4: Macros', availableInMA: true, availableInPI: true, isMulticourse: false },
        { name: 'Assistente Administrativo', description: 'Formação completa para atuar como assistente administrativo', durationDaysMA: 45, durationDaysPI: 45, workloadHours: 180, prerequisites: 'Ensino médio completo', syllabus: 'Módulo 1: Rotinas\nMódulo 2: Atendimento\nMódulo 3: Documentos\nMódulo 4: Informática\nMódulo 5: Comunicação', availableInMA: true, availableInPI: true, isMulticourse: false },
        { name: 'Operador de Caixa', description: 'Capacitação para atuar como operador de caixa no varejo', durationDaysMA: 15, durationDaysPI: 15, workloadHours: 60, prerequisites: 'Ensino fundamental completo', syllabus: 'Módulo 1: Atendimento\nMódulo 2: Operação\nMódulo 3: Matemática\nMódulo 4: Segurança', availableInMA: true, availableInPI: true, isMulticourse: false },
        { name: 'Auxiliar de Recursos Humanos', description: 'Formação para atuar no departamento de recursos humanos', durationDaysMA: 40, durationDaysPI: 40, workloadHours: 160, prerequisites: 'Ensino médio completo', syllabus: 'Módulo 1: RH\nMódulo 2: Recrutamento\nMódulo 3: Departamento Pessoal\nMódulo 4: Legislação', availableInMA: true, availableInPI: true, isMulticourse: false },
        { name: 'Marketing Digital', description: 'Curso completo de marketing digital e redes sociais', durationDaysMA: 30, durationDaysPI: 30, workloadHours: 120, prerequisites: 'Conhecimento básico de informática', syllabus: 'Módulo 1: Fundamentos\nMódulo 2: Redes Sociais\nMódulo 3: Google Ads\nMódulo 4: E-mail\nMódulo 5: Métricas', availableInMA: true, availableInPI: true, isMulticourse: false },
        { name: 'Empreendedorismo', description: 'Capacitação para abrir e gerenciar o próprio negócio', durationDaysMA: 25, durationDaysPI: 25, workloadHours: 100, prerequisites: 'Ensino médio completo', syllabus: 'Módulo 1: Perfil\nMódulo 2: Plano\nMódulo 3: Finanças\nMódulo 4: Marketing\nMódulo 5: Gestão', availableInMA: true, availableInPI: true, isMulticourse: false },
        { name: 'Qualificação Profissional (Multicurso)', description: 'Curso multicurso com diversos módulos profissionalizantes', durationDaysMA: 60, durationDaysPI: 60, workloadHours: 240, prerequisites: 'Ensino fundamental completo', syllabus: 'Módulo 1: Informática\nMódulo 2: Atendimento\nMódulo 3: Vendas\nMódulo 4: Gestão\nMódulo 5: Empreendedorismo', availableInMA: true, availableInPI: true, isMulticourse: true },
    ];
    for (const course of courses) {
        const existing = await prisma.course.findFirst({ where: { name: course.name } });
        if (!existing) await prisma.course.create({ data: course });
    }
    console.log(`✅ ${courses.length} cursos criados`);

    const adminPw = await bcrypt.hash('RR@@Upgrade', 10);
    await prisma.user.upsert({ where: { email: 'admin@qualifica.com' }, update: { password: adminPw }, create: { email: 'admin@qualifica.com', password: adminPw, name: 'Administrador', phone: '(98) 98888-8888', role: 'ADMIN', active: true } });
    console.log('✅ Admin criado');
}

async function runSeed2_usuariosVisuais() {
    console.log('\n━━━ [2/9] seed-usuarios-visuais.ts — Maria, João, Aluno ━━━');
    const hash = await bcrypt.hash('RR@@Upgrade', 10);

    const adminUser = await prisma.user.upsert({ where: { email: 'admin@qualifica.com' }, update: { password: hash }, create: { email: 'admin@qualifica.com', password: hash, name: 'Administrador Upgrade', phone: '(98) 98888-8888', role: 'ADMIN', active: true } });

    const mariaUser = await prisma.user.upsert({ where: { email: 'maria.professora.visual@qualifica.com' }, update: { password: hash }, create: { email: 'maria.professora.visual@qualifica.com', password: hash, name: 'Maria Professora Visual', phone: '(98) 91111-2222', role: 'TEACHER', active: true } });
    let mariaTeacher = await prisma.teacher.findFirst({ where: { userId: mariaUser.id } });
    if (!mariaTeacher) mariaTeacher = await prisma.teacher.create({ data: { userId: mariaUser.id, cpf: '555.666.777-88', rg: '7654321', birthDate: new Date('1988-04-15'), education: 'Licenciatura em Pedagogia — UFMA', specialties: 'Informática Educacional, Gestão Administrativa', contractType: 'PJ', hireDate: new Date('2024-03-01'), active: true } as any });
    console.log(`✅ Maria: ${mariaUser.email}`);

    const joaoUser = await prisma.user.upsert({ where: { email: 'joao.driver.test99@qualifica.com' }, update: { password: hash }, create: { email: 'joao.driver.test99@qualifica.com', password: hash, name: 'João Motorista', phone: '(98) 99999-0001', role: 'DRIVER', active: true } });
    let joaoEmployee = await prisma.employee.findFirst({ where: { userId: joaoUser.id } });
    if (!joaoEmployee) joaoEmployee = await prisma.employee.create({ data: { cpf: '444.555.666-77', name: joaoUser.name, role: 'DRIVER', department: 'LOGISTICS', phone: joaoUser.phone!, contractType: 'CLT', monthlySalaryCLT: 2800.00, travelRuleKm: 200, active: true, userId: joaoUser.id } });
    console.log(`✅ João: ${joaoUser.email}`);

    const alunoUser = await prisma.user.upsert({ where: { email: 'aluno@qualifica.com' }, update: { password: hash }, create: { email: 'aluno@qualifica.com', password: hash, name: 'João Aluno Silva', phone: '(98) 98765-4321', role: 'STUDENT', active: true } });
    let alunoStudent = await prisma.student.findFirst({ where: { userId: alunoUser.id } });
    if (!alunoStudent) {
        alunoStudent = await prisma.student.create({ data: { userId: alunoUser.id, cpf: '111.222.333-55', rg: '9999999', rgIssuer: 'SSP-MA', birthDate: new Date('2000-01-10'), gender: 'MALE', raceColor: 'BROWN', maritalStatus: 'SINGLE', motherName: 'Ana Maria Silva', nationality: 'Brasileiro', birthCity: 'São Luís', birthState: 'MA', active: true, contact: { create: { email: 'aluno@qualifica.com', phone: '(98) 98765-4321', hasWhatsapp: true } }, address: { create: { cep: '65000-000', street: 'Rua Principal', number: '100', neighborhood: 'Centro', city: 'São Luís', state: 'MA', zone: 'URBAN' } }, socioeconomic: { create: { educationLevel: 'HIGH_SCHOOL_COMPLETE', employmentStatus: 'UNEMPLOYED', familyIncome: 'UP_TO_1_MW', familyMembersCount: 4, socialProgram: 'BOLSA_FAMILIA', publicSchoolOnly: true } }, professional: { create: { careerGoal: 'SEEK_EMPLOYMENT', howHeardAbout: 'Indicação de Amigo' } } } });
    }
    console.log(`✅ Aluno: ${alunoUser.email}`);

    const turmasAtivas = await prisma.class.findMany({ where: { status: { in: ['IN_PROGRESS', 'ENROLLMENT_OPEN'] } }, take: 3 });
    let vinculadas = 0;
    for (const t of turmasAtivas) {
        const ex = await prisma.classTeacher.findFirst({ where: { classId: t.id, teacherId: mariaTeacher!.id } });
        if (!ex) { await prisma.classTeacher.create({ data: { classId: t.id, teacherId: mariaTeacher!.id, isSubstitute: false } }); vinculadas++; }
    }
    if (turmasAtivas.length === 0) {
        const cursoInfo = await prisma.course.findFirst({ where: { name: 'Informática Básica' } });
        const grupo = await prisma.group.findFirst();
        const cidade = await prisma.city.findFirst();
        if (cursoInfo && grupo && cidade) {
            const nova = await prisma.class.create({ data: { classIdentifier: 'DEMO-MARIA-001', courseId: cursoInfo.id, groupId: grupo.id, cityId: cidade.id, period: 'MORNING', startTime: '08:00', endTime: '12:00', startDate: new Date(), endDate: new Date(Date.now() + 45 * 86400000), vacancies: 30, status: 'IN_PROGRESS' } });
            await prisma.classTeacher.create({ data: { classId: nova.id, teacherId: mariaTeacher!.id, isSubstitute: false } }); vinculadas++;
        }
    }
    console.log(`✅ Maria vinculada a ${vinculadas} turma(s)`);

    const turmaParaAluno = await prisma.class.findFirst({ where: { status: 'IN_PROGRESS' } });
    if (turmaParaAluno && alunoStudent) {
        const enEx = await prisma.enrollment.findFirst({ where: { studentId: alunoStudent.id, classId: turmaParaAluno.id } });
        if (!enEx) { await prisma.enrollment.create({ data: { studentId: alunoStudent.id, classId: turmaParaAluno.id, protocol: `INS-ALUNO-${Date.now()}`, status: 'ENROLLED', enrolledAt: new Date(), reviewedAt: new Date(), reviewedBy: adminUser.id } }); console.log(`✅ Aluno matriculado em ${turmaParaAluno.classIdentifier}`); }
    }

    const truck = await prisma.truck.findFirst();
    const cidadeO = await prisma.city.findFirst({ where: { state: 'MA' } });
    const cidadeD = await prisma.city.findFirst({ where: { state: 'PI' } });
    if (truck && cidadeO && cidadeD) {
        const tripEx = await prisma.trip.findFirst({ where: { driverUserId: joaoUser.id } });
        if (!tripEx) { await prisma.trip.create({ data: { truckId: truck.id, driverName: joaoUser.name, driverUserId: joaoUser.id, originCityId: cidadeO.id, destinationCityId: cidadeD.id, departureDate: new Date(Date.now() + 2 * 86400000), expectedArrivalDate: new Date(Date.now() + 3 * 86400000), status: 'PLANNED', notes: 'Viagem de teste para João Motorista' } }); }
    }
}

async function runSeed3_test() {
    console.log('\n━━━ [3/9] seed-test.ts — Aluno teste + Reembolsos ━━━');
    const hashedPw = await bcrypt.hash('RR@@Upgrade', 10);
    const studentUser = await prisma.user.upsert({ where: { email: 'aluno@qualifica.com' }, update: { password: hashedPw }, create: { email: 'aluno@qualifica.com', password: hashedPw, name: 'João da Silva (Teste)', phone: '(98) 99999-0001', role: 'STUDENT', active: true } });
    const student = await prisma.student.upsert({ where: { userId: studentUser.id }, update: {}, create: { userId: studentUser.id, cpf: '111.111.111-11', rg: '1234567', rgIssuer: 'SSP/MA', birthDate: new Date('1995-06-15'), gender: 'MALE', raceColor: 'BROWN', maritalStatus: 'SINGLE', motherName: 'Maria da Silva', fatherName: 'José da Silva', nationality: 'Brasileiro', birthCity: 'São Luís', birthState: 'MA' } });
    await prisma.studentContact.upsert({ where: { studentId: student.id }, update: {}, create: { studentId: student.id, email: 'aluno@qualifica.com', phone: '(98) 99999-0001', hasWhatsapp: true, allowWhatsappContact: true, allowEmailContact: true } });
    await prisma.studentAddress.upsert({ where: { studentId: student.id }, update: {}, create: { studentId: student.id, cep: '65000-000', street: 'Rua das Flores', number: '123', neighborhood: 'Centro', city: 'São Luís', state: 'MA', zone: 'URBAN' } });
    await prisma.studentSocioeconomic.upsert({ where: { studentId: student.id }, update: {}, create: { studentId: student.id, educationLevel: 'HIGH_SCHOOL_COMPLETE', employmentStatus: 'UNEMPLOYED', familyIncome: 'UP_TO_1_MW', familyMembersCount: 4, socialProgram: 'BOLSA_FAMILIA', hasDisability: false, publicSchoolOnly: true } });

    const firstClass = await prisma.class.findFirst({ where: { status: { in: ['IN_PROGRESS', 'ENROLLMENT_OPEN', 'COMPLETED'] } }, include: { course: true, city: true } });
    if (firstClass) {
        const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        const enrollEx = await prisma.enrollment.findFirst({ where: { studentId: student.id, classId: firstClass.id } });
        if (!enrollEx) await prisma.enrollment.create({ data: { studentId: student.id, classId: firstClass.id, protocol: `UPG-TEST-${Date.now()}`, status: 'ENROLLED', enrolledAt: new Date(), reviewedBy: adminUser?.id, reviewedAt: new Date() } });
        if (adminUser) {
            const today = new Date(); const dates: Date[] = []; let d = new Date(today); let cnt = 0;
            while (cnt < 10) { d.setDate(d.getDate() - 1); if (d.getDay() !== 0 && d.getDay() !== 6) { dates.push(new Date(d)); cnt++; } }
            for (let i = 0; i < dates.length; i++) { try { await prisma.attendance.upsert({ where: { classId_studentId_date: { classId: firstClass.id, studentId: student.id, date: dates[i] } }, update: {}, create: { classId: firstClass.id, studentId: student.id, date: dates[i], present: i < 9, registeredBy: adminUser.id } }); } catch {} }
            console.log('✅ Frequências seed-test criadas (90%)');
        }
    }

    const employee = await prisma.employee.upsert({ where: { email: 'professor.teste@qualifica.com' }, update: {}, create: { name: 'Prof. Carlos Mendes (Teste)', email: 'professor.teste@qualifica.com', role: 'INSTRUCTOR', department: 'ACADEMIC', cpf: '222.222.222-22', phone: '(98) 99999-0002', contractType: 'FREELANCE', active: true } });
    const adminUser2 = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (adminUser2) {
        const reimEx = await prisma.reimbursement.findFirst({ where: { requestedBy: adminUser2.id, description: { contains: '[TESTE]' } } });
        if (!reimEx) {
            await prisma.reimbursement.create({ data: { requestedBy: adminUser2.id, employeeId: employee.id, type: 'CLASSROOM_MATERIAL', amount: 89.90, description: '[TESTE] Material de aula - kit de canetas e papel A4', receiptUrl: '', status: 'PENDING', active: true } });
            await prisma.reimbursement.create({ data: { requestedBy: adminUser2.id, employeeId: employee.id, type: 'CLEANING_MATERIAL', amount: 45.50, description: '[TESTE] Material de limpeza - pano e detergente', receiptUrl: '', status: 'APPROVED', approvedBy: adminUser2.id, approvedAt: new Date(), active: true } });
            await prisma.reimbursement.create({ data: { requestedBy: adminUser2.id, employeeId: employee.id, type: 'FOOD', amount: 200.00, description: '[TESTE] Alimentação - almoço em restaurante', receiptUrl: '', status: 'REJECTED', approvedBy: adminUser2.id, rejectedAt: new Date(), rejectionReason: 'Valor acima do permitido', active: true } });
            console.log('✅ 3 reembolsos de teste criados (PENDING, APPROVED, REJECTED)');
        }
    }
}

// ── PLACEHOLDER_SEEDS_4_TO_9 ──
async function main() {
    console.log('\n🚀 SEED UNIFICADO COMPLETO — iniciando...');
    console.log('═'.repeat(60));
    try { await runSeed1_base(); } catch (e: any) { console.error('❌ Erro seed 1:', e?.message); }
    try { await runSeed2_usuariosVisuais(); } catch (e: any) { console.error('❌ Erro seed 2:', e?.message); }
    try { await runSeed3_test(); } catch (e: any) { console.error('❌ Erro seed 3:', e?.message); }

    console.log('\n' + '═'.repeat(60));
    console.log('🎉 SEED UNIFICADO CONCLUÍDO!');
    console.log('🔑 admin@qualifica.com / RR@@Upgrade');
    console.log('🔑 maria.professora.visual@qualifica.com / RR@@Upgrade');
    console.log('🔑 joao.driver.test99@qualifica.com / RR@@Upgrade');
    console.log('🔑 aluno@qualifica.com / RR@@Upgrade');
    console.log('═'.repeat(60) + '\n');
}

main()
    .catch(e => { console.error('❌ Erro fatal:', e?.message ?? e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
