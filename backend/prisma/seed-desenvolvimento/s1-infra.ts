import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export async function seedInfra(prisma: PrismaClient) {
    console.log('\n━━━ [M1] Infraestrutura: Grupos, Cidades, Cursos, Carretas ━━━');
    const hash = await bcrypt.hash('RR@@Upgrade', 10);

    // ── Grupos ─────────────────────────────────────────────────────────────────
    const g1ma = await prisma.group.upsert({ where: { name: 'Grupo 1 MA' }, update: {}, create: { name: 'Grupo 1 MA', state: 'MA' } });
    const g2ma = await prisma.group.upsert({ where: { name: 'Grupo 2 MA' }, update: {}, create: { name: 'Grupo 2 MA', state: 'MA' } });
    const g1pi = await prisma.group.upsert({ where: { name: 'Grupo 1 PI' }, update: {}, create: { name: 'Grupo 1 PI', state: 'PI' } });
    const g1ac = await prisma.group.upsert({ where: { name: 'Grupo 1 AC' }, update: {}, create: { name: 'Grupo 1 AC', state: 'AC' } });
    console.log('  ✅ 4 grupos');

    // ── Cidades ────────────────────────────────────────────────────────────────
    const CITIES = [
        { name: 'São Luís',           state: 'MA', ibgeCode: '2111300', latitude: -2.5297,  longitude: -44.3028 },
        { name: 'Imperatriz',          state: 'MA', ibgeCode: '2105302', latitude: -5.5261,  longitude: -47.4916 },
        { name: 'São José de Ribamar', state: 'MA', ibgeCode: '2111201', latitude: -2.5506,  longitude: -44.0583 },
        { name: 'Timon',               state: 'MA', ibgeCode: '2112209', latitude: -5.0944,  longitude: -42.8356 },
        { name: 'Caxias',              state: 'MA', ibgeCode: '2103000', latitude: -4.8692,  longitude: -43.3564 },
        { name: 'Codó',                state: 'MA', ibgeCode: '2103307', latitude: -4.4497,  longitude: -43.8842 },
        { name: 'Paço do Lumiar',      state: 'MA', ibgeCode: '2107704', latitude: -2.5131,  longitude: -44.1064 },
        { name: 'Açailândia',          state: 'MA', ibgeCode: '2100055', latitude: -4.9478,  longitude: -47.5000 },
        { name: 'Bacabal',             state: 'MA', ibgeCode: '2101202', latitude: -4.2244,  longitude: -44.7900 },
        { name: 'Balsas',              state: 'MA', ibgeCode: '2101400', latitude: -7.5328,  longitude: -46.0357 },
        { name: 'Teresina',            state: 'PI', ibgeCode: '2211001', latitude: -5.0892,  longitude: -42.8019 },
        { name: 'Parnaíba',            state: 'PI', ibgeCode: '2207702', latitude: -2.9046,  longitude: -41.7769 },
        { name: 'Picos',               state: 'PI', ibgeCode: '2208007', latitude: -7.0769,  longitude: -41.4677 },
        { name: 'Floriano',            state: 'PI', ibgeCode: '2203909', latitude: -6.7669,  longitude: -43.0178 },
        { name: 'Piripiri',            state: 'PI', ibgeCode: '2208304', latitude: -4.2706,  longitude: -41.7767 },
        { name: 'Campo Maior',         state: 'PI', ibgeCode: '2202251', latitude: -4.8233,  longitude: -42.1689 },
        { name: 'Barras',              state: 'PI', ibgeCode: '2201200', latitude: -4.2428,  longitude: -42.2956 },
        { name: 'Rio Branco',          state: 'AC', ibgeCode: '1200401', latitude: -9.9754,  longitude: -67.8249 },
        { name: 'Cruzeiro do Sul',     state: 'AC', ibgeCode: '1200203', latitude: -7.6308,  longitude: -72.6700 },
        { name: 'Senador Guiomard',    state: 'AC', ibgeCode: '1200450', latitude: -10.1533, longitude: -67.7367 },
    ];
    for (const c of CITIES) {
        await prisma.city.upsert({
            where: { name_state: { name: c.name, state: c.state } },
            update: { latitude: c.latitude, longitude: c.longitude },
            create: c,
        });
    }
    console.log(`  ✅ ${CITIES.length} cidades`);

    // ── Instituição ────────────────────────────────────────────────────────────
    const inst = await prisma.institution.upsert({
        where: { slug: 'upgrade' },
        update: {},
        create: { id: '00000000-0000-4000-8000-000000000001', slug: 'upgrade', name: 'Upgrade Tecnologia Educacional', shortName: 'UPGRADE', active: true },
    });

    // ── Cursos ─────────────────────────────────────────────────────────────────
    const COURSES = [
        { name: 'Informática Básica', description: 'Fundamentos de informática: Windows, Word, Excel e Internet.', durationDaysMA: 30, durationDaysPI: 30, workloadHours: 120, prerequisites: 'Ensino fundamental completo', syllabus: 'Módulo 1: Windows\nMódulo 2: Word\nMódulo 3: Excel\nMódulo 4: Internet', availableInMA: true, availableInPI: true, isMulticourse: false },
        { name: 'Excel Avançado', description: 'Fórmulas avançadas, tabelas dinâmicas e macros VBA.', durationDaysMA: 20, durationDaysPI: 20, workloadHours: 80, prerequisites: 'Informática Básica', syllabus: 'Módulo 1: Fórmulas\nMódulo 2: Tabelas Dinâmicas\nMódulo 3: Macros', availableInMA: true, availableInPI: true, isMulticourse: false },
        { name: 'Assistente Administrativo', description: 'Formação completa para atuação em rotinas administrativas.', durationDaysMA: 45, durationDaysPI: 45, workloadHours: 180, prerequisites: 'Ensino médio completo', syllabus: 'Módulo 1: Rotinas\nMódulo 2: Atendimento\nMódulo 3: Documentos\nMódulo 4: Informática', availableInMA: true, availableInPI: true, isMulticourse: false },
        { name: 'Operador de Caixa', description: 'Capacitação para atuar no varejo como operador de caixa.', durationDaysMA: 15, durationDaysPI: 15, workloadHours: 60, prerequisites: 'Ensino fundamental completo', syllabus: 'Módulo 1: Atendimento\nMódulo 2: Operação\nMódulo 3: Segurança', availableInMA: true, availableInPI: true, isMulticourse: false },
        { name: 'Marketing Digital', description: 'Estratégias de marketing em redes sociais e plataformas digitais.', durationDaysMA: 30, durationDaysPI: 30, workloadHours: 120, prerequisites: 'Informática básica', syllabus: 'Módulo 1: Fundamentos\nMódulo 2: Redes Sociais\nMódulo 3: Google Ads', availableInMA: true, availableInPI: true, isMulticourse: false },
        { name: 'Empreendedorismo', description: 'Como abrir, planejar e gerenciar o próprio negócio.', durationDaysMA: 25, durationDaysPI: 25, workloadHours: 100, prerequisites: 'Ensino médio completo', syllabus: 'Módulo 1: Plano de Negócios\nMódulo 2: Finanças\nMódulo 3: Marketing\nMódulo 4: Gestão', availableInMA: true, availableInPI: true, isMulticourse: false },
    ];
    const courseMap: Record<string, string> = {};
    for (const c of COURSES) {
        const ex = await prisma.course.findFirst({ where: { name: c.name } });
        const rec = ex ?? await prisma.course.create({ data: { ...c, institutionId: inst.id } });
        courseMap[c.name] = rec.id;
    }
    console.log(`  ✅ ${COURSES.length} cursos`);

    // ── Admin ──────────────────────────────────────────────────────────────────
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@qualifica.com' },
        update: { password: hash },
        create: { email: 'admin@qualifica.com', password: hash, name: 'Administrador Upgrade', phone: '(98) 98888-0000', role: 'ADMIN', active: true },
    });

    // ── UserPreferences para admin ─────────────────────────────────────────────
    await prisma.userPreferences.upsert({
        where: { userId: adminUser.id },
        update: {},
        create: { userId: adminUser.id, notifEmail: true, notifCertificado: true, notifInscricao: true, notifFrequencia: true, animacoes: true, fonteGrande: false },
    });

    // ── Carretas ───────────────────────────────────────────────────────────────
    const truck1 = await prisma.truck.upsert({
        where: { identifier: 'TRK-001' },
        update: {},
        create: { identifier: 'TRK-001', licensePlate: 'MAA-1234', type: 'STANDARD', groupId: g1ma.id, state: 'MA', capacity: 40, roomsCount: 2, status: 'IN_USE', modelYear: '2022', equipmentList: 'Projetor, Lousa Digital, Ar-condicionado, Gerador', notes: 'Carreta principal do Grupo 1 MA — atende região metropolitana de São Luís.' },
    });
    const truck2 = await prisma.truck.upsert({
        where: { identifier: 'TRK-002' },
        update: {},
        create: { identifier: 'TRK-002', licensePlate: 'PIB-5678', type: 'MULTICOURSE', groupId: g1pi.id, state: 'PI', capacity: 35, roomsCount: 3, status: 'AVAILABLE', modelYear: '2021', equipmentList: 'Lousa Digital, Ar-condicionado, Internet Satelital', notes: 'Carreta multicurso do Grupo PI — equipada para módulos simultâneos.' },
    });
    const truck3 = await prisma.truck.upsert({
        where: { identifier: 'TRK-HIST-001' },
        update: {},
        create: { identifier: 'TRK-HIST-001', licensePlate: 'MHJ-9876', type: 'STANDARD', groupId: g2ma.id, state: 'MA', capacity: 35, roomsCount: 1, status: 'INACTIVE', modelYear: '2018', notes: 'Veículo aposentado em jan/2026 por desgaste excessivo.' },
    });

    // Manutenções da TRK-001
    await prisma.truckMaintenance.deleteMany({ where: { truckId: truck1.id } });
    await prisma.truckMaintenance.createMany({ data: [
        { truckId: truck1.id, tipo: 'preventiva', titulo: 'Revisão 30.000 km — Óleo e Filtros', descricao: 'Troca de óleo do motor 15W-40, filtro de ar e filtro de combustível. Verificação de correias e mangueiras.', status: 'concluida', prioridade: 'media', kmAtual: 29800, kmProximo: 35000, dataAgendada: new Date(Date.now() - 30*86400000), dataConclusao: new Date(Date.now() - 29*86400000), custoReal: 850.00, responsavel: 'Oficina Central RR', fornecedor: 'Auto Peças São Luís' },
        { truckId: truck1.id, tipo: 'corretiva', titulo: 'Revisão do Sistema de Freios ABS', descricao: 'Inspeção técnica do sistema ABS — pastilhas dianteiras com desgaste acima do limite. Em execução.', status: 'em_andamento', prioridade: 'alta', kmAtual: 31200, kmProximo: 35000, dataAgendada: new Date(Date.now() - 1*86400000), custoEstimado: 380.00, responsavel: 'Oficina Central RR', fornecedor: 'Mecânica Especializada MA' },
        { truckId: truck1.id, tipo: 'preventiva', titulo: 'Balanceamento e Alinhamento', descricao: 'Balanceamento dos 6 pneus e alinhamento de eixo dianteiro.', status: 'agendada', prioridade: 'media', kmAtual: 31200, kmProximo: 35000, dataAgendada: new Date(Date.now() + 14*86400000), responsavel: 'Oficina Central RR', fornecedor: 'Pneus & Serviços MA' },
    ]});
    await prisma.truck.update({ where: { id: truck1.id }, data: { lastMaintenanceDate: new Date(Date.now() - 29*86400000), nextMaintenanceDate: new Date(Date.now() + 14*86400000) } });

    console.log('  ✅ 3 carretas + manutenções');

    return { adminUser, courseMap, truck1, truck2, truck3, g1ma, g1pi, g1ac, g2ma };
}
