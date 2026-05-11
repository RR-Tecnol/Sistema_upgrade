const https = require('https');
const url = 'https://router.project-osrm.org/route/v1/driving/-44.3028,-2.5297;-44.2090,-2.5340;-44.0850,-2.5500;-43.9200,-2.7500;-43.7400,-3.3500;-43.5500,-4.0000;-43.2100,-5.0900?overview=full&geometries=geojson';
https.get(url, (r) => {
    let d = '';
    r.on('data', c => { d += c; });
    r.on('end', () => {
        try {
            const j = JSON.parse(d);
            if (j.routes && j.routes[0]) {
                const coords = j.routes[0].geometry.coordinates;
                // Subamostra a cada 15 pontos para ficar manejável
                const sampled = coords.filter((_, i) => i % 15 === 0 || i === coords.length - 1);
                console.log('TOTAL:', coords.length, 'SAMPLED:', sampled.length);
                // Converte [lon, lat] -> [lat, lon] para Leaflet
                const leaflet = sampled.map(([lon, lat]) => [lat, lon]);
                console.log(JSON.stringify(leaflet));
            } else {
                console.log('ERR:', d.substring(0, 300));
            }
        } catch (e) {
            console.log('PARSE_ERR:', e.message, d.substring(0, 200));
        }
    });
}).on('error', e => console.log('NET_ERR:', e.message));
