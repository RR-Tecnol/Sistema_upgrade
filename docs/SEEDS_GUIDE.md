# 🌱 Seeds Guide — Sistema UPGRADE

> Guia completo sobre como funcionam os seeds, como executá-los e como criar novos.
> **Para humanos e para IAs** que precisam entender o padrão de dados do sistema.

---

## O Que São Seeds?

Seeds são scripts TypeScript que populam o banco de dados com dados iniciais e de demonstração. O sistema possui dois arquivos principais:

| Arquivo | Propósito | Comando |
|---------|-----------|---------|
| `backend/prisma/seed.ts` | Dados **obrigatórios** — admin, cursos, grupos, cidades | `npm run prisma:seed` |
| `backend/prisma/seed-extra.ts` | Dados de **demonstração** — viagens, manutenções, reembolsos, ausências, notificações | `npm run seed:extra` |

---

## Usuários de Teste Criados pelo Seed Principal

```
admin@qualifica.com      → Senha: RR@@Upgrade → role: ADMIN
maria.professora.visual@qualifica.com → Senha: RR@@Upgrade → role: TEACHER  
joao.driver.test99@qualifica.com      → Senha: RR@@Upgrade → role: DRIVER
aluno@qualifica.com      → Senha: RR@@Upgrade → role: STUDENT
```

> ⚠️ **IMPORTANTE para criação de seeds:** Sempre busque usuários por **email**, nunca por role!
> ```typescript
> // ✅ CORRETO
> const driverUser = await prisma.user.findFirst({ where: { email: 'joao.driver.test99@qualifica.com' } });
>
> // ❌ ERRADO — pode pegar o usuário errado
> const driverUser = await prisma.user.findFirst({ where: { role: 'DRIVER' } });
> ```

---

## Como Executar os Seeds

```powershell
cd backend

# 1. Seed principal (obrigatório — roda uma vez)
npm run prisma:seed

# 2. Seed extra (dados demo — idempotente, usa count para checar)
npm run seed:extra

# Alternativa com tsx (mais confiável no Windows):
npx tsx prisma/seed.ts
npx tsx prisma/seed-extra.ts
```

---

## Padrão de Seed — Modelo para Criar Novos

Todo seed deve seguir este padrão para ser **idempotente** (seguro de rodar múltiplas vezes):

```typescript
/**
 * seed-master.ts — [Descrição do que este seed popula]
 * 
 * Categorias de dados criados:
 *   - [Lista de entidades]
 *
 * Rodar: npx tsx prisma/seed-master.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando [nome-do-seed]...');
    console.log('═══════════════════════════════════');

    // ─── 1. SEMPRE buscar usuários por email ──────────────────────────────
    const adminUser   = await prisma.user.findFirst({ where: { email: 'admin@qualifica.com' } });
    const teacherUser = await prisma.user.findFirst({ where: { email: 'maria.professora.visual@qualifica.com' } });
    const driverUser  = await prisma.user.findFirst({ where: { email: 'joao.driver.test99@qualifica.com' } });
    const studentUser = await prisma.user.findFirst({ where: { email: 'aluno@qualifica.com' } });

    if (!adminUser) {
        console.error('❌ Admin não encontrado. Rode npm run prisma:seed primeiro!');
        process.exit(1);
    }

    // ─── 2. PADRÃO de criação idempotente ────────────────────────────────
    // Sempre verificar se os dados já existem antes de criar
    const itemCount = await prisma.minhaEntidade.count();
    
    if (itemCount < 5) {
        // Criar apenas se não existir
        const data = [
            { campo1: 'valor1', campo2: 'valor2', userId: adminUser.id },
            { campo1: 'valor3', campo2: 'valor4', userId: teacherUser?.id ?? adminUser.id },
        ];
        
        for (const item of data) {
            // Verificar por campo único antes de criar
            const exists = await prisma.minhaEntidade.findFirst({ 
                where: { campo1: item.campo1 } 
            });
            if (!exists) {
                await prisma.minhaEntidade.create({ data: item });
            }
        }
        console.log(`✅ Dados criados`);
    } else {
        console.log(`ℹ️  Já existem ${itemCount} registros — pulando`);
    }

    // ─── SUMMARY ─────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════');
    console.log('✅ Seed concluído!');
    console.log(`  📊 Total: ${await prisma.minhaEntidade.count()}`);
}

main()
    .catch(e => { console.error('❌ Erro:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
```

---

## Mapeamento de Modelos do Schema

### Principais modelos e campos críticos:

#### `Trip` (Viagens do Motorista)
```typescript
await prisma.trip.create({ data: {
    truckId: truck.id,           // ID da carreta
    driverUserId: driverUser.id, // ID do motorista
    driverName: 'João Motorista',
    originCityId: originCity.id,
    destinationCityId: destCity.id,
    departureDate: new Date(),
    expectedArrivalDate: new Date(),
    status: 'PLANNED',           // PLANNED | IN_TRANSIT | COMPLETED | CANCELLED
    kmStart: 102000,             // ⚠️ NÃO usar distanceKm (campo inválido)
    kmEnd: 102500,               // kmStart + kmEnd definem a distância
}});
```

#### `TruckMaintenance` (Manutenção de Carreta)
```typescript
await prisma.truckMaintenance.create({ data: {
    truckId: truck.id,
    tipo: 'preventiva',          // preventiva | corretiva | eletrica | pneu
    titulo: 'Troca de Óleo',
    descricao: 'Descrição detalhada...',
    status: 'concluida',         // agendada | em_andamento | concluida | cancelada
    prioridade: 'media',         // baixa | media | alta | critica
    custoEstimado: 450.00,
    custoReal: 480.00,
}});
```

#### `Reimbursement` (Reembolsos)
```typescript
await prisma.reimbursement.create({ data: {
    requestedBy: driverUser.id,
    type: 'FOOD',                // FOOD | CLASSROOM_MATERIAL | EMERGENCY_REPAIR | CLEANING_MATERIAL | OTHER
    amount: 38.50,
    description: 'Almoço durante deslocamento',
    status: 'PENDING',           // PENDING | APPROVED | REJECTED
    approvedBy: adminUser.id,    // Preencher se APPROVED
    approvedAt: new Date(),
}});
```

#### `Notification` (Notificações)
```typescript
await prisma.notification.create({ data: {
    userId: targetUser.id,
    type: 'GENERAL_ANNOUNCEMENT',
    title: 'Título da Notificação',
    message: 'Corpo da mensagem',
    data: { link: '/rota/de/destino' }, // ⚠️ NÃO usar campo 'link' direto
    channel: 'IN_APP',
    deliveryStatus: 'DELIVERED',
}});
```

#### `AuditLog` (Histórico de Auditoria)
```typescript
await prisma.auditLog.create({ data: {
    userId: adminUser.id,
    action: 'LOGIN',             // LOGIN | CREATE | UPDATE | DELETE | APPROVE | REJECT
    tableName: 'users',          // Tabela afetada
    recordId: 'uuid-do-registro',
    ipAddress: '192.168.1.1',
}});
```

---

## Dados que Ainda Faltam (Próximo Seed — seed-master.ts)

Para o sistema funcionar completamente com dados de demonstração, o próximo seed deve criar:

```typescript
// 1. Student completo para aluno@qualifica.com
await prisma.student.create({ data: {
    userId: studentUser.id,
    cpf: '123.456.789-00',
    rg: '12.345.678',
    birthDate: new Date('2000-01-15'),
    // ... outros campos obrigatórios
}});

// 2. Enrollment (Inscrição) do aluno em uma turma
const turma = await prisma.class.findFirst();
await prisma.enrollment.create({ data: {
    studentId: student.id,
    classId: turma.id,
    status: 'ENROLLED',
    approvedAt: new Date(),
}});

// 3. ClassTeacher (Vincular Maria à turma)
await prisma.classTeacher.create({ data: {
    classId: turma.id,
    userId: teacherUser.id,
}});

// 4. AuditLogs variados
// 5. Employees
// 6. CoursePeriods (Períodos de Curso)
// 7. AttendanceRecords (Presenças do aluno)
// 8. Certificate para o aluno
```

---

## Troubleshooting de Seeds

| Problema | Causa | Solução |
|----------|-------|---------|
| `Field does not exist: distanceKm` | Campo inválido em Trip | Use `kmStart` e `kmEnd` |
| `Field does not exist: link` | Campo inválido em Notification | Use o campo `data: { link: '...' }` (JSON) |
| `Prisma.absence is not a function` | Model Absence não está no client | `npx prisma generate` + restartar backend |
| `Unique constraint failed` | Dado já existe | Usar `findFirst` antes de `create` |
| `Admin not found` | Seed principal não foi rodado | `npm run prisma:seed` primeiro |
