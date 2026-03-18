# 📦 SETUP — Guia de Instalação e Operação
## Sistema Upgrade | RR TECNOL | v3.0 | 18/03/2026

> Leia este arquivo quando for instalar o sistema em uma nova máquina ou reiniciar do zero.

---

## ✅ Pré-requisitos

| Ferramenta | Versão mínima | Link |
|-----------|---------------|------|
| Node.js | 18.x ou superior | https://nodejs.org/ |
| Docker Desktop | Qualquer versão recente | https://www.docker.com/ |
| Git | Qualquer versão | https://git-scm.com/ |
| npm | Incluído com Node.js | — |

---

## 🚀 Instalação — Primeira Vez

```powershell
# 1. Clone o repositório
git clone https://github.com/RR-Tecnol/Sistema_upgrade.git
cd Sistema_upgrade

# 2. Suba o banco de dados com Docker
docker-compose up -d
# Aguarde ver os 3 containers rodando:
# ✔ Container cursos-postgres  Started
# ✔ Container cursos-redis     Started  
# ✔ Container cursos-minio     Started

# 3. Configure e inicialize o Backend
cd backend
npm install
npx prisma generate          # OBRIGATÓRIO sempre
npx prisma migrate deploy    # Cria todas as tabelas
npm run prisma:seed          # Dados iniciais (Admin + MA + PI + AC)

# 4. Dados de teste (opcional mas recomendado)
npm run seed:test
# Cria: aluno@qualifica.com + Prof. Carlos Mendes + 3 reembolsos de teste
# ⚠️ Matrícula + frequências só são criadas se já houver uma turma criada

# 5. Inicie o Backend (porta 3001 — definida em backend/.env PORT=3001)
npm run start:dev

# 6. Abra outro terminal e inicie o Frontend (porta 3000)
cd ../frontend
npm install
npm run dev
```

**Saída esperada do seed:**
```
🌱 Starting database seeding...
✅ Groups created (MA + PI + AC)
✅ Cities created (30+ cidades)
✅ Courses created (8 cursos)
✅ Admin user created: admin@qualifica.com / admin123
🎉 Database seeding completed successfully!
```

> ⚠️ `ERROR [MinioService] S3Error signature mismatch` no startup é **ESPERADO** quando MinIO não está configurado. Não afeta nenhum módulo exceto upload de comprovantes.

---

## 🌐 URLs do Sistema

| URL | Descrição |
|-----|-----------|
| **http://localhost:3000** | **Sistema Principal** |
| http://localhost:3001/api/docs | Swagger API Docs |
| http://localhost:5555 | Prisma Studio (`npx prisma studio` no backend/) |
| http://localhost:9001 | MinIO Console (minioadmin / minioadmin123) |

---

## 🔑 Credenciais de Acesso

| Perfil | Email | Senha | Portal |
|--------|-------|-------|--------|
| **Administrador** | `admin@qualifica.com` | `admin123` | `/admin/dashboard` |
| **Aluno (teste)** | `aluno@qualifica.com` | `aluno123` | `/student/dashboard` |
| **Professor** | (criado via painel admin) | (definida no cadastro) | `/teacher/dashboard` |
| **Motorista** | (criado via painel admin) | (definida no cadastro) | `/driver/dashboard` |

> ⚠️ **Remover credenciais visíveis da tela de login antes do deploy em produção!**

---

## 🔄 Reiniciar do Zero (recriar banco)

```powershell
cd backend
# ATENÇÃO: APAGA TODOS OS DADOS!
npx prisma migrate reset --force
npm run prisma:seed
npm run seed:test
```

---

## 🐛 Problemas Comuns

### ❌ "Cannot connect to database"
```powershell
docker ps                  # Verificar se postgres está rodando
docker-compose up -d       # Subir se não estiver
```
Verificar `backend/.env`:
```
DATABASE_URL="postgresql://cursos_user:cursos_password@localhost:5432/cursos_db?schema=public"
```

### ❌ "Port 3001 already in use"
```powershell
netstat -ano | findstr :3001
taskkill /F /PID <PID_ENCONTRADO>
# Ou matar todos os nodes:
Get-Process -Name node | Stop-Process -Force
```

### ❌ Lints TypeScript no VS Code (holiday, reimbursement, reports)
São falsos positivos — o código compila corretamente:
```powershell
cd backend && npx prisma generate
# VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### ❌ Cidades com acentos corrompidos (São Luís → SÃ£o LuÃ­s)
BUG-DB-01 — problema de collation:
```powershell
# Adicionar em docker-compose.yml → postgres → environment:
# POSTGRES_INITDB_ARGS: "--locale=pt_BR.UTF-8 --encoding=UTF8"
docker-compose down -v   # APAGA DADOS → recriar banco depois
docker-compose up -d
cd backend && npx prisma migrate deploy && npm run prisma:seed
```

### ❌ "Error ao emitir certificado"
O aluno precisa:
1. Matrícula com status `ENROLLED`
2. Frequência ≥ 75%
3. Turma com status `COMPLETED`

Para criar o cenário de teste: criar turma → `npm run seed:test`

---

## 💻 Workflow de Desenvolvimento

### Após alterar schema Prisma:
```powershell
cd backend
npx prisma generate
npx prisma migrate dev --name nome_da_migration
```

### Ver dados no banco visualmente:
```powershell
cd backend && npx prisma studio  # → http://localhost:5555
```

### Configurar MinIO (.env do backend):
```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET_REIMBURSEMENT=reimbursements
MINIO_BUCKET_CERTIFICATES=certificates
MINIO_BUCKET_REPORTS=reports
```

### Scripts disponíveis:
| Script | Comando | Uso |
|--------|---------|-----|
| Backend dev | `npm run start:dev` | Desenvolvimento com hot-reload (porta 3001 via .env) |
| Backend prod | `npm run build && npm start` | Produção |
| Frontend dev | `npm run dev` | Desenvolvimento |
| Frontend prod | `npm run build && npm start` | Produção |
| Seed base | `npm run prisma:seed` | Dados iniciais |
| Seed teste | `npm run seed:test` | Dados de teste |
| TypeScript check | `npx tsc --noEmit` | Validar sem compilar |

---

## 📚 Recursos Úteis

- [NestJS Docs](https://docs.nestjs.com/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Next.js Docs](https://nextjs.org/docs)
- [Swagger UI](http://localhost:3001/api/docs) — após subir o backend

---

*Sistema Upgrade | RR TECNOL | 18/03/2026 | Consolidado de: SETUP.md (original) + 03_DIARIO_DE_BORDO.md (sessão 16/03 — Error Boundaries + credenciais confirmadas)*
