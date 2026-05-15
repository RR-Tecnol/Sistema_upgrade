# Módulo de viagens (motorista + admin) — estado atual no código

**Referência:** 2026-05-08 · Alinhado a `backend/src/trips/`, `frontend/app/admin/viagens/page.tsx`, `frontend/app/driver/viagens/`, `frontend/components/admin/TripOdometerPhotosPreview.tsx`, `frontend/components/admin/employee-style-admin-detail.tsx`.

---

## 1. Domínio de dados (`Trip` — Prisma)

Campos relevantes para operação e auditoria:

| Campo | Função |
|-------|--------|
| `status` | `PLANNED` · `IN_TRANSIT` · `COMPLETED` · `CANCELED` |
| `driverDecision` | `PENDING` · `ACCEPTED` · `REJECTED` (resposta do motorista à viagem planeada) |
| `driverDecisionAt`, `driverDecisionReason` | Momento e motivo (ex.: recusa) |
| `kmStart`, `kmEnd`, `gpsDistanceKm` | Hodómetro e distância GPS à conclusão |
| `startOdometerPhotoUrl`, `endOdometerPhotoUrl` | URLs armazenadas (MinIO); visualização via URL presignada |
| `originCep`, `destinationCep`, coordenadas | Ancoragem da rota no cadastro |
| `rejectionPenalty*`, `notes` | Penalização por recusa e diário / notas |
| `auditValidatedAt`, `auditValidatedByUserId` | Registo de **validação pela equipa admin** após análise (`PATCH .../validate-audit`) |

Relações úteis: `truck`, `originCity`, `destinationCity`, `driverUser`, `auditValidatedBy`, `_count.locations` (pontos `DriverLocation` ligados à viagem).

---

## 2. API — motorista (`/api/driver/trips`)

| Método | Rota | Notas |
|--------|------|-------|
| GET | `/driver/trips` | Lista do motorista |
| GET | `/driver/trips/:id` | Detalhe (ownership) |
| GET | `/driver/trips/:id/odometer-photo-url?kind=start|end` | URL assinada GET para pré-visualizar foto MinIO |
| PATCH | `/driver/trips/:id/start` | Início: fotos obrigatórias conforme serviço |
| PATCH | `/driver/trips/:id/respond` | Aceitar/recusar viagem planeada |
| PATCH | `/driver/trips/:id/complete` | Conclusão com foto final e dados de GPS/km |
| PATCH | `/driver/trips/:id/notes` | Append ao diário |
| POST | `/driver/trips/presigned-url` | Upload de foto do hodómetro |

---

## 3. API — admin / coordenador (`/api/admin/trips`)

| Método | Rota | Notas |
|--------|------|-------|
| GET | `/admin/trips` | Lista com `auditValidatedBy`, `_count.locations`, cidades, motorista, carreta |
| GET | `/admin/trips/:id/odometer-photo-url?kind=start|end` | Presign GET para fotos |
| POST | `/admin/trips/manual` | Criação manual (CEP + coordenadas obrigatórias no fluxo actual) |
| PATCH | `/admin/trips/:id/assign-driver` | Vincular motorista (viagem `PLANNED`) |
| PATCH | `/admin/trips/:id/rejection-penalty` | Penalização por recusa |
| PATCH | `/admin/trips/:id/validate-audit` | **Validação operacional**: só `COMPLETED`; grava `auditValidatedAt` + utilizador |
| POST | `/admin/trips/generate-for-class` | Geração automática a partir da turma |

---

## 4. Portal admin — `/admin/viagens`

- **Listagem:** modo tabela ou cartões (`AdminViewModeToggle`).
- **Cartões e tabela:** resumo da viagem; **não** há botões de abrir foto no cartão/tabela — as fotos do hodómetro são vistas no **modal de detalhe** (pré-visualização com URL presignada).
- **Modal de detalhe:** usa `EmployeeStyleAdminDetailShell` (mesmo padrão visual que inscrições): hero com rota, chips (ref., matrícula, motorista), três separadores:
  - **Resumo executivo:** dados agregados + bloco **Fotos comprobatórias** (`TripOdometerPhotosPreview`).
  - **Rastreio operacional:** CEPs, km, distância GPS, estimativa linha recta (Haversine), coordenadas, contagem de pontos GPS.
  - **Auditoria admin:** trilha de datas, validação pela equipa, notas; confirmação **`customConfirm`** antes de validar.
- **Rodapé do modal:** Fechar + **Validar viagem** (habilitado para `COMPLETED` sem validação prévia).
- **Aceite / situação** na UI: função `driverAcceptanceBadge` — combina `driverDecision`, estado da viagem e `auditValidatedAt` para não mostrar «Pendente» quando a viagem já foi executada ou auditada (campo legado `PENDING` na BD).

---

## 5. Portal motorista — `/driver/viagens`

- Cartões de viagem com fotos de hodómetro alinhadas ao mesmo componente de pré-visualização (âmbito `driver`).
- Fluxos de iniciar/concluir, aceitar/recusar: ver controlador e páginas em `frontend/app/driver/`.

---

## 6. Ficheiros-chave

| Área | Caminho |
|------|---------|
| Serviço | `backend/src/trips/trips.service.ts` |
| Controladores | `backend/src/trips/trips.controller.ts` (`TripsController`, `AdminTripsController`) |
| UI admin | `frontend/app/admin/viagens/page.tsx` |
| Fotos | `frontend/components/admin/TripOdometerPhotosPreview.tsx`, `EnrollmentDocumentsPreview.tsx` |
| Shell modal | `frontend/components/admin/employee-style-admin-detail.tsx` |

---

## 7. Princípio UX (fotos)

Fotos MinIO privadas **não** devem ser usadas como `src` directo no browser: o cliente pede **URL presignada** ao backend antes de mostrar ou descarregar.
