-- Migration: Custo de Aquisição da OF + Tipos de Serviço por Ofício
-- Sprint A — Fase 1 & 2 do módulo de Custo de Fabricação

-- 1. Novos campos em OrdemFabricacao (todos opcionais — sem downtime)
ALTER TABLE "ordens_fabricacao"
  ADD COLUMN IF NOT EXISTS "cursoEspecifico"     TEXT,
  ADD COLUMN IF NOT EXISTS "valorBauComprado"    DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "valorBauDescricao"   TEXT,
  ADD COLUMN IF NOT EXISTS "valorFreteAquisicao" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "valorFreteDescricao" TEXT;

-- 2. Novos valores no enum TipoCustoOf
DO $$ BEGIN
  ALTER TYPE "TipoCustoOf" ADD VALUE IF NOT EXISTS 'SERVICO_DIARIA';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "TipoCustoOf" ADD VALUE IF NOT EXISTS 'SERVICO_PACOTE';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "TipoCustoOf" ADD VALUE IF NOT EXISTS 'BAU_COMPRA';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "TipoCustoOf" ADD VALUE IF NOT EXISTS 'FRETE_AQUISICAO';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Novos campos em CustoOf
ALTER TABLE "custos_of"
  ADD COLUMN IF NOT EXISTS "oficio"   TEXT,
  ADD COLUMN IF NOT EXISTS "operacao" TEXT;

-- 4. Índices de performance
CREATE INDEX IF NOT EXISTS "custos_of_ordemId_idx" ON "custos_of"("ordemId");
CREATE INDEX IF NOT EXISTS "custos_of_tipo_idx"    ON "custos_of"("tipo");
