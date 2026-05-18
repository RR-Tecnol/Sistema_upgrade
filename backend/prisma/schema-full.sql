--
-- PostgreSQL database dump
--

\restrict LV9UWMuGXG21mK1XsTjO02Q92e9SSrWotGdAXf3NogDvxwhZfJQA3sirQtgohir

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

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
-- Name: AbsenceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AbsenceStatus" AS ENUM (
    'PENDING',
    'VALIDATED',
    'REJECTED',
    'PENALIZED'
);


--
-- Name: AbsenceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AbsenceType" AS ENUM (
    'ILLNESS',
    'PERSONAL',
    'EMERGENCY',
    'TRIP',
    'ACCIDENT',
    'OTHER'
);


--
-- Name: AcaoCustoTipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AcaoCustoTipo" AS ENUM (
    'ABASTECIMENTO',
    'DESPESA_GERAL',
    'DIARIA_FUNCIONARIO'
);


--
-- Name: AcaoStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AcaoStatus" AS ENUM (
    'PLANEJADA',
    'EM_ANDAMENTO',
    'CONCLUIDA',
    'CANCELADA'
);


--
-- Name: CareerGoal; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CareerGoal" AS ENUM (
    'SEEK_EMPLOYMENT',
    'ENTREPRENEURSHIP',
    'SELF_EMPLOYED',
    'NOT_SURE',
    'OTHER'
);


--
-- Name: CertificateStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CertificateStatus" AS ENUM (
    'ACTIVE',
    'CANCELLED'
);


--
-- Name: CertificateTemplateScope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CertificateTemplateScope" AS ENUM (
    'GLOBAL',
    'COURSE',
    'STATE',
    'COURSE_STATE',
    'PUBLIC_FILE'
);


--
-- Name: CertificateTemplateStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CertificateTemplateStatus" AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'PUBLISHED',
    'ARCHIVED'
);


--
-- Name: CertificateTemplateType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CertificateTemplateType" AS ENUM (
    'PDF_BASE',
    'HTML'
);


--
-- Name: ClassStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ClassStatus" AS ENUM (
    'PLANNED',
    'ENROLLMENT_OPEN',
    'ENROLLMENT_CLOSED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: ClassWeekendPolicy; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ClassWeekendPolicy" AS ENUM (
    'FOLLOW_SCHEDULE',
    'WEEKDAYS_ONLY',
    'ALL_WEEKENDS',
    'SELECT_WEEKENDS'
);


--
-- Name: ContaPagarStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContaPagarStatus" AS ENUM (
    'pendente',
    'paga',
    'vencida',
    'cancelada'
);


--
-- Name: ContractType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContractType" AS ENUM (
    'CLT',
    'PJ',
    'FREELANCE'
);


--
-- Name: DeliveryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DeliveryStatus" AS ENUM (
    'PENDING',
    'SENT',
    'DELIVERED',
    'FAILED'
);


--
-- Name: DisabilityType; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: DocumentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DocumentType" AS ENUM (
    'PHOTO',
    'RG_FRONT',
    'RG_BACK',
    'CPF',
    'ADDRESS_PROOF',
    'EDUCATION_PROOF'
);


--
-- Name: EducationLevel; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: EmployeeDepartment; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EmployeeDepartment" AS ENUM (
    'ACADEMIC',
    'OPERATIONS',
    'HEALTH',
    'FINANCIAL',
    'ADMINISTRATION',
    'LOGISTICS'
);


--
-- Name: EmployeeRole; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: EmploymentStatus; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: EnrollmentStatus; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: ExpenseCategory; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: ExpenseStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExpenseStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: FamilyIncome; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FamilyIncome" AS ENUM (
    'UP_TO_1_MW',
    'FROM_1_TO_2_MW',
    'FROM_2_TO_3_MW',
    'FROM_3_TO_5_MW',
    'ABOVE_5_MW',
    'PREFER_NOT_TO_SAY'
);


--
-- Name: FeedbackCurrentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FeedbackCurrentStatus" AS ENUM (
    'EMPLOYED_CLT',
    'EMPLOYED_PJ',
    'SELF_EMPLOYED',
    'STUDYING',
    'UNEMPLOYED_LOOKING',
    'OTHER'
);


--
-- Name: FeedbackRewardStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FeedbackRewardStatus" AS ENUM (
    'PENDING',
    'PAID',
    'CANCELLED'
);


--
-- Name: FeedbackStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FeedbackStatus" AS ENUM (
    'PENDING_STUDENT_RESPONSE',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'REVERTED',
    'EXPIRED',
    'CONTENT_APPROVED'
);


--
-- Name: Gender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Gender" AS ENUM (
    'MALE',
    'FEMALE',
    'NON_BINARY',
    'PREFER_NOT_TO_SAY'
);


--
-- Name: MaritalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MaritalStatus" AS ENUM (
    'SINGLE',
    'MARRIED',
    'DIVORCED',
    'WIDOWED',
    'SEPARATED'
);


--
-- Name: MaterialVisibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MaterialVisibility" AS ENUM (
    'PUBLIC',
    'COURSE_RESTRICTED',
    'CLASS_RESTRICTED',
    'PRIVATE'
);


--
-- Name: NotificationChannel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationChannel" AS ENUM (
    'IN_APP',
    'EMAIL',
    'SMS',
    'WHATSAPP'
);


--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: -
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
    'GENERAL_ANNOUNCEMENT',
    'FEEDBACK_INVITATION',
    'FEEDBACK_REMINDER',
    'FEEDBACK_PIX_APPROVED',
    'FEEDBACK_PIX_REJECTED',
    'FEEDBACK_PIX_REVERTED',
    'FEEDBACK_CONTENT_APPROVED',
    'NEW_STUDENT_REGISTRATION',
    'REIMBURSEMENT_REQUESTED',
    'REIMBURSEMENT_APPROVED',
    'REIMBURSEMENT_REJECTED',
    'TRUCK_MAINTENANCE_ALERT',
    'TRIP_SCHEDULED'
);


--
-- Name: Period; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Period" AS ENUM (
    'MORNING',
    'AFTERNOON',
    'EVENING'
);


--
-- Name: PixKeyType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PixKeyType" AS ENUM (
    'CPF',
    'EMAIL',
    'PHONE',
    'RANDOM'
);


--
-- Name: RaceColor; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RaceColor" AS ENUM (
    'WHITE',
    'BLACK',
    'BROWN',
    'YELLOW',
    'INDIGENOUS',
    'PREFER_NOT_TO_SAY'
);


--
-- Name: RegistrationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RegistrationStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: ReimbursementType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReimbursementType" AS ENUM (
    'CLASSROOM_MATERIAL',
    'CLEANING_MATERIAL',
    'EMERGENCY_REPAIR',
    'FOOD',
    'OTHER'
);


--
-- Name: SocialProgram; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SocialProgram" AS ENUM (
    'NONE',
    'BOLSA_FAMILIA',
    'BPC',
    'AUXILIO_BRASIL',
    'OTHER',
    'PE_DE_MEIA'
);


--
-- Name: StockItemCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockItemCategory" AS ENUM (
    'CONSUMIVEL',
    'DIDATICO',
    'LIMPEZA',
    'EQUIPAMENTO',
    'EPI',
    'ALIMENTACAO',
    'ESCRITORIO',
    'OUTRO'
);


--
-- Name: StockMovementType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockMovementType" AS ENUM (
    'ENTRADA',
    'SAIDA',
    'TRANSFERENCIA',
    'DEVOLUCAO',
    'AJUSTE',
    'PERDA',
    'REPOSICAO',
    'ENCOMENDA'
);


--
-- Name: StockPurchaseRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockPurchaseRequestStatus" AS ENUM (
    'PENDENTE',
    'APROVADA',
    'RECEBIDA',
    'REJEITADA',
    'CANCELADA'
);


--
-- Name: TripStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TripStatus" AS ENUM (
    'PLANNED',
    'IN_TRANSIT',
    'COMPLETED'
);


--
-- Name: TruckStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TruckStatus" AS ENUM (
    'AVAILABLE',
    'IN_USE',
    'MAINTENANCE',
    'INACTIVE'
);


--
-- Name: TruckType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TruckType" AS ENUM (
    'STANDARD',
    'MULTICOURSE'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'COORDINATOR',
    'FINANCIAL',
    'TEACHER',
    'STUDENT',
    'DRIVER',
    'IT_ADMIN'
);


--
-- Name: Zone; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Zone" AS ENUM (
    'URBAN',
    'RURAL'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: absences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.absences (
    id text NOT NULL,
    "userId" text NOT NULL,
    type public."AbsenceType" DEFAULT 'OTHER'::public."AbsenceType" NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    description text NOT NULL,
    "documentUrl" text,
    status public."AbsenceStatus" DEFAULT 'PENDING'::public."AbsenceStatus" NOT NULL,
    "adminNote" text,
    penalty numeric(10,2),
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: acao_custos; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: acao_equipe; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: acao_funcionarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.acao_funcionarios (
    id text NOT NULL,
    "acaoId" text NOT NULL,
    "employeeId" text NOT NULL,
    "valorDiaria" numeric(10,2) NOT NULL,
    "diasTrabalhados" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: acao_stock_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.acao_stock_reservations (
    id text NOT NULL,
    "acaoId" text NOT NULL,
    "stockItemId" text NOT NULL,
    "truckId" text,
    "quantidadePrevista" numeric(12,3) NOT NULL,
    "quantidadeConsumida" numeric(12,3) DEFAULT 0 NOT NULL,
    prioridade text DEFAULT 'NORMAL'::text NOT NULL,
    observacao text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text
);


--
-- Name: acao_turmas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.acao_turmas (
    id text NOT NULL,
    "acaoId" text NOT NULL,
    "turmaId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: acoes; Type: TABLE; Schema: public; Owner: -
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
    "cidadeNome" text NOT NULL,
    "localEndereco" text,
    "localReferencia" text,
    "localLatitude" double precision,
    "localLongitude" double precision,
    "destinationNeighborhood" text,
    "originCidadeId" text,
    "originNeighborhood" text,
    "routeType" text DEFAULT 'INTERCIDADE'::text NOT NULL
);


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: attendance_justifications; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: attendances; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: certificate_template_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificate_template_versions (
    id text NOT NULL,
    "templateId" text NOT NULL,
    version integer NOT NULL,
    title text NOT NULL,
    "templateType" public."CertificateTemplateType" NOT NULL,
    "htmlContent" text,
    "cssContent" text,
    "pdfPath" text,
    placeholders jsonb,
    notes text,
    status public."CertificateTemplateStatus" DEFAULT 'DRAFT'::public."CertificateTemplateStatus" NOT NULL,
    "createdById" text NOT NULL,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "publishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "pdfTextOverrides" jsonb,
    "coordinateOverrides" jsonb
);


--
-- Name: certificate_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificate_templates (
    id text NOT NULL,
    key text NOT NULL,
    scope public."CertificateTemplateScope" NOT NULL,
    "courseId" text,
    state text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "currentVersionId" text
);


--
-- Name: certificates; Type: TABLE; Schema: public; Owner: -
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
    "cancelledBy" text,
    "templateVersionId" text
);


--
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id text NOT NULL,
    name text NOT NULL,
    state text NOT NULL,
    "ibgeCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    latitude double precision,
    longitude double precision
);


--
-- Name: class_holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_holidays (
    id text NOT NULL,
    "classId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    reason text NOT NULL,
    "registeredBy" text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "endDateBeforePush" timestamp(3) without time zone
);


--
-- Name: class_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_schedules (
    id text NOT NULL,
    "classId" text NOT NULL,
    weekday integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: class_teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_teachers (
    id text NOT NULL,
    "classId" text NOT NULL,
    "teacherId" text NOT NULL,
    "isSubstitute" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: classes; Type: TABLE; Schema: public; Owner: -
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "reserveSlots" integer DEFAULT 4 NOT NULL,
    "locationName" text,
    "locationAddress" text,
    "locationReference" text,
    "locationLatitude" double precision,
    "locationLongitude" double precision,
    "weekendPolicy" public."ClassWeekendPolicy" DEFAULT 'FOLLOW_SCHEDULE'::public."ClassWeekendPolicy" NOT NULL,
    "weekendExtraDates" jsonb,
    "destinationNeighborhood" text,
    "originCityId" text,
    "originNeighborhood" text,
    "routeType" text DEFAULT 'INTERCIDADE'::text NOT NULL
);


--
-- Name: contas_pagar; Type: TABLE; Schema: public; Owner: -
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: course_feedbacks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_feedbacks (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "classId" text NOT NULL,
    "certificateId" text NOT NULL,
    status public."FeedbackStatus" DEFAULT 'PENDING_STUDENT_RESPONSE'::public."FeedbackStatus" NOT NULL,
    "ratingCourse" integer,
    "ratingSystem" integer,
    "ratingManagement" integer,
    "ratingTeachers" integer,
    "ratingGeneral" integer,
    "commentPositive" text,
    "commentImprovement" text,
    "commentGeneral" text,
    "currentStatus" public."FeedbackCurrentStatus",
    "currentStatusDetails" text,
    "currentPhotoUrl" text,
    "currentVideoUrl" text,
    "pixKeyType" public."PixKeyType",
    "pixKey" text,
    "pixAmount" numeric(10,2),
    "invitedChannels" text[],
    "invitedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastReminderAt" timestamp(3) without time zone,
    "reminderCount" integer DEFAULT 0 NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "submittedAt" timestamp(3) without time zone,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "revertedBy" text,
    "revertedAt" timestamp(3) without time zone,
    "revertReason" text,
    "contaPagarId" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "socialPostPlatform" text,
    "socialPostUrl" text,
    "socialPostProofUrl" text,
    "socialPostedAt" timestamp(3) without time zone,
    "contentApprovedAt" timestamp(3) without time zone,
    "contentApprovedBy" text,
    "studentSubmitSequence" integer DEFAULT 0 NOT NULL,
    "resubmittedAfterReject" boolean DEFAULT false NOT NULL,
    "rejectionHistoryJson" jsonb,
    "rewardPaidAt" timestamp(3) without time zone,
    "rewardPaymentReference" text,
    "rewardStatus" public."FeedbackRewardStatus" DEFAULT 'PENDING'::public."FeedbackRewardStatus" NOT NULL,
    "sharedOnSocial" boolean DEFAULT false NOT NULL
);


--
-- Name: course_modules; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "institutionId" text NOT NULL
);


--
-- Name: data_deletion_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_deletion_requests (
    id text NOT NULL,
    "userId" text NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "processedBy" text,
    status text DEFAULT 'PENDING'::text NOT NULL
);


--
-- Name: driver_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.driver_checkins (
    id text NOT NULL,
    "userId" text NOT NULL,
    "checkedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    date text NOT NULL,
    note text
);


--
-- Name: driver_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.driver_locations (
    id text NOT NULL,
    "driverUserId" text NOT NULL,
    "tripId" text,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    accuracy double precision,
    speed double precision,
    heading double precision,
    source text DEFAULT 'polling'::text NOT NULL,
    "capturedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: employee_attendances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_attendances (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    present boolean NOT NULL,
    justified boolean DEFAULT false NOT NULL,
    justification text,
    "registeredBy" text NOT NULL,
    "registeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: employee_registration_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_registration_requests (
    id text NOT NULL,
    "tokenId" text NOT NULL,
    status public."RegistrationStatus" DEFAULT 'PENDING'::public."RegistrationStatus" NOT NULL,
    name text NOT NULL,
    cpf text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    "birthDate" timestamp(3) without time zone,
    "submittedData" jsonb NOT NULL,
    "rejectionReason" text,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: employee_registration_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_registration_tokens (
    id text NOT NULL,
    token text NOT NULL,
    role public."EmployeeRole" NOT NULL,
    department public."EmployeeDepartment" NOT NULL,
    "createdBy" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id text NOT NULL,
    name text NOT NULL,
    role public."EmployeeRole" NOT NULL,
    department public."EmployeeDepartment" NOT NULL,
    cpf text,
    phone text,
    email text,
    specialty text,
    "dailyCost" numeric(10,2),
    "hireDate" timestamp(3) without time zone,
    notes text,
    "photoUrl" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "contractType" public."ContractType",
    "monthlySalaryCLT" numeric(12,2),
    "travelRuleKm" integer DEFAULT 200,
    "userId" text,
    documents jsonb
);


--
-- Name: enrollment_consents; Type: TABLE; Schema: public; Owner: -
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
    "userAgent" text,
    "attendanceCommitment" boolean DEFAULT false NOT NULL
);


--
-- Name: enrollment_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollment_documents (
    id text NOT NULL,
    "enrollmentId" text NOT NULL,
    "documentType" public."DocumentType" NOT NULL,
    "fileUrl" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id text NOT NULL,
    name text NOT NULL,
    state text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: institutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institutions (
    id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    "shortName" text,
    "logoUrl" text,
    "siteUrl" text,
    "primaryColor" text,
    "signPfxPath" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: material_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material_comments (
    id text NOT NULL,
    "materialId" text NOT NULL,
    "userId" text NOT NULL,
    comment text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: reimbursements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reimbursements (
    id text NOT NULL,
    "requestedBy" text NOT NULL,
    "employeeId" text,
    "acaoId" text,
    type public."ReimbursementType" DEFAULT 'OTHER'::public."ReimbursementType" NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text NOT NULL,
    "receiptUrl" text,
    status public."ExpenseStatus" DEFAULT 'PENDING'::public."ExpenseStatus" NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: stock_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_categories (
    id text NOT NULL,
    nome text NOT NULL,
    slug text NOT NULL,
    icon text NOT NULL,
    color text NOT NULL,
    description text,
    "isDefault" boolean DEFAULT false NOT NULL,
    "defaultEnum" public."StockItemCategory",
    active boolean DEFAULT true NOT NULL,
    "createdBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: stock_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_items (
    id text NOT NULL,
    nome text NOT NULL,
    "codigoInterno" text,
    categoria public."StockItemCategory" NOT NULL,
    "customCategoryId" text,
    unidade text NOT NULL,
    "quantidadeAtual" numeric(12,3) DEFAULT 0 NOT NULL,
    "quantidadeEmTransito" numeric(12,3) DEFAULT 0 NOT NULL,
    "quantidadeMinima" numeric(12,3) DEFAULT 0 NOT NULL,
    validade timestamp(3) without time zone,
    fornecedor text,
    "precoUnitario" numeric(10,2),
    localizacao text,
    "fotoUrl" text,
    observacoes text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements (
    id text NOT NULL,
    type public."StockMovementType" NOT NULL,
    "stockItemId" text NOT NULL,
    quantidade numeric(12,3) NOT NULL,
    "fromTruckId" text,
    "toTruckId" text,
    "acaoId" text,
    "purchaseRequestId" text,
    "registeredBy" text NOT NULL,
    observacao text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: stock_purchase_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_purchase_requests (
    id text NOT NULL,
    "stockItemId" text NOT NULL,
    quantidade numeric(12,3) NOT NULL,
    "precoUnitario" numeric(10,2) NOT NULL,
    "valorTotal" numeric(12,2) NOT NULL,
    fornecedor text,
    urgente boolean DEFAULT false NOT NULL,
    justificativa text NOT NULL,
    "comprovanteUrl" text,
    status public."StockPurchaseRequestStatus" DEFAULT 'PENDENTE'::public."StockPurchaseRequestStatus" NOT NULL,
    "requestedBy" text NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "reviewNote" text,
    "contaPagarId" text,
    "movementId" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: student_addresses; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: student_contacts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: student_legal_consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_legal_consents (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "enrollmentId" text,
    "termsAccepted" boolean NOT NULL,
    "dataProcessingConsent" boolean NOT NULL,
    "imageUseAuthorization" boolean NOT NULL,
    "attendanceCommitment" boolean NOT NULL,
    "privacyPolicyAccepted" boolean NOT NULL,
    "recordedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text,
    "userAgent" text
);


--
-- Name: student_professional; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_professional (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "previousQualification" text,
    "professionalInterest" text,
    "howHeardAbout" text,
    motivation text,
    "careerGoal" public."CareerGoal" NOT NULL
);


--
-- Name: student_socioeconomic; Type: TABLE; Schema: public; Owner: -
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
    "familyIncome" public."FamilyIncome" NOT NULL,
    "publicSchoolOnly" boolean DEFAULT false NOT NULL
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id text NOT NULL,
    "userId" text NOT NULL,
    cpf text NOT NULL,
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
    "socialName" text,
    documents jsonb
);


--
-- Name: system_configs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: teacher_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_checkins (
    id text NOT NULL,
    "userId" text NOT NULL,
    "checkedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    date text NOT NULL,
    note text
);


--
-- Name: teacher_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_courses (
    id text NOT NULL,
    "teacherId" text NOT NULL,
    "courseId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teachers (
    id text NOT NULL,
    "userId" text NOT NULL,
    cpf text NOT NULL,
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    documents jsonb
);


--
-- Name: trips; Type: TABLE; Schema: public; Owner: -
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "driverUserId" text,
    "auditValidatedAt" timestamp(3) without time zone,
    "auditValidatedByUserId" text,
    "destinationCep" text,
    "destinationLatitude" double precision,
    "destinationLongitude" double precision,
    "driverDecision" text DEFAULT 'PENDING'::text NOT NULL,
    "driverDecisionAt" timestamp(3) without time zone,
    "driverDecisionReason" text,
    "endOdometerPhotoUrl" text,
    "gpsDistanceKm" double precision,
    "originCep" text,
    "originLatitude" double precision,
    "originLongitude" double precision,
    "rejectionPenalty" numeric(10,2),
    "rejectionPenaltyAt" timestamp(3) without time zone,
    "rejectionPenaltyBy" text,
    "startOdometerPhotoUrl" text
);


--
-- Name: truck_maintenances; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: truck_stock_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.truck_stock_items (
    id text NOT NULL,
    "truckId" text NOT NULL,
    "stockItemId" text NOT NULL,
    "quantidadeAtual" numeric(12,3) DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: trucks; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id text NOT NULL,
    "userId" text NOT NULL,
    "notifEmail" boolean DEFAULT true NOT NULL,
    "notifCertificado" boolean DEFAULT true NOT NULL,
    "notifInscricao" boolean DEFAULT true NOT NULL,
    "notifFrequencia" boolean DEFAULT true NOT NULL,
    animacoes boolean DEFAULT true NOT NULL,
    "fonteGrande" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
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
    cpf text,
    "twoFactorEnabled" boolean DEFAULT false NOT NULL,
    "twoFactorSecret" text,
    "emailOtpAttempts" integer DEFAULT 0 NOT NULL,
    "emailOtpExpiresAt" timestamp(3) without time zone,
    "emailOtpHash" text,
    "requiresPasswordChange" boolean DEFAULT false NOT NULL,
    "requiresTwoFactorSetup" boolean DEFAULT false NOT NULL
);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: absences absences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.absences
    ADD CONSTRAINT absences_pkey PRIMARY KEY (id);


--
-- Name: acao_custos acao_custos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_custos
    ADD CONSTRAINT acao_custos_pkey PRIMARY KEY (id);


--
-- Name: acao_equipe acao_equipe_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_equipe
    ADD CONSTRAINT acao_equipe_pkey PRIMARY KEY (id);


--
-- Name: acao_funcionarios acao_funcionarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_funcionarios
    ADD CONSTRAINT acao_funcionarios_pkey PRIMARY KEY (id);


--
-- Name: acao_stock_reservations acao_stock_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_stock_reservations
    ADD CONSTRAINT acao_stock_reservations_pkey PRIMARY KEY (id);


--
-- Name: acao_turmas acao_turmas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_turmas
    ADD CONSTRAINT acao_turmas_pkey PRIMARY KEY (id);


--
-- Name: acoes acoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acoes
    ADD CONSTRAINT acoes_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: attendance_justifications attendance_justifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_justifications
    ADD CONSTRAINT attendance_justifications_pkey PRIMARY KEY (id);


--
-- Name: attendances attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: certificate_template_versions certificate_template_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_template_versions
    ADD CONSTRAINT certificate_template_versions_pkey PRIMARY KEY (id);


--
-- Name: certificate_templates certificate_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_templates
    ADD CONSTRAINT certificate_templates_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: class_holidays class_holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_holidays
    ADD CONSTRAINT class_holidays_pkey PRIMARY KEY (id);


--
-- Name: class_schedules class_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_schedules
    ADD CONSTRAINT class_schedules_pkey PRIMARY KEY (id);


--
-- Name: class_teachers class_teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_teachers
    ADD CONSTRAINT class_teachers_pkey PRIMARY KEY (id);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: contas_pagar contas_pagar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contas_pagar
    ADD CONSTRAINT contas_pagar_pkey PRIMARY KEY (id);


--
-- Name: course_feedbacks course_feedbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_feedbacks
    ADD CONSTRAINT course_feedbacks_pkey PRIMARY KEY (id);


--
-- Name: course_modules course_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT course_modules_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: data_deletion_requests data_deletion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_deletion_requests
    ADD CONSTRAINT data_deletion_requests_pkey PRIMARY KEY (id);


--
-- Name: driver_checkins driver_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_checkins
    ADD CONSTRAINT driver_checkins_pkey PRIMARY KEY (id);


--
-- Name: driver_locations driver_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_locations
    ADD CONSTRAINT driver_locations_pkey PRIMARY KEY (id);


--
-- Name: employee_attendances employee_attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendances
    ADD CONSTRAINT employee_attendances_pkey PRIMARY KEY (id);


--
-- Name: employee_registration_requests employee_registration_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_registration_requests
    ADD CONSTRAINT employee_registration_requests_pkey PRIMARY KEY (id);


--
-- Name: employee_registration_tokens employee_registration_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_registration_tokens
    ADD CONSTRAINT employee_registration_tokens_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: enrollment_consents enrollment_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollment_consents
    ADD CONSTRAINT enrollment_consents_pkey PRIMARY KEY (id);


--
-- Name: enrollment_documents enrollment_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollment_documents
    ADD CONSTRAINT enrollment_documents_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: institutions institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_pkey PRIMARY KEY (id);


--
-- Name: material_comments material_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_comments
    ADD CONSTRAINT material_comments_pkey PRIMARY KEY (id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: reimbursements reimbursements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reimbursements
    ADD CONSTRAINT reimbursements_pkey PRIMARY KEY (id);


--
-- Name: stock_categories stock_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_categories
    ADD CONSTRAINT stock_categories_pkey PRIMARY KEY (id);


--
-- Name: stock_items stock_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: stock_purchase_requests stock_purchase_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_purchase_requests
    ADD CONSTRAINT stock_purchase_requests_pkey PRIMARY KEY (id);


--
-- Name: student_addresses student_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_addresses
    ADD CONSTRAINT student_addresses_pkey PRIMARY KEY (id);


--
-- Name: student_contacts student_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_contacts
    ADD CONSTRAINT student_contacts_pkey PRIMARY KEY (id);


--
-- Name: student_legal_consents student_legal_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_legal_consents
    ADD CONSTRAINT student_legal_consents_pkey PRIMARY KEY (id);


--
-- Name: student_professional student_professional_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_professional
    ADD CONSTRAINT student_professional_pkey PRIMARY KEY (id);


--
-- Name: student_socioeconomic student_socioeconomic_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_socioeconomic
    ADD CONSTRAINT student_socioeconomic_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- Name: teacher_checkins teacher_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_checkins
    ADD CONSTRAINT teacher_checkins_pkey PRIMARY KEY (id);


--
-- Name: teacher_courses teacher_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_courses
    ADD CONSTRAINT teacher_courses_pkey PRIMARY KEY (id);


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: truck_maintenances truck_maintenances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.truck_maintenances
    ADD CONSTRAINT truck_maintenances_pkey PRIMARY KEY (id);


--
-- Name: truck_stock_items truck_stock_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.truck_stock_items
    ADD CONSTRAINT truck_stock_items_pkey PRIMARY KEY (id);


--
-- Name: trucks trucks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: absences_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX absences_date_idx ON public.absences USING btree (date);


--
-- Name: absences_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX absences_status_idx ON public.absences USING btree (status);


--
-- Name: absences_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "absences_userId_idx" ON public.absences USING btree ("userId");


--
-- Name: acao_custos_acaoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "acao_custos_acaoId_idx" ON public.acao_custos USING btree ("acaoId");


--
-- Name: acao_custos_tipo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX acao_custos_tipo_idx ON public.acao_custos USING btree (tipo);


--
-- Name: acao_equipe_acaoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "acao_equipe_acaoId_idx" ON public.acao_equipe USING btree ("acaoId");


--
-- Name: acao_equipe_acaoId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "acao_equipe_acaoId_userId_key" ON public.acao_equipe USING btree ("acaoId", "userId");


--
-- Name: acao_equipe_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "acao_equipe_userId_idx" ON public.acao_equipe USING btree ("userId");


--
-- Name: acao_funcionarios_acaoId_employeeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "acao_funcionarios_acaoId_employeeId_key" ON public.acao_funcionarios USING btree ("acaoId", "employeeId");


--
-- Name: acao_funcionarios_acaoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "acao_funcionarios_acaoId_idx" ON public.acao_funcionarios USING btree ("acaoId");


--
-- Name: acao_funcionarios_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "acao_funcionarios_employeeId_idx" ON public.acao_funcionarios USING btree ("employeeId");


--
-- Name: acao_stock_reservations_acaoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "acao_stock_reservations_acaoId_idx" ON public.acao_stock_reservations USING btree ("acaoId");


--
-- Name: acao_stock_reservations_acaoId_stockItemId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "acao_stock_reservations_acaoId_stockItemId_key" ON public.acao_stock_reservations USING btree ("acaoId", "stockItemId");


--
-- Name: acao_stock_reservations_stockItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "acao_stock_reservations_stockItemId_idx" ON public.acao_stock_reservations USING btree ("stockItemId");


--
-- Name: acao_stock_reservations_truckId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "acao_stock_reservations_truckId_idx" ON public.acao_stock_reservations USING btree ("truckId");


--
-- Name: acao_turmas_acaoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "acao_turmas_acaoId_idx" ON public.acao_turmas USING btree ("acaoId");


--
-- Name: acao_turmas_acaoId_turmaId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "acao_turmas_acaoId_turmaId_key" ON public.acao_turmas USING btree ("acaoId", "turmaId");


--
-- Name: acao_turmas_turmaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "acao_turmas_turmaId_idx" ON public.acao_turmas USING btree ("turmaId");


--
-- Name: acoes_carretaId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "acoes_carretaId_idx" ON public.acoes USING btree ("carretaId");


--
-- Name: acoes_cidadeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "acoes_cidadeId_idx" ON public.acoes USING btree ("cidadeId");


--
-- Name: acoes_dataInicio_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "acoes_dataInicio_idx" ON public.acoes USING btree ("dataInicio");


--
-- Name: acoes_grupoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "acoes_grupoId_idx" ON public.acoes USING btree ("grupoId");


--
-- Name: acoes_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX acoes_status_idx ON public.acoes USING btree (status);


--
-- Name: api_keys_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX api_keys_active_idx ON public.api_keys USING btree (active);


--
-- Name: api_keys_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX api_keys_key_idx ON public.api_keys USING btree (key);


--
-- Name: api_keys_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX api_keys_key_key ON public.api_keys USING btree (key);


--
-- Name: attendance_justifications_attendanceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "attendance_justifications_attendanceId_idx" ON public.attendance_justifications USING btree ("attendanceId");


--
-- Name: attendance_justifications_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendance_justifications_status_idx ON public.attendance_justifications USING btree (status);


--
-- Name: attendances_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "attendances_classId_idx" ON public.attendances USING btree ("classId");


--
-- Name: attendances_classId_studentId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "attendances_classId_studentId_date_key" ON public.attendances USING btree ("classId", "studentId", date);


--
-- Name: attendances_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendances_date_idx ON public.attendances USING btree (date);


--
-- Name: attendances_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "attendances_studentId_idx" ON public.attendances USING btree ("studentId");


--
-- Name: audit_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_createdAt_idx" ON public.audit_logs USING btree ("createdAt");


--
-- Name: audit_logs_tableName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_tableName_idx" ON public.audit_logs USING btree ("tableName");


--
-- Name: audit_logs_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_userId_idx" ON public.audit_logs USING btree ("userId");


--
-- Name: certificate_template_versions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX certificate_template_versions_status_idx ON public.certificate_template_versions USING btree (status);


--
-- Name: certificate_template_versions_templateId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certificate_template_versions_templateId_idx" ON public.certificate_template_versions USING btree ("templateId");


--
-- Name: certificate_template_versions_templateId_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "certificate_template_versions_templateId_version_key" ON public.certificate_template_versions USING btree ("templateId", version);


--
-- Name: certificate_templates_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certificate_templates_courseId_idx" ON public.certificate_templates USING btree ("courseId");


--
-- Name: certificate_templates_currentVersionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "certificate_templates_currentVersionId_key" ON public.certificate_templates USING btree ("currentVersionId");


--
-- Name: certificate_templates_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX certificate_templates_key_key ON public.certificate_templates USING btree (key);


--
-- Name: certificate_templates_scope_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX certificate_templates_scope_idx ON public.certificate_templates USING btree (scope);


--
-- Name: certificate_templates_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX certificate_templates_state_idx ON public.certificate_templates USING btree (state);


--
-- Name: certificates_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certificates_classId_idx" ON public.certificates USING btree ("classId");


--
-- Name: certificates_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX certificates_status_idx ON public.certificates USING btree (status);


--
-- Name: certificates_studentId_classId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "certificates_studentId_classId_key" ON public.certificates USING btree ("studentId", "classId");


--
-- Name: certificates_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certificates_studentId_idx" ON public.certificates USING btree ("studentId");


--
-- Name: certificates_templateVersionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certificates_templateVersionId_idx" ON public.certificates USING btree ("templateVersionId");


--
-- Name: certificates_verificationCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certificates_verificationCode_idx" ON public.certificates USING btree ("verificationCode");


--
-- Name: certificates_verificationCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "certificates_verificationCode_key" ON public.certificates USING btree ("verificationCode");


--
-- Name: cities_name_state_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cities_name_state_key ON public.cities USING btree (name, state);


--
-- Name: cities_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cities_state_idx ON public.cities USING btree (state);


--
-- Name: class_holidays_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "class_holidays_classId_idx" ON public.class_holidays USING btree ("classId");


--
-- Name: class_holidays_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_holidays_date_idx ON public.class_holidays USING btree (date);


--
-- Name: class_schedules_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "class_schedules_classId_idx" ON public.class_schedules USING btree ("classId");


--
-- Name: class_teachers_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "class_teachers_classId_idx" ON public.class_teachers USING btree ("classId");


--
-- Name: class_teachers_classId_teacherId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "class_teachers_classId_teacherId_key" ON public.class_teachers USING btree ("classId", "teacherId");


--
-- Name: class_teachers_teacherId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "class_teachers_teacherId_idx" ON public.class_teachers USING btree ("teacherId");


--
-- Name: classes_cityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "classes_cityId_idx" ON public.classes USING btree ("cityId");


--
-- Name: classes_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "classes_courseId_idx" ON public.classes USING btree ("courseId");


--
-- Name: classes_groupId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "classes_groupId_idx" ON public.classes USING btree ("groupId");


--
-- Name: classes_startDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "classes_startDate_idx" ON public.classes USING btree ("startDate");


--
-- Name: classes_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX classes_status_idx ON public.classes USING btree (status);


--
-- Name: classes_truckId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "classes_truckId_idx" ON public.classes USING btree ("truckId");


--
-- Name: contas_pagar_acaoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "contas_pagar_acaoId_idx" ON public.contas_pagar USING btree ("acaoId");


--
-- Name: contas_pagar_data_vencimento_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contas_pagar_data_vencimento_idx ON public.contas_pagar USING btree (data_vencimento);


--
-- Name: contas_pagar_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contas_pagar_status_idx ON public.contas_pagar USING btree (status);


--
-- Name: contas_pagar_tipo_conta_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contas_pagar_tipo_conta_idx ON public.contas_pagar USING btree (tipo_conta);


--
-- Name: course_feedbacks_certificateId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "course_feedbacks_certificateId_key" ON public.course_feedbacks USING btree ("certificateId");


--
-- Name: course_feedbacks_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "course_feedbacks_classId_idx" ON public.course_feedbacks USING btree ("classId");


--
-- Name: course_feedbacks_contaPagarId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "course_feedbacks_contaPagarId_key" ON public.course_feedbacks USING btree ("contaPagarId");


--
-- Name: course_feedbacks_invitedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "course_feedbacks_invitedAt_idx" ON public.course_feedbacks USING btree ("invitedAt");


--
-- Name: course_feedbacks_rewardStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "course_feedbacks_rewardStatus_idx" ON public.course_feedbacks USING btree ("rewardStatus");


--
-- Name: course_feedbacks_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX course_feedbacks_status_idx ON public.course_feedbacks USING btree (status);


--
-- Name: course_feedbacks_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "course_feedbacks_studentId_idx" ON public.course_feedbacks USING btree ("studentId");


--
-- Name: course_modules_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "course_modules_courseId_idx" ON public.course_modules USING btree ("courseId");


--
-- Name: courses_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX courses_active_idx ON public.courses USING btree (active);


--
-- Name: courses_institutionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "courses_institutionId_idx" ON public.courses USING btree ("institutionId");


--
-- Name: courses_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX courses_name_idx ON public.courses USING btree (name);


--
-- Name: data_deletion_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX data_deletion_requests_status_idx ON public.data_deletion_requests USING btree (status);


--
-- Name: data_deletion_requests_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "data_deletion_requests_userId_idx" ON public.data_deletion_requests USING btree ("userId");


--
-- Name: driver_checkins_userId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "driver_checkins_userId_date_key" ON public.driver_checkins USING btree ("userId", date);


--
-- Name: driver_locations_capturedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "driver_locations_capturedAt_idx" ON public.driver_locations USING btree ("capturedAt");


--
-- Name: driver_locations_driverUserId_capturedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "driver_locations_driverUserId_capturedAt_idx" ON public.driver_locations USING btree ("driverUserId", "capturedAt");


--
-- Name: driver_locations_tripId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "driver_locations_tripId_idx" ON public.driver_locations USING btree ("tripId");


--
-- Name: employee_attendances_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employee_attendances_date_idx ON public.employee_attendances USING btree (date);


--
-- Name: employee_attendances_employeeId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "employee_attendances_employeeId_date_key" ON public.employee_attendances USING btree ("employeeId", date);


--
-- Name: employee_attendances_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "employee_attendances_employeeId_idx" ON public.employee_attendances USING btree ("employeeId");


--
-- Name: employee_registration_requests_cpf_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX employee_registration_requests_cpf_key ON public.employee_registration_requests USING btree (cpf);


--
-- Name: employee_registration_requests_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX employee_registration_requests_email_key ON public.employee_registration_requests USING btree (email);


--
-- Name: employee_registration_requests_tokenId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "employee_registration_requests_tokenId_key" ON public.employee_registration_requests USING btree ("tokenId");


--
-- Name: employee_registration_tokens_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employee_registration_tokens_token_idx ON public.employee_registration_tokens USING btree (token);


--
-- Name: employee_registration_tokens_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX employee_registration_tokens_token_key ON public.employee_registration_tokens USING btree (token);


--
-- Name: employees_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_active_idx ON public.employees USING btree (active);


--
-- Name: employees_cpf_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX employees_cpf_key ON public.employees USING btree (cpf);


--
-- Name: employees_department_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_department_idx ON public.employees USING btree (department);


--
-- Name: employees_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX employees_email_key ON public.employees USING btree (email);


--
-- Name: employees_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_role_idx ON public.employees USING btree (role);


--
-- Name: employees_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "employees_userId_key" ON public.employees USING btree ("userId");


--
-- Name: enrollment_consents_enrollmentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "enrollment_consents_enrollmentId_key" ON public.enrollment_consents USING btree ("enrollmentId");


--
-- Name: enrollment_documents_enrollmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "enrollment_documents_enrollmentId_idx" ON public.enrollment_documents USING btree ("enrollmentId");


--
-- Name: enrollments_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "enrollments_classId_idx" ON public.enrollments USING btree ("classId");


--
-- Name: enrollments_protocol_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enrollments_protocol_idx ON public.enrollments USING btree (protocol);


--
-- Name: enrollments_protocol_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX enrollments_protocol_key ON public.enrollments USING btree (protocol);


--
-- Name: enrollments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enrollments_status_idx ON public.enrollments USING btree (status);


--
-- Name: enrollments_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "enrollments_studentId_idx" ON public.enrollments USING btree ("studentId");


--
-- Name: expenses_expenseDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_expenseDate_idx" ON public.expenses USING btree ("expenseDate");


--
-- Name: expenses_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expenses_status_idx ON public.expenses USING btree (status);


--
-- Name: expenses_tripId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_tripId_idx" ON public.expenses USING btree ("tripId");


--
-- Name: expenses_truckId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_truckId_idx" ON public.expenses USING btree ("truckId");


--
-- Name: groups_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX groups_name_key ON public.groups USING btree (name);


--
-- Name: institutions_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX institutions_slug_key ON public.institutions USING btree (slug);


--
-- Name: material_comments_materialId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "material_comments_materialId_idx" ON public.material_comments USING btree ("materialId");


--
-- Name: material_comments_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "material_comments_userId_idx" ON public.material_comments USING btree ("userId");


--
-- Name: materials_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "materials_classId_idx" ON public.materials USING btree ("classId");


--
-- Name: materials_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "materials_courseId_idx" ON public.materials USING btree ("courseId");


--
-- Name: materials_teacherId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "materials_teacherId_idx" ON public.materials USING btree ("teacherId");


--
-- Name: materials_uploadedBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "materials_uploadedBy_idx" ON public.materials USING btree ("uploadedBy");


--
-- Name: notifications_deliveryStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notifications_deliveryStatus_idx" ON public.notifications USING btree ("deliveryStatus");


--
-- Name: notifications_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_type_idx ON public.notifications USING btree (type);


--
-- Name: notifications_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notifications_userId_idx" ON public.notifications USING btree ("userId");


--
-- Name: refresh_tokens_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_token_idx ON public.refresh_tokens USING btree (token);


--
-- Name: refresh_tokens_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX refresh_tokens_token_key ON public.refresh_tokens USING btree (token);


--
-- Name: refresh_tokens_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "refresh_tokens_userId_idx" ON public.refresh_tokens USING btree ("userId");


--
-- Name: reimbursements_acaoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "reimbursements_acaoId_idx" ON public.reimbursements USING btree ("acaoId");


--
-- Name: reimbursements_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "reimbursements_createdAt_idx" ON public.reimbursements USING btree ("createdAt");


--
-- Name: reimbursements_requestedBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "reimbursements_requestedBy_idx" ON public.reimbursements USING btree ("requestedBy");


--
-- Name: reimbursements_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reimbursements_status_idx ON public.reimbursements USING btree (status);


--
-- Name: stock_categories_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_categories_active_idx ON public.stock_categories USING btree (active);


--
-- Name: stock_categories_isDefault_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_categories_isDefault_idx" ON public.stock_categories USING btree ("isDefault");


--
-- Name: stock_categories_nome_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX stock_categories_nome_key ON public.stock_categories USING btree (nome);


--
-- Name: stock_categories_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX stock_categories_slug_key ON public.stock_categories USING btree (slug);


--
-- Name: stock_items_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_items_active_idx ON public.stock_items USING btree (active);


--
-- Name: stock_items_categoria_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_items_categoria_idx ON public.stock_items USING btree (categoria);


--
-- Name: stock_items_codigoInterno_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "stock_items_codigoInterno_key" ON public.stock_items USING btree ("codigoInterno");


--
-- Name: stock_items_customCategoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_items_customCategoryId_idx" ON public.stock_items USING btree ("customCategoryId");


--
-- Name: stock_items_validade_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_items_validade_idx ON public.stock_items USING btree (validade);


--
-- Name: stock_movements_acaoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_movements_acaoId_idx" ON public.stock_movements USING btree ("acaoId");


--
-- Name: stock_movements_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_movements_createdAt_idx" ON public.stock_movements USING btree ("createdAt");


--
-- Name: stock_movements_fromTruckId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_movements_fromTruckId_idx" ON public.stock_movements USING btree ("fromTruckId");


--
-- Name: stock_movements_purchaseRequestId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "stock_movements_purchaseRequestId_key" ON public.stock_movements USING btree ("purchaseRequestId");


--
-- Name: stock_movements_stockItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_movements_stockItemId_idx" ON public.stock_movements USING btree ("stockItemId");


--
-- Name: stock_movements_toTruckId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_movements_toTruckId_idx" ON public.stock_movements USING btree ("toTruckId");


--
-- Name: stock_movements_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_movements_type_idx ON public.stock_movements USING btree (type);


--
-- Name: stock_purchase_requests_contaPagarId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "stock_purchase_requests_contaPagarId_key" ON public.stock_purchase_requests USING btree ("contaPagarId");


--
-- Name: stock_purchase_requests_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_purchase_requests_createdAt_idx" ON public.stock_purchase_requests USING btree ("createdAt");


--
-- Name: stock_purchase_requests_movementId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "stock_purchase_requests_movementId_key" ON public.stock_purchase_requests USING btree ("movementId");


--
-- Name: stock_purchase_requests_requestedBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_purchase_requests_requestedBy_idx" ON public.stock_purchase_requests USING btree ("requestedBy");


--
-- Name: stock_purchase_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_purchase_requests_status_idx ON public.stock_purchase_requests USING btree (status);


--
-- Name: stock_purchase_requests_stockItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "stock_purchase_requests_stockItemId_idx" ON public.stock_purchase_requests USING btree ("stockItemId");


--
-- Name: student_addresses_studentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "student_addresses_studentId_key" ON public.student_addresses USING btree ("studentId");


--
-- Name: student_contacts_studentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "student_contacts_studentId_key" ON public.student_contacts USING btree ("studentId");


--
-- Name: student_legal_consents_studentId_recordedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "student_legal_consents_studentId_recordedAt_idx" ON public.student_legal_consents USING btree ("studentId", "recordedAt");


--
-- Name: student_professional_studentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "student_professional_studentId_key" ON public.student_professional USING btree ("studentId");


--
-- Name: student_socioeconomic_studentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "student_socioeconomic_studentId_key" ON public.student_socioeconomic USING btree ("studentId");


--
-- Name: students_cpf_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX students_cpf_idx ON public.students USING btree (cpf);


--
-- Name: students_cpf_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX students_cpf_key ON public.students USING btree (cpf);


--
-- Name: students_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "students_userId_idx" ON public.students USING btree ("userId");


--
-- Name: students_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "students_userId_key" ON public.students USING btree ("userId");


--
-- Name: system_configs_configKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "system_configs_configKey_idx" ON public.system_configs USING btree ("configKey");


--
-- Name: system_configs_configKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "system_configs_configKey_key" ON public.system_configs USING btree ("configKey");


--
-- Name: teacher_checkins_userId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "teacher_checkins_userId_date_key" ON public.teacher_checkins USING btree ("userId", date);


--
-- Name: teacher_courses_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "teacher_courses_courseId_idx" ON public.teacher_courses USING btree ("courseId");


--
-- Name: teacher_courses_teacherId_courseId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "teacher_courses_teacherId_courseId_key" ON public.teacher_courses USING btree ("teacherId", "courseId");


--
-- Name: teacher_courses_teacherId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "teacher_courses_teacherId_idx" ON public.teacher_courses USING btree ("teacherId");


--
-- Name: teachers_cpf_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teachers_cpf_idx ON public.teachers USING btree (cpf);


--
-- Name: teachers_cpf_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX teachers_cpf_key ON public.teachers USING btree (cpf);


--
-- Name: teachers_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "teachers_userId_idx" ON public.teachers USING btree ("userId");


--
-- Name: teachers_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "teachers_userId_key" ON public.teachers USING btree ("userId");


--
-- Name: trips_driverUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "trips_driverUserId_idx" ON public.trips USING btree ("driverUserId");


--
-- Name: trips_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trips_status_idx ON public.trips USING btree (status);


--
-- Name: trips_truckId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "trips_truckId_idx" ON public.trips USING btree ("truckId");


--
-- Name: truck_maintenances_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX truck_maintenances_status_idx ON public.truck_maintenances USING btree (status);


--
-- Name: truck_maintenances_tipo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX truck_maintenances_tipo_idx ON public.truck_maintenances USING btree (tipo);


--
-- Name: truck_maintenances_truckId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "truck_maintenances_truckId_idx" ON public.truck_maintenances USING btree ("truckId");


--
-- Name: truck_stock_items_stockItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "truck_stock_items_stockItemId_idx" ON public.truck_stock_items USING btree ("stockItemId");


--
-- Name: truck_stock_items_truckId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "truck_stock_items_truckId_idx" ON public.truck_stock_items USING btree ("truckId");


--
-- Name: truck_stock_items_truckId_stockItemId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "truck_stock_items_truckId_stockItemId_key" ON public.truck_stock_items USING btree ("truckId", "stockItemId");


--
-- Name: trucks_groupId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "trucks_groupId_idx" ON public.trucks USING btree ("groupId");


--
-- Name: trucks_identifier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trucks_identifier_idx ON public.trucks USING btree (identifier);


--
-- Name: trucks_identifier_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX trucks_identifier_key ON public.trucks USING btree (identifier);


--
-- Name: trucks_licensePlate_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "trucks_licensePlate_key" ON public.trucks USING btree ("licensePlate");


--
-- Name: trucks_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trucks_status_idx ON public.trucks USING btree (status);


--
-- Name: user_preferences_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_preferences_userId_key" ON public.user_preferences USING btree ("userId");


--
-- Name: users_cpf_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_cpf_key ON public.users USING btree (cpf);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_role_idx ON public.users USING btree (role);


--
-- Name: absences absences_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.absences
    ADD CONSTRAINT "absences_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: acao_custos acao_custos_acaoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_custos
    ADD CONSTRAINT "acao_custos_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES public.acoes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: acao_custos acao_custos_funcionarioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_custos
    ADD CONSTRAINT "acao_custos_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: acao_equipe acao_equipe_acaoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_equipe
    ADD CONSTRAINT "acao_equipe_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES public.acoes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: acao_equipe acao_equipe_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_equipe
    ADD CONSTRAINT "acao_equipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: acao_funcionarios acao_funcionarios_acaoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_funcionarios
    ADD CONSTRAINT "acao_funcionarios_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES public.acoes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: acao_funcionarios acao_funcionarios_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_funcionarios
    ADD CONSTRAINT "acao_funcionarios_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: acao_stock_reservations acao_stock_reservations_acaoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_stock_reservations
    ADD CONSTRAINT "acao_stock_reservations_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES public.acoes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: acao_stock_reservations acao_stock_reservations_stockItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_stock_reservations
    ADD CONSTRAINT "acao_stock_reservations_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES public.stock_items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: acao_stock_reservations acao_stock_reservations_truckId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_stock_reservations
    ADD CONSTRAINT "acao_stock_reservations_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES public.trucks(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: acao_turmas acao_turmas_acaoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_turmas
    ADD CONSTRAINT "acao_turmas_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES public.acoes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: acao_turmas acao_turmas_turmaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acao_turmas
    ADD CONSTRAINT "acao_turmas_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: acoes acoes_carretaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acoes
    ADD CONSTRAINT "acoes_carretaId_fkey" FOREIGN KEY ("carretaId") REFERENCES public.trucks(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: acoes acoes_cidadeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acoes
    ADD CONSTRAINT "acoes_cidadeId_fkey" FOREIGN KEY ("cidadeId") REFERENCES public.cities(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: acoes acoes_grupoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acoes
    ADD CONSTRAINT "acoes_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES public.groups(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: acoes acoes_originCidadeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acoes
    ADD CONSTRAINT "acoes_originCidadeId_fkey" FOREIGN KEY ("originCidadeId") REFERENCES public.cities(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: api_keys api_keys_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "api_keys_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: attendance_justifications attendance_justifications_attendanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_justifications
    ADD CONSTRAINT "attendance_justifications_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES public.attendances(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: attendance_justifications attendance_justifications_reviewedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_justifications
    ADD CONSTRAINT "attendance_justifications_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: attendances attendances_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT "attendances_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: attendances attendances_registeredBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT "attendances_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: attendances attendances_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT "attendances_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: certificate_template_versions certificate_template_versions_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_template_versions
    ADD CONSTRAINT "certificate_template_versions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: certificate_template_versions certificate_template_versions_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_template_versions
    ADD CONSTRAINT "certificate_template_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: certificate_template_versions certificate_template_versions_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_template_versions
    ADD CONSTRAINT "certificate_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.certificate_templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: certificate_templates certificate_templates_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_templates
    ADD CONSTRAINT "certificate_templates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: certificate_templates certificate_templates_currentVersionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_templates
    ADD CONSTRAINT "certificate_templates_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES public.certificate_template_versions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: certificates certificates_cancelledBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT "certificates_cancelledBy_fkey" FOREIGN KEY ("cancelledBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: certificates certificates_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT "certificates_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: certificates certificates_issuedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT "certificates_issuedBy_fkey" FOREIGN KEY ("issuedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: certificates certificates_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT "certificates_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: certificates certificates_templateVersionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT "certificates_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES public.certificate_template_versions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: class_holidays class_holidays_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_holidays
    ADD CONSTRAINT "class_holidays_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_holidays class_holidays_registeredBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_holidays
    ADD CONSTRAINT "class_holidays_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: class_schedules class_schedules_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_schedules
    ADD CONSTRAINT "class_schedules_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_teachers class_teachers_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_teachers
    ADD CONSTRAINT "class_teachers_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_teachers class_teachers_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_teachers
    ADD CONSTRAINT "class_teachers_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public.teachers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: classes classes_cityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT "classes_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES public.cities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: classes classes_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT "classes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: classes classes_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT "classes_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public.groups(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: classes classes_originCityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT "classes_originCityId_fkey" FOREIGN KEY ("originCityId") REFERENCES public.cities(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: classes classes_truckId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT "classes_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES public.trucks(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: contas_pagar contas_pagar_acaoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contas_pagar
    ADD CONSTRAINT "contas_pagar_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES public.acoes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: course_feedbacks course_feedbacks_certificateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_feedbacks
    ADD CONSTRAINT "course_feedbacks_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES public.certificates(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: course_feedbacks course_feedbacks_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_feedbacks
    ADD CONSTRAINT "course_feedbacks_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: course_feedbacks course_feedbacks_contaPagarId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_feedbacks
    ADD CONSTRAINT "course_feedbacks_contaPagarId_fkey" FOREIGN KEY ("contaPagarId") REFERENCES public.contas_pagar(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: course_feedbacks course_feedbacks_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_feedbacks
    ADD CONSTRAINT "course_feedbacks_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: course_modules course_modules_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT "course_modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: courses courses_institutionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT "courses_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES public.institutions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: data_deletion_requests data_deletion_requests_processedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_deletion_requests
    ADD CONSTRAINT "data_deletion_requests_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: driver_checkins driver_checkins_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_checkins
    ADD CONSTRAINT "driver_checkins_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: driver_locations driver_locations_driverUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_locations
    ADD CONSTRAINT "driver_locations_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: driver_locations driver_locations_tripId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_locations
    ADD CONSTRAINT "driver_locations_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES public.trips(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_attendances employee_attendances_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendances
    ADD CONSTRAINT "employee_attendances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_attendances employee_attendances_registeredBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendances
    ADD CONSTRAINT "employee_attendances_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: employee_registration_requests employee_registration_requests_reviewedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_registration_requests
    ADD CONSTRAINT "employee_registration_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_registration_requests employee_registration_requests_tokenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_registration_requests
    ADD CONSTRAINT "employee_registration_requests_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES public.employee_registration_tokens(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_registration_tokens employee_registration_tokens_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_registration_tokens
    ADD CONSTRAINT "employee_registration_tokens_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: employees employees_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: enrollment_consents enrollment_consents_enrollmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollment_consents
    ADD CONSTRAINT "enrollment_consents_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES public.enrollments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: enrollment_documents enrollment_documents_enrollmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollment_documents
    ADD CONSTRAINT "enrollment_documents_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES public.enrollments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: enrollments enrollments_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT "enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: enrollments enrollments_reviewedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT "enrollments_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: enrollments enrollments_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expenses expenses_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_responsibleUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: expenses expenses_tripId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES public.trips(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expenses expenses_truckId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "expenses_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES public.trucks(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: material_comments material_comments_materialId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_comments
    ADD CONSTRAINT "material_comments_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES public.materials(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: material_comments material_comments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_comments
    ADD CONSTRAINT "material_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: materials materials_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT "materials_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: materials materials_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT "materials_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: materials materials_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT "materials_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public.teachers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: materials materials_uploadedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT "materials_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notifications notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reimbursements reimbursements_acaoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reimbursements
    ADD CONSTRAINT "reimbursements_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES public.acoes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reimbursements reimbursements_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reimbursements
    ADD CONSTRAINT "reimbursements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_categories stock_categories_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_categories
    ADD CONSTRAINT "stock_categories_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_items stock_items_customCategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT "stock_items_customCategoryId_fkey" FOREIGN KEY ("customCategoryId") REFERENCES public.stock_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_acaoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT "stock_movements_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES public.acoes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_fromTruckId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT "stock_movements_fromTruckId_fkey" FOREIGN KEY ("fromTruckId") REFERENCES public.trucks(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_purchaseRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT "stock_movements_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES public.stock_purchase_requests(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_registeredBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT "stock_movements_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_movements stock_movements_stockItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT "stock_movements_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES public.stock_items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_movements stock_movements_toTruckId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT "stock_movements_toTruckId_fkey" FOREIGN KEY ("toTruckId") REFERENCES public.trucks(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_purchase_requests stock_purchase_requests_contaPagarId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_purchase_requests
    ADD CONSTRAINT "stock_purchase_requests_contaPagarId_fkey" FOREIGN KEY ("contaPagarId") REFERENCES public.contas_pagar(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_purchase_requests stock_purchase_requests_requestedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_purchase_requests
    ADD CONSTRAINT "stock_purchase_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_purchase_requests stock_purchase_requests_reviewedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_purchase_requests
    ADD CONSTRAINT "stock_purchase_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_purchase_requests stock_purchase_requests_stockItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_purchase_requests
    ADD CONSTRAINT "stock_purchase_requests_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES public.stock_items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: student_addresses student_addresses_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_addresses
    ADD CONSTRAINT "student_addresses_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: student_contacts student_contacts_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_contacts
    ADD CONSTRAINT "student_contacts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: student_legal_consents student_legal_consents_enrollmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_legal_consents
    ADD CONSTRAINT "student_legal_consents_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES public.enrollments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: student_legal_consents student_legal_consents_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_legal_consents
    ADD CONSTRAINT "student_legal_consents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: student_professional student_professional_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_professional
    ADD CONSTRAINT "student_professional_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: student_socioeconomic student_socioeconomic_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_socioeconomic
    ADD CONSTRAINT "student_socioeconomic_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: students students_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: system_configs system_configs_updatedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT "system_configs_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: teacher_checkins teacher_checkins_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_checkins
    ADD CONSTRAINT "teacher_checkins_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: teacher_courses teacher_courses_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_courses
    ADD CONSTRAINT "teacher_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: teacher_courses teacher_courses_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_courses
    ADD CONSTRAINT "teacher_courses_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public.teachers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: teachers teachers_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT "teachers_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trips trips_auditValidatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT "trips_auditValidatedByUserId_fkey" FOREIGN KEY ("auditValidatedByUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: trips trips_destinationCityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT "trips_destinationCityId_fkey" FOREIGN KEY ("destinationCityId") REFERENCES public.cities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: trips trips_driverUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT "trips_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: trips trips_originCityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT "trips_originCityId_fkey" FOREIGN KEY ("originCityId") REFERENCES public.cities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: trips trips_truckId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT "trips_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES public.trucks(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: truck_maintenances truck_maintenances_truckId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.truck_maintenances
    ADD CONSTRAINT "truck_maintenances_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES public.trucks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: truck_stock_items truck_stock_items_stockItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.truck_stock_items
    ADD CONSTRAINT "truck_stock_items_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES public.stock_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: truck_stock_items truck_stock_items_truckId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.truck_stock_items
    ADD CONSTRAINT "truck_stock_items_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES public.trucks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trucks trucks_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT "trucks_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public.groups(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_preferences user_preferences_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict LV9UWMuGXG21mK1XsTjO02Q92e9SSrWotGdAXf3NogDvxwhZfJQA3sirQtgohir

