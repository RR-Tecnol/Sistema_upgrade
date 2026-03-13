# 📦 Guia de Instalação — Sistema UPGRADE

> **Para o chefe/novo desenvolvedor:** Siga este guia passo a passo para instalar e subir o sistema na sua máquina.

---

## ✅ Pré-requisitos

Instale antes de começar:

| Ferramenta | Versão mínima | Link |
|-----------|---------------|------|
| Node.js | 18.x ou superior | https://nodejs.org/ |
| Docker Desktop | Qualquer versão recente | https://www.docker.com/ |
| Git | Qualquer versão | https://git-scm.com/ |
| npm | Incluído com Node.js | — |

---

## 🚀 Instalação Passo a Passo

### Passo 1 — Clone o repositório

```powershell
git clone https://github.com/RR-Tecnol/Sistema_upgrade.git
cd Sistema_upgrade
```

---

### Passo 2 — Suba o banco de dados com Docker

```powershell
docker-compose up -d
```

Aguarde até ver os 3 containers rodando:
```
✔ Container cursos-postgres  Started
✔ Container cursos-redis     Started
✔ Container cursos-minio     Started
```

Verifique:
```powershell
docker ps
```

---

### Passo 3 — Configure o Backend

```powershell
cd backend

# 3.1 — Instalar dependências
npm install

# 3.2 — Gerar o Prisma Client (obrigatório sempre)
npx prisma generate

# 3.3 — Aplicar migrations (cria todas as tabelas no banco)
npx prisma migrate deploy

# 3.4 — Popular o banco com dados iniciais
npm run prisma:seed
```

**Saída esperada do seed:**
```
🌱 Starting database seeding...
✅ Groups created
✅ Cities created
✅ Courses created
✅ Admin user created
   Email: admin@qualifica.com
   Password: admin123
🎉 Database seeding completed successfully!
```

---

### Passo 4 — Dados de Teste (opcional mas recomendado)

```powershell
# Ainda dentro de backend/
npm run seed:test
```

Cria:
- Aluno `aluno@qualifica.com` para testar certificados
- Prof. Carlos Mendes (funcionário de teste)
- 3 reembolsos: um PENDENTE, um APROVADO, um REJEITADO

---

### Passo 5 — Inicie o Backend

**Windows PowerShell:**
```powershell
$env:PORT=3002; npm run start:dev
```

**Linux/Mac:**
```bash
PORT=3002 npm run start:dev
```

Saída esperada:
```
✅ Database connected successfully
🚀 Server running on http://localhost:3002
📚 API Docs available at http://localhost:3002/api/docs
```

> ⚠️ O erro `MinioService: S3Error signature mismatch` é **esperado e não afeta o sistema**. MinIO é usado apenas para upload de comprovantes de reembolso.

---

### Passo 6 — Inicie o Frontend (outro terminal)

```powershell
cd ../frontend

# Instalar dependências (apenas na primeira vez)
npm install

# Iniciar
npm run dev
```

Saída esperada:
```
▲ Next.js 14.x.x
✓ Ready in Xs
○ Local: http://localhost:3000
```

---

## 🌐 URLs do Sistema

| URL | Descrição |
|-----|-----------|
| **http://localhost:3000** | **Sistema Principal (abrir no navegador)** |
| http://localhost:3002/api/docs | Documentação Swagger da API |
| http://localhost:5555 | Prisma Studio (rodar: `npx prisma studio` no backend/) |
| http://localhost:9001 | MinIO Console (user: `minioadmin` / pass: `minioadmin123`) |

---

## 🔑 Credenciais de Acesso

| Perfil | Email | Senha |
|--------|-------|-------|
| **Administrador** | `admin@qualifica.com` | `admin123` |
| **Aluno (teste)** | `aluno@qualifica.com` | `aluno123` |

---

## 🔄 Como Reiniciar do Zero (se precisar recriar o banco)

```powershell
cd backend

# ATENÇÃO: apaga todos os dados!
npx prisma migrate reset --force

# Popular novamente
npm run prisma:seed
npm run seed:test
```

---

## 🐛 Problemas Comuns

### ❌ "Cannot connect to database"

```powershell
# Verificar se o Docker está rodando
docker ps

# Se não estiver, subir novamente
docker-compose up -d
```

Verificar `backend/.env`:
```
DATABASE_URL="postgresql://cursos_user:cursos_password@localhost:5432/cursos_db?schema=public"
```

---

### ❌ "Port 3002 already in use"

```powershell
# Windows — encontrar e matar o processo na porta 3002
netstat -ano | findstr :3002
taskkill /F /PID <PID_ENCONTRADO>

# Ou matar todos os nodes de uma vez
Get-Process -Name node | Stop-Process -Force
```

---

### ❌ Lints de TypeScript no VS Code (holiday, reimbursement, reports)

São falsos positivos causados pelo cache do TypeScript. Solução:

```powershell
cd backend
npx prisma generate
# Depois: Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

---

### ❌ "Error ao emitir certificado"

O aluno precisa:
1. Ter uma **matrícula** com status `ENROLLED`
2. Ter **frequência ≥ 75%**
3. A turma precisa ter status `COMPLETED`

Para criar o cenário de teste:
1. Crie uma turma no sistema
2. Rode `npm run seed:test` novamente — criará matrícula e frequências para o aluno de teste

---

### ❌ Cidades com caracteres estranhos (acentos)

BUG-C1 — problema de collation no PostgreSQL. Solução definitiva:
1. Recrie o container PostgreSQL com `LC_COLLATE='pt_BR.UTF-8'`
2. Rode `npx prisma migrate reset --force` + `npm run prisma:seed`

---

## 💻 Workflow de Desenvolvimento

### Após alterar o schema Prisma:

```powershell
cd backend
npx prisma generate
npx prisma migrate dev --name nome_da_migration
```

### Ver dados no banco visualmente:

```powershell
cd backend
npx prisma studio
# Acesse: http://localhost:5555
```

### Ver logs do Docker:

```powershell
docker-compose logs -f
docker-compose logs -f postgres
```

---

## 📚 Recursos Úteis

- [NestJS Docs](https://docs.nestjs.com/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Next.js Docs](https://nextjs.org/docs)
- [Swagger UI](http://localhost:3002/api/docs) — após subir o backend
