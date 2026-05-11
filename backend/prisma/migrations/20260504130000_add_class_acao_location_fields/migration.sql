-- Idempotente: verifica antes de adicionar cada coluna.
-- Class location fields
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "locationName" TEXT;
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "locationAddress" TEXT;
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "locationReference" TEXT;
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "locationLatitude" DOUBLE PRECISION;
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "locationLongitude" DOUBLE PRECISION;

-- Acao location fields
ALTER TABLE "acoes" ADD COLUMN IF NOT EXISTS "localEndereco" TEXT;
ALTER TABLE "acoes" ADD COLUMN IF NOT EXISTS "localReferencia" TEXT;
ALTER TABLE "acoes" ADD COLUMN IF NOT EXISTS "localLatitude" DOUBLE PRECISION;
ALTER TABLE "acoes" ADD COLUMN IF NOT EXISTS "localLongitude" DOUBLE PRECISION;
