import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const joao = await prisma.user.findFirst({ where: { email: 'joao.driver.test99@qualifica.com' } });
    const adm  = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!joao) { console.log('Joao nao encontrado'); return; }

    await prisma.absence.deleteMany({ where: { userId: joao.id } });
    await prisma.absence.createMany({ data: [
        {
            userId: joao.id, type: 'ILLNESS',
            date: new Date(Date.now() - 45 * 86400000),
            description: 'Gripe forte com atestado medico de 3 dias. Impossibilitado de dirigir com febre alta.',
            status: 'VALIDATED',
            adminNote: 'Atestado medico recebido e validado. Ausencia justificada.',
            reviewedBy: adm?.id, reviewedAt: new Date(Date.now() - 44 * 86400000), active: true,
        },
        {
            userId: joao.id, type: 'PERSONAL',
            date: new Date(Date.now() - 20 * 86400000),
            description: 'Ausencia por motivo pessoal. Nao foi apresentada justificativa comprobatoria dentro do prazo.',
            status: 'PENALIZED',
            adminNote: 'Ausencia sem documento valido. Desconto regimental de R$ 140,00 aplicado.',
            penalty: 140.00,
            reviewedBy: adm?.id, reviewedAt: new Date(Date.now() - 19 * 86400000), active: true,
        },
        {
            userId: joao.id, type: 'EMERGENCY',
            date: new Date(Date.now() - 5 * 86400000),
            description: 'Emergencia familiar - familiar hospitalizado. Aguardando boletim medico para comprovante.',
            status: 'PENDING', active: true,
        },
    ]});
    console.log('OK - 3 ausencias criadas: VALIDATED + PENALIZED (R$140) + PENDING');
}

main()
    .catch(e => console.error(e))
    .finally(async () => { await prisma.$disconnect(); });
