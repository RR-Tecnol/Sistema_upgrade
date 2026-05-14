SET session_replication_role = replica;
COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
07961a0f-b8a4-41a7-8a51-5d9dc83977e0	b1c9156557481a4826f38910f2649958fa6dd31937e9cf2d48ddc1e7c2fd5607	2026-03-07 14:39:08.406503+00	20260217191645_init	\N	\N	2026-03-07 14:39:07.782744+00	1
74fe138e-7393-4b56-8813-6ca29f81148d	ecc0bc35c9215256cfb5638d72a804f5b653b087f5d853fd6f38c6b3d2636adc	2026-03-07 14:39:08.450065+00	20260217205047_add_cpf_to_user	\N	\N	2026-03-07 14:39:08.409541+00	1
43de916d-1e76-4a44-9167-006bf41910e4	d30f7427cd9154abde55349d661a89d23fc0b51fa90bbdd88a8b0e1220cb0c7e	2026-03-07 14:39:08.552486+00	20260306184401_add_acoes_module	\N	\N	2026-03-07 14:39:08.45313+00	1
fca09978-791d-4fe1-9a07-3972b9e977ca	ce049767258da023fa29a28b9c26a326786fdf40f9f59a892b6d51be6d1e6e99	2026-03-07 14:39:10.830793+00	20260307143910_add_contas_pagar	\N	\N	2026-03-07 14:39:10.782732+00	1
295f971e-6e68-4341-a0cd-7187dc6a9951	71c3ea83064d1b94087355a00475c1cfad94f8c26da5ff40cd101dd5482ac088	2026-03-07 19:15:18.538649+00	20260307191518_add_truck_maintenance	\N	\N	2026-03-07 19:15:18.497637+00	1
9f7fc871-1a60-4c59-b7b6-afc95fe5c240	a94a03f952f19b205f60abe3726904bf695d1f1002830427a521dbed0042336b	2026-03-08 19:46:11.967987+00	20260308194611_add_employees_module	\N	\N	2026-03-08 19:46:11.90558+00	1
c9790c6f-e041-459f-9dde-f3f73660bc09	0fedeee46bec6829cca39b2d512c72744ce15813181ef4a0e02bd5e90408da1a	2026-03-08 20:15:08.931195+00	20260308201508_add_acao_funcionario	\N	\N	2026-03-08 20:15:08.796734+00	1
\.
COPY public.acao_custos (id, "acaoId", tipo, descricao, valor, data, litros, "funcionarioId", observacoes, "createdAt") FROM stdin;
\.
COPY public.acao_equipe (id, "acaoId", "userId", funcao, diaria, "diasTrabalhados", "createdAt") FROM stdin;
\.
COPY public.acao_funcionarios (id, "acaoId", "employeeId", "valorDiaria", "diasTrabalhados", "createdAt") FROM stdin;
\.
COPY public.acao_turmas (id, "acaoId", "turmaId", "createdAt") FROM stdin;
\.
COPY public.acoes (id, nome, "cidadeId", "grupoId", "carretaId", status, "dataInicio", "dataFim", "localExecucao", "distanciaKm", "precoCombustivelL", "autonomiaKmL", observacoes, "permitirInscricoes", "createdAt", "updatedAt", "cidadeNome") FROM stdin;
f040de7e-3070-4b63-902b-52fa89ffd662	Qualifica Teresina 2025	93b13d40-88a3-4da3-89eb-2316a6da0f01	d321ba2f-9d66-4aec-a8db-5734f9f4bc59	\N	PLANEJADA	2025-04-01 00:00:00	2025-04-30 00:00:00		\N	\N	4.00	\N	t	2026-03-07 18:49:28.419	2026-03-07 18:49:28.419	Teresina, PI
\.
COPY public.api_keys (id, name, key, permissions, active, "createdBy", "createdAt", "lastUsedAt", "expiresAt") FROM stdin;
\.
COPY public.attendance_justifications (id, "attendanceId", reason, details, "proofUrl", "submittedAt", status, "reviewedBy", "reviewedAt", "reviewNotes") FROM stdin;
\.
COPY public.attendances (id, "classId", "studentId", date, present, justified, justification, "registeredBy", "registeredAt", "updatedAt", "classNotes", "classPhotoUrl") FROM stdin;
\.
COPY public.audit_logs (id, "userId", action, "tableName", "recordId", "oldData", "newData", "ipAddress", "userAgent", "createdAt") FROM stdin;
\.
COPY public.certificates (id, "studentId", "classId", "verificationCode", "qrCodeUrl", "fileUrl", "issuedAt", "issuedBy", status, "cancellationReason", "cancelledAt", "cancelledBy") FROM stdin;
\.
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
COPY public.class_schedules (id, "classId", weekday, active, "createdAt") FROM stdin;
\.
COPY public.class_teachers (id, "classId", "teacherId", "isSubstitute", "createdAt") FROM stdin;
\.
COPY public.classes (id, "courseId", "groupId", "cityId", "classIdentifier", "startDate", "endDate", period, "startTime", "endTime", vacancies, "truckId", status, "enrollmentOpenDate", "enrollmentCloseDate", "createdAt", "updatedAt") FROM stdin;
\.
COPY public.contas_pagar (id, tipo_conta, tipo_espontaneo, descricao, valor, data_vencimento, data_pagamento, status, recorrente, observacoes, comprovante_url, cidade, "acaoId", "createdAt", "updatedAt") FROM stdin;
d3309e22-67cb-4a36-86db-f1269194e34f	agua	\N	├ügua	150.00	2026-03-07 00:00:00	\N	pendente	f	\N	\N	sao luis	\N	2026-03-07 15:13:29.483	2026-03-07 15:13:29.483
424088db-a0c5-4210-889d-7ba7240f965c	abastecimento	\N	Abastecimento	100.00	2026-03-07 00:00:00	\N	pendente	f	\N	\N	\N	\N	2026-03-07 18:55:38.535	2026-03-07 18:55:38.535
91e389c5-a544-411a-8fa1-b176fb1763d9	manutencao	preventiva	[MANUTEN├ç├âO] Troca de oleo motor ÔÇö Carreta 01	200.00	2026-03-07 00:00:00	2026-03-08 21:28:52.742	paga	f	\N	\N	\N	\N	2026-03-08 21:28:35.242	2026-03-08 21:28:52.745
\.
COPY public.course_modules (id, "courseId", "moduleName", room, "startTime", "endTime", "order", "createdAt", "updatedAt") FROM stdin;
\.
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
COPY public.data_deletion_requests (id, "userId", "requestedAt", "processedAt", "processedBy", status) FROM stdin;
\.
COPY public.employees (id, name, role, department, cpf, rg, phone, email, specialty, "dailyCost", "hireDate", notes, "photoUrl", active, "createdAt", "updatedAt") FROM stdin;
bba21ebe-2a92-4634-b01a-c39d4d0f0c3d	joao gabriel araujo	INSTRUCTOR	ACADEMIC	00895399318	234234234234	98987272826	joaogabrieldiniz23@gmail.com	Professor de IA	100.00	2026-03-09 00:00:00	\N	\N	t	2026-03-08 19:57:12.052	2026-03-08 19:57:12.052
\.
COPY public.enrollment_consents (id, "enrollmentId", "dataProcessing", "imageUse", "termsAccepted", "privacyPolicyAccepted", "consentDate", "ipAddress", "userAgent") FROM stdin;
\.
COPY public.enrollment_documents (id, "enrollmentId", "documentType", "fileUrl", "uploadedAt") FROM stdin;
\.
COPY public.enrollments (id, "studentId", "classId", protocol, status, "enrolledAt", "reviewedAt", "reviewedBy", "rejectionReason", notes, "createdAt", "updatedAt") FROM stdin;
\.
COPY public.expenses (id, "tripId", "truckId", category, subcategory, amount, description, "receiptUrl", "expenseDate", "responsibleUserId", status, "approvedBy", "approvedAt", "rejectionReason", "createdAt") FROM stdin;
\.
COPY public.groups (id, name, state, "createdAt") FROM stdin;
d321ba2f-9d66-4aec-a8db-5734f9f4bc59	Grupo 1 MA	MA	2026-03-07 14:39:14.431
61388d4e-957d-4ed6-8e6f-3b1543ecbd38	Grupo 2 MA	MA	2026-03-07 14:39:14.472
7b1a18b5-086c-4826-b417-aa139782b6ad	Grupo 1 PI	PI	2026-03-07 14:39:14.487
\.
COPY public.material_comments (id, "materialId", "userId", comment, "createdAt") FROM stdin;
\.
COPY public.materials (id, "courseId", "classId", "teacherId", title, description, "fileUrl", "fileType", "fileSize", tags, visibility, "visibleFrom", "uploadedBy", "uploadedAt", "downloadCount", "viewCount") FROM stdin;
\.
COPY public.notifications (id, "userId", type, title, message, channel, data, "sentAt", "readAt", "clickedAt", "deliveryStatus", "errorMessage", "createdAt") FROM stdin;
\.
COPY public.refresh_tokens (id, token, "userId", "expiresAt", "createdAt") FROM stdin;
8292163c-9963-4c12-8839-fafd7ca20b3e	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTIwNGYzYS0zNzJjLTQ5ODMtYWQyYy1kNDU0MjhhN2RlM2QiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI4OTYzNzksImV4cCI6MTc3MzUwMTE3OX0.2MVt7axDrrwIuWScHeLNq3iI4y3KDLV7FPiozgiw72Q	7e204f3a-372c-4983-ad2c-d45428a7de3d	2026-03-14 15:12:59.946	2026-03-07 15:12:59.948
76ee9276-c5d8-44c5-a448-1a0b17735264	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTIwNGYzYS0zNzJjLTQ5ODMtYWQyYy1kNDU0MjhhN2RlM2QiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI5MDQ4NjcsImV4cCI6MTc3MzUwOTY2N30.2_G73hy7AXFvffJosBfu_1ynXWCZdYIzCufGfN2qqo8	7e204f3a-372c-4983-ad2c-d45428a7de3d	2026-03-14 17:34:27.135	2026-03-07 17:34:27.137
9beb99df-3ca4-4298-9fba-cae85455c2db	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTIwNGYzYS0zNzJjLTQ5ODMtYWQyYy1kNDU0MjhhN2RlM2QiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI5MDg2NTgsImV4cCI6MTc3MzUxMzQ1OH0.t-cytWKUIU7NT6w0vXdfWT46uHRQ68-9SRq4Gvti60I	7e204f3a-372c-4983-ad2c-d45428a7de3d	2026-03-14 18:37:38.801	2026-03-07 18:37:38.804
7fe6213d-2523-4f75-8f44-0df23e72d74a	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTIwNGYzYS0zNzJjLTQ5ODMtYWQyYy1kNDU0MjhhN2RlM2QiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI5MTIzOTEsImV4cCI6MTc3MzUxNzE5MX0.aiWbzFQ0AP4wLV8mdZjXTTL6D5cyGM9q0RqTsqlWF-I	7e204f3a-372c-4983-ad2c-d45428a7de3d	2026-03-14 19:39:51.341	2026-03-07 19:39:51.344
13268ed5-10d6-429a-9370-cd5178f7006b	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTIwNGYzYS0zNzJjLTQ5ODMtYWQyYy1kNDU0MjhhN2RlM2QiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzI5OTk3NjEsImV4cCI6MTc3MzYwNDU2MX0.55QtoT8EgqYL2icbUDWoJqAP9q88le27akYBA4MGs2o	7e204f3a-372c-4983-ad2c-d45428a7de3d	2026-03-15 19:56:01.788	2026-03-08 19:56:01.788
c2907ef9-72a6-4fcc-b0e2-103d04231c93	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTIwNGYzYS0zNzJjLTQ5ODMtYWQyYy1kNDU0MjhhN2RlM2QiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NzMwMDM5MzUsImV4cCI6MTc3MzYwODczNX0.WSgpf5oD33Yr9Te4GquORnhBmzd16ecFf8H38dpKW4w	7e204f3a-372c-4983-ad2c-d45428a7de3d	2026-03-15 21:05:35.897	2026-03-08 21:05:35.9
\.
COPY public.student_addresses (id, "studentId", cep, street, number, complement, neighborhood, city, state, zone) FROM stdin;
\.
COPY public.student_contacts (id, "studentId", email, phone, "hasWhatsapp", "phoneAlt", "allowWhatsappContact", "allowEmailContact") FROM stdin;
\.
COPY public.student_professional (id, "studentId", "previousQualification", "professionalInterest", "howHeardAbout", motivation, "careerGoal") FROM stdin;
\.
COPY public.student_socioeconomic (id, "studentId", "educationLevel", "employmentStatus", "familyMembersCount", "socialProgram", "hasDisability", "disabilityType", "disabilityAdaptation", "familyIncome") FROM stdin;
\.
COPY public.students (id, "userId", cpf, rg, "rgIssuer", "birthDate", gender, "raceColor", "maritalStatus", "motherName", "fatherName", nationality, "birthCity", "birthState", "photoUrl", "createdAt", "updatedAt", active, "socialName") FROM stdin;
\.
COPY public.system_configs (id, "configKey", "configValue", "dataType", description, "updatedBy", "updatedAt") FROM stdin;
\.
COPY public.teacher_courses (id, "teacherId", "courseId", "createdAt") FROM stdin;
\.
COPY public.teachers (id, "userId", cpf, rg, "birthDate", "photoUrl", education, specialties, experience, certifications, "resumeUrl", availability, "preferredRegion", "contractType", "hireDate", active, "createdAt", "updatedAt") FROM stdin;
\.
COPY public.trips (id, "truckId", "originCityId", "destinationCityId", "departureDate", "expectedArrivalDate", "actualArrivalDate", "driverName", "driverPhone", "kmStart", "kmEnd", status, notes, "createdAt", "updatedAt") FROM stdin;
\.
COPY public.truck_maintenances (id, "truckId", tipo, titulo, descricao, status, prioridade, "kmAtual", "kmProximo", "dataAgendada", "dataConclusao", "custoEstimado", "custoReal", "statusPagamento", fornecedor, responsavel, observacoes, "contaPagarId", "createdAt", "updatedAt") FROM stdin;
2b216f16-2da7-4261-9bbd-d53b37d88017	2c5c78ce-3173-47bd-9a3c-7f6712776140	preventiva	Troca de oleo motor	\N	agendada	alta	\N	\N	2026-03-07 00:00:00	\N	\N	200.00	pendente	\N	\N	\N	91e389c5-a544-411a-8fa1-b176fb1763d9	2026-03-07 19:26:46.447	2026-03-08 21:28:35.269
\.
COPY public.trucks (id, identifier, "licensePlate", type, "groupId", state, capacity, "roomsCount", status, "modelYear", "lastMaintenanceDate", "nextMaintenanceDate", "photoUrl", "equipmentList", notes, "createdAt", "updatedAt") FROM stdin;
2c5c78ce-3173-47bd-9a3c-7f6712776140	Carreta 01	ADV-4523	STANDARD	7b1a18b5-086c-4826-b417-aa139782b6ad	PI	30	1	MAINTENANCE	2026	\N	\N	\N	\N	\N	2026-03-07 18:56:32.852	2026-03-07 19:26:46.486
\.
COPY public.users (id, email, password, name, phone, role, active, "createdAt", "updatedAt", cpf) FROM stdin;
7e204f3a-372c-4983-ad2c-d45428a7de3d	admin@qualifica.com	$2b$10$g1xqAHP38C7X4Xejf/YYGO/TlcZITNEH8/WgoZ9/wCb4d3GJ6mSO6	Administrador	(98) 98888-8888	ADMIN	t	2026-03-07 14:39:14.722	2026-03-07 14:39:14.722	\N
\.

SET session_replication_role = DEFAULT;
