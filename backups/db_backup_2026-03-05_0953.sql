--
-- PostgreSQL database dump
--

\restrict A6bWpYPqVW2Mb2gkRR0nfWYMVh2YKerHz4jFXRv3khtEwl1iY152PjdnbIDVEEK

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

ALTER TABLE ONLY public.trucks DROP CONSTRAINT "trucks_groupId_fkey";
ALTER TABLE ONLY public.trips DROP CONSTRAINT "trips_truckId_fkey";
ALTER TABLE ONLY public.trips DROP CONSTRAINT "trips_originCityId_fkey";
ALTER TABLE ONLY public.trips DROP CONSTRAINT "trips_destinationCityId_fkey";
ALTER TABLE ONLY public.teachers DROP CONSTRAINT "teachers_userId_fkey";
ALTER TABLE ONLY public.teacher_courses DROP CONSTRAINT "teacher_courses_teacherId_fkey";
ALTER TABLE ONLY public.teacher_courses DROP CONSTRAINT "teacher_courses_courseId_fkey";
ALTER TABLE ONLY public.system_configs DROP CONSTRAINT "system_configs_updatedBy_fkey";
ALTER TABLE ONLY public.students DROP CONSTRAINT "students_userId_fkey";
ALTER TABLE ONLY public.student_socioeconomic DROP CONSTRAINT "student_socioeconomic_studentId_fkey";
ALTER TABLE ONLY public.student_professional DROP CONSTRAINT "student_professional_studentId_fkey";
ALTER TABLE ONLY public.student_contacts DROP CONSTRAINT "student_contacts_studentId_fkey";
ALTER TABLE ONLY public.student_addresses DROP CONSTRAINT "student_addresses_studentId_fkey";
ALTER TABLE ONLY public.refresh_tokens DROP CONSTRAINT "refresh_tokens_userId_fkey";
ALTER TABLE ONLY public.notifications DROP CONSTRAINT "notifications_userId_fkey";
ALTER TABLE ONLY public.materials DROP CONSTRAINT "materials_uploadedBy_fkey";
ALTER TABLE ONLY public.materials DROP CONSTRAINT "materials_teacherId_fkey";
ALTER TABLE ONLY public.materials DROP CONSTRAINT "materials_courseId_fkey";
ALTER TABLE ONLY public.materials DROP CONSTRAINT "materials_classId_fkey";
ALTER TABLE ONLY public.material_comments DROP CONSTRAINT "material_comments_userId_fkey";
ALTER TABLE ONLY public.material_comments DROP CONSTRAINT "material_comments_materialId_fkey";
ALTER TABLE ONLY public.expenses DROP CONSTRAINT "expenses_truckId_fkey";
ALTER TABLE ONLY public.expenses DROP CONSTRAINT "expenses_tripId_fkey";
ALTER TABLE ONLY public.expenses DROP CONSTRAINT "expenses_responsibleUserId_fkey";
ALTER TABLE ONLY public.expenses DROP CONSTRAINT "expenses_approvedBy_fkey";
ALTER TABLE ONLY public.enrollments DROP CONSTRAINT "enrollments_studentId_fkey";
ALTER TABLE ONLY public.enrollments DROP CONSTRAINT "enrollments_reviewedBy_fkey";
ALTER TABLE ONLY public.enrollments DROP CONSTRAINT "enrollments_classId_fkey";
ALTER TABLE ONLY public.enrollment_documents DROP CONSTRAINT "enrollment_documents_enrollmentId_fkey";
ALTER TABLE ONLY public.enrollment_consents DROP CONSTRAINT "enrollment_consents_enrollmentId_fkey";
ALTER TABLE ONLY public.data_deletion_requests DROP CONSTRAINT "data_deletion_requests_processedBy_fkey";
ALTER TABLE ONLY public.course_modules DROP CONSTRAINT "course_modules_courseId_fkey";
ALTER TABLE ONLY public.classes DROP CONSTRAINT "classes_truckId_fkey";
ALTER TABLE ONLY public.classes DROP CONSTRAINT "classes_groupId_fkey";
ALTER TABLE ONLY public.classes DROP CONSTRAINT "classes_courseId_fkey";
ALTER TABLE ONLY public.classes DROP CONSTRAINT "classes_cityId_fkey";
ALTER TABLE ONLY public.class_teachers DROP CONSTRAINT "class_teachers_teacherId_fkey";
ALTER TABLE ONLY public.class_teachers DROP CONSTRAINT "class_teachers_classId_fkey";
ALTER TABLE ONLY public.class_schedules DROP CONSTRAINT "class_schedules_classId_fkey";
ALTER TABLE ONLY public.certificates DROP CONSTRAINT "certificates_studentId_fkey";
ALTER TABLE ONLY public.certificates DROP CONSTRAINT "certificates_issuedBy_fkey";
ALTER TABLE ONLY public.certificates DROP CONSTRAINT "certificates_classId_fkey";
ALTER TABLE ONLY public.certificates DROP CONSTRAINT "certificates_cancelledBy_fkey";
ALTER TABLE ONLY public.audit_logs DROP CONSTRAINT "audit_logs_userId_fkey";
ALTER TABLE ONLY public.attendances DROP CONSTRAINT "attendances_studentId_fkey";
ALTER TABLE ONLY public.attendances DROP CONSTRAINT "attendances_registeredBy_fkey";
ALTER TABLE ONLY public.attendances DROP CONSTRAINT "attendances_classId_fkey";
ALTER TABLE ONLY public.attendance_justifications DROP CONSTRAINT "attendance_justifications_reviewedBy_fkey";
ALTER TABLE ONLY public.attendance_justifications DROP CONSTRAINT "attendance_justifications_attendanceId_fkey";
ALTER TABLE ONLY public.api_keys DROP CONSTRAINT "api_keys_createdBy_fkey";
DROP INDEX public.users_role_idx;
DROP INDEX public.users_email_key;
DROP INDEX public.users_email_idx;
DROP INDEX public.users_cpf_key;
DROP INDEX public.trucks_status_idx;
DROP INDEX public."trucks_licensePlate_key";
DROP INDEX public.trucks_identifier_key;
DROP INDEX public.trucks_identifier_idx;
DROP INDEX public."trucks_groupId_idx";
DROP INDEX public."trips_truckId_idx";
DROP INDEX public.trips_status_idx;
DROP INDEX public."teachers_userId_key";
DROP INDEX public."teachers_userId_idx";
DROP INDEX public.teachers_cpf_key;
DROP INDEX public.teachers_cpf_idx;
DROP INDEX public."teacher_courses_teacherId_idx";
DROP INDEX public."teacher_courses_teacherId_courseId_key";
DROP INDEX public."teacher_courses_courseId_idx";
DROP INDEX public."system_configs_configKey_key";
DROP INDEX public."system_configs_configKey_idx";
DROP INDEX public."students_userId_key";
DROP INDEX public."students_userId_idx";
DROP INDEX public.students_cpf_key;
DROP INDEX public.students_cpf_idx;
DROP INDEX public."student_socioeconomic_studentId_key";
DROP INDEX public."student_professional_studentId_key";
DROP INDEX public."student_contacts_studentId_key";
DROP INDEX public."student_addresses_studentId_key";
DROP INDEX public."refresh_tokens_userId_idx";
DROP INDEX public.refresh_tokens_token_key;
DROP INDEX public.refresh_tokens_token_idx;
DROP INDEX public."notifications_userId_idx";
DROP INDEX public.notifications_type_idx;
DROP INDEX public."notifications_deliveryStatus_idx";
DROP INDEX public."materials_uploadedBy_idx";
DROP INDEX public."materials_teacherId_idx";
DROP INDEX public."materials_courseId_idx";
DROP INDEX public."materials_classId_idx";
DROP INDEX public."material_comments_userId_idx";
DROP INDEX public."material_comments_materialId_idx";
DROP INDEX public.groups_name_key;
DROP INDEX public."expenses_truckId_idx";
DROP INDEX public."expenses_tripId_idx";
DROP INDEX public.expenses_status_idx;
DROP INDEX public."expenses_expenseDate_idx";
DROP INDEX public."enrollments_studentId_idx";
DROP INDEX public.enrollments_status_idx;
DROP INDEX public.enrollments_protocol_key;
DROP INDEX public.enrollments_protocol_idx;
DROP INDEX public."enrollments_classId_idx";
DROP INDEX public."enrollment_documents_enrollmentId_idx";
DROP INDEX public."enrollment_consents_enrollmentId_key";
DROP INDEX public."data_deletion_requests_userId_idx";
DROP INDEX public.data_deletion_requests_status_idx;
DROP INDEX public.courses_name_idx;
DROP INDEX public.courses_active_idx;
DROP INDEX public."course_modules_courseId_idx";
DROP INDEX public."classes_truckId_idx";
DROP INDEX public.classes_status_idx;
DROP INDEX public."classes_startDate_idx";
DROP INDEX public."classes_groupId_idx";
DROP INDEX public."classes_courseId_idx";
DROP INDEX public."classes_cityId_idx";
DROP INDEX public."class_teachers_teacherId_idx";
DROP INDEX public."class_teachers_classId_teacherId_key";
DROP INDEX public."class_teachers_classId_idx";
DROP INDEX public."class_schedules_classId_idx";
DROP INDEX public.cities_state_idx;
DROP INDEX public.cities_name_state_key;
DROP INDEX public."certificates_verificationCode_key";
DROP INDEX public."certificates_verificationCode_idx";
DROP INDEX public."certificates_studentId_idx";
DROP INDEX public.certificates_status_idx;
DROP INDEX public."certificates_classId_idx";
DROP INDEX public."audit_logs_userId_idx";
DROP INDEX public."audit_logs_tableName_idx";
DROP INDEX public."audit_logs_createdAt_idx";
DROP INDEX public."attendances_studentId_idx";
DROP INDEX public.attendances_date_idx;
DROP INDEX public."attendances_classId_studentId_date_key";
DROP INDEX public."attendances_classId_idx";
DROP INDEX public.attendance_justifications_status_idx;
DROP INDEX public."attendance_justifications_attendanceId_idx";
DROP INDEX public.api_keys_key_key;
DROP INDEX public.api_keys_key_idx;
DROP INDEX public.api_keys_active_idx;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
ALTER TABLE ONLY public.trucks DROP CONSTRAINT trucks_pkey;
ALTER TABLE ONLY public.trips DROP CONSTRAINT trips_pkey;
ALTER TABLE ONLY public.teachers DROP CONSTRAINT teachers_pkey;
ALTER TABLE ONLY public.teacher_courses DROP CONSTRAINT teacher_courses_pkey;
ALTER TABLE ONLY public.system_configs DROP CONSTRAINT system_configs_pkey;
ALTER TABLE ONLY public.students DROP CONSTRAINT students_pkey;
ALTER TABLE ONLY public.student_socioeconomic DROP CONSTRAINT student_socioeconomic_pkey;
ALTER TABLE ONLY public.student_professional DROP CONSTRAINT student_professional_pkey;
ALTER TABLE ONLY public.student_contacts DROP CONSTRAINT student_contacts_pkey;
ALTER TABLE ONLY public.student_addresses DROP CONSTRAINT student_addresses_pkey;
ALTER TABLE ONLY public.refresh_tokens DROP CONSTRAINT refresh_tokens_pkey;
ALTER TABLE ONLY public.notifications DROP CONSTRAINT notifications_pkey;
ALTER TABLE ONLY public.materials DROP CONSTRAINT materials_pkey;
ALTER TABLE ONLY public.material_comments DROP CONSTRAINT material_comments_pkey;
ALTER TABLE ONLY public.groups DROP CONSTRAINT groups_pkey;
ALTER TABLE ONLY public.expenses DROP CONSTRAINT expenses_pkey;
ALTER TABLE ONLY public.enrollments DROP CONSTRAINT enrollments_pkey;
ALTER TABLE ONLY public.enrollment_documents DROP CONSTRAINT enrollment_documents_pkey;
ALTER TABLE ONLY public.enrollment_consents DROP CONSTRAINT enrollment_consents_pkey;
ALTER TABLE ONLY public.data_deletion_requests DROP CONSTRAINT data_deletion_requests_pkey;
ALTER TABLE ONLY public.courses DROP CONSTRAINT courses_pkey;
ALTER TABLE ONLY public.course_modules DROP CONSTRAINT course_modules_pkey;
ALTER TABLE ONLY public.classes DROP CONSTRAINT classes_pkey;
ALTER TABLE ONLY public.class_teachers DROP CONSTRAINT class_teachers_pkey;
ALTER TABLE ONLY public.class_schedules DROP CONSTRAINT class_schedules_pkey;
ALTER TABLE ONLY public.cities DROP CONSTRAINT cities_pkey;
ALTER TABLE ONLY public.certificates DROP CONSTRAINT certificates_pkey;
ALTER TABLE ONLY public.audit_logs DROP CONSTRAINT audit_logs_pkey;
ALTER TABLE ONLY public.attendances DROP CONSTRAINT attendances_pkey;
ALTER TABLE ONLY public.attendance_justifications DROP CONSTRAINT attendance_justifications_pkey;
ALTER TABLE ONLY public.api_keys DROP CONSTRAINT api_keys_pkey;
ALTER TABLE ONLY public._prisma_migrations DROP CONSTRAINT _prisma_migrations_pkey;
DROP TABLE public.users;
DROP TABLE public.trucks;
DROP TABLE public.trips;
DROP TABLE public.teachers;
DROP TABLE public.teacher_courses;
DROP TABLE public.system_configs;
DROP TABLE public.students;
DROP TABLE public.student_socioeconomic;
DROP TABLE public.student_professional;
DROP TABLE public.student_contacts;
DROP TABLE public.student_addresses;
DROP TABLE public.refresh_tokens;
DROP TABLE public.notifications;
DROP TABLE public.materials;
DROP TABLE public.material_comments;
DROP TABLE public.groups;
DROP TABLE public.expenses;
DROP TABLE public.enrollments;
DROP TABLE public.enrollment_documents;
DROP TABLE public.enrollment_consents;
DROP TABLE public.data_deletion_requests;
DROP TABLE public.courses;
DROP TABLE public.course_modules;
DROP TABLE public.classes;
DROP TABLE public.class_teachers;
DROP TABLE public.class_schedules;
DROP TABLE public.cities;
DROP TABLE public.certificates;
DROP TABLE public.audit_logs;
DROP TABLE public.attendances;
DROP TABLE public.attendance_justifications;
DROP TABLE public.api_keys;
DROP TABLE public._prisma_migrations;
DROP TYPE public."Zone";
DROP TYPE public."UserRole";
DROP TYPE public."TruckType";
DROP TYPE public."TruckStatus";
DROP TYPE public."TripStatus";
DROP TYPE public."SocialProgram";
DROP TYPE public."RaceColor";
DROP TYPE public."Period";
DROP TYPE public."NotificationType";
DROP TYPE public."NotificationChannel";
DROP TYPE public."MaterialVisibility";
DROP TYPE public."MaritalStatus";
DROP TYPE public."Gender";
DROP TYPE public."FamilyIncome";
DROP TYPE public."ExpenseStatus";
DROP TYPE public."ExpenseCategory";
DROP TYPE public."EnrollmentStatus";
DROP TYPE public."EmploymentStatus";
DROP TYPE public."EducationLevel";
DROP TYPE public."DocumentType";
DROP TYPE public."DisabilityType";
DROP TYPE public."DeliveryStatus";
DROP TYPE public."ContractType";
DROP TYPE public."ClassStatus";
DROP TYPE public."CertificateStatus";
DROP TYPE public."CareerGoal";
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
    'GENERAL_ANNOUNCEMENT'
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
-- Name: SocialProgram; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SocialProgram" AS ENUM (
    'NONE',
    'BOLSA_FAMILIA',
    'BPC',
    'AUXILIO_BRASIL',
    'OTHER'
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
    'STUDENT'
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
    "cancelledBy" text
);


--
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id text NOT NULL,
    name text NOT NULL,
    state text NOT NULL,
    "ibgeCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
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
    "updatedAt" timestamp(3) without time zone NOT NULL
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
    "updatedAt" timestamp(3) without time zone NOT NULL
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
    "userAgent" text
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
-- Name: student_professional; Type: TABLE; Schema: public; Owner: -
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
    "familyIncome" public."FamilyIncome" NOT NULL
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
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
    "updatedAt" timestamp(3) without time zone NOT NULL
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
    cpf text
);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
bed2c7dc-213a-4635-9dc3-e25c3999b74e	b1c9156557481a4826f38910f2649958fa6dd31937e9cf2d48ddc1e7c2fd5607	2026-03-03 19:35:36.074118+00	20260217191645_init	\N	\N	2026-03-03 19:35:35.433578+00	1
d3a8d24b-0e0e-4ba7-bcb7-a5dbbd0a60ad	ecc0bc35c9215256cfb5638d72a804f5b653b087f5d853fd6f38c6b3d2636adc	2026-03-03 19:35:36.115026+00	20260217205047_add_cpf_to_user	\N	\N	2026-03-03 19:35:36.077456+00	1
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.api_keys (id, name, key, permissions, active, "createdBy", "createdAt", "lastUsedAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: attendance_justifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance_justifications (id, "attendanceId", reason, details, "proofUrl", "submittedAt", status, "reviewedBy", "reviewedAt", "reviewNotes") FROM stdin;
\.


--
-- Data for Name: attendances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendances (id, "classId", "studentId", date, present, justified, justification, "registeredBy", "registeredAt", "updatedAt", "classNotes", "classPhotoUrl") FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, "userId", action, "tableName", "recordId", "oldData", "newData", "ipAddress", "userAgent", "createdAt") FROM stdin;
\.


--
-- Data for Name: certificates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.certificates (id, "studentId", "classId", "verificationCode", "qrCodeUrl", "fileUrl", "issuedAt", "issuedBy", status, "cancellationReason", "cancelledAt", "cancelledBy") FROM stdin;
\.


--
-- Data for Name: cities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cities (id, name, state, "ibgeCode", "createdAt") FROM stdin;
bf628c48-f1b7-4853-bcab-5dd747e40b76	S├úo Lu├¡s	MA	2111300	2026-03-03 19:44:52.794
30074ca9-1cea-4ddb-835a-599ad83488b4	Imperatriz	MA	2105302	2026-03-03 19:44:52.809
855a479c-f0a2-4d90-bcc4-eff7f35e1b16	S├úo Jos├® de Ribamar	MA	2111201	2026-03-03 19:44:52.818
bc6a1f84-46b2-4186-9988-fb9b5dbc290c	Timon	MA	2112209	2026-03-03 19:44:52.825
98e1b9b5-4ed2-4816-b270-bc2165b42f98	Caxias	MA	2103000	2026-03-03 19:44:52.834
550acea8-766b-4b5e-8b04-af173c77d76a	Cod├│	MA	2103307	2026-03-03 19:44:52.842
b36aba59-c543-4342-a0c4-7f1eb550d93f	Pa├ºo do Lumiar	MA	2107704	2026-03-03 19:44:52.85
11ae4dfc-2280-48ac-a549-e866c119a17c	A├ºail├óndia	MA	2100055	2026-03-03 19:44:52.857
aace1311-e1e9-4946-817a-aecd6da5d8e1	Bacabal	MA	2101202	2026-03-03 19:44:52.863
0c488f0f-85fa-4312-aa46-22353d758ea6	Balsas	MA	2101400	2026-03-03 19:44:52.871
cab1e31e-3a20-4bd7-8780-93ef328d4b18	Teresina	PI	2211001	2026-03-03 19:44:52.878
e3370dce-49d7-4bba-882f-ea9eed1f90e1	Parna├¡ba	PI	2207702	2026-03-03 19:44:52.884
9729141e-3483-4b9e-a235-94baec086c62	Picos	PI	2208007	2026-03-03 19:44:52.89
3838defb-990c-42fc-b869-7c1e2201598e	Floriano	PI	2203909	2026-03-03 19:44:52.895
ee06176e-9cd8-4970-b163-a9ddef105f06	Piripiri	PI	2208304	2026-03-03 19:44:52.9
c091240f-a508-4133-a709-19f0bc80058c	Campo Maior	PI	2202251	2026-03-03 19:44:52.904
109b75d0-f4d9-49fd-be17-a35a66463e5a	Barras	PI	2201200	2026-03-03 19:44:52.909
256cf956-ef62-4f24-ba61-6a6a9ed9556b	Altos	PI	2200400	2026-03-03 19:44:52.913
14646774-6836-40c9-b562-11bc5f6ef885	Esperantina	PI	2203701	2026-03-03 19:44:52.918
1716fec0-9fb8-4265-920f-efbd8bbf4362	Pedro II	PI	2207900	2026-03-03 19:44:52.924
\.


--
-- Data for Name: class_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.class_schedules (id, "classId", weekday, active, "createdAt") FROM stdin;
\.


--
-- Data for Name: class_teachers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.class_teachers (id, "classId", "teacherId", "isSubstitute", "createdAt") FROM stdin;
\.


--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.classes (id, "courseId", "groupId", "cityId", "classIdentifier", "startDate", "endDate", period, "startTime", "endTime", vacancies, "truckId", status, "enrollmentOpenDate", "enrollmentCloseDate", "createdAt", "updatedAt") FROM stdin;
94b86d88-3e6e-4b99-ab67-8ad8b134af2d	11e68554-619f-4f34-a4ab-dbcf6c5fb24e	9e50c08a-b812-4758-8b84-49e19bae3e91	bf628c48-f1b7-4853-bcab-5dd747e40b76	IB-S├âO -MA-2026	2026-03-05 00:00:00	2026-03-06 00:00:00	MORNING	07:00	12:00	30	81f8a7c2-989c-4cf8-b9d2-da99a52ae3d9	PLANNED	\N	\N	2026-03-04 18:32:10.766	2026-03-04 18:32:10.766
\.


--
-- Data for Name: course_modules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.course_modules (id, "courseId", "moduleName", room, "startTime", "endTime", "order", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.courses (id, name, description, "durationDaysMA", "durationDaysPI", "workloadHours", prerequisites, syllabus, "availableInMA", "availableInPI", "isMulticourse", active, "createdAt", "updatedAt") FROM stdin;
11e68554-619f-4f34-a4ab-dbcf6c5fb24e	Inform├ítica B├ísica	Curso b├ísico de inform├ítica com Windows, Word, Excel e Internet	30	30	120	Ensino fundamental completo	M├│dulo 1: Introdu├º├úo ├á Inform├ítica\nM├│dulo 2: Sistema Operacional Windows\nM├│dulo 3: Editor de Texto (Word)\nM├│dulo 4: Planilha Eletr├┤nica (Excel)\nM├│dulo 5: Internet e E-mail	t	t	f	t	2026-03-03 19:44:52.936	2026-03-03 19:44:52.936
45bfc742-442b-47ae-a3e9-9fdcb426ea57	Excel Avan├ºado	Curso avan├ºado de Excel com f├│rmulas, tabelas din├ómicas e macros	20	20	80	Conhecimento b├ísico de Excel	M├│dulo 1: F├│rmulas e Fun├º├Áes Avan├ºadas\nM├│dulo 2: Tabelas Din├ómicas\nM├│dulo 3: Gr├íficos Avan├ºados\nM├│dulo 4: Macros e VBA\nM├│dulo 5: An├ílise de Dados	t	t	f	t	2026-03-03 19:44:52.943	2026-03-03 19:44:52.943
6a2c27ec-4487-446d-b91a-5985b9a144f3	Assistente Administrativo	Forma├º├úo completa para atuar como assistente administrativo	45	45	180	Ensino m├®dio completo	M├│dulo 1: Rotinas Administrativas\nM├│dulo 2: Atendimento ao Cliente\nM├│dulo 3: Organiza├º├úo de Documentos\nM├│dulo 4: Inform├ítica Aplicada\nM├│dulo 5: Comunica├º├úo Empresarial	t	t	f	t	2026-03-03 19:44:52.949	2026-03-03 19:44:52.949
16f421b6-df75-4574-b564-ad62d06a3ee2	Operador de Caixa	Capacita├º├úo para atuar como operador de caixa no varejo	15	15	60	Ensino fundamental completo	M├│dulo 1: Atendimento ao Cliente\nM├│dulo 2: Opera├º├úo de Caixa\nM├│dulo 3: Matem├ítica Financeira\nM├│dulo 4: Seguran├ºa e Preven├º├úo de Perdas	t	t	f	t	2026-03-03 19:44:52.955	2026-03-03 19:44:52.955
265f9789-409c-4461-933a-b22fa8df8d27	Auxiliar de Recursos Humanos	Forma├º├úo para atuar no departamento de recursos humanos	40	40	160	Ensino m├®dio completo	M├│dulo 1: Introdu├º├úo ao RH\nM├│dulo 2: Recrutamento e Sele├º├úo\nM├│dulo 3: Departamento Pessoal\nM├│dulo 4: Treinamento e Desenvolvimento\nM├│dulo 5: Legisla├º├úo Trabalhista	t	t	f	t	2026-03-03 19:44:52.962	2026-03-03 19:44:52.962
56396de7-715a-4884-a2d4-0a0568191b3f	Marketing Digital	Curso completo de marketing digital e redes sociais	30	30	120	Conhecimento b├ísico de inform├ítica	M├│dulo 1: Fundamentos do Marketing Digital\nM├│dulo 2: Redes Sociais\nM├│dulo 3: Google Ads e SEO\nM├│dulo 4: E-mail Marketing\nM├│dulo 5: M├®tricas e An├ílise	t	t	f	t	2026-03-03 19:44:52.968	2026-03-03 19:44:52.968
ea35543c-d2e0-4cb1-8cb1-73d7d4fd6d51	Empreendedorismo	Capacita├º├úo para abrir e gerenciar o pr├│prio neg├│cio	25	25	100	Ensino m├®dio completo	M├│dulo 1: Perfil Empreendedor\nM├│dulo 2: Plano de Neg├│cios\nM├│dulo 3: Finan├ºas para Empreendedores\nM├│dulo 4: Marketing e Vendas\nM├│dulo 5: Gest├úo de Pessoas	t	t	f	t	2026-03-03 19:44:52.973	2026-03-03 19:44:52.973
747e25ea-0122-465d-bbb2-f0c2718d4877	Qualifica├º├úo Profissional (Multicurso)	Curso multicurso com diversos m├│dulos profissionalizantes	60	60	240	Ensino fundamental completo	M├│dulo 1: Inform├ítica B├ísica\nM├│dulo 2: Atendimento ao Cliente\nM├│dulo 3: Vendas\nM├│dulo 4: Gest├úo de Tempo\nM├│dulo 5: Comunica├º├úo Empresarial\nM├│dulo 6: Empreendedorismo	t	t	t	t	2026-03-03 19:44:52.978	2026-03-03 19:44:52.978
\.


--
-- Data for Name: data_deletion_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.data_deletion_requests (id, "userId", "requestedAt", "processedAt", "processedBy", status) FROM stdin;
\.


--
-- Data for Name: enrollment_consents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enrollment_consents (id, "enrollmentId", "dataProcessing", "imageUse", "termsAccepted", "privacyPolicyAccepted", "consentDate", "ipAddress", "userAgent") FROM stdin;
\.


--
-- Data for Name: enrollment_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enrollment_documents (id, "enrollmentId", "documentType", "fileUrl", "uploadedAt") FROM stdin;
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enrollments (id, "studentId", "classId", protocol, status, "enrolledAt", "reviewedAt", "reviewedBy", "rejectionReason", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expenses (id, "tripId", "truckId", category, subcategory, amount, description, "receiptUrl", "expenseDate", "responsibleUserId", status, "approvedBy", "approvedAt", "rejectionReason", "createdAt") FROM stdin;
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.groups (id, name, state, "createdAt") FROM stdin;
9e50c08a-b812-4758-8b84-49e19bae3e91	Grupo 1 MA	MA	2026-03-03 19:44:52.747
bf296c85-1efc-44af-b403-e0c5ef582715	Grupo 2 MA	MA	2026-03-03 19:44:52.778
8aa84753-1318-4bfe-855b-d0491d725644	Grupo 1 PI	PI	2026-03-03 19:44:52.786
\.


--
-- Data for Name: material_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.material_comments (id, "materialId", "userId", comment, "createdAt") FROM stdin;
\.


--
-- Data for Name: materials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.materials (id, "courseId", "classId", "teacherId", title, description, "fileUrl", "fileType", "fileSize", tags, visibility, "visibleFrom", "uploadedBy", "uploadedAt", "downloadCount", "viewCount") FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, "userId", type, title, message, channel, data, "sentAt", "readAt", "clickedAt", "deliveryStatus", "errorMessage", "createdAt") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, token, "userId", "expiresAt", "createdAt") FROM stdin;
15ab16ed-0a1e-4f33-9e49-d9e794e738a1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTQ2OGJhYy1iMTU5LTRkZGYtYTA5YS1hNDk4ZTY2NmI2N2UiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI1Njc1NjMsImV4cCI6MTc3MzE3MjM2M30.5EyLNwSkusM_fxShK7y7DlYrEaYzkd_P8EePu8UIMLg	61468bac-b159-4ddf-a09a-a498e666b67e	2026-03-10 19:52:43.074	2026-03-03 19:52:43.078
d30c646c-a80a-40da-8573-d34637ca356d	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTQ2OGJhYy1iMTU5LTRkZGYtYTA5YS1hNDk4ZTY2NmI2N2UiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI1Njc2NDAsImV4cCI6MTc3MzE3MjQ0MH0.56PwJoAA63hqvznmrULOgwGbjRjylOCScesVbBe3JHg	61468bac-b159-4ddf-a09a-a498e666b67e	2026-03-10 19:54:00.801	2026-03-03 19:54:00.804
b83de0d5-1c4a-4c95-aaf8-1bd4b774bc62	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTQ2OGJhYy1iMTU5LTRkZGYtYTA5YS1hNDk4ZTY2NmI2N2UiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI1Njc2NDMsImV4cCI6MTc3MzE3MjQ0M30.6BlaXo0eM5IVHoRlGNyndOWvbdRm7KisML-FQzrVym8	61468bac-b159-4ddf-a09a-a498e666b67e	2026-03-10 19:54:03.628	2026-03-03 19:54:03.631
6ffc25b9-3921-4fbf-86d6-64ee8fce5aae	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTQ2OGJhYy1iMTU5LTRkZGYtYTA5YS1hNDk4ZTY2NmI2N2UiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI2MjU3NjIsImV4cCI6MTc3MzIzMDU2Mn0.NBwZBwP1rW4GLwvgDF-ix3quHcL3r1QkSrRRqPDupQM	61468bac-b159-4ddf-a09a-a498e666b67e	2026-03-11 12:02:42.892	2026-03-04 12:02:42.894
ec9913fc-097d-44f6-a054-1b468ffaafe3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTQ2OGJhYy1iMTU5LTRkZGYtYTA5YS1hNDk4ZTY2NmI2N2UiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI2MjU3NjQsImV4cCI6MTc3MzIzMDU2NH0.A5UMmOuDQ7Hr9PMBmTON4voWcAMagl1kFvRp3ghDIsE	61468bac-b159-4ddf-a09a-a498e666b67e	2026-03-11 12:02:44.863	2026-03-04 12:02:44.866
25179371-ce90-4d30-82d1-5470f985a897	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTQ2OGJhYy1iMTU5LTRkZGYtYTA5YS1hNDk4ZTY2NmI2N2UiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI2MjY3MTQsImV4cCI6MTc3MzIzMTUxNH0.dS5BOMVwgSqbLRdijc2iKunStv_TORZdCIbpapaMAjg	61468bac-b159-4ddf-a09a-a498e666b67e	2026-03-11 12:18:34.507	2026-03-04 12:18:34.509
a87040e3-a79a-472b-a451-d20c5b7f56b3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTQ2OGJhYy1iMTU5LTRkZGYtYTA5YS1hNDk4ZTY2NmI2N2UiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI2MjczNDUsImV4cCI6MTc3MzIzMjE0NX0.K3Ra-VE3dFnZ6lCvlWrxAzmtiuqSbRdxtdaNh1GFjNg	61468bac-b159-4ddf-a09a-a498e666b67e	2026-03-11 12:29:05.55	2026-03-04 12:29:05.552
c25c9256-6818-422d-a142-cd9297663262	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTQ2OGJhYy1iMTU5LTRkZGYtYTA5YS1hNDk4ZTY2NmI2N2UiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI2MjgyMzEsImV4cCI6MTc3MzIzMzAzMX0.7WwDFvhJ3hrUdHo72zXvDsKdw3XWMQr1NTHvL23yXQU	61468bac-b159-4ddf-a09a-a498e666b67e	2026-03-11 12:43:51.798	2026-03-04 12:43:51.8
37653f94-aee0-4bd1-8f2d-37199658f158	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTQ2OGJhYy1iMTU5LTRkZGYtYTA5YS1hNDk4ZTY2NmI2N2UiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI2Mjg0ODMsImV4cCI6MTc3MzIzMzI4M30.t6MNfz53dCAOYZ_-3mXoMkcNBYLaQagYCjIrZft5grI	61468bac-b159-4ddf-a09a-a498e666b67e	2026-03-11 12:48:03.36	2026-03-04 12:48:03.362
c83fc01b-5e71-4f23-a694-a895f7ce8951	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTQ2OGJhYy1iMTU5LTRkZGYtYTA5YS1hNDk4ZTY2NmI2N2UiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI2MzM2NzksImV4cCI6MTc3MzIzODQ3OX0.-FvOrqYNyJk4gUS-YeXPoO8pECr-7BIAl1VJpP03eC0	61468bac-b159-4ddf-a09a-a498e666b67e	2026-03-11 14:14:39.009	2026-03-04 14:14:39.011
75518b5f-dc11-496a-bf29-baa38518ee27	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTQ2OGJhYy1iMTU5LTRkZGYtYTA5YS1hNDk4ZTY2NmI2N2UiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI2NDY1NTQsImV4cCI6MTc3MzI1MTM1NH0.nR4DKGVf_KPOCDQCVKy_zll5ruB1AhlJemchswCEELg	61468bac-b159-4ddf-a09a-a498e666b67e	2026-03-11 17:49:14.046	2026-03-04 17:49:14.048
ccb964e5-16e5-4e8d-b51c-6c9947b029fb	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTQ2OGJhYy1iMTU5LTRkZGYtYTA5YS1hNDk4ZTY2NmI2N2UiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI2NjgwMDcsImV4cCI6MTc3MzI3MjgwN30.9cWeRviudqFPc6_NLK5t6TFQdYVJ2DE8NLrNEGT0ApI	61468bac-b159-4ddf-a09a-a498e666b67e	2026-03-11 23:46:47.073	2026-03-04 23:46:47.076
268b445d-5e69-4b1d-b19e-55389213c597	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTQ2OGJhYy1iMTU5LTRkZGYtYTA5YS1hNDk4ZTY2NmI2N2UiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI3MTA4MzEsImV4cCI6MTc3MzMxNTYzMX0.k83woy7ZP9cGdGuAaMXG60CGPzdVWXHF_he33GLzwPQ	61468bac-b159-4ddf-a09a-a498e666b67e	2026-03-12 11:40:31.842	2026-03-05 11:40:31.848
446686de-92d0-4893-8339-9078e9246dd7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MTQ2OGJhYy1iMTU5LTRkZGYtYTA5YS1hNDk4ZTY2NmI2N2UiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI3MTQ1NzIsImV4cCI6MTc3MzMxOTM3Mn0.Pp562fCvJCYs0wGizqClZJ1U6SRqD0JJUgvEMhGvq0o	61468bac-b159-4ddf-a09a-a498e666b67e	2026-03-12 12:42:52.112	2026-03-05 12:42:52.113
\.


--
-- Data for Name: student_addresses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_addresses (id, "studentId", cep, street, number, complement, neighborhood, city, state, zone) FROM stdin;
\.


--
-- Data for Name: student_contacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_contacts (id, "studentId", email, phone, "hasWhatsapp", "phoneAlt", "allowWhatsappContact", "allowEmailContact") FROM stdin;
\.


--
-- Data for Name: student_professional; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_professional (id, "studentId", "previousQualification", "professionalInterest", "howHeardAbout", motivation, "careerGoal") FROM stdin;
\.


--
-- Data for Name: student_socioeconomic; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_socioeconomic (id, "studentId", "educationLevel", "employmentStatus", "familyMembersCount", "socialProgram", "hasDisability", "disabilityType", "disabilityAdaptation", "familyIncome") FROM stdin;
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.students (id, "userId", cpf, rg, "rgIssuer", "birthDate", gender, "raceColor", "maritalStatus", "motherName", "fatherName", nationality, "birthCity", "birthState", "photoUrl", "createdAt", "updatedAt", active, "socialName") FROM stdin;
\.


--
-- Data for Name: system_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_configs (id, "configKey", "configValue", "dataType", description, "updatedBy", "updatedAt") FROM stdin;
\.


--
-- Data for Name: teacher_courses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teacher_courses (id, "teacherId", "courseId", "createdAt") FROM stdin;
\.


--
-- Data for Name: teachers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teachers (id, "userId", cpf, rg, "birthDate", "photoUrl", education, specialties, experience, certifications, "resumeUrl", availability, "preferredRegion", "contractType", "hireDate", active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: trips; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.trips (id, "truckId", "originCityId", "destinationCityId", "departureDate", "expectedArrivalDate", "actualArrivalDate", "driverName", "driverPhone", "kmStart", "kmEnd", status, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: trucks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.trucks (id, identifier, "licensePlate", type, "groupId", state, capacity, "roomsCount", status, "modelYear", "lastMaintenanceDate", "nextMaintenanceDate", "photoUrl", "equipmentList", notes, "createdAt", "updatedAt") FROM stdin;
81f8a7c2-989c-4cf8-b9d2-da99a52ae3d9	Carreta 01	ABC-2414	STANDARD	9e50c08a-b812-4758-8b84-49e19bae3e91	MA	30	1	IN_USE	2026	\N	\N	\N	\N	\N	2026-03-04 14:56:06.84	2026-03-04 18:32:10.831
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password, name, phone, role, active, "createdAt", "updatedAt", cpf) FROM stdin;
61468bac-b159-4ddf-a09a-a498e666b67e	admin@qualifica.com	$2b$10$g1xqAHP38C7X4Xejf/YYGO/TlcZITNEH8/WgoZ9/wCb4d3GJ6mSO6	Administrador	(98) 98888-8888	ADMIN	t	2026-03-03 19:44:52.983	2026-03-04 12:02:17.811	\N
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


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
-- Name: trucks trucks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


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
-- Name: certificates_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certificates_classId_idx" ON public.certificates USING btree ("classId");


--
-- Name: certificates_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX certificates_status_idx ON public.certificates USING btree (status);


--
-- Name: certificates_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certificates_studentId_idx" ON public.certificates USING btree ("studentId");


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
-- Name: course_modules_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "course_modules_courseId_idx" ON public.course_modules USING btree ("courseId");


--
-- Name: courses_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX courses_active_idx ON public.courses USING btree (active);


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
-- Name: student_addresses_studentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "student_addresses_studentId_key" ON public.student_addresses USING btree ("studentId");


--
-- Name: student_contacts_studentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "student_contacts_studentId_key" ON public.student_contacts USING btree ("studentId");


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
-- Name: trips_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trips_status_idx ON public.trips USING btree (status);


--
-- Name: trips_truckId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "trips_truckId_idx" ON public.trips USING btree ("truckId");


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
-- Name: classes classes_truckId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT "classes_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES public.trucks(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: course_modules course_modules_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT "course_modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: data_deletion_requests data_deletion_requests_processedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_deletion_requests
    ADD CONSTRAINT "data_deletion_requests_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


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
-- Name: trips trips_destinationCityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT "trips_destinationCityId_fkey" FOREIGN KEY ("destinationCityId") REFERENCES public.cities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


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
-- Name: trucks trucks_groupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT "trucks_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES public.groups(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict A6bWpYPqVW2Mb2gkRR0nfWYMVh2YKerHz4jFXRv3khtEwl1iY152PjdnbIDVEEK

