# Frontend — portais e rotas

## Stack

- **Next.js 14** com **App Router** (`frontend/app/`)
- **TypeScript** + CSS (incl. módulos CSS onde aplicável)

## Mapa de pastas → portal

| Pasta em `frontend/app/` | Portal |
|--------------------------|--------|
| `admin/` | Administração |
| `teacher/` | Professor |
| `driver/` | Motorista |
| `student/` | Aluno |

## Rotas `page.tsx` existentes (geradas a partir do repositório)

Lista de ficheiros `**/page.tsx` sob `frontend/app/` — cada caminho (sem `page.tsx`) é uma rota URL:

- Raiz: `/`, `/login`, `/cursos`, `/inscricao/[classId]`, `/registro`, `/registro/funcionario/[token]`, `/aluno`, `/manutencao`, `/esqueci-senha`, `/redefinir-senha`, `/primeiro-login`, `/setup-2fa`, `/verify-2fa`, `/verify-email-otp`, `/certificado/verificar/[code]`
- **Admin:** `dashboard`, `relatorios`, `certificados`, `feedbacks`, `feedbacks/[id]`, `frequencia`, `funcionarios`, `funcionarios/frequencia`, `inscricoes`, `imprevistos`, `feriados`, `configuracoes`, `alunos`, `alunos/[id]`, `alunos/novo`, `turmas`, `turmas/[id]`, `turmas/[id]/estatisticas`, `turmas/nova`, `cursos`, `cursos/novo`, `cursos/[id]`, `carretas`, `carretas/nova`, `carretas/[id]`, `carretas/[id]/manutencao`, `grupos`, `acoes`, `acoes/[id]`, `viagens`, `reembolsos`, `contas-a-pagar`, `historico`, `pix-rewards`, `gestao-academica`, `gestao-academica/novo`, `page.tsx` em `admin/` (entrada admin)
- **Teacher:** `dashboard`, `frequencia`, `frequencia/[classId]`, `historico`, `reembolsos`, `certificados`, `imprevistos`, `configuracoes`, `page.tsx`
- **Driver:** `dashboard`, `viagens`, `rota`, `veiculo`, `manutencao`, `reembolsos`, `imprevistos`, `frequencia`, `configuracoes`, `page.tsx`
- **Student:** `dashboard`, `classes`, `classes/[id]`, `attendance`, `enrollments`, `certificates`, `profile`, `imprevistos`, `feedback`, `feedback/[id]`, `notifications`, `hunter-profile`, `configuracoes`, `page.tsx`

> **Nota:** pode existir `page_corrupted.tsx` ou outros ficheiros não roteados; só `page.tsx` (e convenções Next) geram rotas.

## Admin — viagens (`/admin/viagens`)

Módulo de logística: listagem em cartão ou tabela, criação manual de viagem, vínculo de motorista, penalização por recusa. O detalhe da viagem abre um modal com shell partilhado (`EmployeeStyleAdminDetailShell`), separadores Resumo / Rastreio / Auditoria, pré-visualização de fotos do hodómetro com URLs presignadas e acção **Validar viagem** (auditoria operacional). **As fotos não são abertas a partir de botões nos cartões da listagem** — apenas dentro do modal. Detalhe técnico e rotas API: [11-modulo-viagens-logistica.md](./11-modulo-viagens-logistica.md).

---

## Ligação ao backend

- Chamadas HTTP ao API NestJS (URL base via variável de ambiente no frontend, ex. `NEXT_PUBLIC_API_URL`).
- **Socket.IO** para notificações em tempo real (namespace e payloads descritos no contrato do backend — ver `ws-notification-payload.contract.ts` no repositório).

## Autenticação no browser

- Tokens guardados conforme implementação atual (cookies ou storage — ver `frontend/lib` e hooks de auth).
- Redireccionamentos pós-login por role no fluxo de `login` e layouts protegidos.
