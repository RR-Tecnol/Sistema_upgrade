CREATE TYPE "StatusOperacao" AS ENUM (
  'AGUARDANDO', 'LIBERADA', 'EM_ANDAMENTO', 'GATE_PENDENTE', 'CONCLUIDA', 'BLOQUEADA'
);

CREATE TABLE "operacoes_producao" (
    "id"                    TEXT NOT NULL,
    "ordemId"               TEXT NOT NULL,
    "operacao"              "OperacaoRoteiro" NOT NULL,
    "ordemNumero"           INTEGER NOT NULL,
    "descricao"             TEXT NOT NULL,
    "duracaoPrevistaHoras"  DECIMAL(8,2) NOT NULL,
    "duracaoRealHoras"      DECIMAL(8,2),
    "predecessoras"         TEXT[] DEFAULT ARRAY[]::TEXT[],
    "esDate"                TIMESTAMP(3),
    "efDate"                TIMESTAMP(3),
    "lsDate"                TIMESTAMP(3),
    "lfDate"                TIMESTAMP(3),
    "folga"                 DECIMAL(8,2),
    "isCritical"            BOOLEAN NOT NULL DEFAULT false,
    "status"                "StatusOperacao" NOT NULL DEFAULT 'AGUARDANDO',
    "percentualConcluido"   INTEGER NOT NULL DEFAULT 0,
    "dataInicioReal"        TIMESTAMP(3),
    "dataConclusaoReal"     TIMESTAMP(3),
    "responsavelNome"       TEXT,
    "gateAprovado"          BOOLEAN NOT NULL DEFAULT false,
    "gateAprovadoPor"       TEXT,
    "gateAprovadoEm"        TIMESTAMP(3),
    "pesoEvm"               DECIMAL(5,2) NOT NULL DEFAULT 14.28,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operacoes_producao_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "operacoes_producao_ordemId_operacao_key" ON "operacoes_producao"("ordemId","operacao");
CREATE INDEX "operacoes_producao_status_idx" ON "operacoes_producao"("status");

ALTER TABLE "operacoes_producao" ADD CONSTRAINT "operacoes_producao_ordemId_fkey"
    FOREIGN KEY ("ordemId") REFERENCES "ordens_fabricacao"("id") ON DELETE CASCADE;
