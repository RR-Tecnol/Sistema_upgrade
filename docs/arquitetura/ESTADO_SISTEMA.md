## Estado do Sistema — Sistema Upgrade
## Snapshot do Estado Real | Atualizado após cada ciclo de execução
## Última atualização: 19/03/2026 — Sessão Conclusão Fase 2 (EXEC-03/04/05/06 + P-01 + A-02)

> **O que é este documento?**
> Snapshot preciso do que funciona, o que está quebrado e o que está pendente.
> Atualizado ao final de cada EXEC validado. Leia ANTES de iniciar qualquer nova implementação.
>
> Para o histórico narrativo, ver: [DIARIO_DE_BORDO.md](./DIARIO_DE_BORDO.md)
> Para os próximos passos, ver: [ROADMAP_EPICOS.md](./ROADMAP_EPICOS.md)
> Para regras de responsividade, ver: [REGRAS_RESPONSIVIDADE_PORTAL_MOTORISTA.md](./REGRAS_RESPONSIVIDADE_PORTAL_MOTORISTA.md)

---

## 🟢 INFRAESTRUTURA — Tudo saudável

| Serviço | Status | Porta | Notas |
|---------|--------|-------|-------|
| PostgreSQL (Docker) | ✅ Up healthy | 5432 | UTF-8 pt_BR. Banco: cursos_db |
| Redis (Docker) | ✅ Up healthy | 6379 | — |
| MinIO (Docker) | ✅ Up healthy | 9000/9001 | Buckets: reimbursements, certificates, reports, photos |
| Backend NestJS | ✅ Rodando | **3001** | PORT=3001 canônica no backend/.env |
| Frontend Next.js | ✅ Rodando | 3000 | NEXT_PUBLIC_API_URL=http://localhost:3001/api |

> ⚠️ **Atenção ao iniciar o backend:** Nunca usar `$env:PORT=3002; npm run start:dev`.
> Procedimento correto: `Remove-Item Env:PORT -ErrorAction SilentlyContinue; npm run start:dev`

---

## 🟢 BANCO DE DADOS — Migrations aplicadas

| Migration | O que faz | Status |
|-----------|-----------|--------|
| Iniciais (Fase 1) | Schema completo Sprints 0→5 | ✅ |
| `20260316130235_add_two_factor` | twoFactorEnabled + twoFactorSecret em User | ✅ |
| `20260318162339_add_driver_role_and_employee_user_relation` | DRIVER enum + userId em Employee | ✅ |
| `20260318173241_add_driver_user_id_to_trip` | driverUserId FK em Trip | ✅ |

**Dados de teste no banco (seed manual + script):**
- Admin: `admin@qualifica.com / admin123`
- Aluno: `aluno@qualifica.com / aluno123`
- Motorista: `joao.driver.test99@qualifica.com / senha123` (role DRIVER)
- Professora: `maria.professora.visual@qualifica.com / prof123` (role TEACHER)
- Truck: `truck-test-0000-0000-0001`, placa ABC-1234, tipo STANDARD
- Trip: `trip-test-0000-0000-0001`, Caxias → São Luís, driverUserId do motorista de teste

---

## ✅ EXEC-08 — Ordem de rotas corrigida (18/03/2026)

`@Get('my')` movido ANTES de `@Get(':id')` em `enrollments.controller.ts`.
Bug silencioso: NestJS capturava a string "my" como valor de `:id`.

---

## ✅ EXEC-07 — Dashboard admin com dados reais (18/03/2026)

Arrays hardcoded substituídos por `api.get('/dashboard/analytics')` em `admin/dashboard/page.tsx`.
Backend já estava implementado com queries reais — não precisou de alteração.

> "Frequência Média" (91%) ainda hardcoded — depende do EXEC-04 (dados reais de Attendance).

---

## ✅ EXEC-01 — Employee cria User + DRIVER + migration (18/03/2026)

Mapeamento EmployeeRole → UserRole implementado no service.
Bloco visual "Acesso ao Sistema" no Step 3 do modal de funcionários.
Redirect DRIVER → /driver/dashboard no login.

---

## ✅ EXEC-02 — Portal do Motorista /driver/* (18/03/2026)

### Backend
- `backend/src/trips/` — trips.service, trips.controller, trips.module
- 5 endpoints em `/driver/trips` com guard `@Roles('DRIVER')`
- Migration `driverUserId` aplicada

### Frontend — 5 arquivos criados
- `frontend/app/driver/layout.tsx`
- `frontend/app/driver/dashboard/page.tsx`
- `frontend/app/driver/viagens/page.tsx`
- `frontend/app/driver/reembolsos/page.tsx`
- `frontend/app/driver/veiculo/page.tsx`

### Arquitetura responsiva final (validada em 5 resoluções)
O portal do motorista usa a arquitetura `position: fixed; inset: 0` descrita em
`REGRAS_RESPONSIVIDADE_PORTAL_MOTORISTA.md`. Esta é a **única** abordagem autorizada para
o shell do portal — não alterar sem consultar as regras.

**Resultados de validação automatizada (Playwright):**

| Resolução | shellGap | Status |
|-----------|----------|--------|
| Mobile 390px | 0px | ✅ |
| Split window 610px | 0px | ✅ |
| Laptop 1024px | 0px | ✅ |
| Desktop 1440px | 0px | ✅ |
| Full HD 1920px | 0px | ✅ |

**Comportamento da sidebar:**
- Overlay mode (`< 1100px`): sidebar flutua sobre o conteúdo via `transform: translateX()`
- Push mode (`>= 1100px`): `--drv-left` CSS custom property empurra o conteúdo

**Testado ao vivo:**
- Login DRIVER → redirect /driver/dashboard ✅
- Trip PLANNED → modal kmStart → trip EM TRÂNSITO ✅
- Botões "Cheguei ao Destino" e "Reportar Problema" funcionando ✅

---

## ✅ EXEC-03 — Professor filtra suas turmas (19/03/2026)

`GET /classes?teacherUserId=:id` implementado.
`classes.service.ts`: filtro `where.teachers.some.teacher.userId`.
`teacher/dashboard/page.tsx` e `teacher/frequencia/page.tsx`: passam `user.id` como param.

---

## ✅ EXEC-04 — Frequência real do aluno (19/03/2026)

`students.service.ts`: método `getAttendanceSummary()` — 2 queries count() em paralelo.
`students.controller.ts`: endpoint `GET /students/me/attendance-summary` adicionado.
`student/dashboard/page.tsx`: chamada real substituindo mock 87% hardcoded.

---

## ✅ EXEC-05 — PDFs governamentais (19/03/2026)

`pdf.service.ts`: `htmlToPdf()` com args Windows + `getAllClassIds()` adicionado.
`reports.controller.ts`: endpoints `GET /reports/frequency/all` e `GET /reports/concludents/all`.
`relatorios/page.tsx`: `downloadPdf()` com roteamento all vs classId.
Chromium deve ser instalado com: `npx puppeteer browsers install chrome`

---

## ✅ EXEC-06 — Histórico do professor (19/03/2026)

`classes.service.ts`: método `getTeacherAttendanceHistory(teacherUserId)`.
`classes.controller.ts`: endpoint `GET /classes/teacher/history` (antes de /:id).
`teacher/historico/page.tsx`: reescrito com dados reais, timeline por dia, design dark.

---

## 📋 PENDÊNCIAS IMEDIATAS

| # | Pendência | Impacto | Status |
|---|-----------|---------|---------|
| — | Instalar Chromium para PDFs | Necessário para gerar PDFs localmente | `cd backend && npx puppeteer browsers install chrome` |

---

## 📋 ALERTAS ATIVOS (não críticos)

| # | Alerta | Arquivo | Ação |
|---|--------|---------|------|
| A-01 | Credenciais admin visíveis em tela | `login/page.tsx` | Remover antes do deploy |
| A-03 | `@Get(':id')` orphan em JSDoc | `enrollments.controller.ts` linha 66 | Limpar em refatoração |
| A-04 | "Frequência Média" 91% hardcoded | `admin/dashboard/page.tsx` | Depende de endpoint de attendance global |

---

## 🏃 COMANDOS DE TESTE RÁPIDO

```powershell
# Login motorista
node -e "const h=require('http');const d=JSON.stringify({email:'joao.driver.test99@qualifica.com',password:'senha123'});const r=h.request({hostname:'localhost',port:3001,path:'/api/auth/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(d)}},res=>{let s='';res.on('data',c=>s+=c);res.on('end',()=>console.log(JSON.parse(s).user?.role))});r.write(d);r.end()"
```

---

*Sistema Upgrade | RR TECNOL | Atualizado: 18/03/2026 após responsividade portal motorista*
