-- Adiciona campo quantidade_minima em truck_stock_items (seguro para banco limpo)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'truck_stock_items'
  ) THEN
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'truck_stock_items' AND column_name = 'quantidade_minima'
    ) THEN
      ALTER TABLE "truck_stock_items" ADD COLUMN "quantidade_minima" INTEGER NOT NULL DEFAULT 0;
    END IF;
  END IF;
END
$$;
