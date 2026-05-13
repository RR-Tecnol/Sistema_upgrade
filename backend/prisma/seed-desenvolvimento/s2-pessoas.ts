import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export async function seedPessoas(prisma: PrismaClient, ctx: {
    adminUser: any; courseMap: Record<string, string>;
    truck1: any; truck2: any; g1ma: any; g1pi: any;
}) {
    const { adminUser, courseMap, truck1, truck2, g1ma, g1pi } = ctx;
    const hash = await bcrypt.hash('RR@@Upgrade', 10);
    console.log('\n━━━ [M2] Professores, Motoristas, Alunos ━━━');

    // ══════════════════════════════════════════════════════════════════
    // PROFESSORES
    // ══════════════════════════════════════════════════════════════════
    const mariaUser = await prisma.user.upsert({
        where: { email: 'maria.silva@qualifica.com' },
        update: { password: hash },
        create: { email: 'maria.silva@qualifica.com', password: hash, name: 'Maria Silva Pereira', phone: '(98) 99111-2233', role: 'TEACHER', active: true },
    });
    let mariaTeacher = await prisma.teacher.findFirst({ where: { userId: mariaUser.id } });
    if (!mariaTeacher) mariaTeacher = await prisma.teacher.create({ data: {
        userId: mariaUser.id, cpf: '321.654.987-00', birthDate: new Date('1988-04-15'),
        education: 'Licenciatura em Pedagogia — UFMA', specialties: 'Informática Educacional, Gestão Administrativa',
        contractType: 'PJ', hireDate: new Date('2023-03-01'), active: true,
    } as any });

    const carlosUser = await prisma.user.upsert({
        where: { email: 'carlos.mendes@qualifica.com' },
        update: { password: hash },
        create: { email: 'carlos.mendes@qualifica.com', password: hash, name: 'Carlos Eduardo Mendes', phone: '(86) 99222-3344', role: 'TEACHER', active: true },
    });
    let carlosTeacher = await prisma.teacher.findFirst({ where: { userId: carlosUser.id } });
    if (!carlosTeacher) carlosTeacher = await prisma.teacher.create({ data: {
        userId: carlosUser.id, cpf: '456.789.012-11', birthDate: new Date('1985-09-20'),
        education: 'Bacharelado em Administração — UFPI', specialties: 'Marketing Digital, Empreendedorismo, Excel Avançado',
        contractType: 'CLT', hireDate: new Date('2022-07-01'), active: true,
    } as any });

    await prisma.userPreferences.upsert({ where: { userId: mariaUser.id }, update: {}, create: { userId: mariaUser.id } });
    await prisma.userPreferences.upsert({ where: { userId: carlosUser.id }, update: {}, create: { userId: carlosUser.id } });
    console.log('  ✅ 2 professores');

    // ══════════════════════════════════════════════════════════════════
    // MOTORISTA PRINCIPAL
    // ══════════════════════════════════════════════════════════════════
    const joaoUser = await prisma.user.upsert({
        where: { email: 'joao.motorista@qualifica.com' },
        update: { password: hash },
        create: { email: 'joao.motorista@qualifica.com', password: hash, name: 'João Batista Ferreira', phone: '(98) 99333-4455', role: 'DRIVER', active: true },
    });
    let joaoEmployee = await prisma.employee.findFirst({ where: { userId: joaoUser.id } });
    if (!joaoEmployee) joaoEmployee = await prisma.employee.create({ data: {
        cpf: '111.222.333-44', name: 'João Batista Ferreira', role: 'DRIVER', department: 'LOGISTICS',
        phone: '(98) 99333-4455', contractType: 'CLT', monthlySalaryCLT: 3200.00,
        travelRuleKm: 200, active: true, userId: joaoUser.id,
    }});
    await prisma.userPreferences.upsert({ where: { userId: joaoUser.id }, update: {}, create: { userId: joaoUser.id } });

    // Viagens do João
    const slz = await prisma.city.findFirst({ where: { name: 'São Luís', state: 'MA' } });
    const ter = await prisma.city.findFirst({ where: { name: 'Teresina', state: 'PI' } });
    const cax = await prisma.city.findFirst({ where: { name: 'Caxias', state: 'MA' } });
    await prisma.trip.deleteMany({ where: { driverUserId: joaoUser.id } });
    if (slz && ter && cax) {
        const dep45 = new Date(Date.now() - 45*86400000); dep45.setHours(6,0,0,0);
        await prisma.trip.create({ data: { truckId: truck1.id, driverName: joaoUser.name, driverUserId: joaoUser.id, originCityId: slz.id, destinationCityId: cax.id, departureDate: dep45, expectedArrivalDate: new Date(dep45.getTime()+4*3600000), actualArrivalDate: new Date(dep45.getTime()+3.8*3600000), status: 'COMPLETED', kmStart: 138200, kmEnd: 138850, notes: 'São Luís → Caxias — veículo anterior MHJ-9876' }});
        const dep3 = new Date(Date.now() - 3*86400000); dep3.setHours(6,0,0,0);
        await prisma.trip.create({ data: { truckId: truck1.id, driverName: joaoUser.name, driverUserId: joaoUser.id, originCityId: slz.id, destinationCityId: ter.id, departureDate: dep3, expectedArrivalDate: new Date(dep3.getTime()+8*3600000), actualArrivalDate: new Date(dep3.getTime()+7.5*3600000), status: 'COMPLETED', kmStart: 142800, kmEnd: 143550, notes: 'São Luís/MA → Teresina/PI — concluída' }});
        await prisma.trip.create({ data: { truckId: truck1.id, driverName: joaoUser.name, driverUserId: joaoUser.id, originCityId: ter.id, destinationCityId: slz.id, departureDate: new Date(Date.now()-2*3600000), expectedArrivalDate: new Date(Date.now()+6*3600000), status: 'IN_TRANSIT', kmStart: 143550, notes: 'Teresina/PI → São Luís/MA — em andamento' }});
        await prisma.trip.create({ data: { truckId: truck1.id, driverName: joaoUser.name, driverUserId: joaoUser.id, originCityId: slz.id, destinationCityId: ter.id, departureDate: new Date(Date.now()+2*86400000), expectedArrivalDate: new Date(Date.now()+3*86400000), status: 'PLANNED', notes: 'Planejada — retorno São Luís → Teresina' }});
    }

    // Reembolsos do João
    await prisma.reimbursement.create({ data: { requestedBy: joaoUser.id, employeeId: joaoEmployee.id, type: 'FOOD', amount: 65.00, description: 'Alimentação durante viagem São Luís → Teresina — almoço em restaurante na BR-316', receiptUrl: '', status: 'APPROVED', approvedBy: adminUser.id, approvedAt: new Date(Date.now()-2*86400000), active: true }});
    await prisma.reimbursement.create({ data: { requestedBy: joaoUser.id, employeeId: joaoEmployee.id, type: 'EMERGENCY_REPAIR', amount: 220.00, description: 'Troca emergencial de pneu furado km 347 da BR-316 — compra comprovada por nota fiscal', receiptUrl: '', status: 'PENDING', active: true }});
    await prisma.reimbursement.create({ data: { requestedBy: joaoUser.id, employeeId: joaoEmployee.id, type: 'FOOD', amount: 350.00, description: 'Solicitação de alimentação sem comprovante válido — valor acima do limite da política de viagens', receiptUrl: '', status: 'REJECTED', approvedBy: adminUser.id, approvedAt: new Date(Date.now()-5*86400000), active: true }});

    // Ausências do João
    await prisma.absence.deleteMany({ where: { userId: joaoUser.id } });
    await prisma.absence.createMany({ data: [
        { userId: joaoUser.id, type: 'ILLNESS', date: new Date(Date.now()-45*86400000), description: 'Gripe forte com febre — atestado médico de 3 dias apresentado.', status: 'VALIDATED', adminNote: 'Atestado válido. Ausência justificada.', reviewedBy: adminUser.id, reviewedAt: new Date(Date.now()-44*86400000), active: true },
        { userId: joaoUser.id, type: 'PERSONAL', date: new Date(Date.now()-20*86400000), description: 'Ausência por motivo pessoal sem comprovante dentro do prazo regimental.', status: 'PENALIZED', adminNote: 'Sem documento válido. Desconto de R$ 140,00 aplicado.', penalty: 140.00, reviewedBy: adminUser.id, reviewedAt: new Date(Date.now()-19*86400000), active: true },
        { userId: joaoUser.id, type: 'EMERGENCY', date: new Date(Date.now()-5*86400000), description: 'Emergência familiar — familiar hospitalizado. Aguardando boletim médico.', status: 'PENDING', active: true },
    ]});
    console.log('  ✅ João motorista + viagens + ausências');

    // ══════════════════════════════════════════════════════════════════
    // FUNCIONÁRIOS EXTRAS (para aba Funcionários)
    // ══════════════════════════════════════════════════════════════════
    const coordUser = await prisma.user.upsert({
        where: { email: 'lucia.coord@qualifica.com' },
        update: { password: hash },
        create: { email: 'lucia.coord@qualifica.com', password: hash, name: 'Lúcia Rodrigues Almeida', phone: '(98) 99444-5566', role: 'COORDINATOR', active: true },
    });
    const coordEmp = await prisma.employee.findFirst({ where: { userId: coordUser.id } }) ??
        await prisma.employee.create({ data: { cpf: '222.333.444-55', name: 'Lúcia Rodrigues Almeida', role: 'COORDINATOR', department: 'ADMINISTRATION', phone: '(98) 99444-5566', contractType: 'CLT', monthlySalaryCLT: 4200.00, active: true, userId: coordUser.id }});

    // Ausências da Maria (professora)
    await prisma.absence.deleteMany({ where: { userId: mariaUser.id } });
    await prisma.absence.createMany({ data: [
        { userId: mariaUser.id, type: 'ILLNESS', date: new Date(Date.now()-60*86400000), description: 'Gripe forte com atestado médico de 2 dias — impossível ministrar aulas.', status: 'VALIDATED', adminNote: 'Atestado médico válido. Ausência justificada, sem impacto no pagamento.', reviewedBy: adminUser.id, reviewedAt: new Date(Date.now()-59*86400000), active: true },
        { userId: mariaUser.id, type: 'PERSONAL', date: new Date(Date.now()-30*86400000), description: 'Ausência por motivo pessoal. Nenhum documento apresentado no prazo.', status: 'PENALIZED', adminNote: 'Desconto de R$ 200,00 aplicado conforme regulamento.', penalty: 200.00, reviewedBy: adminUser.id, reviewedAt: new Date(Date.now()-29*86400000), active: true },
        { userId: mariaUser.id, type: 'EMERGENCY', date: new Date(Date.now()-3*86400000), description: 'Emergência familiar — filho hospitalizado. Aguardando documentação médica.', status: 'PENDING', active: true },
    ]});

    // EmployeeAttendance para Lúcia (últimos 5 dias úteis)
    const today = new Date();
    for (let i = 1; i <= 5; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i); d.setHours(8,0,0,0);
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        await prisma.employeeAttendance.upsert({
            where: { employeeId_date: { employeeId: coordEmp.id, date: d } },
            update: {},
            create: { employeeId: coordEmp.id, date: d, present: i !== 3, justified: i === 3, justification: i === 3 ? 'Consulta médica agendada' : undefined, registeredBy: adminUser.id },
        });
    }

    // TeacherCheckin para Maria (últimos 5 dias)
    for (let i = 1; i <= 5; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        const dateStr = d.toISOString().split('T')[0];
        const ex = await prisma.teacherCheckin.findFirst({ where: { userId: mariaUser.id, date: dateStr } });
        if (!ex) await prisma.teacherCheckin.create({ data: { userId: mariaUser.id, date: dateStr, checkedAt: new Date(d.setHours(7, 45, 0, 0)), note: i === 2 ? 'Trânsito na Av. dos Holandeses' : undefined }});
    }
    console.log('  ✅ Ausências + checkins + frequências funcionário');

    // ══════════════════════════════════════════════════════════════════
    // ALUNOS (perfis 100% preenchidos)
    // ══════════════════════════════════════════════════════════════════
    const ALUNOS = [
        { email: 'davi.martins@qualifica.com', name: 'Davi Rhuan da Silva Martins', phone: '(98) 98970-1346', cpf: '615.648.503-80', birth: '2005-04-27', gender: 'MALE' as const, race: 'BROWN' as const, marital: 'SINGLE' as const, mother: 'Francisca das Chagas Silva Martins', nationality: 'Brasileiro', birthCity: 'São Luís', birthState: 'MA', cep: '65073-460', street: 'Rua Duque Bacelo', number: 's/n', neighborhood: 'Quintas do Calhau', city: 'São Luís', state: 'MA', zone: 'URBAN' as const, edu: 'HIGH_SCHOOL_COMPLETE' as const, emp: 'UNEMPLOYED' as const, income: 'UP_TO_1_MW' as const, members: 4, goal: 'ENTREPRENEURSHIP' as const, socialProg: 'BOLSA_FAMILIA' as const },
        { email: 'ana.lima@qualifica.com', name: 'Ana Beatriz Lima Fonseca', phone: '(86) 99201-7788', cpf: '321.987.654-11', birth: '1999-11-15', gender: 'FEMALE' as const, race: 'BLACK' as const, marital: 'SINGLE' as const, mother: 'Raimunda de Lima', nationality: 'Brasileira', birthCity: 'Teresina', birthState: 'PI', cep: '64050-330', street: 'Rua Álvaro Mendes', number: '1204', neighborhood: 'Centro', city: 'Teresina', state: 'PI', zone: 'URBAN' as const, edu: 'HIGHER_INCOMPLETE' as const, emp: 'STUDENT' as const, income: 'FROM_1_TO_2_MW' as const, members: 3, goal: 'SEEK_EMPLOYMENT' as const, socialProg: 'NONE' as const },
        { email: 'pedro.santos@qualifica.com', name: 'Pedro Henrique Santos Oliveira', phone: '(98) 99302-4433', cpf: '987.654.321-00', birth: '2001-06-30', gender: 'MALE' as const, race: 'BROWN' as const, marital: 'SINGLE' as const, mother: 'Conceição Maria Santos', nationality: 'Brasileiro', birthCity: 'Imperatriz', birthState: 'MA', cep: '65903-390', street: 'Av. Getúlio Vargas', number: '305', neighborhood: 'Jardim Imperial', city: 'Imperatriz', state: 'MA', zone: 'URBAN' as const, edu: 'HIGH_SCHOOL_COMPLETE' as const, emp: 'SELF_EMPLOYED' as const, income: 'FROM_1_TO_2_MW' as const, members: 5, goal: 'SEEK_EMPLOYMENT' as const, socialProg: 'NONE' as const },
    ];

    const studentMap: Record<string, { userId: string; studentId: string }> = {};
    for (const a of ALUNOS) {
        const u = await prisma.user.upsert({ where: { email: a.email }, update: { password: hash }, create: { email: a.email, password: hash, name: a.name, phone: a.phone, role: 'STUDENT', active: true }});
        await prisma.userPreferences.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id }});
        let st = await prisma.student.findFirst({ where: { userId: u.id } });
        if (!st) st = await prisma.student.create({ data: {
            userId: u.id, cpf: a.cpf,
            birthDate: new Date(a.birth), gender: a.gender, raceColor: a.race,
            maritalStatus: a.marital, motherName: a.mother, nationality: a.nationality,
            birthCity: a.birthCity, birthState: a.birthState, active: true,
            contact: { create: { email: a.email, phone: a.phone, hasWhatsapp: true, allowWhatsappContact: true, allowEmailContact: true }},
            address: { create: { cep: a.cep, street: a.street, number: a.number, neighborhood: a.neighborhood, city: a.city, state: a.state, zone: a.zone }},
            socioeconomic: { create: { educationLevel: a.edu, employmentStatus: a.emp, familyIncome: a.income, familyMembersCount: a.members, socialProgram: a.socialProg, hasDisability: false, publicSchoolOnly: a.emp === 'STUDENT' }},
            professional: { create: { careerGoal: a.goal, howHeardAbout: 'Indicação de amigo', motivation: 'Quero me qualificar profissionalmente e conseguir um emprego melhor' }},
        }});
        studentMap[a.email] = { userId: u.id, studentId: st.id };
    }
    console.log(`  ✅ ${ALUNOS.length} alunos com perfis completos`);

    return { mariaUser, carlosUser, mariaTeacher, carlosTeacher, joaoUser, joaoEmployee, studentMap };
}
