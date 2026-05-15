-- Reset do item de teste "Apostila TI" para testar o novo fluxo coerente
BEGIN;
DELETE FROM stock_movements WHERE "stockItemId" IN (SELECT id FROM stock_items WHERE nome = 'Apostila TI');
DELETE FROM stock_purchase_requests WHERE "stockItemId" IN (SELECT id FROM stock_items WHERE nome = 'Apostila TI');
DELETE FROM contas_pagar WHERE descricao LIKE '%Apostila TI%';
UPDATE stock_items SET "quantidadeAtual" = 0, "quantidadeEmTransito" = 0 WHERE nome = 'Apostila TI';
SELECT id, nome, "quantidadeAtual", "quantidadeEmTransito" FROM stock_items WHERE nome = 'Apostila TI';
COMMIT;
