-- CreateTable
CREATE TABLE "acao_funcionarios" (
    "id" TEXT NOT NULL,
    "acaoId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "valorDiaria" DECIMAL(10,2) NOT NULL,
    "diasTrabalhados" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acao_funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "acao_funcionarios_acaoId_idx" ON "acao_funcionarios"("acaoId");

-- CreateIndex
CREATE INDEX "acao_funcionarios_employeeId_idx" ON "acao_funcionarios"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "acao_funcionarios_acaoId_employeeId_key" ON "acao_funcionarios"("acaoId", "employeeId");

-- AddForeignKey
ALTER TABLE "acao_funcionarios" ADD CONSTRAINT "acao_funcionarios_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES "acoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acao_funcionarios" ADD CONSTRAINT "acao_funcionarios_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
