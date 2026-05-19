-- Registros legados com stockItemId NULL quebram o Prisma (campo obrigatório no schema).
-- Desativa para não aparecerem na listagem nem causarem erro 500.
UPDATE stock_purchase_requests
SET active = false, "updatedAt" = NOW()
WHERE "stockItemId" IS NULL AND active = true;
