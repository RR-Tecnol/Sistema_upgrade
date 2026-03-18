# 📊 ESTADO DO SISTEMA — Sistema Upgrade
## Snapshot do Estado Real | Atualizado após cada ciclo de execução
## Última atualização: 18/03/2026 — Sessão tarde (responsividade portal motorista)

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

## 🔴 EXEC-03 — Professor filtra suas turmas (PRÓXIMO)

`GET /classes` não filtra por `teacherId`. Professor vê turmas de todos.
Arquivos: `teacher/dashboard/page.tsx`, `teacher/frequencia/page.tsx`, `classes.service.ts`

---

## 🔴 EXEC-04 — Frequência real do aluno (PENDENTE)

`setAttendance({totalClasses:32, rate:87})` hardcoded em `student/dashboard/page.tsx`.
Novo endpoint a criar: `GET /students/me/attendance-summary`

---

## 🔴 EXEC-05 — PDFs governamentais (PENDENTE, após EXEC-04)

Ver specs em `docs/research/05_reports/SPECS_PDF_GOVERNAMENTAL.md`.

---

## 🔴 EXEC-06 — Histórico do professor (PENDENTE, após EXEC-03)

`frontend/app/teacher/historico/page.tsx` é placeholder vazio.

---

## 📋 PENDÊNCIAS IMEDIATAS

| # | Pendência | Impacto | Arquivo |
|---|-----------|---------|---------|
| P-01 | `GET /reimbursements/my` retorna 404 para DRIVER | KPIs de reembolso no dashboard mostram 0 sem dados reais | `backend/src/reimbursement/reimbursement.controller.ts` |
| P-02 | git commit de toda a Fase 2 | Código não está no GitHub | — |

---

## 📋 ALERTAS ATIVOS (não críticos)

| # | Alerta | Arquivo | Ação |
|---|--------|---------|------|
| A-01 | Credenciais admin visíveis em tela | `login/page.tsx` | Remover antes do deploy |
| A-02 | SUPER_ADMIN no RolesGuard | `certificate.controller.ts` | Não existe no enum — limpar em refatoração |
| A-03 | `@Get(':id')` orphan em JSDoc | `enrollments.controller.ts` linha 66 | Limpar em refatoração |
| A-04 | "Frequência Média" 91% hardcoded | `admin/dashboard/page.tsx` | Depende do EXEC-04 |

---

## 🏃 COMANDOS DE TESTE RÁPIDO

```powershell
# Login motorista
node -e "const h=require('http');const d=JSON.stringify({email:'joao.driver.test99@qualifica.com',password:'senha123'});const r=h.request({hostname:'localhost',port:3001,path:'/api/auth/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(d)}},res=>{let s='';res.on('data',c=>s+=c);res.on('end',()=>console.log(JSON.parse(s).user?.role))});r.write(d);r.end()"
```

---

*Sistema Upgrade | RR TECNOL | Atualizado: 18/03/2026 após responsividade portal motorista*
