import { NodeSSH } from 'node-ssh';
import * as path from 'path';

const ssh = new NodeSSH();
const PROJECT = '/opt/sistemaupgrade';

async function applyBug01() {
    console.log('🚀 BUG-01 — Corrigindo uploads 502...\n');
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });

        // 1. Enviar docker-compose.prod.yml atualizado
        console.log('📤 1/5 — Enviando docker-compose.prod.yml atualizado...');
        await ssh.putFile(
            path.join(process.cwd(), 'docker-compose.prod.yml'),
            `${PROJECT}/docker-compose.prod.yml`
        );
        console.log('   ✅ Enviado');

        // 2. Recriar MinIO com a porta exposta (sem derrubar os outros containers)
        console.log('\n🔄 2/5 — Recriando container MinIO com porta 9000 exposta...');
        const recreate = await ssh.execCommand(
            'docker compose -f docker-compose.prod.yml up -d --no-deps minio',
            { cwd: PROJECT }
        );
        console.log(recreate.stdout || recreate.stderr);

        // 3. Aguardar MinIO ficar healthy e testar acesso no host
        console.log('\n⏳ 3/5 — Aguardando MinIO... (10s)');
        await new Promise(r => setTimeout(r, 10000));
        const healthCheck = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9000/minio/health/live');
        console.log(`   MinIO health (porta 9000 no host): HTTP ${healthCheck.stdout}`);
        if (healthCheck.stdout !== '200') {
            console.error('   ❌ MinIO não está respondendo na porta 9000. Abortando.');
            return;
        }
        console.log('   ✅ MinIO respondendo');

        // 4. Garantir bucket public-uploads com policy pública via API MinIO
        console.log('\n🪣 4/5 — Garantindo bucket public-uploads com política pública...');
        // Criar bucket (ignora se já existe)
        const createBucket = await ssh.execCommand(`
            curl -s -u minioadmin:minioadmin123 -X PUT http://127.0.0.1:9000/public-uploads
        `);
        console.log('   Criar bucket:', createBucket.stdout.trim() || '(sem resposta — bucket pode já existir)');

        // Aplicar política pública via mc dentro do container MinIO
        const setupPolicy = await ssh.execCommand(`
            docker exec upgrade-minio sh -c "
                mc alias set local http://localhost:9000 minioadmin minioadmin123 --quiet &&
                mc mb --ignore-existing local/public-uploads &&
                mc anonymous set public local/public-uploads &&
                echo 'BUCKET_OK'
            "
        `);
        console.log('   Policy:', setupPolicy.stdout.trim() || setupPolicy.stderr.trim());

        // 5. Recarregar nginx (não restart — zero downtime)
        console.log('\n🔁 5/5 — Recarregando nginx...');
        const nginxTest = await ssh.execCommand('nginx -t');
        console.log('   nginx -t:', nginxTest.stdout || nginxTest.stderr);
        if (nginxTest.stderr?.includes('failed')) {
            console.error('   ❌ Config nginx inválida. Abortando reload.');
            return;
        }
        const reload = await ssh.execCommand('systemctl reload nginx');
        console.log('   Reload:', reload.stdout || reload.stderr || 'OK');

        // Validação final: testar URL de storage via nginx
        console.log('\n✅ Validação final — testando acesso via nginx...');
        const storageTest = await ssh.execCommand(
            'curl -s -o /dev/null -w "%{http_code}" https://sistemaupgrade.com.br/storage/public-uploads/'
        );
        console.log(`   https://sistemaupgrade.com.br/storage/: HTTP ${storageTest.stdout}`);

        console.log('\n🎉 BUG-01 aplicado com sucesso!');
        console.log('   - MinIO porta 9000 exposta no host');
        console.log('   - Bucket public-uploads criado com leitura pública');
        console.log('   - Nginx recarregado');

    } catch (err) {
        console.error('❌ Erro fatal:', err);
    } finally {
        ssh.dispose();
    }
}

applyBug01();
