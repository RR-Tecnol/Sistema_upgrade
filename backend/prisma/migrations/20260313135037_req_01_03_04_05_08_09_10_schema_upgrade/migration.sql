-- CreateEnum
CREATE TYPE "ReimbursementType" AS ENUM ('CLASSROOM_MATERIAL', 'CLEANING_MATERIAL', 'EMERGENCY_REPAIR', 'FOOD', 'OTHER');

-- AlterEnum
ALTER TYPE "SocialProgram" ADD VALUE 'PE_DE_MEIA';

-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "reserveSlots" INTEGER NOT NULL DEFAULT 4;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "contractType" "ContractType",
ADD COLUMN     "monthlySalaryCLT" DECIMAL(12,2),
ADD COLUMN     "travelRuleKm" INTEGER DEFAULT 200;

-- AlterTable
ALTER TABLE "student_professional" ALTER COLUMN "motivation" DROP NOT NULL;

-- AlterTable
ALTER TABLE "student_socioeconomic" ADD COLUMN     "publicSchoolOnly" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "class_holidays" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "registeredBy" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reimbursements" (
    "id" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "employeeId" TEXT,
    "acaoId" TEXT,
    "type" "ReimbursementType" NOT NULL DEFAULT 'OTHER',
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "receiptUrl" TEXT NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reimbursements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_holidays_classId_idx" ON "class_holidays"("classId");

-- CreateIndex
CREATE INDEX "class_holidays_date_idx" ON "class_holidays"("date");

-- CreateIndex
CREATE INDEX "reimbursements_requestedBy_idx" ON "reimbursements"("requestedBy");

-- CreateIndex
CREATE INDEX "reimbursements_status_idx" ON "reimbursements"("status");

-- CreateIndex
CREATE INDEX "reimbursements_acaoId_idx" ON "reimbursements"("acaoId");

-- CreateIndex
CREATE INDEX "reimbursements_createdAt_idx" ON "reimbursements"("createdAt");

-- AddForeignKey
ALTER TABLE "class_holidays" ADD CONSTRAINT "class_holidays_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES "acoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
