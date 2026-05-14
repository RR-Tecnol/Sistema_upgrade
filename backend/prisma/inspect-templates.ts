import { PrismaClient } from '@prisma/client';
import process from 'process';

const prisma = new PrismaClient();

async function main() {
  const versions = await prisma.certificateTemplateVersion.findMany({
    select: { id: true, title: true, pdfTextOverrides: true, coordinateOverrides: true },
  });

  console.log(`\nTotal versões: ${versions.length}\n`);
  for (const v of versions) {
    const po = v.pdfTextOverrides as Record<string, unknown> | null;
    console.log(`─── ${v.title} (${v.id})`);
    console.log(`    drawHeader: ${po?.drawHeaderNameAndDetails}`);
    console.log(`    paragraph:  ${String(po?.paragraphTemplate ?? '').substring(0, 60)}`);
    console.log(`    date:       ${po?.dateTemplate}`);
    console.log('');
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
