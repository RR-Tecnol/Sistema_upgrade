-- CreateEnum
CREATE TYPE "AcaoStatus" AS ENUM ('PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "AcaoCustoTipo" AS ENUM ('ABASTECIMENTO', 'DESPESA_GERAL', 'DIARIA_FUNCIONARIO');

-- CreateTable
CREATE TABLE "acoes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cidadeId" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "carretaId" TEXT,
    "status" "AcaoStatus" NOT NULL DEFAULT 'PLANEJADA',
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "localExecucao" TEXT,
    "distanciaKm" DECIMAL(10,2),
    "precoCombustivelL" DECIMAL(10,2),
    "autonomiaKmL" DECIMAL(10,2),
    "observacoes" TEXT,
    "permitirInscricoes" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acao_turmas" (
    "id" TEXT NOT NULL,
    "acaoId" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acao_turmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acao_custos" (
    "id" TEXT NOT NULL,
    "acaoId" TEXT NOT NULL,
    "tipo" "AcaoCustoTipo" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "litros" DECIMAL(10,2),
    "funcionarioId" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acao_custos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acao_equipe" (
    "id" TEXT NOT NULL,
    "acaoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "diaria" DECIMAL(10,2) NOT NULL,
    "diasTrabalhados" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acao_equipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "acoes_cidadeId_idx" ON "acoes"("cidadeId");

-- CreateIndex
CREATE INDEX "acoes_grupoId_idx" ON "acoes"("grupoId");

-- CreateIndex
CREATE INDEX "acoes_carretaId_idx" ON "acoes"("carretaId");

-- CreateIndex
CREATE INDEX "acoes_status_idx" ON "acoes"("status");

-- CreateIndex
CREATE INDEX "acoes_dataInicio_idx" ON "acoes"("dataInicio");

-- CreateIndex
CREATE INDEX "acao_turmas_acaoId_idx" ON "acao_turmas"("acaoId");

-- CreateIndex
CREATE INDEX "acao_turmas_turmaId_idx" ON "acao_turmas"("turmaId");

-- CreateIndex
CREATE UNIQUE INDEX "acao_turmas_acaoId_turmaId_key" ON "acao_turmas"("acaoId", "turmaId");

-- CreateIndex
CREATE INDEX "acao_custos_acaoId_idx" ON "acao_custos"("acaoId");

-- CreateIndex
CREATE INDEX "acao_custos_tipo_idx" ON "acao_custos"("tipo");

-- CreateIndex
CREATE INDEX "acao_equipe_acaoId_idx" ON "acao_equipe"("acaoId");

-- CreateIndex
CREATE INDEX "acao_equipe_userId_idx" ON "acao_equipe"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "acao_equipe_acaoId_userId_key" ON "acao_equipe"("acaoId", "userId");

-- AddForeignKey
ALTER TABLE "acoes" ADD CONSTRAINT "acoes_cidadeId_fkey" FOREIGN KEY ("cidadeId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acoes" ADD CONSTRAINT "acoes_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acoes" ADD CONSTRAINT "acoes_carretaId_fkey" FOREIGN KEY ("carretaId") REFERENCES "trucks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acao_turmas" ADD CONSTRAINT "acao_turmas_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES "acoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acao_turmas" ADD CONSTRAINT "acao_turmas_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acao_custos" ADD CONSTRAINT "acao_custos_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES "acoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acao_custos" ADD CONSTRAINT "acao_custos_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acao_equipe" ADD CONSTRAINT "acao_equipe_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES "acoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acao_equipe" ADD CONSTRAINT "acao_equipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
