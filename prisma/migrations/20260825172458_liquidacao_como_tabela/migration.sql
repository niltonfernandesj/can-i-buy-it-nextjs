/*
  Warnings:

  - You are about to drop the column `dataLiquidacao` on the `Ativo` table. All the data in the column will be lost.
  - You are about to drop the column `valorLiquidacao` on the `Ativo` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Ativo" DROP COLUMN "dataLiquidacao",
DROP COLUMN "valorLiquidacao";

-- CreateTable
CREATE TABLE "LiquidacaoAtivo" (
    "id" TEXT NOT NULL,
    "ativoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "valorRecebido" DECIMAL(65,30) NOT NULL,
    "valorRemanescente" DECIMAL(65,30) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiquidacaoAtivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiquidacaoAtivo_ativoId_idx" ON "LiquidacaoAtivo"("ativoId");

-- AddForeignKey
ALTER TABLE "LiquidacaoAtivo" ADD CONSTRAINT "LiquidacaoAtivo_ativoId_fkey" FOREIGN KEY ("ativoId") REFERENCES "Ativo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
