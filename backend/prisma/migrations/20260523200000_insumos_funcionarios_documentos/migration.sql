-- Enums
CREATE TYPE "CategoriaInsumoFabricacao" AS ENUM (
  'ALUMINIO_CHAPA','ALUMINIO_PERFIL','MADEIRA_MDF_NAVAL','MADEIRA_COMPENSADO',
  'ELETRICA_FIOS_CABOS','ELETRICA_COMPONENTES','HIDRAULICA','ACABAMENTO_PISO',
  'ACABAMENTO_TINTA','FERRAGEM_GERAL','EQUIPAMENTO_AC','EQUIPAMENTO_ILUMINACAO',
  'ADESIVAGEM','OUTRO'
);
CREATE TYPE "TipoMovimentoInsumo" AS ENUM ('ENTRADA','SAIDA','AJUSTE');
CREATE TYPE "TipoFornecedorOf" AS ENUM (
  'SERRALHEIRO','MARCENEIRO','ELETRICISTA','HIDRAULICO',
  'ADESIVAGEM','FORNECEDOR_MATERIAL','PORTEIRA_FECHADA','OUTRO'
);
CREATE TYPE "TipoCustoOf" AS ENUM (
  'MATERIAL','MAO_DE_OBRA','PORTEIRA_FECHADA','EQUIPAMENTO','FRETE','DESPESA_GERAL'
);

-- InsumoFabricacao
CREATE TABLE "insumos_fabricacao" (
    "id"               TEXT NOT NULL,
    "nome"             TEXT NOT NULL,
    "codigoInterno"    TEXT,
    "categoria"        "CategoriaInsumoFabricacao" NOT NULL,
    "unidade"          TEXT NOT NULL,
    "quantidadeAtual"  DECIMAL(12,3) NOT NULL DEFAULT 0,
    "quantidadeMinima" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "precoUnitario"    DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fornecedorPadrao" TEXT,
    "observacoes"      TEXT,
    "active"           BOOLEAN NOT NULL DEFAULT true,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "insumos_fabricacao_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "insumos_fabricacao_codigoInterno_key" ON "insumos_fabricacao"("codigoInterno");

-- MovimentoInsumo
CREATE TABLE "movimentos_insumo" (
    "id"            TEXT NOT NULL,
    "insumoId"      TEXT NOT NULL,
    "ordemId"       TEXT,
    "tipo"          "TipoMovimentoInsumo" NOT NULL,
    "quantidade"    DECIMAL(12,3) NOT NULL,
    "precoUnitario" DECIMAL(12,2) NOT NULL,
    "valorTotal"    DECIMAL(12,2) NOT NULL,
    "registradoPor" TEXT NOT NULL,
    "observacoes"   TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "movimentos_insumo_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "movimentos_insumo" ADD CONSTRAINT "movimentos_insumo_insumoId_fkey"
    FOREIGN KEY ("insumoId") REFERENCES "insumos_fabricacao"("id") ON DELETE RESTRICT;
ALTER TABLE "movimentos_insumo" ADD CONSTRAINT "movimentos_insumo_ordemId_fkey"
    FOREIGN KEY ("ordemId") REFERENCES "ordens_fabricacao"("id") ON DELETE SET NULL;
ALTER TABLE "movimentos_insumo" ADD CONSTRAINT "movimentos_insumo_registradoPor_fkey"
    FOREIGN KEY ("registradoPor") REFERENCES "users"("id") ON DELETE RESTRICT;

-- FuncionarioProducao
CREATE TABLE "funcionarios_producao" (
    "id"          TEXT NOT NULL,
    "nome"        TEXT NOT NULL,
    "cpf"         TEXT,
    "funcao"      TEXT NOT NULL,
    "telefone"    TEXT,
    "pix"         TEXT,
    "valorDiaria" DECIMAL(12,2),
    "active"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "funcionarios_producao_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "funcionarios_producao_cpf_key" ON "funcionarios_producao"("cpf");

-- FuncionarioOfVinculo
CREATE TABLE "funcionario_of_vinculos" (
    "id"              TEXT NOT NULL,
    "ordemId"         TEXT NOT NULL,
    "funcionarioId"   TEXT NOT NULL,
    "operacao"        "OperacaoRoteiro",
    "diasTrabalhados" INTEGER NOT NULL DEFAULT 0,
    "valorDiaria"     DECIMAL(12,2) NOT NULL,
    "valorTotal"      DECIMAL(12,2) NOT NULL,
    "dataInicio"      TIMESTAMP(3),
    "dataFim"         TIMESTAMP(3),
    "observacoes"     TEXT,
    "contaPagarId"    TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "funcionario_of_vinculos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "funcionario_of_vinculos_contaPagarId_key" ON "funcionario_of_vinculos"("contaPagarId");
ALTER TABLE "funcionario_of_vinculos" ADD CONSTRAINT "funcionario_of_vinculos_ordemId_fkey"
    FOREIGN KEY ("ordemId") REFERENCES "ordens_fabricacao"("id") ON DELETE CASCADE;
ALTER TABLE "funcionario_of_vinculos" ADD CONSTRAINT "funcionario_of_vinculos_funcionarioId_fkey"
    FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios_producao"("id") ON DELETE RESTRICT;
ALTER TABLE "funcionario_of_vinculos" ADD CONSTRAINT "funcionario_of_vinculos_contaPagarId_fkey"
    FOREIGN KEY ("contaPagarId") REFERENCES "contas_pagar"("id") ON DELETE SET NULL;

-- FornecedorOf
CREATE TABLE "fornecedores_of" (
    "id"               TEXT NOT NULL,
    "ordemId"          TEXT NOT NULL,
    "nome"             TEXT NOT NULL,
    "cpfCnpj"          TEXT,
    "telefone"         TEXT,
    "tipo"             "TipoFornecedorOf" NOT NULL,
    "descricaoServico" TEXT NOT NULL,
    "valorContratado"  DECIMAL(12,2) NOT NULL,
    "valorPago"        DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dataContrato"     TIMESTAMP(3),
    "observacoes"      TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fornecedores_of_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "fornecedores_of" ADD CONSTRAINT "fornecedores_of_ordemId_fkey"
    FOREIGN KEY ("ordemId") REFERENCES "ordens_fabricacao"("id") ON DELETE CASCADE;

-- CustoOf
CREATE TABLE "custos_of" (
    "id"             TEXT NOT NULL,
    "ordemId"        TEXT NOT NULL,
    "fornecedorId"   TEXT,
    "tipo"           "TipoCustoOf" NOT NULL,
    "descricao"      TEXT NOT NULL,
    "valor"          DECIMAL(12,2) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "contaPagarId"   TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custos_of_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "custos_of_contaPagarId_key" ON "custos_of"("contaPagarId");
ALTER TABLE "custos_of" ADD CONSTRAINT "custos_of_ordemId_fkey"
    FOREIGN KEY ("ordemId") REFERENCES "ordens_fabricacao"("id") ON DELETE CASCADE;
ALTER TABLE "custos_of" ADD CONSTRAINT "custos_of_fornecedorId_fkey"
    FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores_of"("id") ON DELETE SET NULL;
ALTER TABLE "custos_of" ADD CONSTRAINT "custos_of_contaPagarId_fkey"
    FOREIGN KEY ("contaPagarId") REFERENCES "contas_pagar"("id") ON DELETE SET NULL;

-- DocumentoOf
CREATE TABLE "documentos_of" (
    "id"        TEXT NOT NULL,
    "ordemId"   TEXT NOT NULL,
    "nome"      TEXT NOT NULL,
    "tipo"      TEXT NOT NULL,
    "url"       TEXT NOT NULL,
    "tamanho"   INTEGER,
    "uploadPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documentos_of_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "documentos_of" ADD CONSTRAINT "documentos_of_ordemId_fkey"
    FOREIGN KEY ("ordemId") REFERENCES "ordens_fabricacao"("id") ON DELETE CASCADE;
ALTER TABLE "documentos_of" ADD CONSTRAINT "documentos_of_uploadPor_fkey"
    FOREIGN KEY ("uploadPor") REFERENCES "users"("id") ON DELETE RESTRICT;

-- FK do BomTemplateItem para InsumoFabricacao (adicionada depois da tabela existir)
ALTER TABLE "bom_template_items" ADD CONSTRAINT "bom_template_items_insumoId_fkey"
    FOREIGN KEY ("insumoId") REFERENCES "insumos_fabricacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK da ordem_fabricacao_bom_items para InsumoFabricacao
ALTER TABLE "ordem_fabricacao_bom_items" ADD CONSTRAINT "ordem_fabricacao_bom_items_insumoId_fkey"
    FOREIGN KEY ("insumoId") REFERENCES "insumos_fabricacao"("id") ON DELETE RESTRICT;
