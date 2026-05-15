/**
 * fix-utf8-notifications.ts — v3 (final, seguro)
 *
 * Um texto double-encoded UTF-8→Latin-1 sempre contém caracteres
 * no range U+0080–U+009F (C1 controls). Texto português real NUNCA
 * contém esses caracteres. Usamos isso como detector seguro.
 *
 * Exemplos de strings que TÊM C1 controls (double-encoded):
 *   "Turma ativa â\u0080\u0094 lembre-se" → "Turma ativa — lembre-se"
 *   "RevisÃ£o agendada"                  → "Revisão agendada"
 *
 * Strings sem C1 controls (já corretas) NÃO são modificadas.
 *
 * Roda com: npx tsx prisma/fix-utf8-notifications.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Retorna true se a string contém C1 controls (U+0080–U+009F) */
function hasDoubleEncoding(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code >= 0x80 && code <= 0x9F) return true;
    }
    return false;
}

function fixDoubleEncoded(text: string | null): string | null {
    if (!text || !hasDoubleEncoding(text)) return text;
    try {
        const decoded = Buffer.from(text, 'latin1').toString('utf8');
        // Só aceita se não gerou replacement chars
        if (!decoded.includes('\uFFFD')) return decoded;
    } catch { /* noop */ }
    return text;
}

async function main() {
    console.log('🔧 Corrigindo UTF-8 double-encoded nas notificações...\n');

    const all = await prisma.notification.findMany({
        select: { id: true, title: true, message: true },
    });

    let fixed = 0;
    for (const notif of all) {
        const newTitle   = fixDoubleEncoded(notif.title);
        const newMessage = fixDoubleEncoded(notif.message);

        if (newTitle !== notif.title || newMessage !== notif.message) {
            await prisma.notification.update({
                where: { id: notif.id },
                data: {
                    title:   newTitle   ?? notif.title,
                    message: newMessage ?? notif.message,
                },
            });
            fixed++;
            if (newTitle !== notif.title) {
                console.log(`  ✓ TITLE  [${notif.id.slice(0, 8)}]: "${notif.title}" → "${newTitle}"`);
            }
            if (newMessage !== notif.message) {
                console.log(`  ✓ MSG    [${notif.id.slice(0, 8)}]: "${(notif.message ?? '').slice(0, 80)}" → "${(newMessage ?? '').slice(0, 80)}"`);
            }
        }
    }

    if (fixed === 0) {
        console.log('  ℹ️  Nenhum texto double-encoded encontrado. Banco já está correto.');
    }
    console.log(`\n✅ ${fixed} de ${all.length} notificações corrigidas.`);
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
