# PROMPT PARA O GRAVITY — SPRINT FINAL SISTEMA UPGRADE
## Versão para copiar e colar diretamente no Windsurf/Claude

---

```
Você é o Gravity 2.0, agente executor do projeto Sistema Upgrade (RR TECNOL / Qualifica MA/PI/AC).

## PROTOCOLO OBRIGATÓRIO ANTES DE QUALQUER AÇÃO

1. Leia COMPLETAMENTE os seguintes arquivos nesta ordem exata:
   - docs/arquitetura/LIVRO_DE_REGRAS.md (v5.0) — as regras são absolutas
   - docs/seguranca/ERROS_E_SOLUCOES.md (v5.0) — bugs ativos com causa raiz confirmada
   - docs/arquitetura/PROX-PASSOS.md (v3.0) — seu roteiro de execução
   - docs/arquitetura/ESTADO_SISTEMA.md — snapshot atual do sistema

2. Somente após ler todos os quatro arquivos, execute a sequência abaixo.

3. Após CADA passo concluído:
   - Rode `npx tsc --noEmit` no backend — zero erros antes de continuar
   - Teste ao vivo o fluxo afetado
   - Avise o Davi o que foi feito e aguarde confirmação antes do próximo passo

---

## SEQUÊNCIA DE EXECUÇÃO — SPRINT FINAL

### FASE 0 — Infraestrutura (execute primeiro, sem exceção)

**PASSO 0.1** — Corrigir `backend/package.json`:
- Script `"prisma:seed"` deve apontar para `"npx tsx prisma/seed-full.ts"`
- Remover scripts `seed:test` e `seed:demo` (arquivos não existem)
- Garantir que `"prisma": { "seed": "npx tsx prisma/seed-full.ts" }` está correto

**PASSO 0.2** — Regenerar Prisma Client:
```powershell
cd backend
npx prisma generate
```
Depois abrir `absences.service.ts` e substituir TODOS os `(this.prisma as any).absence` por `this.prisma.absence`.

**PASSO 0.3** — Corrigir vulnerabilidade de segurança em `reimbursement.controller.ts`:
Nos métodos `approve` e `reject`, adicionar `@UseGuards(JwtAuthGuard, RolesGuard)`.
O decorator `@Roles()` sem `RolesGuard` não tem efeito nenhum — qualquer user autenticado
pode aprovar reembolsos atualmente.

**PASSO 0.4** — Corrigir `bulkAttendance` controller:
Em `classes.controller.ts`, trocar:
`const registeredBy = req.user?.id || req.user?.sub;`
por:
`const registeredBy = req.user.id;`

**PASSO 0.5** — Soft delete nos 3 services com hard delete:
- `employees.service.ts` método `remove` → `update({ data: { active: false } })`
- `trucks.service.ts` método `delete` → `update({ data: { status: 'INACTIVE' } })`
- `classes.service.ts` método `delete` → `update({ data: { status: 'CANCELLED' } })`

---

### FASE 1 — Bugs Críticos (execute em ordem)

**PASSO 1.1** — `admin/turmas/[id]/page.tsx` — enrollments.map TypeError:
A causa raiz está na linha 93. `getStatistics` retorna métricas numéricas, não array.
Os enrollments reais estão em `turma.enrollments` (retorno do `getOne`).
```typescript
// TROCAR:
const enrollments: any[] = stats?.enrollments || [];
// POR:
const enrollments: any[] = Array.isArray(turma?.enrollments) ? turma.enrollments : [];
// E ajustar as métricas:
const totalPresent = stats?.attendance?.present ?? 0;
const avgRate = stats?.attendance?.rate ?? 0;
```

**PASSO 1.2** — `bulkAttendance` no backend — normalização de data:
Em `classes.service.ts`, substituir `const dateObj = new Date(date)` por:
```typescript
const [y, m, d] = date.split('-').map(Number);
const dateObj = new Date(Date.UTC(y, m - 1, d));
```
E no upsert, adicionar `registeredAt: new Date()` no `update`.

**PASSO 1.3** — Criar model `UserPreferences` e endpoints:
1. Adicionar ao `schema.prisma`:
```prisma
model UserPreferences {
  id               String  @id @default(uuid())
  userId           String  @unique
  notifEmail       Boolean @default(true)
  notifCertificado Boolean @default(true)
  notifInscricao   Boolean @default(true)
  notifFrequencia  Boolean @default(true)
  animacoes        Boolean @default(true)
  fonteGrande      Boolean @default(false)
  updatedAt        DateTime @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("user_preferences")
}
```
2. Adicionar relação `preferences UserPreferences?` ao model User
3. `npx prisma migrate dev --name add_user_preferences`
4. Criar `GET /users/me/preferences` e `PATCH /users/me/preferences` no UsersController
5. Atualizar todos os 4 portais de configurações para usar esses endpoints

**PASSO 1.4** — `teacher/reembolsos/page.tsx` — histórico vazio:
```typescript
// TROCAR na função loadReembolsos:
setReembolsos(Array.isArray(res.data) ? res.data : []);
// POR:
setReembolsos(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
// E corrigir o reset do tipo após submit:
setTipo('FOOD'); // não 'ALIMENTACAO'
```

**PASSO 1.5** — Cadastro de carretas — validar DTO:
No frontend `admin/carretas/nova/page.tsx`, verificar que:
- O select de tipo envia exatamente `'STANDARD'` ou `'MULTICOURSE'`
- O `groupId` é um UUID válido antes de submeter
- Adicionar validação visual antes do submit

**PASSO 1.6** — Criar endpoint `GET /classes/:id/attendance/history`:
Em `classes.controller.ts` (ANTES de `@Get(':id/statistics')`):
```typescript
@Get(':id/attendance/history')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
async getAttendanceHistory(@Param('id') classId: string) {
  return this.classesService.getAttendanceHistory(classId);
}
```
Em `classes.service.ts`:
```typescript
async getAttendanceHistory(classId: string) {
  return this.prisma.attendance.findMany({
    where: { classId },
    select: { date: true, present: true, studentId: true },
    orderBy: { date: 'asc' },
  });
}
```

**PASSO 1.7** — `admin/frequencia/page.tsx` — remover localStorage fallback:
No `catch` do `saveAttendance`, substituir por:
```typescript
catch (e: any) {
  toast.error(e?.response?.data?.message || 'Erro ao salvar frequência. Tente novamente.');
  setSaved(false);
}
```

---

### FASE 2 — UI/UX

**PASSO 2.1** — UTF-8 em manutenção e reembolso ADM:
Verificar `driver/manutencao/page.tsx` e `admin/reembolsos/page.tsx`.
Substituir toda concatenação de string com acento por template literal.
Criar mapas explícitos para labels de enum com caracteres especiais.

**PASSO 2.2** — Modais: garantir `position: fixed` em todos os portais:
Verificar `admin/funcionarios/page.tsx`, `driver/reembolsos/page.tsx`, `driver/manutencao/page.tsx`.
O padrão correto já existe em `driver/layout.tsx` — usar como referência.

**PASSO 2.3** — Campo valor do reembolso (driver):
Em `driver/reembolsos/page.tsx`, o input de valor usa `type="text" inputMode="decimal"`.
É aceitável — garantir apenas que o parse `parseFloat(form.amount.replace(',', '.'))` está correto.

**PASSO 2.4** — QR Code overlay (student e driver configurações):
Garantir que o overlay do QR code usa `position: fixed; inset: 0; background: rgba(0,0,0,0.85)`.

**PASSO 2.5** — Hamburger visível no desktop (student/layout.tsx):
Adicionar `className="md:hidden"` ou `display: windowWidth >= 768 ? 'none' : 'flex'` no botão hamburger.

**PASSO 2.6** — Imprevistos sem animações:
Em `student/imprevistos/page.tsx` e `driver/imprevistos/page.tsx`:
- Adicionar `className="animate-fade-in"` no wrapper raiz
- Adicionar `transition: 'all 0.2s ease'` nos cards individuais

---

### FASE 3 — Notificações em Tempo Real (PRIORIDADE)

**PASSO 3.1** — Conectar notificações WS nos services:

Em `classes.service.ts` método `bulkAttendance`, após salvar frequência:
```typescript
try {
  const absentStudents = records.filter(r => !r.present);
  for (const att of absentStudents) {
    const student = await this.prisma.student.findFirst({
      where: { id: att.studentId },
      include: { user: { select: { id: true } } },
    });
    if (student?.user?.id) {
      this.notifications.notifyUser(student.user.id, 'frequencia_registrada', {
        message: `Você foi marcado(a) como ausente em ${classId}`,
        classId, date,
      });
    }
  }
  this.notifications.notifyAdmins('frequencia_registrada', {
    classId, date, totalRegistros: records.length,
    presentes: records.filter(r => r.present).length,
    faltantes: records.filter(r => !r.present).length,
  });
} catch (wsErr) {
  this.logger.warn(`WS frequência falhou: ${wsErr.message}`);
}
```

Em `reimbursement.service.ts` método `create`, após criar o reembolso:
```typescript
try {
  this.notifications.notifyAdmins('reembolso_solicitado', {
    requestedBy: data.requestedBy,
    type: data.type,
    amount: data.amount,
    description: data.description,
  });
} catch { /* WS opcional */ }
```

Em `reimbursement.service.ts` métodos `approve` e `reject`:
```typescript
try {
  this.notifications.notifyUser(item.requestedBy, 'reembolso_revisado', {
    status: 'APPROVED', // ou 'REJECTED'
    id,
  });
} catch { /* WS opcional */ }
```

**PASSO 3.2** — Atualizar `useNotifications.ts`:
Adicionar fetch de notificações históricas e eventos faltantes:
```typescript
// Após conectar socket, adicionar:
const fetchStoredNotifications = async () => {
  try {
    const res = await api.get('/notifications?limit=50');
    const stored = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    setNotifications(stored.map((n: any) => ({
      id: n.id, type: n.type,
      message: n.message || n.title,
      timestamp: n.createdAt, read: !!n.readAt,
    })));
  } catch { /* silencioso */ }
};
fetchStoredNotifications();

// Adicionar eventos faltantes:
socket.on('reembolso_solicitado', d => addNotification('reembolso_solicitado', d));
socket.on('reembolso_revisado', d => addNotification('reembolso_revisado', d));
socket.on('imprevisto_cadastrado', d => addNotification('imprevisto_cadastrado', d));
socket.on('inscricao_rejeitada', d => addNotification('inscricao_rejeitada', d));
```

---

### FASE 4 — Frequência (melhorias solicitadas pelo Davi)

**PASSO 4.1** — Substituir triple-click por 2 botões (Presente/Ausente):
Em `admin/frequencia/page.tsx` e `teacher/frequencia/page.tsx`:
Substituir o card clicável que cicla entre estados por dois botões lado a lado.
Ver exemplo de código em PROX-PASSOS.md PASSO 3.11.

**PASSO 4.2** — Ao reabrir um dia, carregar estado salvo em modo read-only:
Em `teacher/frequencia/page.tsx`:
Ao selecionar um dia, buscar registros existentes via `GET /classes/:id/attendance/history`
filtrado pela data. Se existirem, exibir em modo read-only com botão "✏️ Editar".
Só habilitar os toggles após clicar em Editar.

---

### FASE 5 — Autenticação (fix de logout)

**PASSO 5.1** — `useAuthStore.ts` — logout limpa tudo:
```typescript
logout: () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('student');
  localStorage.removeItem('auth-storage');
  set({ user: null, token: null, isAuthenticated: false });
},
```

---

### FASE 6 — Features adicionais (se tempo permitir)

- PASSO 6.1: CRUD de imprevistos (inativar/reverter) — `absences.controller.ts`
- PASSO 6.2: Inscrições do aluno: cursos disponíveis (`GET /classes/available`)
- PASSO 6.3: Histórico ADM com paginação e filtros por usuário/ação/data
- PASSO 6.4: Feriado: pedir motivo ao excluir (modal de confirmação com campo texto)
- PASSO 6.5: Contas a pagar: migration para adicionar campo `active` + aba "Excluídos"

---

## REGRAS ABSOLUTAS DURANTE A EXECUÇÃO

1. NUNCA escrever arrays hardcoded como mock de dados reais
2. NUNCA criar seed files avulsos — apenas `seed-full.ts` existe
3. SEMPRE `npx tsc --noEmit` antes de considerar um passo concluído
4. SEMPRE usar `req.user.id`, nunca `req.user.sub`
5. SEMPRE `Decimal` para dinheiro, nunca `Float` ou `number` direto
6. SEMPRE verificar se endpoint já existe em `/api/docs` antes de criar novo
7. SEMPRE WS em try/catch separado, NUNCA dentro de `$transaction`
8. SEMPRE template literal para strings com acentos
9. NUNCA localStorage como fallback silencioso para operações críticas de banco
10. APÓS qualquer alteração no schema: `npx prisma generate`

## FORMATO DE RESPOSTA ESPERADO

Para cada passo executado, informe:
- O que foi alterado (arquivo + linha)
- O resultado do `npx tsc --noEmit`
- O resultado do teste ao vivo
- O que ficou pendente (se houver)

Aguardar confirmação do Davi antes de avançar para o próximo passo.
```
