CREATE TYPE "TipoNaoConformidade" AS ENUM (
  'DANO_ESTRUTURAL_DESCOBERTO', 'DESVIO_DIMENSIONAL', 'DEFEITO_MATERIAL',
  'ATRASO_ENTREGA_INSUMO', 'DEFEITO_EQUIPAMENTO_INSTALADO', 'ACIDENTE_TRABALHO', 'OUTRO'
);
CREATE TYPE "StatusNaoConformidade" AS ENUM (
  'ABERTA', 'EM_TRATATIVA', 'RESOLVIDA', 'ACEITA_COM_DESVIO', 'CANCELADA'
);

CREATE TABLE "nao_conformidades" (
    "id"                TEXT NOT NULL,
    "codigo"            TEXT NOT NULL,
    "ordemId"           TEXT NOT NULL,
    "operacaoId"        TEXT,
    "tipo"              "TipoNaoConformidade" NOT NULL,
    "descricao"         TEXT NOT NULL,
    "acaoCorretiva"     TEXT,
    "bloqueiaProducao"  BOOLEAN NOT NULL DEFAULT false,
    "impactoFinanceiro" DECIMAL(12,2),
    "impactoDias"       INTEGER,
    "status"            "StatusNaoConformidade" NOT NULL DEFAULT 'ABERTA',
    "resolucao"         TEXT,
    "fotoUrls"          TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentoUrl"      TEXT,
    "registradoPor"     TEXT NOT NULL,
    "resolvidoPor"      TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nao_conformidades_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "nao_conformidades_codigo_key" ON "nao_conformidades"("codigo");
CREATE INDEX "nao_conformidades_status_idx"  ON "nao_conformidades"("status");
CREATE INDEX "nao_conformidades_ordemId_idx" ON "nao_conformidades"("ordemId");
ALTER TABLE "nao_conformidades" ADD CONSTRAINT "nao_conformidades_ordemId_fkey"
    FOREIGN KEY ("ordemId") REFERENCES "ordens_fabricacao"("id") ON DELETE CASCADE;
ALTER TABLE "nao_conformidades" ADD CONSTRAINT "nao_conformidades_registradoPor_fkey"
    FOREIGN KEY ("registradoPor") REFERENCES "users"("id") ON DELETE RESTRICT;
