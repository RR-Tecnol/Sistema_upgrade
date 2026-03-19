/**
 * seed-demo.ts — Seed de dados de demonstração para testes
 *
 * Cria os seguintes perfis de teste:
 *  - Admin: admin@qualifica.com / RR@@Upgrade
 *  - Prof:  maria@qualifica.com / Teste@123
 *  - Aluno: joao@qualifica.com  / Teste@123
 *  - Motor: pedro@qualifica.com / Teste@123
 *
 * E vincula:
 *  - Maria como instrutora titular de 2 turmas ativas (via ClassTeacher)
 *  - João matriculado (ENROLLED) em uma dessas turmas com 30 aulas de frequência
 *  - Pedro com viagem vinculada à carreta da turma de Maria
 *  - Certificado emitido para João em turma concluída
 *  - Ana com inscrição PENDING para demo de aprovação pelo admin
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de demonstração...');

    const hash = (pw: string) => bcrypt.hash(pw, 10);
    const demoP = await hash('Teste@123');
    const adminP = await hash('RR@@Upgrade');

    // ─── 0. Garantir grupos e cidades base ─────────────────────────────────
    const grupoMA = await prisma.group.upsert({
        where: { name: 'Grupo 1 MA' }, update: {},
        create: { name: 'Grupo 1 MA', state: 'MA' },
    });
    const grupoPI = await prisma.group.upsert({
        where: { name: 'Grupo 1 PI' }, update: {},
        create: { name: 'Grupo 1 PI', state: 'PI' },
    });
    const cidadeMA = await prisma.city.upsert({
        where: { name_state: { name: 'São Luís', state: 'MA' } },
        update: {},
        create: { name: 'São Luís', state: 'MA', ibgeCode: '2111300' },
    });
    const cidadePI = await prisma.city.upsert({
        where: { name_state: { name: 'Teresina', state: 'PI' } },
        update: {},
        create: { name: 'Teresina', state: 'PI', ibgeCode: '2211001' },
    });

    // ─── 1. Cursos ──────────────────────────────────────────────────────────
    let cursoInfo = await prisma.course.findFirst({ where: { name: 'Informática Básica' } });
    if (!cursoInfo) {
        cursoInfo = await prisma.course.create({
            data: {
                name: 'Informática Básica',
                description: 'Curso básico de informática com Windows, Word, Excel e Internet',
                durationDaysMA: 30, durationDaysPI: 30, workloadHours: 120,
                prerequisites: 'Ensino fundamental completo',
                syllabus: 'Módulo 1: Windows\nMódulo 2: Word\nMódulo 3: Excel\nMódulo 4: Internet',
                availableInMA: true, availableInPI: true, isMulticourse: false,
            },
        });
    }
    let cursoAssist = await prisma.course.findFirst({ where: { name: 'Assistente Administrativo' } });
    if (!cursoAssist) {
        cursoAssist = await prisma.course.create({
            data: {
                name: 'Assistente Administrativo',
                description: 'Formação completa para atuar como assistente administrativo',
                durationDaysMA: 45, durationDaysPI: 45, workloadHours: 180,
                prerequisites: 'Ensino médio completo',
                syllabus: 'Módulo 1: Rotinas\nMódulo 2: Atendimento\nMódulo 3: Documentos',
                availableInMA: true, availableInPI: true, isMulticourse: false,
            },
        });
    }

    // ─── 2. Carreta ─────────────────────────────────────────────────────────
    let truck = await prisma.truck.findFirst({ where: { licensePlate: 'BJK-2580' } });
    if (!truck) {
        truck = await prisma.truck.create({
            data: {
                identifier: 'TRK-DEMO-001',
                licensePlate: 'BJK-2580',
                type: 'STANDARD',
                groupId: grupoMA.id,
                state: 'MA',
                capacity: 20,
                status: 'AVAILABLE',
                lastMaintenanceDate: new Date('2025-12-01'),
                nextMaintenanceDate: new Date('2026-06-01'),
            },
        });
    }

    // ─── 3. Admin ───────────────────────────────────────────────────────────
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@qualifica.com' },
        update: { password: adminP },
        create: {
            email: 'admin@qualifica.com', password: adminP,
            name: 'Administrador Upgrade', phone: '(98) 98888-8888',
            role: 'ADMIN', active: true,
        },
    });

    // ─── 4. Maria — Professora ──────────────────────────────────────────────
    const mariaUser = await prisma.user.upsert({
        where: { email: 'maria@qualifica.com' },
        update: { password: demoP },
        create: {
            email: 'maria@qualifica.com', password: demoP,
            name: 'Maria Silva Santos', phone: '(98) 91234-5678',
            role: 'TEACHER', active: true,
        },
    });

    let mariaTeacher = await prisma.teacher.findFirst({ where: { userId: mariaUser.id } });
    if (!mariaTeacher) {
        mariaTeacher = await prisma.teacher.create({
            data: {
                userId: mariaUser.id,
                cpf: '111.222.333-44',
                rg: '1234567',
                birthDate: new Date('1985-07-10'),
                education: 'Licenciatura em Pedagogia — UFMA',
                specialties: 'Informática Educacional, Gestão Administrativa, Excel Avançado',
                experience: '8 anos de experiência em educação profissional',
                contractType: 'PJ',
                hireDate: new Date('2024-01-15'),
                active: true,
            },
        });
    }

    // ─── 5. João — Aluno ────────────────────────────────────────────────────
    const joaoUser = await prisma.user.upsert({
        where: { email: 'joao@qualifica.com' },
        update: { password: demoP },
        create: {
            email: 'joao@qualifica.com', password: demoP,
            name: 'João Carlos Pereira', phone: '(98) 99876-5432',
            role: 'STUDENT', active: true,
        },
    });

    let joaoStudent = await prisma.student.findFirst({ where: { userId: joaoUser.id } });
    if (!joaoStudent) {
        joaoStudent = await prisma.student.create({
            data: {
                userId: joaoUser.id,
                cpf: '123.456.789-00',
                rg: '9876543',
                rgIssuer: 'SSP-MA',
                birthDate: new Date('2000-05-20'),
                gender: 'MALE',
                raceColor: 'BROWN',
                maritalStatus: 'SINGLE',
                motherName: 'Maria José Pereira',
                nationality: 'Brasileiro',
                birthCity: 'São Luís',
                birthState: 'MA',
                active: true,
            },
        });
    }

    // ─── 6. Pedro — Motorista ───────────────────────────────────────────────
    const pedroUser = await prisma.user.upsert({
        where: { email: 'pedro@qualifica.com' },
        update: { password: demoP },
        create: {
            email: 'pedro@qualifica.com', password: demoP,
            name: 'Pedro Alves Motorista', phone: '(98) 97654-3210',
            role: 'DRIVER', active: true,
        },
    });

    // ─── 7. Turmas vinculadas à Maria (via ClassTeacher) ─────────────────────
    const today = new Date();
    const d = (days: number) => { const dt = new Date(today); dt.setDate(today.getDate() + days); return dt; };

    // Turma 1 — Em andamento (MA)
    let turma1 = await prisma.class.findFirst({ where: { classIdentifier: 'T001-MA-2026' } });
    if (!turma1) {
        turma1 = await prisma.class.create({
            data: {
                classIdentifier: 'T001-MA-2026',
                courseId: cursoInfo.id,
                cityId: cidadeMA.id,
                groupId: grupoMA.id,
                truckId: truck.id,
                period: 'MORNING',
                startTime: '08:00', endTime: '12:00',
                startDate: d(-20),
                endDate: d(40),
                vacancies: 30,
                status: 'IN_PROGRESS',
            },
        });
    }

    // Turma 2 — Em andamento (PI)
    let turma2 = await prisma.class.findFirst({ where: { classIdentifier: 'T002-PI-2026' } });
    if (!turma2) {
        turma2 = await prisma.class.create({
            data: {
                classIdentifier: 'T002-PI-2026',
                courseId: cursoAssist!.id,
                cityId: cidadePI.id,
                groupId: grupoPI.id,
                truckId: truck.id,
                period: 'AFTERNOON',
                startTime: '13:00', endTime: '17:00',
                startDate: d(-10),
                endDate: d(50),
                vacancies: 25,
                status: 'IN_PROGRESS',
            },
        });
    }

    // Turma concluída (para certificado)
    let turmaConcluida = await prisma.class.findFirst({ where: { classIdentifier: 'T000-MA-CONCL' } });
    if (!turmaConcluida) {
        turmaConcluida = await prisma.class.create({
            data: {
                classIdentifier: 'T000-MA-CONCL',
                courseId: cursoInfo.id,
                cityId: cidadeMA.id,
                groupId: grupoMA.id,
                truckId: truck.id,
                period: 'EVENING',
                startTime: '19:00', endTime: '22:00',
                startDate: d(-90),
                endDate: d(-10),
                vacancies: 30,
                status: 'COMPLETED',
            },
        });
    }

    // Vincular Maria como professora titular das 2 turmas ativas
    for (const classId of [turma1.id, turma2.id, turmaConcluida.id]) {
        const ct = await prisma.classTeacher.findFirst({
            where: { classId, teacherId: mariaTeacher.id },
        });
        if (!ct) {
            await prisma.classTeacher.create({
                data: { classId, teacherId: mariaTeacher.id, isSubstitute: false },
            });
        }
    }

    // ─── 8. Matrícula do João na Turma 1 ────────────────────────────────────
    let joaoEnrollment = await prisma.enrollment.findFirst({
        where: { studentId: joaoStudent.id, classId: turma1.id },
    });
    if (!joaoEnrollment) {
        joaoEnrollment = await prisma.enrollment.create({
            data: {
                studentId: joaoStudent.id,
                classId: turma1.id,
                protocol: `INS-JOAO-${Date.now()}`,
                status: 'ENROLLED',
                enrolledAt: d(-20),
                reviewedAt: d(-20),
                reviewedBy: adminUser.id,
            },
        });
    }

    // Matrícula João na turma concluída (para o certificado)
    let enrollConc = await prisma.enrollment.findFirst({
        where: { studentId: joaoStudent.id, classId: turmaConcluida.id },
    });
    if (!enrollConc) {
        enrollConc = await prisma.enrollment.create({
            data: {
                studentId: joaoStudent.id,
                classId: turmaConcluida.id,
                protocol: `INS-CONC-${Date.now()}`,
                status: 'ENROLLED',
                enrolledAt: d(-90),
                reviewedAt: d(-90),
                reviewedBy: adminUser.id,
            },
        });
    }

    // ─── 9. Frequência do João na Turma 1 (27/30 presentes = 90%) ──────────
    const attendanceCount = await prisma.attendance.count({
        where: { studentId: joaoStudent.id, classId: turma1.id },
    });
    if (attendanceCount === 0) {
        let aulas = 0;
        const toInsert = [];
        for (let i = 0; aulas < 30; i++) {
            const dia = new Date(d(-20));
            dia.setDate(dia.getDate() + i);
            if (dia.getDay() === 0 || dia.getDay() === 6) continue; // skip weekends
            if (dia > today) break;
            aulas++;
            toInsert.push({
                classId: turma1.id,
                studentId: joaoStudent.id,
                date: dia,
                present: aulas % 10 !== 0, // falta nas aulas 10, 20, 30 → 3 faltas = 90%
                registeredBy: adminUser.id,
            });
        }
        if (toInsert.length > 0) {
            await prisma.attendance.createMany({ data: toInsert, skipDuplicates: true });
        }
    }

    // ─── 10. Certificado do João (turma concluída) ───────────────────────────
    const certExists = await prisma.certificate.findFirst({
        where: { studentId: joaoStudent.id, classId: turmaConcluida.id },
    });
    if (!certExists) {
        await prisma.certificate.create({
            data: {
                studentId: joaoStudent.id,
                classId: turmaConcluida.id,
                issuedAt: d(-10),
                verificationCode: `CERT-JOAO-${Date.now().toString(36).toUpperCase()}`,
                fileUrl: '/certificates/demo-cert-joao.pdf',
                issuedBy: adminUser.id,
                status: 'ACTIVE',
            },
        });
    }

    // ─── 11. Viagem do Pedro ─────────────────────────────────────────────────
    const tripExists = await prisma.trip.findFirst({ where: { driverUserId: pedroUser.id } });
    if (!tripExists) {
        await prisma.trip.create({
            data: {
                driverUserId: pedroUser.id,
                truckId: truck.id,
                originCityId: cidadeMA.id,
                destinationCityId: cidadePI.id,
                departureDate: d(2),
                expectedArrivalDate: d(3),
                driverName: pedroUser.name,
                driverPhone: '(98) 97654-3210',
                status: 'PLANNED',
                notes: 'Transporte de materiais didáticos para São Luís → Teresina',
            },
        });
    }

    // ─── 12. Ana — Aluna com inscrição PENDING (para demo de aprovação) ──────
    const anaUser = await prisma.user.upsert({
        where: { email: 'ana@qualifica.com' },
        update: { password: demoP },
        create: {
            email: 'ana@qualifica.com', password: demoP,
            name: 'Ana Paula Ribeiro', phone: '(98) 98765-4321',
            role: 'STUDENT', active: true,
        },
    });
    let anaStudent = await prisma.student.findFirst({ where: { userId: anaUser.id } });
    if (!anaStudent) {
        anaStudent = await prisma.student.create({
            data: {
                userId: anaUser.id,
                cpf: '987.654.321-00',
                rg: '1111111',
                rgIssuer: 'SSP-MA',
                birthDate: new Date('1999-03-15'),
                gender: 'FEMALE',
                raceColor: 'WHITE',
                maritalStatus: 'SINGLE',
                motherName: 'Francisca Ribeiro',
                nationality: 'Brasileira',
                birthCity: 'São Luís',
                birthState: 'MA',
                active: true,
            },
        });
    }
    const anaEnrollExists = await prisma.enrollment.findFirst({
        where: { studentId: anaStudent.id, classId: turma1.id },
    });
    if (!anaEnrollExists) {
        await prisma.enrollment.create({
            data: {
                studentId: anaStudent.id,
                classId: turma1.id,
                protocol: `INS-ANA-${Date.now()}`,
                status: 'PENDING',
            },
        });
    }

    console.log('\n✅ Seed de demonstração concluído!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('CREDENCIAIS DE TESTE:');
    console.log('─────────────────────────────────────────────────');
    console.log('ADMIN:     admin@qualifica.com  / RR@@Upgrade');
    console.log('PROFESSOR: maria@qualifica.com  / Teste@123');
    console.log('ALUNO:     joao@qualifica.com   / Teste@123');
    console.log('MOTORISTA: pedro@qualifica.com  / Teste@123');
    console.log('(Pendente): ana@qualifica.com   / Teste@123');
    console.log('═══════════════════════════════════════════════════');
    console.log('\nDados criados:');
    console.log('  - Maria: ClassTeacher nas turmas T001-MA-2026, T002-PI-2026 e T000-MA-CONCL');
    console.log('  - João : ENROLLED em T001-MA-2026, 30 aulas, ~90% frequência, certificado');
    console.log('  - Pedro: viagem PLANNED São Luís → Teresina');
    console.log('  - Ana  : inscrição PENDING em T001-MA-2026 (para aprovar no admin)');
}

main()
    .catch((e) => { console.error('❌ Erro no seed demo:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
