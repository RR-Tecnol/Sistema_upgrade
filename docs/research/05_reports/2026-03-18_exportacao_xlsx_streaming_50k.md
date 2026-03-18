# PESQ-F2-03 — Exportação XLSX em Streaming para 50k+ Alunos
## Deep Research Result | Sistema Upgrade | 18/03/2026
## Prepara: Relatórios completos (ciclo após EXEC-07)

> Pesquisa sobre arquitetura de exportação massiva de dados sem travar a API.
> Stack: NestJS + ExcelJS + BullMQ + Prisma cursor-based pagination + MinIO + Socket.io.

---

## 1. O PROBLEMA — POR QUE PROCESSAMENTO SÍNCRONO FALHA

Com 50.000 alunos, a abordagem ingênua (ler tudo do banco → montar Excel em RAM → retornar)
colapsa em 3 pontos simultâneos: o Node.js ultrapassa o limite de Heap (Out of Memory), o
PostgreSQL sofre com a query gigante, e o proxy HTTP encerra a conexão por timeout (30-60s).

A solução é desconectar completamente o tempo de requisição do tempo de processamento:
o usuário recebe resposta imediata com um jobId, e quando o arquivo ficar pronto, o Socket.io
notifica o painel em tempo real.

---

## 2. THRESHOLD: SÍNCRONO VS ASSÍNCRONO

Até 1.000 registros → síncrono, retorna Buffer direto na resposta HTTP (~200-800ms).
De 1.000 a 5.000 → zona cinzenta, síncrono ainda possível mas não recomendado.
A partir de 5.000 registros → BullMQ obrigatório. Ponto de decisão no Controller via `count()`.

---

## 3. FLUXO COMPLETO (request → MinIO → Socket.io)

```
1. POST /admin/relatorios/export (com filtros)
   ↓
2. Controller: prisma.student.count(where) 
   → se <= 5000: resposta síncrona com Buffer
   → se > 5000: enfileira job no BullMQ, retorna 202 Accepted + jobId
   ↓
3. Redis persiste o job (não perde em restart da API)
   ↓
4. Worker @Processor capta o job:
   - Cria stream PassThrough
   - Inicia Upload multipart no MinIO (S3 SDK)
   - Inicializa ExcelJS WorkbookWriter em modo stream
   ↓
5. Loop de cursor-based pagination no Prisma (blocos de 2000):
   - Cada bloco: addRow().commit() → flui pelo PassThrough → MinIO
   - job.updateProgress() a cada bloco (visível no BullMQ dashboard)
   ↓
6. worksheet.commit() → workbookWriter.commit() → await uploader.done()
   (ORDEM CRÍTICA: fechar o stream ANTES de awaitar o upload)
   ↓
7. notificationsGateway.server.to(userId).emit('RELATORIO_PRONTO', { url, linhas })
   ↓
8. Frontend escuta o Socket.io → Toast de sucesso → botão de download
```

---

## 4. CURSOR-BASED PAGINATION (nunca usar OFFSET)

O OFFSET/skip no Prisma força o PostgreSQL a ler e descartar as N linhas anteriores a cada página.
Para a página 40 (linhas 40.000-41.000), o banco lê 40.000 linhas e descarta — catastrófico.

Com cursor, o banco usa o índice B-Tree da chave primária para saltar direto ao registro — O(log N).
A página 1 e a página 40.000 levam o mesmo tempo (~10ms).

```typescript
// Generator assíncrono com cursor-based pagination
async *extractViaCursor(where: any, batchSize = 2000) {
  let lastId: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const batch = await prisma.student.findMany({
      where,
      take: batchSize,
      ...(lastId && { cursor: { id: lastId }, skip: 1 }),
      orderBy: { id: 'asc' }, // OBRIGATÓRIO — cursor exige ordenação determinística
      select: { /* apenas colunas necessárias */ }
    });

    if (batch.length === 0) { hasMore = false; break; }
    lastId = batch[batch.length - 1].id;
    yield batch; // cede controle ao formatador sem acumular na RAM
    if (batch.length < batchSize) hasMore = false;
  }
}
```

**Regra de ouro:** nunca usar campos não únicos como cursor (ex: createdAt, nome).
Em datasets grandes, timestamps duplicados causam loops infinitos ou registros pulados.
Sempre usar `id` UUID como cursor.

---

## 5. STREAMING COM EXCELJS (sem estourar a RAM)

Usar `ExcelJS.stream.xlsx.WorkbookWriter` (não o Workbook normal).
A diferença: o stream descarta cada linha da RAM imediatamente após `addRow().commit()`.

```typescript
const passThroughStream = new stream.PassThrough();

// Upload multipart no MinIO — consome o stream conforme ele é produzido
const uploader = new Upload({
  client: s3Client,
  params: { Bucket: 'relatorios', Key: fileName, Body: passThroughStream },
  partSize: 5 * 1024 * 1024, // chunks de 5MB
  queueSize: 4                // 4 uploads paralelos
});

const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
  stream: passThroughStream,
  useStyles: true,
  useSharedStrings: true
});

const worksheet = workbook.addWorksheet('Alunos');
worksheet.columns = [/* definição das colunas com numFmt para datas/valores */];

// Para cada batch do generator:
for await (const batch of extractViaCursor(where)) {
  for (const aluno of batch) {
    worksheet.addRow({ ...dados }).commit(); // descarta da RAM imediatamente
  }
  await job.updateProgress(percent);
}

// ORDEM CRÍTICA — deadlock se inverter:
worksheet.commit();
await workbook.commit(); // fecha o PassThrough — sinaliza fim do stream
await uploader.done();   // só awaita APÓS o workbook estar fechado
```

**Formatação Brasil:** usar `numFmt: 'dd/mm/yyyy'` nas colunas de data para garantir leitura
correta no Excel Brasil independente da localização do servidor. O formato XLSX nativo evita o
problema do BOM e do separador ponto-e-vírgula que afeta arquivos CSV.

---

## 6. NOTIFICAÇÃO VIA SOCKET.IO

O NotificationsGateway já existente tem o método `notifyAdmins()`. Para relatórios,
usar emissão direcionada por userId (sala individual), não broadcast para todos os admins:

```typescript
// No Worker, após uploader.done():
this.notificationsGateway.server
  .to(userId)
  .emit('RELATORIO_PRONTO', {
    jobId: job.id,
    arquivo: fileName,
    urlDownload: `/admin/relatorios/download/${fileName}`,
    totalLinhas: registrosProcessados,
    timestamp: new Date().toISOString()
  });
```

No frontend, o hook `useNotifications` já existente escuta o Socket.io. Adicionar
handler para o evento `RELATORIO_PRONTO` que exibe toast com botão de download.

---

## 7. LIMPEZA DE ARQUIVOS PARCIAIS EM FALHA

Se o Worker falhar no meio do upload (ex: linha 30.000 de 50.000), o MinIO fica com
partes orphans do multipart upload que consomem espaço e confundem relatórios de storage.

Dupla proteção: o `@aws-sdk/lib-storage` tenta abortar automaticamente em caso de erro,
mas configurar também uma **Lifecycle Policy no MinIO** que limpa automaticamente multipart
uploads incompletos com mais de 24 horas. Isso é configuração de infraestrutura, não código.

No código, o catch do Worker deve chamar `uploader.abort()` explicitamente antes de relançar
o erro para o BullMQ — garantindo que o BullMQ registre a falha e programe retry.

---

## 8. COLUNAS DO EXCEL (mapeamento para SISTEC/MEC)

| Coluna | Campo do Banco | Formato |
|--------|----------------|---------|
| Nome Completo | student.user.name | texto |
| CPF | student.cpf | texto (sem pontuação) |
| Curso | class.course.name | texto |
| Turma | class.id | texto |
| Cidade | class.city.name | texto |
| Estado | class.city.state | MA/PI/AC |
| Frequência % | calculado | numFmt: '0.00%' |
| Certificado | certificate.code IS NOT NULL | SIM/NÃO |
| Data Emissão Cert. | certificate.issuedAt | numFmt: 'dd/mm/yyyy' |
| Status Matrícula | enrollment.status | texto |

---

*PESQ-F2-03 | Concluída em 18/03/2026 | Prepara ciclo de relatórios pós-EXEC-07*
*Dependências: BullMQ (já instalado), ExcelJS (já instalado), MinIO (configurado), Socket.io (ativo)*
