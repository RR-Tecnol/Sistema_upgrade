#!/usr/bin/env bash
# Validação local equivalente ao que a VPS precisa após deploy (branch nuevo).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "════════════════════════════════════════════════════════════"
echo " VALIDAÇÃO DEPLOY VPS — $(date -Iseconds)"
echo "════════════════════════════════════════════════════════════"

echo ""
echo "▶ 1/8 Prisma validate + generate"
cd backend
npx prisma validate
npx prisma generate

echo ""
echo "▶ 2/8 Backend build"
npm run build

echo ""
echo "▶ 3/8 Motor letivo"
npm run motor:verify

echo ""
echo "▶ 4/8 Penalidade imprevisto + motorista (diária / próxima viagem)"
npm run penalty:verify

echo ""
echo "▶ 5/8 Abastecimento e despesa do período → Contas a pagar"
npm run acao-custo:verify

echo ""
echo "▶ 6/8 Manutenção de carreta → Contas a pagar"
npm run maintenance:verify

echo ""
echo "▶ 7/8 Frontend build"
cd ../frontend
npm run build

echo ""
echo "▶ 8/8 Migrations pendentes (dry-run list)"
cd ../backend
npx prisma migrate status || true

echo ""
echo "════════════════════════════════════════════════════════════"
echo " ✅ VALIDAÇÃO CONCLUÍDA — seguro para build/deploy na VPS"
echo "════════════════════════════════════════════════════════════"
