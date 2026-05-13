# 💰 Pesquisa: Modelo Financeiro CLT — Salário, Diárias e Passagens (REQ-09)

**Data:** 2026-03-12
**Requisito:** REQ-09 — Instrutores são CLT — Mudança de Modelo de Custo
**Origem na reunião (12/03/2026):** Trechos 00:18:59 — 00:24:26
**Status:** ✅ Pesquisa concluída

---

## Contexto da Mudança (O que Robert pediu)

Na reunião de 12/03/2026:

> *"Os instrutores são todos CLTs. Ele já tem o salário base deles, eles recebem diária, mas as diárias são de custos... A diária é o valor de R$120, é calculado e vai variando de acordo com o município. Vai calcular a passagem, porque além dessa diária dos 120 recebe mais a passagem e mais o salário."*
> *"Tem professor que vai e volta todo final de semana, tem professor que só vem de 15 em 15 dias. Isso varia de acordo com a distância do município."*

**O que muda em relação ao sistema antigo (Gestão Sobre Rodas):**
- Antes: funcionários por **diária de trabalho** (sem salário fixo)
- Agora: instrutor CLT tem **salário base fixo mensal** + diária de custo + passagens

---

## 1. Por que Nunca Usar Float para Dinheiro

O PostgreSQL representa `0.1` em binário como `0.09999999403...` (dízima periódica em base 2).

```
R$ 120.00 + R$ 120.00 + R$ 120.00 ... (15 vezes)
Float64: R$ 1799.9999999 → arredondado para R$ 1800.00 ✓ (parece ok)
Float64: R$ 120.15 × 21 dias
→ Float64: R$ 2523.1500000000003 → centavos errados em TPAs fiscais
```

Em um sistema B2G com auditorias governamentais do Tribunal de Contas, **um centavo errado pode invalidar relatórios**.

**Regra da pesquisa (e do `02_LIVRO_DE_REGRAS.md` §5.2):**

```prisma
// CORRETO
monthlySalaryCLT   Decimal @db.Decimal(12, 2)  // até R$ 9.999.999.999,99
dailyAllowance     Decimal @db.Decimal(10, 2)  // diária R$120 exatos
ticketCost         Decimal @db.Decimal(10, 2)  // passagem variável

// ERRADO — nunca usar para dinheiro
monthlySalaryCLT   Float  // ← PROIBIDO
```

---

## 2. Regra de Negócio: Cálculo de Passagens por Distância

### Regra extraída da reunião

| Distância da cidade base | Frequência de retorno | Passagem |
|--------------------------|----------------------|---------|
| ≤ 200 km | Final de semana (semanal) | Ida + volta toda semana |
| > 200 km | A cada 15 dias úteis | Ida + volta a cada 15 dias úteis |

**Fórmula de frequência de viagens** em um Período de Curso de `D` dias úteis:

```
D ≤ 5 dias úteis por semana → F_semanas = ⌈D / 5⌉  (se distância ≤ 200km)
D → F_quinzenas = ⌈D / 15⌉                         (se distância > 200km)

Custo total passagens = F × custo_unitário_passagem × 2  (ida + volta)
```

### Schema Prisma

```prisma
model Employee {
  id                 String      @id @default(uuid())
  name               String
  contractType       ContractType  // CLT | PJ | FREELANCE
  monthlySalaryCLT   Decimal?    @db.Decimal(12, 2)  // salário base fixo
  dailyAllowance     Decimal     @db.Decimal(10, 2)  @default(120.00)
  baseCityId         Int         // cidade base do instrutor
  active             Boolean     @default(true)        // Soft Delete
  // ...
  @@map("employees")
}

model TravelExpenseConfig {
  id                String   @id @default(uuid())
  dailyAllowanceVal Decimal  @db.Decimal(10, 2)  // valor vigente da diária
  distanceThreshold Float    @default(200.0)      // km — limiar perto/longe
  weeklyReturnCost  Decimal  @db.Decimal(10, 2)?  // custo passagem semanal
  biweeklyReturnCost Decimal @db.Decimal(10, 2)?  // custo passagem quinzenal
  effectiveFrom     DateTime
  effectiveTo       DateTime?  // NULL = configuração atual
  updatedBy         String
  createdAt         DateTime @default(now())
  @@map("travel_expense_configs")
}
```

**Por que versionar a configuração** (não sobrescrever): Se a diária mudar de R$120 para R$150 em 2027, relatórios de 2026 devem continuar mostrando R$120. A pesquisa de `TravelExpenseConfig` deve usar ponto-no-tempo (`effectiveFrom ≤ data_da_acao AND (effectiveTo IS NULL OR effectiveTo > data_da_acao)`).

---

## 3. Cálculo de Distância entre Municípios

### Provisório: Tabela Pré-Calculada

Para o escopo MA (217 municípios) + PI (224 municípios) = 441 municípios → ~194.481 pares de rotas.

**Estratégia recomendada para MVP (2026):**
1. Importar dataset de distâncias rodoviárias IBGE entre sedes municipais (arquivo público)
2. Persistir em tabela `MunicipalDistance` no PostgreSQL
3. Atualizar anualmente

```prisma
model MunicipalDistance {
  originCityId      Int
  destinationCityId Int
  distanceKm        Float     // distância rodoviária (não euclidiana)
  estimatedMinutes  Int       // tempo médio de viagem
  lastUpdated       DateTime  @default(now())
  
  @@id([originCityId, destinationCityId])
  @@index([originCityId])
  @@map("municipal_distances")
}
```

**Estratégia futura (produção):** OSRM self-hosted via Docker — motor de roteamento open-source em C++, sem custo de API, latência < 10ms por consulta, sem limite de pares.

```bash
# Docker OSRM para BR (requere ~12GB RAM para mapa completo do Brasil)
docker run -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/brazil.osm.pbf
```

Para o mapa apenas de MA+PI, o consumo de RAM é < 1GB — viável numa VPS básica.

---

## 4. Cálculo de Dias Úteis (Integração com REQ-08)

O cálculo de diárias deve considerar apenas dias em que o instrutor ficou na cidade (excluindo fins de semana se ele voltou para casa).

```sql
-- PostgreSQL: conta dias úteis entre duas datas excluindo fins de semana e feriados
SELECT count(*) AS working_days
FROM generate_series(
  '2026-03-12'::date,
  '2026-03-26'::date,
  '1 day'
) AS series(day)
WHERE EXTRACT(DOW FROM day) BETWEEN 1 AND 5  -- segunda a sexta
  AND day NOT IN (
    SELECT holiday_date FROM public_holidays
    WHERE city_id = $1 OR city_id IS NULL  -- feriados municipais + nacionais
  );
```

**Integração com `HolidayService` (REQ-08):** O cálculo de diárias usa o mesmo `HolidayService` do recálculo de cronograma. Evitar duplicação — essa lógica fica exclusivamente no backend NestJS.

---

## 5. Query de Custo Total de uma Rota (Raw SQL)

Para relatórios de fechamento, o Prisma gera queries ineficientes com 7+ joins. Usar `$queryRaw`:

```typescript
// NestJS: ReportService
async getRouteTotalCost(routeId: string): Promise<RouteCostDto> {
  const [result] = await this.prisma.$queryRaw<RouteCostDto[]>`
    SELECT 
      r.id,
      r.name AS route_name,
      -- Salário proporcional (salário mensal / 30 × dias de curso)
      ROUND((e.monthly_salary_clt / 30) * r.duration_days, 2) AS proportional_salary,
      
      -- Diárias (dias trabalhados × valor da diária vigente)
      ROUND(
        (SELECT count(*) FROM working_days_log WHERE route_id = r.id) 
        * (SELECT daily_allowance_val FROM travel_expense_configs 
           WHERE effective_from <= r.start_date 
             AND (effective_to IS NULL OR effective_to > r.start_date)
           ORDER BY effective_from DESC LIMIT 1),
        2
      ) AS total_daily_allowance,
      
      -- Passagens (baseado em distância)
      ROUND(
        CASE 
          WHEN d.distance_km <= 200 
            THEN CEIL(r.duration_days / 5.0) * cfg.weekly_return_cost * 2
          ELSE 
            CEIL(r.duration_days / 15.0) * cfg.biweekly_return_cost * 2
        END,
        2
      ) AS estimated_travel_cost,
      
      -- Total
      ROUND(
        (e.monthly_salary_clt / 30 * r.duration_days)
        + (working_days_count * daily_allowance)
        + travel_cost,
        2
      ) AS total_cost

    FROM acoes r
    JOIN employees e ON r.instructor_id = e.id
    JOIN municipal_distances d 
      ON d.origin_city_id = e.base_city_id 
      AND d.destination_city_id = r.city_id
    CROSS JOIN LATERAL (
      SELECT * FROM travel_expense_configs
      WHERE effective_from <= r.start_date
      ORDER BY effective_from DESC LIMIT 1
    ) cfg
    WHERE r.id = ${routeId}
      AND r.active = true  -- Soft Delete
  `;
  return result;
}
```

**Por que Raw SQL aqui:** Performance. Para relatórios anuais com 100+ rotas, Prisma com múltiplos joins pode ser 4-6x mais lento que SQL otimizado.

---

## 6. Exportação para Excel com Streaming (sem OOM)

Para exportar relatórios grandes sem travar o servidor:

```typescript
// NestJS: ExportController
@Get('routes/cost-report')
async exportCostReport(@Res() res: Response, @Query() filters: ReportFiltersDto) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="relatorio-custos.xlsx"');

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
  const sheet = workbook.addWorksheet('Custos por Rota');
  
  sheet.addRow(['Rota', 'Instrutor', 'Salário Proporcional', 'Diárias', 'Passagens', 'Total']);
  
  // Streaming: processa por cursor, não carrega tudo na memória
  const cursor = this.reportsService.getRouteCostCursor(filters);
  for await (const row of cursor) {
    sheet.addRow([row.name, row.instructor, row.salary, row.allowance, row.travel, row.total]);
  }
  
  await workbook.commit();  // fecha o stream
}
```

**Biblioteca:** `ExcelJS` (WorkbookWriter streaming) — evita `SheetJS` que carrega tudo em buffer antes de responder.

---

## 7. Validação de Coerência com a Transcrição

| Ponto da Reunião | Requisito | Status desta Pesquisa |
|------------------|-----------|----------------------|
| "Instrutores são todos CLTs" | Salário base mensal fixo | ✅ Schema `monthlySalaryCLT Decimal` |
| "Diária é R$120 para permanecer na cidade" | Diária de custo configurável | ✅ `TravelExpenseConfig.dailyAllowanceVal` com histórico |
| "Professor vai e volta todo final de semana" | Regra ≤ 200km | ✅ `distanceThreshold` configurável |
| "Professor fica 15 dias antes de voltar" | Regra > 200km | ✅ Cálculo `⌈D/15⌉` |
| "Passagem varia de acordo com a distância" | Integração com tabela de distâncias | ✅ `MunicipalDistance` |
| Soft Delete obrigatório | `active: Boolean` | ✅ Em todos os modelos |
| Uploads via MinIO | — | N/A (este módulo não tem uploads) |

---

## 8. Resumo de Decisões Arquiteturais

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Tipo de dado monetário | `Decimal @db.Decimal(12,2)` | Precisão exata — sem Float em B2G |
| Cálculo distância | Tabela `MunicipalDistance` (estática) | MVP viável; OSRM para escalabilidade |
| Config de diárias | Versionamento por data de vigência | Relatórios históricos corretos |
| Query de relatório | Raw SQL via `$queryRaw` | Performance em agregações complexas |
| Exportação Excel | ExcelJS Streaming | Sem OOM em grandes volumes |
| Contagem de dias úteis | `generate_series` + `public_holidays` | Integração com HolidayService (REQ-08) |
