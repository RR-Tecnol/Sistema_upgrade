# 🏗️ Pesquisa: Plano de Pesquisa Arquitetural — Engenharia de Sistemas ERP/B2G

**Data:** 2026-03-12
**Contexto:** Plano geral de pesquisa para todos os módulos complexos do Sistema Upgrade
**Fonte:** Deep Research (gerada pelo Tech Lead)
**Status:** ✅ Concluída — Documento de referência arquitetural

---

## Visão Geral do Plano

Este documento mapeia os principais vetores de investigação técnica para a construção de um sistema ERP/B2G de alta complexidade usando **NestJS + Next.js + Prisma + PostgreSQL**. Serve como referência arquitetural transversal a todos os módulos.

---

## Fase I — Modelagem Financeira de Precisão (REQ-09)

### O Problema do Ponto Flutuante

**NUNCA usar:** `FLOAT`, `REAL`, `DOUBLE PRECISION` para valores monetários.

**Por quê:** O Hardware representa 0.1 em binário como `0.09999999403953552246` (dízima periódica binária). Em milhões de transações, esses erros se acumulam → divergências contábeis em auditorias estatais.

### Padrão Normativo: NUMERIC

```prisma
model Employee {
  monthlySalaryCLT  Decimal  @db.Decimal(10, 2)  // Salário CLT exato
  dailyCost         Decimal  @db.Decimal(10, 2)  // Diária R$120 exatos
}

model ReimbursementRequest {
  amount  Decimal  @db.Decimal(10, 2)  // Valor do reembolso (centavos exatos)
}
```

| Cenário | Declaração PostgreSQL | Justificativa |
|---------|----------------------|---------------|
| Moeda padrão (BRL) | `NUMERIC(12, 2)` | Até bilhões com 2 casas decimais |
| Taxas e juros | `NUMERIC(16, 6)` | Evita perda em multiplicações de alíquotas |
| Passagens (variável por distância) | `NUMERIC(12, 2)` | Suficiente para valores de frete |

### Modelagem de Despesas de Viagem (REQ-09 — Passagens dos Instrutores)

**Tipo 1 — Distância/Quilometragem:**
- Tabela com `vehicleType` e `distanceCostPerKm`
- Campo `routeVerification` para auditoria via API de mapas (distância real vs. declarada)

**Tipo 2 — Diária (Per Diem):**
- Teto de R$120/dia para alimentação + hospedagem
- Campo booleano `mealProvided` → se secretaria forneceu almoço → desconta proporcional
- Subcategorias: pedágios, estacionamento (aprovação separada pelo financeiro)

```prisma
model TravelExpense {  // NOVO MODELO
  id            String   @id @default(uuid())
  employeeId    String
  acaoId        String
  type          TravelExpenseType  // DAILY | TICKET | MILEAGE
  amount        Decimal  @db.Decimal(10, 2)
  distanceKm    Float?             // para tipo MILEAGE
  weeklyReturn  Boolean  @default(false)  // professor volta todo final de semana?
  biweeklyReturn Boolean @default(false)  // professor volta a cada 15 dias?
  approvedBy    String?
  status        String   @default("PENDING")
  createdAt     DateTime @default(now())
  
  @@map("travel_expenses")
}
```

---

## Fase II — Trilhas de Auditoria (Audit Trails) — Requisito Transversal

### Estratégia Recomendada: Middleware do ORM (Prisma Extensions)

**Descartado — Database Triggers:** Requer `set_config` por sessão → incompatível com pool dinâmico do Prisma
**Descartado — CDC/WAL (Debezium):** Não captura contexto do usuário da aplicação

**Escolhido — Prisma Client Extensions:**

```typescript
const prismaWithAudit = prisma.$extends({
  query: {
    $allModels: {
      async update({ model, operation, args, query }) {
        // Captura snapshot ANTES da atualização
        const before = await prisma[model].findUnique({ where: args.where });
        const result = await query(args);
        
        // Calcula diff no formato JSON Patch (RFC 6902)
        const diff = generateJsonPatch(before, result);
        
        // Registra na tabela unificada de auditoria
        await prisma.auditLog.create({
          data: {
            entityType: model,
            entityId: args.where.id,
            action: 'UPDATE',
            changedBy: AsyncLocalStorage.getStore()?.userId,  // sem prop-drilling
            snapshot: before,
            diff: diff
          }
        });
        
        return result;
      }
    }
  }
});
```

**Tabela Unificada de Auditoria:**
```prisma
model AuditLog {
  id          String   @id @default(uuid())
  entityType  String   // nome da tabela
  entityId    String   // PK do registro alterado
  action      String   // CREATE | UPDATE | DELETE
  changedBy   String   // userId
  snapshot    Json     // estado ANTES da mutação
  diff        Json     // JSON Patch (RFC 6902) — o que mudou
  createdAt   DateTime @default(now())
  
  @@index([entityType, entityId])
  @@index([changedBy])
  @@map("audit_logs")
}
```

---

## Fase III — Conflitos Espaço-Temporais (REQ-08 — aprofundamento)

Ver arquivo específico: [`2026-03-12_recalculo_cronograma_feriados.md`]

**Pontos-chave desta fase:**
- Range Types PostgreSQL (`tstzrange`) superiores a `startDate + endDate` separados
- `EXCLUDE USING gist` — impede double-booking a nível de banco
- Multiranges (PostgreSQL 14+) para disponibilidade fragmentada

---

## Fase IV — Teoria dos Grafos em Cascatas (REQ-08 — dependências implícitas)

### Representação via DAG (Grafo Acíclico Dirigido)

Usado quando o deslocamento de datas precisa respeitar **dependências entre rotas/cursos**:

- **Nós (V):** Cursos/Períodos de Curso
- **Arestas Explícitas (E):** "Fase B só inicia quando Fase A terminar"
- **Arestas Implícitas:** "A mesma carreta não pode estar em dois lugares ao mesmo tempo"

**Algoritmo de Propagação:**
1. DFS para detectar e eliminar ciclos → erro HTTP 409 se ciclo detectado
2. Ordenação topológica dos nós
3. Relaxamento numérico iterativo (similar ao Bellman-Ford)
4. Para cada nó: `startDate = max(endDate dos predecessores)`
5. Recalcula `endDate` via `BusinessDayCalculatorService`

---

## Fase V — BullMQ e Isolamento Transacional

Ver arquivo específico: [`2026-03-12_recalculo_cronograma_feriados.md`] — Seção 6

**Complemento — Nível de Isolamento Serializable:**

```typescript
// Para operações financeiras e agendamentos críticos
await prisma.$transaction(
  async (tx) => {
    // Operações aqui...
  },
  {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    // PostgreSQL usa SSI (Serializable Snapshot Isolation) 
    // → detecta conflitos read/write concorrentes → lança SerializationFailure
    // → BullMQ captura e faz retry automático com backoff exponencial
  }
);
```

---

## Fase VI — PDFs e Documentação Governamental

Ver arquivo específico: [`2026-03-12_geracao_relatorios_pdf_governamental.md`]

**Tabela de decisão resumida:**

| Tipo de Documento | Tecnologia Recomendada |
|-------------------|----------------------|
| Lista de Frequência tabular | Puppeteer + Handlebars |
| Lista de Concludentes | Puppeteer + Handlebars |
| Documentos editados manualmente | TipTap → Puppeteer |
| Certificados altamente estilizados | Puppeteer + CSS print |

---

## Considerações Finais de Arquitetura

O sistema Upgrade deve ser construído sobre três pilares invioláveis:

1. **Precisão em nível de banco:** `NUMERIC` para dinheiro, `EXCLUDE USING gist` para tempo
2. **Processamento assíncrono:** BullMQ para tudo que não precisa resposta imediata
3. **Audit completo:** Prisma Extensions auditando todas as mutações

Esses três pilares garantem conformidade legal, escalabilidade e rastreabilidade — exigências inegociáveis para plataformas B2G sob escrutínio de auditorias governamentais.
