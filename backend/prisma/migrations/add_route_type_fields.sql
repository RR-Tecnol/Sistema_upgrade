-- ============================================================
-- MIGRATION: Tipos de Rota (Intercidade / Intraurbana)
-- REQ-ROUTE-2026
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS).
-- Zero campos obrigatórios — não quebra registros existentes.
-- Default INTERCIDADE preserva o comportamento atual.
-- ============================================================

-- ── Tabela: classes ─────────────────────────────────────────
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS "routeType"               TEXT    NOT NULL DEFAULT 'INTERCIDADE',
  ADD COLUMN IF NOT EXISTS "originCityId"            UUID    REFERENCES cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "originNeighborhood"      TEXT,
  ADD COLUMN IF NOT EXISTS "destinationNeighborhood" TEXT;

CREATE INDEX IF NOT EXISTS idx_classes_origin_city_id ON classes("originCityId");
CREATE INDEX IF NOT EXISTS idx_classes_route_type     ON classes("routeType");

-- ── Tabela: acoes ────────────────────────────────────────────
ALTER TABLE acoes
  ADD COLUMN IF NOT EXISTS "routeType"               TEXT    NOT NULL DEFAULT 'INTERCIDADE',
  ADD COLUMN IF NOT EXISTS "originCidadeId"          UUID    REFERENCES cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "originNeighborhood"      TEXT,
  ADD COLUMN IF NOT EXISTS "destinationNeighborhood" TEXT;

CREATE INDEX IF NOT EXISTS idx_acoes_origin_cidade_id ON acoes("originCidadeId");
CREATE INDEX IF NOT EXISTS idx_acoes_route_type        ON acoes("routeType");
