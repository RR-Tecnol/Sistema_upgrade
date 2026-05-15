Estrutura arquitetural (Next.js 14 app router + NestJS modular)
Padrão visual completo (paleta amarela/dourada, Orbitron, cards com efeitos de scan/grid/ring, KPIs animados)
Padrão de componentes (AdminHeaderHero, FormInput/Select/Textarea, ConfirmModal, AdminCreationSuccessScreen, useCountUp)
Padrão de API client (axios + sessionStorage token + interceptors)
Padrão de backend (Controller @Roles+@UseGuards / Service Prisma / DTO class-validator / Module)
Padrão Prisma (@@map snake_case, @@index, UUID, relations explícitas, Decimal financial)
Estrutura de Sidebar (5 seções existentes, vou adicionar a Estoque em "Infraestrutura")
Não preciso ver mais nada agora. Vou consolidar o plano completo.📋 Análise do ecossistema Upgrade e plano para a área de Estoque🏗️ Arquitetura geral entendidaSistema_upgrade-master/
├── backend/  (NestJS 10 — porta 3001/3002)
│   └── src/<modulo>/
│       ├── <modulo>.module.ts      → @Module({ controllers, providers, exports })
│       ├── <modulo>.controller.ts  → @Controller + @UseGuards(JwtAuthGuard, RolesGuard)
│       ├── <modulo>.service.ts     → @Injectable + PrismaService injetado
│       └── dto/
│           ├── create-<x>.dto.ts   → class-validator (@IsString, @IsEnum, etc.) + @ApiProperty
│           └── update-<x>.dto.ts   → PartialType(CreateDto)
│
└── frontend/  (Next.js 14 app router — porta 3000)
    ├── app/admin/<area>/
    │   ├── page.tsx                → listagem com KPIs + filtros + cards
    │   ├── nova/page.tsx           → wizard multi-step
    │   └── [id]/page.tsx           → visualização/edição
    ├── components/admin/           → AdminHeaderHero, ConfirmModal, AdminCreationSuccessScreen
    ├── lib/api/<area>.ts           → cliente axios tipado (interface + métodos)
    └── app/globals.css             → variáveis CSS + classes utilitárias🎨 Padrão visual confirmado (não-negociável)ElementoValorCor primária#FFD600 (amarelo Upgrade) + #B89B00 (dourado escuro) + #E6A800Background base#F4F6FA (claro) — nunca darkCards#FFFFFF, border 1px 1px 1px 4px com cor de status na esquerdaFonte títulosOrbitron 700-900 (uppercase, letter-spacing)Fonte corpoInterFonte monoJetBrains Mono (placas, códigos)Animaçõescr-scan (linha varredura), cr-grid (pontilhado), cr-ring (rotação), cr-pulse-dot, cr-fade-upStatus colorsVerde #10B981, Amarelo #FFD600, Vermelho #EF4444, Cinza #6B7280, Ciano #0891B2ModaiscreatePortal obrigatório, .modal-overlay + .modal-content🔄 Adaptação do projeto-referência → UpgradeMapeio os 3 conceitos do outro sistema para o domínio Upgrade:Projeto referênciaUpgrade (adaptação)JustificativaInsumoStockItem (insumo do estoque central)mesmo conceitoEstoqueCaminhaoTruckStockItem (saldo por carreta)já temos Truck modelMovimentacaoEstoqueStockMovement (histórico/auditoria)mesmo conceitoCaminhãoTruck (já existe)reaproveitamento totalAçãoAcao (já existe)para o tipo SAIDA (consumo)📦 Plano completo do módulo Estoque (fases)Fase 1 — Backend (NestJS + Prisma)1.1) Schema Prisma (adicionar ao schema.prisma):prismaenum StockItemCategory {
  CONSUMIVEL
  DIDATICO
  LIMPEZA
  EQUIPAMENTO
  EPI
  ALIMENTACAO
  OUTRO
}

enum StockMovementType {
  ENTRADA       // Central → Caminhão
  SAIDA         // Caminhão → Ação (consumo)
  TRANSFERENCIA // Caminhão A → Caminhão B
  DEVOLUCAO     // Caminhão → Central
  AJUSTE        // Ajuste manual (+ ou −)
  PERDA         // Baixa por perda/dano
  REPOSICAO     // Compra/entrada nova no central
}

model StockItem {
  id              String   @id @default(uuid())
  nome            String
  codigoInterno   String?  @unique
  categoria       StockItemCategory
  unidade         String   // un, kg, L, cx, par, etc.
  quantidadeAtual Decimal  @db.Decimal(12,3) @default(0)
  quantidadeMinima Decimal @db.Decimal(12,3) @default(0)
  validade        DateTime?
  fornecedor      String?
  precoUnitario   Decimal? @db.Decimal(10,2)
  localizacao     String?  // prateleira / depósito
  fotoUrl         String?
  observacoes     String?
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  truckStocks   TruckStockItem[]
  movimentacoes StockMovement[]

  @@index([categoria])
  @@index([active])
  @@map("stock_items")
}

model TruckStockItem {
  id              String  @id @default(uuid())
  truckId         String
  stockItemId     String
  quantidadeAtual Decimal @db.Decimal(12,3) @default(0)
  updatedAt       DateTime @updatedAt

  truck     Truck     @relation(fields: [truckId], references: [id], onDelete: Cascade)
  stockItem StockItem @relation(fields: [stockItemId], references: [id], onDelete: Cascade)

  @@unique([truckId, stockItemId])
  @@index([truckId])
  @@map("truck_stock_items")
}

model StockMovement {
  id              String            @id @default(uuid())
  type            StockMovementType
  stockItemId     String
  quantidade      Decimal           @db.Decimal(12,3)
  fromTruckId     String?
  toTruckId       String?
  acaoId          String?           // SAIDA → ação consumidora
  registeredBy    String            // userId
  observacao      String?           // obrigatório para AJUSTE/PERDA
  createdAt       DateTime          @default(now())

  stockItem StockItem @relation(fields: [stockItemId], references: [id])
  fromTruck Truck?    @relation("FromTruckMov", fields: [fromTruckId], references: [id])
  toTruck   Truck?    @relation("ToTruckMov",   fields: [toTruckId],   references: [id])
  acao      Acao?     @relation(fields: [acaoId], references: [id])
  registrar User      @relation("StockMovRegistrar", fields: [registeredBy], references: [id])

  @@index([type])
  @@index([stockItemId])
  @@index([createdAt])
  @@map("stock_movements")
}Mais 3 relações nos models existentes: Truck.stockItems, Truck.movementsFrom, Truck.movementsTo; Acao.stockMovements; User.stockMovementsRegistered.1.2) Módulo src/stock/ (espelho exato de src/trucks/):backend/src/stock/
├── stock.module.ts
├── stock.controller.ts          ← rotas /stock/*
├── stock.service.ts             ← regras + Prisma $transaction
└── dto/
    ├── create-stock-item.dto.ts
    ├── update-stock-item.dto.ts
    ├── create-movement.dto.ts   ← discriminada por type
    └── filter-stock.dto.tsEndpoints planejados (todos sob @UseGuards(JwtAuthGuard, RolesGuard)):GET    /api/stock/items                    → lista (?categoria=&search=&onlyLow=true)
GET    /api/stock/items/:id                → detalhe (com movimentações últimas 30)
POST   /api/stock/items                    → criar [ADMIN]
PATCH  /api/stock/items/:id                → editar [ADMIN, COORDINATOR]
DELETE /api/stock/items/:id                → soft delete [ADMIN]

GET    /api/stock/trucks/:truckId          → saldo de uma carreta
GET    /api/stock/alerts/low               → itens abaixo da mínima
GET    /api/stock/alerts/expiring          → itens vencendo (?diasAteVencer=30)
GET    /api/stock/dashboard                → KPIs (total itens, valor total, alertas, mov. mês)

POST   /api/stock/movements                → registrar movimentação (transação)
GET    /api/stock/movements                → histórico (?type=&itemId=&truckId=&from=&to=)Regra crítica que o projeto-referência cobra e vou implementar: TODA escrita de saldo passa obrigatoriamente por prisma.$transaction que (1) cria o StockMovement, (2) atualiza StockItem.quantidadeAtual e/ou TruckStockItem.quantidadeAtual no mesmo bloco — assim nunca há divergência entre tela, carreta e histórico.Fase 2 — Frontend (Next.js)2.1) lib/api/stock.ts (espelho de lib/api/trucks.ts):

Interfaces: StockItem, TruckStockItem, StockMovement, CreateStockItemDto, CreateMovementDto
Cliente: stockApi.items.{getAll, getOne, create, update, delete}, stockApi.movements.{create, list}, stockApi.alerts.{low, expiring}, stockApi.dashboard()
2.2) Sidebar — adicionar entrada em "Infraestrutura":
tsx{ name: 'Estoque', href: '/admin/estoque', icon: CubeIcon }2.3) Páginas (estrutura espelhada de app/admin/carretas/):app/admin/estoque/
├── page.tsx                ← Dashboard de monitoramento (HOME do módulo)
├── itens/
│   ├── page.tsx            ← Lista cards clicáveis (visualização)
│   ├── novo/page.tsx       ← Wizard 3 steps (igual carretas/nova)
│   └── [id]/page.tsx       ← Detalhe + edição + tabs (Dados | Movimentações | Carretas que têm)
├── caminhoes/
│   └── page.tsx            ← Saldo por carreta (replicando aba 1 do referência)
├── alertas/
│   └── page.tsx            ← Estoque baixo + vencendo
└── movimentacoes/
    ├── page.tsx            ← Histórico filtrável
    └── nova/page.tsx       ← Modal/page para registrar movimentação (qualquer tipo)2.4) Página principal /admin/estoque/page.tsx terá:

AdminHeaderHero com título "ESTOQUE" e badge "Gestão de Insumos" + botões "Novo Item" e "Nova Movimentação"
6 KPI Cards animados (componente KpiCard do padrão carretas, com useCountUp, scan, grid, ring):

📦 Itens no central
🚛 Itens em carretas
⚠️ Abaixo da mínima (vermelho se >0)
⏰ Vencendo em 30d (laranja)
💰 Valor total estimado
🔄 Movimentações no mês


Tabs tabAtual com 2 abas, igual ao referência: "Estoque Central" | "Estoque por Caminhão"
Filtros (categoria, busca) e grid de cards clicáveis (cada card abre /admin/estoque/itens/[id])
Painel lateral com últimas 5 movimentações + atalho "Ver todas"
2.5) Componentes reaproveitados (zero duplicação):

AdminHeaderHero ✓
AnimatedKpiCard ✓
AnimatedEntityCard ✓ (para os cards de item)
ConfirmModal ✓
AdminCreationSuccessScreen ✓ (no cadastro novo item)
FormInput / FormSelect / FormTextarea ✓ (extraídos do wizard de carretas)
LocationFields ✓ (se quisermos georreferenciar depósito)
Padrão de wizard 3-steps do carretas/nova ✓
🔐 Regras Upgrade não-negociáveis que vou seguir
✅ Zero commits sem aprovação do Ronaldo
✅ npx tsc --noEmit zero erros antes de commit
✅ Modais com createPortal
✅ Usar req.user.id (nunca sub)
✅ Decimal para valores financeiros (nunca Float)
✅ Soft delete (campo active)
✅ @@map snake_case + @@index adequados
✅ Validação class-validator em todos os DTOs
✅ @Roles('ADMIN', …) em todos os controllers
✅ Cores Upgrade (amarelo/dourado/branco) — sem dark cyberpunk
✅ Movimentações em prisma.$transaction (atomicidade obrigatória do referência)
📋 Decisões consolidadasTemaDecisãoQuem registra movimentaçõesADMIN, COORDINATOR, DRIVER, TEACHER (DRIVER e TEACHER limitados a SAIDA/CONSUMO + criação de solicitação de REPOSICAO)Cadastro de itemTem foto (fotoUrl via MinIO presigned) + localização (localizacao texto livre — depósito/prateleira)Fluxo de compra/REPOSICAOWorkflow de aprovação: solicitação → análise admin → APROVADA gera ContaPagar e movimentação / REJEITADA fica no histórico como recusadaExecução da Fase 1Eu mesmo (str_replace + create_file), sem envolver Gravity🔄 Impacto da decisão 3 (workflow de aprovação)Isso me obriga a adicionar um modelo a mais que eu não tinha previsto: StockPurchaseRequest. Sem ele, não há como separar "solicitação pendente" de "movimentação efetivada", nem como guardar histórico de recusas. O fluxo final fica:DRIVER/TEACHER/COORDINATOR cria solicitação ──┐
                                              ▼
                              StockPurchaseRequest (status: PENDENTE)
                                              │
                  ┌───────────────────────────┴───────────────────────────┐
                  ▼                                                       ▼
        Admin REJEITA                                          Admin APROVA
        status = REJEITADA                                     status = APROVADA
        (fica no histórico,                                    + cria StockMovement (REPOSICAO)
        não mexe em saldo)                                     + cria ContaPagar vinculada
                                                               + atualiza StockItem.quantidadeAtual
                                                               TUDO dentro de prisma.$transactionEsse é o mesmo padrão que o sistema já usa em Reimbursement (despesas de campo) e em EmployeeRegistrationRequest — então estou reaproveitando arquitetura que o time já conhece.🎯 Restrições de role por tipo de movimentaçãoMovimentaçãoADMINCOORDINATORDRIVERTEACHERENTRADA (central→caminhão)✅✅❌❌SAIDA (caminhão→ação/consumo)✅✅✅✅TRANSFERENCIA (caminhão↔caminhão)✅✅❌❌DEVOLUCAO (caminhão→central)✅✅✅❌AJUSTE / PERDA✅✅❌❌Criar solicitação de REPOSICAO✅✅✅✅Aprovar/Rejeitar REPOSICAO✅❌❌❌


 📊 Resumo do que mudou no schema.prisma
AlteraçãoLocalização✅ 3 relações de estoque em Trucklinha ~684✅ 1 relação stockMovements em Acaolinha ~1436✅ 3 relações em User (registrar, criar, revisar)linha ~352✅ 1 relação stockPurchaseRequest em ContaPagarlinha ~1524✅ 3 enums novoslinha ~1870✅ 4 models novos: StockItem, TruckStockItem, StockMovement, StockPurchaseRequest                                                       

✅ Fase 1 (Backend) — completa
O que foi entregue
ArquivoPropósitoprisma/schema.prisma3 enums + 4 models + relações em Truck/Acao/User/ContaPagarsrc/stock/dto/create-stock-item.dto.tsDTO de criação de itemsrc/stock/dto/update-stock-item.dto.tsPartialType para updatesrc/stock/dto/create-movement.dto.tsDTO unificado de movimentaçãosrc/stock/dto/create-purchase-request.dto.tsDTO de solicitação de comprasrc/stock/dto/review-purchase-request.dto.tsDTOs de aprovação/rejeiçãosrc/stock/stock.service.tsLógica completa com $transaction em todas as escritas de saldosrc/stock/stock.controller.ts18 endpoints REST organizados em 5 seçõessrc/stock/stock.module.tsMódulo NestJSsrc/app.module.tsStockModule registrado
Endpoints disponíveis
GET    /api/stock/dashboard                    [ADMIN/COORD/FIN]
GET    /api/stock/alerts/low                   [ADMIN/COORD/FIN]
GET    /api/stock/alerts/expiring              [ADMIN/COORD/FIN]

GET    /api/stock/items                        [todos os roles]
GET    /api/stock/items/:id                    [todos os roles]
POST   /api/stock/items                        [ADMIN/COORD]
PATCH  /api/stock/items/:id                    [ADMIN/COORD]
DELETE /api/stock/items/:id                    [ADMIN]

GET    /api/stock/trucks/:truckId              [todos os roles]

POST   /api/stock/movements                    [ADMIN/COORD/DRIVER/TEACHER]
GET    /api/stock/movements                    [todos os roles]

POST   /api/stock/purchase-requests            [ADMIN/COORD/DRIVER/TEACHER]
GET    /api/stock/purchase-requests            [todos]
GET    /api/stock/purchase-requests/:id        [todos com restrição]
PATCH  /api/stock/purchase-requests/:id/approve  [ADMIN]
PATCH  /api/stock/purchase-requests/:id/reject   [ADMIN]
DELETE /api/stock/purchase-requests/:id        [próprio solicitante ou ADMIN]

Padrão Upgrade — checklist de conformidade:

✅ @@map em snake_case nas 4 tabelas novas
✅ @@index em todas as colunas de busca/filtro
✅ Decimal em todos os campos financeiros (preço unitário, valor total)
✅ Soft delete via active: Boolean em StockItem e StockPurchaseRequest
✅ prisma.$transaction em 100% das escritas de saldo (createMovement + approvePurchaseRequest)
✅ @Roles() em todos os endpoints com role-matrix correta
✅ req.user.id em todos os contextos (nunca sub)
✅ DTOs com class-validator + @ApiProperty para Swagger
✅ PartialType para o update DTO (padrão NestJS)
✅ PrismaModule importado no StockModule (mesmo padrão do ReimbursementModule)
✅ Comentários jsdoc explicando regras críticas
✅ Erro de negócio: ConflictException para conflito, NotFoundException para 404, ForbiddenException para auth, BadRequestException para validação

✅ Auditoria completa 
ItemStatus3 enums (StockItemCategory, StockMovementType, StockPurchaseRequestStatus)✅ no schema4 models (StockItem, TruckStockItem, StockMovement, StockPurchaseRequest)✅ no schemaBack-refs em User (3 relations), Truck (3), Acao (1), ContaPagar (1)✅ confirmados5 DTOs em backend/src/stock/dto/✅ criadosStockService com $transaction em todas as escritas de saldo✅ criadoStockController com 18 endpoints e @Roles() corretos✅ criadoStockModule registrado em app.module.ts✅@nestjs/mapped-types instalado✅
Frontend
ItemStatuslib/api/stock.ts — cliente axios tipado + UI helpers✅ criadoimport api from './client' (default export)✅ corretoimport { toast } from '@/components/ui/Toast'✅ existeimport { AdminCreationSuccessScreen } (nomeado)✅ corretoAdminHeaderHero props (title/subtitle/badge/rightSlot)✅ usadas certoConfirmModal props (isOpen/title/message/confirmLabel/danger/loading/onConfirm/onCancel)✅ usadas certoSidebar com CubeIcon + entrada /admin/estoque na seção "Infraestrutura"✅ adicionadaPáginas: /admin/estoque, /itens, /itens/novo, /itens/[id], /movimentacoes, /solicitacoes✅ todas criadascreatePortal no modal de aprovação✅Paleta amarelo/dourado/branco (sem dark cyberpunk no portal admin)