CREATE TYPE "ContaPagarOrigem" AS ENUM ('OPERACIONAL', 'FABRICACAO');
ALTER TABLE "contas_pagar" ADD COLUMN IF NOT EXISTS "origem" "ContaPagarOrigem" NOT NULL DEFAULT 'OPERACIONAL';
ALTER TABLE "contas_pagar" ADD COLUMN IF NOT EXISTS "producaoId" TEXT;
CREATE INDEX "contas_pagar_origem_idx" ON "contas_pagar"("origem");
