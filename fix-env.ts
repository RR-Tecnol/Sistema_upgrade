import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function fixEnv() {
    console.log('⏳ Conectando na VPS para consertar o .env...');
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });

        const projectPath = '/opt/sistemaupgrade';

        console.log('\n🔎 Lendo o .env.production do backend...');
        const readEnv = await ssh.execCommand('cat backend/.env.production', { cwd: projectPath });
        console.log('Conteúdo atual do .env.production (resumo):', readEnv.stdout.substring(0, 200) + '...');

        console.log('\n🔑 Injetando credenciais Z-API no .env.production da VPS...');
        
        // Remove existing ones if any
        await ssh.execCommand("sed -i '/ZAPI_INSTANCE_ID/d' backend/.env.production", { cwd: projectPath });
        await ssh.execCommand("sed -i '/ZAPI_TOKEN/d' backend/.env.production", { cwd: projectPath });
        await ssh.execCommand("sed -i '/ZAPI_CLIENT_TOKEN/d' backend/.env.production", { cwd: projectPath });

        // Add new ones
        const envVars = `
ZAPI_INSTANCE_ID=3F34EC8DCDEAE292EC5B36ADC5527576
ZAPI_TOKEN=746D83D3FAC44845CE79AA31
ZAPI_CLIENT_TOKEN=F1100461430db46bd8420bb66b18cf7e9S
`;
        await ssh.execCommand(`echo "${envVars}" >> backend/.env.production`, { cwd: projectPath });
        console.log('✅ Credenciais inseridas!');

        console.log('\n🚀 Reiniciando o container do backend...');
        const restart = await ssh.execCommand('docker restart upgrade-backend');
        console.log(restart.stdout);
        if (restart.stderr) console.log(restart.stderr);

        console.log('\n✅ Correção finalizada! O painel deve reconhecer a Z-API agora.');
    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        ssh.dispose();
    }
}

fixEnv();
