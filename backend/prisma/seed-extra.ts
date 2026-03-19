/**
 * seed-extra.ts — Seed COMPLEMENTAR de dados ricos para demonstração
 *
 * Adiciona ao banco dados realistas sem apagar os existentes:
 *   - Trips (Planejadas, Em Trânsito, Concluídas)
 *   - Manutenções de Carreta (campos corretos: tipo, titulo, status, prioridade)
 *   - Reembolsos extras (múltiplos status)
 *   - Ausências (PENDING, VALIDATED, PENALIZED) para todos os perfis
 *   - Notificações extras personalizadas
 *
 * Rodar: npx ts-node prisma/seed-extra.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed-extra (dados complementares para demo)...');
    console.log('═══════════════════════════════════════════════════');

    // ─── Buscar usuários e dados base ──────────────────────────────────────
    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@qualifica.com' } });
    // Buscar qualquer motorista disponível
    const driverUser = await prisma.user.findFirst({ where: { role: 'DRIVER' } });
    // Buscar qualquer professor
    const teacherUser = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
    // Buscar qualquer aluno / student
    const studentUser = await prisma.user.findFirst({ where: { role: 'STUDENT' } });

    const trucks  = await prisma.truck.findMany({ take: 1 });
    const truck   = trucks[0] ?? null;

    // Buscar cidades para viagens
    const cities = await prisma.city.findMany({ take: 4 });
    const originCity = cities[0] ?? null;
    const destCity   = cities[1] ?? cities[0] ?? null;

    if (!adminUser) {
        console.error('❌ Admin não encontrado — rode npx prisma db seed primeiro!');
        process.exit(1);
    }

    console.log(`✅ Admin: ${adminUser.email}`);
    console.log(`   Driver: ${driverUser?.name ?? 'nenhum'}`);
    console.log(`   Teacher: ${teacherUser?.name ?? 'nenhum'}`);
    console.log(`   Student: ${studentUser?.name ?? 'nenhum'}`);
    console.log(`   Truck: ${truck?.plate ?? 'nenhuma'}`);
    console.log(`   Cities: ${originCity?.name} → ${destCity?.name}`);

    // ─── 1. VIAGENS (Trips) ─────────────────────────────────────────────────
    console.log('\n📍 [1] Criando Trips variadas...');
    const tripExistsCount = await prisma.trip.count();

    if (truck && originCity && destCity && tripExistsCount < 5) {
        const today = new Date();
        const mkDate = (daysOffset: number, hours: number = 7) => {
            const d = new Date(today);
            d.setDate(d.getDate() + daysOffset);
            d.setHours(hours, 0, 0, 0);
            return d;
        };

        const driverName = driverUser?.name ?? 'Motorista Demo';

        const tripsData: any[] = [
            // Concluídas
            { truckId: truck.id, originCityId: originCity.id, destinationCityId: destCity.id, driverUserId: driverUser?.id ?? null, driverName, departureDate: mkDate(-10), expectedArrivalDate: mkDate(-10, 11), actualArrivalDate: mkDate(-10, 11), kmStart: 102000, kmEnd: 102230, status: 'COMPLETED', notes: 'Viagem realizada sem intercorrências.' },
            { truckId: truck.id, originCityId: destCity.id, destinationCityId: originCity.id, driverUserId: driverUser?.id ?? null, driverName, departureDate: mkDate(-7), expectedArrivalDate: mkDate(-7, 11), actualArrivalDate: mkDate(-7, 12), kmStart: 102230, kmEnd: 102590, status: 'COMPLETED', notes: 'Parada técnica para verificação de pneus.' },
            { truckId: truck.id, originCityId: originCity.id, destinationCityId: destCity.id, driverUserId: driverUser?.id ?? null, driverName, departureDate: mkDate(-14), expectedArrivalDate: mkDate(-14, 10), actualArrivalDate: mkDate(-14, 10), kmStart: 101660, kmEnd: 102000, status: 'COMPLETED' },
            { truckId: truck.id, originCityId: destCity.id, destinationCityId: originCity.id, driverUserId: driverUser?.id ?? null, driverName, departureDate: mkDate(-4), expectedArrivalDate: mkDate(-4, 12), actualArrivalDate: mkDate(-4, 13), kmStart: 102590, kmEnd: 102880, status: 'COMPLETED', notes: 'Tráfego congestionado na entrada da cidade.' },
            { truckId: truck.id, originCityId: originCity.id, destinationCityId: destCity.id, driverUserId: driverUser?.id ?? null, driverName, departureDate: mkDate(-20), expectedArrivalDate: mkDate(-20, 10), actualArrivalDate: mkDate(-20, 11), kmStart: 101250, kmEnd: 101660, status: 'COMPLETED' },
            // Em Trânsito
            { truckId: truck.id, originCityId: originCity.id, destinationCityId: destCity.id, driverUserId: driverUser?.id ?? null, driverName, departureDate: mkDate(0, 6), expectedArrivalDate: mkDate(0, 14), kmStart: 102880, status: 'IN_TRANSIT', notes: 'Motorista saiu às 06:00. Em rota.' },
            { truckId: truck.id, originCityId: destCity.id, destinationCityId: originCity.id, driverUserId: driverUser?.id ?? null, driverName, departureDate: mkDate(0, 8), expectedArrivalDate: mkDate(0, 16), status: 'IN_TRANSIT', notes: 'Segunda viagem do dia.' },
            // Planejadas
            { truckId: truck.id, originCityId: originCity.id, destinationCityId: destCity.id, driverUserId: driverUser?.id ?? null, driverName, departureDate: mkDate(3), expectedArrivalDate: mkDate(3, 12), status: 'PLANNED', notes: 'Gerada automaticamente — dia de aula T001' },
            { truckId: truck.id, originCityId: destCity.id, destinationCityId: originCity.id, driverUserId: driverUser?.id ?? null, driverName, departureDate: mkDate(7), expectedArrivalDate: mkDate(7, 12), status: 'PLANNED', notes: 'Gerada automaticamente — dia de aula T002' },
            { truckId: truck.id, originCityId: originCity.id, destinationCityId: destCity.id, driverUserId: driverUser?.id ?? null, driverName, departureDate: mkDate(14), expectedArrivalDate: mkDate(14, 15), status: 'PLANNED' },
        ];

        for (const trip of tripsData) {
            await prisma.trip.create({ data: trip as any });
        }
        console.log(`✅ ${tripsData.length} trips criadas (5 concluídas + 2 em trânsito + 3 planejadas)`);
    } else if (tripExistsCount >= 5) {
        console.log(`ℹ️  Já existem ${tripExistsCount} trips — pulando`);
    } else {
        console.log('⚠️  Dados insuficientes (truck/cities) — pulando trips');
    }

    // ─── 2. MANUTENÇÕES DE CARRETA ──────────────────────────────────────────
    // Campos corretos do schema: tipo, titulo, descricao, status, prioridade, custoEstimado
    console.log('\n🔧 [2] Criando Manutenções de Carreta...');
    if (truck) {
        const maintCount = await prisma.truckMaintenance.count({ where: { truckId: truck.id } });
        if (maintCount < 5) {
            const maintData: any[] = [
                { truckId: truck.id, tipo: 'preventiva', titulo: 'Troca de óleo e filtros — revisão 30.000km', descricao: 'Óleo sintético 15W40 — 8 litros. Filtros de ar e combustível trocados.', status: 'concluida', prioridade: 'media', custoEstimado: 450.00, custoReal: 480.00, fornecedor: 'Auto Peças Central Ltda', dataConclusao: new Date(Date.now() - 30 * 86400000) },
                { truckId: truck.id, tipo: 'corretiva', titulo: 'Reparo sistema de freios — pastilhas e disco traseiro', descricao: 'Pastilhas e disco direito substituídos. Líquido de freio trocado.', status: 'concluida', prioridade: 'alta', custoEstimado: 1200.00, custoReal: 1250.00, fornecedor: 'Freios & Rodas Oficina', dataConclusao: new Date(Date.now() - 20 * 86400000) },
                { truckId: truck.id, tipo: 'eletrica', titulo: 'Verificação elétrica e troca de bateria', descricao: 'Bateria trocada 80Ah. Alternador verificado — OK.', status: 'concluida', prioridade: 'media', custoEstimado: 350.00, custoReal: 380.00, fornecedor: 'Elétrica Veicular Souza', dataConclusao: new Date(Date.now() - 60 * 86400000) },
                { truckId: truck.id, tipo: 'corretiva', titulo: "Reparo hidráulico — bomba d'água com vazamento", descricao: "Vazamento detectado pelo motorista. Bomba d'água substituída.", status: 'concluida', prioridade: 'critica', custoEstimado: 600.00, custoReal: 620.00, fornecedor: 'Mecânica Pesada Lima', dataConclusao: new Date(Date.now() - 10 * 86400000) },
                { truckId: truck.id, tipo: 'pneu', titulo: 'Alinhamento, balanceamento e rodízio de pneus', descricao: 'Rodízio realizado. Pneu dianteiro esq. com desgaste irregular.', status: 'concluida', prioridade: 'baixa', custoEstimado: 220.00, custoReal: 240.00, fornecedor: 'Pneucar Serviços', dataConclusao: new Date(Date.now() - 45 * 86400000) },
                { truckId: truck.id, tipo: 'preventiva', titulo: 'Revisão geral 40.000km agendada', descricao: 'Revisão completa programada pelo fabricante para 40.000km.', status: 'agendada', prioridade: 'media', custoEstimado: 800.00, dataAgendada: new Date(Date.now() + 15 * 86400000), fornecedor: 'Concessionária Oficial' },
            ];

            for (const m of maintData) {
                const exists = await prisma.truckMaintenance.findFirst({ where: { titulo: m.titulo } });
                if (!exists) await prisma.truckMaintenance.create({ data: m });
            }
            console.log(`✅ Manutenções criadas`);
        } else {
            console.log(`ℹ️  Já existem ${maintCount} manutenções — pulando`);
        }
    }

    // ─── 3. REEMBOLSOS EXTRAS ───────────────────────────────────────────────
    console.log('\n💰 [3] Criando Reembolsos extras...');
    const reimbCount = await prisma.reimbursement.count();
    if (reimbCount < 5) {
        const baseUser = driverUser ?? teacherUser ?? adminUser;
        const reimbData: any[] = [
            { requestedBy: adminUser.id, type: 'CLASSROOM_MATERIAL', amount: 320.00, description: 'Impressão de 150 cartilhas — Material Didático Informática Básica', status: 'APPROVED', approvedBy: adminUser.id, approvedAt: new Date(Date.now() - 5 * 86400000) },
            { requestedBy: adminUser.id, type: 'CLEANING_MATERIAL', amount: 145.80, description: 'Material de limpeza e higiene — Polo São Luís (Março/2026)', status: 'PENDING' },
            { requestedBy: adminUser.id, type: 'EMERGENCY_REPAIR', amount: 560.00, description: 'Reparo emergencial — projetor queimado na sala principal', status: 'REJECTED', rejectionReason: 'Compra não autorizada previamente.', rejectedAt: new Date(Date.now() - 2 * 86400000) },
            ...(teacherUser ? [
                { requestedBy: teacherUser.id, type: 'CLASSROOM_MATERIAL', amount: 78.50, description: 'Papel sulfite A4 (5 resmas) e canetas coloridas para sala de aula', status: 'APPROVED', approvedBy: adminUser.id, approvedAt: new Date(Date.now() - 8 * 86400000) },
                { requestedBy: teacherUser.id, type: 'FOOD', amount: 42.00, description: 'Almoço — deslocamento para turma em Teresina', status: 'PENDING' },
                { requestedBy: teacherUser.id, type: 'OTHER', amount: 95.00, description: 'Extensão elétrica e régua de tomadas para laboratório', status: 'PENDING' },
            ] : []),
            ...(driverUser ? [
                { requestedBy: driverUser.id, type: 'FOOD', amount: 38.50, description: 'Alimentação — parada obrigatória antes de Imperatriz', status: 'APPROVED', approvedBy: adminUser.id, approvedAt: new Date(Date.now() - 3 * 86400000) },
                { requestedBy: driverUser.id, type: 'EMERGENCY_REPAIR', amount: 180.00, description: 'Troca de pneu furado em campo — km 342 BR-135', status: 'PENDING' },
                { requestedBy: driverUser.id, type: 'EMERGENCY_REPAIR', amount: 220.00, description: 'Troca de lâmpada do farol no posto', status: 'APPROVED', approvedBy: adminUser.id, approvedAt: new Date(Date.now() - 6 * 86400000) },
            ] : []),
        ];

        for (const r of reimbData) {
            const exists = await prisma.reimbursement.findFirst({ where: { description: r.description } });
            if (!exists) await prisma.reimbursement.create({ data: r as any });
        }
        console.log(`✅ Reembolsos extras criados`);
    } else {
        console.log(`ℹ️  Já existem ${reimbCount} reembolsos — pulando`);
    }

    // ─── 4. AUSÊNCIAS / IMPREVISTOS ─────────────────────────────────────────
    console.log('\n🏥 [4] Criando Ausências (Imprevistos)...');
    try {
        const rawAbs = await prisma.$queryRaw<any[]>`SELECT COUNT(*)::int as count FROM absences`;
        const absCount = rawAbs?.[0]?.count ?? 0;

        if (absCount < 5) {
            const absenceData: any[] = [
                ...(driverUser ? [
                    { userId: driverUser.id, type: 'ILLNESS', date: new Date(Date.now() - 15 * 86400000), description: 'Gripe forte com febre acima de 38°C. Atestado médico anexado.', status: 'VALIDATED', adminNote: 'Atestado verificado. Sem penalidade.', reviewedBy: adminUser.id, reviewedAt: new Date(Date.now() - 14 * 86400000) },
                    { userId: driverUser.id, type: 'EMERGENCY', date: new Date(Date.now() - 8 * 86400000), description: 'Internação de familiar — filho hospitalizado com dengue.', status: 'PENDING' },
                    { userId: driverUser.id, type: 'PERSONAL', date: new Date(Date.now() - 3 * 86400000), description: 'Ausência sem justificativa prévia. Documento enviado após solicitação.', status: 'PENALIZED', adminNote: 'Documento enviado fora do prazo. Retenção de diária aplicada.', penalty: 180.00, reviewedBy: adminUser.id, reviewedAt: new Date(Date.now() - 2 * 86400000) },
                ] : []),
                ...(teacherUser ? [
                    { userId: teacherUser.id, type: 'ILLNESS', date: new Date(Date.now() - 20 * 86400000), description: 'Covid-19 — isolamento obrigatório por 7 dias.', status: 'VALIDATED', adminNote: 'Documentação completa. Justificada.', reviewedBy: adminUser.id, reviewedAt: new Date(Date.now() - 19 * 86400000) },
                    { userId: teacherUser.id, type: 'TRIP', date: new Date(Date.now() - 5 * 86400000), description: 'Viagem para capacitação pedagógica em São Paulo.', status: 'VALIDATED', adminNote: 'Capacitação autorizada.', reviewedBy: adminUser.id, reviewedAt: new Date(Date.now() - 4 * 86400000) },
                    { userId: teacherUser.id, type: 'PERSONAL', date: new Date(Date.now() - 1 * 86400000), description: 'Compromisso pessoal inadiável.', status: 'PENDING' },
                ] : []),
                ...(studentUser ? [
                    { userId: studentUser.id, type: 'ILLNESS', date: new Date(Date.now() - 12 * 86400000), description: 'Consulta médica de urgência. Dentista de emergência.', status: 'PENDING' },
                    { userId: studentUser.id, type: 'ACCIDENT', date: new Date(Date.now() - 25 * 86400000), description: 'Acidente de moto a caminho da escola. BO anexado.', status: 'VALIDATED', adminNote: 'BO e prontuário médico conferidos.', reviewedBy: adminUser.id, reviewedAt: new Date(Date.now() - 24 * 86400000) },
                ] : []),
            ];

            for (const absence of absenceData) {
                try {
                    await (prisma as any).absence.create({ data: absence });
                } catch (e: any) {
                    console.warn(`  ⚠️ Absence (Prisma client ainda sem modelo): ${e?.message?.slice(0, 80)}`);
                }
            }
            console.log(`✅ ${absenceData.length} ausências criadas (ou tentadas — requer restart do backend)`);
        } else {
            console.log(`ℹ️  Já existem ${absCount} ausências — pulando`);
        }
    } catch (e: any) {
        console.warn(`⚠️ Tabela absences não acessível: ${e?.message?.slice(0, 60)}`);
        console.log('  → Reinicie o backend após o seed para regenerar o Prisma client com Absence');
    }

    // ─── 5. NOTIFICAÇÕES EXTRAS ─────────────────────────────────────────────
    console.log('\n🔔 [5] Criando Notificações extras...');
    const notifCount = await prisma.notification.count();
    if (notifCount < 10) {
        const notifData: any[] = [
            ...(driverUser ? [
                { userId: driverUser.id, type: 'GENERAL_ANNOUNCEMENT', title: 'Nova Viagem Agendada 📍', message: 'Sua próxima viagem foi confirmada para amanhã às 07:00h. Verifique a carreta.', data: { link: '/driver/viagens' }, channel: 'IN_APP', deliveryStatus: 'DELIVERED' },
                { userId: driverUser.id, type: 'JUSTIFICATION_APPROVED', title: 'Reembolso Aprovado ✅', message: 'Sua solicitação de reembolso de alimentação (R$ 38,50) foi aprovada.', data: { link: '/driver/reembolsos' }, channel: 'IN_APP', deliveryStatus: 'DELIVERED' },
                { userId: driverUser.id, type: 'ABSENCE_REGISTERED', title: 'Imprevisto Validado ✅', message: 'Sua ausência foi analisada e validada. Nenhuma penalidade aplicada.', data: { link: '/driver/imprevistos' }, channel: 'IN_APP', deliveryStatus: 'DELIVERED' },
            ] : []),
            ...(teacherUser ? [
                { userId: teacherUser.id, type: 'GENERAL_ANNOUNCEMENT', title: 'Frequência da Turma 📋', message: 'Registre a frequência de hoje até às 18:00h.', data: { link: '/teacher/frequencia' }, channel: 'IN_APP', deliveryStatus: 'DELIVERED' },
                { userId: teacherUser.id, type: 'MATERIAL_AVAILABLE', title: 'Novo Material Disponível 📚', message: 'Material de apoio adicionado ao portal.', data: { link: '/teacher' }, channel: 'IN_APP', deliveryStatus: 'DELIVERED' },
            ] : []),
            ...(studentUser ? [
                { userId: studentUser.id, type: 'ENROLLMENT_APPROVED', title: 'Matrícula Confirmada! 🎉', message: 'Sua matrícula foi aprovada. Aulas começam na segunda-feira.', data: { link: '/student/classes' }, channel: 'IN_APP', deliveryStatus: 'DELIVERED' },
                { userId: studentUser.id, type: 'CERTIFICATE_AVAILABLE', title: 'Certificado Disponível 🏆', message: 'Seu certificado está disponível para download.', data: { link: '/student/certificates' }, channel: 'IN_APP', deliveryStatus: 'DELIVERED' },
            ] : []),
            { userId: adminUser!.id, type: 'GENERAL_ANNOUNCEMENT', title: 'Novas Inscrições Pendentes 📋', message: '3 novas inscrições aguardam análise para a turma T001-MA-2026.', data: { link: '/admin/inscricoes' }, channel: 'IN_APP', deliveryStatus: 'DELIVERED' },
            { userId: adminUser!.id, type: 'ABSENCE_REGISTERED', title: 'Imprevisto Registrado 🏥', message: 'Um motorista registrou um imprevisto para análise.', data: { link: '/admin/imprevistos' }, channel: 'IN_APP', deliveryStatus: 'DELIVERED' },
        ];

        for (const notif of notifData) {
            await prisma.notification.create({ data: notif as any });
        }
        console.log(`✅ ${notifData.length} notificações extras criadas`);
    } else {
        console.log(`ℹ️  Já existem ${notifCount} notificações — pulando`);
    }

    // ─── SUMMARY ───────────────────────────────────────────────────────────
    const finalCounts = {
        trips: await prisma.trip.count(),
        maintenances: truck ? await prisma.truckMaintenance.count({ where: { truckId: truck.id } }) : 0,
        reimbursements: await prisma.reimbursement.count(),
        notifications: await prisma.notification.count(),
    };

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ seed-extra CONCLUÍDO!');
    console.log('Contagens finais:');
    console.log(`  🚛 Trips:          ${finalCounts.trips}`);
    console.log(`  🔧 Manutenções:    ${finalCounts.maintenances}`);
    console.log(`  💰 Reembolsos:     ${finalCounts.reimbursements}`);
    console.log(`  🔔 Notificações:   ${finalCounts.notifications}`);
    console.log('═══════════════════════════════════════════════════');
    console.log('⚠️  ATENÇÃO: Reinicie o backend para que');
    console.log('   o Prisma client reconheça o modelo Absence (tabela absences).');
}

main()
    .catch((e) => {
        console.error('❌ Erro no seed-extra:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
