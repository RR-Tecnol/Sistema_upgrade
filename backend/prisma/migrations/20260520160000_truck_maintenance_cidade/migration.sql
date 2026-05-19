-- Cidade da manutenção (exibida em Contas a pagar)
ALTER TABLE "truck_maintenances" ADD COLUMN IF NOT EXISTS "cidade" TEXT;
