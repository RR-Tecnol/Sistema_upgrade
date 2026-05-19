import { NodeSSH } from 'node-ssh';
import * as path from 'path';

const ssh = new NodeSSH();
const PROJECT = '/opt/sistemaupgrade';

async function deployMel06And07() {
    console.log('🚀 MEL-06 + MEL-07 — Vinculação professor↔turma + Ponto de Saída\n');
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });

        // ─── BACKEND: schema + service + controllers ────────────────────────────────
        console.log('📤 1/5 — Schema Prisma (checkoutAt)...');
        await ssh.putFile(
            path.join(process.cwd(), 'backend/prisma/schema.prisma'),
            `${PROJECT}/backend/prisma/schema.prisma`
        );
        console.log('   ✅ schema.prisma');

        console.log('📤 2/5 — users.service.ts (registerCheckout + registerDriverCheckout)...');
        await ssh.putFile(
            path.join(process.cwd(), 'backend/src/users/users.service.ts'),
            `${PROJECT}/backend/src/users/users.service.ts`
        );
        console.log('   ✅ users.service.ts');

        console.log('📤 3/5 — controllers (teachers + users com checkout)...');
        await ssh.putFile(
            path.join(process.cwd(), 'backend/src/users/teachers.controller.ts'),
            `${PROJECT}/backend/src/users/teachers.controller.ts`
        );
        await ssh.putFile(
            path.join(process.cwd(), 'backend/src/users/users.controller.ts'),
            `${PROJECT}/backend/src/users/users.controller.ts`
        );
        console.log('   ✅ teachers.controller.ts + users.controller.ts');

        // ─── MIGRATION PRISMA ───────────────────────────────────────────────────────
        console.log('\n🔧 Rodando migration Prisma na VPS...');
        const migration = await ssh.execCommand(
            'docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy 2>&1 | tail -8',
            { cwd: PROJECT }
        );
        console.log(migration.stdout || migration.stderr || '(sem output)');

        // ─── FRONTEND: turmas workspace + teacher + driver pages ───────────────────
        console.log('\n📤 4/5 — Frontend: TurmaDetailWorkspace + teacher dashboard + driver frequencia...');
        await ssh.putFile(
            path.join(process.cwd(), 'frontend/components/admin/turmas/TurmaDetailWorkspace.tsx'),
            `${PROJECT}/frontend/components/admin/turmas/TurmaDetailWorkspace.tsx`
        );
        await ssh.putFile(
            path.join(process.cwd(), 'frontend/app/teacher/dashboard/page.tsx'),
            `${PROJECT}/frontend/app/teacher/dashboard/page.tsx`
        );
        await ssh.putFile(
            path.join(process.cwd(), 'frontend/app/driver/frequencia/page.tsx'),
            `${PROJECT}/frontend/app/driver/frequencia/page.tsx`
        );
        console.log('   ✅ 3 arquivos frontend enviados');

        // ─── REBUILD ────────────────────────────────────────────────────────────────
        console.log('\n🔨 5/5 — Rebuild backend + frontend...');
        const rebuild = await ssh.execCommand(
            'docker compose -f docker-compose.prod.yml up -d --build --no-deps backend frontend 2>&1 | tail -15',
            { cwd: PROJECT }
        );
        console.log(rebuild.stdout || rebuild.stderr);

        console.log('\n✅ MEL-06 + MEL-07 aplicados!');
        console.log('   MEL-06: Modal "Vincular Professor" na aba Info da Turma (com etapa de confirmação)');
        console.log('   MEL-07: Campo checkoutAt no Prisma + endpoints /checkout + botão "Bater Saída" para professor e motorista');
    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        ssh.dispose();
    }
}

deployMel06And07();
