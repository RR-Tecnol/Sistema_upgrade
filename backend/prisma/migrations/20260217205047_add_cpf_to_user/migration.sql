/*
  Warnings:

  - You are about to drop the column `previousQualificationDetail` on the `student_professional` table. All the data in the column will be lost.
  - You are about to drop the column `disabilityAdaptationNeeded` on the `student_socioeconomic` table. All the data in the column will be lost.
  - You are about to drop the column `socialProgramOther` on the `student_socioeconomic` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cpf]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `careerGoal` to the `student_professional` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `familyIncome` on the `student_socioeconomic` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "FamilyIncome" AS ENUM ('UP_TO_1_MW', 'FROM_1_TO_2_MW', 'FROM_2_TO_3_MW', 'FROM_3_TO_5_MW', 'ABOVE_5_MW', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "CareerGoal" AS ENUM ('SEEK_EMPLOYMENT', 'ENTREPRENEURSHIP', 'SELF_EMPLOYED', 'NOT_SURE', 'OTHER');

-- AlterTable
ALTER TABLE "student_professional" DROP COLUMN "previousQualificationDetail",
ALTER COLUMN "previousQualification" DROP NOT NULL,
ALTER COLUMN "previousQualification" DROP DEFAULT,
ALTER COLUMN "previousQualification" SET DATA TYPE TEXT,
DROP COLUMN "careerGoal",
ADD COLUMN     "careerGoal" "CareerGoal" NOT NULL,
ALTER COLUMN "howHeardAbout" DROP NOT NULL;

-- AlterTable
ALTER TABLE "student_socioeconomic" DROP COLUMN "disabilityAdaptationNeeded",
DROP COLUMN "socialProgramOther",
ADD COLUMN     "disabilityAdaptation" BOOLEAN,
DROP COLUMN "familyIncome",
ADD COLUMN     "familyIncome" "FamilyIncome" NOT NULL,
ALTER COLUMN "socialProgram" DROP NOT NULL;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "socialName" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cpf" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");
