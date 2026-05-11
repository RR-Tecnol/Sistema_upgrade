
const fs = require('fs');
let content = fs.readFileSync('frontend/app/admin/certificados/page.tsx', 'utf-8');

const replacements = [
    { from: '? Elegíveis para Certificação', to: '🎓 Elegíveis para Certificação' },
    { from: '?? Certificados Emitidos', to: '✅ Certificados Emitidos' },
    { from: '?? Modelos de Documento', to: '🎨 Modelos de Documento' },
    { from: '? Ativar Moldes Mestres (MA + PI)', to: '🛠️ Ativar Moldes Mestres (MA + PI)' },
    { from: '?? Avançado (DEV)', to: '⚙️ Avançado (DEV)' },
    { from: '>???? MA</button>', to: '>🌴 MA</button>' },
    { from: '>???? PI</button>', to: '>☀️ PI</button>' },
    { from: '>?? Ver PDF Final</button>', to: '>📄 Ver PDF Final</button>' },
    { from: '>?? PDF FINAL — GERADO PELO BACKEND', to: '>🖨️ PDF FINAL — GERADO PELO BACKEND' },
    { from: '>?? Testar modelo</button>', to: '>🛠️ Testar modelo</button>' },
    { from: '>? Sincronizar modelo', to: '>🔄 Sincronizar modelo' },
    { from: '>? PDF', to: '>📄 PDF' },
    { from: '>?? Ver QR', to: '>🔍 Ver QR' },
    { from: '>?</button>', to: '>✕</button>' },
    { from: '>??</div>', to: '>🏆</div>' },
    { from: '<span style={{ animation: \'spin 1s linear infinite\', display: \'inline-block\' }}>?</span>', to: '<span style={{ animation: \'spin 1s linear infinite\', display: \'inline-block\' }}>⏳</span>' }
];

replacements.forEach(r => {
    content = content.split(r.from).join(r.to);
});

fs.writeFileSync('frontend/app/admin/certificados/page.tsx', content, 'utf-8');

