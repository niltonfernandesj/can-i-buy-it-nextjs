-- CreateTable
CREATE TABLE "ConsolidacaoDespesaPadrao" (
    "id" TEXT NOT NULL,
    "valorPadraoId" TEXT NOT NULL,
    "mesReferencia" INTEGER NOT NULL,
    "anoReferencia" INTEGER NOT NULL,
    "transacaoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsolidacaoDespesaPadrao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsolidacaoDespesaPadrao_transacaoId_key" ON "ConsolidacaoDespesaPadrao"("transacaoId");

-- CreateIndex
CREATE INDEX "ConsolidacaoDespesaPadrao_mesReferencia_anoReferencia_idx" ON "ConsolidacaoDespesaPadrao"("mesReferencia", "anoReferencia");

-- CreateIndex
CREATE UNIQUE INDEX "ConsolidacaoDespesaPadrao_valorPadraoId_mesReferencia_anoRe_key" ON "ConsolidacaoDespesaPadrao"("valorPadraoId", "mesReferencia", "anoReferencia");

-- AddForeignKey
ALTER TABLE "ConsolidacaoDespesaPadrao" ADD CONSTRAINT "ConsolidacaoDespesaPadrao_valorPadraoId_fkey" FOREIGN KEY ("valorPadraoId") REFERENCES "ValorPadrao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidacaoDespesaPadrao" ADD CONSTRAINT "ConsolidacaoDespesaPadrao_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "Transacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
