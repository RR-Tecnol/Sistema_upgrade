import { NodeSSH } from 'node-ssh';
import * as path from 'path';

const ssh = new NodeSSH();
const PROJECT = '/opt/sistemaupgrade';

async function deployFrontend() {
    console.log('🔨 Rebuildando frontend na VPS...\n');
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });

        // Copiar arquivo corrigido para fora do container antes de rebuild
        console.log('📤 1/2 — Enviando arquivos alterados...');
        await ssh.putFile(
            path.join(process.cwd(), 'frontend/components/admin/turmas/TurmaDetailWorkspace.tsx'),
            `${PROJECT}/frontend/components/admin/turmas/TurmaDetailWorkspace.tsx`
        );
        console.log('   ✅ TurmaDetailWorkspace.tsx');

        // Rebuild do container frontend com a imagem atualizada
        console.log('\n🔄 2/2 — Rebuild e restart do container frontend...');
        const rebuild = await ssh.execCommand(
            'docker compose -f docker-compose.prod.yml up -d --build --no-deps frontend 2>&1 | tail -25',
            { cwd: PROJECT }
        );
        console.log(rebuild.stdout || rebuild.stderr);

        console.log('\n✅ Frontend rebuildado com MEL-04!');
    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        ssh.dispose();
    }
}

deployFrontend();
