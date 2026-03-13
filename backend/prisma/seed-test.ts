/**
 * seed-test.ts — Dados de teste para validação das funcionalidades
 * 
 * Cria:
 * - 1 aluno de teste com User STUDENT (email: aluno@qualifica.com / senha: aluno123)
 * - 1 funcionário (Employee) para reembolsos
 * - 1 matrícula ENROLLED em uma turma existente
 * - Frequências passadas (≥75%) para o aluno em uma turma
 * - 1 reembolso PENDING para teste de aprovação/rejeição sem MinIO
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Iniciando seed de dados de teste...\n');

    // ── 1. Busca turma existente IN_PROGRESS ou ENROLLMENT_OPEN ──
    const firstClass = await prisma.class.findFirst({
        where: { status: { in: ['IN_PROGRESS', 'ENROLLMENT_OPEN', 'COMPLETED'] } },
        include: { course: true, city: true },
    });

    // ── 2. Cria usuário STUDENT de teste ──
    const hashedPw = await bcrypt.hash('aluno123', 10);
    const studentUser = await prisma.user.upsert({
        where: { email: 'aluno@qualifica.com' },
        update: { password: hashedPw },
        create: {
            email: 'aluno@qualifica.com',
            password: hashedPw,
            name: 'João da Silva (Teste)',
            phone: '(98) 99999-0001',
            role: 'STUDENT',
            active: true,
        },
    });
    console.log('✅ Usuário aluno criado:', studentUser.email);

    // ── 3. Cria perfil Student ──
    const student = await prisma.student.upsert({
        where: { userId: studentUser.id },
        update: {},
        create: {
            userId: studentUser.id,
            cpf: '111.111.111-11',
            rg: '1234567',
            rgIssuer: 'SSP/MA',
            birthDate: new Date('1995-06-15'),
            gender: 'MALE',
            raceColor: 'BROWN',
            maritalStatus: 'SINGLE',
            motherName: 'Maria da Silva',
            fatherName: 'José da Silva',
            nationality: 'Brasileiro',
            birthCity: 'São Luís',
            birthState: 'MA',
        },
    });

    // Criar contato do aluno
    await prisma.studentContact.upsert({
        where: { studentId: student.id },
        update: {},
        create: {
            studentId: student.id,
            email: 'aluno@qualifica.com',
            phone: '(98) 99999-0001',
            hasWhatsapp: true,
            allowWhatsappContact: true,
            allowEmailContact: true,
        },
    });

    // Criar endereço do aluno
    await prisma.studentAddress.upsert({
        where: { studentId: student.id },
        update: {},
        create: {
            studentId: student.id,
            cep: '65000-000',
            street: 'Rua das Flores',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Luís',
            state: 'MA',
            zone: 'URBAN',
        },
    });

    // Criar perfil socioeconômico
    await prisma.studentSocioeconomic.upsert({
        where: { studentId: student.id },
        update: {},
        create: {
            studentId: student.id,
            educationLevel: 'HIGH_SCHOOL_COMPLETE',
            employmentStatus: 'UNEMPLOYED',
            familyIncome: 'UP_TO_1_MW',
            familyMembersCount: 4,
            socialProgram: 'BOLSA_FAMILIA',
            hasDisability: false,
            publicSchoolOnly: true,
        },
    });

    console.log('✅ Perfil de aluno criado (CPF: 111.111.111-11)');

    // ── 4. Se há turma, criar matrícula ENROLLED + frequências ──
    if (firstClass) {
        console.log(`\n📚 Usando turma: ${firstClass.classIdentifier} (${firstClass.course.name})`);

        // Verificar se já existe matrícula
        const existingEnrollment = await prisma.enrollment.findFirst({
            where: { studentId: student.id, classId: firstClass.id },
        });

        let enrollment = existingEnrollment;
        if (!enrollment) {
            const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
            enrollment = await prisma.enrollment.create({
                data: {
                    studentId: student.id,
                    classId: firstClass.id,
                    protocol: `UPG-TEST-${Date.now()}`,
                    status: 'ENROLLED',
                    enrolledAt: new Date(),
                    reviewedBy: adminUser?.id,
                    reviewedAt: new Date(),
                },
            });
            console.log('✅ Matrícula ENROLLED criada:', enrollment.protocol);
        } else {
            // Atualizar para ENROLLED se não estiver
            if (enrollment.status !== 'ENROLLED') {
                await prisma.enrollment.update({
                    where: { id: enrollment.id },
                    data: { status: 'ENROLLED' },
                });
            }
            console.log('ℹ️  Matrícula existente encontrada:', enrollment.protocol);
        }

        // Criar frequências passadas (80% presença — elegível para certificado)
        const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (adminUser) {
            const today = new Date();
            const attendanceDates: Date[] = [];
            // 10 aulas nos últimos 14 dias (seg a sex)
            let d = new Date(today);
            let count = 0;
            while (count < 10) {
                d.setDate(d.getDate() - 1);
                const dow = d.getDay();
                if (dow !== 0 && dow !== 6) { // não é sab/dom
                    attendanceDates.push(new Date(d));
                    count++;
                }
            }

            let presencas = 0;
            for (let i = 0; i < attendanceDates.length; i++) {
                const dd = attendanceDates[i];
                const present = i < 9; // 9 presentes, 1 falta = 90%
                try {
                    await prisma.attendance.upsert({
                        where: {
                            classId_studentId_date: {
                                classId: firstClass.id,
                                studentId: student.id,
                                date: dd,
                            },
                        },
                        update: { present },
                        create: {
                            classId: firstClass.id,
                            studentId: student.id,
                            date: dd,
                            present,
                            registeredBy: adminUser.id,
                        },
                    });
                    if (present) presencas++;
                } catch {
                    // ignora conflito
                }
            }
            console.log(`✅ Frequências criadas: ${presencas}/10 presenças (${presencas * 10}%)`);
        }
    } else {
        console.log('⚠️  Nenhuma turma encontrada para criar matrícula e frequências.');
        console.log('   Crie uma turma primeiro e rode este seed novamente.');
    }

    // ── 5. Criar Employee de teste para reembolsos ──
    const employee = await prisma.employee.upsert({
        where: { email: 'professor.teste@qualifica.com' },
        update: {},
        create: {
            name: 'Prof. Carlos Mendes (Teste)',
            email: 'professor.teste@qualifica.com',
            role: 'INSTRUCTOR',
            department: 'ACADEMIC',
            cpf: '222.222.222-22',
            phone: '(98) 99999-0002',
            contractType: 'FREELANCE',
            active: true,
        },
    });
    console.log('\n✅ Funcionário de teste criado:', employee.name);

    // ── 6. Criar reembolso PENDING de teste (sem MinIO) ──
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (adminUser) {
        const existingReimb = await prisma.reimbursement.findFirst({
            where: { requestedBy: adminUser.id, description: { contains: '[TESTE]' } },
        });
        if (!existingReimb) {
            await prisma.reimbursement.create({
                data: {
                    requestedBy: adminUser.id,
                    employeeId: employee.id,
                    type: 'CLASSROOM_MATERIAL',
                    amount: 89.90,
                    description: '[TESTE] Material de aula - kit de canetas e papel A4',
                    receiptUrl: '', // sem MinIO para testes
                    status: 'PENDING',
                    active: true,
                },
            });
            console.log('✅ Reembolso PENDING criado: R$ 89,90 (material de aula)');

            // Criar um segundo reembolso APPROVED
            await prisma.reimbursement.create({
                data: {
                    requestedBy: adminUser.id,
                    employeeId: employee.id,
                    type: 'CLEANING_MATERIAL',
                    amount: 45.50,
                    description: '[TESTE] Material de limpeza - pano e detergente',
                    receiptUrl: '',
                    status: 'APPROVED',
                    approvedBy: adminUser.id,
                    approvedAt: new Date(),
                    active: true,
                },
            });
            console.log('✅ Reembolso APPROVED criado: R$ 45,50 (material de limpeza)');

            // Criar um terceiro reembolso REJECTED
            await prisma.reimbursement.create({
                data: {
                    requestedBy: adminUser.id,
                    employeeId: employee.id,
                    type: 'FOOD',
                    amount: 200.00,
                    description: '[TESTE] Alimentação - almoço em restaurante',
                    receiptUrl: '',
                    status: 'REJECTED',
                    approvedBy: adminUser.id,
                    rejectedAt: new Date(),
                    rejectionReason: 'Valor acima do permitido pela política da empresa',
                    active: true,
                },
            });
            console.log('✅ Reembolso REJECTED criado: R$ 200,00 (alimentação)');
        } else {
            console.log('ℹ️  Reembolsos de teste já existem.');
        }
    }

    console.log('\n🎉 Seed de dados de teste concluído!');
    console.log('\n📋 Credenciais de teste:');
    console.log('  Admin: admin@qualifica.com / admin123');
    console.log('  Aluno: aluno@qualifica.com / aluno123');
    console.log('\n📋 Dados criados:');
    console.log('  - Aluno: João da Silva (CPF: 111.111.111-11)');
    console.log('  - Employee: Prof. Carlos Mendes');
    console.log('  - 3 reembolsos de teste (PENDING, APPROVED, REJECTED)');
    if (firstClass) {
        console.log(`  - Matrícula ENROLLED na turma: ${firstClass.classIdentifier}`);
        console.log('  - 10 frequências (90% presença — elegível para certificado)');
    }
}

main()
    .catch((e) => {
        console.error('❌ Erro no seed de teste:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
