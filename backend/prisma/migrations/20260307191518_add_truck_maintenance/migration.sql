-- CreateTable
CREATE TABLE "truck_maintenances" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'agendada',
    "prioridade" TEXT NOT NULL DEFAULT 'media',
    "kmAtual" INTEGER,
    "kmProximo" INTEGER,
    "dataAgendada" TIMESTAMP(3),
    "dataConclusao" TIMESTAMP(3),
    "custoEstimado" DECIMAL(10,2),
    "custoReal" DECIMAL(10,2),
    "statusPagamento" TEXT DEFAULT 'pendente',
    "fornecedor" TEXT,
    "responsavel" TEXT,
    "observacoes" TEXT,
    "contaPagarId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "truck_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "truck_maintenances_truckId_idx" ON "truck_maintenances"("truckId");

-- CreateIndex
CREATE INDEX "truck_maintenances_status_idx" ON "truck_maintenances"("status");

-- CreateIndex
CREATE INDEX "truck_maintenances_tipo_idx" ON "truck_maintenances"("tipo");

-- AddForeignKey
ALTER TABLE "truck_maintenances" ADD CONSTRAINT "truck_maintenances_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
