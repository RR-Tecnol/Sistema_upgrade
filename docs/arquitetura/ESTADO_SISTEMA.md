## Estado do Sistema — Sistema Upgrade
## Snapshot do Estado Real | Atualizado após cada ciclo de execução
## Última atualização: 23/03/2026 — Sprint contínuo — Blocos I→3.2 concluídos

> **O que é este documento?**
> Snapshot preciso do que funciona, o que está quebrado e o que está pendente.
> Atualizado ao final de cada EXEC validado. Leia ANTES de iniciar qualquer nova implementação.

---

## 🟢 INFRAESTRUTURA — Tudo saudável

| Serviço | Status | Porta | Notas |
|---------|--------|-------|-------|
| PostgreSQL (Docker) | ✅ Up healthy | 5432 | UTF-8 pt_BR. Banco: cursos_db |
| Redis (Docker) | ✅ Up healthy | 6379 | — |
| MinIO (Docker) | ✅ Up healthy | 9000/9001 | Buckets: reimbursements, certificates, reports, photos |
| Backend NestJS | ✅ Rodando | **3001** | PORT=3001 canônica no backend/.env |
| Frontend Next.js | ✅ Rodando | 3000 | NEXT_PUBLIC_API_URL=http://localhost:3001/api |

> ⚠️ **Atenção ao iniciar o backend:**
> `Remove-Item Env:PORT -ErrorAction SilentlyContinue; npm run start:dev`

---

## 🟢 BANCO DE DADOS — Migrations aplicadas

| Migration | O que faz | Status |
|-----------|-----------|--------|
| Iniciais (Fase 1) | Schema completo Sprints 0→5 | ✅ |
| `20260316130235_add_two_factor` | twoFactorEnabled + twoFactorSecret em User | ✅ |
| `20260318162339_add_driver_role_and_employee_user_relation` | DRIVER enum + userId em Employee | ✅ |
| `20260318173241_add_driver_user_id_to_trip` | driverUserId FK em Trip | ✅ |
| `add_user_preferences` | Model UserPreferences — **CONCLUÍDO** | ✅ PASSO 1.3 |
| `add_absence_active` | Campo `active Boolean` em Absence — **CONCLUÍDO** | ✅ BLOCO K |
| `add_employee_attendance` | Model EmployeeAttendance — **CONCLUÍDO** | ✅ PASSO 3.2 |
| `add_conta_pagar_active` | Campo active em ContaPagar — **CONCLUÍDO** | ✅ BLOCO E |

---

## ✅ EXECUTADO NO SPRINT FINAL (23/03/2026)

| Item | O que foi feito | Status |
|------|----------------|--------|
| PASSO 0.1 | `package.json` corrigido — `prisma:seed` → `seed-full.ts`, scripts órfãos removidos | ✅ |
| PASSO 0.2 | `prisma generate` rodado, casts `as any` removidos de `absences.service.ts`, enums importados | ✅ |
| PASSO 0.3 | `RolesGuard` adicionado nos métodos `approve`/`reject` do `reimbursement.controller.ts` | ✅ |
| PASSO 0.4 | `req.user?.id \|\| req.user?.sub` → `req.user.id` em `classes.controller.ts` | ✅ |
| PASSO 0.5 | Soft delete nos 3 services (employees, trucks, classes) | ✅ |
| PASSO 1.1 | `turma.enrollments` em vez de `stats.enrollments` — resolve TypeError no map | ✅ |
| PASSO 1.2 | Normalização UTC `Date.UTC(y,m-1,d)` no `bulkAttendance` + `registeredBy` no update | ✅ |
| PASSO 1.4 | Reembolso teacher: `res.data?.data ?? []` + reset tipo para `'FOOD'` | ✅ |
| PASSO 1.7 | localStorage fallback removido da frequência ADM — erro real exibido | ✅ |
| PASSO 1.8 | Endpoint `GET /classes/:id/attendance/history` criado (controller + service) | ✅ |
| PASSO 1.3 | `UserPreferences` — schema, `db push`, `prisma generate`, service, controller, 4 portais | ✅ |
| PASSO 1.5 | Carretas: datas ISO→Date no trucks.service (create+update), console.error removido | ✅ |
| PASSO 2.5 | Hamburger: student/Header + teacher/Header usam `hamburger-btn` (some no desktop) | ✅ |
| PASSO 3.7 | teacher/historico: alert() → toast + chamada real POST /teachers/me/checkin | ✅ |
| PASSO 3.14 | useAuthStore.logout() limpa localStorage completo + console.error removido | ✅ |
| PASSO 3.1 | WS: 8 eventos + histórico persistido — reimbursement, absences, enrollments atualizados | ✅ |
| PASSO 3.11 | Frequência ADM: triple-click → 2 botões P/F touch-friendly (min-height 44px) | ✅ |
| PASSO 3.12 | Frequência ADM: ao reabrir dia registrado carrega estado salvo + banner "Editando" | ✅ |
| PASSO 2.3 | driver/reembolsos: campo valor type="number" step="0.01" min="0" | ✅ |
| console.error | 14 ocorrências em 10 arquivos frontend removidas (auditoría completa) | ✅ |
| BUG-07 | Configurações: `useAuthStore` corrigido nos 4 portais — nome salva corretamente | ✅ BLOCO I |
| BLOCO J | Auditoria modais `position:fixed` — todos corretos, nenhuma correção necessária | ✅ |
| BLOCO K | PASSO 3.6 — CRUD imprevistos: schema `active`, soft delete, create/edit/delete admin | ✅ |
| BLOCO L | BI dashboard — cast `(a as any).cidadeNome` removido, endpoint funciona corretamente | ✅ |
| BLOCO M | PASSO 3.3 — Calendário aluno: filtro por turma, modal detalhe, botão Hoje, dados reais | ✅ |
| PASSO 3.2 | Frequência funcionários: schema `EmployeeAttendance`, db push, service, controller, UI | ✅ |
| tsc | Zero erros TypeScript — validado ✅ |

---

## 🔐 CREDENCIAIS DE TESTE (após seed)

```
admin@qualifica.com              → RR@@Upgrade → ADMIN
maria.professora.visual@qualifica.com → RR@@Upgrade → TEACHER
joao.driver.test99@qualifica.com → RR@@Upgrade → DRIVER
aluno@qualifica.com              → RR@@Upgrade → STUDENT
```

---

## ✅ FUNCIONALIDADES IMPLEMENTADAS E VALIDADAS

### Portal do Administrador
| Funcionalidade | Status | Notas |
|---------------|--------|-------|
| Dashboard com analytics reais | ✅ | EXEC-07 |
| CRUD Alunos | ✅ | Bug nome completo ativo (BUG-ACTIVE-07) |
| CRUD Funcionários | ✅ | Bug modal posição (ALERTA-05) |
| CRUD Cursos | ✅ | — |
| CRUD Turmas | ✅ | Bug enrollments.map (BUG-ACTIVE-01) |
| Kanban Inscrições | ✅ | Bug botões (BUG-ACTIVE-08) |
| Frequência (alunos) | ✅ | 2 botões P/F — PASSO 3.11/3.12 |
| Reembolsos | ✅ | UTF-8 corrompido (BUG-ACTIVE-09) |
| Contas a Pagar | ✅ | Campo `active` + soft delete + aba Excluídos com restaurar — PASSO 3.9 |
| Relatórios PDF | ✅ | Requer Chromium instalado |
| XLSX Export | ✅ | Design básico — melhoria pendente |
| Feriados | ✅ | Modal com motivo obrigatório ao excluir — PASSO 3.8 |
| Imprevistos | ✅ | CRUD completo — listar, criar, editar, excluir (soft delete), revisar — PASSO 3.6 |
| Histórico Atividades | ✅ | Sem paginação/filtros (PASSO 3.5) |
| Grupos / Carretas | ✅ | Bug 500 no cadastro (BUG-ACTIVE-05) |
| Rotas BI | ✅ | Cast `(a as any)` corrigido — BLOCO L |
| 2FA | ✅ | — |
| Configurações | ✅ | Preferências salvas via UserPreferences + nome via Zustand — BLOCO I |
| Frequência funcionários | ✅ | PASSO 3.2 — EmployeeAttendance, UI com 2 botões P/F, histórico por data |


### Portal do Professor
| Funcionalidade | Status | Notas |
|---------------|--------|-------|
| Dashboard (turmas do professor) | ✅ | EXEC-03 |
| Frequência — seleção de turma + dia | ✅ | EXEC-03, design validado pelo Davi |
| Frequência — persistência por dia | ✅ | PASSO 1.2 — normalização UTC |
| Frequência — nome hardcoded no registro | ✅ | PASSO 0.4 — req.user.id corrigido |
| Histórico de frequência | ✅ | EXEC-06 |
| Reembolsos — criar | ✅ | — |
| Reembolsos — histórico | ✅ | PASSO 1.4 — padrão paginado correto |
| Imprevistos | ✅ | CRUD completo — PASSO 3.6 |
| Certificados | ✅ | — |
| Configurações | ✅ | Preferências salvas via UserPreferences (PASSO 1.3) |
| Notificações → ADM | ✅ | PASSO 3.1 — eventos completos + histórico persistido |

### Portal do Aluno
| Funcionalidade | Status | Notas |
|---------------|--------|-------|
| Dashboard com frequência real | ✅ | EXEC-04 |
| Inscrições — listar | ✅ | — |
| Inscrições — tabs + botão ação | ✅ | PASSO 3.10 — tabs Minhas/Disponíveis + botão Inscrever-se |
| Inscrições — cursos disponíveis | ✅ | PASSO 3.10 — cards com vagas, datas, rota /inscricao/:id |
| Calendário | ✅ | PASSO 3.3 — filtro turma, modal detalhe, botão Hoje, dados reais |
| QR Code de certificado | ✅ | Fundo sem opacidade total (PASSO 2.4) |
| Imprevistos | ✅ | Sem animações (PASSO 2.8) |
| Configurações | ✅ | Preferências salvas via UserPreferences (PASSO 1.3) |
| Sidebar hamburger visível no desktop | ✅ | PASSO 2.5 — classe hamburger-btn corrigida |
| Notificações recebidas | ✅ | PASSO 3.1 — 8 eventos + histórico persistido |

### Portal do Motorista
| Funcionalidade | Status | Notas |
|---------------|--------|-------|
| Dashboard | ✅ | Layout diferente dos outros portais (PASSO 2.7) |
| Viagens | ✅ | — |
| Reembolsos — criar | ✅ | — |
| Reembolsos — histórico | ✅ | já usava padrão correto (res.data?.data) |
| Manutenção | ✅ | UTF-8 corrompido (BUG-ACTIVE-09) |
| Imprevistos | ✅ | CRUD completo — PASSO 3.6 |
| 2FA QR Code | 🟡 | Formatação inadequada (PASSO 2.4) |
| Configurações | ✅ | Preferências salvas via UserPreferences (PASSO 1.3) |

---

## 📋 PENDÊNCIAS PRIORITÁRIAS (ordenadas por impacto)

| # | Descrição | Impacto | Passo |
|---|-----------|---------|-------|
| 1 | QR Code overlay — formatação inadequada | 🟡 Médio | 2.4 |
| 2 | Funcionários: modal não fixo / scroll problemático | 🟡 Médio | 2.6 |
| 3 | Persistência de formulário (sessionStorage) | 🟢 Baixo | 3.13 |
| 4 | Tutorial assistido | 🟢 Baixo | 3.4 |
| 5 | Redis senha para produção | 🟢 Baixo | 3.15 |
| 6 | Dashboard motorista — decisão Tech Lead | 🟡 Médio | 2.7 |

---

## 🏃 COMANDOS DE TESTE RÁPIDO

```powershell
# Iniciar backend corretamente
cd backend
Remove-Item Env:PORT -ErrorAction SilentlyContinue
npm run start:dev

# Instalar Chromium para PDFs (se necessário)
cd backend && npx puppeteer browsers install chrome

# Verificar TypeScript antes de commitar
npx tsc --noEmit

# Rodar seeds
npm run prisma:seed    # seed principal
npm run seed:extra     # dados de demo
```

---

*Sistema Upgrade | RR TECNOL | Atualizado: 23/03/2026 após auditoria completa + feedback Davi*
