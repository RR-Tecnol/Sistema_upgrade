const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const res = await prisma.contaPagar.create({
            data: {
                tipo_conta: 'funcionario',
                descricao: 'Teste Reembolso',
                valor: 100,
                data_vencimento: new Date(),
                status: 'pendente',
                observacoes: 'Teste'
            }
        });
        console.log(res);
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
