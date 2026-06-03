CREATE TYPE "StatusOrdemFabricacao" AS ENUM (
  'RASCUNHO', 'AGUARDANDO_MATERIAL', 'EM_PRODUCAO',
  'BLOQUEADA', 'INSPECAO_FINAL', 'CONCLUIDA', 'CANCELADA'
);
CREATE TYPE "OperacaoRoteiro" AS ENUM (
  'OP010_VISTORIA_DESMANCHE', 'OP020_SERRALHERIA', 'OP030_INFRAESTRUTURA',
  'OP040_ACABAMENTO', 'OP050_MARCENARIA', 'OP060_INSTALACOES_FINAIS', 'OP070_GATE_LIBERACAO'
);
CREATE TYPE "TipoContratacaoFabricacao" AS ENUM ('MAO_DE_OBRA', 'PORTEIRA_FECHADA', 'MISTO');

CREATE TABLE "ordens_fabricacao" (
    "id"                    TEXT NOT NULL,
    "codigo"                TEXT NOT NULL,
    "qrCodeUrl"             TEXT,
    "descricaoBau"          TEXT NOT NULL,
    "configuracao"          "TruckType" NOT NULL,
    "tipoContratacao"       "TipoContratacaoFabricacao" NOT NULL,
    "bomTemplateId"         TEXT,
    "truckId"               TEXT,
    "dataEntradaGalpao"     TIMESTAMP(3) NOT NULL,
    "dataInicioBaseline"    TIMESTAMP(3) NOT NULL,
    "dataConclusaoBaseline" TIMESTAMP(3) NOT NULL,
    "dataInicioReal"        TIMESTAMP(3),
    "dataConclusaoReal"     TIMESTAMP(3),
    "orcamentoTotal"        DECIMAL(12,2) NOT NULL,
    "custoRealAcumulado"    DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorAgregadoTotal"    DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status"                "StatusOrdemFabricacao" NOT NULL DEFAULT 'RASCUNHO',
    "andoneAtivo"           BOOLEAN NOT NULL DEFAULT false,
    "alertaCustoPercent"    INTEGER NOT NULL DEFAULT 110,
    "grupoId"               TEXT,
    "responsavelId"         TEXT NOT NULL,
    "observacoes"           TEXT,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ordens_fabricacao_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ordens_fabricacao_codigo_key"  ON "ordens_fabricacao"("codigo");
CREATE UNIQUE INDEX "ordens_fabricacao_truckId_key" ON "ordens_fabricacao"("truckId");
CREATE INDEX "ordens_fabricacao_status_idx"         ON "ordens_fabricacao"("status");
CREATE INDEX "ordens_fabricacao_responsavelId_idx"  ON "ordens_fabricacao"("responsavelId");

ALTER TABLE "ordens_fabricacao" ADD CONSTRAINT "ordens_fabricacao_bomTemplateId_fkey"
    FOREIGN KEY ("bomTemplateId") REFERENCES "bom_templates"("id") ON DELETE SET NULL;
ALTER TABLE "ordens_fabricacao" ADD CONSTRAINT "ordens_fabricacao_truckId_fkey"
    FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE SET NULL;
ALTER TABLE "ordens_fabricacao" ADD CONSTRAINT "ordens_fabricacao_grupoId_fkey"
    FOREIGN KEY ("grupoId") REFERENCES "groups"("id") ON DELETE SET NULL;
ALTER TABLE "ordens_fabricacao" ADD CONSTRAINT "ordens_fabricacao_responsavelId_fkey"
    FOREIGN KEY ("responsavelId") REFERENCES "users"("id") ON DELETE RESTRICT;

CREATE TABLE "ordem_fabricacao_bom_items" (
    "id"                  TEXT NOT NULL,
    "ordemId"             TEXT NOT NULL,
    "insumoId"            TEXT NOT NULL,
    "operacao"            "OperacaoRoteiro" NOT NULL,
    "quantidadePrevista"  DECIMAL(12,3) NOT NULL,
    "quantidadeConsumida" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unidade"             TEXT NOT NULL,
    "custoUnitarioPrev"   DECIMAL(12,2) NOT NULL,
    "custoUnitarioReal"   DECIMAL(12,2),
    "isPhantom"           BOOLEAN NOT NULL DEFAULT false,
    "observacoes"         TEXT,
    CONSTRAINT "ordem_fabricacao_bom_items_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ordem_fabricacao_bom_items" ADD CONSTRAINT "ordem_fabricacao_bom_items_ordemId_fkey"
    FOREIGN KEY ("ordemId") REFERENCES "ordens_fabricacao"("id") ON DELETE CASCADE;
