-- HARD DELETE pontual: remove APO-TI inativo (e dependências órfãs)
-- Apenas para destravar testes de desenvolvimento. Em produção, prefira REATIVAR.
BEGIN;

-- 1) Marcar quais ids vamos limpar
CREATE TEMP TABLE _to_remove AS
SELECT id FROM stock_items WHERE "codigoInterno" = 'APO-TI' AND active = false;

-- 2) Apagar dependências em ordem reversa de FK
DELETE FROM stock_movements WHERE "stockItemId" IN (SELECT id FROM _to_remove);

DELETE FROM contas_pagar WHERE id IN (
  SELECT "contaPagarId" FROM stock_purchase_requests
  WHERE "stockItemId" IN (SELECT id FROM _to_remove) AND "contaPagarId" IS NOT NULL
);

DELETE FROM stock_purchase_requests WHERE "stockItemId" IN (SELECT id FROM _to_remove);

DELETE FROM truck_stock_items WHERE "stockItemId" IN (SELECT id FROM _to_remove);

-- 3) Apagar os itens
DELETE FROM stock_items WHERE id IN (SELECT id FROM _to_remove);

-- 4) Verificar
SELECT 'APO-TI inativos restantes' AS info, COUNT(*) AS qty
FROM stock_items
WHERE "codigoInterno" = 'APO-TI' AND active = false;

DROP TABLE _to_remove;
COMMIT;
