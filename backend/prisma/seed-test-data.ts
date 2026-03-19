/**
 * Seed massivo de dados de teste — Sistema Upgrade
 * Cria: 3 professores, 3 motoristas, 20 alunos, 4 turmas, viagens, reembolsos, frequência
 * Execute: npx ts-node --transpile-only prisma/seed-test-data.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SENHA_HASH = bcrypt.hashSync('RR@@Upgrade', 10);

// ==================== DADOS FICTÍCIOS ====================

const PROFESSORES = [
    { name: 'Carlos Mendes Silva', email: 'carlos.mendes@qualifica.com', cpf: '111.222.333-01', phone: '(98) 91111-0001' },
    { name: 'Ana Beatriz Fontes',  email: 'ana.fontes@qualifica.com',    cpf: '111.222.333-02', phone: '(98) 92222-0002' },
];

const MOTORISTAS = [
    { name: 'Pedro Souza Lima',   email: 'pedro.souza@qualifica.com',   cpf: '222.333.444-01', phone: '(98) 93333-0001' },
    { name: 'Marcos Vidal Cruz',  email: 'marcos.vidal@qualifica.com',  cpf: '222.333.444-02', phone: '(98) 94444-0002' },
    { name: 'Roberto Alves Pina', email: 'roberto.alves@qualifica.com', cpf: '222.333.444-03', phone: '(98) 95555-0003' },
];

const ALUNOS = [
    { name: 'Lucas Ferreira Nunes',      email: 'lucas.ferreira@email.com',     cpf: '333.444.555-01', city: 'São Luís',            state: 'MA' },
    { name: 'Mariana Costa Oliveira',    email: 'mariana.costa@email.com',       cpf: '333.444.555-02', city: 'Imperatriz',          state: 'MA' },
    { name: 'Fernanda Lima Santos',      email: 'fernanda.lima@email.com',       cpf: '333.444.555-03', city: 'São José de Ribamar', state: 'MA' },
    { name: 'Rodrigo Almeida Castro',    email: 'rodrigo.almeida@email.com',     cpf: '333.444.555-04', city: 'Timon',               state: 'MA' },
    { name: 'Juliana Pereira Gomes',     email: 'juliana.pereira@email.com',     cpf: '333.444.555-05', city: 'Caxias',              state: 'MA' },
    { name: 'Diego Rodrigues Moura',     email: 'diego.rodrigues@email.com',     cpf: '333.444.555-06', city: 'Codó',                state: 'MA' },
    { name: 'Camila Nascimento Leão',    email: 'camila.leao@email.com',         cpf: '333.444.555-07', city: 'Bacabal',             state: 'MA' },
    { name: 'Felipe Barbosa Duarte',     email: 'felipe.barbosa@email.com',      cpf: '333.444.555-08', city: 'Balsas',              state: 'MA' },
    { name: 'Aline Torres Monteiro',     email: 'aline.torres@email.com',        cpf: '333.444.555-09', city: 'Paço do Lumiar',      state: 'MA' },
    { name: 'Rafael Cardoso Braga',      email: 'rafael.cardoso@email.com',      cpf: '333.444.555-10', city: 'Açailândia',          state: 'MA' },
    { name: 'Bianca Melo Rezende',       email: 'bianca.melo@email.com',         cpf: '333.444.555-11', city: 'Teresina',            state: 'PI' },
    { name: 'Gustavo Pinto Carvalho',    email: 'gustavo.pinto@email.com',       cpf: '333.444.555-12', city: 'Parnaíba',            state: 'PI' },
    { name: 'Larissa Sousa Figueira',    email: 'larissa.sousa@email.com',       cpf: '333.444.555-13', city: 'Picos',               state: 'PI' },
    { name: 'Thiago Araújo Freitas',     email: 'thiago.araujo@email.com',       cpf: '333.444.555-14', city: 'Floriano',            state: 'PI' },
    { name: 'Priscila Vieira Campos',    email: 'priscila.vieira@email.com',     cpf: '333.444.555-15', city: 'Campo Maior',         state: 'PI' },
    { name: 'Anderson Lopes Medeiros',   email: 'anderson.lopes@email.com',      cpf: '333.444.555-16', city: 'Rio Branco',          state: 'AC' },
    { name: 'Natália Ribeiro Gonçalves', email: 'natalia.ribeiro@email.com',     cpf: '333.444.555-17', city: 'Cruzeiro do Sul',     state: 'AC' },
    { name: 'Vinícius Santana Pires',    email: 'vinicius.santana@email.com',    cpf: '333.444.555-18', city: 'Sena Madureira',      state: 'AC' },
    { name: 'Isabela Rocha Teixeira',    email: 'isabela.rocha@email.com',       cpf: '333.444.555-19', city: 'Feijó',               state: 'AC' },
    { name: 'Bruno Cavalcante Assis',    email: 'bruno.cavalcante@email.com',    cpf: '333.444.555-20', city: 'Brasileia',           state: 'AC' },
];

async function main() {
    console.log('\n🌱 Iniciando seed massivo de dados de teste...\n');

    // === GRUPOS ===
    const grupo1MA = await prisma.group.findFirst({ where: { name: 'Grupo 1 MA' } });
    const grupo1PI = await prisma.group.findFirst({ where: { name: 'Grupo 1 PI' } });
    const grupo1AC = await prisma.group.findFirst({ where: { name: 'Grupo 1 AC' } });
    if (!grupo1MA || !grupo1PI || !grupo1AC) throw new Error('Grupos não encontrados. Execute o seed principal primeiro.');

    // === CURSOS ===
    const cursoInfo = await prisma.course.findFirst({ where: { name: 'Informática Básica' } });
    const cursoAdmin = await prisma.course.findFirst({ where: { name: 'Assistente Administrativo' } });
    const cursoMkt = await prisma.course.findFirst({ where: { name: 'Marketing Digital' } });
    if (!cursoInfo) throw new Error('Cursos não encontrados. Execute o seed principal primeiro.');

    // === CIDADES ===
    const cidadeSaoLuis = await prisma.city.findFirst({ where: { name: 'São Luís', state: 'MA' } });
    const cidadeTeresina = await prisma.city.findFirst({ where: { name: 'Teresina', state: 'PI' } });
    const cidadeRioBranco = await prisma.city.findFirst({ where: { name: 'Rio Branco', state: 'AC' } });
    if (!cidadeSaoLuis) throw new Error('Cidades não encontradas. Execute o seed principal primeiro.');

    // === 1. CRIAR PROFESSORES ===
    console.log('📚 Criando professores...');
    const professoresDB: any[] = [];

    for (const p of PROFESSORES) {
        const user = await prisma.user.upsert({
            where: { email: p.email },
            update: { password: SENHA_HASH },
            create: { email: p.email, password: SENHA_HASH, name: p.name, phone: p.phone, role: 'TEACHER', active: true },
        });

        let teacher = await prisma.teacher.findFirst({ where: { cpf: p.cpf } });
        if (!teacher) {
            teacher = await prisma.teacher.create({
                data: {
                    userId: user.id,
                    cpf: p.cpf,
                    rg: '123456789',
                    birthDate: new Date('1985-06-15'),
                    education: 'Superior Completo',
                    specialties: 'Informática, Administração',
                    contractType: 'CLT',
                    hireDate: new Date('2023-01-10'),
                    active: true,
                },
            });
        }
        professoresDB.push(teacher);
        console.log(`  ✅ Professor: ${p.name} | ${p.email}`);
    }

    // === 2. CRIAR MOTORISTAS (User + Employee) ===
    console.log('\n🚛 Criando motoristas...');
    const motoristasDB: any[] = [];

    for (let i = 0; i < MOTORISTAS.length; i++) {
        const m = MOTORISTAS[i];
        const user = await prisma.user.upsert({
            where: { email: m.email },
            update: { password: SENHA_HASH },
            create: { email: m.email, password: SENHA_HASH, name: m.name, phone: m.phone, role: 'DRIVER', active: true },
        });

        let employee = await prisma.employee.findFirst({ where: { cpf: m.cpf } });
        if (!employee) {
            employee = await prisma.employee.create({
                data: {
                    cpf: m.cpf,
                    name: m.name,
                    role: 'DRIVER',
                    department: 'LOGISTICS',
                    phone: m.phone,
                    contractType: 'CLT',
                    monthlySalaryCLT: 2800.00,
                    travelRuleKm: 200,
                    active: true,
                    userId: user.id,
                },
            });
        }
        motoristasDB.push({ user, employee });
        console.log(`  ✅ Motorista: ${m.name} | ${m.email}`);
    }

    // === 3. CRIAR ALUNOS ===
    console.log('\n👥 Criando alunos...');
    const alunosDB: any[] = [];
    const RG_NUM = 100000000;

    for (let i = 0; i < ALUNOS.length; i++) {
        const a = ALUNOS[i];
        let user = await prisma.user.findFirst({ where: { email: a.email } });
        if (!user) {
            user = await prisma.user.create({
                data: { email: a.email, password: SENHA_HASH, name: a.name, role: 'STUDENT', active: true },
            });
        } else {
            await prisma.user.update({ where: { id: user.id }, data: { password: SENHA_HASH } });
        }

        let student = await prisma.student.findFirst({ where: { cpf: a.cpf } });
        if (!student) {
            student = await prisma.student.create({
                data: {
                    userId: user.id,
                    cpf: a.cpf,
                    rg: String(RG_NUM + i),
                    rgIssuer: 'SSP/' + a.state,
                    birthDate: new Date(`${1990 + (i % 15)}-0${(i % 9) + 1}-15`),
                    gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
                    raceColor: ['WHITE', 'BLACK', 'BROWN', 'YELLOW', 'INDIGENOUS'][i % 5] as any,
                    maritalStatus: 'SINGLE',
                    motherName: `Maria ${a.name.split(' ')[1]}`,
                    nationality: 'Brasileiro(a)',
                    birthCity: a.city,
                    birthState: a.state,
                    active: true,
                    contact: {
                        create: {
                            email: a.email,
                            phone: `(${a.state === 'MA' ? '98' : a.state === 'PI' ? '86' : '68'}) 9${String(i).padStart(4,'0')}-${String(i * 7 % 9999).padStart(4,'0')}`,
                            hasWhatsapp: true,
                        },
                    },
                    address: {
                        create: {
                            cep: `65000-${String(100 + i).padStart(3,'0')}`,
                            street: `Rua das Flores`,
                            number: String(100 + i * 10),
                            neighborhood: 'Centro',
                            city: a.city,
                            state: a.state,
                            zone: i % 4 === 0 ? 'RURAL' : 'URBAN',
                        },
                    },
                    socioeconomic: {
                        create: {
                            educationLevel: 'HIGH_SCHOOL_COMPLETE',
                            employmentStatus: 'UNEMPLOYED',
                            familyIncome: 'UP_TO_1_MW',
                            familyMembersCount: 3 + (i % 5),
                            socialProgram: i % 3 === 0 ? 'BOLSA_FAMILIA' : 'NONE',
                            publicSchoolOnly: true,
                        },
                    },
                    professional: {
                        create: {
                            careerGoal: 'SEEK_EMPLOYMENT',
                            howHeardAbout: 'Redes Sociais',
                        },
                    },
                },
            });
        }

        alunosDB.push(student);
        if ((i + 1) % 5 === 0) console.log(`  ✅ ${i + 1}/${ALUNOS.length} alunos criados...`);
    }

    console.log(`\n✅ ${alunosDB.length} alunos criados`);

    // === 4. CRIAR TURMAS ===
    console.log('\n🏛️ Criando turmas...');

    // Turma 1 — Informática Básica em São Luís (EM ANDAMENTO)
    let turma1 = await prisma.class.findFirst({ where: { classIdentifier: 'INF-MA-001-2026' } });
    if (!turma1) {
        turma1 = await prisma.class.create({
            data: {
                courseId: cursoInfo!.id,
                groupId: grupo1MA!.id,
                cityId: cidadeSaoLuis!.id,
                classIdentifier: 'INF-MA-001-2026',
                startDate: new Date('2026-03-03'),
                endDate: new Date('2026-04-11'),
                period: 'MORNING',
                startTime: '08:00',
                endTime: '12:00',
                vacancies: 30,
                reserveSlots: 4,
                status: 'IN_PROGRESS',
            },
        });
    }

    // Turma 2 — Assistente Administrativo em Teresina (EM ANDAMENTO)
    let turma2 = await prisma.class.findFirst({ where: { classIdentifier: 'ADM-PI-001-2026' } });
    if (!turma2) {
        turma2 = await prisma.class.create({
            data: {
                courseId: cursoAdmin!.id,
                groupId: grupo1PI!.id,
                cityId: cidadeTeresina!.id,
                classIdentifier: 'ADM-PI-001-2026',
                startDate: new Date('2026-03-10'),
                endDate: new Date('2026-05-02'),
                period: 'AFTERNOON',
                startTime: '13:00',
                endTime: '17:00',
                vacancies: 25,
                reserveSlots: 4,
                status: 'IN_PROGRESS',
            },
        });
    }

    // Turma 3 — Marketing Digital em Rio Branco (ENROLLMENTS OPEN)
    let turma3 = await prisma.class.findFirst({ where: { classIdentifier: 'MKT-AC-001-2026' } });
    if (!turma3) {
        turma3 = await prisma.class.create({
            data: {
                courseId: cursoMkt!.id,
                groupId: grupo1AC!.id,
                cityId: cidadeRioBranco!.id,
                classIdentifier: 'MKT-AC-001-2026',
                startDate: new Date('2026-04-07'),
                endDate: new Date('2026-05-16'),
                period: 'EVENING',
                startTime: '18:00',
                endTime: '22:00',
                vacancies: 20,
                reserveSlots: 4,
                status: 'ENROLLMENT_OPEN',
                enrollmentOpenDate: new Date('2026-03-15'),
                enrollmentCloseDate: new Date('2026-04-01'),
            },
        });
    }

    // Turma 4 — Informática Básica São Luís (CONCLUÍDA)
    let turma4 = await prisma.class.findFirst({ where: { classIdentifier: 'INF-MA-000-2025' } });
    if (!turma4) {
        turma4 = await prisma.class.create({
            data: {
                courseId: cursoInfo!.id,
                groupId: grupo1MA!.id,
                cityId: cidadeSaoLuis!.id,
                classIdentifier: 'INF-MA-000-2025',
                startDate: new Date('2025-10-06'),
                endDate: new Date('2025-11-14'),
                period: 'MORNING',
                startTime: '08:00',
                endTime: '12:00',
                vacancies: 30,
                reserveSlots: 4,
                status: 'COMPLETED',
            },
        });
    }

    console.log('  ✅ Turma 1: Informática Básica — São Luís/MA (IN_PROGRESS)');
    console.log('  ✅ Turma 2: Assistente Administrativo — Teresina/PI (IN_PROGRESS)');
    console.log('  ✅ Turma 3: Marketing Digital — Rio Branco/AC (ENROLLMENT_OPEN)');
    console.log('  ✅ Turma 4: Informática Básica — São Luís/MA (COMPLETED)');

    // === 5. VINCULAR PROFESSORES A TURMAS ===
    console.log('\n🔗 Vinculando professores às turmas...');

    for (const t of [turma1.id, turma4.id]) {
        await prisma.classTeacher.upsert({
            where: { classId_teacherId: { classId: t, teacherId: professoresDB[0].id } },
            update: {},
            create: { classId: t, teacherId: professoresDB[0].id },
        });
    }
    await prisma.classTeacher.upsert({
        where: { classId_teacherId: { classId: turma2.id, teacherId: professoresDB[1].id } },
        update: {},
        create: { classId: turma2.id, teacherId: professoresDB[1].id },
    });

    console.log('  ✅ Carlos → Turma 1 e 4 (concluída)');
    console.log('  ✅ Ana → Turma 2');

    // === 6. MATRICULAR ALUNOS NAS TURMAS ===
    console.log('\n📋 Matriculando alunos...');

    // Primeiros 10 alunos (MA) → turma1
    for (let i = 0; i < 10; i++) {
        const existing = await prisma.enrollment.findFirst({ where: { studentId: alunosDB[i].id, classId: turma1.id } });
        if (!existing) {
            await prisma.enrollment.create({
                data: {
                    studentId: alunosDB[i].id,
                    classId: turma1.id,
                    protocol: `PROT-${turma1.id.slice(0,4).toUpperCase()}-${String(i).padStart(3,'0')}`,
                    status: 'ENROLLED',
                    enrolledAt: new Date('2026-02-20'),
                },
            });
        }
    }
    // Alunos PI (10-14) → turma2
    for (let i = 10; i < 15; i++) {
        const existing = await prisma.enrollment.findFirst({ where: { studentId: alunosDB[i].id, classId: turma2.id } });
        if (!existing) {
            await prisma.enrollment.create({
                data: {
                    studentId: alunosDB[i].id,
                    classId: turma2.id,
                    protocol: `PROT-${turma2.id.slice(0,4).toUpperCase()}-${String(i).padStart(3,'0')}`,
                    status: 'ENROLLED',
                    enrolledAt: new Date('2026-03-01'),
                },
            });
        }
    }
    // Alunos AC (15-19) → turma3 (pendente aprovação)
    for (let i = 15; i < 20; i++) {
        const existing = await prisma.enrollment.findFirst({ where: { studentId: alunosDB[i].id, classId: turma3.id } });
        if (!existing) {
            await prisma.enrollment.create({
                data: {
                    studentId: alunosDB[i].id,
                    classId: turma3.id,
                    protocol: `PROT-${turma3.id.slice(0,4).toUpperCase()}-${String(i).padStart(3,'0')}`,
                    status: 'PENDING',
                    enrolledAt: new Date('2026-03-17'),
                },
            });
        }
    }
    console.log('  ✅ 10 alunos → Turma 1 (ENROLLED)');
    console.log('  ✅ 5 alunos → Turma 2 (ENROLLED)');
    console.log('  ✅ 5 alunos → Turma 3 (PENDING)');

    // === 7. REGISTRAR FREQUÊNCIA (últimas 2 semanas da turma 1) ===
    console.log('\n📅 Registrando frequência...');
    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@qualifica.com' } });
    const diasAula = [
        new Date('2026-03-10'), new Date('2026-03-11'), new Date('2026-03-12'), new Date('2026-03-13'),
        new Date('2026-03-14'), new Date('2026-03-17'), new Date('2026-03-18'), new Date('2026-03-19'),
    ];

    for (const dia of diasAula) {
        for (let i = 0; i < 10; i++) {
            const present = Math.random() > 0.15; // 85% presença
            await prisma.attendance.upsert({
                where: { classId_studentId_date: { classId: turma1.id, studentId: alunosDB[i].id, date: dia } },
                update: {},
                create: {
                    classId: turma1.id,
                    studentId: alunosDB[i].id,
                    date: dia,
                    present,
                    registeredBy: adminUser!.id,
                },
            });
        }
    }
    console.log(`  ✅ Frequência registrada: ${diasAula.length} dias × 10 alunos`);

    // === 8. CRIAR CAMINHÃO E VIAGENS ===
    console.log('\n🚛 Criando caminhão e viagens...');

    let truck = await prisma.truck.findFirst({ where: { licensePlate: 'ABC-1D23' } });
    if (!truck) {
        truck = await prisma.truck.create({
            data: {
                identifier: 'CARRETA-MA-001',
                licensePlate: 'ABC-1D23',
                type: 'STANDARD',
                groupId: grupo1MA!.id,
                state: 'MA',
                capacity: 30,
                roomsCount: 2,
                status: 'IN_USE',
                modelYear: '2022',
            },
        });
    }

    // Viagem ativa (Pedro Souza)
    let trip1 = await prisma.trip.findFirst({ where: { driverUserId: motoristasDB[0].user.id, status: 'IN_TRANSIT' } });
    if (!trip1) {
        trip1 = await prisma.trip.create({
            data: {
                truckId: truck.id,
                driverName: motoristasDB[0].user.name,
                driverUserId: motoristasDB[0].user.id,
                originCityId: cidadeSaoLuis!.id,
                destinationCityId: cidadeTeresina!.id,
                departureDate: new Date('2026-03-18'),
                expectedArrivalDate: new Date('2026-03-20'),
                status: 'IN_TRANSIT',
                kmStart: 142000,
                notes: 'Transporte de carreta para turma Teresina PI',
            },
        });
    }

    // Viagem concluída (Marcos Vidal)
    let trip2 = await prisma.trip.findFirst({ where: { driverUserId: motoristasDB[1].user.id, status: 'COMPLETED' } });
    if (!trip2) {
        trip2 = await prisma.trip.create({
            data: {
                truckId: truck.id,
                driverName: motoristasDB[1].user.name,
                driverUserId: motoristasDB[1].user.id,
                originCityId: cidadeSaoLuis!.id,
                destinationCityId: cidadeRioBranco!.id,
                departureDate: new Date('2026-03-10'),
                expectedArrivalDate: new Date('2026-03-12'),
                actualArrivalDate: new Date('2026-03-12'),
                status: 'COMPLETED',
                kmStart: 138000,
                kmEnd: 139847,
                notes: 'Transporte carreta Rio Branco AC — concluído',
            },
        });
    }
    console.log('  ✅ Viagem ativa: São Luís → Teresina (Pedro Souza)');
    console.log('  ✅ Viagem concluída: São Luís → Rio Branco (Marcos Vidal)');

    // === 9. CRIAR FERIADOS VINCULADOS ÀS TURMAS ===
    console.log('\n📅 Criando feriados nas turmas...');

    const feriadosTurma1 = [
        { date: new Date('2026-03-04'), reason: 'Carnaval — ponto facultativo' },
        { date: new Date('2026-03-05'), reason: 'Carnaval — feriado municipal São Luís' },
    ];

    for (const f of feriadosTurma1) {
        const existing = await prisma.classHoliday.findFirst({
            where: { classId: turma1.id, date: f.date },
        });
        if (!existing) {
            await prisma.classHoliday.create({
                data: {
                    classId: turma1.id,
                    date: f.date,
                    reason: f.reason,
                    registeredBy: adminUser!.id,
                },
            });
        }
    }

    // Reembolso de professor (pendente aprovação)
    const profMariaUser = await prisma.user.findFirst({ where: { email: 'maria.professora.visual@qualifica.com' } });
    const empMaria = await prisma.employee.findFirst({ where: { userId: profMariaUser?.id } });
    if (profMariaUser) {
        const reimExisting = await prisma.reimbursement.findFirst({ where: { requestedBy: profMariaUser.id } });
        if (!reimExisting) {
            await prisma.reimbursement.create({
                data: {
                    requestedBy: profMariaUser.id,
                    employeeId: empMaria?.id,
                    type: 'CLASSROOM_MATERIAL',
                    amount: 85.50,
                    description: 'Compra de cartolinas e pincéis para aula de design',
                    status: 'PENDING',
                },
            });
        }
    }

    const feriados = feriadosTurma1;
    console.log(`  ✅ ${feriados.length} feriados criados na Turma 1`);
    console.log('  ✅ Reembolso pendente criado para Maria Professora (R$85,50)');

    // === SUMÁRIO ===
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SEED MASSIVO CONCLUÍDO!');
    console.log('='.repeat(60));
    console.log(`\n📊 Dados criados:`);
    console.log(`  • Professores: ${PROFESSORES.length}`);
    console.log(`  • Motoristas:  ${MOTORISTAS.length}`);
    console.log(`  • Alunos:      ${ALUNOS.length}`);
    console.log(`  • Turmas:      4 (2 ativas, 1 inscrição aberta, 1 concluída)`);
    console.log(`  • Viagens:     2 (1 ativa, 1 concluída)`);
    console.log(`  • Feriados/Imprevistos: ${feriados.length} (vinculados à Turma 1)`);
    console.log(`  • Reembolsos:  1 (pendente de aprovação)`);

    console.log('\n🔑 CREDENCIAIS DE LOGIN:');
    console.log('  Admin:       admin@qualifica.com       / admin123');
    console.log('  Professora:  maria.professora.visual@qualifica.com / RR@@Upgrade');
    console.log('  Professor:   carlos.mendes@qualifica.com  / RR@@Upgrade');
    console.log('  Professor:   ana.fontes@qualifica.com     / RR@@Upgrade');
    console.log('  Motorista:   pedro.souza@qualifica.com    / RR@@Upgrade  ← viagem ATIVA');
    console.log('  Motorista:   marcos.vidal@qualifica.com   / RR@@Upgrade  ← viagem concluída');
    console.log('  Motorista:   roberto.alves@qualifica.com  / RR@@Upgrade');
    console.log('  Aluno:       lucas.ferreira@email.com     / RR@@Upgrade  ← turma 1');
    console.log('  Aluno:       bianca.melo@email.com        / RR@@Upgrade  ← turma 2');
    console.log('  Aluno:       anderson.lopes@email.com     / RR@@Upgrade  ← turma 3 (pendente)');

    await prisma.$disconnect();
}

main().catch(e => { console.error('❌ Erro no seed:', e.message); process.exit(1); });
