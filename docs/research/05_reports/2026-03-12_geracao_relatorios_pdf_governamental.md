# 📄 Pesquisa: Arquitetura de Estado da Arte para Geração de Relatórios Governamentais

**Data:** 2026-03-12
**Requisitos:** REQ-11 (Lista de Frequência PDF) e REQ-12 (Lista de Concludentes PDF)
**Fonte:** Deep Research (gerada pelo Tech Lead)
**Status da Pesquisa:** ✅ Concluída — Pronta para implementação

---

## Decisão Arquitetural Tomada

> **Escolha:** Geração **Server-Side no NestJS** com **Puppeteer** (Browser Pool) + **Handlebars/EJS** como template engine
>
> Para relatórios governamentais tabulares com alto volume de dados, a geração via Headless Chrome com pool de instâncias é o padrão da indústria.

---

## 1. Análise de Paradigma: Frontend vs. Backend

### ❌ Frontend (Client-Side) — Descartado

| Problema | Impacto |
|----------|---------|
| Inconsistência visual por browser | Documentos legais não podem ter variações |
| Limite de memória da aba | Listas de 200+ alunos → Out-Of-Memory em dispositivos corporativos |
| Exposição de dados sensíveis | Backend precisaria enviar todo o histórico de presenças ao cliente (violação de privégio mínimo) |

### ✅ Backend (Server-Side) — Escolhido

- **Determinístico:** PDF idêntico independente do dispositivo do usuário
- **Seguro:** Dados sensíveis nunca deixam o servidor desnecessariamente
- **Controle total:** Paginação, cabeçalhos repetitivos, assinaturas digitais, trilhas de auditoria

---

## 2. Avaliação Comparativa de Tecnologias

| Tecnologia | Paradigma | Fidelidade Web | CPU/RAM | Tabelas Complexas |
|------------|-----------|---------------|---------|-------------------|
| **PDFKit** | Canvas Imperativo | Baixa | Muito Baixo | Muito Complexo (manual) |
| **React-PDF** | Componentes (Yoga Flexbox) | Média (CSS restrito) | Baixo | Médio |
| **Puppeteer** ✅ | Headless Chrome | **Altíssima** | Alto (requer pool) | **Excelente** |
| **Playwright** | Headless Cross-Browser | Altíssima | Alto | Excelente |
| **pdfmake** | JSON DDO | Média | Baixo | Bom (repetição de cabeçalho nativa) |

### Por que Puppeteer para Este Projeto?

1. **Cabeçalhos de tabela repetitivos** automáticos via `<thead>` + Print CSS
2. **Quebra de página inteligente** com `page-break-inside: avoid`
3. **Suporte completo a CSS3** — logo da empresa, fontes governamentais, margens precisas
4. **Print Media Queries** — o mesmo template serve para visualização web e impressão

---

## 3. Implementação no NestJS

### 3.1. PdfGenerationService — Singleton com Browser Pool

```typescript
@Injectable()
export class PdfGenerationService implements OnModuleInit, OnModuleDestroy {
  private browserPool: Browser[] = [];
  private readonly POOL_SIZE = 3;

  async onModuleInit() {
    // Inicializa pool de browsers ao subir a aplicação (warm start)
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      this.browserPool.push(browser);
    }
  }

  async generatePdf(htmlContent: string): Promise<Buffer> {
    const browser = this.browserPool.pop();  // pega do pool
    const page = await browser.newPage();

    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'  // aguarda fontes e imagens externas carregarem
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
    });

    await page.close();
    this.browserPool.push(browser);  // devolve ao pool

    return pdfBuffer;
  }

  async onModuleDestroy() {
    await Promise.all(this.browserPool.map(b => b.close()));
  }
}
```

> ⚠️ **Por que `waitUntil: 'networkidle0'`?** Relatórios governamentais usam fontes institucionais e o brasão/logo da empresa carregados remotamente. Sem essa opção, o PDF renderiza com fontes genéricas ou imagens ausentes.

---

## 4. Template HTML para Lista de Frequência (REQ-11)

```html
<!-- Estrutura base para lista de frequência governamental -->
<!DOCTYPE html>
<html>
<head>
  <style>
    @media print {
      thead { display: table-header-group; }  /* repete cabeçalho em cada página */
      tr { page-break-inside: avoid; }         /* não quebra linha no meio */
      .page-break { page-break-before: always; }
    }
    
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #333; padding: 4px 8px; font-size: 10px; }
    thead { background-color: #003366; color: white; }
    .logo-header { display: flex; justify-content: space-between; align-items: center; }
    .assinatura { margin-top: 60px; border-top: 1px solid #333; width: 200px; }
  </style>
</head>
<body>
  <div class="logo-header">
    <img src="{{logoUrl}}" height="60" alt="Logo Upgrade" />
    <div>
      <h2>LISTA DE FREQUÊNCIA</h2>
      <p>Curso: {{nomeCurso}} | Turma: {{numTurma}} | Período: {{periodo}}</p>
      <p>Município: {{municipio}} | Professor: {{professor}}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Nome Completo</th>
        <th>CPF</th>
        {{#each diasAula}}
          <th>{{this}}</th>
        {{/each}}
        <th>% Freq.</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      {{#each alunos}}
      <tr>
        <td>{{@index}}</td>
        <td>{{nome}}</td>
        <td>{{cpf}}</td>
        {{#each presencas}}
          <td>{{this}}</td>
        {{/each}}
        <td>{{frequencia}}%</td>
        <td>{{status}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="assinatura">
    <p>Professor(a): _______________________</p>
    <p>Data: {{dataEmissao}}</p>
  </div>
</body>
</html>
```

---

## 5. Lista de Concludentes — Lógica Temporal (REQ-12)

### 5.1. Cálculo da 3ª Semana em Dias Úteis

O critério da 3ª semana **não é 21 dias corridos** — é medido em **dias úteis** (15 dias letivos para cursos de 4 semanas de 5 dias cada).

```typescript
@Injectable()
export class ConcludentesService {
  
  async verificarElegiveisConcludentes(classId: string): Promise<void> {
    const turma = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        attendances: true,
        schedules: true  // dias de aula programados
      }
    });

    const totalAulasRealizadas = turma.schedules.filter(s => s.occurred).length;
    const aulasDaTerceiraSemanaCut = 15; // 3 semanas × 5 dias úteis

    if (totalAulasRealizadas < aulasDaTerceiraSemanaCut) return;

    // Para cada aluno, calcular frequência até a 3ª semana
    const concludentes = turma.enrollments.filter(enrollment => {
      const presencas = enrollment.attendances.filter(a => a.present).length;
      const frequencia = presencas / aulasDaTerceiraSemanaCut;
      return frequencia >= 0.80;
    });

    // Persistir marcação de concludente
    await this.prisma.$transaction(
      concludentes.map(e => 
        this.prisma.enrollment.update({
          where: { id: e.id },
          data: { isConcludente: true, concludenteAt: new Date() }
        })
      )
    );
  }
}
```

### 5.2. Agendamento Dinâmico via SchedulerRegistry

```typescript
// Ao criar/iniciar uma turma: cria um job agendado para a data da 3ª semana
async scheduleThirdWeekCheck(turma: Class) {
  const terceiraSemanaDate = this.businessDayService.calculateFutureBusinessDate(
    turma.startDate, 
    15, // 15 dias úteis = 3 semanas
    await this.getHolidaySet(turma.cityId)
  );

  const jobName = `third-week-check-${turma.id}`;
  
  // Registra timeout dinâmico (persiste no Redis para sobreviver a reinicializações)
  this.schedulerRegistry.addTimeout(
    jobName,
    setTimeout(
      () => this.verificarElegiveisConcludentes(turma.id),
      terceiraSemanaDate.getTime() - Date.now()
    )
  );
}
```

---

## 6. Envio por E-mail (REQ-11)

```typescript
// Controlador NestJS para envio da lista de frequência todo dia 20
@Cron('0 8 20 * *')  // Às 8h do dia 20 de cada mês
async enviarListaFrequenciaMensal() {
  const turmasAtivas = await this.prisma.class.findMany({
    where: { status: 'ACTIVE' }
  });

  for (const turma of turmasAtivas) {
    const pdfBuffer = await this.pdfService.gerarListaFrequencia(turma.id);
    
    await this.mailerService.sendMail({
      to: process.env.SECRETARIA_EMAIL,
      subject: `Lista de Frequência — ${turma.course.name} — ${format(new Date(), 'MM/yyyy')}`,
      attachments: [{
        filename: `frequencia-${turma.id}-${format(new Date(), 'MM-yyyy')}.pdf`,
        content: pdfBuffer
      }]
    });
  }
}
```

---

## 7. Deploy e Infraestrutura

### Puppeteer em Docker

```dockerfile
# Adicionar dependências do Chromium no container NestJS
RUN apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxshmfence1 \
    libxss1 \
    xvfb

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

> 💡 **Para ambientes serverless (Vercel/AWS Lambda):** Usar `@sparticuz/chromium` (versão miniaturizada do Chromium). Porém, o pool de instâncias em Docker é superior para volume governamental alto.

---

## Referências para Implementação

- **REQ-11 e REQ-12 no `06_PLANEJAMENTO.md`** — Requisitos originais
- **MinIO** — Armazenamento dos PDFs gerados (bucket `relatorios`)
- **Robert** enviará o modelo oficial de frequência pelo WhatsApp (pendente)
- Logo da empresa: já recebida pelo Ronaldo, aplicar nos templates
