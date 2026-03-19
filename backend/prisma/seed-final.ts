/**
 * seed-final.ts — Seed de dados COMPLETOS para demonstração
 *
 * Adiciona ao banco (usa schema real do Prisma):
 *   - StudentAddress do João (endereço visível no perfil)
 *   - Reembolsos de exemplo (Reimbursement) para Maria e Pedro
 *   - Funcionários independentes com status active=false (pendentes)
 *   - Contas a Pagar (ContaPagar vinculadas a Acao existente ou sem acao)
 *   - ClassHoliday para turma T001-MA-2026 (feriado de exemplo)
 *
 * Rodar: npx ts-node prisma/seed-final.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed-final (dados completos de demo)...');

    // Buscar usuários existentes
    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@qualifica.com' } });
    const joaoUser = await prisma.user.findFirst({ where: { email: 'joao@qualifica.com' } });
    const mariaUser = await prisma.user.findFirst({ where: { email: 'maria@qualifica.com' } });
    const pedroUser = await prisma.user.findFirst({ where: { email: 'pedro@qualifica.com' } });

    if (!adminUser) {
        console.error('❌ Admin não encontrado — rode seed-demo.ts primeiro!');
        process.exit(1);
    }

    // ─── 1. ENDEREÇO DO JOÃO (StudentAddress separado) ─────────────────────
    if (joaoUser) {
        const joaoStudent = await prisma.student.findFirst({ where: { userId: joaoUser.id } });
        if (joaoStudent) {
            const addrExists = await prisma.studentAddress.findFirst({ where: { studentId: joaoStudent.id } });
            if (!addrExists) {
                await prisma.studentAddress.create({
                    data: {
                        studentId: joaoStudent.id,
                        cep: '65000-000',
                        street: 'Rua das Flores',
                        number: '456',
                        complement: 'Apto 3B',
                        neighborhood: 'Centro',
                        city: 'São Luís',
                        state: 'MA',
                        zone: 'URBAN',
                    },
                });
                console.log('✅ Endereço do João criado');
            } else {
                console.log('ℹ️  Endereço do João já existe, pulando');
            }

            // StudentContact
            const contactExists = await prisma.studentContact.findFirst({ where: { studentId: joaoStudent.id } });
            if (!contactExists) {
                await prisma.studentContact.create({
                    data: {
                        studentId: joaoStudent.id,
                        email: 'joao@qualifica.com',
                        phone: '(98) 99876-5432',
                        hasWhatsapp: true,
                        allowWhatsappContact: true,
                        allowEmailContact: true,
                    },
                });
                console.log('✅ Contato do João criado');
            }

            // StudentSocioeconomic
            const socioExists = await prisma.studentSocioeconomic.findFirst({ where: { studentId: joaoStudent.id } });
            if (!socioExists) {
                await prisma.studentSocioeconomic.create({
                    data: {
                        studentId: joaoStudent.id,
                        educationLevel: 'HIGH_SCHOOL_COMPLETE',
                        employmentStatus: 'UNEMPLOYED',
                        familyIncome: 'UP_TO_1_MW',
                        familyMembersCount: 4,
                        socialProgram: 'BOLSA_FAMILIA',
                        hasDisability: false,
                        publicSchoolOnly: true,
                    },
                });
                console.log('✅ Dados socioeconômicos do João criados');
            }

            // StudentProfessional
            const profExists = await prisma.studentProfessional.findFirst({ where: { studentId: joaoStudent.id } });
            if (!profExists) {
                await prisma.studentProfessional.create({
                    data: {
                        studentId: joaoStudent.id,
                        careerGoal: 'SEEK_EMPLOYMENT',
                        professionalInterest: 'Tecnologia da Informação',
                        howHeardAbout: 'Redes Sociais',
                        motivation: 'Busco qualificação profissional para conseguir emprego formal na área de TI.',
                    },
                });
                console.log('✅ Dados profissionais do João criados');
            }
        }
    }

    // ─── 2. FUNCIONÁRIOS (Employee autônomo, sem userId obrigatório) ────────
    const funcPendentes = [
        {
            name: 'Roberto Carvalho da Silva',
            cpf: '444.555.666-77',
            email: 'roberto.carvalho@qualifica.com',
            phone: '(98) 99334-5678',
            role: 'INSTRUCTOR' as const,
            department: 'ACADEMIC' as const,
            specialty: 'Informática Básica, Excel Avançado',
            contractType: 'PJ' as const,
            dailyCost: 80,
            active: false, // PENDING
        },
        {
            name: 'Luciana Mendes Araújo',
            cpf: '555.666.777-88',
            email: 'luciana.araujo@qualifica.com',
            phone: '(86) 98445-6789',
            role: 'INSTRUCTOR' as const,
            department: 'ACADEMIC' as const,
            specialty: 'Costura Industrial, Artesanato',
            contractType: 'PJ' as const,
            dailyCost: 75,
            active: false, // PENDING
        },
    ];

    for (const func of funcPendentes) {
        const existing = await prisma.employee.findFirst({ where: { email: func.email } });
        if (!existing) {
            await prisma.employee.create({
                data: {
                    name: func.name,
                    cpf: func.cpf,
                    email: func.email,
                    phone: func.phone,
                    role: func.role,
                    department: func.department,
                    specialty: func.specialty,
                    contractType: func.contractType,
                    dailyCost: func.dailyCost,
                    hireDate: new Date(),
                    active: func.active,
                },
            });
        }
    }

    // Funcionários ativos
    const funcAtivos = [
        {
            name: 'Carlos Mendes Feitosa',
            cpf: '222.333.444-55',
            email: 'carlos.mendes@qualifica.com',
            phone: '(98) 98112-3456',
            role: 'COORDINATOR' as const,
            department: 'OPERATIONS' as const,
            specialty: 'Coordenação Regional MA',
            contractType: 'CLT' as const,
            monthlySalaryCLT: 4500,
            active: true,
        },
        {
            name: 'Fernanda Souza Lima',
            cpf: '333.444.555-66',
            email: 'fernanda.souza@qualifica.com',
            phone: '(86) 98223-4567',
            role: 'COORDINATOR' as const,
            department: 'OPERATIONS' as const,
            specialty: 'Coordenação Regional PI',
            contractType: 'CLT' as const,
            monthlySalaryCLT: 4200,
            active: true,
        },
        {
            name: 'Antônio Lima Técnico',
            cpf: '666.777.888-99',
            email: 'antonio.lima@qualifica.com',
            phone: '(98) 97556-7890',
            role: 'TECHNICIAN' as const,
            department: 'LOGISTICS' as const,
            specialty: 'Manutenção de Equipamentos, Elétrica',
            contractType: 'CLT' as const,
            monthlySalaryCLT: 2800,
            active: true,
        },
    ];

    for (const func of funcAtivos) {
        const existing = await prisma.employee.findFirst({ where: { email: func.email } });
        if (!existing) {
            await prisma.employee.create({
                data: {
                    name: func.name,
                    cpf: func.cpf,
                    email: func.email,
                    phone: func.phone,
                    role: func.role,
                    department: func.department,
                    specialty: func.specialty,
                    contractType: func.contractType,
                    monthlySalaryCLT: (func as any).monthlySalaryCLT,
                    hireDate: new Date('2024-03-01'),
                    active: func.active,
                },
            });
        }
    }
    console.log('✅ Funcionários criados (3 ativos + 2 pendentes)');

    // ─── 3. CONTAS A PAGAR (ContaPagar) ─────────────────────────────────────
    const contasPagar = [
        {
            tipo_conta: 'abastecimento',
            descricao: 'Abastecimento carreta BJK-2580 — São Luís a Teresina (450km)',
            valor: 850.00,
            data_vencimento: new Date('2026-03-25'),
            status: 'pendente' as const,
            cidade: 'São Luís',
        },
        {
            tipo_conta: 'manutencao',
            descricao: 'Manutenção preventiva — troca de óleo e filtros',
            valor: 420.00,
            data_vencimento: new Date('2026-04-05'),
            status: 'pendente' as const,
            cidade: 'São Luís',
        },
        {
            tipo_conta: 'material_didatico',
            descricao: 'Material didático — 30 apostilas Informática Básica',
            valor: 450.00,
            data_vencimento: new Date('2026-03-15'),
            data_pagamento: new Date('2026-03-14'),
            status: 'paga' as const,
            cidade: 'São Luís',
        },
        {
            tipo_conta: 'seguro',
            descricao: 'Seguro anual carreta BJK-2580',
            valor: 3200.00,
            data_vencimento: new Date('2026-06-01'),
            status: 'pendente' as const,
            recorrente: true,
            cidade: 'São Luís',
        },
        {
            tipo_conta: 'agua_luz',
            descricao: 'Energia elétrica — Sede Teresina PI — Março/2026',
            valor: 285.00,
            data_vencimento: new Date('2026-03-20'),
            status: 'vencida' as const,
            cidade: 'Teresina',
        },
    ];

    for (const cp of contasPagar) {
        const existing = await prisma.contaPagar.findFirst({ where: { descricao: cp.descricao } });
        if (!existing) {
            await prisma.contaPagar.create({
                data: {
                    tipo_conta: cp.tipo_conta,
                    descricao: cp.descricao,
                    valor: cp.valor,
                    data_vencimento: cp.data_vencimento,
                    data_pagamento: (cp as any).data_pagamento ?? null,
                    status: cp.status,
                    recorrente: (cp as any).recorrente ?? false,
                    cidade: cp.cidade,
                },
            });
        }
    }
    console.log('✅ Contas a pagar criadas (pendentes + vencidas + pagas)');

    // ─── 4. REEMBOLSOS ─────────────────────────────────────────────────────
    // Da Maria (professora)
    if (mariaUser) {
        const existing = await prisma.reimbursement.findFirst({
            where: { requestedBy: mariaUser.id, description: 'Material de Aula — canetas e marcadores' },
        });
        if (!existing) {
            await prisma.reimbursement.createMany({
                data: [
                    {
                        requestedBy: mariaUser.id,
                        type: 'CLASSROOM_MATERIAL',
                        amount: 85.50,
                        description: 'Material de Aula — canetas e marcadores',
                        status: 'APPROVED',
                        approvedBy: adminUser.id,
                        approvedAt: new Date(),
                    },
                    {
                        requestedBy: mariaUser.id,
                        type: 'FOOD',
                        amount: 42.00,
                        description: 'Almoço — deslocamento para turma T002-PI-2026 em Teresina',
                        status: 'PENDING',
                    },
                ],
                skipDuplicates: true,
            });
            console.log('✅ Reembolsos da Maria criados');
        }
    }

    // Do Pedro (motorista)
    if (pedroUser) {
        const existing = await prisma.reimbursement.findFirst({
            where: { requestedBy: pedroUser.id },
        });
        if (!existing) {
            await prisma.reimbursement.createMany({
                data: [
                    {
                        requestedBy: pedroUser.id,
                        type: 'FOOD',
                        amount: 45.90,
                        description: 'Almoço durante parada técnica em Teresina',
                        status: 'APPROVED',
                        approvedBy: adminUser.id,
                        approvedAt: new Date(),
                    },
                    {
                        requestedBy: pedroUser.id,
                        type: 'EMERGENCY_REPAIR',
                        amount: 180.00,
                        description: 'Troca de pneu furado — km 342 BR-135',
                        status: 'PENDING',
                    },
                ],
                skipDuplicates: true,
            });
            console.log('✅ Reembolsos do Pedro criados');
        }
    }

    // ─── 5. FERIADO DE TURMA (ClassHoliday) ─────────────────────────────────
    const turma1 = await prisma.class.findFirst({ where: { classIdentifier: 'T001-MA-2026' } });
    if (turma1 && adminUser) {
        const holExists = await prisma.classHoliday.findFirst({
            where: { classId: turma1.id, reason: 'Feriado Nacional — Sexta-Feira Santa' },
        });
        if (!holExists) {
            await prisma.classHoliday.create({
                data: {
                    classId: turma1.id,
                    date: new Date('2026-04-03'),
                    reason: 'Feriado Nacional — Sexta-Feira Santa',
                    registeredBy: adminUser.id,
                    active: true,
                },
            });
            console.log('✅ Feriado de turma criado (Sexta-Feira Santa 2026)');
        }
    }

    console.log('\n✅ seed-final concluído!');
    console.log('═══════════════════════════════════════════════════');
    console.log('Dados adicionados:');
    console.log('  João:   StudentAddress + Contact + Socioeconomic + Professional');
    console.log('  Funcs:  3 ativos + 2 pendentes (active=false)');
    console.log('  Contas: 5 contas a pagar (2 pendentes + 1 paga + 1 vencida + 1 recorrente)');
    console.log('  Reemb:  2 da Maria + 2 do Pedro');
    console.log('  Feriado: Sexta-Feira Santa 04/04/2026 na turma T001-MA-2026');
    console.log('═══════════════════════════════════════════════════');
}

main()
    .catch((e) => { console.error('❌ Erro no seed-final:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
