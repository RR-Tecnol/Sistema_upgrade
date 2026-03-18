# 📊 Pesquisa: Exportação Multi-Formato com Filtros Avançados (REQ-13)

**Data:** 2026-03-12
**Requisito:** REQ-13 — Relatórios com Filtros Avançados e Exportação
**Origem na reunião (12/03/2026):** Trechos 00:32:30 — 00:36:00
**Status:** ✅ Pesquisa concluída

---

## Contexto da Reunião

Robert S. Pimentel definiu durante a reunião:

> *"Quero todos os alunos da cidade X no ano Y que receberam certificado."*
> *"No Piauí, no ano 2025, a gente teve 11 rotas — quais cidades foram beneficiadas?"*
> *"Quantos alunos receberam certificado em cada rota?"*

**Formatos exigidos:** Excel (XLSX), CSV, PDF com logo, JSON para integrações.

**Filtros obrigatórios:** por estado (MA/PI), ano, cidade, curso, status de certificado, rota/período.

**Regra do `02_LIVRO_DE_REGRAS.md`:** Soft Delete (`active: Boolean`) — filtros SEMPRE incluem `active: true`. Nunca retornar registros inativos em relatórios.

---

## 1. Biblioteca XLSX: Por que ExcelJS Streaming (e não SheetJS)

### Comparativo de Memória (crítico para 50k+ alunos)

| Biblioteca | Modelo | Estilização | 50k+ linhas | Memória |
|------------|--------|-------------|-------------|---------|
| **ExcelJS** | Streaming + Buffer | Rica, nativa | Moderada | **Excelente (Baixo RSS)** |
| SheetJS (xlsx) | Buffer (Pro para Stream) | Limitada (Community) | Altíssima | Alta (sem Pro) |
| node-xlsx | Baseado em SheetJS | Básica | Moderada | Alta |
| @fast-csv/format | Streaming puro | Nenhuma (só CSV) | Altíssima | Mínima |

**Decisão: ExcelJS WorkbookWriter (modo streaming)**

O SheetJS carrega todo o workbook em RAM antes de escrever. Para 50k alunos com frequências e certificados, isso gera OOM no NestJS. O ExcelJS com `WorkbookWriter` faz `row.commit()` linha a linha — o consumo de RAM permanece constante.

```typescript
// NestJS: ReportController
@Get('alunos/exportar')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'COORDINATOR')
async exportarAlunos(
  @Res() res: Response,
  @Query() filters: ExportFiltersDto
) {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="alunos-${filters.year}-${filters.state}.xlsx"`
  );

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
  const sheet = workbook.addWorksheet('Alunos');

  // Cabeçalhos em português (exigência da reunião)
  sheet.addRow([
    'Nome Completo', 'CPF', 'Município', 'Estado',
    'Curso', 'Rota/Período', 'Frequência (%)',
    'Status Certificado', 'Data Emissão Certificado'
  ]).font = { bold: true };

  // Cursor-based iteration — nunca carrega tudo na RAM
  for await (const aluno of this.reportsService.getAlunosCursor(filters)) {
    const row = sheet.addRow([
      aluno.nome, aluno.cpf, aluno.municipio, aluno.estado,
      aluno.curso, aluno.rota, aluno.frequencia,
      aluno.certificadoStatus, aluno.certificadoEmitidoEm
    ]);

    // Colorir linha pela reunião: verde=certificado emitido, vermelho=não aprovado
    if (aluno.certificadoStatus === 'EMITIDO') {
      row.eachCell(cell => { cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: 'FFD4EDDA' }  // verde claro
      }; });
    } else if (aluno.frequencia < 80) {
      row.eachCell(cell => { cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: 'FFF8D7DA' }  // vermelho claro
      }; });
    }

    row.commit();  // ← libera da memória imediatamente
  }

  await workbook.commit();
}
```

---

## 2. Filtros Avançados Dinâmicos no Prisma (WHERE dinâmico)

```typescript
// NestJS: ReportsService
async *getAlunosCursor(filters: ExportFiltersDto) {
  let cursor: string | undefined = undefined;

  while (true) {
    const results = await this.prisma.student.findMany({
      where: {
        active: true,  // Soft Delete sempre! (02_LIVRO_DE_REGRAS.md)
        // Filtros dinâmicos — só inclui a chave se o filtro foi passado
        ...(filters.state && {
          address: { state: filters.state }
        }),
        ...(filters.cityId && {
          address: { cityId: filters.cityId }
        }),
        enrollments: {
          some: {
            active: true,
            class: {
              active: true,
              ...(filters.year && {
                startDate: {
                  gte: new Date(`${filters.year}-01-01`),
                  lte: new Date(`${filters.year}-12-31`),
                }
              }),
              ...(filters.courseId && { courseId: filters.courseId }),
              ...(filters.acaoId && { acaoId: filters.acaoId }),
            },
            ...(filters.hasCertificate !== undefined && {
              certificate: filters.hasCertificate ? { isNot: null } : { is: null }
            }),
          }
        }
      },
      // Paginação por cursor — O(log N) vs offset que é O(N)
      take: 500,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { id: 'asc' },  // índice único — necessário para cursor
      include: {
        address: true,
        enrollments: {
          where: { active: true },
          include: {
            class: { include: { course: true, acao: true } },
            certificate: true,
            attendances: { where: { active: true } }
          }
        }
      }
    });

    if (results.length === 0) break;

    for (const student of results) {
      for (const enrollment of student.enrollments) {
        const totalAulas = enrollment.attendances.length;
        const presencas = enrollment.attendances.filter(a => a.present).length;
        const freq = totalAulas > 0 ? Math.round((presencas / totalAulas) * 100) : 0;

        yield {
          nome: student.name,
          cpf: student.cpf,
          municipio: student.address.city,
          estado: student.address.state,
          curso: enrollment.class.course.name,
          rota: enrollment.class.acao?.name ?? 'N/A',
          frequencia: freq,
          certificadoStatus: enrollment.certificate ? 'EMITIDO' : 'NÃO EMITIDO',
          certificadoEmitidoEm: enrollment.certificate?.issuedAt ?? null,
        };
      }
    }

    cursor = results[results.length - 1].id;
    if (results.length < 500) break;
  }
}
```

**Por que cursor-based (não offset)?**
- `skip: 1000` no PostgreSQL: lê e descarta 1000 linhas antes de retornar
- Página 1 → 10ms; Página 1000 → 5 segundos (degradação linear)
- Cursor (`WHERE id > 'ultimo_id'`): usa o índice B-tree → O(log N) constante

---

## 3. CSV com Encoding Correto para Excel BR

O Excel brasileiro usa ponto-e-vírgula como separador e espera BOM UTF-8:

```typescript
// NestJS: Para exportação CSV
@Get('alunos/exportar-csv')
async exportarCSV(@Res() res: Response, @Query() filters: ExportFiltersDto) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="alunos.csv"');

  // BOM UTF-8 obrigatório para Excel BR não corromper "ç", "ã", "é"
  res.write('\uFEFF');

  // Cabeçalho com ponto-e-vírgula (Excel BR não aceita vírgula como separador)
  res.write('Nome;CPF;Município;Estado;Curso;Frequência (%);Certificado\n');

  for await (const aluno of this.reportsService.getAlunosCursor(filters)) {
    // Aspas duplas ao redor de strings (para campos com ponto-e-vírgula no nome)
    const linha = [
      `"${aluno.nome}"`, aluno.cpf, `"${aluno.municipio}"`,
      aluno.estado, `"${aluno.curso}"`, aluno.frequencia,
      aluno.certificadoStatus
    ].join(';');
    res.write(linha + '\n');
  }

  res.end();
}
```

| Configuração | Padrão Internacional (RFC 4180) | **Padrão Excel BR (obrigatório)** |
|---|---|---|
| Encoding | UTF-8 | **UTF-8 with BOM (`\uFEFF`)** |
| Separador | Vírgula (`,`) | **Ponto-e-vírgula (`;`)** |
| Separador decimal | Ponto (`.`) | **Vírgula (`,`)** |

---

## 4. Exportações Pesadas: BullMQ (Background Jobs)

Para relatórios de anos completos (ex: "todos alunos de 2025 em MA"), o processamento pode levar 30+ segundos. **Nunca bloquear o Event Loop:**

```
1. POST /reports/async-export → NestJS enfia na fila → retorna { jobId }
2. BullMQ Worker processa em background → gera XLSX → faz upload MinIO
3. Socket.io notifica o admin quando pronto → "Relatório disponível!"
4. Admin clica → GET /reports/download/:jobId → Presigned URL MinIO (30min)
```

```typescript
// Producer
async enqueueExport(filters: ExportFiltersDto, userId: string) {
  const job = await this.exportQueue.add('generate-report', { filters, userId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 60 * 30,  // Remove após 30min
  });
  return { jobId: job.id };
}

// Worker
@Processor('export-queue')
export class ExportProcessor extends WorkerHost {
  async process(job: Job) {
    const { filters, userId } = job.data;

    // 1. Gera arquivo
    const buffer = await this.reportsService.generateXLSXBuffer(filters);

    // 2. Faz upload MinIO
    const key = `exports/${userId}/${Date.now()}.xlsx`;
    await this.minioService.putObject('relatorios', key, buffer);

    // 3. Notifica via Socket.io
    this.notificationsGateway.pushNotificationToUser(userId, {
      type: 'REPORT_READY',
      downloadKey: key,
      message: 'Seu relatório está pronto para download!'
    });
  }
}
```

---

## 5. Rate Limiting em Endpoints de Exportação

```typescript
// NestJS: throttle específico para exportação (mais restrito que global)
@Throttle({ default: { limit: 2, ttl: 60000 } })  // 2 por minuto
@Get('alunos/exportar')
async exportarAlunos(...)
```

**Lógica:** exportações de 50k alunos podem demorar 10-30s cada. Sem throttle, 10 admins simultâneos = OOM. Com throttle = fila organizada.

---

## 6. PDF de Relatório vs. PDF de Certificado

| Característica | Relatório PDF (REQ-13) | Certificado PDF (REQ-11/12) |
|---|---|---|
| Volume | Até 50k linhas | 1 por aluno |
| Engine | **PDFKit** (programático) | **Puppeteer** (HTML→PDF) |
| Memória | Muito baixa (streaming) | 150-300ms, ~50MB por instância |
| Layout | Tabular, sem CSS | Visual, com CSS customizado |

**Por que PDFKit para relatórios grandes?** Puppeteer com 50k linhas criaria 1000+ páginas PDF, consumindo GBs de RAM do Chrome headless. PDFKit gera programaticamente linha por linha.

---

## 7. Índices PostgreSQL para Filtros Comuns da Reunião

```sql
-- Para "alunos do estado X, ano Y"
CREATE INDEX idx_enrollments_class_year ON enrollments(class_id)
WHERE active = true;

CREATE INDEX idx_classes_start_date ON classes(start_date, course_id, acao_id)
WHERE active = true;

-- Para "quem recebeu certificado"
CREATE INDEX idx_certificates_enrollment ON certificates(enrollment_id)
WHERE active = true;

-- Para relatório por município (citado pela reunião)
CREATE INDEX idx_address_city_state ON student_addresses(city_id, state);
```

**Índice parcial** (`WHERE active = true`): menor tamanho, mais rápido — ignora registros soft-deleted que nunca aparecem em relatórios.

---

## 8. Validação de Coerência com a Transcrição

| Ponto da Reunião | Requisito Técnico | Status |
|---|---|---|
| "Todos os alunos da cidade X, ano Y com certificado" | Filtros combinados + Prisma cursor | ✅ |
| "11 rotas no Piauí — quais cidades foram beneficiadas?" | Filtro por `acaoId` + agrupamento por cidade | ✅ |
| "Quantos alunos certificados em cada rota?" | Aggregation por `class.acao` + `certificate` | ✅ |
| Exportação Excel com logo da empresa (REQ-11 relacionado) | ExcelJS `workbook.addImage()` no cabeçalho | ✅ |
| Formato Excel que abre corretamente no Brasil | UTF-8 BOM + separador `;` | ✅ |
| Soft Delete obrigatório | `active: true` em todos os filtros | ✅ |
| Uploads via MinIO | Relatórios assíncronos salvos no MinIO | ✅ |

---

## 9. Resumo de Decisões Arquiteturais

| Decisão | Escolha | Motivo |
|---|---|---|
| Biblioteca XLSX | ExcelJS WorkbookWriter (streaming) | OOM em 50k+ linhas com SheetJS |
| Paginação | Cursor-based (não offset) | Performance O(log N) constante |
| Filtros dinâmicos | Object spread no `where` do Prisma | Tipagem TS + evita injeção SQL |
| CSV encoding | UTF-8 BOM + separador `;` | Compatibilidade Excel Brasil |
| PDF de relatório | PDFKit (programático) | Puppeteer é inviável para 50k linhas |
| PDF de certificado | Puppeteer (visual) | CSS moderno, layout premium |
| Exportações pesadas | BullMQ background job + MinIO + Socket.io | Sem bloquear Event Loop |
| Rate limiting | 2 req/minuto por usuário | Proteção contra OOM por uso simultâneo |
