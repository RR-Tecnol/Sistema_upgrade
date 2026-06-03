-- Prisma não envolve esta migration em transaction (PostgreSQL não permite ALTER TYPE ADD VALUE em transactions)
-- Trio Logístico: Cavalinho (trator) + Baú (reboque/sala de aula)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CAVALINHO' AND enumtypid = 'public."TruckType"'::regtype) THEN
    ALTER TYPE "TruckType" ADD VALUE 'CAVALINHO';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BAU' AND enumtypid = 'public."TruckType"'::regtype) THEN
    ALTER TYPE "TruckType" ADD VALUE 'BAU';
  END IF;
END $$;

-- Campos adicionais ao Truck (todos opcionais — não quebra registros existentes)
ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "eixos" INTEGER;
ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "modeloComercial" TEXT;
ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "tara" DECIMAL(12,2);
ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "capacidadeCarga" DECIMAL(12,2);
ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "anoFabricacao" INTEGER;
