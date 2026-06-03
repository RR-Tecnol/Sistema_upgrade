-- Migration: adiciona MATERIAL_FABRICACAO ao enum StockItemCategory
-- Execute com: npx prisma db execute --file prisma/migrations/add_material_fabricacao_category.sql

ALTER TYPE "StockItemCategory" ADD VALUE IF NOT EXISTS 'MATERIAL_FABRICACAO';
