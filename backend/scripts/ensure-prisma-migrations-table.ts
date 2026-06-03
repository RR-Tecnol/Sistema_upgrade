/**
 * Cria a tabela _prisma_migrations quando o banco foi restaurado sem histórico Prisma.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
        ) AS exists
    `;
    if (rows[0]?.exists) {
        console.log('_prisma_migrations já existe');
        return;
    }
    await prisma.$executeRawUnsafe(`
        CREATE TABLE "_prisma_migrations" (
            "id"                    VARCHAR(36) PRIMARY KEY NOT NULL,
            "checksum"              VARCHAR(64) NOT NULL,
            "finished_at"           TIMESTAMPTZ,
            "migration_name"        VARCHAR(255) NOT NULL,
            "logs"                  TEXT,
            "rolled_back_at"        TIMESTAMPTZ,
            "started_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
            "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
        );
    `);
    console.log('_prisma_migrations criada');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
