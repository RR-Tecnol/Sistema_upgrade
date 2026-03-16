# 🚨 04_ERROS_E_SOLUCOES — Troubleshooting Log

> **Regra:** ANTES de tentar resolver qualquer erro, consulte este arquivo. Se ainda não estiver aqui, resolva, documente e avise o Tech Lead.

---

*(Formato padrão para novas inserções — copie e cole abaixo)*

```
---
* **Data:**
* **Módulo/Arquivo afetado:**
* **Erro / Stack Trace:**
* **Contexto:** (O que estávamos tentando fazer quando o erro ocorreu)
* **Causa Raiz:** (Por que o erro aconteceu)
* **Solução Aplicada:** (Qual código/config resolveu e por que)
* **Prevenção Futura:** (Como evitar que isso aconteça de novo)
---
```

---

## Erros Conhecidos e Solucionados

---

* **Data:** 12/03/2026
* **Módulo/Arquivo afetado:** `backend/src/main.ts` + `frontend/.env`
* **Erro / Stack Trace:** `GET /api/api/auth/login 404 Not Found`
* **Contexto:** O frontend chamava `/api/auth/login` mas a `baseURL` do Axios já incluía `/api`, resultando em `/api/api/auth/login`.
* **Causa Raiz:** A variável `NEXT_PUBLIC_API_URL` foi definida como `http://localhost:3001/api` (com `/api` no final), e o Axios também concatenava `/api` na baseURL.
* **Solução Aplicada:** Definir `NEXT_PUBLIC_API_URL=http://localhost:3002/api` no `.env` do frontend e garantir que a baseURL do Axios seja `${NEXT_PUBLIC_API_URL}` diretamente, sem adicionar `/api` novamente no código.
* **Prevenção Futura:** A `NEXT_PUBLIC_API_URL` sempre deve incluir o prefixo `/api`. Nunca concatenar `/api` hardcoded no código do Axios. Porta do backend é **3002** (não 3001).

---

* **Data:** 12/03/2026
* **Módulo/Arquivo afetado:** `docker-compose.yml`
* **Erro / Stack Trace:** `Error: unable to get image 'postgres:15-alpine'`
* **Contexto:** Ao rodar `docker-compose up -d` pela primeira vez em rede corporativa.
* **Causa Raiz:** Proxy ou firewall bloqueando o pull de imagens do Docker Hub.
* **Solução Aplicada:** Reiniciar o Docker Desktop e fazer o pull manual: `docker pull postgres:15-alpine`. Se persistir, desativar temporariamente o proxy.
* **Prevenção Futura:** Em ambiente corporativo, configurar o Docker com mirror registry ou verificar configuração de proxy em Settings > Docker Engine.

---

* **Data:** 12/03/2026
* **Módulo/Arquivo afetado:** `backend` — porta
* **Erro / Stack Trace:** `Error: listen EADDRINUSE: address already in use :::3002`
* **Contexto:** Ao tentar iniciar o backend após reinicialização sem ter encerrado o processo anterior.
* **Causa Raiz:** Processo Node.js "zumbi" ainda ocupando a porta 3002.
* **Solução Aplicada (Windows):**
  ```powershell
  netstat -ano | findstr :3002
  # Pegar o PID na última coluna
  taskkill /F /PID <PID>
  # Ou matar todos os processos Node de uma vez:
  Get-Process -Name node | Stop-Process -Force
  ```
* **Prevenção Futura:** Sempre encerrar os terminais corretamente com `Ctrl+C` antes de reiniciar. Iniciar sempre o Backend ANTES do Frontend.

---

* **Data:** 12/03/2026
* **Módulo/Arquivo afetado:** `backend/src/main.ts` — script `npm run dev`
* **Erro / Stack Trace:** `npm error Missing script: dev`
* **Contexto:** Tentativa de iniciar o backend com `npm run dev` (padrão do NestJS quando não configurado).
* **Causa Raiz:** O `package.json` do backend NestJS usa `start:dev` (não `dev`) para hot-reload.
* **Solução Aplicada:** Usar o comando correto: `$env:PORT=3002; npm run start:dev`
* **Prevenção Futura:** Scripts válidos do backend: `start` (sem watch), `start:dev` (com watch/hot-reload), `start:prod` (produção, requer build prévio com `npm run build`).

---

* **Data:** 12/03/2026
* **Módulo/Arquivo afetado:** `frontend` — `npm start`
* **Erro / Stack Trace:** Exit code 1 ao rodar `npm start` no frontend
* **Contexto:** Tentativa de iniciar o frontend em modo de desenvolvimento com `npm start`.
* **Causa Raiz:** No Next.js, `npm start` executa `next start` que requer build de produção prévia. Para desenvolvimento usa-se `npm run dev`.
* **Solução Aplicada:** Usar `npm run dev` para desenvolvimento local. Para produção: `npm run build && npm start`.
* **Prevenção Futura:** Frontend Next.js: `npm run dev` (desenvolvimento), `npm run build` + `npm start` (produção).

---

* **Data:** 12/03/2026
* **Módulo/Arquivo afetado:** `backend/prisma/schema.prisma`
* **Erro / Stack Trace:** `ERROR: type "serial" does not exist`
* **Contexto:** Ao rodar `npx prisma migrate dev` com `sequelize.sync({ alter: true })` (se existir código legado Sequelize misturado).
* **Causa Raiz:** PostgreSQL não aceita o tipo `SERIAL` em `ALTER TABLE`. Ocorre quando se tenta alterar uma coluna existente para auto-incremento.
* **Solução Aplicada:** Garantir que `sync` não use `alter: true` em tabelas com sequências. Usar apenas migrações Prisma (`migrate dev`) em vez de sync automático.
* **Prevenção Futura:** O projeto usa EXCLUSIVAMENTE Prisma Migrate. Não misturar Sequelize ou outros ORMs. IDs são UUID (`@default(uuid())`), não SERIAL.

---

* **Data:** 13/03/2026
* **Módulo/Arquivo afetado:** `frontend/app/admin/certificados/page.tsx`
* **Erro / Stack Trace:** BUG-CERT — `alert("Erro ao emitir certificado")` genérico sem detalhes
* **Contexto:** Ao tentar emitir certificado para aluno sem status ENROLLED ou frequência < 75%, o frontend exibia apenas um `alert()` genérico.
* **Causa Raiz:** A função `issueCertificate` capturava o erro mas não exibia o `message` da resposta da API.
* **Solução Aplicada:** Substituído `alert()` por banner inline `issueError` com mensagem detalhada da API + causa provável. JSX do ternário `loading ?` também estava quebrado e foi corrigido.
* **Prevenção Futura:** Sempre capturar e exibir `err?.response?.data?.message` nos handlers de erro da API.

---

* **Data:** 13/03/2026
* **Módulo/Arquivo afetado:** `backend/src/holiday/`, `backend/src/reimbursement/`, `backend/src/reports/`
* **Erro / Stack Trace:** `Cannot find module './holiday.service'`, `Cannot find module './reimbursement.controller'`, `Property 'classHoliday' does not exist on type 'PrismaService'`
* **Contexto:** Lints do VS Code após edição dos arquivos.
* **Causa Raiz:** Cache antigo do TypeScript Language Server — os arquivos existem e compilam corretamente.
* **Solução Aplicada:**
  ```powershell
  cd backend
  npx prisma generate
  ```
  No VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
* **Prevenção Futura:** SEMPRE rodar `npx prisma generate` após alterações no `schema.prisma` ou ao clonar o repositório em uma nova máquina.

---

* **Data:** 13/03/2026
* **Módulo/Arquivo afetado:** PostgreSQL — banco de dados
* **Erro / Stack Trace:** BUG-C1 — Cidades com caracteres estranhos/acentos corrompidos nos dropdowns
* **Contexto:** Após popular o banco com `npm run prisma:seed`, as cidades do Maranhão apareciam com encoding errado (ex: `SÃ£o LuÃ­s` em vez de `São Luís`).
* **Causa Raiz:** O container PostgreSQL foi criado com collation diferente de `pt_BR.UTF-8`. O seed insere as strings em UTF-8 correto, mas o banco armazena/retorna interpretando diferente.
* **Solução Aplicada (definitiva):**
  ```powershell
  # 1. Parar e remover o container com seus dados
  docker-compose down -v

  # 2. Editar docker-compose.yml — adicionar em environment do postgres:
  #    POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"

  # 3. Subir novamente
  docker-compose up -d

  # 4. Aplicar migrations e seed
  cd backend
  npx prisma migrate deploy
  npm run prisma:seed
  ```
* **Prevenção Futura:** Configurar `POSTGRES_INITDB_ARGS` no `docker-compose.yml` desde o início.

---

* **Data:** 13/03/2026
* **Módulo/Arquivo afetado:** `backend/prisma/seed-test.ts`
* **Erro / Stack Trace:** `⚠️ Nenhuma turma encontrada para criar matrícula e frequências.`
* **Contexto:** Ao rodar `npm run seed:test` antes de criar qualquer turma no sistema.
* **Causa Raiz:** O seed de teste tenta criar matrícula do aluno em uma turma existente, mas o banco ainda não tem turmas.
* **Solução Aplicada:** Criar uma turma no sistema, depois rodar `npm run seed:test` novamente — a matrícula e frequências serão criadas automaticamente.
* **Prevenção Futura:** Documentar a ordem correta: `prisma:seed` → criar turma → `seed:test`.

---

* **Data:** 13/03/2026
* **Módulo/Arquivo afetado:** `frontend/components/admin/Header.tsx`
* **Erro / Stack Trace:** BUG-UI — Nome do admin no header não atualiza após salvar em Configurações → Meu Perfil
* **Contexto:** Ao mudar o nome do administrador em Configurações e salvar, o Header continuava exibindo o nome antigo até recarregar a página.
* **Causa Raiz:** O `Header.tsx` lê `localStorage.user` apenas no mount (sem re-render). A página de configurações atualizava o estado interno mas não propaga para o Header.
* **Solução Aplicada:**
  - `configuracoes/page.tsx`: após salvar com sucesso, atualiza `localStorage.user` e dispara `window.dispatchEvent(new Event('userUpdated'))`
  - `Header.tsx`: listener `window.addEventListener('userUpdated', ...)` adicionado no `useEffect` para re-ler o localStorage
* **Prevenção Futura:** Para comunicação entre componentes sem estado compartilhado (configurações → header/sidebar), usar Custom Events ou Zustand store.

---

---

* **Data:** 16/03/2026
* **Módulo/Arquivo afetado:** `enrollments.module.ts` + `classes.module.ts`
* **Erro / Stack Trace:** `Nest can't resolve dependencies of the EnrollmentsService (?). Please make sure that the argument NotificationsGateway at index [1] is available in the EnrollmentsModule context.`
* **Contexto:** Após implementação do Sprint Final (Socket.io), o backend não subia porque EnrollmentsService e ClassesService injetavam NotificationsGateway mas seus módulos não declaravam NotificationsModule.
* **Causa Raiz:** NestJS requer que qualquer serviço injetado esteja disponível no contexto do módulo consumidor. @Global() garante que o token existe globalmente, mas o módulo ainda precisa declarar a dependência explicitamente.
* **Solução Aplicada:**
  - `enrollments.module.ts`: adicionado `NotificationsModule` ao array `imports`
  - `classes.module.ts`: adicionado `NotificationsModule` ao array `imports`
* **Prevenção Futura:** Sempre que um Service recebe injeção de dependência de outro módulo, verificar se o módulo pai declara o módulo externo em `imports[]`. Regra documentada em `02_LIVRO_DE_REGRAS.md` Seção 8.

---

* **Data:** 16/03/2026
* **Módulo/Arquivo afetado:** `acoes.module.ts`
* **Erro / Stack Trace:** Warning de import não utilizado / inconsistência de módulo
* **Contexto:** `acoes.module.ts` importava `SettingsModule` no topo do arquivo mas não o declarava no array `imports: [PrismaModule]`.
* **Causa Raiz:** `SettingsModule` é `@Global()` então o `SettingsService` funciona via DI global sem precisar ser declarado no módulo consumidor. O import era código morto que gerava confusão.
* **Solução Aplicada:** Removida a linha `import { SettingsModule }` de `acoes.module.ts`.
* **Prevenção Futura:** Módulos `@Global()` (SettingsModule, NotificationsModule) não precisam ser declarados em `imports[]` de outros módulos para funcionar. Nunca deixar imports TypeScript sem uso.

---

* **Data:** 16/03/2026
* **Módulo/Arquivo afetado:** `backend/src/auth/auth.service.ts` — método `login()`
* **Erro / Stack Trace:** Login retorna `undefined`. Frontend recebe resposta vazia. Nenhum erro no console do backend, nenhum erro de TypeScript.
* **Contexto:** O método `login()` montava o objeto `response` com tokens e dados do usuário mas não tinha `return response` no final do fluxo normal (sem 2FA).
* **Causa Raiz:** TypeScript não exige `return` explícito em funções `async` que retornam `Promise<any>`. O compilador aceita retorno implícito de `undefined` como válido.
* **Solução Aplicada:** Adicionado `return response;` após o bloco `if (studentData)`.
* **Prevenção Futura:** SEMPRE ter `return` explícito em métodos de serviço que montam objetos de resposta. Documentado em `02_LIVRO_DE_REGRAS.md` Seção 10.

---

* **Data:** 16/03/2026
* **Módulo/Arquivo afetado:** `frontend/app/teacher/reembolsos/page.tsx`
* **Erro / Stack Trace:** `POST /api/reimbursements` retorna HTTP 400 Bad Request. Nenhuma mensagem de erro visível ao usuário.
* **Contexto:** O formulário enviava `category: 'ALIMENTACAO'` mas o backend esperava `type: ReimbursementType` com valores como `FOOD`, `CLASSROOM_MATERIAL`.
* **Causa Raiz:** O frontend foi criado com valores convenientes em português sem verificar o enum real no backend.
* **Solução Aplicada:**
  - Array `TIPOS` reescrito com valores do enum do backend
  - Campo `category: tipo` substituído por `type: tipo` no POST
  - Exibição no histórico atualizada para `r.type`
* **Prevenção Futura:** Sempre consultar o DTO do backend antes de criar formulários. Documentado em `02_LIVRO_DE_REGRAS.md` Seção 11.

---

* **Data:** 16/03/2026
* **Módulo/Arquivo afetado:** `frontend/app/login/page.tsx` linha 30
* **Erro / Stack Trace:** Professores fazem login e recebem 404. Tela branca.
* **Contexto:** O redirect após login para role TEACHER apontava para `/professor/dashboard`, rota que nunca existiu. O portal do professor foi criado em `/teacher/` no Sprint 4.
* **Causa Raiz:** Rota criada no Sprint 4 usou convenção `/teacher/` mas o login page nunca foi atualizado.
* **Solução Aplicada:** `router.push('/professor/dashboard')` → `router.push('/teacher/dashboard')`
* **Prevenção Futura:** Ao criar novo portal/rota, verificar todos os pontos que referenciam o role e a URL correspondente.

---

* **Data:** 16/03/2026
* **Módulo/Arquivo afetado:** `enrollments.controller.ts` linha 149 + `certificate.controller.ts` linhas 42 e 52
* **Erro / Stack Trace:** Aluno não vê suas inscrições. Certificado emitido sem `issuedBy`. Aluno não vê seus certificados.
* **Contexto:** 3 endpoints usavam `req.user.sub` mas `JwtStrategy.validate()` retorna o campo `id`, não `sub`.
* **Causa Raiz:** O payload do JWT tem `sub` (padrão JWT). Mas após validação pelo Guard, o objeto `req.user` é o retorno de `validate()` que usa `id`. Os dois campos existem em lugares diferentes.
* **Solução Aplicada:** 3 ocorrências de `req.user.sub` → `req.user.id` nos 3 controllers.
* **Prevenção Futura:** Nos controllers NestJS, usar SEMPRE `req.user.id`. O campo `sub` existe no token JWT mas não no objeto req.user. Documentado em `02_LIVRO_DE_REGRAS.md` Seção 10.

---

## Erros Conhecidos Não Resolvidos (Monitoramento)

| # | Data | Módulo | Descrição | Status |
|---|------|--------|-----------|--------|
| BUG-C1 | 13/03/2026 | PostgreSQL | Encoding cidades com acentos | ✅ RESOLVIDO em Sprint 0 |
| MinIO | 13/03/2026 | ReimbursementModule | Upload sem MinIO configurado | ✅ RESOLVIDO em Sprint 0 |
| PDF-TPL | 13/03/2026 | ReportsModule | Templates provisórios | ✅ RESOLVIDO em Sprint 3 |
| BUG-CERT | 13/03/2026 | Certificados | Alert genérico sem detalhes | ✅ RESOLVIDO |
| BUG-WS-01 | 16/03/2026 | EnrollmentsModule | NotificationsModule não declarado | ✅ RESOLVIDO |
| BUG-WS-02 | 16/03/2026 | ClassesModule | NotificationsModule não declarado | ✅ RESOLVIDO |
| BUG-AUTH | 16/03/2026 | auth.service.ts | login() sem return | ✅ RESOLVIDO |
| BUG-REIMB | 16/03/2026 | teacher/reembolsos | category vs type + enum errado | ✅ RESOLVIDO |
| BUG-REDIRECT | 16/03/2026 | login/page.tsx | Professor redirected to /professor/dashboard | ✅ RESOLVIDO |
| BUG-SUB | 16/03/2026 | enrollments + certificates | req.user.sub → req.user.id em 3 endpoints | ✅ RESOLVIDO |
