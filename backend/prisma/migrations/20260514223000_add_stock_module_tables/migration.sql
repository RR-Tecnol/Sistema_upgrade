-- CreateEnum
CREATE TYPE "StockItemCategory" AS ENUM ('CONSUMIVEL', 'DIDATICO', 'LIMPEZA', 'EQUIPAMENTO', 'EPI', 'ALIMENTACAO', 'ESCRITORIO', 'OUTRO');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'DEVOLUCAO', 'AJUSTE', 'PERDA', 'REPOSICAO', 'ENCOMENDA');

-- CreateEnum
CREATE TYPE "StockPurchaseRequestStatus" AS ENUM ('PENDENTE', 'APROVADA', 'RECEBIDA', 'REJEITADA', 'CANCELADA');

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
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_purchase_requests_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "acao_stock_reservations_acaoId_idx" ON "acao_stock_reservations"("acaoId");

-- CreateIndex
CREATE INDEX "acao_stock_reservations_stockItemId_idx" ON "acao_stock_reservations"("stockItemId");

-- CreateIndex
CREATE INDEX "acao_stock_reservations_truckId_idx" ON "acao_stock_reservations"("truckId");

-- CreateIndex
CREATE UNIQUE INDEX "acao_stock_reservations_acaoId_stockItemId_key" ON "acao_stock_reservations"("acaoId", "stockItemId");

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
ALTER TABLE "acao_stock_reservations" ADD CONSTRAINT "acao_stock_reservations_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES "acoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acao_stock_reservations" ADD CONSTRAINT "acao_stock_reservations_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acao_stock_reservations" ADD CONSTRAINT "acao_stock_reservations_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
