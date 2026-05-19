import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function findProjectPath() {
    console.log('⏳ Conectando na VPS...');
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });
        
        console.log('🔎 Verificando metadados do container para achar working dir...');
        const inspect = await ssh.execCommand('docker inspect upgrade-backend --format="{{json .Config.WorkingDir}}"');
        console.log('WorkingDir:', inspect.stdout);
        
        const labels = await ssh.execCommand('docker inspect upgrade-backend --format="{{json .Config.Labels}}"');
        console.log('Labels:', labels.stdout);

        console.log('\n🔎 Listando todos os arquivos docker-compose.yml...');
        const findCompose = await ssh.execCommand('find / -name "docker-compose.yml" 2>/dev/null');
        console.log('Arquivos docker-compose.yml encontrados:\n' + findCompose.stdout);

    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        ssh.dispose();
    }
}

findProjectPath();
