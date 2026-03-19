# 👋 Onboarding — Sistema UPGRADE

> Guia para novos membros da equipe e colaboradores.
> Leia este arquivo primeiro antes de qualquer coisa.

---

## 🎯 O Que é Este Sistema?

O **Sistema UPGRADE** é uma plataforma web de gestão para os programas **Qualifica Maranhão** e **Qualifica Piauí** — cursos itinerantes de capacitação profissional operados em carretas/caminhões.

O sistema tem **4 portais** com perfis separados:

| Portal | Quem Usa | Rota |
|--------|----------|------|
| **Admin** | Gestores / Administradores | `/admin/dashboard` |
| **Professor** | Instrutores de campo | `/teacher/dashboard` |
| **Motorista** | Motoristas das carretas | `/driver/dashboard` |
| **Aluno** | Estudantes matriculados | `/student/dashboard` |

---

## ⚡ Setup em 5 Passos (Rápido)

```powershell
# 1. Clone e entre na pasta
git clone https://github.com/RR-Tecnol/Sistema_upgrade.git
cd Sistema_upgrade

# 2. Suba o banco (Docker)
docker-compose up -d

# 3. Configure o backend
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed

# 4. Seed de dados de teste
npm run seed:extra

# 5. Inicie os servidores (em terminais separados)
# Terminal 1 — Backend:
$env:PORT=3002; npm run start:dev

# Terminal 2 — Frontend:
cd ../frontend
npm install
npm run dev
```

✅ Acesse: **http://localhost:3000**

---

## 🔑 Credenciais Para Testar

| Perfil | Email | Senha |
|--------|-------|-------|
| **Admin** | `admin@qualifica.com` | `RR@@Upgrade` |
| **Professor** | `maria.professora.visual@qualifica.com` | `RR@@Upgrade` |
| **Motorista** | `joao.driver.test99@qualifica.com` | `RR@@Upgrade` |
| **Aluno** | `aluno@qualifica.com` | `RR@@Upgrade` |

> Todas as contas usam a **mesma senha**: `RR@@Upgrade`

---

## 🗺️ Tour pelo Sistema

### Portal Admin (`admin@qualifica.com`)

1. **Dashboard** — KPIs gerais do sistema
2. **Turmas** → clique em uma turma → veja Estatísticas
3. **Inscrições** — Kanban de aprovação de candidatos
4. **Frequência** — Selecione turma e registre presenças
5. **Certificados** — Emissão manual ou automática
6. **Relatórios** — Gráficos de inscrições por mês
7. **Minha Rota / Imprevistos** — Gestão de campo
8. **Histórico** — Auditoria de todas as ações
9. **Configurações** — Parâmetros do sistema

### Portal Professor (`maria.professora.visual@qualifica.com`)

1. **Dashboard** — Turmas do professor, próxima aula
2. **Frequência** — Registrar presença dos alunos
3. **Reembolsos** — Solicitar reembolso de despesas
4. **Certificados** — Ver certificados emitidos pela turma

### Portal Motorista (`joao.driver.test99@qualifica.com`)

1. **Dashboard** — Viagem em trânsito atual, botão "Cheguei"
2. **Minhas Viagens** — Histórico de viagens (Andamento / Planejadas / Concluídas)
3. **Manutenção** → clique em qualquer card para ver detalhes completos
4. **Reembolsos** — Solicitar reembolso de despesas de campo
5. **Imprevistos** — Registrar problemas na rota

### Portal Aluno (`aluno@qualifica.com`)

1. **Dashboard** — Frequência geral, matrícula ativa
2. **Minhas Turmas** — Turmas em que está matriculado
3. **Frequência** — Calendário de presenças e faltas
4. **Inscrições** — Status das candidaturas
5. **Certificados** — Certificados digitais com QR Code
6. **Meu Perfil** — Editar dados pessoais e foto

---

## 🧠 Para a IA (Claude / Gravity)

Se você é uma IA lendo este projeto para auxiliar o desenvolvimento, saiba:

### Padrão de Autenticação
- JWT com refresh token
- `Authorization: Bearer <token>` em todos os endpoints protegidos
- O frontend usa `lib/api/client.ts` centralizado

### Padrão Visual
- Título das páginas: `className="gradient-text"` + `fontFamily: 'Orbitron'`
- Cores primárias: `#FFD600` (amarelo), `#B89B00` (dourado)
- Cards e modais: `borderRadius: 14-20px`, `boxShadow` suave
- Animações: `className="animate-fade-in"` e `animate-scale-in`

### Padrão de Seeds
➡️ Veja [`docs/SEEDS_GUIDE.md`](./SEEDS_GUIDE.md) para o modelo completo de criação de seeds.

### Estrutura do Backend
- `src/{modulo}/{modulo}.module.ts` — módulo NestJS
- `src/{modulo}/{modulo}.controller.ts` — endpoints REST
- `src/{modulo}/{modulo}.service.ts` — lógica de negócio
- `prisma/schema.prisma` — fonte da verdade do banco

---

## ❓ Problemas Comuns

| Problema | Solução |
|----------|---------|
| Backend não conecta ao banco | `docker-compose up -d` e aguarde 10s |
| `Prisma Client not found` | `npx prisma generate` no diretório backend |
| Página em branco | Verifique se o frontend está em `localhost:3000` |
| Login inválido | Certifique-se de ter rodado `npm run prisma:seed` |
| Dados vazios nas telas | Rode `npm run seed:extra` |

---

> 💡 Para dúvidas sobre o projeto, consulte `docs/arquitetura/DIARIO_DE_BORDO.md`
