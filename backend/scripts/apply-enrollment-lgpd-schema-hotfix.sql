-- Hotfix idempotente: evita 500 em POST /api/enrollments/public quando a migração Prisma
-- ainda não foi aplicada (ex.: cadeia de migrate interrompida).
-- Executar no PostgreSQL da app, ex.: psql "$DATABASE_URL" -f scripts/apply-enrollment-lgpd-schema-hotfix.sql

ALTER TABLE "enrollment_consents"
    ADD COLUMN IF NOT EXISTS "attendanceCommitment" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "student_legal_consents" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "termsAccepted" BOOLEAN NOT NULL,
    "dataProcessingConsent" BOOLEAN NOT NULL,
    "imageUseAuthorization" BOOLEAN NOT NULL,
    "attendanceCommitment" BOOLEAN NOT NULL,
    "privacyPolicyAccepted" BOOLEAN NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "student_legal_consents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "student_legal_consents_studentId_recordedAt_idx"
    ON "student_legal_consents" ("studentId", "recordedAt");

DO $$
BEGIN
    ALTER TABLE "student_legal_consents"
        ADD CONSTRAINT "student_legal_consents_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "student_legal_consents"
        ADD CONSTRAINT "student_legal_consents_enrollmentId_fkey"
        FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
