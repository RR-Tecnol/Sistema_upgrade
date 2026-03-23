# 🛡️ LIVRO DE REGRAS — Sistema Upgrade
## Regras Imutáveis | v5.0 | 23/03/2026 — Auditoria NASA-level
## Não violar sem autorização do Tech Lead (Davi / Ronaldo)

> **GRAVITY:** Leia ESTE arquivo INTEIRO antes de escrever qualquer linha de código.
> As regras aqui existem porque cada uma delas já quebrou algo neste projeto.

---

## 1. UI/UX e Frontend

- **Design System:** Tailwind CSS + classes customizadas em `globals.css`. Cores institucionais: amarelo (#FFD600), preto, branco.
- **Sem redesign sem autorização:** Nunca alterar identidade visual de componentes existentes.
- **Novas páginas:** Herdam layout base (Sidebar, Header, Cards) já implementados.
- **Responsividade obrigatória:** Usar classes de grid do `globals.css`:
  - `grid-4-cols` → 4 cols desktop, 2 em ≤1024px, 1 em ≤768px
  - `grid-3-cols` → 3 cols desktop, 1 em ≤768px
  - `grid-2-cols` → 2 cols desktop, 1 em ≤768px
- **Touch-friendly:** Todo botão/input = `min-height: 44px, min-width: 44px`
- **Anti-zoom iOS:** Inputs devem ter `font-size: 16px` no mobile.
- **Sidebar mobile:** Em `< 768px`, sidebar some → botão hamburger aparece. Hamburger usa `className="md:hidden"`.
- **Upload de foto:** `capture="environment"` no `<input type="file">` + `browser-image-compression` (max 0.5MB, 1200px).
- **Modais SEMPRE `position: fixed`:** Nunca `position: absolute` em modais. Usar `inset: 0` + `display:flex; alignItems:center; justifyContent:center`. Ao abrir: `document.body.style.overflow = 'hidden'`. Ao fechar: `document.body.style.overflow = ''`.
- **Animações:** Todo novo componente deve ter `className="animate-fade-in"` no wrapper raiz.
- **`console.log/error` proibido no frontend:** Usar `toast.error()` para erros ao usuário. Remover qualquer `console.error` antes de commitar.

---

## 2. Padrões de Código Backend (NestJS)

- **Arquitetura modular:** Todo novo recurso = seu próprio Module, Controller, Service e DTOs.
- **Validação estrita:** Todos os payloads de entrada devem usar `class-validator`. Nenhuma requisição passa sem tipagem.
- **Rotas protegidas:** Toda rota usa `@UseGuards(JwtAuthGuard)` + `@Roles()` quando aplicável.
- **RolesGuard obrigatório junto com @Roles():** `@Roles('ADMIN')` sem `@UseGuards(RolesGuard)` = NÃO tem efeito. O decorator apenas seta metadata — o Guard é quem a lê. Sempre usar os dois juntos.
- **Ordem de rotas literais:** `@Get('my')`, `@Get('me')`, `@Get('all')` SEMPRE antes de `@Get(':id')`. NestJS resolve na ordem de declaração.
- **Dependências entre módulos:** `ModuleA` que injeta `ServiceB` DEVE declarar `ModuleB` em `imports[]`.
- **Módulos @Global():** `SettingsModule` e `NotificationsModule` são globais — NÃO precisam ser declarados em `imports[]`.
- **Imports mortos proibidos:** Nunca deixar `import` em `.module.ts` sem usar no array `imports[]`.
- **`return` explícito obrigatório:** Todo método de service que monta objeto de resposta DEVE ter `return` explícito. TypeScript não avisa — bug silencioso.
- **BOOM:** Antes de qualquer commit, `npx tsc --noEmit` deve passar com zero erros.
- **`console.log` proibido no backend:** Usar `new Logger(NomeClasse.name)`.
- **NestJS versões:** Todos os pacotes `@nestjs/*` DEVEM ser da mesma versão major. Nunca misturar v10 com v11.

---

## 3. Banco de Dados (Prisma / PostgreSQL)

- **Nunca hard delete:** Usar `active: boolean = false` (soft delete). Nunca `DELETE FROM` nem `.delete()` na aplicação (exceto tabelas de pivot sem histórico relevante, com aprovação do Tech Lead).
- **Nunca Float para dinheiro:** SEMPRE `Decimal` no Prisma / `NUMERIC(12,2)` no PostgreSQL. `Float` causa arredondamento binário: `0.1 + 0.2 = 0.30000000000000004`.
- **Migrations apenas:** Nunca usar `sync({ alter: true })`. Apenas `npx prisma migrate dev`.
- **Após alterar schema:** SEMPRE rodar `npx prisma generate` antes de usar o Prisma Client.
- **IDs:** UUID (`@default(uuid())`). Nunca SERIAL ou auto-increment.
- **Soft delete obrigatório:** Todo model deve ter `active Boolean @default(true)`.
- **Timestamps obrigatórios:** Todo model tem `createdAt @default(now())` e `updatedAt @updatedAt`.
- **Normalização de datas:** Datas de frequência SEMPRE normalizadas para meia-noite UTC: `new Date(Date.UTC(y, m, d))`. Evita duplicatas por timezone.
- **Decimal como string:** Prisma retorna Decimal como string. No frontend: `Number(v).toFixed(2)`.
- **Encoding:** Container PostgreSQL DEVE ter `POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"` desde a criação.
- **Prisma Client:** Após qualquer alteração no schema, rodar `npx prisma generate`. Nunca usar `(this.prisma as any).modelo` — isso é sinal de que o client está desatualizado.

---

## 4. Uploads e Storage

- **Tudo vai para o MinIO:** Nunca salvar no disco local do container.
- **Presigned URLs:** Upload direto do browser/celular para o MinIO — o backend não toca no arquivo.
- **Nunca delete físico:** Arquivos no MinIO apenas desativados, nunca deletados.
- **Compressão antes do upload:** `browser-image-compression` (max 0.5MB, 1200px).
- **`MinioService` singleton:** Nunca instanciar `new Client()` dentro de método. Usar `@Injectable()` + `OnModuleInit`.

---

## 5. Autenticação e Segurança

- **`req.user.id` SEMPRE:** Nunca usar `req.user.sub` nos controllers. `JwtStrategy.validate()` retorna `id`.
- **`return response` obrigatório:** Métodos de serviço que montam objetos de resposta DEVEM ter `return` explícito.
- **`@Roles()` + `@UseGuards(RolesGuard)` sempre juntos:** Um sem o outro = metadata ignorada = sem proteção.
- **Fluxo de login:** 1) 2FA → `{ requiresTwoFactor: true, userId }`. 2) Sem 2FA → `{ user, access_token, refresh_token }`. 3) Aluno → inclui `student: { id, cpf }`.
- **2FA obrigatório para:** ADMIN e COORDINATOR.
- **Registro público:** NUNCA aceita role do body — `role: 'STUDENT'` hardcoded.
- **Modo manutenção:** `MAINTENANCE_KEY` no `.env`. Sem chave = bypass nunca funciona.
- **Logout completo:** Ao fazer logout, remover `token`, `user`, `student`, `auth-storage` do localStorage E atualizar Zustand store. Nunca apenas um dos dois.

---

## 6. WebSocket e Notificações

- **Gateway único:** Apenas `NotificationsGateway` em `backend/src/notifications/`.
- **Namespace:** Sempre `/notifications`. Nunca namespace raiz `/`.
- **Auth obrigatória:** Handshake WS exige JWT válido.
- **WS fora de `$transaction`:** `try/catch` SEPARADO, NUNCA dentro da transaction. Falha no WS NUNCA causa rollback.
- **Hook único no frontend:** `useNotifications` em `hooks/useNotifications.ts`.
- **Eventos registrados:** `nova_inscricao`, `inscricao_aprovada`, `inscricao_rejeitada`, `frequencia_registrada`, `imprevisto_cadastrado`, `reembolso_solicitado`, `reembolso_revisado`, `custo_excessivo`.
- **Notificações persistidas:** O hook DEVE carregar notificações históricas do banco ao montar (`GET /notifications`), não apenas ouvir eventos WS.

---

## 7. Enums e Contratos de API

- **Frontend usa valores do enum do backend:** Nunca criar valores locais diferentes.
- **`ReimbursementType`:** `CLASSROOM_MATERIAL | CLEANING_MATERIAL | EMERGENCY_REPAIR | FOOD | OTHER`
  - `FOOD` não é `ALIMENTACAO`. `EMERGENCY_REPAIR` não é `EMERGENCIAL`.
- **`UserRole`:** `ADMIN | COORDINATOR | FINANCIAL | TEACHER | STUDENT | DRIVER`
- **`TruckType`:** `STANDARD | MULTICOURSE` — NUNCA `TRUCK`, `CAMINHAO`, `MULTICURSO`
- **`TruckMaintenance.tipo`:** string livre: `preventiva | corretiva | revisao | pneu | eletrica | outro`
- **`TruckMaintenance.status`:** string livre: `agendada | em_andamento | concluida | cancelada`
- **Antes de criar formulário:** Ver DTO do backend para nomes e valores de enums.
- **API paginada vs array direto:** Endpoints de reembolso retornam `{ data: [], meta: {} }`. Endpoints de inscrições retornam array direto. Verificar em cada endpoint antes de assumir formato.

---

## 8. Anti-Padrões Proibidos — O Catálogo Completo
### (O que Devs Júnior/Pleno Cometem — NUNCA FAZER neste projeto)

> Esta seção é o "livro de vacinas". Cada entrada representa um erro real que já ocorreu
> ou foi identificado em auditoria. Expansão contínua. Quanto mais completa, melhor o AI executa.

---

### 8A. BANCO DE DADOS E PRISMA

| Anti-Padrão | Por que é errado | Como fazer certo |
|-------------|-----------------|-----------------|
| `Float` para dinheiro | `0.1 + 0.2 = 0.30000000000000004` — arredondamento binário | `Decimal @db.Decimal(12,2)` |
| `DELETE FROM` / `.delete()` sem soft delete | Perde histórico, viola LGPD, não tem rollback | `UPDATE SET active=false` |
| `this.prisma.$transaction()` com WS dentro | Falha no WS causa rollback do banco inteiro | WS em try/catch SEPARADO, fora da transaction |
| `await` em `for...of` em série | N requests sequenciais quando poderiam ser paralelos | `await Promise.all(array.map(...))` |
| `findMany` sem `where` em tabela grande | Retorna toda a tabela — timeout ou OOM em produção | Sempre adicionar filtros + `take: N` |
| `update` sem verificar se registro existe | `P2025: Record not found` em produção | `findUnique` antes de `update`, ou usar `upsert` |
| `(this.prisma as any).modelo` | Client Prisma desatualizado — falha em runtime | `npx prisma generate` e usar tipo correto |
| Ignorar `@@unique` ao fazer `create` duplicado | `P2002: Unique constraint failed` em produção | `findFirst` antes de `create`, ou usar `upsert` |
| Buscar usuário por `role` em seeds | `findFirst({ where: { role: 'DRIVER' } })` pode pegar o usuário errado | Sempre buscar por email: `{ where: { email: '...' } }` |
| `new Date(isoString)` sem normalizar para UTC | Duas saves no mesmo dia criam registros distintos no unique constraint | `new Date(Date.UTC(y, m, d))` — sempre meia-noite UTC |
| SERIAL/auto-increment para IDs | Conflito em merge de bancos, vaza contagem de registros | `@id @default(uuid())` — UUID sempre |
| Schema sem `active` em models de negócio | Sem como fazer soft delete | `active Boolean @default(true)` em todo model |
| Schema sem `updatedAt` | Sem rastreabilidade de modificações | `updatedAt DateTime @updatedAt` em todo model |
| `Decimal` exibido direto no frontend | Prisma retorna Decimal como string — `"45.5"` em vez de `45.5` | `Number(valor).toFixed(2)` antes de exibir |

---

### 8B. NESTJS E BACKEND

| Anti-Padrão | Por que é errado | Como fazer certo |
|-------------|-----------------|-----------------|
| `@Roles()` sem `@UseGuards(RolesGuard)` | Decorator define metadata mas NINGUÉM LÊ — zero proteção | Sempre usar `@UseGuards(JwtAuthGuard, RolesGuard)` junto com `@Roles()` |
| `@Get(':id')` antes de `@Get('my')` | NestJS captura "my" como valor do parâmetro `:id` | Rotas literais SEMPRE antes de rotas com parâmetro |
| `req.user.sub` em controllers | JwtStrategy retorna `id`, não `sub` — `undefined` silencioso | `req.user.id` sempre |
| `req.user?.id \|\| req.user?.sub` como fallback | O fallback para `sub` mascara o bug em vez de corrigi-lo | `req.user.id` direto; se undefined, lançar `UnauthorizedException` |
| Método de service sem `return` explícito | TypeScript compila — runtime retorna `undefined` sem erro | `return` obrigatório em todo path de execução |
| `new MinioClient()` dentro de método | Nova conexão TCP por request → ECONNREFUSED com múltiplos requests | `@Injectable()` singleton com `OnModuleInit` |
| `import` em `.module.ts` sem adicionar ao `imports[]` | NestJS DI error em runtime, não em compilação | Todo import usado em arrays `imports[]`, `providers[]`, `exports[]` |
| Versões mistas de pacotes `@nestjs/*` | TypeScript warnings + comportamento inesperado em DI | Todos os pacotes `@nestjs/*` na mesma versão major |
| `console.log()` no backend | Não aparece nos logs estruturados, pode vazar dados sensíveis | `new Logger(NomeClasse.name).log(msg)` |
| Ignorar erros de WS dentro de transaction | Falha WS = rollback da operação principal | WS em try/catch separado, fora da `$transaction` |
| Enviar array vs objeto sem documentar | Frontend não sabe o formato esperado | Documentar no Swagger: array direto ou `{ data: [], meta: {} }` |
| Criar seed files avulsos `seed-test.ts` | Fragmenta dados de teste, difícil manter | Tudo em `seed-full.ts` — único arquivo de seed |
| `npm run prisma:seed` apontando para arquivo inexistente | Quebra silenciosamente em qualquer novo clone | Manter script alinhado com o arquivo real |

---

### 8C. FRONTEND (Next.js / React)

| Anti-Padrão | Por que é errado | Como fazer certo |
|-------------|-----------------|-----------------|
| Mock hardcoded em produção: `const data = [{id:1}]` | Sistema parece funcionar mas dados não são reais — detectado em demo | Criar endpoint real; nunca array literal como dado |
| `Array.isArray(res.data)` sem fallback para paginação | API retorna `{ data: [], meta: {} }` — `isArray` é false → array vazio | `Array.isArray(res.data) ? res.data : (res.data?.data ?? [])` |
| `stats?.enrollments` quando stats tem estrutura de métricas | `stats.enrollments` é `{ total, approved }` — não array → `.map()` explode | Separar: enrollments de `turma.enrollments`, métricas de `stats` |
| `setTipo('ALIMENTACAO')` com valor inválido | Enum no backend é `FOOD`, não `ALIMENTACAO` — 400 na próxima request | Sempre usar os values exatos do enum do backend |
| `localStorage` como fallback de save sem avisar o usuário | Usuário acha que salvou, dados nunca chegam ao banco | Mostrar erro real: `toast.error('Erro ao salvar...')` |
| `document.body.style.overflow` sem resetar ao fechar | Página fica sem scroll após fechar modal | Sempre resetar `document.body.style.overflow = ''` no onClose |
| Modal com `position: absolute` | Rola com a página quando há scroll | `position: fixed; inset: 0` |
| `console.error(e)` no catch de chamada API | Não mostra nada ao usuário; dado perde-se silenciosamente | `toast.error(e?.response?.data?.message \|\| 'Erro desconhecido')` |
| Estado de autenticação em dois lugares (Zustand + localStorage) | Podem ficar dessincronizados — usuário vê telas erradas | Logout sempre limpa AMBOS; login sempre escreve em AMBOS |
| `useNotifications` sem carregar histórico do banco | Notificações somem ao recarregar a página | Fetch `GET /notifications` no `useEffect` antes de conectar WS |
| Concatenação de string com acento: `"Manutenção: " + val` | Pode corromper em alguns bundlers/transpilers | Template literal: `` `Manutenção: ${val}` `` |
| Labels de enum sem mapa: exibir `CLASSROOM_MATERIAL` na UI | Usuário vê string técnica em inglês | Sempre usar mapa: `{ CLASSROOM_MATERIAL: 'Material de Aula', ... }` |
| Input `type="text"` para valor monetário | Aceita letras — `NaN` no parse | `type="number" step="0.01" min="0"` + validação no submit |
| Fazer reload e setState ao mesmo tempo | Double-render, estado inconsistente momentâneo | Escolher um: ou atualização otimista OU reload pós-confirmação |
| Soft delete não refletido na UI | Usuário continua vendo item deletado até recarregar | Remover item do array local imediatamente após confirmação |
| `React.useEffect` com dependência faltando | Comportamento stale — função usa valor antigo | Incluir todas as dependências; usar `useCallback` corretamente |

---

### 8D. ENCODING, UTF-8 E INTERNACIONALIZAÇÃO

| Anti-Padrão | Por que é errado | Como fazer certo |
|-------------|-----------------|-----------------|
| Container PostgreSQL sem `pt_BR.UTF-8` | Acentos chegam corrompidos: `SÃ£o LuÃ­s` | `POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"` |
| Label de enum sem mapa de tradução | `CLEANING_MATERIAL` aparece na UI em inglês | `const TIPO_LABELS = { CLEANING_MATERIAL: 'Material de Limpeza' }` |
| String com acento via concatenação | `"Manutenção" + ": " + v` pode corromper em edge cases | Template literal `` `Manutenção: ${v}` `` sempre |
| `replace()` sem flag `g` em string com múltiplos matches | Só substitui a primeira ocorrência | `.replaceAll()` ou `/.../g` |
| `toLocaleDateString()` sem locale explícito | Comportamento difere por navegador/sistema | Sempre `toLocaleDateString('pt-BR')` |
| `toLocaleString()` sem opções de moeda | Pode formatar diferente em ambiente de produção | `toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })` |
| Ordenação de strings com acentos sem `localeCompare` | `'são'.localeCompare('sao')` != `'são' > 'sao'` em todos os browsers | `array.sort((a, b) => a.localeCompare(b, 'pt-BR'))` |

---

### 8E. SEGURANÇA

| Anti-Padrão | Por que é errado | Como fazer certo |
|-------------|-----------------|-----------------|
| `@Roles()` sem `RolesGuard` | Nenhuma verificação de role acontece | Sempre pair `@Roles()` com `@UseGuards(RolesGuard)` |
| Aceitar `role` no body de registro público | Qualquer um pode criar conta ADMIN | `role: 'STUDENT'` hardcoded no service |
| `undefined === undefined` em MAINTENANCE_KEY | Sem chave definida, bypass sempre ativo | `!!maintenanceKey && maintenanceKey.length > 0 && header === maintenanceKey` |
| Redis sem senha em produção | Acesso não autenticado ao cache | `requirepass` no Redis em produção |
| Credenciais visíveis na UI de login | Vaza senhas para qualquer usuário | Remover qualquer texto de "credenciais de teste" antes do deploy |
| Token JWT no corpo de URL | Token aparece nos logs do servidor e do browser | Sempre no header `Authorization: Bearer ...` |
| Refresh token sem expiração no banco | Token roubado pode ser usado indefinidamente | `expiresAt` sempre definido, deletar expirados regularmente |

---

### 8F. ARQUITETURA E PADRÕES GERAIS

| Anti-Padrão | Por que é errado | Como fazer certo |
|-------------|-----------------|-----------------|
| Endpoint retorna estrutura diferente da documentada | Frontend quebra silenciosamente | Manter consistência: array ou `{ data, meta }` — documentar e nunca mudar |
| Dois estados de auth paralelos sem sincronização | Estado fantasma — usuário "deslogado" mas token ainda válido | Logout limpa TUDO; login escreve em TUDO |
| Criar endpoint sem verificar se já existe | Endpoints duplicados com comportamentos ligeiramente diferentes | Ver Swagger `/api/docs` antes de criar |
| WS + banco na mesma operação atômica | Falha de rede causa rollback de operação de negócio real | WS é sempre auxiliar — operação principal deve funcionar sem ele |
| Múltiplos arquivos seed | Dados de teste fragmentados, difícil manter ordem de execução | Um único `seed-full.ts` cobrindo todos os cenários |
| Versões incompatíveis de dependências | Bugs intermitentes difíceis de reproduzir | Verificar compatibilidade de major version antes de instalar |
| Fallback de dado local quando servidor falha | Usuário acha que salvou mas dado não foi ao banco | Mostrar erro claro; nunca fingir sucesso |

---

## 9. Glossário Oficial (UI × Banco)

| Termo na UI | Termo no Banco/Código | Descrição |
|-------------|----------------------|-----------|
| Período de Curso / Rota | `Acao / acoes` | Operação de campo itinerante da carreta |
| Carreta | `Truck / trucks` | Veículo-escola itinerante |
| Aluno | `Student / students` | Beneficiário do programa |
| Turma | `Class / classes` | Instância de curso em data/local específico |
| Inscrição | `Enrollment / enrollments` | Solicitação para participar de turma |
| Grupo | `Group / groups` | Unidade operacional por estado |
| Funcionário | `Employee / employees` | Colaborador externo (motorista, técnico) |
| Imprevisto | `Absence / absences` | Ausência/imprevisto multi-perfil |
| Preferências | `UserPreferences` | A criar — configurações por usuário |
| Frequência de Funcionário | `EmployeeAttendance` | A criar — presença de employees |

---

## 10. Regras de Negócio Definitivas

| Regra | Valor | Origem |
|-------|-------|--------|
| Threshold de aprovação | **75% de frequência** | Decisão Tech Lead |
| Vagas de reserva padrão | **4 vagas** | Reunião Robert 12/03/2026 |
| Diária de custo CLT | **R$120/dia** | Reunião Robert 12/03/2026 |
| Limite de distância passagem | **200km** | Reunião Robert 12/03/2026 |
| Parâmetros financeiros | **Configuráveis via painel** | Nunca hardcodar |
| 2FA | **Obrigatório para ADMIN e COORDINATOR** | Sprint S3 |

---

## 11. Padrões de Commits

```
fix: descrição do bug corrigido
feat: nova funcionalidade adicionada
refactor: refatoração sem mudança de comportamento
docs: atualização de documentação
chore: infraestrutura, configs, scripts
```

**Checklist antes de qualquer commit:**
1. `npx tsc --noEmit` no backend → zero erros
2. `npm run build` no frontend → zero erros
3. Testar ao vivo o fluxo afetado (não apenas "compila")
4. Aprovação do Tech Lead

---

*Sistema Upgrade | RR TECNOL | v5.0 | 23/03/2026*
*Atualizado por: Gravity 2.0 — Auditoria NASA-level de cada arquivo do projeto*
