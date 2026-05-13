import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdmin() {
    try {
        console.log('🔍 Verificando dados do admin...\n');

        // Buscar admin por email
        const admin = await prisma.user.findUnique({
            where: {
                email: 'admin@qualifica.com',
            },
            select: {
                id: true,
                name: true,
                email: true,
                cpf: true,
                role: true,
                active: true,
                password: true, // Vamos ver o hash
            },
        });

        if (!admin) {
            console.log('❌ Admin não encontrado!');
            return;
        }

        console.log('✅ Admin encontrado:');
        console.log(`   Nome: ${admin.name}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   CPF: ${admin.cpf || 'NÃO CADASTRADO'}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Ativo: ${admin.active}`);
        console.log(`   Password Hash: ${admin.password.substring(0, 20)}...`);

        // Verificar se o CPF está correto
        if (!admin.cpf) {
            console.log('\n⚠️  CPF não cadastrado! Execute o script update-admin-cpf.ts');
        } else if (admin.cpf !== '12345678900') {
            console.log(`\n⚠️  CPF cadastrado: ${admin.cpf}`);
            console.log('   Esperado: 12345678900');
        }

        // Testar a senha
        const bcrypt = require('bcrypt');
        const isPasswordValid = await bcrypt.compare('admin123', admin.password);

        console.log(`\n🔐 Teste de senha "admin123": ${isPasswordValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);

        if (!isPasswordValid) {
            console.log('\n⚠️  A senha "admin123" não corresponde ao hash no banco!');
            console.log('   Vou resetar a senha para "admin123"...');

            const newHash = await bcrypt.hash('admin123', 10);
            await prisma.user.update({
                where: { id: admin.id },
                data: { password: newHash },
            });

            console.log('   ✅ Senha resetada com sucesso!');
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdmin();
