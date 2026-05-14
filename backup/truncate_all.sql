-- Disable FK checks temporarily via replica mode
SET session_replication_role = replica;

-- Truncate all user-facing tables
TRUNCATE TABLE
  acao_equipe,
  acao_custos,
  acao_turmas,
  acao_funcionarios,
  acoes,
  attendance_justifications,
  attendances,
  enrollment_consents,
  enrollment_documents,
  enrollments,
  material_comments,
  materials,
  certificates,
  class_schedules,
  class_teachers,
  classes,
  truck_maintenances,
  trips,
  expenses,
  trucks,
  teacher_courses,
  course_modules,
  courses,
  cities,
  groups,
  student_professional,
  student_socioeconomic,
  student_addresses,
  student_contacts,
  students,
  contas_pagar,
  api_keys,
  data_deletion_requests,
  audit_logs,
  notifications,
  system_configs,
  refresh_tokens,
  users
  CASCADE;

-- Re-enable FK checks
SET session_replication_role = DEFAULT;

SELECT 'Truncate complete' as status;
