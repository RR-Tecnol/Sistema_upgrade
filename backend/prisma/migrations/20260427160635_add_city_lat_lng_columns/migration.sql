-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('ILLNESS', 'PERSONAL', 'EMERGENCY', 'TRIP', 'ACCIDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AbsenceStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED', 'PENALIZED');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('PENDING_STUDENT_RESPONSE', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REVERTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FeedbackCurrentStatus" AS ENUM ('EMPLOYED_CLT', 'EMPLOYED_PJ', 'SELF_EMPLOYED', 'STUDYING', 'UNEMPLOYED_LOOKING', 'OTHER');

-- CreateEnum
CREATE TYPE "PixKeyType" AS ENUM ('CPF', 'EMAIL', 'PHONE', 'RANDOM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'FEEDBACK_INVITATION';
ALTER TYPE "NotificationType" ADD VALUE 'FEEDBACK_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'FEEDBACK_PIX_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'FEEDBACK_PIX_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'FEEDBACK_PIX_REVERTED';

-- AlterTable
ALTER TABLE "cities" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "contas_pagar" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "driver_locations" (
    "id" TEXT NOT NULL,
    "driverUserId" TEXT NOT NULL,
    "tripId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'polling',
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_attendances" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "present" BOOLEAN NOT NULL,
    "justified" BOOLEAN NOT NULL DEFAULT false,
    "justification" TEXT,
    "registeredBy" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AbsenceType" NOT NULL DEFAULT 'OTHER',
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "documentUrl" TEXT,
    "status" "AbsenceStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "penalty" DECIMAL(10,2),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notifEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifCertificado" BOOLEAN NOT NULL DEFAULT true,
    "notifInscricao" BOOLEAN NOT NULL DEFAULT true,
    "notifFrequencia" BOOLEAN NOT NULL DEFAULT true,
    "animacoes" BOOLEAN NOT NULL DEFAULT true,
    "fonteGrande" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_checkins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "teacher_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_feedbacks" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'PENDING_STUDENT_RESPONSE',
    "ratingCourse" INTEGER,
    "ratingSystem" INTEGER,
    "ratingManagement" INTEGER,
    "ratingTeachers" INTEGER,
    "ratingGeneral" INTEGER,
    "commentPositive" TEXT,
    "commentImprovement" TEXT,
    "commentGeneral" TEXT,
    "currentStatus" "FeedbackCurrentStatus",
    "currentStatusDetails" TEXT,
    "currentPhotoUrl" TEXT,
    "currentVideoUrl" TEXT,
    "pixKeyType" "PixKeyType",
    "pixKey" TEXT,
    "pixAmount" DECIMAL(10,2),
    "invitedChannels" TEXT[],
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReminderAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "revertedBy" TEXT,
    "revertedAt" TIMESTAMP(3),
    "revertReason" TEXT,
    "contaPagarId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "driver_locations_driverUserId_capturedAt_idx" ON "driver_locations"("driverUserId", "capturedAt");

-- CreateIndex
CREATE INDEX "driver_locations_tripId_idx" ON "driver_locations"("tripId");

-- CreateIndex
CREATE INDEX "driver_locations_capturedAt_idx" ON "driver_locations"("capturedAt");

-- CreateIndex
CREATE INDEX "employee_attendances_employeeId_idx" ON "employee_attendances"("employeeId");

-- CreateIndex
CREATE INDEX "employee_attendances_date_idx" ON "employee_attendances"("date");

-- CreateIndex
CREATE UNIQUE INDEX "employee_attendances_employeeId_date_key" ON "employee_attendances"("employeeId", "date");

-- CreateIndex
CREATE INDEX "absences_userId_idx" ON "absences"("userId");

-- CreateIndex
CREATE INDEX "absences_status_idx" ON "absences"("status");

-- CreateIndex
CREATE INDEX "absences_date_idx" ON "absences"("date");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE INDEX "teacher_checkins_userId_date_idx" ON "teacher_checkins"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "course_feedbacks_certificateId_key" ON "course_feedbacks"("certificateId");

-- CreateIndex
CREATE UNIQUE INDEX "course_feedbacks_contaPagarId_key" ON "course_feedbacks"("contaPagarId");

-- CreateIndex
CREATE INDEX "course_feedbacks_studentId_idx" ON "course_feedbacks"("studentId");

-- CreateIndex
CREATE INDEX "course_feedbacks_classId_idx" ON "course_feedbacks"("classId");

-- CreateIndex
CREATE INDEX "course_feedbacks_status_idx" ON "course_feedbacks"("status");

-- CreateIndex
CREATE INDEX "course_feedbacks_invitedAt_idx" ON "course_feedbacks"("invitedAt");

-- AddForeignKey
ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendances" ADD CONSTRAINT "employee_attendances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendances" ADD CONSTRAINT "employee_attendances_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absences" ADD CONSTRAINT "absences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_checkins" ADD CONSTRAINT "teacher_checkins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_feedbacks" ADD CONSTRAINT "course_feedbacks_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_feedbacks" ADD CONSTRAINT "course_feedbacks_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_feedbacks" ADD CONSTRAINT "course_feedbacks_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_feedbacks" ADD CONSTRAINT "course_feedbacks_contaPagarId_fkey" FOREIGN KEY ("contaPagarId") REFERENCES "contas_pagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
