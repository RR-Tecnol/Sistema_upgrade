-- Ocorrência «sem aula» ligada ao período de curso (opcional)
ALTER TABLE "class_holidays" ADD COLUMN IF NOT EXISTS "acaoId" TEXT;

CREATE INDEX IF NOT EXISTS "class_holidays_acaoId_idx" ON "class_holidays"("acaoId");

ALTER TABLE "class_holidays"
  ADD CONSTRAINT "class_holidays_acaoId_fkey"
  FOREIGN KEY ("acaoId") REFERENCES "acoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
