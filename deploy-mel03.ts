import { NodeSSH } from 'node-ssh';
import * as path from 'path';

const ssh = new NodeSSH();
const PROJECT = '/opt/sistemaupgrade';

async function deployMel03() {
    console.log('🚀 MEL-03 — Enviando correção de duplicação de curso...\n');
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });

        console.log('📤 1/2 — Enviando acoes/page.tsx...');
        await ssh.putFile(
            path.join(process.cwd(), 'frontend/app/admin/acoes/page.tsx'),
            `${PROJECT}/frontend/app/admin/acoes/page.tsx`
        );
        console.log('   ✅ page.tsx');

        console.log('\n🔨 2/2 — Rebuild frontend...');
        const rebuild = await ssh.execCommand(
            'docker compose -f docker-compose.prod.yml up -d --build --no-deps frontend 2>&1 | tail -15',
            { cwd: PROJECT }
        );
        console.log(rebuild.stdout || rebuild.stderr);

        console.log('\n✅ MEL-03 aplicado!');
        console.log('   - Campo de curso agora exibe readonly quando herdado do período');
        console.log('   - Botão "Trocar" permite override se necessário');
        console.log('   - Banner redundante removido');
    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        ssh.dispose();
    }
}

deployMel03();
