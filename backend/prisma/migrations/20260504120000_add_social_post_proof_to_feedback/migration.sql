-- AlterTable: adiciona campos para comprovação real de divulgação social no feedback
-- (LINKEDIN: link + screenshot obrigatórios; WHATSAPP: screenshot obrigatório, link opcional)
ALTER TABLE "course_feedbacks" ADD COLUMN     "socialPostPlatform" TEXT;
ALTER TABLE "course_feedbacks" ADD COLUMN     "socialPostUrl" TEXT;
ALTER TABLE "course_feedbacks" ADD COLUMN     "socialPostProofUrl" TEXT;
ALTER TABLE "course_feedbacks" ADD COLUMN     "socialPostedAt" TIMESTAMP(3);
