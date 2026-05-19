import { NodeSSH } from 'node-ssh';
import * as path from 'path';

const ssh = new NodeSSH();

async function fixDocker() {
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });

        const projectPath = '/opt/sistemaupgrade';

        console.log('\n📝 Enviando docker-compose.prod.yml para a VPS...');
        await ssh.putFile(path.join(process.cwd(), 'docker-compose.prod.yml'), projectPath + '/docker-compose.prod.yml');

        console.log('\n🚀 Recriando container do backend com os novos volumes...');
        const run1 = await ssh.execCommand('docker compose -f docker-compose.prod.yml up -d backend', { cwd: projectPath });
        console.log(run1.stdout, run1.stderr);

        console.log('\n✅ Container atualizado!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
}
fixDocker();
