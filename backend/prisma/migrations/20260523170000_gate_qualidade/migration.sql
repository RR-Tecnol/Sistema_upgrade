CREATE TABLE "gates_qualidade" (
    "id"               TEXT NOT NULL,
    "ordemId"          TEXT NOT NULL,
    "operacaoId"       TEXT NOT NULL,
    "operacao"         "OperacaoRoteiro" NOT NULL,
    "itensChecklist"   JSONB NOT NULL DEFAULT '[]',
    "fotosUrls"        TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medicoes"         JSONB,
    "aprovado"         BOOLEAN NOT NULL DEFAULT false,
    "aprovadoPor"      TEXT,
    "aprovadoEm"       TIMESTAMP(3),
    "observacaoFinal"  TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gates_qualidade_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gates_qualidade_operacaoId_key" ON "gates_qualidade"("operacaoId");
ALTER TABLE "gates_qualidade" ADD CONSTRAINT "gates_qualidade_ordemId_fkey"
    FOREIGN KEY ("ordemId") REFERENCES "ordens_fabricacao"("id") ON DELETE CASCADE;
ALTER TABLE "gates_qualidade" ADD CONSTRAINT "gates_qualidade_operacaoId_fkey"
    FOREIGN KEY ("operacaoId") REFERENCES "operacoes_producao"("id") ON DELETE CASCADE;
ALTER TABLE "gates_qualidade" ADD CONSTRAINT "gates_qualidade_aprovadoPor_fkey"
    FOREIGN KEY ("aprovadoPor") REFERENCES "users"("id") ON DELETE SET NULL;
