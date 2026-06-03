-- Motor letivo no período de curso (fonte operacional; turmas herdam ao vincular)
ALTER TABLE "acoes" ADD COLUMN IF NOT EXISTS "motorCourseId" TEXT;
ALTER TABLE "acoes" ADD COLUMN IF NOT EXISTS "period" "Period" NOT NULL DEFAULT 'MORNING';
ALTER TABLE "acoes" ADD COLUMN IF NOT EXISTS "startTime" TEXT NOT NULL DEFAULT '07:00';
ALTER TABLE "acoes" ADD COLUMN IF NOT EXISTS "endTime" TEXT NOT NULL DEFAULT '12:00';
ALTER TABLE "acoes" ADD COLUMN IF NOT EXISTS "weekendPolicy" "ClassWeekendPolicy" NOT NULL DEFAULT 'WEEKDAYS_ONLY';
ALTER TABLE "acoes" ADD COLUMN IF NOT EXISTS "weekendExtraDates" JSONB;
ALTER TABLE "acoes" ADD COLUMN IF NOT EXISTS "teachingDaysOverride" INTEGER;

ALTER TABLE "acoes" ADD CONSTRAINT "acoes_motorCourseId_fkey"
  FOREIGN KEY ("motorCourseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "acoes_motorCourseId_idx" ON "acoes"("motorCourseId");
