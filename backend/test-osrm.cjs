const https = require('https');

function testUrl(url) {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({ ok: false, error: 'TIMEOUT 8s' }), 8000);
        const req = https.get(url, (res) => {
            clearTimeout(timeout);
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ ok: true, status: res.statusCode, code: json.code, routes: json.routes?.length, matchings: json.matchings?.length });
                } catch {
                    resolve({ ok: true, status: res.statusCode, rawLength: body.length });
                }
            });
        });
        req.on('error', (e) => {
            clearTimeout(timeout);
            resolve({ ok: false, error: e.message, code: e.code });
        });
    });
}

async function main() {
    console.log('Testando OSRM Route (São Luís → Caxias)...');
    const r1 = await testUrl(
        'https://router.project-osrm.org/route/v1/driving/-44.3028,-2.5297;-43.3564,-4.8692?overview=full&geometries=geojson'
    );
    console.log('OSRM Route:', JSON.stringify(r1));

    console.log('\nTestando OSRM Route alternativo (demo.project-osrm)...');
    const r2 = await testUrl(
        'https://demo.project-osrm.org/route/v1/driving/-44.3028,-2.5297;-43.3564,-4.8692?overview=full&geometries=geojson'
    );
    console.log('OSRM demo:', JSON.stringify(r2));

    console.log('\nTestando OpenRouteService (sem key, endpoint público)...');
    const r3 = await testUrl(
        'https://api.openrouteservice.org/v2/directions/driving-car?api_key=test&start=-44.3028,-2.5297&end=-43.3564,-4.8692'
    );
    console.log('ORS:', JSON.stringify(r3));
    
    console.log('\nTestando VALHALLA (público)...');
    const r4 = await testUrl(
        'https://valhalla1.openstreetmap.de/route?json={"locations":[{"lon":-44.3028,"lat":-2.5297},{"lon":-43.3564,"lat":-4.8692}],"costing":"auto"}'
    );
    console.log('Valhalla:', JSON.stringify(r4));
}

main();
