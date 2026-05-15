/**
 * seed-prod.ts — Seed de PRODUÇÃO
 * Cria APENAS o perfil IT_ADMIN para o primeiro acesso.
 * 
 * Execute: npx tsx prisma/seed-prod.ts
 * Reset completo: npm run reset:prod
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import process from 'process';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 SEED DE PRODUÇÃO — criando perfil TI...');
    console.log('════════════════════════════════════════════\n');

    // Verificar se já existe um IT_ADMIN
    const existing = await prisma.user.findFirst({
        where: { role: 'IT_ADMIN' as any },
    });

    if (existing) {
        console.log('⚠️  Perfil IT_ADMIN já existe. Seed abortado para evitar duplicata.');
        console.log(`   E-mail atual: ${existing.email}`);
        console.log('   Se precisar recriar, rode: npm run reset:prod');
        return;
    }

    const senhaHash = await bcrypt.hash('TI@@PrimeiroAcesso2025', 10);

    const ti = await prisma.user.create({
        data: {
            email: 'ti@qualifica.com.br',
            password: senhaHash,
            name: 'Suporte TI',
            role: 'IT_ADMIN' as any,
            active: true,
            requiresPasswordChange: true,   // Força troca de e-mail + senha no 1º login
            requiresTwoFactorSetup: true,   // Força configuração do Google Authenticator
        },
    });

    console.log('✅ Perfil TI criado com sucesso!\n');
    console.log('════════════════════════════════════════════');
    console.log('🔑 CREDENCIAIS DO PRIMEIRO ACESSO:');
    console.log(`   E-mail:   ti@qualifica.com.br`);
    console.log(`   Senha:    TI@@PrimeiroAcesso2025`);
    console.log('');
    console.log('⚠️  ATENÇÃO: No primeiro login você será obrigado a:');
    console.log('   1. Verificar o código OTP enviado para o e-mail acima');
    console.log('   2. Definir seu e-mail definitivo e nova senha');
    console.log('   3. Escanear o QR Code com o Google Authenticator');
    console.log('════════════════════════════════════════════\n');
}

main()
    .catch(e => { console.error('❌ Erro no seed:', e?.message ?? e); process.exit(1); })
    .finally(() => prisma.$disconnect());
