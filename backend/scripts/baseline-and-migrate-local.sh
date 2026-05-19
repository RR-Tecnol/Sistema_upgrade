#!/usr/bin/env bash
# Baseline para Postgres legado (schema já existe, sem _prisma_migrations).
# 1) Cria tabela de histórico se faltar
# 2) Aplica SQL incremental seguro (IF NOT EXISTS)
# 3) Marca todas as migrations do repo como aplicadas
# 4) Confirma com migrate deploy / status

set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Prisma generate"
npx prisma generate

echo "==> Criar _prisma_migrations se não existir"
npx tsx scripts/ensure-prisma-migrations-table.ts

PENDING_SQL=(
  "prisma/migrations/20260518120000_mel07_checkout_at/migration.sql"
  "prisma/migrations/20260519130000_acao_driver_departure_date/migration.sql"
  "prisma/migrations/20260519180000_acao_teaching_motor/migration.sql"
  "prisma/migrations/20260520120000_deactivate_orphan_purchase_requests/migration.sql"
  "prisma/migrations/20260520140000_truck_stock_quantidade_minima/migration.sql"
)

for f in "${PENDING_SQL[@]}"; do
  if [[ -f "$f" ]]; then
    echo "==> db execute: $f"
    npx prisma db execute --file "$f" || true
  fi
done

echo "==> Baseline: marcar migrations como aplicadas"
for dir in prisma/migrations/*/; do
  name="$(basename "$dir")"
  if npx prisma migrate resolve --applied "$name" 2>/dev/null; then
    echo "  resolved: $name"
  else
    echo "  skip (já aplicada): $name"
  fi
done

echo "==> migrate deploy (deve estar em dia)"
npx prisma migrate deploy

echo "==> migrate status"
npx prisma migrate status

echo "==> OK: baseline concluído"
