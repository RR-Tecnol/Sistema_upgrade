import { NodeSSH } from 'node-ssh';
import * as path from 'path';

const ssh = new NodeSSH();

async function fixCertificates() {
    console.log('⏳ Conectando na VPS para recriar templates de certificado...');
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });

        const projectPath = '/opt/sistemaupgrade/backend';

        console.log('\n📝 Enviando script para a VPS...');
        await ssh.putFile(path.join(process.cwd(), 'raw-prisma-seed.js'), projectPath + '/raw-prisma-seed.js');

        console.log('\n🚀 Copiando script para dentro do container e executando...');
        await ssh.execCommand('docker cp /opt/sistemaupgrade/backend/raw-prisma-seed.js upgrade-backend:/app/raw-prisma-seed.js');
        const run = await ssh.execCommand('docker exec -i upgrade-backend node /app/raw-prisma-seed.js');
        console.log('STDOUT:', run.stdout);
        console.log('STDERR:', run.stderr);

        console.log('\n✅ Modelos de certificado recriados com sucesso!');
    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        ssh.dispose();
    }
}

fixCertificates();
