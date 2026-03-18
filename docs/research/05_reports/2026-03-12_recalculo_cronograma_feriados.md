# 📅 Pesquisa: Arquitetura de Recálculo Dinâmico de Cronogramas e Resolução de Conflitos em Sistemas B2G

**Data:** 2026-03-12
**Requisito:** REQ-08 — Cursos Medidos em Dias Úteis com Recálculo Automático
**Fonte:** Deep Research (gerada pelo Tech Lead)
**Status da Pesquisa:** ✅ Concluída — Pronta para implementação

---

## Decisão Arquitetural Tomada

> **Escolha:** Optimistic Locking + BullMQ + Algoritmo O(K) com Set de Feriados + EXCLUDE USING GiST no PostgreSQL
>
> Esta combinação resolve os três problemas principais: precisão de datas, prevenção de conflitos no banco e performance em recálculo em cascata.

---

## 1. Introdução e Fundamentação do Domínio B2G

O desenvolvimento de plataformas de software voltadas para a administração pública e ecossistemas governamentais, conhecidas como sistemas Business-to-Government (B2G), impõe requisitos arquiteturais excepcionalmente rigorosos. Ao contrário de plataformas de consumo voltadas para o mercado de varejo, onde a tolerância a falhas de consistência eventual pode ser contornada com compensações financeiras ou estornos, os sistemas governamentais operam sob a égide da conformidade legal estrita, da transparência e da auditabilidade pública.

No contexto específico da gestão de políticas de capacitação profissional descentralizada, a alocação de unidades físicas limitadas — como unidades móveis de treinamento ou "carretas" — representa um desafio intrincado de engenharia de software e pesquisa operacional.

Nesse domínio, os cronogramas não são meras sugestões de planejamento; eles representam **compromissos legais firmados com municípios e cidadãos**. Um "Período de Curso" é estritamente mensurado em dias úteis, garantindo que a carga horária instrucional exigida pelo currículo pedagógico seja rigorosamente cumprida.

A introdução de variáveis exógenas, como a decretação súbita de um feriado municipal, altera fundamentalmente o fluxo do tempo útil de instrução. Quando um feriado inesperado é inserido no meio de um período de 15 dias úteis, o sistema não pode simplesmente suprimir um dia de aula; ele é obrigado a **empurrar a data de término do curso** para o próximo dia útil subsequente disponível. Este simples deslocamento desencadeia um **efeito cascata** em todos os cursos subsequentes atrelados àquele recurso físico.

---

## 2. A Teoria do Agendamento com Restrição de Recursos (RCPSP)

O cenário descrito classifica-se como um **Resource-Constrained Project Scheduling Problem (RCPSP)**. No contexto do sistema, a unidade móvel de treinamento atua como um **recurso unário e discreto** — só pode abrigar uma turma de cada vez.

**Modelo matemático:**
- Se `x_{j,t}` é variável binária indicando se o curso `j` consome o recurso no tempo `t`
- A restrição: `Σ x_{j,t} ≤ 1` para todo `t`
- Quando um feriado é inserido, a duração do curso `j` se dilata → provoca sobreposição com `j+1`

**Solução:** Algoritmo heurístico guloso (greedy) que itera cronologicamente sobre as atividades ordenadas por data de início e empurra sucessores ao instante viável subsequente.

---

## 3. Integridade Transacional no PostgreSQL

### 3.1. Range Types (Tipos de Intervalo)

Em vez de armazenar `data_inicio` e `data_fim` como colunas escalares separadas, a arquitetura usa **DATERANGE** e **TSTZRANGE** do PostgreSQL.

**Padrão recomendado:** Limites `[)` (inclusivo-exclusivo) — garante que eventos adjacentes não criem interseções falsas.

### 3.2. Restrições de Exclusão (EXCLUDE USING GiST)

Para impedir que duas turmas ocupem a mesma carreta simultaneamente:

```sql
EXCLUDE USING gist (
  carreta_id WITH =,
  periodo WITH &&
)
```

- Usa índice **GiST** (Generalized Search Tree) — otimizado para dados de intervalo
- Verifica: mesma carreta (`=`) E períodos se sobrepõem (`&&`)
- **Inviolável mesmo sob alta concorrência** — rejeita a transação instantaneamente se violar

> ⚠️ **Fricção com Prisma:** O Prisma ainda não suporta EXCLUDE nativamente (Issue #27975). Solução: usar `Unsupported('tstzrange')` no schema + migrations SQL customizadas.

---

## 4. Gerenciamento Estratégico de Concorrência

| Método | Compatibilidade com Prisma | Avaliação |
|--------|---------------------------|-----------|
| **Pessimistic Locking** (`SELECT FOR UPDATE`) | Inadequado | Risco alto de deadlocks em cascatas longas |
| **Advisory Locks** | Proibitivo | Pool de conexões do Prisma invalida sessões fixas → lock leaks |
| **Optimistic Locking** ✅ | **Perfeito** | Coluna `version` + retry automático — padrão ouro |

### 4.1. Implementação do Optimistic Locking

```prisma
model Class {
  // ...
  version  Int  @default(1)  // Coluna de versão para controle
}
```

**Fluxo:**
1. Lê os cursos da carreta → guarda os `version` em memória
2. Recalcula as datas via algoritmo de dias úteis
3. UPDATE com `WHERE id = X AND version = versao_lida`
4. Se retornar 0 registros → conflito → retry automático com nova leitura
5. Incrementa `version` a cada UPDATE bem-sucedido

---

## 5. O Algoritmo de Dias Úteis em TypeScript

### 5.1. Estrutura de Dados: O(1) com Set

**Errado (O(M)):** Array de feriados com `.includes()` sequencial
**Correto (O(1)):** `Set<string>` com datas em formato ISO (`YYYY-MM-DD`)

```typescript
import { Injectable } from '@nestjs/common';
import { format, getDay } from 'date-fns';

@Injectable()
export class BusinessDayCalculatorService {
  /**
   * Calcula a data futura adicionando N dias úteis.
   * Complexidade: O(K) onde K é o número de dias corridos percorridos.
   */
  public calculateFutureBusinessDate(
    startDate: Date,
    daysToAdd: number,
    holidaySet: Set<string>   // ← Set para lookup O(1)
  ): Date {
    const currentDate = new Date(startDate);  // clone defensivo
    let remainingDays = daysToAdd;

    while (remainingDays > 0) {
      currentDate.setDate(currentDate.getDate() + 1);

      const isoDateString = format(currentDate, 'yyyy-MM-dd');
      const isHoliday = holidaySet.has(isoDateString);  // O(1)

      const dayOfWeek = getDay(currentDate);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isHoliday && !isWeekend) {
        remainingDays -= 1;
      }
    }

    return currentDate;
  }
}
```

### 5.2. Alimentação dos Feriados

- **Feriados nacionais/estaduais fixos:** Catálogo estático no código
- **Feriados municipais variáveis:** Cadastro pelo admin via `SystemConfig`
- **Cache Redis:** Reduz consultas ao banco — invalidado quando novo feriado é cadastrado

---

## 6. Arquitetura Orientada a Eventos

**Anti-padrão:** Executar o recálculo de forma síncrona na rota HTTP que registra o feriado → timeout inevitável em cascatas longas.

**Solução:** Event-Driven Architecture (EDA)

### 6.1. EventEmitter (NestJS)

```typescript
// Ao salvar o feriado → emite evento não-bloqueante
eventEmitter.emit('holiday.created', { municipioId, date });

// Worker separado captura o evento
@OnEvent('holiday.created')
async handleHolidayCreated(payload: HolidayCreatedEvent) {
  // Enfileira job no BullMQ (não executa aqui)
  await this.scheduleRecalcQueue.add('recalculate', payload);
}
```

### 6.2. BullMQ — Filas Persistidas no Redis

| Feature do BullMQ | Aplicação no Sistema |
|-------------------|---------------------|
| **Recuperação após falha** | Se o servidor reiniciar durante recálculo, o job retoma |
| **Concorrência limitada** (`concurrency: 1`) | Impede recálculos simultâneos na mesma carreta |
| **Backoff exponencial** | Conflitos de versão (Optimistic Locking) → retry automático |
| **Flow Producers** | Feriado estadual → múltiplos municípios → jobs separados por carreta |

---

## 7. Otimizações no Prisma — Atualizações Heterogêneas

### 7.1. O Problema N+1 em Cascata

Se 50 cursos precisam de datas diferentes após um feriado → `prisma.$transaction([50 updates])` cria uma transação gigante → risco de deadlock P2034.

### 7.2. Solução: UPDATE...FROM (VALUES) via Raw SQL

```typescript
// Em vez de 50 updates individuais → 1 operação massiva
await prisma.$executeRaw`
  UPDATE classes AS c
  SET 
    end_date = v.new_end_date,
    version = v.new_version
  FROM (VALUES ${Prisma.join(valuesArray)}) 
    AS v(id, new_end_date, new_version)
  WHERE c.id = v.id AND c.version = v.current_version
`
```

Isso resolve centenas de cursos em **millisegundos** em vez de dezenas de segundos.

---

## Referências para Implementação

- **REQ-08 no `06_PLANEJAMENTO.md`** — Requisito original da reunião
- **`HolidayService`** — Serviço a criar no backend NestJS
- **`ClassHoliday`** — Modelo a criar no schema Prisma (já documentado no planejamento)
- **Issue Prisma #27975** — Limitação de Range Types no schema Prisma
