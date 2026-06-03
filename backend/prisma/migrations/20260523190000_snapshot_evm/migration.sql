CREATE TABLE "snapshots_evm" (
    "id"               TEXT NOT NULL,
    "ordemId"          TEXT NOT NULL,
    "data"             TIMESTAMP(3) NOT NULL,
    "pv"               DECIMAL(12,2) NOT NULL,
    "ev"               DECIMAL(12,2) NOT NULL,
    "ac"               DECIMAL(12,2) NOT NULL,
    "cpi"              DECIMAL(6,4) NOT NULL,
    "spi"              DECIMAL(6,4) NOT NULL,
    "eac"              DECIMAL(12,2) NOT NULL,
    "etc"              DECIMAL(12,2) NOT NULL,
    "vac"              DECIMAL(12,2) NOT NULL,
    "tcpi"             DECIMAL(6,4) NOT NULL,
    "percentualFisico" INTEGER NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "snapshots_evm_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "snapshots_evm_ordemId_data_key" ON "snapshots_evm"("ordemId","data");
CREATE INDEX "snapshots_evm_ordemId_idx" ON "snapshots_evm"("ordemId");
ALTER TABLE "snapshots_evm" ADD CONSTRAINT "snapshots_evm_ordemId_fkey"
    FOREIGN KEY ("ordemId") REFERENCES "ordens_fabricacao"("id") ON DELETE CASCADE;
