# Guia de seeds — Sistema UPGRADE

Documentação operacional dos **dados de desenvolvimento**. Alinhado a `backend/package.json` e à pasta `backend/prisma/`.

---

## Ficheiro principal de desenvolvimento

| Caminho | Comando |
|---------|---------|
| `backend/prisma/seed-desenvolvimento/seed-full.ts` | `npm run prisma:seed` (também `seed:extra`, `seed:full`) |

**Refresh de dados de motoristas (argumento CLI):** `npm run seed:refresh-drivers`

## Outros scripts

| Comando | Ficheiro |
|---------|----------|
| `npm run seed:prod` | `backend/prisma/seed-prod.ts` |
| `npm run reset:prod` | `backend/prisma/reset-db.ts` — **destructivo**; só com consciência do que o script faz |

Scripts pontuais em `backend/prisma/` (ex.: `seed-absences-joao.ts`) são **auxiliares** para cenários específicos, não substituem o seed principal.

---

## Credenciais criadas pelo seed de desenvolvimento

Conforme README da raiz do repositório (sincronizar com o conteúdo atual do `seed-full.ts` se divergir):

| Perfil | Email | Senha |
|--------|-------|-------|
| Administrador | `admin@qualifica.com` | `RR@@Upgrade` |
| Professora | `maria.professora.visual@qualifica.com` | `RR@@Upgrade` |
| Motorista | `joao.driver.test99@qualifica.com` | `RR@@Upgrade` |
| Aluno | `aluno@qualifica.com` | `RR@@Upgrade` |

**Regra:** em scripts e testes, localizar utilizadores por **email** (único), não por `role` isolado, para evitar pegar o utilizador errado quando existir mais do que um com a mesma role.

---

## Como executar

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

Ou directamente:

```bash
npx tsx prisma/seed-desenvolvimento/seed-full.ts
```

---

## Padrão idempotente (modelo)

Cada bloco de seed deve poder correr várias vezes sem duplicar dados críticos: usar `findFirst` / `upsert` / contagens antes de `create`. Ver exemplos dentro do próprio `seed-full.ts`.

---

## Campos que costumam gerar erro

Resumo útil (detalhe no schema Prisma):

- **Trip:** usar campos reais do modelo (ex.: `kmStart`, `kmEnd`); não inventar `distanceKm` se não existir no schema.
- **Notification:** metadados em JSON no campo `data` (ex.: `{ link: '...' }`), não um campo `link` solto se o modelo não tiver.
- **Reimbursement:** tipo de despesa no campo previsto pelo schema (ex.: `type`), não `category` genérico sem correspondência.
- **Truck.type:** valores do enum definidos no Prisma (ex.: `STANDARD`, `MULTICOURSE`).

---

## Referência cruzada

- Modelo de dados e migrations: [`sistema-atual/05-dados-prisma-migracoes-seeds.md`](./sistema-atual/05-dados-prisma-migracoes-seeds.md)
- Ambiente local: [`sistema-atual/02-ambiente-e-execucao-local.md`](./sistema-atual/02-ambiente-e-execucao-local.md)
