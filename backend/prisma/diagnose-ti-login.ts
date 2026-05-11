/**
 * Script de diagnóstico — simula o fluxo de login do IT_ADMIN
 * para verificar o que verifyEmailOtp realmente retorna.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const STAFF_ROLES = ['IT_ADMIN', 'ADMIN', 'COORDINATOR', 'FINANCIAL', 'TEACHER', 'DRIVER'];

async function main() {
    const user = await (prisma.user as any).findUnique({ where: { email: 'ti@qualifica.com.br' } });
    if (!user) { console.error('❌ Usuário TI não encontrado'); return; }

    console.log('✅ Usuário encontrado:');
    console.log('  role:', user.role);
    console.log('  requiresPasswordChange:', user.requiresPasswordChange);
    console.log('  requiresTwoFactorSetup:', user.requiresTwoFactorSetup);
    console.log('  twoFactorEnabled:', user.twoFactorEnabled);

    const isStaff = STAFF_ROLES.includes(user.role);
    console.log('\n🔍 Simulando lógica verifyEmailOtp...');
    console.log('  isStaff:', isStaff);

    // Lógica exata do backend
    if (user.role === 'IT_ADMIN' && user.requiresPasswordChange) {
        console.log('\n✅ RESULTADO: requiresPasswordChange → /primeiro-login');
        console.log('   O backend DEVERIA retornar: { requiresPasswordChange: true, preAuthToken }');
    } else if (isStaff && user.requiresTwoFactorSetup) {
        console.log('\n⚠️  RESULTADO: requiresTwoFactorSetup → /setup-2fa');
        console.log('   PROBLEMA! A condição requiresPasswordChange não foi ativada.');
    } else if (user.twoFactorEnabled) {
        console.log('\n⚠️  RESULTADO: requiresTwoFactor → /verify-2fa');
    } else {
        console.log('\n⚠️  RESULTADO: JWT direto → dashboard');
    }
}

main().finally(() => prisma.$disconnect());
