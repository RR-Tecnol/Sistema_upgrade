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

---

## 7. Regras de WebSocket e Notificações em Tempo Real

**Implementado em Sprint Final (16/03/2026).**

* **Gateway único:** Toda comunicação WebSocket passa exclusivamente pelo `NotificationsGateway` em `backend/src/notifications/`. Nenhum outro módulo cria gateways WebSocket.
* **Autenticação obrigatória:** O handshake WS exige JWT válido via `client.handshake.auth.token`. Clientes sem token são desconectados imediatamente em `handleConnection()`. Nenhuma exceção.
* **Namespace dedicado:** Usar sempre `/notifications`. Nenhum event pode ser emitido no namespace raiz `/`.
* **Emissão isolada:** Outros serviços (EnrollmentsService, ClassesService) emitem eventos via `this.notifications.notifyAdmins()` — NUNCA injetam o `Server` do Socket.io diretamente. Toda emissão passa pelo Gateway.
* **Eventos de negócio registrados:**
  - `nova_inscricao` — nova inscrição criada pelo portal do aluno
  - `inscricao_aprovada` — admin aprovou uma inscrição pendente
  - `frequencia_registrada` — professor salvou frequência de uma turma
  - `custo_excessivo` — custo real da rota ultrapassou % configurável
* **Frontend:** Toda escuta WebSocket usa o hook `useNotifications` em `frontend/hooks/useNotifications.ts`. Nenhum componente cria conexões Socket.io diretamente.
* **Fallback gracioso:** Chamadas ao Gateway são sempre envolvidas em `try/catch` — uma falha no WS NUNCA bloqueia a operação principal. O WS é enhancement, não requisito.

## 8. Regras de Módulos NestJS com Dependências Externas

**Lição aprendida em Sprint Final — BUG-01/02 (16/03/2026).**

* **Declaração obrigatória:** Se um Service injeta outro Service de outro módulo via constructor, o módulo desse Service DEVE declarar o módulo do serviço externo no array `imports[]`.
* **Exemplo correto:**
```typescript
  // ClassesService injeta NotificationsGateway
  // Portanto ClassesModule DEVE ter:
  @Module({
    imports: [CoursesModule, TrucksModule, NotificationsModule], // ← obrigatório
    providers: [ClassesService],
  })
```
* **@Global() não dispensa declaração em todos os casos:** Módulos marcados como `@Global()` (como `SettingsModule` e `NotificationsModule`) dispensam importação apenas quando o serviço é injetado diretamente via DI token. Para módulos que usam `forwardRef` ou ciclos, declare explicitamente.
* **Imports mortos são proibidos:** Nunca deixar `import` no topo do arquivo `.module.ts` sem usar o símbolo no array `imports[]`. Remover imediatamente.

## 9. Regras de Responsividade Mobile

**Implementado em Sprint Mobile (16/03/2026).**

* **Sistema responsivo web:** O sistema NÃO tem app nativo. O mesmo URL funciona no desktop e no celular. Nenhum componente pode assumir desktop.
* **Breakpoints obrigatórios via CSS classes:**
  - `grid-4-cols`: 4 colunas → 2 cols em ≤1024px → 1 col em ≤768px
  - `grid-3-cols`: 3 colunas → 1 col em ≤768px
  - `grid-2-cols`: 2 colunas → 1 col em ≤768px
  - Definidos em `frontend/app/globals.css` seção "SPRINT MOBILE"
* **Touch-friendly obrigatório:** Todo botão, toggle e input interativo deve ter `min-height: 44px` e `min-width: 44px` (padrão Apple HIG).
* **Anti-zoom iOS:** Todos os inputs devem ter `font-size: 16px` no mobile (`< 16px` dispara zoom automático do Safari — comportamento indesejado).
* **Sidebar mobile:** Em `< 768px`, a sidebar some e reaparece via botão hamburger. Implementado com `.sidebar.open` + `.sidebar-overlay` no CSS.
* **Upload de foto (professor):** Sempre usar `capture="environment"` no `<input type="file">` para abrir câmera traseira nativa no celular. Sempre comprimir com `browser-image-compression` (max 0.5MB, 1200px) antes do upload — crítico para conexões 3G do campo.

## 10. Regras de Autenticação — Campos Retornados

**BUG-04 corrigido em 16/03/2026.**

* **`login()` SEMPRE retorna o objeto `response`:** O método deve ter `return response;` explícito após montar o objeto com tokens + user. Sem o `return`, TypeScript não gera erro de compilação mas o endpoint retorna `undefined` em runtime — falha silenciosa catastrófica.
* **Fluxo de login documentado:**
  1. Usuário com 2FA ativo → retorna `{ requiresTwoFactor: true, userId }`
  2. Usuário sem 2FA → retorna `{ user: {...}, access_token, refresh_token }`
  3. Aluno (student) → inclui `student: { id, cpf }` no objeto de retorno
* **`JwtStrategy.validate()` retorna `id`, não `sub`:** Nos controllers, usar sempre `req.user.id` — nunca `req.user.sub`. O JWT payload tem `sub` (para o token), mas o objeto retornado pelo guard tem `id`.
* **Nunca assumir que TypeScript detecta `return` faltante:** Funções async com retorno implícito de `undefined` são válidas em TS. Revisar todos os métodos de serviços que montam objetos de resposta.

## 11. Regras de Enums e Contratos de API Frontend/Backend

**BUG-05 corrigido em 16/03/2026.**

* **Frontend DEVE usar os valores do enum do backend:** Nunca criar valores "convenientes" no frontend que não existem no enum do banco.
* **ReimbursementType correto:**
  - `CLASSROOM_MATERIAL` — Material de aula
  - `CLEANING_MATERIAL` — Material de limpeza
  - `EMERGENCY_REPAIR` — Reparo emergencial
  - `FOOD` — Alimentação
  - `OTHER` — Outro
* **Campo obrigatório: `type`** (não `category`). O DTO do backend usa `type: ReimbursementType` — o frontend deve enviar exatamente `type`.
* **Regra geral:** Antes de criar um formulário, verificar o DTO no backend para nomes exatos dos campos e valores válidos de enums. Divergência causa erro 400 silencioso se a validação não for rigorosa.