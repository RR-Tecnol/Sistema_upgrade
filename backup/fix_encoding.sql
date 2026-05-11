-- Fix course names with correct UTF-8 encoding
UPDATE courses SET
  name = 'Informática Básica',
  description = 'Curso básico de informática com Windows, Word, Excel e Internet',
  prerequisites = 'Ensino fundamental completo',
  syllabus = 'Módulo 1: Introdução à Informática
Módulo 2: Sistema Operacional Windows
Módulo 3: Editor de Texto (Word)
Módulo 4: Planilha Eletrônica (Excel)
Módulo 5: Internet e E-mail'
WHERE name ILIKE '%nform%tica%sica%' OR name ILIKE '%Inform%tica B%sica%';

UPDATE courses SET
  name = 'Excel Avançado',
  description = 'Curso avançado de Excel com fórmulas, tabelas dinâmicas e macros',
  prerequisites = 'Conhecimento básico de Excel',
  syllabus = 'Módulo 1: Fórmulas e Funções Avançadas
Módulo 2: Tabelas Dinâmicas
Módulo 3: Gráficos Avançados
Módulo 4: Macros e VBA
Módulo 5: Análise de Dados'
WHERE name ILIKE '%Excel Avan%';

UPDATE courses SET
  name = 'Assistente Administrativo',
  description = 'Formação completa para atuar como assistente administrativo',
  prerequisites = 'Ensino médio completo',
  syllabus = 'Módulo 1: Rotinas Administrativas
Módulo 2: Atendimento ao Cliente
Módulo 3: Organização de Documentos
Módulo 4: Informática Aplicada
Módulo 5: Comunicação Empresarial'
WHERE name ILIKE '%Assistente Admin%';

UPDATE courses SET
  name = 'Operador de Caixa',
  description = 'Capacitação para atuar como operador de caixa no varejo',
  prerequisites = 'Ensino fundamental completo',
  syllabus = 'Módulo 1: Atendimento ao Cliente
Módulo 2: Operação de Caixa
Módulo 3: Matemática Financeira
Módulo 4: Segurança e Prevenção de Perdas'
WHERE name ILIKE '%Operador de Caixa%';

UPDATE courses SET
  name = 'Auxiliar de Recursos Humanos',
  description = 'Formação para atuar no departamento de recursos humanos',
  prerequisites = 'Ensino médio completo',
  syllabus = 'Módulo 1: Introdução ao RH
Módulo 2: Recrutamento e Seleção
Módulo 3: Departamento Pessoal
Módulo 4: Treinamento e Desenvolvimento
Módulo 5: Legislação Trabalhista'
WHERE name ILIKE '%Auxiliar de Recursos%';

UPDATE courses SET
  name = 'Marketing Digital',
  description = 'Curso completo de marketing digital e redes sociais',
  prerequisites = 'Conhecimento básico de informática',
  syllabus = 'Módulo 1: Fundamentos do Marketing Digital
Módulo 2: Redes Sociais
Módulo 3: Google Ads e SEO
Módulo 4: E-mail Marketing
Módulo 5: Métricas e Análise'
WHERE name ILIKE '%Marketing Digital%';

UPDATE courses SET
  name = 'Empreendedorismo',
  description = 'Capacitação para abrir e gerenciar o próprio negócio',
  prerequisites = 'Ensino médio completo',
  syllabus = 'Módulo 1: Perfil Empreendedor
Módulo 2: Plano de Negócios
Módulo 3: Finanças para Empreendedores
Módulo 4: Marketing e Vendas
Módulo 5: Gestão de Pessoas'
WHERE name ILIKE '%Empreendedorismo%';

UPDATE courses SET
  name = 'Qualificação Profissional (Multicurso)',
  description = 'Curso multicurso com diversos módulos profissionalizantes',
  prerequisites = 'Ensino fundamental completo',
  syllabus = 'Módulo 1: Informática Básica
Módulo 2: Atendimento ao Cliente
Módulo 3: Vendas
Módulo 4: Gestão de Tempo
Módulo 5: Comunicação Empresarial
Módulo 6: Empreendedorismo'
WHERE name ILIKE '%Qualifica%o Profissional%' OR name ILIKE '%Multicurso%';

-- Check results
SELECT name FROM courses ORDER BY name;
