# 🔔 Pesquisa: Notificações Multi-Canal — In-App + WhatsApp + E-mail (Transversal)

**Data:** 2026-03-12
**Tipo:** Transversal (REQ-14, REQ-02, REQ-12)
**Status:** ✅ Pesquisa concluída

---

## Contexto do Sistema Upgrade

A reunião de 12/03/2026 definiu notificações para:
- Nova inscrição de aluno → admin
- Alerta de frequência baixa (< 80%) → admin + professor  
- Certificado emitido → aluno
- Manutenção de carreta → motorista + admin
- Alertas de backup e erros críticos → admin

**Stack:** NestJS 10 + Next.js 14 + Socket.io (já em uso no sistema) + BullMQ + Redis.

---

## 1. In-App: Reutilizar Socket.io com Namespaces

**O sistema já usa Socket.io** para funcionalidades existentes. Adicionar SSE (Server-Sent Events) criaria 2 conexões persistentes no browser do usuário — desperdiçando banda.

**Decisão: Namespace `/notifications` no Socket.io existente.**

Um Namespace compartilha a mesma conexão TCP física mas isola eventos e middleware.

```typescript
// NestJS: NotificationsGateway
@WebSocketGateway({ namespace: '/notifications', cors: { origin: '*' } })
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server: Server;

  @UseGuards(WsJwtAuthGuard)
  handleConnection(client: Socket) {
    const userId = client.data.user.id;
    client.join(`user_room_${userId}`);  // Sala privada por usuário
  }

  pushToUser(userId: string, payload: NotificationPayload): void {
    this.server.to(`user_room_${userId}`).emit('receive_notification', payload);
  }
}
```

**Por que Rooms?** `server.emit()` broadcaster para TODOS. `server.to(room).emit()` envia só para o usuário certo — essencial para dados privados B2G.

---

## 2. Persistência: PostgreSQL (não Redis)

Em um sistema governamental, notificações são **registros auditáveis**:
- "O admin X foi notificado sobre a inscrição Y às 14:32" precisa estar em log permanente
- Redis é volátil — pode perder dados se o container reiniciar

```prisma
model Notification {
  id          String   @id @default(uuid())
  userId      String
  type        String   // "NEW_ENROLLMENT", "LOW_ATTENDANCE", "CERTIFICATE_ISSUED"
  title       String
  message     String
  metadata    Json?    // { enrollmentId, studentId, classId } — contexto clicável
  readAt      DateTime?
  active      Boolean  @default(true)  // Soft Delete
  createdAt   DateTime @default(now())

  user        User @relation(fields: [userId], references: [id])

  @@index([userId, readAt])  // Índice para "notificações não lidas do usuário X"
  @@map("notifications")
}
```

**Fluxo correto:**
1. BullMQ Worker → `prisma.notification.create()` → banco PostgreSQL (ACID)
2. Apenas DEPOIS → `pushToUser()` via Socket.io (pode falhar silenciosamente)
3. Se usuário offline → Socket.io falha → mas a notificação já está no banco
4. Quando abrir o app → frontend busca notificações não lidas via REST

---

## 3. Marcar como Lida — UX Otimista (Next.js 14)

Em 3G rural (latência ~500ms), aguardar resposta do servidor para atualizar o badge seria frustrante.

```tsx
// Next.js 14: useOptimistic — atualiza UI imediatamente, reverte se falhar
'use client';
export function NotificationBell({ initialNotifications }: Props) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [optimistic, setOptimistic] = useOptimistic(
    notifications,
    (state, id: string) => state.map(n => n.id === id ? { ...n, readAt: new Date() } : n)
  );

  const unreadCount = optimistic.filter(n => !n.readAt).length;

  const markAsRead = async (id: string) => {
    setOptimistic(id);  // Atualiza UI imediatamente (percepção zero latência)
    try {
      await markNotificationAsReadAction(id);  // Server Action → banco
      setNotifications(curr => curr.map(n => n.id === id ? { ...n, readAt: new Date() } : n));
    } catch {
      // Se falhar: useOptimistic reverte automaticamente no próximo render
      toast.error('Sem sinal. Tente novamente.');
    }
  };

  return (
    <div className="relative">
      <button>
        🔔
        {unreadCount > 0 && (
          <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
    </div>
  );
}
```

---

## 4. WhatsApp Business API — Apenas Meta Oficial (B2G)

**Evolution API (open-source) é VEDADA em contexto governamental:**
- Viola ToS da Meta → número banido a qualquer momento sem aviso
- Sistema governamental parado = notícias, processos TCE
- LGPD: dados de cidadãos passam por middleware não auditável

**Stack recomendado:** Meta Cloud API direta (menor custo) ou Twilio (mais simples).

**Novo modelo de preços Meta 2025-2026:**

| Categoria de Template | Uso B2G | Custo/mensagem (BR) |
|---|---|---|
| Utilitário | Alertas de aula, frequência, confirmações | ~USD $0.005 |
| Autenticação | OTP login alunos | ~USD $0.005 |
| Marketing | Divulgação de novos programas | ~USD $0.063 |
| Serviço | Resposta a mensagem do cidadão em 24h | **Gratuito** |

**Estratégia de economia:** Incentivar alunos a iniciar conversas (via QR Code na carreta) → cria janela de serviço de 24h → respostas automáticas dentro desta janela = **R$ 0**.

### BullMQ: Rate Limiting para Não Ser Bloqueado pela Meta

```typescript
@Processor('whatsapp-queue', {
  concurrency: 10,  // máximo 10 conexões simultâneas
  limiter: { max: 40, duration: 1000 },  // 40 msg/segundo (respeita throttle Meta)
})
export class WhatsappProcessor extends WorkerHost {
  async process(job: Job) {
    const { phone, template, variables } = job.data;
    await this.whatsappService.sendTemplate(phone, template, variables);
  }
}
```

---

## 5. E-mail Transacional — Amazon SES para .gov.br

**Comparativo de provedores (2025-2026):**

| Provedor | Custo | Entregabilidade .gov.br | Integração NestJS |
|---|---|---|---|
| **Amazon SES** | USD $0.10/1000 | ✅ Alta | `@nestjs-modules/mailer` + SES transport |
| Postmark | USD $1.50/1000 | ✅✅ Altíssima (< 2s) | Simples |
| SendGrid | USD $1.99/1000+ | ✅ Boa (IP dedicado recomendado) | SDK oficial |
| Resend | USD $0.80/1000 | ✅ Boa | React Email templates |

**Decisão para B2G:** Amazon SES — integrado ao ecossistema AWS, custo mínimo para o erário, IP próprio configurável.

### Configuração DNS Obrigatória para Não Cair em Spam

```
# SPF: autoriza o SES a enviar em nome do domínio
TXT @ "v=spf1 include:amazonses.com ~all"

# DKIM: Amazon SES gera automaticamente — copiar registros CNAME
CNAME _domainkey.upgrade.ma.gov.br → valor gerado pelo SES

# DMARC: política de rejeição de e-mails sem SPF/DKIM válido
TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:admin@upgrade.ma.gov.br"
```

---

## 6. Arquitetura de Filas BullMQ — Separação por Canal

```typescript
// Filas separadas por canal (isolamento de falhas)
// Se WhatsApp API cai → não impacta notificações in-app ou e-mail
const QUEUES = {
  IN_APP: 'notifications-inapp-queue',
  WHATSAPP: 'notifications-whatsapp-queue',
  EMAIL: 'notifications-email-queue',
};

// NotificationsService — despachante central
async notifyUser(userId: string, event: NotificationEvent): Promise<void> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: { notificationPrefs: true }
  });

  const prefs = user.notificationPrefs;

  // Sempre persiste in-app (trilha de auditoria)
  await this.inAppQueue.add('send', { userId, ...event });

  // WhatsApp: só se user tem celular E preferência ativa
  if (prefs?.whatsapp && user.phone) {
    await this.whatsappQueue.add('send', { phone: user.phone, ...event }, {
      attempts: 3, backoff: { type: 'exponential', delay: 5000 }
    });
  }

  // E-mail: só se user tem email E preferência ativa
  if (prefs?.email && user.email) {
    await this.emailQueue.add('send', { email: user.email, ...event }, {
      attempts: 3, backoff: { type: 'exponential', delay: 5000 }
    });
  }
}
```

### Deduplicação (Anti-Spam)

```typescript
// Evitar enviar 5 alertas de frequência baixa em 5 dias consecutivos
async notifyLowAttendance(studentId: string): Promise<void> {
  const dedupeKey = `notification:low_attendance:${studentId}`;
  const alreadySent = await this.redis.exists(dedupeKey);

  if (alreadySent) return;  // Notificação já enviada esta semana, não repete

  await this.redis.setex(dedupeKey, 7 * 24 * 3600, '1');  // TTL = 7 dias
  await this.notifyUser(studentId, { type: 'LOW_ATTENDANCE', ... });
}
```

### Dead Letter Queue (DLQ)

```typescript
// Após 3 falhas → vai para DLQ para análise manual
@OnWorkerEvent('failed')
onFailed(job: Job, error: Error) {
  if (job.attemptsMade >= 3) {
    this.dlqQueue.add('review', {
      originalJob: job.data,
      error: error.message,
      failedAt: new Date(),
    });
    this.logger.error(`Notificação DLQ: ${job.name} para ${job.data.userId}`);
  }
}
```

---

## 7. Resumo de Decisões Arquiteturais

| Decisão | Escolha | Motivo |
|---|---|---|
| In-App protocol | Socket.io Namespace `/notifications` | Reutiliza conexão existente; sem protocolo adicional |
| In-App persistência | PostgreSQL via Prisma | ACID + auditabilidade B2G; Redis é volátil |
| UX "marcar como lida" | `useOptimistic` do React 18 | Zero latência percebida em 3G rural |
| WhatsApp | Meta Cloud API oficial | Evolution API vedada por risco jurídico B2G |
| WhatsApp rate limit | BullMQ limiter 40/segundo | Evita HTTP 429 e degradação de reputação na Meta |
| E-mail | Amazon SES | Menor custo para erário + IP dedicado configurável |
| E-mail deliverability | SPF + DKIM + DMARC | Não cair em spam em .gov.br |
| Filas | 3 filas separadas por canal | Falha do WhatsApp não afeta e-mail/in-app |
| Deduplicação | Redis TTL por evento+usuário | Evitar spam de alertas repetidos |
| DLQ | Fila de revisão manual | Notificações críticas não se perdem silenciosamente |
