-- AlterTable
ALTER TABLE "Transacao" ADD COLUMN     "numeroOcorrencia" INTEGER,
ADD COLUMN     "recorrenciaId" TEXT,
ADD COLUMN     "totalOcorrencias" INTEGER;

-- CreateIndex
CREATE INDEX "Transacao_recorrenciaId_idx" ON "Transacao"("recorrenciaId");
