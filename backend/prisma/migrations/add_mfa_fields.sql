-- ⚠️ LEGADO: estes nomes em snake_case NÃO batem com o Prisma atual (campos camelCase em "users").
-- Preferir migration versionada em prisma/migrations/ ou comandos gerados por `prisma migrate`.
-- Para alinhar ao schema Prisma 2026, usar por exemplo:
-- ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailOtpHash" TEXT;
-- ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailOtpExpiresAt" TIMESTAMP(3);
-- ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailOtpAttempts" INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "requiresTwoFactorSetup" BOOLEAN NOT NULL DEFAULT false;
-- ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "requiresPasswordChange" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS requires_two_factor_setup BOOLEAN DEFAULT FALSE;
UPDATE users SET requires_two_factor_setup = TRUE WHERE role IN ('ADMIN','COORDINATOR','FINANCIAL','TEACHER','DRIVER') AND "twoFactorEnabled" = FALSE;
