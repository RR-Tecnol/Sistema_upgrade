CREATE TABLE "carreta_vinculos" (
    "id"          TEXT NOT NULL,
    "cavalinhoId" TEXT NOT NULL,
    "bauId"       TEXT NOT NULL,
    "acaoId"      TEXT,
    "dataInicio"  TIMESTAMP(3) NOT NULL,
    "dataFim"     TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "carreta_vinculos_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "carreta_vinculos" ADD CONSTRAINT "carreta_vinculos_cavalinhoId_fkey"
    FOREIGN KEY ("cavalinhoId") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "carreta_vinculos" ADD CONSTRAINT "carreta_vinculos_bauId_fkey"
    FOREIGN KEY ("bauId") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "carreta_vinculos" ADD CONSTRAINT "carreta_vinculos_acaoId_fkey"
    FOREIGN KEY ("acaoId") REFERENCES "acoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "carreta_vinculos_cavalinhoId_idx" ON "carreta_vinculos"("cavalinhoId");
CREATE INDEX "carreta_vinculos_bauId_idx" ON "carreta_vinculos"("bauId");
