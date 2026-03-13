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

## Erros Conhecidos Não Resolvidos (Monitoramento)

| # | Data | Módulo | Descrição | Status |
|---|------|--------|-----------|--------|
| BUG-C1 | 13/03/2026 | PostgreSQL | Encoding de cidades com acentos corrompidos | ⚠️ Requer recriar banco com UTF-8 collation |
| MinIO | 13/03/2026 | ReimbursementModule | Upload de comprovantes bloqueado | ⚠️ Requer servidor MinIO configurado |
| PDF-TPL | 13/03/2026 | ReportsModule | Templates HTML provisórios | ⏳ Aguardando modelo visual do Robert |
