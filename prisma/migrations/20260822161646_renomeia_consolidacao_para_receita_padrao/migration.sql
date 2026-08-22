-- Rename verdadeiro (preserva dados), não DROP+CREATE (o que o `prisma
-- migrate dev` gera por padrão pra um rename de model) — produção já pode
-- ter linhas gravadas pela Task 73.

-- RenameTable
ALTER TABLE "ConsolidacaoValorPadrao" RENAME TO "ConsolidacaoReceitaPadrao";

-- RenameForeignKey
ALTER TABLE "ConsolidacaoReceitaPadrao" RENAME CONSTRAINT "ConsolidacaoValorPadrao_valorPadraoId_fkey" TO "ConsolidacaoReceitaPadrao_valorPadraoId_fkey";

-- RenamePrimaryKey
ALTER TABLE "ConsolidacaoReceitaPadrao" RENAME CONSTRAINT "ConsolidacaoValorPadrao_pkey" TO "ConsolidacaoReceitaPadrao_pkey";

-- RenameIndex
ALTER INDEX "ConsolidacaoValorPadrao_mesReferencia_anoReferencia_idx" RENAME TO "ConsolidacaoReceitaPadrao_mesReferencia_anoReferencia_idx";

-- RenameIndex
ALTER INDEX "ConsolidacaoValorPadrao_valorPadraoId_mesReferencia_anoRefe_key" RENAME TO "ConsolidacaoReceitaPadrao_valorPadraoId_mesReferencia_anoRe_key";
