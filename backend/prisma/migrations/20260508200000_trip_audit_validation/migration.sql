-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "auditValidatedAt" TIMESTAMP(3),
ADD COLUMN     "auditValidatedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_auditValidatedByUserId_fkey" FOREIGN KEY ("auditValidatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
