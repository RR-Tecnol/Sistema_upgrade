import { NodeSSH } from 'node-ssh';
import * as path from 'path';

const ssh = new NodeSSH();
const PROJECT = '/opt/sistemaupgrade';

async function deployFixes() {
    console.log('🚀 Enviando correções MEL-04 para VPS...\n');
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });

        // 1. Enviar arquivo corrigido
        console.log('📤 1/3 — Enviando TurmaDetailWorkspace.tsx corrigido...');
        await ssh.putFile(
            path.join(process.cwd(), 'frontend/components/admin/turmas/TurmaDetailWorkspace.tsx'),
            `${PROJECT}/frontend/components/admin/turmas/TurmaDetailWorkspace.tsx`
        );
        console.log('   ✅ Enviado');

        // 2. Rebuild do frontend dentro do container
        console.log('\n🔨 2/3 — Fazendo rebuild do frontend (Next.js)...');
        const rebuild = await ssh.execCommand(
            'docker exec upgrade-frontend sh -c "cd /app && npm run build 2>&1 | tail -20"',
            { cwd: PROJECT }
        );
        console.log(rebuild.stdout || rebuild.stderr);

        // 3. Restart do frontend
        console.log('\n🔄 3/3 — Reiniciando container frontend...');
        const restart = await ssh.execCommand(
            'docker compose -f docker-compose.prod.yml restart frontend',
            { cwd: PROJECT }
        );
        console.log(restart.stdout || restart.stderr || 'OK');

        console.log('\n✅ MEL-04 aplicado na VPS!');
        console.log('   Status dos períodos agora exibe PT (Planejada/Em andamento) em vez de enum inglês.');

    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        ssh.dispose();
    }
}

deployFixes();
