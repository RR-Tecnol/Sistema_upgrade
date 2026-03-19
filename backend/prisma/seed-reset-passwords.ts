/**
 * Script de reset de senhas — Sistema Upgrade
 * Nova senha padrão para todos os usuários não-admin: RR@@Upgrade
 * Admin mantém: admin123
 * Execute: npx ts-node --transpile-only prisma/seed-reset-passwords.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('\n🔑 Resetando senhas do banco...');

    const NEW_PASSWORD = 'RR@@Upgrade';
    const SALT_ROUNDS = 10;
    const newHash = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);

    // Mantém a senha do admin e atualiza todos os outros
    const result = await prisma.user.updateMany({
        where: { email: { not: 'admin@qualifica.com' } },
        data: { password: newHash },
    });

    console.log(`✅ ${result.count} usuários atualizados com a senha: ${NEW_PASSWORD}`);

    // Verifica e garante que o admin tem senha admin123
    const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);
    await prisma.user.update({
        where: { email: 'admin@qualifica.com' },
        data: { password: adminHash },
    });
    console.log(`✅ Admin: admin@qualifica.com / admin123 (mantida)`);

    const users = await prisma.user.findMany({
        select: { email: true, name: true, role: true },
        orderBy: { role: 'asc' },
    });

    console.log('\n=== CREDENCIAIS ATUALIZADAS ===');
    users.forEach(u => {
        const pass = u.email === 'admin@qualifica.com' ? 'admin123' : NEW_PASSWORD;
        console.log(`${u.role.padEnd(10)} | ${u.email.padEnd(45)} | ${pass}`);
    });

    await prisma.$disconnect();
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1); });
