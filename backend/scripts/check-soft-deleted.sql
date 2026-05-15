SELECT id, nome, "codigoInterno", active, "quantidadeAtual", "createdAt"
FROM stock_items
ORDER BY "createdAt" DESC
LIMIT 10;
