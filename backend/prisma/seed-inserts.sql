--
-- PostgreSQL database dump
--

\restrict WphbgPhtpCy8O7NAzmoLYDfq6HA2h49evKjVbaPgGta4iiND0TQ3WCpdvacaCaH

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
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users VALUES ('21c3d311-9147-48a5-a66b-d263df569c17', 'maria.silva@qualifica.com', '$2b$10$36HrLvDxI/MC3X12XWNUZ.AHGrVfja/qYpS109cbNV0cBWIvLAkVK', 'Maria Silva Pereira', '(98) 99111-2233', 'TEACHER', true, '2026-05-14 12:35:04.441', '2026-05-14 12:35:04.441', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('75ac91cd-e117-49f9-8350-3a17b2c7396b', 'carlos.mendes@qualifica.com', '$2b$10$36HrLvDxI/MC3X12XWNUZ.AHGrVfja/qYpS109cbNV0cBWIvLAkVK', 'Carlos Eduardo Mendes', '(86) 99222-3344', 'TEACHER', true, '2026-05-14 12:35:04.45', '2026-05-14 12:35:04.45', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('5d855437-7505-42ff-a8b6-82ea4892b405', 'joao.motorista@qualifica.com', '$2b$10$36HrLvDxI/MC3X12XWNUZ.AHGrVfja/qYpS109cbNV0cBWIvLAkVK', 'João Batista Ferreira', '(98) 99333-4455', 'DRIVER', true, '2026-05-14 12:35:04.465', '2026-05-14 12:35:04.465', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('9cf80ceb-6ab0-4e30-8713-4150f6b9764f', 'lucia.coord@qualifica.com', '$2b$10$36HrLvDxI/MC3X12XWNUZ.AHGrVfja/qYpS109cbNV0cBWIvLAkVK', 'Lúcia Rodrigues Almeida', '(98) 99444-5566', 'COORDINATOR', true, '2026-05-14 12:35:04.511', '2026-05-14 12:35:04.511', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('20241a57-0978-4fb4-99ad-0094fb3d18f9', 'davi.martins@qualifica.com', '$2b$10$36HrLvDxI/MC3X12XWNUZ.AHGrVfja/qYpS109cbNV0cBWIvLAkVK', 'Davi Rhuan da Silva Martins', '(98) 98970-1346', 'STUDENT', true, '2026-05-14 12:35:04.549', '2026-05-14 12:35:04.549', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('929f9cce-92f5-45f7-967f-b2c017136e7b', 'ana.lima@qualifica.com', '$2b$10$36HrLvDxI/MC3X12XWNUZ.AHGrVfja/qYpS109cbNV0cBWIvLAkVK', 'Ana Beatriz Lima Fonseca', '(86) 99201-7788', 'STUDENT', true, '2026-05-14 12:35:04.569', '2026-05-14 12:35:04.569', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('b7048454-167c-4a7f-a06b-34f8b867b69b', 'pedro.santos@qualifica.com', '$2b$10$36HrLvDxI/MC3X12XWNUZ.AHGrVfja/qYpS109cbNV0cBWIvLAkVK', 'Pedro Henrique Santos Oliveira', '(98) 99302-4433', 'STUDENT', true, '2026-05-14 12:35:04.583', '2026-05-14 12:35:04.583', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('8b15a83f-3e6c-41f8-bfcc-6f02c94d4fcc', 'carlos.souza.demo@qualifica.com', '$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai', 'Carlos Souza', '(98) 99001-0001', 'DRIVER', true, '2026-05-14 12:35:05.26', '2026-05-14 12:35:05.26', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('7f651b73-8c01-4734-b2af-25e02638cc17', 'ana.lima.demo@qualifica.com', '$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai', 'Ana Lima', '(86) 99002-0002', 'DRIVER', true, '2026-05-14 12:35:05.283', '2026-05-14 12:35:05.283', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('cdbfd25f-d651-408c-b3ac-b42d2d6c736a', 'roberto.freitas.demo@qualifica.com', '$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai', 'Roberto Freitas', '(68) 99003-0003', 'DRIVER', true, '2026-05-14 12:35:05.299', '2026-05-14 12:35:05.299', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('baad3183-794d-44b4-a99d-7f794710b818', 'marina.costa.demo@qualifica.com', '$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai', 'Marina Costa', '(98) 99004-0004', 'DRIVER', true, '2026-05-14 12:35:05.317', '2026-05-14 12:35:05.317', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('86cf840d-a358-425d-b102-7b90ad6f1a5d', 'paulo.ramos.demo@qualifica.com', '$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai', 'Paulo Ramos', '(86) 99005-0005', 'DRIVER', true, '2026-05-14 12:35:05.339', '2026-05-14 12:35:05.339', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('7f7380d4-c9c1-40fb-90fb-516f39fbe5f0', 'fabio.nunes.demo@qualifica.com', '$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai', 'Fábio Nunes', '(68) 99006-0006', 'DRIVER', true, '2026-05-14 12:35:05.355', '2026-05-14 12:35:05.355', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('d0f246c1-e506-4f2b-a8a3-da26d3e221a8', 'lea.santos.demo@qualifica.com', '$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai', 'Léa Santos', '(98) 99007-0007', 'DRIVER', true, '2026-05-14 12:35:05.373', '2026-05-14 12:35:05.373', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('fb32b5ce-dbf8-4085-b7cb-e89e624dfb22', 'diego.alves.demo@qualifica.com', '$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai', 'Diego Alves', '(98) 99008-0008', 'DRIVER', true, '2026-05-14 12:35:05.389', '2026-05-14 12:35:05.389', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('c8d457d7-7113-4c56-a826-05201dec5869', 'tania.melo.demo@qualifica.com', '$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai', 'Tânia Melo', '(86) 99009-0009', 'DRIVER', true, '2026-05-14 12:35:05.406', '2026-05-14 12:35:05.406', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('a61d0671-a776-4800-86c8-d62114aec929', 'jonas.pires.demo@qualifica.com', '$2b$10$yz1/CCkVBzeBED9YhYQrj.V42ZVTbhSetCZOkZCy4e/DtKupQvqai', 'Jonas Pires', '(86) 99010-0010', 'DRIVER', true, '2026-05-14 12:35:05.419', '2026-05-14 12:35:05.419', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('5a1cca76-527b-4d85-baf2-8a0129353b45', 'admin@qualifica.com', '$2b$10$wRX6PgKrMd3ulaYae73EWepuXtzib3b4RzumteUfhewe6Edi5K69y', 'Administrador Upgrade', '(98) 98888-0000', 'ADMIN', true, '2026-05-14 12:35:04.359', '2026-05-14 20:03:44.053', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('ed1c0c59-7fe1-4013-b969-c9fd7fd720c4', 'prof.fym5ut1@escola-teste.com', '$2b$10$faX68tglQRkNJhdGBEW9oeQ8gJYcMzrUBbI1FN9euGhn/RFWaems6', 'Prof Teste FYM5UT1', '98999990000', 'TEACHER', false, '2026-05-14 17:51:56.974', '2026-05-14 17:51:56.974', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('108d37e2-d5a0-4ddf-9f3b-4e486fe7986f', 'aluno1.avfb1ufn@teste-upgrade.com', '$2b$10$mmVuRN.XaSdATfb8BdAE4eWJVjqsbWOYU9ckO0kXqDPuWG0LwId9u', 'Aluno Teste 1 AVFB1UFN', '98988880000', 'STUDENT', true, '2026-05-14 17:51:59.094', '2026-05-14 17:51:59.094', NULL, false, NULL, 0, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('52784048-b87c-43ab-8bc4-22184ba2395b', 'aluno2.1ld8zp99@teste-upgrade.com', '$2b$10$c87fwJwsV.BQFDla3yuE9uKSUWz6U6bFJdOIjgnMRpo85u946P5q6', 'Aluno Teste 2 1LD8ZP99', '98988880000', 'STUDENT', true, '2026-05-14 17:52:01.191', '2026-05-14 17:52:01.191', NULL, false, NULL, 0, NULL, NULL, false, false);


--
-- Data for Name: absences; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.absences VALUES ('847863a7-bc1e-4b59-8d92-f2d0acfec5f6', '5d855437-7505-42ff-a8b6-82ea4892b405', 'ILLNESS', '2026-03-30 12:35:04.506', 'Gripe forte com febre — atestado médico de 3 dias apresentado.', NULL, 'VALIDATED', 'Atestado válido. Ausência justificada.', NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-03-31 12:35:04.506', true, '2026-05-14 12:35:04.507', '2026-05-14 12:35:04.507');
INSERT INTO public.absences VALUES ('29af7733-fc85-49ec-8f6b-e5768f290e4f', '5d855437-7505-42ff-a8b6-82ea4892b405', 'PERSONAL', '2026-04-24 12:35:04.506', 'Ausência por motivo pessoal sem comprovante dentro do prazo regimental.', NULL, 'PENALIZED', 'Sem documento válido. Desconto de R$ 140,00 aplicado.', 140.00, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-04-25 12:35:04.506', true, '2026-05-14 12:35:04.507', '2026-05-14 12:35:04.507');
INSERT INTO public.absences VALUES ('5566af5b-7a73-45f0-8f32-d5ed6b3264cf', '5d855437-7505-42ff-a8b6-82ea4892b405', 'EMERGENCY', '2026-05-09 12:35:04.506', 'Emergência familiar — familiar hospitalizado. Aguardando boletim médico.', NULL, 'PENDING', NULL, NULL, NULL, NULL, true, '2026-05-14 12:35:04.507', '2026-05-14 12:35:04.507');
INSERT INTO public.absences VALUES ('4e02f6fc-59cc-4889-bf2d-a8a405136bf4', '21c3d311-9147-48a5-a66b-d263df569c17', 'ILLNESS', '2026-03-15 12:35:04.518', 'Gripe forte com atestado médico de 2 dias — impossível ministrar aulas.', NULL, 'VALIDATED', 'Atestado médico válido. Ausência justificada, sem impacto no pagamento.', NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-03-16 12:35:04.518', true, '2026-05-14 12:35:04.519', '2026-05-14 12:35:04.519');
INSERT INTO public.absences VALUES ('d69b1c0a-3d8e-43d6-9351-f5e372e8cd5b', '21c3d311-9147-48a5-a66b-d263df569c17', 'PERSONAL', '2026-04-14 12:35:04.518', 'Ausência por motivo pessoal. Nenhum documento apresentado no prazo.', NULL, 'PENALIZED', 'Desconto de R$ 200,00 aplicado conforme regulamento.', 200.00, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-04-15 12:35:04.518', true, '2026-05-14 12:35:04.519', '2026-05-14 12:35:04.519');
INSERT INTO public.absences VALUES ('f3a5afa2-fa5e-4a8c-a09a-5fe99a117a74', '21c3d311-9147-48a5-a66b-d263df569c17', 'EMERGENCY', '2026-05-11 12:35:04.518', 'Emergência familiar — filho hospitalizado. Aguardando documentação médica.', NULL, 'PENDING', NULL, NULL, NULL, NULL, true, '2026-05-14 12:35:04.519', '2026-05-14 12:35:04.519');


--
-- Data for Name: cities; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.cities VALUES ('f627826b-1705-467d-8e3e-52e1eb5bdaf2', 'São Luís', 'MA', '2111300', '2026-05-14 12:30:57.806', -2.5297, -44.3028);
INSERT INTO public.cities VALUES ('5bc1e825-7809-4a02-afff-c939c8b7b9e0', 'Imperatriz', 'MA', '2105302', '2026-05-14 12:30:57.81', -5.5261, -47.4916);
INSERT INTO public.cities VALUES ('362938b6-832a-480d-8287-df608be687cd', 'São José de Ribamar', 'MA', '2111201', '2026-05-14 12:30:57.812', -2.5506, -44.0583);
INSERT INTO public.cities VALUES ('4a8561d8-36b9-4539-a7d8-db0a2231797e', 'Timon', 'MA', '2112209', '2026-05-14 12:30:57.815', -5.0944, -42.8356);
INSERT INTO public.cities VALUES ('8304dd54-645b-44a3-820c-6105d4044492', 'Caxias', 'MA', '2103000', '2026-05-14 12:30:57.817', -4.8692, -43.3564);
INSERT INTO public.cities VALUES ('5553163b-82c2-4853-8379-a4c99aa7e6a3', 'Codó', 'MA', '2103307', '2026-05-14 12:30:57.82', -4.4497, -43.8842);
INSERT INTO public.cities VALUES ('db8b7af4-0f33-4947-afd4-2bbfbcb4e9c7', 'Paço do Lumiar', 'MA', '2107704', '2026-05-14 12:30:57.823', -2.5131, -44.1064);
INSERT INTO public.cities VALUES ('b19fd101-14df-4c8a-9620-1f7162647763', 'Açailândia', 'MA', '2100055', '2026-05-14 12:30:57.826', -4.9478, -47.5);
INSERT INTO public.cities VALUES ('8e49f2e5-1d3f-4ad8-8574-d2af355b41e6', 'Bacabal', 'MA', '2101202', '2026-05-14 12:30:57.829', -4.2244, -44.79);
INSERT INTO public.cities VALUES ('1b7dd96f-bbe1-4d8c-86c9-e50e2af5123e', 'Balsas', 'MA', '2101400', '2026-05-14 12:30:57.832', -7.5328, -46.0357);
INSERT INTO public.cities VALUES ('075bc61d-41b1-4ff6-8ae6-3ab57a2e9e33', 'Teresina', 'PI', '2211001', '2026-05-14 12:30:57.834', -5.0892, -42.8019);
INSERT INTO public.cities VALUES ('0d3d9cbe-f662-474f-a620-55978aa26ca6', 'Parnaíba', 'PI', '2207702', '2026-05-14 12:30:57.837', -2.9046, -41.7769);
INSERT INTO public.cities VALUES ('f26f8ef0-4f4d-4f3e-b3ae-279454425490', 'Picos', 'PI', '2208007', '2026-05-14 12:30:57.839', -7.0769, -41.4677);
INSERT INTO public.cities VALUES ('e1df1f45-79a2-4a9c-b070-2571ae27f9e1', 'Floriano', 'PI', '2203909', '2026-05-14 12:30:57.842', -6.7669, -43.0178);
INSERT INTO public.cities VALUES ('350872a7-74f0-4ed6-9cc3-3a0bd6d02381', 'Piripiri', 'PI', '2208304', '2026-05-14 12:30:57.844', -4.2706, -41.7767);
INSERT INTO public.cities VALUES ('ce2f7eb6-561f-4b4a-9fd1-907c7f96ac40', 'Campo Maior', 'PI', '2202251', '2026-05-14 12:30:57.846', -4.8233, -42.1689);
INSERT INTO public.cities VALUES ('11c2fab1-0909-4584-93b4-437e74a8d6b5', 'Barras', 'PI', '2201200', '2026-05-14 12:30:57.849', -4.2428, -42.2956);
INSERT INTO public.cities VALUES ('50b7aa74-c5c8-4899-9eec-86c8eeb9a6ac', 'Rio Branco', 'AC', '1200401', '2026-05-14 12:30:57.852', -9.9754, -67.8249);
INSERT INTO public.cities VALUES ('2a14df36-6faf-4192-ab52-d7c3405aab6c', 'Cruzeiro do Sul', 'AC', '1200203', '2026-05-14 12:30:57.854', -7.6308, -72.67);
INSERT INTO public.cities VALUES ('f2f0935b-fd83-447c-9941-43d05ca5d615', 'Senador Guiomard', 'AC', '1200450', '2026-05-14 12:30:57.857', -10.1533, -67.7367);


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.courses VALUES ('5b16004c-f93b-4a35-8431-d7692b776492', 'Informática Básica', 'Fundamentos de informática: Windows, Word, Excel e Internet.', 30, 30, 120, 'Ensino fundamental completo', 'Módulo 1: Windows
Módulo 2: Word
Módulo 3: Excel
Módulo 4: Internet', true, true, false, true, '2026-05-14 12:35:04.338', '2026-05-14 12:35:04.338', '00000000-0000-4000-8000-000000000001');
INSERT INTO public.courses VALUES ('d48e28c0-9696-49ce-9176-8e78354935be', 'Excel Avançado', 'Fórmulas avançadas, tabelas dinâmicas e macros VBA.', 20, 20, 80, 'Informática Básica', 'Módulo 1: Fórmulas
Módulo 2: Tabelas Dinâmicas
Módulo 3: Macros', true, true, false, true, '2026-05-14 12:35:04.342', '2026-05-14 12:35:04.342', '00000000-0000-4000-8000-000000000001');
INSERT INTO public.courses VALUES ('2fd3f750-c0d1-485d-a21f-993e81686bd5', 'Assistente Administrativo', 'Formação completa para atuação em rotinas administrativas.', 45, 45, 180, 'Ensino médio completo', 'Módulo 1: Rotinas
Módulo 2: Atendimento
Módulo 3: Documentos
Módulo 4: Informática', true, true, false, true, '2026-05-14 12:35:04.346', '2026-05-14 12:35:04.346', '00000000-0000-4000-8000-000000000001');
INSERT INTO public.courses VALUES ('ee4212df-a4aa-421b-86ef-1cf5c8651c99', 'Operador de Caixa', 'Capacitação para atuar no varejo como operador de caixa.', 15, 15, 60, 'Ensino fundamental completo', 'Módulo 1: Atendimento
Módulo 2: Operação
Módulo 3: Segurança', true, true, false, true, '2026-05-14 12:35:04.35', '2026-05-14 12:35:04.35', '00000000-0000-4000-8000-000000000001');
INSERT INTO public.courses VALUES ('16d7e281-97f2-4496-94ac-28fad1ff9155', 'Marketing Digital', 'Estratégias de marketing em redes sociais e plataformas digitais.', 30, 30, 120, 'Informática básica', 'Módulo 1: Fundamentos
Módulo 2: Redes Sociais
Módulo 3: Google Ads', true, true, false, true, '2026-05-14 12:35:04.353', '2026-05-14 12:35:04.353', '00000000-0000-4000-8000-000000000001');
INSERT INTO public.courses VALUES ('447f01bf-5cd9-4296-b71d-b3810939925a', 'Empreendedorismo', 'Como abrir, planejar e gerenciar o próprio negócio.', 25, 25, 100, 'Ensino médio completo', 'Módulo 1: Plano de Negócios
Módulo 2: Finanças
Módulo 3: Marketing
Módulo 4: Gestão', true, true, false, true, '2026-05-14 12:35:04.356', '2026-05-14 12:35:04.356', '00000000-0000-4000-8000-000000000001');


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.groups VALUES ('23207d18-e4f1-4756-977d-2c610883c01f', 'Grupo 1 MA', 'MA', '2026-05-14 12:30:57.778');
INSERT INTO public.groups VALUES ('4329f227-504c-4e5d-a126-5960471470d5', 'Grupo 2 MA', 'MA', '2026-05-14 12:30:57.789');
INSERT INTO public.groups VALUES ('8e14e422-ab59-46a4-bdf3-f397ca447cab', 'Grupo 1 PI', 'PI', '2026-05-14 12:30:57.794');
INSERT INTO public.groups VALUES ('cd8eb570-9e71-4722-b5ad-71014de5de98', 'Grupo 1 AC', 'AC', '2026-05-14 12:30:57.799');


--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.classes VALUES ('4a737790-9d68-4cc7-a17b-ebeb949dc31c', '5b16004c-f93b-4a35-8431-d7692b776492', '23207d18-e4f1-4756-977d-2c610883c01f', 'f627826b-1705-467d-8e3e-52e1eb5bdaf2', 'INF-SLZ-001', '2026-04-24 11:00:00', '2026-05-24 11:00:00', 'MORNING', '08:00', '12:00', 40, '1a064a1d-879b-4e4c-bbea-db7c12618804', 'IN_PROGRESS', NULL, NULL, '2026-05-14 12:35:04.604', '2026-05-14 12:35:04.604', 4, NULL, NULL, NULL, NULL, NULL, 'FOLLOW_SCHEDULE', NULL, NULL, NULL, NULL, 'INTERCIDADE');
INSERT INTO public.classes VALUES ('818c991f-c56f-4bce-bc8a-3891f9a8eabe', 'd48e28c0-9696-49ce-9176-8e78354935be', '8e14e422-ab59-46a4-bdf3-f397ca447cab', '075bc61d-41b1-4ff6-8ae6-3ab57a2e9e33', 'EXC-TER-001', '2026-05-21 11:00:00', '2026-06-10 11:00:00', 'AFTERNOON', '14:00', '18:00', 35, 'b35dbe07-7bf5-4924-8294-ab49cb2504b1', 'ENROLLMENT_OPEN', NULL, NULL, '2026-05-14 12:35:04.608', '2026-05-14 12:35:04.608', 4, NULL, NULL, NULL, NULL, NULL, 'FOLLOW_SCHEDULE', NULL, NULL, NULL, NULL, 'INTERCIDADE');
INSERT INTO public.classes VALUES ('139a2cba-69de-4ada-ba86-9df5f834be09', '2fd3f750-c0d1-485d-a21f-993e81686bd5', '23207d18-e4f1-4756-977d-2c610883c01f', 'f627826b-1705-467d-8e3e-52e1eb5bdaf2', 'ADM-SLZ-001', '2026-03-15 11:00:00', '2026-05-09 11:00:00', 'EVENING', '18:30', '22:00', 30, '1a064a1d-879b-4e4c-bbea-db7c12618804', 'COMPLETED', NULL, NULL, '2026-05-14 12:35:04.612', '2026-05-14 12:35:04.612', 4, NULL, NULL, NULL, NULL, NULL, 'FOLLOW_SCHEDULE', NULL, NULL, NULL, NULL, 'INTERCIDADE');
INSERT INTO public.classes VALUES ('f496a94d-a0ab-4c8e-8806-9d628c2eb104', '16d7e281-97f2-4496-94ac-28fad1ff9155', '23207d18-e4f1-4756-977d-2c610883c01f', '5bc1e825-7809-4a02-afff-c939c8b7b9e0', 'MKT-IMP-001', '2026-06-13 11:00:00', '2026-07-13 11:00:00', 'MORNING', '08:00', '12:00', 40, '1a064a1d-879b-4e4c-bbea-db7c12618804', 'PLANNED', NULL, NULL, '2026-05-14 12:35:04.615', '2026-05-14 12:35:04.615', 4, NULL, NULL, NULL, NULL, NULL, 'FOLLOW_SCHEDULE', NULL, NULL, NULL, NULL, 'INTERCIDADE');


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.students VALUES ('b0111155-7955-4014-935e-8ef0c6033ae9', '20241a57-0978-4fb4-99ad-0094fb3d18f9', '615.648.503-80', '2005-04-27 00:00:00', 'MALE', 'BROWN', 'SINGLE', 'Francisca das Chagas Silva Martins', NULL, 'Brasileiro', 'São Luís', 'MA', NULL, '2026-05-14 12:35:04.557', '2026-05-14 12:35:04.557', true, NULL, NULL);
INSERT INTO public.students VALUES ('19f40ea7-5935-4f6e-ae14-bc63a7ff9303', '929f9cce-92f5-45f7-967f-b2c017136e7b', '321.987.654-11', '1999-11-15 00:00:00', 'FEMALE', 'BLACK', 'SINGLE', 'Raimunda de Lima', NULL, 'Brasileira', 'Teresina', 'PI', NULL, '2026-05-14 12:35:04.577', '2026-05-14 12:35:04.577', true, NULL, NULL);
INSERT INTO public.students VALUES ('9d7d167c-09e5-4aee-b444-868b258edcf1', 'b7048454-167c-4a7f-a06b-34f8b867b69b', '987.654.321-00', '2001-06-30 00:00:00', 'MALE', 'BROWN', 'SINGLE', 'Conceição Maria Santos', NULL, 'Brasileiro', 'Imperatriz', 'MA', NULL, '2026-05-14 12:35:04.591', '2026-05-14 12:35:05.006', true, NULL, '{"photo": "https://placehold.co/1080x1350/png?text=Selfie+Pedro+UPGRADE", "cpfDoc": "https://placehold.co/1400x900/png?text=CPF+Pedro", "identidade": "https://placehold.co/1400x900/png?text=RG+Pedro+UPGRADE", "addressProof": "https://placehold.co/1400x900/png?text=Comprovante+Residencia+Pedro", "educationProof": "https://placehold.co/1400x900/png?text=Comprovante+Escolaridade+Pedro"}');
INSERT INTO public.students VALUES ('ad56fc40-476c-452a-b0f0-614baa860460', '108d37e2-d5a0-4ddf-9f3b-4e486fe7986f', '61723835113', '2000-03-10 00:00:00', 'FEMALE', 'BROWN', 'SINGLE', 'Maria Silva', 'João Silva', 'Brasileira', 'São Luís', 'MA', NULL, '2026-05-14 17:51:59.097', '2026-05-14 17:51:59.097', true, NULL, '{}');
INSERT INTO public.students VALUES ('0ac40339-9816-42d1-b3c8-4a51414e0ddb', '52784048-b87c-43ab-8bc4-22184ba2395b', '57459197860', '2000-03-10 00:00:00', 'FEMALE', 'BROWN', 'SINGLE', 'Maria Silva', 'João Silva', 'Brasileira', 'São Luís', 'MA', NULL, '2026-05-14 17:52:01.193', '2026-05-14 17:52:01.193', true, NULL, '{}');


--
-- Data for Name: attendances; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.attendances VALUES ('664a7a50-230a-4a4a-a2ca-c023ced78403', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'b0111155-7955-4014-935e-8ef0c6033ae9', '2026-04-24 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.667', '2026-05-14 12:35:04.667', NULL, NULL);
INSERT INTO public.attendances VALUES ('0b284aca-9b2e-42b4-b46f-9135e7dc3c92', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'b0111155-7955-4014-935e-8ef0c6033ae9', '2026-04-27 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.674', '2026-05-14 12:35:04.674', NULL, NULL);
INSERT INTO public.attendances VALUES ('b4cda96f-146e-4d57-a4bb-f2b38789b0d2', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'b0111155-7955-4014-935e-8ef0c6033ae9', '2026-04-28 11:00:00', false, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.678', '2026-05-14 12:35:04.678', NULL, NULL);
INSERT INTO public.attendances VALUES ('a76a50c2-61c8-4378-8159-2af436286590', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'b0111155-7955-4014-935e-8ef0c6033ae9', '2026-04-29 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.684', '2026-05-14 12:35:04.684', NULL, NULL);
INSERT INTO public.attendances VALUES ('cf17acd9-cfe6-4a83-a5fa-4565b8ced81e', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'b0111155-7955-4014-935e-8ef0c6033ae9', '2026-04-30 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.689', '2026-05-14 12:35:04.689', NULL, NULL);
INSERT INTO public.attendances VALUES ('1b3cbcb0-ca25-4926-a844-030aabaaefff', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'b0111155-7955-4014-935e-8ef0c6033ae9', '2026-05-01 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.694', '2026-05-14 12:35:04.694', NULL, NULL);
INSERT INTO public.attendances VALUES ('07afefea-dfed-4c36-8448-d1bbfb620a4b', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'b0111155-7955-4014-935e-8ef0c6033ae9', '2026-05-04 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.697', '2026-05-14 12:35:04.697', NULL, NULL);
INSERT INTO public.attendances VALUES ('75390280-bd09-4c1d-8869-e8645682fab2', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'b0111155-7955-4014-935e-8ef0c6033ae9', '2026-05-05 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.702', '2026-05-14 12:35:04.702', NULL, NULL);
INSERT INTO public.attendances VALUES ('dd8ad012-e4e2-4cd4-bbe7-246102b3ac06', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'b0111155-7955-4014-935e-8ef0c6033ae9', '2026-05-06 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.706', '2026-05-14 12:35:04.706', NULL, NULL);
INSERT INTO public.attendances VALUES ('6ccdc635-d55d-4f4f-a3ff-b4df6d598cc3', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'b0111155-7955-4014-935e-8ef0c6033ae9', '2026-05-07 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.71', '2026-05-14 12:35:04.71', NULL, NULL);
INSERT INTO public.attendances VALUES ('4becd8e8-d760-4035-aafd-74856a74f0e7', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'b0111155-7955-4014-935e-8ef0c6033ae9', '2026-05-08 11:00:00', false, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.713', '2026-05-14 12:35:04.713', NULL, NULL);
INSERT INTO public.attendances VALUES ('99602f18-b3f9-4f69-aea8-ec6c42da3d90', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'b0111155-7955-4014-935e-8ef0c6033ae9', '2026-05-11 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.718', '2026-05-14 12:35:04.718', NULL, NULL);
INSERT INTO public.attendances VALUES ('d22f8d08-444d-413e-b5fd-18be95376c8c', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'b0111155-7955-4014-935e-8ef0c6033ae9', '2026-05-12 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.724', '2026-05-14 12:35:04.724', NULL, NULL);
INSERT INTO public.attendances VALUES ('65c95849-b49b-429c-9c7a-6a96f0e7e030', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'b0111155-7955-4014-935e-8ef0c6033ae9', '2026-05-13 11:00:00', false, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.729', '2026-05-14 12:35:04.729', NULL, NULL);
INSERT INTO public.attendances VALUES ('9d33bb6a-8a90-49c4-99ae-fd2088dcd123', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-22 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.76', '2026-05-14 12:35:04.76', NULL, NULL);
INSERT INTO public.attendances VALUES ('b6abf193-a8b4-40c2-84bf-03e5d2f061cb', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-23 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.764', '2026-05-14 12:35:04.764', NULL, NULL);
INSERT INTO public.attendances VALUES ('1ef7f3a5-e168-4bcd-bd11-a061aca7d68f', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-24 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.768', '2026-05-14 12:35:04.768', NULL, NULL);
INSERT INTO public.attendances VALUES ('cf2718d9-1fe7-45f4-8d4d-aec6bc274a4c', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-27 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.772', '2026-05-14 12:35:04.772', NULL, NULL);
INSERT INTO public.attendances VALUES ('6f558aa0-a72c-4dd4-b8e4-b11d6a7ad1f4', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-28 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.776', '2026-05-14 12:35:04.776', NULL, NULL);
INSERT INTO public.attendances VALUES ('79690157-de6d-4993-9422-39ce6798afae', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-29 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.78', '2026-05-14 12:35:04.78', NULL, NULL);
INSERT INTO public.attendances VALUES ('b459effb-b26b-4372-84bd-940ebfc83557', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-30 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.784', '2026-05-14 12:35:04.784', NULL, NULL);
INSERT INTO public.attendances VALUES ('5efb2f60-629e-440c-b818-8ebb021ffd66', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-05-01 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.788', '2026-05-14 12:35:04.788', NULL, NULL);
INSERT INTO public.attendances VALUES ('2bccf873-beb3-4eee-bdc4-d54d2904eb18', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-05-04 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.792', '2026-05-14 12:35:04.792', NULL, NULL);
INSERT INTO public.attendances VALUES ('0c09e012-9173-431e-a8fc-292d5445d2da', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-05-05 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.797', '2026-05-14 12:35:04.797', NULL, NULL);
INSERT INTO public.attendances VALUES ('8e58ce6b-3f64-4d35-9e22-f7f2d2da6b53', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-05-06 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.8', '2026-05-14 12:35:04.8', NULL, NULL);
INSERT INTO public.attendances VALUES ('2a058fd0-3f15-4e4f-834d-4520c0c586d7', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-05-07 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.805', '2026-05-14 12:35:04.805', NULL, NULL);
INSERT INTO public.attendances VALUES ('1225ac90-8ac4-483a-acfc-138912e5621a', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-05-08 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.808', '2026-05-14 12:35:04.808', NULL, NULL);
INSERT INTO public.attendances VALUES ('8388553f-2919-4744-adfa-5f9b0a27782f', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-05-11 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.813', '2026-05-14 12:35:04.813', NULL, NULL);
INSERT INTO public.attendances VALUES ('5fd86f13-0707-4990-818f-683f9950ec8f', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-05-12 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.816', '2026-05-14 12:35:04.816', NULL, NULL);
INSERT INTO public.attendances VALUES ('1c42184e-c089-45f2-a35b-0497ad05b4fa', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-05-13 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.821', '2026-05-14 12:35:04.821', NULL, NULL);
INSERT INTO public.attendances VALUES ('d36e5f9a-27fb-421a-ab89-755a95ff5808', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-03-16 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.825', '2026-05-14 12:35:04.825', NULL, NULL);
INSERT INTO public.attendances VALUES ('80c4bf90-ac4c-4a74-a94a-cffa9a6adb15', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-03-17 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.829', '2026-05-14 12:35:04.829', NULL, NULL);
INSERT INTO public.attendances VALUES ('ada33cf7-f58f-4256-8b21-53f139ace4a1', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-03-18 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.833', '2026-05-14 12:35:04.833', NULL, NULL);
INSERT INTO public.attendances VALUES ('7bb2c8f3-a1a5-4230-a724-b98775878f2c', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-03-19 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.838', '2026-05-14 12:35:04.838', NULL, NULL);
INSERT INTO public.attendances VALUES ('84efff44-d3b6-4fdd-894a-143daeeb42e9', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-03-20 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.842', '2026-05-14 12:35:04.842', NULL, NULL);
INSERT INTO public.attendances VALUES ('9a28f8d5-bbc3-4fce-9e61-b77513748368', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-03-23 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.848', '2026-05-14 12:35:04.848', NULL, NULL);
INSERT INTO public.attendances VALUES ('ba3e3c33-23e6-4665-98fa-39f547e86e12', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-03-24 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.852', '2026-05-14 12:35:04.852', NULL, NULL);
INSERT INTO public.attendances VALUES ('aabccb6c-e736-40b8-9337-4cf54eed4ab7', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-03-25 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.857', '2026-05-14 12:35:04.857', NULL, NULL);
INSERT INTO public.attendances VALUES ('00f71713-cc0b-4ed3-86f2-8f05b62585e7', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-03-26 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.861', '2026-05-14 12:35:04.861', NULL, NULL);
INSERT INTO public.attendances VALUES ('89c0f4a9-a166-4ceb-8792-87897cc2468f', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-03-27 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.865', '2026-05-14 12:35:04.865', NULL, NULL);
INSERT INTO public.attendances VALUES ('fd591e6f-809f-4d06-94f2-9991cf1de2af', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-03-30 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.87', '2026-05-14 12:35:04.87', NULL, NULL);
INSERT INTO public.attendances VALUES ('97ca6476-17d1-4b34-a879-0f93ae3b9c68', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-03-31 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.874', '2026-05-14 12:35:04.874', NULL, NULL);
INSERT INTO public.attendances VALUES ('39d112ae-abf5-4913-aab5-644975b525f7', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-01 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.878', '2026-05-14 12:35:04.878', NULL, NULL);
INSERT INTO public.attendances VALUES ('10bbbe6d-9eca-4f56-9ca3-f4337e6d7864', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-02 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.883', '2026-05-14 12:35:04.883', NULL, NULL);
INSERT INTO public.attendances VALUES ('7e53c7ad-2779-428f-88b9-1debc931eb0c', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-03 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.887', '2026-05-14 12:35:04.887', NULL, NULL);
INSERT INTO public.attendances VALUES ('29742ea6-cbec-4266-ad2e-5a57d33bf999', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-06 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.894', '2026-05-14 12:35:04.894', NULL, NULL);
INSERT INTO public.attendances VALUES ('158e7398-c1ee-4ce4-8305-19ff5e75b9e2', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-07 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.898', '2026-05-14 12:35:04.898', NULL, NULL);
INSERT INTO public.attendances VALUES ('6dbdc2ba-a8d6-4f99-bed7-b7c9c25da084', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-08 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.902', '2026-05-14 12:35:04.902', NULL, NULL);
INSERT INTO public.attendances VALUES ('fe64bc9f-8a73-4221-a39b-49993d5008c5', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-09 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.906', '2026-05-14 12:35:04.906', NULL, NULL);
INSERT INTO public.attendances VALUES ('45e71b05-3218-4e46-b9df-bfab5542b475', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-10 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.911', '2026-05-14 12:35:04.911', NULL, NULL);
INSERT INTO public.attendances VALUES ('fe26534f-207f-4ce3-8612-6189d65287dc', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-13 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.915', '2026-05-14 12:35:04.915', NULL, NULL);
INSERT INTO public.attendances VALUES ('4e6ca33f-fda9-4afb-8cf7-7c37febdc3ef', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-14 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.919', '2026-05-14 12:35:04.919', NULL, NULL);
INSERT INTO public.attendances VALUES ('5fce4938-7212-4866-981b-da3cb6322034', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-15 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.923', '2026-05-14 12:35:04.923', NULL, NULL);
INSERT INTO public.attendances VALUES ('7bcd28a2-2b4d-4d27-a8da-a2d12a890376', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-16 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.927', '2026-05-14 12:35:04.927', NULL, NULL);
INSERT INTO public.attendances VALUES ('a757eefb-fe7a-4fe8-b885-0cc3bcd7299d', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-17 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.931', '2026-05-14 12:35:04.931', NULL, NULL);
INSERT INTO public.attendances VALUES ('9b6da51b-4b24-4204-b615-7f50a877cf58', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-20 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.935', '2026-05-14 12:35:04.935', NULL, NULL);
INSERT INTO public.attendances VALUES ('c2775b9b-c8a0-4449-9dbd-429f6890bfac', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-21 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.939', '2026-05-14 12:35:04.939', NULL, NULL);
INSERT INTO public.attendances VALUES ('9567366f-742a-413c-9399-1506dcea5749', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-22 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.943', '2026-05-14 12:35:04.943', NULL, NULL);
INSERT INTO public.attendances VALUES ('1fb634c1-8960-42ac-bbcb-f9e982c66688', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-23 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.949', '2026-05-14 12:35:04.949', NULL, NULL);
INSERT INTO public.attendances VALUES ('f4589fc8-5db5-4424-bf6d-018cb398ae58', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-24 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.955', '2026-05-14 12:35:04.955', NULL, NULL);
INSERT INTO public.attendances VALUES ('d28fa80d-0d50-47e5-84fd-b8efa6ca102c', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-27 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.96', '2026-05-14 12:35:04.96', NULL, NULL);
INSERT INTO public.attendances VALUES ('0a431d24-111d-4869-91fd-0b81abbca136', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-28 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.964', '2026-05-14 12:35:04.964', NULL, NULL);
INSERT INTO public.attendances VALUES ('11beca99-4d07-4aaa-9293-334774a14be6', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-29 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.969', '2026-05-14 12:35:04.969', NULL, NULL);
INSERT INTO public.attendances VALUES ('f15825bd-fe7d-4b7d-9c86-3b87e2a74684', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-04-30 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.974', '2026-05-14 12:35:04.974', NULL, NULL);
INSERT INTO public.attendances VALUES ('31507bfa-529f-4b6e-9f13-8ea6cb34c8f4', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-05-01 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.979', '2026-05-14 12:35:04.979', NULL, NULL);
INSERT INTO public.attendances VALUES ('5b7f8f4a-ab79-4acc-a2dc-dfd918279b3e', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-05-04 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.984', '2026-05-14 12:35:04.984', NULL, NULL);
INSERT INTO public.attendances VALUES ('3c1578fc-ad29-4be2-a634-7e3d292223e4', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-05-05 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.988', '2026-05-14 12:35:04.988', NULL, NULL);
INSERT INTO public.attendances VALUES ('527e5979-a2af-44eb-8920-05ab16a93613', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-05-06 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.992', '2026-05-14 12:35:04.992', NULL, NULL);
INSERT INTO public.attendances VALUES ('50366d82-8003-48a7-aa99-c72cc8b5d8cd', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-05-07 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:04.997', '2026-05-14 12:35:04.997', NULL, NULL);
INSERT INTO public.attendances VALUES ('75bc2ea5-60d5-4090-a42d-f74916d6f735', '139a2cba-69de-4ada-ba86-9df5f834be09', '9d7d167c-09e5-4aee-b444-868b258edcf1', '2026-05-08 11:00:00', true, false, NULL, '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 12:35:05.002', '2026-05-14 12:35:05.002', NULL, NULL);


--
-- Data for Name: attendance_justifications; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: certificates; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.certificates VALUES ('31759671-680a-4a38-9da8-2543e7512c78', 'b0111155-7955-4014-935e-8ef0c6033ae9', '139a2cba-69de-4ada-ba86-9df5f834be09', 'CERT-DAVI-MP5H140X', '/qrcodes/placeholder-qr.png', '/certificates/placeholder-cert.pdf', '2026-05-10 11:00:00', '5a1cca76-527b-4d85-baf2-8a0129353b45', 'ACTIVE', NULL, NULL, NULL, NULL);
INSERT INTO public.certificates VALUES ('de79f373-3a93-4f7b-ba63-ef3cdcf3184a', '9d7d167c-09e5-4aee-b444-868b258edcf1', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'UPG-PEDRO-INF-7667B71F5081C871', NULL, '/api/certificates/download/UPG-PEDRO-INF-7667B71F5081C871', '2026-05-12 15:00:00', '5a1cca76-527b-4d85-baf2-8a0129353b45', 'ACTIVE', NULL, NULL, NULL, '74125c76-77d9-45d8-a48e-82616981bd9e');
INSERT INTO public.certificates VALUES ('e7d4c1ff-2cf1-49bb-a2f7-420b6302aef1', '9d7d167c-09e5-4aee-b444-868b258edcf1', '139a2cba-69de-4ada-ba86-9df5f834be09', 'UPG-PEDRO-ADM-29BF20E99AB84DDF', NULL, '/api/certificates/download/UPG-PEDRO-ADM-29BF20E99AB84DDF', '2026-05-10 15:00:00', '5a1cca76-527b-4d85-baf2-8a0129353b45', 'ACTIVE', NULL, NULL, NULL, '7a5e30e3-9577-40da-9aaa-a9d9086ed6ea');


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.employees VALUES ('653b7c2c-afb6-4809-96cb-5d0517f84a24', 'João Batista Ferreira', 'DRIVER', 'LOGISTICS', '111.222.333-44', '(98) 99333-4455', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-05-14 12:35:04.47', '2026-05-14 12:35:04.47', 'CLT', 3200.00, 200, '5d855437-7505-42ff-a8b6-82ea4892b405', NULL);
INSERT INTO public.employees VALUES ('378d7cbf-64b6-4c9c-af78-3131f0e9c996', 'Lúcia Rodrigues Almeida', 'COORDINATOR', 'ADMINISTRATION', '222.333.444-55', '(98) 99444-5566', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-05-14 12:35:04.514', '2026-05-14 12:35:04.514', 'CLT', 4200.00, 200, '9cf80ceb-6ab0-4e30-8713-4150f6b9764f', NULL);
INSERT INTO public.employees VALUES ('a9b6ad93-f184-4760-8f72-0e339f92c34d', 'Maria Silva Pereira', 'INSTRUCTOR', 'ACADEMIC', '321.654.987-00', '(98) 99111-2233', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-05-14 12:35:05.042', '2026-05-14 12:35:05.042', 'PJ', NULL, 200, '21c3d311-9147-48a5-a66b-d263df569c17', NULL);
INSERT INTO public.employees VALUES ('34fcdff5-6991-445f-bb43-6f1028ce1fbe', 'Carlos Souza', 'DRIVER', 'LOGISTICS', '901.000.001-01', '(98) 99001-0001', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-05-14 12:35:05.263', '2026-05-14 12:35:05.263', 'CLT', 2800.00, 200, '8b15a83f-3e6c-41f8-bfcc-6f02c94d4fcc', NULL);
INSERT INTO public.employees VALUES ('eb77a340-f0ef-4f46-9f39-c111c09f35f9', 'Ana Lima', 'DRIVER', 'LOGISTICS', '901.000.002-02', '(86) 99002-0002', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-05-14 12:35:05.286', '2026-05-14 12:35:05.286', 'CLT', 2800.00, 200, '7f651b73-8c01-4734-b2af-25e02638cc17', NULL);
INSERT INTO public.employees VALUES ('fecacb24-ea5f-4f1d-891a-26dfe7e5b7d7', 'Roberto Freitas', 'DRIVER', 'LOGISTICS', '901.000.003-03', '(68) 99003-0003', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-05-14 12:35:05.303', '2026-05-14 12:35:05.303', 'CLT', 2800.00, 200, 'cdbfd25f-d651-408c-b3ac-b42d2d6c736a', NULL);
INSERT INTO public.employees VALUES ('6b77235e-09c9-4b80-9331-44448859cc31', 'Marina Costa', 'DRIVER', 'LOGISTICS', '901.000.004-04', '(98) 99004-0004', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-05-14 12:35:05.322', '2026-05-14 12:35:05.322', 'CLT', 2800.00, 200, 'baad3183-794d-44b4-a99d-7f794710b818', NULL);
INSERT INTO public.employees VALUES ('19ee6bca-c58f-49a8-ae6a-d42da87138bc', 'Paulo Ramos', 'DRIVER', 'LOGISTICS', '901.000.005-05', '(86) 99005-0005', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-05-14 12:35:05.343', '2026-05-14 12:35:05.343', 'CLT', 2800.00, 200, '86cf840d-a358-425d-b102-7b90ad6f1a5d', NULL);
INSERT INTO public.employees VALUES ('6bce37be-b599-4b13-a056-a26b017e07b4', 'Fábio Nunes', 'DRIVER', 'LOGISTICS', '901.000.006-06', '(68) 99006-0006', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-05-14 12:35:05.359', '2026-05-14 12:35:05.359', 'CLT', 2800.00, 200, '7f7380d4-c9c1-40fb-90fb-516f39fbe5f0', NULL);
INSERT INTO public.employees VALUES ('2d4109db-1c4f-4159-b1b4-406d03dce4d3', 'Léa Santos', 'DRIVER', 'LOGISTICS', '901.000.007-07', '(98) 99007-0007', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-05-14 12:35:05.376', '2026-05-14 12:35:05.376', 'CLT', 2800.00, 200, 'd0f246c1-e506-4f2b-a8a3-da26d3e221a8', NULL);
INSERT INTO public.employees VALUES ('c8316211-5aa5-443f-9526-1a207a8fd9b4', 'Diego Alves', 'DRIVER', 'LOGISTICS', '901.000.008-08', '(98) 99008-0008', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-05-14 12:35:05.393', '2026-05-14 12:35:05.393', 'CLT', 2800.00, 200, 'fb32b5ce-dbf8-4085-b7cb-e89e624dfb22', NULL);
INSERT INTO public.employees VALUES ('aa4cb36f-078f-4be3-abea-2209423936c3', 'Tânia Melo', 'DRIVER', 'LOGISTICS', '901.000.009-09', '(86) 99009-0009', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-05-14 12:35:05.41', '2026-05-14 12:35:05.41', 'CLT', 2800.00, 200, 'c8d457d7-7113-4c56-a826-05201dec5869', NULL);
INSERT INTO public.employees VALUES ('93785922-8cb9-4311-ac60-abfdbf8c2d24', 'Jonas Pires', 'DRIVER', 'LOGISTICS', '901.000.010-10', '(86) 99010-0010', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-05-14 12:35:05.422', '2026-05-14 12:35:05.422', 'CLT', 2800.00, 200, 'a61d0671-a776-4800-86c8-d62114aec929', NULL);


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.enrollments VALUES ('ea7cf40e-2c52-4b25-8226-6a156bcc6695', 'b0111155-7955-4014-935e-8ef0c6033ae9', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'UPG-DAVI-4A737790', 'ENROLLED', '2026-04-22 11:00:00', '2026-04-23 11:00:00', '5a1cca76-527b-4d85-baf2-8a0129353b45', NULL, NULL, '2026-05-14 12:35:04.664', '2026-05-14 12:35:04.664');
INSERT INTO public.enrollments VALUES ('f658e08f-392c-43cc-acea-10b3b09fefed', 'b0111155-7955-4014-935e-8ef0c6033ae9', '139a2cba-69de-4ada-ba86-9df5f834be09', 'UPG-DAVI-139A2CBA', 'ENROLLED', '2026-03-13 11:00:00', '2026-03-14 11:00:00', '5a1cca76-527b-4d85-baf2-8a0129353b45', NULL, NULL, '2026-05-14 12:35:04.733', '2026-05-14 12:35:04.733');
INSERT INTO public.enrollments VALUES ('ea307759-5559-4746-b530-c8a72d88cc4f', 'b0111155-7955-4014-935e-8ef0c6033ae9', '818c991f-c56f-4bce-bc8a-3891f9a8eabe', 'UPG-DAVI-818C991F', 'WAITLIST', '2026-05-11 11:00:00', NULL, NULL, NULL, NULL, '2026-05-14 12:35:04.741', '2026-05-14 12:35:04.741');
INSERT INTO public.enrollments VALUES ('d07b496c-26a4-484b-810e-2f9f407fa112', '19f40ea7-5935-4f6e-ae14-bc63a7ff9303', '818c991f-c56f-4bce-bc8a-3891f9a8eabe', 'UPG-ANA-818C991F', 'APPROVED', '2026-05-09 11:00:00', '2026-05-10 11:00:00', '5a1cca76-527b-4d85-baf2-8a0129353b45', NULL, NULL, '2026-05-14 12:35:04.745', '2026-05-14 12:35:04.745');
INSERT INTO public.enrollments VALUES ('6b118308-093a-4a8b-af27-d6e5e8e2a4fd', '19f40ea7-5935-4f6e-ae14-bc63a7ff9303', '139a2cba-69de-4ada-ba86-9df5f834be09', 'UPG-ANA-139A2CBA', 'REJECTED', '2026-03-10 11:00:00', '2026-03-12 11:00:00', '5a1cca76-527b-4d85-baf2-8a0129353b45', 'Documentação incompleta — RG ilegível. Favor reenviar com foto nítida.', NULL, '2026-05-14 12:35:04.748', '2026-05-14 12:35:04.748');
INSERT INTO public.enrollments VALUES ('5888852d-3891-4208-9c56-11d22aec63ef', '9d7d167c-09e5-4aee-b444-868b258edcf1', '4a737790-9d68-4cc7-a17b-ebeb949dc31c', 'UPG-PEDRO-4A737790', 'ENROLLED', '2026-04-16 11:00:00', '2026-04-17 11:00:00', '5a1cca76-527b-4d85-baf2-8a0129353b45', NULL, NULL, '2026-05-14 12:35:04.752', '2026-05-14 12:35:04.752');
INSERT INTO public.enrollments VALUES ('86314458-0218-42d6-bb73-a393e8295b69', '9d7d167c-09e5-4aee-b444-868b258edcf1', '818c991f-c56f-4bce-bc8a-3891f9a8eabe', 'UPG-PEDRO-818C991F', 'ENROLLED', '2026-04-16 11:00:00', '2026-04-17 11:00:00', '5a1cca76-527b-4d85-baf2-8a0129353b45', NULL, NULL, '2026-05-14 12:35:04.754', '2026-05-14 12:35:04.754');
INSERT INTO public.enrollments VALUES ('3c9ca936-c0af-4ca0-91aa-9ff0c7feb522', '9d7d167c-09e5-4aee-b444-868b258edcf1', '139a2cba-69de-4ada-ba86-9df5f834be09', 'UPG-PEDRO-139A2CBA', 'ENROLLED', '2026-04-16 11:00:00', '2026-04-17 11:00:00', '5a1cca76-527b-4d85-baf2-8a0129353b45', NULL, NULL, '2026-05-14 12:35:04.758', '2026-05-14 12:35:04.758');
INSERT INTO public.enrollments VALUES ('af39d775-b737-4bb5-8398-e2b3013a5713', 'ad56fc40-476c-452a-b0f0-614baa860460', '818c991f-c56f-4bce-bc8a-3891f9a8eabe', 'MP5SCNJQ-38A965', 'APPROVED', '2026-05-14 17:51:59.106', '2026-05-14 17:52:03.26', '5a1cca76-527b-4d85-baf2-8a0129353b45', NULL, 'Aprovado via script de testes de email', '2026-05-14 17:51:59.106', '2026-05-14 17:52:03.261');
INSERT INTO public.enrollments VALUES ('2d48c035-818d-462a-b157-359099e0f3f0', '0ac40339-9816-42d1-b3c8-4a51414e0ddb', '818c991f-c56f-4bce-bc8a-3891f9a8eabe', 'MP5SCP6B-786A36', 'REJECTED', '2026-05-14 17:52:01.199', '2026-05-14 17:52:05.299', '5a1cca76-527b-4d85-baf2-8a0129353b45', 'Vagas esgotadas nesta turma — teste de email de rejeição', NULL, '2026-05-14 17:52:01.199', '2026-05-14 17:52:05.3');


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.notifications VALUES ('1f529cc2-ac33-4f17-95c2-0ab0cd444e09', '20241a57-0978-4fb4-99ad-0094fb3d18f9', 'ENROLLMENT_APPROVED', 'Inscrição Aprovada!', 'Parabéns! Sua inscrição no curso Informática Básica (turma INF-SLZ-001) foi aprovada. Apresente-se no primeiro dia de aula com RG e comprovante de residência.', 'IN_APP', NULL, '2026-05-12 11:00:00', '2026-05-13 11:00:00', NULL, 'DELIVERED', NULL, '2026-05-14 12:35:05.049');
INSERT INTO public.notifications VALUES ('d0e191df-6bda-499c-9234-38ff50c40d2f', '20241a57-0978-4fb4-99ad-0094fb3d18f9', 'CLASS_REMINDER', 'Lembrete de Aula Amanhã', 'Seu curso de Informática Básica tem aula amanhã às 08h00. Local: Carreta Educacional TRK-001 — Av. Principal, São Luís.', 'IN_APP', NULL, '2026-05-12 11:00:00', '2026-05-13 11:00:00', NULL, 'DELIVERED', NULL, '2026-05-14 12:35:05.052');
INSERT INTO public.notifications VALUES ('2bfabdc3-6eae-48fb-8885-38295c4e19f4', '20241a57-0978-4fb4-99ad-0094fb3d18f9', 'CERTIFICATE_AVAILABLE', 'Certificado Disponível!', 'Seu certificado do curso Assistente Administrativo está disponível para download no portal.', 'IN_APP', NULL, '2026-05-12 11:00:00', '2026-05-13 11:00:00', NULL, 'DELIVERED', NULL, '2026-05-14 12:35:05.055');
INSERT INTO public.notifications VALUES ('6340bdb4-7658-4149-9d9b-2d7736610c25', '20241a57-0978-4fb4-99ad-0094fb3d18f9', 'MATERIAL_AVAILABLE', 'Novo Material Disponível', 'A professora Maria Silva publicou a Apostila Informática Básica — Módulo 1. Acesse na aba Materiais.', 'IN_APP', NULL, '2026-05-12 11:00:00', '2026-05-13 11:00:00', NULL, 'DELIVERED', NULL, '2026-05-14 12:35:05.057');
INSERT INTO public.notifications VALUES ('6b918864-6fe3-4451-8dbf-021c6908c275', '5a1cca76-527b-4d85-baf2-8a0129353b45', 'ENROLLMENT_RECEIVED', 'Nova Inscrição Recebida', 'Pedro Henrique Santos Oliveira se inscreveu no curso Informática Básica (turma INF-SLZ-001). Aguardando análise.', 'IN_APP', NULL, '2026-05-13 11:00:00', NULL, NULL, 'DELIVERED', NULL, '2026-05-14 12:35:05.06');
INSERT INTO public.notifications VALUES ('e4d010e4-2e47-41e7-b12b-92fa42940e0e', 'b7048454-167c-4a7f-a06b-34f8b867b69b', 'CERTIFICATE_AVAILABLE', 'Certificado disponível', 'O seu certificado do curso Informática Básica está disponível no portal.', 'IN_APP', NULL, '2026-05-13 15:00:00', NULL, NULL, 'DELIVERED', NULL, '2026-05-14 12:35:05.195');
INSERT INTO public.notifications VALUES ('15dd1a75-8135-4bde-9d07-2da8b6218bdd', 'b7048454-167c-4a7f-a06b-34f8b867b69b', 'CERTIFICATE_AVAILABLE', 'Certificado disponível', 'O seu certificado do curso Assistente Administrativo está disponível no portal.', 'IN_APP', NULL, '2026-05-13 15:00:00', NULL, NULL, 'DELIVERED', NULL, '2026-05-14 12:35:05.201');
INSERT INTO public.notifications VALUES ('f92dd6cf-38fe-4cf3-af76-04e32f2f0dc9', '5a1cca76-527b-4d85-baf2-8a0129353b45', 'GENERAL_ANNOUNCEMENT', 'Novo cadastro aguardando aprovação 🔔', 'Prof Teste FYM5UT1 se cadastrou como professor e aguarda sua aprovação.', 'IN_APP', '{"link": "/admin/funcionarios"}', NULL, NULL, NULL, 'PENDING', NULL, '2026-05-14 17:51:56.99');
INSERT INTO public.notifications VALUES ('5727c6dd-87f9-4f7a-910c-37d0db80cc90', '5a1cca76-527b-4d85-baf2-8a0129353b45', 'NEW_STUDENT_REGISTRATION', 'Novo aluno cadastrado 🎓', 'Aluno Teste 1 AVFB1UFN acabou de se cadastrar no sistema.', 'IN_APP', '{"link": "/admin/inscricoes"}', NULL, NULL, NULL, 'PENDING', NULL, '2026-05-14 17:51:59.123');
INSERT INTO public.notifications VALUES ('58f1753a-4bcc-4275-b710-5d8624063d36', '9cf80ceb-6ab0-4e30-8713-4150f6b9764f', 'NEW_STUDENT_REGISTRATION', 'Novo aluno cadastrado 🎓', 'Aluno Teste 1 AVFB1UFN acabou de se cadastrar no sistema.', 'IN_APP', '{"link": "/admin/inscricoes"}', NULL, NULL, NULL, 'PENDING', NULL, '2026-05-14 17:51:59.123');
INSERT INTO public.notifications VALUES ('0b150bef-7df3-48c3-9bb8-b17cd18b0c35', '5a1cca76-527b-4d85-baf2-8a0129353b45', 'NEW_STUDENT_REGISTRATION', 'Novo aluno cadastrado 🎓', 'Aluno Teste 2 1LD8ZP99 acabou de se cadastrar no sistema.', 'IN_APP', '{"link": "/admin/inscricoes"}', NULL, NULL, NULL, 'PENDING', NULL, '2026-05-14 17:52:01.222');
INSERT INTO public.notifications VALUES ('c69bc516-aee6-4abb-9a47-44715f7a8043', '9cf80ceb-6ab0-4e30-8713-4150f6b9764f', 'NEW_STUDENT_REGISTRATION', 'Novo aluno cadastrado 🎓', 'Aluno Teste 2 1LD8ZP99 acabou de se cadastrar no sistema.', 'IN_APP', '{"link": "/admin/inscricoes"}', NULL, NULL, NULL, 'PENDING', NULL, '2026-05-14 17:52:01.222');
INSERT INTO public.notifications VALUES ('88784ed0-7023-4a39-b1c2-3d0c2072bb45', '108d37e2-d5a0-4ddf-9f3b-4e486fe7986f', 'ENROLLMENT_APPROVED', 'Inscrição Aprovada! 🎉', 'Sua inscrição no curso "Excel Avançado" foi aprovada por Administrador Upgrade. Bom aprendizado!', 'IN_APP', '{"link": "/student/enrollments", "actorName": "Administrador Upgrade", "actorUserId": "5a1cca76-527b-4d85-baf2-8a0129353b45"}', NULL, NULL, NULL, 'PENDING', NULL, '2026-05-14 17:52:03.269');
INSERT INTO public.notifications VALUES ('f935059c-d00b-4fe0-b4bc-a11deb278e1a', '52784048-b87c-43ab-8bc4-22184ba2395b', 'ENROLLMENT_REJECTED', 'Inscrição não aprovada', 'Sua inscrição no curso "Excel Avançado" não foi aprovada por Administrador Upgrade. Motivo: Vagas esgotadas nesta turma — teste de email de rejeição', 'IN_APP', '{"link": "/student/enrollments", "actorName": "Administrador Upgrade", "actorUserId": "5a1cca76-527b-4d85-baf2-8a0129353b45"}', NULL, NULL, NULL, 'PENDING', NULL, '2026-05-14 17:52:05.317');
INSERT INTO public.notifications VALUES ('8e294cdf-8527-40fc-930d-1a73534da31d', '5d855437-7505-42ff-a8b6-82ea4892b405', 'GENERAL_ANNOUNCEMENT', 'Reembolso Aprovado ✅', 'Seu reembolso de R$ 220.00 foi aprovado por Administrador Upgrade.', 'IN_APP', '{"link": "/teacher/reembolsos", "actorName": "Administrador Upgrade", "actorUserId": "5a1cca76-527b-4d85-baf2-8a0129353b45"}', NULL, NULL, NULL, 'PENDING', NULL, '2026-05-14 20:03:44.244');
INSERT INTO public.notifications VALUES ('d0d8ae19-d749-4aa7-8bd5-308382a3ca65', '21c3d311-9147-48a5-a66b-d263df569c17', 'GENERAL_ANNOUNCEMENT', 'Reembolso não aprovado', 'Seu reembolso de R$ 145.90 não foi aprovado por Administrador Upgrade. Motivo: Comprovante ilegível — solicite nova foto da nota fiscal', 'IN_APP', '{"link": "/teacher/reembolsos", "actorName": "Administrador Upgrade", "actorUserId": "5a1cca76-527b-4d85-baf2-8a0129353b45"}', NULL, NULL, NULL, 'PENDING', NULL, '2026-05-14 20:03:44.782');


--
-- Data for Name: reimbursements; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.reimbursements VALUES ('4c4e3334-131b-46e1-8573-8bc2138eed1f', '5d855437-7505-42ff-a8b6-82ea4892b405', '653b7c2c-afb6-4809-96cb-5d0517f84a24', NULL, 'FOOD', 65.00, 'Alimentação durante viagem São Luís → Teresina — almoço em restaurante na BR-316', '', 'APPROVED', '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-12 12:35:04.496', NULL, NULL, true, '2026-05-14 12:35:04.497', '2026-05-14 12:35:04.497');
INSERT INTO public.reimbursements VALUES ('2c9edf2a-2acf-4b4f-9f39-215de97a2e41', '5d855437-7505-42ff-a8b6-82ea4892b405', '653b7c2c-afb6-4809-96cb-5d0517f84a24', NULL, 'FOOD', 350.00, 'Solicitação de alimentação sem comprovante válido — valor acima do limite da política de viagens', '', 'REJECTED', '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-09 12:35:04.503', NULL, NULL, true, '2026-05-14 12:35:04.503', '2026-05-14 12:35:04.503');
INSERT INTO public.reimbursements VALUES ('83aa815a-5caf-4527-8a5d-f4f5e1da3dd8', '21c3d311-9147-48a5-a66b-d263df569c17', 'a9b6ad93-f184-4760-8f72-0e339f92c34d', NULL, 'CLEANING_MATERIAL', 68.50, 'Material de limpeza para sala de aula — detergente, álcool 70% e pano de chão', '', 'APPROVED', '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-11 11:00:00', NULL, NULL, true, '2026-05-14 12:35:05.047', '2026-05-14 12:35:05.047');
INSERT INTO public.reimbursements VALUES ('ce66b440-18bd-4063-bc53-36c417da6eb8', '5d855437-7505-42ff-a8b6-82ea4892b405', '653b7c2c-afb6-4809-96cb-5d0517f84a24', NULL, 'EMERGENCY_REPAIR', 220.00, 'Troca emergencial de pneu furado km 347 da BR-316 — compra comprovada por nota fiscal', '', 'APPROVED', '5a1cca76-527b-4d85-baf2-8a0129353b45', '2026-05-14 20:03:44.231', NULL, NULL, true, '2026-05-14 12:35:04.5', '2026-05-14 20:03:44.232');
INSERT INTO public.reimbursements VALUES ('7d37abe7-2dc7-42f9-b88e-40b983c56318', '21c3d311-9147-48a5-a66b-d263df569c17', 'a9b6ad93-f184-4760-8f72-0e339f92c34d', NULL, 'CLASSROOM_MATERIAL', 145.90, 'Material de aula — 2 caixas de marcador para lousa, papel sulfite A4 e canetas para atividades práticas', '', 'REJECTED', '5a1cca76-527b-4d85-baf2-8a0129353b45', NULL, '2026-05-14 20:03:44.77', 'Comprovante ilegível — solicite nova foto da nota fiscal', true, '2026-05-14 12:35:05.045', '2026-05-14 20:03:44.77');


--
-- PostgreSQL database dump complete
--

\unrestrict WphbgPhtpCy8O7NAzmoLYDfq6HA2h49evKjVbaPgGta4iiND0TQ3WCpdvacaCaH

