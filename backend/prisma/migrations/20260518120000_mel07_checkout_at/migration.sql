-- MEL-07: ponto de saída (professor e motorista)
ALTER TABLE "teacher_checkins" ADD COLUMN IF NOT EXISTS "checkoutAt" TIMESTAMP(3);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'driver_checkins'
    ) THEN
        ALTER TABLE "driver_checkins" ADD COLUMN IF NOT EXISTS "checkoutAt" TIMESTAMP(3);
    END IF;
END $$;
