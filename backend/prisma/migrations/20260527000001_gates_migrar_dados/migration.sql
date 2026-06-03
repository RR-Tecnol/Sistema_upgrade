-- Migration: Gates Paralelos — Etapa 2 (corrigida): Migrar dados para novos valores do enum
-- OP060_INSTALACOES_FINAIS é DELETADO (conteúdo absorvido por OP050 que já existe em cada OF)
-- OP070_GATE_LIBERACAO é RENOMEADO para OP060_GATE_LIBERACAO (sem duplicata, renomeação direta)

-- 2a. Deletar operações OP060_INSTALACOES_FINAIS (cada OF já tem OP050_MARCENARIA)
DELETE FROM "operacoes_producao"    WHERE operacao = 'OP060_INSTALACOES_FINAIS';

-- 2b. Deletar gates_qualidade vinculados ao OP060_INSTALACOES_FINAIS
DELETE FROM "gates_qualidade"       WHERE operacao = 'OP060_INSTALACOES_FINAIS';

-- 2c. Nas tabelas sem constraint única, migrar para OP050_MARCENARIA
UPDATE "ordem_fabricacao_bom_items" SET operacao = 'OP050_MARCENARIA'     WHERE operacao = 'OP060_INSTALACOES_FINAIS';
UPDATE "custos_of"                  SET operacao = 'OP050_MARCENARIA'     WHERE operacao = 'OP060_INSTALACOES_FINAIS';
UPDATE "funcionario_of_vinculos"    SET operacao = 'OP050_MARCENARIA'     WHERE operacao = 'OP060_INSTALACOES_FINAIS';

-- 3. Renomear OP070_GATE_LIBERACAO → OP060_GATE_LIBERACAO (safe: sem duplicata)
UPDATE "operacoes_producao"         SET operacao = 'OP060_GATE_LIBERACAO' WHERE operacao = 'OP070_GATE_LIBERACAO';
UPDATE "gates_qualidade"            SET operacao = 'OP060_GATE_LIBERACAO' WHERE operacao = 'OP070_GATE_LIBERACAO';
UPDATE "custos_of"                  SET operacao = 'OP060_GATE_LIBERACAO' WHERE operacao = 'OP070_GATE_LIBERACAO';
UPDATE "funcionario_of_vinculos"    SET operacao = 'OP060_GATE_LIBERACAO' WHERE operacao = 'OP070_GATE_LIBERACAO';
