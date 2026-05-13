-- Fluxo feedback: CONTENT_APPROVED (triagem admin) antes do PIX / Contas a pagar.

ALTER TYPE "FeedbackStatus" ADD VALUE 'CONTENT_APPROVED';

ALTER TYPE "NotificationType" ADD VALUE 'FEEDBACK_CONTENT_APPROVED';

ALTER TABLE "course_feedbacks" ADD COLUMN "contentApprovedAt" TIMESTAMP(3);
ALTER TABLE "course_feedbacks" ADD COLUMN "contentApprovedBy" TEXT;
ALTER TABLE "course_feedbacks" ADD COLUMN "studentSubmitSequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "course_feedbacks" ADD COLUMN "resubmittedAfterReject" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "course_feedbacks" ADD COLUMN "rejectionHistoryJson" JSONB;

UPDATE "course_feedbacks" SET "studentSubmitSequence" = 1 WHERE "submittedAt" IS NOT NULL AND "studentSubmitSequence" = 0;
