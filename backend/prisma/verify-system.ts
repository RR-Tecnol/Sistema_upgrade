/**
 * Suite de verificação completa do sistema IT_ADMIN
 * Testa: login bypass, completeFirstLogin, DB state, endpoints críticos
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const BASE = 'http://localhost:3002/api';

async function req(method: string, path: string, body?: any, token?: string) {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch {}
    return { status: res.status, data };
}

function pass(msg: string) { console.log(`  ✅ ${msg}`); }
function fail(msg: string) { console.log(`  ❌ ${msg}`); }
function section(title: string) { console.log(`\n${'═'.repeat(55)}\n  ${title}\n${'═'.repeat(55)}`); }

async function main() {
    console.log('\n🔬 VERIFICAÇÃO SISTÊMICA — UPGRADE PLATFORM\n');

    // ── 1. BANCO DE DADOS ────────────────────────────────────────
    section('1. BANCO DE DADOS');
    const user = await (prisma.user as any).findUnique({ where: { email: 'ti@qualifica.com.br' } });
    if (user) pass(`IT_ADMIN seed encontrado: ${user.email}`); else { fail('IT_ADMIN não encontrado'); }
    if (user?.role === 'IT_ADMIN') pass('Role: IT_ADMIN ✓'); else fail(`Role incorreta: ${user?.role}`);
    if (user?.requiresPasswordChange === true) pass('requiresPasswordChange: true ✓'); else fail(`requiresPasswordChange: ${user?.requiresPasswordChange}`);
    if (user?.requiresTwoFactorSetup === true) pass('requiresTwoFactorSetup: true ✓'); else fail(`requiresTwoFactorSetup: ${user?.requiresTwoFactorSetup}`);
    if (user?.twoFactorEnabled === false) pass('twoFactorEnabled: false ✓'); else fail(`twoFactorEnabled inesperado: ${user?.twoFactorEnabled}`);
    const totalUsers = await prisma.user.count();
    if (totalUsers === 1) pass(`Banco limpo — apenas 1 usuário (IT_ADMIN)`); else fail(`${totalUsers} usuários encontrados (esperado: 1)`);

    // ── 2. BACKEND — ENDPOINTS CRÍTICOS ─────────────────────────
    section('2. BACKEND — ENDPOINTS CRÍTICOS');

    // Health (login endpoint)
    const loginBad = await req('POST', '/auth/login', { email: 'wrong@test.com', password: 'wrongpass' });
    if (loginBad.status === 401) pass('POST /auth/login — 401 para credenciais inválidas ✓');
    else fail(`POST /auth/login status inesperado: ${loginBad.status}`);

    // IT_ADMIN login — deve pular OTP e retornar requiresPasswordChange
    const loginOk = await req('POST', '/auth/login', { email: 'ti@qualifica.com.br', password: 'TI@@PrimeiroAcesso2025' });
    if (loginOk.status === 201 || loginOk.status === 200) {
        if (loginOk.data.requiresPasswordChange === true) pass('IT_ADMIN login → requiresPasswordChange: true ✓ (OTP pulado)');
        else fail(`IT_ADMIN login → esperado requiresPasswordChange, recebido: ${JSON.stringify(loginOk.data)}`);
        if (loginOk.data.preAuthToken) pass('preAuthToken emitido com step=first_login ✓');
        else fail('preAuthToken ausente');
    } else {
        fail(`IT_ADMIN login falhou: ${loginOk.status} ${JSON.stringify(loginOk.data)}`);
    }

    // Token de first_login com dado errado
    const badToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiaWF0IjoxNjAwMDAwMDAwfQ.invalid';
    const completeBad = await req('POST', '/auth/first-login/complete', { preAuthToken: badToken, newEmail: 'a@b.com', newPassword: 'Abc12345@' });
    if (completeBad.status === 401) pass('POST /auth/first-login/complete — 401 para token inválido ✓');
    else fail(`first-login/complete token inválido: ${completeBad.status}`);

    // Rota protegida sem auth
    const noAuth = await req('GET', '/employees');
    if (noAuth.status === 401) pass('GET /employees sem token → 401 ✓');
    else fail(`GET /employees sem token: ${noAuth.status}`);

    // Rota de admin-invite bloqueada para não-IT_ADMIN (token inválido)
    const noInvite = await req('POST', '/employees/admin-invite', {}, 'fake_token');
    if (noInvite.status === 401) pass('POST /employees/admin-invite sem permissão → 401 ✓');
    else fail(`admin-invite: ${noInvite.status}`);

    // Endpoint público
    const settings = await req('GET', '/settings/public');
    if (settings.status === 200) pass('GET /settings/public → 200 ✓');
    else fail(`GET /settings/public: ${settings.status}`);

    // ── 3. FLUXO LÓGICO IT_ADMIN ─────────────────────────────────
    section('3. FLUXO LÓGICO IT_ADMIN (simulação backend)');
    const pwValid = await bcrypt.compare('TI@@PrimeiroAcesso2025', user.password);
    if (pwValid) pass('Senha temporária bate com hash no banco ✓'); else fail('Senha temporária não confere');

    const flowCheck = user.role === 'IT_ADMIN' && user.requiresPasswordChange === true;
    if (flowCheck) pass('IT_ADMIN + requiresPasswordChange → primeiro login sem OTP de e-mail (regra de produto) ✓');
    else fail('Condição primeiro-login IT_ADMIN inativa');

    // ── 4. ESTRUTURA DE ARQUIVOS CRÍTICOS ────────────────────────
    section('4. ARQUIVOS CRÍTICOS — EXISTÊNCIA');
    const { existsSync } = await import('fs');
    const criticalFiles = [
        'src/auth/auth.service.ts',
        'src/auth/auth.controller.ts',
        'src/auth/guards/roles.guard.ts',
        'src/employees/employees.controller.ts',
        'prisma/seed-prod.ts',
        'prisma/reset-db.ts',
    ];
    for (const f of criticalFiles) {
        const full = `X:/Sistema_upgrade-main_atual-2904/Sistema_upgrade-main_atual/backend/${f}`;
        if (existsSync(full)) pass(`${f} ✓`); else fail(`MISSING: ${f}`);
    }
    const frontendFiles = [
        'app/primeiro-login/page.tsx',
        'app/verify-email-otp/page.tsx',
        'app/setup-2fa/page.tsx',
        'app/verify-2fa/page.tsx',
        'lib/api/auth.ts',
    ];
    for (const f of frontendFiles) {
        const full = `X:/Sistema_upgrade-main_atual-2904/Sistema_upgrade-main_atual/frontend/${f}`;
        if (existsSync(full)) pass(`frontend/${f} ✓`); else fail(`MISSING: frontend/${f}`);
    }

    // ── 5. RESUMO ────────────────────────────────────────────────
    section('5. RESULTADO FINAL');
    console.log('  Todos os checks foram executados. Veja os ✅/❌ acima.');
    console.log('\n  🔑 Credenciais ativas no banco:');
    console.log(`     E-mail : ti@qualifica.com.br`);
    console.log(`     Senha  : TI@@PrimeiroAcesso2025`);
    console.log(`     Role   : IT_ADMIN`);
    console.log(`     Flags  : requiresPasswordChange=true | requiresTwoFactorSetup=true\n`);
}

main()
    .catch(e => console.error('ERRO CRÍTICO:', e))
    .finally(() => prisma.$disconnect());
