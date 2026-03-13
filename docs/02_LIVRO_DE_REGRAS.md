# 🛡️ 02_LIVRO_DE_REGRAS — As Fronteiras

Estas regras são imutáveis. O não cumprimento resultará em falha na esteira de aprovação.

## 1. Regras de UI/UX (Frontend Leagado)
* **NÃO altere o padrão visual:** O projeto usa TailwindCSS. As cores, margens, paddings e estrutura de grids existentes nas páginas atuais são o padrão absoluto.
* **Novas Páginas:** Qualquer tela nova deve herdar o layout base (Sidebar, Header, Cards) já implementados. 
* **Sem Redesign sem Autorização:** Você é estritamente proibido de "modernizar" ou alterar a identidade visual de componentes existentes sem um prompt explícito do Tech Lead aprovando.

## 2. Padrões de Código Backend (NestJS)
* **Arquitetura Modular:** Todo novo recurso deve ter seu próprio Module, Controller, Service e possivelmente DTOs.
* **Validação Estrita:** Todos os payloads de entrada (POST/PATCH) devem usar `class-validator` (DTOs). Nenhuma requisição passa sem tipagem.
* **Segurança de Rotas:** Toda rota deve estar protegida por `@UseGuards(JwtAuthGuard)` e, quando aplicável, pelo `@Roles()` específico.

## 3. Banco de Dados (Prisma/PostgreSQL)
* **NUNCA utilize comandos de Drop de Banco em Produção/Staging:** Apenas `npx prisma migrate dev` para desenvolvimento local. 
* **Soft Delete:** Nunca delete registros do banco de dados fisicamente. Utilize o campo `active: boolean` setado para `false`.
* **Nomenclatura Específica:** O que antes era chamado de `Ação` no banco/código deve ser tratado conceitualmente e em tela como `Período de Cursos` ou `Rotas`.

## 4. Integrações e Arquivos
* **Uploads:** Tudo vai para o MinIO local via `minio.service.ts`. Nunca salve arquivos no sistema de arquivos local do contêiner Docker.

## 5. Regras de Negócio — Derivadas da Reunião B2G (12/03/2026)

Estas regras foram validadas com os stakeholders governamentais e devem ser seguidas rigorosamente.**Status de implementação registrado em `03_DIARIO_DE_BORDO.md`.**

### 5.1 Feriado Dinâmico
* Quando uma data de aula cair em feriado nacional **ou** municipal (do município onde a turma está ocorrendo), o sistema deve **empurrar automaticamente** a data para o próximo dia útil.
* A lista de feriados nacionais é fixa (calendário brasileiro). Feriados municipais devem ser configuráveis via painel admin (`SystemConfig`).
* A lógica deve estar centralizada em um `HolidayService` no backend — **nunca duplicar essa lógica no frontend**.
* **Status:** ⏳ Pendente de implementação.

### 5.2 Modelo Financeiro CLT + Custos
* Instrutores podem ser contratados como CLT, PJ ou Freelance (campo `contractType` no modelo `Teacher` do schema Prisma).
* Para contratos **CLT**, o custo total de uma ação deve incluir: salário base + encargos trabalhistas (FGTS 8%, INSS patronal ~20%, férias 1/3+1, 13º) + custos operacionais variáveis.
* O custo unitário por instrutor CLT **não pode ser apenas a diária**. O cálculo deve usar o custo total mensal dividido pelos dias úteis do mês.
* O campo `dailyCost` no modelo `Employee` e o cálculo em `AcaoCusto` precisarão ser expandidos para suportar este modelo.
* **Status:** ⏳ Pendente de implementação.

### 5.3 Relatório de Concludentes (3ª Semana)
* Na **3ª semana de curso** de qualquer turma com status `IN_PROGRESS`, o sistema deve gerar (sob demanda ou automaticamente) uma lista de alunos com frequência suficiente para conclusão.
* **Critério de conclusão:** frequência ≥ 75% das aulas realizadas até o momento.
* O relatório deve ser visível em `/admin/relatorios` e no `dashboard`.
* **Status:** ⏳ Pendente de implementação.

---

## 6. Glossário de Nomenclatura (Obrigatório)

> Estas são as palavras corretas para usar em tela (UI), comentários de código e comunicação com o usuário. Use sempre o **Termo em Tela** no frontend visível ao usuário.

| Termo em Tela (UI) | Termo no Banco / Código | Descrição |
|--------------------|-------------------------|-----------|
| Período de Cursos / Rota | `Acao` / `acoes` | Operação de campo itinerante da carreta |
| Carreta | `Truck` / `trucks` | Veículo-escola itinerante |
| Aluno | `Student` / `students` | Beneficiário do programa de qualificação |
| Turma | `Class` / `classes` | Instância de um curso em data/local específico |
| Inscrição | `Enrollment` / `enrollments` | Solicitação do aluno para participar de uma turma |
| Grupo | `Group` / `groups` | Unidade operacional por estado (ex: Grupo MA, Grupo PI) |
| Equipe da Ação | `AcaoEquipe` | Usuários do sistema vinculados a uma operação de campo |
| Funcionário | `Employee` / `employees` | Colaborador externo (motorista, enfermeiro, técnico) |