# Gaps Identificados — Fotos do Usuário (19/03/2026)

## 1. Tema Dark Residual no Portal do Professor ⚠️ ALTA PRIORIDADE

### teacher/reembolsos — Formulário com fundo dark
**Problema:** O card "Nova Solicitação" e o card "Nenhuma solicitação encontrada" têm `background: #1E293B` (dark navy), que vaza no layout branco/amarelo do sistema.

**Correção:** Trocar os backgrounds dos cards de formulário e histórico de `#1E293B` → `#fff` (branco), e textos de `#F1F5F9` → `#111827`.

#### [MODIFY] [page.tsx](file:///C:/Users/Desktop/Downloads/Sistema_upgrade-main_atual/frontend/app/teacher/reembolsos/page.tsx)
- `background: '#1E293B'` → `background: '#fff', border: '1px solid #E5E7EB'`
- `color: '#F1F5F9'` → `color: '#111827'`
- Labels e inputs: background `#0F172A` → `#F9FAFB`, border adaptar ao tema claro

---

### teacher/frequencia — Estado vazio com fundo dark
**Problema:** Card de "Nenhuma turma encontrada" usa `background: '#1E293B'` dark navy.

**Correção:** Trocar para fundo branco/light.

#### [MODIFY] [page.tsx](file:///C:/Users/Desktop/Downloads/Sistema_upgrade-main_atual/frontend/app/teacher/frequencia/page.tsx)
- Card de estado vazio: `background: '#1E293B'` → `background: '#fff', border: '1px solid #E5E7EB'`

---

## 2. Sidebar Desaparecendo em teacher/certificados ⚠️ ALTA PRIORIDADE

**Problema:** Na foto, a página `/teacher/certificados` aparece sem sidebar — layout collapsed.

**Investigar:**
- Verificar se o layout do teacher usa `use client` e se o sidebar quebra ao navegar
- Checar [frontend/app/teacher/layout.tsx](file:///c:/Users/Desktop/Downloads/Sistema_upgrade-main_atual/frontend/app/teacher/layout.tsx) para consistência

---

## 3. KPI Cards com Ícones Quebrados — Teacher Dashboard e Histórico ⚠️ MÉDIA

**Problema:** Os KPI cards mostram ícone de "bloqueado/erro" (🚫) em vez dos valores. Isso indica que os ícones Heroicons não estão renderizando — possivelmente um problema de importação ou de tamanho zero.

**Investigar:** Confirmar se `@heroicons/react` está corretamente importado e se os ícones têm `width/height` definidos.

---

## 4. Maria Professora sem Turma Vinculada — Dados de Seed ⚠️ MÉDIA

**Problema:** A professora `maria.professora.visual@qualifica.com` não está vinculada a nenhuma turma ativa.
- Dashboard mostra "Nenhuma turma ativa encontrada"
- Frequência mostra "Nenhuma turma encontrada"
- Histórico mostra zerado

**Correção:** Adicionar no seed ou via admin a vinculação da professora Maria a uma turma ativa existente.

**Como fazer:**
1. No admin → Turmas → Editar turma → Adicionar professor Maria
2. **OU** adicionar no seed: `ClassTeacher` vinculando o `teacherId` de Maria a uma `classId` existente

---

## 5. Teacher Reembolsos — Histórico de Seed não aparece

**Problema:** O seed-extra criou reembolsos para `teacherUser` genérico, não para Maria especificamente. O seed busca `findFirst({ where: { role: 'TEACHER' } })` — pode não ter pego a Maria.

**Verificar:** Se Maria tem reembolsos no banco, ou se o seed populou outro professor.

---

---

## LOTE 2 — Fotos do Portal Admin (19/03/2026 às 20:16)

### 6. Ícones Quebrados em TODOS os KPI Cards 🔴 ALTA PRIORIDADE (Recorrente)

**Problema:** Em TODOS os portais (admin/períodos, admin/funcionários, admin/reembolsos, teacher/dashboard, teacher/histórico) os KPI cards mostram um ícone de erro/bloqueado (🚫) com o número zerado/vazio em vez do ícone correto + dado.

**Causa provável:** Ou os ícones SVG/Heroicons têm `width=0/height=0` no CSS, ou o componente de KPI card tem um `img` quebrado, ou a prop do ícone não está sendo passada corretamente.

**Correção:** Investigar o componente KPI Card compartilhado e confirmar que os ícones têm tamanho fixo (ex: `w-6 h-6` ou `width: 24px`).

**Arquivos:** Componente KPI card (buscar em `frontend/components/`) + todas as páginas que usam.

---

### 7. Dark Theme no Header de admin/funcionarios 🔴 ALTA PRIORIDADE

**Problema:** O header da página de Funcionários tem fundo dark navy (#1E293B) com os cards TOTAL/ATIVOS/INATIVOS — mesma remnância de tema escuro.

**Correção:** Trocar background do header de funcionários para branco/gradiente amarelo padrão.

#### [MODIFY] [page.tsx](file:///C:/Users/Desktop/Downloads/Sistema_upgrade-main_atual/frontend/app/admin/funcionarios/page.tsx)
- Header container: `background: '#1E293B'` → `background: 'linear-gradient(...)'` ou `background: '#fff'`

---

### 8. Seeds Vinculados a Usuários Errados 🔴 ALTA PRIORIDADE

**Problema:** O seed-extra.ts usa `prisma.user.findFirst({ where: { role: 'DRIVER' } })` etc — pega o **primeiro** usuário de cada role no banco, que pode não ser o usuário de teste real (`joao.driver.test99`, `maria.professora.visual`, `aluno@qualifica.com`).

**Consequência:**
- `/admin/imprevistos` → aba Pendentes vazia (ausências do seed não pertencem a nenhum usuário visível)
- `/admin/reembolsos` → zero reembolsos
- `/teacher/reembolsos` → zero (Maria não tem reembolsos)

**Correção:** Atualizar seed-extra.ts para buscar usuários pelo email exato:
```typescript
const driverUser = await prisma.user.findFirst({ where: { email: 'joao.driver.test99@qualifica.com' } });
const teacherUser = await prisma.user.findFirst({ where: { email: 'maria.professora.visual@qualifica.com' } });
const studentUser = await prisma.user.findFirst({ where: { email: 'aluno@qualifica.com' } });
```

#### [MODIFY] [seed-extra.ts](file:///C:/Users/Desktop/Downloads/Sistema_upgrade-main_atual/backend/prisma/seed-extra.ts)
- Linhas 24-28: trocar `findFirst by role` → `findFirst by email`
- Re-executar: `npx tsx prisma/seed-extra.ts`

---

### 9. admin/periodos-de-curso — Sem Dados 🟡 MÉDIA

**Problema:** Nenhum período de curso cadastrado. Os KPI cards (Total/Planejadas/Em Andamento/Concluídas/Canceladas) todos vazios.

**Correção:** Adicionar pelo menos 1-2 períodos de curso no seed ou verificar se existe seed existente para isso.

---

### 10. admin/funcionarios — Sem Funcionários 🟡 MÉDIA

**Problema:** Nenhum funcionário cadastrado no sistema. Além do dark theme, dados vazios.

**Correção:** Adicionar funcionários de teste no seed (ao menos 1 ativo e 1 inativo).

---

### ✅ admin/feriados-imprevistos — OK

- 9 registros com dados reais (Carnaval, feriados nacionais, imprevistos climáticos)
- Página funcional com filtros e tabela
- Só afetada pelo bug de ícones quebrados nos KPI cards (item #6)

---

## Resumo de Prioridades

| # | Gap | Arquivo | Prioridade |
|---|-----|---------|------------|
| 1 | Dark theme em teacher/reembolsos | teacher/reembolsos/page.tsx | 🔴 Alta |
| 2 | Dark theme em teacher/frequencia | teacher/frequencia/page.tsx | 🔴 Alta |
| 3 | Dark theme em admin/funcionarios | admin/funcionarios/page.tsx | 🔴 Alta |
| 4 | **Ícones quebrados em todos KPI cards** | Componente KPI + todas as páginas | 🔴 Alta |
| 5 | **Seed vinculado a usuários errados** | seed-extra.ts linhas 24-28 | 🔴 Alta |
| 6 | Sidebar some em teacher/certificados | teacher/layout.tsx? | 🟡 Média |
| 7 | Maria sem turma vinculada | ClassTeacher seed | 🟡 Média |
| 8 | Sem períodos de curso | seed | 🟡 Média |
| 9 | Sem funcionários no banco | seed | 🟡 Média |

---

## LOTE 3 — Fotos Portal Admin (19/03/2026 às 20:18)

### 11. Upload de Foto Não Persiste no Backend 🔴 ALTA PRIORIDADE

**Problema:** `handlePhotoChange` só faz `setAvatarUrl(dataURL)` no **estado local**. O botão "Salvar Alterações" envia apenas `PUT /settings` — **sem incluir a foto**. Resultado: erro ou foto sumida ao recarregar.

**Correção:** No `handleSave`, se `avatarUrl` mudou, enviar a foto antes:
```typescript
// 1. Upload da foto separado
if (avatarFile) {
  const formData = new FormData();
  formData.append('photo', avatarFile);
  await api.patch('/auth/me/photo', formData);
}
// 2. Depois salvar settings normalmente
await api.put('/settings', { ... });
```

#### [MODIFY] [configuracoes/page.tsx](file:///C:/Users/Desktop/Downloads/Sistema_upgrade-main_atual/frontend/app/admin/configuracoes/page.tsx)
- Manter `avatarFile` no estado quando arquivo for selecionado
- Incluir upload da foto no `handleSave` antes do `PUT /settings`

#### [INVESTIGATE] backend/src/auth/
- Verificar se existe endpoint `PATCH /auth/me` ou similar para atualizar foto

---

### 12. Histórico de Atividades — Tabela audit_logs Vazia 🟡 MÉDIA

**Problema:** `/admin/historico` mostra "0 registros". A tabela `audit_logs` está vazia — o backend não grava auditoria automaticamente.

**Correção imediata (seed):** Adicionar entradas de auditoria no seed-extra.ts:
```typescript
await prisma.auditLog.createMany({ data: [
  { userId: adminUser!.id, action: 'LOGIN', tableName: 'users', ipAddress: '192.168.1.1' },
  { userId: adminUser!.id, action: 'CREATE', tableName: 'classes', recordId: classId },
  ...
]});
```

---

### 13. admin/relatorios — Charts Vazios 🟡 MÉDIA

**Causa:** Sem inscrições no banco → arrays vazios → charts em branco. Resolvido ao popular inscrições (item #15).

---

### 14. admin/alunos — Nenhum Aluno Encontrado 🟡 MÉDIA

**Causa:** `GET /students` retorna tab `students` — `aluno@qualifica.com` tem `User` mas sem registro `Student` completo (CPF, RG, endereço, etc.).

**Correção:** Adicionar `Student` completo no seed vinculado ao `aluno@qualifica.com`.

---

### 15. admin/inscricoes Kanban — Zero Inscrições 🟡 MÉDIA

**Causa:** Não há `Enrollment` no banco. Depende de ter `Student` (item #14) + `Class` ativa.

**Correção:** Adicionar `Enrollment` no seed após criar `Student`.

---

## Resumo FINAL de Prioridades (todos os lotes)

| # | Gap | Prioridade |
|---|-----|-----------|
| 1-3 | **Dark theme** em teacher/reembolsos, teacher/frequencia, admin/funcionarios | 🔴 Alta |
| 4 | **Ícones quebrados** em todos os KPI cards | 🔴 Alta |
| 5 | **Seed com usuários errados** (findFirst by role → by email) | 🔴 Alta |
| 6 | **Upload de foto** não persiste (sem endpoint/backend) | 🔴 Alta |
| 7 | Sidebar some em teacher/certificados | 🟡 Média |
| 8 | Maria sem turma vinculada | 🟡 Média |
| 9 | Histórico de atividades vazio (seed audit_logs) | 🟡 Média |
| 10 | Charts de relatórios vazios (depende inscrições) | 🟡 Média |
| 11 | admin/alunos vazio (falta Student completo no seed) | 🟡 Média |
| 12 | Kanban vazio (falta Enrollment no seed) | 🟡 Média |
| 13 | Sem períodos de curso | 🟡 Média |
| 14 | Sem funcionários no banco | 🟡 Média |
