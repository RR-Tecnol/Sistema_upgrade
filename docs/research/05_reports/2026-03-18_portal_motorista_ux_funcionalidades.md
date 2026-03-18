# PESQ-F2-01 — Portal do Motorista: UX e Funcionalidades
## Deep Research Result | Sistema Upgrade | 18/03/2026
## Bloqueia: EXEC-02

> Pesquisa encomendada para definir o escopo do portal /driver/* antes da implementação.
> O motorista (DRIVER) opera carretas-escola no interior do MA, PI e AC com Android antigo e 3G instável.

---

## 1. CONTEXTO OPERACIONAL

O motorista não é apenas um condutor — é o operador logístico que garante que a carreta-escola
chegue ao município para que as aulas aconteçam. Sem ele, não há curso; sem curso, não há
pagamento governamental. Por isso o portal deve ser tratado como ferramenta crítica de campo.

O perfil de uso define tudo: Android legado, 3G intermitente ou inexistente em rodovias rurais,
fadiga de jornada, interação com uma mão ao lado do volante. Isso impõe restrições severas:
interfaces minimalistas, alvos de toque grandes (mínimo 48px), alto contraste para luz solar direta,
e resiliência offline obrigatória.

**Princípio de ouro:** O motorista NUNCA deve ver dados pedagógicos (turmas, alunos, frequência).
Isso viola privacidade, aumenta risco de dispositivo comprometido e confunde o usuário.

---

## 2. AS 4 TELAS ESSENCIAIS (MVP)

| Rota | Propósito | Dados do Prisma |
|------|-----------|-----------------|
| `/driver/dashboard` | Painel central com viagem ativa e ações rápidas | Trip (IN_TRANSIT ou PLANNED) |
| `/driver/viagens` | Ciclo de vida das rotas com abas por status | Trip (PLANNED/IN_TRANSIT/COMPLETED) |
| `/driver/reembolsos` | Prestação de contas de campo com foto | Reimbursement + MinIO presigned URL |
| `/driver/veiculo` | Especificações do caminhão + manutenções | Truck + TruckMaintenance |

### 2.1 Dashboard — as 3 funcionalidades mais usadas

**Cartão de Viagem Ativa:** Se Trip.status = IN_TRANSIT → exibir destino + botão "Cheguei ao Destino"
(captura kmEnd). Se PLANNED → botão "Iniciar Viagem" (captura kmStart). É a ação do dia a dia.

**Atalho de Reembolso:** Botão flutuante de Quick Action para abrir direto o formulário + câmera.
O comprovante físico se perde rapidamente — o registro precisa ser imediato.

**Reporte de Incidente:** Botão "Reportar Problema" salva nota rápida no campo `Trip.notes`.
Documenta atrasos, atoleiros, avarias — protege o motorista e alerta o backoffice em tempo real.

### 2.2 Viagens — organização por status

As 3 abas seguem a máquina de estado do banco:
- **IN_TRANSIT (default quando há viagem ativa):** mostrar destino, ETA, kmStart, campo de notas.
  Ação principal: Finalizar Viagem com obrigatoriedade de kmEnd.
- **PLANNED:** lista cronológica de próximas rotas. Ação: Iniciar Viagem (solicita kmStart obrigatório).
  Regra de negócio: impedir início se já há uma IN_TRANSIT para o mesmo caminhão.
- **COMPLETED:** histórico read-only. Mostrar par origem/destino, km percorrida (kmEnd - kmStart), notas finais.

### 2.3 O que registrar além de reembolsos

**Quilometragem obrigatória:** kmStart ao iniciar + kmEnd ao finalizar. Sem isso o TruckMaintenance
falha — não há como calcular desgaste de pneus, óleo e freios em rodovias do nordeste/amazônico.

**Diário de bordo incremental:** Inserções append no campo `Trip.notes` com timestamp a cada
update. Registra: estrada interditada, pneu furado, zona sem sinal, atraso por chuva.
Cada entrada é imutável — cria trilha de auditoria para o contrato B2G.

---

## 3. ENDPOINTS DE API NECESSÁRIOS (NestJS)

| Método | Rota | Propósito |
|--------|------|-----------|
| GET | `/api/driver/trips` | Viagens do motorista autenticado. Query param: `?status=IN_TRANSIT` |
| PATCH | `/api/driver/trips/:id/start` | PLANNED → IN_TRANSIT. Payload: `{ kmStart, actualDepartureDate }` |
| PATCH | `/api/driver/trips/:id/complete` | IN_TRANSIT → COMPLETED. Payload: `{ kmEnd, actualArrivalDate }` |
| PATCH | `/api/driver/trips/:id/notes` | Append incremental no campo notes. Payload: `{ note, timestamp }` |
| POST | `/api/driver/reimbursements` | Cria reembolso + retorna presignedUrl MinIO para upload da foto |
| POST | `/api/driver/sync` | Endpoint offline-first: recebe vetor de mutações acumuladas offline |

**Regra de segurança:** Todas as rotas protegidas por JwtAuthGuard com verificação de UserRole.DRIVER.
Um interceptor garante que o motorista só manipula dados das suas próprias viagens (pelo userId do JWT).

**Idempotência obrigatória:** Endpoints POST e PATCH devem aceitar `idempotencyKey` (UUID gerado no cliente).
Em 3G, retentativas são inevitáveis — sem idempotência cria duplicatas de reembolsos ou notas.

---

## 4. ESTRATÉGIA OFFLINE-FIRST (PWA)

**Service Worker com Workbox:**
- `CacheFirst` para App Shell (HTML, CSS, JS, fontes, logos) — carrega instantaneamente sem sinal.
- `NetworkFirst` com fallback para chamadas GET da API — exibe último estado conhecido se offline.
- `NetworkOnly` para autenticação JWT — nunca aceitar login offline por segurança.

**IndexedDB (não localStorage):** Armazena Trip e Reimbursement localmente. localStorage é síncrono
e bloqueia a thread em CPUs antigas. IndexedDB é assíncrono e suporta centenas de MB.

**Atualizações otimistas:** Ao finalizar uma viagem offline, a UI atualiza imediatamente
(move card para COMPLETED). Nos bastidores: ação enfileirada para sync quando sinal retornar.
Ícone de "Sincronização Pendente" tranquiliza o motorista de que o dado foi salvo localmente.

**Upload de fotos offline:** Capturar foto → comprimir para WebP/JPEG abaixo de 300KB via
`browser-image-compression` → armazenar no IndexedDB como Blob → quando sinal retornar:
solicitar presignedUrl e fazer upload assíncrono pelo Background Sync API.

---

## 5. O QUE NÃO IMPLEMENTAR (escopo MVP)

**GPS em tempo real via WebSocket:** Drena bateria, consome dados 3G, falha em modo background
no Android (Doze Mode). Toda telemetria via entrada manual de odômetro (kmStart/kmEnd).

**Navegação turn-by-turn:** Motoristas conhecem as rotas. Usar Deep Links para abrir Google Maps
nativo com as coordenadas de destino — zero esforço de desenvolvimento, resultado imediato.

**Chat in-app:** Requer WebSocket contínuo. Inviável com 3G intermitente. Coordenação por
telefone + registro assíncrono nos notes da viagem.

**Dashboards financeiros analíticos:** Gráficos de desempenho não têm utilidade em campo.
A análise financeira é responsabilidade do portal admin, não do motorista.

---

## 6. UX ESPECÍFICO PARA CAMPO

- Todos os botões de ação primária: mínimo 48x48px (supera o padrão Apple HIG de 44px)
  porque o motorista pode estar com luva ou em movimento.
- Tipografia: alto contraste, mínimo 16px para texto de dados — legível sob sol direto.
- Layout dark (#0F172A) consistente com o portal do professor — reutilizar componentes.
- Skeleton screens em vez de spinners — evita a percepção de "tela travada" em dispositivos lentos.
- Feedback de "Modo Offline" visível: banner ou ícone de nuvem cortada no header.
- Confirmações simples para ações irreversíveis (finalizar viagem) — modal com um botão.

---

*PESQ-F2-01 | Concluída em 18/03/2026 | Bloqueia EXEC-02*
*Implementação: criar docs/arquitetura/PROMPTS_EXECUCAO_FASE2.md → EXEC-02*
