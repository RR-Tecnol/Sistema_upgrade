
## ━━━ EXEC-01 — Employee cria User + DRIVER no UserRole + migration ━━━

```
EXEC-01 | Sistema Upgrade | Gravity 2.0 → Antygravity

OBJETIVO: Ao cadastrar um funcionário, criar automaticamente um User com senha
de acesso. Adicionar DRIVER ao UserRole. Criar a relação Employee↔User no banco.

MAPEAMENTO EmployeeRole → UserRole:
  INSTRUCTOR   → TEACHER
  COORDINATOR  → COORDINATOR
  DRIVER       → DRIVER
  NURSE        → TEACHER
  TECHNICIAN   → TEACHER
  ADMINISTRATIVE → TEACHER
  OTHER        → TEACHER

━━━ PASSO 1 — schema.prisma ━━━

1a) Adicionar DRIVER ao enum UserRole (após STUDENT):
  DRIVER

1b) Adicionar userId ao model Employee (antes de acaoFuncionarios):
  userId    String?    @unique  // User de acesso ao sistema

1c) Adicionar relação no model User (após a linha de teacher Teacher?):
  employee  Employee?

1d) Rodar:
  cd backend
  npx prisma migrate dev --name add-driver-role-and-employee-user
  npx prisma generate

━━━ PASSO 2 — backend/src/employees/dto/create-employee.dto.ts ━━━

Adicionar ao final da classe CreateEmployeeDto:

  @ApiPropertyOptional({ description: 'Senha de acesso ao sistema' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

━━━ PASSO 3 — backend/src/employees/employees.service.ts ━━━

Adicionar import no topo:
  import * as bcrypt from 'bcrypt';

Dentro do método create(dto), ANTES do this.prisma.employee.create():

  let userId: string | undefined;
  if (dto.email && dto.password) {
      const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existingUser) throw new ConflictException('E-mail já possui conta de usuário');
      
      const roleMap: Record<string, string> = {
          INSTRUCTOR: 'TEACHER', COORDINATOR: 'COORDINATOR', DRIVER: 'DRIVER',
          NURSE: 'TEACHER', TECHNICIAN: 'TEACHER', ADMINISTRATIVE: 'TEACHER', OTHER: 'TEACHER',
      };
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const user = await this.prisma.user.create({
          data: {
              email: dto.email,
              password: hashedPassword,
              name: dto.name,
              phone: dto.phone,
              role: (roleMap[dto.role] || 'TEACHER') as any,
              active: dto.active ?? true,
          },
      });
      userId = user.id;
  }

No this.prisma.employee.create({ data: { ... } }), adicionar ao final do objeto data:
  ...(userId ? { userId } : {}),

━━━ PASSO 4 — frontend/app/admin/funcionarios/page.tsx ━━━

Leia o arquivo. Fazer 3 mudanças:

4a) No EMPTY_FORM (objeto initial state), adicionar:
  password: '',
  confirmPassword: '',

4b) No Step 2 (seção de contato), APÓS o campo email, adicionar
    este bloco APENAS quando !editingEmployee (cadastro novo):

  {!editingEmployee && (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div>
        <label className="form-label">Senha de Acesso *</label>
        <input type="password" className="form-input"
          placeholder="Mín. 6 caracteres"
          value={form.password || ''}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        <p style={{fontSize:'0.7rem',color:'#9CA3AF',marginTop:4}}>
          Usada para login no portal
        </p>
      </div>
      <div>
        <label className="form-label">Confirmar Senha *</label>
        <input type="password" className="form-input"
          placeholder="Repita a senha"
          value={form.confirmPassword || ''}
          onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} />
      </div>
    </div>
  )}

4c) No handleSubmit, ANTES de montar o payload, adicionar validação:
  if (!editingEmployee && form.password) {
      if (form.password.length < 6) { setError('Senha deve ter mínimo 6 caracteres'); return; }
      if (form.password !== form.confirmPassword) { setError('Senhas não coincidem'); return; }
  }
  E no payload adicionar:
  password: !editingEmployee ? form.password : undefined,

━━━ PASSO 5 — frontend/app/login/page.tsx ━━━

No bloco de redirect pós-login, substituir o else genérico por:

  } else if (response.user.role === 'TEACHER') {
      router.push('/teacher/dashboard');
  } else if (response.user.role === 'DRIVER') {
      router.push('/driver/dashboard');
  } else if (response.user.role === 'COORDINATOR') {
      router.push('/admin/dashboard');
  } else {
      router.push('/teacher/dashboard');
  }

━━━ VALIDAÇÃO ━━━
  cd backend && npx tsc --noEmit
  cd frontend && npm run build

REPORTE:
  EXEC-01 | STATUS: ✅/❌
  MIGRATION: aplicada SIM/NÃO
  TSC: OK/FALHOU | BUILD: OK/FALHOU
```

---

## ━━━ EXEC-02 — Portal do Motorista /driver/* (4 telas) ━━━

```
EXEC-02 | Sistema Upgrade | Gravity 2.0 → Antygravity

OBJETIVO: Criar o portal completo do motorista. Usa o mesmo padrão visual dark
do portal do professor (background #0F172A, cards #1E293B, destaque #FFD600).

TELAS A CRIAR:
  /driver/layout.tsx           — layout com sidebar e header (igual teacher)
  /driver/page.tsx             — redirect para /driver/dashboard
  /driver/dashboard/page.tsx   — dashboard do motorista
  /driver/viagens/page.tsx     — histórico de viagens (trips do banco)
  /driver/reembolsos/page.tsx  — REUTILIZAR o mesmo padrão do teacher/reembolsos

━━━ ARQUIVO 1 — frontend/app/driver/layout.tsx ━━━

Copiar exatamente o arquivo teacher/layout.tsx.
Mudar apenas:
  - "Portal do Professor" → "Portal do Motorista"
  - "Professor Instrutor" → "Motorista"
  - navItems: substituir por:
      { name: 'Dashboard', href: '/driver/dashboard', icon: HomeIcon },
      { name: 'Viagens', href: '/driver/viagens', icon: TruckIcon },
      { name: 'Reembolsos', href: '/driver/reembolsos', icon: BanknotesIcon },
  - TruckIcon importar de '@heroicons/react/24/outline'

━━━ ARQUIVO 2 — frontend/app/driver/page.tsx ━━━

  import { redirect } from 'next/navigation';
  export default function DriverRoot() { redirect('/driver/dashboard'); }

━━━ ARQUIVO 3 — frontend/app/driver/dashboard/page.tsx ━━━

Criar dashboard com:
  - Saudação contextual (Bom dia/Boa tarde/Boa noite)
  - 3 KPI cards: viagens este mês, km rodados, reembolsos pendentes
  - Buscar dados de: GET /trucks/trips (ou endpoint existente de trips)
  - Botão destaque: "Ver Minhas Viagens" linking para /driver/viagens
  - Estilo idêntico ao teacher/dashboard

━━━ ARQUIVO 4 — frontend/app/driver/viagens/page.tsx ━━━

Buscar GET /trucks/trips ou GET /trips (verificar qual endpoint existe).
Exibir lista de viagens com: data, origem, destino, status, km rodados.
Se endpoint não existir, exibir estado vazio com mensagem "Nenhuma viagem registrada".
Estilo dark idêntico ao professor.

━━━ ARQUIVO 5 — frontend/app/driver/reembolsos/page.tsx ━━━

Copiar EXATAMENTE o arquivo teacher/reembolsos/page.tsx.
Não alterar nada — o comportamento é idêntico (motorista também solicita reembolsos
de campo com foto pelo celular).

━━━ VALIDAÇÃO ━━━
  cd frontend && npm run build

REPORTE:
  EXEC-02 | STATUS: ✅/❌
  ARQUIVOS CRIADOS: layout, page, dashboard, viagens, reembolsos
  BUILD: OK/FALHOU
```

---

## ━━━ EXEC-03 — Professor filtra suas turmas ━━━

```
EXEC-03 | Sistema Upgrade | Gravity 2.0 → Antygravity

OBJETIVO: Professor vê apenas as turmas onde está assignado, não todas.

PASSO 1 — backend/src/classes/classes.service.ts

Em findAll(filters?), adicionar teacherUserId ao tipo e ao where:

  async findAll(filters?: {
      status?: ClassStatus;
      courseId?: string;
      groupId?: string;
      cityId?: string;
      truckId?: string;
      teacherUserId?: string;   // NOVO
  }) {
  
  // Adicionar ao bloco where:
  if (filters?.teacherUserId) {
      where.teachers = {
          some: {
              teacher: { userId: filters.teacherUserId },
          },
      };
  }

PASSO 2 — backend/src/classes/classes.controller.ts

No endpoint GET /, adicionar query param teacherUserId e passar para o service.

  @ApiQuery({ name: 'teacherUserId', required: false })
  // no método:
  @Query('teacherUserId') teacherUserId?: string,
  // no return:
  return this.classesService.findAll({ status, courseId, groupId, cityId, truckId, teacherUserId });

PASSO 3 — frontend/app/teacher/dashboard/page.tsx
           frontend/app/teacher/frequencia/page.tsx

Em ambos os arquivos, localizar a chamada api.get('/classes', ...).
Substituir por:

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const res = await api.get('/classes', {
      params: { teacherUserId: user.id }
  });

━━━ VALIDAÇÃO ━━━
  cd backend && npx tsc --noEmit

REPORTE:
  EXEC-03 | STATUS: ✅/❌ | TSC: OK/FALHOU
```

---

## ━━━ EXEC-04 — Frequência real do aluno ━━━

```
EXEC-04 | Sistema Upgrade | Gravity 2.0 → Antygravity

OBJETIVO: Substituir o mock 87% por dados reais do banco.

PASSO 1 — backend/src/students/students.service.ts

Adicionar método ao final da classe:

  async getAttendanceSummary(userId: string) {
      const student = await this.prisma.student.findUnique({
          where: { userId }, select: { id: true },
      });
      if (!student) return { totalClasses: 0, presentCount: 0, absentCount: 0, rate: 0 };
      const [total, present] = await Promise.all([
          this.prisma.attendance.count({ where: { studentId: student.id } }),
          this.prisma.attendance.count({ where: { studentId: student.id, present: true } }),
      ]);
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return { totalClasses: total, presentCount: present, absentCount: total - present, rate };
  }

PASSO 2 — backend/src/students/students.controller.ts

Adicionar endpoint (ANTES de qualquer rota com :id):

  @Get('me/attendance-summary')
  @UseGuards(JwtAuthGuard)
  async myAttendanceSummary(@Request() req: any) {
      return this.studentsService.getAttendanceSummary(req.user.id);
  }

PASSO 3 — frontend/app/student/dashboard/page.tsx

Localizar a linha:
  setAttendance({ totalClasses: 32, presentCount: 28, absentCount: 4, rate: 87 });

Substituir o fetchData() para incluir:

  const [enrollRes, certRes, attendRes] = await Promise.allSettled([
      api.get('/students/me/enrollments'),
      api.get('/students/me/certificates'),
      api.get('/students/me/attendance-summary'),
  ]);
  if (attendRes.status === 'fulfilled') {
      const d = attendRes.value.data;
      setAttendance({ totalClasses: d.totalClasses||0, presentCount: d.presentCount||0,
          absentCount: d.absentCount||0, rate: d.rate||0 });
  } else {
      setAttendance({ totalClasses: 0, presentCount: 0, absentCount: 0, rate: 0 });
  }

━━━ VALIDAÇÃO ━━━
  cd backend && npx tsc --noEmit

REPORTE:
  EXEC-04 | STATUS: ✅/❌ | TSC: OK/FALHOU
```

---

## ━━━ EXEC-05 — PDFs governamentais ━━━

```
EXEC-05 | Sistema Upgrade | Gravity 2.0 → Antygravity

OBJETIVO: Fazer os PDFs funcionarem no Windows + endpoint /all.

⚠️ LEIA ANTES DE IMPLEMENTAR: docs/research/SPECS_PDF_GOVERNAMENTAL.md
O PDF deve seguir o modelo real aprovado pelo Robert S. Pimentel —
não gerar um PDF genérico!

PASSO 1 — Instalar Chromium
  cd backend
  npx puppeteer browsers install chrome

PASSO 2 — backend/src/reports/pdf.service.ts

No método htmlToPdf(), substituir o bloco puppeteer.launch() por:

  const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
          '--no-sandbox', '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', '--disable-gpu',
          '--no-first-run', '--no-zygote',
      ],
  });

Adicionar método getAllClassIds() antes de generateFrequencyReport:

  async getAllClassIds(): Promise<string[]> {
      const classes = await this.prisma.class.findMany({
          where: {}, select: { id: true }, orderBy: { createdAt: 'desc' }, take: 20,
      });
      return classes.map(c => c.id);
  }

Reescrever buildFrequencyHtml() com:
  - Cabeçalho com 4 logos institucionais (SETRE, Gov.PI, Upgrade, brasão) em faixa
  - Faixa colorida antes da tabela: nome do curso + turno + horário (fundo azul-marinho)
  - Tabela com UMA COLUNA POR DIA DE AULA (não contagem total)
  - Header da tabela: dia da semana abreviado + número do dia (fundo amarelo-ouro)
  - Células "P": fundo azul, texto branco | Células "F": sem destaque
  - Rodapé: linha de assinatura + nome do instrutor + cargo

Reescrever buildConcludentsHtml() com:
  - Mesmo cabeçalho com 4 logos
  - Tabela de APROVADOS: 2 colunas apenas (NOME | ASSINATURA)
  - Tabela de DESISTENTES (página separada): 1 coluna apenas (NOME)
  - Data por extenso no rodapé + linha de assinatura

Modificar generateFrequencyReport() — REMOVER where: { present: true } nas attendances:
  attendances: { select: { studentId: true, date: true, present: true } }
  (precisamos de P e F para montar a tabela por dia)

PASSO 3 — backend/src/reports/reports.controller.ts

Adicionar ANTES de @Get('frequency/:classId'):

  @Get('frequency/all')
  async frequencyAll(@Res() res: Response) {
      const ids = await this.pdfService.getAllClassIds();
      if (!ids.length) return res.status(404).json({ message: 'Nenhuma turma encontrada' });
      const { html } = await this.pdfService.generateFrequencyReport(ids[0]);
      const pdf = await this.pdfService.htmlToPdf(html);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="frequencia-geral.pdf"`);
      return res.send(pdf);
  }

  @Get('concludents/all')
  async concludentsAll(@Res() res: Response) {
      const ids = await this.pdfService.getAllClassIds();
      if (!ids.length) return res.status(404).json({ message: 'Nenhuma turma encontrada' });
      const { html } = await this.pdfService.generateConcludentsList(ids[0]);
      const pdf = await this.pdfService.htmlToPdf(html);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="concludentes-geral.pdf"`);
      return res.send(pdf);
  }

PASSO 4 — frontend/app/admin/relatorios/page.tsx

Substituir o downloadPdf() por:

  const downloadPdf = async (type: 'frequency' | 'concludents') => {
      if (!selectedClass) { alert('Selecione uma turma'); return; }
      setPdfLoading(type);
      try {
          const endpoint = selectedClass === 'all'
              ? `/reports/${type}/all`
              : `/reports/${type}/${selectedClass}`;
          const res = await api.get(endpoint, { responseType: 'blob' });
          const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = `${type}-${selectedClass}-${new Date().toISOString().slice(0,10)}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
      } catch (err: any) {
          alert(err?.response?.status === 500
              ? 'Erro ao gerar PDF. Execute: cd backend && npx puppeteer browsers install chrome'
              : 'Erro ao gerar PDF.');
      } finally { setPdfLoading(null); }
  };

━━━ VALIDAÇÃO ━━━
  cd backend && npx tsc --noEmit

REPORTE:
  EXEC-05 | STATUS: ✅/❌ | PUPPETEER: OK/FALHOU | TSC: OK/FALHOU
```

---

## ━━━ EXEC-06 — Histórico do professor ━━━

```
EXEC-06 | Sistema Upgrade | Gravity 2.0 → Antygravity

PASSO 1 — backend/src/classes/classes.service.ts

Adicionar método ao final:

  async getTeacherAttendanceHistory(teacherUserId: string) {
      return this.prisma.attendance.findMany({
          where: { registeredBy: teacherUserId },
          select: {
              id: true, date: true, present: true,
              class: { select: {
                  classIdentifier: true,
                  course: { select: { name: true } },
                  city: { select: { name: true, state: true } },
              }},
          },
          orderBy: { date: 'desc' },
          take: 100,
      });
  }

PASSO 2 — backend/src/classes/classes.controller.ts

Adicionar ANTES de @Get(':id'):

  @Get('teacher/history')
  @UseGuards(JwtAuthGuard)
  async teacherHistory(@Request() req: any) {
      return this.classesService.getTeacherAttendanceHistory(req.user.id);
  }

PASSO 3 — frontend/app/teacher/historico/page.tsx

Reescrever completamente: buscar GET /classes/teacher/history, agrupar por data,
exibir cards com data + nome da turma + cidade + contagem P/F.
Usar estilo dark (background #0F172A, cards #1E293B, texto #F1F5F9, destaque #FFD600).

━━━ VALIDAÇÃO ━━━
  cd backend && npx tsc --noEmit

REPORTE:
  EXEC-06 | STATUS: ✅/❌ | TSC: OK/FALHOU
```

---

## ━━━ EXEC-07 — Gráficos do dashboard admin com dados reais ━━━

```
EXEC-07 | Sistema Upgrade | Gravity 2.0 → Antygravity

PASSO 1 — backend/src/dashboard/dashboard.service.ts

Adicionar método ao final da classe:

  async getAnalytics() {
      const now = new Date();
      const year = now.getFullYear();
      // Inscrições por mês (últimos 12 meses)
      const enrollmentsByMonth = await Promise.all(
          Array.from({ length: 12 }, async (_, i) => {
              const month = new Date(year, i, 1);
              const nextMonth = new Date(year, i + 1, 1);
              const count = await this.prisma.enrollment.count({
                  where: { createdAt: { gte: month, lt: nextMonth } },
              });
              return { mes: month.toLocaleString('pt-BR', { month: 'short' }), inscrições: count };
          })
      );
      // Alunos por curso (top 6)
      const byCourse = await this.prisma.enrollment.groupBy({
          by: ['classId'],
          _count: { _all: true },
          orderBy: { _count: { classId: 'desc' } },
          take: 6,
      });
      const studentsByCourse = await Promise.all(
          byCourse.map(async r => {
              const cls = await this.prisma.class.findUnique({
                  where: { id: r.classId }, select: { course: { select: { name: true } } },
              });
              return { curso: cls?.course?.name?.slice(0, 18) || 'Desconhecido', alunos: r._count._all };
          })
      );
      return { enrollmentsByMonth, studentsByCourse };
  }

PASSO 2 — backend/src/dashboard/dashboard.controller.ts

Adicionar endpoint:

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  async analytics() {
      return this.dashboardService.getAnalytics();
  }

PASSO 3 — frontend/app/admin/dashboard/page.tsx

Localizar as constantes hardcoded enrollmentsByMonth e studentsByCourse.
No useEffect/fetchData, adicionar chamada:

  const analyticsRes = await api.get('/dashboard/analytics').catch(() => ({ data: null }));
  if (analyticsRes.data) {
      setEnrollmentsByMonth(analyticsRes.data.enrollmentsByMonth);
      setStudentsByCourse(analyticsRes.data.studentsByCourse);
  }

E criar os useState correspondentes para essas variáveis.

━━━ VALIDAÇÃO ━━━
  cd backend && npx tsc --noEmit

REPORTE:
  EXEC-07 | STATUS: ✅/❌ | TSC: OK/FALHOU
```

---

## ━━━ EXEC-08 — Ordem de rotas /enrollments ━━━

```
EXEC-08 | Sistema Upgrade | Gravity 2.0 → Antygravity

OBJETIVO: Garantir que GET /enrollments/my está ANTES de GET /enrollments/:id.

Leia backend/src/enrollments/enrollments.controller.ts.

Verificar a ordem de declaração das rotas GET:
  - Se @Get('my') / findMyEnrollments está ANTES de @Get(':id'): NÃO alterar nada.
  - Se @Get(':id') está ANTES de @Get('my'): mover o bloco do método findMyEnrollments
    para ANTES do método findOne.

Mesma verificação para certificates.controller.ts.

━━━ VALIDAÇÃO ━━━
  cd backend && npx tsc --noEmit

REPORTE:
  EXEC-08 | STATUS: ordem correta / foi necessário corrigir | TSC: OK/FALHOU
```
