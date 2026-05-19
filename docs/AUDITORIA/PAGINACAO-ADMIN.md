# Paginação nas telas do administrador

## Padrão

- Componente: `frontend/components/admin/AdminListPagination.tsx`
- Tipos/helpers: `frontend/lib/api/pagination.ts`
- API: `{ data, total, page, limit, totalPages }`
- Tamanhos padrão: **12** (cards) · **20** (tabelas densas)
- Ao mudar filtros/busca: resetar `page` para **1**

## Referência

Aba **Funcionários** do período de curso (`AcaoEquipeVinculoPanel`) — tabela de vínculo com footer Anterior/Próximo.

## Endpoints paginados (backend)

- `GET /acoes`, `/classes`, `/enrollments`, `/contas-pagar`, `/courses`, `/trucks`, `/groups`
- `GET /acoes/:id/funcionarios` (diárias vinculadas)
- `GET /employees`, `/employees/registration-requests`
- `GET /reimbursements`, `/admin/absences`, `/admin/trips`
- `GET /certificates`, `/certificates/eligible`
- `GET /stock/items`, `/stock/purchase-requests`

## Exceções (slice no cliente)

- Feriados (lista agregada)
- Turmas/Custos na ficha do período (arrays já carregados no `findOne`)
- Aba alunos no workspace da turma (lista do detalhe)
