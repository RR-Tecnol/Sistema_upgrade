import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Sincronizando status de Turmas vinculadas a Ações EM_ANDAMENTO...');
  
  const acoesEmAndamento = await prisma.acao.findMany({
    where: { status: 'EM_ANDAMENTO' },
    include: {
      turmas: {
        include: {
          turma: true
        }
      }
    }
  });

  let count = 0;

  for (const acao of acoesEmAndamento) {
    for (const acaoTurma of acao.turmas) {
      if (acaoTurma.turma.status === 'PLANNED') {
        await prisma.class.update({
          where: { id: acaoTurma.turmaId },
          data: { status: 'IN_PROGRESS' }
        });
        console.log(`✅ Turma ${acaoTurma.turma.classIdentifier} atualizada para IN_PROGRESS (vinculada à Ação ${acao.id})`);
        count++;
      }
    }
  }

  console.log(`\n🎉 Concluído! ${count} turmas atualizadas para IN_PROGRESS.`);
}

main().catch(e => {
  console.error('Erro:', e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
