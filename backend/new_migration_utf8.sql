-- CreateEnum
CREATE TYPE "FeedbackRewardStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockItemCategory" AS ENUM ('CONSUMIVEL', 'DIDATICO', 'LIMPEZA', 'EQUIPAMENTO', 'EPI', 'ALIMENTACAO', 'ESCRITORIO', 'OUTRO');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'DEVOLUCAO', 'AJUSTE', 'PERDA', 'REPOSICAO', 'ENCOMENDA');

-- CreateEnum
CREATE TYPE "StockPurchaseRequestStatus" AS ENUM ('PENDENTE', 'APROVADA', 'RECEBIDA', 'REJEITADA', 'CANCELADA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'NEW_STUDENT_REGISTRATION';
ALTER TYPE "NotificationType" ADD VALUE 'REIMBURSEMENT_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'REIMBURSEMENT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'REIMBURSEMENT_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'TRUCK_MAINTENANCE_ALERT';
ALTER TYPE "NotificationType" ADD VALUE 'TRIP_SCHEDULED';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'IT_ADMIN';

-- AlterTable
ALTER TABLE "acoes" ADD COLUMN     "destinationNeighborhood" TEXT,
ADD COLUMN     "originCidadeId" TEXT,
ADD COLUMN     "originNeighborhood" TEXT,
ADD COLUMN     "routeType" TEXT NOT NULL DEFAULT 'INTERCIDADE';

-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "destinationNeighborhood" TEXT,
ADD COLUMN     "originCityId" TEXT,
ADD COLUMN     "originNeighborhood" TEXT,
ADD COLUMN     "routeType" TEXT NOT NULL DEFAULT 'INTERCIDADE';

-- AlterTable
ALTER TABLE "course_feedbacks" ADD COLUMN     "rewardPaidAt" TIMESTAMP(3),
ADD COLUMN     "rewardPaymentReference" TEXT,
ADD COLUMN     "rewardStatus" "FeedbackRewardStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "sharedOnSocial" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "institutionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "rg",
ADD COLUMN     "documents" JSONB;

-- AlterTable
ALTER TABLE "students" DROP COLUMN "rg",
DROP COLUMN "rgIssuer",
ADD COLUMN     "documents" JSONB;

-- AlterTable
ALTER TABLE "teachers" DROP COLUMN "rg",
ADD COLUMN     "documents" JSONB;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "destinationCep" TEXT,
ADD COLUMN     "destinationLatitude" DOUBLE PRECISION,
ADD COLUMN     "destinationLongitude" DOUBLE PRECISION,
ADD COLUMN     "driverDecision" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "driverDecisionAt" TIMESTAMP(3),
ADD COLUMN     "driverDecisionReason" TEXT,
ADD COLUMN     "endOdometerPhotoUrl" TEXT,
ADD COLUMN     "gpsDistanceKm" DOUBLE PRECISION,
ADD COLUMN     "originCep" TEXT,
ADD COLUMN     "originLatitude" DOUBLE PRECISION,
ADD COLUMN     "originLongitude" DOUBLE PRECISION,
ADD COLUMN     "rejectionPenalty" DECIMAL(10,2),
ADD COLUMN     "rejectionPenaltyAt" TIMESTAMP(3),
ADD COLUMN     "rejectionPenaltyBy" TEXT,
ADD COLUMN     "startOdometerPhotoUrl" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailOtpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailOtpHash" TEXT,
ADD COLUMN     "requiresPasswordChange" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresTwoFactorSetup" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "logoUrl" TEXT,
    "siteUrl" TEXT,
    "primaryColor" TEXT,
    "signPfxPath" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acao_stock_reservations" (
    "id" TEXT NOT NULL,
    "acaoId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "truckId" TEXT,
    "quantidadePrevista" DECIMAL(12,3) NOT NULL,
    "quantidadeConsumida" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "prioridade" TEXT NOT NULL DEFAULT 'NORMAL',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "acao_stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_checkins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "driver_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_categories" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "defaultEnum" "StockItemCategory",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigoInterno" TEXT,
    "categoria" "StockItemCategory" NOT NULL,
    "customCategoryId" TEXT,
    "unidade" TEXT NOT NULL,
    "quantidadeAtual" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "quantidadeEmTransito" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "quantidadeMinima" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "validade" TIMESTAMP(3),
    "fornecedor" TEXT,
    "precoUnitario" DECIMAL(10,2),
    "localizacao" TEXT,
    "fotoUrl" TEXT,
    "observacoes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_stock_items" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantidadeAtual" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "truck_stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "fromTruckId" TEXT,
    "toTruckId" TEXT,
    "acaoId" TEXT,
    "purchaseRequestId" TEXT,
    "registeredBy" TEXT NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_purchase_requests" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "precoUnitario" DECIMAL(10,2) NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "fornecedor" TEXT,
    "urgente" BOOLEAN NOT NULL DEFAULT false,
    "justificativa" TEXT NOT NULL,
    "comprovanteUrl" TEXT,
    "status" "StockPurchaseRequestStatus" NOT NULL DEFAULT 'PENDENTE',
    "requestedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "contaPagarId" TEXT,
    "movementId" TEXT,
    "stockBudgetId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_budgets" (
    "id" TEXT NOT NULL,
    "categoriaEnum" "StockItemCategory",
    "categoriaCustomId" TEXT,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "valorTeto" DECIMAL(12,2) NOT NULL,
    "observacao" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acao_stock_budgets" (
    "id" TEXT NOT NULL,
    "acaoId" TEXT NOT NULL,
    "valorTeto" DECIMAL(12,2) NOT NULL,
    "observacao" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acao_stock_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutions_slug_key" ON "institutions"("slug");

-- CreateIndex
CREATE INDEX "acao_stock_reservations_acaoId_idx" ON "acao_stock_reservations"("acaoId");

-- CreateIndex
CREATE INDEX "acao_stock_reservations_stockItemId_idx" ON "acao_stock_reservations"("stockItemId");

-- CreateIndex
CREATE INDEX "acao_stock_reservations_truckId_idx" ON "acao_stock_reservations"("truckId");

-- CreateIndex
CREATE UNIQUE INDEX "acao_stock_reservations_acaoId_stockItemId_key" ON "acao_stock_reservations"("acaoId", "stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_checkins_userId_date_key" ON "driver_checkins"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "stock_categories_nome_key" ON "stock_categories"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "stock_categories_slug_key" ON "stock_categories"("slug");

-- CreateIndex
CREATE INDEX "stock_categories_active_idx" ON "stock_categories"("active");

-- CreateIndex
CREATE INDEX "stock_categories_isDefault_idx" ON "stock_categories"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_codigoInterno_key" ON "stock_items"("codigoInterno");

-- CreateIndex
CREATE INDEX "stock_items_categoria_idx" ON "stock_items"("categoria");

-- CreateIndex
CREATE INDEX "stock_items_customCategoryId_idx" ON "stock_items"("customCategoryId");

-- CreateIndex
CREATE INDEX "stock_items_active_idx" ON "stock_items"("active");

-- CreateIndex
CREATE INDEX "stock_items_validade_idx" ON "stock_items"("validade");

-- CreateIndex
CREATE INDEX "truck_stock_items_truckId_idx" ON "truck_stock_items"("truckId");

-- CreateIndex
CREATE INDEX "truck_stock_items_stockItemId_idx" ON "truck_stock_items"("stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "truck_stock_items_truckId_stockItemId_key" ON "truck_stock_items"("truckId", "stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_purchaseRequestId_key" ON "stock_movements"("purchaseRequestId");

-- CreateIndex
CREATE INDEX "stock_movements_type_idx" ON "stock_movements"("type");

-- CreateIndex
CREATE INDEX "stock_movements_stockItemId_idx" ON "stock_movements"("stockItemId");

-- CreateIndex
CREATE INDEX "stock_movements_fromTruckId_idx" ON "stock_movements"("fromTruckId");

-- CreateIndex
CREATE INDEX "stock_movements_toTruckId_idx" ON "stock_movements"("toTruckId");

-- CreateIndex
CREATE INDEX "stock_movements_acaoId_idx" ON "stock_movements"("acaoId");

-- CreateIndex
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "stock_purchase_requests_contaPagarId_key" ON "stock_purchase_requests"("contaPagarId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_purchase_requests_movementId_key" ON "stock_purchase_requests"("movementId");

-- CreateIndex
CREATE INDEX "stock_purchase_requests_stockItemId_idx" ON "stock_purchase_requests"("stockItemId");

-- CreateIndex
CREATE INDEX "stock_purchase_requests_status_idx" ON "stock_purchase_requests"("status");

-- CreateIndex
CREATE INDEX "stock_purchase_requests_requestedBy_idx" ON "stock_purchase_requests"("requestedBy");

-- CreateIndex
CREATE INDEX "stock_purchase_requests_createdAt_idx" ON "stock_purchase_requests"("createdAt");

-- CreateIndex
CREATE INDEX "stock_purchase_requests_stockBudgetId_idx" ON "stock_purchase_requests"("stockBudgetId");

-- CreateIndex
CREATE INDEX "stock_budgets_ano_mes_idx" ON "stock_budgets"("ano", "mes");

-- CreateIndex
CREATE INDEX "stock_budgets_active_idx" ON "stock_budgets"("active");

-- CreateIndex
CREATE UNIQUE INDEX "stock_budgets_categoriaEnum_categoriaCustomId_ano_mes_key" ON "stock_budgets"("categoriaEnum", "categoriaCustomId", "ano", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "acao_stock_budgets_acaoId_key" ON "acao_stock_budgets"("acaoId");

-- CreateIndex
CREATE INDEX "acao_stock_budgets_active_idx" ON "acao_stock_budgets"("active");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_studentId_classId_key" ON "certificates"("studentId", "classId");

-- CreateIndex
CREATE INDEX "course_feedbacks_rewardStatus_idx" ON "course_feedbacks"("rewardStatus");

-- CreateIndex
CREATE INDEX "courses_institutionId_idx" ON "courses"("institutionId");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_originCityId_fkey" FOREIGN KEY ("originCityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acoes" ADD CONSTRAINT "acoes_originCidadeId_fkey" FOREIGN KEY ("originCidadeId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acao_stock_reservations" ADD CONSTRAINT "acao_stock_reservations_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES "acoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acao_stock_reservations" ADD CONSTRAINT "acao_stock_reservations_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acao_stock_reservations" ADD CONSTRAINT "acao_stock_reservations_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_checkins" ADD CONSTRAINT "driver_checkins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_categories" ADD CONSTRAINT "stock_categories_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_customCategoryId_fkey" FOREIGN KEY ("customCategoryId") REFERENCES "stock_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_stock_items" ADD CONSTRAINT "truck_stock_items_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_stock_items" ADD CONSTRAINT "truck_stock_items_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_fromTruckId_fkey" FOREIGN KEY ("fromTruckId") REFERENCES "trucks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_toTruckId_fkey" FOREIGN KEY ("toTruckId") REFERENCES "trucks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES "acoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "stock_purchase_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_purchase_requests" ADD CONSTRAINT "stock_purchase_requests_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_purchase_requests" ADD CONSTRAINT "stock_purchase_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_purchase_requests" ADD CONSTRAINT "stock_purchase_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_purchase_requests" ADD CONSTRAINT "stock_purchase_requests_contaPagarId_fkey" FOREIGN KEY ("contaPagarId") REFERENCES "contas_pagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_purchase_requests" ADD CONSTRAINT "stock_purchase_requests_stockBudgetId_fkey" FOREIGN KEY ("stockBudgetId") REFERENCES "stock_budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_budgets" ADD CONSTRAINT "stock_budgets_categoriaCustomId_fkey" FOREIGN KEY ("categoriaCustomId") REFERENCES "stock_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_budgets" ADD CONSTRAINT "stock_budgets_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acao_stock_budgets" ADD CONSTRAINT "acao_stock_budgets_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES "acoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acao_stock_budgets" ADD CONSTRAINT "acao_stock_budgets_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

