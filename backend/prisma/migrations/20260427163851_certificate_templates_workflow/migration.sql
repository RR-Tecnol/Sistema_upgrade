-- CreateEnum
CREATE TYPE "CertificateTemplateScope" AS ENUM ('GLOBAL', 'COURSE', 'STATE', 'COURSE_STATE');

-- CreateEnum
CREATE TYPE "CertificateTemplateType" AS ENUM ('PDF_BASE', 'HTML');

-- CreateEnum
CREATE TYPE "CertificateTemplateStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "certificate_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scope" "CertificateTemplateScope" NOT NULL,
    "courseId" TEXT,
    "state" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currentVersionId" TEXT,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_template_versions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "templateType" "CertificateTemplateType" NOT NULL,
    "htmlContent" TEXT,
    "cssContent" TEXT,
    "pdfPath" TEXT,
    "placeholders" JSONB,
    "notes" TEXT,
    "status" "CertificateTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificate_templates_key_key" ON "certificate_templates"("key");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_templates_currentVersionId_key" ON "certificate_templates"("currentVersionId");

-- CreateIndex
CREATE INDEX "certificate_templates_scope_idx" ON "certificate_templates"("scope");

-- CreateIndex
CREATE INDEX "certificate_templates_courseId_idx" ON "certificate_templates"("courseId");

-- CreateIndex
CREATE INDEX "certificate_templates_state_idx" ON "certificate_templates"("state");

-- CreateIndex
CREATE INDEX "certificate_template_versions_templateId_idx" ON "certificate_template_versions"("templateId");

-- CreateIndex
CREATE INDEX "certificate_template_versions_status_idx" ON "certificate_template_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_template_versions_templateId_version_key" ON "certificate_template_versions"("templateId", "version");

-- AddForeignKey
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "certificate_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_template_versions" ADD CONSTRAINT "certificate_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "certificate_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_template_versions" ADD CONSTRAINT "certificate_template_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_template_versions" ADD CONSTRAINT "certificate_template_versions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
