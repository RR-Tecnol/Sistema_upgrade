# 🔄 Integração Automática: Materiais de Fabricação ↔ Estoque Central

## Visão Geral do Fluxo

```
ESTOQUE CENTRAL (StockItem)          FABRICAÇÃO (InsumoFabricacao)
categoria: MATERIAL_FABRICACAO  ←→   catálogo próprio de fabricação
         ↓                                      ↓
    [API /fabricacao/insumos] ← merge automático (InsumosService.findAll)
         ↓
  [Tela de Materiais / Apontamentos]
         ↓ (usuário consome)
  [POST /fabricacao/ordens/:id/apontamentos]
         ↓ (ApontamentoService.registrar)
    ┌────────────────────────────────────┐
    │ mat.stockItemId → debita StockItem │  ← Estoque Central
    │ mat.insumoId    → debita InsumoFab │  ← Catálogo Fabricação
    └────────────────────────────────────┘
         ↓ (automático)
    ✅ StockMovement (saída no central)
    ✅ MovimentoInsumo (saída no fab)
    ✅ BOM atualizado (quantidadeConsumida++)
    ✅ CustoOf criado
    ✅ ContaPagar gerada (Financeiro)
    ✅ custoRealAcumulado da OF atualizado
```

## Endpoints e Responsabilidades

| Endpoint | Fonte de dados | Sincronismo |
|---|---|---|
| `GET /fabricacao/insumos` | InsumoFabricacao + StockItem[MATERIAL_FABRICACAO] | ✅ Tempo real |
| `GET /fabricacao/ordens/:id/bom` | StockItem[MATERIAL_FABRICACAO] + consumo calculado | ✅ Tempo real |
| `POST /fabricacao/ordens/:id/apontamentos` | Debita origem correta automaticamente | ✅ Transacional |

## Como o frontend identifica a origem

Cada insumo retornado pela API carrega:
```json
{
  "_source": "estoque",     // ou "fabricacao"
  "_stockItemId": "uuid"    // só quando _source === "estoque"
}
```

Na submissão do apontamento:
- Se `_source === 'estoque'` → envia `{ stockItemId, quantidade }` → debita `StockItem` central
- Se `_source === 'fabricacao'` → envia `{ insumoId, quantidade }` → debita `InsumoFabricacao`

## Telas que consomem do estoque automaticamente

1. **Tela de Apontamentos** (`/fabricacao/[id]/apontamentos`) — consumo por apontamento diário
2. **Lista de Materiais** (`/fabricacao/insumos`) — visualização em tempo real do saldo
3. **BOM da OF** (`/fabricacao/[id]/bom`) — consumo previsto vs realizado por OF
