-- Consentimento de frequência na inscrição + registo LGPD no perfil do aluno

ALTER TABLE "enrollment_consents" ADD COLUMN "attendanceCommitment" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "student_legal_consents" (
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

CREATE INDEX "student_legal_consents_studentId_recordedAt_idx" ON "student_legal_consents"("studentId", "recordedAt");

ALTER TABLE "student_legal_consents" ADD CONSTRAINT "student_legal_consents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_legal_consents" ADD CONSTRAINT "student_legal_consents_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
