import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // Create Groups
    console.log('Creating groups...');
    const grupo1MA = await prisma.group.upsert({
        where: { name: 'Grupo 1 MA' },
        update: {},
        create: {
            name: 'Grupo 1 MA',
            state: 'MA',
        },
    });

    const grupo2MA = await prisma.group.upsert({
        where: { name: 'Grupo 2 MA' },
        update: {},
        create: {
            name: 'Grupo 2 MA',
            state: 'MA',
        },
    });

    const grupo1PI = await prisma.group.upsert({
        where: { name: 'Grupo 1 PI' },
        update: {},
        create: {
            name: 'Grupo 1 PI',
            state: 'PI',
        },
    });

    console.log('✅ Groups created');

    // Create Cities - Maranhão
    console.log('Creating cities (MA)...');
    const cities = [
        // Maranhão
        { name: 'São Luís', state: 'MA', ibgeCode: '2111300' },
        { name: 'Imperatriz', state: 'MA', ibgeCode: '2105302' },
        { name: 'São José de Ribamar', state: 'MA', ibgeCode: '2111201' },
        { name: 'Timon', state: 'MA', ibgeCode: '2112209' },
        { name: 'Caxias', state: 'MA', ibgeCode: '2103000' },
        { name: 'Codó', state: 'MA', ibgeCode: '2103307' },
        { name: 'Paço do Lumiar', state: 'MA', ibgeCode: '2107704' },
        { name: 'Açailândia', state: 'MA', ibgeCode: '2100055' },
        { name: 'Bacabal', state: 'MA', ibgeCode: '2101202' },
        { name: 'Balsas', state: 'MA', ibgeCode: '2101400' },
        // Piauí
        { name: 'Teresina', state: 'PI', ibgeCode: '2211001' },
        { name: 'Parnaíba', state: 'PI', ibgeCode: '2207702' },
        { name: 'Picos', state: 'PI', ibgeCode: '2208007' },
        { name: 'Floriano', state: 'PI', ibgeCode: '2203909' },
        { name: 'Piripiri', state: 'PI', ibgeCode: '2208304' },
        { name: 'Campo Maior', state: 'PI', ibgeCode: '2202251' },
        { name: 'Barras', state: 'PI', ibgeCode: '2201200' },
        { name: 'Altos', state: 'PI', ibgeCode: '2200400' },
        { name: 'Esperantina', state: 'PI', ibgeCode: '2203701' },
        { name: 'Pedro II', state: 'PI', ibgeCode: '2207900' },
    ];

    for (const city of cities) {
        await prisma.city.upsert({
            where: { name_state: { name: city.name, state: city.state } },
            update: {},
            create: city,
        });
    }

    console.log('✅ Cities created');

    // Create Courses
    console.log('Creating courses...');
    const courses = [
        {
            name: 'Informática Básica',
            description: 'Curso básico de informática com Windows, Word, Excel e Internet',
            durationDaysMA: 30,
            durationDaysPI: 30,
            workloadHours: 120,
            prerequisites: 'Ensino fundamental completo',
            syllabus: `Módulo 1: Introdução à Informática
Módulo 2: Sistema Operacional Windows
Módulo 3: Editor de Texto (Word)
Módulo 4: Planilha Eletrônica (Excel)
Módulo 5: Internet e E-mail`,
            availableInMA: true,
            availableInPI: true,
            isMulticourse: false,
        },
        {
            name: 'Excel Avançado',
            description: 'Curso avançado de Excel com fórmulas, tabelas dinâmicas e macros',
            durationDaysMA: 20,
            durationDaysPI: 20,
            workloadHours: 80,
            prerequisites: 'Conhecimento básico de Excel',
            syllabus: `Módulo 1: Fórmulas e Funções Avançadas
Módulo 2: Tabelas Dinâmicas
Módulo 3: Gráficos Avançados
Módulo 4: Macros e VBA
Módulo 5: Análise de Dados`,
            availableInMA: true,
            availableInPI: true,
            isMulticourse: false,
        },
        {
            name: 'Assistente Administrativo',
            description: 'Formação completa para atuar como assistente administrativo',
            durationDaysMA: 45,
            durationDaysPI: 45,
            workloadHours: 180,
            prerequisites: 'Ensino médio completo',
            syllabus: `Módulo 1: Rotinas Administrativas
Módulo 2: Atendimento ao Cliente
Módulo 3: Organização de Documentos
Módulo 4: Informática Aplicada
Módulo 5: Comunicação Empresarial`,
            availableInMA: true,
            availableInPI: true,
            isMulticourse: false,
        },
        {
            name: 'Operador de Caixa',
            description: 'Capacitação para atuar como operador de caixa no varejo',
            durationDaysMA: 15,
            durationDaysPI: 15,
            workloadHours: 60,
            prerequisites: 'Ensino fundamental completo',
            syllabus: `Módulo 1: Atendimento ao Cliente
Módulo 2: Operação de Caixa
Módulo 3: Matemática Financeira
Módulo 4: Segurança e Prevenção de Perdas`,
            availableInMA: true,
            availableInPI: true,
            isMulticourse: false,
        },
        {
            name: 'Auxiliar de Recursos Humanos',
            description: 'Formação para atuar no departamento de recursos humanos',
            durationDaysMA: 40,
            durationDaysPI: 40,
            workloadHours: 160,
            prerequisites: 'Ensino médio completo',
            syllabus: `Módulo 1: Introdução ao RH
Módulo 2: Recrutamento e Seleção
Módulo 3: Departamento Pessoal
Módulo 4: Treinamento e Desenvolvimento
Módulo 5: Legislação Trabalhista`,
            availableInMA: true,
            availableInPI: true,
            isMulticourse: false,
        },
        {
            name: 'Marketing Digital',
            description: 'Curso completo de marketing digital e redes sociais',
            durationDaysMA: 30,
            durationDaysPI: 30,
            workloadHours: 120,
            prerequisites: 'Conhecimento básico de informática',
            syllabus: `Módulo 1: Fundamentos do Marketing Digital
Módulo 2: Redes Sociais
Módulo 3: Google Ads e SEO
Módulo 4: E-mail Marketing
Módulo 5: Métricas e Análise`,
            availableInMA: true,
            availableInPI: true,
            isMulticourse: false,
        },
        {
            name: 'Empreendedorismo',
            description: 'Capacitação para abrir e gerenciar o próprio negócio',
            durationDaysMA: 25,
            durationDaysPI: 25,
            workloadHours: 100,
            prerequisites: 'Ensino médio completo',
            syllabus: `Módulo 1: Perfil Empreendedor
Módulo 2: Plano de Negócios
Módulo 3: Finanças para Empreendedores
Módulo 4: Marketing e Vendas
Módulo 5: Gestão de Pessoas`,
            availableInMA: true,
            availableInPI: true,
            isMulticourse: false,
        },
        {
            name: 'Qualificação Profissional (Multicurso)',
            description: 'Curso multicurso com diversos módulos profissionalizantes',
            durationDaysMA: 60,
            durationDaysPI: 60,
            workloadHours: 240,
            prerequisites: 'Ensino fundamental completo',
            syllabus: `Módulo 1: Informática Básica
Módulo 2: Atendimento ao Cliente
Módulo 3: Vendas
Módulo 4: Gestão de Tempo
Módulo 5: Comunicação Empresarial
Módulo 6: Empreendedorismo`,
            availableInMA: true,
            availableInPI: true,
            isMulticourse: true,
        },
    ];

    for (const course of courses) {
        const existing = await prisma.course.findFirst({
            where: { name: course.name },
        });

        if (!existing) {
            await prisma.course.create({
                data: course,
            });
        }
    }

    console.log('✅ Courses created');

    // Create Admin User
    console.log('Creating admin user...');
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@qualifica.com' },
        update: {
            password: '$2b$10$g1xqAHP38C7X4Xejf/YYGO/TlcZITNEH8/WgoZ9/wCb4d3GJ6mSO6'
        },
        create: {
            email: 'admin@qualifica.com',
            password: '$2b$10$g1xqAHP38C7X4Xejf/YYGO/TlcZITNEH8/WgoZ9/wCb4d3GJ6mSO6', // password: admin123
            name: 'Administrador',
            phone: '(98) 98888-8888',
            role: 'ADMIN',
            active: true,
        },
    });

    console.log('✅ Admin user created');
    console.log('   Email: admin@qualifica.com');
    console.log('   Password: admin123');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\nSummary:');
    console.log(`- Groups: 3`);
    console.log(`- Cities: ${cities.length}`);
    console.log(`- Courses: ${courses.length}`);
    console.log(`- Users: 1 (admin)`);
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
