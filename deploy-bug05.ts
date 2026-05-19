import { NodeSSH } from 'node-ssh';
import * as path from 'path';

const ssh = new NodeSSH();
const PROJECT = '/opt/sistemaupgrade';

async function deployBug05() {
    console.log('🚀 BUG-05 — Enviando correção de diárias para VPS...\n');
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });

        // 1. Enviar utilitário
        console.log('📤 1/3 — Enviando arquivos corrigidos...');
        await ssh.putFile(
            path.join(process.cwd(), 'backend/src/common/calcular-dias-efetivos.util.ts'),
            `${PROJECT}/backend/src/common/calcular-dias-efetivos.util.ts`
        );
        console.log('   ✅ calcular-dias-efetivos.util.ts');

        await ssh.putFile(
            path.join(process.cwd(), 'backend/src/acoes/acoes.service.ts'),
            `${PROJECT}/backend/src/acoes/acoes.service.ts`
        );
        console.log('   ✅ acoes.service.ts');

        // 2. Rebuild do backend
        console.log('\n🔨 2/3 — Rebuild backend...');
        const rebuild = await ssh.execCommand(
            'docker compose -f docker-compose.prod.yml up -d --build --no-deps backend 2>&1 | tail -25',
            { cwd: PROJECT }
        );
        console.log(rebuild.stdout || rebuild.stderr);

        // 3. Verificar se o container subiu saudável
        console.log('\n🔍 3/3 — Verificando status do backend...');
        await new Promise(r => setTimeout(r, 5000));
        const status = await ssh.execCommand('docker ps --filter "name=upgrade-backend" --format "{{.Names}} {{.Status}}"');
        console.log(status.stdout);

        // Testar API
        const health = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/acoes 2>/dev/null || echo "N/A"');
        console.log(`   API health: HTTP ${health.stdout}`);

        console.log('\n✅ BUG-05 aplicado!');
        console.log('   - Diárias agora calculadas por dias úteis (seg-sex)');
        console.log('   - Respeita ClassWeekendPolicy da turma vinculada');
        console.log('   - Feriados da turma excluídos do cálculo');
        console.log('   - Log para auditoria: "BUG-05: dias calculados para..."');

    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        ssh.dispose();
    }
}

deployBug05();
