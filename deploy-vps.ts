import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function deploy() {
    console.log('⏳ Conectando na VPS...');
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });
        console.log('✅ Conectado na VPS com sucesso!');

        const projectPath = '/opt/sistemaupgrade';
        const composeFile = 'docker-compose.prod.yml';

        // 3. Executar script de limpeza usando o container do backend ao invés do npx do root
        console.log('\n🧹 Iniciando limpeza do banco de dados de dentro do container...');
        const cleanDb = await ssh.execCommand('docker exec -i upgrade-backend npx tsx prisma/clean-prod-keep-admins.ts << EOF\nCONFIRMAR\nEOF\n');
        console.log(cleanDb.stdout);
        if (cleanDb.stderr && !cleanDb.stderr.includes('warn') && !cleanDb.stderr.includes('npm')) {
             console.log('Avisos/Erros:', cleanDb.stderr);
        }

        // 4. Reiniciar Docker usando o binário correto
        console.log('\n🚀 Reconstruindo e reiniciando a plataforma via Docker...');
        const docker = await ssh.execCommand(`docker compose -f ${composeFile} down && docker compose -f ${composeFile} up -d --build`, { cwd: projectPath });
        console.log(docker.stdout);
        if (docker.stderr) console.log('Docker logs:', docker.stderr);

        console.log('\n✅ DEPLOY FINALIZADO COM SUCESSO! A plataforma está pronta para o lançamento.');
    } catch (err) {
        console.error('❌ Erro crítico no deploy:', err);
    } finally {
        ssh.dispose();
    }
}

deploy();
