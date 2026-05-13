-- Política de fins de semana para dias letivos previstos (frequência / certificado)
CREATE TYPE "ClassWeekendPolicy" AS ENUM ('FOLLOW_SCHEDULE', 'WEEKDAYS_ONLY', 'ALL_WEEKENDS', 'SELECT_WEEKENDS');

ALTER TABLE "classes" ADD COLUMN "weekendPolicy" "ClassWeekendPolicy" NOT NULL DEFAULT 'FOLLOW_SCHEDULE';
ALTER TABLE "classes" ADD COLUMN "weekendExtraDates" JSONB;
