/*
  Warnings:

  - Added the required column `cidadeNome` to the `acoes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ContaPagarStatus" AS ENUM ('pendente', 'paga', 'vencida', 'cancelada');

-- DropForeignKey
ALTER TABLE "acoes" DROP CONSTRAINT "acoes_cidadeId_fkey";

-- AlterTable
ALTER TABLE "acoes" ADD COLUMN     "cidadeNome" TEXT NOT NULL,
ALTER COLUMN "cidadeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "contas_pagar" (
    "id" TEXT NOT NULL,
    "tipo_conta" TEXT NOT NULL,
    "tipo_espontaneo" TEXT,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "data_pagamento" TIMESTAMP(3),
    "status" "ContaPagarStatus" NOT NULL DEFAULT 'pendente',
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "comprovante_url" TEXT,
    "cidade" TEXT,
    "acaoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contas_pagar_status_idx" ON "contas_pagar"("status");

-- CreateIndex
CREATE INDEX "contas_pagar_tipo_conta_idx" ON "contas_pagar"("tipo_conta");

-- CreateIndex
CREATE INDEX "contas_pagar_acaoId_idx" ON "contas_pagar"("acaoId");

-- CreateIndex
CREATE INDEX "contas_pagar_data_vencimento_idx" ON "contas_pagar"("data_vencimento");

-- AddForeignKey
ALTER TABLE "acoes" ADD CONSTRAINT "acoes_cidadeId_fkey" FOREIGN KEY ("cidadeId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES "acoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
