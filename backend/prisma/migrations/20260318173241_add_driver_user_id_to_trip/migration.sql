-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "driverUserId" TEXT;

-- CreateIndex
CREATE INDEX "trips_driverUserId_idx" ON "trips"("driverUserId");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
