-- UX-15: snapshot da data de término antes do empurrão por feriado/imprevisto
-- IF NOT EXISTS: evita falha quando a coluna já foi criada manualmente ou por db push
ALTER TABLE "class_holidays" ADD COLUMN IF NOT EXISTS "endDateBeforePush" TIMESTAMP(3);
