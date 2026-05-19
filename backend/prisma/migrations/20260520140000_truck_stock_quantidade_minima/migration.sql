-- Mínimo de estoque por carreta (independente do mínimo da central em stock_items)
ALTER TABLE "truck_stock_items" ADD COLUMN IF NOT EXISTS "quantidadeMinima" DECIMAL(12,3) NOT NULL DEFAULT 0;
