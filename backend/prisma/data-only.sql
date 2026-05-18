--
-- PostgreSQL database dump
--

\restrict 9hcoJdT13K07oVXLPRmpidyqvzsu5n79HV8TRL6tGc2a0DusBlloaVS1c1Nwwti

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
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public._prisma_migrations DISABLE TRIGGER ALL;

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
050d1d6b-94cf-4840-ad3c-7ecd18a072ba	b1c9156557481a4826f38910f2649958fa6dd31937e9cf2d48ddc1e7c2fd5607	2026-05-14 12:28:53.980562+00	20260217191645_init	\N	\N	2026-05-14 12:28:53.404829+00	1
c1dd7fdc-5cdc-414d-896a-1734b491ffca	180aee8852331bd7cf0aa18d6c58fb0751893c6c673027be48e4f10f67d3e227	2026-05-14 12:28:54.479527+00	20260427160635_add_city_lat_lng_columns	\N	\N	2026-05-14 12:28:54.357307+00	1
a22cc7f5-5a85-4a97-93b4-1447935b5915	ecc0bc35c9215256cfb5638d72a804f5b653b087f5d853fd6f38c6b3d2636adc	2026-05-14 12:28:54.012957+00	20260217205047_add_cpf_to_user	\N	\N	2026-05-14 12:28:53.984552+00	1
7209ca08-05d9-4783-8b9e-fb4165961ddf	d30f7427cd9154abde55349d661a89d23fc0b51fa90bbdd88a8b0e1220cb0c7e	2026-05-14 12:28:54.100985+00	20260306184401_add_acoes_module	\N	\N	2026-05-14 12:28:54.015996+00	1
bf5e0b2f-bc85-46cd-a7c6-be909b4dec0a	ef1357404b1ebffc582c765919faa6737c3a732a5834c50ed2569833a8de5a52	2026-05-14 12:28:54.626036+00	20260506120000_class_weekend_policy	\N	\N	2026-05-14 12:28:54.616336+00	1
267404d0-61b3-4a99-9be9-cea4f3361232	ce049767258da023fa29a28b9c26a326786fdf40f9f59a892b6d51be6d1e6e99	2026-05-14 12:28:54.134822+00	20260307143910_add_contas_pagar	\N	\N	2026-05-14 12:28:54.103217+00	1
e18c1209-9ea8-448d-8282-994a2ff7f9fb	5f8be71ad4e07ace3a66521eecc4be8ef455b8b422cb863291611608a300c6cb	2026-05-14 12:28:54.536247+00	20260427163851_certificate_templates_workflow	\N	\N	2026-05-14 12:28:54.48193+00	1
81ebb489-9252-4f58-8e39-656cd988008b	71c3ea83064d1b94087355a00475c1cfad94f8c26da5ff40cd101dd5482ac088	2026-05-14 12:28:54.165027+00	20260307191518_add_truck_maintenance	\N	\N	2026-05-14 12:28:54.138704+00	1
71909d29-ce65-4e6d-8471-a799624bc304	a94a03f952f19b205f60abe3726904bf695d1f1002830427a521dbed0042336b	2026-05-14 12:28:54.200632+00	20260308194611_add_employees_module	\N	\N	2026-05-14 12:28:54.168274+00	1
0e251913-a1fc-4c7f-993a-3fb44fe0d3f8	0fedeee46bec6829cca39b2d512c72744ce15813181ef4a0e02bd5e90408da1a	2026-05-14 12:28:54.229615+00	20260308201508_add_acao_funcionario	\N	\N	2026-05-14 12:28:54.203557+00	1
facf10bb-f865-47e3-99da-59ab9f0072ad	73ae9a41732b4ad00d2e87146ab06ce33660934c21153945a00b1cc95b4b5fc6	2026-05-14 12:28:54.547324+00	20260427171630_certificate_public_file_scope	\N	\N	2026-05-14 12:28:54.540241+00	1
805aab0d-dd47-4c14-a648-7bffb3b97817	cc3d10201c3643988ff54e403eaf3975a0892f2310eb4f76a30d7688f4780cd9	2026-05-14 12:28:54.279927+00	20260313135037_req_01_03_04_05_08_09_10_schema_upgrade	\N	\N	2026-05-14 12:28:54.232752+00	1
a15d7c53-2e92-4fac-959b-c00cd446a0ac	a68c1dff573bc0a3ace704c858cadcb4f1c934e320ccdc1dc9cdd00d521b32ba	2026-05-14 12:28:54.294565+00	20260313163148_add_class_holiday_user_relation	\N	\N	2026-05-14 12:28:54.283216+00	1
7b34836e-86f2-41ba-aa32-8fe672498966	8ee6374a422b8b2867f66572dd38e350cc96dcfa5762569a4af401a202003eb5	2026-05-14 12:28:54.739826+00	20260508200000_trip_audit_validation	\N	\N	2026-05-14 12:28:54.73142+00	1
78fb4737-0020-4c0b-a956-bda338758615	423c2005943bcd72b7a5b782c44c9de60bb3148b8fb95d64180e9dfc4695f99f	2026-05-14 12:28:54.3105+00	20260313192627_make_receipt_url_optional	\N	\N	2026-05-14 12:28:54.301918+00	1
d137f02d-5f01-4a35-9b84-8d4024377033	5f8788e72adfa479d262259c0adfaba83a35e8ab16bcf9ef29be8bcc2f205beb	2026-05-14 12:28:54.557589+00	20260427175515_certificate_template_pdf_text_overrides	\N	\N	2026-05-14 12:28:54.549949+00	1
d305d037-0bed-4cfe-b46b-0254504faf96	335f2697a358a00a0a7510fc30d60beacecca09a882670424174c5a0c54cf136	2026-05-14 12:28:54.323355+00	20260316130235_add_two_factor	\N	\N	2026-05-14 12:28:54.313381+00	1
a67d726f-1c55-4897-9987-2cb8d781061c	800436982491f23d167b268e19ad080beabca095250cc76eb39adbe40db96d82	2026-05-14 12:28:54.340563+00	20260318162339_add_driver_role_and_employee_user_relation	\N	\N	2026-05-14 12:28:54.328204+00	1
80d2edbe-14d3-496b-949e-7fce052b7cf6	9b11cd9ea319f2a094229a8e8cded6ed99a576d60d719232c4c1f50d7459d690	2026-05-14 12:28:54.648665+00	20260506143000_student_legal_consent_lgpd	\N	\N	2026-05-14 12:28:54.62921+00	1
a928e5d4-80b2-49a9-a956-456327056cfd	4bc1979e93d44bb31a0e67d89a25c4af984dfbd0ae851039694602b2d9abf131	2026-05-14 12:28:54.354186+00	20260318173241_add_driver_user_id_to_trip	\N	\N	2026-05-14 12:28:54.343233+00	1
9aedba87-826d-4aaf-99cb-2a47cab1ee88	604c896e01060b9a14d600561900cd36e436d04d9f375ddb8aad9893f6ff8c85	2026-05-14 12:28:54.574005+00	20260427190828_certificate_template_version_snapshot	\N	\N	2026-05-14 12:28:54.560779+00	1
56a53f64-4b15-42c2-badf-0295d18d9ecd	4924612f64d3dd2ef11a0f247257e0e26e0e3470cf1de6f2e8d488112d962b13	2026-05-14 12:28:54.586117+00	20260504120000_add_social_post_proof_to_feedback	\N	\N	2026-05-14 12:28:54.577357+00	1
62fd81c2-a83b-4477-af9d-96bafd52ab2c	cfbc856b5426e5f2db9a3de602bb8dcdfc758794c0e723436c46f9141b624418	2026-05-14 12:28:54.599225+00	20260504130000_add_class_acao_location_fields	\N	\N	2026-05-14 12:28:54.58965+00	1
11449405-fe8b-4989-a5a5-8a29a6865ce8	f7098762e3627bbc89254d075c2d6f3a331a89852f16370d953dcf617b0ab57d	2026-05-14 12:28:54.660799+00	20260507183000_feedback_content_review_flow	\N	\N	2026-05-14 12:28:54.652078+00	1
e3867ce4-1b13-48ff-9fd3-4dc2952d3ba6	590783102ad6969f50af6c07c36c1d3ea11f0dd2d908e72fdae931a49910a2f1	2026-05-14 12:28:54.612497+00	20260506120000_class_holiday_end_date_snapshot	\N	\N	2026-05-14 12:28:54.602841+00	1
e5c59f6d-b691-4458-b0fe-03b2501d01ed	262bbf02b0fff8a1bc3f5e6c9732d5da5ddc57854a56bf3602fb985d4fd32d09	2026-05-14 12:28:54.706943+00	20260508123000_add_employee_registration_flow_tables	\N	\N	2026-05-14 12:28:54.66384+00	1
2775703d-9f30-45d5-98ea-36f0856f02e1	68ce202c89f464a9d3f85886b5f571554b05285c6bc3cd7989fc774260c3baa3	2026-05-14 12:28:54.727561+00	20260508194500_unique_teacher_driver_checkin_per_day	\N	\N	2026-05-14 12:28:54.710159+00	1
\.


ALTER TABLE public._prisma_migrations ENABLE TRIGGER ALL;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.users DISABLE TRIGGER ALL;

COPY public.users (id, email, password, name, phone, role, active, "createdAt", "updatedAt", cpf, "twoFactorEnabled", "twoFactorSecret", "emailOtpAttempts", "emailOtpExpiresAt", "emailOtpHash", "requiresPasswordChange", "requiresTwoFactorSetup") FROM stdin;
21c3d311-9147-48a5-a66b-d263df569c17	maria.silva@qualifica.com	$2b$10$36HrLvDxI/MC3X12XWNUZ.AHGrVfja/qYpS109cbNV0cBWIvLAkVK	Maria Silva Pereira	(98) 99111-2233	TEACHER	t	2026-05-14 12:35:04.441	2026-05-14 12:35:04.441	\N	f	\N	0	\N	\N	f	f
75ac91cd-e117-49f9-8350-3a17b2c7396b	carlos.mendes@qualifica.com	$2b$10$36HrLvDxI/MC3X12XWNUZ.AHGrVfja/qYpS109cbNV0cBWIvLAkVK	Carlos Eduardo Mendes	(86) 99222-3344	TEACHER	t	2026-05-14 12:35:04.45	2026-05-14 12:35:04.45	\N	f	\N	0	\N	\N	f	f
5d855437-7505-42ff-a8b6-82ea4892b405	joao.motorista@qualifica.com	$2b$10$36HrLvDxI/MC3X12XWNUZ.AHGrVfja/qYpS109cbNV0cBWIvLAkVK	João Batista Ferreira	(98) 99333-4455	DRIVER	t	2026-05-14 12:35:04.465	2026-05-14 12:35:04.465	\N	f	\N	0	\N	\N	f	f
9cf80ceb-6ab0-4e30-8713-4150f6b9764f	lucia.coord@qualifica.com	$2b$10$36HrLvDxI/MC3X12XWNUZ.AHGrVfja/qYpS109cbNV0cBWIvLAkVK	Lúcia Rodrigues Almeida	(98) 99444-5566	COORDINATOR	t	2026-05-14 12:35:04.511	2026-05-14 12:35:04.511	\N	f	\N	0	\N	\N	f	f
20241a57-0978-4fb4-99ad-0094fb3d18f9	davi.martins@qualifica.com	$2b$10$36HrLvDxI/MC3X12XWNUZ.AHGrVfja/qYpS109cbNV0cBWIvLAkVK	Davi Rhuan da Silva Martins	(98) 98970-1346	STUDENT	t	2026-05-14 12:35:04.549	2026-05-14 12:35:04.549	\N	f	\N	0	\N	\N	f	f
929f9cce-92f5-45f7-967f-b2c017136e7b	ana.lima@qualifica.com	$2b$10$36HrLvDxI/MC3X12XWNUZ.AHGrVfja/qYpS109cbNV0cBWIvLAkVK	Ana Beatriz Lima Fonseca	(86) 99201-7788	STUDENT	t	2026-05-14 12:35:04.569	2026-05-14 12:35:04.569	\N	f	\N	0	\N	\N	f	f
b7048454-167c-4a7f-a06b-34f8b867b69b	pedro.santos@qualifica.com	$2b$10$36HrLvDxI/MC3X12XWNUZ.AHGrVfja/qYpS109cbNV0cBWIvLAkVK	Pedro Henrique Santos Oliveira	(98) 99302-4433	STUDENT	t	2026-05-14 12:35:04.583	2026-05-14 12:35:04.583	\N	f	\N	0	\N	\N	f	f
8b15a83f-3e6c-41f8-bfcc-6f02c94d4fcc	carlos.souza.demo@qualifica.com	$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai	Carlos Souza	(98) 99001-0001	DRIVER	t	2026-05-14 12:35:05.26	2026-05-14 12:35:05.26	\N	f	\N	0	\N	\N	f	f
7f651b73-8c01-4734-b2af-25e02638cc17	ana.lima.demo@qualifica.com	$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai	Ana Lima	(86) 99002-0002	DRIVER	t	2026-05-14 12:35:05.283	2026-05-14 12:35:05.283	\N	f	\N	0	\N	\N	f	f
cdbfd25f-d651-408c-b3ac-b42d2d6c736a	roberto.freitas.demo@qualifica.com	$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai	Roberto Freitas	(68) 99003-0003	DRIVER	t	2026-05-14 12:35:05.299	2026-05-14 12:35:05.299	\N	f	\N	0	\N	\N	f	f
baad3183-794d-44b4-a99d-7f794710b818	marina.costa.demo@qualifica.com	$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai	Marina Costa	(98) 99004-0004	DRIVER	t	2026-05-14 12:35:05.317	2026-05-14 12:35:05.317	\N	f	\N	0	\N	\N	f	f
86cf840d-a358-425d-b102-7b90ad6f1a5d	paulo.ramos.demo@qualifica.com	$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai	Paulo Ramos	(86) 99005-0005	DRIVER	t	2026-05-14 12:35:05.339	2026-05-14 12:35:05.339	\N	f	\N	0	\N	\N	f	f
7f7380d4-c9c1-40fb-90fb-516f39fbe5f0	fabio.nunes.demo@qualifica.com	$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai	Fábio Nunes	(68) 99006-0006	DRIVER	t	2026-05-14 12:35:05.355	2026-05-14 12:35:05.355	\N	f	\N	0	\N	\N	f	f
d0f246c1-e506-4f2b-a8a3-da26d3e221a8	lea.santos.demo@qualifica.com	$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai	Léa Santos	(98) 99007-0007	DRIVER	t	2026-05-14 12:35:05.373	2026-05-14 12:35:05.373	\N	f	\N	0	\N	\N	f	f
fb32b5ce-dbf8-4085-b7cb-e89e624dfb22	diego.alves.demo@qualifica.com	$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai	Diego Alves	(98) 99008-0008	DRIVER	t	2026-05-14 12:35:05.389	2026-05-14 12:35:05.389	\N	f	\N	0	\N	\N	f	f
c8d457d7-7113-4c56-a826-05201dec5869	tania.melo.demo@qualifica.com	$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai	Tânia Melo	(86) 99009-0009	DRIVER	t	2026-05-14 12:35:05.406	2026-05-14 12:35:05.406	\N	f	\N	0	\N	\N	f	f
a61d0671-a776-4800-86c8-d62114aec929	jonas.pires.demo@qualifica.com	$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai	Jonas Pires	(86) 99010-0010	DRIVER	t	2026-05-14 12:35:05.419	2026-05-14 12:35:05.419	\N	f	\N	0	\N	\N	f	f
5a1cca76-527b-4d85-baf2-8a0129353b45	admin@qualifica.com	$2b$10$wRX6PgKrMd3ulaYae73EWepuXtzib3b4RzumteUfhewe6Edi5K69y	Administrador Upgrade	(98) 98888-0000	ADMIN	t	2026-05-14 12:35:04.359	2026-05-14 20:03:44.053	\N	f	\N	0	\N	\N	f	f
ed1c0c59-7fe1-4013-b969-c9fd7fd720c4	prof.fym5ut1@escola-teste.com	$2b$10$faX68tglQRkNJhdGBEW9oeQ8gJYcMzrUBbI1FN9euGhn/RFWaems6	Prof Teste FYM5UT1	98999990000	TEACHER	f	2026-05-14 17:51:56.974	2026-05-14 17:51:56.974	\N	f	\N	0	\N	\N	f	f
108d37e2-d5a0-4ddf-9f3b-4e486fe7986f	aluno1.avfb1ufn@teste-upgrade.com	$2b$10$mmVuRN.XaSdATfb8BdAE4eWJVjqsbWOYU9ckO0kXqDPuWG0LwId9u	Aluno Teste 1 AVFB1UFN	98988880000	STUDENT	t	2026-05-14 17:51:59.094	2026-05-14 17:51:59.094	\N	f	\N	0	\N	\N	f	f
52784048-b87c-43ab-8bc4-22184ba2395b	aluno2.1ld8zp99@teste-upgrade.com	$2b$10$c87fwJwsV.BQFDla3yuE9uKSUWz6U6bFJdOIjgnMRpo85u946P5q6	Aluno Teste 2 1LD8ZP99	98988880000	STUDENT	t	2026-05-14 17:52:01.191	2026-05-14 17:52:01.191	\N	f	\N	0	\N	\N	f	f
\.


ALTER TABLE public.users ENABLE TRIGGER ALL;

--
-- Data for Name: absences; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.absences DISABLE TRIGGER ALL;

COPY public.absences (id, "userId", type, date, description, "documentUrl", status, "adminNote", penalty, "reviewedBy", "reviewedAt", active, "createdAt", "updatedAt") FROM stdin;
847863a7-bc1e-4b59-8d92-f2d0acfec5f6	5d855437-7505-42ff-a8b6-82ea4892b405	ILLNESS	2026-03-30 12:35:04.506	Gripe forte com febre — atestado médico de 3 dias apresentado.	\N	VALIDATED	Atestado válido. Ausência justificada.	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-03-31 12:35:04.506	t	2026-05-14 12:35:04.507	2026-05-14 12:35:04.507
29af7733-fc85-49ec-8f6b-e5768f290e4f	5d855437-7505-42ff-a8b6-82ea4892b405	PERSONAL	2026-04-24 12:35:04.506	Ausência por motivo pessoal sem comprovante dentro do prazo regimental.	\N	PENALIZED	Sem documento válido. Desconto de R$ 140,00 aplicado.	140.00	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-04-25 12:35:04.506	t	2026-05-14 12:35:04.507	2026-05-14 12:35:04.507
5566af5b-7a73-45f0-8f32-d5ed6b3264cf	5d855437-7505-42ff-a8b6-82ea4892b405	EMERGENCY	2026-05-09 12:35:04.506	Emergência familiar — familiar hospitalizado. Aguardando boletim médico.	\N	PENDING	\N	\N	\N	\N	t	2026-05-14 12:35:04.507	2026-05-14 12:35:04.507
4e02f6fc-59cc-4889-bf2d-a8a405136bf4	21c3d311-9147-48a5-a66b-d263df569c17	ILLNESS	2026-03-15 12:35:04.518	Gripe forte com atestado médico de 2 dias — impossível ministrar aulas.	\N	VALIDATED	Atestado médico válido. Ausência justificada, sem impacto no pagamento.	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-03-16 12:35:04.518	t	2026-05-14 12:35:04.519	2026-05-14 12:35:04.519
d69b1c0a-3d8e-43d6-9351-f5e372e8cd5b	21c3d311-9147-48a5-a66b-d263df569c17	PERSONAL	2026-04-14 12:35:04.518	Ausência por motivo pessoal. Nenhum documento apresentado no prazo.	\N	PENALIZED	Desconto de R$ 200,00 aplicado conforme regulamento.	200.00	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-04-15 12:35:04.518	t	2026-05-14 12:35:04.519	2026-05-14 12:35:04.519
f3a5afa2-fa5e-4a8c-a09a-5fe99a117a74	21c3d311-9147-48a5-a66b-d263df569c17	EMERGENCY	2026-05-11 12:35:04.518	Emergência familiar — filho hospitalizado. Aguardando documentação médica.	\N	PENDING	\N	\N	\N	\N	t	2026-05-14 12:35:04.519	2026-05-14 12:35:04.519
\.


ALTER TABLE public.absences ENABLE TRIGGER ALL;

--
-- Data for Name: cities; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.cities DISABLE TRIGGER ALL;

COPY public.cities (id, name, state, "ibgeCode", "createdAt", latitude, longitude) FROM stdin;
f627826b-1705-467d-8e3e-52e1eb5bdaf2	São Luís	MA	2111300	2026-05-14 12:30:57.806	-2.5297	-44.3028
5bc1e825-7809-4a02-afff-c939c8b7b9e0	Imperatriz	MA	2105302	2026-05-14 12:30:57.81	-5.5261	-47.4916
362938b6-832a-480d-8287-df608be687cd	São José de Ribamar	MA	2111201	2026-05-14 12:30:57.812	-2.5506	-44.0583
4a8561d8-36b9-4539-a7d8-db0a2231797e	Timon	MA	2112209	2026-05-14 12:30:57.815	-5.0944	-42.8356
8304dd54-645b-44a3-820c-6105d4044492	Caxias	MA	2103000	2026-05-14 12:30:57.817	-4.8692	-43.3564
5553163b-82c2-4853-8379-a4c99aa7e6a3	Codó	MA	2103307	2026-05-14 12:30:57.82	-4.4497	-43.8842
db8b7af4-0f33-4947-afd4-2bbfbcb4e9c7	Paço do Lumiar	MA	2107704	2026-05-14 12:30:57.823	-2.5131	-44.1064
b19fd101-14df-4c8a-9620-1f7162647763	Açailândia	MA	2100055	2026-05-14 12:30:57.826	-4.9478	-47.5
8e49f2e5-1d3f-4ad8-8574-d2af355b41e6	Bacabal	MA	2101202	2026-05-14 12:30:57.829	-4.2244	-44.79
1b7dd96f-bbe1-4d8c-86c9-e50e2af5123e	Balsas	MA	2101400	2026-05-14 12:30:57.832	-7.5328	-46.0357
075bc61d-41b1-4ff6-8ae6-3ab57a2e9e33	Teresina	PI	2211001	2026-05-14 12:30:57.834	-5.0892	-42.8019
0d3d9cbe-f662-474f-a620-55978aa26ca6	Parnaíba	PI	2207702	2026-05-14 12:30:57.837	-2.9046	-41.7769
f26f8ef0-4f4d-4f3e-b3ae-279454425490	Picos	PI	2208007	2026-05-14 12:30:57.839	-7.0769	-41.4677
e1df1f45-79a2-4a9c-b070-2571ae27f9e1	Floriano	PI	2203909	2026-05-14 12:30:57.842	-6.7669	-43.0178
350872a7-74f0-4ed6-9cc3-3a0bd6d02381	Piripiri	PI	2208304	2026-05-14 12:30:57.844	-4.2706	-41.7767
ce2f7eb6-561f-4b4a-9fd1-907c7f96ac40	Campo Maior	PI	2202251	2026-05-14 12:30:57.846	-4.8233	-42.1689
11c2fab1-0909-4584-93b4-437e74a8d6b5	Barras	PI	2201200	2026-05-14 12:30:57.849	-4.2428	-42.2956
50b7aa74-c5c8-4899-9eec-86c8eeb9a6ac	Rio Branco	AC	1200401	2026-05-14 12:30:57.852	-9.9754	-67.8249
2a14df36-6faf-4192-ab52-d7c3405aab6c	Cruzeiro do Sul	AC	1200203	2026-05-14 12:30:57.854	-7.6308	-72.67
f2f0935b-fd83-447c-9941-43d05ca5d615	Senador Guiomard	AC	1200450	2026-05-14 12:30:57.857	-10.1533	-67.7367
\.


ALTER TABLE public.cities ENABLE TRIGGER ALL;

--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.groups DISABLE TRIGGER ALL;

COPY public.groups (id, name, state, "createdAt") FROM stdin;
23207d18-e4f1-4756-977d-2c610883c01f	Grupo 1 MA	MA	2026-05-14 12:30:57.778
4329f227-504c-4e5d-a126-5960471470d5	Grupo 2 MA	MA	2026-05-14 12:30:57.789
8e14e422-ab59-46a4-bdf3-f397ca447cab	Grupo 1 PI	PI	2026-05-14 12:30:57.794
cd8eb570-9e71-4722-b5ad-71014de5de98	Grupo 1 AC	AC	2026-05-14 12:30:57.799
\.


ALTER TABLE public.groups ENABLE TRIGGER ALL;

--
-- Data for Name: trucks; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.trucks DISABLE TRIGGER ALL;

COPY public.trucks (id, identifier, "licensePlate", type, "groupId", state, capacity, "roomsCount", status, "modelYear", "lastMaintenanceDate", "nextMaintenanceDate", "photoUrl", "equipmentList", notes, "createdAt", "updatedAt") FROM stdin;
b35dbe07-7bf5-4924-8294-ab49cb2504b1	TRK-002	PIB-5678	MULTICOURSE	8e14e422-ab59-46a4-bdf3-f397ca447cab	PI	35	3	AVAILABLE	2021	\N	\N	\N	Lousa Digital, Ar-condicionado, Internet Satelital	Carreta multicurso do Grupo PI — equipada para módulos simultâneos.	2026-05-14 12:35:04.376	2026-05-14 12:35:04.376
33a28483-ff4a-4893-92d3-c6405f6fb6ae	TRK-HIST-001	MHJ-9876	STANDARD	4329f227-504c-4e5d-a126-5960471470d5	MA	35	1	INACTIVE	2018	\N	\N	\N	\N	Veículo aposentado em jan/2026 por desgaste excessivo.	2026-05-14 12:35:04.38	2026-05-14 12:35:04.38
1a064a1d-879b-4e4c-bbea-db7c12618804	TRK-001	MAA-1234	STANDARD	23207d18-e4f1-4756-977d-2c610883c01f	MA	40	2	IN_USE	2022	2026-04-15 00:00:00	2026-05-28 00:00:00	\N	Projetor, Lousa Digital, Ar-condicionado, Gerador	Carreta principal do Grupo 1 MA — atende região metropolitana de São Luís.	2026-05-14 12:35:04.37	2026-05-14 18:33:53.82
\.


ALTER TABLE public.trucks ENABLE TRIGGER ALL;

--
-- Data for Name: acoes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.acoes DISABLE TRIGGER ALL;

COPY public.acoes (id, nome, "cidadeId", "grupoId", "carretaId", status, "dataInicio", "dataFim", "localExecucao", "distanciaKm", "precoCombustivelL", "autonomiaKmL", observacoes, "permitirInscricoes", "createdAt", "updatedAt", "cidadeNome", "localEndereco", "localReferencia", "localLatitude", "localLongitude", "destinationNeighborhood", "originCidadeId", "originNeighborhood", "routeType") FROM stdin;
dc7809d0-6d20-42a2-baaa-f46c6794f67b	Período Informática Básica — São Luís	f627826b-1705-467d-8e3e-52e1eb5bdaf2	23207d18-e4f1-4756-977d-2c610883c01f	1a064a1d-879b-4e4c-bbea-db7c12618804	EM_ANDAMENTO	2026-04-24 11:00:00	2026-05-24 11:00:00	Unidade móvel São Luís	\N	\N	\N	Período operacional vinculado às turmas do eixo de informática.	t	2026-05-14 12:35:04.62	2026-05-14 12:35:04.62	São Luís	\N	\N	\N	\N	\N	\N	\N	INTERCIDADE
7da01b69-2b08-4e4e-80f2-3e0b4ff5bb38	Período Excel Avançado — Teresina	075bc61d-41b1-4ff6-8ae6-3ab57a2e9e33	8e14e422-ab59-46a4-bdf3-f397ca447cab	b35dbe07-7bf5-4924-8294-ab49cb2504b1	PLANEJADA	2026-05-21 11:00:00	2026-06-10 11:00:00	Unidade móvel Teresina	\N	\N	\N	Período com inscrições em andamento.	t	2026-05-14 12:35:04.623	2026-05-14 12:35:04.623	Teresina	\N	\N	\N	\N	\N	\N	\N	INTERCIDADE
aa0cd53b-aae2-4381-a59d-c8ed22a2fd09	Período Marketing Digital — Imperatriz	5bc1e825-7809-4a02-afff-c939c8b7b9e0	23207d18-e4f1-4756-977d-2c610883c01f	1a064a1d-879b-4e4c-bbea-db7c12618804	PLANEJADA	2026-06-13 11:00:00	2026-07-13 11:00:00	Unidade móvel Imperatriz	\N	\N	\N	Período planejado para próximo ciclo.	t	2026-05-14 12:35:04.627	2026-05-14 12:35:04.627	Imperatriz	\N	\N	\N	\N	\N	\N	\N	INTERCIDADE
\.


ALTER TABLE public.acoes ENABLE TRIGGER ALL;

--
-- Data for Name: acao_custos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.acao_custos DISABLE TRIGGER ALL;

COPY public.acao_custos (id, "acaoId", tipo, descricao, valor, data, litros, "funcionarioId", observacoes, "createdAt") FROM stdin;
\.


ALTER TABLE public.acao_custos ENABLE TRIGGER ALL;

--
-- Data for Name: acao_equipe; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.acao_equipe DISABLE TRIGGER ALL;

COPY public.acao_equipe (id, "acaoId", "userId", funcao, diaria, "diasTrabalhados", "createdAt") FROM stdin;
\.


ALTER TABLE public.acao_equipe ENABLE TRIGGER ALL;

--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.employees DISABLE TRIGGER ALL;

COPY public.employees (id, name, role, department, cpf, phone, email, specialty, "dailyCost", "hireDate", notes, "photoUrl", active, "createdAt", "updatedAt", "contractType", "monthlySalaryCLT", "travelRuleKm", "userId", documents) FROM stdin;
653b7c2c-afb6-4809-96cb-5d0517f84a24	João Batista Ferreira	DRIVER	LOGISTICS	111.222.333-44	(98) 99333-4455	\N	\N	\N	\N	\N	\N	t	2026-05-14 12:35:04.47	2026-05-14 12:35:04.47	CLT	3200.00	200	5d855437-7505-42ff-a8b6-82ea4892b405	\N
378d7cbf-64b6-4c9c-af78-3131f0e9c996	Lúcia Rodrigues Almeida	COORDINATOR	ADMINISTRATION	222.333.444-55	(98) 99444-5566	\N	\N	\N	\N	\N	\N	t	2026-05-14 12:35:04.514	2026-05-14 12:35:04.514	CLT	4200.00	200	9cf80ceb-6ab0-4e30-8713-4150f6b9764f	\N
a9b6ad93-f184-4760-8f72-0e339f92c34d	Maria Silva Pereira	INSTRUCTOR	ACADEMIC	321.654.987-00	(98) 99111-2233	\N	\N	\N	\N	\N	\N	t	2026-05-14 12:35:05.042	2026-05-14 12:35:05.042	PJ	\N	200	21c3d311-9147-48a5-a66b-d263df569c17	\N
34fcdff5-6991-445f-bb43-6f1028ce1fbe	Carlos Souza	DRIVER	LOGISTICS	901.000.001-01	(98) 99001-0001	\N	\N	\N	\N	\N	\N	t	2026-05-14 12:35:05.263	2026-05-14 12:35:05.263	CLT	2800.00	200	8b15a83f-3e6c-41f8-bfcc-6f02c94d4fcc	\N
eb77a340-f0ef-4f46-9f39-c111c09f35f9	Ana Lima	DRIVER	LOGISTICS	901.000.002-02	(86) 99002-0002	\N	\N	\N	\N	\N	\N	t	2026-05-14 12:35:05.286	2026-05-14 12:35:05.286	CLT	2800.00	200	7f651b73-8c01-4734-b2af-25e02638cc17	\N
fecacb24-ea5f-4f1d-891a-26dfe7e5b7d7	Roberto Freitas	DRIVER	LOGISTICS	901.000.003-03	(68) 99003-0003	\N	\N	\N	\N	\N	\N	t	2026-05-14 12:35:05.303	2026-05-14 12:35:05.303	CLT	2800.00	200	cdbfd25f-d651-408c-b3ac-b42d2d6c736a	\N
6b77235e-09c9-4b80-9331-44448859cc31	Marina Costa	DRIVER	LOGISTICS	901.000.004-04	(98) 99004-0004	\N	\N	\N	\N	\N	\N	t	2026-05-14 12:35:05.322	2026-05-14 12:35:05.322	CLT	2800.00	200	baad3183-794d-44b4-a99d-7f794710b818	\N
19ee6bca-c58f-49a8-ae6a-d42da87138bc	Paulo Ramos	DRIVER	LOGISTICS	901.000.005-05	(86) 99005-0005	\N	\N	\N	\N	\N	\N	t	2026-05-14 12:35:05.343	2026-05-14 12:35:05.343	CLT	2800.00	200	86cf840d-a358-425d-b102-7b90ad6f1a5d	\N
6bce37be-b599-4b13-a056-a26b017e07b4	Fábio Nunes	DRIVER	LOGISTICS	901.000.006-06	(68) 99006-0006	\N	\N	\N	\N	\N	\N	t	2026-05-14 12:35:05.359	2026-05-14 12:35:05.359	CLT	2800.00	200	7f7380d4-c9c1-40fb-90fb-516f39fbe5f0	\N
2d4109db-1c4f-4159-b1b4-406d03dce4d3	Léa Santos	DRIVER	LOGISTICS	901.000.007-07	(98) 99007-0007	\N	\N	\N	\N	\N	\N	t	2026-05-14 12:35:05.376	2026-05-14 12:35:05.376	CLT	2800.00	200	d0f246c1-e506-4f2b-a8a3-da26d3e221a8	\N
c8316211-5aa5-443f-9526-1a207a8fd9b4	Diego Alves	DRIVER	LOGISTICS	901.000.008-08	(98) 99008-0008	\N	\N	\N	\N	\N	\N	t	2026-05-14 12:35:05.393	2026-05-14 12:35:05.393	CLT	2800.00	200	fb32b5ce-dbf8-4085-b7cb-e89e624dfb22	\N
aa4cb36f-078f-4be3-abea-2209423936c3	Tânia Melo	DRIVER	LOGISTICS	901.000.009-09	(86) 99009-0009	\N	\N	\N	\N	\N	\N	t	2026-05-14 12:35:05.41	2026-05-14 12:35:05.41	CLT	2800.00	200	c8d457d7-7113-4c56-a826-05201dec5869	\N
93785922-8cb9-4311-ac60-abfdbf8c2d24	Jonas Pires	DRIVER	LOGISTICS	901.000.010-10	(86) 99010-0010	\N	\N	\N	\N	\N	\N	t	2026-05-14 12:35:05.422	2026-05-14 12:35:05.422	CLT	2800.00	200	a61d0671-a776-4800-86c8-d62114aec929	\N
\.


ALTER TABLE public.employees ENABLE TRIGGER ALL;

--
-- Data for Name: acao_funcionarios; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.acao_funcionarios DISABLE TRIGGER ALL;

COPY public.acao_funcionarios (id, "acaoId", "employeeId", "valorDiaria", "diasTrabalhados", "createdAt") FROM stdin;
\.


ALTER TABLE public.acao_funcionarios ENABLE TRIGGER ALL;

--
-- Data for Name: stock_categories; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.stock_categories DISABLE TRIGGER ALL;

COPY public.stock_categories (id, nome, slug, icon, color, description, "isDefault", "defaultEnum", active, "createdBy", "createdAt", "updatedAt") FROM stdin;
15b4e052-a31c-4e57-aa21-586d3af75e63	Material de Estudo	material-de-estudo	🎒	#FF8C42	\N	f	\N	t	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 18:29:17.857	2026-05-14 18:29:17.857
\.


ALTER TABLE public.stock_categories ENABLE TRIGGER ALL;

--
-- Data for Name: stock_items; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.stock_items DISABLE TRIGGER ALL;

COPY public.stock_items (id, nome, "codigoInterno", categoria, "customCategoryId", unidade, "quantidadeAtual", "quantidadeEmTransito", "quantidadeMinima", validade, fornecedor, "precoUnitario", localizacao, "fotoUrl", observacoes, active, "createdAt", "updatedAt") FROM stdin;
7c4c4f1e-361b-48cd-b2ca-a31bace6fea5	Apostila desenvolvimento em IA	344212	OUTRO	15b4e052-a31c-4e57-aa21-586d3af75e63	un	1.000	0.000	10.000	\N	Governo do Piaui	50.00	Prateleira 04	http://localhost:9010/stock-photos/stock-1778783461438-8hnmnz.png	\N	t	2026-05-14 18:31:44.107	2026-05-14 18:33:14.908
\.


ALTER TABLE public.stock_items ENABLE TRIGGER ALL;

--
-- Data for Name: acao_stock_reservations; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.acao_stock_reservations DISABLE TRIGGER ALL;

COPY public.acao_stock_reservations (id, "acaoId", "stockItemId", "truckId", "quantidadePrevista", "quantidadeConsumida", prioridade, observacao, "createdAt", "updatedAt", "createdBy") FROM stdin;
\.


ALTER TABLE public.acao_stock_reservations ENABLE TRIGGER ALL;

--
-- Data for Name: institutions; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.institutions DISABLE TRIGGER ALL;

COPY public.institutions (id, slug, name, "shortName", "logoUrl", "siteUrl", "primaryColor", "signPfxPath", active, "createdAt", "updatedAt") FROM stdin;
00000000-0000-4000-8000-000000000001	upgrade	Upgrade Tecnologia Educacional	UPGRADE	\N	\N	\N	\N	t	2026-05-14 12:35:04.33	2026-05-14 12:35:04.33
\.


ALTER TABLE public.institutions ENABLE TRIGGER ALL;

--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.courses DISABLE TRIGGER ALL;

COPY public.courses (id, name, description, "durationDaysMA", "durationDaysPI", "workloadHours", prerequisites, syllabus, "availableInMA", "availableInPI", "isMulticourse", active, "createdAt", "updatedAt", "institutionId") FROM stdin;
5b16004c-f93b-4a35-8431-d7692b776492	Informática Básica	Fundamentos de informática: Windows, Word, Excel e Internet.	30	30	120	Ensino fundamental completo	Módulo 1: Windows\nMódulo 2: Word\nMódulo 3: Excel\nMódulo 4: Internet	t	t	f	t	2026-05-14 12:35:04.338	2026-05-14 12:35:04.338	00000000-0000-4000-8000-000000000001
d48e28c0-9696-49ce-9176-8e78354935be	Excel Avançado	Fórmulas avançadas, tabelas dinâmicas e macros VBA.	20	20	80	Informática Básica	Módulo 1: Fórmulas\nMódulo 2: Tabelas Dinâmicas\nMódulo 3: Macros	t	t	f	t	2026-05-14 12:35:04.342	2026-05-14 12:35:04.342	00000000-0000-4000-8000-000000000001
2fd3f750-c0d1-485d-a21f-993e81686bd5	Assistente Administrativo	Formação completa para atuação em rotinas administrativas.	45	45	180	Ensino médio completo	Módulo 1: Rotinas\nMódulo 2: Atendimento\nMódulo 3: Documentos\nMódulo 4: Informática	t	t	f	t	2026-05-14 12:35:04.346	2026-05-14 12:35:04.346	00000000-0000-4000-8000-000000000001
ee4212df-a4aa-421b-86ef-1cf5c8651c99	Operador de Caixa	Capacitação para atuar no varejo como operador de caixa.	15	15	60	Ensino fundamental completo	Módulo 1: Atendimento\nMódulo 2: Operação\nMódulo 3: Segurança	t	t	f	t	2026-05-14 12:35:04.35	2026-05-14 12:35:04.35	00000000-0000-4000-8000-000000000001
16d7e281-97f2-4496-94ac-28fad1ff9155	Marketing Digital	Estratégias de marketing em redes sociais e plataformas digitais.	30	30	120	Informática básica	Módulo 1: Fundamentos\nMódulo 2: Redes Sociais\nMódulo 3: Google Ads	t	t	f	t	2026-05-14 12:35:04.353	2026-05-14 12:35:04.353	00000000-0000-4000-8000-000000000001
447f01bf-5cd9-4296-b71d-b3810939925a	Empreendedorismo	Como abrir, planejar e gerenciar o próprio negócio.	25	25	100	Ensino médio completo	Módulo 1: Plano de Negócios\nMódulo 2: Finanças\nMódulo 3: Marketing\nMódulo 4: Gestão	t	t	f	t	2026-05-14 12:35:04.356	2026-05-14 12:35:04.356	00000000-0000-4000-8000-000000000001
\.


ALTER TABLE public.courses ENABLE TRIGGER ALL;

--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.classes DISABLE TRIGGER ALL;

COPY public.classes (id, "courseId", "groupId", "cityId", "classIdentifier", "startDate", "endDate", period, "startTime", "endTime", vacancies, "truckId", status, "enrollmentOpenDate", "enrollmentCloseDate", "createdAt", "updatedAt", "reserveSlots", "locationName", "locationAddress", "locationReference", "locationLatitude", "locationLongitude", "weekendPolicy", "weekendExtraDates", "destinationNeighborhood", "originCityId", "originNeighborhood", "routeType") FROM stdin;
4a737790-9d68-4cc7-a17b-ebeb949dc31c	5b16004c-f93b-4a35-8431-d7692b776492	23207d18-e4f1-4756-977d-2c610883c01f	f627826b-1705-467d-8e3e-52e1eb5bdaf2	INF-SLZ-001	2026-04-24 11:00:00	2026-05-24 11:00:00	MORNING	08:00	12:00	40	1a064a1d-879b-4e4c-bbea-db7c12618804	IN_PROGRESS	\N	\N	2026-05-14 12:35:04.604	2026-05-14 12:35:04.604	4	\N	\N	\N	\N	\N	FOLLOW_SCHEDULE	\N	\N	\N	\N	INTERCIDADE
818c991f-c56f-4bce-bc8a-3891f9a8eabe	d48e28c0-9696-49ce-9176-8e78354935be	8e14e422-ab59-46a4-bdf3-f397ca447cab	075bc61d-41b1-4ff6-8ae6-3ab57a2e9e33	EXC-TER-001	2026-05-21 11:00:00	2026-06-10 11:00:00	AFTERNOON	14:00	18:00	35	b35dbe07-7bf5-4924-8294-ab49cb2504b1	ENROLLMENT_OPEN	\N	\N	2026-05-14 12:35:04.608	2026-05-14 12:35:04.608	4	\N	\N	\N	\N	\N	FOLLOW_SCHEDULE	\N	\N	\N	\N	INTERCIDADE
139a2cba-69de-4ada-ba86-9df5f834be09	2fd3f750-c0d1-485d-a21f-993e81686bd5	23207d18-e4f1-4756-977d-2c610883c01f	f627826b-1705-467d-8e3e-52e1eb5bdaf2	ADM-SLZ-001	2026-03-15 11:00:00	2026-05-09 11:00:00	EVENING	18:30	22:00	30	1a064a1d-879b-4e4c-bbea-db7c12618804	COMPLETED	\N	\N	2026-05-14 12:35:04.612	2026-05-14 12:35:04.612	4	\N	\N	\N	\N	\N	FOLLOW_SCHEDULE	\N	\N	\N	\N	INTERCIDADE
f496a94d-a0ab-4c8e-8806-9d628c2eb104	16d7e281-97f2-4496-94ac-28fad1ff9155	23207d18-e4f1-4756-977d-2c610883c01f	5bc1e825-7809-4a02-afff-c939c8b7b9e0	MKT-IMP-001	2026-06-13 11:00:00	2026-07-13 11:00:00	MORNING	08:00	12:00	40	1a064a1d-879b-4e4c-bbea-db7c12618804	PLANNED	\N	\N	2026-05-14 12:35:04.615	2026-05-14 12:35:04.615	4	\N	\N	\N	\N	\N	FOLLOW_SCHEDULE	\N	\N	\N	\N	INTERCIDADE
\.


ALTER TABLE public.classes ENABLE TRIGGER ALL;

--
-- Data for Name: acao_turmas; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.acao_turmas DISABLE TRIGGER ALL;

COPY public.acao_turmas (id, "acaoId", "turmaId", "createdAt") FROM stdin;
4fd213a3-2316-4da8-b2f1-7923dfffe405	dc7809d0-6d20-42a2-baaa-f46c6794f67b	4a737790-9d68-4cc7-a17b-ebeb949dc31c	2026-05-14 12:35:04.63
7f11e571-50c6-4d9a-b2ec-e4176bf5283c	7da01b69-2b08-4e4e-80f2-3e0b4ff5bb38	818c991f-c56f-4bce-bc8a-3891f9a8eabe	2026-05-14 12:35:04.634
f616aa43-d635-483e-9f7a-e17e33fd6397	dc7809d0-6d20-42a2-baaa-f46c6794f67b	139a2cba-69de-4ada-ba86-9df5f834be09	2026-05-14 12:35:04.637
c542607d-11c6-4fb6-9ca8-1359d854dfad	aa0cd53b-aae2-4381-a59d-c8ed22a2fd09	f496a94d-a0ab-4c8e-8806-9d628c2eb104	2026-05-14 12:35:04.641
\.


ALTER TABLE public.acao_turmas ENABLE TRIGGER ALL;

--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.api_keys DISABLE TRIGGER ALL;

COPY public.api_keys (id, name, key, permissions, active, "createdBy", "createdAt", "lastUsedAt", "expiresAt") FROM stdin;
\.


ALTER TABLE public.api_keys ENABLE TRIGGER ALL;

--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.students DISABLE TRIGGER ALL;

COPY public.students (id, "userId", cpf, "birthDate", gender, "raceColor", "maritalStatus", "motherName", "fatherName", nationality, "birthCity", "birthState", "photoUrl", "createdAt", "updatedAt", active, "socialName", documents) FROM stdin;
b0111155-7955-4014-935e-8ef0c6033ae9	20241a57-0978-4fb4-99ad-0094fb3d18f9	615.648.503-80	2005-04-27 00:00:00	MALE	BROWN	SINGLE	Francisca das Chagas Silva Martins	\N	Brasileiro	São Luís	MA	\N	2026-05-14 12:35:04.557	2026-05-14 12:35:04.557	t	\N	\N
19f40ea7-5935-4f6e-ae14-bc63a7ff9303	929f9cce-92f5-45f7-967f-b2c017136e7b	321.987.654-11	1999-11-15 00:00:00	FEMALE	BLACK	SINGLE	Raimunda de Lima	\N	Brasileira	Teresina	PI	\N	2026-05-14 12:35:04.577	2026-05-14 12:35:04.577	t	\N	\N
9d7d167c-09e5-4aee-b444-868b258edcf1	b7048454-167c-4a7f-a06b-34f8b867b69b	987.654.321-00	2001-06-30 00:00:00	MALE	BROWN	SINGLE	Conceição Maria Santos	\N	Brasileiro	Imperatriz	MA	\N	2026-05-14 12:35:04.591	2026-05-14 12:35:05.006	t	\N	{"photo": "https://placehold.co/1080x1350/png?text=Selfie+Pedro+UPGRADE", "cpfDoc": "https://placehold.co/1400x900/png?text=CPF+Pedro", "identidade": "https://placehold.co/1400x900/png?text=RG+Pedro+UPGRADE", "addressProof": "https://placehold.co/1400x900/png?text=Comprovante+Residencia+Pedro", "educationProof": "https://placehold.co/1400x900/png?text=Comprovante+Escolaridade+Pedro"}
ad56fc40-476c-452a-b0f0-614baa860460	108d37e2-d5a0-4ddf-9f3b-4e486fe7986f	61723835113	2000-03-10 00:00:00	FEMALE	BROWN	SINGLE	Maria Silva	João Silva	Brasileira	São Luís	MA	\N	2026-05-14 17:51:59.097	2026-05-14 17:51:59.097	t	\N	{}
0ac40339-9816-42d1-b3c8-4a51414e0ddb	52784048-b87c-43ab-8bc4-22184ba2395b	57459197860	2000-03-10 00:00:00	FEMALE	BROWN	SINGLE	Maria Silva	João Silva	Brasileira	São Luís	MA	\N	2026-05-14 17:52:01.193	2026-05-14 17:52:01.193	t	\N	{}
\.


ALTER TABLE public.students ENABLE TRIGGER ALL;

--
-- Data for Name: attendances; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.attendances DISABLE TRIGGER ALL;

COPY public.attendances (id, "classId", "studentId", date, present, justified, justification, "registeredBy", "registeredAt", "updatedAt", "classNotes", "classPhotoUrl") FROM stdin;
664a7a50-230a-4a4a-a2ca-c023ced78403	4a737790-9d68-4cc7-a17b-ebeb949dc31c	b0111155-7955-4014-935e-8ef0c6033ae9	2026-04-24 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.667	2026-05-14 12:35:04.667	\N	\N
0b284aca-9b2e-42b4-b46f-9135e7dc3c92	4a737790-9d68-4cc7-a17b-ebeb949dc31c	b0111155-7955-4014-935e-8ef0c6033ae9	2026-04-27 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.674	2026-05-14 12:35:04.674	\N	\N
b4cda96f-146e-4d57-a4bb-f2b38789b0d2	4a737790-9d68-4cc7-a17b-ebeb949dc31c	b0111155-7955-4014-935e-8ef0c6033ae9	2026-04-28 11:00:00	f	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.678	2026-05-14 12:35:04.678	\N	\N
a76a50c2-61c8-4378-8159-2af436286590	4a737790-9d68-4cc7-a17b-ebeb949dc31c	b0111155-7955-4014-935e-8ef0c6033ae9	2026-04-29 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.684	2026-05-14 12:35:04.684	\N	\N
cf17acd9-cfe6-4a83-a5fa-4565b8ced81e	4a737790-9d68-4cc7-a17b-ebeb949dc31c	b0111155-7955-4014-935e-8ef0c6033ae9	2026-04-30 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.689	2026-05-14 12:35:04.689	\N	\N
1b3cbcb0-ca25-4926-a844-030aabaaefff	4a737790-9d68-4cc7-a17b-ebeb949dc31c	b0111155-7955-4014-935e-8ef0c6033ae9	2026-05-01 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.694	2026-05-14 12:35:04.694	\N	\N
07afefea-dfed-4c36-8448-d1bbfb620a4b	4a737790-9d68-4cc7-a17b-ebeb949dc31c	b0111155-7955-4014-935e-8ef0c6033ae9	2026-05-04 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.697	2026-05-14 12:35:04.697	\N	\N
75390280-bd09-4c1d-8869-e8645682fab2	4a737790-9d68-4cc7-a17b-ebeb949dc31c	b0111155-7955-4014-935e-8ef0c6033ae9	2026-05-05 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.702	2026-05-14 12:35:04.702	\N	\N
dd8ad012-e4e2-4cd4-bbe7-246102b3ac06	4a737790-9d68-4cc7-a17b-ebeb949dc31c	b0111155-7955-4014-935e-8ef0c6033ae9	2026-05-06 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.706	2026-05-14 12:35:04.706	\N	\N
6ccdc635-d55d-4f4f-a3ff-b4df6d598cc3	4a737790-9d68-4cc7-a17b-ebeb949dc31c	b0111155-7955-4014-935e-8ef0c6033ae9	2026-05-07 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.71	2026-05-14 12:35:04.71	\N	\N
4becd8e8-d760-4035-aafd-74856a74f0e7	4a737790-9d68-4cc7-a17b-ebeb949dc31c	b0111155-7955-4014-935e-8ef0c6033ae9	2026-05-08 11:00:00	f	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.713	2026-05-14 12:35:04.713	\N	\N
99602f18-b3f9-4f69-aea8-ec6c42da3d90	4a737790-9d68-4cc7-a17b-ebeb949dc31c	b0111155-7955-4014-935e-8ef0c6033ae9	2026-05-11 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.718	2026-05-14 12:35:04.718	\N	\N
d22f8d08-444d-413e-b5fd-18be95376c8c	4a737790-9d68-4cc7-a17b-ebeb949dc31c	b0111155-7955-4014-935e-8ef0c6033ae9	2026-05-12 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.724	2026-05-14 12:35:04.724	\N	\N
65c95849-b49b-429c-9c7a-6a96f0e7e030	4a737790-9d68-4cc7-a17b-ebeb949dc31c	b0111155-7955-4014-935e-8ef0c6033ae9	2026-05-13 11:00:00	f	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.729	2026-05-14 12:35:04.729	\N	\N
9d33bb6a-8a90-49c4-99ae-fd2088dcd123	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-22 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.76	2026-05-14 12:35:04.76	\N	\N
b6abf193-a8b4-40c2-84bf-03e5d2f061cb	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-23 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.764	2026-05-14 12:35:04.764	\N	\N
1ef7f3a5-e168-4bcd-bd11-a061aca7d68f	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-24 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.768	2026-05-14 12:35:04.768	\N	\N
cf2718d9-1fe7-45f4-8d4d-aec6bc274a4c	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-27 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.772	2026-05-14 12:35:04.772	\N	\N
6f558aa0-a72c-4dd4-b8e4-b11d6a7ad1f4	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-28 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.776	2026-05-14 12:35:04.776	\N	\N
79690157-de6d-4993-9422-39ce6798afae	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-29 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.78	2026-05-14 12:35:04.78	\N	\N
b459effb-b26b-4372-84bd-940ebfc83557	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-30 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.784	2026-05-14 12:35:04.784	\N	\N
5efb2f60-629e-440c-b818-8ebb021ffd66	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-05-01 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.788	2026-05-14 12:35:04.788	\N	\N
2bccf873-beb3-4eee-bdc4-d54d2904eb18	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-05-04 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.792	2026-05-14 12:35:04.792	\N	\N
0c09e012-9173-431e-a8fc-292d5445d2da	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-05-05 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.797	2026-05-14 12:35:04.797	\N	\N
8e58ce6b-3f64-4d35-9e22-f7f2d2da6b53	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-05-06 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.8	2026-05-14 12:35:04.8	\N	\N
2a058fd0-3f15-4e4f-834d-4520c0c586d7	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-05-07 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.805	2026-05-14 12:35:04.805	\N	\N
1225ac90-8ac4-483a-acfc-138912e5621a	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-05-08 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.808	2026-05-14 12:35:04.808	\N	\N
8388553f-2919-4744-adfa-5f9b0a27782f	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-05-11 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.813	2026-05-14 12:35:04.813	\N	\N
5fd86f13-0707-4990-818f-683f9950ec8f	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-05-12 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.816	2026-05-14 12:35:04.816	\N	\N
1c42184e-c089-45f2-a35b-0497ad05b4fa	4a737790-9d68-4cc7-a17b-ebeb949dc31c	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-05-13 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.821	2026-05-14 12:35:04.821	\N	\N
d36e5f9a-27fb-421a-ab89-755a95ff5808	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-03-16 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.825	2026-05-14 12:35:04.825	\N	\N
80c4bf90-ac4c-4a74-a94a-cffa9a6adb15	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-03-17 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.829	2026-05-14 12:35:04.829	\N	\N
ada33cf7-f58f-4256-8b21-53f139ace4a1	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-03-18 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.833	2026-05-14 12:35:04.833	\N	\N
7bb2c8f3-a1a5-4230-a724-b98775878f2c	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-03-19 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.838	2026-05-14 12:35:04.838	\N	\N
84efff44-d3b6-4fdd-894a-143daeeb42e9	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-03-20 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.842	2026-05-14 12:35:04.842	\N	\N
9a28f8d5-bbc3-4fce-9e61-b77513748368	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-03-23 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.848	2026-05-14 12:35:04.848	\N	\N
ba3e3c33-23e6-4665-98fa-39f547e86e12	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-03-24 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.852	2026-05-14 12:35:04.852	\N	\N
aabccb6c-e736-40b8-9337-4cf54eed4ab7	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-03-25 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.857	2026-05-14 12:35:04.857	\N	\N
00f71713-cc0b-4ed3-86f2-8f05b62585e7	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-03-26 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.861	2026-05-14 12:35:04.861	\N	\N
89c0f4a9-a166-4ceb-8792-87897cc2468f	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-03-27 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.865	2026-05-14 12:35:04.865	\N	\N
fd591e6f-809f-4d06-94f2-9991cf1de2af	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-03-30 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.87	2026-05-14 12:35:04.87	\N	\N
97ca6476-17d1-4b34-a879-0f93ae3b9c68	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-03-31 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.874	2026-05-14 12:35:04.874	\N	\N
39d112ae-abf5-4913-aab5-644975b525f7	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-01 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.878	2026-05-14 12:35:04.878	\N	\N
10bbbe6d-9eca-4f56-9ca3-f4337e6d7864	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-02 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.883	2026-05-14 12:35:04.883	\N	\N
7e53c7ad-2779-428f-88b9-1debc931eb0c	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-03 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.887	2026-05-14 12:35:04.887	\N	\N
29742ea6-cbec-4266-ad2e-5a57d33bf999	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-06 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.894	2026-05-14 12:35:04.894	\N	\N
158e7398-c1ee-4ce4-8305-19ff5e75b9e2	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-07 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.898	2026-05-14 12:35:04.898	\N	\N
6dbdc2ba-a8d6-4f99-bed7-b7c9c25da084	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-08 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.902	2026-05-14 12:35:04.902	\N	\N
fe64bc9f-8a73-4221-a39b-49993d5008c5	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-09 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.906	2026-05-14 12:35:04.906	\N	\N
45e71b05-3218-4e46-b9df-bfab5542b475	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-10 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.911	2026-05-14 12:35:04.911	\N	\N
fe26534f-207f-4ce3-8612-6189d65287dc	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-13 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.915	2026-05-14 12:35:04.915	\N	\N
4e6ca33f-fda9-4afb-8cf7-7c37febdc3ef	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-14 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.919	2026-05-14 12:35:04.919	\N	\N
5fce4938-7212-4866-981b-da3cb6322034	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-15 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.923	2026-05-14 12:35:04.923	\N	\N
7bcd28a2-2b4d-4d27-a8da-a2d12a890376	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-16 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.927	2026-05-14 12:35:04.927	\N	\N
a757eefb-fe7a-4fe8-b885-0cc3bcd7299d	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-17 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.931	2026-05-14 12:35:04.931	\N	\N
9b6da51b-4b24-4204-b615-7f50a877cf58	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-20 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.935	2026-05-14 12:35:04.935	\N	\N
c2775b9b-c8a0-4449-9dbd-429f6890bfac	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-21 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.939	2026-05-14 12:35:04.939	\N	\N
9567366f-742a-413c-9399-1506dcea5749	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-22 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.943	2026-05-14 12:35:04.943	\N	\N
1fb634c1-8960-42ac-bbcb-f9e982c66688	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-23 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.949	2026-05-14 12:35:04.949	\N	\N
f4589fc8-5db5-4424-bf6d-018cb398ae58	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-24 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.955	2026-05-14 12:35:04.955	\N	\N
d28fa80d-0d50-47e5-84fd-b8efa6ca102c	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-27 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.96	2026-05-14 12:35:04.96	\N	\N
0a431d24-111d-4869-91fd-0b81abbca136	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-28 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.964	2026-05-14 12:35:04.964	\N	\N
11beca99-4d07-4aaa-9293-334774a14be6	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-29 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.969	2026-05-14 12:35:04.969	\N	\N
f15825bd-fe7d-4b7d-9c86-3b87e2a74684	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-04-30 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.974	2026-05-14 12:35:04.974	\N	\N
31507bfa-529f-4b6e-9f13-8ea6cb34c8f4	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-05-01 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.979	2026-05-14 12:35:04.979	\N	\N
5b7f8f4a-ab79-4acc-a2dc-dfd918279b3e	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-05-04 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.984	2026-05-14 12:35:04.984	\N	\N
3c1578fc-ad29-4be2-a634-7e3d292223e4	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-05-05 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.988	2026-05-14 12:35:04.988	\N	\N
527e5979-a2af-44eb-8920-05ab16a93613	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-05-06 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.992	2026-05-14 12:35:04.992	\N	\N
50366d82-8003-48a7-aa99-c72cc8b5d8cd	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-05-07 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.997	2026-05-14 12:35:04.997	\N	\N
75bc2ea5-60d5-4090-a42d-f74916d6f735	139a2cba-69de-4ada-ba86-9df5f834be09	9d7d167c-09e5-4aee-b444-868b258edcf1	2026-05-08 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:05.002	2026-05-14 12:35:05.002	\N	\N
\.


ALTER TABLE public.attendances ENABLE TRIGGER ALL;

--
-- Data for Name: attendance_justifications; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.attendance_justifications DISABLE TRIGGER ALL;

COPY public.attendance_justifications (id, "attendanceId", reason, details, "proofUrl", "submittedAt", status, "reviewedBy", "reviewedAt", "reviewNotes") FROM stdin;
\.


ALTER TABLE public.attendance_justifications ENABLE TRIGGER ALL;

--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs DISABLE TRIGGER ALL;

COPY public.audit_logs (id, "userId", action, "tableName", "recordId", "oldData", "newData", "ipAddress", "userAgent", "createdAt") FROM stdin;
9ceabe49-c0a2-499f-88f3-de92cd11f349	5a1cca76-527b-4d85-baf2-8a0129353b45	ENROLLMENT_APPROVED	enrollments	\N	\N	{"course": "Informática Básica", "status": "ENROLLED", "student": "Davi Rhuan da Silva Martins"}	\N	\N	2026-05-14 11:00:00
db6e9fff-a14c-4be4-8bf2-0a53f4e06916	5a1cca76-527b-4d85-baf2-8a0129353b45	CERTIFICATE_ISSUED	certificates	\N	\N	{"course": "Assistente Administrativo", "student": "Davi Rhuan da Silva Martins"}	\N	\N	2026-05-13 11:00:00
6478cb57-102f-4509-b69d-9a6c58ae8d05	5a1cca76-527b-4d85-baf2-8a0129353b45	CLASS_CREATED	classes	\N	\N	{"city": "Imperatriz", "course": "Marketing Digital", "identifier": "MKT-IMP-001"}	\N	\N	2026-05-12 11:00:00
feca5190-a518-498f-8fe9-06af82072e57	5a1cca76-527b-4d85-baf2-8a0129353b45	ENROLLMENT_RECEIVED	enrollments	\N	\N	{"course": "Informática Básica", "student": "Pedro Henrique Santos Oliveira"}	\N	\N	2026-05-11 11:00:00
8dd3985a-ac4b-4058-be1e-6d136e11ee3a	5a1cca76-527b-4d85-baf2-8a0129353b45	ABSENCE_REGISTERED	absences	\N	\N	{"type": "EMERGENCY", "status": "PENDING", "employee": "Maria Silva Pereira"}	\N	\N	2026-05-10 11:00:00
a246f1db-2112-4681-9163-586b58fe4cd5	5a1cca76-527b-4d85-baf2-8a0129353b45	APPROVE_ENROLLMENT	enrollments	af39d775-b737-4bb5-8398-e2b3013a5713	\N	\N	\N	\N	2026-05-14 17:52:03.273
c8824dea-1701-45e5-b94c-48a830ed7342	5a1cca76-527b-4d85-baf2-8a0129353b45	REJECT_ENROLLMENT	enrollments	2d48c035-818d-462a-b157-359099e0f3f0	\N	{"reason": "Vagas esgotadas nesta turma — teste de email de rejeição"}	\N	\N	2026-05-14 17:52:05.321
e6189734-8646-46b7-a125-769fb49cdb45	5a1cca76-527b-4d85-baf2-8a0129353b45	STOCK_CATEGORY_CREATE	stock_categories	15b4e052-a31c-4e57-aa21-586d3af75e63	\N	{"icon": "🎒", "nome": "Material de Estudo", "slug": "material-de-estudo", "color": "#FF8C42"}	\N	\N	2026-05-14 18:29:17.87
10091515-4d86-4dbe-be46-45b14f371037	5a1cca76-527b-4d85-baf2-8a0129353b45	STOCK_ITEM_CREATE	stock_items	7c4c4f1e-361b-48cd-b2ca-a31bace6fea5	\N	{"id": "7c4c4f1e-361b-48cd-b2ca-a31bace6fea5", "nome": "Apostila desenvolvimento em IA", "active": true, "fotoUrl": "http://localhost:9010/stock-photos/stock-1778783461438-8hnmnz.png", "unidade": "un", "validade": null, "categoria": "OUTRO", "fornecedor": "Governo do Piaui", "localizacao": "Prateleira 04", "observacoes": null, "codigoInterno": "344212", "precoUnitario": "50", "quantidadeAtual": "0", "quantidadeMinima": "10"}	\N	\N	2026-05-14 18:31:44.122
5f8d1c98-3ee0-457c-87b6-32731b9e1e48	5a1cca76-527b-4d85-baf2-8a0129353b45	STOCK_PURCHASE_REQUEST_CREATE	stock_purchase_requests	099c715d-5775-4c9d-9462-6cc559f3b1a4	\N	{"id": "099c715d-5775-4c9d-9462-6cc559f3b1a4", "status": "PENDENTE", "unidade": "un", "urgente": true, "fornecedor": "Governo do Piaui", "quantidade": "10", "valorTotal": "500", "requestedBy": "5a1cca76-527b-4d85-baf2-8a0129353b45", "stockItemId": "7c4c4f1e-361b-48cd-b2ca-a31bace6fea5", "justificativa": "Apostila de Ensino para proximas aulas", "precoUnitario": "50", "requesterName": "Administrador Upgrade", "requesterRole": "ADMIN", "stockItemNome": "Apostila desenvolvimento em IA", "originatedFromItemCreation": true}	\N	\N	2026-05-14 18:31:44.124
fd8feeda-874f-4dc4-adc5-0382022416c8	5a1cca76-527b-4d85-baf2-8a0129353b45	STOCK_PURCHASE_REQUEST_APPROVE	stock_purchase_requests	099c715d-5775-4c9d-9462-6cc559f3b1a4	{"status": "PENDENTE"}	{"id": "099c715d-5775-4c9d-9462-6cc559f3b1a4", "status": "APROVADA", "fornecedor": "Governo do Piaui", "movementId": "efea81f9-ba91-4e8c-95f9-2026504ce281", "quantidade": "10", "reviewNote": null, "reviewedBy": "5a1cca76-527b-4d85-baf2-8a0129353b45", "valorTotal": "500", "stockItemId": "7c4c4f1e-361b-48cd-b2ca-a31bace6fea5", "contaPagarId": "b8b916d3-c003-4f58-9410-9f428eb917d3", "reviewerName": "Administrador Upgrade", "justificativa": "Apostila de Ensino para proximas aulas", "requesterName": "Administrador Upgrade", "stockItemNome": "Apostila desenvolvimento em IA", "enviadoParaEmTransito": true}	\N	\N	2026-05-14 18:32:24.313
b46ff52e-5747-4788-a344-5f1dd9950f8f	5a1cca76-527b-4d85-baf2-8a0129353b45	STOCK_PURCHASE_REQUEST_RECEIVE	stock_purchase_requests	099c715d-5775-4c9d-9462-6cc559f3b1a4	{"status": "APROVADA"}	{"id": "099c715d-5775-4c9d-9462-6cc559f3b1a4", "status": "RECEBIDA", "trigger": "PAYMENT", "quantidade": "10", "stockItemId": "7c4c4f1e-361b-48cd-b2ca-a31bace6fea5", "triggeredBy": "5a1cca76-527b-4d85-baf2-8a0129353b45", "contaPagarId": "b8b916d3-c003-4f58-9410-9f428eb917d3", "stockItemNome": "Apostila desenvolvimento em IA", "contaPagarStatus": "paga", "reposicaoMovementId": "d0855cb5-8a87-4528-b0cc-d55897a9df15"}	\N	\N	2026-05-14 18:32:33.669
90ee2898-f66f-458c-8536-5e4749f82c7c	5a1cca76-527b-4d85-baf2-8a0129353b45	STOCK_MOVEMENT_ENTRADA	stock_movements	f591be78-66d4-462e-ac0a-c0e19163c86b	\N	{"id": "f591be78-66d4-462e-ac0a-c0e19163c86b", "type": "ENTRADA", "acaoId": null, "unidade": "un", "acaoNome": null, "toTruckId": "1a064a1d-879b-4e4c-bbea-db7c12618804", "observacao": null, "quantidade": "5", "fromTruckId": null, "stockItemId": "7c4c4f1e-361b-48cd-b2ca-a31bace6fea5", "registeredBy": "5a1cca76-527b-4d85-baf2-8a0129353b45", "stockItemNome": "Apostila desenvolvimento em IA", "registeredByName": "Administrador Upgrade", "registeredByRole": "ADMIN", "toTruckIdentifier": "TRK-001", "fromTruckIdentifier": null}	\N	\N	2026-05-14 18:33:06.742
da4fa004-d48f-498d-9c3a-46fb0e4fe6f6	5a1cca76-527b-4d85-baf2-8a0129353b45	STOCK_MOVEMENT_ENTRADA	stock_movements	6163fe99-84cc-4119-a846-ee0552ad2f93	\N	{"id": "6163fe99-84cc-4119-a846-ee0552ad2f93", "type": "ENTRADA", "acaoId": null, "unidade": "un", "acaoNome": null, "toTruckId": "b35dbe07-7bf5-4924-8294-ab49cb2504b1", "observacao": null, "quantidade": "4", "fromTruckId": null, "stockItemId": "7c4c4f1e-361b-48cd-b2ca-a31bace6fea5", "registeredBy": "5a1cca76-527b-4d85-baf2-8a0129353b45", "stockItemNome": "Apostila desenvolvimento em IA", "registeredByName": "Administrador Upgrade", "registeredByRole": "ADMIN", "toTruckIdentifier": "TRK-002", "fromTruckIdentifier": null}	\N	\N	2026-05-14 18:33:14.92
\.


ALTER TABLE public.audit_logs ENABLE TRIGGER ALL;

--
-- Data for Name: certificate_templates; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.certificate_templates DISABLE TRIGGER ALL;

COPY public.certificate_templates (id, key, scope, "courseId", state, "isActive", "createdAt", "updatedAt", "currentVersionId") FROM stdin;
50956086-6297-479f-a3c2-24b2857accb6	STATE:ANY:MA	STATE	\N	MA	t	2026-05-14 12:35:05.092	2026-05-14 12:35:05.106	fd1308aa-8f20-47f4-a8b9-f30ba2682d7f
19a28aa7-b007-424a-ad51-63fd45279079	STATE:ANY:PI	STATE	\N	PI	t	2026-05-14 12:35:05.113	2026-05-14 12:35:05.121	abcaa32c-4984-4477-b44f-14bb82c591e5
146e9cd4-3391-4d1c-a36d-af0ef5bd93e1	COURSE_STATE:5b16004c-f93b-4a35-8431-d7692b776492:MA	COURSE_STATE	5b16004c-f93b-4a35-8431-d7692b776492	MA	t	2026-05-14 12:35:05.141	2026-05-14 12:35:05.151	74125c76-77d9-45d8-a48e-82616981bd9e
0f0cb17e-9b67-4bba-9d6b-7e728503eaab	COURSE_STATE:d48e28c0-9696-49ce-9176-8e78354935be:PI	COURSE_STATE	d48e28c0-9696-49ce-9176-8e78354935be	PI	t	2026-05-14 12:35:05.157	2026-05-14 12:35:05.165	2e78da85-060c-44df-acd8-5b9fa00579f5
d803be73-6ad0-446d-b5f3-766bc9a42b6f	COURSE_STATE:2fd3f750-c0d1-485d-a21f-993e81686bd5:MA	COURSE_STATE	2fd3f750-c0d1-485d-a21f-993e81686bd5	MA	t	2026-05-14 12:35:05.171	2026-05-14 12:35:05.179	7a5e30e3-9577-40da-9aaa-a9d9086ed6ea
\.


ALTER TABLE public.certificate_templates ENABLE TRIGGER ALL;

--
-- Data for Name: certificate_template_versions; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.certificate_template_versions DISABLE TRIGGER ALL;

COPY public.certificate_template_versions (id, "templateId", version, title, "templateType", "htmlContent", "cssContent", "pdfPath", placeholders, notes, status, "createdById", "approvedById", "approvedAt", "publishedAt", "createdAt", "updatedAt", "pdfTextOverrides", "coordinateOverrides") FROM stdin;
fd1308aa-8f20-47f4-a8b9-f30ba2682d7f	50956086-6297-479f-a3c2-24b2857accb6	1	Molde Mestre — Maranhão	PDF_BASE	\N	\N	C:\\Users\\Administrador\\Desktop\\Sistema_upgrade-main-atual\\Sistema_upgrade-main\\public\\certificados\\maranhao\\fundo-limpo.png	["ALUNO_NOME", "CURSO_NOME", "CARGA_HORARIA", "CIDADE", "ESTADO", "DATA_EMISSAO", "CODIGO_VERIFICACAO", "QR_CODE_DATA_URL", "TURMA", "EMISSOR"]	Molde mestre para o estado MA. Aplica-se automaticamente a todos os cursos da UF sem template específico.	PUBLISHED	5a1cca76-527b-4d85-baf2-8a0129353b45	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:05.109	2026-05-14 12:35:05.109	2026-05-14 12:35:05.098	2026-05-14 12:35:05.11	{"signatureMode": "AUTO", "useBodyWhiteMask": false, "usePage2TitleWhiteMask": false, "drawHeaderNameAndDetails": false}	{"qrX": 740, "qrY": 28, "nameX": 420, "nameY": 255, "line1Y": 328, "line2Y": 298, "line3Y": 268, "qrSize": 64, "detailsY": 212, "nameSize": 24, "paragraphH": 165, "paragraphW": 700, "paragraphX": 95, "paragraphY": 220, "detailsSize": 11, "bodyTextSize": 17, "p2CourseBoxH": 44, "p2CourseBoxW": 350, "p2CourseBoxX": 255, "p2CourseBoxY": 575, "p2CourseTextSize": 15}
abcaa32c-4984-4477-b44f-14bb82c591e5	19a28aa7-b007-424a-ad51-63fd45279079	1	Molde Mestre — Piauí	PDF_BASE	\N	\N	C:\\Users\\Administrador\\Desktop\\Sistema_upgrade-main-atual\\Sistema_upgrade-main\\public\\certificados\\piaui\\fundo-limpo.png	["ALUNO_NOME", "CURSO_NOME", "CARGA_HORARIA", "CIDADE", "ESTADO", "DATA_EMISSAO", "CODIGO_VERIFICACAO", "QR_CODE_DATA_URL", "TURMA", "EMISSOR"]	Molde mestre para o estado PI. Aplica-se automaticamente a todos os cursos da UF sem template específico.	PUBLISHED	5a1cca76-527b-4d85-baf2-8a0129353b45	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:05.124	2026-05-14 12:35:05.124	2026-05-14 12:35:05.117	2026-05-14 12:35:05.124	{"signatureMode": "AUTO", "useBodyWhiteMask": false, "usePage2TitleWhiteMask": false, "drawHeaderNameAndDetails": false}	{"qrX": 740, "qrY": 28, "nameX": 420, "nameY": 255, "line1Y": 328, "line2Y": 298, "line3Y": 268, "qrSize": 64, "detailsY": 212, "nameSize": 24, "paragraphH": 165, "paragraphW": 700, "paragraphX": 95, "paragraphY": 220, "detailsSize": 11, "bodyTextSize": 17, "p2CourseBoxH": 44, "p2CourseBoxW": 350, "p2CourseBoxX": 255, "p2CourseBoxY": 575, "p2CourseTextSize": 15}
74125c76-77d9-45d8-a48e-82616981bd9e	146e9cd4-3391-4d1c-a36d-af0ef5bd93e1	1	Certificado — Informática Básica (MA) — Profª Maria Silva Pereira	PDF_BASE	\N	\N	C:\\Users\\Administrador\\Desktop\\Sistema_upgrade-main-atual\\Sistema_upgrade-main\\public\\certificados\\maranhao\\fundo-limpo.png	["ALUNO_NOME", "CURSO_NOME", "CARGA_HORARIA", "CIDADE", "ESTADO", "DATA_EMISSAO", "CODIGO_VERIFICACAO", "QR_CODE_DATA_URL", "TURMA", "EMISSOR"]	Modelo específico Informática Básica — MA (turma INF-SLZ-001). Docente de referência no texto: Maria Silva Pereira. Dados do curso no seed: 120h, pré-requisito ensino fundamental completo, ementa em 4 módulos.	PUBLISHED	5a1cca76-527b-4d85-baf2-8a0129353b45	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:05.153	2026-05-14 12:35:05.153	2026-05-14 12:35:05.145	2026-05-14 12:35:05.154	{"dateTemplate": "{{CIDADE}} - {{UF}}, {{DATA_EXTENSO}}.", "signatureMode": "AUTO", "useBodyWhiteMask": false, "paragraphTemplate": "Certificamos que {{ALUNO_NOME}} concluiu com aproveitamento o curso {{CURSO}}, na modalidade presencial, com carga horária de {{CARGA_HORARIA}} horas/aula, sob orientação da professora **Maria Silva Pereira**, abrangendo fundamentos de informática em ambiente Windows, editor de texto, planilhas e uso da Internet, conforme programa institucional para formação profissional. Pré-requisitos de ingresso: ensino fundamental completo.", "syllabusDescContent": "Ambiente gráfico, pastas e ficheiros.\\n§§§\\nDocumentos profissionais.\\n§§§\\nPlanilhas e funções básicas.\\n§§§\\nNavegação e boas práticas.", "syllabusTitleContent": "Windows e sistema\\n§§§\\nMódulo Word\\n§§§\\nMódulo Excel\\n§§§\\nInternet e segurança", "page2WorkloadTemplate": "{{CARGA_HORARIA}}H — PROGRAMA: Windows e organização de ficheiros; Word; Excel; Internet e segurança.", "usePage2TitleWhiteMask": false, "syllabusWorkloadContent": "30h\\n§§§\\n30h\\n§§§\\n30h\\n§§§\\n30h", "drawHeaderNameAndDetails": false}	{"qrX": 740, "qrY": 28, "nameX": 420, "nameY": 255, "line1Y": 328, "line2Y": 298, "line3Y": 268, "qrSize": 64, "detailsY": 212, "nameSize": 24, "paragraphH": 165, "paragraphW": 700, "paragraphX": 95, "paragraphY": 220, "detailsSize": 11, "bodyTextSize": 17, "p2CourseBoxH": 44, "p2CourseBoxW": 350, "p2CourseBoxX": 255, "p2CourseBoxY": 575, "p2CourseTextSize": 15}
2e78da85-060c-44df-acd8-5b9fa00579f5	0f0cb17e-9b67-4bba-9d6b-7e728503eaab	1	Certificado — Excel Avançado (PI)	PDF_BASE	\N	\N	C:\\Users\\Administrador\\Desktop\\Sistema_upgrade-main-atual\\Sistema_upgrade-main\\public\\certificados\\piaui\\fundo-limpo.png	[]	Modelo Excel Avançado — UF PI (ex.: turma EXC-TER-001 em Teresina).	PUBLISHED	5a1cca76-527b-4d85-baf2-8a0129353b45	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:05.167	2026-05-14 12:35:05.167	2026-05-14 12:35:05.16	2026-05-14 12:35:05.168	{"dateTemplate": "{{CIDADE}} - {{UF}}, {{DATA_EXTENSO}}.", "signatureMode": "AUTO", "useBodyWhiteMask": false, "paragraphTemplate": "Certificamos que {{ALUNO_NOME}} concluiu o curso {{CURSO}}, com {{CARGA_HORARIA}} horas/aula, em formação profissional em planilhas eletrónicas avançadas (fórmulas complexas, tabelas dinâmicas e introdução a macros VBA), em conformidade com o programa pedagógico institucional.", "page2WorkloadTemplate": "{{CARGA_HORARIA}}H — Módulos: Fórmulas avançadas | Tabelas dinâmicas | Macros VBA.", "usePage2TitleWhiteMask": false, "drawHeaderNameAndDetails": false}	{"qrX": 740, "qrY": 28, "nameX": 420, "nameY": 255, "line1Y": 328, "line2Y": 298, "line3Y": 268, "qrSize": 64, "detailsY": 212, "nameSize": 24, "paragraphH": 165, "paragraphW": 700, "paragraphX": 95, "paragraphY": 220, "detailsSize": 11, "bodyTextSize": 17, "p2CourseBoxH": 44, "p2CourseBoxW": 350, "p2CourseBoxX": 255, "p2CourseBoxY": 575, "p2CourseTextSize": 15}
7a5e30e3-9577-40da-9aaa-a9d9086ed6ea	d803be73-6ad0-446d-b5f3-766bc9a42b6f	1	Certificado — Assistente Administrativo (MA)	PDF_BASE	\N	\N	C:\\Users\\Administrador\\Desktop\\Sistema_upgrade-main-atual\\Sistema_upgrade-main\\public\\certificados\\maranhao\\fundo-limpo.png	[]	Modelo Assistente Administrativo — MA (turma ADM-SLZ-001).	PUBLISHED	5a1cca76-527b-4d85-baf2-8a0129353b45	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:05.181	2026-05-14 12:35:05.181	2026-05-14 12:35:05.174	2026-05-14 12:35:05.181	{"dateTemplate": "{{CIDADE}} - {{UF}}, {{DATA_EXTENSO}}.", "signatureMode": "AUTO", "useBodyWhiteMask": false, "paragraphTemplate": "Certificamos que {{ALUNO_NOME}} concluiu o curso {{CURSO}}, com {{CARGA_HORARIA}} horas/aula, em rotinas administrativas, atendimento, documentação e apoio à gestão, segundo programa aprovado pela instituição.", "syllabusDescContent": "Organização de escritório e arquivos.\\n§§§\\nRelacionamento com público.\\n§§§\\nBoas práticas documentais.\\n§§§\\nFerramentas digitais.", "syllabusTitleContent": "Rotinas administrativas\\n§§§\\nAtendimento\\n§§§\\nDocumentos\\n§§§\\nInformática aplicada", "page2WorkloadTemplate": "{{CARGA_HORARIA}}H — PROGRAMA: Rotinas administrativas | Atendimento | Documentos | Informática aplicada.", "usePage2TitleWhiteMask": false, "syllabusWorkloadContent": "45h\\n§§§\\n45h\\n§§§\\n45h\\n§§§\\n45h", "drawHeaderNameAndDetails": false}	{"qrX": 740, "qrY": 28, "nameX": 420, "nameY": 255, "line1Y": 328, "line2Y": 298, "line3Y": 268, "qrSize": 64, "detailsY": 212, "nameSize": 24, "paragraphH": 165, "paragraphW": 700, "paragraphX": 95, "paragraphY": 220, "detailsSize": 11, "bodyTextSize": 17, "p2CourseBoxH": 44, "p2CourseBoxW": 350, "p2CourseBoxX": 255, "p2CourseBoxY": 575, "p2CourseTextSize": 15}
\.


ALTER TABLE public.certificate_template_versions ENABLE TRIGGER ALL;

--
-- Data for Name: certificates; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.certificates DISABLE TRIGGER ALL;

COPY public.certificates (id, "studentId", "classId", "verificationCode", "qrCodeUrl", "fileUrl", "issuedAt", "issuedBy", status, "cancellationReason", "cancelledAt", "cancelledBy", "templateVersionId") FROM stdin;
31759671-680a-4a38-9da8-2543e7512c78	b0111155-7955-4014-935e-8ef0c6033ae9	139a2cba-69de-4ada-ba86-9df5f834be09	CERT-DAVI-MP5H140X	/qrcodes/placeholder-qr.png	/certificates/placeholder-cert.pdf	2026-05-10 11:00:00	5a1cca76-527b-4d85-baf2-8a0129353b45	ACTIVE	\N	\N	\N	\N
de79f373-3a93-4f7b-ba63-ef3cdcf3184a	9d7d167c-09e5-4aee-b444-868b258edcf1	4a737790-9d68-4cc7-a17b-ebeb949dc31c	UPG-PEDRO-INF-7667B71F5081C871	\N	/api/certificates/download/UPG-PEDRO-INF-7667B71F5081C871	2026-05-12 15:00:00	5a1cca76-527b-4d85-baf2-8a0129353b45	ACTIVE	\N	\N	\N	74125c76-77d9-45d8-a48e-82616981bd9e
e7d4c1ff-2cf1-49bb-a2f7-420b6302aef1	9d7d167c-09e5-4aee-b444-868b258edcf1	139a2cba-69de-4ada-ba86-9df5f834be09	UPG-PEDRO-ADM-29BF20E99AB84DDF	\N	/api/certificates/download/UPG-PEDRO-ADM-29BF20E99AB84DDF	2026-05-10 15:00:00	5a1cca76-527b-4d85-baf2-8a0129353b45	ACTIVE	\N	\N	\N	7a5e30e3-9577-40da-9aaa-a9d9086ed6ea
\.


ALTER TABLE public.certificates ENABLE TRIGGER ALL;

--
-- Data for Name: class_holidays; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.class_holidays DISABLE TRIGGER ALL;

COPY public.class_holidays (id, "classId", date, reason, "registeredBy", active, "createdAt", "updatedAt", "endDateBeforePush") FROM stdin;
e0263636-dcf4-43f3-9629-289d38f3aac8	4a737790-9d68-4cc7-a17b-ebeb949dc31c	2026-04-29 11:00:00	Feriado Municipal — Dia de São Luís (10 de setembro)	5a1cca76-527b-4d85-baf2-8a0129353b45	t	2026-05-14 12:35:04.659	2026-05-14 12:35:04.659	\N
\.


ALTER TABLE public.class_holidays ENABLE TRIGGER ALL;

--
-- Data for Name: class_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.class_schedules DISABLE TRIGGER ALL;

COPY public.class_schedules (id, "classId", weekday, active, "createdAt") FROM stdin;
\.


ALTER TABLE public.class_schedules ENABLE TRIGGER ALL;

--
-- Data for Name: teachers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.teachers DISABLE TRIGGER ALL;

COPY public.teachers (id, "userId", cpf, "birthDate", "photoUrl", education, specialties, experience, certifications, "resumeUrl", availability, "preferredRegion", "contractType", "hireDate", active, "createdAt", "updatedAt", documents) FROM stdin;
e680ac45-3531-46e4-810d-99bd48b0c4f9	21c3d311-9147-48a5-a66b-d263df569c17	321.654.987-00	1988-04-15 00:00:00	\N	Licenciatura em Pedagogia — UFMA	Informática Educacional, Gestão Administrativa	\N	\N	\N	\N	\N	PJ	2023-03-01 00:00:00	t	2026-05-14 12:35:04.447	2026-05-14 12:35:04.447	\N
83133e00-a0d2-4567-85fc-c2840501ec30	75ac91cd-e117-49f9-8350-3a17b2c7396b	456.789.012-11	1985-09-20 00:00:00	\N	Bacharelado em Administração — UFPI	Marketing Digital, Empreendedorismo, Excel Avançado	\N	\N	\N	\N	\N	CLT	2022-07-01 00:00:00	t	2026-05-14 12:35:04.454	2026-05-14 12:35:04.454	\N
\.


ALTER TABLE public.teachers ENABLE TRIGGER ALL;

--
-- Data for Name: class_teachers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.class_teachers DISABLE TRIGGER ALL;

COPY public.class_teachers (id, "classId", "teacherId", "isSubstitute", "createdAt") FROM stdin;
3c203acb-d5cc-4028-b9cf-419913b87107	4a737790-9d68-4cc7-a17b-ebeb949dc31c	e680ac45-3531-46e4-810d-99bd48b0c4f9	f	2026-05-14 12:35:04.645
9d875ec7-960c-4d72-aaae-faf58fdeb7c6	139a2cba-69de-4ada-ba86-9df5f834be09	e680ac45-3531-46e4-810d-99bd48b0c4f9	f	2026-05-14 12:35:04.649
46300a15-31cd-4598-a1ea-e9a36a8ba3c9	818c991f-c56f-4bce-bc8a-3891f9a8eabe	83133e00-a0d2-4567-85fc-c2840501ec30	f	2026-05-14 12:35:04.651
888f4607-2858-4b64-bc29-560dd0c8baba	f496a94d-a0ab-4c8e-8806-9d628c2eb104	83133e00-a0d2-4567-85fc-c2840501ec30	f	2026-05-14 12:35:04.655
\.


ALTER TABLE public.class_teachers ENABLE TRIGGER ALL;

--
-- Data for Name: contas_pagar; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.contas_pagar DISABLE TRIGGER ALL;

COPY public.contas_pagar (id, tipo_conta, tipo_espontaneo, descricao, valor, data_vencimento, data_pagamento, status, recorrente, observacoes, comprovante_url, cidade, "acaoId", "createdAt", "updatedAt", active) FROM stdin;
251b12ea-94d1-44a5-8ea6-4566e28b1dce	abastecimento	\N	Abastecimento TRK-001 — posto BR posto km 12 rodovia BR-135	450.00	2026-05-12 11:00:00	2026-05-13 11:00:00	paga	f	\N	\N	São Luís	\N	2026-05-14 12:35:05.027	2026-05-14 12:35:05.027	t
57c37043-741f-4609-a53b-b05cdfbb8b54	pneu_furado	\N	Troca de pneu furado TRK-001 — pneu 295/80 R22.5 borracharia BR-316 km 347	890.00	2026-05-19 11:00:00	\N	pendente	f	\N	\N	Caxias	\N	2026-05-14 12:35:05.031	2026-05-14 12:35:05.031	t
6628ff08-6922-4faa-8651-e52eed4a2cd4	agua	\N	Abastecimento de água potável para consumo durante viagem MA → PI	45.00	2026-05-04 11:00:00	2026-05-06 11:00:00	paga	f	\N	\N	Timon	\N	2026-05-14 12:35:05.035	2026-05-14 12:35:05.035	t
693c794c-8e9c-4333-ae77-e155085fbd8e	espontaneo	Material de limpeza	Compra de material de limpeza para higienização interna do veículo após rota	120.00	2026-04-14 11:00:00	\N	vencida	f	\N	\N	São Luís	\N	2026-05-14 12:35:05.038	2026-05-14 12:35:05.038	t
b8b916d3-c003-4f58-9410-9f428eb917d3	estoque_reposicao	\N	Reposição de estoque: Apostila desenvolvimento em IA — 10 un (solicitação 099c715d)	500.00	2026-06-13 18:32:24.293	2026-05-14 18:32:33.64	paga	f	Solicitante: 5a1cca76-527b-4d85-baf2-8a0129353b45 | Fornecedor: Governo do Piaui | Aprovado por: 5a1cca76-527b-4d85-baf2-8a0129353b45	\N	\N	\N	2026-05-14 18:32:24.294	2026-05-14 18:32:33.641	t
175ed6e0-9869-43ec-8928-a825e72ed703	funcionario	\N	Reembolso de Despesas: João Batista Ferreira — Troca emergencial de pneu furado km 347 da BR-316 — compra comprovada por nota fiscal	220.00	2026-05-14 20:03:44.238	\N	pendente	f	origem=reembolso | reimbursementId:ce66b440-18bd-4063-bc53-36c417da6eb8 | categoria=EMERGENCY_REPAIR | motivo=Troca emergencial de pneu furado km 347 da BR-316 — compra comprovada por nota fiscal		\N	\N	2026-05-14 20:03:44.239	2026-05-14 20:03:44.239	t
\.


ALTER TABLE public.contas_pagar ENABLE TRIGGER ALL;

--
-- Data for Name: course_feedbacks; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.course_feedbacks DISABLE TRIGGER ALL;

COPY public.course_feedbacks (id, "studentId", "classId", "certificateId", status, "ratingCourse", "ratingSystem", "ratingManagement", "ratingTeachers", "ratingGeneral", "commentPositive", "commentImprovement", "commentGeneral", "currentStatus", "currentStatusDetails", "currentPhotoUrl", "currentVideoUrl", "pixKeyType", "pixKey", "pixAmount", "invitedChannels", "invitedAt", "lastReminderAt", "reminderCount", "expiresAt", "submittedAt", "reviewedBy", "reviewedAt", "rejectionReason", "revertedBy", "revertedAt", "revertReason", "contaPagarId", active, "createdAt", "updatedAt", "socialPostPlatform", "socialPostUrl", "socialPostProofUrl", "socialPostedAt", "contentApprovedAt", "contentApprovedBy", "studentSubmitSequence", "resubmittedAfterReject", "rejectionHistoryJson", "rewardPaidAt", "rewardPaymentReference", "rewardStatus", "sharedOnSocial") FROM stdin;
607d860d-159d-4019-b32b-72ab21d68782	b0111155-7955-4014-935e-8ef0c6033ae9	139a2cba-69de-4ada-ba86-9df5f834be09	31759671-680a-4a38-9da8-2543e7512c78	APPROVED	5	4	5	5	5	Excelente curso! A professora Maria explicou muito bem todos os conteúdos práticos.	Poderia ter mais aulas de Excel avançado no módulo final.	Já consegui uma entrevista de emprego graças ao certificado!	EMPLOYED_CLT	Contratado como Assistente Administrativo.	\N	\N	\N	\N	\N	\N	2026-05-08 11:00:00	\N	0	2026-06-07 11:00:00	2026-05-11 11:00:00	\N	\N	\N	\N	\N	\N	\N	t	2026-05-14 12:35:05.067	2026-05-14 12:35:05.067	\N	\N	\N	\N	\N	\N	0	f	\N	\N	\N	PENDING	f
\.


ALTER TABLE public.course_feedbacks ENABLE TRIGGER ALL;

--
-- Data for Name: course_modules; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.course_modules DISABLE TRIGGER ALL;

COPY public.course_modules (id, "courseId", "moduleName", room, "startTime", "endTime", "order", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.course_modules ENABLE TRIGGER ALL;

--
-- Data for Name: data_deletion_requests; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.data_deletion_requests DISABLE TRIGGER ALL;

COPY public.data_deletion_requests (id, "userId", "requestedAt", "processedAt", "processedBy", status) FROM stdin;
\.


ALTER TABLE public.data_deletion_requests ENABLE TRIGGER ALL;

--
-- Data for Name: driver_checkins; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.driver_checkins DISABLE TRIGGER ALL;

COPY public.driver_checkins (id, "userId", "checkedAt", date, note) FROM stdin;
\.


ALTER TABLE public.driver_checkins ENABLE TRIGGER ALL;

--
-- Data for Name: trips; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.trips DISABLE TRIGGER ALL;

COPY public.trips (id, "truckId", "originCityId", "destinationCityId", "departureDate", "expectedArrivalDate", "actualArrivalDate", "driverName", "driverPhone", "kmStart", "kmEnd", status, notes, "createdAt", "updatedAt", "driverUserId", "auditValidatedAt", "auditValidatedByUserId", "destinationCep", "destinationLatitude", "destinationLongitude", "driverDecision", "driverDecisionAt", "driverDecisionReason", "endOdometerPhotoUrl", "gpsDistanceKm", "originCep", "originLatitude", "originLongitude", "rejectionPenalty", "rejectionPenaltyAt", "rejectionPenaltyBy", "startOdometerPhotoUrl") FROM stdin;
f8080984-3c3e-4dee-8709-86a19eeea4ed	1a064a1d-879b-4e4c-bbea-db7c12618804	f627826b-1705-467d-8e3e-52e1eb5bdaf2	8304dd54-645b-44a3-820c-6105d4044492	2026-03-30 09:00:00	2026-03-30 13:00:00	2026-03-30 12:48:00	João Batista Ferreira	\N	138200	138850	COMPLETED	São Luís → Caxias — veículo anterior MHJ-9876	2026-05-14 12:35:04.485	2026-05-14 12:35:04.485	5d855437-7505-42ff-a8b6-82ea4892b405	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
eb9f2e6e-cc17-4c8e-94d7-0ba910a19db2	1a064a1d-879b-4e4c-bbea-db7c12618804	f627826b-1705-467d-8e3e-52e1eb5bdaf2	075bc61d-41b1-4ff6-8ae6-3ab57a2e9e33	2026-05-11 09:00:00	2026-05-11 17:00:00	2026-05-11 16:30:00	João Batista Ferreira	\N	142800	143550	COMPLETED	São Luís/MA → Teresina/PI — concluída	2026-05-14 12:35:04.488	2026-05-14 12:35:04.488	5d855437-7505-42ff-a8b6-82ea4892b405	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
8aa83281-270c-43a0-b4e3-c9c80b438f90	1a064a1d-879b-4e4c-bbea-db7c12618804	075bc61d-41b1-4ff6-8ae6-3ab57a2e9e33	f627826b-1705-467d-8e3e-52e1eb5bdaf2	2026-05-14 10:35:04.49	2026-05-14 18:35:04.49	\N	João Batista Ferreira	\N	143550	\N	IN_TRANSIT	Teresina/PI → São Luís/MA — em andamento	2026-05-14 12:35:04.491	2026-05-14 12:35:04.491	5d855437-7505-42ff-a8b6-82ea4892b405	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
0fad01c9-81dd-43b3-98ba-3db64256f223	1a064a1d-879b-4e4c-bbea-db7c12618804	f627826b-1705-467d-8e3e-52e1eb5bdaf2	075bc61d-41b1-4ff6-8ae6-3ab57a2e9e33	2026-05-16 12:35:04.493	2026-05-17 12:35:04.493	\N	João Batista Ferreira	\N	\N	\N	PLANNED	Planejada — retorno São Luís → Teresina	2026-05-14 12:35:04.493	2026-05-14 12:35:04.493	5d855437-7505-42ff-a8b6-82ea4892b405	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
bbd8001c-180d-4bfd-9a44-e4e8517fe7b6	1a064a1d-879b-4e4c-bbea-db7c12618804	f627826b-1705-467d-8e3e-52e1eb5bdaf2	075bc61d-41b1-4ff6-8ae6-3ab57a2e9e33	2026-05-14 06:35:05.269	2026-05-14 17:35:05.269	\N	Carlos Souza	\N	\N	\N	IN_TRANSIT	Demo: Carlos Souza [DEMO:online]	2026-05-14 12:35:05.27	2026-05-14 12:35:05.27	8b15a83f-3e6c-41f8-bfcc-6f02c94d4fcc	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
8baa9a63-25ef-44a6-8aa8-08df214cd323	1a064a1d-879b-4e4c-bbea-db7c12618804	075bc61d-41b1-4ff6-8ae6-3ab57a2e9e33	e1df1f45-79a2-4a9c-b070-2571ae27f9e1	2026-05-14 08:35:05.289	2026-05-14 15:35:05.289	\N	Ana Lima	\N	\N	\N	IN_TRANSIT	Demo: Ana Lima [DEMO:stopped]	2026-05-14 12:35:05.29	2026-05-14 12:35:05.29	7f651b73-8c01-4734-b2af-25e02638cc17	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
44bc818e-dbf2-4647-a637-e486e601205e	1a064a1d-879b-4e4c-bbea-db7c12618804	f2f0935b-fd83-447c-9941-43d05ca5d615	50b7aa74-c5c8-4899-9eec-86c8eeb9a6ac	2026-05-14 02:35:05.307	2026-05-14 14:35:05.307	\N	Roberto Freitas	\N	\N	\N	IN_TRANSIT	Demo: Roberto Freitas [DEMO:offline]	2026-05-14 12:35:05.307	2026-05-14 12:35:05.307	cdbfd25f-d651-408c-b3ac-b42d2d6c736a	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
7b7d09f8-daee-4603-8454-7f0abb6b27dd	1a064a1d-879b-4e4c-bbea-db7c12618804	8304dd54-645b-44a3-820c-6105d4044492	f627826b-1705-467d-8e3e-52e1eb5bdaf2	2026-05-14 07:35:05.326	2026-05-14 13:05:05.326	\N	Marina Costa	\N	\N	\N	IN_TRANSIT	Demo: Marina Costa [DEMO:online]	2026-05-14 12:35:05.326	2026-05-14 12:35:05.326	baad3183-794d-44b4-a99d-7f794710b818	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
01b9f8a4-6b49-4a28-b1c7-9d1918ded62b	1a064a1d-879b-4e4c-bbea-db7c12618804	11c2fab1-0909-4584-93b4-437e74a8d6b5	075bc61d-41b1-4ff6-8ae6-3ab57a2e9e33	2026-05-14 12:05:05.347	2026-05-14 16:35:05.347	\N	Paulo Ramos	\N	\N	\N	IN_TRANSIT	Demo: Paulo Ramos [DEMO:online]	2026-05-14 12:35:05.348	2026-05-14 12:35:05.348	86cf840d-a358-425d-b102-7b90ad6f1a5d	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
df87ae88-99c5-4fd5-8fd9-3021d40ca790	1a064a1d-879b-4e4c-bbea-db7c12618804	50b7aa74-c5c8-4899-9eec-86c8eeb9a6ac	f2f0935b-fd83-447c-9941-43d05ca5d615	2026-05-14 08:35:05.362	2026-05-14 14:35:05.362	\N	Fábio Nunes	\N	\N	\N	IN_TRANSIT	Demo: Fábio Nunes [DEMO:stopped]	2026-05-14 12:35:05.363	2026-05-14 12:35:05.363	7f7380d4-c9c1-40fb-90fb-516f39fbe5f0	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
3bc745b8-fe72-44df-a417-aae957fdada1	1a064a1d-879b-4e4c-bbea-db7c12618804	f627826b-1705-467d-8e3e-52e1eb5bdaf2	8e49f2e5-1d3f-4ad8-8574-d2af355b41e6	2026-05-14 07:35:05.379	2026-05-14 13:35:05.379	\N	Léa Santos	\N	\N	\N	IN_TRANSIT	Demo: Léa Santos [DEMO:offline]	2026-05-14 12:35:05.38	2026-05-14 12:35:05.38	d0f246c1-e506-4f2b-a8a3-da26d3e221a8	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
38cad8d2-9a03-4c0d-b1cf-212cffc42bf8	1a064a1d-879b-4e4c-bbea-db7c12618804	5bc1e825-7809-4a02-afff-c939c8b7b9e0	f627826b-1705-467d-8e3e-52e1eb5bdaf2	2026-05-14 04:35:05.396	2026-05-15 03:35:05.396	\N	Diego Alves	\N	\N	\N	IN_TRANSIT	Demo: Diego Alves [DEMO:online]	2026-05-14 12:35:05.397	2026-05-14 12:35:05.397	fb32b5ce-dbf8-4085-b7cb-e89e624dfb22	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
ccf6fcad-465f-4421-b01d-489d7f06e390	1a064a1d-879b-4e4c-bbea-db7c12618804	075bc61d-41b1-4ff6-8ae6-3ab57a2e9e33	0d3d9cbe-f662-474f-a620-55978aa26ca6	2026-05-14 06:35:05.415	2026-05-14 10:35:05.415	2026-05-14 10:35:05.415	Tânia Melo	\N	\N	\N	COMPLETED	Demo: Tânia Melo — concluída hoje	2026-05-14 12:35:05.415	2026-05-14 12:35:05.415	c8d457d7-7113-4c56-a826-05201dec5869	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
1de75f2f-082d-4fbb-9896-a30f9ff1ad94	1a064a1d-879b-4e4c-bbea-db7c12618804	e1df1f45-79a2-4a9c-b070-2571ae27f9e1	f26f8ef0-4f4d-4f3e-b3ae-279454425490	2026-05-14 05:35:05.427	2026-05-14 09:35:05.427	2026-05-14 09:35:05.427	Jonas Pires	\N	\N	\N	COMPLETED	Demo: Jonas Pires — concluída hoje	2026-05-14 12:35:05.428	2026-05-14 12:35:05.428	a61d0671-a776-4800-86c8-d62114aec929	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


ALTER TABLE public.trips ENABLE TRIGGER ALL;

--
-- Data for Name: driver_locations; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.driver_locations DISABLE TRIGGER ALL;

COPY public.driver_locations (id, "driverUserId", "tripId", latitude, longitude, accuracy, speed, heading, source, "capturedAt", "createdAt") FROM stdin;
ca549891-4c77-4dae-9a76-84cf74506e79	8b15a83f-3e6c-41f8-bfcc-6f02c94d4fcc	bbd8001c-180d-4bfd-9a44-e4e8517fe7b6	-2.5297	-44.3028	8.5	0	\N	GPS_DEVICE	2026-05-14 06:35:05.26	2026-05-14 12:35:05.272
b7a3cca2-121c-43ca-96fc-046e345a4a70	8b15a83f-3e6c-41f8-bfcc-6f02c94d4fcc	bbd8001c-180d-4bfd-9a44-e4e8517fe7b6	-3.65	-44	8.5	88	\N	GPS_DEVICE	2026-05-14 08:05:05.26	2026-05-14 12:35:05.276
079f96fe-a0bf-4930-b554-0c95aa695d48	8b15a83f-3e6c-41f8-bfcc-6f02c94d4fcc	bbd8001c-180d-4bfd-9a44-e4e8517fe7b6	-4.4497	-43.8842	8.5	40	\N	GPS_DEVICE	2026-05-14 09:35:05.26	2026-05-14 12:35:05.278
e2025972-d5ca-4a89-9e67-ba1ae0050e1b	8b15a83f-3e6c-41f8-bfcc-6f02c94d4fcc	bbd8001c-180d-4bfd-9a44-e4e8517fe7b6	-4.8692	-43.3564	8.5	87	\N	GPS_DEVICE	2026-05-14 12:32:05.26	2026-05-14 12:35:05.28
7ef1d6c7-ce80-4f28-b7a0-a5c6dfc61865	7f651b73-8c01-4734-b2af-25e02638cc17	8baa9a63-25ef-44a6-8aa8-08df214cd323	-5.0892	-42.8019	8.5	0	\N	GPS_DEVICE	2026-05-14 08:35:05.26	2026-05-14 12:35:05.293
81d02441-742a-41c4-b00c-3d3854616b31	7f651b73-8c01-4734-b2af-25e02638cc17	8baa9a63-25ef-44a6-8aa8-08df214cd323	-4.86	-42.23	8.5	68	\N	GPS_DEVICE	2026-05-14 10:05:05.26	2026-05-14 12:35:05.295
4fead215-fed4-4473-b816-2a625144118a	7f651b73-8c01-4734-b2af-25e02638cc17	8baa9a63-25ef-44a6-8aa8-08df214cd323	-4.8233	-42.1689	8.5	0	\N	GPS_DEVICE	2026-05-14 12:25:05.26	2026-05-14 12:35:05.297
70168464-a2fb-4a43-9356-31352977cd39	cdbfd25f-d651-408c-b3ac-b42d2d6c736a	44bc818e-dbf2-4647-a637-e486e601205e	-10.1533	-67.7367	8.5	0	\N	GPS_DEVICE	2026-05-14 02:35:05.26	2026-05-14 12:35:05.31
c761a662-550c-4927-bb7b-976f705017ba	cdbfd25f-d651-408c-b3ac-b42d2d6c736a	44bc818e-dbf2-4647-a637-e486e601205e	-10.06	-67.79	8.5	58	\N	GPS_DEVICE	2026-05-14 04:35:05.26	2026-05-14 12:35:05.312
401c74c4-ad62-4283-a87f-8c04df4ccb13	cdbfd25f-d651-408c-b3ac-b42d2d6c736a	44bc818e-dbf2-4647-a637-e486e601205e	-10.05	-67.8	8.5	0	\N	GPS_DEVICE	2026-05-14 10:35:05.26	2026-05-14 12:35:05.315
8bf0b3ae-0559-4399-99c7-6150ad124b13	baad3183-794d-44b4-a99d-7f794710b818	7b7d09f8-daee-4603-8454-7f0abb6b27dd	-4.8692	-43.3564	8.5	0	\N	GPS_DEVICE	2026-05-14 07:35:05.26	2026-05-14 12:35:05.329
4146399b-81eb-4ef3-9693-02ac3d0bd0c6	baad3183-794d-44b4-a99d-7f794710b818	7b7d09f8-daee-4603-8454-7f0abb6b27dd	-3.5	-44.15	8.5	88	\N	GPS_DEVICE	2026-05-14 10:35:05.26	2026-05-14 12:35:05.331
6ee85c29-9fe3-408e-98b1-da144c8df54c	baad3183-794d-44b4-a99d-7f794710b818	7b7d09f8-daee-4603-8454-7f0abb6b27dd	-2.65	-44.22	8.5	75	\N	GPS_DEVICE	2026-05-14 12:05:05.26	2026-05-14 12:35:05.334
e73f4cc8-0dde-4f94-9085-e496c82c9ee6	baad3183-794d-44b4-a99d-7f794710b818	7b7d09f8-daee-4603-8454-7f0abb6b27dd	-2.54	-44.29	8.5	45	\N	GPS_DEVICE	2026-05-14 12:32:05.26	2026-05-14 12:35:05.336
661696fe-f37e-4f9c-8692-ee085089dea7	86cf840d-a358-425d-b102-7b90ad6f1a5d	01b9f8a4-6b49-4a28-b1c7-9d1918ded62b	-4.2428	-42.2956	8.5	0	\N	GPS_DEVICE	2026-05-14 12:05:05.26	2026-05-14 12:35:05.35
244e06db-cd0b-41f5-9c1a-df0e908fb693	86cf840d-a358-425d-b102-7b90ad6f1a5d	01b9f8a4-6b49-4a28-b1c7-9d1918ded62b	-4.38	-42.35	8.5	70	\N	GPS_DEVICE	2026-05-14 12:32:05.26	2026-05-14 12:35:05.353
13d10fd3-d740-4c53-9c70-cd5742bc3a30	7f7380d4-c9c1-40fb-90fb-516f39fbe5f0	df87ae88-99c5-4fd5-8fd9-3021d40ca790	-9.9754	-67.8249	8.5	0	\N	GPS_DEVICE	2026-05-14 08:35:05.26	2026-05-14 12:35:05.365
7b3609d7-ba75-4da3-ab5d-764eeb5bee99	7f7380d4-c9c1-40fb-90fb-516f39fbe5f0	df87ae88-99c5-4fd5-8fd9-3021d40ca790	-9.99	-67.68	8.5	65	\N	GPS_DEVICE	2026-05-14 09:35:05.26	2026-05-14 12:35:05.368
436ddadd-3af2-4021-8ed1-4ffae47d79ff	7f7380d4-c9c1-40fb-90fb-516f39fbe5f0	df87ae88-99c5-4fd5-8fd9-3021d40ca790	-10.05	-67.55	8.5	0	\N	GPS_DEVICE	2026-05-14 12:25:05.26	2026-05-14 12:35:05.37
554d5f0d-72de-4623-b1c5-11e5ca6dea60	d0f246c1-e506-4f2b-a8a3-da26d3e221a8	3bc745b8-fe72-44df-a417-aae957fdada1	-2.5297	-44.3028	8.5	0	\N	GPS_DEVICE	2026-05-14 07:35:05.26	2026-05-14 12:35:05.383
b96bdd54-a2f1-4fc0-ad09-a3e7275e29fb	d0f246c1-e506-4f2b-a8a3-da26d3e221a8	3bc745b8-fe72-44df-a417-aae957fdada1	-3.7	-44.65	8.5	70	\N	GPS_DEVICE	2026-05-14 09:35:05.26	2026-05-14 12:35:05.385
c7549530-8ef1-4da4-9936-52ea93c9b305	d0f246c1-e506-4f2b-a8a3-da26d3e221a8	3bc745b8-fe72-44df-a417-aae957fdada1	-4.05	-44.75	8.5	0	\N	GPS_DEVICE	2026-05-14 10:35:05.26	2026-05-14 12:35:05.387
4e73efae-d45d-4cb9-8f3e-15d27a04175a	fb32b5ce-dbf8-4085-b7cb-e89e624dfb22	38cad8d2-9a03-4c0d-b1cf-212cffc42bf8	-5.5261	-47.4916	8.5	0	\N	GPS_DEVICE	2026-05-14 04:35:05.26	2026-05-14 12:35:05.4
5c59cf44-3f87-43f0-8281-283e7a4ddedd	fb32b5ce-dbf8-4085-b7cb-e89e624dfb22	38cad8d2-9a03-4c0d-b1cf-212cffc42bf8	-4.9478	-47.5	8.5	80	\N	GPS_DEVICE	2026-05-14 05:35:05.26	2026-05-14 12:35:05.402
1237cc1b-4e1d-4e62-a517-a6d9021f5e7c	fb32b5ce-dbf8-4085-b7cb-e89e624dfb22	38cad8d2-9a03-4c0d-b1cf-212cffc42bf8	-4.2244	-44.79	8.5	88	\N	GPS_DEVICE	2026-05-14 12:30:05.26	2026-05-14 12:35:05.404
\.


ALTER TABLE public.driver_locations ENABLE TRIGGER ALL;

--
-- Data for Name: employee_attendances; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.employee_attendances DISABLE TRIGGER ALL;

COPY public.employee_attendances (id, "employeeId", date, present, justified, justification, "registeredBy", "registeredAt", "createdAt", "updatedAt") FROM stdin;
653c0c96-3aa5-48c5-a3ac-b4a79840e10f	378d7cbf-64b6-4c9c-af78-3131f0e9c996	2026-05-13 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.523	2026-05-14 12:35:04.523	2026-05-14 12:35:04.523
e1aaad91-5141-4e4c-815d-5c10352ca6fb	378d7cbf-64b6-4c9c-af78-3131f0e9c996	2026-05-12 11:00:00	t	f	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.53	2026-05-14 12:35:04.53	2026-05-14 12:35:04.53
a219f219-00d8-4d87-ba73-261fbfd349a5	378d7cbf-64b6-4c9c-af78-3131f0e9c996	2026-05-11 11:00:00	f	t	Consulta médica agendada	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 12:35:04.534	2026-05-14 12:35:04.534	2026-05-14 12:35:04.534
\.


ALTER TABLE public.employee_attendances ENABLE TRIGGER ALL;

--
-- Data for Name: employee_registration_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.employee_registration_tokens DISABLE TRIGGER ALL;

COPY public.employee_registration_tokens (id, token, role, department, "createdBy", "expiresAt", used, revoked, "createdAt") FROM stdin;
\.


ALTER TABLE public.employee_registration_tokens ENABLE TRIGGER ALL;

--
-- Data for Name: employee_registration_requests; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.employee_registration_requests DISABLE TRIGGER ALL;

COPY public.employee_registration_requests (id, "tokenId", status, name, cpf, email, phone, "birthDate", "submittedData", "rejectionReason", "reviewedBy", "reviewedAt", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE public.employee_registration_requests ENABLE TRIGGER ALL;

--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.enrollments DISABLE TRIGGER ALL;

COPY public.enrollments (id, "studentId", "classId", protocol, status, "enrolledAt", "reviewedAt", "reviewedBy", "rejectionReason", notes, "createdAt", "updatedAt") FROM stdin;
ea7cf40e-2c52-4b25-8226-6a156bcc6695	b0111155-7955-4014-935e-8ef0c6033ae9	4a737790-9d68-4cc7-a17b-ebeb949dc31c	UPG-DAVI-4A737790	ENROLLED	2026-04-22 11:00:00	2026-04-23 11:00:00	5a1cca76-527b-4d85-baf2-8a0129353b45	\N	\N	2026-05-14 12:35:04.664	2026-05-14 12:35:04.664
f658e08f-392c-43cc-acea-10b3b09fefed	b0111155-7955-4014-935e-8ef0c6033ae9	139a2cba-69de-4ada-ba86-9df5f834be09	UPG-DAVI-139A2CBA	ENROLLED	2026-03-13 11:00:00	2026-03-14 11:00:00	5a1cca76-527b-4d85-baf2-8a0129353b45	\N	\N	2026-05-14 12:35:04.733	2026-05-14 12:35:04.733
ea307759-5559-4746-b530-c8a72d88cc4f	b0111155-7955-4014-935e-8ef0c6033ae9	818c991f-c56f-4bce-bc8a-3891f9a8eabe	UPG-DAVI-818C991F	WAITLIST	2026-05-11 11:00:00	\N	\N	\N	\N	2026-05-14 12:35:04.741	2026-05-14 12:35:04.741
d07b496c-26a4-484b-810e-2f9f407fa112	19f40ea7-5935-4f6e-ae14-bc63a7ff9303	818c991f-c56f-4bce-bc8a-3891f9a8eabe	UPG-ANA-818C991F	APPROVED	2026-05-09 11:00:00	2026-05-10 11:00:00	5a1cca76-527b-4d85-baf2-8a0129353b45	\N	\N	2026-05-14 12:35:04.745	2026-05-14 12:35:04.745
6b118308-093a-4a8b-af27-d6e5e8e2a4fd	19f40ea7-5935-4f6e-ae14-bc63a7ff9303	139a2cba-69de-4ada-ba86-9df5f834be09	UPG-ANA-139A2CBA	REJECTED	2026-03-10 11:00:00	2026-03-12 11:00:00	5a1cca76-527b-4d85-baf2-8a0129353b45	Documentação incompleta — RG ilegível. Favor reenviar com foto nítida.	\N	2026-05-14 12:35:04.748	2026-05-14 12:35:04.748
5888852d-3891-4208-9c56-11d22aec63ef	9d7d167c-09e5-4aee-b444-868b258edcf1	4a737790-9d68-4cc7-a17b-ebeb949dc31c	UPG-PEDRO-4A737790	ENROLLED	2026-04-16 11:00:00	2026-04-17 11:00:00	5a1cca76-527b-4d85-baf2-8a0129353b45	\N	\N	2026-05-14 12:35:04.752	2026-05-14 12:35:04.752
86314458-0218-42d6-bb73-a393e8295b69	9d7d167c-09e5-4aee-b444-868b258edcf1	818c991f-c56f-4bce-bc8a-3891f9a8eabe	UPG-PEDRO-818C991F	ENROLLED	2026-04-16 11:00:00	2026-04-17 11:00:00	5a1cca76-527b-4d85-baf2-8a0129353b45	\N	\N	2026-05-14 12:35:04.754	2026-05-14 12:35:04.754
3c9ca936-c0af-4ca0-91aa-9ff0c7feb522	9d7d167c-09e5-4aee-b444-868b258edcf1	139a2cba-69de-4ada-ba86-9df5f834be09	UPG-PEDRO-139A2CBA	ENROLLED	2026-04-16 11:00:00	2026-04-17 11:00:00	5a1cca76-527b-4d85-baf2-8a0129353b45	\N	\N	2026-05-14 12:35:04.758	2026-05-14 12:35:04.758
af39d775-b737-4bb5-8398-e2b3013a5713	ad56fc40-476c-452a-b0f0-614baa860460	818c991f-c56f-4bce-bc8a-3891f9a8eabe	MP5SCNJQ-38A965	APPROVED	2026-05-14 17:51:59.106	2026-05-14 17:52:03.26	5a1cca76-527b-4d85-baf2-8a0129353b45	\N	Aprovado via script de testes de email	2026-05-14 17:51:59.106	2026-05-14 17:52:03.261
2d48c035-818d-462a-b157-359099e0f3f0	0ac40339-9816-42d1-b3c8-4a51414e0ddb	818c991f-c56f-4bce-bc8a-3891f9a8eabe	MP5SCP6B-786A36	REJECTED	2026-05-14 17:52:01.199	2026-05-14 17:52:05.299	5a1cca76-527b-4d85-baf2-8a0129353b45	Vagas esgotadas nesta turma — teste de email de rejeição	\N	2026-05-14 17:52:01.199	2026-05-14 17:52:05.3
\.


ALTER TABLE public.enrollments ENABLE TRIGGER ALL;

--
-- Data for Name: enrollment_consents; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.enrollment_consents DISABLE TRIGGER ALL;

COPY public.enrollment_consents (id, "enrollmentId", "dataProcessing", "imageUse", "termsAccepted", "privacyPolicyAccepted", "consentDate", "ipAddress", "userAgent", "attendanceCommitment") FROM stdin;
a177aafc-7086-4d63-8f76-5523bec579f7	af39d775-b737-4bb5-8398-e2b3013a5713	t	t	t	t	2026-05-14 17:51:59.112	::ffff:127.0.0.1	python-requests/2.32.4	t
63c3a22a-f164-40e8-9936-233f68fe1297	2d48c035-818d-462a-b157-359099e0f3f0	t	t	t	t	2026-05-14 17:52:01.206	::ffff:127.0.0.1	python-requests/2.32.4	t
\.


ALTER TABLE public.enrollment_consents ENABLE TRIGGER ALL;

--
-- Data for Name: enrollment_documents; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.enrollment_documents DISABLE TRIGGER ALL;

COPY public.enrollment_documents (id, "enrollmentId", "documentType", "fileUrl", "uploadedAt") FROM stdin;
\.


ALTER TABLE public.enrollment_documents ENABLE TRIGGER ALL;

--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.expenses DISABLE TRIGGER ALL;

COPY public.expenses (id, "tripId", "truckId", category, subcategory, amount, description, "receiptUrl", "expenseDate", "responsibleUserId", status, "approvedBy", "approvedAt", "rejectionReason", "createdAt") FROM stdin;
\.


ALTER TABLE public.expenses ENABLE TRIGGER ALL;

--
-- Data for Name: materials; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.materials DISABLE TRIGGER ALL;

COPY public.materials (id, "courseId", "classId", "teacherId", title, description, "fileUrl", "fileType", "fileSize", tags, visibility, "visibleFrom", "uploadedBy", "uploadedAt", "downloadCount", "viewCount") FROM stdin;
4ff8661a-cf42-4652-aa0a-1bbc1e3792dd	5b16004c-f93b-4a35-8431-d7692b776492	\N	\N	Apostila Informática Básica — Módulo 1	Material teórico completo do Módulo 1 — Introdução ao Windows 10 e organização de arquivos.	/materiais/apostila-info-m1.pdf	application/pdf	2048000	aula,material,apostila	PUBLIC	\N	21c3d311-9147-48a5-a66b-d263df569c17	2026-05-14 12:35:05.011	29	0
9ce4e465-79d6-4468-a39f-ba74b5b0e539	d48e28c0-9696-49ce-9176-8e78354935be	\N	\N	Planilha de Exercícios Excel Avançado	Exercícios práticos de fórmulas PROCV, Tabela Dinâmica e Macros VBA com gabarito.	/materiais/exercicios-excel.xlsx	application/vnd.openxmlformats-officedocument.spreadsheetml.sheet	512000	aula,material,apostila	COURSE_RESTRICTED	\N	21c3d311-9147-48a5-a66b-d263df569c17	2026-05-14 12:35:05.015	9	0
087a91ff-e64f-47bb-b809-17d95a7e6038	16d7e281-97f2-4496-94ac-28fad1ff9155	\N	\N	Apresentação Marketing Digital — Redes Sociais	Slides da aula sobre estratégias de conteúdo no Instagram e TikTok para negócios locais.	/materiais/mkt-redes-sociais.pptx	application/vnd.openxmlformats-officedocument.presentationml.presentation	8192000	aula,material,apostila	PUBLIC	\N	21c3d311-9147-48a5-a66b-d263df569c17	2026-05-14 12:35:05.018	20	0
d35c9bc4-1762-4d73-b52a-e5cf400800ec	447f01bf-5cd9-4296-b71d-b3810939925a	\N	\N	Plano de Negócios — Template Word	Modelo completo para elaboração de plano de negócios conforme SEBRAE — inclui análise SWOT.	/materiais/plano-negocios-template.docx	application/vnd.openxmlformats-officedocument.wordprocessingml.document	350000	aula,material,apostila	PUBLIC	\N	21c3d311-9147-48a5-a66b-d263df569c17	2026-05-14 12:35:05.023	13	0
\.


ALTER TABLE public.materials ENABLE TRIGGER ALL;

--
-- Data for Name: material_comments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.material_comments DISABLE TRIGGER ALL;

COPY public.material_comments (id, "materialId", "userId", comment, "createdAt") FROM stdin;
\.


ALTER TABLE public.material_comments ENABLE TRIGGER ALL;

--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.notifications DISABLE TRIGGER ALL;

COPY public.notifications (id, "userId", type, title, message, channel, data, "sentAt", "readAt", "clickedAt", "deliveryStatus", "errorMessage", "createdAt") FROM stdin;
1f529cc2-ac33-4f17-95c2-0ab0cd444e09	20241a57-0978-4fb4-99ad-0094fb3d18f9	ENROLLMENT_APPROVED	Inscrição Aprovada!	Parabéns! Sua inscrição no curso Informática Básica (turma INF-SLZ-001) foi aprovada. Apresente-se no primeiro dia de aula com RG e comprovante de residência.	IN_APP	\N	2026-05-12 11:00:00	2026-05-13 11:00:00	\N	DELIVERED	\N	2026-05-14 12:35:05.049
d0e191df-6bda-499c-9234-38ff50c40d2f	20241a57-0978-4fb4-99ad-0094fb3d18f9	CLASS_REMINDER	Lembrete de Aula Amanhã	Seu curso de Informática Básica tem aula amanhã às 08h00. Local: Carreta Educacional TRK-001 — Av. Principal, São Luís.	IN_APP	\N	2026-05-12 11:00:00	2026-05-13 11:00:00	\N	DELIVERED	\N	2026-05-14 12:35:05.052
2bfabdc3-6eae-48fb-8885-38295c4e19f4	20241a57-0978-4fb4-99ad-0094fb3d18f9	CERTIFICATE_AVAILABLE	Certificado Disponível!	Seu certificado do curso Assistente Administrativo está disponível para download no portal.	IN_APP	\N	2026-05-12 11:00:00	2026-05-13 11:00:00	\N	DELIVERED	\N	2026-05-14 12:35:05.055
6340bdb4-7658-4149-9d9b-2d7736610c25	20241a57-0978-4fb4-99ad-0094fb3d18f9	MATERIAL_AVAILABLE	Novo Material Disponível	A professora Maria Silva publicou a Apostila Informática Básica — Módulo 1. Acesse na aba Materiais.	IN_APP	\N	2026-05-12 11:00:00	2026-05-13 11:00:00	\N	DELIVERED	\N	2026-05-14 12:35:05.057
6b918864-6fe3-4451-8dbf-021c6908c275	5a1cca76-527b-4d85-baf2-8a0129353b45	ENROLLMENT_RECEIVED	Nova Inscrição Recebida	Pedro Henrique Santos Oliveira se inscreveu no curso Informática Básica (turma INF-SLZ-001). Aguardando análise.	IN_APP	\N	2026-05-13 11:00:00	\N	\N	DELIVERED	\N	2026-05-14 12:35:05.06
e4d010e4-2e47-41e7-b12b-92fa42940e0e	b7048454-167c-4a7f-a06b-34f8b867b69b	CERTIFICATE_AVAILABLE	Certificado disponível	O seu certificado do curso Informática Básica está disponível no portal.	IN_APP	\N	2026-05-13 15:00:00	\N	\N	DELIVERED	\N	2026-05-14 12:35:05.195
15dd1a75-8135-4bde-9d07-2da8b6218bdd	b7048454-167c-4a7f-a06b-34f8b867b69b	CERTIFICATE_AVAILABLE	Certificado disponível	O seu certificado do curso Assistente Administrativo está disponível no portal.	IN_APP	\N	2026-05-13 15:00:00	\N	\N	DELIVERED	\N	2026-05-14 12:35:05.201
f92dd6cf-38fe-4cf3-af76-04e32f2f0dc9	5a1cca76-527b-4d85-baf2-8a0129353b45	GENERAL_ANNOUNCEMENT	Novo cadastro aguardando aprovação 🔔	Prof Teste FYM5UT1 se cadastrou como professor e aguarda sua aprovação.	IN_APP	{"link": "/admin/funcionarios"}	\N	\N	\N	PENDING	\N	2026-05-14 17:51:56.99
5727c6dd-87f9-4f7a-910c-37d0db80cc90	5a1cca76-527b-4d85-baf2-8a0129353b45	NEW_STUDENT_REGISTRATION	Novo aluno cadastrado 🎓	Aluno Teste 1 AVFB1UFN acabou de se cadastrar no sistema.	IN_APP	{"link": "/admin/inscricoes"}	\N	\N	\N	PENDING	\N	2026-05-14 17:51:59.123
58f1753a-4bcc-4275-b710-5d8624063d36	9cf80ceb-6ab0-4e30-8713-4150f6b9764f	NEW_STUDENT_REGISTRATION	Novo aluno cadastrado 🎓	Aluno Teste 1 AVFB1UFN acabou de se cadastrar no sistema.	IN_APP	{"link": "/admin/inscricoes"}	\N	\N	\N	PENDING	\N	2026-05-14 17:51:59.123
0b150bef-7df3-48c3-9bb8-b17cd18b0c35	5a1cca76-527b-4d85-baf2-8a0129353b45	NEW_STUDENT_REGISTRATION	Novo aluno cadastrado 🎓	Aluno Teste 2 1LD8ZP99 acabou de se cadastrar no sistema.	IN_APP	{"link": "/admin/inscricoes"}	\N	\N	\N	PENDING	\N	2026-05-14 17:52:01.222
c69bc516-aee6-4abb-9a47-44715f7a8043	9cf80ceb-6ab0-4e30-8713-4150f6b9764f	NEW_STUDENT_REGISTRATION	Novo aluno cadastrado 🎓	Aluno Teste 2 1LD8ZP99 acabou de se cadastrar no sistema.	IN_APP	{"link": "/admin/inscricoes"}	\N	\N	\N	PENDING	\N	2026-05-14 17:52:01.222
88784ed0-7023-4a39-b1c2-3d0c2072bb45	108d37e2-d5a0-4ddf-9f3b-4e486fe7986f	ENROLLMENT_APPROVED	Inscrição Aprovada! 🎉	Sua inscrição no curso "Excel Avançado" foi aprovada por Administrador Upgrade. Bom aprendizado!	IN_APP	{"link": "/student/enrollments", "actorName": "Administrador Upgrade", "actorUserId": "5a1cca76-527b-4d85-baf2-8a0129353b45"}	\N	\N	\N	PENDING	\N	2026-05-14 17:52:03.269
f935059c-d00b-4fe0-b4bc-a11deb278e1a	52784048-b87c-43ab-8bc4-22184ba2395b	ENROLLMENT_REJECTED	Inscrição não aprovada	Sua inscrição no curso "Excel Avançado" não foi aprovada por Administrador Upgrade. Motivo: Vagas esgotadas nesta turma — teste de email de rejeição	IN_APP	{"link": "/student/enrollments", "actorName": "Administrador Upgrade", "actorUserId": "5a1cca76-527b-4d85-baf2-8a0129353b45"}	\N	\N	\N	PENDING	\N	2026-05-14 17:52:05.317
8e294cdf-8527-40fc-930d-1a73534da31d	5d855437-7505-42ff-a8b6-82ea4892b405	GENERAL_ANNOUNCEMENT	Reembolso Aprovado ✅	Seu reembolso de R$ 220.00 foi aprovado por Administrador Upgrade.	IN_APP	{"link": "/teacher/reembolsos", "actorName": "Administrador Upgrade", "actorUserId": "5a1cca76-527b-4d85-baf2-8a0129353b45"}	\N	\N	\N	PENDING	\N	2026-05-14 20:03:44.244
d0d8ae19-d749-4aa7-8bd5-308382a3ca65	21c3d311-9147-48a5-a66b-d263df569c17	GENERAL_ANNOUNCEMENT	Reembolso não aprovado	Seu reembolso de R$ 145.90 não foi aprovado por Administrador Upgrade. Motivo: Comprovante ilegível — solicite nova foto da nota fiscal	IN_APP	{"link": "/teacher/reembolsos", "actorName": "Administrador Upgrade", "actorUserId": "5a1cca76-527b-4d85-baf2-8a0129353b45"}	\N	\N	\N	PENDING	\N	2026-05-14 20:03:44.782
\.


ALTER TABLE public.notifications ENABLE TRIGGER ALL;

--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.refresh_tokens DISABLE TRIGGER ALL;

COPY public.refresh_tokens (id, token, "userId", "expiresAt", "createdAt") FROM stdin;
13d624cf-d079-4a95-861c-73b5a16ec953	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YTFjY2E3Ni01MjdiLTRkODUtYmFmMi04YTAxMjkzNTNiNDUiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3Nzg3NjI2NjcsImV4cCI6MTc3OTM2NzQ2N30.isohbBu6XmosuE_ZLq7jjeclpbhiOqjq-oVT76-78ZI	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-21 12:44:27.838	2026-05-14 12:44:27.839
71c53479-e404-4e6a-8d18-a38aef3d3e9d	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YTFjY2E3Ni01MjdiLTRkODUtYmFmMi04YTAxMjkzNTNiNDUiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3Nzg3NjI2NzEsImV4cCI6MTc3OTM2NzQ3MX0.v81S82wTTkf7jd3y0HWXKG-oyZUVIacTs6xdmjTlCFs	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-21 12:44:31.997	2026-05-14 12:44:31.998
32856db8-12cc-4b53-8d9f-5963480dbd12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YTFjY2E3Ni01MjdiLTRkODUtYmFmMi04YTAxMjkzNTNiNDUiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3Nzg3ODAwNjUsImV4cCI6MTc3OTM4NDg2NX0.IXXfQYoBr2rvva5_Gv3iSlzjSK4Yfiv4ZhT8vTVEu98	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-21 17:34:25.455	2026-05-14 17:34:25.456
5a490b4d-dc77-4ac2-8961-dd1ef568d7e7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YTFjY2E3Ni01MjdiLTRkODUtYmFmMi04YTAxMjkzNTNiNDUiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3Nzg3ODA0NDgsImV4cCI6MTc3OTM4NTI0OH0.BRgZQuCLyxETCb5-Eh4TZk-Rqx9qMDOrhMsWRBpi1J0	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-21 17:40:48.102	2026-05-14 17:40:48.103
422d37f4-73ed-4c7b-81b5-a5df366d98a8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YTFjY2E3Ni01MjdiLTRkODUtYmFmMi04YTAxMjkzNTNiNDUiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3Nzg3ODA4NzIsImV4cCI6MTc3OTM4NTY3Mn0.mDQNKvSvs1UcH3lknn07faFpLoSJAYNicRaOh34e-TY	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-21 17:47:52.11	2026-05-14 17:47:52.111
c269bb60-a2c3-448a-9520-00e3209a457b	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YTFjY2E3Ni01MjdiLTRkODUtYmFmMi04YTAxMjkzNTNiNDUiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3Nzg3ODExMTMsImV4cCI6MTc3OTM4NTkxM30.CrlJ1kh8lT-Hb1stRPbrhJRgGFsjjX2ovfcl53rtB5g	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-21 17:51:53.5	2026-05-14 17:51:53.501
61fa353d-f3be-4fd3-b62a-be19b1758c37	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YTFjY2E3Ni01MjdiLTRkODUtYmFmMi04YTAxMjkzNTNiNDUiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3Nzg3ODc4OTYsImV4cCI6MTc3OTM5MjY5Nn0.PIPWo8CWyQA2joQuQ8IgTDNAMwwyRj6SIZN2GgnX0FQ	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-21 19:44:56.795	2026-05-14 19:44:56.797
828f51be-1d50-445c-a90e-e203b664ede8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YTFjY2E3Ni01MjdiLTRkODUtYmFmMi04YTAxMjkzNTNiNDUiLCJlbWFpbCI6ImFkbWluQHF1YWxpZmljYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3Nzg3ODkwMjQsImV4cCI6MTc3OTM5MzgyNH0.yZg8Hx43XilP6fEbzjC4hSlyC2xyoA-5jO9r-8G6uq0	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-21 20:03:44.057	2026-05-14 20:03:44.058
\.


ALTER TABLE public.refresh_tokens ENABLE TRIGGER ALL;

--
-- Data for Name: reimbursements; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.reimbursements DISABLE TRIGGER ALL;

COPY public.reimbursements (id, "requestedBy", "employeeId", "acaoId", type, amount, description, "receiptUrl", status, "approvedBy", "approvedAt", "rejectedAt", "rejectionReason", active, "createdAt", "updatedAt") FROM stdin;
4c4e3334-131b-46e1-8573-8bc2138eed1f	5d855437-7505-42ff-a8b6-82ea4892b405	653b7c2c-afb6-4809-96cb-5d0517f84a24	\N	FOOD	65.00	Alimentação durante viagem São Luís → Teresina — almoço em restaurante na BR-316		APPROVED	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-12 12:35:04.496	\N	\N	t	2026-05-14 12:35:04.497	2026-05-14 12:35:04.497
2c9edf2a-2acf-4b4f-9f39-215de97a2e41	5d855437-7505-42ff-a8b6-82ea4892b405	653b7c2c-afb6-4809-96cb-5d0517f84a24	\N	FOOD	350.00	Solicitação de alimentação sem comprovante válido — valor acima do limite da política de viagens		REJECTED	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-09 12:35:04.503	\N	\N	t	2026-05-14 12:35:04.503	2026-05-14 12:35:04.503
83aa815a-5caf-4527-8a5d-f4f5e1da3dd8	21c3d311-9147-48a5-a66b-d263df569c17	a9b6ad93-f184-4760-8f72-0e339f92c34d	\N	CLEANING_MATERIAL	68.50	Material de limpeza para sala de aula — detergente, álcool 70% e pano de chão		APPROVED	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-11 11:00:00	\N	\N	t	2026-05-14 12:35:05.047	2026-05-14 12:35:05.047
ce66b440-18bd-4063-bc53-36c417da6eb8	5d855437-7505-42ff-a8b6-82ea4892b405	653b7c2c-afb6-4809-96cb-5d0517f84a24	\N	EMERGENCY_REPAIR	220.00	Troca emergencial de pneu furado km 347 da BR-316 — compra comprovada por nota fiscal		APPROVED	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 20:03:44.231	\N	\N	t	2026-05-14 12:35:04.5	2026-05-14 20:03:44.232
7d37abe7-2dc7-42f9-b88e-40b983c56318	21c3d311-9147-48a5-a66b-d263df569c17	a9b6ad93-f184-4760-8f72-0e339f92c34d	\N	CLASSROOM_MATERIAL	145.90	Material de aula — 2 caixas de marcador para lousa, papel sulfite A4 e canetas para atividades práticas		REJECTED	5a1cca76-527b-4d85-baf2-8a0129353b45	\N	2026-05-14 20:03:44.77	Comprovante ilegível — solicite nova foto da nota fiscal	t	2026-05-14 12:35:05.045	2026-05-14 20:03:44.77
\.


ALTER TABLE public.reimbursements ENABLE TRIGGER ALL;

--
-- Data for Name: stock_purchase_requests; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.stock_purchase_requests DISABLE TRIGGER ALL;

COPY public.stock_purchase_requests (id, "stockItemId", quantidade, "precoUnitario", "valorTotal", fornecedor, urgente, justificativa, "comprovanteUrl", status, "requestedBy", "reviewedBy", "reviewedAt", "reviewNote", "contaPagarId", "movementId", active, "createdAt", "updatedAt") FROM stdin;
099c715d-5775-4c9d-9462-6cc559f3b1a4	7c4c4f1e-361b-48cd-b2ca-a31bace6fea5	10.000	50.00	500.00	Governo do Piaui	t	Apostila de Ensino para proximas aulas	\N	RECEBIDA	5a1cca76-527b-4d85-baf2-8a0129353b45	5a1cca76-527b-4d85-baf2-8a0129353b45	2026-05-14 18:32:24.301	\N	b8b916d3-c003-4f58-9410-9f428eb917d3	efea81f9-ba91-4e8c-95f9-2026504ce281	t	2026-05-14 18:31:44.113	2026-05-14 18:32:33.657
\.


ALTER TABLE public.stock_purchase_requests ENABLE TRIGGER ALL;

--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.stock_movements DISABLE TRIGGER ALL;

COPY public.stock_movements (id, type, "stockItemId", quantidade, "fromTruckId", "toTruckId", "acaoId", "purchaseRequestId", "registeredBy", observacao, "createdAt") FROM stdin;
efea81f9-ba91-4e8c-95f9-2026504ce281	ENCOMENDA	7c4c4f1e-361b-48cd-b2ca-a31bace6fea5	10.000	\N	\N	\N	099c715d-5775-4c9d-9462-6cc559f3b1a4	5a1cca76-527b-4d85-baf2-8a0129353b45	Encomenda aprovada. Aguardando recebimento/pagamento da ContaPagar b8b916d3.	2026-05-14 18:32:24.299
d0855cb5-8a87-4528-b0cc-d55897a9df15	REPOSICAO	7c4c4f1e-361b-48cd-b2ca-a31bace6fea5	10.000	\N	\N	\N	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	Recebimento automático — ContaPagar b8b916d3 paga. PR 099c715d.	2026-05-14 18:32:33.655
f591be78-66d4-462e-ac0a-c0e19163c86b	ENTRADA	7c4c4f1e-361b-48cd-b2ca-a31bace6fea5	5.000	\N	1a064a1d-879b-4e4c-bbea-db7c12618804	\N	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	\N	2026-05-14 18:33:06.734
6163fe99-84cc-4119-a846-ee0552ad2f93	ENTRADA	7c4c4f1e-361b-48cd-b2ca-a31bace6fea5	4.000	\N	b35dbe07-7bf5-4924-8294-ab49cb2504b1	\N	\N	5a1cca76-527b-4d85-baf2-8a0129353b45	\N	2026-05-14 18:33:14.913
\.


ALTER TABLE public.stock_movements ENABLE TRIGGER ALL;

--
-- Data for Name: student_addresses; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.student_addresses DISABLE TRIGGER ALL;

COPY public.student_addresses (id, "studentId", cep, street, number, complement, neighborhood, city, state, zone) FROM stdin;
492bd4bc-8a67-4de5-ac36-abd2fd837925	b0111155-7955-4014-935e-8ef0c6033ae9	65073-460	Rua Duque Bacelo	s/n	\N	Quintas do Calhau	São Luís	MA	URBAN
25f616e1-cbf2-42d3-b416-b3e4c45db684	19f40ea7-5935-4f6e-ae14-bc63a7ff9303	64050-330	Rua Álvaro Mendes	1204	\N	Centro	Teresina	PI	URBAN
685cd3f1-c847-4c45-bd68-d72002033b4c	9d7d167c-09e5-4aee-b444-868b258edcf1	65903-390	Av. Getúlio Vargas	305	\N	Jardim Imperial	Imperatriz	MA	URBAN
5d09e273-9a29-4974-8b70-dfe6cecaa8d1	ad56fc40-476c-452a-b0f0-614baa860460	65000000	Rua Teste	100	\N	Centro	São Luís	MA	URBAN
fae32e42-c669-4374-8cee-b6701536ce3d	0ac40339-9816-42d1-b3c8-4a51414e0ddb	65000000	Rua Teste	100	\N	Centro	São Luís	MA	URBAN
\.


ALTER TABLE public.student_addresses ENABLE TRIGGER ALL;

--
-- Data for Name: student_contacts; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.student_contacts DISABLE TRIGGER ALL;

COPY public.student_contacts (id, "studentId", email, phone, "hasWhatsapp", "phoneAlt", "allowWhatsappContact", "allowEmailContact") FROM stdin;
0064514f-4571-4a67-a949-acae15fcc265	b0111155-7955-4014-935e-8ef0c6033ae9	davi.martins@qualifica.com	(98) 98970-1346	t	\N	t	t
5b3761b9-932c-4810-8951-d1959d94af90	19f40ea7-5935-4f6e-ae14-bc63a7ff9303	ana.lima@qualifica.com	(86) 99201-7788	t	\N	t	t
124595d7-e57d-44e7-a922-b3f2ce5b2add	9d7d167c-09e5-4aee-b444-868b258edcf1	pedro.santos@qualifica.com	(98) 99302-4433	t	\N	t	t
9680c157-1858-46c3-bf47-181da516ddd4	ad56fc40-476c-452a-b0f0-614baa860460	aluno1.avfb1ufn@teste-upgrade.com	98988880000	t	\N	t	t
4d55956f-4de8-475d-bca0-da067413457e	0ac40339-9816-42d1-b3c8-4a51414e0ddb	aluno2.1ld8zp99@teste-upgrade.com	98988880000	t	\N	t	t
\.


ALTER TABLE public.student_contacts ENABLE TRIGGER ALL;

--
-- Data for Name: student_legal_consents; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.student_legal_consents DISABLE TRIGGER ALL;

COPY public.student_legal_consents (id, "studentId", "enrollmentId", "termsAccepted", "dataProcessingConsent", "imageUseAuthorization", "attendanceCommitment", "privacyPolicyAccepted", "recordedAt", "ipAddress", "userAgent") FROM stdin;
ab08476b-191d-4fb2-9b9f-e34806f9cb9f	ad56fc40-476c-452a-b0f0-614baa860460	af39d775-b737-4bb5-8398-e2b3013a5713	t	t	t	t	t	2026-05-14 17:51:59.115	::ffff:127.0.0.1	python-requests/2.32.4
eba9ca50-0e3b-40bb-ac12-79e3915b3d5d	0ac40339-9816-42d1-b3c8-4a51414e0ddb	2d48c035-818d-462a-b157-359099e0f3f0	t	t	t	t	t	2026-05-14 17:52:01.208	::ffff:127.0.0.1	python-requests/2.32.4
\.


ALTER TABLE public.student_legal_consents ENABLE TRIGGER ALL;

--
-- Data for Name: student_professional; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.student_professional DISABLE TRIGGER ALL;

COPY public.student_professional (id, "studentId", "previousQualification", "professionalInterest", "howHeardAbout", motivation, "careerGoal") FROM stdin;
9236b294-a212-4c9b-ae34-9681f643420a	b0111155-7955-4014-935e-8ef0c6033ae9	\N	\N	Indicação de amigo	Quero me qualificar profissionalmente e conseguir um emprego melhor	ENTREPRENEURSHIP
194b2e5c-7f1c-464c-b8fd-03fea1138a1e	19f40ea7-5935-4f6e-ae14-bc63a7ff9303	\N	\N	Indicação de amigo	Quero me qualificar profissionalmente e conseguir um emprego melhor	SEEK_EMPLOYMENT
8ef551e9-42a2-497d-bd79-29c60f2363d1	9d7d167c-09e5-4aee-b444-868b258edcf1	\N	\N	Indicação de amigo	Quero me qualificar profissionalmente e conseguir um emprego melhor	SEEK_EMPLOYMENT
87b539d9-91bb-47e4-b536-da6f7959ff7a	ad56fc40-476c-452a-b0f0-614baa860460	Nenhuma	Tecnologia	SOCIAL_MEDIA	\N	SEEK_EMPLOYMENT
4186b401-126c-4c18-b77c-5679b48415de	0ac40339-9816-42d1-b3c8-4a51414e0ddb	Nenhuma	Tecnologia	SOCIAL_MEDIA	\N	SEEK_EMPLOYMENT
\.


ALTER TABLE public.student_professional ENABLE TRIGGER ALL;

--
-- Data for Name: student_socioeconomic; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.student_socioeconomic DISABLE TRIGGER ALL;

COPY public.student_socioeconomic (id, "studentId", "educationLevel", "employmentStatus", "familyMembersCount", "socialProgram", "hasDisability", "disabilityType", "disabilityAdaptation", "familyIncome", "publicSchoolOnly") FROM stdin;
e3121ebe-6501-441b-a91a-a85288674a0d	b0111155-7955-4014-935e-8ef0c6033ae9	HIGH_SCHOOL_COMPLETE	UNEMPLOYED	4	BOLSA_FAMILIA	f	\N	\N	UP_TO_1_MW	f
ca089334-5c60-43c4-9636-c0f8ddbedacf	19f40ea7-5935-4f6e-ae14-bc63a7ff9303	HIGHER_INCOMPLETE	STUDENT	3	NONE	f	\N	\N	FROM_1_TO_2_MW	t
22d9e346-317b-4406-a9b0-0085b03a0a87	9d7d167c-09e5-4aee-b444-868b258edcf1	HIGH_SCHOOL_COMPLETE	SELF_EMPLOYED	5	NONE	f	\N	\N	FROM_1_TO_2_MW	f
9ac48d14-cddb-4102-be33-c392a2110d6c	ad56fc40-476c-452a-b0f0-614baa860460	HIGH_SCHOOL_COMPLETE	UNEMPLOYED	3	NONE	f	\N	\N	UP_TO_1_MW	f
0bf4a4d3-b7be-40da-a728-052ef781ad5b	0ac40339-9816-42d1-b3c8-4a51414e0ddb	HIGH_SCHOOL_COMPLETE	UNEMPLOYED	3	NONE	f	\N	\N	UP_TO_1_MW	f
\.


ALTER TABLE public.student_socioeconomic ENABLE TRIGGER ALL;

--
-- Data for Name: system_configs; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.system_configs DISABLE TRIGGER ALL;

COPY public.system_configs (id, "configKey", "configValue", "dataType", description, "updatedBy", "updatedAt") FROM stdin;
\.


ALTER TABLE public.system_configs ENABLE TRIGGER ALL;

--
-- Data for Name: teacher_checkins; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.teacher_checkins DISABLE TRIGGER ALL;

COPY public.teacher_checkins (id, "userId", "checkedAt", date, note) FROM stdin;
32900e38-b934-4a57-8483-337a933248fd	21c3d311-9147-48a5-a66b-d263df569c17	2026-05-13 10:45:00	2026-05-13	\N
35b9f02b-6e01-4712-8e17-62110d71a9cd	21c3d311-9147-48a5-a66b-d263df569c17	2026-05-12 10:45:00	2026-05-12	Trânsito na Av. dos Holandeses
1de057df-ced3-4c6b-8fdf-5b75e0d47d6f	21c3d311-9147-48a5-a66b-d263df569c17	2026-05-11 10:45:00	2026-05-11	\N
\.


ALTER TABLE public.teacher_checkins ENABLE TRIGGER ALL;

--
-- Data for Name: teacher_courses; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.teacher_courses DISABLE TRIGGER ALL;

COPY public.teacher_courses (id, "teacherId", "courseId", "createdAt") FROM stdin;
357a7dba-8eeb-409b-bd23-4f847f95e11c	e680ac45-3531-46e4-810d-99bd48b0c4f9	5b16004c-f93b-4a35-8431-d7692b776492	2026-05-14 12:35:05.135
\.


ALTER TABLE public.teacher_courses ENABLE TRIGGER ALL;

--
-- Data for Name: truck_maintenances; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.truck_maintenances DISABLE TRIGGER ALL;

COPY public.truck_maintenances (id, "truckId", tipo, titulo, descricao, status, prioridade, "kmAtual", "kmProximo", "dataAgendada", "dataConclusao", "custoEstimado", "custoReal", "statusPagamento", fornecedor, responsavel, observacoes, "contaPagarId", "createdAt", "updatedAt") FROM stdin;
a1e8ef68-04a2-494d-8dba-6f543cdb2ee7	1a064a1d-879b-4e4c-bbea-db7c12618804	preventiva	Revisão 30.000 km — Óleo e Filtros	Troca de óleo do motor 15W-40, filtro de ar e filtro de combustível. Verificação de correias e mangueiras.	concluida	media	29800	35000	2026-04-14 12:35:04.386	2026-04-15 12:35:04.386	\N	850.00	pendente	Auto Peças São Luís	Oficina Central RR	\N	\N	2026-05-14 12:35:04.387	2026-05-14 12:35:04.387
aea4fad8-d92c-4490-915c-c4605b617e3c	1a064a1d-879b-4e4c-bbea-db7c12618804	corretiva	Revisão do Sistema de Freios ABS	Inspeção técnica do sistema ABS — pastilhas dianteiras com desgaste acima do limite. Em execução.	em_andamento	alta	31200	35000	2026-05-13 12:35:04.386	\N	380.00	\N	pendente	Mecânica Especializada MA	Oficina Central RR	\N	\N	2026-05-14 12:35:04.387	2026-05-14 12:35:04.387
24c80341-1827-44a7-9d84-93da1c5c033b	1a064a1d-879b-4e4c-bbea-db7c12618804	preventiva	Balanceamento e Alinhamento	Balanceamento dos 6 pneus e alinhamento de eixo dianteiro.	agendada	media	31200	35000	2026-05-28 12:35:04.386	\N	\N	\N	pendente	Pneus & Serviços MA	Oficina Central RR	\N	\N	2026-05-14 12:35:04.387	2026-05-14 12:35:04.387
\.


ALTER TABLE public.truck_maintenances ENABLE TRIGGER ALL;

--
-- Data for Name: truck_stock_items; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.truck_stock_items DISABLE TRIGGER ALL;

COPY public.truck_stock_items (id, "truckId", "stockItemId", "quantidadeAtual", "updatedAt", "createdAt") FROM stdin;
b6549bef-6e34-47d2-894c-9372139fd758	1a064a1d-879b-4e4c-bbea-db7c12618804	7c4c4f1e-361b-48cd-b2ca-a31bace6fea5	5.000	2026-05-14 18:33:06.73	2026-05-14 18:33:06.73
e5fdcf50-3514-45f3-a33d-abcde3e475e4	b35dbe07-7bf5-4924-8294-ab49cb2504b1	7c4c4f1e-361b-48cd-b2ca-a31bace6fea5	4.000	2026-05-14 18:33:14.91	2026-05-14 18:33:14.91
\.


ALTER TABLE public.truck_stock_items ENABLE TRIGGER ALL;

--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences DISABLE TRIGGER ALL;

COPY public.user_preferences (id, "userId", "notifEmail", "notifCertificado", "notifInscricao", "notifFrequencia", animacoes, "fonteGrande", "createdAt", "updatedAt") FROM stdin;
77e34604-6032-4c75-92bf-8391e67d65ae	5a1cca76-527b-4d85-baf2-8a0129353b45	t	t	t	t	t	f	2026-05-14 12:35:04.363	2026-05-14 12:35:04.363
ff23ac81-2d1e-44d8-8658-e2c2bb6f382e	21c3d311-9147-48a5-a66b-d263df569c17	t	t	t	t	t	f	2026-05-14 12:35:04.456	2026-05-14 12:35:04.456
3e3b199b-b17f-4f85-8d5a-f6675233aa69	75ac91cd-e117-49f9-8350-3a17b2c7396b	t	t	t	t	t	f	2026-05-14 12:35:04.461	2026-05-14 12:35:04.461
f0122672-8376-402b-80dc-481c14d48df0	5d855437-7505-42ff-a8b6-82ea4892b405	t	t	t	t	t	f	2026-05-14 12:35:04.474	2026-05-14 12:35:04.474
478c5790-7457-4967-a729-bc7899562c3d	20241a57-0978-4fb4-99ad-0094fb3d18f9	t	t	t	t	t	f	2026-05-14 12:35:04.552	2026-05-14 12:35:04.552
76b41198-604d-48c9-a155-4126985c4947	929f9cce-92f5-45f7-967f-b2c017136e7b	t	t	t	t	t	f	2026-05-14 12:35:04.572	2026-05-14 12:35:04.572
665ec107-a093-47c7-b828-04962af9bbfb	b7048454-167c-4a7f-a06b-34f8b867b69b	t	t	t	t	t	f	2026-05-14 12:35:04.586	2026-05-14 12:35:04.586
\.


ALTER TABLE public.user_preferences ENABLE TRIGGER ALL;

--
-- PostgreSQL database dump complete
--

\unrestrict 9hcoJdT13K07oVXLPRmpidyqvzsu5n79HV8TRL6tGc2a0DusBlloaVS1c1Nwwti

