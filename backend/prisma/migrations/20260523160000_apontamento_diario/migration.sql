CREATE TABLE "apontamentos_diarios" (
    "id"                   TEXT NOT NULL,
    "ordemId"              TEXT NOT NULL,
    "operacaoId"           TEXT NOT NULL,
    "funcionarioId"        TEXT NOT NULL,
    "data"                 TIMESTAMP(3) NOT NULL,
    "horasTrabalhadas"     DECIMAL(5,2) NOT NULL,
    "percentualAvanco"     INTEGER NOT NULL DEFAULT 0,
    "descricaoAtividade"   TEXT NOT NULL,
    "materiaisConsumidos"  JSONB,
    "fotoUrls"             TEXT[] DEFAULT ARRAY[]::TEXT[],
    "observacoes"          TEXT,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "apontamentos_diarios_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "apontamentos_diarios" ADD CONSTRAINT "apontamentos_diarios_ordemId_fkey"
    FOREIGN KEY ("ordemId") REFERENCES "ordens_fabricacao"("id") ON DELETE CASCADE;
ALTER TABLE "apontamentos_diarios" ADD CONSTRAINT "apontamentos_diarios_operacaoId_fkey"
    FOREIGN KEY ("operacaoId") REFERENCES "operacoes_producao"("id") ON DELETE CASCADE;
