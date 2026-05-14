# Dados — Prisma, migrations e seeds

## Schema

- Ficheiro único principal: `backend/prisma/schema.prisma`
- Contém modelos, enums (`UserRole`, tipos de certificado, estados de viagem, etc.) e relações.

## Migrations

- Pasta: `backend/prisma/migrations/`
- Histórico versionado em SQL (Prisma migrate).
- Comandos típicos:
  - `npx prisma migrate deploy` — aplica migrations pendentes (CI / produção / dev alinhado)
  - `npx prisma migrate dev` — cria nova migration em desenvolvimento

## Seeds e scripts (fonte: `backend/package.json`)

| Script npm | Ficheiro / comportamento |
|------------|---------------------------|
| `npm run prisma:seed` | `npx tsx prisma/seed-desenvolvimento/seed-full.ts` |
| `npm run seed:extra` | Idem `seed-full.ts` (alias) |
| `npm run seed:full` | Idem |
| `npm run seed:refresh-drivers` | `seed-full.ts --refresh-drivers` |
| `npm run seed:prod` | `prisma/seed-prod.ts` |
| `npm run reset:prod` | `prisma/reset-db.ts` (perigoso em produção — só com consciência do que o script faz) |

Há ainda scripts pontuais em `backend/prisma/` (ex.: `seed-absences-joao.ts`) para cenários específicos de desenvolvimento; **não** substituem o seed principal.

## Prisma Client

- `npx prisma generate` após alterações ao schema ou ao pull de migrations novas.

## Documentação complementar

- Guia detalhado de seeds, credenciais de teste e padrões idempotentes: [../SEEDS_GUIDE.md](../SEEDS_GUIDE.md)
