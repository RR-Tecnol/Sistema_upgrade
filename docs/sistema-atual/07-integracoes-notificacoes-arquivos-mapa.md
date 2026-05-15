# Integrações — notificações, ficheiros, e-mail, mapas

## Notificações em tempo real (Socket.IO)

- **Gateway:** `NotificationsGateway` em `backend/src/notifications/notifications.gateway.ts`.
- **Namespace:** `/notifications` (não consta no OpenAPI/Swagger; o cliente deve usar Socket.IO com o mesmo namespace).
- **CORS:** origens alinhadas a `getFrontendCorsOrigins()` (igual ao HTTP).
- **Autenticação na ligação:** JWT obrigatório — enviar em `handshake.auth.token` **ou** no header `Authorization: Bearer <access_token>`. Sem token válido, o servidor **desliga** o socket de imediato.
- **Sala por utilizador:** após validar o JWT, o servidor faz `join('user:' + userId)` com `userId` = `payload.sub`.
- **Sala `admins`:** utilizadores com role `ADMIN`, `COORDINATOR`, `FINANCIAL` ou `IT_ADMIN` entram também na sala `admins` (eventos transversais ao painel).
- **Contrato de payload:** `backend/src/notifications/ws-notification-payload.contract.ts` (`withNormalizedActorWsPayload`, etc.) — usar este ficheiro para manter o frontend alinhado aos eventos.

## Ficheiros e armazenamento objecto

- **`UploadsModule`** — upload HTTP multipart para o backend.
- **MinIO** (cliente `minio` no backend) — usado em fluxos que guardam objectos (ex.: comprovantes, mídia de feedback, PDFs em cache conforme serviços em `reports`, `feedbacks`, `reimbursement`). Buckets e URLs públicas dependem de variáveis de ambiente — ver `.env.example` e serviços que referenciam MinIO.

## E-mail

- **`MailModule` / `MailService`** — envio transaccional (OTP, convites, etc.). Provedor concreto configurável via env (ex.: Brevo/Resend — dependências presentes no `package.json`).

## Mapas, geocodificação e rotas

- Componentes frontend de mapa (Leaflet/OSM, pré-visualização de viagens, etc.) e endpoints backend associados (geocode, OSRM) estão sujeitos a **rate limit** global e a restrições de CSP descritas em `main.ts`.
- Módulo **`DriverLocationModule`** — API de localização de motoristas para mapa e ETA (lógica em serviço + controller).

## Relatórios e PDF

- **`ReportsModule`** — geração de PDFs (incl. Puppeteer onde aplicável), cache de PDF de certificado, métricas, imagens OG, etc. Requer dependências de sistema/browser conforme documentação do Puppeteer para o ambiente de deploy.
