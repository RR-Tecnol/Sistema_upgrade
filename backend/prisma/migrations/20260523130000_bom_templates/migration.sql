CREATE TABLE "bom_templates" (
    "id"           TEXT NOT NULL,
    "nome"         TEXT NOT NULL,
    "configuracao" "TruckType" NOT NULL,
    "descricao"    TEXT,
    "versao"       TEXT NOT NULL DEFAULT '1.0',
    "ativo"        BOOLEAN NOT NULL DEFAULT true,
    "criadoPor"    TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bom_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "bom_templates_nome_key" ON "bom_templates"("nome");
ALTER TABLE "bom_templates" ADD CONSTRAINT "bom_templates_criadoPor_fkey"
    FOREIGN KEY ("criadoPor") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "bom_template_items" (
    "id"                  TEXT NOT NULL,
    "templateId"          TEXT NOT NULL,
    "insumoId"            TEXT NOT NULL,
    "operacao"            TEXT NOT NULL,
    "quantidadePrevista"  DECIMAL(12,3) NOT NULL,
    "unidade"             TEXT NOT NULL,
    "isPhantom"           BOOLEAN NOT NULL DEFAULT false,
    "observacoes"         TEXT,
    CONSTRAINT "bom_template_items_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "bom_template_items" ADD CONSTRAINT "bom_template_items_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "bom_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
