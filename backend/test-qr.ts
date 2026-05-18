import axios from 'axios';

async function testQr() {
    try {
        const url = 'https://api.z-api.io/instances/3F34EC8DCDEAE292EC5B36ADC5527576/token/746D83D3FAC44845CE79AA31/qr-code/image';
        const headers = { 'Client-Token': 'F1100461430db46bd8420bb66b18cf7e9S' };
        
        console.log('Fetching without arraybuffer...');
        const res = await axios.get(url, { headers });
        console.log('Status:', res.status);
        console.log('Content-Type:', res.headers['content-type']);
        console.log('Data (first 200 chars):', typeof res.data === 'string' ? res.data.substring(0, 200) : res.data);
    } catch (e: any) {
        console.error('Erro:', e.message);
    }
}

testQr();
