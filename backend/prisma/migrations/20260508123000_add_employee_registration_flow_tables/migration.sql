DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        WHERE t.typname = 'RegistrationStatus'
    ) THEN
        CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "employee_registration_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL,
    "department" "EmployeeDepartment" NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_registration_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "employee_registration_tokens_token_key"
    ON "employee_registration_tokens"("token");

CREATE INDEX IF NOT EXISTS "employee_registration_tokens_token_idx"
    ON "employee_registration_tokens"("token");

CREATE TABLE IF NOT EXISTS "employee_registration_requests" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "submittedData" JSONB NOT NULL,
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_registration_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "employee_registration_requests_tokenId_key"
    ON "employee_registration_requests"("tokenId");

CREATE UNIQUE INDEX IF NOT EXISTS "employee_registration_requests_cpf_key"
    ON "employee_registration_requests"("cpf");

CREATE UNIQUE INDEX IF NOT EXISTS "employee_registration_requests_email_key"
    ON "employee_registration_requests"("email");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'employee_registration_tokens_createdBy_fkey'
    ) THEN
        ALTER TABLE "employee_registration_tokens"
            ADD CONSTRAINT "employee_registration_tokens_createdBy_fkey"
            FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'employee_registration_requests_tokenId_fkey'
    ) THEN
        ALTER TABLE "employee_registration_requests"
            ADD CONSTRAINT "employee_registration_requests_tokenId_fkey"
            FOREIGN KEY ("tokenId") REFERENCES "employee_registration_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'employee_registration_requests_reviewedBy_fkey'
    ) THEN
        ALTER TABLE "employee_registration_requests"
            ADD CONSTRAINT "employee_registration_requests_reviewedBy_fkey"
            FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
