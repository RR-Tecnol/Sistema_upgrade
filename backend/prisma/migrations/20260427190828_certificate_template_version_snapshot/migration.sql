-- AlterTable
ALTER TABLE "certificate_template_versions" ADD COLUMN     "coordinateOverrides" JSONB;

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "templateVersionId" TEXT;

-- CreateIndex
CREATE INDEX "certificates_templateVersionId_idx" ON "certificates"("templateVersionId");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "certificate_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
