-- Viagem ↔ turma (ecossistema académico / motorista)
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "classId" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trips_classId_fkey'
    ) THEN
        ALTER TABLE "trips"
            ADD CONSTRAINT "trips_classId_fkey"
            FOREIGN KEY ("classId") REFERENCES "classes"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "trips_classId_idx" ON "trips"("classId");
