-- Migration: Gates Paralelos — Reestruturação do fluxo de fabricação
-- Etapa 1: Adicionar novos valores ao enum (deve ser feito antes do uso)
-- PostgreSQL exige que ADD VALUE seja committed antes de usar os novos valores

ALTER TYPE "OperacaoRoteiro" ADD VALUE IF NOT EXISTS 'OP025_ELETRICA_AUTOMOTIVA' AFTER 'OP020_SERRALHERIA';
ALTER TYPE "OperacaoRoteiro" ADD VALUE IF NOT EXISTS 'OP060_GATE_LIBERACAO' AFTER 'OP050_MARCENARIA';
