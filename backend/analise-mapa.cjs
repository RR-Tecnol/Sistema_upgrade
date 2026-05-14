const http = require('http');

function req(m, p, b, t) {
    return new Promise((res, rej) => {
        const d = b ? JSON.stringify(b) : null;
        const o = {
            hostname: 'localhost', port: 3001, path: p, method: m,
            headers: {
                'Content-Type': 'application/json',
                ...(t && { Authorization: 'Bearer ' + t }),
                ...(d && { 'Content-Length': Buffer.byteLength(d) }),
            }
        };
        const r = http.request(o, resp => {
            let s = '';
            resp.on('data', c => s += c);
            resp.on('end', () => {
                try { res({ s: resp.statusCode, b: JSON.parse(s) }); }
                catch { res({ s: resp.statusCode, b: s }); }
            });
        });
        r.on('error', rej);
        if (d) r.write(d);
        r.end();
    });
}

async function main() {
    const L = await req('POST', '/api/auth/login', { email: 'admin@qualifica.com', password: 'RR@@Upgrade' });
    const tok = L.b.access_token;
    console.log('Login OK');

    const A = await req('GET', '/api/driver/location/active', null, tok);
    console.log('STATUS:', A.s);
    const drivers = A.b.drivers || [];
    console.log('TOTAL DRIVERS:', drivers.length);
    
    drivers.forEach((d, i) => {
        console.log('\n=== DRIVER', i, '===');
        console.log('userId:', d.userId);
        console.log('name:', d.name);
        console.log('status:', d.status);
        console.log('progress:', d.progress);
        console.log('trip.origin:', d.trip?.origin);
        console.log('trip.destination:', d.trip?.destination);
        console.log('trip.originLat:', d.trip?.originLat);
        console.log('trip.originLng:', d.trip?.originLng);
        console.log('trip.destinationLat:', d.trip?.destinationLat);
        console.log('trip.destinationLng:', d.trip?.destinationLng);
        console.log('lastLocation:', JSON.stringify(d.lastLocation));
        console.log('eta:', JSON.stringify(d.eta));
    });
}

main().catch(e => console.error('ERR:', e.message));
