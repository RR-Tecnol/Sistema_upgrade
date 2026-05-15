-- Preferência por utilizador: desactivar OTP por e-mail no login (TOTP/setup mantém-se quando exigido)
ALTER TABLE "users" ADD COLUMN "emailOtpEnabled" BOOLEAN NOT NULL DEFAULT true;
