# 🌱 Seeds Guide — Sistema UPGRADE
## v2.0 | 23/03/2026 — Atualizado após auditoria completa

> Guia completo sobre como funcionam os seeds, como executá-los e como criar novos.
> **Regra de ouro:** Nunca criar arquivos seed separados. Tudo em `seed.ts` + `seed-extra.ts`.

---

## Estrutura de Seeds (Definitiva)

| Arquivo | Propósito | Comando | Idempotente |
|---------|-----------|---------|-------------|
| `backend/prisma/seed-full.ts` | Dados **obrigatórios + demonstração** — usuários, cursos, grupos, cidades, carretas, turmas, viagens, reembolsos, ausências, notificações | `npm run prisma:seed` | ✅ Sim |

> ⛔ **NUNCA criar:** `seed-novo.ts`, `seed-temp.ts`, `seed-test.ts`, `seed_trip_test.js` etc.
> Qualquer dado de teste vai em `seed-extra.ts`. Seeds avulsos são legado e devem ser excluídos.

---

## Credenciais de Teste (criadas pelo seed.ts)

```
admin@qualifica.com                   → Senha: RR@@Upgrade → ADMIN
maria.professora.visual@qualifica.com → Senha: RR@@Upgrade → TEACHER
joao.driver.test99@qualifica.com      → Senha: RR@@Upgrade → DRIVER
aluno@qualifica.com                   → Senha: RR@@Upgrade → STUDENT
```

> ⚠️ **IMPORTANTE:** Sempre buscar usuários por **email**, nunca por role!
> ```typescript
> // ✅ CORRETO
> const driver = await prisma.user.findFirst({ where: { email: 'joao.driver.test99@qualifica.com' } });
> // ❌ ERRADO — pode pegar o usuário errado
> const driver = await prisma.user.findFirst({ where: { role: 'DRIVER' } });
> ```

---

## Como Executar

```powershell
cd backend

# Único seed do projeto (idempotente — pode rodar várias vezes)
npm run prisma:seed

# Alternativa direta com tsx:
npx tsx prisma/seed-full.ts
```

---

## Padrão de Seed — Modelo para Adicionar ao seed-extra.ts

Todo bloco de seed deve ser **idempotente** (seguro de rodar múltiplas vezes):

```typescript
// ─── BLOCO: [Nome da Entidade] ─────────────────────────────────────────────
const entidadeCount = await prisma.minhaEntidade.count();

if (entidadeCount < 3) {
  // Buscar dependências sempre por email/identifier único (nunca por role)
  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@qualifica.com' } });
  if (!adminUser) throw new Error('Admin não encontrado — rode prisma:seed primeiro');

  const items = [
    { campo1: 'valor1', userId: adminUser.id },
    { campo1: 'valor2', userId: adminUser.id },
  ];

  for (const item of items) {
    const exists = await prisma.minhaEntidade.findFirst({ where: { campo1: item.campo1 } });
    if (!exists) {
      await prisma.minhaEntidade.create({ data: item });
    }
  }
  console.log(`✅ MinhaEntidade: ${await prisma.minhaEntidade.count()} registros`);
} else {
  console.log(`ℹ️  MinhaEntidade: já existem ${entidadeCount} registros — pulando`);
}
```

---

## Mapeamento de Campos Críticos (erros comuns)

### `Trip` (Viagens)
```typescript
// ✅ Campos corretos
{ truckId, driverUserId, driverName, originCityId, destinationCityId,
  departureDate, expectedArrivalDate, status: 'PLANNED', kmStart, kmEnd }
// ❌ Campo INVÁLIDO — não existe no schema
{ distanceKm: 500 }  // ← TypeError: Unknown field
```

### `TruckMaintenance` (Manutenção)
```typescript
// ✅ tipo é string livre (não enum)
{ tipo: 'preventiva' }  // preventiva | corretiva | revisao | pneu | eletrica | outro
// ✅ status é string (não enum)
{ status: 'agendada' }  // agendada | em_andamento | concluida | cancelada
// ✅ prioridade é string (não enum)
{ prioridade: 'media' }  // baixa | media | alta | critica
```

### `Truck` (Carreta)
```typescript
// ✅ TruckType é enum com apenas 2 valores
{ type: 'STANDARD' }    // ou 'MULTICOURSE'
// ❌ INVÁLIDO
{ type: 'TRUCK' }       // não existe
{ type: 'CAMINHAO' }    // não existe
```

### `Notification` (Notificações)
```typescript
// ✅ Campo data é JSON — link vai dentro
{ data: { link: '/rota/de/destino' } }
// ❌ Campo 'link' não existe diretamente no model
{ link: '/rota' }  // campo não existe
```

### `Reimbursement` (Reembolsos)
```typescript
// ✅ Campo type (não category)
{ type: 'FOOD' }  // FOOD | CLASSROOM_MATERIAL | EMERGENCY_REPAIR | CLEANING_MATERIAL | OTHER
// ❌ INVÁLIDO
{ category: 'ALIMENTACAO' }  // campo errado + valor errado
```

---

## Troubleshooting de Seeds

| Problema | Causa | Solução |
|----------|-------|---------|
| `Field does not exist: distanceKm` | Campo inválido em Trip | Use `kmStart` e `kmEnd` |
| `Field does not exist: link` | Campo inválido em Notification | Use `data: { link: '...' }` |
| `Prisma.absence is not a function` | Model Absence não no client | `npx prisma generate` + restart backend |
| `Unique constraint failed` | Dado já existe | Usar `findFirst` antes de `create` |
| `Admin not found` | Seed principal não foi rodado | `npm run prisma:seed` primeiro |
| `TruckType must be STANDARD or MULTICOURSE` | Enum inválido | Verificar valores do enum |
| Encoding corrompido nos dados | Container sem `pt_BR.UTF-8` | Recriar container com o argumento correto |

---

## Seeds a Implementar (ainda pendentes em seed-extra.ts)

```typescript
// 1. UserPreferences para cada usuário de teste (após migration PASSO 1.3)
await prisma.userPreferences.upsert({
  where: { userId: adminUser.id },
  create: { userId: adminUser.id },
  update: {},
});

// 2. EmployeeAttendance (após migration PASSO 3.2)
// 3. ClassTeacher vinculando Maria à turma de teste
// 4. AuditLogs variados para popular histórico do ADM
```

---

*Sistema Upgrade | RR TECNOL | v2.0 | 23/03/2026*
*Seeds legados removidos da doc — o projeto usa APENAS seed.ts + seed-extra.ts*
