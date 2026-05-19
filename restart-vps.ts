import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function restartVps() {
    console.log('⏳ Conectando na VPS...');
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });

        const projectPath = '/opt/sistemaupgrade';

        console.log('\n🔎 Verificando se o env.production está com as vars certas...');
        const checkEnv = await ssh.execCommand('grep ZAPI backend/.env.production', { cwd: projectPath });
        console.log(checkEnv.stdout);

        console.log('\n🚀 Recriando o container do backend para carregar o novo .env...');
        const recreate = await ssh.execCommand('docker compose -f docker-compose.prod.yml up -d', { cwd: projectPath });
        console.log(recreate.stdout);
        if (recreate.stderr) console.log(recreate.stderr);

        console.log('\n✅ Concluído. O painel deve reconhecer a Z-API agora.');
    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        ssh.dispose();
    }
}

restartVps();
