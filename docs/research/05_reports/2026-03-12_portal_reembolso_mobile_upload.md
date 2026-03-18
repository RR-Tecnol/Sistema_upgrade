# 📱 Pesquisa: Portal de Reembolso Mobile com Upload de Comprovante (REQ-10)

**Data:** 2026-03-12
**Requisito:** REQ-10 — Portal de Reembolso — Registro de Despesas via Mobile
**Origem na reunião (12/03/2026):** Trechos 00:20:04 — 00:22:00
**Status:** ✅ Pesquisa concluída

---

## Contexto do Sistema Upgrade

Na reunião de 12/03/2026, Robert S. Pimentel explicitou:

> *"O professor teve que comprar alguma coisa, então ele tem uma areazinha lá na área dele que ele pode registrar uma despesa, registrar um gasto. Ele vai identificar o gasto e aí ele tem a notinha, ele tira uma foto e fica lá registrado."*
> *"Ronaldo: ele já faz o anexo pelo próprio celular, já envia e o administrador já tem acesso a todos esses custos comprovados."*

**Usuários do módulo:** Professores/Instrutores e Motoristas (acesso mobile no interior do Maranhão e Piauí — conexão 3G/4G instável)

**Diferença do módulo de manutenção:** Reparos passam por `TruckMaintenance`. Este módulo é para **despesas imprevistas de campo** (material de aula, limpeza, itens urgentes).

**Regra do livro de regras:** Uploads obrigatoriamente via `minio.service.ts`. Nunca armazenar arquivos no filesystem do container Docker. **Soft Delete obrigatório** (`active: false`, nunca delete físico).

---

## 1. Captura de Foto pelo Celular (Next.js 14)

### Decisão: HTML Media Capture (atributo `capture`)

```tsx
// components/ExpenseReceiptUpload.tsx
<input
  type="file"
  accept="image/*"
  capture="environment"  // abre câmera traseira diretamente
  onChange={handleFileCapture}
  className="hidden"
  id="receipt-upload"
/>
<label htmlFor="receipt-upload">
  <Button variant="outline">📷 Fotografar Recibo</Button>
</label>
```

**Por que NÃO getUserMedia():**
- `getUserMedia()` consome bateria continuamente (stream de vídeo ativo)
- Não usa o ISP (processador de imagem) do hardware → fotos de texto mais borradas
- Gerenciamento de permissão complexo e inconsistente em Android barato + iOS Safari

**Por que HTML Media Capture:**
- Abre o app de câmera nativo do celular → usa HDR, autofoco, flash automático → texto legível no recibo
- Sem consumo contínuo de CPU
- Retorna apenas quando o usuário fotografou → sem gerenciamento de stream

**⚠️ Bug iOS Safari 17/18:** Em WebViews específicas, o arquivo pode não ser devolvido ao input. Solução:

```tsx
// Detecta iOS e remove o atributo `capture` como fallback
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const captureAttr = isIOS ? undefined : "environment";

// Se houver 2 tentativas consecutivas sem arquivo → remover capture
// → Safari exibe menu "Tirar Foto / Selecionar da Fototeca"
```

---

## 2. Preview e Compressão no Cliente

### Preview via URL.createObjectURL() (sem Base64)

```tsx
const [previewUrl, setPreviewUrl] = useState<string | null>(null);

const handleFileCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // CORRETO: createObjectURL — O(1), sem alocação extra de memória
  const url = URL.createObjectURL(file);
  setPreviewUrl(url);

  // Comprime antes de enviar
  const compressed = await compressImage(file);
  setReadyToUpload(compressed);
}, []);

// Limpeza obrigatória — evita memory leak no dispositivo
useEffect(() => {
  return () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  };
}, [previewUrl]);
```

**⚠️ NÃO usar FileReader.readAsDataURL():** Converte para Base64 (33% maior), bloqueia thread UI — smartphones com 1-2GB RAM podem travar.

### Compressão com browser-image-compression (via Web Worker)

```tsx
import imageCompression from 'browser-image-compression';

async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.4,           // alvo: ≤ 400KB (viável em 3G instável)
    maxWidthOrHeight: 1920,   // suficiente para OCR de recibo
    useWebWorker: true,       // NÃO bloqueia o UI thread
    fileType: 'image/webp',   // 30-50% menor que JPEG na mesma qualidade
    onProgress: (p) => setCompressProgress(p),
  });
}
// Resultado: foto de 8MB → ~200-400KB (redução de 95%)
```

---

## 3. Upload Seguro para o MinIO (Arquitetura)

### Decisão: Presigned URLs (NÃO proxy via Multer)

**Por que NÃO proxy Multer:**
- Aloca toda a imagem na RAM do NestJS durante upload
- Em pico com 50 professores enviando simultaneamente → OOM (Out of Memory) do container
- Conexão 3G lenta do interior → socket presta "pendente" bloqueando o Event Loop do Node

**Fluxo com Presigned URL:**

```
Professor (celular 3G) → [1] Pede autorização → NestJS
                          [2] Presigned URL (5 min) ← NestJS
                          [3] PUT direto → MinIO  (NestJS não vê o binário)
                          [4] Confirma upload → NestJS registra no DB
```

```typescript
// NestJS: ReimbursementService
async getUploadUrl(dto: CreateReimbursementDto, userId: string) {
  const key = `reimbursements/${userId}/${Date.now()}_${dto.filename}`;
  
  const command = new PutObjectCommand({
    Bucket: 'comprovantes-reembolso',  // bucket PRIVADO
    Key: key,
    ContentType: dto.mimeType,
    // Limite de tamanho imposto pelo MinIO (sem isso, alguém envia 1GB)
  });

  const presignedUrl = await getSignedUrl(this.s3Client, command, {
    expiresIn: 300,  // 5 minutos
  });

  // Salva o registro PENDENTE no banco (sem URL absoluta — só o key)
  const reimbursement = await this.prisma.reimbursement.create({
    data: {
      userId,
      description: dto.description,
      amount: dto.amount,
      receiptKey: key,  // ← path relativo, NÃO URL absoluta
      status: 'PENDING_UPLOAD',
      acaoId: dto.acaoId,
    }
  });

  return { presignedUrl, reimbursementId: reimbursement.id };
}
```

**Por que armazenar `receiptKey` (path relativo) e não URL completa:**
- Se o domínio do MinIO mudar, não é necessário atualizar milhões de registros no banco
- A URL é construída dinamicamente ao servir: `GET /api/reimbursements/:id/receipt` → gera Presigned GET URL (15 min)

### Bucket MinIO: PRIVADO (Default Deny)

```json
// Política de bucket — NUNCA public-read para comprovantes financeiros
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::comprovantes-reembolso/*"
  }]
}
```

---

## 4. Barra de Progresso (crítica para 3G lento)

```tsx
// Usa axios (não fetch) por suporte a onUploadProgress
const uploadDirect = async (presignedUrl: string, file: File) => {
  await axios.put(presignedUrl, file, {
    headers: { 'Content-Type': file.type },
    onUploadProgress: (e) => {
      const percent = Math.round((e.loaded / (e.total ?? 1)) * 100);
      setUploadProgress(percent);
    },
  });
};
```

**Por que não usar Server Actions do Next.js:** A Fetch API não expõe `onUploadProgress` — é stateless para uploads. Seria impossível mostrar progresso.

---

## 5. Resiliência em Conexão Instável (Rural MA/PI)

### Retry com Exponential Backoff

```typescript
// utils/retryUpload.ts
async function retryUpload(fn: () => Promise<void>, retries = 4) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await fn();
      return; // sucesso
    } catch (err) {
      if (attempt === retries - 1) throw err;
      const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s, 8s
      await new Promise(res => setTimeout(res, delay));
    }
  }
}
```

### Detecção de Reconexão

```tsx
// Hook para voltar a tentar quando sinal retornar
useEffect(() => {
  const handleOnline = () => {
    if (pendingUpload) retryUpload(() => uploadDirect(pendingUpload.url, pendingUpload.file));
  };
  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}, [pendingUpload]);
```

---

## 6. Modelagem Prisma (Schema)

```prisma
model Reimbursement {
  id          String   @id @default(uuid())
  userId      String
  acaoId      String
  description String
  amount      Decimal  @db.Decimal(10, 2)  // NUNCA Float para dinheiro
  receiptKey  String?  // path relativo no MinIO, não URL absoluta
  status      ReimbursementStatus @default(PENDING_REVIEW)
  approvedBy  String?
  approvedAt  DateTime?
  rejectionReason String?
  
  // Soft Delete obrigatório (02_LIVRO_DE_REGRAS.md)
  active      Boolean  @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])
  acao        Acao     @relation(fields: [acaoId], references: [id])
  
  @@map("reimbursements")
}

enum ReimbursementStatus {
  PENDING_UPLOAD   // Presigned URL gerada, aguardando upload do arquivo
  PENDING_REVIEW   // Upload concluído, aguardando análise do admin
  APPROVED         // Aprovado para reembolso
  REJECTED         // Rejeitado (motivo em rejectionReason)
}
```

### Máquina de Estados

```
PENDING_UPLOAD → PENDING_REVIEW  (ao confirmar upload bem-sucedido)
PENDING_REVIEW → APPROVED        (admin aprova)
PENDING_REVIEW → REJECTED        (admin rejeita com motivo)
```
**Transições inválidas (bloqueadas no backend):** APPROVED → REJECTED, REJECTED → APPROVED sem nova solicitação.

---

## 7. Validação Pós-Upload (Anti-Spoofing)

O MinIO não valida o conteúdo do arquivo — alguém poderia fazer PUT de um `.exe` com `Content-Type: image/webp`.

**Solução — Worker de Validação BullMQ:**

```typescript
// Acionado via webhook MinIO (s3:ObjectCreated:Put) ou após confirmação do cliente
@Processor('receipt-validation-queue')
export class ReceiptValidationProcessor {
  async process(job: Job) {
    const { receiptKey, reimbursementId } = job.data;
    
    // 1. Baixa os primeiros 12 bytes do arquivo (magic bytes)
    const stream = await this.minioService.getPartialObject(receiptKey, 0, 12);
    const magicBytes = await streamToBuffer(stream);
    
    // 2. Valida magic bytes (assinaturas reais dos formatos)
    const isValidImage = isJPEG(magicBytes) 
      || isWebP(magicBytes) 
      || isPNG(magicBytes)
      || isAVIF(magicBytes);
    
    if (!isValidImage) {
      // Deleta do MinIO e marca como inválido
      await this.minioService.deleteObject(receiptKey);
      await this.prisma.reimbursement.update({
        where: { id: reimbursementId },
        data: { status: 'REJECTED', rejectionReason: 'Arquivo inválido detectado.' }
      });
    }
  }
}
```

---

## 8. Resumo de Decisões Arquiteturais

| Decisão | Escolha | Alternativa Descartada |
|---------|---------|----------------------|
| Captura de câmera | `capture="environment"` (nativo) | `getUserMedia()` (CPU alto, bateria) |
| Preview | `URL.createObjectURL()` | `FileReader.readAsDataURL()` (OOM em 2GB RAM) |
| Compressão | `browser-image-compression` (Web Worker) | Sem compressão (inviável em 3G) |
| Upload | Presigned URL (direto MinIO) | Multer proxy (OOM no NestJS) |
| Progresso | Axios `onUploadProgress` | Fetch API (sem suporte a progresso) |
| Storage da URL | `receiptKey` (path relativo) | URL absoluta (quebra ao mudar domínio) |
| Bucket | PRIVADO (Default Deny) | Público (vedado para dados financeiros B2G) |
| Soft Delete | `active: Boolean` | Hard Delete (vedado pelo `02_LIVRO_DE_REGRAS.md`) |
