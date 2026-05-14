const http = require('http');
function req(method, path, body, tok) {
    return new Promise((res, rej) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: 'localhost', port: 3001, path, method,
            headers: {
                'Content-Type': 'application/json',
                ...(tok && { Authorization: 'Bearer ' + tok }),
                ...(data && { 'Content-Length': Buffer.byteLength(data) }),
            },
        };
        const r = http.request(opts, resp => {
            let d = '';
            resp.on('data', c => d += c);
            resp.on('end', () => { try { res({ status: resp.statusCode, body: JSON.parse(d) }); } catch { res({ status: resp.statusCode, body: d }); } });
        });
        r.on('error', rej);
        if (data) r.write(data);
        r.end();
    });
}
async function main() {
    const loginD = await req('POST', '/api/auth/login', { email: 'joao.driver.test99@qualifica.com', password: 'RR@@Upgrade' });
    const tok = loginD.body.access_token;
    console.log('Driver login:', loginD.status === 200 ? 'OK' : 'FAIL');

    // GET /driver/me/performance — endpoint do F2.6/F3.5
    const perf = await req('GET', '/api/driver/me/performance', null, tok);
    console.log('\nGET /driver/me/performance:', perf.status);
    console.log('currentTrip:', perf.body.currentTrip);
    console.log('ranking.semana:', perf.body.ranking?.semana);
    console.log('ranking.mes:', perf.body.ranking?.mes);

    // POST /driver/location — simula polling F3.1
    const loc = await req('POST', '/api/driver/location', {
        latitude: -2.5297, longitude: -44.3028,
        speed: 68.5, heading: 180, accuracy: 12,
        capturedAt: new Date().toISOString(), source: 'polling'
    }, tok);
    console.log('\nPOST /driver/location (polling):', loc.status, loc.body);

    // POST batch — simula flush offline queue F3.1
    const batch = await req('POST', '/api/driver/location/batch', {
        locations: [
            { latitude: -2.535, longitude: -44.310, speed: 72, heading: 182, capturedAt: new Date(Date.now() - 360000).toISOString(), source: 'batch' },
            { latitude: -2.540, longitude: -44.315, speed: 69, heading: 181, capturedAt: new Date(Date.now() - 180000).toISOString(), source: 'batch' },
        ]
    }, tok);
    console.log('POST /driver/location/batch:', batch.status, batch.body);
}
main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
