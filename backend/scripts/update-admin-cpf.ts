import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAdminCPF() {
    try {
        console.log('🔄 Atualizando CPF do admin...');

        // Atualizar o admin principal
        // IMPORTANTE: Substitua '12345678900' pelo CPF real do administrador
        const adminCPF = '12345678900'; // Altere aqui!

        const updatedAdmin = await prisma.user.update({
            where: {
                email: 'admin@qualifica.com',
            },
            data: {
                cpf: adminCPF,
            },
        });

        console.log('✅ Admin atualizado com sucesso!');
        console.log('📋 Dados do admin:');
        console.log(`   Nome: ${updatedAdmin.name}`);
        console.log(`   Email: ${updatedAdmin.email}`);
        console.log(`   CPF: ${updatedAdmin.cpf}`);
        console.log(`   Role: ${updatedAdmin.role}`);

        // Listar todos os admins e coordenadores
        console.log('\n📊 Todos os usuários administrativos:');
        const admins = await prisma.user.findMany({
            where: {
                role: {
                    in: ['ADMIN', 'COORDINATOR'],
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                cpf: true,
                role: true,
            },
        });

        admins.forEach((admin) => {
            console.log(`\n   ${admin.role}:`);
            console.log(`   - Nome: ${admin.name}`);
            console.log(`   - Email: ${admin.email}`);
            console.log(`   - CPF: ${admin.cpf || 'NÃO CADASTRADO'}`);
        });

        console.log('\n✨ Processo concluído!');
    } catch (error) {
        console.error('❌ Erro ao atualizar admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateAdminCPF();
