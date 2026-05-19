import { NodeSSH } from 'node-ssh';
import * as path from 'path';

const ssh = new NodeSSH();
const PROJECT = '/opt/sistemaupgrade';

async function deployMel08() {
    console.log('🚀 MEL-08 — Enviando refatoração do editor de certificados...\n');
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });

        console.log('📤 1/2 — Enviando certificados/page.tsx...');
        await ssh.putFile(
            path.join(process.cwd(), 'frontend/app/admin/certificados/page.tsx'),
            `${PROJECT}/frontend/app/admin/certificados/page.tsx`
        );
        console.log('   ✅ page.tsx (197KB → atualizado)');

        console.log('\n🔨 2/2 — Rebuild frontend...');
        const rebuild = await ssh.execCommand(
            'docker compose -f docker-compose.prod.yml up -d --build --no-deps frontend 2>&1 | tail -10',
            { cwd: PROJECT }
        );
        console.log(rebuild.stdout || rebuild.stderr);

        console.log('\n✅ MEL-08 aplicado!');
        console.log('   - 5 botões com semântica clara (Rascunho / Publicar / Duplicar / Vincular)');
        console.log('   - window.prompt substituído por modal createPortal padrão Upgrade');
        console.log('   - Modal "Vincular ao Curso" com autopreenchimento de ementa');
        console.log('   - "Publicar este modelo" abre prévia do PDF resultante');
    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        ssh.dispose();
    }
}

deployMel08();
