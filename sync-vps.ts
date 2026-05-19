import { NodeSSH } from 'node-ssh';
import * as path from 'path';

const ssh = new NodeSSH();
const PROJECT = '/opt/sistemaupgrade';

async function syncVps() {
    console.log('🚀 Sincronizando BUG-02 e MEL-04 para a VPS...\n');
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });

        console.log('📤 1/3 — Enviando main.ts (BUG-02)...');
        await ssh.putFile(
            path.join(process.cwd(), 'backend/src/main.ts'),
            `${PROJECT}/backend/src/main.ts`
        );
        console.log('   ✅ main.ts enviado');

        console.log('📤 2/3 — Enviando frontend page (MEL-04)...');
        await ssh.putFile(
            path.join(process.cwd(), 'frontend/app/admin/acoes/[id]/page.tsx'),
            `${PROJECT}/frontend/app/admin/acoes/[id]/page.tsx`
        );
        console.log('   ✅ page.tsx enviado');

        console.log('\n🔨 3/3 — Rebuild backend + frontend...');
        const rebuild = await ssh.execCommand(
            'docker compose -f docker-compose.prod.yml up -d --build --no-deps backend frontend 2>&1 | tail -15',
            { cwd: PROJECT }
        );
        console.log(rebuild.stdout || rebuild.stderr);

        // Verificação final do BUG-01 (NGINX)
        console.log('\n🔍 Verificando porta do MinIO no nginx (BUG-01)...');
        const nginxCheck = await ssh.execCommand('grep 9010 /etc/nginx/sites-available/sistemaupgrade.conf || echo "NAO_ENCONTRADO"');
        if (nginxCheck.stdout.includes('9010')) {
            console.log('   ✅ Nginx já está configurado para a porta 9010 corretamente!');
        } else {
            console.log('   ⚠️ O nginx.conf ainda não usa a porta 9010 no VPS (BUG-01 ainda pendente).');
        }

        console.log('\n✅ Sincronização e verificação concluídas!');
    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        ssh.dispose();
    }
}

syncVps();
