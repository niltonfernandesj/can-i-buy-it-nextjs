-- CreateTable
CREATE TABLE "ConsolidacaoValorPadrao" (
    "id" TEXT NOT NULL,
    "valorPadraoId" TEXT NOT NULL,
    "mesReferencia" INTEGER NOT NULL,
    "anoReferencia" INTEGER NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsolidacaoValorPadrao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsolidacaoValorPadrao_mesReferencia_anoReferencia_idx" ON "ConsolidacaoValorPadrao"("mesReferencia", "anoReferencia");

-- CreateIndex
CREATE UNIQUE INDEX "ConsolidacaoValorPadrao_valorPadraoId_mesReferencia_anoRefe_key" ON "ConsolidacaoValorPadrao"("valorPadraoId", "mesReferencia", "anoReferencia");

-- AddForeignKey
ALTER TABLE "ConsolidacaoValorPadrao" ADD CONSTRAINT "ConsolidacaoValorPadrao_valorPadraoId_fkey" FOREIGN KEY ("valorPadraoId") REFERENCES "ValorPadrao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
