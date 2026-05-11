# Contas a pagar — mapeamento do ecossistema UPGRADE e roadmap

Documento de referência para recuperar coerência após regressões, alinhar equipas e planear evolução de **infraestrutura crítica**.  
Última revisão da base de código: inventário estático no repositório (frontend + backend + Prisma).

---

## 1. Papel no sistema

**Conta a pagar** (`ContaPagar`) é o registo financeiro operacional único para despesas a liquidar: estrada, habituais, pessoal, reembolsos, feedback PIX, manutenção de carretas, e vínculos com **Ações**. Penalidades de **imprevisto** (`PENALIZED`) e de **recusa de viagem** permanecem só nos domínios operacionais (`Absence`, `Trip`) — **não** geram lançamento automático em Contas a pagar.

- **Não é** apenas uma “lista admin”: vários domínios **criam** ou **sincronizam** linhas automaticamente.
- **Soft delete** (`active`) separa lançamentos visíveis dos excluídos (restauração possível).

---

## 2. Modelo de dados (Prisma)

| Campo | Uso |
|--------|-----|
| `tipo_conta` | String livre semântica (`pneu_furado`, `feedback_pix`, `funcionario`, …) |
| `valor`, `data_vencimento`, `status` | Core financeiro (`pendente` \| `paga` \| `vencida` \| `cancelada`) |
| `acaoId` | Custo rastreado por **Ação** |
| `observacoes` | Metadados (ex.: `reimbursementId`, categorias de reembolso) |
| `active` | Soft delete |
| Relação **`CourseFeedback`** | Opcional 1:1 — feedback aprovado PIX pode referenciar uma conta |

### 2.1 Catálogo de `tipo_conta` (valores usados no código)

| Slug | Origem típica | Onde é criado / referência |
|------|----------------|----------------------------|
| `feedback_pix` | Sistema | `feedbacks.service` — aprovação PIX e conta em falta |
| `diaria_funcionario` | Sistema | `acoes.service` — diárias por funcionário na ação |
| `manutencao` | Sistema | `truck-maintenance.service` — custo ligado à manutenção |
| `funcionario` | Sistema / manual | `reimbursement.service` (reembolso aprovado); lançamentos manuais admin/RH — categorias (ex. comida) em `observacoes` |
| `alimentacao`, `hospedagem`, `estacionamento` | Manual | Admin — categorias operacionais de rota sem módulo backend dedicado |
| `seguro_veiculo`, `material_pedagogico` | Manual | Admin — opcional |
| `pneu_furado`, `troca_oleo`, `abastecimento`, `manutencao_mecanica`, `reboque`, `lavagem`, `pedagio` | Manual / seed | Admin Contas a pagar; `seed-desenvolvimento/s3-operacional.ts` — label UI para `abastecimento`: combustível |
| `agua`, `energia`, `aluguel`, `internet`, `telefone` | Manual / seed | Idem |
| `espontaneo` | Manual | Idem; subtipo em `tipo_espontaneo` |
| `outros` | Manual | Idem |

Fonte viva no frontend: `frontend/lib/contasPagarTipoConta.ts` (`TODOS_TIPOS`, `ORIGEM_TIPO_CONTA`, `ORDEM_KPI_TIPOS`, `slugsCatalogoKpiCompleto`). Na página `/admin/contas-a-pagar`, o fetch **não** envia `tipo_conta`: os KPIs “por tipo” somam sobre **toda** a lista devolvida (filtros de status, datas, cidade, busca); o filtro por tipo ao clicar num cartão aplica-se **só** à grelha de lançamentos, exportações e contagens locais desse bloco, mantendo todos os cartões de tipo visíveis com valores estáveis.

Enum: `ContaPagarStatus` em `schema.prisma`.

---

## 3. Onde as contas nascem ou mudam (backend)

Origens identificadas no código (criação / update relevante):

| Módulo | Ficheiro(s) | Comportamento |
|--------|-------------|----------------|
| **CRUD HTTP** | `contas-pagar.service.ts` | Lista com filtros; KPIs por status (**apenas `active: true`** no agregado); create/update/pagar/soft delete/restore |
| **Feedbacks / PIX** | `feedbacks.service.ts` | Aprovação com valor → cria `ContaPagar` + liga `courseFeedback.contaPagarId`; `createMissingContaPagar` para legado sem conta |
| **Reembolsos** | `reimbursement.service.ts` | Aprovação → cria conta (idempotência); emite `financeiro_listagem_refresh` |
| **Imprevistos / Faltas** | `absences.service.ts` | Revisão admin não cria `ContaPagar` (penalidade só no registo do imprevisto); pode emitir refresh financeiro para outras rotas que alterem listagens |
| **Reembolso (fluxo alternativo)** | mesmo pacote absences em grep | Integração com notify admins |
| **Ações / diárias** | `acoes.service.ts` | Várias rotas: gerar diárias ao iniciar ação, upsert ao vincular funcionário, limpar ao remover |
| **Manutenção carretas** | `truck-maintenance.service.ts` | Cria/atualiza conta ligada ao registo de manutenção (`contaPagarId` na manutenção) |
| **Viagens** | `trips.service.ts` | Penalidade por recusa actualiza só `Trip` — sem `ContaPagar` |
| **Seed dev** | `seed-desenvolvimento/s3-operacional.ts` | Dados de exemplo |

**WebSocket:** os fluxos que mutam `ContaPagar` na secção 6 emitem `financeiro_listagem_refresh` (via `NotificationsGateway.notifyFinanceiroListagemRefresh`). Alguns eventos (ex.: revisão de imprevisto) podem emitir refresh mesmo sem criar conta — para manter outras vistas sincronizadas quando aplicável.

---

## 4. Superfície API

- **Prefixo:** `GET/POST /contas-pagar`, `PUT/PATCH/DELETE /contas-pagar/:id`, restore, marcar paga.
- **Cliente TS:** `frontend/lib/api/contasPagar.ts`.

---

## 5. UI admin e navegação

| Local | Função |
|-------|--------|
| **`/admin/contas-a-pagar`** | Lista principal, KPIs, filtros, modal criar/editar (portal), exclusão (portal), exportações; query opcional **`?highlight=<idConta>`** faz scroll e realce do cartão (ex.: redirect desde Feedbacks) |
| **Sidebar** | `Sidebar.tsx` → entrada “Contas a Pagar” |
| **Feedbacks (lista / detalhe)** | Links “Ver em Contas a pagar”, `create-conta-pagar`, coluna pagamento |
| **Carretas / manutenção** | Indicador “Conta criada” quando `contaPagarId` existe no registo de manutenção |

**Perfis:** rotas admin assumem JWT com papéis administrativos; gateway de notificações inclui **FINANCIAL** / **IT_ADMIN** para eventos financeiros (ver `notifications.gateway` + docs históricos).

---

## 6. Conectividade entre abas — matriz origem → WebSocket

O evento emitido é sempre **`financeiro_listagem_refresh`** (payload inclui `ts` ISO e `source` para diagnóstico). O helper **`NotificationsGateway.notifyFinanceiroListagemRefresh(extra)`** centraliza a emissão.

| Origem (serviço / acção) | `source` típico no payload | Quando emite |
|--------------------------|----------------------------|--------------|
| `feedbacks.service` — `approve` (PIX) | `feedback_approve_pix` | Após transação criar `ContaPagar` e vincular feedback |
| `feedbacks.service` — `createMissingContaPagar` | `feedback_create_missing_conta` | Após criar conta em feedback já aprovado |
| `feedbacks.service` — `revert` | `feedback_revert` | Após cancelar/soft-delete da conta ligada e reverter feedback |
| `acoes.service` — `findOne` (sync diárias) | `acao_find_one_sync_diaria` | Se criou pelo menos uma conta `diaria_funcionario` em falta |
| `acoes.service` — `updateStatus` (→ EM_ANDAMENTO) | `acao_status_em_andamento_diarias` | Após `deleteMany` + `createMany` de diárias |
| `acoes.service` — `addFuncionario` | `acao_add_funcionario_diaria` | Após recriar conta da diária do funcionário |
| `acoes.service` — `updateFuncionarioDias` | `acao_update_funcionario_dias_diaria` | Após upsert da conta da diária |
| `acoes.service` — `removeFuncionario` | `acao_remove_funcionario_diaria` | Após remover contas da diária |
| `truck-maintenance.service` — `create` / `update` | `truck_maintenance_create_conta`, `truck_maintenance_update_conta`, `truck_maintenance_update_create_conta` | Após criar ou actualizar `ContaPagar` ligada à manutenção |
| ~~`trips.service` — `applyRejectionPenalty`~~ | ~~`trip_rejection_penalty`~~ | **Removido:** penalidade não cria `ContaPagar` nem emite refresh financeiro por esse fluxo |
| `contas-pagar.service` — CRUD / pagar / anexo | `contas_pagar_*` | `create`, `update`, `marcarComoPaga`, `remove`, `restore`, `updateAnexo` |
| `reimbursement.service` — approve / reject | `reimbursement_approve`, `reimbursement_reject` | Após decisão que afecta listagens financeiras |
| `absences.service` — create admin / `review` | `imprevisto_admin_create`, `absence_review` | `review`: refresh opcional (sem `contaCriada`; penalidade não gera conta) |

**Front-end:** `useAdminFinanceRefresh(load, ['contas'])` em `/admin/contas-a-pagar` mantém lista e KPIs alinhados entre abas quando o socket está ligado.

**Consistência feedback:** `contas-pagar.service` — ao marcar conta como **`paga`** (`marcarComoPaga` ou `update` com status `paga`), se existir `CourseFeedback` com `contaPagarId` e `rewardStatus === PENDING`, actualiza para **`PAID`** com `rewardPaidAt` e `rewardPaymentReference: conta_pagar:<id>`.

---

## 7. Regressão — o que costuma “partir”

Com base em histórico de produto e código:

1. **UI:** troca de layout (cards/tabela/KPI) sem manter paridade funcional com modal, tipos `feedback_pix`, parsing de reembolso.
2. **Lógica:** KPIs contando contas **excluídas** (mitigado com `groupBy` filtrado a `active: true`).
3. **Modal:** `position: fixed` dentro de content com transform → centro errado (mitigado com **ModalPortal**).
4. **Git desalinhado** do ambiente real — não usar repo antigo como única fonte de verdade.

### Checklist de smoke (dois browsers / duas janelas)

Executar com **duas janelas** (ou dois perfis) ligados como admin na mesma máquina, de preferência **Contas a pagar** numa e **Feedbacks** ou **Ações** noutra.

1. **Socket:** com ambas abertas, operação que cria ou altera `ContaPagar` numa janela → na outra, lista e KPIs de Contas a pagar **actualizam sem F5** (evento `financeiro_listagem_refresh`).
2. **Feedback PIX:** aprovar valor PIX num feedback com conta → conta aparece na lista; botão “Ver em Contas a pagar” / detalhe do feedback deve abrir `/admin/contas-a-pagar?highlight=<id>` e **realçar** o cartão.
3. **Reembolso:** aprovar reembolso pendente → conta e totais coerentes; segunda aba refresca via WS.
4. **Diária (acções):** mudar ação para EM_ANDAMENTO com funcionários ou adicionar funcionário → contas `diaria_funcionario` e refresh na lista financeira.
5. **Marcar paga:** na lista Contas a pagar, marcar como paga uma conta `feedback_pix` vinculada a feedback → no detalhe do feedback, **recompensa** deve aparecer como paga (`rewardStatus` alinhado), não pendente.
6. **Modal tipo:** editar conta com `tipo_conta` gerado pelo sistema (`feedback_pix`, `diaria_funcionario`, `manutencao`, …) — salvar não deve falhar; tipos desconhecidos usam fallback com `value` correcto no payload.

---

## 8. Melhorias prioritárias (curto prazo)

1. ~~**Eventos:** Emitir `financeiro_listagem_refresh` em todos os ramos que mutam `ContaPagar`~~ **Feito** (ver secção 6).
2. **Testes de fumo:** usar o checklist da secção 7 antes de cada release relevante.
3. **Tipos no UI:** `getTipo` no frontend garante `value` para qualquer string do backend; DTO mantém `tipo_conta` como string livre.
4. ~~**Deep-link:** `?highlight=<id>` na rota Contas a pagar~~ **Feito** (scroll + realce; links desde Feedbacks).

---

## 9. Ampliação de escopo — infraestrutura crítica (médio/longo prazo)

| Área | Ideia |
|------|--------|
| **Auditoria** | Tabela `conta_pagar_audit` ou log append-only: quem alterou valor/status, IP, antes/depois |
| **Políticas** | Limite de aprovação por papel; dupla confirmação acima de X mil R$ |
| **Conciliação** | Campo `external_ref` (PIX, banco, NF); estado “conciliado” |
| **Dashboard financeiro** | Vista só leitura para FINANCIAL: aging, vencidos, por centro de custo (`tipo_conta` / `acao`) |
| **Alertas** | Job diário: vencidas + notificação; integração e-mail/Teams opcional |
| **Contratos entre módulos** | Documento OpenAPI + tipos gerados para “efeitos secundários” obrigatórios ao criar conta |

---

## 10. Diagrama lógico (texto)

```
                    ┌─────────────────┐
                    │  HTTP /contas   │
                    └────────┬────────┘
                             │
    ┌────────────────────────┼────────────────────────┐
    │                        │                        │
┌───▼────┐  ┌────────▼────────┐  ┌────────▼────────┐ │
│Feedback│  │   Reembolso     │  │   Ações/Diárias │ │
│  PIX   │  │   (approve)     │  │   acoes.service │ │
└───┬────┘  └────────┬────────┘  └────────┬────────┘ │
    │                │                     │         │
    └────────────────┼─────────────────────┘         │
                     ▼                               │
              ┌──────────────┐                       │
              │ ContaPagar   │◄────────────────────┘
              │ (Prisma)     │     Truck maintenance,
              └──────┬───────┘     CRUD admin… (penalidades imprevisto/viagem fora)
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
  Admin UI lista          WebSocket refresh
  KPIs / filtros          (financeiro_listagem_refresh)
```

---

## 11. Próximos passos sugeridos para a equipa

1. Validar em staging cada **origem** da secção 3 com um caso real e confirmar KPI + lista + links (checklist secção 7).
2. Ao adicionar novos módulos que criem `ContaPagar`, incluir `notifyFinanceiroListagemRefresh` e actualizar a tabela da secção 6.
3. Congelar decisões de UX (cards vs tabela opcional) e **testes regressão** antes de grandes refactors.
4. Opcional: este ficheiro vive em `docs/` — atualizar quando novos módulos criarem `ContaPagar`.

---

*Gerado como mapa estático do repositório; ajustar datas e owners conforme o vosso processo interno.*
