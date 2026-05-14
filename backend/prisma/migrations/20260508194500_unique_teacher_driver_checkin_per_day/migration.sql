-- Um único registo de ponto por utilizador por dia (professor / motorista)

-- teacher_checkins: remover duplicados (mantém o mais antigo por checkedAt)
DELETE FROM "teacher_checkins" AS t
USING (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY "userId", date ORDER BY "checkedAt" ASC) AS rn
        FROM "teacher_checkins"
    ) AS ranked
    WHERE ranked.rn > 1
) AS dup
WHERE t.id = dup.id;

DROP INDEX IF EXISTS "teacher_checkins_userId_date_idx";

CREATE UNIQUE INDEX "teacher_checkins_userId_date_key" ON "teacher_checkins"("userId", date);

-- driver_checkins: só se a tabela existir (alguns ambientes legados)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'driver_checkins'
    ) THEN
        DELETE FROM "driver_checkins" AS d
        USING (
            SELECT id
            FROM (
                SELECT id,
                       ROW_NUMBER() OVER (PARTITION BY "userId", date ORDER BY "checkedAt" ASC) AS rn
                FROM "driver_checkins"
            ) AS ranked
            WHERE ranked.rn > 1
        ) AS dup
        WHERE d.id = dup.id;

        DROP INDEX IF EXISTS "driver_checkins_userId_date_idx";

        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE indexname = 'driver_checkins_userId_date_key'
        ) THEN
            CREATE UNIQUE INDEX "driver_checkins_userId_date_key" ON "driver_checkins"("userId", date);
        END IF;
    END IF;
END $$;
