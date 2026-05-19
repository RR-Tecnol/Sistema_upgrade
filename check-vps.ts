import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkVPS() {
    try {
        await ssh.connect({
            host: '2.24.99.172',
            username: 'root',
            password: '@Jl2307201201',
            readyTimeout: 20000,
        });

        const run1 = await ssh.execCommand('curl -I http://localhost:3001/api/certificates/template/model');
        console.log('cURL header:', run1.stdout, run1.stderr);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
}
checkVPS();
