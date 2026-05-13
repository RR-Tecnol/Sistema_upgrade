-- Seed das 8 categorias default (espelham o enum StockItemCategory)
-- Idempotente: ON CONFLICT DO NOTHING para que reexecutar não duplique.
INSERT INTO stock_categories (id, nome, slug, icon, color, description, "isDefault", "defaultEnum", active, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'Consumível',   'consumivel',   '📦', '#0891B2', 'Material consumível genérico',         true, 'CONSUMIVEL'::"StockItemCategory",  true, NOW(), NOW()),
  (gen_random_uuid(), 'Didático',     'didatico',     '📘', '#7C3AED', 'Material didático (apostilas, cadernos)', true, 'DIDATICO'::"StockItemCategory",   true, NOW(), NOW()),
  (gen_random_uuid(), 'Limpeza',      'limpeza',      '🧴', '#10B981', 'Material de limpeza',                  true, 'LIMPEZA'::"StockItemCategory",    true, NOW(), NOW()),
  (gen_random_uuid(), 'Equipamento',  'equipamento',  '🔧', '#F59E0B', 'Equipamentos / ferramentas',           true, 'EQUIPAMENTO'::"StockItemCategory",true, NOW(), NOW()),
  (gen_random_uuid(), 'EPI',          'epi',          '🦺', '#DC2626', 'Equipamento de proteção individual',   true, 'EPI'::"StockItemCategory",        true, NOW(), NOW()),
  (gen_random_uuid(), 'Alimentação',  'alimentacao',  '🍱', '#EA580C', 'Alimentação / lanches',                true, 'ALIMENTACAO'::"StockItemCategory",true, NOW(), NOW()),
  (gen_random_uuid(), 'Escritório',   'escritorio',   '✏️', '#3B82F6', 'Material de escritório',               true, 'ESCRITORIO'::"StockItemCategory", true, NOW(), NOW()),
  (gen_random_uuid(), 'Outro',        'outro',        '❔', '#6B7280', 'Outros materiais não classificados',   true, 'OUTRO'::"StockItemCategory",      true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

SELECT id, nome, slug, icon, color, "isDefault", "defaultEnum", active FROM stock_categories ORDER BY "isDefault" DESC, nome ASC;
