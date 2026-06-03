-- Adiciona campo cidade em truck_maintenance (seguro para banco limpo)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'truck_maintenance'
  ) THEN
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'truck_maintenance' AND column_name = 'cidade'
    ) THEN
      ALTER TABLE "truck_maintenance" ADD COLUMN "cidade" TEXT;
    END IF;
  END IF;
END
$$;
