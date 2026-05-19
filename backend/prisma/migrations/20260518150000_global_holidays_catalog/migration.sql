-- BUG-15: catálogo global de feriados (sem turma obrigatória)
CREATE TYPE "GlobalHolidayScope" AS ENUM ('NATIONAL', 'STATE');

CREATE TABLE "global_holidays" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "scope" "GlobalHolidayScope" NOT NULL,
    "stateCode" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "registeredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_holidays_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "global_holidays_date_scope_stateCode_key" ON "global_holidays"("date", "scope", "stateCode");
CREATE INDEX "global_holidays_date_idx" ON "global_holidays"("date");
CREATE INDEX "global_holidays_scope_stateCode_idx" ON "global_holidays"("scope", "stateCode");

ALTER TABLE "global_holidays" ADD CONSTRAINT "global_holidays_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
