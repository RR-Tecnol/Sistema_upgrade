# 🔐 Pesquisa: Segurança — 2FA, Sessão, Backup e Modo Manutenção (REQ-14)

**Data:** 2026-03-12
**Requisito:** REQ-14 — Configurações de Segurança e Operações
**Origem na reunião (12/03/2026):** Trechos 00:36:00 — 00:38:47
**Status:** ✅ Pesquisa concluída

---

## Contexto da Reunião

Robert S. Pimentel listou as necessidades de segurança durante a reunião:

> *"Tempo de inatividade — logout automático. Autenticação em 2 fatores. Complexidade de senhas mínimas. Modo de manutenção — bloqueia acesso de alunos, só admin acessa. Backup automático com intervalo configurável. Módulo de debug para manutenção emergencial."*

**Sistema:** NestJS 10 + Next.js 14 + PostgreSQL 15 + Redis 7 + MinIO — tudo em Docker Compose na VPS.

**Regras do `02_LIVRO_DE_REGRAS.md`:** Soft Delete (`active: Boolean`), JWT com `JwtAuthGuard`, RBAC com `@Roles()`.

---

## 1. 2FA com TOTP (Google Authenticator / Authy)

### Por que otplib (não speakeasy)?
- `speakeasy` está sem atualizações há 4+ anos (2019)
- `otplib` mantida ativamente, segue RFC 6238 atualizado

### Fluxo de Ativação

```
Admin/User → [1] GET /auth/2fa/setup → NestJS gera secret Base32
           ← [2] { qrCodeDataUrl, secret }
Admin/User → [3] Escaneia QR no Google Authenticator
           → [4] POST /auth/2fa/verify { token: "123456" } (valida sincronia)
           ← [5] { backupCodes: ["ABC-DEF-GHI", ...] } (mostrados 1x só)
```

```typescript
// NestJS: TwoFactorService
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'node:crypto';

@Injectable()
export class TwoFactorService {
  async setup2FA(userId: string, userEmail: string) {
    // 1. Gera segredo criptográfico
    const secret = authenticator.generateSecret(32);  // 32 chars = 160 bits

    // 2. Cria URI padrão (reconhecida pelo Google Authenticator)
    const otpAuthUrl = authenticator.keyuri(userEmail, 'Upgrade Gov', secret);

    // 3. Gera QR Code como Data URL para o frontend exibir
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // 4. Salva secret CRIPTOGRAFADO no banco (nunca texto plano!)
    const encryptedSecret = this.encryptSecret(secret);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorEnabled: false,  // só habilita após validar
        active: true
      }
    });

    return { qrCodeDataUrl, secret }; // secret só exibido 1x aqui
  }

  verify2FAToken(encryptedSecret: string, token: string): boolean {
    const secret = this.decryptSecret(encryptedSecret);
    return authenticator.check(token, secret);
    // otplib aceita tokens da janela anterior (30s) para compensar clock skew
  }

  private encryptSecret(secret: string): string {
    const key = crypto.scryptSync(process.env.TOTP_MASTER_KEY!, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
    const encrypted = Buffer.concat([cipher.update(secret), cipher.final()]);
    // Formato: iv_hex:ciphertext_hex (IV armazenado junto para descriptografia)
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }
}
```

### Backup Codes de Emergência

```typescript
async generateBackupCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: 8 }, () =>
    // crypto.randomInt — CSPRNG (não Math.random que é previsível!)
    `${crypto.randomInt(100000, 999999)}-${crypto.randomInt(100000, 999999)}`
  );

  // Armazena como bcrypt hash (nunca texto plano — funcionam como senhas)
  const hashedCodes = await Promise.all(
    codes.map(code => bcrypt.hash(code, 12))
  );

  await this.prisma.twoFactorBackupCode.createMany({
    data: hashedCodes.map(hash => ({ userId, code: hash, active: true }))
  });

  return codes;  // Retorna texto plano UMA ÚNICA VEZ para o usuário copiar
}
```

### 2FA Obrigatório para Admins (Global Guard)

```typescript
// NestJS: TwoFactorGuard (aplicado globalmente)
@Injectable()
export class TwoFactorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR'];
    if (adminRoles.includes(user.role) && !user.twoFactorEnabled) {
      throw new ForbiddenException({
        message: '2FA obrigatório para administradores.',
        action: 'SETUP_2FA'  // Frontend redireciona para /auth/setup-2fa
      });
    }
    return true;
  }
}
```

---

## 2. Logout por Inatividade — JWT + Redis (Sliding Expiration)

### Por que JWT puro não funciona?
- JWT é **stateless** — uma vez assinado, não pode ser revogado
- Se o admin deixar a tela aberta por 1h e o JWT expirar em 15min, ele é deslogado SEM AVISO
- Se o admin usa ativamente por 14min, o token **não se renova** (expiração fixa)

### Solução: JWT Híbrido com Redis

```typescript
// NestJS: AuthService — emissão do token
async login(user: User) {
  const jti = crypto.randomUUID();  // JWT ID único para esta sessão

  const accessToken = this.jwt.sign(
    { sub: user.id, jti, role: user.role, twoFactorEnabled: user.twoFactorEnabled },
    { expiresIn: '1h' }  // Máximo absoluto — mesmo com atividade, expira em 1h
  );

  // Registra no Redis: chave = "session:JTI", valor = userId, TTL = 30min inatividade
  await this.redis.setex(`session:${jti}`, 1800, user.id);

  return { accessToken };
}

// NestJS: SessionMiddleware — executado em TODA requisição autenticada
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const jti = req.user?.jti;
    if (jti) {
      // Renova o TTL no Redis a cada requisição — "sliding expiration"
      this.redis.expire(`session:${jti}`, 1800);  // Reset para 30min
    }
    next();
  }
}

// JwtStrategy — valida sessão no Redis ALÉM da assinatura
async validate(payload: JwtPayload) {
  const sessionExists = await this.redis.exists(`session:${payload.jti}`);
  if (!sessionExists) {
    throw new UnauthorizedException('Sessão expirada por inatividade.');
  }
  return payload;
}
```

### Frontend — Detecção de Inatividade (Next.js 14)

```tsx
// hooks/useInactivityLogout.ts
export function useInactivityLogout(timeoutMs = 28 * 60 * 1000) { // 28min (2min antes do Redis)
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let warningTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      clearTimeout(warningTimer);

      // Aviso 2 minutos antes de expirar
      warningTimer = setTimeout(() => {
        toast.warning('Sua sessão expira em 2 minutos por inatividade.', {
          action: { label: 'Continuar', onClick: resetTimer }
        });
      }, timeoutMs - 2 * 60 * 1000);

      timer = setTimeout(async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login?reason=inactivity');
      }, timeoutMs);
    };

    // Detecta qualquer interação do usuário
    const events = ['mousemove', 'keydown', 'wheel', 'mousedown', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimer));
      clearTimeout(timer);
      clearTimeout(warningTimer);
    };
  }, [timeoutMs, router]);
}
```

---

## 3. Políticas de Senha Configuráveis

```typescript
// NestJS: CustomValidator — busca regras do SystemConfig em runtime
@ValidatorConstraint({ name: 'IsPasswordCompliant', async: true })
@Injectable()
export class IsPasswordCompliantConstraint implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(password: string) {
    const config = await this.prisma.systemConfig.findFirst({
      where: { active: true }
    });

    const rules = config?.passwordPolicy as PasswordPolicy;
    if (!rules) return true;  // Sem política configurada = permissivo

    if (password.length < (rules.minLength ?? 8)) return false;
    if (rules.requireUppercase && !/[A-Z]/.test(password)) return false;
    if (rules.requireNumbers && !/[0-9]/.test(password)) return false;
    if (rules.requireSpecial && !/[!@#$%^&*]/.test(password)) return false;

    return true;
  }

  defaultMessage() {
    return 'Senha não atende à política de segurança configurada pelo administrador.';
  }
}
```

### Bcrypt: Cost Factor 12 para Sistema B2G

| Cost Factor | Iterações | Tempo | Recomendação |
|---|---|---|---|
| 10 | 1.024 | ~100ms | Mínimo da indústria |
| **12** | **4.096** | **~400ms** | **✅ Recomendado para B2G** |
| 14 | 16.384 | ~1.5s | Risco de DoS em alta concorrência |

**Por que 12 e não 10:** Sistema B2G com dados sensíveis (LGPD). O overhead de 400ms é imperceptível para login, mas torna força bruta ~4x mais cara que o padrão.

---

## 4. Modo Manutenção via Redis (Sem Restart do Container)

**Problema:** Se guardar `maintenanceMode = true` na memória do NestJS, a flag fica só em 1 container. Com múltiplas instâncias (Docker Compose scale), outros containers não sabem.

**Solução:** Redis como barramento compartilhado entre todas as instâncias.

```typescript
// NestJS: MaintenanceMiddleware (global)
@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const isMaintenanceOn = await this.redis.get('system:maintenance_mode');

    if (isMaintenanceOn === 'true') {
      // Admins sempre passam
      if (req.path.startsWith('/admin') || req.path === '/auth/login') {
        return next();
      }

      // Todos os outros recebem 503
      return res.status(503).json({
        message: 'Sistema em manutenção. Tente novamente em breve.',
        estimatedReturn: await this.redis.get('system:maintenance_return')
      });
    }
    next();
  }
}

// AdminController
@Post('maintenance/enable')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
async enableMaintenance(@Body() dto: MaintenanceDto) {
  await this.redis.set('system:maintenance_mode', 'true');
  await this.redis.set('system:maintenance_return', dto.estimatedReturn);
  // Log de auditoria obrigatório
  await this.auditService.log('MaintenanceMode', 'ENABLED', req.user.id);
}
```

### Next.js 14: Middleware de Borda (Edge Runtime)

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  // Consulta Redis via REST (Edge não suporta conexões TCP diretas)
  const maintenanceRes = await fetch(
    `${process.env.INTERNAL_API}/api/maintenance/status`
  );
  const { active } = await maintenanceRes.json();

  // Admin passa sempre; usuário comum vai para página de manutenção
  const isAdmin = request.cookies.get('user_role')?.value === 'ADMIN';

  if (active && !isAdmin && !request.nextUrl.pathname.startsWith('/manutencao')) {
    return NextResponse.redirect(new URL('/manutencao', request.url));
  }
}
```

---

## 5. Backup Automático PostgreSQL — Padrão Sidecar Docker

### Por que Sidecar e não Cron no Host?

| Abordagem | Portabilidade | Isolamento | Segurança |
|---|---|---|---|
| **Cron no Host (VPS)** | Nula | Baixo | Reduzida — depende de config Linux |
| **Contêiner Sidecar** | ✅ Máxima | ✅ Alto | ✅ Sem exposição de portas |

### Docker Compose: Sidecar de Backup

```yaml
# docker-compose.yml (adição)
backup-service:
  image: node:20-alpine
  environment:
    - POSTGRES_URI=postgresql://user:pass@db:5432/upgrade_db
    - MINIO_ENDPOINT=minio:9000
    - MINIO_BUCKET=backups-db
    - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
    - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
    - BACKUP_RETENTION_DAYS=30
  volumes:
    - ./scripts/backup:/app
  command: ["crond", "-f", "-l", "2"]  # cron daemon em foreground
  depends_on:
    - db
    - minio
  networks:
    - internal  # sem acesso externo
  restart: unless-stopped
```

### Script de Backup com Stream direto para MinIO

```javascript
// scripts/backup/backup.js (roda via cron: "0 3 * * *" = 3h da manhã)
const { spawn } = require('node:child_process');
const Minio = require('minio');
const { createGzip } = require('node:zlib');

async function runBackup() {
  const client = new Minio.Client({
    endPoint: 'minio', port: 9000, useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const objectName = `backup-${timestamp}.sql.gz`;

  // pg_dump → gzip → MinIO (ZERO disco local usado)
  const pgDump = spawn('pg_dump', [process.env.POSTGRES_URI], {
    env: { ...process.env, PGPASSWORD: process.env.POSTGRES_PASSWORD }
  });
  const gzip = createGzip({ level: 9 });

  pgDump.stdout.pipe(gzip);

  await client.putObject('backups-db', objectName, gzip, {
    'Content-Type': 'application/gzip',
    'x-amz-meta-created-at': new Date().toISOString()
  });

  console.log(`✅ Backup concluído: ${objectName}`);

  // Remove backups mais antigos que 30 dias
  await cleanOldBackups(client, 30);
}

async function cleanOldBackups(client, retentionDays) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const stream = client.listObjects('backups-db', '', true);
  for await (const obj of stream) {
    if (new Date(obj.lastModified) < cutoff) {
      await client.removeObject('backups-db', obj.name);
      console.log(`🗑️ Backup antigo removido: ${obj.name}`);
    }
  }
}

runBackup().catch(err => {
  console.error('❌ FALHA no backup:', err.message);
  // Enviar email de alerta ao Ronaldo (via SMTP/Nodemailer)
  notifyFailure(err);
  process.exit(1);
});
```

---

## 6. Trilha de Auditoria Unificada (AuditLog)

```prisma
// schema.prisma — Modelo de AuditLog unificado
model AuditLog {
  id         String   @id @default(uuid())
  entityType String   // "User", "SystemConfig", "MaintenanceMode", "Backup"
  entityId   String?  // UUID do alvo (null para ações globais)
  action     String   // "ENABLE_2FA", "UPDATE_MAINTENANCE", "DOWNLOAD_BACKUP"
  changedBy  String   // userId do admin que fez a ação
  diff       Json?    // Diff antes/depois (JSON Patch format)
  snapshot   Json?    // Estado completo antes da ação
  ipAddress  String?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([changedBy])
  @@index([createdAt])
  @@map("audit_logs")
}
```

**Por que modelo unificado?** Alternativas como `UserHistory`, `ConfigHistory` multiplicam tabelas exponencialmente. Com JSONB do PostgreSQL, 1 tabela serve todos os domínios. Filtros via `@@index([entityType])`.

---

## 7. Validação de Coerência com a Transcrição

| Ponto da Reunião | Implementação | Status |
|---|---|---|
| "Logout automático por inatividade" | JWT + Redis sliding expiration + aviso 2min antes | ✅ |
| "Autenticação em 2 fatores" | TOTP (otplib) + QR Code + backup codes | ✅ |
| "Complexidade de senhas configurável" | PolicyValidator dinâmico via SystemConfig | ✅ |
| "Modo manutenção — só admin acessa" | Redis flag + Middleware NestJS + Edge Next.js | ✅ |
| "Backup automático configurável" | Sidecar Docker + pg_dump stream → MinIO | ✅ |
| "Módulo de debug para terceiros" | SystemConfig flags + AuditLog de acesso | ✅ |

---

## 8. Resumo de Decisões Arquiteturais

| Decisão | Escolha | Motivo |
|---|---|---|
| Biblioteca 2FA | `otplib` (não speakeasy) | Manutenção ativa, RFC 6238 atual |
| Armazenamento TOTP secret | AES-256-CTR + IV aleatório | Nunca texto plano no banco |
| Backup codes | bcrypt hash (não texto plano) | Funcionam como senhas one-time |
| 2FA obrigatório | Admins via Global Guard | RBAC + ForbiddenException preventiva |
| Sessão por inatividade | JWT JTI + Redis TTL + sliding expiration | JWT puro não suporta revogação |
| Detecção inatividade FE | DOM events + debounce (não polling) | Sem consumo contínuo de CPU |
| Modo manutenção | Redis flag (não memória do processo) | Escala horizontal segura |
| Backup | Sidecar Docker + stream pg_dump→MinIO | Zero disco local, zero exposição |
| Retenção backup | 30 dias (limpeza automática) | Exigência de auditoria B2G |
| Auditoria | Tabela AuditLog unificada com JSONB | Escalável, sem proliferação de tabelas |
