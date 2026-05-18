const fs = require('fs');

// 1. Remove VerbaPanel from page.tsx
let file = 'frontend/app/admin/estoque/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/import VerbaPanel.*?\n/g, '');
content = content.replace(/<TabsContent value=\"verbas\">[\s\S]*?<\/TabsContent>/g, '');
content = content.replace(/<TabsTrigger value=\"verbas\"[^>]*>.*?<\/TabsTrigger>/g, '');
fs.writeFileSync(file, content);

// 2. Add getGlobalStockQuantity to stock.ts
file = 'frontend/lib/api/stock.ts';
content = fs.readFileSync(file, 'utf8');
const toAppend = `
export function getGlobalStockQuantity(item: any): number {
    const central = Number(item.quantidadeAtual || 0);
    const carretas = (item.truckStocks || []).reduce((acc: any, ts: any) => acc + Number(ts.quantidadeAtual || 0), 0);
    return central + carretas;
}
`;
if (!content.includes('export function getGlobalStockQuantity')) {
    content += toAppend;
    fs.writeFileSync(file, content);
}

// 3. Fix EstoqueCaminhaoModal TS errors
file = 'frontend/components/estoque/EstoqueCaminhaoModal.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/res\.quantidadeMinima/g, '(res as any).quantidadeMinima');
fs.writeFileSync(file, content);

console.log('Fixed everything');
