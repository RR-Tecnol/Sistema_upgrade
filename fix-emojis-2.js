
const fs = require('fs');
let content = fs.readFileSync('frontend/app/admin/certificados/page.tsx', 'utf-8');

const replacements = [
    { from: '?? Ver/Baixar Modelo Atual', to: '📄 Ver/Baixar Modelo Atual' },
    { from: '?? {certificates.length} emitido', to: '✅ {certificates.length} emitido' },
    { from: '? {eligible.length} elegível', to: '🎓 {eligible.length} elegível' },
    { from: '<div style={{ fontSize: \'2rem\', marginBottom: \'0.5rem\' }}>???</div>', to: '<div style={{ fontSize: \'2rem\', marginBottom: \'0.5rem\' }}>🖼️</div>' },
    { from: '>\\n                                        ???\\n                                    </button>', to: '>\\n                                        🗑️\\n                                    </button>' }
];

replacements.forEach(r => {
    content = content.split(r.from).join(r.to);
});

// Since the newline replacement might be tricky, let's also do a fallback for the delete button
content = content.replace(/>\s*\?\?\?\s*<\/button>/g, '>🗑️</button>');

fs.writeFileSync('frontend/app/admin/certificados/page.tsx', content, 'utf-8');

