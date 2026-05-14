-- Diagnóstico do bug de duplicação no fluxo Estoque → ContaPagar
-- Mostra: últimos 5 itens, todas PRs, ContasPagar, movimentações REPOSICAO

\echo '=== ULTIMOS 5 ITENS ==='
SELECT id, nome, "quantidadeAtual", "precoUnitario", "createdAt"
FROM stock_items
ORDER BY "createdAt" DESC
LIMIT 5;

\echo ''
\echo '=== SOLICITACOES DE COMPRA (todas) ==='
SELECT id, "stockItemId", quantidade, "precoUnitario", "valorTotal", status, "createdAt"
FROM stock_purchase_requests
ORDER BY "createdAt" DESC
LIMIT 10;

\echo ''
\echo '=== CONTAS A PAGAR (estoque_reposicao) ==='
SELECT id, descricao, valor, status, "createdAt"
FROM contas_pagar
WHERE tipo_conta = 'estoque_reposicao'
ORDER BY "createdAt" DESC
LIMIT 10;

\echo ''
\echo '=== MOVIMENTACOES REPOSICAO ==='
SELECT m.id, m.type, m.quantidade, m."stockItemId", m."purchaseRequestId", m."createdAt", si.nome
FROM stock_movements m
LEFT JOIN stock_items si ON si.id = m."stockItemId"
WHERE m.type = 'REPOSICAO'
ORDER BY m."createdAt" DESC
LIMIT 10;

\echo ''
\echo '=== TODAS MOVIMENTACOES (últimas 15) ==='
SELECT m.id, m.type, m.quantidade, m."stockItemId", m."createdAt", si.nome
FROM stock_movements m
LEFT JOIN stock_items si ON si.id = m."stockItemId"
ORDER BY m."createdAt" DESC
LIMIT 15;
