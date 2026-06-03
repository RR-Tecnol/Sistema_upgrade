-- Registros legados com stockItemId NULL quebram o Prisma (campo obrigatório no schema).
-- Desativa para não aparecerem na listagem nem causarem erro 500.
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_purchase_requests'
  ) THEN
    UPDATE stock_purchase_requests
    SET status = 'CANCELLED'
    WHERE "stockItemId" IS NULL;
  END IF;
END
$$;
