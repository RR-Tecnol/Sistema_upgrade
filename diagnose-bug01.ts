import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function fixBug01() {
    console.log('⏳ Conectando na VPS — BUG-01: Storage 502...');
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });

        // 1. Verificar status dos containers
        console.log('\n📊 1/6 — Verificando containers Docker...');
        const containers = await ssh.execCommand('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"');
        console.log(containers.stdout);

        // 2. Verificar se MinIO está acessível na porta 9000 internamente e que porta está exposta no host
        console.log('\n🔍 2/6 — Verificando porta do MinIO no host...');
        const ports = await ssh.execCommand('docker inspect upgrade-minio --format "{{json .NetworkSettings.Ports}}"');
        console.log('Portas MinIO expostas:', ports.stdout);

        // 3. Testar acesso direto ao MinIO nas portas 9000 e 9010
        console.log('\n🧪 3/6 — Testando acesso direto ao MinIO...');
        const test9000 = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9000/minio/health/live');
        const test9010 = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9010/minio/health/live');
        console.log(`  porta 9000: HTTP ${test9000.stdout}`);
        console.log(`  porta 9010: HTTP ${test9010.stdout}`);

        // 4. Ver configuração atual do nginx para /storage
        console.log('\n📄 4/6 — Configuração atual do nginx /storage...');
        const nginxCurrent = await ssh.execCommand('cat /etc/nginx/sites-enabled/sistemaupgrade 2>/dev/null || cat /etc/nginx/sites-enabled/default 2>/dev/null | grep -A5 "storage"');
        console.log(nginxCurrent.stdout || nginxCurrent.stderr);

        // 5. Verificar credenciais MinIO no .env da VPS
        console.log('\n🔑 5/6 — Verificando credenciais MinIO no .env...');
        const envCheck = await ssh.execCommand('cat /opt/sistemaupgrade/backend/.env | grep MINIO');
        console.log(envCheck.stdout);

        // 6. Ver bucket public-uploads e sua policy
        console.log('\n🪣 6/6 — Verificando bucket public-uploads...');
        const bucketCheck = await ssh.execCommand('docker exec upgrade-minio mc ls local/public-uploads 2>/dev/null || echo "mc não instalado ou bucket não existe"');
        console.log(bucketCheck.stdout || bucketCheck.stderr);

    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        ssh.dispose();
    }
}

fixBug01();
