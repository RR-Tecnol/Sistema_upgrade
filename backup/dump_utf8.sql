--
-- PostgreSQL database dump
--

\restrict VUdrT6eXzSK2aXRqlKeL1NY4gfvZLnAougSxQhN8HoBHB5piQl0VYehL8CZGzcW

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: cursos_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO cursos_user;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: cursos_user
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AcaoCustoTipo; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."AcaoCustoTipo" AS ENUM (
    'ABASTECIMENTO',
    'DESPESA_GERAL',
    'DIARIA_FUNCIONARIO'
);


ALTER TYPE public."AcaoCustoTipo" OWNER TO cursos_user;

--
-- Name: AcaoStatus; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."AcaoStatus" AS ENUM (
    'PLANEJADA',
    'EM_ANDAMENTO',
    'CONCLUIDA',
    'CANCELADA'
);


ALTER TYPE public."AcaoStatus" OWNER TO cursos_user;

--
-- Name: CareerGoal; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."CareerGoal" AS ENUM (
    'SEEK_EMPLOYMENT',
    'ENTREPRENEURSHIP',
    'SELF_EMPLOYED',
    'NOT_SURE',
    'OTHER'
);


ALTER TYPE public."CareerGoal" OWNER TO cursos_user;

--
-- Name: CertificateStatus; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."CertificateStatus" AS ENUM (
    'ACTIVE',
    'CANCELLED'
);


ALTER TYPE public."CertificateStatus" OWNER TO cursos_user;

--
-- Name: ClassStatus; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."ClassStatus" AS ENUM (
    'PLANNED',
    'ENROLLMENT_OPEN',
    'ENROLLMENT_CLOSED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."ClassStatus" OWNER TO cursos_user;

--
-- Name: ContaPagarStatus; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."ContaPagarStatus" AS ENUM (
    'pendente',
    'paga',
    'vencida',
    'cancelada'
);


ALTER TYPE public."ContaPagarStatus" OWNER TO cursos_user;

--
-- Name: ContractType; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."ContractType" AS ENUM (
    'CLT',
    'PJ',
    'FREELANCE'
);


ALTER TYPE public."ContractType" OWNER TO cursos_user;

--
-- Name: DeliveryStatus; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."DeliveryStatus" AS ENUM (
    'PENDING',
    'SENT',
    'DELIVERED',
    'FAILED'
);


ALTER TYPE public."DeliveryStatus" OWNER TO cursos_user;

--
-- Name: DisabilityType; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."DisabilityType" AS ENUM (
    'NONE',
    'VISUAL',
    'HEARING',
    'PHYSICAL',
    'INTELLECTUAL',
    'MULTIPLE',
    'OTHER'
);


ALTER TYPE public."DisabilityType" OWNER TO cursos_user;

--
-- Name: DocumentType; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."DocumentType" AS ENUM (
    'PHOTO',
    'RG_FRONT',
    'RG_BACK',
    'CPF',
    'ADDRESS_PROOF',
    'EDUCATION_PROOF'
);


ALTER TYPE public."DocumentType" OWNER TO cursos_user;

--
-- Name: EducationLevel; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."EducationLevel" AS ENUM (
    'NO_FORMAL_EDUCATION',
    'ELEMENTARY_INCOMPLETE',
    'ELEMENTARY_COMPLETE',
    'HIGH_SCHOOL_INCOMPLETE',
    'HIGH_SCHOOL_COMPLETE',
    'HIGHER_INCOMPLETE',
    'HIGHER_COMPLETE',
    'POSTGRADUATE'
);


ALTER TYPE public."EducationLevel" OWNER TO cursos_user;

--
-- Name: EmployeeDepartment; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."EmployeeDepartment" AS ENUM (
    'ACADEMIC',
    'OPERATIONS',
    'HEALTH',
    'FINANCIAL',
    'ADMINISTRATION',
    'LOGISTICS'
);


ALTER TYPE public."EmployeeDepartment" OWNER TO cursos_user;

--
-- Name: EmployeeRole; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."EmployeeRole" AS ENUM (
    'INSTRUCTOR',
    'DRIVER',
    'COORDINATOR',
    'NURSE',
    'TECHNICIAN',
    'ADMINISTRATIVE',
    'OTHER'
);


ALTER TYPE public."EmployeeRole" OWNER TO cursos_user;

--
-- Name: EmploymentStatus; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."EmploymentStatus" AS ENUM (
    'EMPLOYED_CLT',
    'EMPLOYED_PJ',
    'SELF_EMPLOYED',
    'UNEMPLOYED',
    'STUDENT',
    'HOMEMAKER',
    'RETIRED',
    'OTHER'
);


ALTER TYPE public."EmploymentStatus" OWNER TO cursos_user;

--
-- Name: EnrollmentStatus; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."EnrollmentStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'DOCUMENT_PENDING',
    'WAITLIST',
    'ENROLLED',
    'DROPOUT'
);


ALTER TYPE public."EnrollmentStatus" OWNER TO cursos_user;

--
-- Name: ExpenseCategory; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."ExpenseCategory" AS ENUM (
    'FUEL',
    'FOOD',
    'TOLL',
    'MAINTENANCE',
    'LODGING',
    'MATERIALS',
    'OTHER'
);


ALTER TYPE public."ExpenseCategory" OWNER TO cursos_user;

--
-- Name: ExpenseStatus; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."ExpenseStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."ExpenseStatus" OWNER TO cursos_user;

--
-- Name: FamilyIncome; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."FamilyIncome" AS ENUM (
    'UP_TO_1_MW',
    'FROM_1_TO_2_MW',
    'FROM_2_TO_3_MW',
    'FROM_3_TO_5_MW',
    'ABOVE_5_MW',
    'PREFER_NOT_TO_SAY'
);


ALTER TYPE public."FamilyIncome" OWNER TO cursos_user;

--
-- Name: Gender; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."Gender" AS ENUM (
    'MALE',
    'FEMALE',
    'NON_BINARY',
    'PREFER_NOT_TO_SAY'
);


ALTER TYPE public."Gender" OWNER TO cursos_user;

--
-- Name: MaritalStatus; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."MaritalStatus" AS ENUM (
    'SINGLE',
    'MARRIED',
    'DIVORCED',
    'WIDOWED',
    'SEPARATED'
);


ALTER TYPE public."MaritalStatus" OWNER TO cursos_user;

--
-- Name: MaterialVisibility; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."MaterialVisibility" AS ENUM (
    'PUBLIC',
    'COURSE_RESTRICTED',
    'CLASS_RESTRICTED',
    'PRIVATE'
);


ALTER TYPE public."MaterialVisibility" OWNER TO cursos_user;

--
-- Name: NotificationChannel; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."NotificationChannel" AS ENUM (
    'IN_APP',
    'EMAIL',
    'SMS',
    'WHATSAPP'
);


ALTER TYPE public."NotificationChannel" OWNER TO cursos_user;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."NotificationType" AS ENUM (
    'ENROLLMENT_RECEIVED',
    'ENROLLMENT_APPROVED',
    'ENROLLMENT_REJECTED',
    'COURSE_REMINDER',
    'CLASS_REMINDER',
    'CLASS_CANCELLED',
    'ABSENCE_REGISTERED',
    'EXCESSIVE_ABSENCES',
    'MATERIAL_AVAILABLE',
    'CERTIFICATE_AVAILABLE',
    'JUSTIFICATION_APPROVED',
    'JUSTIFICATION_REJECTED',
    'GENERAL_ANNOUNCEMENT'
);


ALTER TYPE public."NotificationType" OWNER TO cursos_user;

--
-- Name: Period; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."Period" AS ENUM (
    'MORNING',
    'AFTERNOON',
    'EVENING'
);


ALTER TYPE public."Period" OWNER TO cursos_user;

--
-- Name: RaceColor; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."RaceColor" AS ENUM (
    'WHITE',
    'BLACK',
    'BROWN',
    'YELLOW',
    'INDIGENOUS',
    'PREFER_NOT_TO_SAY'
);


ALTER TYPE public."RaceColor" OWNER TO cursos_user;

--
-- Name: SocialProgram; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."SocialProgram" AS ENUM (
    'NONE',
    'BOLSA_FAMILIA',
    'BPC',
    'AUXILIO_BRASIL',
    'OTHER'
);


ALTER TYPE public."SocialProgram" OWNER TO cursos_user;

--
-- Name: TripStatus; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."TripStatus" AS ENUM (
    'PLANNED',
    'IN_TRANSIT',
    'COMPLETED'
);


ALTER TYPE public."TripStatus" OWNER TO cursos_user;

--
-- Name: TruckStatus; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."TruckStatus" AS ENUM (
    'AVAILABLE',
    'IN_USE',
    'MAINTENANCE',
    'INACTIVE'
);


ALTER TYPE public."TruckStatus" OWNER TO cursos_user;

--
-- Name: TruckType; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."TruckType" AS ENUM (
    'STANDARD',
    'MULTICOURSE'
);


ALTER TYPE public."TruckType" OWNER TO cursos_user;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'COORDINATOR',
    'FINANCIAL',
    'TEACHER',
    'STUDENT'
);


ALTER TYPE public."UserRole" OWNER TO cursos_user;

--
-- Name: Zone; Type: TYPE; Schema: public; Owner: cursos_user
--

CREATE TYPE public."Zone" AS ENUM (
    'URBAN',
    'RURAL'
);


ALTER TYPE public."Zone" OWNER TO cursos_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO cursos_user;

--
-- Name: acao_custos; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.acao_custos (
    id text NOT NULL,
    "acaoId" text NOT NULL,
    tipo public."AcaoCustoTipo" NOT NULL,
    descricao text NOT NULL,
    valor numeric(10,2) NOT NULL,
    data timestamp(3) without time zone NOT NULL,
    litros numeric(10,2),
    "funcionarioId" text,
    observacoes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.acao_custos OWNER TO cursos_user;

--
-- Name: acao_equipe; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.acao_equipe (
    id text NOT NULL,
    "acaoId" text NOT NULL,
    "userId" text NOT NULL,
    funcao text NOT NULL,
    diaria numeric(10,2) NOT NULL,
    "diasTrabalhados" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.acao_equipe OWNER TO cursos_user;

--
-- Name: acao_funcionarios; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.acao_funcionarios (
    id text NOT NULL,
    "acaoId" text NOT NULL,
    "employeeId" text NOT NULL,
    "valorDiaria" numeric(10,2) NOT NULL,
    "diasTrabalhados" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.acao_funcionarios OWNER TO cursos_user;

--
-- Name: acao_turmas; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.acao_turmas (
    id text NOT NULL,
    "acaoId" text NOT NULL,
    "turmaId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.acao_turmas OWNER TO cursos_user;

--
-- Name: acoes; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.acoes (
    id text NOT NULL,
    nome text NOT NULL,
    "cidadeId" text,
    "grupoId" text NOT NULL,
    "carretaId" text,
    status public."AcaoStatus" DEFAULT 'PLANEJADA'::public."AcaoStatus" NOT NULL,
    "dataInicio" timestamp(3) without time zone NOT NULL,
    "dataFim" timestamp(3) without time zone NOT NULL,
    "localExecucao" text,
    "distanciaKm" numeric(10,2),
    "precoCombustivelL" numeric(10,2),
    "autonomiaKmL" numeric(10,2),
    observacoes text,
    "permitirInscricoes" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "cidadeNome" text NOT NULL
);


ALTER TABLE public.acoes OWNER TO cursos_user;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.api_keys (
    id text NOT NULL,
    name text NOT NULL,
    key text NOT NULL,
    permissions jsonb,
    active boolean DEFAULT true NOT NULL,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUsedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone
);


ALTER TABLE public.api_keys OWNER TO cursos_user;

--
-- Name: attendance_justifications; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.attendance_justifications (
    id text NOT NULL,
    "attendanceId" text NOT NULL,
    reason text NOT NULL,
    details text,
    "proofUrl" text,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."EnrollmentStatus" DEFAULT 'PENDING'::public."EnrollmentStatus" NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "reviewNotes" text
);


ALTER TABLE public.attendance_justifications OWNER TO cursos_user;

--
-- Name: attendances; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.attendances (
    id text NOT NULL,
    "classId" text NOT NULL,
    "studentId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    present boolean NOT NULL,
    justified boolean DEFAULT false NOT NULL,
    justification text,
    "registeredBy" text NOT NULL,
    "registeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "classNotes" text,
    "classPhotoUrl" text
);


ALTER TABLE public.attendances OWNER TO cursos_user;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    "tableName" text NOT NULL,
    "recordId" text,
    "oldData" jsonb,
    "newData" jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO cursos_user;

--
-- Name: certificates; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.certificates (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "classId" text NOT NULL,
    "verificationCode" text NOT NULL,
    "qrCodeUrl" text,
    "fileUrl" text NOT NULL,
    "issuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "issuedBy" text NOT NULL,
    status public."CertificateStatus" DEFAULT 'ACTIVE'::public."CertificateStatus" NOT NULL,
    "cancellationReason" text,
    "cancelledAt" timestamp(3) without time zone,
    "cancelledBy" text
);


ALTER TABLE public.certificates OWNER TO cursos_user;

--
-- Name: cities; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.cities (
    id text NOT NULL,
    name text NOT NULL,
    state text NOT NULL,
    "ibgeCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.cities OWNER TO cursos_user;

--
-- Name: class_schedules; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.class_schedules (
    id text NOT NULL,
    "classId" text NOT NULL,
    weekday integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.class_schedules OWNER TO cursos_user;

--
-- Name: class_teachers; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.class_teachers (
    id text NOT NULL,
    "classId" text NOT NULL,
    "teacherId" text NOT NULL,
    "isSubstitute" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.class_teachers OWNER TO cursos_user;

--
-- Name: classes; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.classes (
    id text NOT NULL,
    "courseId" text NOT NULL,
    "groupId" text NOT NULL,
    "cityId" text NOT NULL,
    "classIdentifier" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    period public."Period" NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    vacancies integer NOT NULL,
    "truckId" text,
    status public."ClassStatus" DEFAULT 'PLANNED'::public."ClassStatus" NOT NULL,
    "enrollmentOpenDate" timestamp(3) without time zone,
    "enrollmentCloseDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.classes OWNER TO cursos_user;

--
-- Name: contas_pagar; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.contas_pagar (
    id text NOT NULL,
    tipo_conta text NOT NULL,
    tipo_espontaneo text,
    descricao text NOT NULL,
    valor numeric(10,2) NOT NULL,
    data_vencimento timestamp(3) without time zone NOT NULL,
    data_pagamento timestamp(3) without time zone,
    status public."ContaPagarStatus" DEFAULT 'pendente'::public."ContaPagarStatus" NOT NULL,
    recorrente boolean DEFAULT false NOT NULL,
    observacoes text,
    comprovante_url text,
    cidade text,
    "acaoId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.contas_pagar OWNER TO cursos_user;

--
-- Name: course_modules; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.course_modules (
    id text NOT NULL,
    "courseId" text NOT NULL,
    "moduleName" text NOT NULL,
    room integer NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    "order" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.course_modules OWNER TO cursos_user;

--
-- Name: courses; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.courses (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    "durationDaysMA" integer NOT NULL,
    "durationDaysPI" integer NOT NULL,
    "workloadHours" integer NOT NULL,
    prerequisites text,
    syllabus text NOT NULL,
    "availableInMA" boolean DEFAULT true NOT NULL,
    "availableInPI" boolean DEFAULT true NOT NULL,
    "isMulticourse" boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.courses OWNER TO cursos_user;

--
-- Name: data_deletion_requests; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.data_deletion_requests (
    id text NOT NULL,
    "userId" text NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "processedBy" text,
    status text DEFAULT 'PENDING'::text NOT NULL
);


ALTER TABLE public.data_deletion_requests OWNER TO cursos_user;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.employees (
    id text NOT NULL,
    name text NOT NULL,
    role public."EmployeeRole" NOT NULL,
    department public."EmployeeDepartment" NOT NULL,
    cpf text,
    rg text,
    phone text,
    email text,
    specialty text,
    "dailyCost" numeric(10,2),
    "hireDate" timestamp(3) without time zone,
    notes text,
    "photoUrl" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.employees OWNER TO cursos_user;

--
-- Name: enrollment_consents; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.enrollment_consents (
    id text NOT NULL,
    "enrollmentId" text NOT NULL,
    "dataProcessing" boolean DEFAULT false NOT NULL,
    "imageUse" boolean DEFAULT false NOT NULL,
    "termsAccepted" boolean DEFAULT false NOT NULL,
    "privacyPolicyAccepted" boolean DEFAULT false NOT NULL,
    "consentDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text,
    "userAgent" text
);


ALTER TABLE public.enrollment_consents OWNER TO cursos_user;

--
-- Name: enrollment_documents; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.enrollment_documents (
    id text NOT NULL,
    "enrollmentId" text NOT NULL,
    "documentType" public."DocumentType" NOT NULL,
    "fileUrl" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.enrollment_documents OWNER TO cursos_user;

--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.enrollments (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "classId" text NOT NULL,
    protocol text NOT NULL,
    status public."EnrollmentStatus" DEFAULT 'PENDING'::public."EnrollmentStatus" NOT NULL,
    "enrolledAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewedAt" timestamp(3) without time zone,
    "reviewedBy" text,
    "rejectionReason" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.enrollments OWNER TO cursos_user;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.expenses (
    id text NOT NULL,
    "tripId" text,
    "truckId" text NOT NULL,
    category public."ExpenseCategory" NOT NULL,
    subcategory text,
    amount numeric(10,2) NOT NULL,
    description text NOT NULL,
    "receiptUrl" text,
    "expenseDate" timestamp(3) without time zone NOT NULL,
    "responsibleUserId" text NOT NULL,
    status public."ExpenseStatus" DEFAULT 'PENDING'::public."ExpenseStatus" NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.expenses OWNER TO cursos_user;

--
-- Name: groups; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.groups (
    id text NOT NULL,
    name text NOT NULL,
    state text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.groups OWNER TO cursos_user;

--
-- Name: material_comments; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.material_comments (
    id text NOT NULL,
    "materialId" text NOT NULL,
    "userId" text NOT NULL,
    comment text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.material_comments OWNER TO cursos_user;

--
-- Name: materials; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.materials (
    id text NOT NULL,
    "courseId" text,
    "classId" text,
    "teacherId" text,
    title text NOT NULL,
    description text,
    "fileUrl" text NOT NULL,
    "fileType" text NOT NULL,
    "fileSize" integer NOT NULL,
    tags text,
    visibility public."MaterialVisibility" DEFAULT 'PUBLIC'::public."MaterialVisibility" NOT NULL,
    "visibleFrom" timestamp(3) without time zone,
    "uploadedBy" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "downloadCount" integer DEFAULT 0 NOT NULL,
    "viewCount" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.materials OWNER TO cursos_user;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    "userId" text NOT NULL,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    channel public."NotificationChannel" NOT NULL,
    data jsonb,
    "sentAt" timestamp(3) without time zone,
    "readAt" timestamp(3) without time zone,
    "clickedAt" timestamp(3) without time zone,
    "deliveryStatus" public."DeliveryStatus" DEFAULT 'PENDING'::public."DeliveryStatus" NOT NULL,
    "errorMessage" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notifications OWNER TO cursos_user;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.refresh_tokens (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO cursos_user;

--
-- Name: student_addresses; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.student_addresses (
    id text NOT NULL,
    "studentId" text NOT NULL,
    cep text NOT NULL,
    street text NOT NULL,
    number text NOT NULL,
    complement text,
    neighborhood text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zone public."Zone" NOT NULL
);


ALTER TABLE public.student_addresses OWNER TO cursos_user;

--
-- Name: student_contacts; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.student_contacts (
    id text NOT NULL,
    "studentId" text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    "hasWhatsapp" boolean DEFAULT false NOT NULL,
    "phoneAlt" text,
    "allowWhatsappContact" boolean DEFAULT true NOT NULL,
    "allowEmailContact" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.student_contacts OWNER TO cursos_user;

--
-- Name: student_professional; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.student_professional (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "previousQualification" text,
    "professionalInterest" text,
    "howHeardAbout" text,
    motivation text NOT NULL,
    "careerGoal" public."CareerGoal" NOT NULL
);


ALTER TABLE public.student_professional OWNER TO cursos_user;

--
-- Name: student_socioeconomic; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.student_socioeconomic (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "educationLevel" public."EducationLevel" NOT NULL,
    "employmentStatus" public."EmploymentStatus" NOT NULL,
    "familyMembersCount" integer NOT NULL,
    "socialProgram" public."SocialProgram",
    "hasDisability" boolean DEFAULT false NOT NULL,
    "disabilityType" public."DisabilityType",
    "disabilityAdaptation" boolean,
    "familyIncome" public."FamilyIncome" NOT NULL
);


ALTER TABLE public.student_socioeconomic OWNER TO cursos_user;

--
-- Name: students; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.students (
    id text NOT NULL,
    "userId" text NOT NULL,
    cpf text NOT NULL,
    rg text NOT NULL,
    "rgIssuer" text NOT NULL,
    "birthDate" timestamp(3) without time zone NOT NULL,
    gender public."Gender" NOT NULL,
    "raceColor" public."RaceColor" NOT NULL,
    "maritalStatus" public."MaritalStatus" NOT NULL,
    "motherName" text NOT NULL,
    "fatherName" text,
    nationality text NOT NULL,
    "birthCity" text NOT NULL,
    "birthState" text NOT NULL,
    "photoUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "socialName" text
);


ALTER TABLE public.students OWNER TO cursos_user;

--
-- Name: system_configs; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.system_configs (
    id text NOT NULL,
    "configKey" text NOT NULL,
    "configValue" text NOT NULL,
    "dataType" text NOT NULL,
    description text,
    "updatedBy" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.system_configs OWNER TO cursos_user;

--
-- Name: teacher_courses; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.teacher_courses (
    id text NOT NULL,
    "teacherId" text NOT NULL,
    "courseId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.teacher_courses OWNER TO cursos_user;

--
-- Name: teachers; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.teachers (
    id text NOT NULL,
    "userId" text NOT NULL,
    cpf text NOT NULL,
    rg text NOT NULL,
    "birthDate" timestamp(3) without time zone NOT NULL,
    "photoUrl" text,
    education text NOT NULL,
    specialties text NOT NULL,
    experience text,
    certifications text,
    "resumeUrl" text,
    availability jsonb,
    "preferredRegion" text,
    "contractType" public."ContractType" NOT NULL,
    "hireDate" timestamp(3) without time zone NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.teachers OWNER TO cursos_user;

--
-- Name: trips; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.trips (
    id text NOT NULL,
    "truckId" text NOT NULL,
    "originCityId" text NOT NULL,
    "destinationCityId" text NOT NULL,
    "departureDate" timestamp(3) without time zone NOT NULL,
    "expectedArrivalDate" timestamp(3) without time zone NOT NULL,
    "actualArrivalDate" timestamp(3) without time zone,
    "driverName" text NOT NULL,
    "driverPhone" text,
    "kmStart" integer,
    "kmEnd" integer,
    status public."TripStatus" DEFAULT 'PLANNED'::public."TripStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.trips OWNER TO cursos_user;

--
-- Name: truck_maintenances; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.truck_maintenances (
    id text NOT NULL,
    "truckId" text NOT NULL,
    tipo text NOT NULL,
    titulo text NOT NULL,
    descricao text,
    status text DEFAULT 'agendada'::text NOT NULL,
    prioridade text DEFAULT 'media'::text NOT NULL,
    "kmAtual" integer,
    "kmProximo" integer,
    "dataAgendada" timestamp(3) without time zone,
    "dataConclusao" timestamp(3) without time zone,
    "custoEstimado" numeric(10,2),
    "custoReal" numeric(10,2),
    "statusPagamento" text DEFAULT 'pendente'::text,
    fornecedor text,
    responsavel text,
    observacoes text,
    "contaPagarId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.truck_maintenances OWNER TO cursos_user;

--
-- Name: trucks; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.trucks (
    id text NOT NULL,
    identifier text NOT NULL,
    "licensePlate" text NOT NULL,
    type public."TruckType" NOT NULL,
    "groupId" text NOT NULL,
    state text NOT NULL,
    capacity integer NOT NULL,
    "roomsCount" integer DEFAULT 1 NOT NULL,
    status public."TruckStatus" DEFAULT 'AVAILABLE'::public."TruckStatus" NOT NULL,
    "modelYear" text,
    "lastMaintenanceDate" timestamp(3) without time zone,
    "nextMaintenanceDate" timestamp(3) without time zone,
    "photoUrl" text,
    "equipmentList" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.trucks OWNER TO cursos_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: cursos_user
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    phone text,
    role public."UserRole" NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    cpf text
);


ALTER TABLE public.users OWNER TO cursos_user;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
07961a0f-b8a4-41a7-8a51-5d9dc83977e0	b1c9156557481a4826f38910f2649958fa6dd31937e9cf2d48ddc1e7c2fd5607	2026-03-07 14:39:08.406503+00	20260217191645_init	\N	\N	2026-03-07 14:39:07.782744+00	1
74fe138e-7393-4b56-8813-6ca29f81148d	ecc0bc35c9215256cfb5638d72a804f5b653b087f5d853fd6f38c6b3d2636adc	2026-03-07 14:39:08.450065+00	20260217205047_add_cpf_to_user	\N	\N	2026-03-07 14:39:08.409541+00	1
43de916d-1e76-4a44-9167-006bf41910e4	d30f7427cd9154abde55349d661a89d23fc0b51fa90bbdd88a8b0e1220cb0c7e	2026-03-07 14:39:08.552486+00	20260306184401_add_acoes_module	\N	\N	2026-03-07 14:39:08.45313+00	1
fca09978-791d-4fe1-9a07-3972b9e977ca	ce049767258da023fa29a28b9c26a326786fdf40f9f59a892b6d51be6d1e6e99	2026-03-07 14:39:10.830793+00	20260307143910_add_contas_pagar	\N	\N	2026-03-07 14:39:10.782732+00	1
295f971e-6e68-4341-a0cd-7187dc6a9951	71c3ea83064d1b94087355a00475c1cfad94f8c26da5ff40cd101dd5482ac088	2026-03-07 19:15:18.538649+00	20260307191518_add_truck_maintenance	\N	\N	2026-03-07 19:15:18.497637+00	1
9f7fc871-1a60-4c59-b7b6-afc95fe5c240	a94a03f952f19b205f60abe3726904bf695d1f1002830427a521dbed0042336b	2026-03-08 19:46:11.967987+00	20260308194611_add_employees_module	\N	\N	2026-03-08 19:46:11.90558+00	1
c9790c6f-e041-459f-9dde-f3f73660bc09	0fedeee46bec6829cca39b2d512c72744ce15813181ef4a0e02bd5e90408da1a	2026-03-08 20:15:08.931195+00	20260308201508_add_acao_funcionario	\N	\N	2026-03-08 20:15:08.796734+00	1
\.


--
-- Data for Name: acao_custos; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.acao_custos (id, "acaoId", tipo, descricao, valor, data, litros, "funcionarioId", observacoes, "createdAt") FROM stdin;
\.


--
-- Data for Name: acao_equipe; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.acao_equipe (id, "acaoId", "userId", funcao, diaria, "diasTrabalhados", "createdAt") FROM stdin;
\.


--
-- Data for Name: acao_funcionarios; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.acao_funcionarios (id, "acaoId", "employeeId", "valorDiaria", "diasTrabalhados", "createdAt") FROM stdin;
\.


--
-- Data for Name: acao_turmas; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.acao_turmas (id, "acaoId", "turmaId", "createdAt") FROM stdin;
\.


--
-- Data for Name: acoes; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.acoes (id, nome, "cidadeId", "grupoId", "carretaId", status, "dataInicio", "dataFim", "localExecucao", "distanciaKm", "precoCombustivelL", "autonomiaKmL", observacoes, "permitirInscricoes", "createdAt", "updatedAt", "cidadeNome") FROM stdin;
f040de7e-3070-4b63-902b-52fa89ffd662	Qualifica Teresina 2025	93b13d40-88a3-4da3-89eb-2316a6da0f01	d321ba2f-9d66-4aec-a8db-5734f9f4bc59	\N	PLANEJADA	2025-04-01 00:00:00	2025-04-30 00:00:00		\N	\N	4.00	\N	t	2026-03-07 18:49:28.419	2026-03-07 18:49:28.419	Teresina, PI
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.api_keys (id, name, key, permissions, active, "createdBy", "createdAt", "lastUsedAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: attendance_justifications; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.attendance_justifications (id, "attendanceId", reason, details, "proofUrl", "submittedAt", status, "reviewedBy", "reviewedAt", "reviewNotes") FROM stdin;
\.


--
-- Data for Name: attendances; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.attendances (id, "classId", "studentId", date, present, justified, justification, "registeredBy", "registeredAt", "updatedAt", "classNotes", "classPhotoUrl") FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.audit_logs (id, "userId", action, "tableName", "recordId", "oldData", "newData", "ipAddress", "userAgent", "createdAt") FROM stdin;
\.


--
-- Data for Name: certificates; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.certificates (id, "studentId", "classId", "verificationCode", "qrCodeUrl", "fileUrl", "issuedAt", "issuedBy", status, "cancellationReason", "cancelledAt", "cancelledBy") FROM stdin;
\.


--
-- Data for Name: cities; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.cities (id, name, state, "ibgeCode", "createdAt") FROM stdin;
3a6557f0-4e63-4f78-8cbc-e82ed0692377	S├úo Lu├¡s	MA	2111300	2026-03-07 14:39:14.495
d84205b1-4cf9-4ad7-807f-c7fdfed989df	Imperatriz	MA	2105302	2026-03-07 14:39:14.509
bf22e604-8eff-4d06-adbe-db3967cff6f5	S├úo Jos├® de Ribamar	MA	2111201	2026-03-07 14:39:14.517
dd174b5f-629f-48c7-a3d3-9ae054582152	Timon	MA	2112209	2026-03-07 14:39:14.524
fca293e5-5046-41e4-ba9a-d3092f74ca03	Caxias	MA	2103000	2026-03-07 14:39:14.532
2dd346e8-5be0-42d9-a53f-cb33d3dd6add	Cod├│	MA	2103307	2026-03-07 14:39:14.54
43e456c6-724d-43ea-ae3c-21d0b5dd80c4	Pa├ºo do Lumiar	MA	2107704	2026-03-07 14:39:14.548
e463713f-1498-4a2d-bf33-7eb1706c7450	A├ºail├óndia	MA	2100055	2026-03-07 14:39:14.554
94684c71-77a6-4fa4-a3ba-7dbf6fd11bdf	Bacabal	MA	2101202	2026-03-07 14:39:14.561
c05216a6-d075-4e07-8c8e-74ca27b7519c	Balsas	MA	2101400	2026-03-07 14:39:14.567
93b13d40-88a3-4da3-89eb-2316a6da0f01	Teresina	PI	2211001	2026-03-07 14:39:14.575
c5e8e782-69f5-46c7-8a24-fd6049b23689	Parna├¡ba	PI	2207702	2026-03-07 14:39:14.581
4184504a-d7d4-4e33-93d5-1d4d4ce6aa67	Picos	PI	2208007	2026-03-07 14:39:14.587
b361479b-0953-41ea-93be-841b15c94a4e	Floriano	PI	2203909	2026-03-07 14:39:14.593
97dbc5d4-b65d-4352-a2df-4b5cdd60c076	Piripiri	PI	2208304	2026-03-07 14:39:14.597
76bea07e-5053-4d25-82ed-4a1dbc6b6049	Campo Maior	PI	2202251	2026-03-07 14:39:14.612
10e91f5e-2900-4d9e-a59f-b7a638531fa2	Barras	PI	2201200	2026-03-07 14:39:14.619
372e2175-4a40-4636-bac0-f8cdbce692cb	Altos	PI	2200400	2026-03-07 14:39:14.633
cf119f65-824c-4a4d-af6c-71b0b424de0f	Esperantina	PI	2203701	2026-03-07 14:39:14.656
a4084e3c-ecf2-42ae-bc22-1b68f0385eb5	Pedro II	PI	2207900	2026-03-07 14:39:14.663
\.


--
-- Data for Name: class_schedules; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.class_schedules (id, "classId", weekday, active, "createdAt") FROM stdin;
\.


--
-- Data for Name: class_teachers; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.class_teachers (id, "classId", "teacherId", "isSubstitute", "createdAt") FROM stdin;
\.


--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.classes (id, "courseId", "groupId", "cityId", "classIdentifier", "startDate", "endDate", period, "startTime", "endTime", vacancies, "truckId", status, "enrollmentOpenDate", "enrollmentCloseDate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: contas_pagar; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.contas_pagar (id, tipo_conta, tipo_espontaneo, descricao, valor, data_vencimento, data_pagamento, status, recorrente, observacoes, comprovante_url, cidade, "acaoId", "createdAt", "updatedAt") FROM stdin;
d3309e22-67cb-4a36-86db-f1269194e34f	agua	\N	├ügua	150.00	2026-03-07 00:00:00	\N	pendente	f	\N	\N	sao luis	\N	2026-03-07 15:13:29.483	2026-03-07 15:13:29.483
424088db-a0c5-4210-889d-7ba7240f965c	abastecimento	\N	Abastecimento	100.00	2026-03-07 00:00:00	\N	pendente	f	\N	\N	\N	\N	2026-03-07 18:55:38.535	2026-03-07 18:55:38.535
91e389c5-a544-411a-8fa1-b176fb1763d9	manutencao	preventiva	[MANUTEN├ç├âO] Troca de oleo motor ÔÇö Carreta 01	200.00	2026-03-07 00:00:00	2026-03-08 21:28:52.742	paga	f	\N	\N	\N	\N	2026-03-08 21:28:35.242	2026-03-08 21:28:52.745
\.


--
-- Data for Name: course_modules; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.course_modules (id, "courseId", "moduleName", room, "startTime", "endTime", "order", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.courses (id, name, description, "durationDaysMA", "durationDaysPI", "workloadHours", prerequisites, syllabus, "availableInMA", "availableInPI", "isMulticourse", active, "createdAt", "updatedAt") FROM stdin;
0f4bb58d-2f8d-4a01-b560-b53615b66eff	Inform├ítica B├ísica	Curso b├ísico de inform├ítica com Windows, Word, Excel e Internet	30	30	120	Ensino fundamental completo	M├│dulo 1: Introdu├º├úo ├á Inform├ítica\nM├│dulo 2: Sistema Operacional Windows\nM├│dulo 3: Editor de Texto (Word)\nM├│dulo 4: Planilha Eletr├┤nica (Excel)\nM├│dulo 5: Internet e E-mail	t	t	f	t	2026-03-07 14:39:14.678	2026-03-07 14:39:14.678
05669bc8-3c5a-4d19-9aa0-345f24fd2146	Excel Avan├ºado	Curso avan├ºado de Excel com f├│rmulas, tabelas din├ómicas e macros	20	20	80	Conhecimento b├ísico de Excel	M├│dulo 1: F├│rmulas e Fun├º├Áes Avan├ºadas\nM├│dulo 2: Tabelas Din├ómicas\nM├│dulo 3: Gr├íficos Avan├ºados\nM├│dulo 4: Macros e VBA\nM├│dulo 5: An├ílise de Dados	t	t	f	t	2026-03-07 14:39:14.686	2026-03-07 14:39:14.686
e376ebac-8f7b-40c3-80ad-6a22c9b853e3	Assistente Administrativo	Forma├º├úo completa para atuar como assistente administrativo	45	45	180	Ensino m├®dio completo	M├│dulo 1: Rotinas Administrativas\nM├│dulo 2: Atendimento ao Cliente\nM├│dulo 3: Organiza├º├úo de Documentos\nM├│dulo 4: Inform├ítica Aplicada\nM├│dulo 5: Comunica├º├úo Empresarial	t	t	f	t	2026-03-07 14:39:14.693	2026-03-07 14:39:14.693
27dbafda-d279-43ee-b7f1-f7e727799c66	Operador de Caixa	Capacita├º├úo para atuar como operador de caixa no varejo	15	15	60	Ensino fundamental completo	M├│dulo 1: Atendimento ao Cliente\nM├│dulo 2: Opera├º├úo de Caixa\nM├│dulo 3: Matem├ítica Financeira\nM├│dulo 4: Seguran├ºa e Preven├º├úo de Perdas	t	t	f	t	2026-03-07 14:39:14.698	2026-03-07 14:39:14.698
25705239-669e-402e-a457-2bf7552306d4	Auxiliar de Recursos Humanos	Forma├º├úo para atuar no departamento de recursos humanos	40	40	160	Ensino m├®dio completo	M├│dulo 1: Introdu├º├úo ao RH\nM├│dulo 2: Recrutamento e Sele├º├úo\nM├│dulo 3: Departamento Pessoal\nM├│dulo 4: Treinamento e Desenvolvimento\nM├│dulo 5: Legisla├º├úo Trabalhista	t	t	f	t	2026-03-07 14:39:14.703	2026-03-07 14:39:14.703
c884ea02-5acc-414a-9d9f-a0f9a1897ec6	Marketing Digital	Curso completo de marketing digital e redes sociais	30	30	120	Conhecimento b├ísico de inform├ítica	M├│dulo 1: Fundamentos do Marketing Digital\nM├│dulo 2: Redes Sociais\nM├│dulo 3: Google Ads e SEO\nM├│dulo 4: E-mail Marketing\nM├│dulo 5: M├®tricas e An├ílise	t	t	f	t	2026-03-07 14:39:14.71	2026-03-07 14:39:14.71
84a281b4-4fad-474a-9916-2d0463e34a83	Empreendedorismo	Capacita├º├úo para abrir e gerenciar o pr├│prio neg├│cio	25	25	100	Ensino m├®dio completo	M├│dulo 1: Perfil Empreendedor\nM├│dulo 2: Plano de Neg├│cios\nM├│dulo 3: Finan├ºas para Empreendedores\nM├│dulo 4: Marketing e Vendas\nM├│dulo 5: Gest├úo de Pessoas	t	t	f	t	2026-03-07 14:39:14.714	2026-03-07 14:39:14.714
ba24b639-4997-4f27-87d9-11cbac588827	Qualifica├º├úo Profissional (Multicurso)	Curso multicurso com diversos m├│dulos profissionalizantes	60	60	240	Ensino fundamental completo	M├│dulo 1: Inform├ítica B├ísica\nM├│dulo 2: Atendimento ao Cliente\nM├│dulo 3: Vendas\nM├│dulo 4: Gest├úo de Tempo\nM├│dulo 5: Comunica├º├úo Empresarial\nM├│dulo 6: Empreendedorismo	t	t	t	t	2026-03-07 14:39:14.716	2026-03-07 14:39:14.716
\.


--
-- Data for Name: data_deletion_requests; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.data_deletion_requests (id, "userId", "requestedAt", "processedAt", "processedBy", status) FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.employees (id, name, role, department, cpf, rg, phone, email, specialty, "dailyCost", "hireDate", notes, "photoUrl", active, "createdAt", "updatedAt") FROM stdin;
bba21ebe-2a92-4634-b01a-c39d4d0f0c3d	joao gabriel araujo	INSTRUCTOR	ACADEMIC	00895399318	234234234234	98987272826	joaogabrieldiniz23@gmail.com	Professor de IA	100.00	2026-03-09 00:00:00	\N	\N	t	2026-03-08 19:57:12.052	2026-03-08 19:57:12.052
\.


--
-- Data for Name: enrollment_consents; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.enrollment_consents (id, "enrollmentId", "dataProcessing", "imageUse", "termsAccepted", "privacyPolicyAccepted", "consentDate", "ipAddress", "userAgent") FROM stdin;
\.


--
-- Data for Name: enrollment_documents; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.enrollment_documents (id, "enrollmentId", "documentType", "fileUrl", "uploadedAt") FROM stdin;
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.enrollments (id, "studentId", "classId", protocol, status, "enrolledAt", "reviewedAt", "reviewedBy", "rejectionReason", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.expenses (id, "tripId", "truckId", category, subcategory, amount, description, "receiptUrl", "expenseDate", "responsibleUserId", status, "approvedBy", "approvedAt", "rejectionReason", "createdAt") FROM stdin;
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.groups (id, name, state, "createdAt") FROM stdin;
d321ba2f-9d66-4aec-a8db-5734f9f4bc59	Grupo 1 MA	MA	2026-03-07 14:39:14.431
61388d4e-957d-4ed6-8e6f-3b1543ecbd38	Grupo 2 MA	MA	2026-03-07 14:39:14.472
7b1a18b5-086c-4826-b417-aa139782b6ad	Grupo 1 PI	PI	2026-03-07 14:39:14.487
\.


--
-- Data for Name: material_comments; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.material_comments (id, "materialId", "userId", comment, "createdAt") FROM stdin;
\.


--
-- Data for Name: materials; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.materials (id, "courseId", "classId", "teacherId", title, description, "fileUrl", "fileType", "fileSize", tags, visibility, "visibleFrom", "uploadedBy", "uploadedAt", "downloadCount", "viewCount") FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.notifications (id, "userId", type, title, message, channel, data, "sentAt", "readAt", "clickedAt", "deliveryStatus", "errorMessage", "createdAt") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.refresh_tokens (id, token, "userId", "expiresAt", "createdAt") FROM stdin;
8292163c-9963-4c12-8839-fafd7ca20b3e	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTIwNGYzYS0zNzJjLTQ5ODMtYWQyYy1kNDU0MjhhN2RlM2QiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI4OTYzNzksImV4cCI6MTc3MzUwMTE3OX0.2MVt7axDrrwIuWScHeLNq3iI4y3KDLV7FPiozgiw72Q	7e204f3a-372c-4983-ad2c-d45428a7de3d	2026-03-14 15:12:59.946	2026-03-07 15:12:59.948
76ee9276-c5d8-44c5-a448-1a0b17735264	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTIwNGYzYS0zNzJjLTQ5ODMtYWQyYy1kNDU0MjhhN2RlM2QiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI5MDQ4NjcsImV4cCI6MTc3MzUwOTY2N30.2_G73hy7AXFvffJosBfu_1ynXWCZdYIzCufGfN2qqo8	7e204f3a-372c-4983-ad2c-d45428a7de3d	2026-03-14 17:34:27.135	2026-03-07 17:34:27.137
9beb99df-3ca4-4298-9fba-cae85455c2db	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTIwNGYzYS0zNzJjLTQ5ODMtYWQyYy1kNDU0MjhhN2RlM2QiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI5MDg2NTgsImV4cCI6MTc3MzUxMzQ1OH0.t-cytWKUIU7NT6w0vXdfWT46uHRQ68-9SRq4Gvti60I	7e204f3a-372c-4983-ad2c-d45428a7de3d	2026-03-14 18:37:38.801	2026-03-07 18:37:38.804
7fe6213d-2523-4f75-8f44-0df23e72d74a	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTIwNGYzYS0zNzJjLTQ5ODMtYWQyYy1kNDU0MjhhN2RlM2QiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI5MTIzOTEsImV4cCI6MTc3MzUxNzE5MX0.aiWbzFQ0AP4wLV8mdZjXTTL6D5cyGM9q0RqTsqlWF-I	7e204f3a-372c-4983-ad2c-d45428a7de3d	2026-03-14 19:39:51.341	2026-03-07 19:39:51.344
13268ed5-10d6-429a-9370-cd5178f7006b	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTIwNGYzYS0zNzJjLTQ5ODMtYWQyYy1kNDU0MjhhN2RlM2QiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI5OTk3NjEsImV4cCI6MTc3MzYwNDU2MX0.55QtoT8EgqYL2icbUDWoJqAP9q88le27akYBA4MGs2o	7e204f3a-372c-4983-ad2c-d45428a7de3d	2026-03-15 19:56:01.788	2026-03-08 19:56:01.788
c2907ef9-72a6-4fcc-b0e2-103d04231c93	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTIwNGYzYS0zNzJjLTQ5ODMtYWQyYy1kNDU0MjhhN2RlM2QiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzMwMDM5MzUsImV4cCI6MTc3MzYwODczNX0.WSgpf5oD33Yr9Te4GquORnhBmzd16ecFf8H38dpKW4w	7e204f3a-372c-4983-ad2c-d45428a7de3d	2026-03-15 21:05:35.897	2026-03-08 21:05:35.9
\.


--
-- Data for Name: student_addresses; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.student_addresses (id, "studentId", cep, street, number, complement, neighborhood, city, state, zone) FROM stdin;
\.


--
-- Data for Name: student_contacts; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.student_contacts (id, "studentId", email, phone, "hasWhatsapp", "phoneAlt", "allowWhatsappContact", "allowEmailContact") FROM stdin;
\.


--
-- Data for Name: student_professional; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.student_professional (id, "studentId", "previousQualification", "professionalInterest", "howHeardAbout", motivation, "careerGoal") FROM stdin;
\.


--
-- Data for Name: student_socioeconomic; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.student_socioeconomic (id, "studentId", "educationLevel", "employmentStatus", "familyMembersCount", "socialProgram", "hasDisability", "disabilityType", "disabilityAdaptation", "familyIncome") FROM stdin;
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.students (id, "userId", cpf, rg, "rgIssuer", "birthDate", gender, "raceColor", "maritalStatus", "motherName", "fatherName", nationality, "birthCity", "birthState", "photoUrl", "createdAt", "updatedAt", active, "socialName") FROM stdin;
\.


--
-- Data for Name: system_configs; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.system_configs (id, "configKey", "configValue", "dataType", description, "updatedBy", "updatedAt") FROM stdin;
\.


--
-- Data for Name: teacher_courses; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.teacher_courses (id, "teacherId", "courseId", "createdAt") FROM stdin;
\.


--
-- Data for Name: teachers; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.teachers (id, "userId", cpf, rg, "birthDate", "photoUrl", education, specialties, experience, certifications, "resumeUrl", availability, "preferredRegion", "contractType", "hireDate", active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: trips; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.trips (id, "truckId", "originCityId", "destinationCityId", "departureDate", "expectedArrivalDate", "actualArrivalDate", "driverName", "driverPhone", "kmStart", "kmEnd", status, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: truck_maintenances; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.truck_maintenances (id, "truckId", tipo, titulo, descricao, status, prioridade, "kmAtual", "kmProximo", "dataAgendada", "dataConclusao", "custoEstimado", "custoReal", "statusPagamento", fornecedor, responsavel, observacoes, "contaPagarId", "createdAt", "updatedAt") FROM stdin;
2b216f16-2da7-4261-9bbd-d53b37d88017	2c5c78ce-3173-47bd-9a3c-7f6712776140	preventiva	Troca de oleo motor	\N	agendada	alta	\N	\N	2026-03-07 00:00:00	\N	\N	200.00	pendente	\N	\N	\N	91e389c5-a544-411a-8fa1-b176fb1763d9	2026-03-07 19:26:46.447	2026-03-08 21:28:35.269
\.


--
-- Data for Name: trucks; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.trucks (id, identifier, "licensePlate", type, "groupId", state, capacity, "roomsCount", status, "modelYear", "lastMaintenanceDate", "nextMaintenanceDate", "photoUrl", "equipmentList", notes, "createdAt", "updatedAt") FROM stdin;
2c5c78ce-3173-47bd-9a3c-7f6712776140	Carreta 01	ADV-4523	STANDARD	7b1a18b5-086c-4826-b417-aa139782b6ad	PI	30	1	MAINTENANCE	2026	\N	\N	\N	\N	\N	2026-03-07 18:56:32.852	2026-03-07 19:26:46.486
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: cursos_user
--

COPY public.users (id, email, password, name, phone, role, active, "createdAt", "updatedAt", cpf) FROM stdin;
7e204f3a-372c-4983-ad2c-d45428a7de3d	admin@qualifica.com	$2b$10$g1xqAHP38C7X4Xejf/YYGO/TlcZITNEH8/WgoZ9/wCb4d3GJ6mSO6	Administrador	(98) 98888-8888	ADMIN	t	2026-03-07 14:39:14.722	2026-03-07 14:39:14.722	\N
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: acao_custos acao_custos_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acao_custos
    ADD CONSTRAINT acao_custos_pkey PRIMARY KEY (id);


--
-- Name: acao_equipe acao_equipe_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acao_equipe
    ADD CONSTRAINT acao_equipe_pkey PRIMARY KEY (id);


--
-- Name: acao_funcionarios acao_funcionarios_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acao_funcionarios
    ADD CONSTRAINT acao_funcionarios_pkey PRIMARY KEY (id);


--
-- Name: acao_turmas acao_turmas_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acao_turmas
    ADD CONSTRAINT acao_turmas_pkey PRIMARY KEY (id);


--
-- Name: acoes acoes_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acoes
    ADD CONSTRAINT acoes_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: attendance_justifications attendance_justifications_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.attendance_justifications
    ADD CONSTRAINT attendance_justifications_pkey PRIMARY KEY (id);


--
-- Name: attendances attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: class_schedules class_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.class_schedules
    ADD CONSTRAINT class_schedules_pkey PRIMARY KEY (id);


--
-- Name: class_teachers class_teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.class_teachers
    ADD CONSTRAINT class_teachers_pkey PRIMARY KEY (id);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: contas_pagar contas_pagar_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.contas_pagar
    ADD CONSTRAINT contas_pagar_pkey PRIMARY KEY (id);


--
-- Name: course_modules course_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT course_modules_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: data_deletion_requests data_deletion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.data_deletion_requests
    ADD CONSTRAINT data_deletion_requests_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: enrollment_consents enrollment_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.enrollment_consents
    ADD CONSTRAINT enrollment_consents_pkey PRIMARY KEY (id);


--
-- Name: enrollment_documents enrollment_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.enrollment_documents
    ADD CONSTRAINT enrollment_documents_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: material_comments material_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.material_comments
    ADD CONSTRAINT material_comments_pkey PRIMARY KEY (id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: student_addresses student_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.student_addresses
    ADD CONSTRAINT student_addresses_pkey PRIMARY KEY (id);


--
-- Name: student_contacts student_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.student_contacts
    ADD CONSTRAINT student_contacts_pkey PRIMARY KEY (id);


--
-- Name: student_professional student_professional_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.student_professional
    ADD CONSTRAINT student_professional_pkey PRIMARY KEY (id);


--
-- Name: student_socioeconomic student_socioeconomic_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.student_socioeconomic
    ADD CONSTRAINT student_socioeconomic_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- Name: teacher_courses teacher_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.teacher_courses
    ADD CONSTRAINT teacher_courses_pkey PRIMARY KEY (id);


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: truck_maintenances truck_maintenances_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.truck_maintenances
    ADD CONSTRAINT truck_maintenances_pkey PRIMARY KEY (id);


--
-- Name: trucks trucks_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: acao_custos_acaoId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "acao_custos_acaoId_idx" ON public.acao_custos USING btree ("acaoId");


--
-- Name: acao_custos_tipo_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX acao_custos_tipo_idx ON public.acao_custos USING btree (tipo);


--
-- Name: acao_equipe_acaoId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "acao_equipe_acaoId_idx" ON public.acao_equipe USING btree ("acaoId");


--
-- Name: acao_equipe_acaoId_userId_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "acao_equipe_acaoId_userId_key" ON public.acao_equipe USING btree ("acaoId", "userId");


--
-- Name: acao_equipe_userId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "acao_equipe_userId_idx" ON public.acao_equipe USING btree ("userId");


--
-- Name: acao_funcionarios_acaoId_employeeId_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "acao_funcionarios_acaoId_employeeId_key" ON public.acao_funcionarios USING btree ("acaoId", "employeeId");


--
-- Name: acao_funcionarios_acaoId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "acao_funcionarios_acaoId_idx" ON public.acao_funcionarios USING btree ("acaoId");


--
-- Name: acao_funcionarios_employeeId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "acao_funcionarios_employeeId_idx" ON public.acao_funcionarios USING btree ("employeeId");


--
-- Name: acao_turmas_acaoId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "acao_turmas_acaoId_idx" ON public.acao_turmas USING btree ("acaoId");


--
-- Name: acao_turmas_acaoId_turmaId_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "acao_turmas_acaoId_turmaId_key" ON public.acao_turmas USING btree ("acaoId", "turmaId");


--
-- Name: acao_turmas_turmaId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "acao_turmas_turmaId_idx" ON public.acao_turmas USING btree ("turmaId");


--
-- Name: acoes_carretaId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "acoes_carretaId_idx" ON public.acoes USING btree ("carretaId");


--
-- Name: acoes_cidadeId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "acoes_cidadeId_idx" ON public.acoes USING btree ("cidadeId");


--
-- Name: acoes_dataInicio_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "acoes_dataInicio_idx" ON public.acoes USING btree ("dataInicio");


--
-- Name: acoes_grupoId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "acoes_grupoId_idx" ON public.acoes USING btree ("grupoId");


--
-- Name: acoes_status_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX acoes_status_idx ON public.acoes USING btree (status);


--
-- Name: api_keys_active_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX api_keys_active_idx ON public.api_keys USING btree (active);


--
-- Name: api_keys_key_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX api_keys_key_idx ON public.api_keys USING btree (key);


--
-- Name: api_keys_key_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX api_keys_key_key ON public.api_keys USING btree (key);


--
-- Name: attendance_justifications_attendanceId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "attendance_justifications_attendanceId_idx" ON public.attendance_justifications USING btree ("attendanceId");


--
-- Name: attendance_justifications_status_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX attendance_justifications_status_idx ON public.attendance_justifications USING btree (status);


--
-- Name: attendances_classId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "attendances_classId_idx" ON public.attendances USING btree ("classId");


--
-- Name: attendances_classId_studentId_date_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "attendances_classId_studentId_date_key" ON public.attendances USING btree ("classId", "studentId", date);


--
-- Name: attendances_date_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX attendances_date_idx ON public.attendances USING btree (date);


--
-- Name: attendances_studentId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "attendances_studentId_idx" ON public.attendances USING btree ("studentId");


--
-- Name: audit_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "audit_logs_createdAt_idx" ON public.audit_logs USING btree ("createdAt");


--
-- Name: audit_logs_tableName_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "audit_logs_tableName_idx" ON public.audit_logs USING btree ("tableName");


--
-- Name: audit_logs_userId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "audit_logs_userId_idx" ON public.audit_logs USING btree ("userId");


--
-- Name: certificates_classId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "certificates_classId_idx" ON public.certificates USING btree ("classId");


--
-- Name: certificates_status_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX certificates_status_idx ON public.certificates USING btree (status);


--
-- Name: certificates_studentId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "certificates_studentId_idx" ON public.certificates USING btree ("studentId");


--
-- Name: certificates_verificationCode_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "certificates_verificationCode_idx" ON public.certificates USING btree ("verificationCode");


--
-- Name: certificates_verificationCode_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "certificates_verificationCode_key" ON public.certificates USING btree ("verificationCode");


--
-- Name: cities_name_state_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX cities_name_state_key ON public.cities USING btree (name, state);


--
-- Name: cities_state_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX cities_state_idx ON public.cities USING btree (state);


--
-- Name: class_schedules_classId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "class_schedules_classId_idx" ON public.class_schedules USING btree ("classId");


--
-- Name: class_teachers_classId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "class_teachers_classId_idx" ON public.class_teachers USING btree ("classId");


--
-- Name: class_teachers_classId_teacherId_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "class_teachers_classId_teacherId_key" ON public.class_teachers USING btree ("classId", "teacherId");


--
-- Name: class_teachers_teacherId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "class_teachers_teacherId_idx" ON public.class_teachers USING btree ("teacherId");


--
-- Name: classes_cityId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "classes_cityId_idx" ON public.classes USING btree ("cityId");


--
-- Name: classes_courseId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "classes_courseId_idx" ON public.classes USING btree ("courseId");


--
-- Name: classes_groupId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "classes_groupId_idx" ON public.classes USING btree ("groupId");


--
-- Name: classes_startDate_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "classes_startDate_idx" ON public.classes USING btree ("startDate");


--
-- Name: classes_status_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX classes_status_idx ON public.classes USING btree (status);


--
-- Name: classes_truckId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "classes_truckId_idx" ON public.classes USING btree ("truckId");


--
-- Name: contas_pagar_acaoId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "contas_pagar_acaoId_idx" ON public.contas_pagar USING btree ("acaoId");


--
-- Name: contas_pagar_data_vencimento_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX contas_pagar_data_vencimento_idx ON public.contas_pagar USING btree (data_vencimento);


--
-- Name: contas_pagar_status_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX contas_pagar_status_idx ON public.contas_pagar USING btree (status);


--
-- Name: contas_pagar_tipo_conta_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX contas_pagar_tipo_conta_idx ON public.contas_pagar USING btree (tipo_conta);


--
-- Name: course_modules_courseId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "course_modules_courseId_idx" ON public.course_modules USING btree ("courseId");


--
-- Name: courses_active_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX courses_active_idx ON public.courses USING btree (active);


--
-- Name: courses_name_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX courses_name_idx ON public.courses USING btree (name);


--
-- Name: data_deletion_requests_status_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX data_deletion_requests_status_idx ON public.data_deletion_requests USING btree (status);


--
-- Name: data_deletion_requests_userId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "data_deletion_requests_userId_idx" ON public.data_deletion_requests USING btree ("userId");


--
-- Name: employees_active_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX employees_active_idx ON public.employees USING btree (active);


--
-- Name: employees_cpf_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX employees_cpf_key ON public.employees USING btree (cpf);


--
-- Name: employees_department_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX employees_department_idx ON public.employees USING btree (department);


--
-- Name: employees_email_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX employees_email_key ON public.employees USING btree (email);


--
-- Name: employees_role_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX employees_role_idx ON public.employees USING btree (role);


--
-- Name: enrollment_consents_enrollmentId_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "enrollment_consents_enrollmentId_key" ON public.enrollment_consents USING btree ("enrollmentId");


--
-- Name: enrollment_documents_enrollmentId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "enrollment_documents_enrollmentId_idx" ON public.enrollment_documents USING btree ("enrollmentId");


--
-- Name: enrollments_classId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "enrollments_classId_idx" ON public.enrollments USING btree ("classId");


--
-- Name: enrollments_protocol_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX enrollments_protocol_idx ON public.enrollments USING btree (protocol);


--
-- Name: enrollments_protocol_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX enrollments_protocol_key ON public.enrollments USING btree (protocol);


--
-- Name: enrollments_status_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX enrollments_status_idx ON public.enrollments USING btree (status);


--
-- Name: enrollments_studentId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "enrollments_studentId_idx" ON public.enrollments USING btree ("studentId");


--
-- Name: expenses_expenseDate_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "expenses_expenseDate_idx" ON public.expenses USING btree ("expenseDate");


--
-- Name: expenses_status_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX expenses_status_idx ON public.expenses USING btree (status);


--
-- Name: expenses_tripId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "expenses_tripId_idx" ON public.expenses USING btree ("tripId");


--
-- Name: expenses_truckId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "expenses_truckId_idx" ON public.expenses USING btree ("truckId");


--
-- Name: groups_name_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX groups_name_key ON public.groups USING btree (name);


--
-- Name: material_comments_materialId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "material_comments_materialId_idx" ON public.material_comments USING btree ("materialId");


--
-- Name: material_comments_userId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "material_comments_userId_idx" ON public.material_comments USING btree ("userId");


--
-- Name: materials_classId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "materials_classId_idx" ON public.materials USING btree ("classId");


--
-- Name: materials_courseId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "materials_courseId_idx" ON public.materials USING btree ("courseId");


--
-- Name: materials_teacherId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "materials_teacherId_idx" ON public.materials USING btree ("teacherId");


--
-- Name: materials_uploadedBy_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "materials_uploadedBy_idx" ON public.materials USING btree ("uploadedBy");


--
-- Name: notifications_deliveryStatus_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "notifications_deliveryStatus_idx" ON public.notifications USING btree ("deliveryStatus");


--
-- Name: notifications_type_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX notifications_type_idx ON public.notifications USING btree (type);


--
-- Name: notifications_userId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "notifications_userId_idx" ON public.notifications USING btree ("userId");


--
-- Name: refresh_tokens_token_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX refresh_tokens_token_idx ON public.refresh_tokens USING btree (token);


--
-- Name: refresh_tokens_token_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX refresh_tokens_token_key ON public.refresh_tokens USING btree (token);


--
-- Name: refresh_tokens_userId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "refresh_tokens_userId_idx" ON public.refresh_tokens USING btree ("userId");


--
-- Name: student_addresses_studentId_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "student_addresses_studentId_key" ON public.student_addresses USING btree ("studentId");


--
-- Name: student_contacts_studentId_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "student_contacts_studentId_key" ON public.student_contacts USING btree ("studentId");


--
-- Name: student_professional_studentId_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "student_professional_studentId_key" ON public.student_professional USING btree ("studentId");


--
-- Name: student_socioeconomic_studentId_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "student_socioeconomic_studentId_key" ON public.student_socioeconomic USING btree ("studentId");


--
-- Name: students_cpf_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX students_cpf_idx ON public.students USING btree (cpf);


--
-- Name: students_cpf_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX students_cpf_key ON public.students USING btree (cpf);


--
-- Name: students_userId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "students_userId_idx" ON public.students USING btree ("userId");


--
-- Name: students_userId_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "students_userId_key" ON public.students USING btree ("userId");


--
-- Name: system_configs_configKey_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "system_configs_configKey_idx" ON public.system_configs USING btree ("configKey");


--
-- Name: system_configs_configKey_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "system_configs_configKey_key" ON public.system_configs USING btree ("configKey");


--
-- Name: teacher_courses_courseId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "teacher_courses_courseId_idx" ON public.teacher_courses USING btree ("courseId");


--
-- Name: teacher_courses_teacherId_courseId_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "teacher_courses_teacherId_courseId_key" ON public.teacher_courses USING btree ("teacherId", "courseId");


--
-- Name: teacher_courses_teacherId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "teacher_courses_teacherId_idx" ON public.teacher_courses USING btree ("teacherId");


--
-- Name: teachers_cpf_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX teachers_cpf_idx ON public.teachers USING btree (cpf);


--
-- Name: teachers_cpf_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX teachers_cpf_key ON public.teachers USING btree (cpf);


--
-- Name: teachers_userId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "teachers_userId_idx" ON public.teachers USING btree ("userId");


--
-- Name: teachers_userId_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "teachers_userId_key" ON public.teachers USING btree ("userId");


--
-- Name: trips_status_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX trips_status_idx ON public.trips USING btree (status);


--
-- Name: trips_truckId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "trips_truckId_idx" ON public.trips USING btree ("truckId");


--
-- Name: truck_maintenances_status_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX truck_maintenances_status_idx ON public.truck_maintenances USING btree (status);


--
-- Name: truck_maintenances_tipo_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX truck_maintenances_tipo_idx ON public.truck_maintenances USING btree (tipo);


--
-- Name: truck_maintenances_truckId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "truck_maintenances_truckId_idx" ON public.truck_maintenances USING btree ("truckId");


--
-- Name: trucks_groupId_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX "trucks_groupId_idx" ON public.trucks USING btree ("groupId");


--
-- Name: trucks_identifier_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX trucks_identifier_idx ON public.trucks USING btree (identifier);


--
-- Name: trucks_identifier_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX trucks_identifier_key ON public.trucks USING btree (identifier);


--
-- Name: trucks_licensePlate_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX "trucks_licensePlate_key" ON public.trucks USING btree ("licensePlate");


--
-- Name: trucks_status_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX trucks_status_idx ON public.trucks USING btree (status);


--
-- Name: users_cpf_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX users_cpf_key ON public.users USING btree (cpf);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_role_idx; Type: INDEX; Schema: public; Owner: cursos_user
--

CREATE INDEX users_role_idx ON public.users USING btree (role);


--
-- Name: acao_custos acao_custos_acaoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acao_custos
    ADD CONSTRAINT "acao_custos_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES public.acoes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: acao_custos acao_custos_funcionarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acao_custos
    ADD CONSTRAINT "acao_custos_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: acao_equipe acao_equipe_acaoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acao_equipe
    ADD CONSTRAINT "acao_equipe_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES public.acoes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: acao_equipe acao_equipe_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acao_equipe
    ADD CONSTRAINT "acao_equipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: acao_funcionarios acao_funcionarios_acaoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acao_funcionarios
    ADD CONSTRAINT "acao_funcionarios_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES public.acoes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: acao_funcionarios acao_funcionarios_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acao_funcionarios
    ADD CONSTRAINT "acao_funcionarios_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: acao_turmas acao_turmas_acaoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acao_turmas
    ADD CONSTRAINT "acao_turmas_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES public.acoes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: acao_turmas acao_turmas_turmaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acao_turmas
    ADD CONSTRAINT "acao_turmas_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: acoes acoes_carretaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acoes
    ADD CONSTRAINT "acoes_carretaId_fkey" FOREIGN KEY ("carretaId") REFERENCES public.trucks(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: acoes acoes_cidadeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acoes
    ADD CONSTRAINT "acoes_cidadeId_fkey" FOREIGN KEY ("cidadeId") REFERENCES public.cities(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: acoes acoes_grupoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.acoes
    ADD CONSTRAINT "acoes_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES public.groups(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: api_keys api_keys_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "api_keys_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: attendance_justifications attendance_justifications_attendanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.attendance_justifications
    ADD CONSTRAINT "attendance_justifications_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES public.attendances(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: attendance_justifications attendance_justifications_reviewedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.attendance_justifications
    ADD CONSTRAINT "attendance_justifications_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: attendances attendances_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT "attendances_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: attendances attendances_registeredBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT "attendances_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: attendances attendances_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT "attendances_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: certificates certificates_cancelledBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT "certificates_cancelledBy_fkey" FOREIGN KEY ("cancelledBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: certificates certificates_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT "certificates_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: certificates certificates_issuedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT "certificates_issuedBy_fkey" FOREIGN KEY ("issuedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: certificates certificates_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT "certificates_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_schedules class_schedules_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.class_schedules
    ADD CONSTRAINT "class_schedules_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_teachers class_teachers_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.class_teachers
    ADD CONSTRAINT "class_teachers_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_teachers class_teachers_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.class_teachers
    ADD CONSTRAINT "class_teachers_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public.teachers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: classes classes_cityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT "classes_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES public.cities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: classes classes_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT "classes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: classes classes_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT "classes_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public.groups(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: classes classes_truckId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT "classes_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES public.trucks(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: contas_pagar contas_pagar_acaoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.contas_pagar
    ADD CONSTRAINT "contas_pagar_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES public.acoes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: course_modules course_modules_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT "course_modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: data_deletion_requests data_deletion_requests_processedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.data_deletion_requests
    ADD CONSTRAINT "data_deletion_requests_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: enrollment_consents enrollment_consents_enrollmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.enrollment_consents
    ADD CONSTRAINT "enrollment_consents_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES public.enrollments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: enrollment_documents enrollment_documents_enrollmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.enrollment_documents
    ADD CONSTRAINT "enrollment_documents_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES public.enrollments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: enrollments enrollments_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT "enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: enrollments enrollments_reviewedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT "enrollments_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: enrollments enrollments_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expenses expenses_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_responsibleUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_tripId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES public.trips(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_truckId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES public.trucks(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: material_comments material_comments_materialId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.material_comments
    ADD CONSTRAINT "material_comments_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES public.materials(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: material_comments material_comments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.material_comments
    ADD CONSTRAINT "material_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: materials materials_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT "materials_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: materials materials_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT "materials_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: materials materials_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT "materials_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public.teachers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: materials materials_uploadedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT "materials_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notifications notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: student_addresses student_addresses_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.student_addresses
    ADD CONSTRAINT "student_addresses_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: student_contacts student_contacts_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.student_contacts
    ADD CONSTRAINT "student_contacts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: student_professional student_professional_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.student_professional
    ADD CONSTRAINT "student_professional_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: student_socioeconomic student_socioeconomic_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.student_socioeconomic
    ADD CONSTRAINT "student_socioeconomic_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: students students_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: system_configs system_configs_updatedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT "system_configs_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: teacher_courses teacher_courses_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.teacher_courses
    ADD CONSTRAINT "teacher_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: teacher_courses teacher_courses_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.teacher_courses
    ADD CONSTRAINT "teacher_courses_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public.teachers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: teachers teachers_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT "teachers_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trips trips_destinationCityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT "trips_destinationCityId_fkey" FOREIGN KEY ("destinationCityId") REFERENCES public.cities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: trips trips_originCityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT "trips_originCityId_fkey" FOREIGN KEY ("originCityId") REFERENCES public.cities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: trips trips_truckId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT "trips_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES public.trucks(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: truck_maintenances truck_maintenances_truckId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.truck_maintenances
    ADD CONSTRAINT "truck_maintenances_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES public.trucks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trucks trucks_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cursos_user
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT "trucks_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public.groups(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: cursos_user
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict VUdrT6eXzSK2aXRqlKeL1NY4gfvZLnAougSxQhN8HoBHB5piQl0VYehL8CZGzcW

