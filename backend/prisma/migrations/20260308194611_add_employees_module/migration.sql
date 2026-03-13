-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('INSTRUCTOR', 'DRIVER', 'COORDINATOR', 'NURSE', 'TECHNICIAN', 'ADMINISTRATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "EmployeeDepartment" AS ENUM ('ACADEMIC', 'OPERATIONS', 'HEALTH', 'FINANCIAL', 'ADMINISTRATION', 'LOGISTICS');

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL,
    "department" "EmployeeDepartment" NOT NULL,
    "cpf" TEXT,
    "rg" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "specialty" TEXT,
    "dailyCost" DECIMAL(10,2),
    "hireDate" TIMESTAMP(3),
    "notes" TEXT,
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_cpf_key" ON "employees"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "employees_role_idx" ON "employees"("role");

-- CreateIndex
CREATE INDEX "employees_department_idx" ON "employees"("department");

-- CreateIndex
CREATE INDEX "employees_active_idx" ON "employees"("active");
