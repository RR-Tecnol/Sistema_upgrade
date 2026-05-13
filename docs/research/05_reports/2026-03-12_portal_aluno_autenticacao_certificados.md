# 👨‍🎓 Pesquisa: Portal do Aluno — Autenticação Simplificada e Certificados (REQ-06)

**Data:** 2026-03-12
**Requisito:** REQ-06 — Portal do Aluno — Acesso Simplificado + Emissão de Certificado
**Origem na reunião (12/03/2026):** Trechos 00:08:43 e 00:39:57
**Status:** ✅ Pesquisa concluída

---

## Contexto do Sistema Upgrade

Na reunião de 12/03/2026, Robert S. Pimentel e Ronaldo Ribeiro definiram:

> *"Essa tela também tem que ter na no acesso do cidadão para ele poder entrar lá e emitir o certificado dele. Então essa tela será tanto pro administrador como pro cidadão acessar."* (00:08:43)
> *"Agora eu quero ver a questão do acesso do aluno, como é que ele vai acessar as informações de inscrição."* (00:39:57)

**Público-alvo do portal do aluno:** Cidadãos do interior do Maranhão e Piauí, com baixa familiaridade tecnológica, acessando pelo celular em 3G/4G inconsistente.

**O que o portal deve oferecer:**
1. Ver a **cidade e escola** onde o caminhão vai permanecer
2. Ver as **datas** da turma/curso
3. **Inscrever-se** na turma (aparece como "espera de aprovação" para o admin)
4. **Emitir o próprio certificado** após conclusão do curso

---

## 1. Estratégia de Autenticação (Sem Senha Complexa)

### Opções avaliadas

| Método | Fricção | Segurança | Viabilidade no Interior |
|--------|---------|-----------|------------------------|
| CPF + Senha | Alta (cidadão esquece senha) | Média | Baixa (abandono) |
| CPF + Data de Nascimento | Baixa | **Baixa** (dados vazados em BR) | Alta (mas risco) |
| CPF + OTP SMS | Baixa | Alta | Alta ✅ Recomendado |
| Gov.br OAuth | Baixíssima | Altíssima | Alta ✅ Recomendado (futuro) |
| Magic Link Email | Baixa | Média | Baixa (muitos sem e-mail) |

### Decisão Recomendada: CPF + OTP SMS (MVP) → Gov.br (Produção)

**MVP (imediato):** Login com CPF → sistema envia código de 6 dígitos por SMS → aluno digita código

**Produção:** Integração OAuth2 com Gov.br — elimina gestão de senhas, usa identidade federal já validada. Maranhão e Piauí já têm cadastro massivo no Gov.br.

### Implementação OTP SMS no NestJS

```typescript
// students-portal/auth.service.ts
@Injectable()
export class StudentAuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private smsService: SmsService,
  ) {}

  async requestOtp(cpf: string): Promise<void> {
    // 1. Verifica se CPF existe no sistema
    const student = await this.prisma.student.findFirst({
      where: { cpf, active: true }
    });
    if (!student) throw new NotFoundException('CPF não encontrado no sistema.');

    // 2. Rate limiting por CPF (não só por IP — NAT compartilha IPs em 3G)
    const attempts = await this.redis.incr(`otp_attempts:${cpf}`);
    if (attempts === 1) await this.redis.expire(`otp_attempts:${cpf}`, 900); // 15 min
    if (attempts > 5) throw new TooManyRequestsException('Muitas tentativas. Aguarde 15 minutos.');

    // 3. Gera OTP com entropia adequada (não Math.random()!)
    const otp = crypto.randomInt(100000, 999999).toString();
    await this.redis.setex(`otp:${cpf}`, 300, otp);  // 5 min TTL

    // 4. Envia SMS via Zenvia/TotalVoice
    await this.smsService.send(student.phone, `Seu código de acesso Upgrade: ${otp}. Válido por 5 minutos.`);
  }

  async validateOtp(cpf: string, otp: string): Promise<string> {
    const storedOtp = await this.redis.get(`otp:${cpf}`);
    if (!storedOtp || storedOtp !== otp) {
      throw new UnauthorizedException('Código inválido ou expirado.');
    }
    
    // Invalida OTP após uso (one-time)
    await this.redis.del(`otp:${cpf}`);
    await this.redis.del(`otp_attempts:${cpf}`);
    
    const student = await this.prisma.student.findFirst({ where: { cpf } });
    return this.jwtService.sign({ sub: student.id, role: 'STUDENT' });
  }
}
```

**Provedor SMS recomendado:** Zenvia — líder no mercado brasileiro, rotas diretas com operadoras nacionais (TIM, Vivo, Claro, Oi), API REST simples.

---

## 2. Gestão de Sessão JWT para Acesso Esporádico

**Problema do acesso esporádico:** O aluno acessa o portal talvez uma vez por semana (para ver datas ou emitir certificado). JWT de 15 minutos gera frustração.

### Tokens de Longa Duração para Cidadãos

```typescript
// students-portal/jwt.config.ts
export const studentJwtConfig = {
  accessToken: {
    expiresIn: '24h',  // cidadão permanece logado 1 dia (≠ admin que usa a cada hora)
  },
  refreshToken: {
    expiresIn: '30d',  // cookie HttpOnly — renova silenciosamente
    cookieOptions: {
      httpOnly: true,    // JS do browser não acessa → seguro
      secure: true,      // só HTTPS
      sameSite: 'strict' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 dias em ms
    }
  }
};
```

### Middleware de Renovação Silenciosa (Next.js 14)

```typescript
// middleware.ts (Next.js App Router)
export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('student_access_token')?.value;
  const refreshToken = request.cookies.get('student_refresh_token')?.value;

  if (!accessToken && refreshToken) {
    // Renovação silenciosa — cittadão não percebe que estava deslogado
    const response = await fetch(`${process.env.API_URL}/students/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refresh_token=${refreshToken}` },
    });
    if (response.ok) {
      const { accessToken: newToken } = await response.json();
      const res = NextResponse.next();
      res.cookies.set('student_access_token', newToken, { maxAge: 86400 });
      return res;
    }
  }
  // ... redirecionar para login se sem token válido
}
```

---

## 3. Emissão de Certificado com Puppeteer

### Fluxo de Geração

```typescript
// NestJS: CertificateService
@Injectable()
export class CertificateService {
  private browser: Browser | null = null;

  // Singleton: 1 browser compartilhado (não abre Chrome a cada requisição)
  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],  // necessário em Docker
      });
    }
    return this.browser;
  }

  async generateCertificate(studentId: string, enrollmentId: string): Promise<Buffer> {
    // 1. Valida conclusão do aluno (frequência ≥ 80% conforme REQ-02)
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { student: true, class: { include: { course: true } } }
    });
    
    if (!enrollment?.completionApproved) {
      throw new BadRequestException('Aluno não atingiu 80% de frequência para certificado.');
    }

    // 2. Gera número único do certificado
    const certNumber = `${enrollment.class.course.year}-MA-${nanoid(8).toUpperCase()}`;

    // 3. Salva referência do certificado no banco ANTES de gerar
    const cert = await this.prisma.certificate.create({
      data: {
        enrollmentId,
        certNumber,
        issuedAt: new Date(),
        pdfKey: null,  // preenchido após upload no MinIO
      }
    });

    // 4. Renderiza HTML → PDF via Puppeteer
    const qrCodeDataUrl = await QRCode.toDataURL(
      `${process.env.PORTAL_URL}/validar/${certNumber}`
    );
    
    const html = this.renderTemplate('certificate', {
      studentName: enrollment.student.name,
      courseName: enrollment.class.course.name,
      workload: enrollment.class.course.workloadHours,
      startDate: format(enrollment.class.startDate, 'dd/MM/yyyy', { locale: ptBR }),
      endDate: format(enrollment.class.endDate, 'dd/MM/yyyy', { locale: ptBR }),
      certNumber,
      qrCodeDataUrl,
      issuedAt: format(new Date(), 'dd/MM/yyyy', { locale: ptBR }),
    });

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    });
    
    await page.close();  // fecha a ABA, não o browser

    // 5. Salva no MinIO (bucket privado — aluno acessa via Presigned GET URL)
    const pdfKey = `certificates/${certNumber}.pdf`;
    await this.minioService.putObject('certificados', pdfKey, pdfBuffer);

    // 6. Atualiza referência no banco
    await this.prisma.certificate.update({
      where: { id: cert.id },
      data: { pdfKey }
    });

    return pdfBuffer;
  }
}
```

### Estratégia: Geração na Aprovação (Não On-Demand)

**Decisão:** Gerar o PDF **uma única vez quando o aluno é marcado como concluído** pelo admin → salvar no MinIO.

**Por que não gerar on-demand (a cada clique do aluno):**
- Puppeteer consome 150-300ms de CPU por certificado
- Em conexão 3G lenta no interior, o download de um PDF de 3-5MB pode dar timeout se gerado em tempo real
- Gerar uma vez e servir do MinIO = download instantâneo mesmo em 3G

**Schema:**

```prisma
model Certificate {
  id           String   @id @default(uuid())
  enrollmentId String   @unique  // 1 aluno → 1 certificado por turma
  certNumber   String   @unique  // ex: "2026-MA-XYZ123AB"
  pdfKey       String?           // path relativo no MinIO (null até geração)
  issuedAt     DateTime @default(now())
  active       Boolean  @default(true)  // Soft Delete
  
  enrollment   Enrollment @relation(fields: [enrollmentId], references: [id])
  @@map("certificates")
}
```

---

## 4. QR Code de Validação Pública

O QR Code no certificado aponta para uma URL **pública** (sem login) que confirma a autenticidade:

```typescript
// certificates.controller.ts
@Get('validar/:certNumber')
@Public()  // rota pública — não precisa de JWT
async validateCertificate(@Param('certNumber') certNumber: string) {
  const cert = await this.prisma.certificate.findFirst({
    where: { certNumber, active: true },
    include: {
      enrollment: {
        include: { student: true, class: { include: { course: true } } }
      }
    }
  });
  
  if (!cert) return { valid: false, message: 'Certificado não encontrado.' };
  
  return {
    valid: true,
    // LGPD: ofusca parte do nome (João S*** P*******) e do CPF (***.***.456-**)
    studentName: obfuscateName(cert.enrollment.student.name),
    courseName: cert.enrollment.class.course.name,
    workload: cert.enrollment.class.course.workloadHours,
    completionDate: cert.enrollment.class.endDate,
    certNumber: cert.certNumber,
    issuedAt: cert.issuedAt,
  };
}
```

**Biblioteca QR:** `npm install qrcode` (TypeScript nativo, gera PNG/DataURL/SVG) — simples e sem dependências pesadas.

---

## 5. UX Mobile-First para Baixa Literacia Digital

### Princípios de Design (derivados da reunião)

O portal deve ser tão simples quanto o WhatsApp para esse público.

```
TELA PRINCIPAL DO ALUNO:
┌─────────────────────────────┐
│  [LOGO UPGRADE]             │
│                             │ 
│  Olá, João! 👋              │
│  Seu curso: Informática     │
│                             │
│  ┌───────────────────────┐  │
│  │ 📍 Onde está a carreta │  │
│  │ Escola Municipal João  │  │
│  │ Imperatriz - MA        │  │
│  │ [Ver no Google Maps]   │  │
│  └───────────────────────┘  │
│                             │
│  Curso: 12/03 → 28/03/2026  │
│  Sua frequência: 12/15 aulas│
│                             │
│  [📄 Baixar meu certificado]│
│   (desabilitado até conclus.)│
└─────────────────────────────┘
```

### Práticas de Inclusão Digital

- **Botões grandes:** mínimo 44×44px (WCAG 2.1 AA — uso com dedos grossos ou tremores)
- **Texto claro:** "Baixar meu Certificado" (não "Emissão de RVDD")
- **Link direto para Google Maps:** cidadão já conhece o app — não inventar mapa próprio
- **React Server Components no Next.js 14:** dados renderizados no servidor → menos JS enviado ao celular → carregamento mais rápido em 3G
- **Imagens WebP otimizadas:** `next/image` com `quality={70}` — economiza dados do pré-pago

### Performance para Android 8+ (Dispositivos Antigos)

```tsx
// next.config.js — reduzir JavaScript enviado ao browser
const nextConfig = {
  experimental: {
    optimizePackageImports: ['date-fns', 'react-icons'],
  },
  images: {
    formats: ['image/webp', 'image/avif'],
  },
};
```

---

## 6. Validação de Coerência com a Transcrição

| Ponto da Reunião | Requisito | Status desta Pesquisa |
|------------------|-----------|----------------------|
| Cidadão emite certificado no portal | Geração Puppeteer + MinIO | ✅ Implementado |
| Aluno vê cidade e escola do caminhão | Tela principal com localização | ✅ IA de UI |
| Inscrição online → "espera de aprovação" | Fluxo `Enrollment.status = PENDING` | ✅ Conforme schema existente |
| Admin aprova ou recusa inscrição | Admin vê lista de espera | ✅ Já coberto pela reunião |
| Aluno acessa pelo celular (mobile) | Next.js 14 RSC + design mobile-first | ✅ |
| Cidadãos de baixa familiaridade tecnológica | UX simples, botões grandes, Portuguese claro | ✅ |
| Soft Delete obrigatório | `active: Boolean` em `Certificate` | ✅ |
| Uploads via MinIO | PDFs de certificado no MinIO | ✅ |

---

## 7. Resumo de Decisões Arquiteturais

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Autenticação MVP | CPF + OTP SMS | Sem necessidade de senha — cidadão do interior |
| Autenticação Produção | Gov.br OAuth2 | Federação nacional, máxima confiança |
| Rate Limiting | Por CPF (Redis) + Por IP | NAT compartilhado em 3G invalida rate limit só por IP |
| JWT Expiração | 24h access + 30d refresh | Acesso esporádico do aluno (1x por semana) |
| Geração Certificado | Uma vez, na aprovação → MinIO | Performance em 3G; evita OOM do container |
| PDF Engine | Puppeteer (Singleton Browser) | Alta fidelidade visual com CSS moderno |
| QR Code | Library `qrcode` → URL de validação pública | Validação sem login por terceiros |
| Armazenamento PDF | `pdfKey` (path relativo) no banco | Não depende de URL fixa do MinIO |
| UX | React Server Components + botões 44px | Performance em Android 8 / 3G rural |
